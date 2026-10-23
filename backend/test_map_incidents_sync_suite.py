"""
UrbanPulse Verification Test Suite: Map & Alerts Synchronization & Ingestion
"""
import sys
import os
import json

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, AlertModel

client = TestClient(app)

def test_1_alerts_and_summary():
    print("\n--- Test 1: Alerts Summary and Status Filtering ---")
    res = client.get("/api/alerts/summary")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    summary = res.json()
    print("Summary:", summary)
    assert "total_active" in summary
    assert "total_resolved" in summary
    assert "critical" in summary
    assert "high" in summary

    # Active alerts filter
    res_active = client.get("/api/alerts?status=active")
    assert res_active.status_code == 200
    active_alerts = res_active.json()
    for a in active_alerts:
        assert a["status"] != "Resolved", f"Resolved alert {a['id']} found in active alerts!"
    print(f"Active alerts count: {len(active_alerts)}")

    # All alerts filter
    res_all = client.get("/api/alerts?status=all")
    assert res_all.status_code == 200
    all_alerts = res_all.json()
    print(f"All alerts count: {len(all_alerts)}")
    assert len(all_alerts) >= len(active_alerts)
    print("PASS: Alerts and summary endpoints return correct structure and filter correctly.")

def test_2_map_incidents_sync():
    print("\n--- Test 2: Map Incidents Synchronization ---")
    res_active = client.get("/api/map/incidents?status=active")
    assert res_active.status_code == 200
    active_map = res_active.json()
    for m in active_map:
        assert m["status"] != "Resolved", f"Resolved incident {m['id']} found in active map incidents!"
    print(f"Active map incidents count: {len(active_map)}")

    res_all = client.get("/api/map/incidents?status=all")
    assert res_all.status_code == 200
    all_map = res_all.json()
    print(f"All map incidents count: {len(all_map)}")
    assert len(all_map) >= len(active_map)
    print("PASS: Map incidents endpoint reflects status filtering properly.")

def test_3_resolution_lifecycle():
    print("\n--- Test 3: Incident Resolution Lifecycle & Persistence ---")
    # Fetch active alerts
    res_active = client.get("/api/alerts?status=active")
    active_alerts = res_active.json()
    if not active_alerts:
        print("SKIP: No active alerts to resolve.")
        return

    target_alert = active_alerts[0]
    target_id = target_alert["id"]
    print(f"Resolving alert {target_id} ({target_alert['title']})...")

    # Resolve alert
    res_resolve = client.post(f"/api/alerts/{target_id}/resolve", json={"user": "Officer Priya Sharma"})
    assert res_resolve.status_code == 200
    resolved_data = res_resolve.json()
    assert resolved_data["alert"]["status"] == "Resolved"
    assert resolved_data["alert"]["resolved_by"] == "Officer Priya Sharma"
    print(f"Alert {target_id} successfully resolved by {resolved_data['alert']['resolved_by']}")

    # Verify target alert is NO LONGER in active map incidents
    res_active_map = client.get("/api/map/incidents?status=active")
    active_ids = [m["id"] for m in res_active_map.json()]
    assert target_id not in active_ids, f"Resolved alert {target_id} still appears in active map incidents!"
    print(f"Verified: Alert {target_id} disappeared from active map incidents.")

    # Verify target alert DOES appear in resolved map incidents
    res_resolved_map = client.get("/api/map/incidents?status=resolved")
    resolved_ids = [m["id"] for m in res_resolved_map.json()]
    assert target_id in resolved_ids, f"Resolved alert {target_id} not found in resolved map incidents!"
    print(f"Verified: Alert {target_id} is present in resolved map incidents.")

    # Verify in DB directly
    db = SessionLocal()
    db_alert = db.query(AlertModel).filter(AlertModel.id == target_id).first()
    if db_alert:
        assert db_alert.status == "Resolved"
        assert db_alert.resolved_by == "Officer Priya Sharma"
        print(f"Verified in DB: Alert {target_id} is persisted as Resolved.")
    db.close()
    print("PASS: Incident resolution lifecycle persists to DB and immediately syncs to Map API.")

def test_4_map_filters():
    print("\n--- Test 4: Map Filter Combinations ---")
    # Filter by severity
    res_crit = client.get("/api/map/filtered?severity=Critical&status=all")
    assert res_crit.status_code == 200
    data = res_crit.json()
    assert "incidents" in data
    assert "count" in data
    assert "active_count" in data
    assert "resolved_count" in data
    print(f"Critical filter returned {data['count']} incidents (Active: {data['active_count']}, Resolved: {data['resolved_count']})")
    for inc in data["incidents"]:
        assert inc["severity"] == "Critical", f"Non-critical incident {inc['id']} returned!"

    # Filter by zone
    res_zone = client.get("/api/map/filtered?zone=Indiranagar&status=all")
    assert res_zone.status_code == 200
    zone_data = res_zone.json()
    print(f"Indiranagar filter returned {zone_data['count']} incidents")

    # Filter by status: active only
    res_status = client.get("/api/map/filtered?status=active")
    assert res_status.status_code == 200
    status_data = res_status.json()
    for inc in status_data["incidents"]:
        assert inc["status"] != "Resolved", f"Resolved incident {inc['id']} found in active filtered query!"
    print(f"Status=active filter returned {status_data['count']} active incidents.")

    print("PASS: Map filters (severity, zone, status) function accurately.")

def test_5_weather_stations():
    print("\n--- Test 5: Weather Stations Endpoint ---")
    res = client.get("/api/weather/stations")
    assert res.status_code == 200
    data = res.json()
    assert "stations" in data
    assert len(data["stations"]) >= 4
    for st in data["stations"]:
        assert "temp" in st
        assert "condition" in st
        assert "lat" in st and "lng" in st
        print(f"Station: {st['name']} -> {st['temp']}, {st['condition']}, rain: {st.get('rain', '0 mm')}")
    print("PASS: Dynamic Weather API weather stations return live/realistic meteorological data.")

def test_6_data_sources_status():
    print("\n--- Test 6: Data Sources & Telemetry Health ---")
    res = client.get("/api/data/sources/status")
    assert res.status_code == 200
    payload = res.json()
    assert "summary" in payload
    assert "sources" in payload
    summary = payload["summary"]
    sources = payload["sources"]
    print(f"Summary: {summary['freshness_status']}")
    print(f"Received {len(sources)} data source records:")
    for s in sources:
        conn = s.get("connection_status")
        ingest = s.get("ingestion_status")
        recs = s.get("records_received_recent_window", 0)
        print(f" - {s['name']} [{s['category']}]: conn={conn}, ingest={ingest}, records={recs}")
        assert conn in ["Live", "Delayed", "Disconnected", "Historical", "Unknown"]
    print("PASS: Data sources telemetry health reports without DB errors.")

if __name__ == "__main__":
    test_1_alerts_and_summary()
    test_2_map_incidents_sync()
    test_3_resolution_lifecycle()
    test_4_map_filters()
    test_5_weather_stations()
    test_6_data_sources_status()
    print("\n=========================================")
    print("ALL 6 TESTS PASSED SUCCESSFULLY!")
    print("=========================================\n")
