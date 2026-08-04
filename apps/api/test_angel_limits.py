from database import SessionLocal
import models
from services.batch_processor import BatchProcessor
from datetime import datetime, timedelta

db = SessionLocal()
processor = BatchProcessor(db)
mapping = db.query(models.SymbolMapping).filter(models.SymbolMapping.stock_symbol == "INFY").first()
processor.angel_client.login()

now = datetime.now()

# Let's try fetching 7 years of daily data (to support 60-month indicators)
from_date = (now - timedelta(days=365*7)).strftime("%Y-%m-%d %H:%M")
to_date = now.strftime("%Y-%m-%d %H:%M")

print(f"Attempting to fetch data from {from_date} to {to_date}...")
daily_data = processor.fetch_angel_candles(mapping.angel_token, "ONE_DAY", from_date, to_date)

if daily_data:
    print(f"Success! Fetched {len(daily_data)} daily candles.")
else:
    print("Failed to fetch data (might exceed Angel One's date range limits per request).")

db.close()
