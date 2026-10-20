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

# Automatically create database tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FUTA Air Quality Monitoring API", version="1.0.0")

# Enable CORS for frontend and ESP32 hardware communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (so index.html can load script.js and CSS)
app.mount("/static", StaticFiles(directory="."), name="static")

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_index():
    return FileResponse("index.html")

@app.post("/telemetry")
def receive_telemetry(payload: AirQualityCreate, db: Session = Depends(get_db)):
    try:
        db_reading = AirQualityReadings(
            device_id=payload.device_id,
            pm25=payload.pm25,
            pm10=payload.pm10,
            co=payload.co,
            co2=payload.co2,
            temperature=payload.temperature,
            humidity=payload.humidity,
            pressure=payload.pressure,
            timestamp=datetime.utcnow()
        )
        db.add(db_reading)
        db.commit()
        db.refresh(db_reading)
        return {
            "status": "success",
            "message": "Telemetry stored successfully",
            "data": db_reading
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/telemetry")
def get_latest_telemetry(db: Session = Depends(get_db)):
    latest = db.query(AirQualityReadings).order_by(AirQualityReadings.id.desc()).first()
    if not latest:
        return {"message": "No telemetry data found"}
    return latest
@app.get("/telemetry/history")
def get_telemetry_history(limit: int = 20, db: Session = Depends(get_db)):
    readings = db.query(AirQualityReadings).order_by(AirQualityReadings.id.desc()).limit(limit).all()
    # Reverse so chronological order is oldest to newest for charts
    return list(reversed(readings))
@app.get("/telemetry/export")
def export_csv(db: Session = Depends(get_db)):
    readings = db.query(AirQualityReadings).all()
    if not readings:
        raise HTTPException(status_code=404, detail="No data available for export")
    
    data = [r.__dict__ for r in readings]
    for d in data:
        d.pop('_sa_instance_state', None)
        
    df = pd.DataFrame(data)
    csv_data = df.to_csv(index=False)
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=futa_air_quality_dataset.csv"}
    )