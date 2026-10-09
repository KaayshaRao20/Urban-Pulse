# UrbanPulse – Smart City Monitoring & Response Network
## Phase 1: System Scope, Boundaries & Constraints

---

## 1. Scope Boundary Overview

Defining clear functional boundaries is critical for academic rigour and software engineering reliability. UrbanPulse is defined strictly as an **Operational Intelligence & Decision-Support System** for municipal authorities.

---

## 2. Explicit IN-SCOPE Features & Capabilities

The scope of UrbanPulse encompasses the following core functional and technical domains:

1. **Multi-Domain Data Ingestion**:
   * Traffic data streams (speed, congestion level, volume metrics).
   * Weather data streams (precipitation, temperature, humidity, visibility).
   * Crowd/mobility data streams (footfall density, mobility index).
   * Project live telemetry (where available for local testing).
   * Temporal attributes (timestamp, hour, day of week, holiday flags).
   * Spatial attributes (latitude, longitude, geohash, corridor ID).
2. **Data Engineering Pipeline**:
   * Data validation and sanity checking (range validation, type enforcement).
   * Data cleaning and missing value handling.
   * Spatio-temporal alignment across heterogeneous sources.
   * Construction of a unified canonical urban dataset.
3. **Machine Learning Intelligence**:
   * Feature engineering (derived temporal, spatial, and cross-domain interaction terms).
   * Machine learning model training and hyperparameter tuning (XGBoost baseline).
   * Prediction of defined urban-condition targets.
   * Formal model evaluation using standard statistical and ML metrics.
4. **Explainability & Decision Support**:
   * Feature attribution breakdown (identifying top contributing factors).
   * Automated rule-based and model-driven alert generation.
   * Actionable decision-support messaging for operators.
5. **Scenario Simulation Engine**:
   * Interactive What-If counterfactual scenario execution using the trained ML model.
   * Baseline vs. Scenario comparative analytics.
6. **Authority Platform & User Interface**:
   * Enterprise-grade operational dashboard for municipal/authority personnel.
   * Interactive geospatial map visualization for urban condition tracking.
   * System health, data status, and historical analytics views.
7. **Testing & Validation**:
   * Validation using historical urban datasets and local project telemetry feeds.

---

## 3. Explicit OUT-OF-SCOPE Items

To prevent scope creep and maintain technical defensibility, the following items are strictly **OUT OF SCOPE** for current implementation:

1. **Citizen Portal & Citizen-Facing Infrastructure**:
   * **STRICT PROHIBITION**: No citizen pages, citizen routes, citizen dashboards, citizen navigation components, or citizen database schemas shall be created.
   * *Future Scope Note*: Citizen access may be referenced in future scope discussions only.
2. **Automated Physical Infrastructure Control**:
   * No direct interface or automated control over traffic signal timing controllers.
   * No automated control over floodgates, street lighting, or variable messaging signs.
3. **Automated Resource Dispatch**:
   * No automated dispatch of police, fire, ambulance, or municipal maintenance units.
4. **Consumer Navigation Services**:
   * No turn-by-turn routing, GPS navigation, or consumer traffic-rerouting features.
5. **Unvalidated Claims**:
   * No claims of production-grade, city-wide deployment without physical authority infrastructure integration.
   * No hardcoded or unsupported causal assertions.

---

## 4. Scope Matrix Summary

| System Domain | In Scope | Out of Scope | Scope Rationale |
| :--- | :---: | :---: | :--- |
| **Authority Platform (Admin UI)** | ✅ | | Core deliverable for operational decision support. |
| **Citizen Portal / App** | | ❌ | Excluded to focus resources on authority decision support. |
| **Multi-Source Data Alignment** | ✅ | | Essential foundation for cross-domain analytics. |
| **ML Prediction & Explainability** | ✅ | | Primary core value proposition of UrbanPulse. |
| **What-If Scenario Simulator** | ✅ | | Critical feature for proactive municipal planning. |
| **Automated Signal / Resource Actuation** | | ❌ | High-risk physical actuation deferred to human operators. |
| **Consumer Navigation / Rerouting** | | ❌ | Not a Google Maps alternative; map is for visualization only. |
