from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
import math
from datetime import timedelta
import models
from database import get_db
import auth

router = APIRouter(prefix="/analyzer", tags=["analyzer"])

def get_historical_score(db: Session, symbol: str, date_val, timeframe: str):
    # Find the nearest historical score to the given date (within a few days)
    # Since scores are computed daily, exact match or closest previous is fine.
    score_record = db.query(models.StockHistoricalScore).filter(
        models.StockHistoricalScore.stock_symbol == symbol,
        models.StockHistoricalScore.date <= date_val
    ).order_by(desc(models.StockHistoricalScore.date)).first()
    
    if not score_record:
        return None
        
    if timeframe == 'short':
        return score_record.technical_score_short
    elif timeframe == 'medium':
        return score_record.technical_score_medium
    else:
        return score_record.technical_score_long

def get_nearest_right_date(db: Session, symbol: str, actual_date, timeframe: str, is_buy: bool):
    """
    Search unbounded history for the nearest date the score was right.
    Right buy: >= 80
    Right sell: <= -80
    """
    records = db.query(models.StockHistoricalScore).filter(
        models.StockHistoricalScore.stock_symbol == symbol
    ).all()
    
    best_record = None
    min_diff = float('inf')
    
    for r in records:
        if timeframe == 'short':
            score = r.technical_score_short
        elif timeframe == 'medium':
            score = r.technical_score_medium
        else:
            score = r.technical_score_long
            
        if score is None:
            continue
            
        is_right = (score >= 80) if is_buy else (score <= -80)
        if is_right:
            # We must handle both datetime and date types
            r_date = r.date.date() if hasattr(r.date, 'date') else r.date
            a_date = actual_date.date() if hasattr(actual_date, 'date') else actual_date
            diff = abs((r_date - a_date).days)
            if diff < min_diff:
                min_diff = diff
                best_record = r
                
    if best_record:
        return best_record.date
    return None

def get_price_on_date(db: Session, symbol: str, target_date):
    # Find the daily candle close price on or closest prior to target_date
    candle = db.query(models.StockCandle).filter(
        models.StockCandle.stock_symbol == symbol,
        models.StockCandle.timeframe == 'D',
        models.StockCandle.date <= target_date
    ).order_by(desc(models.StockCandle.date)).first()
    
    if candle:
        return candle.close
    return None

@router.get("/impulse")
def analyze_impulse(
    current_user_id: str = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Get all losing sold trades
    sold_trades = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.user_id == current_user_id,
        models.PortfolioHolding.status == 'sold'
    ).all()
    
    losing_trades = [t for t in sold_trades if (t.sold_price - t.avg_price) < 0]
    
    impulse_trades = []
    total_cost_this_month = 0.0
    
    # We define "this month" based on the sold_date
    # For now, we'll just sum all impulse costs.
    # In a real system, we might filter by the current calendar month.
    
    for trade in losing_trades:
        buy_score = get_historical_score(db, trade.stock_symbol, trade.purchase_date, trade.intended_holding_period)
        sell_score = get_historical_score(db, trade.stock_symbol, trade.sold_date, trade.intended_holding_period)
        
        # If we lack historical data, skip
        if buy_score is None or sell_score is None:
            continue
            
        is_buy_right = buy_score >= 80
        is_sell_right = sell_score <= -80
        
        # Combination 1: Both right -> Not Impulse
        if is_buy_right and is_sell_right:
            continue
            
        # We have an impulse candidate. Search for counterfactuals.
        cf_buy_date = trade.purchase_date
        cf_buy_price = trade.avg_price
        
        cf_sell_date = trade.sold_date
        cf_sell_price = trade.sold_price
        
        if not is_buy_right:
            nearest_buy_date = get_nearest_right_date(db, trade.stock_symbol, trade.purchase_date, trade.intended_holding_period, True)
            if nearest_buy_date:
                nearest_price = get_price_on_date(db, trade.stock_symbol, nearest_buy_date)
                if nearest_price:
                    cf_buy_date = nearest_buy_date
                    cf_buy_price = nearest_price
                    
        if not is_sell_right:
            nearest_sell_date = get_nearest_right_date(db, trade.stock_symbol, trade.sold_date, trade.intended_holding_period, False)
            if nearest_sell_date:
                nearest_price = get_price_on_date(db, trade.stock_symbol, nearest_sell_date)
                if nearest_price:
                    cf_sell_date = nearest_sell_date
                    cf_sell_price = nearest_price
                    
        # Compare outcomes
        actual_profit = (trade.sold_price - trade.avg_price) * trade.quantity
        cf_profit = (cf_sell_price - cf_buy_price) * trade.quantity
        
        # If counterfactual is better (larger profit or smaller loss)
        if cf_profit > actual_profit:
            rupee_diff = cf_profit - actual_profit
            total_cost_this_month += rupee_diff
            
            impulse_trades.append({
                "id": str(trade.id),
                "stock_symbol": trade.stock_symbol,
                "quantity": trade.quantity,
                "actual": {
                    "buy_date": trade.purchase_date,
                    "buy_price": trade.avg_price,
                    "sell_date": trade.sold_date,
                    "sell_price": trade.sold_price,
                    "profit": actual_profit
                },
                "counterfactual": {
                    "buy_date": cf_buy_date,
                    "buy_price": cf_buy_price,
                    "sell_date": cf_sell_date,
                    "sell_price": cf_sell_price,
                    "profit": cf_profit
                },
                "rupee_cost": rupee_diff
            })
            
    # Sort by largest rupee cost first
    impulse_trades.sort(key=lambda x: x["rupee_cost"], reverse=True)
            
    return {
        "total_cost": total_cost_this_month,
        "trades": impulse_trades
    }
