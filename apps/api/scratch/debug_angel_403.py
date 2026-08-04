import os
import sys

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
from services.data_fetcher import AngelOneClient
import time
import httpx

load_dotenv()

client = AngelOneClient()
client.login()

# We test the three symbols: RELIANCE (2885), TCS (11536), INFY (1594)
test_tokens = [
    ("RELIANCE", "2885"),
    ("TCS", "11536"),
    ("INFY", "1594")
]

for name, token in test_tokens:
    print(f"\nFetching candles for {name} ({token})...")
    url = f"{client.base_url}/rest/secure/angelbroking/historical/v1/getCandleData"
    headers = {
        "Authorization": f"Bearer {client.jwt_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "127.0.0.1",
        "X-ClientPublicIP": "8.8.8.8",
        "X-MACAddress": "00-00-00-00-00-00",
        "X-PrivateKey": client.api_key
    }
    payload = {
        "exchange": "NSE",
        "symboltoken": token,
        "interval": "ONE_DAY",
        "fromdate": "2026-01-01 09:15",
        "todate": "2026-06-01 15:30"
    }
    
    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
        
    time.sleep(1.0) # Wait 1 second between requests to avoid rate limits
