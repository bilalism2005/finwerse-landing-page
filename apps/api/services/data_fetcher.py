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
        return response.json()

class IndianAPIClient:
    def __init__(self):
        self.api_key = os.getenv("INDIANAPI_KEY")
        self.base_url = "https://indianapi.in/api/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

    def get_fundamentals(self, symbol):
        url = f"{self.base_url}/stock/{symbol}/historical_stats?stats=ratios"
        response = httpx.get(url, headers=self.headers)
        return response.json()

class EODHDClient:
    def __init__(self):
        self.api_key = os.getenv("EODHD_API_KEY")
        self.base_url = "https://eodhd.com/api"

    def get_news(self, symbol, from_date, to_date):
        url = f"{self.base_url}/news?s={symbol}.NSE&from={from_date}&to={to_date}&limit=50&api_token={self.api_key}&fmt=json"
        response = httpx.get(url)
        return response.json()
