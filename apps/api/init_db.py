from database import engine, Base
import models
from sqlalchemy import text

print("Creating database tables...")
with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
    conn.commit()
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")
