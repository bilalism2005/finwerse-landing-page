import sys
import os
import logging
from datetime import date
from dotenv import load_dotenv

# Ensure the parent directory (apps/api) is in the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.holidays import is_market_open
from database import SessionLocal
from services.batch_processor import BatchProcessor

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run():
    # 1. Check if today is a trading day
    today = date.today()
    if not is_market_open(today):
        logger.info(f"Market is closed today ({today}). Exiting cron job early.")
        sys.exit(0)
        
    logger.info(f"Market is open today ({today}). Starting daily batch job for Finwerse scores...")
    
    # 2. Run the batch processor
    db = SessionLocal()
    try:
        processor = BatchProcessor(db)
        processor.run()
        
        # 3. Run Alerts Processor immediately after scores are updated
        from services.alerts_processor import AlertsProcessor
        alerts = AlertsProcessor(db)
        alerts.run()
        
    except Exception as e:
        logger.error(f"Failed to run batch processor: {e}")
        sys.exit(1)
    finally:
        db.close()
    
    logger.info("Batch job complete.")

if __name__ == "__main__":
    run()
