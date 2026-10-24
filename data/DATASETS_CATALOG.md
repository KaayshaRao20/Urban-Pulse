# UrbanPulse — Complete Empirical Datasets Catalog

This directory contains the entire, full-scale CSV datasets used across the UrbanPulse City Operational Intelligence platform and the ML predictive forecasting pipelines.

---

## 1. Complete ML Features Dataset (Trained XGBoost Pipeline)
- **File**: [`data/crowd_features_full_dataset.csv`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/data/crowd_features_full_dataset.csv)
- **Alternate Location**: [`backend/storage/datasets/crowd_features_full.csv`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/backend/storage/datasets/crowd_features_full.csv)
- **Format**: CSV (Exported from full Parquet feature store `crowd_features_prepared.parquet`)
- **Dimensions**: **95,616 Rows × 54 Columns**
- **File Size**: ~52.1 MB
- **Coverage**: All operational BMRCL Namma Metro stations across Purple and Green lines across 2024–2025.
- **Key Columns**:
  1. `business_date`: Calendar date (YYYY-MM-DD)
  2. `hour_start`: Hour of the day (0 to 23)
  3. `time_period`: Formatted time interval (e.g. `08:00 Hrs To 09:00 Hrs`)
  4. `station_name`: BMRCL Metro station identifier (e.g. `Indiranagar`, `MG Road`, `Baiyappanahalli`, `Majestic`)
  5. `entry_count`: Hourly passenger gate tap-ins
  6. `exit_count`: Hourly passenger gate tap-outs
  7. `total_ridership`: Sum of entries and exits for that station-hour
  8. `day_of_week`, `is_weekend`, `month`, `day`: Temporal flags
  9. `hour_sin`, `hour_cos`, `dow_sin`, `dow_cos`: Cyclical sinusoidal time encodings
  10. `is_morning_peak` (08:00–11:30), `is_evening_peak` (17:00–20:30): Commute rush indicators
  11. `total_lag_1`, `total_lag_2`, `total_lag_24`: Autoregressive historical lags (1h, 2h, and 24h prior)
  12. `total_rolling_mean_3`, `total_rolling_mean_24`, `total_rolling_std_24`: Moving averages and volatility
  13. **Target Variables**:
      - `target_next_hour_total`: Total passengers next hour (Regression target)
      - `target_next_hour_entry`: Inflow next hour
      - `target_next_hour_exit`: Outflow next hour
      - `target_congestion_level`: Categorical/Ordinal risk level (0=Normal, 1=Moderate, 2=High, 3=Severe Peak)
  14. `split`: Dataset partition (`train`, `val`, `test`)

---

## 2. BMRCL Raw Station Ridership Dataset
- **File**: [`data/BMRCL_Station_Ridership_Aug_Sep_2025.csv`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/data/BMRCL_Station_Ridership_Aug_Sep_2025.csv)
- **Dimensions**: **95,616 Rows × 8 Columns**
- **File Size**: ~7.8 MB
- **Source**: Bengaluru Metro Rail Corporation Ltd. (BMRCL) RTI Station-Wise Hourly Ridership (via OpenCity.in)
- **Key Columns**: `Date`, `Station Name`, `Line`, `Hour`, `Entry Count`, `Exit Count`, `Total Ridership`, `Operational Notes`

---

## 3. Bengaluru Municipal Traffic Telemetry Dataset
- **File**: [`data/Bengaluru_Traffic_2026.csv`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/data/Bengaluru_Traffic_2026.csv)
- **Dimensions**: **5 Monitored Transit Corridors × 8 Metrics**
- **Key Columns**:
  - `corridor_id`: Corridor key (`CORRIDOR_ALPHA`, `CORRIDOR_BETA`, `CORRIDOR_GAMMA`, etc.)
  - `name`: Corridor name (`Marathahalli ORR`, `Silk Board Junction`, `MG Road`, `Whitefield IT Corridor`, `Hebbal Flyover`)
  - `avg_speed_kmh`: Real-time measured velocity (km/h)
  - `congestion_index_pct`: Congestion saturation percentage (15% to 95%)
  - `flow_rate_vph`: Vehicles per hour throughput
  - `incident_flag`: Boolean accident / obstruction detection
  - `peak_hours`: Morning and evening peak intervals

---

## 4. CTTP Pedestrian & Crowd Density Dataset
- **File**: [`data/CTTP_Pedestrian_Traffic_Data.csv`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/data/CTTP_Pedestrian_Traffic_Data.csv)
- **Dimensions**: **18 High-Density Junctions × 10 Attributes**
- **Source**: Comprehensive Traffic and Transportation Plan (CTTP) for Bengaluru Metropolitan Area
- **Key Columns**: `Junction_ID`, `Location_Name`, `Zone`, `Pedestrian_Volume_PPH`, `Sidewalk_Width_Meters`, `Density_Persons_Per_SqM`, `Crossing_Delay_Sec`, `Signal_Cycle_Sec`, `Safety_Rating`

---

## 5. Bengaluru Meteorological Observations Dataset
- **File**: [`data/Weather_Data_BLR.csv`](file:///c:/Users/Kaaysha%20Rao/OneDrive/Desktop/Urban%20pulse/data/Weather_Data_BLR.csv)
- **Key Columns**: `station_name`, `temp_c`, `humidity_pct`, `rainfall_mm`, `wind_speed_kmh`, `condition`, `timestamp`
