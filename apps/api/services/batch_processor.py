import os
import json
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import pandas as pd
import trafilatura
from groq import Groq
from finvader import finvader
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from sqlalchemy.orm import Session
import httpx

import models
from services.data_fetcher import AngelOneClient, IndianAPIClient
from config.holidays import get_trading_days_between
from services.scoring import compute_overall_score, compute_safety_scores, safe_float, compute_timeframe_sentiment, validate_article_for_stock, compute_historical_technical_scores
logger = logging.getLogger(__name__)

# FinVADER (VADER + SentiBignomics + Henry's earnings-press-release word list,
# all Apache 2.0 / CC BY -- no commercial-license gate like Loughran-McDonald)
# scores every article for free. It's only escalated to a real Groq call when
# either (a) its combined score is too close to zero to trust as a real
# direction, or (b) its two component lexicons meaningfully disagree with
# each other -- both are real, empirically-observed failure signals: testing
# showed SentiBignomics alone correctly flags "rising debt/cost" as negative
# while Henry's alone gets it backwards (treats "increased" as inherently
# positive regardless of what increased), and SentiBignomics dilutes severe
# events like fraud that Henry's alone scores correctly. Thresholds below are
# a reasoned starting point from that test set, not empirically tuned at
# scale yet -- revisit once real production data accumulates.
FINVADER_AMBIGUOUS_THRESHOLD = 0.15
FINVADER_DISAGREEMENT_THRESHOLD = 0.4

GROQ_SENTIMENT_SYSTEM_PROMPT = """You are a financial news impact analyst. Given a news article about a specific company, assess its impact on that company's stock.

Return ONLY a JSON object with these exact fields:
- "relevant": true/false -- is this article materially about the company itself (not just a passing mention, not an unrelated topic)?
- "score": an integer from -100 to 100. Sign = direction (positive news vs negative news for the company). Magnitude = how significant/impactful the event is:
  - 90 to 100: transformative (bankruptcy, major fraud, regulatory ban, landmark M&A)
  - 60 to 89: significant (large earnings beat/miss, major contract win/loss, rating change, CEO ousted)
  - 30 to 59: moderate (in-line results with a real surprise, sector news with a clear company angle, new product/partnership)
  - 1 to 29: minor (passing mention, small operational update, routine corporate action)
  - 0: not relevant, or genuinely neutral/mixed with no clear net direction
- "reasoning": one short sentence explaining the score.

Examples:
Article: "Jio Platforms gets Sebi nod for Rs 35,000 crore IPO, India's biggest potential listing" (about Reliance Industries)
{"relevant": true, "score": 50, "reasoning": "Large, real IPO approval for a subsidiary -- moderate-significant, not the parent's core business directly."}

Article: "Company disclosed a major accounting fraud investigation and its CEO has resigned amid the scandal."
{"relevant": true, "score": -90, "reasoning": "Fraud investigation and CEO resignation are transformative, severely negative events."}

Article: "Company held its annual general meeting today as scheduled."
{"relevant": true, "score": 0, "reasoning": "Routine corporate action with no informational content."}
"""

_groq_client = None
def get_groq_client():
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable not set.")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

# IndianAPI's recentNews feed mixes in generic market-wide wraps (index-level
# commentary, multi-stock listicles) alongside genuine company-specific
# articles. These aren't wrong-company the way EODHD's ticker-collision
# articles were, but they're not about THIS stock specifically either, so
# they're excluded before spending a sentiment-service call on them.
MARKET_WRAP_PREFIXES = (
    "sensex", "nifty", "gift nifty", "stock market today",
    "breakout stocks to buy or sell", "stocks to buy today",
)

def _is_generic_market_wrap(headline: str) -> bool:
    h = (headline or "").strip().lower()
    return any(h.startswith(p) for p in MARKET_WRAP_PREFIXES)

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

# IndianAPI limits: Assume standard 2-3 requests per second to be safe
INDIANAPI_DELAY = 0.5

class RateLimitException(Exception):
    pass

def handle_httpx_errors(retry_state):
    logger.warning(f"Retrying after error: {retry_state.outcome.exception()}")

# After N consecutive per-stock failures against the SAME external API within a
# single run, treat it as a sustained outage/quota exhaustion rather than
# per-stock flakiness and stop calling it for the rest of the run. A live
# EODHD news-endpoint outage once cost ~21s/stock (3 retries x ~7s timeout,
# paid on every one of ~2440 stocks) and was the direct cause of a cron run
# blowing past Render's 12h hard kill -- this bounds that tax to
# threshold x per-attempt-cost regardless of how long the outage lasts.
CIRCUIT_BREAKER_THRESHOLD = 5

# Render hard-kills any cron run at 12h with no useful signal beyond "Timed
# out" (https://render.com/docs/cronjobs). Stopping ourselves at 10h30m
# instead turns that into a clear, diagnosable early exit, and leaves
# headroom for AlertsProcessor + NSEFilingsScraper, which run after this
# batch inside the same cron process (scripts/run_daily_batch.py).
RUN_TIME_BUDGET = timedelta(hours=10, minutes=30)

class BatchProcessor:
    def __init__(self, db: Session):
        self.db = db
        self.angel_client = AngelOneClient()
        self.indianapi_client = IndianAPIClient()
        self._indianapi_consecutive_failures = 0
        self._indianapi_circuit_open = False
        self._groq_sentiment_consecutive_failures = 0
        self._groq_sentiment_circuit_open = False

    def _note_indianapi_failure(self, symbol: str):
        self._indianapi_consecutive_failures += 1
        if not self._indianapi_circuit_open and self._indianapi_consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
            self._indianapi_circuit_open = True
            logger.error(
                f"IndianAPI failed/rate-limited {self._indianapi_consecutive_failures} times in a row "
                f"(latest: {symbol}) -- disabling fundamentals+news fetching for the rest of this run."
            )

    def _note_groq_sentiment_failure(self, symbol: str):
        self._groq_sentiment_consecutive_failures += 1
        if not self._groq_sentiment_circuit_open and self._groq_sentiment_consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
            self._groq_sentiment_circuit_open = True
            logger.error(
                f"Groq sentiment scoring failed {self._groq_sentiment_consecutive_failures} times in a row "
                f"(latest: {symbol}) -- disabling escalated sentiment scoring for the rest of this run "
                f"(FinVADER's own score is still used for ambiguous/disagreement cases when this is open)."
            )

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
        retry=retry_if_exception_type(Exception),
        after=handle_httpx_errors
    )
    def _groq_score_article(self, company_name: str, text: str):
        """Returns a -1..1 polarity, or None if Groq judges the article not
        actually relevant (a second opinion beyond our own pre-filter -- only
        reached for FinVADER's ambiguous/disagreement cases, so the extra
        reasoning cost is paid on a small fraction of articles, not all of
        them)."""
        client = get_groq_client()
        user_prompt = f"Company: {company_name}\nArticle: {text[:4000]}"
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": GROQ_SENTIMENT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        result = json.loads(completion.choices[0].message.content)
        if not result.get("relevant", True):
            return None
        return safe_float(result.get("score"), 0.0) / 100.0

    def score_sentiment(self, mapping_symbol: str, company_name: str, text: str):
        """FinVADER (free, in-process, no memory/hosting risk -- VADER's
        engine plus the Apache-2.0/CC-BY-licensed SentiBignomics and Henry's
        earnings-press-release lexicons) scores every article. Escalates to
        a real Groq call only when FinVADER's own signal can't be trusted:
        either its combined score is too close to zero, or its two component
        lexicons meaningfully disagree with each other (both are real,
        empirically-observed failure modes -- see the module-level comment
        on the threshold constants). Returns a -1..1 polarity, or None if the
        article should be skipped entirely (Groq's relevance check caught
        something our own pre-filter didn't).
        """
        combined = finvader(text, use_sentibignomics=True, use_henry=True, indicator="compound")
        senti_only = finvader(text, use_sentibignomics=True, use_henry=False, indicator="compound")
        henry_only = finvader(text, use_sentibignomics=False, use_henry=True, indicator="compound")

        ambiguous = abs(combined) < FINVADER_AMBIGUOUS_THRESHOLD
        disagree = (senti_only * henry_only < 0) or (abs(senti_only - henry_only) > FINVADER_DISAGREEMENT_THRESHOLD)

        if (not ambiguous and not disagree) or self._groq_sentiment_circuit_open:
            return combined

        try:
            groq_score = self._groq_score_article(company_name, text)
            self._groq_sentiment_consecutive_failures = 0
            return groq_score
        except Exception as e:
            logger.warning(f"Groq escalation failed for {mapping_symbol}, falling back to FinVADER: {e}")
            self._note_groq_sentiment_failure(mapping_symbol)
            return combined

    def process_stock(self, mapping: models.SymbolMapping):
        logger.info(f"Processing {mapping.stock_symbol}...")
        data_status = "SUCCESS"
        # Tracks whether any external API was actually called this run, so the
        # end-of-function rate-limit pause isn't paid on stocks served entirely
        # from cache (no missing trading days, fundamentals still fresh).
        did_external_fetch = False

        # 1. Fetch/Update Daily Candle Data in Database Cache
        if not self.angel_client.jwt_token:
            did_external_fetch = True
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
                    did_external_fetch = True
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
                    did_external_fetch = True
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
            self.db.rollback()
        except Exception as e:
            data_status = "FAILED"
            logger.error(f"Angel One candle fetch failed for {mapping.stock_symbol}: {e}")
            # Without this, a DB-level error here (e.g. a failed INSERT) leaves the
            # session's transaction aborted -- every subsequent query in this same
            # process_stock call (starting with db_candles just below) would raise
            # "current transaction is aborted" instead of the real error.
            self.db.rollback()

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

                # Append-only (spec/capabilities/impulse-analyzer.md: "Requires
                # stock_historical_scores to be dated, append-only history" --
                # shared with the chatbot's planned backtest tool). A date's
                # score is computed once and frozen; silently revising it on a
                # later run would let a trade's Impulse-Analyzer verdict flip
                # with no trade activity involved. Skip dates that already
                # have a row instead of updating them in place.
                if hs_date_utc in existing_score_map:
                    continue

                db_hist_score = models.StockHistoricalScore(
                    stock_symbol=mapping.stock_symbol,
                    date=hs['date'],
                    technical_score_short=hs['short'],
                    technical_score_medium=hs['medium'],
                    technical_score_long=hs['long']
                )
                score_inserts.append(db_hist_score)
                saved_count += 1

            if score_inserts:
                self.db.bulk_save_objects(score_inserts)
            self.db.commit()
            logger.info(f"Saved {saved_count} new historical scores for {mapping.stock_symbol}.")
            
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

        if should_fetch_fundamentals and self._indianapi_circuit_open:
            data_status = "RATE_LIMITED"
            should_fetch_fundamentals = False

        if should_fetch_fundamentals:
            try:
                logger.info(f"Fetching fundamental data for {mapping.stock_symbol}...")
                did_external_fetch = True
                time.sleep(INDIANAPI_DELAY)

                # These 6 IndianAPI endpoints are independent lookups for the same
                # stock (no data dependency between them), but used to run one
                # after another with a fixed delay between each -- ~3s of pure
                # sequential wait per stock. Bounding concurrency to 3 in-flight
                # requests keeps within the documented "2-3 requests per second"
                # IndianAPI limit while roughly halving that wall time. Each
                # future's exception (if any) surfaces from .result() exactly as
                # it would have from a direct call, so the except blocks below
                # see the same exception types/attributes as before.
                with ThreadPoolExecutor(max_workers=3) as pool:
                    fut_ratios = pool.submit(self.indianapi_client.get_ratios, mapping.stock_symbol)
                    fut_details = pool.submit(self.indianapi_client.get_stock_details, mapping.stock_symbol)
                    fut_quarter = pool.submit(self.indianapi_client.get_quarterly_results, mapping.stock_symbol)
                    fut_yoy = pool.submit(self.indianapi_client.get_yoy_results, mapping.stock_symbol)
                    fut_balance = pool.submit(self.indianapi_client.get_balancesheet, mapping.stock_symbol)
                    fut_shareholding = pool.submit(self.indianapi_client.get_shareholding_pattern, mapping.stock_symbol)

                    ratios_data = fut_ratios.result()
                    stock_data = fut_details.result()
                    quarter_data = fut_quarter.result()
                    yoy_data = fut_yoy.result()
                    balance_data = fut_balance.result()
                    shareholding_data = fut_shareholding.result()

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
                self._indianapi_consecutive_failures = 0
            except httpx.HTTPStatusError as he:
                if he.response.status_code == 429:
                    data_status = "RATE_LIMITED"
                    logger.warning(f"IndianAPI rate limit hit (429) for {mapping.stock_symbol}")
                else:
                    data_status = "FAILED"
                    logger.error(f"IndianAPI HTTP error {he.response.status_code} for {mapping.stock_symbol}")
                self._note_indianapi_failure(mapping.stock_symbol)
            except Exception as e:
                data_status = "FAILED"
                logger.error(f"Error computing safety scores for {mapping.stock_symbol}: {e}")
                self._note_indianapi_failure(mapping.stock_symbol)
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


        # 3. Fetch news via IndianAPI, score via FinVADER (escalating to Groq
        # for ambiguous/disagreement cases -- see score_sentiment()), cache in
        # DB. Replaces the old EODHD-based pipeline: EODHD has zero India/NSE
        # coverage (confirmed live), and its .NSE->.US
        # ticker-guessing hack was silently pulling wrong-company news for
        # most stocks it had any data for (e.g. CCL -> Carnival Corp,
        # TRU -> TransUnion). IndianAPI's /stock endpoint (already called for
        # fundamentals) returns genuinely India-sourced news, but it's a loose
        # "trending finance news" feed, not a per-company stream -- still
        # needs relevance filtering, plus a market-wide-wrap exclusion this
        # feed specifically needs (it mixes in Sensex/Nifty-level commentary
        # and multi-stock listicles alongside genuine company news).
        #
        # This call happens daily regardless of the 7-day fundamentals-refresh
        # cache above (news needs checking far more often than fundamentals),
        # reusing stock_data when it was already fetched fresh this run.
        sentiment_scores = {"short": "Not Available", "medium": "Not Available", "long": "Not Available"}

        news_stock_data = stock_data
        if news_stock_data is None and not self._indianapi_circuit_open:
            try:
                did_external_fetch = True
                time.sleep(INDIANAPI_DELAY)
                news_stock_data = self.indianapi_client.get_stock_details(mapping.stock_symbol)
                self._indianapi_consecutive_failures = 0
            except httpx.HTTPStatusError as he:
                if data_status != "FAILED":
                    data_status = "RATE_LIMITED" if he.response.status_code == 429 else "FAILED"
                logger.warning(f"IndianAPI news-check HTTP error {he.response.status_code} for {mapping.stock_symbol}")
                self._note_indianapi_failure(mapping.stock_symbol)
            except Exception as e:
                if data_status != "FAILED":
                    data_status = "FAILED"
                logger.error(f"Error fetching IndianAPI news for {mapping.stock_symbol}: {e}")
                self._note_indianapi_failure(mapping.stock_symbol)

        company_name = ""
        if news_stock_data:
            # companyName is a top-level field, NOT nested under
            # stockDetailsReusableData (that block is price/ratio data only --
            # confirmed live; the old .get("stockDetailsReusableData", {}).get("name")
            # path always returned "", which combined with the old fail-open
            # behavior in validate_article_for_stock meant relevance filtering
            # was never actually running in production before this fix).
            company_name = news_stock_data.get("companyName", "")

        recent_news = (news_stock_data or {}).get("recentNews") or []

        if recent_news:
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            for item in recent_news:
                headline = (item.get("headline") or "").strip()
                rel_url = (item.get("url") or "").strip()
                if not headline or not rel_url:
                    continue

                # IndianAPI only ever returns a relative path; every sample
                # observed during investigation resolved against Livemint.
                url = rel_url if rel_url.startswith("http") else f"https://www.livemint.com{rel_url}"

                existing = self.db.query(models.StockNews.id).filter(models.StockNews.source_url == url).first()
                if existing:
                    continue

                if _is_generic_market_wrap(headline):
                    continue

                pseudo_article = {"title": headline, "content": item.get("summary", ""), "symbols": []}
                if not validate_article_for_stock(pseudo_article, mapping.stock_symbol, company_name):
                    logger.info(f"Article skipped (not relevant): {headline} | url: {url}")
                    continue

                # Prefer full article text for a better-informed sentiment
                # call; fall back to headline+summary if the fetch/extraction
                # fails, rather than dropping the article entirely.
                text_for_scoring = f"{headline}. {item.get('summary', '')}".strip()
                # Persisted to StockNews.full_text only when extraction genuinely
                # succeeded this run (spec/data.md) -- stays None on any failure
                # path (fetch error, non-200, short/empty extraction).
                full_text_to_persist = None
                try:
                    page = httpx.get(url, timeout=15.0, headers={"User-Agent": "Mozilla/5.0"}, follow_redirects=True)
                    if page.status_code == 200:
                        extracted = trafilatura.extract(page.text)
                        if extracted and len(extracted.strip()) > 50:
                            text_for_scoring = extracted
                            full_text_to_persist = extracted
                except Exception as e:
                    logger.warning(f"Full-text fetch failed for {url}, scoring headline+summary only: {e}")

                # StockNews.summary is populated independently of full_text
                # extraction success, whenever IndianAPI supplied one.
                summary_to_persist = (item.get("summary") or "").strip() or None

                try:
                    did_external_fetch = True
                    polarity = self.score_sentiment(mapping.stock_symbol, company_name, text_for_scoring)
                except Exception as e:
                    logger.error(f"Sentiment scoring failed for {mapping.stock_symbol} ({url}): {e}")
                    continue

                if polarity is None:
                    # Groq's own relevance check caught something our
                    # pre-filter didn't -- skip storing this article entirely
                    # rather than counting it as a neutral 0.
                    logger.info(f"Article skipped (Groq flagged not relevant): {headline} | url: {url}")
                    continue

                date_str = item.get("date", "")
                try:
                    article_dt = datetime.fromisoformat(date_str.replace("Z", "+00:00")) if date_str else now
                except Exception:
                    article_dt = now

                # Use PostgreSQL ON CONFLICT DO NOTHING to guarantee idempotency and no crashes
                stmt = pg_insert(models.StockNews).values(
                    stock_symbol=mapping.stock_symbol,
                    article_date=article_dt,
                    polarity=polarity,
                    source_url=url,
                    headline=headline,
                    full_text=full_text_to_persist,
                    summary=summary_to_persist,
                ).on_conflict_do_nothing(index_elements=['source_url'])
                self.db.execute(stmt)
            self.db.commit()

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
            # If the query above (not just the in-memory scoring) is what failed,
            # the session's transaction is left aborted; every subsequent query
            # in this call (starting with the StockScore lookup below) would
            # otherwise raise "current transaction is aborted".
            self.db.rollback()

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
            # Reuse the fund_record already looked up above (step 2) instead of
            # re-querying the same row for the same stock a second time -- the
            # object may be expired (e.g. by a rollback earlier in this call) but
            # SQLAlchemy transparently refreshes an expired object on next access,
            # so reuse is still correct.
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
        if did_external_fetch:
            logger.info(f"Successfully processed {mapping.stock_symbol}. Sleeping 3s to respect API rate limits...")
            time.sleep(3.0)
        else:
            logger.info(f"Successfully processed {mapping.stock_symbol} entirely from cache -- no external API calls made, skipping rate-limit pause.")


    def run(self, skip_computed_today: bool = True):
        logger.info("Starting Batch Processing Loop...")
        run_started_at = datetime.now(timezone.utc)
        mappings = self.db.query(models.SymbolMapping).all()
        logger.info(f"Found {len(mappings)} total stocks in symbol_mapping.")

        # Batch-load every stock's last computed_at once instead of issuing one
        # query per mapping inside the loop below. Each mapping is only ever
        # checked against this map once (before its own processing would
        # update it), so a single upfront snapshot is correct, not stale.
        computed_at_map = {}
        if skip_computed_today:
            computed_at_map = dict(
                self.db.query(models.StockScore.stock_symbol, models.StockScore.computed_at).all()
            )

        processed_count = 0
        skipped_count = 0
        critical_error_count = 0
        time_budget_stopped = False

        for idx, mapping in enumerate(mappings, 1):
            elapsed = datetime.now(timezone.utc) - run_started_at
            if elapsed >= RUN_TIME_BUDGET:
                remaining = len(mappings) - idx + 1
                logger.warning(
                    f"Time budget of {RUN_TIME_BUDGET} exceeded after {idx - 1}/{len(mappings)} stocks "
                    f"({elapsed} elapsed) -- stopping early to leave headroom for the alerts/filings "
                    f"steps and avoid Render's 12h cron hard kill. {remaining} stocks left unprocessed "
                    f"this run; they'll be first in line next run since they were never computed today."
                )
                time_budget_stopped = True
                break

            try:
                if skip_computed_today:
                    cutoff = datetime.now(timezone.utc) - timedelta(hours=20)
                    score_time = computed_at_map.get(mapping.stock_symbol)
                    if score_time:
                        if score_time.tzinfo is None:
                            score_time = score_time.replace(tzinfo=timezone.utc)
                        if score_time >= cutoff:
                            logger.info(f"[{idx}/{len(mappings)}] Skipping {mapping.stock_symbol} (already computed in this batch).")
                            skipped_count += 1
                            continue

                logger.info(f"[{idx}/{len(mappings)}] Processing {mapping.stock_symbol}...")
                self.process_stock(mapping)
                processed_count += 1
            except Exception as e:
                critical_error_count += 1
                logger.error(f"Critical error processing {mapping.stock_symbol}: {e}")
                self.db.rollback()

        logger.info(
            f"Batch Processing Loop Complete. "
            f"processed={processed_count} skipped(cache)={skipped_count} critical_errors={critical_error_count} "
            f"time_budget_stopped={time_budget_stopped} "
            f"indianapi_circuit_open={self._indianapi_circuit_open} (consecutive_failures={self._indianapi_consecutive_failures}) "
            f"groq_sentiment_circuit_open={self._groq_sentiment_circuit_open} (consecutive_failures={self._groq_sentiment_consecutive_failures})"
        )
