import sys
import os

# Add parent directory to path so we can import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    logger.info("Connecting to database to apply custom indexes...")
    db = SessionLocal()
    try:
        # Create HNSW index for the embedding_vector column
        # vector_l2_ops is the operator class for L2 distance (cosine distance would be vector_cosine_ops)
        # Using vector_cosine_ops since we use cosine_distance in tools.py
        
        logger.info("Applying HNSW index on corporate_filings(embedding_vector) using vector_cosine_ops...")
        db.execute(text("CREATE INDEX IF NOT EXISTS corporate_filings_embedding_idx ON corporate_filings USING hnsw (embedding_vector vector_cosine_ops);"))
        
        # B-Tree Indexes
        logger.info("Applying B-Tree index on portfolio_holdings(user_id, status)...")
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_portfolio_user_status ON portfolio_holdings (user_id, status);"))
        
        logger.info("Applying B-Tree indexes on stock_scores...")
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_stock_scores_overall_short ON stock_scores (overall_score_short);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_stock_scores_overall_medium ON stock_scores (overall_score_medium);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_stock_scores_overall_long ON stock_scores (overall_score_long);"))
        
        db.commit()
        logger.info("Successfully applied all indexes!")
        
    except Exception as e:
        logger.error(f"Failed to apply indexes: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
