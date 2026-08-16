from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
import models
from database import get_db
import auth

router = APIRouter(prefix="/sentiment-feed", tags=["sentiment_feed"])

@router.get("/portfolio")
def get_portfolio_sentiment(
    current_user_id: str = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Default view: Articles for the user's held stocks.
    Serial Position Effect -> most-recent-first
    """
    holdings = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.user_id == current_user_id,
        models.PortfolioHolding.status == 'held'
    ).all()
    
    if not holdings:
        return []
        
    symbols = [h.stock_symbol for h in holdings]
    
    articles = db.query(models.StockNews).filter(
        models.StockNews.stock_symbol.in_(symbols)
    ).order_by(desc(models.StockNews.article_date)).limit(50).all()
    
    return articles

@router.get("/search")
def search_sentiment(
    q: str = Query(..., description="Stock symbol to search"),
    db: Session = Depends(get_db)
):
    """
    Search view: Articles for a specific stock/keyword.
    """
    symbol = q.upper()
    
    articles = db.query(models.StockNews).filter(
        models.StockNews.stock_symbol == symbol
    ).order_by(desc(models.StockNews.article_date)).limit(50).all()
    
    return articles
