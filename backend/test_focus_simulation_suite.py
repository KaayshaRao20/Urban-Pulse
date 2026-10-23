import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from fastapi.testclient import TestClient

try:
    from app.main import app
except ImportError:
    from main import app

client = TestClient(app)

def test_focus_and_simulation():
    print("=" * 60)
    print("URBANPULSE FOCUS INTELLIGENCE & SIMULATION TEST SUITE")
    print("=" * 60)

    # 1. Focus Locations
    print("\n--- 1. Testing GET /api/focus/locations ---")
    res = client.get("/api/focus/locations")
    assert res.status_code == 200, f"Failed: {res.text}"
    data = res.json()
    locations = data if isinstance(data, list) else data.get("locations", [])
    print(f"Loaded {len(locations)} canonical focus locations.")
    assert len(locations) >= 7, "Expected at least 7 canonical corridors"
    first_loc = locations[0]["id"]
    first_loc_name = locations[0]["name"]
    print(f"[PASS] Canonical corridors loaded. Sample ID: {first_loc} ({first_loc_name})")

    # 2. Focus Live Corridor Telemetry
    print(f"\n--- 2. Testing GET /api/focus/live/{first_loc} ---")
    res = client.get(f"/api/focus/live/{first_loc}")
    assert res.status_code == 200, f"Failed: {res.text}"
    live_data = res.json()
    kpis = live_data.get("kpis", {})
    trends = live_data.get("trends", {})
    trajectory = live_data.get("trajectory", [])
    advisories = live_data.get("advisories", [])

    print(f"Traffic KPI: {kpis.get('traffic')}")
    print(f"Crowd KPI: {kpis.get('crowd')}")
    print(f"Weather KPI: {kpis.get('weather')}")
    print(f"Road KPI: {kpis.get('road')}")
    print(f"Trend timestamps: {trends.get('timestamps')}")
    print(f"Traffic volume trend: {trends.get('traffic_volume')}")
    print(f"Crowd density trend: {trends.get('crowd_density')}")
    print(f"Trajectory rows count: {len(trajectory)}")
    print(f"Advisories count: {len(advisories)}")

    assert len(trends.get("timestamps", [])) == 5, "Expected 5 timestamps in rolling 2-hour window"
    assert len(trajectory) == 4, "Expected 4 trajectory parameters"
    assert len(advisories) == 4, "Expected 4 operational advisories"
    print("[PASS] Dynamic focus corridor telemetry validated.")

    # 3. Focus Dynamic Analysis with features
    print("\n--- 3. Testing POST /api/focus/analyze ---")
    analyze_payload = {
        "location_id": first_loc,
        "features": ["traffic", "crowd", "weather"]
    }
    res = client.post("/api/focus/analyze", json=analyze_payload)
    assert res.status_code == 200, f"Failed: {res.text}"
    analysis = res.json()
    print(f"Calculated Situation: {analysis.get('situation')}")
    print(f"Calculated Severity: {analysis.get('severity')}")
    print(f"Confidence: {analysis.get('confidence')}%")
    attributions = analysis.get("attributions", [])
    print(f"Attributions count: {len(attributions)}")
    for attr in attributions:
        print(f" - {attr}")
    assert len(attributions) >= 3, "Expected at least 3 attributions for 3 active features"
    print("[PASS] Dynamic Focus Intelligence feature analysis validated.")

    # 4. Simulation Live Telemetry
    print("\n--- 4. Testing GET /api/simulation/live ---")
    res = client.get(f"/api/simulation/live?location={first_loc_name}")
    assert res.status_code == 200, f"Failed: {res.text}"
    sim_live = res.json()
    print(f"Live Location: {sim_live.get('location')}")
    print(f"Live Avg Speed: {sim_live.get('avg_speed')} {sim_live.get('avg_speed_unit')}")
    print(f"Live Traffic Volume: {sim_live.get('traffic_volume')} {sim_live.get('traffic_volume_unit')}")
    print(f"Live Crowd Density: {sim_live.get('crowd_density')} {sim_live.get('crowd_density_unit')}")
    print(f"Live Weather: {sim_live.get('weather_condition')}, {sim_live.get('temp_c')}°C")
    assert "avg_speed" in sim_live and "traffic_volume" in sim_live and "crowd_density" in sim_live
    print("[PASS] Simulation live telemetry endpoint operational.")

    # 5. Simulation Execution
    print("\n--- 5. Testing POST /api/simulation/run ---")
    sim_payload = {
        "location": first_loc_name,
        "date": "23 Oct 2026",
        "time": "17:30",
        "traffic_volume": 6800.0,
        "traffic_volume_unit": "vehicles/hour",
        "avg_speed": 16.5,
        "avg_speed_unit": "km/h",
        "crowd_density": 580.0,
        "crowd_density_unit": "people/km²",
        "weather_condition": "Heavy Rain",
        "temp_c": 21.0,
        "road_type": "Urban Arterial",
        "event_incident": "Lane Restriction"
    }
    res = client.post("/api/simulation/run", json=sim_payload)
    assert res.status_code == 200, f"Failed: {res.text}"
    sim_result = res.json()
    print(f"Predicted Condition: {sim_result.get('predicted_condition')}")
    print(f"Predicted Severity: {sim_result.get('severity')}")
    factors = sim_result.get("factors", [])
    total_pct = sum(f.get("pct", 0) for f in factors)
    print(f"Factors breakdown ({len(factors)}): {[(f['factor'], f['pct']) for f in factors]}")
    print(f"Sum of Factor Percentages: {total_pct}%")
    assert total_pct == 100, f"Factor percentages must strictly sum to 100%, got {total_pct}%"

    explainable_ai = sim_result.get("explainable_ai", [])
    print(f"Explainable AI bullets count: {len(explainable_ai)}")
    for bullet in explainable_ai:
        print(f" • {bullet}")
    assert len(explainable_ai) >= 4, "Expected at least 4 explainable AI bullets"

    rec_actions = sim_result.get("recommended_actions", [])
    print(f"Recommended actions count: {len(rec_actions)}")
    assert len(rec_actions) >= 3, "Expected at least 3 recommended actions"
    print("[PASS] Urban Simulation calculation & explainable AI verified.")

    print("\n" + "=" * 60)
    print("ALL FOCUS & SIMULATION TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    test_focus_and_simulation()
