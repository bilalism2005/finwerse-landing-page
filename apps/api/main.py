import logging
from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
from routers import stocks
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Finwerse API", version="1.0.0")

app.include_router(stocks.router)

def run_daily_batch():
    """
    Daily batch job to fetch data and compute scores.
    Runs at 3:45 PM IST.
    """
    logger.info("Starting daily batch job for Finwerse scores...")
    from database import SessionLocal
    from services.batch_processor import BatchProcessor
    
    db = SessionLocal()
    try:
        processor = BatchProcessor(db)
        processor.run()
    except Exception as e:
        logger.error(f"Failed to run batch processor: {e}")
    finally:
        db.close()
    
    logger.info("Batch job complete.")

@app.on_event("startup")
def startup_event():
    scheduler = BackgroundScheduler()
    # 3:45 PM IST = 10:15 AM UTC (Assuming server is in UTC)
    # Using a simple interval for development, but in production use cron
    scheduler.add_job(run_daily_batch, 'cron', hour=10, minute=15)
    scheduler.start()
    logger.info("Background scheduler started.")

@app.get("/")
def health_check():
    return {"status": "healthy"}
