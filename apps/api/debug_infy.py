from database import SessionLocal
import models
from services.batch_processor import BatchProcessor
import pandas as pd
from datetime import datetime, timedelta
from services.scoring import cci, sma, rsi, macd, calculate_candles_since_crossover, get_decay_score

db = SessionLocal()
processor = BatchProcessor(db)
mapping = db.query(models.SymbolMapping).filter(models.SymbolMapping.stock_symbol == "INFY").first()

processor.angel_client.login()
now = datetime.now()
to_date_str = now.strftime("%Y-%m-%d %H:%M")
from_date = (now - timedelta(days=2000)).strftime("%Y-%m-%d %H:%M")
daily_data = processor.fetch_angel_candles(mapping.angel_token, "ONE_DAY", from_date, to_date_str)

df_daily = pd.DataFrame(daily_data, columns=['date', 'open', 'high', 'low', 'close', 'volume'])
for col in ['open', 'high', 'low', 'close', 'volume']:
    df_daily[col] = pd.to_numeric(df_daily[col], errors='coerce')
df_daily['date'] = pd.to_datetime(df_daily['date'])
df_daily = df_daily.set_index('date').sort_index()

df_weekly = df_daily.resample('W').agg({'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'}).dropna()
df_monthly = df_daily.resample('ME').agg({'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last', 'volume': 'sum'}).dropna()

df_daily = df_daily.reset_index()
df_weekly = df_weekly.reset_index()
df_monthly = df_monthly.reset_index()

# DAILY
cci_d_vals = cci(df_daily['high'], df_daily['low'], df_daily['close'], length=30)
cci_sma_d = sma(cci_d_vals, 9)
rsi_d_vals = rsi(df_daily['close'], 14)
rsi_sma_d = sma(rsi_d_vals, 9)
macd_d_line, macd_d_signal, _ = macd(df_daily['close'], 12, 26, 9)

cci_state_d, cci_age_d = calculate_candles_since_crossover(cci_d_vals, cci_sma_d)
rsi_state_d, rsi_age_d = calculate_candles_since_crossover(rsi_d_vals, rsi_sma_d)
macd_state_d, macd_age_d = calculate_candles_since_crossover(macd_d_line, macd_d_signal)

cci_d = get_decay_score(cci_state_d, cci_age_d)
rsi_d = get_decay_score(rsi_state_d, rsi_age_d)
macd_d_score = get_decay_score(macd_state_d, macd_age_d)

# WEEKLY
cci_w_vals = cci(df_weekly['high'], df_weekly['low'], df_weekly['close'], length=60)
cci_sma_w = sma(cci_w_vals, 9)
rsi_w_vals = rsi(df_weekly['close'], 14)
rsi_sma_w = sma(rsi_w_vals, 9)
macd_w_line, macd_w_signal, _ = macd(df_weekly['close'], 12, 26, 9)

cci_state_w, cci_age_w = calculate_candles_since_crossover(cci_w_vals, cci_sma_w)
rsi_state_w, rsi_age_w = calculate_candles_since_crossover(rsi_w_vals, rsi_sma_w)
macd_state_w, macd_age_w = calculate_candles_since_crossover(macd_w_line, macd_w_signal)

cci_w = get_decay_score(cci_state_w, cci_age_w)
rsi_w = get_decay_score(rsi_state_w, rsi_age_w)
macd_w_score = get_decay_score(macd_state_w, macd_age_w)

# MONTHLY
cci_m_vals = cci(df_monthly['high'], df_monthly['low'], df_monthly['close'], length=60)
cci_sma_m = sma(cci_m_vals, 9)
rsi_m_vals = rsi(df_monthly['close'], 14)
rsi_sma_m = sma(rsi_m_vals, 9)
macd_m_line, macd_m_signal, _ = macd(df_monthly['close'], 12, 26, 9)

cci_state_m, cci_age_m = calculate_candles_since_crossover(cci_m_vals, cci_sma_m)
rsi_state_m, rsi_age_m = calculate_candles_since_crossover(rsi_m_vals, rsi_sma_m)
macd_state_m, macd_age_m = calculate_candles_since_crossover(macd_m_line, macd_m_signal)

cci_m = get_decay_score(cci_state_m, cci_age_m)
rsi_m = get_decay_score(rsi_state_m, rsi_age_m)
macd_m_score = get_decay_score(macd_state_m, macd_age_m)


print(f"DAILY:   CCI={cci_d} (state={cci_state_d}, age={cci_age_d}), RSI={rsi_d} (state={rsi_state_d}, age={rsi_age_d}), MACD={macd_d_score} (state={macd_state_d}, age={macd_age_d})")
print(f"WEEKLY:  CCI={cci_w} (state={cci_state_w}, age={cci_age_w}), RSI={rsi_w} (state={rsi_state_w}, age={rsi_age_w}), MACD={macd_w_score} (state={macd_state_w}, age={macd_age_w})")
print(f"MONTHLY: CCI={cci_m} (state={cci_state_m}, age={cci_age_m}), RSI={rsi_m} (state={rsi_state_m}, age={rsi_age_m}), MACD={macd_m_score} (state={macd_state_m}, age={macd_age_m})")

short_raw = (
    (cci_d + cci_w + cci_m/4) +
    (macd_d_score + macd_w_score + macd_m_score/4) +
    (rsi_d + rsi_w + rsi_m/4)
) / 6.75

medium_raw = (
    (cci_m + cci_w + cci_d/3) +
    (macd_m_score + macd_w_score + macd_d_score/3) +
    (rsi_m + rsi_w + rsi_d/3)
) / 7.0

long_raw = (
    (cci_m + cci_w + cci_d/4) +
    (macd_m_score + macd_w_score + macd_d_score/4) +
    (rsi_m + rsi_w + rsi_d/4)
) / 6.75

print(f"\nRAW SHORT: {short_raw}")
print(f"RAW MEDIUM: {medium_raw}")
print(f"RAW LONG: {long_raw}")

db.close()
