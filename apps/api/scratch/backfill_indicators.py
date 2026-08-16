import os
import sys
from dotenv import load_dotenv
import pandas as pd
from datetime import timedelta
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv()

from database import SessionLocal
from models import SymbolMapping, StockCandle, StockIndicatorValue
from services.scoring import compute_historical_technical_scores

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_backfill():
    db = SessionLocal()
    try:
        mappings = db.query(SymbolMapping).all()
        total = len(mappings)
        logger.info(f"Starting backfill for {total} stocks...")
        
        for idx, mapping in enumerate(mappings, 1):
            symbol = mapping.stock_symbol
            logger.info(f"[{idx}/{total}] Backfilling {symbol}...")
            
            # Fetch all candles
            candles = db.query(StockCandle).filter(
                StockCandle.stock_symbol == symbol,
                StockCandle.timeframe == 'D'
            ).order_by(StockCandle.date.asc()).all()
            
            if not candles:
                logger.info(f"No candles found for {symbol}, skipping.")
                continue
                
            # Create DataFrames
            df_daily = pd.DataFrame([{
                'date': c.date,
                'open': c.open,
                'high': c.high,
                'low': c.low,
                'close': c.close,
                'volume': c.volume
            } for c in candles])
            
            df_daily.set_index('date', inplace=True)
            
            # Create W and M
            df_weekly = df_daily.resample('W-FRI').agg({
                'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'
            }).dropna()
            
            df_monthly = df_daily.resample('ME').agg({
                'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'
            }).dropna()
            
            df_daily = df_daily.reset_index()
            df_weekly = df_weekly.reset_index()
            df_monthly = df_monthly.reset_index()
            
            # Compute indicators
            _, all_indicators = compute_historical_technical_scores(df_daily, df_weekly, df_monthly)
            
            # Delete existing records for clean insert
            db.query(StockIndicatorValue).filter(StockIndicatorValue.stock_symbol == symbol).delete()
            
            # Prepare bulk insert objects
            inserts = []
            for ind in all_indicators:
                inserts.append(StockIndicatorValue(
                    stock_symbol=symbol,
                    date=ind['date'],
                    timeframe=ind['timeframe'],
                    cci_value=ind['cci_value'],
                    cci_sma=ind['cci_sma'],
                    cci_crossover=ind['cci_crossover'],
                    rsi_value=ind['rsi_value'],
                    rsi_sma=ind['rsi_sma'],
                    rsi_crossover=ind['rsi_crossover'],
                    macd_line=ind['macd_line'],
                    macd_signal=ind['macd_signal'],
                    macd_crossover=ind['macd_crossover']
                ))
            
            # Bulk save
            if inserts:
                db.bulk_save_objects(inserts)
                db.commit()
                logger.info(f"Inserted {len(inserts)} indicator values for {symbol}.")
            
        logger.info("Backfill complete!")
        
    except Exception as e:
        logger.error(f"Error during backfill: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_backfill()
