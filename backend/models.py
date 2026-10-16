from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, Integer, Float, String, DateTime
from database import Base

# West Africa Time (WAT = UTC+1)
WAT = timezone(timedelta(hours=1))

class AirQualityReading(Base):
    __tablename__ = "air_quality_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), index=True)
    pm25 = Column(Float)
    pm10 = Column(Float)
    co = Column(Float)
    co2 = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    # Automatically records full Date & Time (e.g., 2026-10-03 13:10:05)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(WAT))