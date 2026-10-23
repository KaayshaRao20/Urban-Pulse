# UrbanPulse — Predictive Intelligence Model Training & Audit Report

**Generated:** 2026-10-20 19:22:19  
**Environment:** Production / Authority Control Center  

## 1. Summary of Trained Models

| Model Name | Target | Task Type | Test MAE / Acc | Baseline MAE / Acc | R² / F1 | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `xgboost_metro_ridership_regressor_v1` | `target_next_hour_total` | Regression | 72.83 pax | 236.83 pax | R²: 0.9707 | **Active** |
| `xgboost_metro_entry_regressor_v1` | `target_next_hour_entry` | Regression | 47.74 pax | 126.49 pax | R²: 0.9648 | **Active** |
| `xgboost_metro_exit_regressor_v1` | `target_next_hour_exit` | Regression | 46.25 pax | 129.24 pax | R²: 0.9635 | **Active** |
| `xgboost_station_congestion_classifier_v1` | `target_congestion_level` | Classification | 85.77% | 48.76% | F1: 0.8553 | **Active** |

## 2. Blocked Prediction Tasks (Audit Compliance)

### Historical Weather Variable Forecasting
- **Status:** `Blocked`
- **Audit Finding:** Missing historical weather observation archive. The integrated weather API provides real-time current conditions and a 7-day forward forecast, but does not provide historical observations. Fabricating synthetic past weather is strictly prohibited.

### Historical Traffic Congestion & Speed Forecasting
- **Status:** `Blocked`
- **Audit Finding:** Missing continuous historical traffic telemetry records. The repository contains only 5 static preview rows for traffic corridors (Bengaluru_Traffic_2026.xlsx). No genuine multi-day traffic ground truth exists.

### Multivariable Crowd + Traffic + Weather Combined Forecasting
- **Status:** `Blocked`
- **Audit Finding:** Lack of concurrent historical observations for traffic and weather matching August-September 2025. Data alignment audit confirms timestamps and spatial sensors cannot be reliably aligned without ground truth.

