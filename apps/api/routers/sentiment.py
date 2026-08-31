from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
import models
from database import get_db
import auth
from services.tools import resolve_symbol

router = APIRouter(prefix="/sentiment-feed", tags=["sentiment_feed"])


def _project_lightweight(articles):
    """
    Single place list-shape is defined for the three list endpoints below.
    Explicitly excludes full_text/summary -- must never leak into list
    responses even as null keys (spec/capabilities/sentiment-feed.md).
    """
    return [
        {
            "id": a.id,
            "stock_symbol": a.stock_symbol,
            "article_date": a.article_date,
            "polarity": a.polarity,
            "source_url": a.source_url,
            "headline": a.headline,
        }
        for a in articles
    ]


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
    return _project_lightweight(articles)

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
                return _project_lightweight(articles)

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

    return _project_lightweight(articles)


@router.get("/article/{id}")
def get_article_detail(
    id: int,
    db: Session = Depends(get_db)
):
    """
    Fetch-on-tap full detail for a single article -- backs the mobile
    in-app article reader. full_text/summary may both be null.
    """
    article = db.query(models.StockNews).filter(models.StockNews.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    return {
        "id": article.id,
        "stock_symbol": article.stock_symbol,
        "article_date": article.article_date,
        "polarity": article.polarity,
        "source_url": article.source_url,
        "headline": article.headline,
        "full_text": article.full_text,
        "summary": article.summary,
    }
