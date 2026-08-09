import os
import logging
from sqlalchemy import text
from database import engine

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("migration")

def main():
    logger.info("Applying database CHECK constraints to live staging Supabase instance...")
    
    with engine.connect() as conn:
        # 1. Add data_status column to stock_scores table if it does not exist
        res = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='stock_scores' AND column_name='data_status';
        """)).fetchone()
        
        if not res:
            logger.info("Adding data_status column to stock_scores table...")
            conn.execute(text("ALTER TABLE stock_scores ADD COLUMN data_status VARCHAR DEFAULT 'SUCCESS';"))
        else:
            logger.info("data_status column already exists on stock_scores.")
            
        # 2. Constraints mapping
        constraints = [
            # stock_candles
            ("ALTER TABLE stock_candles ADD CONSTRAINT chk_candle_positive CHECK (open >= 0 AND close >= 0 AND high >= 0 AND low >= 0);", "chk_candle_positive"),
            ("ALTER TABLE stock_candles ADD CONSTRAINT chk_candle_high_low CHECK (high >= low);", "chk_candle_high_low"),
            
            # stock_scores
            ("ALTER TABLE stock_scores ADD CONSTRAINT chk_technical_score_short CHECK (technical_score_short BETWEEN -100 AND 100);", "chk_technical_score_short"),
            ("ALTER TABLE stock_scores ADD CONSTRAINT chk_technical_score_medium CHECK (technical_score_medium BETWEEN -100 AND 100);", "chk_technical_score_medium"),
            ("ALTER TABLE stock_scores ADD CONSTRAINT chk_technical_score_long CHECK (technical_score_long BETWEEN -100 AND 100);", "chk_technical_score_long"),
            ("ALTER TABLE stock_scores ADD CONSTRAINT chk_overall_score_short CHECK (overall_score_short BETWEEN -100 AND 100);", "chk_overall_score_short"),
            ("ALTER TABLE stock_scores ADD CONSTRAINT chk_overall_score_medium CHECK (overall_score_medium BETWEEN -100 AND 100);", "chk_overall_score_medium"),
            ("ALTER TABLE stock_scores ADD CONSTRAINT chk_overall_score_long CHECK (overall_score_long BETWEEN -100 AND 100);", "chk_overall_score_long"),
            
            # stock_historical_scores
            ("ALTER TABLE stock_historical_scores ADD CONSTRAINT chk_hist_technical_score_short CHECK (technical_score_short BETWEEN -100 AND 100);", "chk_hist_technical_score_short"),
            ("ALTER TABLE stock_historical_scores ADD CONSTRAINT chk_hist_technical_score_medium CHECK (technical_score_medium BETWEEN -100 AND 100);", "chk_hist_technical_score_medium"),
            ("ALTER TABLE stock_historical_scores ADD CONSTRAINT chk_hist_technical_score_long CHECK (technical_score_long BETWEEN -100 AND 100);", "chk_hist_technical_score_long"),
        ]
        
        for sql, name in constraints:
            res = conn.execute(text(f"""
                SELECT conname 
                FROM pg_constraint 
                WHERE conname='{name}';
            """)).fetchone()
            
            if not res:
                logger.info(f"Applying constraint {name}...")
                conn.execute(text(sql))
            else:
                logger.info(f"Constraint {name} already exists.")
                
        # Commit transaction explicitly (SQLAlchemy 1.4+ auto-commits DDL, but conn.commit() is safe)
        try:
            conn.commit()
        except AttributeError:
            pass
            
    logger.info("All CHECK constraints and data_status columns applied successfully!")

if __name__ == "__main__":
    main()
