from pydantic import BaseModel, Field
from typing import Literal

class AirQualityCreate(BaseModel):
    device_id: Literal["ESP32_SENSOR_01"] = Field(
        description="Authorized ESP32 device ID"
    )

    pm25: float = Field(ge=0, le=10000)
    pm10: float = Field(ge=0, le=10000)
    co: float = Field(ge=0, le=10000)
    co2: float = Field(ge=0, le=100000)
    temperature: float = Field(ge=-100, le=100)
    humidity: float = Field(ge=0, le=100)
    pressure: float = Field(ge=0, le=2000)

    class Config:
        from_attributes = True