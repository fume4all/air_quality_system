from datetime import datetime
import pytz
from sqlalchemy.orm import Session
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db
from . import models, schemas

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WAT = pytz.timezone("Africa/Lagos")

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
    clean_device_id = data.device_id
    if not clean_device_id or clean_device_id.strip().lower() == "string":
        clean_device_id = "ESP32_SENSOR_01"
    
    now_wat = datetime.now(WAT)
    
    pm25_val = data.pm25 if data.pm25 is not None else 0.0
    aqi_val, aqi_level = calculate_aqi_level(pm25_val)

    reading = models.AirQualityReading(
        device_id=clean_device_id,
        pm25=data.pm25,
        pm10=data.pm10,
        co=data.co,
        co2=data.co2,
        temperature=data.temperature,
        humidity=data.humidity,
        pressure=data.pressure,
        aqi=int(aqi_val),
        aqi_level=aqi_level,
        created_at=now_wat
    )
    
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading

@app.get("/telemetry")
def get_telemetry(db: Session = Depends(get_db)):
    readings = db.query(models.AirQualityReading).order_by(models.AirQualityReading.id.asc()).all()
    
    result = []
    for r in readings:
        pm25_val = getattr(r, "pm25", 0.0) or 0.0
        calc_aqi, calc_level = calculate_aqi_level(pm25_val)
        
        result.append({
            "id": r.id,
            "device_id": r.device_id,
            "pm25": r.pm25,
            "pm10": r.pm10,
            "co": r.co,
            "co2": r.co2,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "pressure": r.pressure,
            "aqi": r.aqi if r.aqi is not None else int(calc_aqi),
            "aqi_level": r.aqi_level if r.aqi_level else calc_level,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return result