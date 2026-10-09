# UrbanPulse – Smart City Monitoring & Response Network
## Phase 2: PostgreSQL / PostGIS Database Design & Relational Schema

---

## 1. Database Architecture & Relational ERD Summary

UrbanPulse uses **PostgreSQL 16** with the **PostGIS** extension as its primary relational and geospatial database engine. 

```
+--------------------+        +--------------------+        +------------------------+
|    data_sources    |        |      datasets      |        |    dataset_columns     |
+--------------------+        +--------------------+        +------------------------+
| id (PK)            |<-------| id (PK)            |<-------| id (PK)                |
| name               |        | filename           |        | dataset_id (FK)        |
| source_type        |        | total_records      |        | raw_column_name        |
| endpoint_url       |        | missing_pct        |        | canonical_mapped_field |
| refresh_interval   |        +--------------------+        +------------------------+
+--------------------+                   |
          |                              |
          v                              v
+--------------------+        +------------------------+    +------------------------+
|  raw_observations  |        | processed_observations |    |     ingestion_logs     |
+--------------------+        +------------------------+    +------------------------+
| id (PK)            |        | id (PK)                |    | id (PK)                |
| source_id (FK)     |        | source_id (FK)         |    | source_name            |
| raw_payload_json   |        | timestamp (Idx)        |    | records_received       |
| ingested_at        |        | latitude, longitude    |    | records_accepted       |
+--------------------+        | location_geom (PostGIS)|    | processing_status      |
                              | crowd_count, density   |    +------------------------+
                              +------------------------+
```

---

## 2. Table Specifications

### 2.1 Table: `data_sources`
Stores registry metadata for external APIs, dataset sources, and telemetry feeds.

### 2.2 Table: `datasets`
Tracks uploaded CSV file attributes, record counts, missingness %, and processing status.

### 2.3 Table: `dataset_columns`
Stores column schema mappings (`raw_column_name` &rarr; `canonical_mapped_field`).

### 2.4 Table: `raw_observations`
Preserves raw, uncleaned JSON/CSV payloads for data lineage and auditing.

### 2.5 Table: `processed_observations`
Unified Data Layer table storing standardized spatio-temporal observations. Uses PostGIS `geography(Point, 4326)` for `location_geom`.

### 2.6 Table: `telemetry_config`
Stores state, mode (Replay/Live), and replay interval for the Project Telemetry Service.

### 2.7 Table: `ingestion_logs`
Tabular audit trail recording received, accepted, and rejected record counts per batch.
