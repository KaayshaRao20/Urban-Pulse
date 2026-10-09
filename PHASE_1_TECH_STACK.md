# UrbanPulse – Smart City Monitoring & Response Network
## Phase 1: Technology Stack Direction & Technical Rationale

---

## 1. Executive Technology Summary

The technology stack for UrbanPulse is selected to provide high-performance tabular data handling, robust geospatial alignment, reproducible machine learning modeling, and an enterprise-grade authority interface.

*Note: Phase 1 establishes technical direction and justification. Technologies are NOT installed or deployed until Phase 2.*

---

## 2. Proposed Technology Stack Matrix

| Architecture Layer | Proposed Technology / Tool | Status | Functional Role & Justification |
| :--- | :--- | :--- | :--- |
| **Data Processing** | Python 3.x, Pandas, NumPy | Proposed | Industry standard for tabular data manipulation, time-series resampling, and numerical array processing. |
| **Machine Learning** | XGBoost, Scikit-learn | Proposed | XGBoost handles non-linear cross-domain feature interactions on structured data. Scikit-learn provides splitting, scaling, and evaluation metrics. |
| **Backend API** | Python (FastAPI OR Flask) | Proposed – To be frozen | Provides RESTful API endpoints for data ingestion, ML inference, and scenario execution. Final choice frozen in Phase 2. |
| **Database System** | PostgreSQL / PostGIS | Proposed – To be frozen | PostGIS provides enterprise spatial indexing and query support for geospatial coordinates and corridor geometry. |
| **Frontend Framework** | React + HTML5 / Vanilla CSS / JS | Proposed | Enables responsive, component-based UI development for complex authority dashboard views. |
| **Visualization Libraries** | Mapbox GL JS / Leaflet, Chart.js / Recharts | Proposed | Renders interactive vector maps, time-series condition charts, and feature contribution graphs. |
| **Version Control** | Git & GitHub | Proposed | Source code management, release branching, and collaborative development. |
| **Containerization** | Docker (Optional) | Proposed | Containerizes backend services and ML environment for reproducible deployment. |

---

## 3. Deep-Dive Rationale & Architectural Trade-offs

### 3.1 Machine Learning Model Rationale: XGBoost
* **Why XGBoost?**: XGBoost (eXtreme Gradient Boosting) is an optimized tree-based ensemble algorithm explicitly designed for structured tabular datasets. It effectively models complex non-linear feature interactions (e.g., compounding effects of weather, traffic, and crowd) without assuming linear additivity. Furthermore, XGBoost handles missing values gracefully and provides intrinsic feature importance metrics.
* **Empirical Stance**: XGBoost is selected as the primary ML candidate. However, UrbanPulse does **NOT** claim XGBoost is inherently superior to Random Forest, Extra Trees, or Gradient Boosting Decision Trees (GBDT) prior to empirical evaluation. Baseline comparative testing will be performed in subsequent phases.

### 3.2 Backend Framework Evaluation: FastAPI vs. Flask
* **FastAPI**: Offers native asynchronous execution, automatic OpenAPI schema generation, and high throughput for ML inference calls.
* **Flask**: Lightweight, highly flexible, with extensive community extension support.
* **Decision**: Framework choice will be evaluated and frozen in Phase 2 based on latency requirements for scenario simulation.

### 3.3 Database System: PostgreSQL + PostGIS
* Spatio-temporal queries require spatial index support (R-tree / GiST indexes in PostGIS) to perform efficient coordinate containment and distance-based corridor aggregation.

---

## 4. Engineering Rules & Constraints

1. **No Premature Installation**: Dependencies are not installed until architecture decisions are frozen in Phase 2.
2. **Minimal Dependency Footprint**: Avoid installing excessive frameworks or unneeded libraries.
3. **Reproducibility**: All ML environment dependencies will be locked via `requirements.txt` or Docker environment files.
