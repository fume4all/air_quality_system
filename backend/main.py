from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import pytz
import os

from .database import get_db, SessionLocal
from . import models, schemas

# Initialize FastAPI app
app = FastAPI(
    title="FUTA Air Quality IoT System API",
    description="M.Tech Thesis Backend for IoT-based Air Quality Monitoring and Analysis",
    version="1.0.0"
)

# Enable CORS for frontend and cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Timezone configuration for West Africa Time (WAT)
WAT = pytz.timezone("Africa/Lagos")

# Mount frontend directory if it exists
if os.path.exists("frontend"):
    app.mount("/static", StaticFiles(directory="frontend"), name="static")

    @app.get("/")
    def serve_dashboard():
        return FileResponse(os.path.join("frontend", "index.html"))


from sqlalchemy import inspect, text
from .database import engine
from . import models

@app.on_event("startup")
def run_migrations():
    try:
        models.Base.metadata.create_all(bind=engine)

        required_columns = {
            "aqi": "INTEGER",
            "aqi_level": "VARCHAR(50)",
            "date": "VARCHAR(20)",
            "time": "VARCHAR(20)",
            "pressure": "FLOAT"
        }

        inspector = inspect(engine)

        existing_columns = {
            col["name"]
            for col in inspector.get_columns(
                "air_quality_readings"
            )
        }

        with engine.begin() as conn:
            for column, column_type in required_columns.items():
                if column not in existing_columns:
                    conn.execute(
                        text(
                            f"ALTER TABLE air_quality_readings "
                            f"ADD COLUMN `{column}` {column_type}"
                        )
                    )
                    print(f"Added column: {column}")

        print("MySQL database migration completed")

    except Exception:
        logger.exception("Database migration failed")
        raise


@app.post("/telemetry")
def receive_telemetry(
    payload: schemas.TelemetryCreate,
    db: Session = Depends(get_db)
):
    try:
        calc_aqi, calc_level = calculate_aqi_level(
            payload.pm25
        )

        now = datetime.now(WAT)

        db_reading = models.AirQualityReading(
            device_id=payload.device_id,
            pm25=payload.pm25,
            pm10=payload.pm10,
            co=payload.co,
            co2=payload.co2,
            temperature=payload.temperature,
            humidity=payload.humidity,
            pressure=payload.pressure,
            aqi=(
                payload.aqi
                if payload.aqi is not None
                else calc_aqi
            ),
            aqi_level=payload.aqi_level or calc_level,
            date=now.strftime("%Y-%m-%d"),
            time=now.strftime("%H:%M:%S")
        )

        db.add(db_reading)
        db.commit()
        db.refresh(db_reading)

        return {
            "status": "success",
            "message": "Telemetry saved successfully",
            "id": db_reading.id
        }

    except Exception:
        db.rollback()
        logger.exception("Telemetry save failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to save telemetry"
        )

@app.get("/telemetry")
def get_telemetry(db: Session = Depends(get_db)):
    """
    Retrieve stored air quality readings for dashboard analytics and CSV exports.
    """
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