import pandas as pd
import numpy as np

# ---- Pure pandas technical indicator implementations ----

def sma(series, length):
    return series.rolling(window=length).mean()

def ema(series, length):
    return series.ewm(span=length, adjust=False).mean()

def rsi(close, length=14):
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1/length, min_periods=length, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/length, min_periods=length, adjust=False).mean()
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))

def cci(high, low, close, length=20):
    tp = (high + low + close) / 3.0
    tp_sma = sma(tp, length)
    mad = tp.rolling(window=length).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
    return (tp - tp_sma) / (0.015 * mad)

def macd(close, fast=12, slow=26, signal=9):
    fast_ema = ema(close, fast)
    slow_ema = ema(close, slow)
    macd_line = fast_ema - slow_ema
    signal_line = ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

# ---- Crossover and Decay Logic ----

def calculate_candles_since_crossover(indicator_series, signal_series):
    if len(indicator_series) < 2 or len(signal_series) < 2:
        return 0, 0
    
    diff = indicator_series - signal_series
    current_diff = diff.iloc[-1]
    if pd.isna(current_diff) or current_diff == 0:
        return 0, 0
    
    current_state = 1 if current_diff > 0 else -1
    age = 1
    
    for i in range(len(diff) - 2, -1, -1):
        prev_diff = diff.iloc[i]
        if pd.isna(prev_diff):
            break
        prev_state = 1 if prev_diff > 0 else -1
        if prev_state != current_state:
            break
        age += 1
        
    return current_state, age

def get_decay_score(state, age):
    if state == 0:
        return 0
    magnitude = max(100 - ((age - 1) * 10), 10)
    return magnitude if state == 1 else -magnitude

def compute_technical_scores(df_daily, df_weekly, df_monthly):
    """
    Computes technical scores for all three timeframes.
    DataFrames should have columns: ['open', 'high', 'low', 'close', 'volume']
    """
    # Ensure float64 dtype
    for df in [df_daily, df_weekly, df_monthly]:
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = df[col].astype('float64')

    # --- Daily ---
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

    # --- Weekly ---
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

    # --- Monthly ---
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

    # --- Combine into Short / Medium / Long ---
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

    return {
        "short": min(max(short_raw, -100), 100),
        "medium": min(max(medium_raw, -100), 100),
        "long": min(max(long_raw, -100), 100)
    }

def compute_overall_score(technical, safety, sentiment, timeframe):
    weights = {
        'short': {'technical': 0.60, 'sentiment': 0.30, 'safety': 0.10},
        'medium': {'technical': 0.60, 'sentiment': 0.10, 'safety': 0.30},
        'long': {'technical': 0.60, 'sentiment': 0.05, 'safety': 0.35}
    }
    
    w = weights[timeframe]
    
    if sentiment is None or str(sentiment).lower() == "not available":
        new_w_tech = w['technical'] / (w['technical'] + w['safety'])
        new_w_safety = w['safety'] / (w['technical'] + w['safety'])
        return (technical * new_w_tech) + (safety * new_w_safety)
    
    return (technical * w['technical']) + (sentiment * w['sentiment']) + (safety * w['safety'])
