from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter(prefix="/stocks", tags=["stocks"])

@router.get("/top")
def get_top_stocks(
    score_type: str = Query(..., regex="^(overall|technical|safety|sentiment)$"),
    timeframe: str = Query(..., regex="^(short|medium|long)$"),
    limit: int = 10,
    db: Session = Depends(get_db)
):
    column_name = f"{score_type}_score_{timeframe}"
    if not hasattr(models.StockScore, column_name):
        raise HTTPException(status_code=400, detail="Invalid combination of score_type and timeframe")
        
    order_col = getattr(models.StockScore, column_name)
    
    # Exclude "Not Available" for sentiment sorting
    query = db.query(models.StockScore)
    if score_type == "sentiment":
        query = query.filter(order_col != "Not Available")
        
    stocks = query.order_by(order_col.desc()).limit(limit).all()
    
    return [{
        "symbol": s.stock_symbol,
        "score": getattr(s, column_name),
        "sector": s.sector
    } for s in stocks]

@router.get("/search")
def search_stocks(
    q: str = Query(..., min_length=2),
    timeframe: str = Query(..., regex="^(short|medium|long)$"),
    db: Session = Depends(get_db)
):
    search_term = f"%{q.upper()}%"
    column_name = f"overall_score_{timeframe}"
    
    stocks = db.query(models.StockScore).filter(
        models.StockScore.stock_symbol.ilike(search_term)
    ).limit(10).all()
    
    return [{
        "symbol": s.stock_symbol,
        "overall_score": getattr(s, column_name)
    } for s in stocks]

@router.get("/{symbol}/score")
def get_stock_score(
    symbol: str,
    timeframe: str = Query(..., regex="^(short|medium|long)$"),
    db: Session = Depends(get_db)
):
    stock = db.query(models.StockScore).filter(models.StockScore.stock_symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    return {
        "symbol": stock.stock_symbol,
        "timeframe": timeframe,
        "overall": getattr(stock, f"overall_score_{timeframe}"),
        "technical": getattr(stock, f"technical_score_{timeframe}"),
        "safety": getattr(stock, f"safety_score_{timeframe}"),
        "sentiment": getattr(stock, f"sentiment_score_{timeframe}"),
        "last_updated": stock.computed_at
    }
