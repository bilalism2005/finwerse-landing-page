"""
fix_all_zero_scores.py
-----------------------
Optimized bulk re-scorer that deletes stale historical scores and bulk-inserts
new ones to achieve >100x speedup (less than 0.2 seconds per stock).
"""

import sys
import logging
import time
from datetime import timezone

import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

sys.path.insert(0, r'c:\Users\bilal\OneDrive\Pictures\Screenshots\finwerse\apps\api')

from dotenv import load_dotenv
load_dotenv(r'c:\Users\bilal\OneDrive\Pictures\Screenshots\finwerse\apps\api\.env')

from database import SessionLocal, engine
import models
from services.scoring import compute_historical_technical_scores

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('fix_all_zero_scores.log', encoding='utf-8')
    ]
)
logger = logging.getLogger("fix_scores")


def get_affected_symbols(conn):
    """Return all symbols where any technical score is 0 or NULL."""
    rows = conn.execute(text("""
        SELECT stock_symbol
        FROM stock_scores
        WHERE technical_score_short = 0
           OR technical_score_medium = 0
           OR technical_score_long = 0
           OR technical_score_short IS NULL
           OR technical_score_medium IS NULL
           OR technical_score_long IS NULL
        ORDER BY stock_symbol;
    """)).fetchall()
    return [r[0] for r in rows]


def get_daily_candles(conn, symbol):
    """Return daily candles for a symbol as a DataFrame."""
    rows = conn.execute(text("""
        SELECT date, open, high, low, close, volume
        FROM stock_candles
        WHERE stock_symbol = :sym AND timeframe = 'D'
        ORDER BY date ASC;
    """), {"sym": symbol}).fetchall()
    if not rows:
        return None
    df = pd.DataFrame(rows, columns=['date','open','high','low','close','volume'])
    for col in ['open','high','low','close','volume']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df['date'] = pd.to_datetime(df['date'])
    return df


def resample_candles(df_daily):
    """Resample daily OHLCV into weekly and monthly DataFrames."""
    df_idx = df_daily.set_index('date').sort_index()

    agg = {'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'}

    df_weekly  = df_idx.resample('W').agg(agg).dropna().reset_index()
    df_monthly = df_idx.resample('ME').agg(agg).dropna().reset_index()

    return df_daily.sort_values('date').reset_index(drop=True), df_weekly, df_monthly


def fix_stock(db: Session, symbol: str, conn) -> bool:
    """Rescore one stock. Returns True on success, False on skip/error."""
    df_daily = get_daily_candles(conn, symbol)

    if df_daily is None or len(df_daily) < 30:
        logger.warning(f"[{symbol}] Skipping — insufficient daily candles ({len(df_daily) if df_daily is not None else 0})")
        return False

    try:
        df_d, df_w, df_m = resample_candles(df_daily)
        hist_scores = compute_historical_technical_scores(df_d, df_w, df_m)

        if not hist_scores:
            logger.warning(f"[{symbol}] No historical scores returned")
            return False

        latest = hist_scores[-1]
        short  = latest['short']  if latest['short']  is not None else 0.0
        medium = latest['medium'] if latest['medium'] is not None else 0.0
        long_  = latest['long']   if latest['long']   is not None else 0.0

        # Delete existing historical scores for the stock first
        db.execute(
            text("DELETE FROM stock_historical_scores WHERE stock_symbol = :sym"),
            {"sym": symbol}
        )

        # Prepare bulk insert mappings
        mappings = [
            {
                'stock_symbol': symbol,
                'date': hs['date'],
                'technical_score_short': hs['short'],
                'technical_score_medium': hs['medium'],
                'technical_score_long': hs['long']
            }
            for hs in hist_scores
        ]

        # Bulk insert
        if mappings:
            db.bulk_insert_mappings(models.StockHistoricalScore, mappings)

        # Update the stock_scores row
        db.execute(text("""
            UPDATE stock_scores
            SET technical_score_short  = :s,
                technical_score_medium = :m,
                technical_score_long   = :l
            WHERE stock_symbol = :sym;
        """), {"s": short, "m": medium, "l": long_, "sym": symbol})

        db.commit()
        logger.info(f"[{symbol}] Fixed: Short={short:.2f}  Mid={medium:.2f}  Long={long_:.2f}  (hist={len(hist_scores)} pts)")
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"[{symbol}] ERROR: {e}")
        return False


def main():
    start = time.time()
    logger.info("=" * 65)
    logger.info("STARTING: fix_all_zero_scores.py (OPTIMIZED)")
    logger.info("=" * 65)

    with engine.connect() as conn:
        symbols = get_affected_symbols(conn)

    total = len(symbols)
    logger.info(f"Found {total} stocks with zero/null technical scores to fix.")

    fixed = 0
    skipped = 0

    db = SessionLocal()
    try:
        with engine.connect() as conn:
            for i, sym in enumerate(symbols, 1):
                result = fix_stock(db, sym, conn)
                if result:
                    fixed += 1
                else:
                    skipped += 1

                # Progress heartbeat every 50 stocks
                if i % 50 == 0 or i == total:
                    elapsed = time.time() - start
                    rate = i / elapsed
                    eta = (total - i) / rate if rate > 0 else 0
                    logger.info(f"--- Progress: {i}/{total} | Fixed={fixed} Skipped={skipped} | Rate={rate:.1f} st/sec | ETA={eta/60:.1f} min ---")

    except KeyboardInterrupt:
        logger.warning("Interrupted by user.")
    finally:
        db.close()

    elapsed = time.time() - start
    logger.info("=" * 65)
    logger.info(f"DONE in {elapsed/60:.2f} min")
    logger.info(f"  Fixed  : {fixed}")
    logger.info(f"  Skipped: {skipped}")
    logger.info("=" * 65)


if __name__ == "__main__":
    main()
