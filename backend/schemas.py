from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AirQualityCreate(BaseModel):
    device_id: str = "ESP32_SENSOR_01"
    pm25: float
    pm10: float
    co: float
    co2: float
    temperature: float
    humidity: float
    pressure: float

class AirQualityResponse(AirQualityCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True