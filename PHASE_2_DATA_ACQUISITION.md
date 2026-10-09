# UrbanPulse – Smart City Monitoring & Response Network
## Phase 2: Data Acquisition & Source Management Architecture

---

## 1. Executive Summary

Phase 2 establishes the data acquisition foundation for UrbanPulse. Modern urban monitoring requires ingesting structured observations across disparate operational feeds (traffic congestion, meteorological feeds, crowd density, and local telemetry). 

UrbanPulse implements a single, secure, controlled ingestion gateway capable of managing both static dataset uploads (CSV) and dynamic external API streams without leaking credentials to the client interface or hardcoding fake API responses.

---

## 2. Ingestion Architecture & Controlled Data Gateway

```
                             AUTHORITY ADMIN PANEL
                                       │
                            DATA SOURCE MANAGEMENT
                                       │
             ┌─────────────────────────┼─────────────────────────┐
             ↓                         ↓                         ↓
      Dataset Upload            External APIs             Telemetry API
      (CSV Ingestion)        (Traffic / Weather)       (Replayed Crowd Data)
             │                         │                         │
             └─────────────────────────┼─────────────────────────┘
                                       ↓
                                FASTAPI BACKEND
                                       ↓
                             DATA INGESTION LAYER
                                       ↓
                          VALIDATION + PREPROCESSING
                                       ↓
                           TIME + LOCATION ALIGNMENT
                                       ↓
                            POSTGRESQL / POSTGIS
                                       ↓
                             UNIFIED DATA LAYER
```

---

## 3. Supported Data Source Types

The Authority Admin Panel supports five standardized data source classifications:

| Source Type | Data Format | Ingestion Mechanism | Security Protocol | Operational Role |
| :--- | :--- | :--- | :--- | :--- |
| **Dataset** | CSV File | Multipart Form Upload | File validation & schema parsing | Ingest historical urban datasets for exploratory analysis and offline ML. |
| **Traffic API** | JSON Stream | Scheduled Polling | Server-side API key header injection | Stream corridor speeds, congestion indices, and vehicle counts. |
| **Weather API** | JSON Stream | Scheduled Polling | Server-side API key header injection | Stream precipitation rates, temperature, humidity, and visibility. |
| **Crowd API** | JSON / Stream | Scheduled Polling | Server-side bearer token authentication | Stream pedestrian counts and footfall density indices. |
| **Project Telemetry API** | JSON Stream | Internal Endpoint (`/api/telemetry/crowd`) | Local service token | Expose uploaded crowd dataset as a replayed telemetry stream for monitoring. |

---

## 4. Source Registration & Connection Testing

Administrators configure data sources through the Admin Interface. For external APIs, credentials (API Keys, OAuth tokens) are sent directly to the FastAPI backend and encrypted before storage.

The backend exposes a secure connection test interface (`POST /api/data-sources/{id}/test-connection`) that attempts an HTTP GET/HEAD request to the target endpoint, logging latency and returning status without reflecting secrets back to the UI.
