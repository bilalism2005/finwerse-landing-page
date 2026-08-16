import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import datetime
from groq import Groq

from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/portfolio/health", tags=["health"])

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Models
class StockHealthInfo(BaseModel):
    stock_symbol: str
    quantity: int
    avg_price: float
    invested_value: float
    weight: float
    overall_score: Optional[int]
    technical_score: Optional[int]
    safety_score: Optional[int]
    sentiment_score: Optional[str]
    sector: Optional[str]

class SectorInfo(BaseModel):
    sector: str
    invested_value: float
    weight: float

class PortfolioHealthResponse(BaseModel):
    overall_score: int
    technical_score: int
    safety_score: int
    sentiment_score: Optional[int]
    green_score: int
    red_score: int
    diversification_score: int
    sector_summary_sentence: str
    sectors: List[SectorInfo]
    holdings: List[StockHealthInfo]

class BottleneckRequest(BaseModel):
    timeframe: str

class BottleneckResponse(BaseModel):
    report: str

def safe_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None

def compute_portfolio_health(db: Session, user_id: str, timeframe: str) -> PortfolioHealthResponse:
    if timeframe not in ["short", "medium", "long"]:
        raise HTTPException(status_code=400, detail="Invalid timeframe. Must be short, medium, or long")
    
    # 1. Fetch held positions
    holdings = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.user_id == user_id,
        models.PortfolioHolding.status == "held"
    ).all()
    
    if not holdings:
        # Return 0s for empty state
        return PortfolioHealthResponse(
            overall_score=0, technical_score=0, safety_score=0, sentiment_score=None,
            green_score=0, red_score=0, diversification_score=0,
            sector_summary_sentence="You have no holdings.",
            sectors=[], holdings=[]
        )
    
    # 2. Fetch scores and compute weights
    total_invested = 0.0
    stock_infos = []
    
    for h in holdings:
        invested = h.quantity * h.avg_price
        total_invested += invested
        
        # Get scores
        score = db.query(models.StockScore).filter(models.StockScore.stock_symbol == h.stock_symbol).first()
        
        overall = getattr(score, f"overall_score_{timeframe}") if score else None
        tech = getattr(score, f"technical_score_{timeframe}") if score else None
        safe = getattr(score, f"safety_score_{timeframe}") if score else None
        sent = getattr(score, f"sentiment_score_{timeframe}") if score else None
        
        stock_infos.append(StockHealthInfo(
            stock_symbol=h.stock_symbol,
            quantity=h.quantity,
            avg_price=h.avg_price,
            invested_value=invested,
            weight=0.0, # Will compute after total
            overall_score=safe_int(overall),
            technical_score=safe_int(tech),
            safety_score=safe_int(safe),
            sentiment_score=sent,
            sector=score.sector if score else "Unknown"
        ))
        
    if total_invested == 0:
        total_invested = 1.0 # Prevent division by zero if prices are 0
        
    for info in stock_infos:
        info.weight = info.invested_value / total_invested
        
    # 3. Compute Portfolio Weighted Scores
    def weighted_avg(attr: str) -> int:
        total_w = 0.0
        weighted_sum = 0.0
        for info in stock_infos:
            val = getattr(info, attr)
            if val is not None:
                weighted_sum += val * info.weight
                total_w += info.weight
        if total_w == 0:
            return 0
        return int(round(weighted_sum / total_w))
        
    overall_score = weighted_avg('overall_score')
    technical_score = weighted_avg('technical_score')
    safety_score = weighted_avg('safety_score')
    
    # Sentiment requires parsing String to int, excluding "Not Available"
    sent_sum = 0.0
    sent_weight = 0.0
    for info in stock_infos:
        if info.sentiment_score and info.sentiment_score != "Not Available":
            val = safe_int(info.sentiment_score)
            if val is not None:
                sent_sum += val * info.weight
                sent_weight += info.weight
                
    sentiment_score = int(round(sent_sum / sent_weight)) if sent_weight > 0 else None
    
    # 4. Green / Red Split Scores
    # Green: only positive overall_score
    green_infos = [i for i in stock_infos if i.overall_score is not None and i.overall_score > 0]
    green_total_weight = sum(i.weight for i in green_infos)
    if green_total_weight > 0:
        green_score = int(round(sum((i.overall_score * i.weight) for i in green_infos) / green_total_weight))
    else:
        green_score = 0
        
    # Red: only negative overall_score
    red_infos = [i for i in stock_infos if i.overall_score is not None and i.overall_score < 0]
    red_total_weight = sum(i.weight for i in red_infos)
    if red_total_weight > 0:
        red_score = int(round(sum((i.overall_score * i.weight) for i in red_infos) / red_total_weight))
    else:
        red_score = 0
        
    # 5. Diversification (HHI)
    sector_investments = {}
    for info in stock_infos:
        sec = info.sector or "Unknown"
        sector_investments[sec] = sector_investments.get(sec, 0.0) + info.invested_value
        
    sectors = []
    hhi = 0.0
    for sec, val in sector_investments.items():
        w = val / total_invested
        sectors.append(SectorInfo(sector=sec, invested_value=val, weight=w))
        hhi += w * w
        
    # Sort sectors by weight descending
    sectors.sort(key=lambda x: x.weight, reverse=True)
    
    # Diversification Score = 100 * (1 - (HHI - 0.10) / (1.0 - 0.10))
    raw_div = 100.0 * (1.0 - (hhi - 0.10) / 0.90)
    diversification_score = max(0, min(100, int(round(raw_div))))
    
    # Sector Sentence
    if sectors:
        max_sec = sectors[0]
        sector_summary_sentence = f"A well-diversified portfolio keeps each sector around 10-12%. Your largest sector concentration is {int(max_sec.weight*100)}% in {max_sec.sector}, {'well above' if max_sec.weight > 0.20 else 'close to'} that."
    else:
        sector_summary_sentence = "No sector data."
        
    # 6. Sort holdings worst-to-best by overall score (Serial Position Effect)
    stock_infos.sort(key=lambda x: x.overall_score if x.overall_score is not None else 999)

    return PortfolioHealthResponse(
        overall_score=overall_score,
        technical_score=technical_score,
        safety_score=safety_score,
        sentiment_score=sentiment_score,
        green_score=green_score,
        red_score=red_score,
        diversification_score=diversification_score,
        sector_summary_sentence=sector_summary_sentence,
        sectors=sectors,
        holdings=stock_infos
    )

@router.get("", response_model=PortfolioHealthResponse)
def get_portfolio_health(
    timeframe: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    return compute_portfolio_health(db, user_id, timeframe)


@router.post("/bottleneck-report", response_model=BottleneckResponse)
def get_bottleneck_report(
    request: BottleneckRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    # Fetch health data to feed to LLM
    health = compute_portfolio_health(db, user_id, request.timeframe)
    if not health.holdings:
        return BottleneckResponse(report="You don't have any holdings yet. Add some stocks to your portfolio to get an AI Bottleneck Report.")
        
    # Construct Context
    context_lines = []
    for h in health.holdings:
        context_lines.append(f"- {h.stock_symbol}: Weight: {h.weight*100:.1f}%, Overall: {h.overall_score}, Tech: {h.technical_score}, Safety: {h.safety_score}")
        
    context_str = "\n".join(context_lines)
    
    system_prompt = """You are the Finwerse AI Portfolio Analyst. 
The user is viewing their Portfolio Health and wants a "Bottleneck Report" identifying which holdings are dragging them down.
You MUST follow this strict rule: As a one-time exception to the platform rules, you ARE allowed to use hold/sell framing in this specific report. Tell them clearly if a stock is a dead weight that they should consider selling, or if it is solid and they should hold.

Structure the response as a short, punchy paragraph summarizing the bottleneck, followed by bullet points for the 2-3 worst stocks, and end with a clear concluding action. Be concise, direct, and data-driven."""
    
    user_prompt = f"""Timeframe: {request.timeframe.capitalize()} Term
Portfolio Overall Score: {health.overall_score}
Portfolio Diversification: {health.diversification_score}

Here are the holdings (sorted worst to best):
{context_str}

Write the Bottleneck Report."""

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        report = completion.choices[0].message.content
        return BottleneckResponse(report=report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
