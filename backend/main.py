from datetime import datetime
import pytz
from sqlalchemy.orm import Session
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db
from . import models, schemas

app = FastAPI()
from sqlalchemy import text

@app.on_event("startup")
def run_migrations():
    try:
        from backend.database import SessionLocal
        db = SessionLocal()
        db.execute(text("ALTER TABLE air_quality_readings ADD COLUMN IF NOT EXISTS aqi INTEGER;"))
        db.execute(text("ALTER TABLE air_quality_readings ADD COLUMN IF NOT EXISTS aqi_level VARCHAR;"))
        db.execute(text("ALTER TABLE air_quality_readings ADD COLUMN IF NOT EXISTS date VARCHAR;"))
        db.execute(text("ALTER TABLE air_quality_readings ADD COLUMN IF NOT EXISTS time VARCHAR;"))
        db.commit()
        db.close()
    except Exception as e:
        print("Migration check note:", e)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WAT = pytz.timezone("Africa/Lagos")
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# The Mount frontend directory
if os.path.exists("frontend"):
    app.mount("/static", StaticFiles(directory="frontend"), name="static")

    @app.get("/")
    def serve_dashboard():
        return FileResponse(os.path.join("frontend", "index.html"))

def calculate_aqi_level(pm25: float):
    if pm25 is None:
        return 50, "Good"
    if pm25 <= 12.0:
        aqi = (50 / 12.0) * pm25
        level = "Good"
    elif pm25 <= 35.4:
        aqi = 50 + ((100 - 50) / (35.4 - 12.1)) * (pm25 - 12.1)
        level = "Fair"
    elif pm25 <= 55.4:
        aqi = 101 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5)
        level = "Poor"
    elif pm25 <= 150.4:
        aqi = 151 + ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5)
        level = "Very Poor"
    else:
        aqi = 300
        level = "Hazardous"
    return int(round(aqi)), level

@app.post("/telemetry")
def receive_telemetry(data: schemas.AirQualityCreate, db: Session = Depends(get_db)):
    """
    Receive validated sensor telemetry from ESP32 or Swagger UI and store in MySQL.
    """
    try:
        # Convert Pydantic model to dictionary
        payload = data.dict()
        
        pm25_val = float(payload.get("pm25", 0.0) or 0.0)
        calc_aqi, calc_level = calculate_aqi_level(pm25_val)
        
        db_reading = models.AirQualityReading(
            device_id=payload.get("device_id", "ESP32_SENSOR_01"),
            pm25=payload.get("pm25"),
            pm10=payload.get("pm10"),
            co=payload.get("co"),
            co2=payload.get("co2"),
            temperature=payload.get("temperature"),
            humidity=payload.get("humidity"),
            pressure=payload.get("pressure"),
            aqi=int(calc_aqi),
            aqi_level=calc_level
        )
        db.add(db_reading)
        db.commit()
        db.refresh(db_reading)
        
        return {
            "status": "success",
            "message": "Telemetry saved successfully",
            "id": db_reading.id,
            "calculated_aqi": calc_aqi,
            "aqi_level": calc_level
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/telemetry")
def receive_telemetry(data: schemas.AirQualityCreate, db: Session = Depends(get_db)):
    """
    Receive validated sensor telemetry from ESP32 or Swagger UI and store in MySQL.
    """
    try:
        # Convert Pydantic model to dictionary
        payload = data.dict()
        
        pm25_val = float(payload.get("pm25", 0.0) or 0.0)
        calc_aqi, calc_level = calculate_aqi_level(pm25_val)
        
        db_reading = models.AirQualityReading(
            device_id=payload.get("device_id", "ESP32_SENSOR_01"),
            pm25=payload.get("pm25"),
            pm10=payload.get("pm10"),
            co=payload.get("co"),
            co2=payload.get("co2"),
            temperature=payload.get("temperature"),
            humidity=payload.get("humidity"),
            pressure=payload.get("pressure"),
            aqi=int(calc_aqi),
            aqi_level=calc_level
        )
        db.add(db_reading)
        db.commit()
        db.refresh(db_reading)
        
        return {
            "status": "success",
            "message": "Telemetry saved successfully",
            "id": db_reading.id,
            "calculated_aqi": calc_aqi,
            "aqi_level": calc_level
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))