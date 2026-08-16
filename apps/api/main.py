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

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finwerse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(portfolio.router)
app.include_router(health.router)


@app.get("/")
def health_check():
    return {"status": "healthy"}
