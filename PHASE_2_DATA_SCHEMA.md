# UrbanPulse – Smart City Monitoring & Response Network
## Phase 2: Schema Mapping & Canonical Data Dictionary

---

## 1. Schema Mapping Strategy

Dynamic urban feeds use heterogeneous column headers (e.g., `time_obs`, `lat_coord`, `pedestrian_count`). UrbanPulse enforces an interactive **Schema Mapping Layer** where raw uploaded columns map to standardized **UrbanPulse Canonical Fields** before entering the Unified Data Layer.

---

## 2. UrbanPulse Canonical Data Dictionary

| Canonical Field Name | Data Type | Constraint / Bounds | Description | Required / Optional |
| :--- | :--- | :--- | :--- | :--- |
| `timestamp` | DateTime | Valid ISO / `YYYY-MM-DD HH:MM:SS` | Standardized observation timestamp | **REQUIRED** |
| `latitude` | Float | `-90.0` to `+90.0` | Geospatial latitude coordinate | **REQUIRED** |
| `longitude` | Float | `-180.0` to `+180.0` | Geospatial longitude coordinate | **REQUIRED** |
| `crowd_count` | Integer | `≥ 0` | Observed pedestrian or crowd count | Optional |
| `crowd_density` | Float | `0.0` to `1.0` | Calculated crowd density index | Optional |
| `traffic_speed` | Float | `≥ 0.0` km/h | Average vehicle speed | Optional |
| `precipitation` | Float | `≥ 0.0` mm/h | Rainfall / precipitation rate | Optional |
| `corridor_id` | String | Max 50 chars | Standardized corridor / zone ID | Optional |

---

## 3. Schema Detection Heuristics & Manual Override

The FastAPI backend automatically suggests mappings using fuzzy header heuristics:
* Header containing `time`, `date`, `timestamp` &rarr; `timestamp`
* Header containing `lat`, `latitude` &rarr; `latitude`
* Header containing `lon`, `lng`, `longitude` &rarr; `longitude`
* Header containing `pedestrian`, `crowd`, `footfall` &rarr; `crowd_count`
* Header containing `density` &rarr; `crowd_density`

If heuristic confidence is low, the system prompts the administrator to select manual target fields in the Admin UI before processing.
