import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
import uuid

from database import get_db
import models
from auth import get_current_user

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

# Pydantic Schemas
class PortfolioHoldingBase(BaseModel):
    stock_symbol: str
    quantity: int
    avg_price: float
    purchase_date: datetime.date
    intended_holding_period: str

class PortfolioHoldingCreate(PortfolioHoldingBase):
    pass

class PortfolioHoldingUpdate(BaseModel):
    quantity: Optional[int] = None
    avg_price: Optional[float] = None
    purchase_date: Optional[datetime.date] = None
    intended_holding_period: Optional[str] = None

class PortfolioHoldingSell(BaseModel):
    sold_quantity: int
    sold_price: float
    sold_date: datetime.date

class PortfolioHoldingResponse(PortfolioHoldingBase):
    id: uuid.UUID
    user_id: str
    status: str
    sold_quantity: Optional[int] = None
    sold_date: Optional[datetime.date] = None
    sold_price: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)

@router.post("/holdings", response_model=PortfolioHoldingResponse, status_code=status.HTTP_201_CREATED)
def create_holding(
    holding: PortfolioHoldingCreate, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    # Verify stock symbol exists in mapping (fuzzy search resolved on frontend, but validate here)
    mapping = db.query(models.SymbolMapping).filter(models.SymbolMapping.stock_symbol == holding.stock_symbol).first()
    if not mapping:
        raise HTTPException(status_code=400, detail="Invalid stock symbol")
        
    db_holding = models.PortfolioHolding(
        **holding.model_dump(),
        user_id=user_id,
        status="held"
    )
    db.add(db_holding)
    db.commit()
    db.refresh(db_holding)
    return db_holding

@router.get("/holdings", response_model=List[PortfolioHoldingResponse])
def get_holdings(
    status_filter: Optional[str] = Query(None, description="Filter by status (held or sold)"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    query = db.query(models.PortfolioHolding).filter(models.PortfolioHolding.user_id == user_id)
    if status_filter:
        query = query.filter(models.PortfolioHolding.status == status_filter)
    
    return query.order_by(models.PortfolioHolding.created_at.desc()).all()

@router.patch("/holdings/{holding_id}", response_model=PortfolioHoldingResponse)
def update_holding(
    holding_id: uuid.UUID,
    holding_update: PortfolioHoldingUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    db_holding = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.id == holding_id,
        models.PortfolioHolding.user_id == user_id
    ).first()
    
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    update_data = holding_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_holding, key, value)
        
    db.commit()
    db.refresh(db_holding)
    return db_holding

@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holding(
    holding_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    db_holding = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.id == holding_id,
        models.PortfolioHolding.user_id == user_id
    ).first()
    
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    db.delete(db_holding)
    db.commit()
    return None

@router.post("/holdings/{holding_id}/sell", response_model=List[PortfolioHoldingResponse])
def sell_holding(
    holding_id: uuid.UUID,
    sell_data: PortfolioHoldingSell,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    db_holding = db.query(models.PortfolioHolding).filter(
        models.PortfolioHolding.id == holding_id,
        models.PortfolioHolding.user_id == user_id,
        models.PortfolioHolding.status == "held"
    ).first()
    
    if not db_holding:
        raise HTTPException(status_code=404, detail="Held position not found")
        
    if sell_data.sold_quantity > db_holding.quantity:
        raise HTTPException(status_code=400, detail="Cannot sell more than held quantity")
        
    if sell_data.sold_quantity == db_holding.quantity:
        # Full sell
        db_holding.status = "sold"
        db_holding.sold_quantity = sell_data.sold_quantity
        db_holding.sold_price = sell_data.sold_price
        db_holding.sold_date = sell_data.sold_date
        db.commit()
        db.refresh(db_holding)
        return [db_holding]
    else:
        # Partial sell: close original row and create two new ones
        row_a = models.PortfolioHolding(
            user_id=user_id,
            stock_symbol=db_holding.stock_symbol,
            quantity=sell_data.sold_quantity,
            avg_price=db_holding.avg_price,
            purchase_date=db_holding.purchase_date,
            intended_holding_period=db_holding.intended_holding_period,
            status="sold",
            sold_quantity=sell_data.sold_quantity,
            sold_price=sell_data.sold_price,
            sold_date=sell_data.sold_date
        )
        
        row_b = models.PortfolioHolding(
            user_id=user_id,
            stock_symbol=db_holding.stock_symbol,
            quantity=db_holding.quantity - sell_data.sold_quantity,
            avg_price=db_holding.avg_price,
            purchase_date=db_holding.purchase_date,
            intended_holding_period=db_holding.intended_holding_period,
            status="held"
        )
        
        db.delete(db_holding)
        db.add(row_a)
        db.add(row_b)
        db.commit()
        
        db.refresh(row_a)
        db.refresh(row_b)
        return [row_a, row_b]
