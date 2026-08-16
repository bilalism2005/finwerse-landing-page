from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, ForeignKey, UniqueConstraint, CheckConstraint, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database import Base
from pgvector.sqlalchemy import Vector

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
    
    overall_score_short = Column(Float, nullable=True, index=True)
    overall_score_medium = Column(Float, nullable=True, index=True)
    overall_score_long = Column(Float, nullable=True, index=True)
    
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

class StockIndicatorValue(Base):
    __tablename__ = "stock_indicator_values"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    stock_symbol = Column(String, index=True)
    date = Column(DateTime(timezone=True), index=True)
    timeframe = Column(String, index=True) # 'D', 'W', 'M'
    
    cci_value = Column(Float, nullable=True)
    cci_sma = Column(Float, nullable=True)
    cci_crossover = Column(Float, nullable=True)
    
    rsi_value = Column(Float, nullable=True)
    rsi_sma = Column(Float, nullable=True)
    rsi_crossover = Column(Float, nullable=True)
    
    macd_line = Column(Float, nullable=True)
    macd_signal = Column(Float, nullable=True)
    macd_crossover = Column(Float, nullable=True)
    
    __table_args__ = (
        UniqueConstraint('stock_symbol', 'date', 'timeframe', name='uq_stock_indicator_value'),
    )

from sqlalchemy import Index

class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String, index=True, nullable=False) # Supabase auth user UUID stored as string
    stock_symbol = Column(String, index=True, nullable=False)
    quantity = Column(Integer, nullable=False)
    avg_price = Column(Float, nullable=False)
    purchase_date = Column(Date, nullable=False)
    intended_holding_period = Column(String, nullable=False) # 'short', 'medium', 'long'
    status = Column(String, nullable=False, default='held', index=True) # 'held', 'sold'
    
    sold_quantity = Column(Integer, nullable=True)
    sold_date = Column(Date, nullable=True)
    sold_price = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("status IN ('held', 'sold')", name='chk_holding_status'),
        CheckConstraint("intended_holding_period IN ('short', 'medium', 'long')", name='chk_holding_period'),
        Index('ix_portfolio_user_status', 'user_id', 'status'),
    )

class CorporateFiling(Base):
    __tablename__ = "corporate_filings"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    stock_symbol = Column(String, index=True, nullable=False)
    filing_type = Column(String, index=True, nullable=False)
    filing_date = Column(DateTime(timezone=True), index=True, nullable=False)
    source_url = Column(String, nullable=True)
    chunk_text = Column(Text, nullable=False)
    # sentence-transformers/all-MiniLM-L6-v2 produces 384-dimensional embeddings
    embedding_vector = Column(Vector(384), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String, index=True, nullable=False)
    alert_type = Column(String, nullable=False) # 'universe_wide', 'specific_stock', 'portfolio_only'
    stock_symbol = Column(String, nullable=True) # Only for specific_stock
    score_type = Column(String, nullable=False) # 'overall', 'technical', 'safety', 'sentiment'
    timeframe = Column(String, nullable=False) # 'short', 'medium', 'long'
    threshold_value = Column(Float, nullable=False)
    direction = Column(String, nullable=False) # 'above', 'below'
    status = Column(String, default='active', index=True) # 'active', 'triggered'
    triggered_date = Column(Date, nullable=True)
    triggered_symbol = Column(String, nullable=True) # Record which stock triggered it
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("alert_type IN ('universe_wide', 'specific_stock', 'portfolio_only')", name='chk_alert_type'),
        CheckConstraint("score_type IN ('overall', 'technical', 'safety', 'sentiment')", name='chk_score_type'),
        CheckConstraint("timeframe IN ('short', 'medium', 'long')", name='chk_alert_timeframe'),
        CheckConstraint("direction IN ('above', 'below')", name='chk_direction'),
        CheckConstraint("status IN ('active', 'triggered')", name='chk_status'),
    )

class UserDevice(Base):
    __tablename__ = "user_devices"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True, nullable=False)
    expo_push_token = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

