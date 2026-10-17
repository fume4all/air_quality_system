import csv
import io
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import Base, engine, get_db
from backend.models import AirQualityReading
from backend.schemas import AirQualityCreate, AirQualityResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(title="IoT Air Quality Monitoring API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define West Africa Time (WAT = UTC+1)
WAT = timezone(timedelta(hours=1))


def calculate_aqi_level(pm25: float):
    if pm25 is None:
        return 0, "Unknown"
    if pm25 <= 12.0:
        aqi = (50 / 12.0) * pm25
        level = "Very Good"
    elif pm25 <= 35.4:
        aqi = 50 + ((50 / 23.4) * (pm25 - 12.0))
        level = "Good"
    elif pm25 <= 55.4:
        aqi = 100 + ((50 / 20.0) * (pm25 - 35.4))
        level = "Fair"
    elif pm25 <= 150.4:
        aqi = 150 + ((50 / 95.0) * (pm25 - 55.4))
        level = "Poor"
    elif pm25 <= 250.4:
        aqi = 200 + ((100 / 100.0) * (pm25 - 150.4))
        level = "Very Poor"
    else:
        aqi = 300 + ((200 / 249.6) * (pm25 - 250.4))
        level = "Hazardous"
    
    return int(aqi), level


def format_wat_timestamp(dt_obj):
    """Ensures datetime object carries the explicit +01:00 offset for WAT."""
    if not dt_obj:
        dt_obj = datetime.now(WAT)
    if dt_obj.tzinfo is None:
        dt_obj = dt_obj.replace(tzinfo=WAT)
    return dt_obj.isoformat()


@app.post("/telemetry")
def receive_telemetry(data: AirQualityCreate, db: Session = Depends(get_db)):
    clean_device_id = data.device_id
    if not clean_device_id or clean_device_id.strip().lower() == "string":
        clean_device_id = "ESP32_SENSOR_01"

    now_wat = datetime.now(WAT)

    reading = AirQualityReading(
        device_id=clean_device_id,
        pm25=data.pm25,
        pm10=data.pm10,
        co=data.co,
        co2=data.co2,
        temperature=data.temperature,
        humidity=data.humidity,
        pressure=data.pressure,
        created_at=now_wat
    )

    db.add(reading)
    db.commit()
    db.refresh(reading)

    aqi_val, aqi_level = calculate_aqi_level(reading.pm25)

    return {
        "message": "Data received successfully",
        "id": reading.id,
        "created_at": format_wat_timestamp(reading.created_at),
        "aqi": aqi_val,
        "aqi_level": aqi_level
    }


@app.get("/telemetry")
def get_all_data(db: Session = Depends(get_db)):
    readings = db.query(AirQualityReading).order_by(desc(AirQualityReading.created_at)).limit(100).all()
    result = []
    for r in readings:
        aqi_val, aqi_level = calculate_aqi_level(r.pm25)
        
        # Explicitly format timestamp with WAT timezone
        dt_raw = getattr(r, "created_at", getattr(r, "timestamp", None))
        formatted_ts = format_wat_timestamp(dt_raw)

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
            "created_at": formatted_ts,
            "aqi": aqi_val,
            "aqi_level": aqi_level
        })
    return result


@app.get("/export-csv")
def export_csv(db: Session = Depends(get_db)):
    readings = db.query(AirQualityReading).order_by(AirQualityReading.id.asc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "ID", "Device ID", "PM2.5 (ug/m3)", "PM10 (ug/m3)", "CO (ppm)", 
        "CO2 (ppm)", "Temperature", "Humidity", "Pressure (hPa)", 
        "Date (WAT)", "Air_Pollution_Level"
    ])
    
    for r in readings:
        pm25_val = getattr(r, "pm25", 0)
        aqi_val, aqi_level = calculate_aqi_level(pm25_val)
        
        dt_raw = getattr(r, "created_at", getattr(r, "timestamp", None))
        if isinstance(dt_raw, datetime):
            ts_str = dt_raw.strftime("%Y-%m-%d %H:%M:%S")
        else:
            ts_str = str(dt_raw) if dt_raw else ""
        
        writer.writerow([
            getattr(r, "id", ""),
            getattr(r, "device_id", ""),
            pm25_val,
            getattr(r, "pm10", 0),
            getattr(r, "co", 0),
            getattr(r, "co2", 0),
            getattr(r, "temperature", 0),
            getattr(r, "humidity", 0),
            getattr(r, "pressure", 0),
            ts_str,
            aqi_level
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=Air_Quality_Dataset.csv"}
    )