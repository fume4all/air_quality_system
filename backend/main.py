from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime
import pytz
from .database import Base

WAT = pytz.timezone("Africa/Lagos")

class AirQualityReading(Base):
    __tablename__ = "air_quality_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), default="ESP32_SENSOR_01", nullable=True)
    pm25 = Column(Float, nullable=True)
    pm10 = Column(Float, nullable=True)
    co = Column(Float, nullable=True)
    co2 = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    pressure = Column(Float, nullable=True)
    aqi = Column(Integer, nullable=True)
    aqi_level = Column(String(50), nullable=True)
    date = Column(String(50), nullable=True)
    time = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)