import pandas as pd
import pandas_ta as ta

def calculate_candles_since_crossover(indicator_series, signal_series):
    """
    Custom logic to find how many candles ago a crossover occurred.
    Iterates backwards from the most recent candle.
    Returns:
    - state: "bullish" (1), "bearish" (-1), "none" (0)
    - age: number of candles since crossover (1 for current candle, 2 for previous, etc.)
    """
    if len(indicator_series) < 2 or len(signal_series) < 2:
        return 0, 0
    
    # Calculate difference
    diff = indicator_series - signal_series
    
    # Current state
    current_diff = diff.iloc[-1]
    if pd.isna(current_diff) or current_diff == 0:
        return 0, 0
    
    current_state = 1 if current_diff > 0 else -1
    age = 1
    
    # Iterate backwards
    for i in range(len(diff) - 2, -1, -1):
        prev_diff = diff.iloc[i]
        if pd.isna(prev_diff):
            break
            
        prev_state = 1 if prev_diff > 0 else -1
        if prev_state != current_state:
            # Found the crossover point
            break
        age += 1
        
    return current_state, age

def get_decay_score(state, age):
    """
    Decays score based on age.
    Score starts at 100, decays by 10 per candle down to 10 for bullish.
    Score starts at -100, decays by 10 per candle down to -10 for bearish.
    """
    if state == 0:
        return 0
        
    magnitude = max(100 - ((age - 1) * 10), 10)
    return magnitude if state == 1 else -magnitude

def compute_technical_scores(df_daily, df_weekly, df_monthly):
    """
    Computes technical scores for all three timeframes.
    df should have ['open', 'high', 'low', 'close', 'volume']
    """
    # Daily
    df_daily['CCI'] = ta.cci(df_daily['high'], df_daily['low'], df_daily['close'], length=30)
    df_daily['CCI_SMA'] = ta.sma(df_daily['CCI'], length=9)
    df_daily['RSI'] = ta.rsi(df_daily['close'], length=14)
    df_daily['RSI_SMA'] = ta.sma(df_daily['RSI'], length=9)
    macd_d = ta.macd(df_daily['close'], fast=12, slow=26, signal=9)
    
    cci_state_d, cci_age_d = calculate_candles_since_crossover(df_daily['CCI'], df_daily['CCI_SMA'])
    rsi_state_d, rsi_age_d = calculate_candles_since_crossover(df_daily['RSI'], df_daily['RSI_SMA'])
    macd_state_d, macd_age_d = calculate_candles_since_crossover(macd_d['MACD_12_26_9'], macd_d['MACDs_12_26_9'])
    
    cci_d = get_decay_score(cci_state_d, cci_age_d)
    rsi_d = get_decay_score(rsi_state_d, rsi_age_d)
    macd_d = get_decay_score(macd_state_d, macd_age_d)

    # Weekly
    df_weekly['CCI'] = ta.cci(df_weekly['high'], df_weekly['low'], df_weekly['close'], length=60)
    df_weekly['CCI_SMA'] = ta.sma(df_weekly['CCI'], length=9)
    df_weekly['RSI'] = ta.rsi(df_weekly['close'], length=14)
    df_weekly['RSI_SMA'] = ta.sma(df_weekly['RSI'], length=9)
    macd_w = ta.macd(df_weekly['close'], fast=12, slow=26, signal=9)
    
    cci_state_w, cci_age_w = calculate_candles_since_crossover(df_weekly['CCI'], df_weekly['CCI_SMA'])
    rsi_state_w, rsi_age_w = calculate_candles_since_crossover(df_weekly['RSI'], df_weekly['RSI_SMA'])
    macd_state_w, macd_age_w = calculate_candles_since_crossover(macd_w['MACD_12_26_9'], macd_w['MACDs_12_26_9'])

    cci_w = get_decay_score(cci_state_w, cci_age_w)
    rsi_w = get_decay_score(rsi_state_w, rsi_age_w)
    macd_w = get_decay_score(macd_state_w, macd_age_w)

    # Monthly
    df_monthly['CCI'] = ta.cci(df_monthly['high'], df_monthly['low'], df_monthly['close'], length=60)
    df_monthly['CCI_SMA'] = ta.sma(df_monthly['CCI'], length=9)
    df_monthly['RSI'] = ta.rsi(df_monthly['close'], length=14)
    df_monthly['RSI_SMA'] = ta.sma(df_monthly['RSI'], length=9)
    macd_m = ta.macd(df_monthly['close'], fast=12, slow=26, signal=9)

    cci_state_m, cci_age_m = calculate_candles_since_crossover(df_monthly['CCI'], df_monthly['CCI_SMA'])
    rsi_state_m, rsi_age_m = calculate_candles_since_crossover(df_monthly['RSI'], df_monthly['RSI_SMA'])
    macd_state_m, macd_age_m = calculate_candles_since_crossover(macd_m['MACD_12_26_9'], macd_m['MACDs_12_26_9'])

    cci_m = get_decay_score(cci_state_m, cci_age_m)
    rsi_m = get_decay_score(rsi_state_m, rsi_age_m)
    macd_m = get_decay_score(macd_state_m, macd_age_m)

    # Short term (7-30 days)
    short_raw = (
        (cci_d + cci_w + cci_m/4) +
        (macd_d + macd_w + macd_m/4) +
        (rsi_d + rsi_w + rsi_m/4)
    ) / 6.75
    
    # Medium term (1-4 months)
    medium_raw = (
        (cci_m + cci_w + cci_d/3) +
        (macd_m + macd_w + macd_d/3) +
        (rsi_m + rsi_w + rsi_d/3)
    ) / 7.0

    # Long term (4-12 months)
    long_raw = (
        (cci_m + cci_w + cci_d/4) +
        (macd_m + macd_w + macd_d/4) +
        (rsi_m + rsi_w + rsi_d/4)
    ) / 6.75

    return {
        "short": min(max(short_raw, -100), 100),
        "medium": min(max(medium_raw, -100), 100),
        "long": min(max(long_raw, -100), 100)
    }

def compute_overall_score(technical, safety, sentiment, timeframe):
    """
    Computes overall score based on timeframe weights and handles missing sentiment.
    Timeframes: 'short', 'medium', 'long'
    """
    weights = {
        'short': {'technical': 0.60, 'sentiment': 0.30, 'safety': 0.10},
        'medium': {'technical': 0.60, 'sentiment': 0.10, 'safety': 0.30},
        'long': {'technical': 0.60, 'sentiment': 0.05, 'safety': 0.35}
    }
    
    w = weights[timeframe]
    
    if sentiment is None or str(sentiment).lower() == "not available":
        # Reweight
        new_w_tech = w['technical'] / (w['technical'] + w['safety'])
        new_w_safety = w['safety'] / (w['technical'] + w['safety'])
        return (technical * new_w_tech) + (safety * new_w_safety)
    
    return (technical * w['technical']) + (sentiment * w['sentiment']) + (safety * w['safety'])
