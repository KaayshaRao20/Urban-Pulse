import os
import cv2
import numpy as np
import requests

BASE_URL = "http://127.0.0.1:8000"

def create_synthetic_video(filename, width=640, height=480, fps=15, duration_sec=3.0, pattern="pothole"):
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, fps, (width, height))
    total_frames = int(fps * duration_sec)

    for i in range(total_frames):
        # Base grey asphalt frame
        frame = np.full((height, width, 3), 75, dtype=np.uint8)
        # Add road texture
        noise = np.random.normal(0, 12, (height, width, 3)).astype(np.int16)
        frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        if pattern == "pothole":
            # Dark elliptical cavity in center with high contrast edges
            cv2.ellipse(frame, (width // 2, height // 2), (110, 60), 0, 0, 360, (25, 25, 25), -1)
            cv2.ellipse(frame, (width // 2, height // 2), (115, 65), 0, 0, 360, (40, 40, 40), 4)
        elif pattern == "pothole_with_pedestrian":
            # Dark cavity on road
            cv2.ellipse(frame, (width // 2, height // 2), (110, 60), 0, 0, 360, (25, 25, 25), -1)
            # Add small pedestrian / person figure on the sidewalk corner (upper left)
            cv2.circle(frame, (90, 80), 24, (140, 160, 210), -1) # skin tone
            cv2.rectangle(frame, (70, 104), (110, 200), (180, 50, 40), -1) # shirt
        elif pattern == "face_only":
            # Camera pointed entirely at a human face / selfie (no asphalt)
            frame[:] = (135, 165, 220) # skin color filling the frame
            cv2.circle(frame, (200, 180), 30, (50, 50, 50), -1) # eye
            cv2.circle(frame, (440, 180), 30, (50, 50, 50), -1) # eye
        elif pattern == "blurry":
            # Severe motion blur with Gaussian blur
            frame = cv2.GaussianBlur(frame, (55, 55), 0)
        elif pattern == "clean_road":
            # Asphalt road with no defect at all
            pass

        out.write(frame)

    out.release()
    return filename

def run_tests():
    print("=== URBANPULSE CITIZEN PORTAL LOCATION & VIDEO VALIDATION TESTS ===")

    # Test 1: Video Payload Too Short (< 20KB or short duration)
    print("\n[Test 1] Testing Short Video Payload (<20KB)...")
    res1 = requests.post(
        f"{BASE_URL}/api/grievances/validate-video",
        files={"video": ("tiny.mp4", b"short data", "video/mp4")},
        data={"category": "Pothole / Road Damage"}
    )
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.text}"
    val1 = res1.json()
    print(f"Result: is_valid={val1.get('is_valid')}, reason='{val1.get('reason')}', action='{val1.get('action')}'")
    assert val1.get("is_valid") is False
    assert "Recording is too short" in val1.get("reason", "")
    assert val1.get("action") == "record_again"
    print("[PASS] Test 1 Passed: Short video rejected with user-friendly reason & 'record_again' action.")

    # Test 2: Blurry Video
    print("\n[Test 2] Testing Blurry Video...")
    blurry_file = "test_blurry.mp4"
    create_synthetic_video(blurry_file, duration_sec=2.0, pattern="blurry")
    with open(blurry_file, "rb") as f:
        res2 = requests.post(
            f"{BASE_URL}/api/grievances/validate-video",
            files={"video": (blurry_file, f, "video/mp4")},
            data={"category": "Pothole / Road Damage"}
        )
    if os.path.exists(blurry_file):
        os.remove(blurry_file)
    assert res2.status_code == 200, f"Expected 200, got {res2.status_code}: {res2.text}"
    val2 = res2.json()
    print(f"Result: is_valid={val2.get('is_valid')}, reason='{val2.get('reason')}', action='{val2.get('action')}'")
    assert val2.get("is_valid") is False
    assert "blurry" in val2.get("reason", "").lower()
    assert val2.get("action") == "record_again"
    print("[PASS] Test 2 Passed: Blurry video rejected with actionable reason & 'record_again' action.")

    # Test 3: Face-Only Selfie (Not Road)
    print("\n[Test 3] Testing Face-Only Selfie Video...")
    face_file = "test_face.mp4"
    create_synthetic_video(face_file, duration_sec=2.0, pattern="face_only")
    with open(face_file, "rb") as f:
        res3 = requests.post(
            f"{BASE_URL}/api/grievances/validate-video",
            files={"video": (face_file, f, "video/mp4")},
            data={"category": "Pothole / Road Damage"}
        )
    if os.path.exists(face_file):
        os.remove(face_file)
    assert res3.status_code == 200, f"Expected 200, got {res3.status_code}: {res3.text}"
    val3 = res3.json()
    print(f"Result: is_valid={val3.get('is_valid')}, reason='{val3.get('reason')}', action='{val3.get('action')}'")
    assert val3.get("is_valid") is False
    assert ("reported issue is not visible" in val3.get("reason", "").lower()) or ("does not appear to show" in val3.get("reason", "").lower())
    print("[PASS] Test 3 Passed: Face-only selfie rejected with clear explanation.")

    # Test 4: Road Defect with Pedestrian Present in Background
    print("\n[Test 4] Testing Road Defect Video with Pedestrian Present in Background...")
    ped_file = "test_pothole_ped.mp4"
    create_synthetic_video(ped_file, duration_sec=2.0, pattern="pothole_with_pedestrian")
    with open(ped_file, "rb") as f:
        res4 = requests.post(
            f"{BASE_URL}/api/grievances/validate-video",
            files={"video": (ped_file, f, "video/mp4")},
            data={"category": "Pothole / Road Damage"}
        )
    assert res4.status_code == 200, f"Expected 200, got {res4.status_code}: {res4.text}"
    val4 = res4.json()
    print(f"Result: is_valid={val4.get('is_valid')}, verdict='{val4.get('verdict')}', confidence={val4.get('confidence')}")
    assert val4.get("is_valid") is True, f"Video with road defect and pedestrian should not be falsely rejected! Got {val4}"
    print("[PASS] Test 4 Passed: Presence of pedestrians did NOT invalidate legitimate road defect video.")

    # Test 5: End-to-End Submission with Verified GPS & Sync to Authority Portal
    print("\n[Test 5] Testing End-to-End Submission with Verified GPS & Authority Sync...")
    test_lat = 12.93524
    test_lng = 77.62448
    with open(ped_file, "rb") as f:
        sub_res = requests.post(
            f"{BASE_URL}/api/grievances",
            data={
                "category": "Pothole / Road Damage",
                "title": "Severe road crater near Sony World Signal",
                "description": "Deep asphalt defect causing severe traffic slow-down near Sony World junction.",
                "latitude": test_lat,
                "longitude": test_lng,
                "urgency": "High",
                "landmark_address": "Near Sony World Signal, Koramangala 100ft Road",
                "ward_zone": "Koramangala Ward 151",
                "citizen_name": "Test Citizen",
                "citizen_phone": "+91 98888 77777",
                "citizen_email": "testcitizen@urbanpulse.gov",
                "is_anonymous": "false"
            },
            files={"video": (ped_file, f, "video/mp4")}
        )
    if os.path.exists(ped_file):
        os.remove(ped_file)

    assert sub_res.status_code == 200, f"Submission failed: {sub_res.status_code} - {sub_res.text}"
    ticket = sub_res.json()
    ticket_id = ticket.get("ticket_id")
    print(f"Grievance created! Ticket ID: {ticket_id}, Lat: {ticket.get('latitude')}, Lng: {ticket.get('longitude')}")
    assert ticket_id, "Missing ticket_id"
    assert abs(ticket.get("latitude") - test_lat) < 0.001, "Latitude mismatch"
    assert abs(ticket.get("longitude") - test_lng) < 0.001, "Longitude mismatch"

    # Verify Authority Portal Query includes this record with matching coordinates
    auth_res = requests.get(
        f"{BASE_URL}/api/grievances/authority/list",
        headers={"X-Authority-Role": "officer"}
    )
    assert auth_res.status_code == 200, f"Authority records query failed: {auth_res.text}"
    auth_records = auth_res.json().get("grievances", [])
    matching_record = next((r for r in auth_records if r.get("ticket_number") == ticket_id or r.get("id") == ticket_id), None)
    assert matching_record is not None, f"Ticket {ticket_id} was not found in Authority Portal records!"
    print(f"Authority Portal Sync Confirmed! Found Ticket {matching_record.get('ticket_number')} with Status: {matching_record.get('status')}")
    assert abs(matching_record.get("latitude") - test_lat) < 0.001, "Authority record latitude mismatch"
    assert abs(matching_record.get("longitude") - test_lng) < 0.001, "Authority record longitude mismatch"
    print("[PASS] Test 5 Passed: Verified GPS coordinates saved accurately and synced seamlessly to Authority Portal.")

    print("\n========================================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("========================================================")

if __name__ == "__main__":
    run_tests()
