import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import stocks, portfolio, health
from dotenv import load_dotenv
import models
from database import engine

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from routers import stocks, portfolio, health, chatbot, alerts, analyzer, sentiment

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finwerse API", version="1.0.0")

# Enable CORS for web/mobile apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your actual app domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(portfolio.router)
app.include_router(health.router)
app.include_router(chatbot.router)
app.include_router(alerts.router)
app.include_router(analyzer.router)
app.include_router(sentiment.router)


@app.get("/")
def health_check():
    return {"status": "healthy"}
