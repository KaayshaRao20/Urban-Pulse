"""
UrbanPulse Phase 2 Database Schema Definition
PostgreSQL / PostGIS Target Architecture Definition & SQLAlchemy Data Models
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
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

# Database Engine Setup
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./urbanpulse_dev.db")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)



