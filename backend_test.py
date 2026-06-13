#!/usr/bin/env python3
"""
Pre-deploy Hardening Pass — Backend Testing
Tests F1, F2, F3, F4 security hardening phases
"""

import os
import sys
import requests
import time
import json
from typing import Dict, Any

# Configuration — credentials come from env (never hardcoded).
# Required: ADMIN_EMAIL, ADMIN_PASSWORD. Optional: BASE_URL.
BASE_URL = os.environ.get(
    "BASE_URL", "https://lusorae-genesis.preview.emergentagent.com/api"
)
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip()
if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    print(
        "❌ ADMIN_EMAIL and ADMIN_PASSWORD env vars are required. "
        "Read them from /app/backend/.env or /app/memory/test_credentials.md."
    )
    sys.exit(2)

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "total": 0,
    "details": []
}

def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"] += 1
        status = "✅ PASS"
    else:
        test_results["failed"] += 1
        status = "❌ FAIL"
    
    result = f"{status} | {name}"
    if details:
        result += f"\n    {details}"
    
    test_results["details"].append(result)
    print(result)

def get_admin_token() -> str:
    """Login and get admin token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json()["token"]
    raise Exception(f"Login failed: {response.status_code} {response.text}")

# ============================================================================
# F1 — CRITICAL FIXES + HEALTH ENDPOINTS
# ============================================================================

def test_f1_health_endpoint():
    """F1.1 - GET /api/health should return 200 with correct payload"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        
        if response.status_code != 200:
            log_test("F1.1 - Health endpoint status", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        required_fields = ["status", "service", "env", "ts", "uptime_s"]
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            log_test("F1.1 - Health endpoint payload", False, f"Missing fields: {missing}")
            return
        
        if data["status"] != "ok":
            log_test("F1.1 - Health status", False, f"Expected status='ok', got '{data['status']}'")
            return
        
        if data["service"] != "lusorae-backend":
            log_test("F1.1 - Health service name", False, f"Expected service='lusorae-backend', got '{data['service']}'")
            return
        
        if data["env"] != "development":
            log_test("F1.1 - Health env", False, f"Expected env='development', got '{data['env']}'")
            return
        
        if not isinstance(data["uptime_s"], (int, float)):
            log_test("F1.1 - Health uptime_s type", False, f"Expected int/float, got {type(data['uptime_s'])}")
            return
        
        log_test("F1.1 - GET /api/health", True, f"Payload: {json.dumps(data, indent=2)}")
    
    except Exception as e:
        log_test("F1.1 - GET /api/health", False, f"Exception: {str(e)}")

def test_f1_ready_endpoint():
    """F1.2 - GET /api/ready should return 200 with MongoDB check"""
    try:
        response = requests.get(f"{BASE_URL}/ready")
        
        if response.status_code != 200:
            log_test("F1.2 - Ready endpoint status", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        
        if "status" not in data or data["status"] != "ok":
            log_test("F1.2 - Ready status", False, f"Expected status='ok', got {data.get('status')}")
            return
        
        if "checks" not in data or "mongodb" not in data["checks"]:
            log_test("F1.2 - Ready checks", False, f"Missing checks.mongodb in payload")
            return
        
        if data["checks"]["mongodb"] != True:
            log_test("F1.2 - MongoDB check", False, f"Expected mongodb=true, got {data['checks']['mongodb']}")
            return
        
        log_test("F1.2 - GET /api/ready", True, f"MongoDB check passed")
    
    except Exception as e:
        log_test("F1.2 - GET /api/ready", False, f"Exception: {str(e)}")

def test_f1_login_flow():
    """F1.3 - POST /api/auth/login should work and set cookie"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if response.status_code != 200:
            log_test("F1.3 - Login status", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        
        if "token" not in data or "user" not in data:
            log_test("F1.3 - Login response", False, f"Missing token or user in response")
            return
        
        # Check if cookie is set
        if "access_token" not in response.cookies:
            log_test("F1.3 - Login cookie", False, f"access_token cookie not set")
            return
        
        log_test("F1.3 - POST /api/auth/login", True, f"Token and cookie received")
        
        # Test GET /api/auth/me with token
        me_response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {data['token']}"}
        )
        
        if me_response.status_code != 200:
            log_test("F1.3 - GET /api/auth/me", False, f"Expected 200, got {me_response.status_code}")
            return
        
        log_test("F1.3 - Login flow complete", True, f"GET /api/auth/me returned user")
    
    except Exception as e:
        log_test("F1.3 - Login flow", False, f"Exception: {str(e)}")

def test_f1_forgot_password_dev_token():
    """F1.4 - POST /api/auth/forgot-password should include dev_token in DEV"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/forgot-password",
            json={"email": ADMIN_EMAIL}
        )
        
        if response.status_code != 200:
            log_test("F1.4 - Forgot password status", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        
        # In DEV, should include dev_token and via_recovery
        if "dev_token" not in data:
            log_test("F1.4 - Forgot password dev_token", False, f"dev_token not in response (expected in DEV)")
            return
        
        if "via_recovery" not in data:
            log_test("F1.4 - Forgot password via_recovery", False, f"via_recovery not in response")
            return
        
        log_test("F1.4 - POST /api/auth/forgot-password", True, f"dev_token and via_recovery present in DEV")
    
    except Exception as e:
        log_test("F1.4 - Forgot password", False, f"Exception: {str(e)}")

def test_f1_exception_handler():
    """F1.5 - Exception handler should catch non-HTTPException errors"""
    try:
        # Try to trigger a 404 (HTTPException) - should NOT use global handler
        response = requests.get(f"{BASE_URL}/users/nonexistent_user_zzz_12345")
        
        if response.status_code != 404:
            log_test("F1.5 - HTTPException (404)", False, f"Expected 404, got {response.status_code}")
            return
        
        # HTTPException should return normal FastAPI error format
        data = response.json()
        if "detail" not in data:
            log_test("F1.5 - HTTPException format", False, f"Missing 'detail' in 404 response")
            return
        
        log_test("F1.5 - Exception handler (HTTPException)", True, f"404 returns normal FastAPI format")
    
    except Exception as e:
        log_test("F1.5 - Exception handler", False, f"Exception: {str(e)}")

# ============================================================================
# F2 — SECURITY HEADERS
# ============================================================================

def test_f2_security_headers():
    """F2 - All responses should include security headers"""
    try:
        # Test on /api/health (no auth required)
        response = requests.get(f"{BASE_URL}/health")
        headers = response.headers
        
        required_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": None,  # Just check presence
            "Content-Security-Policy-Report-Only": None  # In DEV, should be report-only
        }
        
        missing = []
        for header, expected_value in required_headers.items():
            if header not in headers:
                missing.append(header)
            elif expected_value and headers[header] != expected_value:
                missing.append(f"{header} (wrong value: {headers[header]})")
        
        if missing:
            log_test("F2.1 - Security headers on /api/health", False, f"Missing/wrong: {missing}")
        else:
            log_test("F2.1 - Security headers on /api/health", True, f"All required headers present")
        
        # Verify Permissions-Policy contains camera=()
        if "Permissions-Policy" in headers:
            if "camera=()" not in headers["Permissions-Policy"]:
                log_test("F2.2 - Permissions-Policy content", False, f"Missing 'camera=()' in policy")
            else:
                log_test("F2.2 - Permissions-Policy content", True, f"Contains 'camera=()'")
        
        # Verify CSP contains default-src 'self'
        csp_header = headers.get("Content-Security-Policy-Report-Only") or headers.get("Content-Security-Policy")
        if csp_header:
            if "default-src 'self'" not in csp_header:
                log_test("F2.3 - CSP content", False, f"Missing \"default-src 'self'\" in CSP")
            else:
                log_test("F2.3 - CSP content", True, f"Contains \"default-src 'self'\"")
        
        # Verify HSTS is NOT present in DEV
        if "Strict-Transport-Security" in headers:
            log_test("F2.4 - HSTS in DEV", False, f"HSTS should NOT be present in DEV")
        else:
            log_test("F2.4 - HSTS in DEV", True, f"HSTS correctly absent in DEV")
        
        # Test headers on authenticated endpoint
        token = get_admin_token()
        me_response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        me_headers = me_response.headers
        if "X-Content-Type-Options" not in me_headers or "X-Frame-Options" not in me_headers:
            log_test("F2.5 - Security headers on /api/auth/me", False, f"Headers missing on authenticated endpoint")
        else:
            log_test("F2.5 - Security headers on /api/auth/me", True, f"Headers present on authenticated endpoint")
    
    except Exception as e:
        log_test("F2 - Security headers", False, f"Exception: {str(e)}")

# ============================================================================
# F3 — RATE LIMITING
# ============================================================================

def test_f3_rate_limit_forgot_password():
    """F3.1 - POST /api/auth/forgot-password should be rate limited to 5/min"""
    try:
        print("\n⏳ Waiting 70s for rate limit window to reset...")
        time.sleep(70)
        
        test_email = "test@example.com"
        responses = []
        
        # Make 7 rapid requests
        for i in range(7):
            response = requests.post(
                f"{BASE_URL}/auth/forgot-password",
                json={"email": test_email}
            )
            responses.append({
                "attempt": i + 1,
                "status": response.status_code,
                "headers": dict(response.headers)
            })
            time.sleep(0.1)  # Small delay to avoid connection issues
        
        # First 5 should be 200, 6th and 7th should be 429
        success_count = sum(1 for r in responses[:5] if r["status"] == 200)
        rate_limited_count = sum(1 for r in responses[5:] if r["status"] == 429)
        
        if success_count != 5:
            log_test("F3.1 - Forgot password rate limit (first 5)", False, 
                    f"Expected 5 successes, got {success_count}")
        else:
            log_test("F3.1 - Forgot password rate limit (first 5)", True, 
                    f"First 5 requests returned 200")
        
        if rate_limited_count != 2:
            log_test("F3.1 - Forgot password rate limit (6th & 7th)", False, 
                    f"Expected 2 rate limited (429), got {rate_limited_count}")
        else:
            log_test("F3.1 - Forgot password rate limit (6th & 7th)", True, 
                    f"Requests 6 & 7 returned 429")
        
        # Check rate limit headers
        if responses[0]["headers"].get("X-RateLimit-Limit") != "5":
            log_test("F3.1 - X-RateLimit-Limit header", False, 
                    f"Expected '5', got {responses[0]['headers'].get('X-RateLimit-Limit')}")
        else:
            log_test("F3.1 - X-RateLimit-Limit header", True, f"Correct limit header")
        
        # Check 429 response payload
        if rate_limited_count > 0:
            response_429 = requests.post(
                f"{BASE_URL}/auth/forgot-password",
                json={"email": test_email}
            )
            if response_429.status_code == 429:
                data = response_429.json()
                if "detail" in data and "Demasiados pedidos" in data["detail"]:
                    log_test("F3.1 - 429 response payload", True, f"Correct error message")
                else:
                    log_test("F3.1 - 429 response payload", False, f"Wrong error message: {data}")
                
                if "Retry-After" in response_429.headers:
                    log_test("F3.1 - Retry-After header", True, f"Present in 429 response")
                else:
                    log_test("F3.1 - Retry-After header", False, f"Missing in 429 response")
    
    except Exception as e:
        log_test("F3.1 - Rate limit forgot-password", False, f"Exception: {str(e)}")

def test_f3_rate_limit_check_username():
    """F3.2 - GET /api/auth/check-username should be rate limited to 30/min"""
    try:
        print("\n⏳ Waiting 70s for rate limit window to reset...")
        time.sleep(70)
        
        responses = []
        
        # Make 32 rapid requests with different query strings
        for i in range(32):
            response = requests.get(f"{BASE_URL}/auth/check-username?u=testuser{i}")
            responses.append({
                "attempt": i + 1,
                "status": response.status_code
            })
            time.sleep(0.05)
        
        # First 30 should be 200, 31st should be 429
        success_count = sum(1 for r in responses[:30] if r["status"] == 200)
        rate_limited = responses[30]["status"] == 429 if len(responses) > 30 else False
        
        if success_count != 30:
            log_test("F3.2 - Check username rate limit (first 30)", False, 
                    f"Expected 30 successes, got {success_count}")
        else:
            log_test("F3.2 - Check username rate limit (first 30)", True, 
                    f"First 30 requests returned 200")
        
        if not rate_limited:
            log_test("F3.2 - Check username rate limit (31st)", False, 
                    f"Expected 429, got {responses[30]['status']}")
        else:
            log_test("F3.2 - Check username rate limit (31st)", True, 
                    f"31st request returned 429")
    
    except Exception as e:
        log_test("F3.2 - Rate limit check-username", False, f"Exception: {str(e)}")

def test_f3_rate_limit_login():
    """F3.3 - POST /api/auth/login should be rate limited to 10/min"""
    try:
        # Just verify the header is present (don't exhaust the limit)
        responses = []
        for i in range(5):
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
            )
            responses.append(response)
            time.sleep(0.2)
        
        # All should succeed
        all_success = all(r.status_code == 200 for r in responses)
        
        if not all_success:
            log_test("F3.3 - Login rate limit (5 logins)", False, 
                    f"Some logins failed: {[r.status_code for r in responses]}")
        else:
            log_test("F3.3 - Login rate limit (5 logins)", True, 
                    f"All 5 logins succeeded")
        
        # Check rate limit header
        if "X-RateLimit-Limit" in responses[0].headers:
            limit = responses[0].headers["X-RateLimit-Limit"]
            if limit == "10":
                log_test("F3.3 - Login X-RateLimit-Limit", True, f"Correct limit: 10")
            else:
                log_test("F3.3 - Login X-RateLimit-Limit", False, f"Expected 10, got {limit}")
        else:
            log_test("F3.3 - Login X-RateLimit-Limit", False, f"Header missing")
    
    except Exception as e:
        log_test("F3.3 - Rate limit login", False, f"Exception: {str(e)}")

def test_f3_global_default_rate_limit():
    """F3.4 - Global default rate limit (300/min) should not block normal usage"""
    try:
        token = get_admin_token()
        
        # Make 10-20 calls to /api/posts/feed (should not be rate limited)
        responses = []
        for i in range(15):
            response = requests.get(
                f"{BASE_URL}/posts/feed",
                headers={"Authorization": f"Bearer {token}"}
            )
            responses.append(response.status_code)
            time.sleep(0.1)
        
        # All should succeed
        all_success = all(status == 200 for status in responses)
        
        if not all_success:
            log_test("F3.4 - Global default rate limit", False, 
                    f"Some requests failed: {responses}")
        else:
            log_test("F3.4 - Global default rate limit", True, 
                    f"15 feed requests succeeded (not rate limited)")
    
    except Exception as e:
        log_test("F3.4 - Global default rate limit", False, f"Exception: {str(e)}")

# ============================================================================
# F4 — PYDANTIC LENGTH VALIDATION
# ============================================================================

def test_f4_pydantic_validation():
    """F4 - PATCH /api/users/me should validate max_length constraints"""
    try:
        token = get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test 1: name with 100 chars (max is 80) should return 422
        long_name = "A" * 100
        response = requests.patch(
            f"{BASE_URL}/users/me",
            headers=headers,
            json={"name": long_name}
        )
        
        if response.status_code != 422:
            log_test("F4.1 - Name max_length (100 chars)", False, 
                    f"Expected 422, got {response.status_code}")
        else:
            log_test("F4.1 - Name max_length (100 chars)", True, 
                    f"Correctly rejected with 422")
        
        # Test 2: bio with 600 chars (max is 500) should return 422
        long_bio = "B" * 600
        response = requests.patch(
            f"{BASE_URL}/users/me",
            headers=headers,
            json={"bio": long_bio}
        )
        
        if response.status_code != 422:
            log_test("F4.2 - Bio max_length (600 chars)", False, 
                    f"Expected 422, got {response.status_code}")
        else:
            log_test("F4.2 - Bio max_length (600 chars)", True, 
                    f"Correctly rejected with 422")
        
        # Test 3: name with valid length should succeed
        valid_name = "Admin Novo Nome"
        response = requests.patch(
            f"{BASE_URL}/users/me",
            headers=headers,
            json={"name": valid_name}
        )
        
        if response.status_code != 200:
            log_test("F4.3 - Name valid length", False, 
                    f"Expected 200, got {response.status_code}")
        else:
            log_test("F4.3 - Name valid length", True, 
                    f"Update succeeded")
        
        # Test 4: revert name back to original
        response = requests.patch(
            f"{BASE_URL}/users/me",
            headers=headers,
            json={"name": "Lusorae"}
        )
        
        if response.status_code != 200:
            log_test("F4.4 - Name revert", False, 
                    f"Expected 200, got {response.status_code}")
        else:
            log_test("F4.4 - Name revert", True, 
                    f"Reverted successfully")
    
    except Exception as e:
        log_test("F4 - Pydantic validation", False, f"Exception: {str(e)}")

# ============================================================================
# REGRESSION TESTS (SANITY)
# ============================================================================

def test_regression_sanity():
    """Regression - Verify legacy flows still work"""
    try:
        token = get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test 1: GET /api/posts/feed
        response = requests.get(f"{BASE_URL}/posts/feed", headers=headers)
        if response.status_code != 200:
            log_test("Regression - GET /api/posts/feed", False, f"Got {response.status_code}")
        else:
            log_test("Regression - GET /api/posts/feed", True, f"Working")
        
        # Test 2: POST /api/posts
        response = requests.post(
            f"{BASE_URL}/posts",
            headers=headers,
            json={"content": "Test post for hardening validation"}
        )
        if response.status_code not in [200, 201]:
            log_test("Regression - POST /api/posts", False, f"Got {response.status_code}")
            return
        
        post_id = response.json()["id"]
        log_test("Regression - POST /api/posts", True, f"Created post {post_id}")
        
        # Test 3: POST /api/posts/{id}/like
        response = requests.post(f"{BASE_URL}/posts/{post_id}/like", headers=headers)
        if response.status_code != 200:
            log_test("Regression - POST /api/posts/{id}/like", False, f"Got {response.status_code}")
        else:
            log_test("Regression - POST /api/posts/{id}/like", True, f"Working")
        
        # Test 4: POST /api/posts/{id}/comments
        response = requests.post(
            f"{BASE_URL}/posts/{post_id}/comments",
            headers=headers,
            json={"content": "Test comment"}
        )
        if response.status_code not in [200, 201]:
            log_test("Regression - POST /api/posts/{id}/comments", False, f"Got {response.status_code}")
        else:
            log_test("Regression - POST /api/posts/{id}/comments", True, f"Working")
        
        # Test 5: GET /api/users/admin
        response = requests.get(f"{BASE_URL}/users/admin", headers=headers)
        if response.status_code != 200:
            log_test("Regression - GET /api/users/admin", False, f"Got {response.status_code}")
        else:
            log_test("Regression - GET /api/users/admin", True, f"Working")
        
        # Test 6: GET /api/users/admin/stats
        response = requests.get(f"{BASE_URL}/users/admin/stats", headers=headers)
        if response.status_code != 200:
            log_test("Regression - GET /api/users/admin/stats", False, f"Got {response.status_code}")
        else:
            log_test("Regression - GET /api/users/admin/stats", True, f"Working")
    
    except Exception as e:
        log_test("Regression - Sanity checks", False, f"Exception: {str(e)}")

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def main():
    print("=" * 80)
    print("PRE-DEPLOY HARDENING PASS — BACKEND TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    print("=" * 80)
    print()
    
    print("=" * 80)
    print("F1 — CRITICAL FIXES + HEALTH ENDPOINTS")
    print("=" * 80)
    test_f1_health_endpoint()
    test_f1_ready_endpoint()
    test_f1_login_flow()
    test_f1_forgot_password_dev_token()
    test_f1_exception_handler()
    print()
    
    print("=" * 80)
    print("F2 — SECURITY HEADERS")
    print("=" * 80)
    test_f2_security_headers()
    print()
    
    print("=" * 80)
    print("F3 — RATE LIMITING")
    print("=" * 80)
    test_f3_rate_limit_forgot_password()
    test_f3_rate_limit_check_username()
    test_f3_rate_limit_login()
    test_f3_global_default_rate_limit()
    print()
    
    print("=" * 80)
    print("F4 — PYDANTIC LENGTH VALIDATION")
    print("=" * 80)
    test_f4_pydantic_validation()
    print()
    
    print("=" * 80)
    print("REGRESSION TESTS (SANITY)")
    print("=" * 80)
    test_regression_sanity()
    print()
    
    # Print summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total: {test_results['total']}")
    print(f"Passed: {test_results['passed']}")
    print(f"Failed: {test_results['failed']}")
    print(f"Success Rate: {test_results['passed'] / test_results['total'] * 100:.1f}%")
    print("=" * 80)
    
    if test_results['failed'] > 0:
        print("\n❌ FAILED TESTS:")
        for detail in test_results['details']:
            if "❌ FAIL" in detail:
                print(detail)
    
    return test_results['failed'] == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
