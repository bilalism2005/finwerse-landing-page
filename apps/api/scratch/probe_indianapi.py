import os
from dotenv import load_dotenv
import httpx

load_dotenv()

api_key = os.getenv("INDIANAPI_KEY")

base_urls = [
    "https://stock.indianapi.in",
    "https://analyst.indianapi.in",
    "https://pro.indianapi.in"
]

endpoints = [
    "/historical_stats?stock_name=INFY&stats=ratios",
    "/stock?name=INFY"
]

header_configs = [
    {"x-api-key": api_key},
    {"Authorization": f"Bearer {api_key}"}
]

for base_url in base_urls:
    for endpoint in endpoints:
        for headers in header_configs:
            url = f"{base_url}{endpoint}"
            print(f"Testing URL: {url} with headers keys: {list(headers.keys())}")
            try:
                # Use a short timeout of 5s
                response = httpx.get(url, headers=headers, timeout=5)
                print(f"  -> Status: {response.status_code}")
                if response.status_code == 200:
                    print(f"  -> Success! Body: {response.text[:200]}...")
                else:
                    print(f"  -> Error: {response.text[:100]}")
            except Exception as e:
                print(f"  -> Exception: {e}")
            print("-" * 50)
