# UrbanPulse – Smart City Monitoring & Response Network
## Phase 2: Data Preprocessing Pipeline & Cleaning Specification

---

## 1. Preprocessing Pipeline Sequence

The preprocessing pipeline is a deterministic, reproducible series of data transformations applied to raw uploaded datasets before persistence in the Unified Data Layer.

```
RAW UPLOADED DATA (CSV / API Payload)
                 │
                 ▼
     1. VALIDATION CHECK (Headers, bounds)
                 │
                 ▼
     2. DUPLICATE REMOVAL (Drop exact duplicates)
                 │
                 ▼
     3. SCHEMA COLUMN RENAME (Map to Canonical Fields)
                 │
                 ▼
     4. TIMESTAMP STANDARDIZATION (Format YYYY-MM-DD HH:MM:SS)
                 │
                 ▼
     5. GEOGRAPHIC COORDINATE STANDARDIZATION (-90..90, -180..180)
                 │
                 ▼
     6. MISSING VALUE IMPUTATION (Median imputation for numericals)
                 │
                 ▼
PROCESSED UNIFIED DATASET (Persisted to PostgreSQL / PostGIS)
```

---

## 2. Documented Imputation & Cleaning Rules

To maintain transparency and prevent arbitrary data manipulation:
1. **Duplicate Row Policy**: Exact row duplicates across timestamps and coordinates are purged.
2. **Missing Numerical Signals**: Missing values in numeric observations (e.g., speed, count) are imputed using column **median** values. Complex neural imputation is deferred to avoid data leakage.
3. **Timestamp Sorting**: Observations are sorted chronologically by standardized timestamp.
4. **Original Data Protection**: Raw uploaded files are preserved unmodified in raw storage (`DATASETS_STORE`). Preprocessing outputs a distinct processed dataframe.
