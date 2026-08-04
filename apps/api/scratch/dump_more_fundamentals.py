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

endpoints = [
    ("quarter_results", "/historical_stats?stock_name=INFY&stats=quarter_results"),
    ("yoy_results", "/historical_stats?stock_name=INFY&stats=yoy_results"),
    ("balancesheet", "/historical_stats?stock_name=INFY&stats=balancesheet"),
    ("shareholding", "/historical_stats?stock_name=INFY&stats=shareholding_pattern_quarterly")
]

for name, url_suffix in endpoints:
    url = f"{base_url}{url_suffix}"
    print(f"Fetching {name}...")
    try:
        response = httpx.get(url, headers=headers, timeout=15)
        print(f"  -> Status: {response.status_code}")
        if response.status_code == 200:
            filename = f"scratch/infy_{name}.json"
            with open(filename, "w") as f:
                json.dump(response.json(), f, indent=2)
            print(f"  -> Saved to {filename}")
        else:
            print(f"  -> Error: {response.text[:200]}")
    except Exception as e:
        print(f"  -> Exception: {e}")
