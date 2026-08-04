import json

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
        "debt_equity": debt_equity,
        "quick_ratio": quick_ratio,
        "roce": roce,
        "margin": margin,
        "debt_score": debt_score,
        "liq_score": liq_score,
        "eff_score": eff_score,
        "prof_score": prof_score,
        "scores": {
            "short": short_safety,
            "medium": medium_safety,
            "long": long_safety
        }
    }

# Test on INFY
with open("scratch/infy_stock.json", "r") as f:
    infy_stock = json.load(f)
with open("scratch/infy_ratios.json", "r") as f:
    infy_ratios = json.load(f)

res = compute_safety_scores(infy_ratios, infy_stock)
print("=== INFY Safety Scores ===")
print(f"Debt/Equity: {res['debt_equity']} (score: {res['debt_score']})")
print(f"Quick Ratio: {res['quick_ratio']} (score: {res['liq_score']})")
print(f"ROCE: {res['roce']}% (score: {res['eff_score']})")
print(f"Margin: {res['margin']}% (score: {res['prof_score']})")
print(f"Short Score: {res['scores']['short']}")
print(f"Medium Score: {res['scores']['medium']}")
print(f"Long Score: {res['scores']['long']}")
