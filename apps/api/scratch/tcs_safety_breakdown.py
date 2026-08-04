import os
import json
import sys
from dotenv import load_dotenv
import httpx

# Add project root to sys.path
sys.path.append(os.getcwd())

from services.scoring import compute_safety_scores

load_dotenv()
api_key = os.getenv("INDIANAPI_KEY")
headers = {"x-api-key": api_key}
base_url = "https://stock.indianapi.in"

symbol = "TCS"
print(f"Fetching raw data for {symbol}...")
ratios = httpx.get(f"{base_url}/historical_stats?stock_name={symbol}&stats=ratios", headers=headers).json()
stock = httpx.get(f"{base_url}/stock?name={symbol}", headers=headers).json()
quarter = httpx.get(f"{base_url}/historical_stats?stock_name={symbol}&stats=quarter_results", headers=headers).json()
yoy = httpx.get(f"{base_url}/historical_stats?stock_name={symbol}&stats=yoy_results", headers=headers).json()
balance = httpx.get(f"{base_url}/historical_stats?stock_name={symbol}&stats=balancesheet", headers=headers).json()
shareholding = httpx.get(f"{base_url}/historical_stats?stock_name={symbol}&stats=shareholding_pattern_quarterly", headers=headers).json()

# Compute safety scores (passing a mock df_daily that gives a realistic RVOL/Gap or None to let it default)
# During the batch processor run, the final safety scores for TCS were:
# {'short': 6.2, 'medium': 25.65, 'long': 27.04}
# Let's inspect the indicator scoring by running the logic on raw JSONs
from services.scoring import compute_safety_scores as real_compute

# We pass a mock volume to get RVOL of ~1.2 (neutral) and check the breakdown
scores = real_compute(ratios, stock, quarter, yoy, balance, shareholding, None)

print("\n=== TCS SAFETY INDICATOR BREAKDOWN ===")
for k, v in scores["metrics"].items():
    print(f"Metric: {k} = {v}")

print("\n=== TCS CALCULATED INDICATOR SCORES ===")
# To get the scores dictionary, we can inspect a simplified version of the logic
# Let's print the scores returned
print(json.dumps(scores, indent=2))
