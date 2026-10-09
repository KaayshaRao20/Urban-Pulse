import sys
import os
import json
import pandas as pd

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

print("=== RUNNING PHASE 2 FASTAPI BACKEND VERIFICATION SUITE ===")

# Test 1: Health Endpoint
res = client.get("/api/health")
print("Test 1 - Health Endpoint:", res.status_code, res.json())
assert res.status_code == 200

# Test 2: Data Sources List
res = client.get("/api/data-sources")
print("Test 2 - List Data Sources:", res.status_code, f"Found {len(res.json())} sources")
assert res.status_code == 200

# Test 3: Test Connection API
res = client.post("/api/data-sources/ds-001/test-connection")
print("Test 3 - Test Connection API:", res.status_code, res.json())
assert res.status_code == 200

# Test 4: Upload CSV Dataset
csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_crowd_telemetry.csv")
with open(csv_path, "rb") as f:
    res = client.post("/api/datasets/upload", files={"file": ("sample_crowd_telemetry.csv", f, "text/csv")})
print("Test 4 - CSV Dataset Upload:", res.status_code, "Dataset ID:", res.json().get("dataset_id"))
assert res.status_code == 200
dataset_id = res.json()["dataset_id"]

# Test 5: Validate Dataset
res = client.post(f"/api/datasets/{dataset_id}/validate")
print("Test 5 - Validate Dataset:", res.status_code, "Passed:", res.json()["validation_passed"])
assert res.status_code == 200

# Test 6: Preprocess Dataset
res = client.post(f"/api/datasets/{dataset_id}/process")
print("Test 6 - Preprocess Dataset:", res.status_code, "Processed Records:", res.json()["processed_records"])
assert res.status_code == 200

# Test 7: Basic EDA
res = client.get(f"/api/datasets/{dataset_id}/eda")
print("Test 7 - Basic EDA:", res.status_code, "Spatial Extent:", res.json()["geographic_extent"])
assert res.status_code == 200

# Test 8: Telemetry Control & Crowd Endpoint
res_ctrl = client.post("/api/telemetry/control", json={"action": "START", "replay_interval_sec": 5})
print("Test 8 - Telemetry Control START:", res_ctrl.status_code, res_ctrl.json()["status"])
assert res_ctrl.status_code == 200

res_frame = client.get("/api/telemetry/crowd")
print("Test 8 - Telemetry Crowd Frame:", res_frame.status_code, res_frame.json())
assert res_frame.status_code == 200

# Test 9: Ingestion Logs
res_logs = client.get("/api/ingestion/logs")
print("Test 9 - Ingestion Logs:", res_logs.status_code, f"{len(res_logs.json())} log entries")
assert res_logs.status_code == 200

print("\n[SUCCESS] ALL PHASE 2 BACKEND API TESTS PASSED SUCCESSFULLY!")
