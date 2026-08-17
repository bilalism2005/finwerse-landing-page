from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from routers import stocks, portfolio, health, chatbot, alerts, analyzer, sentiment

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Non-blocking schema validation on startup
    try:
        import models
        from database import engine
        models.Base.metadata.create_all(bind=engine)
        logger.info("Database schema validated successfully.")
    except Exception as e:
        logger.warning(f"Database schema initialization warning: {e}")
    yield

app = FastAPI(title="Finwerse API", version="1.0.0", lifespan=lifespan)

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
