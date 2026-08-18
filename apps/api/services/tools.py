import os
import httpx
import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, or_
import models
from datetime import datetime, date

logger = logging.getLogger(__name__)

# Initialize embedding model lazily to save server memory
_embedding_model = None
def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model

SYMBOL_ALIASES = {
    "ZOMATO": "ETERNAL",
    "M&M": "MM",
    "MAHINDRA": "MM",
    "L&T": "LT",
    "LARSEN": "LT",
    "BAJAJ-AUTO": "BAJAJ_AUTO",
    "BAJAJ AUTO": "BAJAJ_AUTO",
    "TATAMOTORS": "TATAMOTORS",
    "TATA MOTORS": "TATAMOTORS",
    "TATA POWER": "TATAPOWER",
    "TATA STEEL": "TATASTEEL",
    "TATA CONSUMER": "TATACONSUM",
    "TCS": "TCS",
    "INFOSYS": "INFY",
    "INFY": "INFY",
    "RELIANCE": "RELIANCE",
    "RIL": "RELIANCE",
    "HDFC": "HDFCBANK",
    "HDFC BANK": "HDFCBANK",
    "ICICI": "ICICIBANK",
    "ICICI BANK": "ICICIBANK",
    "SBI": "SBIN",
    "STATE BANK": "SBIN",
}

def resolve_symbol_with_candidates(db: Session, query_term: str) -> dict:
    """
    Disambiguation Gate:
    Resolves a search term to an exact symbol, a candidate list of multiple matches, or not found.
    """
    if not query_term or not query_term.strip():
        return {"status": "NONE"}
        
    term = query_term.strip().upper()
    
    # 1. Direct Alias Match
    if term in SYMBOL_ALIASES:
        canonical = SYMBOL_ALIASES[term]
        return {
            "status": "EXACT",
            "symbol": canonical,
            "matched_term": query_term
        }
        
    # 2. Exact Match in stock_scores
    exact_score = db.query(models.StockScore.stock_symbol).filter(
        models.StockScore.stock_symbol == term
    ).first()
    if exact_score:
        return {
            "status": "EXACT",
            "symbol": exact_score[0],
            "matched_term": query_term
        }

    # 3. Exact Match in symbol_mapping
    exact_map = db.query(models.SymbolMapping.stock_symbol).filter(
        models.SymbolMapping.stock_symbol == term
    ).first()
    if exact_map:
        return {
            "status": "EXACT",
            "symbol": exact_map[0],
            "matched_term": query_term
        }

    # 4. Fuzzy / Substring Search for Multiple Candidates
    candidates = db.query(models.SymbolMapping.stock_symbol).filter(
        models.SymbolMapping.stock_symbol.ilike(f"%{term}%")
    ).limit(6).all()
    
    if len(candidates) == 1:
        return {
            "status": "EXACT",
            "symbol": candidates[0][0],
            "matched_term": query_term
        }
    elif len(candidates) > 1:
        return {
            "status": "MULTIPLE",
            "candidates": [c[0] for c in candidates],
            "matched_term": query_term
        }
        
    return {
        "status": "NOT_FOUND",
        "searched": query_term
    }

def resolve_symbol(db: Session, stock_symbol: str) -> str:
    """Helper returning canonical symbol string."""
    res = resolve_symbol_with_candidates(db, stock_symbol)
    if res.get("status") == "EXACT":
        return res["symbol"]
    return stock_symbol.strip().upper()

# ==========================================
# GRANULAR DATABASE TOOLS
# ==========================================

async def tool_stock_scores(db: Session, stock_symbol: str):
    """
    Retrieves current composite scores (Overall, Technical, Safety, Sentiment) across Short, Medium, Long.
    """
    symbol = resolve_symbol(db, stock_symbol)
    score_record = db.query(models.StockScore).filter(models.StockScore.stock_symbol == symbol).first()
    if not score_record:
        return {"error": f"No scores found for {symbol}."}
        
    return {
        "stock_symbol": symbol,
        "overall_scores": {
            "short": score_record.overall_score_short,
            "medium": score_record.overall_score_medium,
            "long": score_record.overall_score_long
        },
        "technical_scores": {
            "short": score_record.technical_score_short,
            "medium": score_record.technical_score_medium,
            "long": score_record.technical_score_long
        },
        "safety_scores": {
            "short": score_record.safety_score_short,
            "medium": score_record.safety_score_medium,
            "long": score_record.safety_score_long
        },
        "sentiment_scores": {
            "short": score_record.sentiment_score_short,
            "medium": score_record.sentiment_score_medium,
            "long": score_record.sentiment_score_long
        },
        "data_status": score_record.data_status,
        "computed_at": str(score_record.computed_at)
    }

async def tool_indicator_values(db: Session, stock_symbol: str, timeframe: str = None):
    """
    Retrieves raw indicator values (CCI, RSI, MACD) and crossover freshness for D, W, M.
    """
    symbol = resolve_symbol(db, stock_symbol)
    timeframes = [timeframe.upper()] if timeframe and timeframe.upper() in ['D', 'W', 'M'] else ['D', 'W', 'M']
    
    indicators = {}
    for tf in timeframes:
        ind = db.query(models.StockIndicatorValue).filter(
            models.StockIndicatorValue.stock_symbol == symbol,
            models.StockIndicatorValue.timeframe == tf
        ).order_by(desc(models.StockIndicatorValue.date)).first()
        
        if ind:
            indicators[tf] = {
                "date": str(ind.date),
                "cci_value": ind.cci_value,
                "cci_crossover_freshness_days": ind.cci_crossover,
                "rsi_value": ind.rsi_value,
                "rsi_crossover_freshness_days": ind.rsi_crossover,
                "macd_line": ind.macd_line,
                "macd_signal": ind.macd_signal,
                "macd_crossover_freshness_days": ind.macd_crossover
            }
            
    if not indicators:
        return {"error": f"No indicator values recorded for {symbol}."}
        
    return {
        "stock_symbol": symbol,
        "timeframe_indicators": indicators
    }

async def tool_historical_scores(db: Session, stock_symbol: str, limit_days: int = 10):
    """
    Retrieves dated historical scores for backtesting and historical score comparison.
    """
    symbol = resolve_symbol(db, stock_symbol)
    hist_scores = db.query(models.StockHistoricalScore).filter(
        models.StockHistoricalScore.stock_symbol == symbol
    ).order_by(desc(models.StockHistoricalScore.date)).limit(limit_days).all()
    
    if not hist_scores:
        return {"result": f"No historical score history found for {symbol}."}
        
    history = []
    for h in hist_scores:
        history.append({
            "date": str(h.date),
            "technical_score_short": h.technical_score_short,
            "technical_score_medium": h.technical_score_medium,
            "technical_score_long": h.technical_score_long
        })
        
    return {
        "stock_symbol": symbol,
        "historical_scores": history
    }

async def tool_stock_fundamentals(db: Session, stock_symbol: str):
    """
    Retrieves fundamental metrics (PE, EPS, Sales, ROCE, ROE, Debt/Equity, Market Cap, FII holding).
    """
    symbol = resolve_symbol(db, stock_symbol)
    fund = db.query(models.StockFundamental).filter(models.StockFundamental.stock_symbol == symbol).first()
    
    if not fund:
        return {"result": f"No fundamental financial ratios recorded for {symbol}."}
        
    return {
        "stock_symbol": symbol,
        "period": fund.period,
        "pe_ratio": fund.pe_ratio,
        "market_cap_cr": fund.market_cap,
        "sales_cr": fund.sales,
        "eps": fund.eps,
        "opm_pct": fund.opm,
        "roce_pct": fund.roce,
        "roe_pct": fund.roe,
        "debt_to_equity": fund.debt_to_equity,
        "fii_holding_pct": fund.fii_holding_pct
    }

async def tool_user_portfolio(db: Session, user_id: str):
    """
    Retrieves the user's personal holdings, buy prices, current prices, and scores.
    """
    holdings = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.user_id == user_id,
        models.PortfolioHolding.status == 'held'
    ).all()

    if not holdings:
        return {"status": "empty", "message": "User has no active holdings in their portfolio."}

    portfolio = []
    for h in holdings:
        score = db.query(models.StockScore).filter(models.StockScore.stock_symbol == h.stock_symbol).first()
        candle = db.query(models.StockCandle).filter(
            models.StockCandle.stock_symbol == h.stock_symbol,
            models.StockCandle.timeframe == 'D'
        ).order_by(desc(models.StockCandle.date)).first()
        
        portfolio.append({
            "stock_symbol": h.stock_symbol,
            "quantity": h.quantity,
            "avg_price": h.avg_price,
            "current_price": candle.close if candle else None,
            "gain_loss_pct": round(((candle.close - h.avg_price) / h.avg_price) * 100, 2) if candle and h.avg_price else None,
            "intended_holding_period": h.intended_holding_period,
            "overall_score_short": score.overall_score_short if score else None,
            "overall_score_medium": score.overall_score_medium if score else None,
            "overall_score_long": score.overall_score_long if score else None
        })
    return {"portfolio_holdings": portfolio}

# ==========================================
# EXTERNAL & UNSTRUCTURED DATA TOOLS
# ==========================================

async def tool_twitter_sentiment(stock_symbol: str):
    """
    Fetches real-time tweets and investor discussion from TwitterAPI.io.
    """
    clean_sym = stock_symbol.strip().upper()
    api_key = os.getenv("TWITTER_API_KEY")
    if not api_key:
        return {"error": "Twitter API key not configured on server."}

    url = "https://api.twitterapi.io/twitter/tweet/advanced_search"
    headers = {"x-api-key": api_key}
    params = {
        "query": f"${clean_sym} OR {clean_sym} stock",
        "queryType": "Latest"
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, params=params, timeout=8.0)
            if resp.status_code != 200:
                return {"error": f"Twitter API error ({resp.status_code}): {resp.text}"}
                
            data = resp.json()
            tweets = data.get("tweets", [])
            top_tweets = []
            for t in tweets[:5]:
                top_tweets.append({
                    "text": t.get("text"),
                    "author": t.get("author", {}).get("userName"),
                    "created_at": t.get("createdAt")
                })
            return {"tweets": top_tweets}
    except Exception as e:
        return {"error": f"Failed to reach Twitter API: {str(e)}"}

async def tool_news_sentiment(db: Session, stock_symbol: str):
    """
    Retrieves recent news headlines and sentiment polarity scores from database.
    """
    symbol = resolve_symbol(db, stock_symbol)
    news = db.query(models.StockNews).filter(
        models.StockNews.stock_symbol == symbol
    ).order_by(desc(models.StockNews.article_date)).limit(5).all()

    if not news:
        return {"result": f"No recent news found for {symbol}."}

    articles = [{"date": str(n.article_date), "polarity": n.polarity, "url": n.source_url} for n in news]
    return {"recent_news": articles}

async def tool_nse_filings_rag(db: Session, stock_symbol: str, query: str = "earnings and corporate announcements"):
    """
    Semantic vector search over official NSE filings in pgvector.
    """
    symbol = resolve_symbol(db, stock_symbol)
    model = get_embedding_model()
    
    query_vector = model.encode(query).tolist()
    results = db.query(models.CorporateFiling).filter(
        models.CorporateFiling.stock_symbol == symbol
    ).order_by(models.CorporateFiling.embedding_vector.cosine_distance(query_vector)).limit(3).all()

    if not results:
        return {"result": f"No filings found for {symbol} matching query '{query}'."}

    excerpts = []
    for r in results:
        excerpts.append({
            "type": r.filing_type,
            "date": str(r.filing_date),
            "text": r.chunk_text,
            "url": r.source_url
        })
    return {"filings_context": excerpts}
