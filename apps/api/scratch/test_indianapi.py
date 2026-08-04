import os
from dotenv import load_dotenv
import httpx
import json

load_dotenv()

api_key = os.getenv("INDIANAPI_KEY")
headers = {
    "X-API-Key": api_key
}
base_url = "https://analyst.indianapi.in"

for symbol in ["INFY", "TCS", "RELIANCE"]:
    url = f"{base_url}/historical_stats?stock_name={symbol}&stats=ratios"
    print(f"Fetching ratios for {symbol} from {url}...")
    try:
        response = httpx.get(url, headers=headers, timeout=15)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # print first few levels of JSON to inspect keys
            print(json.dumps(data, indent=2)[:2000])
        else:
            print(response.text[:1000])
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
