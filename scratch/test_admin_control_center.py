import sys
import os
import io
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

print("=== VERIFYING URBANPULSE EXCEL / CSV PIPELINE & RESTORE ENGINE ===")

# Test 1: Admin Overview
res = client.get("/api/admin/overview")
print("1. Admin Overview API:", res.status_code, "Connected sources:", len(res.json()["data_sources"]))
assert res.status_code == 200

# Test 2: Upload CSV
csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_crowd_telemetry.csv")
with open(csv_path, "rb") as f:
    res = client.post("/api/admin/datasets/upload", files={"file": ("sample_crowd_telemetry.csv", f, "text/csv")})
print("2. CSV Upload API:", res.status_code, "Dataset ID:", res.json()["dataset_id"])
assert res.status_code == 200
dataset_id = res.json()["dataset_id"]

# Test 3: Upload Excel (.xlsx) file
excel_io = io.BytesIO()
df_test = pd.read_csv(csv_path)
with pd.ExcelWriter(excel_io, engine='openpyxl') as writer:
    df_test.to_excel(writer, sheet_name='Crowd_Observations', index=False)
excel_io.seek(0)

res_excel = client.post("/api/admin/datasets/upload", files={"file": ("crowd_data.xlsx", excel_io, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
print("3. Excel Upload (.xlsx) API:", res_excel.status_code, "Available Sheets:", res_excel.json()["available_sheets"])
assert res_excel.status_code == 200
excel_dataset_id = res_excel.json()["dataset_id"]

# Test 4: Restore Dataset API (Restores dataset configuration to previous valid state)
res_restore = client.post(f"/api/admin/datasets/{excel_dataset_id}/restore")
print("4. Restore Dataset API:", res_restore.status_code, "Status:", res_restore.json()["status"])
assert res_restore.status_code == 200

# Test 5: Standardized Telemetry Endpoint (/api/telemetry/latest)
res_telemetry = client.get("/api/telemetry/latest")
print("5. Telemetry Stream API (/api/telemetry/latest):", res_telemetry.status_code, "Location:", res_telemetry.json()["location_id"], "Mode:", res_telemetry.json()["stream_mode"][:30] + "...")
assert res_telemetry.status_code == 200

print("\n[SUCCESS] ALL EXCEL, PIPELINE & RESTORE BACKEND TESTS PASSED SUCCESSFULLY!")
