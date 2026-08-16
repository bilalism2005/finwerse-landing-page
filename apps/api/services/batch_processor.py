import time
import logging
from datetime import datetime, timedelta, timezone
import pandas as pd
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from sqlalchemy.orm import Session
import httpx

import models
from services.data_fetcher import AngelOneClient, IndianAPIClient, EODHDClient
from config.holidays import get_trading_days_between
from services.scoring import compute_technical_scores, compute_overall_score, compute_safety_scores, safe_float, compute_timeframe_sentiment, validate_article_for_stock, compute_historical_technical_scores
logger = logging.getLogger(__name__)

def parse_date(date_str):
    try:
        dt = datetime.fromisoformat(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
        return dt
    except Exception:
        dt = pd.to_datetime(date_str).to_pydatetime()
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
        return dt

def to_utc_naive(dt):
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def validate_candle_sanity(symbol, date, open_p, high, low, close, volume):
    if open_p < 0 or close < 0 or high < 0 or low < 0:
        raise ValueError(f"Sanity check failed for {symbol} on {date}: Negative values found (O:{open_p}, H:{high}, L:{low}, C:{close})")
    if high < low:
        raise ValueError(f"Sanity check failed for {symbol} on {date}: High cannot be less than low (H:{high}, L:{low})")
    if high < open_p or high < close or low > open_p or low > close:
        raise ValueError(f"Sanity check failed for {symbol} on {date}: High/Low out of bounds relative to Open/Close (O:{open_p}, H:{high}, L:{low}, C:{close})")



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
        
        # Check if the token has expired
        if isinstance(res, dict) and (res.get('errorCode') == 'AG8001' or res.get('message') == 'Invalid Token'):
            logger.warning("Angel One session token expired (AG8001). Re-authenticating...")
            self.angel_client.login()  # Force login to refresh jwt_token
            # Retry request once
            res = self.angel_client.get_historical_candles(
                symboltoken=token, 
                interval=interval, 
                from_date=from_date, 
                to_date=to_date
            )

        if not res or not res.get('status'):
            msg = str(res.get('message', '')) if res else 'Empty response'
            if res and ("Too Many Requests" in str(res) or "403" in msg or "429" in msg or res.get('errorcode') == 'AB1010'):
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
        data_status = "SUCCESS"
        
        # 1. Fetch/Update Daily Candle Data in Database Cache
        if not self.angel_client.jwt_token:
            self.angel_client.login()
            
        now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
        
        # Check if we already have daily candles in Supabase for this stock
        max_candle = self.db.query(models.StockCandle).filter(
            models.StockCandle.stock_symbol == mapping.stock_symbol,
            models.StockCandle.timeframe == 'D'
        ).order_by(models.StockCandle.date.desc()).first()

        # Get existing dates from the DB
        existing_candles = self.db.query(models.StockCandle.date).filter(
            models.StockCandle.stock_symbol == mapping.stock_symbol,
            models.StockCandle.timeframe == 'D'
        ).all()
        existing_dates = {to_utc_naive(c[0]) for c in existing_candles}

        try:
            if not max_candle:
                logger.info(f"Performing exhaustive historical backfill for {mapping.stock_symbol}...")
                current_to_date = now
                total_candles_fetched = 0
                
                while True:
                    to_date_str = current_to_date.strftime("%Y-%m-%d %H:%M")
                    # Go back 1999 days (~5.5 years)
                    from_date_obj = current_to_date - timedelta(days=1999)
                    from_date_str = from_date_obj.strftime("%Y-%m-%d %H:%M")
                    
                    logger.info(f"Fetching candles from {from_date_str} to {to_date_str}...")
                    daily_data = self.fetch_angel_candles(mapping.angel_token, "ONE_DAY", from_date_str, to_date_str)
                    
                    if not daily_data or len(daily_data) == 0:
                        logger.info("No more candles returned by API. Backfill complete.")
                        break
                        
                    logger.info(f"Fetched {len(daily_data)} candles.")
                    
                    # Bulk insert this batch using the O(1) set check
                    new_candles = []
                    for c in daily_data:
                        dt = parse_date(c[0])
                        dt_utc = to_utc_naive(dt)
                        if dt_utc not in existing_dates:
                            try:
                                o_val = safe_float(c[1])
                                h_val = safe_float(c[2])
                                l_val = safe_float(c[3])
                                cl_val = safe_float(c[4])
                                v_val = safe_float(c[5])
                                validate_candle_sanity(mapping.stock_symbol, dt, o_val, h_val, l_val, cl_val, v_val)
                                db_candle = models.StockCandle(
                                    stock_symbol=mapping.stock_symbol,
                                    timeframe='D',
                                    date=dt,
                                    open=o_val,
                                    high=h_val,
                                    low=l_val,
                                    close=cl_val,
                                    volume=v_val
                                )
                                new_candles.append(db_candle)
                                existing_dates.add(dt_utc)
                            except ValueError as ve:
                                logger.error(ve)
                    
                    if new_candles:
                        self.db.bulk_save_objects(new_candles)
                        self.db.commit()
                        
                    total_candles_fetched += len(daily_data)
                    
                    # Determine the earliest date in the fetched batch
                    earliest_date_str = daily_data[0][0]
                    earliest_date = parse_date(earliest_date_str)
                    
                    if earliest_date >= current_to_date or len(daily_data) < 10:
                        break
                        
                    current_to_date = earliest_date - timedelta(days=1)
                    time.sleep(1.0)
                    
                logger.info(f"Finished backfill. Total candles fetched/processed: {total_candles_fetched}")
            else:
                # Incremental update: check missing trading days
                last_date = max_candle.date
                last_date_obj = last_date.date() if hasattr(last_date, 'date') else last_date
                today_obj = now.date()
                
                # Check how many trading days are missing (from day after last_date to today)
                missing_trading_days = get_trading_days_between(last_date_obj + timedelta(days=1), today_obj)
                
                # We always want to fetch at least to update today's candle (if it's a trading day) or yesterday's
                # But if missing_trading_days == 0 and last_date_obj is not less than today, we can skip.
                # Actually, if missing is 0 and last_date is today or in the future, skip.
                if missing_trading_days == 0 and last_date_obj >= today_obj:
                    logger.info(f"No new trading days for {mapping.stock_symbol} since {last_date_obj}. Skipping incremental fetch.")
                    recent_data = []
                else:
                    # Format dates (overlap by starting from last_date to overwrite today's/yesterday's candle in case it was incomplete)
                    from_date_str = last_date.strftime("%Y-%m-%d %H:%M")
                    to_date_str = now.strftime("%Y-%m-%d %H:%M")
                    
                    logger.info(f"Fetching incremental candles (Missing trading days: {missing_trading_days}) from {from_date_str} to {to_date_str}...")
                    recent_data = self.fetch_angel_candles(mapping.angel_token, "ONE_DAY", from_date_str, to_date_str)
                
                if recent_data:
                    # Optimized batch upsert for incremental candles
                    recent_dates = [parse_date(c[0]) for c in recent_data]
                    existing_candles_recent = self.db.query(models.StockCandle).filter(
                        models.StockCandle.stock_symbol == mapping.stock_symbol,
                        models.StockCandle.timeframe == 'D',
                        models.StockCandle.date.in_(recent_dates)
                    ).all()
                    existing_map = {to_utc_naive(ec.date): ec for ec in existing_candles_recent}
                    
                    new_count = 0
                    updated_count = 0
                    for c in recent_data:
                        dt = parse_date(c[0])
                        dt_utc = to_utc_naive(dt)
                        exists = existing_map.get(dt_utc)
                        
                        if not exists:
                            try:
                                o_val = safe_float(c[1])
                                h_val = safe_float(c[2])
                                l_val = safe_float(c[3])
                                cl_val = safe_float(c[4])
                                v_val = safe_float(c[5])
                                validate_candle_sanity(mapping.stock_symbol, dt, o_val, h_val, l_val, cl_val, v_val)
                                db_candle = models.StockCandle(
                                    stock_symbol=mapping.stock_symbol,
                                    timeframe='D',
                                    date=dt,
                                    open=o_val,
                                    high=h_val,
                                    low=l_val,
                                    close=cl_val,
                                    volume=v_val
                                )
                                self.db.add(db_candle)
                                new_count += 1
                                existing_dates.add(dt_utc)
                            except ValueError as ve:
                                logger.error(ve)
                        else:
                            try:
                                o_val = safe_float(c[1])
                                h_val = safe_float(c[2])
                                l_val = safe_float(c[3])
                                cl_val = safe_float(c[4])
                                v_val = safe_float(c[5])
                                validate_candle_sanity(mapping.stock_symbol, dt, o_val, h_val, l_val, cl_val, v_val)
                                exists.open = o_val
                                exists.high = h_val
                                exists.low = l_val
                                exists.close = cl_val
                                exists.volume = v_val
                                updated_count += 1
                            except ValueError as ve:
                                logger.error(ve)
                    self.db.commit()
                    logger.info(f"Incremental update complete: added {new_count}, updated {updated_count} candles.")
        except RateLimitException as re:
            data_status = "RATE_LIMITED"
            logger.warning(f"Angel One rate limit exception for {mapping.stock_symbol}: {re}")
        except Exception as e:
            data_status = "FAILED"
            logger.error(f"Angel One candle fetch failed for {mapping.stock_symbol}: {e}")

        # Load ALL daily candles from the database to build weekly/monthly and compute scores
        db_candles = self.db.query(models.StockCandle).filter(
            models.StockCandle.stock_symbol == mapping.stock_symbol,
            models.StockCandle.timeframe == 'D'
        ).order_by(models.StockCandle.date.asc()).all()

        if not db_candles:
            logger.warning(f"No candle data available in DB for {mapping.stock_symbol}, skipping technicals.")
            tech_scores = {"short": 0.0, "medium": 0.0, "long": 0.0}
            df_daily = None
        else:
            daily_list = []
            for c in db_candles:
                daily_list.append({
                    "date": c.date,
                    "open": c.open,
                    "high": c.high,
                    "low": c.low,
                    "close": c.close,
                    "volume": c.volume
                })
            
            df_daily = pd.DataFrame(daily_list)
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df_daily[col] = pd.to_numeric(df_daily[col], errors='coerce')
            
            df_daily['date'] = pd.to_datetime(df_daily['date'])
            df_daily = df_daily.set_index('date').sort_index()
            
            df_weekly = df_daily.resample('W').agg({
                'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'
            }).dropna()
            
            df_monthly = df_daily.resample('ME').agg({
                'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'
            }).dropna()
            
            df_daily = df_daily.reset_index()
            df_weekly = df_weekly.reset_index()
            df_monthly = df_monthly.reset_index()
            
            # Compute historical scores
            logger.info(f"Computing historical technical scores for {mapping.stock_symbol}...")
            hist_scores, all_indicators = compute_historical_technical_scores(df_daily, df_weekly, df_monthly)
            
            # Write/Upsert historical scores in database (Optimized via single query map lookup)
            logger.info(f"Saving historical score records to database...")
            
            # To avoid overwriting thousands of unchanged historical scores over WAN on every run,
            # we only upsert scores starting from our incremental fetch boundary (minus a 5-day buffer).
            affected_from_date = None
            if max_candle:
                affected_from_date = last_date - timedelta(days=5)
                
            existing_scores = self.db.query(models.StockHistoricalScore).filter(
                models.StockHistoricalScore.stock_symbol == mapping.stock_symbol
            ).all()
            existing_score_map = {to_utc_naive(es.date): es for es in existing_scores}
            
            score_inserts = []
            saved_count = 0
            for hs in hist_scores:
                # Skip saving if it's before the affected date range
                if affected_from_date and hs['date'] < affected_from_date:
                    continue
                    
                hs_date_utc = to_utc_naive(hs['date'])
                exists_score = existing_score_map.get(hs_date_utc)
                
                if not exists_score:
                    db_hist_score = models.StockHistoricalScore(
                        stock_symbol=mapping.stock_symbol,
                        date=hs['date'],
                        technical_score_short=hs['short'],
                        technical_score_medium=hs['medium'],
                        technical_score_long=hs['long']
                    )
                    score_inserts.append(db_hist_score)
                    saved_count += 1
                else:
                    # Only update if the values are actually different to prevent dirty tracking updates
                    if (exists_score.technical_score_short != hs['short'] or
                        exists_score.technical_score_medium != hs['medium'] or
                        exists_score.technical_score_long != hs['long']):
                        exists_score.technical_score_short = hs['short']
                        exists_score.technical_score_medium = hs['medium']
                        exists_score.technical_score_long = hs['long']
                        saved_count += 1
                    
            if score_inserts:
                self.db.bulk_save_objects(score_inserts)
            self.db.commit()
            logger.info(f"Saved/updated {saved_count} historical scores for {mapping.stock_symbol}.")
            
            # --- Save Raw Indicator Values ---
            logger.info(f"Saving exact indicator values to database...")
            
            # Get existing indicators to update instead of insert (prevent duplicate errors)
            # Only pull for the affected dates to save memory
            existing_inds_query = self.db.query(models.StockIndicatorValue).filter(
                models.StockIndicatorValue.stock_symbol == mapping.stock_symbol
            )
            if affected_from_date:
                existing_inds_query = existing_inds_query.filter(models.StockIndicatorValue.date >= affected_from_date)
            
            existing_inds = existing_inds_query.all()
            
            # Map: (date_utc, timeframe) -> db_record
            existing_inds_map = {(to_utc_naive(ei.date), ei.timeframe): ei for ei in existing_inds}
            
            ind_inserts = []
            ind_saved_count = 0
            
            for ind in all_indicators:
                if affected_from_date and ind['date'] < affected_from_date:
                    continue
                    
                ind_date_utc = to_utc_naive(ind['date'])
                tf = ind['timeframe']
                
                exists_ind = existing_inds_map.get((ind_date_utc, tf))
                
                if not exists_ind:
                    db_ind = models.StockIndicatorValue(
                        stock_symbol=mapping.stock_symbol,
                        date=ind['date'],
                        timeframe=tf,
                        cci_value=ind['cci_value'],
                        cci_sma=ind['cci_sma'],
                        cci_crossover=ind['cci_crossover'],
                        rsi_value=ind['rsi_value'],
                        rsi_sma=ind['rsi_sma'],
                        rsi_crossover=ind['rsi_crossover'],
                        macd_line=ind['macd_line'],
                        macd_signal=ind['macd_signal'],
                        macd_crossover=ind['macd_crossover']
                    )
                    ind_inserts.append(db_ind)
                    ind_saved_count += 1
                else:
                    # Dirty track manually
                    updated = False
                    for key in ['cci_value', 'cci_sma', 'cci_crossover', 'rsi_value', 'rsi_sma', 'rsi_crossover', 'macd_line', 'macd_signal', 'macd_crossover']:
                        if getattr(exists_ind, key) != ind[key]:
                            setattr(exists_ind, key, ind[key])
                            updated = True
                    if updated:
                        ind_saved_count += 1
            
            if ind_inserts:
                self.db.bulk_save_objects(ind_inserts)
            self.db.commit()
            logger.info(f"Saved/updated {ind_saved_count} raw indicator values for {mapping.stock_symbol}.")
            
            if hist_scores:
                latest_hs = hist_scores[-1]
                tech_scores = {
                    "short": latest_hs["short"] if latest_hs["short"] is not None else 0.0,
                    "medium": latest_hs["medium"] if latest_hs["medium"] is not None else 0.0,
                    "long": latest_hs["long"] if latest_hs["long"] is not None else 0.0
                }
            else:
                tech_scores = {"short": 0.0, "medium": 0.0, "long": 0.0}

        # 2. Compute Safety Score
        safety_scores = {"scores": {"short": 50.0, "medium": 50.0, "long": 50.0}, "metrics": {}}
        stock_data = None
        
        fund_record = self.db.query(models.StockFundamental).filter(models.StockFundamental.stock_symbol == mapping.stock_symbol).first()
        should_fetch_fundamentals = True
        if fund_record and fund_record.updated_at:
            updated_at_utc = to_utc_naive(fund_record.updated_at)
            days_since_update = (to_utc_naive(now) - updated_at_utc).days
            # Fetch if older than 7 days, OR if it's Friday and we haven't fetched today yet
            if days_since_update < 7 and not (now.weekday() == 4 and days_since_update >= 1):
                should_fetch_fundamentals = False

        if should_fetch_fundamentals:
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
            except httpx.HTTPStatusError as he:
                if he.response.status_code == 429:
                    data_status = "RATE_LIMITED"
                    logger.warning(f"IndianAPI rate limit hit (429) for {mapping.stock_symbol}")
                else:
                    data_status = "FAILED"
                    logger.error(f"IndianAPI HTTP error {he.response.status_code} for {mapping.stock_symbol}")
            except Exception as e:
                data_status = "FAILED"
                logger.error(f"Error computing safety scores for {mapping.stock_symbol}: {e}")
        else:
            # Use cached scores from DB
            score_record_cache = self.db.query(models.StockScore).filter(models.StockScore.stock_symbol == mapping.stock_symbol).first()
            if score_record_cache and score_record_cache.safety_score_short is not None:
                logger.info(f"Using cached fundamental data and safety scores for {mapping.stock_symbol}...")
                safety_scores = {
                    "scores": {
                        "short": score_record_cache.safety_score_short,
                        "medium": score_record_cache.safety_score_medium,
                        "long": score_record_cache.safety_score_long
                    },
                    "metrics": {} # Not needed when not updating fundamentals
                }


        # Extract company name for dynamic news filtering
        company_name = ""
        if stock_data:
            company_name = stock_data.get("stockDetailsReusableData", {}).get("name", "")

        # 3. Fetch Sentiment from EODHD and Cache in DB
        sentiment_scores = {"short": "Not Available", "medium": "Not Available", "long": "Not Available"}
        if mapping.eodhd_symbol:
            # EODHD news API maps Indian tickers to global/US symbols (.US suffix instead of .NSE)
            eodhd_news_symbol = mapping.eodhd_symbol
            if eodhd_news_symbol.endswith(".NSE"):
                eodhd_news_symbol = eodhd_news_symbol.replace(".NSE", ".US")
                
            # Delta-based fetching for EODHD: check max article_date in DB
            max_news = self.db.query(models.StockNews).filter(models.StockNews.stock_symbol == mapping.stock_symbol).order_by(models.StockNews.article_date.desc()).first()
            if max_news and max_news.article_date:
                # Fetch from the last recorded article date
                from_date_news = max_news.article_date.strftime("%Y-%m-%d")
            else:
                # If no existing news, fetch last 30 days
                from_date_news = (now - timedelta(days=30)).strftime("%Y-%m-%d")
                
            to_date_news = now.strftime("%Y-%m-%d")
            
            # Avoid fetching if from_date is equal to to_date and it's already fetched? 
            # EODHD accepts same date for from and to, it just fetches that day.
            try:
                news_data = self.fetch_eodhd_news(eodhd_news_symbol, from_date_news, to_date_news)
                if isinstance(news_data, list):
                    # Cache articles in DB
                    for art in news_data:
                        url = art.get("link") or art.get("url") or ""
                        if not url:
                            continue
                        
                        # Validate if the article belongs to this company
                        if not validate_article_for_stock(art, mapping.stock_symbol, company_name):
                            logger.info(f"Article skipped (mismatch/collision): {art.get('title')} | url: {url}")
                            continue

                        # Check duplicate by unique source_url
                        exists = self.db.query(models.StockNews).filter(models.StockNews.source_url == url).first()
                        if not exists:
                            date_str = art.get("date", "")
                            try:
                                dt = datetime.fromisoformat(date_str)
                            except Exception:
                                dt = now
                            polarity = safe_float(art.get("sentiment", {}).get("polarity", 0.0))
                            
                            db_news = models.StockNews(
                                stock_symbol=mapping.stock_symbol,
                                article_date=dt,
                                polarity=polarity,
                                source_url=url
                            )
                            self.db.add(db_news)
                    self.db.commit()
            except httpx.HTTPStatusError as he:
                if he.response.status_code == 429:
                    if data_status != "FAILED":
                        data_status = "RATE_LIMITED"
                    logger.warning(f"EODHD rate limit hit (429) for {mapping.stock_symbol}")
                else:
                    data_status = "FAILED"
                    logger.error(f"EODHD HTTP error {he.response.status_code} for {mapping.stock_symbol}")
            except Exception as e:
                data_status = "FAILED"
                logger.error(f"Error fetching and caching news for {mapping.stock_symbol}: {e}")
                self.db.rollback()

            # Read cached articles for this stock from DB for the rolling 30-day window
            try:
                thirty_days_ago = now - timedelta(days=30)
                db_articles = self.db.query(models.StockNews).filter(
                    models.StockNews.stock_symbol == mapping.stock_symbol,
                    models.StockNews.article_date >= thirty_days_ago
                ).all()
                
                if db_articles:
                    # Convert DB model items to dict list for deduplication and scoring
                    raw_articles = []
                    for art in db_articles:
                        raw_articles.append({
                            "title": "", # Title deduplication is not needed as source_url has unique DB constraint
                            "date": art.article_date.isoformat(),
                            "sentiment": {"polarity": art.polarity}
                        })
                    
                    # Calculate timeframe weighted sentiment
                    sentiment_scores = {
                        "short": compute_timeframe_sentiment(raw_articles, 3, now),
                        "medium": compute_timeframe_sentiment(raw_articles, 15, now),
                        "long": compute_timeframe_sentiment(raw_articles, 30, now)
                    }
                    logger.info(f"Computed database-cached sentiment scores for {mapping.stock_symbol}: {sentiment_scores}")
            except Exception as e:
                logger.error(f"Error calculating sentiment from database cache for {mapping.stock_symbol}: {e}")

        # 4. Overall Scores
        overall_short = compute_overall_score(tech_scores['short'], safety_scores['scores']['short'], sentiment_scores['short'] if sentiment_scores['short'] != "Not Available" else None, 'short')
        overall_medium = compute_overall_score(tech_scores['medium'], safety_scores['scores']['medium'], sentiment_scores['medium'] if sentiment_scores['medium'] != "Not Available" else None, 'medium')
        overall_long = compute_overall_score(tech_scores['long'], safety_scores['scores']['long'], sentiment_scores['long'] if sentiment_scores['long'] != "Not Available" else None, 'long')

        # 5. Save Scores to DB
        score_record = self.db.query(models.StockScore).filter(models.StockScore.stock_symbol == mapping.stock_symbol).first()
        if not score_record:
            score_record = models.StockScore(stock_symbol=mapping.stock_symbol)
            self.db.add(score_record)
            
        score_record.data_status = data_status
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
        
        # 6. Save Fundamentals to DB (Only if we actually fetched them)
        if should_fetch_fundamentals:
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
        logger.info(f"Successfully processed {mapping.stock_symbol}. Sleeping 3s to respect API rate limits...")
        time.sleep(3.0)


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
