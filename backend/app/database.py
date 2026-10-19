"""
UrbanPulse Phase 2 Database Schema Definition
PostgreSQL / PostGIS Target Architecture Definition & SQLAlchemy Data Models
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, text
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

Base = declarative_base()

class DataSourceModel(Base):
    __tablename__ = "data_sources"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    source_type = Column(String(50), nullable=False) # Dataset, Traffic API, Weather API, Crowd API, Project Telemetry API
    description = Column(Text, nullable=True)
    endpoint_url = Column(String(255), nullable=True)
    api_key_hash = Column(String(255), nullable=True) # Encrypted secret storage
    data_format = Column(String(50), default="CSV")
    location_format = Column(String(50), default="Lat/Lon")
    timestamp_format = Column(String(50), default="YYYY-MM-DD HH:MM:SS")
    refresh_interval_sec = Column(Integer, default=60)
    enabled = Column(Boolean, default=True)
    status = Column(String(50), default="Configured")
    created_at = Column(DateTime, default=datetime.utcnow)

class DatasetModel(Base):
    __tablename__ = "datasets"
    
    id = Column(String(50), primary_key=True)
    filename = Column(String(150), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    total_records = Column(Integer, default=0)
    total_columns = Column(Integer, default=0)
    missing_pct = Column(Float, default=0.0)
    duplicate_rows = Column(Integer, default=0)
    is_processed = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    columns = relationship("DatasetColumnModel", back_populates="dataset", cascade="all, delete-orphan")

class DatasetColumnModel(Base):
    __tablename__ = "dataset_columns"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String(50), ForeignKey("datasets.id"), nullable=False)
    raw_column_name = Column(String(100), nullable=False)
    detected_data_type = Column(String(50), nullable=False)
    canonical_mapped_field = Column(String(50), nullable=True)
    is_required = Column(Boolean, default=False)
    
    dataset = relationship("DatasetModel", back_populates="columns")

class RawObservationModel(Base):
    __tablename__ = "raw_observations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(String(50), ForeignKey("data_sources.id"), nullable=False)
    dataset_id = Column(String(50), ForeignKey("datasets.id"), nullable=True)
    raw_payload_json = Column(JSON, nullable=False)
    ingested_at = Column(DateTime, default=datetime.utcnow)

class ProcessedObservationModel(Base):
    __tablename__ = "processed_observations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(String(50), ForeignKey("data_sources.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    corridor_id = Column(String(50), nullable=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    # PostGIS geography point field representation: Point(longitude, latitude)
    location_geom = Column(String(100), nullable=True) 
    crowd_count = Column(Integer, nullable=True)
    crowd_density = Column(Float, nullable=True)
    traffic_speed = Column(Float, nullable=True)
    precipitation = Column(Float, nullable=True)
    processing_status = Column(String(50), default="STANDARDIZED")
    created_at = Column(DateTime, default=datetime.utcnow)

class TelemetryConfigModel(Base):
    __tablename__ = "telemetry_config"
    
    id = Column(String(50), primary_key=True)
    mode = Column(String(50), default="Replay") # Historical Dataset, Replay / Simulated, Live
    source_dataset_id = Column(String(50), ForeignKey("datasets.id"), nullable=True)
    replay_interval_sec = Column(Integer, default=5)
    status = Column(String(50), default="Stopped") # Running, Paused, Stopped
    records_processed = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)

class IngestionLogModel(Base):
    __tablename__ = "ingestion_logs"
    
    id = Column(String(50), primary_key=True)
    source_name = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    records_received = Column(Integer, default=0)
    records_accepted = Column(Integer, default=0)
    records_rejected = Column(Integer, default=0)
    processing_status = Column(String(50), nullable=False)
    message = Column(Text, nullable=True)

class AlertModel(Base):
    __tablename__ = "alerts"
    
    id = Column(String(50), primary_key=True)
    alert_type = Column(String(50), nullable=False) # traffic, rainfall, crowd, road_blockage, transit, power, accident, waterlogging, event, road_work
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False) # Critical, High, Moderate, Low
    status = Column(String(20), default="Active") # Active, Acknowledged, Resolved, Expired
    location = Column(String(150), nullable=False)
    location_id = Column(String(50), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    source = Column(String(100), nullable=False)
    camera_feed_url = Column(String(255), nullable=True)
    camera_feed_label = Column(String(255), nullable=True)
    time_str = Column(String(20), nullable=True) # e.g. "14:31"
    detected_at = Column(String(100), nullable=False)
    updated_at = Column(String(100), nullable=False)
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(String(100), nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(String(100), nullable=True)
    resolved_by = Column(String(100), nullable=True)
    assigned_to = Column(String(150), nullable=True)
    assigned_to_id = Column(String(50), nullable=True)
    recipient_email = Column(String(150), nullable=True)
    assignment_status = Column(String(50), nullable=True) # None, Sent, Delivered, Failed
    assigned_at = Column(String(100), nullable=True)
    impact_data = Column(JSON, nullable=True)
    related_info = Column(JSON, nullable=True)
    telemetry_metrics = Column(JSON, nullable=True)
    is_escalated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AlertUpdateModel(Base):
    __tablename__ = "alert_updates"
    
    id = Column(String(50), primary_key=True)
    alert_id = Column(String(50), ForeignKey("alerts.id"), nullable=False)
    timestamp = Column(String(20), nullable=False)
    text = Column(Text, nullable=False)
    dot_color = Column(String(20), default="red") # red, blue, orange, green

class AlertCommentModel(Base):
    __tablename__ = "alert_comments"
    
    id = Column(String(50), primary_key=True)
    alert_id = Column(String(50), ForeignKey("alerts.id"), nullable=False)
    user = Column(String(100), nullable=False)
    comment = Column(Text, nullable=False)
    timestamp = Column(String(100), nullable=False)

class AuthorityModel(Base):
    __tablename__ = "authorities"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    department = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=True)

class ReportModel(Base):
    __tablename__ = "reports"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    report_type = Column(String(50), nullable=False) # Traffic, Crowd, Weather, Alert, Scenario, Focus, Calendar, Combined, Student Service, Public Transport
    source = Column(String(50), nullable=False) # Dashboard, Focus, Predictive Calendar, Alerts & Incidents, Scenario Analysis, System, Student Service, Uploaded
    location = Column(String(100), nullable=False)
    created_by = Column(String(100), default="Admin")
    date_time = Column(String(50), nullable=False) # e.g. "27 Sep 2026 14:20"
    status = Column(String(50), default="Available") # Available, Generated, Downloaded, Submitted, Archived, Processing
    file_format = Column(String(20), default="PDF")
    file_size = Column(String(20), default="2.4 MB")
    file_path = Column(String(255), nullable=True)
    download_count = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    preview_data = Column(JSON, nullable=True)
    submission_info = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReportDownloadModel(Base):
    __tablename__ = "report_downloads"
    
    id = Column(String(50), primary_key=True)
    report_id = Column(String(50), ForeignKey("reports.id"), nullable=False)
    user = Column(String(100), nullable=False)
    downloaded_at = Column(String(50), nullable=False)
    file_format = Column(String(20), default="PDF")

class ReportActivityModel(Base):
    __tablename__ = "report_activities"
    
    id = Column(String(50), primary_key=True)
    report_id = Column(String(50), ForeignKey("reports.id"), nullable=False)
    action = Column(String(50), nullable=False) # Created, Generated, Uploaded, Viewed, Downloaded, Submitted, Archived
    user = Column(String(100), nullable=False)
    timestamp = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)

class SettingsDatasetModel(Base):
    __tablename__ = "settings_datasets"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    filename = Column(String(150), nullable=False)
    format = Column(String(20), nullable=False) # XLSX, CSV, PDF, JSON, ZIP, PARQUET
    size_bytes = Column(Integer, nullable=False)
    size_display = Column(String(50), nullable=False)
    source = Column(String(100), nullable=False)
    uploaded_by = Column(String(100), default="Admin")
    upload_date = Column(String(50), nullable=False)
    status = Column(String(50), default="Processed") # Processed, Processing, Warning, Failed
    description = Column(Text, nullable=True)
    original_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)
    total_columns = Column(Integer, default=0)
    raw_file_path = Column(String(255), nullable=True)
    processed_file_path = Column(String(255), nullable=True)
    preprocessing_summary = Column(JSON, nullable=True)
    columns_meta = Column(JSON, nullable=True)
    preview_rows = Column(JSON, nullable=True)
    processing_logs = Column(JSON, nullable=True)
    related_models = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SettingsTrainedModel(Base):
    __tablename__ = "settings_trained_models"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    version = Column(String(50), nullable=False)
    algorithm = Column(String(100), nullable=False) # RandomForestClassifier or RandomForestRegressor
    dataset_id = Column(String(50), nullable=False)
    dataset_name = Column(String(150), nullable=False)
    target_column = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=False) # classification or regression
    feature_columns = Column(JSON, nullable=False)
    hyperparameters = Column(JSON, nullable=False)
    record_count = Column(Integer, default=0)
    feature_count = Column(Integer, default=0)
    training_duration = Column(String(50), default="2.1s")
    status = Column(String(50), default="Active") # Active, Archived, Candidate
    metrics = Column(JSON, nullable=False)
    feature_importance = Column(JSON, nullable=False)
    training_logs = Column(JSON, nullable=True)
    trained_at = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SettingsDataSourceModel(Base):
    __tablename__ = "settings_data_sources"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    source_type = Column(String(50), nullable=False)
    endpoint_url = Column(String(255), nullable=False)
    status = Column(String(50), default="Connected") # Connected, Degraded, Idle
    last_sync = Column(String(50), nullable=False)
    last_error = Column(String(255), nullable=True)
    refresh_interval_sec = Column(Integer, default=60)
    enabled = Column(Boolean, default=True)
    config_json = Column(JSON, nullable=True)

class SettingsSystemConfigModel(Base):
    __tablename__ = "settings_system_config"
    
    id = Column(String(50), primary_key=True)
    default_city = Column(String(100), default="Bengaluru")
    telemetry_refresh_sec = Column(Integer, default=2)
    prediction_horizon_hours = Column(Integer, default=6)
    prediction_confidence_min = Column(Float, default=75.0)
    alert_threshold_critical = Column(Float, default=85.0)
    alert_threshold_high = Column(Float, default=70.0)
    alert_threshold_moderate = Column(Float, default=50.0)
    dataset_retention_days = Column(Integer, default=90)
    auto_retrain_enabled = Column(Boolean, default=False)
    notification_channels = Column(JSON, nullable=True)
    updated_at = Column(String(50), nullable=False)

class SettingsAuditLogModel(Base):
    __tablename__ = "settings_audit_logs"
    
    id = Column(String(50), primary_key=True)
    user = Column(String(100), default="Admin")
    action = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(String(50), nullable=False)
    status = Column(String(50), default="SUCCESS")

class CivicComplaintModel(Base):
    __tablename__ = "civic_complaints"
    
    id = Column(String(50), primary_key=True) # e.g. BBMP-2026-1042
    ticket_number = Column(String(50), unique=True, index=True, nullable=False)
    category = Column(String(50), nullable=False) # Pothole/Road Damage, Garbage/Waste, Water Leakage, Drainage, Streetlight Failure, Traffic Hazard, Other
    subcategory = Column(String(100), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    urgency = Column(String(30), default="Moderate") # Low, Moderate, High, Critical
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    landmark_address = Column(String(255), nullable=True)
    ward_zone = Column(String(100), nullable=True)
    image_url = Column(String(255), nullable=True)
    image_filename = Column(String(255), nullable=True)
    citizen_name = Column(String(100), nullable=True)
    citizen_phone = Column(String(50), nullable=True)
    citizen_email = Column(String(100), nullable=True)
    is_anonymous = Column(Boolean, default=False)
    status = Column(String(50), default="Submitted") # Submitted, Under Review, Assigned, Crew Dispatched, In Progress, Resolved, Rejected, Reopened
    assigned_authority = Column(String(150), nullable=False)
    assigned_department = Column(String(150), nullable=True) # e.g. BBMP Road Infrastructure Cell
    assigned_squad = Column(String(150), nullable=True) # e.g. Rapid Patch Squad Alpha
    assigned_officer = Column(String(150), nullable=True) # e.g. Eng. R. Kumar (BBMP East)
    sla_hours = Column(Integer, default=24)
    dispatch_timestamp = Column(DateTime, nullable=True)
    dispatch_eta = Column(String(100), nullable=True)
    dispatch_notes = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolution_image_url = Column(String(255), nullable=True)
    resolution_timestamp = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    reopen_reason = Column(Text, nullable=True)
    reopen_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class CivicComplaintAuditLogModel(Base):
    __tablename__ = "civic_complaint_audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_number = Column(String(50), index=True, nullable=False)
    actor_name = Column(String(100), nullable=False, default="System")
    actor_role = Column(String(50), nullable=False, default="System") # Authority Officer, Citizen, Field Squad, System
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False) # SUBMITTED, REVIEWED, ASSIGNED, DISPATCHED, IN_PROGRESS, RESOLVED, REJECTED, REOPENED
    notes = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class CivicNotificationLogModel(Base):
    __tablename__ = "civic_notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_number = Column(String(50), index=True, nullable=False)
    recipient_type = Column(String(50), nullable=False) # Citizen, Department Squad, Ward Officer
    recipient_contact = Column(String(100), nullable=True)
    channel = Column(String(20), default="PORTAL_ALERT") # SMS, EMAIL, PORTAL_ALERT, SQUAD_DISPATCH
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(30), default="SENT")
    sent_at = Column(DateTime, default=datetime.utcnow)

class UserModel(Base):
    __tablename__ = "users"
    
    id = Column(String(50), primary_key=True) # UUID or off-xxxx
    email = Column(String(150), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True) # e.g. 01kaaysha
    badge_id = Column(String(50), unique=True, index=True, nullable=True)
    full_name = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    department = Column(String(150), nullable=False, default="BBMP Road Infrastructure Cell")
    role = Column(String(50), nullable=False, default="citizen") # admin, officer, supervisor, operator, citizen
    clearance = Column(String(100), default="Standard Civic Access Level 1")
    assigned_zone = Column(String(100), default="Bengaluru Metropolitan Area")
    phone = Column(String(50), unique=True, index=True, nullable=True)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    verification_otp = Column(String(10), nullable=True)
    verification_otp_expires = Column(DateTime, nullable=True)
    reset_token = Column(String(100), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    auth_provider = Column(String(30), default="local") # local, google, supabase
    google_id = Column(String(150), nullable=True, index=True)
    avatar_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Database Engine Setup (Supports SQLite local dev & Supabase / Render PostgreSQL)
RAW_DB_URL = os.getenv("DATABASE_URL", "sqlite:///./urbanpulse_dev.db")

# Automatically route to postgresql+psycopg2:// if no driver specified
if RAW_DB_URL.startswith("postgres://"):
    DB_URL = RAW_DB_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif RAW_DB_URL.startswith("postgresql://") and not RAW_DB_URL.startswith("postgresql+"):
    DB_URL = RAW_DB_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    DB_URL = RAW_DB_URL

def create_db_engine(url: str):
    if "sqlite" in url:
        return create_engine(url, connect_args={"check_same_thread": False})
    
    connect_args = {}
    if "sslmode" not in url and "supabase" in url.lower():
        connect_args["sslmode"] = "require"
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        connect_args=connect_args
    )

# Resilient Engine Initialization: try primary URL, then psycopg, then fallback to SQLite
try:
    engine = create_db_engine(DB_URL)
except Exception as e:
    print(f"[UrbanPulse Database] Primary engine initialization note ({DB_URL}): {e}")
    fallback_success = False
    for alt_prefix in ["postgresql+psycopg://", "postgresql://"]:
        try:
            alt_url = RAW_DB_URL.replace("postgres://", alt_prefix, 1).replace("postgresql://", alt_prefix, 1)
            engine = create_db_engine(alt_url)
            DB_URL = alt_url
            fallback_success = True
            break
        except Exception:
            continue
    if not fallback_success:
        print("[UrbanPulse Database] Engaging resilient SQLite fallback.")
        DB_URL = "sqlite:///./urbanpulse_dev.db"
        engine = create_engine(DB_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[UrbanPulse Database] Schema initialization note: {e}")
        return
    
    # Safe SQLite column migration for civic_complaints table (only run on SQLite)
    if "sqlite" in DB_URL:
        try:
            with engine.connect() as conn:
                result = conn.execute(text("PRAGMA table_info(civic_complaints)"))
                existing_cols = {row[1] for row in result.fetchall()}
                
                new_columns = [
                    ("assigned_department", "VARCHAR(150)"),
                    ("assigned_squad", "VARCHAR(150)"),
                    ("assigned_officer", "VARCHAR(150)"),
                    ("dispatch_timestamp", "DATETIME"),
                    ("dispatch_eta", "VARCHAR(100)"),
                    ("dispatch_notes", "TEXT"),
                    ("resolution_image_url", "VARCHAR(255)"),
                    ("rejection_reason", "TEXT"),
                    ("reopen_reason", "TEXT"),
                    ("reopen_count", "INTEGER DEFAULT 0"),
                ]
                for col_name, col_type in new_columns:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE civic_complaints ADD COLUMN {col_name} {col_type}"))

                # Safe SQLite column migration for users table
                result_users = conn.execute(text("PRAGMA table_info(users)"))
                existing_user_cols = {row[1] for row in result_users.fetchall()}
                new_user_cols = [
                    ("username", "VARCHAR(100)"),
                    ("email_verified", "BOOLEAN DEFAULT 0"),
                    ("phone_verified", "BOOLEAN DEFAULT 0"),
                    ("verification_otp", "VARCHAR(10)"),
                    ("verification_otp_expires", "DATETIME"),
                    ("reset_token", "VARCHAR(100)"),
                    ("reset_token_expires", "DATETIME"),
                    ("auth_provider", "VARCHAR(30) DEFAULT 'local'"),
                    ("google_id", "VARCHAR(150)"),
                    ("avatar_url", "VARCHAR(255)")
                ]
                for col_name, col_type in new_user_cols:
                    if col_name not in existing_user_cols:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))

                conn.commit()
        except Exception as e:
            print(f"Database schema migration note: {e}")



