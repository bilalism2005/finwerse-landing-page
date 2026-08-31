import os
import asyncio
import difflib
import httpx
import logging
from sqlalchemy.orm import Session
from sqlalchemy import desc
import models

logger = logging.getLogger(__name__)

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
    "WIPRO": "WIPRO",
    "RELIANCE": "RELIANCE",
    "RIL": "RELIANCE",
    "HDFC": "HDFCBANK",
    "HDFC BANK": "HDFCBANK",
    "ICICI": "ICICIBANK",
    "ICICI BANK": "ICICIBANK",
    "SBI": "SBIN",
    "STATE BANK": "SBIN",
    "PAYTM": "ONE97",
    "SWIGGY": "SWIGGY",
    "NYKAA": "FSN",
    "OLA": "OLAELEC",
    "ADANI": "ADANIENT",
    "ADANI PORTS": "ADANIPORTS",
    "BAJAJ FINANCE": "BAJFINANCE",
}

def resolve_symbol_with_candidates(db: Session, query_term: str) -> dict:
    """
    Disambiguation Gate: resolves a search term to EXACT, MULTIPLE candidates, NOT_FOUND, or NONE.
    Supports exact matching, alias lookup, substring search, and fuzzy typo resolution.
    """
    if not query_term or not query_term.strip():
        return {"status": "NONE"}

    term = query_term.strip().upper()

    # 1. Direct alias match
    if term in SYMBOL_ALIASES:
        canonical = SYMBOL_ALIASES[term]
        return {"status": "EXACT", "symbol": canonical, "queried_as": query_term}

    # 2. Exact match in stock_scores (symbol is definitely scored)
    exact_score = db.query(models.StockScore.stock_symbol).filter(
        models.StockScore.stock_symbol == term
    ).first()
    if exact_score:
        return {"status": "EXACT", "symbol": exact_score[0], "queried_as": query_term}

    # 3. Exact match in symbol_mapping
    exact_map = db.query(models.SymbolMapping.stock_symbol).filter(
        models.SymbolMapping.stock_symbol == term
    ).first()
    if exact_map:
        return {"status": "EXACT", "symbol": exact_map[0], "queried_as": query_term}

    # 4. Fuzzy alias match for typos (e.g. "INFORSYS" -> "INFOSYS" -> "INFY")
    alias_matches = difflib.get_close_matches(term, list(SYMBOL_ALIASES.keys()), n=1, cutoff=0.72)
    if alias_matches:
        matched_alias = alias_matches[0]
        return {"status": "EXACT", "symbol": SYMBOL_ALIASES[matched_alias], "queried_as": query_term}

    # 5. Fuzzy substring search
    candidates = db.query(models.SymbolMapping.stock_symbol).filter(
        models.SymbolMapping.stock_symbol.ilike(f"%{term}%")
    ).limit(6).all()

    if len(candidates) == 1:
        return {"status": "EXACT", "symbol": candidates[0][0], "queried_as": query_term}
    elif len(candidates) > 1:
        return {"status": "MULTIPLE", "candidates": [c[0] for c in candidates], "queried_as": query_term}

    # 6. Fuzzy symbol match in symbol_mapping table
    all_symbols = [s[0] for s in db.query(models.SymbolMapping.stock_symbol).all()]
    symbol_matches = difflib.get_close_matches(term, all_symbols, n=3, cutoff=0.70)
    if len(symbol_matches) == 1:
        return {"status": "EXACT", "symbol": symbol_matches[0], "queried_as": query_term}
    elif len(symbol_matches) > 1:
        return {"status": "MULTIPLE", "candidates": symbol_matches, "queried_as": query_term}

    return {"status": "NOT_FOUND", "searched": query_term}

def resolve_symbol(db: Session, stock_symbol: str) -> str:
    """Returns just the canonical symbol string."""
    res = resolve_symbol_with_candidates(db, stock_symbol)
    if res.get("status") == "EXACT":
        return res["symbol"]
    return stock_symbol.strip().upper()

# ==========================================
# FIX 3: MERGED tool_stock_data
# Always returns current scores + 10-day history in one atomic call.
# No more split tools that Node 1 can "forget" to call.
# ==========================================
async def tool_stock_data(db: Session, stock_symbol: str, limit_days: int = 10):
    """
    [MERGED] Retrieves current composite scores (Overall, Technical, Safety, Sentiment)
    AND the last 10 days of dated historical scores in a single call.
    Use for: score queries, momentum checks, historical comparisons, backtest questions.
    """
    # FIX 2: Track what user called it vs what DB knows it as
    queried_as = stock_symbol
    symbol = resolve_symbol(db, stock_symbol)

    score_record = db.query(models.StockScore).filter(
        models.StockScore.stock_symbol == symbol
    ).first()

    if not score_record:
        # FIX 4: Check if symbol exists in mapping (valid but not yet scored)
        in_mapping = db.query(models.SymbolMapping.stock_symbol).filter(
            models.SymbolMapping.stock_symbol == symbol
        ).first()
        if in_mapping:
            return {
                "queried_as": queried_as,
                "resolved_to": symbol,
                "error": f"{queried_as} ({symbol}) is a valid NSE stock but has not been scored yet — batch processing is in progress. Please try again in a few hours."
            }
        return {
            "queried_as": queried_as,
            "resolved_to": symbol,
            "error": f"No data found for '{queried_as}'. Please verify the stock name or ticker symbol."
        }

    # Historical scores
    hist_scores = db.query(models.StockHistoricalScore).filter(
        models.StockHistoricalScore.stock_symbol == symbol
    ).order_by(desc(models.StockHistoricalScore.date)).limit(limit_days).all()

    history = []
    for h in hist_scores:
        history.append({
            "date": str(h.date)[:10],
            "technical_score_short": round(h.technical_score_short, 2) if h.technical_score_short else None,
            "technical_score_medium": round(h.technical_score_medium, 2) if h.technical_score_medium else None,
            "technical_score_long": round(h.technical_score_long, 2) if h.technical_score_long else None,
        })

    # Latest D/W/M technical indicators with 3-day directional slopes
    indicators = {}
    for tf in ['D', 'W', 'M']:
        recent_inds = db.query(models.StockIndicatorValue).filter(
            models.StockIndicatorValue.stock_symbol == symbol,
            models.StockIndicatorValue.timeframe == tf
        ).order_by(desc(models.StockIndicatorValue.date)).limit(3).all()

        if recent_inds:
            ind = recent_inds[0]
            rsi_slope = "flat"
            cci_slope = "flat"
            macd_hist_slope = "stable"
            if len(recent_inds) >= 2:
                prev = recent_inds[1]
                if ind.rsi_value is not None and prev.rsi_value is not None:
                    diff_rsi = ind.rsi_value - prev.rsi_value
                    rsi_slope = f"rising (+{round(diff_rsi, 1)})" if diff_rsi > 0.5 else (f"falling ({round(diff_rsi, 1)})" if diff_rsi < -0.5 else "flat")
                if ind.cci_value is not None and prev.cci_value is not None:
                    diff_cci = ind.cci_value - prev.cci_value
                    cci_slope = f"accelerating (+{round(diff_cci, 1)})" if diff_cci > 5 else (f"cooling ({round(diff_cci, 1)})" if diff_cci < -5 else "flat")
                if ind.macd_line is not None and ind.macd_signal is not None and prev.macd_line is not None and prev.macd_signal is not None:
                    hist_now = ind.macd_line - ind.macd_signal
                    hist_prev = prev.macd_line - prev.macd_signal
                    macd_hist_slope = "widening bullish" if hist_now > hist_prev and hist_now > 0 else ("narrowing" if hist_now < hist_prev else "stable")

            indicators[tf] = {
                "rsi_value": round(ind.rsi_value, 1) if ind.rsi_value else None,
                "rsi_slope": rsi_slope,
                "rsi_crossover_days": round(ind.rsi_crossover, 1) if ind.rsi_crossover else None,
                "cci_value": round(ind.cci_value, 1) if ind.cci_value else None,
                "cci_slope": cci_slope,
                "cci_crossover_days": round(ind.cci_crossover, 1) if ind.cci_crossover else None,
                "macd_line": round(ind.macd_line, 2) if ind.macd_line else None,
                "macd_signal": round(ind.macd_signal, 2) if ind.macd_signal else None,
                "macd_hist_slope": macd_hist_slope,
                "macd_crossover_days": round(ind.macd_crossover, 1) if ind.macd_crossover else None,
            }

    # FIX 2: queried_as + resolved_to in every response
    return {
        "queried_as": queried_as,
        "resolved_to": symbol,
        "note": f"User called this '{queried_as}'; NSE ticker is '{symbol}'.",
        "current_scores": {
            "overall": {
                "short": round(score_record.overall_score_short, 2) if score_record.overall_score_short else None,
                "medium": round(score_record.overall_score_medium, 2) if score_record.overall_score_medium else None,
                "long": round(score_record.overall_score_long, 2) if score_record.overall_score_long else None,
            },
            "technical": {
                "short": round(score_record.technical_score_short, 2) if score_record.technical_score_short else None,
                "medium": round(score_record.technical_score_medium, 2) if score_record.technical_score_medium else None,
                "long": round(score_record.technical_score_long, 2) if score_record.technical_score_long else None,
            },
            "safety": {
                "short": round(score_record.safety_score_short, 2) if score_record.safety_score_short else None,
                "medium": round(score_record.safety_score_medium, 2) if score_record.safety_score_medium else None,
                "long": round(score_record.safety_score_long, 2) if score_record.safety_score_long else None,
            },
            "sentiment": {
                "short": score_record.sentiment_score_short,
                "medium": score_record.sentiment_score_medium,
                "long": score_record.sentiment_score_long,
            }
        },
        "indicators": indicators,
        "historical_scores_last_10_days": history,
        "data_status": score_record.data_status,
        "computed_at": str(score_record.computed_at)[:19]
    }

async def tool_indicator_values(db: Session, stock_symbol: str, timeframe: str = None):
    """
    Retrieves raw indicator values (CCI, RSI, MACD) and crossover freshness.
    Use for: RSI overbought/oversold, MACD crossover queries, specific technical questions.
    """
    queried_as = stock_symbol
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
                "date": str(ind.date)[:10],
                "cci_value": round(ind.cci_value, 2) if ind.cci_value else None,
                "cci_crossover_days": round(ind.cci_crossover, 1) if ind.cci_crossover else None,
                "rsi_value": round(ind.rsi_value, 2) if ind.rsi_value else None,
                "rsi_crossover_days": round(ind.rsi_crossover, 1) if ind.rsi_crossover else None,
                "macd_line": round(ind.macd_line, 4) if ind.macd_line else None,
                "macd_signal": round(ind.macd_signal, 4) if ind.macd_signal else None,
                "macd_crossover_days": round(ind.macd_crossover, 1) if ind.macd_crossover else None,
            }

    if not indicators:
        return {
            "queried_as": queried_as,
            "resolved_to": symbol,
            "error": f"No indicator values recorded for {queried_as} ({symbol}). Data may still be processing."
        }

    return {
        "queried_as": queried_as,
        "resolved_to": symbol,
        "note": f"User called this '{queried_as}'; NSE ticker is '{symbol}'.",
        "timeframe_indicators": indicators
    }

async def tool_stock_fundamentals(db: Session, stock_symbol: str):
    """
    Retrieves fundamental financial metrics (PE, EPS, Sales, ROCE, ROE, Debt/Equity, Market Cap, FII holding).
    Use for: valuation queries, financial health, PE ratio, balance sheet strength questions.
    """
    queried_as = stock_symbol
    symbol = resolve_symbol(db, stock_symbol)
    fund = db.query(models.StockFundamental).filter(
        models.StockFundamental.stock_symbol == symbol
    ).first()

    if not fund:
        return {
            "queried_as": queried_as,
            "resolved_to": symbol,
            "error": f"No fundamental financial data recorded for {queried_as} ({symbol}). This data is populated during the daily batch run."
        }

    return {
        "queried_as": queried_as,
        "resolved_to": symbol,
        "note": f"User called this '{queried_as}'; NSE ticker is '{symbol}'.",
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
    Retrieves the user's personal active holdings, buy prices, current prices, and scores.
    Use for: portfolio-scoped queries, P&L, position review.
    """
    if not user_id or user_id == "anonymous":
        return {"status": "unauthenticated", "message": "User is not signed in. Please sign in to your Finwerse account to view your personal portfolio holdings and scores."}

    holdings = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.user_id == user_id,
        models.PortfolioHolding.status == 'held'
    ).all()

    if not holdings:
        return {"status": "empty", "message": "User has no active holdings in their portfolio."}

    portfolio = []
    for h in holdings:
        score = db.query(models.StockScore).filter(
            models.StockScore.stock_symbol == h.stock_symbol
        ).first()
        candle = db.query(models.StockCandle).filter(
            models.StockCandle.stock_symbol == h.stock_symbol,
            models.StockCandle.timeframe == 'D'
        ).order_by(desc(models.StockCandle.date)).first()

        current_price = candle.close if candle else None
        gain_loss_pct = None
        if current_price and h.avg_price:
            gain_loss_pct = round(((current_price - h.avg_price) / h.avg_price) * 100, 2)

        portfolio.append({
            "stock_symbol": h.stock_symbol,
            "quantity": h.quantity,
            "avg_buy_price": h.avg_price,
            "current_price": current_price,
            "gain_loss_pct": gain_loss_pct,
            "intended_holding_period": h.intended_holding_period,
            "overall_score_short": score.overall_score_short if score else None,
            "overall_score_medium": score.overall_score_medium if score else None,
            "overall_score_long": score.overall_score_long if score else None,
        })
    return {"portfolio_holdings": portfolio}

async def tool_twitter_sentiment(stock_symbol: str):
    """
    Fetches real-time investor tweets and community discussion from Twitter/X.
    Use for: social sentiment, retail chatter, trending narratives around a stock.
    """
    api_key = os.getenv("TWITTER_API_KEY")
    if not api_key:
        return {"error": "Twitter API key not configured on server. Please set TWITTER_API_KEY in environment."}

    clean_sym = stock_symbol.strip().upper()
    url = "https://api.twitterapi.io/twitter/tweet/advanced_search"
    headers = {"x-api-key": api_key}
    params = {"query": f"${clean_sym} OR {clean_sym} stock", "queryType": "Latest"}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, params=params, timeout=8.0)
            if resp.status_code != 200:
                return {"error": f"Twitter API returned status {resp.status_code}. Please try again."}

            data = resp.json()
            tweets = data.get("tweets", [])
            top_tweets = []
            for t in tweets[:4]:
                txt = t.get("text", "")
                if txt:
                    # Strip newlines and trim to 160 chars
                    cleaned_txt = " ".join(txt.split())[:160]
                    top_tweets.append(cleaned_txt)
            if not top_tweets:
                return {"result": f"No recent tweets found for ${clean_sym}."}
            return {"queried_as": stock_symbol, "community_tweets": top_tweets}
    except Exception as e:
        return {"error": f"Failed to reach Twitter API: {str(e)}"}

async def tool_news_sentiment(db: Session, stock_symbol: str):
    """
    Retrieves recent news headlines and sentiment polarity scores with article URLs.
    Use for: recent media coverage, headline sentiment, news-driven price moves.
    """
    queried_as = stock_symbol
    symbol = resolve_symbol(db, stock_symbol)
    news = db.query(models.StockNews).filter(
        models.StockNews.stock_symbol == symbol
    ).order_by(desc(models.StockNews.article_date)).limit(3).all()

    if not news:
        return {
            "queried_as": queried_as,
            "resolved_to": symbol,
            "result": f"No recent news articles found for {queried_as} ({symbol})."
        }

    articles = []
    for n in news:
        polarity_label = "Positive" if n.polarity and n.polarity > 0.15 else ("Negative" if n.polarity and n.polarity < -0.15 else "Neutral")
        articles.append({
            "date": str(n.article_date)[:10],
            "headline": n.headline,
            "sentiment": polarity_label,
            "url": n.source_url
        })
    return {
        "queried_as": queried_as,
        "resolved_to": symbol,
        "recent_news_articles": articles
    }

async def tool_nse_filings_rag(db: Session, stock_symbol: str, query: str = "corporate announcements"):
    """
    Retrieves recent official NSE corporate filings, disclosures, and announcements.
    Use for: quarterly results, board decisions, dividends, regulatory announcements.
    """
    queried_as = stock_symbol
    symbol = resolve_symbol(db, stock_symbol)

    filings = db.query(models.CorporateFiling).filter(
        models.CorporateFiling.stock_symbol == symbol
    ).order_by(desc(models.CorporateFiling.filing_date)).limit(2).all()

    if not filings:
        return {
            "queried_as": queried_as,
            "resolved_to": symbol,
            "result": f"No official corporate filings recorded for {queried_as} ({symbol}) in the database yet."
        }

    excerpts = [{"type": r.filing_type, "date": str(r.filing_date)[:10], "summary": " ".join(r.chunk_text.split())[:180], "url": r.source_url} for r in filings]
    return {
        "queried_as": queried_as,
        "resolved_to": symbol,
        "filings_context": excerpts
    }

async def tool_comprehensive_stock_analysis(db: Session, stock_symbol: str):
    """
    [UNIFIED 4-IN-1 ENGINE] Fetches complete multi-pillar data for a stock:
    1. Composite Scores (Overall, Technical, Safety, Sentiment across Short, Medium, Long terms)
    2. Multi-Timeframe Technical Indicators (RSI, CCI, MACD with crossover freshness and 3-day directional slopes)
    3. 10-day historical scores
    4. Recent News Articles with Sentiment and Source URLs
    5. Real-Time Twitter Community Pulse & Sentiment
    6. Official NSE Corporate Disclosures & Filings
    All pillars execute in parallel via asyncio.gather.
    """
    queried_as = stock_symbol
    symbol = resolve_symbol(db, stock_symbol)

    stock_data_res, news_res, twitter_res, filings_res = await asyncio.gather(
        tool_stock_data(db, symbol),
        tool_news_sentiment(db, symbol),
        tool_twitter_sentiment(symbol),
        tool_nse_filings_rag(db, symbol),
        return_exceptions=True
    )

    # return_exceptions=True means a failed pillar surfaces here as a raw Exception
    # instance instead of raising — convert each to the same error-dict shape this
    # function's own internal try/except previously produced, so one failed pillar
    # still never blocks the other 3.
    if isinstance(stock_data_res, Exception):
        stock_data_res = {"error": str(stock_data_res)}
    if isinstance(news_res, Exception):
        news_res = {"result": "No news available"}
    if isinstance(twitter_res, Exception):
        twitter_res = {"result": "No twitter data"}
    if isinstance(filings_res, Exception):
        filings_res = {"result": "No filings available"}

    return {
        "queried_as": queried_as,
        "resolved_to": symbol,
        "stock_overview_and_scores": stock_data_res,
        "news_sentiment": news_res,
        "twitter_community_sentiment": twitter_res,
        "official_corporate_filings": filings_res,
    }
