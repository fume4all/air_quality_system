from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime
import pytz
from .database import Base  # or from backend.database import Base

WAT = pytz.timezone("Africa/Lagos")

class AirQualityReading(Base):
    __tablename__ = "air_quality_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, default="ESP32_SENSOR_01")
    pm25 = Column(Float, nullable=True)
    pm10 = Column(Float, nullable=True)
    co = Column(Float, nullable=True)
    co2 = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    pressure = Column(Float, nullable=True)
    aqi = Column(Integer, nullable=True)
    aqi_level = Column(String, nullable=True)
    date = Column(String, nullable=True)  # <-- Added Date column
    time = Column(String, nullable=True)  # <-- Added Time column
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))