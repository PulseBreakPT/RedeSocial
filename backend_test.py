#!/usr/bin/env python3
"""
Backend tests for Smart Follow Button — get_profile extended payload.
Tests all new fields (is_following, follows_me, is_blocked, is_muted, is_notified, is_favorited)
and their reflection after toggle operations.
"""
import requests
import json
import os
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.getenv("REACT_APP_BACKEND_URL", "https://smart-story-builder.preview.emergentagent.com")
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@vermillion.app"
ADMIN_PASSWORD = "admin123"

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name, details=""):
        self.passed.append((test_name, details))
        print(f"{GREEN}✓ PASS{RESET} {test_name}")
        if details:
            print(f"  {details}")
    
    def add_fail(self, test_name, details=""):
        self.failed.append((test_name, details))
        print(f"{RED}✗ FAIL{RESET} {test_name}")
        if details:
            print(f"  {RED}{details}{RESET}")
    
    def add_warning(self, test_name, details=""):
        self.warnings.append((test_name, details))
        print(f"{YELLOW}⚠ WARN{RESET} {test_name}")
        if details:
            print(f"  {YELLOW}{details}{RESET}")
    
    def summary(self):
        print(f"\n{BOLD}{'='*70}{RESET}")
        print(f"{BOLD}TEST SUMMARY{RESET}")
        print(f"{BOLD}{'='*70}{RESET}")
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
    """Test 1: Auth ok - POST /api/auth/login"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 1: Authentication{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                "POST /api/auth/login",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return None
        
        data = response.json()
        token = data.get("token")
        
        if not token:
            results.add_fail("POST /api/auth/login", "Missing access_token in response")
            return None
        
        results.add_pass("POST /api/auth/login → status 200, received access_token")
        return token
    
    except Exception as e:
        results.add_fail("POST /api/auth/login", f"Exception: {str(e)}")
        return None

def test_self_profile(token):
    """Test 2: GET /api/users/admin (self) - verify all new fields present"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 2: GET /api/users/admin (self){RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        response = requests.get(
            f"{API_BASE}/users/admin",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                "GET /api/users/admin (self)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        
        # Check all required fields are present as bool
        required_fields = {
            "is_self": True,
            "is_following": False,
            "follows_me": False,
            "is_blocked": False,
            "is_muted": False,
            "is_notified": False,
            "is_favorited": False,
        }
        
        missing_fields = []
        wrong_type_fields = []
        wrong_value_fields = []
        
        for field, expected_value in required_fields.items():
            if field not in data:
                missing_fields.append(field)
            elif not isinstance(data[field], bool):
                wrong_type_fields.append(f"{field} (type: {type(data[field]).__name__})")
            elif data[field] != expected_value:
                wrong_value_fields.append(f"{field} (expected: {expected_value}, got: {data[field]})")
        
        if missing_fields:
            results.add_fail(
                "GET /api/users/admin (self) - missing fields",
                f"Missing: {', '.join(missing_fields)}"
            )
        elif wrong_type_fields:
            results.add_fail(
                "GET /api/users/admin (self) - wrong types",
                f"Not bool: {', '.join(wrong_type_fields)}"
            )
        elif wrong_value_fields:
            results.add_fail(
                "GET /api/users/admin (self) - wrong values",
                f"Wrong values: {', '.join(wrong_value_fields)}"
            )
        else:
            results.add_pass(
                "GET /api/users/admin (self) → all 7 fields present as bool with correct values",
                f"is_self=true, is_following=false, follows_me=false, is_blocked=false, is_muted=false, is_notified=false, is_favorited=false"
            )
    
    except Exception as e:
        results.add_fail("GET /api/users/admin (self)", f"Exception: {str(e)}")

def discover_other_user(token):
    """Test 3: Discover another user via suggestions or search"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 3: Discover another user{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        # Try suggestions first
        response = requests.get(
            f"{API_BASE}/users/suggestions",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                username = data[0].get("username")
                if username:
                    results.add_pass(
                        "Discovered user via GET /api/users/suggestions",
                        f"Found user: {username}"
                    )
                    return username
        
        # Try search as fallback
        response = requests.get(
            f"{API_BASE}/users/search?q=a",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                username = data[0].get("username")
                if username and username != "admin":
                    results.add_pass(
                        "Discovered user via GET /api/users/search",
                        f"Found user: {username}"
                    )
                    return username
        
        # Create a new user as last resort
        import random
        random_email = f"testuser{random.randint(1000, 9999)}@vermillion.test"
        random_username = f"testuser{random.randint(1000, 9999)}"
        
        response = requests.post(
            f"{API_BASE}/auth/register",
            json={
                "email": random_email,
                "username": random_username,
                "password": "test123",
                "name": "Test User"
            },
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            results.add_pass(
                "Created new user via POST /api/auth/register",
                f"Created user: {random_username}"
            )
            return random_username
        
        results.add_fail(
            "Discover other user",
            "Could not find or create another user for testing"
        )
        return None
    
    except Exception as e:
        results.add_fail("Discover other user", f"Exception: {str(e)}")
        return None

def test_other_user_profile(token, username):
    """Test 4: GET /api/users/{other_user} - verify all new fields present"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 4: GET /api/users/{username} (other user){RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username}",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        
        # Check all 5 new fields are present as bool
        required_fields = [
            "is_following",
            "follows_me",
            "is_blocked",
            "is_muted",
            "is_notified",
            "is_favorited",
            "is_self"
        ]
        
        missing_fields = []
        wrong_type_fields = []
        
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
            elif not isinstance(data[field], bool):
                wrong_type_fields.append(f"{field} (type: {type(data[field]).__name__})")
        
        if missing_fields:
            results.add_fail(
                f"GET /api/users/{username} - missing fields",
                f"Missing: {', '.join(missing_fields)}"
            )
        elif wrong_type_fields:
            results.add_fail(
                f"GET /api/users/{username} - wrong types",
                f"Not bool: {', '.join(wrong_type_fields)}"
            )
        else:
            # Check is_self is false
            if data.get("is_self") != False:
                results.add_fail(
                    f"GET /api/users/{username} - is_self should be false",
                    f"Expected is_self=false, got: {data.get('is_self')}"
                )
            else:
                results.add_pass(
                    f"GET /api/users/{username} → all 7 fields present as bool",
                    f"is_self=false, all other fields present"
                )
    
    except Exception as e:
        results.add_fail(f"GET /api/users/{username}", f"Exception: {str(e)}")

def test_follow_toggle(token, username):
    """Test 5: Toggle follow + reflection in GET /users/{u}"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 5: Follow toggle + reflection{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        # 5a: POST /api/users/{u}/follow (follow)
        response = requests.post(
            f"{API_BASE}/users/{username}/follow",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"POST /api/users/{username}/follow (follow)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if "following" not in data:
            results.add_fail(
                f"POST /api/users/{username}/follow (follow)",
                "Response missing 'following' field"
            )
            return
        
        results.add_pass(f"POST /api/users/{username}/follow → status 200, response ok")
        
        # 5b: GET /api/users/{u} → is_following == true
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username} (after follow)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("is_following") != True:
            results.add_fail(
                f"GET /api/users/{username} → is_following should be true",
                f"Expected is_following=true, got: {data.get('is_following')}"
            )
        else:
            results.add_pass(f"GET /api/users/{username} → is_following == true")
        
        # 5c: POST /api/users/{u}/follow (unfollow)
        response = requests.post(
            f"{API_BASE}/users/{username}/follow",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"POST /api/users/{username}/follow (unfollow)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        results.add_pass(f"POST /api/users/{username}/follow (toggle off) → status 200")
        
        # 5d: GET /api/users/{u} → is_following == false
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username} (after unfollow)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("is_following") != False:
            results.add_fail(
                f"GET /api/users/{username} → is_following should be false",
                f"Expected is_following=false, got: {data.get('is_following')}"
            )
        else:
            results.add_pass(f"GET /api/users/{username} → is_following == false")
    
    except Exception as e:
        results.add_fail("Follow toggle test", f"Exception: {str(e)}")

def test_notify_toggle(token, username):
    """Test 6: Toggle notify (sino) + reflection"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 6: Notify toggle + reflection{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        # 6a: POST /api/users/{u}/notify (enable)
        response = requests.post(
            f"{API_BASE}/users/{username}/notify",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"POST /api/users/{username}/notify (enable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("notify") != True:
            results.add_fail(
                f"POST /api/users/{username}/notify (enable)",
                f"Expected notify=true, got: {data.get('notify')}"
            )
        else:
            results.add_pass(f"POST /api/users/{username}/notify → response.notify == true")
        
        # 6b: GET /api/users/{u} → is_notified == true
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username} (after notify enable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("is_notified") != True:
            results.add_fail(
                f"GET /api/users/{username} → is_notified should be true",
                f"Expected is_notified=true, got: {data.get('is_notified')}"
            )
        else:
            results.add_pass(f"GET /api/users/{username} → is_notified == true")
        
        # 6c: POST /api/users/{u}/notify (disable)
        response = requests.post(
            f"{API_BASE}/users/{username}/notify",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"POST /api/users/{username}/notify (disable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("notify") != False:
            results.add_fail(
                f"POST /api/users/{username}/notify (disable)",
                f"Expected notify=false, got: {data.get('notify')}"
            )
        else:
            results.add_pass(f"POST /api/users/{username}/notify → response.notify == false")
        
        # 6d: GET /api/users/{u} → is_notified == false
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username} (after notify disable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("is_notified") != False:
            results.add_fail(
                f"GET /api/users/{username} → is_notified should be false",
                f"Expected is_notified=false, got: {data.get('is_notified')}"
            )
        else:
            results.add_pass(f"GET /api/users/{username} → is_notified == false")
    
    except Exception as e:
        results.add_fail("Notify toggle test", f"Exception: {str(e)}")

def test_mute_toggle(token, username):
    """Test 7: Toggle mute (silenciar) + reflection"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 7: Mute toggle + reflection{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        # 7a: POST /api/users/{u}/mute (enable)
        response = requests.post(
            f"{API_BASE}/users/{username}/mute",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"POST /api/users/{username}/mute (enable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("muted") != True:
            results.add_fail(
                f"POST /api/users/{username}/mute (enable)",
                f"Expected muted=true, got: {data.get('muted')}"
            )
        else:
            results.add_pass(f"POST /api/users/{username}/mute → response.muted == true")
        
        # 7b: GET /api/users/{u} → is_muted == true
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username} (after mute enable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("is_muted") != True:
            results.add_fail(
                f"GET /api/users/{username} → is_muted should be true",
                f"Expected is_muted=true, got: {data.get('is_muted')}"
            )
        else:
            results.add_pass(f"GET /api/users/{username} → is_muted == true")
        
        # 7c: POST /api/users/{u}/mute (disable)
        response = requests.post(
            f"{API_BASE}/users/{username}/mute",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"POST /api/users/{username}/mute (disable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("muted") != False:
            results.add_fail(
                f"POST /api/users/{username}/mute (disable)",
                f"Expected muted=false, got: {data.get('muted')}"
            )
        else:
            results.add_pass(f"POST /api/users/{username}/mute → response.muted == false")
        
        # 7d: GET /api/users/{u} → is_muted == false
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username} (after mute disable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("is_muted") != False:
            results.add_fail(
                f"GET /api/users/{username} → is_muted should be false",
                f"Expected is_muted=false, got: {data.get('is_muted')}"
            )
        else:
            results.add_pass(f"GET /api/users/{username} → is_muted == false")
    
    except Exception as e:
        results.add_fail("Mute toggle test", f"Exception: {str(e)}")

def test_favorite_toggle(token, username):
    """Test 8: Toggle favorite + reflection"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 8: Favorite toggle + reflection{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        # 8a: POST /api/users/{u}/favorite (enable)
        response = requests.post(
            f"{API_BASE}/users/{username}/favorite",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"POST /api/users/{username}/favorite (enable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("favorited") != True:
            results.add_fail(
                f"POST /api/users/{username}/favorite (enable)",
                f"Expected favorited=true, got: {data.get('favorited')}"
            )
        else:
            results.add_pass(f"POST /api/users/{username}/favorite → response.favorited == true")
        
        # 8b: GET /api/users/{u} → is_favorited == true
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username} (after favorite enable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("is_favorited") != True:
            results.add_fail(
                f"GET /api/users/{username} → is_favorited should be true",
                f"Expected is_favorited=true, got: {data.get('is_favorited')}"
            )
        else:
            results.add_pass(f"GET /api/users/{username} → is_favorited == true")
        
        # 8c: POST /api/users/{u}/favorite (disable)
        response = requests.post(
            f"{API_BASE}/users/{username}/favorite",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"POST /api/users/{username}/favorite (disable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("favorited") != False:
            results.add_fail(
                f"POST /api/users/{username}/favorite (disable)",
                f"Expected favorited=false, got: {data.get('favorited')}"
            )
        else:
            results.add_pass(f"POST /api/users/{username}/favorite → response.favorited == false")
        
        # 8d: GET /api/users/{u} → is_favorited == false
        response = requests.get(
            f"{API_BASE}/users/{username}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username} (after favorite disable)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
            return
        
        data = response.json()
        if data.get("is_favorited") != False:
            results.add_fail(
                f"GET /api/users/{username} → is_favorited should be false",
                f"Expected is_favorited=false, got: {data.get('is_favorited')}"
            )
        else:
            results.add_pass(f"GET /api/users/{username} → is_favorited == false")
    
    except Exception as e:
        results.add_fail("Favorite toggle test", f"Exception: {str(e)}")

def test_mutuals_endpoints(token, username):
    """Test 9: Endpoint mutuals (plural) + legacy mutual (singular)"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 9: Mutuals endpoints{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        # 9a: GET /api/users/admin/mutuals (self)
        response = requests.get(
            f"{API_BASE}/users/admin/mutuals",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                "GET /api/users/admin/mutuals (self)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
        else:
            data = response.json()
            if not isinstance(data, list):
                results.add_fail(
                    "GET /api/users/admin/mutuals (self)",
                    f"Expected array, got: {type(data).__name__}"
                )
            else:
                results.add_pass(
                    "GET /api/users/admin/mutuals (self) → status 200 + array []"
                )
        
        # 9b: GET /api/users/{other_user}/mutuals
        response = requests.get(
            f"{API_BASE}/users/{username}/mutuals",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                f"GET /api/users/{username}/mutuals",
                f"Status {response.status_code}: {response.text[:200]}"
            )
        else:
            data = response.json()
            if not isinstance(data, list):
                results.add_fail(
                    f"GET /api/users/{username}/mutuals",
                    f"Expected array, got: {type(data).__name__}"
                )
            else:
                results.add_pass(
                    f"GET /api/users/{username}/mutuals → status 200 + array (may be empty)"
                )
        
        # 9c: GET /api/users/utilizador_que_nao_existe_zzz/mutuals → 404
        response = requests.get(
            f"{API_BASE}/users/utilizador_que_nao_existe_zzz/mutuals",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 404:
            results.add_fail(
                "GET /api/users/utilizador_que_nao_existe_zzz/mutuals",
                f"Expected status 404, got: {response.status_code}"
            )
        else:
            results.add_pass(
                "GET /api/users/utilizador_que_nao_existe_zzz/mutuals → status 404"
            )
        
        # 9d: GET /api/users/admin/mutual (singular legacy)
        response = requests.get(
            f"{API_BASE}/users/admin/mutual",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                "GET /api/users/admin/mutual (singular legacy)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
        else:
            data = response.json()
            if "count" not in data or "users" not in data:
                results.add_fail(
                    "GET /api/users/admin/mutual (singular legacy)",
                    f"Expected {{count, users}}, got: {list(data.keys())}"
                )
            else:
                results.add_pass(
                    "GET /api/users/admin/mutual (singular legacy) → status 200 + {count, users}"
                )
    
    except Exception as e:
        results.add_fail("Mutuals endpoints test", f"Exception: {str(e)}")

def test_no_regressions(token):
    """Test 10: No regressions - stats and profile still work"""
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}TEST 10: No regressions{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    
    try:
        # 10a: GET /api/users/admin/stats
        response = requests.get(
            f"{API_BASE}/users/admin/stats",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                "GET /api/users/admin/stats",
                f"Status {response.status_code}: {response.text[:200]}"
            )
        else:
            data = response.json()
            # Just check it returns valid JSON and doesn't 500
            results.add_pass(
                "GET /api/users/admin/stats → continues to work (no 500)"
            )
        
        # 10b: GET /api/users/admin - check old fields still present
        response = requests.get(
            f"{API_BASE}/users/admin",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code != 200:
            results.add_fail(
                "GET /api/users/admin (regression check)",
                f"Status {response.status_code}: {response.text[:200]}"
            )
        else:
            data = response.json()
            
            # Check old fields are still present
            old_fields = ["posts_count", "likes_received", "can_view", "is_self", "is_following"]
            missing_old_fields = [f for f in old_fields if f not in data]
            
            if missing_old_fields:
                results.add_fail(
                    "GET /api/users/admin - missing old fields",
                    f"Missing: {', '.join(missing_old_fields)}"
                )
            else:
                results.add_pass(
                    "GET /api/users/admin → old fields still present (posts_count, likes_received, can_view, is_self, is_following)"
                )
    
    except Exception as e:
        results.add_fail("No regressions test", f"Exception: {str(e)}")

def main():
    print(f"{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}SMART FOLLOW BUTTON — BACKEND TESTS{RESET}")
    print(f"{BOLD}get_profile extended payload validation{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    print(f"Backend URL: {API_BASE}")
    print(f"Test User: {ADMIN_EMAIL}")
    
    # Test 1: Login
    token = login()
    if not token:
        print(f"\n{RED}Cannot proceed without authentication{RESET}")
        results.summary()
        return 1
    
    # Test 2: Self profile
    test_self_profile(token)
    
    # Test 3: Discover other user
    other_user = discover_other_user(token)
    if not other_user:
        print(f"\n{RED}Cannot proceed without another user for testing{RESET}")
        results.summary()
        return 1
    
    # Test 4: Other user profile
    test_other_user_profile(token, other_user)
    
    # Test 5: Follow toggle
    test_follow_toggle(token, other_user)
    
    # Test 6: Notify toggle
    test_notify_toggle(token, other_user)
    
    # Test 7: Mute toggle
    test_mute_toggle(token, other_user)
    
    # Test 8: Favorite toggle
    test_favorite_toggle(token, other_user)
    
    # Test 9: Mutuals endpoints
    test_mutuals_endpoints(token, other_user)
    
    # Test 10: No regressions
    test_no_regressions(token)
    
    # Summary
    success = results.summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
