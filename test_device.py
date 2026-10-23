from schemas import AirQualityCreate
from pydantic import ValidationError

data = {
    "device_id": "ESP32_SENSOR_01",
    "pm25": 18.5,
    "pm10": 32,
    "co": 0.4,
    "co2": 412.5,
    "temperature": 28.5,
    "humidity": 65,
    "pressure": 1013.2
}

try:
    reading = AirQualityCreate(**data)
    print("SUCCESS: ESP32_SENSOR_01 accepted")
except ValidationError as e:
    print("FAILED: Valid device rejected")
    print(e)