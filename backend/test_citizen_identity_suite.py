import json
import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("==================================================================")
    print("URBANPULSE CITIZEN IDENTITY & PROFILE ISOLATION TEST SUITE")
    print("==================================================================")

    # -------------------------------------------------------------------------
    # TEST 1: Register and Verify Normal Citizen (Ananya Sengupta)
    # -------------------------------------------------------------------------
    print("\n--- TEST 1: Register New Citizen (Ananya Sengupta) ---")
    reg_payload = {
        "full_name": "Ananya Sengupta",
        "email": "ananya.sengupta@example.com",
        "phone": "+91 98450 77111",
        "password": "Password@2026",
        "confirm_password": "Password@2026",
        "role": "citizen"
    }
    r = client.post("/api/auth/register", json=reg_payload)
    print(f"Register status: {r.status_code}")
    assert r.status_code in [200, 409], f"Unexpected status: {r.text}"
    
    otp = "123456"
    if r.status_code == 200:
        data = r.json()
        otp = data.get("dev_otp", "123456")
        print(f"[OK] Registration initiated. Received OTP: {otp}")

    # Verify OTP
    v_res = client.post("/api/auth/verify-otp", json={
        "email": "ananya.sengupta@example.com",
        "otp": otp
    })
    print(f"Verify OTP status: {v_res.status_code}")
    assert v_res.status_code == 200, f"Verify failed: {v_res.text}"
    v_data = v_res.json()
    user_ananya = v_data["user"]
    token_ananya = v_data["access_token"]
    
    print(f"Verified Citizen Name: {user_ananya.get('name')}")
    print(f"Verified Citizen Email: {user_ananya.get('email')}")
    print(f"Verified Citizen Phone: {user_ananya.get('phone')}")
    print(f"Verified Citizen Role: {user_ananya.get('role')}")
    assert user_ananya["name"] == "Ananya Sengupta", f"Identity mismatch: {user_ananya.get('name')}"
    assert user_ananya["email"] == "ananya.sengupta@example.com", "Email mismatch for Ananya"
    assert user_ananya["role"] == "citizen", "Role should be citizen"
    print("[PASS] Test 1: Citizen 1 registered and verified with own distinct identity.")

    # -------------------------------------------------------------------------
    # TEST 2: Google Authentication for Citizen 2 (Rahul Verma)
    # -------------------------------------------------------------------------
    print("\n--- TEST 2: Google Auth for Citizen 2 (Rahul Verma) ---")
    g_payload_rahul = {
        "email": "rahul.verma@gmail.com",
        "full_name": "Rahul Verma",
        "google_id": "google-uid-rahul-9912",
        "avatar_url": "https://ui-avatars.com/api/?name=Rahul+Verma"
    }
    g_res = client.post("/api/auth/google", json=g_payload_rahul)
    print(f"Google Auth status: {g_res.status_code}")
    assert g_res.status_code == 200, f"Google auth failed: {g_res.text}"
    g_data_rahul = g_res.json()
    user_rahul = g_data_rahul["user"]
    token_rahul = g_data_rahul["access_token"]
    
    print(f"Google Citizen Name: {user_rahul.get('name')}")
    print(f"Google Citizen Email: {user_rahul.get('email')}")
    print(f"Google Citizen Role: {user_rahul.get('role')}")
    assert user_rahul["name"] == "Rahul Verma", f"Identity mismatch: {user_rahul.get('name')}"
    assert user_rahul["email"] == "rahul.verma@gmail.com", f"Email mismatch: {user_rahul.get('email')}"
    assert user_rahul["name"] != "Kaaysha Rao", "Error: Hardcoded Kaaysha Rao detected!"
    print("[PASS] Test 2: Google Citizen 2 logged in as Rahul Verma without hardcoded fallbacks.")

    # -------------------------------------------------------------------------
    # TEST 3: Google Authentication for Citizen 3 (Priya Sharma) + Profile Update
    # -------------------------------------------------------------------------
    print("\n--- TEST 3: Google Auth for Citizen 3 (Priya Sharma) & Profile Update ---")
    g_payload_priya = {
        "email": "priya.sharma@gmail.com",
        "full_name": "Priya Sharma",
        "google_id": "google-uid-priya-3381",
        "avatar_url": "https://ui-avatars.com/api/?name=Priya+Sharma"
    }
    g_res_priya = client.post("/api/auth/google", json=g_payload_priya)
    assert g_res_priya.status_code == 200, f"Google auth failed for Priya: {g_res_priya.text}"
    user_priya = g_res_priya.json()["user"]
    token_priya = g_res_priya.json()["access_token"]
    
    print(f"Google Citizen Name: {user_priya.get('name')}")
    print(f"Google Citizen Email: {user_priya.get('email')}")
    assert user_priya["name"] in ["Priya Sharma", "Priya Sharma-Bannerjee"], f"Identity mismatch for Priya: {user_priya['name']}"
    assert user_priya["email"] == "priya.sharma@gmail.com", "Email mismatch for Priya"
    assert user_priya["name"] != "Kaaysha Rao", "Error: Hardcoded Kaaysha Rao detected!"

    # Update Priya's Profile
    up_res = client.put(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token_priya}"},
        json={
            "full_name": "Priya Sharma-Bannerjee",
            "phone": "+91 99887 66554",
            "assigned_zone": "South Zone (Koramangala / BTM / Jayanagar)"
        }
    )
    print(f"Update Profile status: {up_res.status_code}")
    assert up_res.status_code == 200, f"Profile update failed: {up_res.text}"
    updated_priya = up_res.json()["user"]
    print(f"Updated Name: {updated_priya.get('name')}")
    print(f"Updated Phone: {updated_priya.get('phone')}")
    print(f"Updated Zone: {updated_priya.get('assignedZone')}")
    assert updated_priya["name"] == "Priya Sharma-Bannerjee"
    assert "+919988766554" in updated_priya["phone"] or "9988766554" in updated_priya["phone"]
    print("[PASS] Test 3: Citizen 3 profile update successfully saved and isolated.")

    # -------------------------------------------------------------------------
    # TEST 4: Grievance Ownership Isolation between Accounts
    # -------------------------------------------------------------------------
    print("\n--- TEST 4: Grievance Ownership & Privacy Isolation ---")
    # File a grievance as Ananya
    post_ananya = client.post(
        "/api/grievances",
        data={
            "category": "Pothole / Road Damage",
            "title": "Severe road cavity near Indiranagar 100ft road",
            "description": "Deep broken asphalt patch damaging commuter vehicles and two-wheelers.",
            "latitude": 12.9784,
            "longitude": 77.6408,
            "citizen_name": user_ananya["name"],
            "citizen_email": user_ananya["email"],
            "citizen_phone": user_ananya["phone"],
            "urgency": "High",
            "is_anonymous": "false"
        }
    )
    assert post_ananya.status_code == 200, f"Grievance lodge failed: {post_ananya.text}"
    t_ananya = post_ananya.json()["ticket_id"]
    print(f"[OK] Ananya lodged grievance: {t_ananya}")

    # File a grievance as Rahul
    post_rahul = client.post(
        "/api/grievances",
        data={
            "category": "Garbage / Solid Waste",
            "title": "Overflowing waste dumper on Bellandur service road",
            "description": "Uncollected commercial debris obstructing pedestrian footpath for 3 days.",
            "latitude": 12.9360,
            "longitude": 77.6920,
            "citizen_name": user_rahul["name"],
            "citizen_email": user_rahul["email"],
            "citizen_phone": "+91 98765 00000",
            "urgency": "Moderate",
            "is_anonymous": "false"
        }
    )
    assert post_rahul.status_code == 200, f"Grievance lodge failed: {post_rahul.text}"
    t_rahul = post_rahul.json()["ticket_id"]
    print(f"[OK] Rahul lodged grievance: {t_rahul}")

    # Query Ananya's grievances
    my_ananya = client.get(f"/api/grievances/my-grievances?citizen_email={user_ananya['email']}").json()
    ananya_tickets = [g["ticket_number"] for g in my_ananya.get("grievances", [])]
    print(f"Ananya's tickets: {ananya_tickets}")
    assert t_ananya in ananya_tickets, "Ananya's ticket should be present"
    assert t_rahul not in ananya_tickets, "Rahul's ticket must NOT leak to Ananya!"

    # Query Rahul's grievances
    my_rahul = client.get(f"/api/grievances/my-grievances?citizen_email={user_rahul['email']}").json()
    rahul_tickets = [g["ticket_number"] for g in my_rahul.get("grievances", [])]
    print(f"Rahul's tickets: {rahul_tickets}")
    assert t_rahul in rahul_tickets, "Rahul's ticket should be present"
    assert t_ananya not in rahul_tickets, "Ananya's ticket must NOT leak to Rahul!"
    print("[PASS] Test 4: Grievance ownership strictly isolated across separate accounts.")

    # -------------------------------------------------------------------------
    # TEST 5: Authority Portal Clearance Preservation
    # -------------------------------------------------------------------------
    print("\n--- TEST 5: Authority Platform Credentials Preservation ---")
    auth_res = client.post("/api/auth/login", json={
        "identifier": "01kaaysha",
        "password": "bbmp2026"
    })
    assert auth_res.status_code == 200, f"Authority login failed: {auth_res.text}"
    off_data = auth_res.json()["user"]
    print(f"Officer Name: {off_data.get('name')}")
    print(f"Officer Role: {off_data.get('role')}")
    print(f"Officer Badge: {off_data.get('badgeId')}")
    assert off_data["role"] == "officer", "Officer role must be preserved"
    assert "Kaaysha" in off_data["name"], "Duty Commander Kaaysha officer account intact"
    print("[PASS] Test 5: Authority Officer login and command credentials intact.")

    print("\n==================================================================")
    print("ALL 5 TESTS PASSED SUCCESSFULLY! ZERO HARDCODED IDENTITIES.")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
