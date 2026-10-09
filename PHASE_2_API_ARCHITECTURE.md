# UrbanPulse – Smart City Monitoring & Response Network
## Phase 2: API Architecture & Endpoint Specification

---

## 1. RESTful API Architectural Overview

The UrbanPulse backend is implemented using **FastAPI (Python)**. It provides high-performance, asynchronous endpoints for data source registration, dataset upload, schema mapping, validation execution, preprocessing, telemetry replay, and ingestion logging.

---

## 2. Complete Phase 2 Endpoint Registry

| Method | Endpoint Route | Purpose & Description | Input Payload | Response Payload |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | System health check & status | None | Status, framework, database state |
| `GET` | `/api/data-sources` | List all registered data sources | None | JSON array of data sources |
| `POST` | `/api/data-sources` | Register new data source config | `DataSourceCreate` | Created data source object |
| `POST` | `/api/data-sources/{id}/test-connection` | Securely test external API connection | `id` parameter | Connection status & latency |
| `POST` | `/api/datasets/upload` | Upload raw CSV dataset | Multipart Form File | Dataset ID, columns, sample rows |
| `GET` | `/api/datasets` | List uploaded datasets | None | Dataset metadata summary |
| `GET` | `/api/datasets/{id}` | Get dataset details & sample | `id` parameter | Dataset details & mappings |
| `POST` | `/api/datasets/{id}/map-schema` | Save column schema mapping | `SchemaMappingRequest` | Mapping status |
| `POST` | `/api/datasets/{id}/validate` | Run validation engine rules | `id` parameter | Rule audit check results |
| `POST` | `/api/datasets/{id}/process` | Execute preprocessing pipeline | `id` parameter | Processed record summary |
| `GET` | `/api/datasets/{id}/eda` | Get Exploratory Data Analysis | `id` parameter | Record count, stats, spatial bounds |
| `GET` | `/api/telemetry/config` | Get telemetry replay state | None | Replay mode, status, record count |
| `POST` | `/api/telemetry/control` | Control telemetry replay service | `action` (START/PAUSE/STOP) | Updated telemetry state |
| `GET` | `/api/telemetry/crowd` | Get latest replayed telemetry frame | None | Current telemetry record |
| `GET` | `/api/ingestion/logs` | Get tabular audit logs | None | Ingestion log array |

---

## 3. API Security & Secret Protection

External API credentials (API Keys, tokens) must **NEVER** be exposed to frontend code or browser network responses.

* **Server-Side Credential Storage**: Secrets are stored in server environment variables (`.env`) or encrypted backend database fields.
* **Server-Side Proxy Request**: When polling external APIs, the FastAPI backend injects authentication headers server-side.
