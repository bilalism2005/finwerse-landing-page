import os
from dotenv import load_dotenv
import httpx
import json

load_dotenv()

api_key = os.getenv("INDIANAPI_KEY")
headers = {
    "x-api-key": api_key
}
base_url = "https://stock.indianapi.in"

def extract_metric(metrics_dict, group, key):
    group_list = metrics_dict.get(group, [])
    if isinstance(group_list, list):
        for item in group_list:
            if item.get("key") == key:
                return item.get("value")
    return None

for symbol in ["INFY", "TCS", "RELIANCE"]:
    print(f"\n==================== {symbol} ====================")
    # 1. Fetch ratios endpoint
    ratios_url = f"{base_url}/historical_stats?stock_name={symbol}&stats=ratios"
    ratios = {}
    try:
        r = httpx.get(ratios_url, headers=headers, timeout=10)
        if r.status_code == 200:
            ratios = r.json()
    except Exception as e:
        print(f"Error fetching ratios: {e}")
        
    # 2. Fetch stock endpoint
    stock_url = f"{base_url}/stock?name={symbol}"
    stock_data = {}
    try:
        s = httpx.get(stock_url, headers=headers, timeout=10)
        if s.status_code == 200:
            stock_data = s.json()
    except Exception as e:
        print(f"Error fetching stock data: {e}")

    # Extract relevant fields
    reusable = stock_data.get("stockDetailsReusableData", {})
    key_metrics = stock_data.get("keyMetrics", {})
    
    debt_equity = reusable.get("totalDebtPerTotalEquityMostRecentQuarter")
    p_e = reusable.get("pPerEBasicExcludingExtraordinaryItemsTTM")
    div_yield = reusable.get("currentDividendYieldCommonStockPrimaryIssueLTM")
    
    # Financial Strength metrics
    quick_ratio = extract_metric(key_metrics, "financialstrength", "quickRatioMostRecentFiscalYear")
    lt_debt_equity = extract_metric(key_metrics, "financialstrength", "ltDebtPerEquityMostRecentFiscalYear)") # Note trailing parenthesis in key
    fcf = extract_metric(key_metrics, "financialstrength", "freeCashFlowMostRecentFiscalYear")
    
    # Management effectiveness
    roce_list = ratios.get("ROCE %", {})
    latest_year = sorted(list(roce_list.keys()))[-1] if roce_list else None
    latest_roce = roce_list.get(latest_year) if latest_year else None
    
    # Margins
    op_margin_ttm = extract_metric(key_metrics, "margins", "operatingMarginTrailing12Month")
    op_margin_5yr = extract_metric(key_metrics, "margins", "operatingMargin5YearAverage")
    
    # Print results
    print(f"Debt to Equity (Quarter): {debt_equity}")
    print(f"LT Debt to Equity (Fiscal Year): {lt_debt_equity}")
    print(f"Quick Ratio (Fiscal Year): {quick_ratio}")
    print(f"ROCE % (Latest: {latest_year}): {latest_roce}")
    print(f"Operating Margin TTM: {op_margin_ttm}")
    print(f"Operating Margin 5Yr Average: {op_margin_5yr}")
    print(f"P/E Ratio: {p_e}")
    print(f"Dividend Yield: {div_yield}")
    print(f"Free Cash Flow (Fiscal Year): {fcf}")
