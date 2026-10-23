import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Uses Render's cloud DATABASE_URL if available, otherwise falls back to your local MySQL
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:Family4all%40za@localhost:3306/air_quality_db",
)

# Configure SSL for Aiven cloud database connections
connect_args = {}
if "aivencloud.com" in SQLALCHEMY_DATABASE_URL:
  connect_args = {"ssl": {}}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()