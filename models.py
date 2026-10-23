from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class AirQualityReadings(Base):
    __tablename__ = "air_quality_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(String(50), index=True, nullable=False)
    pm25 = Column(Float, nullable=False)
    pm10 = Column(Float, nullable=False)
    co = Column(Float, nullable=False)
    co2 = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)