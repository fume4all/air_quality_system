
from pydantic import BaseModel, ConfigDict
from typing import Optional


class TelemetryCreate(BaseModel):
    device_id: str = "ESP32_SENSOR_01"

    pm25: Optional[float] = None
    pm10: Optional[float] = None
    co: Optional[float] = None
    co2: Optional[float] = None

    temperature: Optional[float] = None
    humidity: Optional[float] = None
    pressure: Optional[float] = None

    aqi: Optional[int] = None
    aqi_level: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "device_id": "ESP32_SENSOR_01",
                "pm25": 18.5,
                "pm10": 32.4,
                "co": 1.2,
                "co2": 450,
                "temperature": 29.5,
                "humidity": 72.0,
                "pressure": 1012.8
            }
        }
    )
