# UrbanPulse – Smart City Monitoring & Response Network
## Phase 2: Finalized Technology Stack Specification

---

## 1. Executive Stack Freeze Summary

In Phase 2, the core technology stack for UrbanPulse is **FINALIZED** following architectural evaluation. Every selected component has been verified for performance, security, spatial support, and seamless integration across the data acquisition pipeline.

---

## 2. Finalized Technology Matrix

```
+-----------------------------------------------------------------------------------+
| FRONTEND LAYER                                                                    |
| React + HTML5 / CSS3 / Modern JavaScript                                          |
| Enterprise Dark Green Theme (#0B3D2E) | Component-based Admin UI                   |
+-----------------------------------------------------------------------------------+
                                       │ REST / JSON APIs
                                       ▼
+-----------------------------------------------------------------------------------+
| BACKEND API LAYER                                                                 |
| Python 3.13 + FastAPI Framework                                                   |
| Asynchronous Execution | Automatic OpenAPI Specs | Pydantic Schema Enforcement    |
+-----------------------------------------------------------------------------------+
                                       │ SQLAlchemy ORM / Async Driver
                                       ▼
+-----------------------------------------------------------------------------------+
| DATABASE & GEOSPATIAL STORAGE                                                     |
| PostgreSQL 16 + PostGIS Extension                                                 |
| Relational Storage | Spatio-temporal Indexing | Geography Point Types             |
+-----------------------------------------------------------------------------------+
                                       │ Pandas DataFrames
                                       ▼
+-----------------------------------------------------------------------------------+
| DATA PROCESSING & ANALYTICS                                                       |
| Python | Pandas | NumPy                                                           |
| Tabular Preprocessing | Type Conversion | Spatio-temporal Resampling              |
+-----------------------------------------------------------------------------------+
```

---

## 3. Layer Justifications & Selection Criteria

### 3.1 Backend: FastAPI (Python) — FINALIZED
* **Asynchronous High Throughput**: Native support for Python `asyncio`, enabling non-blocking execution during concurrent API polling and telemetry streaming.
* **Auto-Generated OpenAPI**: Produces interactive Swagger (`/docs`) and ReDoc (`/redoc`) API documentation automatically.
* **Strict Type Safety**: Enforces schema validation using Pydantic models.

### 3.2 Database: PostgreSQL + PostGIS Extension — FINALIZED
* **Relational Integrity**: Enforces strict foreign keys across data sources, datasets, raw observations, and logs.
* **Geospatial Queries**: PostGIS enables spatial indexing (GiST / R-tree) for bounding box queries, corridor containment, and distance calculations.

### 3.3 Frontend: React + Enterprise Dark Green CSS — FINALIZED
* **Modular Component Design**: Decouples dataset upload, schema mapping, telemetry controls, and EDA modules into maintainable React views.
* **Operational Aesthetic**: Implements enterprise dark green `#0B3D2E` branding tailored for municipal operations.
