#!/usr/bin/env python3
"""
Comprehensive test suite for Admin Panel Grupo A: Feature Flags + Limites Globais
Tests all 16 scenarios from the review request sequentially.
"""
import os
import sys
import requests
import time
import json
from datetime import datetime

# Backend URL — overridable via env
BASE_URL = os.environ.get(
    "BASE_URL", "https://admin-cockpit-pro.preview.emergentagent.com/api"
)

# Test credentials must come from environment (see /app/memory/test_credentials.md).
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip()
if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    print(
        "❌ ADMIN_EMAIL and ADMIN_PASSWORD env vars are required. "
        "See /app/memory/test_credentials.md."
    )
    sys.exit(2)

# Global state
admin_token = None
user_a_token = None
user_b_token = None
user_a_id = None
user_b_id = None

def log(msg):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def wait_cache_ttl():
    """Wait for cache TTL (5s) + 1s buffer = 6s"""
    log("⏳ Waiting 6s for cache TTL...")
    time.sleep(6)

def register_user(email, password, username, name):
    """Register a new user and return token"""
    log(f"📝 Registering user: {username}")
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "username": username,
        "name": name
    })
    if resp.status_code not in [200, 201]:
        log(f"❌ Registration failed: {resp.status_code} - {resp.text}")
        return None
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    user_id = data.get("user", {}).get("id")
    log(f"✅ User {username} registered (ID: {user_id})")
    return token, user_id

def reset_setting(key):
    """Reset a single setting to default"""
    log(f"🔄 Resetting setting: {key}")
    resp = requests.post(
        f"{BASE_URL}/admin/settings/reset",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"key": key}
    )
    if resp.status_code == 200:
        log(f"✅ Setting {key} reset to default")
    else:
        log(f"⚠️ Reset failed: {resp.status_code}")
    wait_cache_ttl()

def reset_all_settings():
    """Reset all settings to defaults"""
    log("🔄 Resetting ALL settings to defaults")
    resp = requests.post(
        f"{BASE_URL}/admin/settings/reset",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"all": True}
    )
    if resp.status_code == 200:
        log(f"✅ All settings reset: {resp.json()}")
    else:
        log(f"⚠️ Reset all failed: {resp.status_code}")
    wait_cache_ttl()

def create_post(token, content, images=None):
    """Create a post and return post_id"""
    payload = {"content": content}
    if images:
        payload["images"] = images
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    if resp.status_code in [200, 201]:
        post_id = resp.json().get("id")
        log(f"✅ Post created: {post_id}")
        return post_id, resp
    else:
        log(f"❌ Post creation failed: {resp.status_code} - {resp.text}")
        return None, resp

# ============================================================
# TEST SCENARIOS
# ============================================================

def test_1_auth_and_shape():
    """Test 1: Auth & shape - 401/403/200 with correct structure"""
    log("\n" + "="*60)
    log("TEST 1: Auth & Shape")
    log("="*60)
    
    results = []
    
    # 1a) No token → 401
    log("1a) GET /admin/settings without token → expect 401")
    resp = requests.get(f"{BASE_URL}/admin/settings")
    if resp.status_code == 401:
        log("✅ 401 Unauthorized (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 401, got {resp.status_code}")
        results.append(False)
    
    # 1b) Normal user token → 403
    log("1b) GET /admin/settings with normal user token → expect 403")
    resp = requests.get(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {user_a_token}"}
    )
    if resp.status_code == 403:
        log("✅ 403 Forbidden (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 403, got {resp.status_code}")
        results.append(False)
    
    # 1c) Admin token → 200 with correct structure
    log("1c) GET /admin/settings with admin token → expect 200")
    resp = requests.get(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if resp.status_code == 200:
        data = resp.json()
        required_keys = ["registry", "values", "defaults", "overrides", "history"]
        has_all_keys = all(k in data for k in required_keys)
        if has_all_keys:
            log(f"✅ 200 OK with all required keys: {required_keys}")
            results.append(True)
        else:
            log(f"❌ Missing keys. Got: {list(data.keys())}")
            results.append(False)
    else:
        log(f"❌ Expected 200, got {resp.status_code}")
        results.append(False)
    
    # 1d) Validate registry has ≥18 settings
    log("1d) Validate registry has ≥18 settings")
    resp = requests.get(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if resp.status_code == 200:
        data = resp.json()
        registry = data.get("registry", [])
        expected_keys = [
            "signup_open", "posts_enabled", "comments_enabled", "dm_enabled",
            "stories_enabled", "reactions_enabled", "polls_enabled", "uploads_enabled",
            "trending_enabled", "read_only_mode", "max_post_chars", "max_comment_chars",
            "max_dm_chars", "max_posts_per_hour", "max_comments_per_hour",
            "max_dms_per_hour", "max_images_per_post", "session_ttl_days"
        ]
        registry_keys = [item["key"] for item in registry]
        has_all = all(k in registry_keys for k in expected_keys)
        if has_all and len(registry) >= 18:
            log(f"✅ Registry has {len(registry)} settings, all expected keys present")
            results.append(True)
        else:
            missing = [k for k in expected_keys if k not in registry_keys]
            log(f"❌ Registry validation failed. Missing: {missing}")
            results.append(False)
    else:
        log(f"❌ Failed to get settings")
        results.append(False)
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 1 Results: {passed}/{total} passed")
    return all(results)

def test_2_patch_validation():
    """Test 2: PATCH validation - type errors, min/max, unknown keys, no-ops"""
    log("\n" + "="*60)
    log("TEST 2: PATCH Validation")
    log("="*60)
    
    results = []
    
    # 2a) Type error: string instead of int
    log("2a) PATCH with type error (string instead of int) → expect 400")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_post_chars": "abc"}}
    )
    if resp.status_code == 400:
        log("✅ 400 Bad Request (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 400, got {resp.status_code}")
        results.append(False)
    
    # 2b) Min violation
    log("2b) PATCH with value below minimum (max_post_chars=5, min=50) → expect 400")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_post_chars": 5}}
    )
    if resp.status_code == 400:
        log("✅ 400 Bad Request (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 400, got {resp.status_code}")
        results.append(False)
    
    # 2c) Max violation
    log("2c) PATCH with value above maximum (max_post_chars=100000, max=10000) → expect 400")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_post_chars": 100000}}
    )
    if resp.status_code == 400:
        log("✅ 400 Bad Request (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 400, got {resp.status_code}")
        results.append(False)
    
    # 2d) Unknown key (should be ignored)
    log("2d) PATCH with unknown key → expect 200 with empty updated")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"foo_bar_unknown": 123}}
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("updated") == {}:
            log("✅ 200 OK with empty updated (key ignored)")
            results.append(True)
        else:
            log(f"❌ Expected empty updated, got: {data}")
            results.append(False)
    else:
        log(f"❌ Expected 200, got {resp.status_code}")
        results.append(False)
    
    # 2e) No-op (value equals current)
    log("2e) PATCH with value equal to current → expect 200 with empty updated")
    # First, set a value
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_post_chars": 400}}
    )
    wait_cache_ttl()
    # Then try to set the same value
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_post_chars": 400}}
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("updated") == {}:
            log("✅ 200 OK with empty updated (no-op)")
            results.append(True)
        else:
            log(f"❌ Expected empty updated, got: {data}")
            results.append(False)
    else:
        log(f"❌ Expected 200, got {resp.status_code}")
        results.append(False)
    
    # Reset
    reset_setting("max_post_chars")
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 2 Results: {passed}/{total} passed")
    return all(results)

def test_3_signup_open():
    """Test 3: signup_open flag"""
    log("\n" + "="*60)
    log("TEST 3: signup_open Flag")
    log("="*60)
    
    results = []
    
    # 3a) Disable signup_open
    log("3a) PATCH signup_open=false")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"signup_open": False}}
    )
    if resp.status_code == 200:
        data = resp.json()
        updated = data.get("updated", {}).get("signup_open", {})
        if updated.get("from") == True and updated.get("to") == False:
            log("✅ signup_open set to false")
            results.append(True)
        else:
            log(f"❌ Unexpected update: {updated}")
            results.append(False)
    else:
        log(f"❌ PATCH failed: {resp.status_code}")
        results.append(False)
    
    wait_cache_ttl()
    
    # 3b) Try to register → expect 503
    log("3b) POST /auth/register with signup_open=false → expect 503")
    random_email = f"test_{int(time.time())}@test.com"
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": random_email,
        "password": "Test123!",
        "username": f"test{int(time.time())}",
        "name": "Test User"
    })
    if resp.status_code == 503:
        log("✅ 503 Service Unavailable (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 503, got {resp.status_code}")
        results.append(False)
    
    # 3c) Reset signup_open
    log("3c) Reset signup_open to default")
    reset_setting("signup_open")
    
    # 3d) Try to register again → should work
    log("3d) POST /auth/register after reset → expect 200/201")
    random_email = f"test_{int(time.time())}@test.com"
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": random_email,
        "password": "Test123!",
        "username": f"test{int(time.time())}",
        "name": "Test User"
    })
    if resp.status_code in [200, 201]:
        log("✅ Registration works after reset")
        results.append(True)
    else:
        log(f"❌ Expected 200/201, got {resp.status_code}")
        results.append(False)
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 3 Results: {passed}/{total} passed")
    return all(results)

def test_4_comments_enabled_and_max_chars():
    """Test 4: comments_enabled flag + max_comment_chars limit + admin bypass"""
    log("\n" + "="*60)
    log("TEST 4: comments_enabled + max_comment_chars + Admin Bypass")
    log("="*60)
    
    results = []
    
    # Create a post first
    log("Creating a test post...")
    post_id, _ = create_post(user_a_token, "Test post for comments")
    if not post_id:
        log("❌ Failed to create test post")
        return False
    
    # 4a) Disable comments_enabled
    log("4a) PATCH comments_enabled=false")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"comments_enabled": False}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 4b) UserB tries to comment → expect 503
    log("4b) UserB POST /posts/{id}/comments with comments_enabled=false → expect 503")
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/comments",
        headers={"Authorization": f"Bearer {user_b_token}"},
        json={"content": "This should fail"}
    )
    if resp.status_code == 503:
        log("✅ 503 Service Unavailable (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 503, got {resp.status_code}")
        results.append(False)
    
    # 4c) Admin tries to comment → should work (bypass)
    log("4c) Admin POST /posts/{id}/comments → expect 200/201 (admin bypass)")
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/comments",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"content": "Admin comment works"}
    )
    if resp.status_code in [200, 201]:
        log("✅ Admin bypass works")
        results.append(True)
    else:
        log(f"❌ Expected 200/201, got {resp.status_code}")
        results.append(False)
    
    # 4d) Reset comments_enabled
    reset_setting("comments_enabled")
    
    # 4e) Set max_comment_chars to 20
    log("4e) PATCH max_comment_chars=20")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_comment_chars": 20}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 4f) UserB tries to comment with 30 chars → expect 400
    log("4f) UserB POST comment with 30 chars (limit=20) → expect 400")
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/comments",
        headers={"Authorization": f"Bearer {user_b_token}"},
        json={"content": "This comment has thirty chars"}  # 30 chars
    )
    if resp.status_code == 400:
        log("✅ 400 Bad Request (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 400, got {resp.status_code}")
        results.append(False)
    
    # 4g) UserB tries with 10 chars → should work
    log("4g) UserB POST comment with 10 chars → expect 200/201")
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/comments",
        headers={"Authorization": f"Bearer {user_b_token}"},
        json={"content": "Short one"}  # 9 chars
    )
    if resp.status_code in [200, 201]:
        log("✅ Comment within limit works")
        results.append(True)
    else:
        log(f"❌ Expected 200/201, got {resp.status_code}")
        results.append(False)
    
    # 4h) Admin tries with 100 chars → should work (bypass)
    log("4h) Admin POST comment with 100 chars → expect 200/201 (admin bypass)")
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/comments",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"content": "A" * 100}
    )
    if resp.status_code in [200, 201]:
        log("✅ Admin bypass works for char limit")
        results.append(True)
    else:
        log(f"❌ Expected 200/201, got {resp.status_code}")
        results.append(False)
    
    # Reset
    reset_setting("max_comment_chars")
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 4 Results: {passed}/{total} passed")
    return all(results)

def test_5_dm_enabled_and_max_chars():
    """Test 5: dm_enabled flag + max_dm_chars limit + admin bypass"""
    log("\n" + "="*60)
    log("TEST 5: dm_enabled + max_dm_chars + Admin Bypass")
    log("="*60)
    
    results = []
    
    # 5a) Disable dm_enabled
    log("5a) PATCH dm_enabled=false")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"dm_enabled": False}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 5b) UserA tries to send DM → expect 503
    log("5b) UserA POST /messages with dm_enabled=false → expect 503")
    resp = requests.post(
        f"{BASE_URL}/messages",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"to_user_id": user_b_id, "content": "Test DM"}
    )
    if resp.status_code == 503:
        log("✅ 503 Service Unavailable (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 503, got {resp.status_code}")
        results.append(False)
    
    # 5c) Admin tries to send DM → should work (bypass)
    log("5c) Admin POST /messages → expect 200/201 (admin bypass)")
    resp = requests.post(
        f"{BASE_URL}/messages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"to_user_id": user_a_id, "content": "Admin DM works"}
    )
    if resp.status_code in [200, 201]:
        log("✅ Admin bypass works")
        results.append(True)
    else:
        log(f"❌ Expected 200/201, got {resp.status_code}")
        results.append(False)
    
    # 5d) Reset dm_enabled
    reset_setting("dm_enabled")
    
    # 5e) Set max_dm_chars to 50
    log("5e) PATCH max_dm_chars=50")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_dm_chars": 50}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 5f) UserA sends 100 chars → expect 400
    log("5f) UserA POST /messages with 100 chars (limit=50) → expect 400")
    resp = requests.post(
        f"{BASE_URL}/messages",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"to_user_id": user_b_id, "content": "A" * 100}
    )
    if resp.status_code == 400:
        log("✅ 400 Bad Request (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 400, got {resp.status_code}")
        results.append(False)
    
    # 5g) UserA sends 30 chars → should work
    log("5g) UserA POST /messages with 30 chars → expect 200/201")
    resp = requests.post(
        f"{BASE_URL}/messages",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"to_user_id": user_b_id, "content": "This is a short message ok"}
    )
    if resp.status_code in [200, 201]:
        log("✅ DM within limit works")
        results.append(True)
    else:
        log(f"❌ Expected 200/201, got {resp.status_code}")
        results.append(False)
    
    # Reset
    reset_setting("max_dm_chars")
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 5 Results: {passed}/{total} passed")
    return all(results)

def test_6_other_flags_and_bypass():
    """Test 6: stories_enabled, reactions_enabled, uploads_enabled, polls_enabled + admin bypass"""
    log("\n" + "="*60)
    log("TEST 6: Other Feature Flags + Admin Bypass")
    log("="*60)
    
    results = []
    
    # Create a post for reactions test
    post_id, _ = create_post(user_a_token, "Test post for reactions")
    
    # Test stories_enabled
    log("6a) Testing stories_enabled flag")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"stories_enabled": False}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # UserA tries to create story → 503
    resp = requests.post(
        f"{BASE_URL}/stories",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"media_type": "text", "text_content": "Test", "background": "fado"}
    )
    results.append(resp.status_code == 503)
    
    # Admin creates story → should work
    resp = requests.post(
        f"{BASE_URL}/stories",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"media_type": "text", "text_content": "Admin story", "background": "fado"}
    )
    results.append(resp.status_code in [200, 201])
    reset_setting("stories_enabled")
    
    # Test reactions_enabled
    log("6b) Testing reactions_enabled flag")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"reactions_enabled": False}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # UserA tries to react → 503
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/react",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"emoji": "saudade"}
    )
    results.append(resp.status_code == 503)
    
    # Admin reacts → should work
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/react",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"emoji": "saudade"}
    )
    results.append(resp.status_code in [200, 201])
    reset_setting("reactions_enabled")
    
    # Test uploads_enabled
    log("6c) Testing uploads_enabled flag")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"uploads_enabled": False}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # UserA tries to post with image → 503
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"content": "Post with image", "images": ["data:image/png;base64,test"]}
    )
    results.append(resp.status_code == 503)
    
    # Admin posts with image → should work
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"content": "Admin post with image", "images": ["data:image/png;base64,test"]}
    )
    results.append(resp.status_code in [200, 201])
    reset_setting("uploads_enabled")
    
    # Test polls_enabled
    log("6d) Testing polls_enabled flag")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"polls_enabled": False}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # UserA tries to post with poll → 503
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"content": "Poll post", "poll": {"question": "Test?", "options": ["A", "B"]}}
    )
    results.append(resp.status_code == 503)
    
    # Admin posts with poll → should work
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"content": "Admin poll", "poll": {"question": "Test?", "options": ["A", "B"]}}
    )
    results.append(resp.status_code in [200, 201])
    reset_setting("polls_enabled")
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 6 Results: {passed}/{total} passed")
    return all(results)

def test_7_posts_enabled_and_limits():
    """Test 7: posts_enabled + max_post_chars + max_images_per_post"""
    log("\n" + "="*60)
    log("TEST 7: posts_enabled + max_post_chars + max_images_per_post")
    log("="*60)
    
    results = []
    
    # 7a) Disable posts_enabled
    log("7a) PATCH posts_enabled=false")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"posts_enabled": False}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # UserA tries to post → 503
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"content": "This should fail"}
    )
    results.append(resp.status_code == 503)
    
    # Admin posts → should work
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"content": "Admin post works"}
    )
    results.append(resp.status_code in [200, 201])
    reset_setting("posts_enabled")
    
    # 7b) Set max_post_chars to 60
    log("7b) PATCH max_post_chars=60")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_post_chars": 60}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # UserA posts with 100 chars → 400
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"content": "A" * 100}
    )
    results.append(resp.status_code == 400)
    
    # UserA posts with 40 chars → should work
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"content": "This is a short post within the limit"}
    )
    results.append(resp.status_code in [200, 201])
    reset_setting("max_post_chars")
    
    # 7c) Set max_images_per_post to 2
    log("7c) PATCH max_images_per_post=2")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_images_per_post": 2}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # UserA posts with 4 images → should cap to 2
    log("UserA posts with 4 images (limit=2) → should cap to 2")
    post_id, resp = create_post(
        user_a_token,
        "Post with images",
        images=["data:image/png;base64,img1", "data:image/png;base64,img2",
                "data:image/png;base64,img3", "data:image/png;base64,img4"]
    )
    if resp.status_code in [200, 201]:
        data = resp.json()
        images = data.get("images", [])
        if len(images) == 2:
            log(f"✅ Images capped to 2 (got {len(images)})")
            results.append(True)
        else:
            log(f"❌ Expected 2 images, got {len(images)}")
            results.append(False)
    else:
        log(f"❌ Post creation failed: {resp.status_code}")
        results.append(False)
    
    reset_setting("max_images_per_post")
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 7 Results: {passed}/{total} passed")
    return all(results)

def test_8_trending_enabled():
    """Test 8: trending_enabled flag"""
    log("\n" + "="*60)
    log("TEST 8: trending_enabled Flag")
    log("="*60)
    
    results = []
    
    # 8a) Disable trending_enabled
    log("8a) PATCH trending_enabled=false")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"trending_enabled": False}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 8b) GET /trending → should return []
    log("8b) GET /trending with trending_enabled=false → expect []")
    resp = requests.get(f"{BASE_URL}/trending")
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list) and len(data) == 0:
            log("✅ Trending returns empty array")
            results.append(True)
        else:
            log(f"❌ Expected empty array, got: {data}")
            results.append(False)
    else:
        log(f"❌ Expected 200, got {resp.status_code}")
        results.append(False)
    
    # 8c) Reset trending_enabled
    reset_setting("trending_enabled")
    
    # 8d) GET /trending → should return results
    log("8d) GET /trending after reset → expect results")
    resp = requests.get(f"{BASE_URL}/trending")
    if resp.status_code == 200:
        data = resp.json()
        # May be empty if no trending data, but should be a list
        if isinstance(data, list):
            log(f"✅ Trending returns list (length={len(data)})")
            results.append(True)
        else:
            log(f"❌ Expected list, got: {type(data)}")
            results.append(False)
    else:
        log(f"❌ Expected 200, got {resp.status_code}")
        results.append(False)
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 8 Results: {passed}/{total} passed")
    return all(results)

def test_9_read_only_mode():
    """Test 9: read_only_mode global kill-switch"""
    log("\n" + "="*60)
    log("TEST 9: read_only_mode Global Kill-Switch")
    log("="*60)
    
    results = []
    
    # Create a post for testing
    post_id, _ = create_post(user_a_token, "Test post for read-only mode")
    
    # 9a) Enable read_only_mode
    log("9a) PATCH read_only_mode=true")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"read_only_mode": True}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 9b) UserA tries various write operations → all should be 503
    log("9b) Testing all write operations with read_only_mode=true")
    
    # POST /posts
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"content": "Should fail"}
    )
    results.append(resp.status_code == 503)
    
    # POST /posts/{id}/comments
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/comments",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"content": "Should fail"}
    )
    results.append(resp.status_code == 503)
    
    # POST /messages
    resp = requests.post(
        f"{BASE_URL}/messages",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"to_user_id": user_b_id, "content": "Should fail"}
    )
    results.append(resp.status_code == 503)
    
    # POST /posts/{id}/react
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/react",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"emoji": "saudade"}
    )
    results.append(resp.status_code == 503)
    
    # POST /stories
    resp = requests.post(
        f"{BASE_URL}/stories",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"media_type": "text", "text_content": "Should fail", "background": "fado"}
    )
    results.append(resp.status_code == 503)
    
    # 9c) Admin tries all operations → should work (bypass)
    log("9c) Testing admin bypass for read_only_mode")
    
    # Admin POST /posts
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"content": "Admin post in read-only mode"}
    )
    results.append(resp.status_code in [200, 201])
    
    # Admin POST /posts/{id}/comments
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/comments",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"content": "Admin comment in read-only mode"}
    )
    results.append(resp.status_code in [200, 201])
    
    # 9d) Reset read_only_mode
    reset_setting("read_only_mode")
    
    # 9e) UserA can write again
    log("9e) UserA can write after reset")
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"content": "Normal post after reset"}
    )
    results.append(resp.status_code in [200, 201])
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 9 Results: {passed}/{total} passed")
    return all(results)

def test_10_max_posts_per_hour():
    """Test 10: max_posts_per_hour rate limit"""
    log("\n" + "="*60)
    log("TEST 10: max_posts_per_hour Rate Limit")
    log("="*60)
    
    results = []
    
    # 10a) Set max_posts_per_hour to 2
    log("10a) PATCH max_posts_per_hour=2")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_posts_per_hour": 2}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 10b) UserA creates 2 posts → should work
    log("10b) UserA creates 2 posts (limit=2) → expect 200/201")
    for i in range(2):
        resp = requests.post(
            f"{BASE_URL}/posts",
            headers={"Authorization": f"Bearer {user_a_token}"},
            json={"content": f"Post {i+1} within limit"}
        )
        if resp.status_code in [200, 201]:
            log(f"✅ Post {i+1} created successfully")
            results.append(True)
        else:
            log(f"❌ Post {i+1} failed: {resp.status_code}")
            results.append(False)
    
    # 10c) UserA tries 3rd post → expect 429
    log("10c) UserA creates 3rd post → expect 429")
    resp = requests.post(
        f"{BASE_URL}/posts",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"content": "3rd post should fail"}
    )
    if resp.status_code == 429:
        log("✅ 429 Too Many Requests (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 429, got {resp.status_code}")
        results.append(False)
    
    # 10d) Admin creates 5 posts → should work (bypass)
    log("10d) Admin creates 5 posts → expect all to succeed (admin bypass)")
    admin_results = []
    for i in range(5):
        resp = requests.post(
            f"{BASE_URL}/posts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"content": f"Admin post {i+1}"}
        )
        admin_results.append(resp.status_code in [200, 201])
    
    if all(admin_results):
        log(f"✅ All 5 admin posts succeeded (bypass works)")
        results.append(True)
    else:
        log(f"❌ Some admin posts failed")
        results.append(False)
    
    # Reset
    reset_setting("max_posts_per_hour")
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 10 Results: {passed}/{total} passed")
    return all(results)

def test_11_max_comments_per_hour():
    """Test 11: max_comments_per_hour rate limit"""
    log("\n" + "="*60)
    log("TEST 11: max_comments_per_hour Rate Limit")
    log("="*60)
    
    results = []
    
    # Create a post for comments
    post_id, _ = create_post(user_a_token, "Test post for comment rate limit")
    
    # 11a) Set max_comments_per_hour to 2
    log("11a) PATCH max_comments_per_hour=2")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_comments_per_hour": 2}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 11b) UserB creates 2 comments → should work
    log("11b) UserB creates 2 comments (limit=2) → expect 200/201")
    for i in range(2):
        resp = requests.post(
            f"{BASE_URL}/posts/{post_id}/comments",
            headers={"Authorization": f"Bearer {user_b_token}"},
            json={"content": f"Comment {i+1}"}
        )
        if resp.status_code in [200, 201]:
            log(f"✅ Comment {i+1} created successfully")
            results.append(True)
        else:
            log(f"❌ Comment {i+1} failed: {resp.status_code}")
            results.append(False)
    
    # 11c) UserB tries 3rd comment → expect 429
    log("11c) UserB creates 3rd comment → expect 429")
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/comments",
        headers={"Authorization": f"Bearer {user_b_token}"},
        json={"content": "3rd comment should fail"}
    )
    if resp.status_code == 429:
        log("✅ 429 Too Many Requests (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 429, got {resp.status_code}")
        results.append(False)
    
    # 11d) Admin creates 5 comments → should work (bypass)
    log("11d) Admin creates 5 comments → expect all to succeed (admin bypass)")
    admin_results = []
    for i in range(5):
        resp = requests.post(
            f"{BASE_URL}/posts/{post_id}/comments",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"content": f"Admin comment {i+1}"}
        )
        admin_results.append(resp.status_code in [200, 201])
    
    if all(admin_results):
        log(f"✅ All 5 admin comments succeeded (bypass works)")
        results.append(True)
    else:
        log(f"❌ Some admin comments failed")
        results.append(False)
    
    # Reset
    reset_setting("max_comments_per_hour")
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 11 Results: {passed}/{total} passed")
    return all(results)

def test_12_max_dms_per_hour():
    """Test 12: max_dms_per_hour rate limit"""
    log("\n" + "="*60)
    log("TEST 12: max_dms_per_hour Rate Limit")
    log("="*60)
    
    results = []
    
    # 12a) Set max_dms_per_hour to 2
    log("12a) PATCH max_dms_per_hour=2")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_dms_per_hour": 2}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 12b) UserA sends 2 DMs → should work
    log("12b) UserA sends 2 DMs (limit=2) → expect 200/201")
    for i in range(2):
        resp = requests.post(
            f"{BASE_URL}/messages",
            headers={"Authorization": f"Bearer {user_a_token}"},
            json={"to_user_id": user_b_id, "content": f"DM {i+1}"}
        )
        if resp.status_code in [200, 201]:
            log(f"✅ DM {i+1} sent successfully")
            results.append(True)
        else:
            log(f"❌ DM {i+1} failed: {resp.status_code}")
            results.append(False)
    
    # 12c) UserA tries 3rd DM → expect 429
    log("12c) UserA sends 3rd DM → expect 429")
    resp = requests.post(
        f"{BASE_URL}/messages",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"to_user_id": user_b_id, "content": "3rd DM should fail"}
    )
    if resp.status_code == 429:
        log("✅ 429 Too Many Requests (correct)")
        results.append(True)
    else:
        log(f"❌ Expected 429, got {resp.status_code}")
        results.append(False)
    
    # 12d) Admin sends 5 DMs → should work (bypass)
    log("12d) Admin sends 5 DMs → expect all to succeed (admin bypass)")
    admin_results = []
    for i in range(5):
        resp = requests.post(
            f"{BASE_URL}/messages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"to_user_id": user_a_id, "content": f"Admin DM {i+1}"}
        )
        admin_results.append(resp.status_code in [200, 201])
    
    if all(admin_results):
        log(f"✅ All 5 admin DMs succeeded (bypass works)")
        results.append(True)
    else:
        log(f"❌ Some admin DMs failed")
        results.append(False)
    
    # Reset
    reset_setting("max_dms_per_hour")
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 12 Results: {passed}/{total} passed")
    return all(results)

def test_13_reset_endpoints():
    """Test 13: Reset endpoints (single key and all)"""
    log("\n" + "="*60)
    log("TEST 13: Reset Endpoints")
    log("="*60)
    
    results = []
    
    # 13a) Set multiple settings
    log("13a) Setting multiple values")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {
            "max_post_chars": 400,
            "max_comment_chars": 250,
            "max_dm_chars": 1500
        }}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 13b) Verify overrides has ≥2 keys
    log("13b) Verify overrides has ≥2 keys")
    resp = requests.get(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if resp.status_code == 200:
        data = resp.json()
        overrides = data.get("overrides", {})
        if len(overrides) >= 2:
            log(f"✅ Overrides has {len(overrides)} keys")
            results.append(True)
        else:
            log(f"❌ Expected ≥2 keys in overrides, got {len(overrides)}")
            results.append(False)
    else:
        results.append(False)
    
    # 13c) Reset single key
    log("13c) Reset max_post_chars to default")
    resp = requests.post(
        f"{BASE_URL}/admin/settings/reset",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"key": "max_post_chars"}
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("reset") == True and data.get("value") == 500:
            log("✅ max_post_chars reset to default (500)")
            results.append(True)
        else:
            log(f"❌ Unexpected response: {data}")
            results.append(False)
    else:
        log(f"❌ Reset failed: {resp.status_code}")
        results.append(False)
    
    wait_cache_ttl()
    
    # 13d) Verify key removed from overrides
    log("13d) Verify max_post_chars removed from overrides")
    resp = requests.get(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if resp.status_code == 200:
        data = resp.json()
        overrides = data.get("overrides", {})
        if "max_post_chars" not in overrides:
            log("✅ max_post_chars removed from overrides")
            results.append(True)
        else:
            log("❌ max_post_chars still in overrides")
            results.append(False)
    else:
        results.append(False)
    
    # 13e) Reset all
    log("13e) Reset all settings")
    resp = requests.post(
        f"{BASE_URL}/admin/settings/reset",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"all": True}
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("reset_count", 0) >= 1:
            log(f"✅ All settings reset (count={data.get('reset_count')})")
            results.append(True)
        else:
            log(f"❌ Unexpected response: {data}")
            results.append(False)
    else:
        log(f"❌ Reset all failed: {resp.status_code}")
        results.append(False)
    
    wait_cache_ttl()
    
    # 13f) Verify overrides is empty
    log("13f) Verify overrides is empty after reset all")
    resp = requests.get(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if resp.status_code == 200:
        data = resp.json()
        overrides = data.get("overrides", {})
        if len(overrides) == 0:
            log("✅ Overrides is empty")
            results.append(True)
        else:
            log(f"❌ Overrides not empty: {overrides}")
            results.append(False)
    else:
        results.append(False)
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 13 Results: {passed}/{total} passed")
    return all(results)

def test_14_history():
    """Test 14: History array"""
    log("\n" + "="*60)
    log("TEST 14: History Array")
    log("="*60)
    
    results = []
    
    # 14a) Make several changes
    log("14a) Making several changes to populate history")
    changes = [
        {"max_post_chars": 450},
        {"max_comment_chars": 280},
        {"comments_enabled": False},
        {"comments_enabled": True},
    ]
    
    for change in changes:
        resp = requests.patch(
            f"{BASE_URL}/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"updates": change}
        )
        results.append(resp.status_code == 200)
        wait_cache_ttl()
    
    # 14b) Get settings and check history
    log("14b) Checking history array")
    resp = requests.get(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if resp.status_code == 200:
        data = resp.json()
        history = data.get("history", [])
        
        # Check history has entries
        if len(history) >= 1:
            log(f"✅ History has {len(history)} entries")
            results.append(True)
        else:
            log("❌ History is empty")
            results.append(False)
        
        # Check history is newest first
        if len(history) >= 2:
            first_time = history[0].get("at", "")
            last_time = history[-1].get("at", "")
            if first_time >= last_time:
                log("✅ History is ordered newest first")
                results.append(True)
            else:
                log("❌ History is not ordered correctly")
                results.append(False)
        
        # Check history entries have required fields
        if len(history) >= 1:
            entry = history[0]
            required_fields = ["key", "from", "to", "actor_id", "actor_username", "at"]
            has_all = all(f in entry for f in required_fields)
            if has_all:
                log(f"✅ History entries have all required fields")
                results.append(True)
            else:
                missing = [f for f in required_fields if f not in entry]
                log(f"❌ History entry missing fields: {missing}")
                results.append(False)
        
        # Check history is capped at ≤20
        if len(history) <= 20:
            log(f"✅ History capped at ≤20 entries (has {len(history)})")
            results.append(True)
        else:
            log(f"❌ History has {len(history)} entries (should be ≤20)")
            results.append(False)
    else:
        log(f"❌ Failed to get settings: {resp.status_code}")
        results.append(False)
    
    # Reset all
    reset_all_settings()
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 14 Results: {passed}/{total} passed")
    return all(results)

def test_15_audit_log():
    """Test 15: Audit log"""
    log("\n" + "="*60)
    log("TEST 15: Audit Log")
    log("="*60)
    
    results = []
    
    # 15a) Make a settings update
    log("15a) Making a settings update")
    resp = requests.patch(
        f"{BASE_URL}/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"updates": {"max_post_chars": 480}}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 15b) Make a settings reset
    log("15b) Making a settings reset")
    resp = requests.post(
        f"{BASE_URL}/admin/settings/reset",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"key": "max_post_chars"}
    )
    results.append(resp.status_code == 200)
    wait_cache_ttl()
    
    # 15c) Check audit log
    log("15c) Checking audit log for settings.update and settings.reset")
    resp = requests.get(
        f"{BASE_URL}/admin/audit",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if resp.status_code == 200:
        data = resp.json()
        items = data.get("items", [])
        
        # Look for settings.update action
        update_found = any(item.get("action") == "settings.update" for item in items)
        if update_found:
            log("✅ Found settings.update in audit log")
            results.append(True)
        else:
            log("❌ settings.update not found in audit log")
            results.append(False)
        
        # Look for settings.reset action
        reset_found = any(item.get("action") == "settings.reset" for item in items)
        if reset_found:
            log("✅ Found settings.reset in audit log")
            results.append(True)
        else:
            log("❌ settings.reset not found in audit log")
            results.append(False)
    else:
        log(f"❌ Failed to get audit log: {resp.status_code}")
        results.append(False)
        results.append(False)
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 15 Results: {passed}/{total} passed")
    return all(results)

def test_16_sanity_check():
    """Test 16: Sanity check with all defaults"""
    log("\n" + "="*60)
    log("TEST 16: Sanity Check with All Defaults")
    log("="*60)
    
    results = []
    
    # Ensure all settings are at defaults
    reset_all_settings()
    
    # 16a) Create post
    log("16a) Creating post with all defaults")
    post_id, resp = create_post(user_a_token, "Sanity check post")
    results.append(resp.status_code in [200, 201])
    
    # 16b) Comment on post
    log("16b) Commenting on post")
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/comments",
        headers={"Authorization": f"Bearer {user_b_token}"},
        json={"content": "Sanity check comment"}
    )
    results.append(resp.status_code in [200, 201])
    
    # 16c) Send DM
    log("16c) Sending DM")
    resp = requests.post(
        f"{BASE_URL}/messages",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"to_user_id": user_b_id, "content": "Sanity check DM"}
    )
    results.append(resp.status_code in [200, 201])
    
    # 16d) Create story
    log("16d) Creating story")
    resp = requests.post(
        f"{BASE_URL}/stories",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"media_type": "text", "text_content": "Sanity check story", "background": "fado"}
    )
    results.append(resp.status_code in [200, 201])
    
    # 16e) React to post
    log("16e) Reacting to post")
    resp = requests.post(
        f"{BASE_URL}/posts/{post_id}/react",
        headers={"Authorization": f"Bearer {user_b_token}"},
        json={"emoji": "saudade"}
    )
    results.append(resp.status_code in [200, 201])
    
    # 16f) Follow user
    log("16f) Following user")
    resp = requests.post(
        f"{BASE_URL}/users/usera/follow",
        headers={"Authorization": f"Bearer {user_b_token}"}
    )
    results.append(resp.status_code in [200, 201])
    
    # 16g) GET /trending
    log("16g) GET /trending")
    resp = requests.get(f"{BASE_URL}/trending")
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            log(f"✅ Trending returns list (length={len(data)})")
            results.append(True)
        else:
            log(f"❌ Trending didn't return list")
            results.append(False)
    else:
        log(f"❌ Trending failed: {resp.status_code}")
        results.append(False)
    
    passed = sum(results)
    total = len(results)
    log(f"\n📊 Test 16 Results: {passed}/{total} passed")
    return all(results)

# ============================================================
# MAIN TEST RUNNER
# ============================================================

def main():
    global admin_token, user_a_token, user_b_token, user_a_id, user_b_id
    
    log("="*60)
    log("ADMIN PANEL GRUPO A: FEATURE FLAGS + LIMITES GLOBAIS")
    log("Comprehensive Test Suite")
    log("="*60)
    
    # Setup: Login admin
    log("\n🔐 Logging in as admin...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code != 200:
        log(f"❌ Admin login failed: {resp.status_code} - {resp.text}")
        return
    
    data = resp.json()
    admin_token = data.get("token") or data.get("access_token")
    log(f"✅ Admin logged in successfully")
    
    # Setup: Create test users
    log("\n👥 Creating test users...")
    timestamp = int(time.time())
    
    result = register_user(
        f"usera_{timestamp}@test.com",
        "TestPass123!",
        f"usera",
        "User A"
    )
    if result:
        user_a_token, user_a_id = result
    else:
        log("❌ Failed to create User A")
        return
    
    result = register_user(
        f"userb_{timestamp}@test.com",
        "TestPass123!",
        f"userb",
        "User B"
    )
    if result:
        user_b_token, user_b_id = result
    else:
        log("❌ Failed to create User B")
        return
    
    log(f"✅ Test users created: usera (ID: {user_a_id}), userb (ID: {user_b_id})")
    
    # Reset all settings to defaults before starting
    log("\n🔄 Resetting all settings to defaults before tests...")
    reset_all_settings()
    
    # Run all tests
    test_results = {}
    
    test_results["Test 1: Auth & Shape"] = test_1_auth_and_shape()
    test_results["Test 2: PATCH Validation"] = test_2_patch_validation()
    test_results["Test 3: signup_open"] = test_3_signup_open()
    test_results["Test 4: comments_enabled + max_comment_chars"] = test_4_comments_enabled_and_max_chars()
    test_results["Test 5: dm_enabled + max_dm_chars"] = test_5_dm_enabled_and_max_chars()
    test_results["Test 6: Other Flags + Bypass"] = test_6_other_flags_and_bypass()
    test_results["Test 7: posts_enabled + Limits"] = test_7_posts_enabled_and_limits()
    test_results["Test 8: trending_enabled"] = test_8_trending_enabled()
    test_results["Test 9: read_only_mode"] = test_9_read_only_mode()
    test_results["Test 10: max_posts_per_hour"] = test_10_max_posts_per_hour()
    test_results["Test 11: max_comments_per_hour"] = test_11_max_comments_per_hour()
    test_results["Test 12: max_dms_per_hour"] = test_12_max_dms_per_hour()
    test_results["Test 13: Reset Endpoints"] = test_13_reset_endpoints()
    test_results["Test 14: History"] = test_14_history()
    test_results["Test 15: Audit Log"] = test_15_audit_log()
    test_results["Test 16: Sanity Check"] = test_16_sanity_check()
    
    # Final summary
    log("\n" + "="*60)
    log("FINAL SUMMARY")
    log("="*60)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        log(f"{status} - {test_name}")
    
    log("\n" + "="*60)
    log(f"OVERALL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    log("="*60)
    
    if passed == total:
        log("\n🎉 ALL TESTS PASSED! Admin Panel Grupo A is working correctly.")
    else:
        log(f"\n⚠️ {total - passed} test(s) failed. Review the logs above for details.")

if __name__ == "__main__":
    main()
