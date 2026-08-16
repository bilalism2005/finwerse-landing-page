import pandas as pd
import numpy as np
from datetime import datetime, timezone

# ---- Pure pandas technical indicator implementations ----

def sma(series, length):
    return series.rolling(window=length).mean()

def ema(series, length):
    return series.ewm(span=length, adjust=False).mean()

# ... (other indicator functions) ...

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

    # Use 0 for any NaN scores (e.g. insufficient bars for CCI length)
    def safe_score(state, age):
        val = get_decay_score(state, age)
        return 0 if (val is None or (isinstance(val, float) and np.isnan(val))) else val

    cci_m = safe_score(cci_state_m, cci_age_m)
    rsi_m = safe_score(rsi_state_m, rsi_age_m)
    macd_m_score = safe_score(macd_state_m, macd_age_m)

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

def compute_crossover_series(val_series, sma_series):
    n = len(val_series)
    scores = np.full(n, np.nan)
    
    diff = val_series - sma_series
    
    # We need at least 2 points to check for a crossover/state
    for i in range(1, n):
        current_diff = diff.iloc[i]
        if pd.isna(current_diff) or current_diff == 0:
            continue
            
        current_state = 1 if current_diff > 0 else -1
        age = 1
        
        # Traverse backward to find when state changed
        for j in range(i - 1, -1, -1):
            prev_diff = diff.iloc[j]
            if pd.isna(prev_diff):
                break
            prev_state = 1 if prev_diff > 0 else -1
            if prev_state != current_state:
                break
            age += 1
            
        scores[i] = get_decay_score(current_state, age)
        
    return pd.Series(scores, index=val_series.index)

def compute_historical_technical_scores(df_daily, df_weekly, df_monthly):
    """
    Computes technical scores for all dates in the historical timeline.
    DataFrames should have columns: ['open', 'high', 'low', 'close', 'volume', 'date']
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
    
    cci_d_scores = compute_crossover_series(cci_d_vals, cci_sma_d)
    rsi_d_scores = compute_crossover_series(rsi_d_vals, rsi_sma_d)
    macd_d_scores = compute_crossover_series(macd_d_line, macd_d_signal)

    # --- Weekly ---
    cci_w_vals = cci(df_weekly['high'], df_weekly['low'], df_weekly['close'], length=60)
    cci_sma_w = sma(cci_w_vals, 9)
    rsi_w_vals = rsi(df_weekly['close'], 14)
    rsi_sma_w = sma(rsi_w_vals, 9)
    macd_w_line, macd_w_signal, _ = macd(df_weekly['close'], 12, 26, 9)
    
    cci_w_scores = compute_crossover_series(cci_w_vals, cci_sma_w)
    rsi_w_scores = compute_crossover_series(rsi_w_vals, rsi_sma_w)
    macd_w_scores = compute_crossover_series(macd_w_line, macd_w_signal)

    # --- Monthly ---
    cci_m_vals = cci(df_monthly['high'], df_monthly['low'], df_monthly['close'], length=60)
    cci_sma_m = sma(cci_m_vals, 9)
    rsi_m_vals = rsi(df_monthly['close'], 14)
    rsi_sma_m = sma(rsi_m_vals, 9)
    macd_m_line, macd_m_signal, _ = macd(df_monthly['close'], 12, 26, 9)

    cci_m_scores = compute_crossover_series(cci_m_vals, cci_sma_m)
    rsi_m_scores = compute_crossover_series(rsi_m_vals, rsi_sma_m)
    macd_m_scores = compute_crossover_series(macd_m_line, macd_m_signal)

    # --- Prepare Raw Indicator Data ---
    def create_indicator_records(df, cci_v, cci_s, rsi_v, rsi_s, macd_l, macd_s, tf):
        idf = pd.DataFrame({
            'date': df['date'],
            'timeframe': tf,
            'cci_value': cci_v.values,
            'cci_sma': cci_s.values,
            'cci_crossover': (cci_v - cci_s).values,
            'rsi_value': rsi_v.values,
            'rsi_sma': rsi_s.values,
            'rsi_crossover': (rsi_v - rsi_s).values,
            'macd_line': macd_l.values,
            'macd_signal': macd_s.values,
            'macd_crossover': (macd_l - macd_s).values
        })
        idf = idf.where(pd.notnull(idf), None)
        return idf.to_dict('records')

    ind_d = create_indicator_records(df_daily, cci_d_vals, cci_sma_d, rsi_d_vals, rsi_sma_d, macd_d_line, macd_d_signal, 'D')
    ind_w = create_indicator_records(df_weekly, cci_w_vals, cci_sma_w, rsi_w_vals, rsi_sma_w, macd_w_line, macd_w_signal, 'W')
    ind_m = create_indicator_records(df_monthly, cci_m_vals, cci_sma_m, rsi_m_vals, rsi_sma_m, macd_m_line, macd_m_signal, 'M')
    
    all_indicators = ind_d + ind_w + ind_m

    # Create DataFrames with Date column
    df_d = pd.DataFrame({
        'date': df_daily['date'],
        'cci_d': cci_d_scores.values,
        'rsi_d': rsi_d_scores.values,
        'macd_d': macd_d_scores.values
    }).sort_values('date')

    df_w = pd.DataFrame({
        'date': df_weekly['date'],
        'cci_w': cci_w_scores.values,
        'rsi_w': rsi_w_scores.values,
        'macd_w': macd_w_scores.values
    }).sort_values('date')

    df_m = pd.DataFrame({
        'date': df_monthly['date'],
        'cci_m': cci_m_scores.values,
        'rsi_m': rsi_m_scores.values,
        'macd_m': macd_m_scores.values
    }).sort_values('date')

    # Align Weekly and Monthly scores to Daily index using backward direction (last known weekly/monthly score)
    merged = pd.merge_asof(df_d, df_w, on='date', direction='backward')
    merged = pd.merge_asof(merged, df_m, on='date', direction='backward')

    # Fill NaN indicator scores with 0 so a missing monthly/weekly indicator
    # (e.g. CCI needs 69 monthly bars but stock only has 66) does not poison
    # the entire formula and produce NaN scores stored as 0 in the DB.
    score_cols = ['cci_d', 'rsi_d', 'macd_d', 'cci_w', 'rsi_w', 'macd_w', 'cci_m', 'rsi_m', 'macd_m']
    merged[score_cols] = merged[score_cols].fillna(0.0)

    # Combined Scores
    short_raw = (
        (merged['cci_d'] + merged['cci_w'] + merged['cci_m'] / 4.0) +
        (merged['macd_d'] + merged['macd_w'] + merged['macd_m'] / 4.0) +
        (merged['rsi_d'] + merged['rsi_w'] + merged['rsi_m'] / 4.0)
    ) / 6.75

    medium_raw = (
        (merged['cci_m'] + merged['cci_w'] + merged['cci_d'] / 3.0) +
        (merged['macd_m'] + merged['macd_w'] + merged['macd_d'] / 3.0) +
        (merged['rsi_m'] + merged['rsi_w'] + merged['rsi_d'] / 3.0)
    ) / 7.0

    long_raw = (
        (merged['cci_m'] + merged['cci_w'] + merged['cci_d'] / 4.0) +
        (merged['macd_m'] + merged['macd_w'] + merged['macd_d'] / 4.0) +
        (merged['rsi_m'] + merged['rsi_w'] + merged['rsi_d'] / 4.0)
    ) / 6.75

    merged['short'] = short_raw.clip(-100, 100)
    merged['medium'] = medium_raw.clip(-100, 100)
    merged['long'] = long_raw.clip(-100, 100)

    # Return as list of dicts for easy database saving
    historical_scores = []
    for _, row in merged.iterrows():
        s = row['short']
        m = row['medium']
        l = row['long']
        
        historical_scores.append({
            'date': row['date'],
            'short': None if pd.isna(s) else float(s),
            'medium': None if pd.isna(m) else float(m),
            'long': None if pd.isna(l) else float(l)
        })
        
    return historical_scores, all_indicators

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

def compute_timeframe_sentiment(articles, timeframe_days, now):
    weighted_sum = 0.0
    total_weight = 0.0
    count = 0
    
    for art in articles:
        date_str = art.get("date", "")
        try:
            # Handle standard ISO dates from EODHD
            dt = datetime.fromisoformat(date_str)
            
            # Convert both now and dt to naive UTC datetimes for safe comparison
            if dt.tzinfo is not None:
                dt_naive = dt.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                dt_naive = dt
                
            if now.tzinfo is not None:
                now_naive = now.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                now_naive = now
                
            age_seconds = (now_naive - dt_naive).total_seconds()
            age_days = age_seconds / 86400.0
            
            if 0 <= age_days <= timeframe_days:
                polarity = safe_float(art.get("sentiment", {}).get("polarity", 0.0))
                # Linear decay from 1.0 (today) to 0.1 (oldest boundary)
                weight = 1.0 - 0.9 * (age_days / timeframe_days)
                weight = max(0.1, min(1.0, weight))
                
                weighted_sum += polarity * weight
                total_weight += weight
                count += 1
        except Exception:
            continue
            
    if count == 0:
        return "Not Available"
        
    raw_sentiment = weighted_sum / total_weight if total_weight > 0 else 0.0
    return raw_sentiment * 100.0

def validate_article_for_stock(article, original_symbol, company_name):
    if not company_name:
        return True
        
    title = article.get("title", "").strip().lower()
    content = article.get("content", "").strip().lower()
    full_text = f"{title} {content}"
    
    # Layer 1: Exact Symbol Match
    article_symbols = [s.lower() for s in article.get("symbols", [])]
    if original_symbol.lower() in article_symbols:
        return True
        
    # Layer 2: Company Name Token Check
    clean_name = company_name.lower()
    for suffix in ["limited", "ltd", "incorporated", "inc", "corporation", "corp", "co"]:
        clean_name = clean_name.replace(f" {suffix}", "").strip()
        
    tokens = [t.strip() for t in clean_name.split() if len(t.strip()) >= 3]
    has_company_mention = False
    for token in tokens:
        if token in ["industries", "services", "system", "systems", "group"]:
            continue
        if token in full_text:
            has_company_mention = True
            break
            
    abbrev = original_symbol.split(".")[0].lower()
    if len(abbrev) >= 3 and abbrev in full_text:
        has_company_mention = True
        
    if not has_company_mention:
        return False
        
    # Layer 3: Conflict Exclusion Guards
    if original_symbol.upper().startswith("RELIANCE"):
        if "reliance, inc." in full_text or "reliance steel" in full_text or "steel & aluminum" in full_text:
            return False
            
    if original_symbol.upper().startswith("TCS"):
        if "container store" in full_text or "cream" in full_text or "dermatitis" in full_text or "corticosteroid" in full_text:
            return False
            
    return True

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

def get_sorted_fiscal_keys(keys):
    filtered_keys = [k for k in keys if k and k != "TTM"]
    try:
        return sorted(filtered_keys, key=lambda x: datetime.strptime(x.strip(), "%b %Y"))
    except Exception:
        return sorted(filtered_keys)

def compute_safety_scores(ratios, stock, quarter, yoy, balance, shareholding, df_daily=None):
    if not ratios: ratios = {}
    if not stock: stock = {}
    if not quarter: quarter = {}
    if not yoy: yoy = {}
    if not balance: balance = {}
    if not shareholding: shareholding = {}

    reusable = stock.get("stockDetailsReusableData", {})
    key_metrics = stock.get("keyMetrics", {})
    
    scores = {}
    
    # 1. RVOL (Relative Volume)
    rvol = 1.2
    if df_daily is not None and len(df_daily) >= 21:
        today_vol = safe_float(df_daily['volume'].iloc[-1], 0.0)
        avg_20_vol = safe_float(df_daily['volume'].iloc[-21:-1].mean(), 1.0)
        rvol = today_vol / avg_20_vol if avg_20_vol > 0 else 1.0

    if rvol is not None:
        if rvol > 2.0: scores["RVOL"] = 100
        elif rvol >= 1.5: scores["RVOL"] = 75
        elif rvol >= 1.0: scores["RVOL"] = 50
        elif rvol >= 0.5: scores["RVOL"] = 0
        elif rvol >= 0.2: scores["RVOL"] = -50
        else: scores["RVOL"] = -100

    # 2. 52-Week High Gap
    yhigh = safe_float(reusable.get("yhigh"))
    cmp = safe_float(reusable.get("price"))
    if yhigh and cmp:
        gap = ((yhigh - cmp) / yhigh) * 100
        if 0 <= gap <= 5: scores["52W High Gap"] = 100
        elif 5 < gap <= 10: scores["52W High Gap"] = 75
        elif 10 < gap <= 20: scores["52W High Gap"] = 50
        elif 20 < gap <= 30: scores["52W High Gap"] = -25
        elif 30 < gap <= 50: scores["52W High Gap"] = -50
        elif 50 < gap <= 70: scores["52W High Gap"] = -75
        else: scores["52W High Gap"] = -100

    # 3. Market Cap
    mcap = safe_float(reusable.get("marketCap"))
    if mcap:
        if mcap > 10000: scores["Market Cap"] = 50
        elif mcap >= 5000: scores["Market Cap"] = 75
        elif mcap >= 1000: scores["Market Cap"] = 100
        elif mcap >= 500: scores["Market Cap"] = -25
        elif mcap >= 200: scores["Market Cap"] = -50
        elif mcap >= 100: scores["Market Cap"] = -75
        else: scores["Market Cap"] = -100

    # 4. PE Ratio
    pe = safe_float(reusable.get("pPerEBasicExcludingExtraordinaryItemsTTM"))
    if pe is not None:
        if pe < 0: scores["PE Ratio"] = -100
        elif pe < 10: scores["PE Ratio"] = 75
        elif pe <= 20: scores["PE Ratio"] = 100
        elif pe <= 35: scores["PE Ratio"] = 75
        elif pe <= 50: scores["PE Ratio"] = 25
        elif pe <= 80: scores["PE Ratio"] = -25
        else: scores["PE Ratio"] = -75

    # 5. OPM (Operating Profit Margin)
    opm_list = quarter.get("OPM %", {})
    sorted_opm_qs = get_sorted_fiscal_keys(list(opm_list.keys()))
    latest_q = sorted_opm_qs[-1] if sorted_opm_qs else None
    opm_val = opm_list.get(latest_q) if latest_q else None
    opm = safe_float(opm_val)
    if opm is not None:
        if opm < 0: scores["OPM"] = -100
        elif opm > 30: scores["OPM"] = 100
        elif opm >= 20: scores["OPM"] = 75
        elif opm >= 10: scores["OPM"] = 50
        elif opm >= 5: scores["OPM"] = -25
        else: scores["OPM"] = -50

    # 6. ROCE
    roce_list = ratios.get("ROCE %", {})
    sorted_roce_ys = get_sorted_fiscal_keys(list(roce_list.keys()))
    latest_roce_y = sorted_roce_ys[-1] if sorted_roce_ys else None
    roce_val = roce_list.get(latest_roce_y) if latest_roce_y else None
    roce = safe_float(roce_val)
    if roce is not None:
        if roce < 0: scores["ROCE"] = -100
        elif roce > 30: scores["ROCE"] = 100
        elif roce >= 20: scores["ROCE"] = 75
        elif roce >= 15: scores["ROCE"] = 50
        elif roce >= 10: scores["ROCE"] = -25
        elif roce >= 5: scores["ROCE"] = -50
        else: scores["ROCE"] = -75

    # 7. ROE
    net_profit_list = yoy.get("Net Profit", {})
    equity_cap_list = balance.get("Equity Capital", {})
    reserves_list = balance.get("Reserves", {})
    
    sorted_np_ys = get_sorted_fiscal_keys(list(net_profit_list.keys()))
    latest_y = sorted_np_ys[-1] if sorted_np_ys else None
    
    roe = None
    if latest_y and latest_y in equity_cap_list and latest_y in reserves_list:
        np_val = safe_float(net_profit_list.get(latest_y))
        eq_val = safe_float(equity_cap_list.get(latest_y))
        res_val = safe_float(reserves_list.get(latest_y))
        if np_val is not None and eq_val is not None and res_val is not None:
            tot_equity = eq_val + res_val
            roe = (np_val / tot_equity) * 100 if tot_equity > 0 else 0.0

    if roe is not None:
        if roe < 0: scores["ROE"] = -100
        elif roe > 30: scores["ROE"] = 100
        elif roe >= 20: scores["ROE"] = 75
        elif roe >= 15: scores["ROE"] = 50
        elif roe >= 10: scores["ROE"] = -25
        elif roe >= 5: scores["ROE"] = -50
        else: scores["ROE"] = -75

    # 8. EPS 3Y CAGR
    eps_list = yoy.get("EPS in Rs", {})
    years = get_sorted_fiscal_keys(list(eps_list.keys()))
    eps_cagr = None
    if len(years) >= 4:
        y_latest = years[-1]
        y_3yr_ago = years[-4]
        eps_latest = safe_float(eps_list.get(y_latest))
        eps_3yr = safe_float(eps_list.get(y_3yr_ago))
        if eps_latest is not None and eps_3yr is not None and eps_3yr > 0:
            ratio = eps_latest / eps_3yr
            if ratio > 0:
                eps_cagr = ((ratio) ** (1/3.0) - 1) * 100
            else:
                eps_cagr = -100.0

    if eps_cagr is not None:
        if eps_cagr < 0: scores["EPS 3Y CAGR"] = -100
        elif eps_cagr > 30: scores["EPS 3Y CAGR"] = 100
        elif eps_cagr >= 20: scores["EPS 3Y CAGR"] = 75
        elif eps_cagr >= 15: scores["EPS 3Y CAGR"] = 50
        elif eps_cagr >= 10: scores["EPS 3Y CAGR"] = -25
        elif eps_cagr >= 5: scores["EPS 3Y CAGR"] = -50
        else: scores["EPS 3Y CAGR"] = -75

    # 9. Revenue Growth YoY
    sales_list = yoy.get("Sales", {})
    sales_years = get_sorted_fiscal_keys(list(sales_list.keys()))
    rev_score = None
    if len(sales_years) >= 3:
        y1, y2, y3 = sales_years[-3], sales_years[-2], sales_years[-1]
        s1 = safe_float(sales_list.get(y1))
        s2 = safe_float(sales_list.get(y2))
        s3 = safe_float(sales_list.get(y3))
        if s1 and s2 and s3:
            if s3 > s2 > s1:
                rev_score = 100
            elif s3 > s2 and s2 <= s1:
                rev_score = 75
            elif s3 < s2 < s1:
                rev_score = -100
            elif s3 < s2 and s2 >= s1:
                rev_score = -50
            else:
                rev_score = 25
    if rev_score is not None:
        scores["Revenue Growth YoY"] = rev_score

    # 10. Debt to Equity (Balance sheet based)
    sorted_bs_ys = get_sorted_fiscal_keys(list(equity_cap_list.keys()))
    latest_bs_y = sorted_bs_ys[-1] if sorted_bs_ys else None
    de_ratio = None
    if latest_bs_y:
        borrowings_list = balance.get("Borrowings", {})
        bor = safe_float(borrowings_list.get(latest_bs_y), 0.0)
        eq = safe_float(equity_cap_list.get(latest_bs_y), 0.0)
        res = safe_float(reserves_list.get(latest_bs_y), 0.0)
        tot_eq = eq + res
        if tot_eq > 0:
            de_ratio = bor / tot_eq
        else:
            de_ratio = 99.0
            
    if de_ratio is not None:
        # Note: Banking/NBFC D/E distortion is a known limitation left unmodified per spec
        if de_ratio < 0.1: scores["Debt to Equity"] = 100
        elif de_ratio <= 0.3: scores["Debt to Equity"] = 85
        elif de_ratio <= 0.5: scores["Debt to Equity"] = 65
        elif de_ratio <= 1.0: scores["Debt to Equity"] = 25
        elif de_ratio <= 2.0: scores["Debt to Equity"] = -25
        elif de_ratio <= 3.0: scores["Debt to Equity"] = -60
        else: scores["Debt to Equity"] = -100

    # 11. FII Activity
    fii_key = None
    for k in ["FIIs", "FPIs", "FII", "FPI"]:
        if k in shareholding:
            fii_key = k
            break
            
    fii_list = shareholding.get(fii_key, {}) if fii_key else {}
    fii_quarters = get_sorted_fiscal_keys(list(fii_list.keys()))
    fii_score = None
    if len(fii_quarters) >= 3:
        q1, q2, q3 = fii_quarters[-3], fii_quarters[-2], fii_quarters[-1]
        f1 = safe_float(fii_list.get(q1))
        f2 = safe_float(fii_list.get(q2))
        f3 = safe_float(fii_list.get(q3))
        if f1 is not None and f2 is not None and f3 is not None:
            if f3 > f2 > f1:
                fii_score = 100
            elif f3 > f2 and f2 <= f1:
                fii_score = 75
            elif f3 < f2:
                fii_score = -100
    if fii_score is not None:
        scores["FII Activity"] = fii_score

    # Timeframe Weightings (FII is fixed at 20% in all timeframes)
    weights = {
        "short": {
            "FII Activity": 20, "PE Ratio": 14, "RVOL": 14, "52W High Gap": 13,
            "OPM": 9, "EPS 3Y CAGR": 9, "Revenue Growth YoY": 8, "ROCE": 5,
            "ROE": 5, "Debt to Equity": 2, "Market Cap": 1
        },
        "medium": {
            "FII Activity": 20, "EPS 3Y CAGR": 13, "Revenue Growth YoY": 11, "ROCE": 9,
            "ROE": 9, "OPM": 9, "PE Ratio": 9, "Debt to Equity": 9, "52W High Gap": 5,
            "Market Cap": 4, "RVOL": 2
        },
        "long": {
            "FII Activity": 20, "EPS 3Y CAGR": 19, "Revenue Growth YoY": 14, "ROCE": 12,
            "ROE": 12, "Debt to Equity": 11, "OPM": 8, "PE Ratio": 4, "52W High Gap": 2,
            "Market Cap": 1
        }
    }
    
    results = {}
    for tf in ["short", "medium", "long"]:
        tf_weights = weights[tf]
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for name, w in tf_weights.items():
            if name in scores:
                weighted_sum += scores[name] * w
                total_weight += w
                
        # Re-weight proportionally if any metrics are missing
        results[tf] = weighted_sum / total_weight if total_weight > 0 else 0.0
        
    return {
        "scores": results,
        "metrics": {
            "period": latest_y or latest_q or "",
            "sales": sales_list.get(latest_y) if latest_y else None,
            "eps": eps_list.get(latest_y) if latest_y else None,
            "opm": opm,
            "roce": roce,
            "roe": roe,
            "debt_to_equity": de_ratio,
            "pe_ratio": pe,
            "market_cap": mcap,
            "fii_holding_pct": fii_list.get(fii_quarters[-1]) if fii_quarters else None
        }
    }
