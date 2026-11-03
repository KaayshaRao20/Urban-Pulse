"""
Comprehensive End-to-End Integration Test for UrbanPulse Community Help Feature
Tests:
1. Haversine spatial filtering & locality detection (GET /api/community/issues)
2. Geographic restriction (rejecting issues beyond 2km)
3. Vote casting: Support / Verify (POST /api/community/issues/{id}/support)
4. Vote casting: Challenge / Dispute with reason requirement (POST /api/community/issues/{id}/challenge)
5. Live GPS On-site verification:
   - Rejection when citizen is > 50m away from issue coordinates
   - Rejection when GPS accuracy is > 50m
   - Successful submission when citizen is within <= 50m and accurate GPS
6. Detailed issue retrieval (GET /api/community/issues/{id}/details)
"""

import os
import io
import sys

# Ensure backend directory is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.community_engine import router as community_router, init_community_seeds

# Test app with community router mounted
app = FastAPI(title="UrbanPulse Community Help Test Suite")
app.include_router(community_router)

# Initialize seed issues
init_community_seeds()

client = TestClient(app)

def run_tests():
    print("=" * 70, flush=True)
    print("URBANPULSE COMMUNITY HELP - END-TO-END TEST SUITE", flush=True)
    print("=" * 70, flush=True)
    passed = 0
    total = 0

    # Ensure test citizen has accepted active terms
    try:
        from app.database import SessionLocal, UserModel, SystemConfigModel, init_db
        init_db()
        db = SessionLocal()
        cfg = db.query(SystemConfigModel).filter(SystemConfigModel.key == "active_terms_version").first()
        active_v = cfg.value if cfg else "v1.0"
        test_emails = ["test_citizen@urbanpulse.org", "dispute_user@urbanpulse.org", "onsite_user@urbanpulse.org"]
        for em in test_emails:
            u = db.query(UserModel).filter(UserModel.email == em).first()
            if not u:
                u = UserModel(
                    id=f"user_{em.split('@')[0]}",
                    email=em,
                    username=em.split('@')[0],
                    hashed_password="mock_password",
                    full_name=em.split('@')[0].replace('_', ' ').title(),
                    role="citizen",
                    terms_accepted=True,
                    terms_version=active_v,
                    consent_status="accepted",
                    enforcement_status="active"
                )
                db.add(u)
            else:
                u.terms_accepted = True
                u.terms_version = active_v
                u.consent_status = "accepted"
                u.enforcement_status = "active"
        db.commit()
        db.close()
    except Exception as e:
        print(f"Setup note: {e}")

    # 1. Nearby Issues Discovery (Marathahalli Bridge: 12.9569, 77.7011)
    total += 1
    print("\n[Test 1] GET /api/community/issues (Nearby Marathahalli 2km)...", flush=True)
    res = client.get("/api/community/issues?lat=12.9569&lng=77.7011&radius_km=2.0")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "issues" in data, "Response missing 'issues'"
    assert "locality" in data, "Response missing 'locality'"
    assert len(data["issues"]) > 0, "Expected at least 1 nearby issue"
    print(f"  [PASS] Found {len(data['issues'])} issues near '{data['locality']}'. First issue: {data['issues'][0]['id']} ({data['issues'][0]['title']})", flush=True)
    target_issue = data["issues"][0]
    target_id = target_issue["id"]
    target_lat = target_issue["latitude"]
    target_lng = target_issue["longitude"]
    passed += 1

    # 2. Geographic Boundary Enforcement (Far coordinate: Hebbal Flyover: 13.0358, 77.5970 ~ 14km away)
    total += 1
    print("\n[Test 2] Geographic Boundary Check (Query far location 14km away with 2km radius)...", flush=True)
    res_far = client.get("/api/community/issues?lat=13.0358&lng=77.5970&radius_km=2.0")
    assert res_far.status_code == 200
    data_far = res_far.json()
    far_issue_ids = [iss["id"] for iss in data_far["issues"]]
    assert target_id not in far_issue_ids, f"Error: Issue {target_id} from Marathahalli leaked into Hebbal search!"
    print(f"  [PASS] Strict spatial filter verified: {target_id} properly excluded when searching 14km away.", flush=True)
    passed += 1

    # 3. Support Vote
    total += 1
    print(f"\n[Test 3] POST /api/community/issues/{target_id}/support (Citizen Vote)...", flush=True)
    user_email = "test_citizen@urbanpulse.org"
    res_support = client.post(
        f"/api/community/issues/{target_id}/support",
        json={"citizen_email": user_email, "citizen_name": "Rajesh Kumar"}
    )
    assert res_support.status_code == 200, f"Support failed: {res_support.text}"
    support_data = res_support.json()
    assert support_data["action"] in ["supported", "unsupported"], f"Unexpected action: {support_data}"
    print(f"  [PASS] Support vote recorded: action={support_data['action']}, support_count={support_data['support_count']}", flush=True)
    passed += 1

    # 4. Challenge Vote - Reason Validation (<5 chars should fail)
    total += 1
    print(f"\n[Test 4] POST /api/community/issues/{target_id}/challenge (Validation of required reason)...", flush=True)
    res_ch_empty = client.post(
        f"/api/community/issues/{target_id}/challenge",
        json={"citizen_email": "dispute_user@urbanpulse.org", "citizen_name": "Anita Rao", "reason": "bad"}
    )
    assert res_ch_empty.status_code == 400, "Expected 400 for short reason"
    print(f"  [PASS] Short/empty challenge reason properly rejected with 400: {res_ch_empty.json()['detail']}", flush=True)
    passed += 1

    total += 1
    print(f"\n[Test 5] POST /api/community/issues/{target_id}/challenge (Valid dispute)...", flush=True)
    res_ch_valid = client.post(
        f"/api/community/issues/{target_id}/challenge",
        json={
            "citizen_email": "dispute_user@urbanpulse.org",
            "citizen_name": "Anita Rao",
            "reason": "This pothole was patched by BBMP crew yesterday afternoon."
        }
    )
    assert res_ch_valid.status_code == 200, f"Challenge failed: {res_ch_valid.text}"
    ch_data = res_ch_valid.json()
    assert ch_data["dispute_count"] >= 1, "Dispute count did not increment"
    print(f"  [PASS] Valid challenge recorded: dispute_count={ch_data['dispute_count']}", flush=True)
    passed += 1

    # 5. Live GPS On-site Verification - Reject > 50m
    total += 1
    print(f"\n[Test 6] On-Site Verification Distance Restriction (> 50m violation)...", flush=True)
    # Shift coordinate by ~200m north (0.0018 deg lat ~ 200m)
    far_lat = target_lat + 0.002
    far_lng = target_lng
    dummy_photo = io.BytesIO(b"fake jpeg raw image content for test")
    dummy_photo.name = "test_live_evidence.jpg"

    res_far_evidence = client.post(
        f"/api/community/issues/{target_id}/verify-onsite",
        data={
            "user_lat": str(far_lat),
            "user_lng": str(far_lng),
            "gps_accuracy": "5.0",
            "citizen_id": "onsite_user@urbanpulse.org",
            "citizen_name": "Sunil V",
            "evidence_type": "photo",
            "notes": "Attempting verification from far away"
        },
        files={"file": ("test_live_evidence.jpg", dummy_photo, "image/jpeg")}
    )
    assert res_far_evidence.status_code == 400, f"Expected 400, got {res_far_evidence.status_code}"
    assert "within 50 meters" in res_far_evidence.json()["detail"]
    print(f"  [PASS] Distance enforcement passed: Blocked verification > 50m: {res_far_evidence.json()['detail']}", flush=True)
    passed += 1

    # 6. Live GPS On-site Verification - Reject poor GPS accuracy (> 50m)
    total += 1
    print(f"\n[Test 7] On-Site Verification GPS Accuracy Restriction (> 50m accuracy)...", flush=True)
    dummy_photo2 = io.BytesIO(b"fake jpeg raw image content for test")
    res_poor_gps = client.post(
        f"/api/community/issues/{target_id}/verify-onsite",
        data={
            "user_lat": str(target_lat),
            "user_lng": str(target_lng),
            "gps_accuracy": "85.0",  # Poor accuracy 85m
            "citizen_id": "onsite_user@urbanpulse.org",
            "citizen_name": "Sunil V",
            "evidence_type": "photo",
            "notes": "Poor accuracy attempt"
        },
        files={"file": ("test_live_evidence.jpg", dummy_photo2, "image/jpeg")}
    )
    assert res_poor_gps.status_code == 400
    assert "GPS satellite accuracy" in res_poor_gps.json()["detail"]
    print(f"  [PASS] Inaccurate GPS check passed: Blocked submission with accuracy 85m: {res_poor_gps.json()['detail']}", flush=True)
    passed += 1

    # 7. Live GPS On-site Verification - Successful <= 50m
    total += 1
    print(f"\n[Test 8] On-Site Verification Success (Within 5m with 4.5m GPS accuracy)...", flush=True)
    # Shift coordinate by ~5m (0.000045 deg lat ~ 5m)
    close_lat = target_lat + 0.000045
    close_lng = target_lng
    dummy_photo3 = io.BytesIO(b"valid live jpeg evidence byte data")
    res_onsite_success = client.post(
        f"/api/community/issues/{target_id}/verify-onsite",
        data={
            "user_lat": str(close_lat),
            "user_lng": str(close_lng),
            "gps_accuracy": "4.5",
            "citizen_id": "onsite_user@urbanpulse.org",
            "citizen_name": "Sunil V",
            "evidence_type": "photo",
            "notes": "Verified in person: pothole is still active and deep."
        },
        files={"file": ("live_defect_capture.jpg", dummy_photo3, "image/jpeg")}
    )
    assert res_onsite_success.status_code == 200, f"Expected 200, got: {res_onsite_success.text}"
    onsite_data = res_onsite_success.json()
    assert onsite_data["success"] is True
    assert onsite_data["distance_meters"] <= 50.0
    print(f"  [PASS] On-site verification succeeded: distance={onsite_data['distance_meters']}m, total_verified={onsite_data['verification_count']}", flush=True)
    passed += 1

    # 8. Detailed View
    total += 1
    print(f"\n[Test 9] GET /api/community/issues/{target_id}/details...", flush=True)
    res_details = client.get(f"/api/community/issues/{target_id}/details")
    assert res_details.status_code == 200
    details = res_details.json()
    assert details["id"] == target_id
    assert "verifications" in details
    assert len(details["verifications"]) >= 1
    print(f"  [PASS] Details returned successfully with {len(details['verifications'])} on-site verifications and {len(details['disputes'])} disputes.", flush=True)
    passed += 1

    print("\n" + "=" * 70, flush=True)
    print(f"ALL {passed}/{total} INTEGRATION TESTS PASSED SUCCESSFULLY! (100%)", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    run_tests()
