# UrbanPulse – Smart City Monitoring & Response Network
## Phase 1 & Phase 2: Technical & Architectural Decision Log

---

## 1. Decision Governance Matrix

The following table records the baseline architectural decisions, technology selections, scope boundaries, and operational choices for UrbanPulse, updated following **Phase 2 Technology Freeze**.

Each decision is explicitly marked as either **FINALIZED** or **PROPOSED – TO BE FINALIZED**.

| DECISION | CURRENT CHOICE | STATUS | REASON |
| :--- | :--- | :--- | :--- |
| **01. Project Title** | UrbanPulse – Smart City Monitoring & Response Network | **FINALIZED** | Accurately reflects cross-domain monitoring, predictive analytics, and decision support focus. |
| **02. Problem Statement** | Mandated verbatim problem statement (Section 2) | **FINALIZED** | Establishes explicit academic and domain boundary focused on fragmented urban data streams. |
| **03. Primary Use Case** | Location-based cross-domain urban condition monitoring and prediction | **FINALIZED** | Addresses compound urban risks by evaluating interacting factors rather than isolated signals. |
| **04. Primary User** | Authority / Municipal / Urban Operations Team | **FINALIZED** | System is tailored for enterprise operational decision support. Citizen portal is strictly excluded. |
| **05. Core Data Domains** | Traffic, Weather, Crowd/Mobility, Time, Location | **FINALIZED** | Represents key interacting urban signals required for multi-domain condition forecasting. |
| **06. Primary ML Candidate** | XGBoost (Gradient Boosted Trees) | **PROPOSED – TO BE FINALIZED** | Well-suited for structured tabular data and feature interactions. Will be benchmarked against Random Forest in Phase 4. |
| **07. ML Task Paradigm** | Classification OR Regression | **PROPOSED – TO BE FINALIZED** | Decision deferred until post-EDA cross-domain feature target formulation in Phase 3/4. |
| **08. Backend Framework** | Python 3.13 + FastAPI Framework | **FINALIZED (Phase 2)** | Excellent asynchronous performance, native Pydantic schema validation, and auto-generated OpenAPI docs. |
| **09. Frontend Framework** | React + HTML5 / CSS / Modern JS | **FINALIZED (Phase 2)** | Enables modular component design for the 10 Authority Admin modules using dark green `#0B3D2E` branding. |
| **10. Database Engine** | PostgreSQL / PostGIS Extension | **FINALIZED (Phase 2)** | PostGIS provides native spatial indexing (R-tree/GiST) for geospatial queries, point geography, and corridor analysis. |
| **11. External APIs & Feeds** | Data source management gateway configured | **FINALIZED (Phase 2)** | Server-side secure credentials, test connection interface, and CSV upload engine built in Phase 2. |
| **12. Generative AI / Gemini** | Excluded from core ML prediction; optional NLP summary layer only | **FINALIZED** | Core prediction must remain deterministic ML. Gemini API is NOT used as the predictor. |
| **13. What-If Scenario Engine** | Counterfactual ML inference engine | **FINALIZED** | Enables operators to evaluate parameter changes using the trained model without physical deployment. |
| **14. Authority Dashboard UI** | Enterprise Dark-Green Theme (`#0B3D2E`) | **FINALIZED** | Professional, low-clutter design system tailored for municipal control room environments. |
| **15. Citizen Portal Scope** | Excluded from Phase 1 & 2 (Future Scope only) | **FINALIZED** | Prevents scope dilution; focuses system development entirely on authority operational workflows. |
| **16. Testing Protocol** | Historical datasets + Project live telemetry | **FINALIZED** | Automated test suite verifying data ingestion, schema mapping, validation, and telemetry replay APIs. |
