import logging
from fastapi import FastAPI
from routers import stocks
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Finwerse API", version="1.0.0")

app.include_router(stocks.router)


@app.get("/")
def health_check():
    return {"status": "healthy"}
