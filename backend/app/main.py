import os
import io
import time
import json
import uuid
import asyncio
import threading
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI App
app = FastAPI(
    title="UrbanPulse Authority Admin Control Center Engine",
    description="Backend for Excel/CSV/JSON Ingestion, Preprocessing Pipeline, Dataset Restore & Telemetry Generator",
    version="2.8.0"
)

# Enable CORS for Frontend Development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Alerts & Incidents Engine Integration
try:
    from app.alerts_engine import router as alerts_router, ALERTS_DATA
except ImportError:
    from alerts_engine import router as alerts_router, ALERTS_DATA

app.include_router(alerts_router)

# Reports Engine Integration
try:
    from app.reports_engine import router as reports_router
except ImportError:
    from reports_engine import router as reports_router

app.include_router(reports_router)

# Settings & Admin Control Center Engine Integration
try:
    from app.settings_engine import router as settings_router
except ImportError:
    from settings_engine import router as settings_router

app.include_router(settings_router)


# -----------------------------------------------------------------------------
# STANDARDIZED URBANPULSE TELEMETRY FIELD SCHEMA
# -----------------------------------------------------------------------------
STANDARD_FIELDS = [
    {"field": "timestamp", "required": True, "type": "DateTime", "label": "Timestamp"},
    {"field": "latitude", "required": True, "type": "Float (-90 to 90)", "label": "Latitude"},
    {"field": "longitude", "required": True, "type": "Float (-180 to 180)", "label": "Longitude"},
    {"field": "location_id", "required": False, "type": "String", "label": "Location / Zone ID"},
    {"field": "traffic_level", "required": False, "type": "Float (0.0 to 1.0)", "label": "Traffic Congestion Level"},
    {"field": "traffic_speed", "required": False, "type": "Float (>= 0)", "label": "Traffic Speed (km/h)"},
    {"field": "crowd_level", "required": False, "type": "Float (0.0 to 1.0)", "label": "Crowd Density Level"},
    {"field": "crowd_count", "required": False, "type": "Integer (>= 0)", "label": "Pedestrian Count"},
    {"field": "temperature", "required": False, "type": "Float (°C)", "label": "Temperature (°C)"},
    {"field": "rainfall", "required": False, "type": "Float (mm/h)", "label": "Precipitation / Rainfall"},
    {"field": "weather_condition", "required": False, "type": "String", "label": "Weather Condition"},
    {"field": "data_quality", "required": False, "type": "Float (0.0 to 1.0)", "label": "Data Quality Score"}
]

# -----------------------------------------------------------------------------
# IN-MEMORY DATA STORES (PostgreSQL / PostGIS Schema Ready)
# -----------------------------------------------------------------------------
DATA_SOURCES_STORE: Dict[str, Dict[str, Any]] = {
    "src-001": {
        "id": "src-001",
        "name": "Google Maps Traffic",
        "provider": "Google Maps Platform",
        "source_type": "Traffic API",
        "endpoint": "https://routes.googleapis.com",
        "last_fetch": "27 Sep 2026 14:32",
        "status": "Connected",
        "auto_ingest": True
    },
    "src-002": {
        "id": "src-002",
        "name": "OpenWeather",
        "provider": "OpenWeather Ltd",
        "source_type": "Weather API",
        "endpoint": "https://api.openweathermap.org",
        "last_fetch": "27 Sep 2026 14:28",
        "status": "Connected",
        "auto_ingest": True
    },
    "src-003": {
        "id": "src-003",
        "name": "City Crowd API",
        "provider": "Municipal Crowd System",
        "source_type": "Crowd API",
        "endpoint": "https://api.citydata.example.com",
        "last_fetch": "27 Sep 2026 14:25",
        "status": "Connected",
        "auto_ingest": True
    },
    "src-004": {
        "id": "src-004",
        "name": "Project Telemetry",
        "provider": "Telemetry Generator Engine",
        "source_type": "Telemetry",
        "endpoint": "/api/telemetry/crowd",
        "last_fetch": "27 Sep 2026 14:35",
        "status": "Running",
        "auto_ingest": True
    }
}

DATASETS_STORE: Dict[str, Dict[str, Any]] = {}
DATASET_BACKUPS: Dict[str, Dict[str, Any]] = {} # Real state backups for Restore functionality

INGESTION_LOGS: List[Dict[str, Any]] = []

# Real Pipeline Job Progress State
PROCESSING_JOBS: Dict[str, Dict[str, Any]] = {}

# Telemetry Engine State
TELEMETRY_ENGINE = {
    "dataset_id": "ds-sample01",
    "status": "Running", # Running, Paused, Stopped
    "mode": "Replay (Simulated)",
    "current_record": 4820,
    "total_records": 124210,
    "emission_rate": "1 record / sec",
    "simulation_time": "2026-09-27 14:35:00",
    "last_emitted_record": None,
    "current_index": 0
}

TELEMETRY_CACHE: List[Dict[str, Any]] = []

# -----------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# -----------------------------------------------------------------------------
class DataSourceCreate(BaseModel):
    name: str
    source_type: str
    endpoint: str
    auto_ingest: bool = True

class SchemaMappingPayload(BaseModel):
    mapping: Dict[str, str]

# -----------------------------------------------------------------------------
# HELPER DATA PREPROCESSING PIPELINE ENGINE
# -----------------------------------------------------------------------------
def run_real_preprocessing_pipeline(dataset_id: str, selected_sheet: Optional[str] = None):
    """
    Executes real backend pipeline:
    1. Upload (File received)
    2. Validate (Schema check & bounds)
    3. Clean (Missing value imputation & duplicate removal)
    4. Transform (Standardize timestamps, locations, column types)
    5. Generate (Create simulated telemetry cache)
    6. Connect (Link to internal UrbanPulse API)
    """
    if dataset_id not in DATASETS_STORE:
        return
    
    dt = DATASETS_STORE[dataset_id]
    job = {
        "dataset_id": dataset_id,
        "filename": dt["filename"],
        "step_index": 1, # 1 to 6
        "step_name": "Upload",
        "step_desc": "File received and parsed",
        "progress_pct": 15,
        "status": "Processing",
        "error": None
    }
    PROCESSING_JOBS[dataset_id] = job
    
    try:
        # Save backup of dataset prior to transformation for RESTORE feature
        DATASET_BACKUPS[dataset_id] = json.loads(json.dumps({
            "is_processed": dt.get("is_processed", False),
            "processing_status": dt.get("processing_status", "Processing"),
            "telemetry_status": dt.get("telemetry_status", "Not Started"),
            "mapped_schema": dt.get("mapped_schema", {}),
            "valid_records": dt.get("valid_records", 0),
            "missing_values": dt.get("missing_values", 0),
            "duplicate_rows": dt.get("duplicate_rows", 0)
        }))

        # Step 2: Validate
        job["step_index"] = 2
        job["step_name"] = "Validate"
        job["step_desc"] = "Step 2 of 6 - Validating schema & coordinates"
        job["progress_pct"] = 35
        time.sleep(0.3)
        
        file_bytes = io.BytesIO(dt["file_bytes"])
        filename = dt["filename"]
        
        # Read file according to format (CSV, XLSX, XLS, JSON)
        if filename.endswith(('.xlsx', '.xls')):
            excel_file = pd.ExcelFile(file_bytes)
            sheet = selected_sheet or excel_file.sheet_names[0]
            df = pd.read_excel(excel_file, sheet_name=sheet)
            dt["selected_sheet"] = sheet
            dt["available_sheets"] = excel_file.sheet_names
        elif filename.endswith('.json'):
            df = pd.read_json(file_bytes)
        else:
            df = pd.read_csv(file_bytes)
            
        orig_count = len(df)
        
        # Step 3: Clean
        job["step_index"] = 3
        job["step_name"] = "Clean"
        job["step_desc"] = "Step 3 of 6 - Handling missing data & duplicates"
        job["progress_pct"] = 55
        time.sleep(0.3)
        
        # Remove duplicates
        df_clean = df.drop_duplicates().copy()
        dups_removed = orig_count - len(df_clean)
        
        # Step 4: Transform
        job["step_index"] = 4
        job["step_name"] = "Transform"
        job["step_desc"] = "Step 4 of 6 - Standardizing timestamps & locations"
        job["progress_pct"] = 72
        time.sleep(0.4)
        
        schema = dt.get("mapped_schema") or dt.get("auto_mapping", {})
        rename_dict = {k: v for k, v in schema.items() if v != 'IGNORE'}
        
        if rename_dict:
            df_clean = df_clean[list(rename_dict.keys())].rename(columns=rename_dict)
            
        # Parse timestamp if present
        if 'timestamp' in df_clean.columns:
            df_clean['timestamp'] = pd.to_datetime(df_clean['timestamp'], errors='coerce').dt.strftime('%Y-%m-%d %H:%M:%S')
            df_clean = df_clean.dropna(subset=['timestamp']).sort_values('timestamp')

        # Clean invalid lat/lon if present
        if 'latitude' in df_clean.columns:
            df_clean = df_clean[df_clean['latitude'].between(-90, 90)]
        if 'longitude' in df_clean.columns:
            df_clean = df_clean[df_clean['longitude'].between(-180, 180)]

        # Median Imputation for numeric nulls
        for col in df_clean.select_dtypes(include=[np.number]).columns:
            if df_clean[col].isnull().sum() > 0:
                df_clean[col] = df_clean[col].fillna(df_clean[col].median())

        if 'data_quality' not in df_clean.columns:
            df_clean['data_quality'] = 0.99

        valid_records = len(df_clean)
        
        # Step 5: Generate Telemetry
        job["step_index"] = 5
        job["step_name"] = "Generate"
        job["step_desc"] = "Step 5 of 6 - Generating live telemetry cache"
        job["progress_pct"] = 90
        time.sleep(0.3)
        
        processed_records = df_clean.to_dict(orient='records')
        dt["processed_json"] = df_clean.to_json(orient='records')
        dt["is_processed"] = True
        dt["processing_status"] = "Completed"
        dt["valid_records"] = valid_records
        dt["duplicate_rows"] = dups_removed
        dt["telemetry_status"] = "Running"
        
        # Update Telemetry Engine Cache
        global TELEMETRY_CACHE, TELEMETRY_ENGINE
        TELEMETRY_CACHE = processed_records
        TELEMETRY_ENGINE["dataset_id"] = dataset_id
        TELEMETRY_ENGINE["total_records"] = valid_records
        TELEMETRY_ENGINE["current_record"] = 1
        TELEMETRY_ENGINE["status"] = "Running"
        TELEMETRY_ENGINE["simulation_time"] = processed_records[0]["timestamp"] if processed_records else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Step 6: Connect to System
        job["step_index"] = 6
        job["step_name"] = "Connect"
        job["step_desc"] = "Step 6 of 6 - Connected to UrbanPulse system"
        job["progress_pct"] = 100
        job["status"] = "Completed"

        INGESTION_LOGS.insert(0, {
            "id": f"log-{uuid.uuid4().hex[:6]}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source": dt["name"],
            "operation": "Pipeline Execution",
            "status": "SUCCESS",
            "records": valid_records,
            "message": f"Dataset processed & connected to telemetry layer ({valid_records} valid records)."
        })

    except Exception as e:
        job["status"] = "Failed"
        job["error"] = str(e)
        dt["processing_status"] = "Failed"
        INGESTION_LOGS.insert(0, {
            "id": f"log-{uuid.uuid4().hex[:6]}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source": dt["name"],
            "operation": "Pipeline Execution",
            "status": "FAILED",
            "records": 0,
            "message": f"Pipeline failed at Step {job['step_index']} ({job['step_name']}): {str(e)}"
        })

# -----------------------------------------------------------------------------
# REST ENDPOINTS
# -----------------------------------------------------------------------------
@app.get("/api/admin/overview")
def get_admin_overview():
    return {
        "data_sources": list(DATA_SOURCES_STORE.values()),
        "datasets": list(DATASETS_STORE.values()),
        "telemetry_engine": TELEMETRY_ENGINE,
        "processing_jobs": list(PROCESSING_JOBS.values())
    }

# --- DATASET UPLOAD WITH EXCEL (.XLSX / .XLS / .CSV / .JSON) ---
@app.post("/api/admin/datasets/upload")
async def upload_dataset_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    filename = file.filename.lower()
    if not filename.endswith(('.csv', '.xlsx', '.xls', '.json')):
        raise HTTPException(status_code=400, detail="Supported formats: .csv, .xlsx, .xls, .json")
    
    contents = await file.read()
    file_bytes = io.BytesIO(contents)
    
    try:
        available_sheets = []
        selected_sheet = None
        
        if filename.endswith(('.xlsx', '.xls')):
            excel_file = pd.ExcelFile(file_bytes)
            available_sheets = excel_file.sheet_names
            selected_sheet = available_sheets[0]
            df = pd.read_excel(excel_file, sheet_name=selected_sheet)
        elif filename.endswith('.json'):
            df = pd.read_json(file_bytes)
        else:
            df = pd.read_csv(file_bytes)
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded dataset: {str(e)}")
    
    dataset_id = f"ds-{uuid.uuid4().hex[:6]}"
    columns = list(df.columns)
    total_records = len(df)
    missing_count = int(df.isnull().sum().sum())
    missing_pct = float(round((missing_count / (len(df) * len(columns))) * 100, 2)) if len(df) > 0 else 0.0
    duplicate_rows = int(df.duplicated().sum())

    # Heuristic Schema Mapping
    auto_mapping = {}
    for col in columns:
        col_l = str(col).lower().strip()
        if col_l in ['time', 'timestamp', 'date', 'datetime', 'time_obs', 'dt']:
            auto_mapping[col] = 'timestamp'
        elif col_l in ['lat', 'latitude', 'lat_coord']:
            auto_mapping[col] = 'latitude'
        elif col_l in ['lon', 'long', 'longitude', 'lon_coord']:
            auto_mapping[col] = 'longitude'
        elif col_l in ['crowd', 'crowd_count', 'pedestrian_count', 'footfall']:
            auto_mapping[col] = 'crowd_count'
        elif col_l in ['crowd_level', 'density', 'crowd_density_idx']:
            auto_mapping[col] = 'crowd_level'
        elif col_l in ['speed', 'traffic_speed']:
            auto_mapping[col] = 'traffic_speed'
        elif col_l in ['rain', 'rainfall', 'precipitation']:
            auto_mapping[col] = 'rainfall'
        elif col_l in ['temp', 'temperature']:
            auto_mapping[col] = 'temperature'
        elif col_l in ['corridor', 'location_id', 'zone']:
            auto_mapping[col] = 'location_id'
        else:
            auto_mapping[col] = 'IGNORE'

    dataset_entry = {
        "id": dataset_id,
        "name": file.filename.rsplit('.', 1)[0].replace('_', ' ').title(),
        "filename": file.filename,
        "file_bytes": contents, # Raw file bytes stored safely in backend
        "size_bytes": len(contents),
        "size_display": f"{round(len(contents)/1024, 1)} KB",
        "total_records": total_records,
        "valid_records": total_records - duplicate_rows,
        "total_columns": len(columns),
        "columns": columns,
        "available_sheets": available_sheets,
        "selected_sheet": selected_sheet,
        "missing_values": missing_count,
        "missing_pct": missing_pct,
        "duplicate_rows": duplicate_rows,
        "auto_mapping": auto_mapping,
        "mapped_schema": auto_mapping,
        "is_processed": False,
        "processing_status": "Uploaded",
        "telemetry_status": "Not Started",
        "sample_rows": df.head(5).to_dict(orient='records'),
        "uploaded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    DATASETS_STORE[dataset_id] = dataset_entry

    # Trigger real backend processing pipeline
    background_tasks.add_task(run_real_preprocessing_pipeline, dataset_id, selected_sheet)
    
    INGESTION_LOGS.insert(0, {
        "id": f"log-{uuid.uuid4().hex[:6]}",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source": file.filename,
        "operation": "Dataset Upload",
        "status": "SUCCESS",
        "records": total_records,
        "message": f"Uploaded {file.filename} ({total_records} rows, {len(columns)} columns)."
    })
    
    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "total_records": total_records,
        "total_columns": len(columns),
        "available_sheets": available_sheets,
        "missing_values": missing_count,
        "duplicate_rows": duplicate_rows,
        "auto_mapping": auto_mapping,
        "processing_status": "Uploaded"
    }

# --- RESTORE DATASET CONFIGURATION TO PREVIOUS VALID STATE ---
@app.post("/api/admin/datasets/{dataset_id}/restore")
def restore_dataset_state(dataset_id: str):
    if dataset_id not in DATASETS_STORE:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset_id not in DATASET_BACKUPS:
        raise HTTPException(status_code=400, detail="No backup state found to restore for this dataset.")
    
    backup = DATASET_BACKUPS[dataset_id]
    dt = DATASETS_STORE[dataset_id]
    
    # Actually restore previous state variables in database/memory
    dt["is_processed"] = backup.get("is_processed", False)
    dt["processing_status"] = backup.get("processing_status", "Uploaded")
    dt["telemetry_status"] = backup.get("telemetry_status", "Not Started")
    dt["mapped_schema"] = backup.get("mapped_schema", dt.get("auto_mapping", {}))
    dt["valid_records"] = backup.get("valid_records", dt["total_records"])
    dt["missing_values"] = backup.get("missing_values", 0)
    dt["duplicate_rows"] = backup.get("duplicate_rows", 0)
    
    if dataset_id in PROCESSING_JOBS:
        PROCESSING_JOBS[dataset_id]["status"] = "Restored"
        PROCESSING_JOBS[dataset_id]["step_name"] = "Restored"
        PROCESSING_JOBS[dataset_id]["progress_pct"] = 0

    INGESTION_LOGS.insert(0, {
        "id": f"log-{uuid.uuid4().hex[:6]}",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source": dt["name"],
        "operation": "Dataset Restore",
        "status": "SUCCESS",
        "records": dt["total_records"],
        "message": f"Restored dataset '{dt['name']}' to its previous valid state."
    })
    
    return {
        "status": "RESTORED",
        "dataset_id": dataset_id,
        "restored_state": backup
    }

# --- STANDARDIZED CONSUMPTION ENDPOINTS FOR URBANPULSE INTELLIGENCE ENGINE ---
@app.get("/api/telemetry/latest")
def get_latest_telemetry_frame():
    if not TELEMETRY_CACHE:
        return {
            "source_id": "src-004",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "location_id": "CORRIDOR_ALPHA",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "crowd_level": 0.89,
            "crowd_count": 4820,
            "traffic_level": 0.65,
            "traffic_speed": 34.5,
            "temperature": 24.5,
            "rainfall": 12.0,
            "weather_condition": "Thunderstorm",
            "data_quality": 0.99,
            "stream_mode": "SIMULATED TELEMETRY — replaying processed dataset records."
        }
    
    idx = TELEMETRY_ENGINE["current_index"]
    rec = TELEMETRY_CACHE[idx].copy()
    rec["source_id"] = "src-004"
    if "location_id" not in rec and "corridor_id" in rec:
        rec["location_id"] = rec["corridor_id"]
    elif "location_id" not in rec:
        rec["location_id"] = "CORRIDOR_ALPHA"
        
    rec["stream_mode"] = "SIMULATED TELEMETRY — replaying processed dataset records."
    rec["stream_status"] = TELEMETRY_ENGINE["status"]
    
    if TELEMETRY_ENGINE["status"] == "Running":
        TELEMETRY_ENGINE["last_emitted_record"] = rec
        TELEMETRY_ENGINE["simulation_time"] = rec.get("timestamp")
        TELEMETRY_ENGINE["current_record"] = idx + 1
        TELEMETRY_ENGINE["current_index"] = (idx + 1) % len(TELEMETRY_CACHE)

    return rec

# --- DEMO DATA INITIALIZATION ---
@app.on_event("startup")
def init_demo_dataset():
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "sample_crowd_telemetry.csv")
    if os.path.exists(csv_path):
        try:
            with open(csv_path, "rb") as f:
                bytes_data = f.read()
            df = pd.read_csv(io.BytesIO(bytes_data))
            dataset_id = "ds-sample01"
            mapping = {
                "time_obs": "timestamp",
                "lat_coord": "latitude",
                "lon_coord": "longitude",
                "pedestrian_count": "crowd_count",
                "crowd_density_idx": "crowd_level",
                "venue_dispersal_flag": "IGNORE",
                "corridor_id": "location_id"
            }
            
            df_proc = df.rename(columns=mapping)
            if 'IGNORE' in df_proc.columns:
                df_proc = df_proc.drop(columns=['IGNORE'])
            df_proc['data_quality'] = 0.99
            records = df_proc.to_dict(orient='records')
            
            DATASETS_STORE[dataset_id] = {
                "id": dataset_id,
                "name": "Central Corridor Crowd Dataset",
                "filename": "central_crowd_dataset.csv",
                "file_bytes": bytes_data,
                "size_bytes": len(bytes_data),
                "size_display": "125.4 KB",
                "total_records": 125430,
                "valid_records": 124210,
                "total_columns": len(df.columns),
                "columns": list(df.columns),
                "missing_values": 1020,
                "duplicate_rows": 200,
                "auto_mapping": mapping,
                "mapped_schema": mapping,
                "is_processed": True,
                "processing_status": "Completed",
                "telemetry_status": "Running",
                "sample_rows": df.head(5).to_dict(orient='records'),
                "uploaded_at": "27 Sep 2026 10:12"
            }
            
            global TELEMETRY_CACHE, TELEMETRY_ENGINE
            TELEMETRY_CACHE = records
            TELEMETRY_ENGINE["dataset_id"] = dataset_id
            TELEMETRY_ENGINE["total_records"] = 124210
            TELEMETRY_ENGINE["current_record"] = 4820
            TELEMETRY_ENGINE["status"] = "Running"
        except Exception as e:
            print("Demo dataset init:", e)

# -----------------------------------------------------------------------------
# DASHBOARD AUTHORITY CONTROL CENTER ENDPOINTS
# -----------------------------------------------------------------------------

CORRIDORS_STORE = [
    {
        "id": "CORRIDOR_ALPHA",
        "name": "Corridor Alpha (Central Hub)",
        "lat": 12.9716,
        "lng": 77.5946,
        "status": "Critical",
        "traffic_level": 0.85,
        "traffic_speed": 14.2,
        "crowd_level": 0.89,
        "crowd_count": 4820,
        "rainfall": 14.5,
        "risk_score": 0.84,
        "trend": "rising"
    },
    {
        "id": "CORRIDOR_BETA",
        "name": "Corridor Beta (Commercial Arterial)",
        "lat": 12.9780,
        "lng": 77.6050,
        "status": "Warning",
        "traffic_level": 0.68,
        "traffic_speed": 28.5,
        "crowd_level": 0.62,
        "crowd_count": 2910,
        "rainfall": 12.0,
        "risk_score": 0.64,
        "trend": "stable"
    },
    {
        "id": "TECH_HUB_LOOP",
        "name": "Tech Hub Ring Expressway",
        "lat": 12.9850,
        "lng": 77.5800,
        "status": "Normal",
        "traffic_level": 0.35,
        "traffic_speed": 52.0,
        "crowd_level": 0.28,
        "crowd_count": 1150,
        "rainfall": 4.2,
        "risk_score": 0.29,
        "trend": "falling"
    },
    {
        "id": "AIRPORT_LINK",
        "name": "Airport Expressway Corridor",
        "lat": 12.9920,
        "lng": 77.6150,
        "status": "Warning",
        "traffic_level": 0.72,
        "traffic_speed": 31.0,
        "crowd_level": 0.45,
        "crowd_count": 1840,
        "rainfall": 16.0,
        "risk_score": 0.68,
        "trend": "rising"
    },
    {
        "id": "HARBOR_TRANSIT",
        "name": "Harbor Transit Intermodal Station",
        "lat": 12.9620,
        "lng": 77.5720,
        "status": "Normal",
        "traffic_level": 0.42,
        "traffic_speed": 45.0,
        "crowd_level": 0.51,
        "crowd_count": 2100,
        "rainfall": 8.0,
        "risk_score": 0.38,
        "trend": "stable"
    }
]

ALERTS_STORE = [
    {
        "id": "alt-101",
        "timestamp": "14:32:10",
        "severity": "CRITICAL",
        "location": "Corridor Alpha (Central Hub)",
        "location_id": "CORRIDOR_ALPHA",
        "trigger": "Pedestrian Crowd Surge (>4,500) & Rain (14.5mm/h)",
        "protocol": "Dispatch Traffic Management Unit #4 & Activate Auxiliary Drainage Pump A",
        "acknowledged": False
    },
    {
        "id": "alt-102",
        "timestamp": "14:28:45",
        "severity": "WARNING",
        "location": "Airport Expressway Corridor",
        "location_id": "AIRPORT_LINK",
        "trigger": "Elevated Heavy Rainfall (16.0 mm/h) & Speed Drop",
        "protocol": "Deploy Variable Message Signs: Heavy Rain Ahead, Max Speed 40 km/h",
        "acknowledged": False
    },
    {
        "id": "alt-103",
        "timestamp": "14:15:00",
        "severity": "WARNING",
        "location": "Corridor Beta (Commercial Arterial)",
        "location_id": "CORRIDOR_BETA",
        "trigger": "Moderate Traffic Congestion Index (0.68)",
        "protocol": "Adjust Signal Timing Matrix to Favor Outbound Corridor Flow",
        "acknowledged": True
    }
]

class CounterfactualScenarioRequest(BaseModel):
    location_id: str = "CORRIDOR_ALPHA"
    traffic_level: float = 0.85
    crowd_level: float = 0.89
    rainfall: float = 14.5
    event_flag: bool = False

@app.get("/api/dashboard/overview")
def get_dashboard_overview():
    return {
        "status": "OPERATIONAL",
        "system_health": "100% Ingestion Connected",
        "latency_ms": 14,
        "model_version": "XGBoost v1.2 (Ensembled)",
        "monitored_zones_count": len(CORRIDORS_STORE),
        "overall_city_index": 0.64,
        "city_status": "Moderate Risk",
        "active_alerts_count": len([a for a in ALERTS_DATA if a.get("status") in ["Active", "Acknowledged"]]),
        "avg_traffic_speed_kmh": 34.1,
        "avg_crowd_density": 0.55,
        "avg_rainfall_mmh": 10.9,
        "last_sync": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/dashboard/corridors")
def get_dashboard_corridors():
    return CORRIDORS_STORE

@app.get("/api/dashboard/prediction")
def get_dashboard_prediction(location_id: str = Query("CORRIDOR_ALPHA"), horizon_min: int = Query(30)):
    # Locate corridor
    corridor = next((c for c in CORRIDORS_STORE if c["id"] == location_id), CORRIDORS_STORE[0])
    
# -----------------------------------------------------------------------------
# PHASE 1 MVP REST API ENDPOINTS & SCHEMAS
# -----------------------------------------------------------------------------

class TrafficTelemetrySchema(BaseModel):
    condition: str = "Moderate"
    avg_speed_kmh: float = 28.0
    congestion_level_pct: float = 34.0
    status: str = "Operational"
    speed_trend_pct: float = 12.0
    congestion_trend_pct: float = -8.0
    history: List[Dict[str, Any]] = []

class CrowdTelemetrySchema(BaseModel):
    density_level: str = "High"
    current_density: int = 420
    peak_today: int = 620
    unit: str = "people/km²"
    trend_pct: float = 18.0
    location: str = "MG Road"
    history: List[Dict[str, Any]] = []

class WeatherTelemetrySchema(BaseModel):
    condition: str = "Light Rain"
    temperature_c: float = 24.0
    temp_trend_c: float = -2.0
    humidity_pct: int = 78
    rainfall_mm: float = 2.4
    wind_speed_kmh: float = 14.0
    wind_direction: str = "SW"
    history: List[Dict[str, Any]] = []

class AlertItemSchema(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    source: str
    location: str
    time_ago: str
    timestamp: str

class RecommendationItemSchema(BaseModel):
    id: str
    title: str
    description: str
    category: str
    time_ago: str

class SystemStatusItemSchema(BaseModel):
    source: str
    status: str
    mode: str

@app.get("/api/traffic/current", response_model=TrafficTelemetrySchema)
def get_current_traffic():
    # If telemetry cache is active, derive dynamic speed and congestion from live stream
    idx = TELEMETRY_ENGINE.get("current_index", 0)
    rec = TELEMETRY_CACHE[idx] if TELEMETRY_CACHE and idx < len(TELEMETRY_CACHE) else {}
    
    speed = float(rec.get("traffic_speed", 28.0))
    if speed == 0: speed = 28.0
    congestion = int(rec.get("traffic_level", 0.34) * 100) if rec.get("traffic_level") else 34
    
    history_times = ["13:30", "13:35", "13:40", "13:45", "13:50", "13:55", "14:00", "14:05", "14:10", "14:15", "14:20", "14:25", "14:30"]
    history_speeds = [45, 43, 39, 41, 49, 58, 52, 44, 42, 56, 54, 48, int(speed)]
    history_congestions = [22, 25, 28, 27, 20, 15, 18, 24, 26, 17, 19, 23, congestion]
    
    history = [{"time": t, "speed": s, "congestion": c} for t, s, c in zip(history_times, history_speeds, history_congestions)]
    
    return {
        "condition": "Moderate" if speed >= 25 else ("Heavy" if speed < 20 else "Free Flow"),
        "avg_speed_kmh": round(speed, 1),
        "congestion_level_pct": float(congestion),
        "status": "Operational",
        "speed_trend_pct": 12.0,
        "congestion_trend_pct": -8.0,
        "history": history
    }

@app.get("/api/crowd/current", response_model=CrowdTelemetrySchema)
def get_current_crowd():
    idx = TELEMETRY_ENGINE.get("current_index", 0)
    rec = TELEMETRY_CACHE[idx] if TELEMETRY_CACHE and idx < len(TELEMETRY_CACHE) else {}
    
    density = int(rec.get("crowd_count", 420))
    if density == 0 or density > 1000: density = 420
    
    history_times = ["13:30", "13:35", "13:40", "13:45", "13:50", "13:55", "14:00", "14:05", "14:10", "14:15", "14:20", "14:25", "14:30"]
    history_densities = [380, 410, 390, 480, 440, 330, 300, 430, 520, 620, 710, 490, density]
    
    history = [{"time": t, "density": d} for t, d in zip(history_times, history_densities)]
    
    return {
        "density_level": "High" if density >= 400 else "Moderate",
        "current_density": density,
        "peak_today": max(620, density),
        "unit": "people/km²",
        "trend_pct": 18.0,
        "location": "MG Road / Commercial District",
        "history": history
    }

@app.get("/api/weather/current", response_model=WeatherTelemetrySchema)
def get_current_weather():
    idx = TELEMETRY_ENGINE.get("current_index", 0)
    rec = TELEMETRY_CACHE[idx] if TELEMETRY_CACHE and idx < len(TELEMETRY_CACHE) else {}
    
    temp = float(rec.get("temperature", 24.0)) if rec.get("temperature") else 24.0
    rain = float(rec.get("rainfall", 2.4)) if rec.get("rainfall") else 2.4
    
    history_times = ["13:30", "13:35", "13:40", "13:45", "13:50", "13:55", "14:00", "14:05", "14:10", "14:15", "14:20", "14:25", "14:30"]
    history_temps = [26.0, 26.0, 25.5, 25.0, 25.0, 25.5, 26.0, 27.5, 28.0, 28.0, 27.0, 25.0, temp]
    history_rains = [0.2, 0.4, 0.4, 0.8, 0.8, 1.0, 1.2, 4.5, 1.5, 2.0, 4.8, 3.2, rain]
    
    history = [{"time": t, "temp": tm, "rainfall": rn} for t, tm, rn in zip(history_times, history_temps, history_rains)]
    
    return {
        "condition": "Light Rain" if rain > 0 else "Clear",
        "temperature_c": round(temp, 1),
        "temp_trend_c": -2.0,
        "humidity_pct": 78,
        "rainfall_mm": round(rain, 1),
        "wind_speed_kmh": 14.0,
        "wind_direction": "SW",
        "history": history
    }

@app.get("/api/recommendations", response_model=List[RecommendationItemSchema])
def get_ai_recommendations():
    return [
        {
            "id": "rec-01",
            "title": "Reroute traffic on Outer Ring Road",
            "description": "High congestion detected near Marathahalli. Recommend diverting traffic to alternative routes.",
            "category": "Traffic",
            "time_ago": "5 min ago"
        },
        {
            "id": "rec-02",
            "title": "Increase crowd monitoring at MG Road",
            "description": "Crowd density is above normal due to ongoing event. Deploy additional personnel.",
            "category": "Crowd",
            "time_ago": "8 min ago"
        },
        {
            "id": "rec-03",
            "title": "Monitor rainfall impact in Koramangala",
            "description": "Light rain expected to increase. Possible traffic slowdown in next 1 hour.",
            "category": "Weather",
            "time_ago": "12 min ago"
        }
    ]

@app.get("/api/system/status", response_model=List[SystemStatusItemSchema])
def get_system_status():
    return [
        {"source": "Traffic Data", "status": "Operational", "mode": "Real-time"},
        {"source": "Weather Data", "status": "Operational", "mode": "Real-time"},
        {"source": "Crowd Data", "status": "Operational", "mode": "Real-time"},
        {"source": "Metro Data", "status": "Operational", "mode": "Real-time"},
        {"source": "Event Data", "status": "Operational", "mode": "Real-time"}
    ]

@app.get("/api/dashboard/overview")
def get_dashboard_overview_v2():
    tr = get_current_traffic()
    cr = get_current_crowd()
    wt = get_current_weather()
    al = get_active_alerts()
    rc = get_ai_recommendations()
    st = get_system_status()
    
    crit_count = len([a for a in al if a["severity"] == "Critical"])
    mod_count = len([a for a in al if a["severity"] == "Moderate"])
    low_count = len([a for a in al if a["severity"] == "Low"])
    
    return {
        "location": "Bengaluru",
        "time_range": "Last 1 Hour",
        "timestamp": datetime.now().strftime("%d %b %Y %H:%M:%S"),
        "is_live": True,
        "traffic": tr,
        "crowd": cr,
        "weather": wt,
        "active_alerts_count": len(al),
        "active_alerts_critical": crit_count,
        "active_alerts_moderate": mod_count,
        "active_alerts_low": low_count,
        "alerts_trend_pct": -29.0,
        "recommendations": rc,
        "alerts": al,
    }

# -----------------------------------------------------------------------------
# PHASE 2 MAP & SPATIAL MONITORING REST API ENDPOINTS
# -----------------------------------------------------------------------------

MAP_INCIDENTS_STORE = [
    {
        "id": "inc-001",
        "name": "Marathahalli - Outer Ring Road",
        "title": "Marathahalli – Outer Ring Road",
        "location": "Marathahalli, Outer Ring Road, Bengaluru",
        "zone": "Marathahalli",
        "lat": 12.9569,
        "lng": 77.7011,
        "severity": "Critical",
        "type": "traffic",
        "traffic_speed": 18,
        "traffic_speed_change": -62,
        "crowd_density": 520,
        "crowd_density_change": 18,
        "weather_condition": "Light Rain",
        "temp_c": 24,
        "detected_at": "27 Sep 2026, 14:27 (5 min ago)",
        "timestamp": "2026-09-27 14:27:00",
        "status": "High Congestion",
        "data_sources": ["Traffic API", "Crowd Sensors", "Weather API"],
        "alert_text": "Traffic speed significantly lower than usual. Congestion detected on Outer Ring Road.",
        "recommendation": "Consider diverting traffic to alternative routes. Increased crowd density near bus stops.",
        "recommended_actions": [
            {"id": "act-1", "text": "Monitor traffic flow continuously", "checked": True},
            {"id": "act-2", "text": "Consider traffic diversion", "checked": True},
            {"id": "act-3", "text": "Deploy traffic control personnel", "checked": False},
            {"id": "act-4", "text": "Inform commuters via public channels", "checked": False}
        ]
    },
    {
        "id": "inc-002",
        "name": "Whitefield IT Corridor",
        "title": "Whitefield Main Road",
        "location": "Whitefield IT Park Link, Bengaluru",
        "zone": "Whitefield",
        "lat": 12.9698,
        "lng": 77.7500,
        "severity": "Moderate",
        "type": "crowd",
        "traffic_speed": 31,
        "traffic_speed_change": -12,
        "crowd_density": 610,
        "crowd_density_change": 24,
        "weather_condition": "Overcast",
        "temp_c": 26,
        "detected_at": "27 Sep 2026, 14:20 (12 min ago)",
        "timestamp": "2026-09-27 14:20:00",
        "status": "Elevated Crowd",
        "data_sources": ["Crowd API", "Traffic API"],
        "alert_text": "Pedestrian crowd density exceeding 600 people/km² near tech park exit gate.",
        "recommendation": "Deploy auxiliary security personnel and adjust pedestrian signal cycle.",
        "recommended_actions": [
            {"id": "act-1", "text": "Monitor pedestrian gates", "checked": True},
            {"id": "act-2", "text": "Extend green signal duration", "checked": True},
            {"id": "act-3", "text": "Deploy pedestrian marshals", "checked": False}
        ]
    },
    {
        "id": "inc-003",
        "name": "Hebbal Flyover Junction",
        "title": "Hebbal Flyover",
        "location": "Hebbal Outer Ring Road Junction, Bengaluru",
        "zone": "Hebbal",
        "lat": 13.0358,
        "lng": 77.5970,
        "severity": "Critical",
        "type": "traffic",
        "traffic_speed": 14,
        "traffic_speed_change": -70,
        "crowd_density": 310,
        "crowd_density_change": 5,
        "weather_condition": "Moderate Rain",
        "temp_c": 23,
        "detected_at": "27 Sep 2026, 14:15 (17 min ago)",
        "timestamp": "2026-09-27 14:15:00",
        "status": "Severe Bottleneck",
        "data_sources": ["Traffic API", "Weather API"],
        "alert_text": "Flyover inflow bottleneck caused by rain puddle on ramp.",
        "recommendation": "Dispatch mobile pumping unit and issue emergency traffic advisory.",
        "recommended_actions": [
            {"id": "act-1", "text": "Dispatch mobile pumping unit", "checked": True},
            {"id": "act-2", "text": "Issue VMS alert", "checked": True}
        ]
    },
    {
        "id": "inc-004",
        "name": "Indiranagar 100ft Road",
        "title": "Indiranagar Commercial Corridor",
        "location": "100ft Road, Indiranagar, Bengaluru",
        "zone": "Indiranagar",
        "lat": 12.9784,
        "lng": 77.6408,
        "severity": "Low",
        "type": "traffic",
        "traffic_speed": 42,
        "traffic_speed_change": 5,
        "crowd_density": 280,
        "crowd_density_change": -10,
        "weather_condition": "Partly Cloudy",
        "temp_c": 27,
        "detected_at": "27 Sep 2026, 14:30 (2 min ago)",
        "timestamp": "2026-09-27 14:30:00",
        "status": "Normal Flow",
        "data_sources": ["Traffic API"],
        "alert_text": "Traffic flowing smoothly across Indiranagar 100ft Road corridor.",
        "recommendation": "Maintain baseline automated spatial monitoring.",
        "recommended_actions": [
            {"id": "act-1", "text": "Maintain baseline traffic signal loop", "checked": True}
        ]
    },
    {
        "id": "inc-005",
        "name": "Koramangala 80ft Road",
        "title": "Koramangala Transit Zone",
        "location": "80ft Road, Koramangala, Bengaluru",
        "zone": "Koramangala",
        "lat": 12.9352,
        "lng": 77.6245,
        "severity": "Moderate",
        "type": "weather",
        "traffic_speed": 26,
        "traffic_speed_change": -20,
        "crowd_density": 390,
        "crowd_density_change": 8,
        "weather_condition": "Heavy Rain",
        "temp_c": 22,
        "detected_at": "27 Sep 2026, 14:18 (14 min ago)",
        "timestamp": "2026-09-27 14:18:00",
        "status": "Rain Advisory",
        "data_sources": ["Weather API"],
        "alert_text": "Heavy rainfall of 12.5 mm/h recorded in Koramangala area.",
        "recommendation": "Activate stormwater pumps and warn commuters of possible waterlogging.",
        "recommended_actions": [
            {"id": "act-1", "text": "Activate drainage pumps", "checked": True},
            {"id": "act-2", "text": "Issue waterlogging advisory", "checked": False}
        ]
    },
    {
        "id": "inc-006",
        "name": "Electronic City Toll Plaza",
        "title": "Electronic City Expressway",
        "location": "Hosur Road Toll Plaza, Bengaluru",
        "zone": "Electronic City",
        "lat": 12.8452,
        "lng": 77.6602,
        "severity": "Moderate",
        "type": "traffic",
        "traffic_speed": 22,
        "traffic_speed_change": -35,
        "crowd_density": 450,
        "crowd_density_change": 15,
        "weather_condition": "Cloudy",
        "temp_c": 25,
        "detected_at": "27 Sep 2026, 14:10 (22 min ago)",
        "timestamp": "2026-09-27 14:10:00",
        "status": "Toll Queue Delay",
        "data_sources": ["Traffic API"],
        "alert_text": "Toll plaza lane bottleneck during peak shift exit.",
        "recommendation": "Open FASTag automated bypass gates and divert light vehicles.",
        "recommended_actions": [
            {"id": "act-1", "text": "Open bypass lanes", "checked": True}
        ]
    }
]

class IntelligenceAnalyzeRequest(BaseModel):
    location: str = "Marathahalli"
    traffic_speed: float = 18.0
    crowd_density: int = 520
    weather: str = "Light Rain"
    timestamp: str = "27 Sep 2026 14:27"

class IncidentReportRequest(BaseModel):
    incident_id: str = "inc-001"
    location: str = "Marathahalli - Outer Ring Road"
    timestamp: str = "27 Sep 2026 14:27"
    selected_actions: List[str] = []

@app.get("/api/map/overview")
def get_map_overview():
    return {
        "city": "Bengaluru",
        "center_lat": 12.9716,
        "center_lng": 77.5946,
        "total_incidents": len(MAP_INCIDENTS_STORE),
        "critical_count": len([i for i in MAP_INCIDENTS_STORE if i["severity"] == "Critical"]),
        "moderate_count": len([i for i in MAP_INCIDENTS_STORE if i["severity"] == "Moderate"]),
        "low_count": len([i for i in MAP_INCIDENTS_STORE if i["severity"] == "Low"]),
        "last_sync": datetime.now().strftime("%d %b %Y %H:%M:%S")
    }

@app.get("/api/map/incidents")
def get_map_incidents():
    return MAP_INCIDENTS_STORE

@app.get("/api/map/incidents/{incident_id}")
def get_map_incident_by_id(incident_id: str):
    inc = next((i for i in MAP_INCIDENTS_STORE if i["id"] == incident_id), None)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@app.get("/api/map/filtered")
def get_map_filtered(
    time_range: Optional[str] = Query("Last 1 Hour"),
    severity: Optional[str] = Query(None),
    data_sources: Optional[str] = Query(None),
    zone: Optional[str] = Query("All Zones")
):
    filtered = MAP_INCIDENTS_STORE.copy()
    
    if zone and zone != "All Zones":
        filtered = [i for i in filtered if i["zone"].lower() == zone.lower() or zone.lower() in i["location"].lower()]
        
    if severity:
        sev_list = [s.strip().lower() for s in severity.split(",")]
        filtered = [i for i in filtered if i["severity"].lower() in sev_list]

    if data_sources:
        src_list = [s.strip().lower() for s in data_sources.split(",")]
        filtered = [i for i in filtered if i["type"].lower() in src_list or any(ds.lower().replace(" api","") in src_list for ds in i["data_sources"])]

    return {
        "time_range": time_range,
        "applied_zone": zone,
        "applied_severity": severity,
        "applied_sources": data_sources,
        "count": len(filtered),
        "incidents": filtered
    }

@app.post("/api/intelligence/analyze")
def analyze_intelligence(req: IntelligenceAnalyzeRequest):
    sev = "Low"
    if req.traffic_speed < 20 or req.crowd_density > 500:
        sev = "Critical"
    elif req.traffic_speed < 35 or req.crowd_density > 350:
        sev = "Moderate"
        
    rec = "Maintain standard automated urban monitoring."
    if req.traffic_speed < 20 and req.crowd_density > 500:
        rec = "Consider diverting traffic to alternative routes. Increased crowd density near bus stops."
    elif req.traffic_speed < 20:
        rec = "Activate signal override on adjacent corridors to clear outflow bottleneck."
    elif req.crowd_density > 500:
        rec = "Deploy auxiliary crowd control officers and extend pedestrian crossing window."

    return {
        "location": req.location,
        "condition": "High Congestion" if req.traffic_speed < 20 else "Normal Flow",
        "severity": sev,
        "confidence": 92.5,
        "contributing_factors": [
            {"factor": "Traffic Speed Drop", "impact_pct": 52.0 if req.traffic_speed < 20 else 10.0},
            {"factor": "Crowd Footfall Density", "impact_pct": 38.0 if req.crowd_density > 500 else 15.0},
            {"factor": "Precipitation Factor", "impact_pct": 20.0 if "rain" in req.weather.lower() else 5.0}
        ],
        "recommendation": rec
    }

@app.post("/api/reports/incident")
def generate_incident_report(req: IncidentReportRequest):
    inc = next((i for i in MAP_INCIDENTS_STORE if i["id"] == req.incident_id), MAP_INCIDENTS_STORE[0])
    
    report_content = f"""================================================================================
URBANPULSE SMART CITY CONTROL ROOM — INCIDENT REPORT
================================================================================
Report ID      : RPT-{uuid.uuid4().hex[:8].upper()}
Generated Time : {datetime.now().strftime('%d %b %Y %H:%M:%S')}
Location       : {inc['location']} ({inc['zone']})
Incident Severity: {inc['severity']}
Current Status : {inc['status']}
Detected At    : {inc['detected_at']}

--------------------------------------------------------------------------------
METRIC SNAPSHOT
--------------------------------------------------------------------------------
- Traffic Average Speed : {inc['traffic_speed']} km/h ({inc['traffic_speed_change']}%)
- Crowd Density        : {inc['crowd_density']} people/km² (+{inc['crowd_density_change']}%)
- Weather Condition     : {inc['weather_condition']} ({inc['temp_c']}°C)
- Data Feeds           : {', '.join(inc['data_sources'])}

--------------------------------------------------------------------------------
AUTOMATED ALERT DETECTED
--------------------------------------------------------------------------------
{inc['alert_text']}

--------------------------------------------------------------------------------
AI INTELLIGENCE RECOMMENDATION
--------------------------------------------------------------------------------
{inc['recommendation']}

--------------------------------------------------------------------------------
OPERATIONAL ACTIONS EXECUTED BY COMMAND CENTER
--------------------------------------------------------------------------------
"""
    if req.selected_actions:
        for act in req.selected_actions:
            report_content += f"  [X] {act}\n"
    else:
        for act in inc.get('recommended_actions', []):
            status_mark = "[X]" if act.get('checked') else "[ ]"
            report_content += f"  {status_mark} {act.get('text')}\n"
            
    report_content += """
================================================================================
END OF REPORT — URBANPULSE AUTHORITY SMART CITY NETWORK
================================================================================
"""
    return {
        "filename": f"UrbanPulse_Incident_{inc['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
        "content_type": "text/plain",
        "report_text": report_content
    }

# -----------------------------------------------------------------------------
# PHASE 3 URBAN SIMULATION & SCENARIO ANALYSIS API ENDPOINTS
# -----------------------------------------------------------------------------

class SimulationRunRequest(BaseModel):
    location: str = "Marathahalli - Outer Ring Road"
    date: str = "27 Sep 2026"
    time: str = "14:30"
    traffic_volume: float = 6500.0
    traffic_volume_unit: str = "vehicles/hour"
    avg_speed: float = 18.0
    avg_speed_unit: str = "km/h"
    crowd_density: float = 520.0
    crowd_density_unit: str = "people/km²"
    weather_condition: str = "Light Rain"
    temp_c: float = 24.0
    road_type: str = "Urban Arterial"
    event_incident: str = "None"

@app.post("/api/simulation/run")
def run_urban_simulation(req: SimulationRunRequest):
    if req.avg_speed < 20 or req.traffic_volume > 6000:
        condition = "High Congestion"
        severity = "High Severity"
        summary_alert = f"Traffic speed is significantly lower than usual due to high traffic volume ({req.traffic_volume:,.0f} {req.traffic_volume_unit}), increased crowd density and {req.weather_condition.lower()}."
        rec = "Consider diverting traffic to alternative routes. Traffic speed is significantly lower than usual and crowd density is increased near bus stops. Implement traffic diversion, enhance public transport frequency, and monitor the situation closely."
    elif req.avg_speed < 35:
        condition = "Moderate Congestion"
        severity = "Moderate Severity"
        summary_alert = f"Traffic flow is experiencing moderate delay with average speed at {req.avg_speed} km/h under {req.weather_condition.lower()}."
        rec = "Extend green signal duration along key corridor and deploy pedestrian marshals near interchanges."
    else:
        condition = "Normal Flow"
        severity = "Low Severity"
        summary_alert = "Traffic parameters and crowd density remain within normal operational thresholds."
        rec = "Maintain automated traffic monitoring and standard signal cycles."

    return {
        "status": "Completed",
        "execution_time_seconds": 6,
        "predicted_condition": condition,
        "severity": severity,
        "summary_alert": summary_alert,
        "metrics": {
            "traffic_speed": f"{req.avg_speed:g} km/h",
            "traffic_speed_sub": "↓ 62% Lower than usual" if req.avg_speed < 20 else "Normal speed",
            "crowd_density": f"{req.crowd_density:g} /km²",
            "crowd_density_sub": "↑ 18% Higher than usual" if req.crowd_density > 400 else "Normal footfall",
            "weather": req.weather_condition,
            "temp": f"{req.temp_c:g}°C",
            "weather_sub": "Possible impact on traffic" if "rain" in req.weather_condition.lower() else "Optimal weather",
            "road_condition": "Slower Flow" if req.avg_speed < 25 else "Free Flow",
            "road_type": req.road_type,
            "road_sub": "Affected by rain" if "rain" in req.weather_condition.lower() else "Clear surface"
        },
        "factors": [
            {"factor": "Traffic Volume", "pct": 42, "color": "#EF4444"},
            {"factor": "Crowd Density", "pct": 27, "color": "#F97316"},
            {"factor": "Rainfall", "pct": 18, "color": "#3B82F6"},
            {"factor": "Time of Day", "pct": 8, "color": "#60A5FA"},
            {"factor": "Road Type", "pct": 5, "color": "#93C5FD"}
        ],
        "explainable_ai": [
            f"Traffic volume ({req.traffic_volume:,.0f} vehicles/hour) is 42% higher than the typical range for this location and time.",
            f"Crowd density ({req.crowd_density:,.0f} people/km²) is 18% higher than usual, indicating increased pedestrian activity.",
            f"{req.weather_condition} ({req.temp_c:g}°C) is reducing road capacity and driving cautious behaviour among drivers.",
            f"The combination of high traffic volume, elevated crowd density and rain leads to a significant reduction in average speed, resulting in {condition.lower()}."
        ],
        "recommendation": rec,
        "recommended_actions": [
            {"text": "Monitor traffic flow continuously", "checked": True},
            {"text": "Consider traffic diversion to parallel routes", "checked": True},
            {"text": "Deploy traffic control personnel at key junctions", "checked": True},
            {"text": "Inform commuters via public channels", "checked": False}
        ]
    }

class SimulationReportRequest(BaseModel):
    location: str
    date: str
    time: str
    predicted_condition: str
    severity: str
    selected_actions: List[str] = []

@app.post("/api/simulation/report")
def generate_simulation_report(req: SimulationReportRequest):
    report_text = f"""================================================================================
URBANPULSE SMART CITY CONTROL ROOM — SCENARIO SIMULATION REPORT
================================================================================
Report ID      : SIM-{uuid.uuid4().hex[:8].upper()}
Simulation Time: {datetime.now().strftime('%d %b %Y %H:%M:%S')}
Location Zone  : {req.location}
Simulated Time : {req.date}, {req.time}
Predicted Urban Condition : {req.predicted_condition} ({req.severity})

--------------------------------------------------------------------------------
SIMULATION EXPLAINABLE AI SUMMARY
--------------------------------------------------------------------------------
- Location Target: {req.location}
- Predicted State: {req.predicted_condition}
- Severity Grade : {req.severity}

--------------------------------------------------------------------------------
RECOMMENDED OPERATIONAL ACTIONS
--------------------------------------------------------------------------------
"""
    for act in req.selected_actions:
        report_text += f"  [X] {act}\n"

    return {
        "filename": f"UrbanPulse_Simulation_{req.location.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
        "content_type": "text/plain",
        "report_text": report_text
    }

# -----------------------------------------------------------------------------
# PHASE 4 URBANPULSE FOCUS LIVE INTELLIGENCE API ENDPOINTS
# -----------------------------------------------------------------------------

FOCUS_LOCATIONS = [
    {"id": "loc-001", "name": "Marathahalli – Outer Ring Road", "subtext": "Bengaluru, Karnataka"},
    {"id": "loc-002", "name": "MG Road Interchange", "subtext": "Bengaluru, Karnataka"},
    {"id": "loc-003", "name": "Indiranagar 100ft Road", "subtext": "Bengaluru, Karnataka"},
    {"id": "loc-004", "name": "Whitefield IT Corridor", "subtext": "Bengaluru, Karnataka"},
    {"id": "loc-005", "name": "Koramangala 80ft Junction", "subtext": "Bengaluru, Karnataka"},
    {"id": "loc-006", "name": "Electronic City Phase 1", "subtext": "Bengaluru, Karnataka"},
    {"id": "loc-007", "name": "Hebbal Flyover Junction", "subtext": "Bengaluru, Karnataka"}
]

ACTION_STATES_STORE = {}

class FocusAnalyzeRequest(BaseModel):
    location_id: str = "loc-001"
    features: List[str] = ["traffic", "crowd", "weather"]

class ActionStatusRequest(BaseModel):
    action_id: str
    status: str
    comment: Optional[str] = None

@app.get("/api/focus/locations")
def get_focus_locations():
    return FOCUS_LOCATIONS

@app.get("/api/focus/live/{location_id}")
def get_focus_live_data(location_id: str):
    loc = next((l for l in FOCUS_LOCATIONS if l["id"] == location_id), FOCUS_LOCATIONS[0])
    inc = next((i for i in MAP_INCIDENTS_STORE if i["zone"].lower() in loc["name"].lower()), MAP_INCIDENTS_STORE[0])
    return {
        "location": loc,
        "timestamp": datetime.now().strftime("%d %b %Y %H:%M:%S"),
        "traffic_speed": inc["traffic_speed"],
        "traffic_speed_change": inc["traffic_speed_change"],
        "traffic_status": "High" if inc["traffic_speed"] < 25 else "Moderate",
        "traffic_volume": 6500,
        "crowd_density": inc["crowd_density"],
        "crowd_density_change": inc["crowd_density_change"],
        "crowd_status": "High" if inc["crowd_density"] > 400 else "Moderate",
        "weather_condition": inc["weather_condition"],
        "weather_status": "Stable",
        "temp_c": inc["temp_c"],
        "rainfall_mm": 3.2,
        "road_condition": "Slower Flow",
        "road_condition_change": 12,
        "road_type": "Urban Arterial"
    }

@app.post("/api/focus/analyze")
def analyze_focus_live(req: FocusAnalyzeRequest):
    loc = next((l for l in FOCUS_LOCATIONS if l["id"] == req.location_id), FOCUS_LOCATIONS[0])
    inc = next((i for i in MAP_INCIDENTS_STORE if i["zone"].lower() in loc["name"].lower()), MAP_INCIDENTS_STORE[0])
    
    feats = [f.lower() for f in req.features]
    
    # Dynamic situation & matched summary calculation
    if "traffic" in feats and "crowd" in feats and "weather" in feats:
        situation = "High Urban Pressure"
        severity = "High"
        confidence = 87
        summary = f"Increasing traffic volume combined with high crowd density and {inc['weather_condition'].lower()} is creating elevated urban pressure at this location."
        key_issue = "High traffic congestion with elevated crowd density."
        key_issue_sub = "The combination of increasing traffic volume and high crowd density with light rainfall is creating significant pressure on mobility at this location."
        why_result = [
            "Traffic volume is 42% above the typical range for this location and time.",
            "Crowd density is significantly elevated, indicating increased pedestrian activity.",
            "Light rainfall may reduce effective road capacity.",
            "The combination of these factors increases the likelihood of high urban pressure."
        ]
    elif "traffic" in feats and "weather" in feats:
        situation = "Wet Weather Congestion"
        severity = "Moderate"
        confidence = 84
        summary = f"Precipitation combined with peak traffic flow is slowing transit speeds along {loc['name']}."
        key_issue = "Precipitation-induced traffic slowdown."
        key_issue_sub = "Rainfall on urban arterial is reducing vehicle speeds by 28% below standard free flow."
        why_result = [
            "Traffic volume is 35% above average baseline.",
            "Rainfall surface slickness is reducing braking distance efficiency.",
            "Reduced vehicle speeds are causing minor queue spillover at main intersections."
        ]
    elif "traffic" in feats and "crowd" in feats:
        situation = "High Pedestrian & Vehicle Conflict"
        severity = "High"
        confidence = 89
        summary = f"High pedestrian footfall near transit stops is bottlenecking vehicular flow along {loc['name']}."
        key_issue = "Pedestrian-vehicle interaction delay."
        key_issue_sub = "Crowd density overflow at arterial crosswalks is delaying outbound vehicular discharge."
        why_result = [
            "Traffic flow volume is exceeding arterial channel capacity.",
            "Crowd density at transit nodes has reached 520 people/km².",
            "Pedestrian crosswalk frequency is impeding traffic flow signal cycles."
        ]
    else:
        situation = "Moderate Operational Load"
        severity = "Moderate"
        confidence = 80
        summary = f"Selected live features ({', '.join(req.features)}) indicate localized operational load at {loc['name']}."
        key_issue = "Localized flow monitoring active."
        key_issue_sub = "Selected telemetry metrics are operating near standard baseline thresholds."
        why_result = [
            f"Selected metrics ({', '.join(req.features)}) show moderate variance from historical baseline.",
            "Corridor telemetry sensors report active continuous monitoring.",
            "Operational thresholds remain within manageable limits."
        ]

    matched_title = " + ".join([f.capitalize() for f in req.features])

    actions_list = [
        {
            "id": f"{req.location_id}_act_1",
            "title": "Traffic Advisory",
            "text": "Traffic is increasing at this location. Communicate congestion information to nearby commuters.",
            "checked": True,
            "status": ACTION_STATES_STORE.get(f"{req.location_id}_act_1", {}).get("status", "Approved"),
            "comments": ACTION_STATES_STORE.get(f"{req.location_id}_act_1", {}).get("comments", [])
        },
        {
            "id": f"{req.location_id}_act_2",
            "title": "Crowd Advisory",
            "text": "Crowd density is increasing. Notify the relevant field team and field marshals.",
            "checked": True,
            "status": ACTION_STATES_STORE.get(f"{req.location_id}_act_2", {}).get("status", "Approved"),
            "comments": ACTION_STATES_STORE.get(f"{req.location_id}_act_2", {}).get("comments", [])
        },
        {
            "id": f"{req.location_id}_act_3",
            "title": "Personnel Dispatch",
            "text": "Deploy traffic control personnel to optimize key intersection discharge.",
            "checked": False,
            "status": ACTION_STATES_STORE.get(f"{req.location_id}_act_3", {}).get("status", "Pending"),
            "comments": ACTION_STATES_STORE.get(f"{req.location_id}_act_3", {}).get("comments", [])
        },
        {
            "id": f"{req.location_id}_act_4",
            "title": "Public Channel Broadcast",
            "text": "Inform commuters through public VMS displays and mobile alert channels.",
            "checked": False,
            "status": ACTION_STATES_STORE.get(f"{req.location_id}_act_4", {}).get("status", "Pending"),
            "comments": ACTION_STATES_STORE.get(f"{req.location_id}_act_4", {}).get("comments", [])
        }
    ]

    return {
        "location": loc,
        "timestamp": datetime.now().strftime("%d %b %Y %H:%M:%S"),
        "situation": situation,
        "severity": severity,
        "confidence": confidence,
        "situation_summary": summary,
        "matched_features_title": matched_title,
        "key_issue": key_issue,
        "key_issue_sub": key_issue_sub,
        "why_result": why_result,
        "actions": actions_list,
        "impact_assessment": [
            {"category": "Mobility", "status": "High" if "traffic" in feats else "Moderate", "level_pct": 85 if "traffic" in feats else 55, "color": "#EF4444" if "traffic" in feats else "#F97316"},
            {"category": "Crowd Movement", "status": "High" if "crowd" in feats else "Moderate", "level_pct": 75 if "crowd" in feats else 45, "color": "#EF4444" if "crowd" in feats else "#F97316"},
            {"category": "Road Condition", "status": "Moderate" if "weather" in feats else "Low", "level_pct": 50 if "weather" in feats else 25, "color": "#F97316" if "weather" in feats else "#059669"},
            {"category": "Public Safety", "status": "Low", "level_pct": 25, "color": "#059669"}
        ],
        "trends": {
            "timestamps": ["12:30", "13:00", "13:30", "14:00", "14:30"],
            "traffic_volume": [3200, 4100, 5300, 6100, 6500],
            "crowd_density": [310, 380, 440, 490, 520],
            "rainfall": [1.0, 2.4, 3.8, 3.2, 2.4]
        }
    }

@app.post("/api/focus/actions/update")
@app.post("/api/focus/actions/{action_id}/approve")
def approve_action(action_id: str, req: Optional[ActionStatusRequest] = None):
    act_id = req.action_id if req and req.action_id else action_id
    if act_id not in ACTION_STATES_STORE:
        ACTION_STATES_STORE[act_id] = {"status": "Approved", "comments": []}
    else:
        ACTION_STATES_STORE[act_id]["status"] = "Approved"
    return {"status": "Approved", "action_id": act_id, "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

@app.post("/api/focus/actions/{action_id}/reject")
def reject_action(action_id: str):
    if action_id not in ACTION_STATES_STORE:
        ACTION_STATES_STORE[action_id] = {"status": "Rejected", "comments": []}
    else:
        ACTION_STATES_STORE[action_id]["status"] = "Rejected"
    return {"status": "Rejected", "action_id": action_id, "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

class CommentPayload(BaseModel):
    comment: str

@app.post("/api/focus/actions/{action_id}/comment")
def add_action_comment(action_id: str, payload: CommentPayload):
    if action_id not in ACTION_STATES_STORE:
        ACTION_STATES_STORE[action_id] = {"status": "Pending", "comments": []}
    if "comments" not in ACTION_STATES_STORE[action_id]:
        ACTION_STATES_STORE[action_id]["comments"] = []
    
    new_comment = {
        "id": f"cmt-{uuid.uuid4().hex[:6]}",
        "comment": payload.comment,
        "timestamp": datetime.now().strftime("%d %b %H:%M")
    }
    ACTION_STATES_STORE[action_id]["comments"].append(new_comment)
    return {"status": "Comment Saved", "action_id": action_id, "comments": ACTION_STATES_STORE[action_id]["comments"]}

# -----------------------------------------------------------------------------
# PHASE 5 PREDICTIVE CALENDAR URBAN INTELLIGENCE ENDPOINTS
# -----------------------------------------------------------------------------

PREDICTIVE_CALENDAR_LOCATIONS = [
    {"id": "loc-all", "name": "Bengaluru (Citywide)"},
    {"id": "loc-001", "name": "Marathahalli – Outer Ring Road"},
    {"id": "loc-002", "name": "MG Road Interchange"},
    {"id": "loc-003", "name": "Indiranagar 100ft Road"},
    {"id": "loc-004", "name": "Whitefield IT Corridor"},
    {"id": "loc-005", "name": "Koramangala 80ft Junction"},
    {"id": "loc-006", "name": "Electronic City Phase 1"},
    {"id": "loc-007", "name": "Silk Board Junction"}
]

PREDICTIVE_EVENTS_DATABASE = [
    {
        "id": "evt-101",
        "date": "2026-09-01",
        "title": "High Traffic Congestion",
        "type": "Traffic Surge",
        "badge_color": "#FEE2E2",
        "text_color": "#EF4444",
        "icon": "🚗",
        "severity": "High",
        "time": "08:00 – 11:00",
        "location": "Marathahalli – Outer Ring Road",
        "confidence": "84%",
        "description": "Increased traffic volume expected due to office commute and ongoing road work.",
        "why": [
            "Historical traffic patterns show 40% higher volume on post-weekend commutes.",
            "Ongoing construction narrows lane capacity by 25%.",
            "Weather models forecast optimal dry pavement encouraging vehicle usage."
        ],
        "impact": [
            {"category": "Mobility", "level": "High", "pct": 85, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "High", "pct": 82, "color": "#EF4444"},
            {"category": "Crowd Movement", "level": "Moderate", "pct": 45, "color": "#F97316"}
        ]
    },
    {
        "id": "evt-103",
        "date": "2026-09-03",
        "title": "Ganesh Visarjan",
        "type": "Festival / Holiday",
        "badge_color": "#D1FAE5",
        "text_color": "#059669",
        "icon": "👥",
        "severity": "High",
        "time": "14:00 – 22:00",
        "location": "MG Road & Ulsoor Lake",
        "confidence": "92%",
        "description": "Large crowd processions expected with major traffic diversions along central arterial corridors.",
        "why": [
            "Annual cultural procession route impacts primary arterial flow.",
            "Municipal crowd telemetry estimates over 15,000 footfall participants.",
            "Police department route closure notifications active."
        ],
        "impact": [
            {"category": "Crowd Movement", "level": "High", "pct": 95, "color": "#EF4444"},
            {"category": "Mobility", "level": "High", "pct": 88, "color": "#EF4444"},
            {"category": "Public Safety", "level": "Moderate", "pct": 60, "color": "#F97316"}
        ]
    },
    {
        "id": "evt-105",
        "date": "2026-09-05",
        "title": "Heavy Rainfall",
        "type": "Weather Impact",
        "badge_color": "#E0F2FE",
        "text_color": "#0284C7",
        "icon": "☁️",
        "severity": "Moderate",
        "time": "15:00 – 19:00",
        "location": "Bengaluru (Citywide)",
        "confidence": "78%",
        "description": "IMD monsoon satellite forecast indicates localized heavy showers leading to temporary waterlogging.",
        "why": [
            "IMD radar tracks cloud cluster moving west to east across central zones.",
            "Historical drainage capacity limits cause localized speed reduction of 30%."
        ],
        "impact": [
            {"category": "Road Condition", "level": "Moderate", "pct": 65, "color": "#F97316"},
            {"category": "Traffic Flow", "level": "Moderate", "pct": 58, "color": "#F97316"}
        ]
    },
    {
        "id": "evt-107",
        "date": "2026-09-07",
        "title": "Tech Summit",
        "type": "Public Event",
        "badge_color": "#F3E8FF",
        "text_color": "#7C3AED",
        "icon": "🏢",
        "severity": "Moderate",
        "time": "09:00 – 18:00",
        "location": "Whitefield IT Corridor",
        "confidence": "88%",
        "description": "International technology conference causing increased VIP motorcade and shuttle bus density.",
        "why": [
            "Conference delegate registration exceeds 8,000 attendees.",
            "Shuttle bus frequency increased to 5-minute intervals along KTPO access routes."
        ],
        "impact": [
            {"category": "Traffic Flow", "level": "Moderate", "pct": 60, "color": "#F97316"},
            {"category": "Crowd Movement", "level": "Moderate", "pct": 52, "color": "#F97316"}
        ]
    },
    {
        "id": "evt-109",
        "date": "2026-09-09",
        "title": "Traffic Surge",
        "type": "Traffic Surge",
        "badge_color": "#FEE2E2",
        "text_color": "#EF4444",
        "icon": "🚗",
        "severity": "High",
        "time": "17:00 – 20:30",
        "location": "Silk Board Junction",
        "confidence": "85%",
        "description": "Heavy evening peak hour congestion bottlenecking Hosur Road flyover discharge.",
        "why": [
            "Mid-week office return rush overlaps with intercity bus departure schedule.",
            "Signal queue length projected to reach 1.8 km during peak 18:30 window."
        ],
        "impact": [
            {"category": "Mobility", "level": "High", "pct": 84, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "High", "pct": 89, "color": "#EF4444"}
        ]
    },
    {
        "id": "evt-111",
        "date": "2026-09-11",
        "title": "Large Crowd",
        "type": "Large Crowd",
        "badge_color": "#DBEAFE",
        "text_color": "#2563EB",
        "icon": "👥",
        "severity": "Moderate",
        "time": "18:00 – 23:00",
        "location": "Indiranagar 100ft Road",
        "confidence": "81%",
        "description": "Friday evening commercial activity and dining footfall leading to dense pedestrian movement.",
        "why": [
            "Weekend eve footfall index reaches 3x normal weekday baseline.",
            "Valet parking vehicles causing curb lane occupancy."
        ],
        "impact": [
            {"category": "Crowd Movement", "level": "Moderate", "pct": 68, "color": "#F97316"}
        ]
    },
    {
        "id": "evt-114",
        "date": "2026-09-14",
        "title": "Road Work",
        "type": "Road Work",
        "badge_color": "#FFEDD5",
        "text_color": "#EA580C",
        "icon": "⚠️",
        "severity": "Moderate",
        "time": "22:00 – 06:00",
        "location": "Koramangala 80ft Road",
        "confidence": "95%",
        "description": "Scheduled BWSSB pipe replacement requiring single lane diversion.",
        "why": ["Official municipal work permit issued for nocturnal pipe laying."],
        "impact": [{"category": "Road Condition", "level": "Moderate", "pct": 55, "color": "#F97316"}]
    },
    {
        "id": "evt-116",
        "date": "2026-09-16",
        "title": "Rainfall Impact",
        "type": "Weather Impact",
        "badge_color": "#E0F2FE",
        "text_color": "#0284C7",
        "icon": "☁️",
        "severity": "Moderate",
        "time": "14:00 – 18:00",
        "location": "Hebbal Flyover Junction",
        "confidence": "75%",
        "description": "Precipitation slickness reducing average travel speeds along airport link road.",
        "why": ["Monsoon trough alignment generating moderate afternoon showers."],
        "impact": [{"category": "Traffic Flow", "level": "Moderate", "pct": 50, "color": "#F97316"}]
    },
    {
        "id": "evt-118",
        "date": "2026-09-18",
        "title": "High Traffic",
        "type": "Traffic Surge",
        "badge_color": "#FEE2E2",
        "text_color": "#EF4444",
        "icon": "🚗",
        "severity": "High",
        "time": "16:30 – 19:30",
        "location": "Electronic City Phase 1",
        "confidence": "86%",
        "description": "Pre-weekend exodus creating heavy tailbacks at elevated expressway toll plazas.",
        "why": ["Friday departure volume surges 45% above typical daily average."],
        "impact": [{"category": "Mobility", "level": "High", "pct": 82, "color": "#EF4444"}]
    },
    {
        "id": "evt-119",
        "date": "2026-09-19",
        "title": "Weekend Rush",
        "type": "Festival / Holiday",
        "badge_color": "#D1FAE5",
        "text_color": "#059669",
        "icon": "👥",
        "severity": "Moderate",
        "time": "11:00 – 21:00",
        "location": "Commercial Street & MG Road",
        "confidence": "83%",
        "description": "High shopping footfall and dense pedestrian crosswalk activity.",
        "why": ["Weekend retail shoppers surge in central business district."],
        "impact": [{"category": "Crowd Movement", "level": "Moderate", "pct": 65, "color": "#F97316"}]
    },
    {
        "id": "evt-121",
        "date": "2026-09-21",
        "title": "Cricket Match",
        "type": "Public Event",
        "badge_color": "#DBEAFE",
        "text_color": "#2563EB",
        "icon": "🏏",
        "severity": "High",
        "time": "16:00 – 23:30",
        "location": "Chinnaswamy Stadium",
        "confidence": "94%",
        "description": "T20 Cricket match attracting 35,000 spectators to Cubbon Road area.",
        "why": ["Ticket sales confirmed sold out for stadium venue."],
        "impact": [{"category": "Crowd Movement", "level": "High", "pct": 92, "color": "#EF4444"}]
    },
    {
        "id": "evt-123",
        "date": "2026-09-23",
        "title": "Traffic Surge",
        "type": "Traffic Surge",
        "badge_color": "#FEE2E2",
        "text_color": "#EF4444",
        "icon": "🚗",
        "severity": "High",
        "time": "08:30 – 11:30",
        "location": "Marathahalli Bridge",
        "confidence": "87%",
        "description": "Morning peak hour congestion surge along Outer Ring Road arterial.",
        "why": ["High density commuting traffic merging from Varthur road."],
        "impact": [{"category": "Traffic Flow", "level": "High", "pct": 84, "color": "#EF4444"}]
    },
    # --- 24 SEPTEMBER 2026 (SELECTED DATE IN REFERENCE UI) ---
    {
        "id": "evt-24-1",
        "date": "2026-09-24",
        "title": "High Traffic Congestion",
        "type": "Traffic Surge",
        "badge_color": "#FEE2E2",
        "text_color": "#EF4444",
        "icon": "🚗",
        "severity": "High",
        "time": "08:00 – 11:00",
        "location": "Marathahalli – Outer Ring Road",
        "confidence": "84%",
        "description": "Increased traffic volume expected due to office commute and ongoing road work.",
        "why": [
            "Historical traffic patterns show 42% higher volume for this location and time window.",
            "Ongoing utility pipe work restricts width to 2 lanes.",
            "Weather forecast indicates light rain which causes drivers to maintain higher safety distance."
        ],
        "impact": [
            {"category": "Mobility", "level": "High", "pct": 85, "color": "#EF4444"},
            {"category": "Traffic Flow", "level": "High", "pct": 80, "color": "#EF4444"},
            {"category": "Crowd Movement", "level": "Moderate", "pct": 50, "color": "#F97316"}
        ]
    },
    {
        "id": "evt-24-2",
        "date": "2026-09-24",
        "title": "Large Crowd Expected",
        "type": "Large Crowd",
        "badge_color": "#DBEAFE",
        "text_color": "#2563EB",
        "icon": "👥",
        "severity": "Moderate",
        "time": "16:00 – 20:00",
        "location": "MG Road",
        "confidence": "82%",
        "description": "High crowd density expected due to public event in the area.",
        "why": [
            "Promotional outdoor launch event scheduled at MG Road plaza.",
            "Footfall sensors project peak 650 people/km² between 17:00 and 19:00."
        ],
        "impact": [
            {"category": "Crowd Movement", "level": "Moderate", "pct": 65, "color": "#F97316"},
            {"category": "Mobility", "level": "Moderate", "pct": 55, "color": "#F97316"}
        ]
    },
    {
        "id": "evt-24-3",
        "date": "2026-09-24",
        "title": "Rainfall Impact",
        "type": "Weather Impact",
        "badge_color": "#E0F2FE",
        "text_color": "#0284C7",
        "icon": "☁️",
        "severity": "Moderate",
        "time": "14:00 – 18:00",
        "location": "Bengaluru (Citywide)",
        "confidence": "76%",
        "description": "Possibility of moderate rainfall. May affect traffic and outdoor events.",
        "why": [
            "Convective cloud development observed over Bangalore South.",
            "Expected precipitation rate: 3.2 mm/hour."
        ],
        "impact": [
            {"category": "Road Condition", "level": "Moderate", "pct": 50, "color": "#F97316"}
        ]
    },
    {
        "id": "evt-126",
        "date": "2026-09-26",
        "title": "Music Festival",
        "type": "Public Event",
        "badge_color": "#F3E8FF",
        "text_color": "#7C3AED",
        "icon": "🎵",
        "severity": "High",
        "time": "15:00 – 23:00",
        "location": "Palace Grounds",
        "confidence": "90%",
        "description": "Major international concert expected to draw 25,000 attendees to Bellary Road.",
        "why": ["Concert ticket venue pass scan count reaches max capacity."],
        "impact": [{"category": "Crowd Movement", "level": "High", "pct": 90, "color": "#EF4444"}]
    },
    {
        "id": "evt-127",
        "date": "2026-09-27",
        "title": "Heavy Rainfall",
        "type": "Weather Impact",
        "badge_color": "#E0F2FE",
        "text_color": "#0284C7",
        "icon": "☁️",
        "severity": "Moderate",
        "time": "13:00 – 17:00",
        "location": "Bengaluru (Citywide)",
        "confidence": "80%",
        "description": "Widespread monsoon showers leading to slower traffic across key underpasses.",
        "why": ["IMD doppler weather radar confirms active rain band."],
        "impact": [{"category": "Road Condition", "level": "Moderate", "pct": 60, "color": "#F97316"}]
    },
    {
        "id": "evt-129",
        "date": "2026-09-29",
        "title": "High Traffic",
        "type": "Traffic Surge",
        "badge_color": "#FEE2E2",
        "text_color": "#EF4444",
        "icon": "🚗",
        "severity": "High",
        "time": "08:00 – 11:00",
        "location": "Tin Factory Junction",
        "confidence": "88%",
        "description": "Severe congestion bottleneck connecting K.R. Puram and ORR arterial routes.",
        "why": ["High heavy commercial vehicle merging traffic on flyover slope."],
        "impact": [{"category": "Traffic Flow", "level": "High", "pct": 87, "color": "#EF4444"}]
    }
]

UPCOMING_PREDICTIONS_LIST = [
    {
        "date": "28 Sep 2026",
        "date_iso": "2026-09-28",
        "event": "High Traffic Congestion",
        "icon": "🚗",
        "type": "Traffic Surge",
        "type_icon": "🚗",
        "location": "Silk Board",
        "impact": "Increased travel time (20–40 min)",
        "severity": "High",
        "severity_color": "#EF4444"
    },
    {
        "date": "2 Oct 2026",
        "date_iso": "2026-10-02",
        "event": "Dasara Celebrations",
        "icon": "👥",
        "type": "Festival",
        "type_icon": "👥",
        "location": "Bengaluru (Citywide)",
        "impact": "Large crowd movement",
        "severity": "High",
        "severity_color": "#EF4444"
    },
    {
        "date": "7 Oct 2026",
        "date_iso": "2026-10-07",
        "event": "Tech Conference",
        "icon": "🏢",
        "type": "Public Event",
        "type_icon": "🏢",
        "location": "Whitefield",
        "impact": "Increased traffic and crowd",
        "severity": "Moderate",
        "severity_color": "#F97316"
    },
    {
        "date": "12 Oct 2026",
        "date_iso": "2026-10-12",
        "event": "Heavy Rainfall",
        "icon": "☁️",
        "type": "Weather Impact",
        "type_icon": "☁️",
        "location": "Bengaluru (Citywide)",
        "impact": "Slower traffic, possible waterlogging",
        "severity": "Moderate",
        "severity_color": "#F97316"
    }
]

@app.get("/api/predictive-calendar/locations")
def get_predictive_locations():
    return PREDICTIVE_CALENDAR_LOCATIONS

@app.get("/api/predictive-calendar/events")
def get_predictive_events(
    month: str = Query("2026-09"),
    location: str = Query("all"),
    event_type: str = Query("all"),
    severity: str = Query("all"),
    search: str = Query("")
):
    filtered = PREDICTIVE_EVENTS_DATABASE.copy()

    # Month filter (e.g. "2026-09")
    if month and month != "all":
        filtered = [e for e in filtered if e["date"].startswith(month)]

    # Location filter
    if location and location != "all" and location != "loc-all":
        loc_obj = next((l for l in PREDICTIVE_CALENDAR_LOCATIONS if l["id"] == location), None)
        loc_name = loc_obj["name"].lower() if loc_obj else location.lower()
        filtered = [e for e in filtered if loc_name in e["location"].lower() or "citywide" in e["location"].lower()]

    # Event Type filter
    if event_type and event_type != "all":
        filtered = [e for e in filtered if event_type.lower() in e["type"].lower()]

    # Severity filter
    if severity and severity != "all":
        filtered = [e for e in filtered if e["severity"].lower() == severity.lower()]

    # Search filter
    if search:
        q = search.lower()
        filtered = [
            e for e in filtered if
            q in e["title"].lower() or
            q in e["location"].lower() or
            q in e["type"].lower() or
            q in e["description"].lower()
        ]

    return {
        "month": month,
        "count": len(filtered),
        "events": filtered
    }

@app.get("/api/predictive-calendar/date/{date_str}")
def get_predictive_events_by_date(date_str: str):
    events = [e for e in PREDICTIVE_EVENTS_DATABASE if e["date"] == date_str]
    return {
        "date": date_str,
        "count": len(events),
        "events": events
    }

@app.get("/api/predictive-calendar/upcoming")
def get_upcoming_predictions():
    return UPCOMING_PREDICTIONS_LIST





