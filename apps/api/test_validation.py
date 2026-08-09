import unittest
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from database import SessionLocal
import models
from services.batch_processor import validate_candle_sanity

class TestSanityValidation(unittest.TestCase):
    def test_valid_candle(self):
        # A perfectly valid candle should not raise any exceptions
        try:
            validate_candle_sanity("TEST", datetime.now(), 100.0, 105.0, 95.0, 102.0, 1000.0)
        except ValueError as e:
            self.fail(f"validate_candle_sanity raised ValueError unexpectedly: {e}")

    def test_negative_prices(self):
        # Negative prices should raise ValueError
        with self.assertRaises(ValueError):
            validate_candle_sanity("TEST", datetime.now(), -10.0, 10.0, 5.0, 8.0, 100.0)
        with self.assertRaises(ValueError):
            validate_candle_sanity("TEST", datetime.now(), 10.0, 10.0, -5.0, 8.0, 100.0)

    def test_high_less_than_low(self):
        # High < Low should raise ValueError
        with self.assertRaises(ValueError):
            validate_candle_sanity("TEST", datetime.now(), 10.0, 8.0, 12.0, 9.0, 100.0)

    def test_high_low_out_of_bounds(self):
        # High less than Close/Open or Low greater than Close/Open should raise ValueError
        with self.assertRaises(ValueError):
            validate_candle_sanity("TEST", datetime.now(), 10.0, 10.0, 5.0, 12.0, 100.0)  # Close > High
        with self.assertRaises(ValueError):
            validate_candle_sanity("TEST", datetime.now(), 10.0, 9.0, 5.0, 8.0, 100.0)   # Open > High

class TestDatabaseConstraints(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.rollback()
        self.db.close()

    def test_database_rejects_negative_price_candle(self):
        # Test that SQL constraint rejects strictly negative prices
        bad_candle = models.StockCandle(
            stock_symbol="TEST_FAIL",
            timeframe="D",
            date=datetime.now(timezone.utc),
            open=-5.0,
            high=10.0,
            low=5.0,
            close=8.0,
            volume=100.0
        )
        self.db.add(bad_candle)
        with self.assertRaises(IntegrityError):
            self.db.commit()

    def test_database_rejects_high_less_than_low_candle(self):
        # Test that SQL constraint rejects high < low
        bad_candle = models.StockCandle(
            stock_symbol="TEST_FAIL",
            timeframe="D",
            date=datetime.now(timezone.utc),
            open=10.0,
            high=5.0,
            low=10.0,
            close=8.0,
            volume=100.0
        )
        self.db.add(bad_candle)
        with self.assertRaises(IntegrityError):
            self.db.commit()

    def test_database_rejects_out_of_bounds_scores(self):
        # Test that SQL constraint rejects scores outside [-100, 100]
        bad_score = models.StockScore(
            stock_symbol="TEST_FAIL",
            technical_score_short=150.0,  # Invalid (>100)
            safety_score_short=50.0,
            overall_score_short=50.0
        )
        self.db.add(bad_score)
        with self.assertRaises(IntegrityError):
            self.db.commit()

if __name__ == "__main__":
    unittest.main()
