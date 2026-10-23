import urllib.request
import json
import urllib.error
import time

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def post_json(path, data):
    res = client.post(f"/api/auth{path}", json=data)
    try:
        data = res.json()
    except Exception:
        data = {"detail": res.text}
    return res.status_code, data

def run_tests():
    print('=== 1. Authority Login Test (01kaaysha) ===')
    status, data = post_json('/login', {'identifier': '01kaaysha', 'password': 'bbmp2026'})
    print(f'Status: {status}')
    print(f"User: {data.get('user', {}).get('name')} | Role: {data.get('user', {}).get('role')} | Badge: {data.get('user', {}).get('badgeId')}")
    assert status == 200, f'Expected 200, got {status}'
    assert data['user']['role'] == 'officer'
    assert data['user']['username'] == '01kaaysha'
    print('[PASS] Authority Login 01kaaysha works.')

    print('\n=== 2. Admin Authority Login Test (admin@urbanpulse.gov.in) ===')
    status, data = post_json('/login', {'identifier': 'admin@urbanpulse.gov.in', 'password': 'bbmp2026'})
    print(f'Status: {status}')
    print(f"User: {data.get('user', {}).get('name')} | Role: {data.get('user', {}).get('role')}")
    assert status == 200, f'Expected 200, got {status}'
    assert data['user']['role'] == 'admin'
    print('[PASS] Admin Authority Login works.')

    print('\n=== 3. Citizen Login Test (citizen@urbanpulse.org) ===')
    status, data = post_json('/login', {'identifier': 'citizen@urbanpulse.org', 'password': 'citizen2026'})
    print(f'Status: {status}')
    print(f"User: {data.get('user', {}).get('name')} | Role: {data.get('user', {}).get('role')}")
    assert status == 200, f'Expected 200, got {status}'
    assert data['user']['role'] == 'citizen'
    print('[PASS] Citizen Login works.')

    print('\n=== 4. Duplicate Email Prevention Test ===')
    status, data = post_json('/register', {
        'full_name': 'Duplicate Test User',
        'email': 'citizen@urbanpulse.org',
        'phone': '+91 99999 88888',
        'password': 'Password123'
    })
    print(f"Status: {status} | Detail: {data.get('detail')}")
    assert status == 409, f'Expected 409 Conflict, got {status}'
    assert 'email' in data.get('detail', '').lower()
    print('[PASS] Duplicate Email registration prevented with HTTP 409.')

    print('\n=== 5. Duplicate Phone Prevention Test ===')
    status, data = post_json('/register', {
        'full_name': 'Duplicate Phone User',
        'email': 'unique.phone.test@example.com',
        'phone': '98450 12345',
        'password': 'Password123'
    })
    print(f"Status: {status} | Detail: {data.get('detail')}")
    assert status == 409, f'Expected 409 Conflict, got {status}'
    assert 'phone' in data.get('detail', '').lower()
    print('[PASS] Duplicate Phone registration prevented with HTTP 409.')

    print('\n=== 6. New Citizen Registration & OTP Verification Flow ===')
    ts = int(time.time())
    test_email = f'pooja.citizen.{ts}@example.com'
    test_phone = f'+9198765{ts % 100000:05d}'
    status, data = post_json('/register', {
        'full_name': 'Pooja Hegde',
        'email': test_email,
        'phone': test_phone,
        'password': 'SecurePassword2026'
    })
    print(f'Register Status: {status}')
    otp = data.get('verification_otp') or data.get('dev_otp')
    print(f'OTP Generated: {otp}')
    assert status == 200, f'Expected 200, got {status}: {data}'
    assert len(otp) == 6

    # Verify OTP
    status, data = post_json('/verify-otp', {
        'email': test_email,
        'otp': otp
    })
    print(f'OTP Verify Status: {status}')
    print(f"Verified User: {data.get('user', {}).get('name')} | Verified: {data.get('user', {}).get('email_verified')}")
    assert status == 200, f'Expected 200, got {status}: {data}'
    assert data['user']['email_verified'] is True
    print('[PASS] Citizen Registration & OTP Verification works.')

    print('\n=== 7. Forgot Password & Reset Flow ===')
    status, data = post_json('/forgot-password', {'email': test_email})
    print(f'Forgot Status: {status}')
    reset_token = data.get('reset_token') or data.get('dev_token')
    print(f'Reset Token: {reset_token}')
    assert status == 200, f'Expected 200, got {status}: {data}'
    assert reset_token

    # Reset password with token
    status, data = post_json('/reset-password', {
        'email': test_email,
        'token': reset_token,
        'new_password': 'BrandNewPassword2026'
    })
    print(f'Reset Password Status: {status}')
    assert status == 200, f'Expected 200, got {status}: {data}'

    # Login with new password
    status, data = post_json('/login', {
        'identifier': test_email,
        'password': 'BrandNewPassword2026'
    })
    print(f'New Password Login Status: {status}')
    assert status == 200, f'Expected 200, got {status}: {data}'
    assert data['user']['email'] == test_email
    print('[PASS] Forgot & Reset Password Flow works.')

    print('\n=== 8. Google OAuth Flow ===')
    status, data = post_json('/google', {
        'google_id': f'goog-sub-{ts}',
        'email': f'google.citizen.{ts}@example.com',
        'name': 'Google Citizen User',
        'avatar_url': 'https://lh3.googleusercontent.com/a/demo'
    })
    print(f'Google Auth Status: {status}')
    print(f"Google User: {data.get('user', {}).get('name')} | Provider: {data.get('user', {}).get('auth_provider')}")
    assert status == 200, f'Expected 200, got {status}: {data}'
    assert data['user']['role'] == 'citizen'
    assert data['user']['auth_provider'] == 'google'
    print('[PASS] Google OAuth works.')

    print('\n' + '='*60)
    print('ALL AUTHENTICATION CRITERIA VERIFIED AND PASSED 100%!')
    print('='*60)

if __name__ == '__main__':
    run_tests()
