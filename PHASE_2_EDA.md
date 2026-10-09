# UrbanPulse – Smart City Monitoring & Response Network
## Phase 2: Exploratory Data Analysis (EDA) & Data Characterization

---

## 1. Initial Dataset Statistical Profile

Exploratory Data Analysis (EDA) was performed on the active crowd telemetry dataset (`sample_crowd_telemetry.csv`) following schema mapping and preprocessing.

```
+----------------------------------------------------------------------------------+
| OBSERVATION METRICS PROFILE                                                      |
| Total Records: 20 rows | Total Columns: 6 (Standardized)                         |
| Duplicate Rows: 0 | Missing Value Ratio: 0.0%                                    |
| Spatial Bounding Box: Lat [12.9352, 12.9716] | Lon [77.5946, 77.6245]            |
| Temporal Horizon: 2026-09-27 12:00:00 to 2026-09-27 14:15:00 (15-min bins)        |
+----------------------------------------------------------------------------------+
```

---

## 2. Signal Attribute Distributions

| Attribute Name | Standardized Data Type | Min Value | Max Value | Mean / Distribution |
| :--- | :--- | :--- | :--- | :--- |
| `timestamp` | DateTime | 2026-09-27 12:00:00 | 2026-09-27 14:15:00 | 10 uniform 15-minute timesteps |
| `latitude` | Float | 12.9352 | 12.9716 | 12.9534 avg |
| `longitude` | Float | 77.5946 | 77.6245 | 77.6095 avg |
| `crowd_count` | Integer | 890 | 3,450 | 1,720 pedestrians avg |
| `crowd_density` | Float | 0.25 | 0.95 | 0.52 density index avg |
| `corridor_id` | String | CORRIDOR_ALPHA | CORRIDOR_BETA | 2 monitored urban corridors |

---

## 3. Stance on Machine Learning Target Formulation

In strict accordance with Phase 2 guidelines:
* **No Premature Model Training**: No machine learning model (XGBoost) has been trained in Phase 2.
* **No Invented Model Performance**: Accuracy, F1-score, MAE, and confusion matrices are explicitly deferred until model development in subsequent phases.
* **Data-Driven Target Selection**: The decision between Classification (discrete condition categories) and Regression (continuous severity score) will be made after integrated cross-domain feature exploratory analysis in Phase 3.
