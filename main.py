import pandas as pd
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
# ... your other existing imports ...
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime

# Root-level flat imports
from database import SessionLocal, engine, Base
from models import AirQualityReadings
from schemas import AirQualityCreate
from database import get_db
# Automatically create database tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FUTA IoT-Based Air Quality Data Collection/Monitoring System and Analysis of Air Pollution")

# Serve Frontend Static Files
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
def serve_dashboard():
    return FileResponse("frontend/index.html")

# 1. Latest Telemetry Endpoint (For Dashboard Cards)
@app.get("/telemetry")
def get_latest_telemetry(db: Session = Depends(get_db)):
    latest = db.query(AirQualityReadings).order_by(AirQualityReadings.id.desc()).first()
    if not latest:
        return {"message": "No telemetry data found"}
    return latest

# 2. Telemetry History Endpoint (For Chart.js Trends)
@app.get("/telemetry/history")
def get_telemetry_history(limit: int = 20, db: Session = Depends(get_db)):
    readings = db.query(AirQualityReadings).order_by(AirQualityReadings.id.desc()).limit(limit).all()
    return list(reversed(readings))

# 3. CSV Export Endpoint (Matches Reference Excel Structure & Enforces ESP32_SENSOR_01)
@app.get("/telemetry/export")
@app.get("/export-csv")
def export_csv(db: Session = Depends(get_db)):
    readings = db.query(AirQualityReadings).all()
    if not readings:
        raise HTTPException(status_code=404, detail="No data available for export")
    
    data = []
    for r in readings:
        ts = getattr(r, 'timestamp', None)
        date_str = ts.strftime('%d-%m-%y') if ts else ""
        time_str = ts.strftime('%H:%M:%S') if ts else ""
        
        pm25 = getattr(r, 'pm25', 0) or 0
        aqi = int(pm25 * 1.2) if pm25 else 50
        
        if aqi <= 50:
            aqi_level = "Very Good"
        elif aqi <= 100:
            aqi_level = "Good"
        elif aqi <= 150:
            aqi_level = "Fair"
        elif aqi <= 200:
            aqi_level = "Poor"
        elif aqi <= 300:
            aqi_level = "Very Poor"
        else:
            aqi_level = "Hazardous"

        data.append({
            "id": r.id,
            "device_id": "ESP32_SENSOR_01",
            "pm25": r.pm25,
            "pm10": r.pm10,
            "co": r.co,
            "co2": r.co2,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "pressure": r.pressure,
            "aqi": aqi,
            "aqi_level": aqi_level,
            "date": date_str,
            "time": time_str
        })
        
    df = pd.DataFrame(data)
    
    # Strict column order matching your reference spreadsheet
    column_order = [
        "id", "device_id", "pm25", "pm10", "co", "co2", 
        "temperature", "humidity", "pressure", "aqi", "aqi_level", "date", "time"
    ]
    df = df[[col for col in column_order if col in df.columns]]
    
    csv_data = df.to_csv(index=False)
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=futa_air_quality_dataset.csv"}
    )