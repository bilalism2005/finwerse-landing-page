from database import SessionLocal
import models

db = SessionLocal()
scores = db.query(models.StockScore).all()

for s in scores:
    print(f"\n{'='*50}")
    print(f"Symbol: {s.stock_symbol}")
    print(f"  Technical  - Short: {s.technical_score_short:.2f} | Medium: {s.technical_score_medium:.2f} | Long: {s.technical_score_long:.2f}")
    print(f"  Safety     - Short: {s.safety_score_short:.2f} | Medium: {s.safety_score_medium:.2f} | Long: {s.safety_score_long:.2f}")
    print(f"  Sentiment  - Short: {s.sentiment_score_short} | Medium: {s.sentiment_score_medium} | Long: {s.sentiment_score_long}")
    print(f"  Overall    - Short: {s.overall_score_short:.2f} | Medium: {s.overall_score_medium:.2f} | Long: {s.overall_score_long:.2f}")

db.close()
