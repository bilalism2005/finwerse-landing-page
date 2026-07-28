import time
import logging
from datetime import datetime, timedelta
import pandas as pd
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from sqlalchemy.orm import Session
import httpx

import models
from services.data_fetcher import AngelOneClient, IndianAPIClient, EODHDClient
from services.scoring import compute_technical_scores, compute_overall_score

logger = logging.getLogger(__name__)

# Angel One limits: ~3 requests per second
ANGEL_ONE_DELAY = 0.35

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
            if "Too Many Requests" in str(res) or res.get('errorcode') == 'AB1010': # Example rate limit code
                raise RateLimitException("Angel One Rate Limit Hit")
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
        
        # Angel One only supports ONE_DAY interval for equity
        # Fetch ~3 years of daily data (enough to resample into weekly/monthly)
        from_date_daily = (now - timedelta(days=365*3)).strftime("%Y-%m-%d %H:%M")
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
            from_date_news = (now - timedelta(days=7)).strftime("%Y-%m-%d")
            to_date_news = now.strftime("%Y-%m-%d")
            try:
                news_data = self.fetch_eodhd_news(mapping.eodhd_symbol, from_date_news, to_date_news)
                if isinstance(news_data, list) and len(news_data) > 0:
                    # Simple average sentiment
                    sentiments = [n.get('sentiment', {}).get('polarity', 0) for n in news_data]
                    avg_sentiment = sum(sentiments) / len(sentiments) * 100 # scale to -100 to 100
                    sentiment_scores = {"short": avg_sentiment, "medium": avg_sentiment, "long": avg_sentiment}
            except Exception as e:
                logger.error(f"Error fetching news for {mapping.stock_symbol}: {e}")

        # 3. Compute Safety Score (Mocked for now until IndianAPI integration is fully wired in batch)
        # In a real scenario, we'd fetch fundamentals here or retrieve from DB if updated recently
        safety_scores = {"short": 50, "medium": 50, "long": 50}

        # 4. Overall Scores
        overall_short = compute_overall_score(tech_scores['short'], safety_scores['short'], sentiment_scores['short'] if sentiment_scores['short'] != "Not Available" else None, 'short')
        overall_medium = compute_overall_score(tech_scores['medium'], safety_scores['medium'], sentiment_scores['medium'] if sentiment_scores['medium'] != "Not Available" else None, 'medium')
        overall_long = compute_overall_score(tech_scores['long'], safety_scores['long'], sentiment_scores['long'] if sentiment_scores['long'] != "Not Available" else None, 'long')

        # 5. Save to DB
        score_record = self.db.query(models.StockScore).filter(models.StockScore.stock_symbol == mapping.stock_symbol).first()
        if not score_record:
            score_record = models.StockScore(stock_symbol=mapping.stock_symbol)
            self.db.add(score_record)
            
        score_record.technical_score_short = tech_scores['short']
        score_record.technical_score_medium = tech_scores['medium']
        score_record.technical_score_long = tech_scores['long']
        
        score_record.safety_score_short = safety_scores['short']
        score_record.safety_score_medium = safety_scores['medium']
        score_record.safety_score_long = safety_scores['long']
        
        score_record.sentiment_score_short = str(sentiment_scores['short'])
        score_record.sentiment_score_medium = str(sentiment_scores['medium'])
        score_record.sentiment_score_long = str(sentiment_scores['long'])
        
        score_record.overall_score_short = overall_short
        score_record.overall_score_medium = overall_medium
        score_record.overall_score_long = overall_long
        
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
