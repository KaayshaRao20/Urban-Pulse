# UrbanPulse – Smart City Monitoring & Response Network
## Phase 2: Project Telemetry Service Design & Replay Engine

---

## 1. Scientific Telemetry Definitions

UrbanPulse enforces strict scientific definitions to distinguish historical datasets from live streams:

1. **Historical Dataset**: Static tabular observations (CSV) loaded into storage.
2. **Project Telemetry / Replayed Telemetry**: A service that reads a processed historical dataset sequentially and emits records via an API (`/api/telemetry/crowd`) at configurable time intervals (e.g., 5 sec) to simulate dynamic data stream ingestion.
3. **Live Telemetry**: Direct real-time sensor streams connected to live physical monitoring hardware.

---

## 2. Replay Engine Architecture

```
PROCESSED CROWD DATASET (sample_crowd_telemetry.csv)
                       │
                       ▼
              FASTAPI MEMORY CACHE
                       │
                       ▼
            TELEMETRY REPLAY ENGINE
 [Controls: START | PAUSE | STOP | Interval (2s-10s)]
                       │
                       ▼
     ENDPOINTS: GET /api/telemetry/crowd
                       │
                       ▼
            URBANPULSE LIVE MONITORING
```

---

## 3. Telemetry Control Protocol

The Admin Panel provides operational controls to manage the replayed stream:
* **START**: Initiates or resumes index increments through the data cache.
* **PAUSE**: Holds the current sequence index position.
* **STOP & RESET**: Halts replay and resets index pointer to observation 0.
* **Replay Interval**: Configures emit cadence (e.g., 2s, 5s, 10s per observation frame).
