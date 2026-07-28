import os
import pyotp
from SmartApi import SmartConnect
from dotenv import load_dotenv

load_dotenv()

client_id = os.getenv("ANGEL_ONE_CLIENT_ID")
pin = os.getenv("ANGEL_ONE_PIN")
api_key = os.getenv("ANGEL_ONE_API_KEY")
totp_secret = os.getenv("ANGEL_ONE_TOTP_SECRET")

totp = pyotp.TOTP(totp_secret).now()
print(f"Client ID: {client_id}")
print(f"TOTP Code: {totp}")
print()

obj = SmartConnect(api_key=api_key)

try:
    data = obj.generateSession(client_id, pin, totp)
    print(f"Login Response: {data}")
except Exception as e:
    print(f"Error: {e}")
