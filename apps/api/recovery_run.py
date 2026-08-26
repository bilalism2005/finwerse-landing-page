"""
recovery_run.py
----------------
Multi-threaded recovery script to fetch missing daily candles from Angel One (Aug 5-10),
resample them, recompute technical and overall scores, and update the database.
Bypasses slow external fundamental and news API calls by reusing existing DB values.

Usage: venv\Scripts\python.exe recovery_run.py
"""

import sys
import os
import logging
import time
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx
import pandas as pd

sys.path.insert(0, r'c:\Users\bilal\OneDrive\Pictures\Screenshots\finwerse\apps\api')

from dotenv import load_dotenv
load_dotenv(r'c:\Users\bilal\OneDrive\Pictures\Screenshots\finwerse\apps\api\.env')

from database import SessionLocal, engine
import models
from services.data_fetcher import AngelOneClient
from services.scoring import (
    compute_historical_technical_scores,
    compute_overall_score,
    safe_float
)
from services.batch_processor import parse_date, to_utc_naive, validate_candle_sanity

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] (%(threadName)s) %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('recovery_run.log', encoding='utf-8')
    ]
)
logger = logging.getLogger("recovery")

# Instantiate a single shared AngelOneClient and login once
angel_client = AngelOneClient()
logger.info("Logging into Angel One...")
angel_client.login()

def fetch_candles_with_retry(token, from_date_str, to_date_str):
    # Angel One rate-limit is ~3 reqs/sec. We sleep 1.5s before request in each thread to stay below limit.
    time.sleep(1.5)
    for attempt in range(3):
        try:
            res = angel_client.get_historical_candles(
                symboltoken=token,
                interval="ONE_DAY",
                from_date=from_date_str,
                to_date=to_date_str
            )
            # Re-authenticate if session expired
            if isinstance(res, dict) and (res.get('errorCode') == 'AG8001' or res.get('message') == 'Invalid Token'):
                logger.warning("Angel One token expired, re-logging...")
                angel_client.login()
                continue
            if res and res.get('status') and res.get('data'):
                return res.get('data')
            else:
                # If it's a structural empty data response, return empty
                if res and res.get('status') == False:
                    return None
        except Exception as e:
            logger.warning(f"Error fetching candles (attempt {attempt+1}): {e}")
            time.sleep(2)
    return None

def process_single_stock(symbol, angel_token):
    db = SessionLocal()
    try:
        now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
        
        # 1. Get the latest daily candle to check where we left off
        max_candle = db.query(models.StockCandle).filter(
            models.StockCandle.stock_symbol == symbol,
            models.StockCandle.timeframe == 'D'
        ).order_by(models.StockCandle.date.desc()).first()

        if not max_candle:
            logger.warning(f"[{symbol}] No daily candles exist in DB. Skipping to avoid heavy backfill.")
            return False

        last_date = max_candle.date
        from_date_str = last_date.strftime("%Y-%m-%d %H:%M")
        to_date_str = now.strftime("%Y-%m-%d %H:%M")

        # 2. Fetch incremental candles
        recent_data = fetch_candles_with_retry(angel_token, from_date_str, to_date_str)
        
        if recent_data:
            # Query recent dates to prevent duplicates
            recent_dates = [parse_date(c[0]) for c in recent_data]
            existing_candles = db.query(models.StockCandle.date).filter(
                models.StockCandle.stock_symbol == symbol,
                models.StockCandle.timeframe == 'D',
                models.StockCandle.date.in_(recent_dates)
            ).all()
            existing_set = {to_utc_naive(ec[0]) for ec in existing_candles}

            new_candles = []
            for c in recent_data:
                dt = parse_date(c[0])
                dt_utc = to_utc_naive(dt)
                if dt_utc not in existing_set:
                    try:
                        o = safe_float(c[1])
                        h = safe_float(c[2])
                        l = safe_float(c[3])
                        cl = safe_float(c[4])
                        v = safe_float(c[5])
                        validate_candle_sanity(symbol, dt, o, h, l, cl, v)
                        new_candles.append(models.StockCandle(
                            stock_symbol=symbol,
                            timeframe='D',
                            date=dt,
                            open=o,
                            high=h,
                            low=l,
                            close=cl,
                            volume=v
                        ))
                    except ValueError as ve:
                        logger.warning(f"[{symbol}] Validation failed for {dt}: {ve}")

            if new_candles:
                db.add_all(new_candles)
                db.commit()

        # 3. Pull all daily candles to resample weekly and monthly
        all_candles = db.query(models.StockCandle).filter(
            models.StockCandle.stock_symbol == symbol,
            models.StockCandle.timeframe == 'D'
        ).order_by(models.StockCandle.date.asc()).all()

        if len(all_candles) < 30:
            logger.warning(f"[{symbol}] Insufficient daily candles ({len(all_candles)})")
            return False

        daily_list = [{
            "date": c.date, "open": c.open, "high": c.high, "low": c.low, "close": c.close, "volume": c.volume
        } for c in all_candles]
        
        df_daily = pd.DataFrame(daily_list)
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df_daily[col] = pd.to_numeric(df_daily[col], errors='coerce')
        df_daily['date'] = pd.to_datetime(df_daily['date'])
        df_idx = df_daily.set_index('date').sort_index()

        # Resample
        agg_dict = {'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'}
        df_weekly = df_idx.resample('W').agg(agg_dict).dropna().reset_index()
        df_monthly = df_idx.resample('ME').agg(agg_dict).dropna().reset_index()
        df_daily = df_daily.reset_index(drop=True)

        # 4. Compute new historical scores
        hist_scores = compute_historical_technical_scores(df_daily, df_weekly, df_monthly)
        if not hist_scores:
            return False

        latest_hs = hist_scores[-1]
        tech_short = latest_hs['short'] if latest_hs['short'] is not None else 0.0
        tech_medium = latest_hs['medium'] if latest_hs['medium'] is not None else 0.0
        tech_long = latest_hs['long'] if latest_hs['long'] is not None else 0.0

        # Read existing safety and sentiment from DB to compute overall score
        score_record = db.query(models.StockScore).filter(models.StockScore.stock_symbol == symbol).first()
        if not score_record:
            score_record = models.StockScore(stock_symbol=symbol)
            db.add(score_record)

        safety_short = score_record.safety_score_short or 50.0
        safety_medium = score_record.safety_score_medium or 50.0
        safety_long = score_record.safety_score_long or 50.0

        def parse_sentiment(val):
            if val is None or str(val).lower() == "not available" or str(val).lower() == "none":
                return None
            return safe_float(val)

        sent_short = parse_sentiment(score_record.sentiment_score_short)
        sent_medium = parse_sentiment(score_record.sentiment_score_medium)
        sent_long = parse_sentiment(score_record.sentiment_score_long)

        # Compute new overall scores
        overall_short = compute_overall_score(tech_short, safety_short, sent_short, 'short')
        overall_medium = compute_overall_score(tech_medium, safety_medium, sent_medium, 'medium')
        overall_long = compute_overall_score(tech_long, safety_long, sent_long, 'long')

        # Update score record
        score_record.technical_score_short = tech_short
        score_record.technical_score_medium = tech_medium
        score_record.technical_score_long = tech_long
        score_record.overall_score_short = overall_short
        score_record.overall_score_medium = overall_medium
        score_record.overall_score_long = overall_long
        score_record.computed_at = datetime.now(timezone.utc)

        # Append-only (spec/capabilities/impulse-analyzer.md requires
        # stock_historical_scores to be dated, append-only history): skip
        # dates that already have a row instead of deleting and reinserting
        # this stock's entire history.
        existing_dates = {
            to_utc_naive(d[0])
            for d in db.query(models.StockHistoricalScore.date).filter(
                models.StockHistoricalScore.stock_symbol == symbol
            ).all()
        }

        # Prepare bulk insert mappings for genuinely new dates only
        mappings = [
            {
                'stock_symbol': symbol,
                'date': hs['date'],
                'technical_score_short': hs['short'],
                'technical_score_medium': hs['medium'],
                'technical_score_long': hs['long']
            }
            for hs in hist_scores
            if to_utc_naive(hs['date']) not in existing_dates
        ]

        if mappings:
            db.bulk_insert_mappings(models.StockHistoricalScore, mappings)

        db.commit()
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"[{symbol}] CRITICAL ERROR: {e}")
        return False
    finally:
        db.close()

def main():
    start = time.time()
    db = SessionLocal()
    try:
        # Get active mappings
        mappings = db.query(models.SymbolMapping).all()
        active_mappings = [m for m in mappings if m.angel_token]
    finally:
        db.close()

    total = len(active_mappings)
    logger.info(f"Found {total} symbols with active Angel tokens to process.")

    fixed = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=2, thread_name_prefix="Worker") as executor:
        futures = {
            executor.submit(process_single_stock, m.stock_symbol, m.angel_token): m.stock_symbol
            for m in active_mappings
        }
        
        for i, future in enumerate(as_completed(futures), 1):
            sym = futures[future]
            try:
                res = future.result()
                if res:
                    fixed += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"Thread for {sym} threw exception: {e}")
                failed += 1

            if i % 50 == 0 or i == total:
                elapsed = time.time() - start
                rate = i / elapsed
                eta = (total - i) / rate if rate > 0 else 0
                logger.info(f"--- PROGRESS: {i}/{total} | Fixed={fixed} Failed={failed} | Rate={rate:.1f} st/sec | ETA={eta/60:.1f} min ---")

    elapsed = time.time() - start
    logger.info("=" * 65)
    logger.info(f"RECOVERY COMPLETED in {elapsed/60:.2f} minutes.")
    logger.info(f"  Processed : {total}")
    logger.info(f"  Success   : {fixed}")
    logger.info(f"  Failed    : {failed}")
    logger.info("=" * 65)

if __name__ == "__main__":
    main()
