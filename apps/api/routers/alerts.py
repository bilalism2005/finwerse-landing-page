from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from datetime import date, timedelta
import uuid
import models
from database import get_db
import auth

router = APIRouter(prefix="", tags=["alerts"])

class AlertCreate(BaseModel):
    alert_type: str = Field(..., description="'universe_wide', 'specific_stock', 'portfolio_only'")
    stock_symbol: str = None
    score_type: str = Field(..., description="'overall', 'technical', 'safety', 'sentiment'")
    timeframe: str = Field(..., description="'short', 'medium', 'long'")
    threshold_value: float
    direction: str = Field(..., description="'above', 'below'")

class PushTokenCreate(BaseModel):
    expo_push_token: str

@router.post("/alerts")
def create_alert(
    alert_data: AlertCreate,
    current_user_id: str = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Validate type and symbol
    if alert_data.alert_type == 'specific_stock' and not alert_data.stock_symbol:
        raise HTTPException(status_code=400, detail="stock_symbol is required for specific_stock alerts")
    
    if alert_data.alert_type != 'specific_stock' and alert_data.stock_symbol:
        alert_data.stock_symbol = None
        
    if alert_data.stock_symbol:
        alert_data.stock_symbol = alert_data.stock_symbol.upper()
        
    db_alert = models.Alert(
        user_id=current_user_id,
        alert_type=alert_data.alert_type,
        stock_symbol=alert_data.stock_symbol,
        score_type=alert_data.score_type,
        timeframe=alert_data.timeframe,
        threshold_value=alert_data.threshold_value,
        direction=alert_data.direction,
        status='active'
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

@router.get("/alerts")
def get_alerts(
    current_user_id: str = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns active alerts AND triggered alerts from the last 5 days.
    """
    five_days_ago = date.today() - timedelta(days=5)
    
    alerts = db.query(models.Alert).filter(
        models.Alert.user_id == current_user_id,
        or_(
            models.Alert.status == 'active',
            and_(
                models.Alert.status == 'triggered',
                models.Alert.triggered_date >= five_days_ago
            )
        )
    ).order_by(
        models.Alert.status.asc(), # 'active' comes before 'triggered'
        desc(models.Alert.created_at)
    ).all()
    
    return alerts

@router.delete("/alerts/{alert_id}")
def delete_alert(
    alert_id: uuid.UUID,
    current_user_id: str = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id,
        models.Alert.user_id == current_user_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully"}

@router.post("/users/push-token")
def register_push_token(
    token_data: PushTokenCreate,
    current_user_id: str = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user already has this token registered
    existing = db.query(models.UserDevice).filter(
        models.UserDevice.user_id == current_user_id,
        models.UserDevice.expo_push_token == token_data.expo_push_token
    ).first()
    
    if existing:
        return {"message": "Token already registered"}
        
    new_device = models.UserDevice(
        user_id=current_user_id,
        expo_push_token=token_data.expo_push_token
    )
    db.add(new_device)
    db.commit()
    return {"message": "Token registered successfully"}
