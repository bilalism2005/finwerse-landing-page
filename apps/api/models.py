from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, UniqueConstraint, CheckConstraint
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
    data_status = Column(String, nullable=True, server_default="SUCCESS")  # SUCCESS, RATE_LIMITED, FAILED
    
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

    __table_args__ = (
        CheckConstraint('technical_score_short BETWEEN -100 AND 100', name='chk_technical_score_short'),
        CheckConstraint('technical_score_medium BETWEEN -100 AND 100', name='chk_technical_score_medium'),
        CheckConstraint('technical_score_long BETWEEN -100 AND 100', name='chk_technical_score_long'),
        CheckConstraint('overall_score_short BETWEEN -100 AND 100', name='chk_overall_score_short'),
        CheckConstraint('overall_score_medium BETWEEN -100 AND 100', name='chk_overall_score_medium'),
        CheckConstraint('overall_score_long BETWEEN -100 AND 100', name='chk_overall_score_long'),
    )

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

    __table_args__ = (
        CheckConstraint('open >= 0 AND close >= 0 AND high >= 0 AND low >= 0', name='chk_candle_positive'),
        CheckConstraint('high >= low', name='chk_candle_high_low'),
    )

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

class StockHistoricalScore(Base):
    __tablename__ = "stock_historical_scores"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    stock_symbol = Column(String, index=True)
    date = Column(DateTime(timezone=True), index=True)
    technical_score_short = Column(Float, nullable=True)
    technical_score_medium = Column(Float, nullable=True)
    technical_score_long = Column(Float, nullable=True)
    
    __table_args__ = (
        UniqueConstraint('stock_symbol', 'date', name='uq_stock_symbol_date'),
        CheckConstraint('technical_score_short BETWEEN -100 AND 100', name='chk_hist_technical_score_short'),
        CheckConstraint('technical_score_medium BETWEEN -100 AND 100', name='chk_hist_technical_score_medium'),
        CheckConstraint('technical_score_long BETWEEN -100 AND 100', name='chk_hist_technical_score_long'),
    )

