from typing import List, Optional
import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, text
import math
from datetime import timedelta
import models
from database import get_db
import auth
from services.tools import resolve_symbol

router = APIRouter(prefix="/analyzer", tags=["analyzer"])

class CustomTradeItem(BaseModel):
    stock_symbol: str
    buy_price: float
    buy_date: datetime.date
    sell_price: float
    sell_date: datetime.date
    quantity: int
    intended_holding_period: Optional[str] = "short"

class CustomImpulseRequest(BaseModel):
    trades: List[CustomTradeItem]

def get_historical_score(db: Session, symbol: str, date_val, timeframe: str):
    score_record = db.query(models.StockHistoricalScore).filter(
        models.StockHistoricalScore.stock_symbol == symbol,
        models.StockHistoricalScore.date <= date_val
    ).order_by(desc(models.StockHistoricalScore.date)).first()
    
    if not score_record:
        # Fallback to current score if historical not found
        current_score = db.query(models.StockScore).filter(
            models.StockScore.stock_symbol == symbol
        ).first()
        if current_score:
            if timeframe == 'short':
                return current_score.technical_score_short
            elif timeframe == 'medium':
                return current_score.technical_score_medium
            else:
                return current_score.technical_score_long
        return 0
        
    if timeframe == 'short':
        return score_record.technical_score_short
    elif timeframe == 'medium':
        return score_record.technical_score_medium
    else:
        return score_record.technical_score_long

def get_nearest_right_date(db: Session, symbol: str, actual_date, timeframe: str, is_buy: bool):
    col_name = f"technical_score_{timeframe}"
    condition = ">= 60" if is_buy else "<= 40"
    
    query = text(f"""
        SELECT date FROM stock_historical_scores
        WHERE stock_symbol = :symbol 
        AND {col_name} {condition}
        AND {col_name} IS NOT NULL
        ORDER BY ABS(EXTRACT(EPOCH FROM (date - :actual_date))) ASC
        LIMIT 1
    """)
    
    result = db.execute(query, {"symbol": symbol, "actual_date": actual_date}).first()
    if result:
        return result.date
    return None

def get_price_on_date(db: Session, symbol: str, target_date):
    candle = db.query(models.StockCandle).filter(
        models.StockCandle.stock_symbol == symbol,
        models.StockCandle.timeframe == 'D',
        models.StockCandle.date <= target_date
    ).order_by(desc(models.StockCandle.date)).first()
    
    if candle:
        return candle.close
    return None

def evaluate_single_trade(db: Session, trade_id: str, symbol: str, buy_price: float, buy_date: datetime.date, sell_price: float, sell_date: datetime.date, quantity: int, timeframe: str):
    canonical_sym = resolve_symbol(db, symbol)
    tf = timeframe.lower() if timeframe else "short"
    if tf not in ["short", "medium", "long"]:
        tf = "short"

    actual_profit = (sell_price - buy_price) * quantity
    capital_deployed = buy_price * quantity
    if capital_deployed <= 0:
        return None

    buy_score = get_historical_score(db, canonical_sym, buy_date, tf)
    sell_score = get_historical_score(db, canonical_sym, sell_date, tf)

    buy_score_val = buy_score if buy_score is not None else 50
    sell_score_val = sell_score if sell_score is not None else 50

    is_buy_right = buy_score_val >= 60
    is_sell_right = sell_score_val <= 40

    cf_buy_date = buy_date
    cf_buy_price = buy_price
    cf_sell_date = sell_date
    cf_sell_price = sell_price

    if not is_buy_right:
        nearest_buy = get_nearest_right_date(db, canonical_sym, buy_date, tf, True)
        if nearest_buy:
            p = get_price_on_date(db, canonical_sym, nearest_buy)
            if p and p > 0:
                cf_buy_date = nearest_buy
                cf_buy_price = p

    if not is_sell_right:
        nearest_sell = get_nearest_right_date(db, canonical_sym, sell_date, tf, False)
        if nearest_sell:
            p = get_price_on_date(db, canonical_sym, nearest_sell)
            if p and p > 0:
                cf_sell_date = nearest_sell
                cf_sell_price = p

    # Counterfactual with same capital deployed
    cf_quantity = capital_deployed / cf_buy_price if cf_buy_price > 0 else quantity
    cf_profit = (cf_sell_price - cf_buy_price) * cf_quantity

    rupee_diff = cf_profit - actual_profit
    # Treat as impulse if counterfactual was materially better or actual was a losing trade against data
    is_impulse = rupee_diff > 0

    return {
        "id": trade_id,
        "stock_symbol": canonical_sym,
        "quantity": quantity,
        "is_impulse": is_impulse,
        "actual": {
            "buy_date": str(buy_date),
            "buy_price": buy_price,
            "sell_date": str(sell_date),
            "sell_price": sell_price,
            "profit": actual_profit
        },
        "counterfactual": {
            "buy_date": str(cf_buy_date),
            "buy_price": round(cf_buy_price, 2),
            "sell_date": str(cf_sell_date),
            "sell_price": round(cf_sell_price, 2),
            "profit": round(cf_profit, 2)
        },
        "rupee_cost": round(max(0.0, rupee_diff), 2)
    }

@router.get("/impulse")
def analyze_impulse(
    current_user_id: str = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    sold_trades = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.user_id == current_user_id,
        models.PortfolioHolding.status == 'sold'
    ).all()
    
    impulse_trades = []
    total_cost = 0.0
    
    for t in sold_trades:
        evaluated = evaluate_single_trade(
            db, str(t.id), t.stock_symbol, t.avg_price, t.purchase_date,
            t.sold_price, t.sold_date, t.sold_quantity or t.quantity,
            t.intended_holding_period
        )
        if evaluated and evaluated["is_impulse"]:
            impulse_trades.append(evaluated)
            total_cost += evaluated["rupee_cost"]

    impulse_trades.sort(key=lambda x: x["rupee_cost"], reverse=True)
    return {
        "total_cost": round(total_cost, 2),
        "trades": impulse_trades
    }

@router.post("/custom-impulse")
def analyze_custom_impulse(
    request: CustomImpulseRequest,
    db: Session = Depends(get_db)
):
    """
    Analyzes user-submitted custom trades against historical technical indicators
    and calculates counterfactual timing and avoidable impulse cost.
    """
    impulse_trades = []
    total_cost = 0.0

    for idx, t in enumerate(request.trades):
        trade_id = f"custom-{idx+1}"
        evaluated = evaluate_single_trade(
            db, trade_id, t.stock_symbol, t.buy_price, t.buy_date,
            t.sell_price, t.sell_date, t.quantity, t.intended_holding_period or "short"
        )
        if evaluated:
            impulse_trades.append(evaluated)
            if evaluated["is_impulse"]:
                total_cost += evaluated["rupee_cost"]

    impulse_trades.sort(key=lambda x: x["rupee_cost"], reverse=True)
    return {
        "total_cost": round(total_cost, 2),
        "trades": impulse_trades
    }
