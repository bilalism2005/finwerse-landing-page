from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast, Integer
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

    # Only select the columns actually used by the response instead of the
    # full ORM object.
    query = db.query(models.StockScore.stock_symbol, order_col, models.StockScore.sector)

    # Exclude "Not Available" for sentiment sorting
    if score_type == "sentiment":
        query = query.filter(order_col != "Not Available")

    # Postgres defaults to NULLS FIRST on DESC, which would float stocks with
    # a missing/unscored value (RATE_LIMITED/FAILED for the day) to the very
    # top of the ranked list -- the opposite of the intended behavior.
    if score_type == "sentiment":
        # sentiment_score_* is a String column (to also hold "Not Available"),
        # so a plain ORDER BY sorts the remaining numeric strings lexically
        # (e.g. "95" > "100"). Cast to Integer for correct numeric ordering.
        stocks = query.order_by(cast(order_col, Integer).desc().nullslast()).limit(limit).all()
    else:
        stocks = query.order_by(order_col.desc().nullslast()).limit(limit).all()

    return [{
        "symbol": row[0],
        "score": row[1],
        "sector": row[2]
    } for row in stocks]

@router.get("/search")
def search_stocks(
    q: str = Query(..., min_length=2),
    timeframe: str = Query(..., regex="^(short|medium|long)$"),
    db: Session = Depends(get_db)
):
    search_term = f"%{q.upper()}%"
    column_name = f"overall_score_{timeframe}"
    overall_col = getattr(models.StockScore, column_name)

    # Only select the columns actually used by the response instead of the
    # full ORM object.
    stocks = db.query(models.StockScore.stock_symbol, overall_col).filter(
        models.StockScore.stock_symbol.ilike(search_term)
    ).limit(10).all()

    return [{
        "symbol": row[0],
        "overall_score": row[1]
    } for row in stocks]

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
