from pydantic import BaseModel, Field
from typing import Literal

class AirQualityCreate(BaseModel):
    device_id: Literal["ESP32_SENSOR_01"] = Field(
        description="Authorized ESP32 device ID"
    )

    pm25: float
    pm10: float
    co: float
    co2: float
    temperature: float
    humidity: float
    pressure: float

    class Config:
        from_attributes = True