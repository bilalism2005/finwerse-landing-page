import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv()

from database import SessionLocal
from models import SymbolMapping, StockIndicatorValue
from services.batch_processor import BatchProcessor

def test_insert():
    db = SessionLocal()
    try:
        # Get one symbol mapping
        mapping = db.query(SymbolMapping).filter(SymbolMapping.stock_symbol == "RELIANCE.NSE").first()
        if not mapping:
            print("RELIANCE.NSE not found in mapping")
            return
            
        print("Running batch processor for RELIANCE.NSE...")
        processor = BatchProcessor(db)
        processor.process_stock(mapping)
        
        # Verify insertion
        count = db.query(StockIndicatorValue).filter(StockIndicatorValue.stock_symbol == "RELIANCE.NSE").count()
        print(f"Total indicator values for RELIANCE.NSE in DB: {count}")
    finally:
        db.close()

if __name__ == "__main__":
    test_insert()
