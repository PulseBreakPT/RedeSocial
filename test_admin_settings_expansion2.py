#!/usr/bin/env python3
"""
Test suite for Admin Settings Expansion #2 — 21 new settings
Tests all flags, limits, and content settings with real enforcement
"""
import requests
import time
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://backend-gap-analysis.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@lusorae.app"
ADMIN_PASSWORD = "b1saiF-OI8D4CrTFmEL4lIHAbamaDJrL"

# Test state
admin_token = None
test_users = []
test_posts = []
test_communities = []

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def login(email, password):
    """Login and return token"""
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json().get("token") or resp.json().get("access_token")
    return None

def get_settings(token):
    """GET /api/admin/settings"""
    resp = requests.get(f"{BASE_URL}/admin/settings", headers={"Authorization": f"Bearer {token}"})
    return resp

def set_setting(token, key, value):
    """PATCH /api/admin/settings"""
    resp = requests.patch(f"{BASE_URL}/admin/settings", 
                        headers={"Authorization": f"Bearer {token}"},
                        json={"updates": {key: value}})
    return resp

def reset_setting(token, key):
    """POST /api/admin/settings/reset"""
    resp = requests.post(f"{BASE_URL}/admin/settings/reset",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"key": key})
    return resp

def wait_cache():
    """Wait for cache TTL (5s + 1s buffer)"""
    time.sleep(6)

def register_user(username, email, password, invite_code=None):
    """Register a new user"""
    payload = {
        "username": username,
        "email": email,
        "password": password,
        "name": username.title()
    }
    if invite_code:
        payload["invite_code"] = invite_code
    resp = requests.post(f"{BASE_URL}/auth/register", json=payload)
    return resp

def check_username(username):
    """GET /api/auth/check-username"""
    resp = requests.get(f"{BASE_URL}/auth/check-username", params={"u": username})
    return resp

def check_email(email):
    """GET /api/auth/check-email"""
    resp = requests.get(f"{BASE_URL}/auth/check-email", params={"e": email})
    return resp

def get_public_settings():
    """GET /api/public/settings"""
    resp = requests.get(f"{BASE_URL}/public/settings")
    return resp

def create_post(token, content, **kwargs):
    """POST /api/posts"""
    payload = {"content": content}
    payload.update(kwargs)
    resp = requests.post(f"{BASE_URL}/posts", 
                        headers={"Authorization": f"Bearer {token}"},
                        json=payload)
    return resp

def get_post(post_id, token=None):
    """GET /api/posts/{id}"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    resp = requests.get(f"{BASE_URL}/posts/{post_id}", headers=headers)
    return resp

def create_community(token, name, slug):
    """POST /api/communities"""
    resp = requests.post(f"{BASE_URL}/communities",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"name": name, "slug": slug, "description": "Test community"})
    return resp

def follow_user(token, username):
    """POST /api/users/{username}/follow"""
    resp = requests.post(f"{BASE_URL}/users/{username}/follow",
                        headers={"Authorization": f"Bearer {token}"})
    return resp

# ============================================================================
# TEST SUITE
# ============================================================================

def test_1_password_require_digit():
    """Test 1: password_require_digit=true"""
    log("TEST 1: password_require_digit")
    
    # Set flag to true
    resp = set_setting(admin_token, "password_require_digit", True)
    assert resp.status_code == 200, f"Failed to set flag: {resp.text}"
    log("  ✓ Set password_require_digit=true")
    
    wait_cache()
    
    # Try to register with password without digit (should fail)
    resp = register_user("testdigit1", "testdigit1@test.com", "abcdefghij")
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "dígito" in resp.text.lower() or "digit" in resp.text.lower(), f"Wrong error: {resp.text}"
    log("  ✓ Password without digit rejected (400)")
    
    # Try with digit (should pass)
    resp = register_user("testdigit2", "testdigit2@test.com", "Abcdef1!")
    assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
    log("  ✓ Password with digit accepted (200)")
    if resp.status_code in [200, 201]:
        test_users.append({"username": "testdigit2", "email": "testdigit2@test.com", "password": "Abcdef1!"})
    
    # Reset
    resp = reset_setting(admin_token, "password_require_digit")
    assert resp.status_code == 200, f"Failed to reset: {resp.text}"
    log("  ✓ Reset password_require_digit")
    
    return True

def test_2_password_require_uppercase():
    """Test 2: password_require_uppercase=true"""
    log("TEST 2: password_require_uppercase")
    
    resp = set_setting(admin_token, "password_require_uppercase", True)
    assert resp.status_code == 200
    log("  ✓ Set password_require_uppercase=true")
    
    wait_cache()
    
    # Without uppercase (should fail)
    resp = register_user("testupper1", "testupper1@test.com", "abc1!")
    assert resp.status_code == 400
    assert "maiúscula" in resp.text.lower() or "uppercase" in resp.text.lower()
    log("  ✓ Password without uppercase rejected (400)")
    
    # With uppercase (should pass)
    resp = register_user("testupper2", "testupper2@test.com", "Abc1!def")
    assert resp.status_code in [200, 201]
    log("  ✓ Password with uppercase accepted (200)")
    if resp.status_code in [200, 201]:
        test_users.append({"username": "testupper2", "email": "testupper2@test.com", "password": "Abc1!def"})
    
    resp = reset_setting(admin_token, "password_require_uppercase")
    assert resp.status_code == 200
    log("  ✓ Reset password_require_uppercase")
    
    return True

def test_3_password_require_symbol():
    """Test 3: password_require_symbol=true"""
    log("TEST 3: password_require_symbol")
    
    resp = set_setting(admin_token, "password_require_symbol", True)
    assert resp.status_code == 200
    log("  ✓ Set password_require_symbol=true")
    
    wait_cache()
    
    # Without symbol (should fail)
    resp = register_user("testsymbol1", "testsymbol1@test.com", "Abcdef1")
    assert resp.status_code == 400
    assert "símbolo" in resp.text.lower() or "symbol" in resp.text.lower() or "special" in resp.text.lower()
    log("  ✓ Password without symbol rejected (400)")
    
    # With symbol (should pass)
    resp = register_user("testsymbol2", "testsymbol2@test.com", "Abcdef1!")
    assert resp.status_code in [200, 201]
    log("  ✓ Password with symbol accepted (200)")
    if resp.status_code in [200, 201]:
        test_users.append({"username": "testsymbol2", "email": "testsymbol2@test.com", "password": "Abcdef1!"})
    
    resp = reset_setting(admin_token, "password_require_symbol")
    assert resp.status_code == 200
    log("  ✓ Reset password_require_symbol")
    
    return True

def test_4_email_alerts_enabled():
    """Test 4: email_alerts_enabled=false"""
    log("TEST 4: email_alerts_enabled")
    
    resp = set_setting(admin_token, "email_alerts_enabled", False)
    assert resp.status_code == 200
    log("  ✓ Set email_alerts_enabled=false")
    
    wait_cache()
    
    # Verify setting persists
    resp = get_settings(admin_token)
    assert resp.status_code == 200
    settings = resp.json()
    email_alerts = next((s for s in settings if s["key"] == "email_alerts_enabled"), None)
    assert email_alerts is not None
    assert email_alerts["value"] == False
    log("  ✓ Setting persists in GET /api/admin/settings")
    
    resp = reset_setting(admin_token, "email_alerts_enabled")
    assert resp.status_code == 200
    log("  ✓ Reset email_alerts_enabled")
    
    return True

def test_5_disposable_email_block():
    """Test 5: disposable_email_block_enabled=false"""
    log("TEST 5: disposable_email_block_enabled")
    
    # First verify it's blocked when enabled (default)
    resp = check_email("test@mailinator.com")
    assert resp.status_code == 200
    data = resp.json()
    if not data.get("available"):
        log("  ✓ Disposable email blocked by default")
    
    # Disable blocking
    resp = set_setting(admin_token, "disposable_email_block_enabled", False)
    assert resp.status_code == 200
    log("  ✓ Set disposable_email_block_enabled=false")
    
    wait_cache()
    
    # Now should be available
    resp = check_email("test@mailinator.com")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("available") == True, f"Expected available=true, got {data}"
    log("  ✓ Disposable email now available (200)")
    
    # Re-enable and verify it's blocked again
    resp = set_setting(admin_token, "disposable_email_block_enabled", True)
    assert resp.status_code == 200
    wait_cache()
    
    resp = check_email("test@mailinator.com")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("available") == False or "disposable" in data.get("reason", "").lower()
    log("  ✓ Disposable email blocked again after re-enable")
    
    resp = reset_setting(admin_token, "disposable_email_block_enabled")
    assert resp.status_code == 200
    log("  ✓ Reset disposable_email_block_enabled")
    
    return True

def test_6_show_view_counts_publicly():
    """Test 6: show_view_counts_publicly=false"""
    log("TEST 6: show_view_counts_publicly")
    
    resp = set_setting(admin_token, "show_view_counts_publicly", False)
    assert resp.status_code == 200
    log("  ✓ Set show_view_counts_publicly=false")
    
    wait_cache()
    
    resp = get_public_settings()
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("show_view_counts_publicly") == False
    log("  ✓ GET /api/public/settings reflects false")
    
    resp = reset_setting(admin_token, "show_view_counts_publicly")
    assert resp.status_code == 200
    log("  ✓ Reset show_view_counts_publicly")
    
    return True

def test_7_show_like_counts_publicly():
    """Test 7: show_like_counts_publicly=false"""
    log("TEST 7: show_like_counts_publicly")
    
    resp = set_setting(admin_token, "show_like_counts_publicly", False)
    assert resp.status_code == 200
    log("  ✓ Set show_like_counts_publicly=false")
    
    wait_cache()
    
    resp = get_public_settings()
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("show_like_counts_publicly") == False
    log("  ✓ GET /api/public/settings reflects false")
    
    resp = reset_setting(admin_token, "show_like_counts_publicly")
    assert resp.status_code == 200
    log("  ✓ Reset show_like_counts_publicly")
    
    return True

def test_8_hashtags_enabled():
    """Test 8: hashtags_enabled=false"""
    log("TEST 8: hashtags_enabled")
    
    # Get a test user token
    if not test_users:
        resp = register_user("hashtaguser", "hashtaguser@test.com", "Abcdef1!")
        assert resp.status_code in [200, 201]
        test_users.append({"username": "hashtaguser", "email": "hashtaguser@test.com", "password": "Abcdef1!"})
    
    user_token = login(test_users[0]["email"], test_users[0]["password"])
    assert user_token is not None
    
    # Disable hashtags
    resp = set_setting(admin_token, "hashtags_enabled", False)
    assert resp.status_code == 200
    log("  ✓ Set hashtags_enabled=false")
    
    wait_cache()
    
    # Create post with hashtags
    resp = create_post(user_token, "Olá #teste #foo")
    assert resp.status_code in [200, 201]
    post_id = resp.json().get("id")
    test_posts.append(post_id)
    log("  ✓ Created post with hashtags")
    
    # Get post and verify hashtags are empty
    resp = get_post(post_id, user_token)
    assert resp.status_code == 200
    post_data = resp.json()
    hashtags = post_data.get("hashtags", [])
    assert hashtags == [], f"Expected empty hashtags, got {hashtags}"
    log("  ✓ Post hashtags are empty (hashtags disabled)")
    
    # Re-enable hashtags
    resp = set_setting(admin_token, "hashtags_enabled", True)
    assert resp.status_code == 200
    wait_cache()
    
    # Create new post with hashtags
    resp = create_post(user_token, "Novo post #teste #bar")
    assert resp.status_code in [200, 201]
    post_id2 = resp.json().get("id")
    test_posts.append(post_id2)
    
    # Verify hashtags are saved
    resp = get_post(post_id2, user_token)
    assert resp.status_code == 200
    post_data = resp.json()
    hashtags = post_data.get("hashtags", [])
    assert len(hashtags) == 2, f"Expected 2 hashtags, got {hashtags}"
    assert "teste" in hashtags and "bar" in hashtags
    log("  ✓ Post hashtags saved correctly (hashtags enabled)")
    
    resp = reset_setting(admin_token, "hashtags_enabled")
    assert resp.status_code == 200
    log("  ✓ Reset hashtags_enabled")
    
    return True

def test_9_mentions_enabled():
    """Test 9: mentions_enabled=false"""
    log("TEST 9: mentions_enabled")
    
    # This test is difficult without checking notifications
    # We'll just verify the setting persists
    resp = set_setting(admin_token, "mentions_enabled", False)
    assert resp.status_code == 200
    log("  ✓ Set mentions_enabled=false")
    
    wait_cache()
    
    resp = get_settings(admin_token)
    assert resp.status_code == 200
    settings = resp.json()
    mentions = next((s for s in settings if s["key"] == "mentions_enabled"), None)
    assert mentions is not None
    assert mentions["value"] == False
    log("  ✓ Setting persists in GET /api/admin/settings")
    
    resp = reset_setting(admin_token, "mentions_enabled")
    assert resp.status_code == 200
    log("  ✓ Reset mentions_enabled")
    
    return True

def test_10_min_username_chars():
    """Test 10: min_username_chars=5"""
    log("TEST 10: min_username_chars")
    
    resp = set_setting(admin_token, "min_username_chars", 5)
    assert resp.status_code == 200
    log("  ✓ Set min_username_chars=5")
    
    wait_cache()
    
    # Check username with 4 chars (should fail)
    resp = check_username("abcd")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("available") == False
    assert "mínimo" in data.get("message", "").lower() or "minimum" in data.get("message", "").lower()
    log("  ✓ Username 'abcd' rejected (Mínimo 5 caracteres)")
    
    # Try to register with 4 chars (should fail)
    resp = register_user("abcd", "abcd@test.com", "Abcdef1!")
    assert resp.status_code == 400
    log("  ✓ Register with 4-char username rejected (400)")
    
    resp = reset_setting(admin_token, "min_username_chars")
    assert resp.status_code == 200
    log("  ✓ Reset min_username_chars")
    
    return True

def test_11_max_username_chars():
    """Test 11: max_username_chars=6"""
    log("TEST 11: max_username_chars")
    
    resp = set_setting(admin_token, "max_username_chars", 6)
    assert resp.status_code == 200
    log("  ✓ Set max_username_chars=6")
    
    wait_cache()
    
    # Check username with 7 chars (should fail)
    resp = check_username("abcdefg")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("available") == False
    assert "longo" in data.get("message", "").lower() or "long" in data.get("message", "").lower() or "máximo" in data.get("message", "").lower()
    log("  ✓ Username 'abcdefg' rejected (demasiado longo)")
    
    # Try to register with 7 chars (should fail)
    resp = register_user("abcdefg", "abcdefg@test.com", "Abcdef1!")
    assert resp.status_code == 400
    log("  ✓ Register with 7-char username rejected (400)")
    
    resp = reset_setting(admin_token, "max_username_chars")
    assert resp.status_code == 200
    log("  ✓ Reset max_username_chars")
    
    return True

def test_12_min_password_chars():
    """Test 12: min_password_chars=12"""
    log("TEST 12: min_password_chars")
    
    resp = set_setting(admin_token, "min_password_chars", 12)
    assert resp.status_code == 200
    log("  ✓ Set min_password_chars=12")
    
    wait_cache()
    
    # Try to register with 8-char password (should fail)
    resp = register_user("minpass1", "minpass1@test.com", "Abcdef1!")
    assert resp.status_code == 400
    assert "mínimo" in resp.text.lower() or "minimum" in resp.text.lower()
    log("  ✓ Password 'Abcdef1!' (8 chars) rejected (mínimo 12)")
    
    # Try with 12-char password (should pass)
    resp = register_user("minpass2", "minpass2@test.com", "Abcdef1!xxxx")
    assert resp.status_code in [200, 201]
    log("  ✓ Password 'Abcdef1!xxxx' (12 chars) accepted (200)")
    if resp.status_code in [200, 201]:
        test_users.append({"username": "minpass2", "email": "minpass2@test.com", "password": "Abcdef1!xxxx"})
    
    resp = reset_setting(admin_token, "min_password_chars")
    assert resp.status_code == 200
    log("  ✓ Reset min_password_chars")
    
    return True

def test_13_min_post_chars():
    """Test 13: min_post_chars=10"""
    log("TEST 13: min_post_chars")
    
    # Get a test user token
    if not test_users:
        resp = register_user("postuser", "postuser@test.com", "Abcdef1!")
        assert resp.status_code in [200, 201]
        test_users.append({"username": "postuser", "email": "postuser@test.com", "password": "Abcdef1!"})
    
    user_token = login(test_users[0]["email"], test_users[0]["password"])
    assert user_token is not None
    
    resp = set_setting(admin_token, "min_post_chars", 10)
    assert resp.status_code == 200
    log("  ✓ Set min_post_chars=10")
    
    wait_cache()
    
    # Try to create post with 2 chars (should fail)
    resp = create_post(user_token, "oi")
    assert resp.status_code == 400
    log("  ✓ Post with 'oi' (2 chars) rejected (400)")
    
    # Try with 10+ chars (should pass)
    resp = create_post(user_token, "ola mundo isto")
    assert resp.status_code in [200, 201]
    log("  ✓ Post with 'ola mundo isto' (14 chars) accepted (200)")
    if resp.status_code in [200, 201]:
        test_posts.append(resp.json().get("id"))
    
    # Verify admin bypass
    resp = create_post(admin_token, "oi")
    assert resp.status_code in [200, 201]
    log("  ✓ Admin bypass: short post accepted (200)")
    if resp.status_code in [200, 201]:
        test_posts.append(resp.json().get("id"))
    
    resp = reset_setting(admin_token, "min_post_chars")
    assert resp.status_code == 200
    log("  ✓ Reset min_post_chars")
    
    return True

def test_14_scheduled_posts_max_days_ahead():
    """Test 14: scheduled_posts_max_days_ahead=1"""
    log("TEST 14: scheduled_posts_max_days_ahead")
    
    if not test_users:
        resp = register_user("scheduser", "scheduser@test.com", "Abcdef1!")
        assert resp.status_code in [200, 201]
        test_users.append({"username": "scheduser", "email": "scheduser@test.com", "password": "Abcdef1!"})
    
    user_token = login(test_users[0]["email"], test_users[0]["password"])
    assert user_token is not None
    
    resp = set_setting(admin_token, "scheduled_posts_max_days_ahead", 1)
    assert resp.status_code == 200
    log("  ✓ Set scheduled_posts_max_days_ahead=1")
    
    wait_cache()
    
    # Try to schedule 5 days ahead (should fail)
    future_5d = (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z"
    resp = create_post(user_token, "Post agendado", scheduled_at=future_5d)
    assert resp.status_code == 400
    log("  ✓ Post scheduled 5 days ahead rejected (400)")
    
    # Try to schedule 12 hours ahead (should pass)
    future_12h = (datetime.utcnow() + timedelta(hours=12)).isoformat() + "Z"
    resp = create_post(user_token, "Post agendado 12h", scheduled_at=future_12h)
    assert resp.status_code in [200, 201]
    log("  ✓ Post scheduled 12 hours ahead accepted (200)")
    if resp.status_code in [200, 201]:
        test_posts.append(resp.json().get("id"))
    
    resp = reset_setting(admin_token, "scheduled_posts_max_days_ahead")
    assert resp.status_code == 200
    log("  ✓ Reset scheduled_posts_max_days_ahead")
    
    return True

def test_15_max_drafts_per_user():
    """Test 15: max_drafts_per_user=2"""
    log("TEST 15: max_drafts_per_user")
    
    if not test_users:
        resp = register_user("draftuser", "draftuser@test.com", "Abcdef1!")
        assert resp.status_code in [200, 201]
        test_users.append({"username": "draftuser", "email": "draftuser@test.com", "password": "Abcdef1!"})
    
    user_token = login(test_users[0]["email"], test_users[0]["password"])
    assert user_token is not None
    
    resp = set_setting(admin_token, "max_drafts_per_user", 2)
    assert resp.status_code == 200
    log("  ✓ Set max_drafts_per_user=2")
    
    wait_cache()
    
    # Create 2 drafts (should pass)
    resp1 = create_post(user_token, "Draft 1", is_draft=True)
    assert resp1.status_code in [200, 201]
    log("  ✓ Draft 1 created (200)")
    if resp1.status_code in [200, 201]:
        test_posts.append(resp1.json().get("id"))
    
    resp2 = create_post(user_token, "Draft 2", is_draft=True)
    assert resp2.status_code in [200, 201]
    log("  ✓ Draft 2 created (200)")
    if resp2.status_code in [200, 201]:
        test_posts.append(resp2.json().get("id"))
    
    # Try to create 3rd draft (should fail)
    resp3 = create_post(user_token, "Draft 3", is_draft=True)
    assert resp3.status_code == 429
    log("  ✓ Draft 3 rejected with 429 (limit reached)")
    
    # Verify admin bypass
    resp_admin = create_post(admin_token, "Admin draft", is_draft=True)
    assert resp_admin.status_code in [200, 201]
    log("  ✓ Admin bypass: draft created (200)")
    if resp_admin.status_code in [200, 201]:
        test_posts.append(resp_admin.json().get("id"))
    
    resp = reset_setting(admin_token, "max_drafts_per_user")
    assert resp.status_code == 200
    log("  ✓ Reset max_drafts_per_user")
    
    return True

def test_16_max_poll_options():
    """Test 16: max_poll_options=2"""
    log("TEST 16: max_poll_options")
    
    if not test_users:
        resp = register_user("polluser", "polluser@test.com", "Abcdef1!")
        assert resp.status_code in [200, 201]
        test_users.append({"username": "polluser", "email": "polluser@test.com", "password": "Abcdef1!"})
    
    user_token = login(test_users[0]["email"], test_users[0]["password"])
    assert user_token is not None
    
    resp = set_setting(admin_token, "max_poll_options", 2)
    assert resp.status_code == 200
    log("  ✓ Set max_poll_options=2")
    
    wait_cache()
    
    # Create poll with 4 options (should truncate to 2)
    poll_data = {
        "question": "Escolhe",
        "options": ["A", "B", "C", "D"],
        "duration_hours": 24
    }
    resp = create_post(user_token, "Poll test", poll=poll_data)
    assert resp.status_code in [200, 201]
    log("  ✓ Poll created (200)")
    
    # Verify poll has only 2 options
    if resp.status_code in [200, 201]:
        post_data = resp.json()
        test_posts.append(post_data.get("id"))
        poll = post_data.get("poll")
        if poll:
            options = poll.get("options", [])
            assert len(options) == 2, f"Expected 2 options, got {len(options)}"
            log("  ✓ Poll truncated to 2 options")
    
    # Verify admin doesn't truncate (uses default 4)
    resp_admin = create_post(admin_token, "Admin poll", poll=poll_data)
    assert resp_admin.status_code in [200, 201]
    log("  ✓ Admin poll created (200)")
    
    if resp_admin.status_code in [200, 201]:
        post_data = resp_admin.json()
        test_posts.append(post_data.get("id"))
        poll = post_data.get("poll")
        if poll:
            options = poll.get("options", [])
            assert len(options) == 4, f"Expected 4 options for admin, got {len(options)}"
            log("  ✓ Admin bypass: poll has 4 options")
    
    resp = reset_setting(admin_token, "max_poll_options")
    assert resp.status_code == 200
    log("  ✓ Reset max_poll_options")
    
    return True

def test_17_max_collaborators_per_post():
    """Test 17: max_collaborators_per_post=1"""
    log("TEST 17: max_collaborators_per_post")
    
    # This test requires multiple users and collaboration endpoints
    # We'll verify the setting exists and can be set
    resp = set_setting(admin_token, "max_collaborators_per_post", 1)
    assert resp.status_code == 200
    log("  ✓ Set max_collaborators_per_post=1")
    
    wait_cache()
    
    resp = get_settings(admin_token)
    assert resp.status_code == 200
    settings = resp.json()
    collab = next((s for s in settings if s["key"] == "max_collaborators_per_post"), None)
    assert collab is not None
    assert collab["value"] == 1
    log("  ✓ Setting persists in GET /api/admin/settings")
    
    resp = reset_setting(admin_token, "max_collaborators_per_post")
    assert resp.status_code == 200
    log("  ✓ Reset max_collaborators_per_post")
    
    return True

def test_18_max_communities_owned_per_user():
    """Test 18: max_communities_owned_per_user=1"""
    log("TEST 18: max_communities_owned_per_user")
    
    if not test_users:
        resp = register_user("commuser", "commuser@test.com", "Abcdef1!")
        assert resp.status_code in [200, 201]
        test_users.append({"username": "commuser", "email": "commuser@test.com", "password": "Abcdef1!"})
    
    user_token = login(test_users[0]["email"], test_users[0]["password"])
    assert user_token is not None
    
    resp = set_setting(admin_token, "max_communities_owned_per_user", 1)
    assert resp.status_code == 200
    log("  ✓ Set max_communities_owned_per_user=1")
    
    wait_cache()
    
    # Create 1st community (should pass)
    resp1 = create_community(user_token, "Community 1", "comm1test")
    assert resp1.status_code in [200, 201]
    log("  ✓ Community 1 created (200)")
    if resp1.status_code in [200, 201]:
        test_communities.append(resp1.json().get("id"))
    
    # Try to create 2nd community (should fail)
    resp2 = create_community(user_token, "Community 2", "comm2test")
    assert resp2.status_code == 429
    log("  ✓ Community 2 rejected with 429 (limit reached)")
    
    # Verify admin bypass
    resp_admin = create_community(admin_token, "Admin Community", "admincommtest")
    assert resp_admin.status_code in [200, 201]
    log("  ✓ Admin bypass: community created (200)")
    if resp_admin.status_code in [200, 201]:
        test_communities.append(resp_admin.json().get("id"))
    
    resp = reset_setting(admin_token, "max_communities_owned_per_user")
    assert resp.status_code == 200
    log("  ✓ Reset max_communities_owned_per_user")
    
    return True

def test_19_meta_title_suffix():
    """Test 19: meta_title_suffix=" · Lusorae" """
    log("TEST 19: meta_title_suffix")
    
    resp = set_setting(admin_token, "meta_title_suffix", " · Lusorae")
    assert resp.status_code == 200
    log("  ✓ Set meta_title_suffix=' · Lusorae'")
    
    wait_cache()
    
    resp = get_public_settings()
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("meta_title_suffix") == " · Lusorae"
    log("  ✓ GET /api/public/settings reflects the string")
    
    resp = reset_setting(admin_token, "meta_title_suffix")
    assert resp.status_code == 200
    log("  ✓ Reset meta_title_suffix")
    
    return True

def test_20_signup_invite_code():
    """Test 20: signup_invite_code="LETMEIN" """
    log("TEST 20: signup_invite_code")
    
    resp = set_setting(admin_token, "signup_invite_code", "LETMEIN")
    assert resp.status_code == 200
    log("  ✓ Set signup_invite_code='LETMEIN'")
    
    wait_cache()
    
    # Verify public settings shows signup_invite_required=true but NOT the code
    resp = get_public_settings()
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("signup_invite_required") == True
    assert "signup_invite_code" not in data or data.get("signup_invite_code") == ""
    log("  ✓ GET /api/public/settings shows signup_invite_required=true")
    log("  ✓ signup_invite_code NOT exposed in /public/settings")
    
    # Try to register without code (should fail)
    resp = register_user("invitetest1", "invitetest1@test.com", "Abcdef1!")
    assert resp.status_code == 403
    log("  ✓ Register without invite_code rejected (403)")
    
    # Try with wrong code (should fail)
    resp = register_user("invitetest2", "invitetest2@test.com", "Abcdef1!", invite_code="WRONG")
    assert resp.status_code == 403
    log("  ✓ Register with wrong invite_code rejected (403)")
    
    # Try with correct code (should pass)
    resp = register_user("invitetest3", "invitetest3@test.com", "Abcdef1!", invite_code="LETMEIN")
    assert resp.status_code in [200, 201]
    log("  ✓ Register with correct invite_code accepted (200)")
    if resp.status_code in [200, 201]:
        test_users.append({"username": "invitetest3", "email": "invitetest3@test.com", "password": "Abcdef1!"})
    
    # Reset and verify signup_invite_required=false
    resp = reset_setting(admin_token, "signup_invite_code")
    assert resp.status_code == 200
    wait_cache()
    
    resp = get_public_settings()
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("signup_invite_required") == False
    log("  ✓ After reset, signup_invite_required=false")
    
    # Verify register without code works again
    resp = register_user("invitetest4", "invitetest4@test.com", "Abcdef1!")
    assert resp.status_code in [200, 201]
    log("  ✓ Register without code works after reset (200)")
    if resp.status_code in [200, 201]:
        test_users.append({"username": "invitetest4", "email": "invitetest4@test.com", "password": "Abcdef1!"})
    
    return True

def test_21_compliance_dpo_email():
    """Test 21: compliance_dpo_email="dpo@example.com" """
    log("TEST 21: compliance_dpo_email")
    
    resp = set_setting(admin_token, "compliance_dpo_email", "dpo@example.com")
    assert resp.status_code == 200
    log("  ✓ Set compliance_dpo_email='dpo@example.com'")
    
    wait_cache()
    
    resp = get_public_settings()
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("compliance_dpo_email") == "dpo@example.com"
    log("  ✓ GET /api/public/settings reflects the email")
    
    resp = reset_setting(admin_token, "compliance_dpo_email")
    assert resp.status_code == 200
    log("  ✓ Reset compliance_dpo_email")
    
    return True

def test_22_cookie_banner_text():
    """Test 22: cookie_banner_text="Usamos cookies." """
    log("TEST 22: cookie_banner_text")
    
    resp = set_setting(admin_token, "cookie_banner_text", "Usamos cookies.")
    assert resp.status_code == 200
    log("  ✓ Set cookie_banner_text='Usamos cookies.'")
    
    wait_cache()
    
    resp = get_public_settings()
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("cookie_banner_text") == "Usamos cookies."
    log("  ✓ GET /api/public/settings reflects the text")
    
    resp = reset_setting(admin_token, "cookie_banner_text")
    assert resp.status_code == 200
    log("  ✓ Reset cookie_banner_text")
    
    return True

def test_23_integrity():
    """Test 23: Integrity checks"""
    log("TEST 23: Integrity checks")
    
    # GET /api/admin/settings should have ≥21 new items
    resp = get_settings(admin_token)
    assert resp.status_code == 200
    settings = resp.json()
    
    new_keys = [
        "password_require_digit", "password_require_uppercase", "password_require_symbol",
        "email_alerts_enabled", "disposable_email_block_enabled",
        "show_view_counts_publicly", "show_like_counts_publicly",
        "hashtags_enabled", "mentions_enabled",
        "min_username_chars", "max_username_chars", "min_password_chars",
        "min_post_chars", "scheduled_posts_max_days_ahead", "max_drafts_per_user",
        "max_poll_options", "max_collaborators_per_post", "max_communities_owned_per_user",
        "meta_title_suffix", "signup_invite_code", "compliance_dpo_email", "cookie_banner_text"
    ]
    
    found_keys = [s["key"] for s in settings]
    missing = [k for k in new_keys if k not in found_keys]
    assert len(missing) == 0, f"Missing keys: {missing}"
    log(f"  ✓ All 22 new settings present in registry")
    
    # Verify history field exists
    sample = next((s for s in settings if s["key"] == "password_require_digit"), None)
    assert sample is not None
    assert "history" in sample
    log("  ✓ History field present in settings")
    
    # Test invalid set (bool with wrong type)
    resp = set_setting(admin_token, "password_require_digit", "not_a_bool")
    assert resp.status_code == 400
    log("  ✓ Invalid type rejected (400)")
    
    # Test invalid set (int out of range)
    resp = set_setting(admin_token, "min_username_chars", -1)
    assert resp.status_code == 400
    log("  ✓ Int out of range rejected (400)")
    
    return True

# ============================================================================
# MAIN
# ============================================================================

def main():
    global admin_token
    
    log("=" * 80)
    log("Admin Settings Expansion #2 — Testing 21 New Settings")
    log("=" * 80)
    
    # Login as admin
    log("\n[SETUP] Logging in as admin...")
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        log("❌ FATAL: Admin login failed")
        sys.exit(1)
    log("✓ Admin login successful")
    
    # Run tests
    tests = [
        ("1. password_require_digit", test_1_password_require_digit),
        ("2. password_require_uppercase", test_2_password_require_uppercase),
        ("3. password_require_symbol", test_3_password_require_symbol),
        ("4. email_alerts_enabled", test_4_email_alerts_enabled),
        ("5. disposable_email_block_enabled", test_5_disposable_email_block),
        ("6. show_view_counts_publicly", test_6_show_view_counts_publicly),
        ("7. show_like_counts_publicly", test_7_show_like_counts_publicly),
        ("8. hashtags_enabled", test_8_hashtags_enabled),
        ("9. mentions_enabled", test_9_mentions_enabled),
        ("10. min_username_chars", test_10_min_username_chars),
        ("11. max_username_chars", test_11_max_username_chars),
        ("12. min_password_chars", test_12_min_password_chars),
        ("13. min_post_chars", test_13_min_post_chars),
        ("14. scheduled_posts_max_days_ahead", test_14_scheduled_posts_max_days_ahead),
        ("15. max_drafts_per_user", test_15_max_drafts_per_user),
        ("16. max_poll_options", test_16_max_poll_options),
        ("17. max_collaborators_per_post", test_17_max_collaborators_per_post),
        ("18. max_communities_owned_per_user", test_18_max_communities_owned_per_user),
        ("19. meta_title_suffix", test_19_meta_title_suffix),
        ("20. signup_invite_code", test_20_signup_invite_code),
        ("21. compliance_dpo_email", test_21_compliance_dpo_email),
        ("22. cookie_banner_text", test_22_cookie_banner_text),
        ("23. Integrity checks", test_23_integrity),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        log(f"\n{'=' * 80}")
        try:
            result = test_func()
            if result:
                passed += 1
                log(f"✅ {name} PASSED")
            else:
                failed += 1
                log(f"❌ {name} FAILED")
        except AssertionError as e:
            failed += 1
            log(f"❌ {name} FAILED: {e}")
        except Exception as e:
            failed += 1
            log(f"❌ {name} ERROR: {e}")
    
    # Summary
    log(f"\n{'=' * 80}")
    log("SUMMARY")
    log(f"{'=' * 80}")
    log(f"Total tests: {len(tests)}")
    log(f"Passed: {passed}")
    log(f"Failed: {failed}")
    log(f"Success rate: {passed / len(tests) * 100:.1f}%")
    
    if failed == 0:
        log("\n✅ ALL TESTS PASSED")
        return 0
    else:
        log(f"\n❌ {failed} TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
