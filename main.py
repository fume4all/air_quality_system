from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="FUTA Air Quality Monitoring API")

# 1. Define the Pydantic Schema
class AirQualityCreate(BaseModel):
    device_id: str
    pm25: float
    pm10: float
    co: float
    co2: float
    temperature: float
    humidity: float
    pressure: float

# 2. Ensure the POST route uses the schema (NOT dict)
@app.post("/telemetry")
def receive_telemetry(payload: AirQualityCreate):
    return {
        "status": "success", 
        "message": "Telemetry received successfully",
        "received_data": payload
    }