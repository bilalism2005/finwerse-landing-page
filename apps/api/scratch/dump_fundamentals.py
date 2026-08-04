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

for endpoint_name, url_suffix in [
    ("ratios", "/historical_stats?stock_name=INFY&stats=ratios"),
    ("stock", "/stock?name=INFY")
]:
    url = f"{base_url}{url_suffix}"
    print(f"Fetching {endpoint_name}...")
    try:
        response = httpx.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            filename = f"scratch/infy_{endpoint_name}.json"
            with open(filename, "w") as f:
                json.dump(response.json(), f, indent=2)
            print(f"Saved to {filename}")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")
