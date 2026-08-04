import json
import os
import sys
from datetime import datetime

# Define helpers
def safe_float(val, default=None):
    if val is None:
        return default
    try:
        if isinstance(val, str):
            val = val.strip().replace("%", "").replace(",", "")
            if val in ["-", "", "None"]:
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
    # Filter out "TTM" and empty keys
    filtered_keys = [k for k in keys if k and k != "TTM"]
    try:
        # Sort chronologically by parsing "Month Year" (e.g. "Mar 2026" or "Jun 2026")
        return sorted(filtered_keys, key=lambda x: datetime.strptime(x.strip(), "%b %Y"))
    except Exception:
        # Fallback to standard sorted if format is different
        return sorted(filtered_keys)

def compute_11_safety_indicators(ratios, stock, quarter, yoy, balance, shareholding, df_daily=None):
    reusable = stock.get("stockDetailsReusableData", {})
    key_metrics = stock.get("keyMetrics", {})
    
    scores = {}
    
    # 1. RVOL (Relative Volume)
    rvol = 1.2
    if df_daily is not None and len(df_daily) >= 21:
        today_vol = safe_float(df_daily['volume'].iloc[-1], 0)
        avg_20_vol = safe_float(df_daily['volume'].iloc[-21:-1].mean(), 1)
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
    mcap = safe_float(reusable.get("marketCap")) # in Crores
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
        
    return scores

def calculate_timeframe_safety(scores):
    # Weightages
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
            # RVOL is 0% (excluded)
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
                
        results[tf] = weighted_sum / total_weight if total_weight > 0 else 0.0
        
    return results

# Load INFY
with open("scratch/infy_stock.json", "r") as f:
    stock = json.load(f)
with open("scratch/infy_ratios.json", "r") as f:
    ratios = json.load(f)
with open("scratch/infy_quarter_results.json", "r") as f:
    quarter = json.load(f)
with open("scratch/infy_yoy_results.json", "r") as f:
    yoy = json.load(f)
with open("scratch/infy_balancesheet.json", "r") as f:
    balance = json.load(f)
with open("scratch/infy_shareholding.json", "r") as f:
    shareholding = json.load(f)

scores = compute_11_safety_indicators(ratios, stock, quarter, yoy, balance, shareholding)
print("=== INFY Safety Indicator Scores (Corrected chronological sorting) ===")
for k, v in scores.items():
    print(f"{k}: {v}")

results = calculate_timeframe_safety(scores)
print("\n=== INFY Timeframe Safety Scores ===")
for k, v in results.items():
    print(f"{k}: {v:.2f}")
