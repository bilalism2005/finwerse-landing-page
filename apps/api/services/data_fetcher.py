import os
import httpx
import pyotp
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AngelOneClient:
    def __init__(self):
        self.client_id = os.getenv("ANGEL_ONE_CLIENT_ID")
        self.pin = os.getenv("ANGEL_ONE_PIN")
        self.api_key = os.getenv("ANGEL_ONE_API_KEY")
        self.totp_secret = os.getenv("ANGEL_ONE_TOTP_SECRET")
        self.base_url = "https://apiconnect.angelbroking.com"
        self.jwt_token = None
        self.feed_token = None

    def _generate_totp(self):
        totp = pyotp.TOTP(self.totp_secret)
        return totp.now()

    def login(self):
        url = f"{self.base_url}/rest/auth/angelbroking/user/v1/loginByPassword"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "8.8.8.8",
            "X-MACAddress": "00-00-00-00-00-00",
            "X-PrivateKey": self.api_key
        }
        payload = {
            "clientcode": self.client_id,
            "password": self.pin,
            "totp": self._generate_totp()
        }
        response = httpx.post(url, headers=headers, json=payload)
        data = response.json()
        if data.get('status'):
            self.jwt_token = data['data']['jwtToken']
            self.feed_token = data['data']['feedToken']
            logger.info("Angel One login successful")
        else:
            logger.error(f"Angel One login failed: {data}")
            raise Exception("Angel One Login Failed")

    def get_historical_candles(self, exchange="NSE", symboltoken="", interval="ONE_DAY", from_date="", to_date=""):
        if not self.jwt_token:
            self.login()
        url = f"{self.base_url}/rest/secure/angelbroking/historical/v1/getCandleData"
        headers = {
            "Authorization": f"Bearer {self.jwt_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "8.8.8.8",
            "X-MACAddress": "00-00-00-00-00-00",
            "X-PrivateKey": self.api_key
        }
        payload = {
            "exchange": exchange,
            "symboltoken": symboltoken,
            "interval": interval,
            "fromdate": from_date,
            "todate": to_date
        }
        response = httpx.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            logger.error(f"Angel One historical data error: HTTP {response.status_code}")
            return {"status": False, "message": f"HTTP {response.status_code}", "data": None}
        try:
            return response.json()
        except Exception:
            logger.error(f"Angel One returned non-JSON response")
            return {"status": False, "message": "Non-JSON response", "data": None}

class IndianAPIClient:
    def __init__(self):
        self.api_key = os.getenv("INDIANAPI_KEY")
        self.base_url = "https://stock.indianapi.in"
        self.headers = {
            "x-api-key": self.api_key
        }

    def get_ratios(self, symbol):
        url = f"{self.base_url}/historical_stats?stock_name={symbol}&stats=ratios"
        response = httpx.get(url, headers=self.headers)
        if response.status_code != 200:
            logger.error(f"IndianAPI get_ratios error: {response.status_code}")
            return None
        return response.json()

    def get_stock_details(self, symbol):
        url = f"{self.base_url}/stock?name={symbol}"
        response = httpx.get(url, headers=self.headers)
        if response.status_code != 200:
            logger.error(f"IndianAPI get_stock_details error: {response.status_code}")
            return None
        return response.json()

class EODHDClient:
    def __init__(self):
        self.api_key = os.getenv("EODHD_API_KEY")
        self.base_url = "https://eodhd.com/api"

    def get_news(self, symbol, from_date, to_date):
        url = f"{self.base_url}/news?s={symbol}&from={from_date}&to={to_date}&limit=50&api_token={self.api_key}&fmt=json"
        response = httpx.get(url)
        return response.json()
