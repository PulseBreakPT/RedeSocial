#!/usr/bin/env python3
"""
Backend smoke tests for gamification removal validation.
Tests all endpoints to ensure gamification fields are removed and stubbed endpoints work.
"""
import requests
import json
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.getenv("REACT_APP_BACKEND_URL", "https://social-login-design-1.preview.emergentagent.com")
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@vermillion.app"
ADMIN_PASSWORD = "admin123"

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name, details=""):
        self.passed.append((test_name, details))
        print(f"{GREEN}✓{RESET} {test_name}")
        if details:
            print(f"  {details}")
    
    def add_fail(self, test_name, details=""):
        self.failed.append((test_name, details))
        print(f"{RED}✗{RESET} {test_name}")
        if details:
            print(f"  {RED}{details}{RESET}")
    
    def add_warning(self, test_name, details=""):
        self.warnings.append((test_name, details))
        print(f"{YELLOW}⚠{RESET} {test_name}")
        if details:
            print(f"  {YELLOW}{details}{RESET}")
    
    def summary(self):
        print(f"\n{BOLD}{'='*60}{RESET}")
        print(f"{BOLD}TEST SUMMARY{RESET}")
        print(f"{BOLD}{'='*60}{RESET}")
        print(f"{GREEN}Passed: {len(self.passed)}{RESET}")
        print(f"{RED}Failed: {len(self.failed)}{RESET}")
        print(f"{YELLOW}Warnings: {len(self.warnings)}{RESET}")
        
        if self.failed:
            print(f"\n{BOLD}{RED}FAILED TESTS:{RESET}")
            for name, details in self.failed:
                print(f"  • {name}")
                if details:
                    print(f"    {details}")
        
        return len(self.failed) == 0

results = TestResults()

def login():
    """Login and return auth token and user object"""
    print(f"\n{BOLD}=== AUTHENTICATION ==={RESET}")
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail("Login", f"Status {response.status_code}: {response.text}")
            return None, None
        
        data = response.json()
        token = data.get("token")
        user = data.get("user")
        
        if not token or not user:
            results.add_fail("Login", "Missing token or user in response")
            return None, None
        
        results.add_pass("Login successful")
        return token, user
    
    except Exception as e:
        results.add_fail("Login", f"Exception: {str(e)}")
        return None, None

def test_login_response_fields(user):
    """Test 1: Login response should NOT contain gamification fields"""
    print(f"\n{BOLD}=== TEST 1: Login Response Fields ==={RESET}")
    
    forbidden_fields = ["xp", "level", "level_name", "level_emoji", "streak_days", "reputation"]
    found_fields = []
    
    for field in forbidden_fields:
        if field in user:
            found_fields.append(field)
    
    if found_fields:
        results.add_fail(
            "Login response contains gamification fields",
            f"Found forbidden fields: {', '.join(found_fields)}"
        )
    else:
        results.add_pass("Login response clean (no gamification fields)")

def test_public_profile(token, username="admin"):
    """Test 2: Public profile should NOT contain reputation or level"""
    print(f"\n{BOLD}=== TEST 2: Public Profile (GET /api/users/{username}) ==={RESET}")
    
    try:
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username}",
                f"Status {response.status_code}: {response.text}"
            )
            return
        
        data = response.json()
        
        # Check for forbidden fields
        forbidden_fields = ["reputation", "level"]
        found_fields = []
        
        for field in forbidden_fields:
            if field in data:
                found_fields.append(field)
        
        if found_fields:
            results.add_fail(
                "Public profile contains gamification fields",
                f"Found forbidden fields: {', '.join(found_fields)}"
            )
        else:
            results.add_pass("Public profile clean (no reputation/level)")
    
    except Exception as e:
        results.add_fail(f"GET /api/users/{username}", f"Exception: {str(e)}")

def test_user_stats(token, username="admin"):
    """Test 3: Stats endpoint should return streak: 0"""
    print(f"\n{BOLD}=== TEST 3: User Stats (GET /api/users/{username}/stats) ==={RESET}")
    
    try:
        response = requests.get(
            f"{API_BASE}/users/{username}/stats",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username}/stats",
                f"Status {response.status_code}: {response.text}"
            )
            return
        
        data = response.json()
        
        # Check streak field exists and is 0
        if "streak" not in data:
            results.add_fail("Stats missing streak field", "streak field should be present for compatibility")
        elif data["streak"] != 0:
            results.add_fail("Stats streak not zero", f"Expected streak: 0, got: {data['streak']}")
        else:
            results.add_pass("Stats endpoint returns streak: 0")
    
    except Exception as e:
        results.add_fail(f"GET /api/users/{username}/stats", f"Exception: {str(e)}")

def test_stubbed_endpoints(token, username="admin"):
    """Test 4: All stubbed endpoints should return 200 with neutral/empty responses"""
    print(f"\n{BOLD}=== TEST 4: Stubbed Endpoints ==={RESET}")
    
    tests = [
        {
            "name": "GET /api/users/{u}/badges",
            "url": f"{API_BASE}/users/{username}/badges",
            "method": "GET",
            "expected": {"earned": [], "all": [], "totals": {}},
        },
        {
            "name": "GET /api/badges/narrative",
            "url": f"{API_BASE}/badges/narrative",
            "method": "GET",
            "expected": {"badges": []},
            "auth_required": True,
        },
        {
            "name": "GET /api/users/{u}/streak",
            "url": f"{API_BASE}/users/{username}/streak",
            "method": "GET",
            "expected_keys": ["current", "best", "last_date", "freezes", "next_milestone", "active_today"],
            "expected_values": {"current": 0, "best": 0, "last_date": None, "freezes": 0, "next_milestone": None, "active_today": False},
        },
        {
            "name": "GET /api/charms/catalog",
            "url": f"{API_BASE}/charms/catalog",
            "method": "GET",
            "expected": [],
        },
        {
            "name": "GET /api/users/{u}/charms",
            "url": f"{API_BASE}/users/{username}/charms",
            "method": "GET",
            "expected": {"unlocked": [], "equipped": []},
        },
        {
            "name": "POST /api/users/me/charms/equip",
            "url": f"{API_BASE}/users/me/charms/equip",
            "method": "POST",
            "body": {"keys": ["fundador"]},
            "expected": {"equipped": []},
            "auth_required": True,
        },
        {
            "name": "GET /api/users/{u}/charms-progress",
            "url": f"{API_BASE}/users/{username}/charms-progress",
            "method": "GET",
            "expected": {"unlocked_keys": [], "progress": {}, "catalog": []},
        },
        {
            "name": "GET /api/cosmetics/catalog",
            "url": f"{API_BASE}/cosmetics/catalog",
            "method": "GET",
            "expected": [],
        },
        {
            "name": "POST /api/users/me/cosmetics/equip",
            "url": f"{API_BASE}/users/me/cosmetics/equip",
            "method": "POST",
            "body": {"frame": "anything", "sticker": "anything"},
            "expected": {"frame": "", "sticker": ""},
            "auth_required": True,
        },
        {
            "name": "GET /api/users/{u}/cosmetics",
            "url": f"{API_BASE}/users/{username}/cosmetics",
            "method": "GET",
            "expected": {"frame": None, "sticker": None},
        },
    ]
    
    for test in tests:
        try:
            headers = {}
            if test.get("auth_required") or test["method"] == "POST":
                headers["Authorization"] = f"Bearer {token}"
            
            if test["method"] == "GET":
                response = requests.get(test["url"], headers=headers, timeout=10)
            elif test["method"] == "POST":
                response = requests.post(test["url"], json=test.get("body", {}), headers=headers, timeout=10)
            
            if response.status_code != 200:
                results.add_fail(
                    test["name"],
                    f"Status {response.status_code}: {response.text}"
                )
                continue
            
            data = response.json()
            
            # Check expected response
            if "expected" in test:
                if data != test["expected"]:
                    results.add_fail(
                        test["name"],
                        f"Expected: {test['expected']}, Got: {data}"
                    )
                else:
                    results.add_pass(test["name"])
            elif "expected_keys" in test:
                missing_keys = [k for k in test["expected_keys"] if k not in data]
                if missing_keys:
                    results.add_fail(
                        test["name"],
                        f"Missing keys: {', '.join(missing_keys)}"
                    )
                else:
                    # Check expected values
                    wrong_values = []
                    for k, v in test["expected_values"].items():
                        if data.get(k) != v:
                            wrong_values.append(f"{k}: expected {v}, got {data.get(k)}")
                    
                    if wrong_values:
                        results.add_fail(test["name"], "; ".join(wrong_values))
                    else:
                        results.add_pass(test["name"])
        
        except Exception as e:
            results.add_fail(test["name"], f"Exception: {str(e)}")

def test_legacy_flows(token):
    """Test 5: Legacy flows should continue to work (create post, like, comment, onboard)"""
    print(f"\n{BOLD}=== TEST 5: Legacy Flows ==={RESET}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 5.1: Create a post
    try:
        post_content = f"Teste de gamificação removida - {datetime.now().isoformat()}"
        response = requests.post(
            f"{API_BASE}/posts",
            json={"content": post_content},
            headers=headers,
            timeout=10
        )
        
        if response.status_code not in [200, 201]:
            results.add_fail(
                "POST /api/posts (create post)",
                f"Status {response.status_code}: {response.text}"
            )
            post_id = None
        else:
            data = response.json()
            post_id = data.get("id")
            results.add_pass("POST /api/posts (create post)")
    except Exception as e:
        results.add_fail("POST /api/posts (create post)", f"Exception: {str(e)}")
        post_id = None
    
    # Test 5.2: Like a post (if we created one)
    if post_id:
        try:
            response = requests.post(
                f"{API_BASE}/posts/{post_id}/like",
                headers=headers,
                timeout=10
            )
            
            if response.status_code not in [200, 201]:
                results.add_fail(
                    "POST /api/posts/{id}/like",
                    f"Status {response.status_code}: {response.text}"
                )
            else:
                results.add_pass("POST /api/posts/{id}/like")
        except Exception as e:
            results.add_fail("POST /api/posts/{id}/like", f"Exception: {str(e)}")
        
        # Test 5.3: Comment on a post
        try:
            response = requests.post(
                f"{API_BASE}/posts/{post_id}/comments",
                json={"content": "Comentário de teste"},
                headers=headers,
                timeout=10
            )
            
            if response.status_code not in [200, 201]:
                results.add_fail(
                    "POST /api/posts/{id}/comments",
                    f"Status {response.status_code}: {response.text}"
                )
            else:
                results.add_pass("POST /api/posts/{id}/comments")
        except Exception as e:
            results.add_fail("POST /api/posts/{id}/comments", f"Exception: {str(e)}")
    
    # Test 5.4: Onboard endpoint
    try:
        response = requests.post(
            f"{API_BASE}/users/me/onboard",
            headers=headers,
            timeout=10
        )
        
        if response.status_code not in [200, 201]:
            results.add_fail(
                "POST /api/users/me/onboard",
                f"Status {response.status_code}: {response.text}"
            )
        else:
            results.add_pass("POST /api/users/me/onboard")
            
            # Verify onboarded flag is set
            try:
                me_response = requests.get(
                    f"{API_BASE}/auth/me",
                    headers=headers,
                    timeout=10
                )
                
                if me_response.status_code == 200:
                    me_data = me_response.json()
                    user = me_data.get("user", {})
                    if user.get("onboarded") == True:
                        results.add_pass("Onboarded flag set correctly")
                    else:
                        results.add_fail("Onboarded flag not set", f"Expected onboarded: true, got: {user.get('onboarded')}")
            except Exception as e:
                results.add_warning("Could not verify onboarded flag", str(e))
    
    except Exception as e:
        results.add_fail("POST /api/users/me/onboard", f"Exception: {str(e)}")

def main():
    print(f"{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}GAMIFICATION REMOVAL - BACKEND SMOKE TESTS{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")
    print(f"Backend URL: {API_BASE}")
    print(f"Test User: {ADMIN_EMAIL}")
    
    # Login
    token, user = login()
    if not token or not user:
        print(f"\n{RED}Cannot proceed without authentication{RESET}")
        results.summary()
        return 1
    
    # Run all tests
    test_login_response_fields(user)
    test_public_profile(token)
    test_user_stats(token)
    test_stubbed_endpoints(token)
    test_legacy_flows(token)
    
    # Summary
    success = results.summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
