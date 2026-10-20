from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AirQualityCreate(BaseModel):
    device_id: str
    pm25: float
    pm10: float
    co: float
    co2: float
    temperature: float
    humidity: float
    pressure: float

    class Config:
        from_attributes = True