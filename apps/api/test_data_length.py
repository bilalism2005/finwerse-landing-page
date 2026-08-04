from database import SessionLocal
import models
from services.batch_processor import BatchProcessor
import pandas as pd
from datetime import datetime, timedelta

db = SessionLocal()
processor = BatchProcessor(db)
mapping = db.query(models.SymbolMapping).filter(models.SymbolMapping.stock_symbol == "INFY").first()
processor.angel_client.login()

now = datetime.now()
from_date = (now - timedelta(days=365*7)).strftime("%Y-%m-%d %H:%M")
to_date = now.strftime("%Y-%m-%d %H:%M")

daily_data = processor.fetch_angel_candles(mapping.angel_token, "ONE_DAY", from_date, to_date)
df_daily = pd.DataFrame(daily_data, columns=['date', 'open', 'high', 'low', 'close', 'volume'])
df_daily['date'] = pd.to_datetime(df_daily['date'])
df_daily = df_daily.set_index('date').sort_index()

df_weekly = df_daily.resample('W').agg({'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'}).dropna()
df_monthly = df_daily.resample('ME').agg({'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'}).dropna()

print(f"Total Daily Candles: {len(df_daily)}")
print(f"Total Weekly Candles: {len(df_weekly)}")
print(f"Total Monthly Candles: {len(df_monthly)}")

db.close()
