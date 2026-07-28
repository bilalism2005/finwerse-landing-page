import logging
from database import SessionLocal
import models
from services.batch_processor import BatchProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_stocks(db):
    test_stocks = [
        {"symbol": "RELIANCE", "angel_token": "2885", "eodhd_symbol": "RELIANCE.NSE"},
        {"symbol": "TCS", "angel_token": "11536", "eodhd_symbol": "TCS.NSE"},
        {"symbol": "INFY", "angel_token": "1594", "eodhd_symbol": "INFY.NSE"}
    ]
    
    for stock in test_stocks:
        existing = db.query(models.SymbolMapping).filter(models.SymbolMapping.stock_symbol == stock["symbol"]).first()
        if not existing:
            new_mapping = models.SymbolMapping(
                stock_symbol=stock["symbol"],
                angel_token=stock["angel_token"],
                eodhd_symbol=stock["eodhd_symbol"]
            )
            db.add(new_mapping)
            logger.info(f"Added mapping for {stock['symbol']}")
        else:
            logger.info(f"Mapping for {stock['symbol']} already exists.")
            
    db.commit()

if __name__ == "__main__":
    db = SessionLocal()
    try:
        logger.info("Seeding test stocks...")
        seed_stocks(db)
        
        logger.info("Running batch processor manually...")
        processor = BatchProcessor(db)
        processor.run()
    except Exception as e:
        logger.error(f"Error during manual run: {e}")
    finally:
        db.close()
    
    logger.info("Manual run complete.")
