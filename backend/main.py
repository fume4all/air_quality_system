from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

app = FastAPI(title="FUTA Air Quality Monitoring API")

# --- ENABLE CORS (Crucial for frontend connectivity) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all domains/origins to connect
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],
)

# Pydantic schema so Swagger UI shows all sensor fields correctly
class AirQualityCreate(BaseModel):
    device_id: str
    pm25: float
    pm10: float
    co: float
    co2: float
    temperature: float
    humidity: float
    pressure: float

@app.get("/")
def read_root():
    return {"status": "Online", "project": "IoT Air Quality Monitoring System"}

# POST endpoint for hardware & Swagger UI
@app.post("/telemetry")
def receive_telemetry(payload: AirQualityCreate):
    # Add your database saving logic here (e.g., db.add, db.commit)
    return {
        "status": "success", 
        "message": "Telemetry received successfully",
        "received_data": payload
    }

# GET endpoint for the dashboard to fetch latest data
@app.get("/telemetry/latest")
def get_latest_telemetry():
    return {
        "device_id": "ESP32_SENSOR_01",
        "pm25": 45.5,
        "pm10": 56.0,
        "co": 0.4,
        "co2": 412.5,
        "temperature": 28.5,
        "humidity": 65.0,
        "pressure": 1013.2,
        "aqi": 64,
        "aqi_level": "Fair",
        "date": "18-10-26",
        "time": "23:36:50"
    }