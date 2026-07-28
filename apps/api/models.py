from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from database import Base

class SymbolMapping(Base):
    __tablename__ = "symbol_mapping"
    stock_symbol = Column(String, primary_key=True, index=True)
    angel_token = Column(String, nullable=True)
    indianapi_id = Column(String, nullable=True)
    eodhd_symbol = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StockScore(Base):
    __tablename__ = "stock_scores"
    stock_symbol = Column(String, primary_key=True, index=True)
    computed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    technical_score_short = Column(Float, nullable=True)
    technical_score_medium = Column(Float, nullable=True)
    technical_score_long = Column(Float, nullable=True)
    
    safety_score_short = Column(Float, nullable=True)
    safety_score_medium = Column(Float, nullable=True)
    safety_score_long = Column(Float, nullable=True)
    
    sentiment_score_short = Column(String, nullable=True) # Stored as string to handle "Not Available"
    sentiment_score_medium = Column(String, nullable=True)
    sentiment_score_long = Column(String, nullable=True)
    
    overall_score_short = Column(Float, nullable=True)
    overall_score_medium = Column(Float, nullable=True)
    overall_score_long = Column(Float, nullable=True)
    
    sector = Column(String, nullable=True)
    market_cap_category = Column(String, nullable=True)

class StockCandle(Base):
    __tablename__ = "stock_candles"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    stock_symbol = Column(String, index=True)
    timeframe = Column(String, index=True) # 'D', 'W', 'M'
    date = Column(DateTime(timezone=True), index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)

class StockFundamental(Base):
    __tablename__ = "stock_fundamentals"
    stock_symbol = Column(String, primary_key=True, index=True)
    period = Column(String) # e.g. "Q1 2026", "FY2025"
    sales = Column(Float, nullable=True)
    eps = Column(Float, nullable=True)
    opm = Column(Float, nullable=True)
    roce = Column(Float, nullable=True)
    roe = Column(Float, nullable=True)
    debt_to_equity = Column(Float, nullable=True)
    pe_ratio = Column(Float, nullable=True)
    market_cap = Column(Float, nullable=True)
    fii_holding_pct = Column(Float, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class StockNews(Base):
    __tablename__ = "stock_news"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    stock_symbol = Column(String, index=True)
    article_date = Column(DateTime(timezone=True), index=True)
    polarity = Column(Float)
    source_url = Column(String, unique=True, index=True) # Used for deduplication
