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

def safe_float(val, default=0.0):
    if val is None:
        return default
    try:
        if isinstance(val, str):
            val = val.strip().replace("%", "").replace(",", "")
            if val == "-" or val == "":
                return default
        return float(val)
    except ValueError:
        return default

def extract_metric(metrics_dict, group, key):
    group_list = metrics_dict.get(group, [])
    if isinstance(group_list, list):
        for item in group_list:
            if item.get("key") == key:
                return item.get("value")
    return None

def compute_safety_scores(ratios_data, stock_data):
    if not ratios_data:
        ratios_data = {}
    if not stock_data:
        stock_data = {}

    reusable = stock_data.get("stockDetailsReusableData", {})
    key_metrics = stock_data.get("keyMetrics", {})
    
    # 1. Debt Health
    debt_equity_val = reusable.get("totalDebtPerTotalEquityMostRecentQuarter")
    if debt_equity_val is None or str(debt_equity_val).strip() in ["-", ""]:
        # Fallback to LT debt/equity
        debt_equity_val = extract_metric(key_metrics, "financialstrength", "ltDebtPerEquityMostRecentFiscalYear)")
    
    debt_equity = safe_float(debt_equity_val, 0.5)
    
    if debt_equity <= 0.1:
        debt_score = 100
    elif debt_equity <= 0.3:
        debt_score = 90
    elif debt_equity <= 0.5:
        debt_score = 80
    elif debt_equity <= 1.0:
        debt_score = 60
    elif debt_equity <= 1.5:
        debt_score = 40
    else:
        debt_score = 20

    # 2. Liquidity Health
    quick_val = extract_metric(key_metrics, "financialstrength", "quickRatioMostRecentFiscalYear")
    quick_ratio = safe_float(quick_val, 1.0)
    
    if quick_ratio >= 2.0:
        liq_score = 100
    elif quick_ratio >= 1.5:
        liq_score = 90
    elif quick_ratio >= 1.0:
        liq_score = 80
    elif quick_ratio >= 0.7:
        liq_score = 60
    elif quick_ratio >= 0.5:
        liq_score = 40
    else:
        liq_score = 20

    # 3. Capital Efficiency
    roce_list = ratios_data.get("ROCE %", {})
    latest_year = sorted(list(roce_list.keys()))[-1] if roce_list else None
    roce_val = roce_list.get(latest_year) if latest_year else None
    roce = safe_float(roce_val, 15.0)
    
    if roce >= 35.0:
        eff_score = 100
    elif roce >= 25.0:
        eff_score = 90
    elif roce >= 15.0:
        eff_score = 80
    elif roce >= 10.0:
        eff_score = 60
    elif roce >= 5.0:
        eff_score = 40
    else:
        eff_score = 20

    # 4. Profitability / Margin Health
    op_margin_ttm_val = extract_metric(key_metrics, "margins", "operatingMarginTrailing12Month")
    op_margin_5yr_val = extract_metric(key_metrics, "margins", "operatingMargin5YearAverage")
    
    margin_ttm = safe_float(op_margin_ttm_val)
    margin_5yr = safe_float(op_margin_5yr_val)
    
    if margin_ttm > 0 and margin_5yr > 0:
        margin = (margin_ttm + margin_5yr) / 2.0
    elif margin_ttm > 0:
        margin = margin_ttm
    elif margin_5yr > 0:
        margin = margin_5yr
    else:
        margin = 10.0
        
    if margin >= 25.0:
        prof_score = 100
    elif margin >= 18.0:
        prof_score = 90
    elif margin >= 12.0:
        prof_score = 80
    elif margin >= 8.0:
        prof_score = 60
    elif margin >= 4.0:
        prof_score = 40
    else:
        prof_score = 20

    # Compute short, medium, and long term safety scores
    short_safety = (debt_score * 0.30) + (liq_score * 0.50) + (eff_score * 0.10) + (prof_score * 0.10)
    medium_safety = (debt_score * 0.40) + (liq_score * 0.20) + (eff_score * 0.20) + (prof_score * 0.20)
    long_safety = (debt_score * 0.30) + (liq_score * 0.10) + (eff_score * 0.30) + (prof_score * 0.30)

    return {
        "short": short_safety,
        "medium": medium_safety,
        "long": long_safety
    }
