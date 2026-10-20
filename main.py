from datetime import datetime
import pytz
from sqlalchemy.orm import Session
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base, get_db
from backend import models, schemas
import os

app = FastAPI()

@app.on_event("startup")
def run_migrations():
    try:
        # Automatically create all tables in MySQL if they don't exist yet
        Base.metadata.create_all(bind=engine)
        print("Database tables created/verified successfully.")
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

# Mount frontend directory if it exists
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
def receive_telemetry(payload: dict, db: Session = Depends(get_db)):
    try:
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
            aqi=payload.get("aqi") if payload.get("aqi") is not None else int(calc_aqi),
            aqi_level=payload.get("aqi_level") if payload.get("aqi_level") else calc_level
        )
        db.add(db_reading)
        db.commit()
        db.refresh(db_reading)
        return {"status": "success", "message": "Telemetry saved successfully", "id": db_reading.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/telemetry")
def get_telemetry(db: Session = Depends(get_db)):
    readings = db.query(models.AirQualityReading).order_by(models.AirQualityReading.id.asc()).all()
    
    result = []
    for r in readings:
        pm25_val = getattr(r, "pm25", 0.0) or 0.0
        calc_aqi, calc_level = calculate_aqi_level(pm25_val)
        
        r_aqi = getattr(r, "aqi", None)
        r_aqi_level = getattr(r, "aqi_level", None)
        
        result.append({
            "id": getattr(r, "id", None),
            "device_id": getattr(r, "device_id", "ESP32_SENSOR_01"),
            "pm25": getattr(r, "pm25", None),
            "pm10": getattr(r, "pm10", None),
            "co": getattr(r, "co", None),
            "co2": getattr(r, "co2", None),
            "temperature": getattr(r, "temperature", None),
            "humidity": getattr(r, "humidity", None),
            "pressure": getattr(r, "pressure", None),
            "aqi": r_aqi if r_aqi is not None else int(calc_aqi),
            "aqi_level": r_aqi_level if r_aqi_level else calc_level,
            "created_at": r.created_at.isoformat() if getattr(r, "created_at", None) else None
        })
    return result