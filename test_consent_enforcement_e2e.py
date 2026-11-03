"""
UrbanPulse Comprehensive Test Suite: Terms & Conditions and Consent Management
Tests all 11 criteria specified in requirements:
 1. New citizen consent requirement check.
 2. Checkbox requirement (acceptance without checkbox fails).
 3. Terms content retrieval (6 cards + master terms).
 4. Persistent acceptance stored in database (user ID, version, timestamp, consent status).
 5. Returning citizen with current version bypasses re-acceptance.
 6. Admin version upgrade forces returning citizen to accept new version.
 7. Direct API submission blocked without consent (HTTP 403).
 8. Suspended citizen blocked from grievance submission (HTTP 403).
 9. Suspended citizen blocked from community voting and live verification (HTTP 403).
10. Existing complaints preserved when citizen account is suspended.
11. Administrative enforcement logging, reasons, and appeal workflow.
"""

import sys
import os
import uuid
import datetime

# Add backend directory to sys.path
backend_path = os.path.join(os.path.dirname(__file__), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.database import (
    SessionLocal,
    Base,
    engine,
    init_db,
    UserModel,
    TermsConsentRecordModel,
    AccountEnforcementLogModel,
    CivicComplaintModel,
    SystemConfigModel
)

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("URBANPULSE TERMS & CONDITIONS AND CONSENT MANAGEMENT TEST SUITE")
    print("=" * 70)

    # Initialize and migrate database
    init_db()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    passed_count = 0
    total_tests = 11

    test_uid = f"citizen_test_{uuid.uuid4().hex[:8]}"
    test_email = f"{test_uid}@example.com"

    try:
        # Create a fresh citizen user in the database
        user = UserModel(
            id=test_uid,
            username=test_uid,
            email=test_email,
            hashed_password="mock_hashed_password_123",
            full_name="Rajesh Bangalore Resident",
            role="citizen",
            terms_accepted=False,
            terms_version=None,
            consent_status="pending",
            enforcement_status="active"
        )
        db.add(user)
        db.commit()

        # Ensure active terms version is v1.0 initially
        cfg = db.query(SystemConfigModel).filter(SystemConfigModel.key == "active_terms_version").first()
        if not cfg:
            cfg = SystemConfigModel(key="active_terms_version", value="v1.0")
            db.add(cfg)
        else:
            cfg.value = "v1.0"
        db.commit()

        # -------------------------------------------------------------
        # Test 1: New citizen requires consent
        # -------------------------------------------------------------
        res1 = client.get(f"/api/consent/status?user_id={test_uid}&email={test_email}")
        data1 = res1.json()
        assert res1.status_code == 200, f"Expected 200, got {res1.status_code}"
        assert data1.get("requires_consent") is True, "New citizen should require consent"
        assert data1.get("accepted") is False, "New citizen terms accepted should be False"
        print("[PASS] Test 1: New citizen correctly flagged as requiring terms consent")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 2: Checkbox requirement (submission without checkbox fails)
        # -------------------------------------------------------------
        res2 = client.post("/api/consent/accept", json={
            "user_id": test_uid,
            "email": test_email,
            "version": "v1.0",
            "checkbox_accepted": False
        })
        assert res2.status_code == 400, f"Expected 400 when checkbox is False, got {res2.status_code}"
        print("[PASS] Test 2: Button/Action blocked if checkbox is not selected")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 3: Citizen can view terms content (6 cards + master terms)
        # -------------------------------------------------------------
        res3 = client.get("/api/consent/terms-content")
        assert res3.status_code == 200
        data3 = res3.json()
        assert len(data3.get("sections", [])) == 6, f"Expected 6 sections, got {len(data3.get('sections', []))}"
        sec_ids = [s["id"] for s in data3["sections"]]
        assert "responsible_use" in sec_ids
        assert "location_evidence" in sec_ids
        assert "safety_restrictions" in sec_ids
        assert "privacy_data" in sec_ids
        assert "account_enforcement" in sec_ids
        assert "violation_consequences" in sec_ids
        assert "serious or deliberate violation" in data3["sections"][5]["bullets"][0].lower()
        print("[PASS] Test 3: Structured terms content (6 cards + severe misconduct clause) retrieved")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 4: Acceptance is saved in database with user ID, version, timestamp
        # -------------------------------------------------------------
        res4 = client.post("/api/consent/accept", json={
            "user_id": test_uid,
            "email": test_email,
            "version": "v1.0",
            "checkbox_accepted": True
        })
        assert res4.status_code == 200, f"Expected 200 on valid consent, got {res4.status_code}"
        # Verify in DB
        db.refresh(user)
        assert user.terms_accepted is True, "User terms_accepted should be True in DB"
        assert user.terms_version == "v1.0", f"User terms_version should be v1.0, got {user.terms_version}"
        assert user.terms_accepted_at is not None, "User terms_accepted_at timestamp should exist"
        assert user.consent_status == "accepted", f"User consent_status should be 'accepted', got {user.consent_status}"
        
        # Verify audit log entry
        consent_record = db.query(TermsConsentRecordModel).filter(
            TermsConsentRecordModel.user_id == test_uid
        ).first()
        assert consent_record is not None, "TermsConsentRecordModel record must exist"
        print("[PASS] Test 4: Persistent acceptance recorded with user ID, version, and timestamp")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 5: Returning citizen with current version bypasses re-acceptance
        # -------------------------------------------------------------
        res5 = client.get(f"/api/consent/status?user_id={test_uid}&email={test_email}")
        data5 = res5.json()
        assert data5.get("requires_consent") is False, "Returning citizen with same version should NOT require consent"
        assert data5.get("accepted") is True, "Accepted flag should be True"
        print("[PASS] Test 5: Returning citizen enters dashboard without re-acceptance popup")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 6: Admin publishes new version -> returning citizen must accept
        # -------------------------------------------------------------
        res6_pub = client.post("/api/consent/admin/publish-version", json={
            "new_version": "v2.0",
            "last_updated": "04 Nov 2026",
            "notes": "Updated municipal arbitration clause"
        })
        assert res6_pub.status_code == 200
        
        res6_check = client.get(f"/api/consent/status?user_id={test_uid}&email={test_email}")
        data6 = res6_check.json()
        assert data6.get("requires_consent") is True, "User with v1.0 must require consent when v2.0 is active"
        assert data6.get("active_version") == "v2.0"
        
        # Accept v2.0
        client.post("/api/consent/accept", json={
            "user_id": test_uid,
            "email": test_email,
            "version": "v2.0",
            "checkbox_accepted": True
        })
        res6_after = client.get(f"/api/consent/status?user_id={test_uid}&email={test_email}")
        assert res6_after.json().get("requires_consent") is False
        print("[PASS] Test 6: Publishing new version successfully forces consent gate for returning users")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 7: Direct API submission blocked without consent
        # -------------------------------------------------------------
        unconsented_uid = f"unconsented_{uuid.uuid4().hex[:6]}"
        unconsented_email = f"{unconsented_uid}@example.com"
        u_unconsented = UserModel(
            id=unconsented_uid,
            username=unconsented_uid,
            email=unconsented_email,
            hashed_password="mock_hashed_password_123",
            full_name="Unconsented Citizen",
            role="citizen",
            terms_accepted=False,
            consent_status="pending"
        )
        db.add(u_unconsented)
        db.commit()

        # Attempt to create grievance directly via API
        res7 = client.post(
            "/api/grievances",
            data={
                "category": "Pothole / Road Damage",
                "title": "Severe Pothole on Marathahalli Lane",
                "description": "Deep asphalt depression causing vehicular tire damage.",
                "latitude": 12.9569,
                "longitude": 77.7011,
                "citizen_name": unconsented_uid,
                "citizen_email": unconsented_email
            }
        )
        assert res7.status_code == 403, f"Expected 403 for unconsented API submission, got {res7.status_code}"
        assert "acceptance required" in res7.json().get("detail", "").lower()
        print("[PASS] Test 7: Direct API submission strictly blocked without consent (HTTP 403)")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 8: Suspended citizen blocked from submission
        # -------------------------------------------------------------
        # First submit a valid complaint by test_uid (who has consented to v2.0)
        res8_ok = client.post(
            "/api/grievances",
            data={
                "category": "Pothole / Road Damage",
                "title": "Deep road crater near tech corridor",
                "description": "Hazardous road crater on Outer Ring Road tech corridor.",
                "latitude": 12.9569,
                "longitude": 77.7011,
                "citizen_name": test_uid,
                "citizen_email": test_email
            }
        )
        assert res8_ok.status_code == 200, f"Expected 200 for consented user, got {res8_ok.status_code}: {res8_ok.text}"
        ticket_id = res8_ok.json().get("ticket_id") or res8_ok.json().get("complaint", {}).get("ticket_number")
        assert ticket_id is not None, f"Expected ticket_id in response, got {res8_ok.json()}"

        # Now suspend the test citizen
        res8_enforce = client.post("/api/consent/admin/enforce-user", json={
            "user_identifier": test_uid,
            "action": "temporary_suspension",
            "reason": "Repeated submission of spam reports",
            "admin_notes": "First warning followed by 7-day restriction"
        })
        assert res8_enforce.status_code == 200

        # Attempt to submit another grievance
        res8_blocked = client.post(
            "/api/grievances",
            data={
                "category": "Garbage / Solid Waste",
                "title": "Uncollected trash bags",
                "description": "Trash bags accumulated near corner.",
                "latitude": 12.9569,
                "longitude": 77.7011,
                "citizen_name": test_uid,
                "citizen_email": test_email
            }
        )
        assert res8_blocked.status_code == 403, f"Expected 403 for suspended user, got {res8_blocked.status_code}"
        assert "suspended" in res8_blocked.json().get("detail", "").lower()
        print("[PASS] Test 8: Suspended citizen strictly blocked from grievance submission (HTTP 403)")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 9: Suspended citizen blocked from community voting and live verification
        # -------------------------------------------------------------
        # Try to vote support
        res9_support = client.post(
            f"/api/community/issues/{ticket_id}/support",
            json={
                "citizen_id": test_uid,
                "citizen_email": test_email,
                "citizen_name": "Test Resident"
            }
        )
        assert res9_support.status_code == 403, f"Expected 403 for support vote from suspended user, got {res9_support.status_code}"
        assert "suspended" in res9_support.json().get("detail", "").lower()

        # Try to challenge
        res9_challenge = client.post(
            f"/api/community/issues/{ticket_id}/challenge",
            json={
                "citizen_id": test_uid,
                "citizen_email": test_email,
                "reason": "This is already fixed by municipal crew"
            }
        )
        assert res9_challenge.status_code == 403, f"Expected 403 for challenge vote from suspended user, got {res9_challenge.status_code}"

        print("[PASS] Test 9: Suspended citizen blocked from community voting and disputes (HTTP 403)")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 10: Existing complaints preserved when citizen account is suspended
        # -------------------------------------------------------------
        complaint_in_db = db.query(CivicComplaintModel).filter(
            CivicComplaintModel.ticket_number == ticket_id
        ).first()
        assert complaint_in_db is not None, "Prior grievance must remain intact in database"
        assert complaint_in_db.title == "Deep road crater near tech corridor"
        print("[PASS] Test 10: Prior complaints safely preserved after account suspension")
        passed_count += 1

        # -------------------------------------------------------------
        # Test 11: Enforcement logging and appeal submission
        # -------------------------------------------------------------
        # Verify enforcement audit log exists
        enf_log = db.query(AccountEnforcementLogModel).filter(
            AccountEnforcementLogModel.user_id == test_uid
        ).first()
        assert enf_log is not None, "Enforcement audit log must be recorded"
        assert enf_log.action == "temporary_suspension"
        assert "spam" in enf_log.reason.lower()

        # Submit citizen appeal
        res11_appeal = client.post("/api/consent/appeal", json={
            "user_identifier": test_uid,
            "reason": "The report was legitimate and verified by neighbors. Please review."
        })
        assert res11_appeal.status_code == 200
        db.refresh(user)
        assert user.enforcement_appealed is True, "User should have enforcement_appealed=True"
        assert "legitimate" in user.enforcement_appeal_notes

        # Reinstate user via admin
        res11_reinstate = client.post("/api/consent/admin/enforce-user", json={
            "user_identifier": test_uid,
            "action": "reinstatement",
            "reason": "Appeal reviewed and approved by municipal supervisor",
            "admin_notes": "Citizen verified genuine intention"
        })
        assert res11_reinstate.status_code == 200
        db.refresh(user)
        assert user.enforcement_status == "active"
        print("[PASS] Test 11: Enforcement audit logging, appeal workflow, and administrative reinstatement verified")
        passed_count += 1

        print("=" * 70)
        print(f"ALL {passed_count}/{total_tests} TESTS PASSED SUCCESSFULLY (100% SUCCESS RATE)")
        print("=" * 70)

    finally:
        # Cleanup test records
        try:
            db.query(AccountEnforcementLogModel).filter(AccountEnforcementLogModel.user_id == test_uid).delete()
            db.query(TermsConsentRecordModel).filter(TermsConsentRecordModel.user_id == test_uid).delete()
            db.query(CivicComplaintModel).filter(CivicComplaintModel.citizen_email == test_email).delete()
            db.query(UserModel).filter(UserModel.id.in_([test_uid, unconsented_uid])).delete()
            db.commit()
        except Exception:
            pass
        db.close()

if __name__ == "__main__":
    run_tests()
