import time
import logging
from datetime import datetime, timedelta
import pandas as pd
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from sqlalchemy.orm import Session
import httpx

import models
from services.data_fetcher import AngelOneClient, IndianAPIClient, EODHDClient
from services.scoring import compute_technical_scores, compute_overall_score, compute_safety_scores, safe_float, compute_timeframe_sentiment

logger = logging.getLogger(__name__)

# Angel One limits: ~3 requests per second. We use 2.0s delay to be safe and avoid burst limits.
ANGEL_ONE_DELAY = 2.0

# EODHD limits: 1000 requests per minute -> ~16 requests per second
EODHD_DELAY = 0.07 

# IndianAPI limits: Assume standard 2-3 requests per second to be safe
INDIANAPI_DELAY = 0.5 

class RateLimitException(Exception):
    pass

def handle_httpx_errors(retry_state):
    logger.warning(f"Retrying after error: {retry_state.outcome.exception()}")

class BatchProcessor:
    def __init__(self, db: Session):
        self.db = db
        self.angel_client = AngelOneClient()
        self.indianapi_client = IndianAPIClient()
        self.eodhd_client = EODHDClient()
        
    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type((httpx.HTTPError, RateLimitException)),
        after=handle_httpx_errors
    )
    def fetch_angel_candles(self, token, interval, from_date, to_date):
        time.sleep(ANGEL_ONE_DELAY)
        res = self.angel_client.get_historical_candles(
            symboltoken=token, 
            interval=interval, 
            from_date=from_date, 
            to_date=to_date
        )
        if not res.get('status'):
            msg = str(res.get('message', ''))
            if "Too Many Requests" in str(res) or "403" in msg or "429" in msg or res.get('errorcode') == 'AB1010':
                raise RateLimitException(f"Angel One Rate Limit Hit: {msg}")
            logger.error(f"Angel One Error: {res}")
            return None
        return res.get('data')

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((httpx.HTTPError, RateLimitException)),
        after=handle_httpx_errors
    )
    def fetch_eodhd_news(self, symbol, from_date, to_date):
        time.sleep(EODHD_DELAY)
        res = self.eodhd_client.get_news(symbol, from_date, to_date)
        if isinstance(res, dict) and res.get('error'):
            raise RateLimitException("EODHD Rate Limit Hit")
        return res

    def process_stock(self, mapping: models.SymbolMapping):
        logger.info(f"Processing {mapping.stock_symbol}...")
        
        # 1. Fetch data from Angel One (requires login first)
        if not self.angel_client.jwt_token:
            self.angel_client.login()
            
        now = datetime.now()
        to_date_str = now.strftime("%Y-%m-%d %H:%M")
        
        # Angel One allows up to 2000 trading days of ONE_DAY candle history.
        # 2000 days resamples to ~400 weekly and ~95 monthly candles — well above
        # the 69-candle warmup needed for CCI(60,9).
        from_date_daily = (now - timedelta(days=2000)).strftime("%Y-%m-%d %H:%M")
        daily_data = self.fetch_angel_candles(mapping.angel_token, "ONE_DAY", from_date_daily, to_date_str)
        
        if not daily_data:
            logger.warning(f"Missing candle data for {mapping.stock_symbol}, skipping technicals.")
            tech_scores = {"short": 0, "medium": 0, "long": 0}
        else:
            df_daily = pd.DataFrame(daily_data, columns=['date', 'open', 'high', 'low', 'close', 'volume'])
            
            # Convert types
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df_daily[col] = pd.to_numeric(df_daily[col], errors='coerce')
            df_daily['date'] = pd.to_datetime(df_daily['date'])
            df_daily = df_daily.set_index('date').sort_index()
            
            # Resample daily data into weekly and monthly
            df_weekly = df_daily.resample('W').agg({
                'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'
            }).dropna()
            
            df_monthly = df_daily.resample('ME').agg({
                'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'
            }).dropna()
            
            # Reset index for scoring functions
            df_daily = df_daily.reset_index()
            df_weekly = df_weekly.reset_index()
            df_monthly = df_monthly.reset_index()
            
            tech_scores = compute_technical_scores(df_daily, df_weekly, df_monthly)

        # 2. Fetch Sentiment from EODHD
        sentiment_scores = {"short": "Not Available", "medium": "Not Available", "long": "Not Available"}
        if mapping.eodhd_symbol:
            # EODHD news API maps Indian tickers to global/US symbols (.US suffix instead of .NSE)
            eodhd_news_symbol = mapping.eodhd_symbol
            if eodhd_news_symbol.endswith(".NSE"):
                eodhd_news_symbol = eodhd_news_symbol.replace(".NSE", ".US")
                
            from_date_news = (now - timedelta(days=30)).strftime("%Y-%m-%d")
            to_date_news = now.strftime("%Y-%m-%d")
            try:
                news_data = self.fetch_eodhd_news(eodhd_news_symbol, from_date_news, to_date_news)
                if isinstance(news_data, list) and len(news_data) > 0:
                    # Deduplicate news articles
                    seen_keys = set()
                    deduped_news = []
                    for art in news_data:
                        title = art.get("title", "").strip().lower()
                        date_str = art.get("date", "")
                        try:
                            dt = datetime.fromisoformat(date_str)
                            hour_bucket = dt.strftime("%Y-%m-%d %H")
                            key = (title, hour_bucket)
                            if key not in seen_keys:
                                seen_keys.add(key)
                                deduped_news.append(art)
                        except Exception:
                            if title not in seen_keys:
                                seen_keys.add(title)
                                deduped_news.append(art)
                    
                    # Calculate timeframe weighted sentiment
                    sentiment_scores = {
                        "short": compute_timeframe_sentiment(deduped_news, 3, now),
                        "medium": compute_timeframe_sentiment(deduped_news, 15, now),
                        "long": compute_timeframe_sentiment(deduped_news, 30, now)
                    }
                    logger.info(f"Computed sentiment scores for {mapping.stock_symbol}: {sentiment_scores}")
            except Exception as e:
                logger.error(f"Error fetching news for {mapping.stock_symbol}: {e}")

        # 3. Compute Safety Score
        safety_scores = {"short": 50, "medium": 50, "long": 50}
        try:
            logger.info(f"Fetching fundamental data for {mapping.stock_symbol}...")
            time.sleep(INDIANAPI_DELAY)
            ratios_data = self.indianapi_client.get_ratios(mapping.stock_symbol)
            
            time.sleep(INDIANAPI_DELAY)
            stock_data = self.indianapi_client.get_stock_details(mapping.stock_symbol)

            time.sleep(INDIANAPI_DELAY)
            quarter_data = self.indianapi_client.get_quarterly_results(mapping.stock_symbol)

            time.sleep(INDIANAPI_DELAY)
            yoy_data = self.indianapi_client.get_yoy_results(mapping.stock_symbol)

            time.sleep(INDIANAPI_DELAY)
            balance_data = self.indianapi_client.get_balancesheet(mapping.stock_symbol)

            time.sleep(INDIANAPI_DELAY)
            shareholding_data = self.indianapi_client.get_shareholding_pattern(mapping.stock_symbol)
            
            # Pass df_daily if it exists
            df_daily_dict = None
            if 'df_daily' in locals() and df_daily is not None:
                df_daily_dict = df_daily

            safety_scores = compute_safety_scores(
                ratios_data, 
                stock_data, 
                quarter_data, 
                yoy_data, 
                balance_data, 
                shareholding_data,
                df_daily_dict
            )
            logger.info(f"Computed 11-indicator safety scores for {mapping.stock_symbol}: {safety_scores}")
        except Exception as e:
            logger.error(f"Error computing safety scores for {mapping.stock_symbol}: {e}")

        # 4. Overall Scores
        overall_short = compute_overall_score(tech_scores['short'], safety_scores['scores']['short'], sentiment_scores['short'] if sentiment_scores['short'] != "Not Available" else None, 'short')
        overall_medium = compute_overall_score(tech_scores['medium'], safety_scores['scores']['medium'], sentiment_scores['medium'] if sentiment_scores['medium'] != "Not Available" else None, 'medium')
        overall_long = compute_overall_score(tech_scores['long'], safety_scores['scores']['long'], sentiment_scores['long'] if sentiment_scores['long'] != "Not Available" else None, 'long')

        # 5. Save Scores to DB
        score_record = self.db.query(models.StockScore).filter(models.StockScore.stock_symbol == mapping.stock_symbol).first()
        if not score_record:
            score_record = models.StockScore(stock_symbol=mapping.stock_symbol)
            self.db.add(score_record)
            
        score_record.technical_score_short = tech_scores['short']
        score_record.technical_score_medium = tech_scores['medium']
        score_record.technical_score_long = tech_scores['long']
        
        score_record.safety_score_short = safety_scores['scores']['short']
        score_record.safety_score_medium = safety_scores['scores']['medium']
        score_record.safety_score_long = safety_scores['scores']['long']
        
        score_record.sentiment_score_short = str(sentiment_scores['short'])
        score_record.sentiment_score_medium = str(sentiment_scores['medium'])
        score_record.sentiment_score_long = str(sentiment_scores['long'])
        
        score_record.overall_score_short = overall_short
        score_record.overall_score_medium = overall_medium
        score_record.overall_score_long = overall_long
        
        # 6. Save Fundamentals to DB
        fund_record = self.db.query(models.StockFundamental).filter(models.StockFundamental.stock_symbol == mapping.stock_symbol).first()
        if not fund_record:
            fund_record = models.StockFundamental(stock_symbol=mapping.stock_symbol)
            self.db.add(fund_record)
            
        metrics = safety_scores.get('metrics', {})
        fund_record.period = metrics.get('period')
        fund_record.sales = safe_float(metrics.get('sales'))
        fund_record.eps = safe_float(metrics.get('eps'))
        fund_record.opm = safe_float(metrics.get('opm'))
        fund_record.roce = safe_float(metrics.get('roce'))
        fund_record.roe = safe_float(metrics.get('roe'))
        fund_record.debt_to_equity = safe_float(metrics.get('debt_to_equity'))
        fund_record.pe_ratio = safe_float(metrics.get('pe_ratio'))
        fund_record.market_cap = safe_float(metrics.get('market_cap'))
        fund_record.fii_holding_pct = safe_float(metrics.get('fii_holding_pct'))
        
        self.db.commit()
        logger.info(f"Successfully processed {mapping.stock_symbol}")

    def run(self):
        logger.info("Starting Batch Processing Loop...")
        mappings = self.db.query(models.SymbolMapping).all()
        for mapping in mappings:
            try:
                self.process_stock(mapping)
            except Exception as e:
                logger.error(f"Critical error processing {mapping.stock_symbol}: {e}")
                self.db.rollback()
        logger.info("Batch Processing Loop Complete.")
