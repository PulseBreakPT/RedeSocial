#!/usr/bin/env python3
"""
Test Suite for GET /api/posts/{post_id}/social-likers endpoint
Tests all 6 scenarios as specified in the review request
"""

import os
import sys
import requests
import json
from typing import Optional, Dict, Any

# Backend URL — overridable via env
BASE_URL = os.environ.get(
    "BASE_URL", "https://audit-trail-leo.preview.emergentagent.com/api"
)

# Test credentials must come from environment.
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip()
if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    print(
        "❌ ADMIN_EMAIL and ADMIN_PASSWORD env vars are required. "
        "See /app/memory/test_credentials.md."
    )
    sys.exit(2)

# Test results tracking
test_results = []
total_tests = 0
passed_tests = 0
failed_tests = 0

def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    global total_tests, passed_tests, failed_tests
    total_tests += 1
    if passed:
        passed_tests += 1
        status = "✅ PASS"
    else:
        failed_tests += 1
        status = "❌ FAIL"
    
    result = f"{status} | {test_name}"
    if details:
        result += f"\n    {details}"
    test_results.append(result)
    print(result)

def make_request(method: str, endpoint: str, token: Optional[str] = None, 
                 json_data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple:
    """Make HTTP request and return (status_code, response_json, error)"""
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=30)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=json_data, timeout=30)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=30)
        else:
            return (0, None, f"Unsupported method: {method}")
        
        try:
            return (resp.status_code, resp.json(), None)
        except:
            return (resp.status_code, resp.text, None)
    except Exception as e:
        return (0, None, str(e))

def login(email: str, password: str) -> Optional[str]:
    """Login and return token"""
    status, data, err = make_request("POST", "/auth/login", json_data={
        "email": email,
        "password": password
    })
    
    if status == 200 and data:
        token = data.get("access_token") or data.get("token")
        return token
    return None

def register_user(email: str, password: str, username: str, name: str) -> Optional[tuple]:
    """Register new user and return (token, user_id, username)"""
    status, data, err = make_request("POST", "/auth/register", json_data={
        "email": email,
        "password": password,
        "username": username,
        "name": name
    })
    
    if status in [200, 201] and data:
        token = data.get("access_token") or data.get("token")
        user_id = data.get("user", {}).get("id")
        username = data.get("user", {}).get("username")
        return (token, user_id, username)
    return None

def create_post(token: str, content: str) -> Optional[str]:
    """Create a post and return post_id"""
    status, data, err = make_request("POST", "/posts", token, json_data={
        "content": content
    })
    
    if status in [200, 201] and data:
        return data.get("id")
    return None

def like_post(token: str, post_id: str) -> bool:
    """Like a post"""
    status, data, err = make_request("POST", f"/posts/{post_id}/like", token)
    return status == 200

def follow_user(token: str, username: str) -> bool:
    """Follow a user"""
    status, data, err = make_request("POST", f"/users/{username}/follow", token)
    return status == 200

def get_social_likers(post_id: str, token: Optional[str] = None) -> tuple:
    """Get social likers for a post. Returns (status, data, error)"""
    return make_request("GET", f"/posts/{post_id}/social-likers", token)

def validate_response_shape(data: dict, test_name: str) -> bool:
    """Validate the response shape"""
    if not isinstance(data, dict):
        log_test(test_name, False, f"Response is not a dict: {type(data)}")
        return False
    
    # Check required fields
    if "users" not in data:
        log_test(test_name, False, "Missing 'users' field")
        return False
    
    if "total" not in data:
        log_test(test_name, False, "Missing 'total' field")
        return False
    
    if "followed_total" not in data:
        log_test(test_name, False, "Missing 'followed_total' field")
        return False
    
    # Validate users array
    if not isinstance(data["users"], list):
        log_test(test_name, False, f"'users' is not a list: {type(data['users'])}")
        return False
    
    # Validate each user card
    for i, user in enumerate(data["users"]):
        required_fields = ["id", "username", "name", "avatar", "verified"]
        for field in required_fields:
            if field not in user:
                log_test(test_name, False, f"User card {i} missing '{field}' field")
                return False
    
    # Validate total and followed_total are integers
    if not isinstance(data["total"], int):
        log_test(test_name, False, f"'total' is not an int: {type(data['total'])}")
        return False
    
    if not isinstance(data["followed_total"], int):
        log_test(test_name, False, f"'followed_total' is not an int: {type(data['followed_total'])}")
        return False
    
    return True

def test_t1_anonymous_get():
    """T1: Anonymous GET after user A liked post P"""
    print("\n" + "="*80)
    print("TEST T1: Anonymous GET after user A liked post P")
    print("="*80)
    
    # Login as admin (user A)
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        log_test("T1 - Admin Login", False, "Could not login as admin")
        return None
    
    # Create a post
    post_id = create_post(admin_token, "Test post for social likers T1")
    if not post_id:
        log_test("T1 - Create Post", False, "Could not create post")
        return None
    
    # Admin likes their own post
    if not like_post(admin_token, post_id):
        log_test("T1 - Like Post", False, "Could not like post")
        return None
    
    # Anonymous GET
    status, data, err = get_social_likers(post_id, token=None)
    
    if status != 200:
        log_test("T1 - Anonymous GET", False, f"Status: {status}, Error: {err or data}")
        return None
    
    if not validate_response_shape(data, "T1 - Response Shape"):
        return None
    
    # Validate expectations
    checks = []
    checks.append((data["total"] == 1, f"total should be 1, got {data['total']}"))
    checks.append((data["followed_total"] == 0, f"followed_total should be 0, got {data['followed_total']}"))
    checks.append((len(data["users"]) == 1, f"users should have 1 item, got {len(data['users'])}"))
    
    if len(data["users"]) > 0:
        checks.append((data["users"][0]["username"] == "admin", f"user should be admin, got {data['users'][0].get('username')}"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("T1 - Anonymous GET", True, "All validations passed")
        return post_id
    else:
        log_test("T1 - Anonymous GET", False, f"Failed: {', '.join(failed_checks)}")
        return None

def test_t2_authenticated_not_following(post_id: str):
    """T2: User B (NOT following A) authenticates and GETs"""
    print("\n" + "="*80)
    print("TEST T2: User B (NOT following A) authenticates and GETs")
    print("="*80)
    
    # Try to login as existing user or create new one
    user_b_token = login("userb@vermillion.app", "UserB123!")
    user_b_username = "userb"
    
    if not user_b_token:
        # Register user B
        result = register_user("userb@vermillion.app", "UserB123!", "userb", "User B")
        if not result:
            log_test("T2 - User B Setup", False, "Could not login or register user B")
            return None
        user_b_token, user_b_id, user_b_username = result
    
    # GET as user B (not following admin)
    status, data, err = get_social_likers(post_id, token=user_b_token)
    
    if status != 200:
        log_test("T2 - Authenticated GET (not following)", False, f"Status: {status}, Error: {err or data}")
        return None
    
    if not validate_response_shape(data, "T2 - Response Shape"):
        return None
    
    # Validate expectations
    checks = []
    checks.append((data["total"] == 1, f"total should be 1, got {data['total']}"))
    checks.append((data["followed_total"] == 0, f"followed_total should be 0 (B doesn't follow A), got {data['followed_total']}"))
    checks.append((len(data["users"]) == 1, f"users should have 1 item, got {len(data['users'])}"))
    
    if len(data["users"]) > 0:
        checks.append((data["users"][0]["username"] == "admin", f"user should be admin, got {data['users'][0].get('username')}"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("T2 - Authenticated GET (not following)", True, "All validations passed")
        return user_b_token
    else:
        log_test("T2 - Authenticated GET (not following)", False, f"Failed: {', '.join(failed_checks)}")
        return None

def test_t3_follow_then_get(post_id: str, user_b_token: str):
    """T3: B follows A then GETs"""
    print("\n" + "="*80)
    print("TEST T3: B follows A then GETs")
    print("="*80)
    
    # User B follows admin
    if not follow_user(user_b_token, "admin"):
        log_test("T3 - Follow Admin", False, "Could not follow admin")
        return False
    
    # GET as user B (now following admin)
    status, data, err = get_social_likers(post_id, token=user_b_token)
    
    if status != 200:
        log_test("T3 - GET after following", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if not validate_response_shape(data, "T3 - Response Shape"):
        return False
    
    # Validate expectations
    checks = []
    checks.append((data["total"] == 1, f"total should be 1, got {data['total']}"))
    checks.append((data["followed_total"] == 1, f"followed_total should be 1 (B now follows A), got {data['followed_total']}"))
    checks.append((len(data["users"]) == 1, f"users should have 1 item, got {len(data['users'])}"))
    
    if len(data["users"]) > 0:
        checks.append((data["users"][0]["username"] == "admin", f"user should be admin, got {data['users'][0].get('username')}"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("T3 - GET after following", True, "All validations passed")
        return True
    else:
        log_test("T3 - GET after following", False, f"Failed: {', '.join(failed_checks)}")
        return False

def test_t4_multiple_likers_selective_following(post_id: str, user_b_token: str):
    """T4: Add likes from C and D; B follows A and C"""
    print("\n" + "="*80)
    print("TEST T4: Add likes from C and D; B follows A and C")
    print("="*80)
    
    # Create user C
    result_c = register_user("userc@vermillion.app", "UserC123!", "userc", "User C")
    if not result_c:
        log_test("T4 - User C Setup", False, "Could not register user C")
        return False
    user_c_token, user_c_id, user_c_username = result_c
    
    # Create user D
    result_d = register_user("userd@vermillion.app", "UserD123!", "userd", "User D")
    if not result_d:
        log_test("T4 - User D Setup", False, "Could not register user D")
        return False
    user_d_token, user_d_id, user_d_username = result_d
    
    # User C likes the post
    if not like_post(user_c_token, post_id):
        log_test("T4 - User C Like", False, "User C could not like post")
        return False
    
    # User D likes the post
    if not like_post(user_d_token, post_id):
        log_test("T4 - User D Like", False, "User D could not like post")
        return False
    
    # User B follows user C (already follows admin from T3)
    if not follow_user(user_b_token, user_c_username):
        log_test("T4 - B follows C", False, "User B could not follow user C")
        return False
    
    # GET as user B
    status, data, err = get_social_likers(post_id, token=user_b_token)
    
    if status != 200:
        log_test("T4 - GET with multiple likers", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if not validate_response_shape(data, "T4 - Response Shape"):
        return False
    
    # Validate expectations
    checks = []
    checks.append((data["total"] == 3, f"total should be 3 (admin, C, D), got {data['total']}"))
    checks.append((data["followed_total"] == 2, f"followed_total should be 2 (admin, C), got {data['followed_total']}"))
    checks.append((len(data["users"]) <= 3, f"users should have at most 3 items, got {len(data['users'])}"))
    
    # Check that users contains admin and C (both followed by B)
    usernames = [u["username"] for u in data["users"]]
    checks.append(("admin" in usernames, f"admin should be in users, got {usernames}"))
    checks.append((user_c_username in usernames, f"{user_c_username} should be in users, got {usernames}"))
    
    # Users should be ordered by followers desc
    # We can't strictly validate ordering without knowing follower counts, but we can check structure
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("T4 - GET with multiple likers", True, "All validations passed")
        return True
    else:
        log_test("T4 - GET with multiple likers", False, f"Failed: {', '.join(failed_checks)}")
        return False

def test_t5_self_exclusion(post_id: str, user_b_token: str):
    """T5: B likes the post too, then GETs as B (self-exclusion)"""
    print("\n" + "="*80)
    print("TEST T5: B likes the post too, then GETs as B (self-exclusion)")
    print("="*80)
    
    # User B likes the post
    if not like_post(user_b_token, post_id):
        log_test("T5 - User B Like", False, "User B could not like post")
        return False
    
    # GET as user B
    status, data, err = get_social_likers(post_id, token=user_b_token)
    
    if status != 200:
        log_test("T5 - GET with self-exclusion", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if not validate_response_shape(data, "T5 - Response Shape"):
        return False
    
    # Validate expectations
    checks = []
    checks.append((data["total"] == 4, f"total should be 4 (admin, B, C, D), got {data['total']}"))
    
    # Check that users does NOT contain userb (self-exclusion)
    usernames = [u["username"] for u in data["users"]]
    checks.append(("userb" not in usernames, f"userb should NOT be in users (self-exclusion), got {usernames}"))
    
    # followed_total should still be 2 (admin and C, excluding self)
    checks.append((data["followed_total"] == 2, f"followed_total should be 2 (admin, C, excluding self), got {data['followed_total']}"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("T5 - GET with self-exclusion", True, "All validations passed")
        return True
    else:
        log_test("T5 - GET with self-exclusion", False, f"Failed: {', '.join(failed_checks)}")
        return False

def test_t6_nonexistent_post():
    """T6: GET on fake/non-existent post id"""
    print("\n" + "="*80)
    print("TEST T6: GET on fake/non-existent post id")
    print("="*80)
    
    fake_post_id = "nonexistent-post-id-12345"
    
    # GET with fake post id
    status, data, err = get_social_likers(fake_post_id, token=None)
    
    if status == 404:
        log_test("T6 - GET nonexistent post", True, "Correctly returned 404")
        return True
    else:
        log_test("T6 - GET nonexistent post", False, f"Expected 404, got {status}")
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("SOCIAL LIKERS ENDPOINT TEST SUITE")
    print("GET /api/posts/{post_id}/social-likers")
    print("=" * 80)
    
    # T1: Anonymous GET
    post_id = test_t1_anonymous_get()
    if not post_id:
        print("\n❌ CRITICAL: T1 failed. Cannot continue.")
        return
    
    # T2: Authenticated GET (not following)
    user_b_token = test_t2_authenticated_not_following(post_id)
    if not user_b_token:
        print("\n❌ CRITICAL: T2 failed. Cannot continue.")
        return
    
    # T3: Follow then GET
    if not test_t3_follow_then_get(post_id, user_b_token):
        print("\n⚠️  WARNING: T3 failed. Continuing with remaining tests.")
    
    # T4: Multiple likers with selective following
    if not test_t4_multiple_likers_selective_following(post_id, user_b_token):
        print("\n⚠️  WARNING: T4 failed. Continuing with remaining tests.")
    
    # T5: Self-exclusion
    if not test_t5_self_exclusion(post_id, user_b_token):
        print("\n⚠️  WARNING: T5 failed. Continuing with remaining tests.")
    
    # T6: Nonexistent post
    test_t6_nonexistent_post()
    
    # Summary
    print()
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests} ✅")
    print(f"Failed: {failed_tests} ❌")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
    print()
    
    if failed_tests > 0:
        print("FAILED TESTS:")
        for result in test_results:
            if "❌ FAIL" in result:
                print(result)
        print()
    
    print("=" * 80)

if __name__ == "__main__":
    main()
