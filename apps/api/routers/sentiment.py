from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
import models
from database import get_db
import auth
from services.tools import resolve_symbol

router = APIRouter(prefix="/sentiment-feed", tags=["sentiment_feed"])

@router.get("/market")
def get_market_sentiment(
    db: Session = Depends(get_db)
):
    """
    Returns latest market-wide news articles across all tracked stocks.
    """
    articles = db.query(models.StockNews).order_by(
        desc(models.StockNews.article_date)
    ).limit(50).all()
    return articles

@router.get("/portfolio")
def get_portfolio_sentiment(
    current_user_id: str = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Default view: Articles for the user's held stocks.
    Falls back to market news if user has no held stocks or is anonymous.
    """
    if current_user_id and current_user_id != "anonymous":
        holdings = db.query(models.PortfolioHolding).filter(
            models.PortfolioHolding.user_id == current_user_id,
            models.PortfolioHolding.status == 'held'
        ).all()
        
        if holdings:
            symbols = [h.stock_symbol for h in holdings]
            articles = db.query(models.StockNews).filter(
                models.StockNews.stock_symbol.in_(symbols)
            ).order_by(desc(models.StockNews.article_date)).limit(50).all()
            if articles:
                return articles

    # Fallback to market feed so screen is never blank
    return get_market_sentiment(db)

@router.get("/search")
def search_sentiment(
    q: str = Query(..., description="Stock symbol or company name to search"),
    db: Session = Depends(get_db)
):
    """
    Search view: Articles for a specific stock/keyword with alias & fuzzy resolution.
    """
    clean_q = q.strip()
    canonical_symbol = resolve_symbol(db, clean_q)
    
    articles = db.query(models.StockNews).filter(
        or_(
            models.StockNews.stock_symbol == canonical_symbol,
            models.StockNews.stock_symbol.ilike(f"%{clean_q}%"),
            models.StockNews.source_url.ilike(f"%{clean_q}%")
        )
    ).order_by(desc(models.StockNews.article_date)).limit(50).all()
    
    return articles
