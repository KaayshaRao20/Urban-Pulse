import sys
import os

# Setup sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

AUTH_HEADERS = {
    "X-Authority-Role": "officer",
    "X-Authority-Actor": "Municipal Duty Officer (Control 01)",
    "Content-Type": "application/json"
}

def test_full_grievance_sync():
    print("\n=======================================================")
    print("URBANPULSE CITIZEN-AUTHORITY GRIEVANCE SYNC TEST SUITE")
    print("=======================================================\n")

    # 1. Authority List initially
    res = client.get("/api/grievances/authority/list", headers=AUTH_HEADERS)
    assert res.status_code == 200, f"Authority list failed: {res.status_code} - {res.text}"
    initial_data = res.json()
    initial_count = initial_data.get("total", 0)
    print(f"[TEST 1 PASS] Authority List loaded successfully. Current total records: {initial_count}")
    print(f"               Summary stats: {initial_data.get('summary', {})}")

    # 2. Submit a new Citizen Grievance (Citizen Portal has NO authority headers)
    citizen_payload = {
        "title": "Severe Pothole on Outer Ring Road Flyover",
        "description": "Deep 15cm pothole damaging bike wheel rims right near the bridge ramp.",
        "category": "Pothole",
        "severity": "Critical",
        "latitude": 12.9565,
        "longitude": 77.7015,
        "landmark": "Near Marathahalli Bridge ramp",
        "ward_name": "Ward 85 - Doddanekkundi",
        "citizen_name": "Rohan Deshmukh",
        "citizen_phone": "+91 98450 77123",
        "citizen_email": "rohan.deshmukh@example.com"
    }

    # Multipart form submission simulating Citizen Portal
    res = client.post(
        "/api/grievances",
        data={
            "title": citizen_payload["title"],
            "description": citizen_payload["description"],
            "category": citizen_payload["category"],
            "urgency": citizen_payload["severity"],
            "latitude": str(citizen_payload["latitude"]),
            "longitude": str(citizen_payload["longitude"]),
            "landmark_address": citizen_payload["landmark"],
            "ward_zone": citizen_payload["ward_name"],
            "citizen_name": citizen_payload["citizen_name"],
            "citizen_phone": citizen_payload["citizen_phone"],
            "citizen_email": citizen_payload["citizen_email"]
        }
    )
    assert res.status_code == 200, f"Citizen submission failed: {res.status_code} - {res.text}"
    submit_res = res.json()
    ticket_id = submit_res.get("ticket_id") or submit_res.get("ticket_number")
    print(f"\n[TEST 2 PASS] Citizen grievance submitted successfully.")
    print(f"               Ticket ID generated: {ticket_id}")
    print(f"               Initial status: {submit_res.get('status')}")

    # 3. Verify Citizen Grievance appears in Authority Portal List with EXACT matching data
    res = client.get("/api/grievances/authority/list", headers=AUTH_HEADERS)
    assert res.status_code == 200
    authority_data = res.json()
    grievances = authority_data.get("grievances", [])
    matched = next((g for g in grievances if g.get("ticket_number") == ticket_id or g.get("id") == ticket_id), None)
    assert matched is not None, f"Ticket {ticket_id} NOT found in Authority grievance list!"
    
    print(f"\n[TEST 3 PASS] Grievance found in Authority Console:")
    print(f"               Ticket: {matched.get('ticket_number')}")
    print(f"               Title: {matched.get('title')}")
    print(f"               Location: {matched.get('location')} ({matched.get('latitude')}, {matched.get('longitude')})")
    print(f"               Citizen: {matched.get('citizen_name')} ({matched.get('citizen_phone')})")
    print(f"               Status: {matched.get('status')}")
    print(f"               Risk Score: {matched.get('risk_score')} ({matched.get('risk_level')})")
    print(f"               AI Recommendations: {len(matched.get('ai_recommendations', []))} suggestions")

    assert matched.get("latitude") == citizen_payload["latitude"]
    assert matched.get("longitude") == citizen_payload["longitude"]
    assert matched.get("category").lower() == citizen_payload["category"].lower()

    # 3b. Verify Authority Detail Dossier endpoint
    res = client.get(f"/api/grievances/authority/{ticket_id}", headers=AUTH_HEADERS)
    assert res.status_code == 200, f"Authority detail failed: {res.text}"
    dossier = res.json()
    print(f"               Dossier details loaded: Ticket {dossier.get('complaint', {}).get('ticket_number')}")
    assert dossier.get("complaint", {}).get("ticket_number") == ticket_id

    # 4. Authority Action: Mark Under Review
    res = client.post(
        f"/api/grievances/authority/{ticket_id}/review",
        json={"notes": "Triage verified by Senior Inspector"},
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200, f"Mark under review failed: {res.text}"
    print(f"\n[TEST 4 PASS] Authority Action: Marked under review.")

    # Verify sync back to Citizen Tracking
    res = client.get(f"/api/grievances/track/{ticket_id}")
    assert res.status_code == 200, f"Citizen track failed: {res.text}"
    track_data = res.json()
    print(f"               Citizen Track Status: {track_data.get('status')}")
    assert track_data.get("status") in ["Under Review", "Under Review / Verifying"], f"Status mismatch: {track_data.get('status')}"

    # 5. Authority Action: Assign Department
    res = client.post(
        f"/api/grievances/authority/{ticket_id}/assign",
        json={
            "department": "BBMP Road Infrastructure",
            "assigned_to": "Engineer Ramesh Kumar (Ward 85)",
            "priority": "Critical",
            "notes": "Fast-track pothole repair crew before evening peak traffic."
        },
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200, f"Department assign failed: {res.text}"
    print(f"\n[TEST 5 PASS] Authority Action: Assigned to BBMP Road Infrastructure.")

    # Verify sync back to Citizen Tracking
    res = client.get(f"/api/grievances/track/{ticket_id}")
    assert res.status_code == 200
    track_data = res.json()
    print(f"               Citizen Track Status: {track_data.get('status')}")
    print(f"               Citizen Track Dept: {track_data.get('department')}")
    assert track_data.get("status") == "Assigned"
    assert "BBMP" in track_data.get("department", "")

    # 6. Authority Action: Create Work Order
    res = client.post(
        f"/api/grievances/authority/{ticket_id}/work-order",
        json={
            "work_order_id": f"WO-2026-{ticket_id[-4:]}",
            "assigned_squad": "Rapid Asphalt Repair Squad #4",
            "priority": "High",
            "materials": "Cold-mix asphalt, compaction roller, safety cones",
            "instructions": "Mill edges of pothole, apply tack coat, compact 50mm bitumen.",
            "estimated_hours": 3
        },
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200, f"Work order creation failed: {res.text}"
    wo_data = res.json()
    print(f"\n[TEST 6 PASS] Work Order created: {wo_data.get('work_order', {}).get('work_order_id')}")

    # 7. Authority Action: Dispatch Crew
    res = client.post(
        f"/api/grievances/authority/{ticket_id}/dispatch",
        json={
            "assigned_squad": "Rapid Asphalt Repair Squad #4",
            "squad_contact": "+91 94480 22341",
            "notes": "Truck #KA-03-GA-4412 dispatched to site."
        },
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200, f"Dispatch failed: {res.text}"
    print(f"\n[TEST 7 PASS] Authority Action: Crew Dispatched.")

    # Verify sync back to Citizen Tracking
    res = client.get(f"/api/grievances/track/{ticket_id}")
    assert res.status_code == 200
    track_data = res.json()
    print(f"               Citizen Track Status: {track_data.get('status')}")
    assert track_data.get("status") == "Crew Dispatched"

    # 8. Authority Action: Mark In Progress
    res = client.post(
        f"/api/grievances/authority/{ticket_id}/in-progress",
        json={
            "notes": "Squad on-site. Repair work currently underway."
        },
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200, f"In Progress failed: {res.text}"
    print(f"\n[TEST 8 PASS] Authority Action: In Progress.")

    # Verify sync back to Citizen Tracking
    res = client.get(f"/api/grievances/track/{ticket_id}")
    assert res.status_code == 200
    track_data = res.json()
    print(f"               Citizen Track Status: {track_data.get('status')}")
    assert track_data.get("status") == "In Progress"

    # 9. Authority Action: Resolve Grievance
    res = client.post(
        f"/api/grievances/authority/{ticket_id}/resolve",
        data={
            "resolution_notes": "Bitumen patch completed and compacted. Road surface smooth and open for traffic.",
            "resolution_team": "Rapid Asphalt Repair Squad #4",
            "materials_used": "120kg Bituminous Cold Mix"
        },
        headers={
            "X-Authority-Role": "officer",
            "X-Authority-Actor": "Municipal Duty Officer (Control 01)"
        }
    )
    assert res.status_code == 200, f"Resolve failed: {res.text}"
    print(f"\n[TEST 9 PASS] Authority Action: Resolved.")

    # Verify sync back to Citizen Tracking
    res = client.get(f"/api/grievances/track/{ticket_id}")
    assert res.status_code == 200
    track_data = res.json()
    print(f"               Citizen Track Status: {track_data.get('status')}")
    print(f"               Resolution Notes: {track_data.get('resolution_notes')}")
    assert track_data.get("status") == "Resolved"
    assert "patch completed" in track_data.get("resolution_notes", "").lower()

    # 10. Test Reopening Flow
    res = client.post(
        f"/api/grievances/authority/{ticket_id}/reopen",
        json={
            "reason": "Citizen reports surface settling after rain.",
            "reopened_by": "QA Auditor"
        },
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200, f"Reopen failed: {res.text}"
    print(f"\n[TEST 10 PASS] Authority Action: Reopened ticket.")
    res = client.get(f"/api/grievances/track/{ticket_id}")
    assert res.status_code == 200
    assert res.json().get("status") == "Reopened"

    # 11. Test Rejection Flow with another grievance
    res = client.post(
        "/api/grievances",
        data={
            "title": "Private Property Wall Query",
            "description": "Neighbor built a decorative wall inside private compound.",
            "category": "Illegal Construction",
            "urgency": "Low",
            "latitude": "12.934",
            "longitude": "77.62",
            "landmark_address": "Ejipura",
            "ward_zone": "Ward 148",
            "citizen_name": "Anonymous",
            "citizen_phone": "+91 99999 00000",
            "citizen_email": "test@example.com"
        }
    )
    t2 = res.json().get("ticket_id") or res.json().get("ticket_number")
    res = client.post(
        f"/api/grievances/authority/{t2}/reject",
        json={"reason": "Private property matter; outside BBMP civic jurisdiction."},
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200
    print(f"\n[TEST 11 PASS] Authority Action: Rejection handled.")
    res = client.get(f"/api/grievances/track/{t2}")
    assert res.json().get("status") == "Rejected"
    print(f"               Citizen Track Status: {res.json().get('status')}")

    # 12. Test Error / Edge Cases
    # Non-existent ticket
    res = client.get("/api/grievances/track/NONEXISTENT-9999")
    assert res.status_code in [404, 200]
    if res.status_code == 200:
        assert res.json().get("found") is False or res.json().get("status") is None or "not found" in str(res.json()).lower()
    print(f"\n[TEST 12 PASS] Non-existent ticket properly handled.")

    # 13. Test Metrics Endpoint
    res = client.get("/api/grievances/authority/metrics", headers=AUTH_HEADERS)
    assert res.status_code == 200
    metrics = res.json()
    print(f"\n[TEST 13 PASS] Authority Metrics: {metrics}")
    assert "total_complaints" in metrics or "total" in metrics

    print("\n=======================================================")
    print("ALL 13 CITIZEN-AUTHORITY SYNC TESTS COMPLETED & PASSED!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_full_grievance_sync()
