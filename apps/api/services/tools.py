import os
import httpx
import json
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
import models
from datetime import datetime, date

# We will initialize this only once to save memory on the server
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
    "L&T": "LT",
    "BAJAJ-AUTO": "BAJAJ_AUTO",
    "BAJAJ AUTO": "BAJAJ_AUTO",
    "TATAMOTORS": "TATAMOTORS",
    "TATA MOTORS": "TATAMOTORS",
    "TATA POWER": "TATAPOWER",
    "TATA STEEL": "TATASTEEL",
    "HDFC": "HDFCBANK",
}

def resolve_symbol(db: Session, stock_symbol: str) -> str:
    """Resolves ticker aliases or fuzzy company names to canonical NSE symbols."""
    clean_sym = stock_symbol.strip().upper()
    if clean_sym in SYMBOL_ALIASES:
        return SYMBOL_ALIASES[clean_sym]
    
    # Check exact score record
    score = db.query(models.StockScore.stock_symbol).filter(models.StockScore.stock_symbol == clean_sym).first()
    if score:
        return clean_sym
        
    # Check symbol mapping
    mapping = db.query(models.SymbolMapping.stock_symbol).filter(
        models.SymbolMapping.stock_symbol.ilike(f"%{clean_sym}%")
    ).first()
    if mapping:
        return mapping[0]
        
    return clean_sym

async def tool_db_access(db: Session, stock_symbol: str):
    """
    Retrieves current stock scores, indicator values, and a brief history
    for a given stock symbol.
    """
    stock_symbol = resolve_symbol(db, stock_symbol)
    
    # Get current scores
    score_record = db.query(models.StockScore).filter(models.StockScore.stock_symbol == stock_symbol).first()
    
    if not score_record:
        return {"error": f"No data found for {stock_symbol}."}

    # Get latest indicators for D, W, M
    indicators = {}
    for timeframe in ['D', 'W', 'M']:
        ind_record = db.query(models.StockIndicatorValue).filter(
            models.StockIndicatorValue.stock_symbol == stock_symbol,
            models.StockIndicatorValue.timeframe == timeframe
        ).order_by(desc(models.StockIndicatorValue.date)).first()
        
        if ind_record:
            indicators[timeframe] = {
                "cci_value": ind_record.cci_value,
                "cci_crossover_freshness_days": ind_record.cci_crossover,
                "rsi_value": ind_record.rsi_value,
                "rsi_crossover_freshness_days": ind_record.rsi_crossover,
                "macd_line": ind_record.macd_line,
                "macd_signal": ind_record.macd_signal,
                "macd_crossover_freshness_days": ind_record.macd_crossover,
                "date": str(ind_record.date)
            }

    # Historical scores summary (e.g. last 10 recorded dates)
    hist_scores = db.query(models.StockHistoricalScore).filter(
        models.StockHistoricalScore.stock_symbol == stock_symbol
    ).order_by(desc(models.StockHistoricalScore.date)).limit(10).all()

    history = []
    for h in hist_scores:
        history.append({
            "date": str(h.date),
            "technical_score_short": h.technical_score_short,
            "technical_score_medium": h.technical_score_medium,
            "technical_score_long": h.technical_score_long,
        })

    return {
        "symbol": stock_symbol,
        "current_scores": {
            "overall": {
                "short": score_record.overall_score_short,
                "medium": score_record.overall_score_medium,
                "long": score_record.overall_score_long
            },
            "technical": {
                "short": score_record.technical_score_short,
                "medium": score_record.technical_score_medium,
                "long": score_record.technical_score_long
            },
            "safety": {
                "short": score_record.safety_score_short,
                "medium": score_record.safety_score_medium,
                "long": score_record.safety_score_long
            },
            "sentiment": {
                "short": score_record.sentiment_score_short,
                "medium": score_record.sentiment_score_medium,
                "long": score_record.sentiment_score_long
            }
        },
        "indicators": indicators,
        "history": history
    }

async def tool_nse_filings(db: Session, stock_symbol: str, query: str):
    """
    RAG over NSE Filings for the given stock symbol and query.
    """
    stock_symbol = resolve_symbol(db, stock_symbol)
    model = get_embedding_model()
    
    # Create embedding for the query
    query_vector = model.encode(query).tolist()
    
    # Query pgvector for the closest 3 chunks
    results = db.query(models.CorporateFiling).filter(
        models.CorporateFiling.stock_symbol == stock_symbol
    ).order_by(models.CorporateFiling.embedding_vector.cosine_distance(query_vector)).limit(3).all()

    if not results:
        return {"result": f"No filings found for {stock_symbol} matching your query."}

    excerpts = []
    for r in results:
        excerpts.append({
            "type": r.filing_type,
            "date": str(r.filing_date),
            "text": r.chunk_text,
            "url": r.source_url
        })
    return {"filings_context": excerpts}

async def tool_sentiment(db: Session, stock_symbol: str):
    """
    Gets recent sentiment news headlines.
    """
    stock_symbol = resolve_symbol(db, stock_symbol)
    news = db.query(models.StockNews).filter(
        models.StockNews.stock_symbol == stock_symbol
    ).order_by(desc(models.StockNews.article_date)).limit(5).all()

    if not news:
        return {"result": f"No recent news found for {stock_symbol}."}

    articles = [{"date": str(n.article_date), "polarity": n.polarity, "url": n.source_url} for n in news]
    return {"recent_news": articles}

async def tool_twitter(stock_symbol: str):
    """
    Fetches real-time tweets mentioning the stock via TwitterAPI.io
    """
    stock_symbol = stock_symbol.upper()
    api_key = os.getenv("TWITTER_API_KEY")
    if not api_key:
        return {"error": "Twitter API key not configured on server."}

    url = "https://api.twitterapi.io/twitter/tweet/advanced_search"
    headers = {"x-api-key": api_key}
    # Create an advanced search query for the stock
    params = {
        "query": f"${stock_symbol} OR {stock_symbol} stock",
        "queryType": "Latest"
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, params=params, timeout=10.0)
            
            if resp.status_code != 200:
                return {"error": f"Twitter API failed with status {resp.status_code}: {resp.text}"}
                
            data = resp.json()
            tweets = data.get("tweets", [])
            
            # Extract top 5 relevant tweets
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

async def tool_portfolio(db: Session, user_id: str):
    """
    Retrieves the user's current portfolio holdings, along with their current market price and technical scores.
    """
    holdings = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.user_id == user_id,
        models.PortfolioHolding.status == 'held'
    ).all()

    if not holdings:
        return {"status": "empty", "message": "User has no current holdings in their portfolio."}

    portfolio = []
    for h in holdings:
        # Get the latest score
        score_record = db.query(models.StockScore).filter(
            models.StockScore.stock_symbol == h.stock_symbol
        ).first()
        
        # Get the latest daily candle for current price
        candle_record = db.query(models.StockCandle).filter(
            models.StockCandle.stock_symbol == h.stock_symbol,
            models.StockCandle.timeframe == 'D'
        ).order_by(desc(models.StockCandle.date)).first()
        
        portfolio.append({
            "stock_symbol": h.stock_symbol,
            "quantity": h.quantity,
            "avg_price": h.avg_price,
            "current_price": candle_record.close if candle_record else None,
            "intended_holding_period": h.intended_holding_period,
            "overall_score_long": score_record.overall_score_long if score_record else None,
            "overall_score_medium": score_record.overall_score_medium if score_record else None,
            "overall_score_short": score_record.overall_score_short if score_record else None,
        })
    return {"portfolio_holdings": portfolio}
