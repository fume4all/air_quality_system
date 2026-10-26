from datetime import datetime, timezone, timedelta
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
from models import AirQualityReadings
from schemas import AirQualityCreate

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=(
        "FUTA IoT-Based Air Quality Data Collection/Monitoring System and"
        " Analysis of Air Pollution"
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend"), name="static")

ALLOWED_DEVICE_ID = "ESP32_SENSOR_01"

# Define West Africa Time (WAT = UTC + 1)
WAT = timezone(timedelta(hours=1))

def get_current_wat_time():
    return datetime.now(WAT)


@app.get("/")
def serve_dashboard():
    return FileResponse("frontend/index.html")


@app.get("/telemetry")
def get_latest_telemetry(db: Session = Depends(get_db)):
    latest = (
        db.query(AirQualityReadings)
        .filter(AirQualityReadings.device_id == ALLOWED_DEVICE_ID)
        .order_by(AirQualityReadings.id.desc())
        .first()
    )

    if not latest:
        return {"message": "No telemetry data found"}

    return latest


@app.get("/telemetry/history")
def get_telemetry_history(limit: int = 20, db: Session = Depends(get_db)):
    readings = (
        db.query(AirQualityReadings)
        .filter(AirQualityReadings.device_id == ALLOWED_DEVICE_ID)
        .all()
    )
    return list(reversed(readings))


# --- Bridge Endpoints matching frontend script.js ---


def calculate_aqi_from_pm25(pm25: float) -> int:
    """Calculates standard EPA-based AQI from PM2.5 concentration"""
    if pm25 is None:
        return 0
    breakpoints = [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 500.4, 301, 500),
    ]
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= pm25 <= c_high:
            return round(
                ((i_high - i_low) / (c_high - c_low)) * (pm25 - c_low) + i_low
            )
    return 500 if pm25 > 500.4 else int(pm25 * 1.2)


@app.get("/api/latest-sensor-data")
def get_api_latest_telemetry(db: Session = Depends(get_db)):
    latest = (
        db.query(AirQualityReadings)
        .order_by(AirQualityReadings.id.desc())
        .first()
    )
    if not latest:
        return {
            "device_id": ALLOWED_DEVICE_ID,
            "pm25": 0,
            "pm10": 0,
            "co": 0,
            "co2": 0,
            "temperature": 0,
            "humidity": 0,
            "pressure": 0,
            "aqi_status": "Waiting for Data",
            "calculated_aqi": 0,
            "timestamp": "No Data Yet",
        }

    ts = getattr(latest, "created_at", None)
    if ts:
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc).astimezone(WAT)
        time_str = ts.strftime("%Y-%m-%d %H:%M:%S")
    else:
        time_str = ""
    
    pm25 = getattr(latest, "pm25", 0) or 0
    calculated_aqi = calculate_aqi_from_pm25(pm25)

    if calculated_aqi <= 50:
        aqi_level = "Very Good"
    elif calculated_aqi <= 100:
        aqi_level = "Good"
    elif calculated_aqi <= 150:
        aqi_level = "Fair"
    elif calculated_aqi <= 200:
        aqi_level = "Poor"
    elif calculated_aqi <= 300:
        aqi_level = "Very Poor"
    else:
        aqi_level = "Hazardous"

    return {
        "device_id": latest.device_id,
        "pm25": latest.pm25,
        "pm10": latest.pm10,
        "co": latest.co,
        "co2": latest.co2,
        "temperature": latest.temperature,
        "humidity": latest.humidity,
        "pressure": latest.pressure,
        "aqi_status": aqi_level,
        "calculated_aqi": calculated_aqi,
        "timestamp": time_str,
    }


@app.get("/api/hourly-forecast")
def get_hourly_forecast(db: Session = Depends(get_db)):
    readings = (
        db.query(AirQualityReadings)
        .order_by(AirQualityReadings.id.desc())
        .limit(5)
        .all()
    )
    forecast = []
    for r in reversed(readings):
        pm25 = getattr(r, "pm25", 0) or 0
        aqi = int(pm25 * 1.2)
        ts = getattr(r, "created_at", None)
        if ts:
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc).astimezone(WAT)
            time_str = ts.strftime("%H:%M")
        else:
            time_str = "Now"
        forecast.append({
            "time": time_str,
            "aqi": aqi,
            "temperature": getattr(r, "temperature", 0) or 0,
        })
    return forecast


@app.get("/api/historical-trends")
def get_api_historical_trends(db: Session = Depends(get_db)):
    readings = (
        db.query(AirQualityReadings)
        .order_by(AirQualityReadings.id.asc())
        .limit(50)
        .all()
    )
    result = []
    for r in readings:
        ts = getattr(r, "created_at", None)
        if ts:
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc).astimezone(WAT)
            time_str = ts.strftime("%H:%M:%S")
        else:
            time_str = ""
        result.append({
            "timestamp": time_str,
            "pm25": r.pm25,
            "pm10": r.pm10,
            "co": r.co,
            "co2": r.co2,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "pressure": r.pressure,
        })
    return result


# --- Telemetry Ingestion ---


@app.post("/telemetry")
def receive_telemetry(payload: AirQualityCreate, db: Session = Depends(get_db)):
    if payload.device_id != ALLOWED_DEVICE_ID:
        raise HTTPException(
            status_code=400, detail="Only ESP32_SENSOR_01 is allowed"
        )

    db_item = AirQualityReadings(**payload.model_dump(), created_at=get_current_wat_time())

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return {
        "status": "success",
        "message": "Telemetry received and saved successfully",
        "data": db_item,
    }


@app.post("/api/sensor-data")
def receive_sensor_data_alias(payload: AirQualityCreate, db: Session = Depends(get_db)):
    return receive_telemetry(payload, db)


# --- CSV Export ---


@app.get("/telemetry/export")
@app.get("/export-csv")
def export_csv(db: Session = Depends(get_db)):
    readings = db.query(AirQualityReadings).all()
    if not readings:
        raise HTTPException(status_code=404, detail="No data available for export")

    data = []
    for r in readings:
        ts = getattr(r, "created_at", None)
        if ts:
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc).astimezone(WAT)
            date_str = ts.strftime("%d-%m-%y")
            time_str = ts.strftime("%H:%M:%S")
        else:
            date_str = ""
            time_str = ""

        pm25 = getattr(r, "pm25", 0) or 0
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
            "device_id": r.device_id,
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
            "time": time_str,
        })

    df = pd.DataFrame(data)

    column_order = [
        "id",
        "device_id",
        "pm25",
        "pm10",
        "co",
        "co2",
        "temperature",
        "humidity",
        "pressure",
        "aqi",
        "aqi_level",
        "date",
        "time",
    ]
    df = df[[col for col in column_order if col in df.columns]]

    csv_data = df.to_csv(index=False)

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                "attachment; filename=futa_air_quality_dataset.csv"
            )
        },
    )