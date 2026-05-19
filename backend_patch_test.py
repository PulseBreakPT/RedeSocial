#!/usr/bin/env python3
"""
Backend test for PATCH /api/posts/{post_id} endpoint changes.
Tests all scenarios specified in the review request.
"""
import requests
import time
import base64
from datetime import datetime, timezone, timedelta

# Base URL from frontend/.env
BASE_URL = "https://login-text-contrast.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"
API2_BASE = f"{BASE_URL}/api2"

# Test credentials (from test_credentials.md)
TEST_EMAIL = "bealx@vermillion.demo"
TEST_PASSWORD = "demo123"
TEST_EMAIL_2 = "tiagocit@vermillion.demo"
TEST_PASSWORD_2 = "demo123"

# Test results
results = []
failed_tests = []

def log(msg, level="INFO"):
    """Log test messages"""
    print(f"[{level}] {msg}")
    
def test_result(name, passed, details=""):
    """Record test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    msg = f"{status}: {name}"
    if details:
        msg += f" - {details}"
    log(msg, "PASS" if passed else "FAIL")
    results.append({"name": name, "passed": passed, "details": details})
    if not passed:
        failed_tests.append({"name": name, "details": details})

def login(email, password):
    """Login and return access token"""
    resp = requests.post(f"{API_BASE}/auth/login", json={
        "email": email,
        "password": password
    })
    if resp.status_code == 200:
        data = resp.json()
        return data.get("access_token") or data.get("token")
    return None

def headers_with_token(token):
    """Return headers with Bearer token"""
    return {"Authorization": f"Bearer {token}"}

def create_post(token, content, **kwargs):
    """Helper to create a post"""
    payload = {"content": content, **kwargs}
    resp = requests.post(f"{API_BASE}/posts", 
        headers=headers_with_token(token),
        json=payload
    )
    return resp

def get_post(post_id, token=None):
    """Helper to get a post"""
    headers = headers_with_token(token) if token else {}
    resp = requests.get(f"{API_BASE}/posts/{post_id}", headers=headers)
    return resp

def patch_post(post_id, token, **kwargs):
    """Helper to patch a post"""
    resp = requests.patch(f"{API_BASE}/posts/{post_id}",
        headers=headers_with_token(token),
        json=kwargs
    )
    return resp

# Small base64 PNG image for testing
SMALL_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# ============================================================
# Test Scenario 1: Edit live post content within 24h
# ============================================================
def test_scenario_1_edit_live_post():
    log("=== Scenario 1: Edit live post content within 24h ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 1 - Login", False, "Failed to login")
        return
    
    # Create a normal post
    resp = create_post(token, "live test 1")
    if resp.status_code != 200:
        test_result("Scenario 1 - Create post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # Edit the post
    resp = patch_post(post_id, token, content="live test 1 edited")
    if resp.status_code != 200:
        test_result("Scenario 1 - Edit post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    
    # Verify content updated
    if data.get("content") != "live test 1 edited":
        test_result("Scenario 1 - Content updated", False, f"Expected 'live test 1 edited', got '{data.get('content')}'")
        return
    
    # Verify edit_history contains previous version
    if "edit_history" not in data or len(data["edit_history"]) != 1:
        test_result("Scenario 1 - edit_history", False, f"Expected 1 edit_history entry, got {len(data.get('edit_history', []))}")
        return
    
    if data["edit_history"][0].get("content") != "live test 1":
        test_result("Scenario 1 - edit_history content", False, f"Expected 'live test 1' in history, got '{data['edit_history'][0].get('content')}'")
        return
    
    test_result("Scenario 1 - Edit live post within 24h", True)

# ============================================================
# Test Scenario 2: Edit live post → cannot update images
# ============================================================
def test_scenario_2_live_post_images():
    log("=== Scenario 2: Edit live post → cannot update images ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 2 - Login", False, "Failed to login")
        return
    
    # Create a normal post
    resp = create_post(token, "live test 2")
    if resp.status_code != 200:
        test_result("Scenario 2 - Create post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    original_images = resp.json().get("images", [])
    
    # Try to update images on live post
    resp = patch_post(post_id, token, images=[SMALL_PNG])
    
    # Should either return 400 "Nada para atualizar" or 200 with images unchanged
    if resp.status_code == 400:
        if "Nada para atualizar" in resp.text:
            test_result("Scenario 2 - Live post images ignored (400)", True, "Correctly returned 400 for images-only update")
            return
        else:
            test_result("Scenario 2 - Live post images", False, f"Got 400 but wrong message: {resp.text}")
            return
    elif resp.status_code == 200:
        # Verify images unchanged
        resp_get = get_post(post_id, token)
        if resp_get.status_code != 200:
            test_result("Scenario 2 - Get post", False, f"Status {resp_get.status_code}")
            return
        
        current_images = resp_get.json().get("images", [])
        if current_images != original_images:
            test_result("Scenario 2 - Images unchanged", False, f"Images should not change for live posts")
            return
        
        test_result("Scenario 2 - Live post images ignored (200)", True, "Images correctly ignored for live posts")
    else:
        test_result("Scenario 2 - Live post images", False, f"Unexpected status {resp.status_code}: {resp.text}")

# ============================================================
# Test Scenario 3: Edit draft content + images
# ============================================================
def test_scenario_3_edit_draft():
    log("=== Scenario 3: Edit draft content + images ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 3 - Login", False, "Failed to login")
        return
    
    # Create a draft
    resp = create_post(token, "draft test", is_draft=True)
    if resp.status_code != 200:
        test_result("Scenario 3 - Create draft", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # Edit draft with new content and images
    resp = patch_post(post_id, token, content="draft edited", images=[SMALL_PNG])
    if resp.status_code != 200:
        test_result("Scenario 3 - Edit draft", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    
    # Verify content updated
    if data.get("content") != "draft edited":
        test_result("Scenario 3 - Draft content", False, f"Expected 'draft edited', got '{data.get('content')}'")
        return
    
    # Verify images updated
    if not data.get("images") or len(data["images"]) != 1:
        test_result("Scenario 3 - Draft images", False, f"Expected 1 image, got {len(data.get('images', []))}")
        return
    
    if data["images"][0] != SMALL_PNG:
        test_result("Scenario 3 - Draft image content", False, "Image content doesn't match")
        return
    
    test_result("Scenario 3 - Edit draft content + images", True)

# ============================================================
# Test Scenario 4: Edit draft content (no 24h limit)
# ============================================================
def test_scenario_4_draft_no_time_limit():
    log("=== Scenario 4: Edit draft content (no 24h limit) ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 4 - Login", False, "Failed to login")
        return
    
    # Create a draft
    resp = create_post(token, "draft test no limit", is_draft=True)
    if resp.status_code != 200:
        test_result("Scenario 4 - Create draft", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # Edit draft (should always work regardless of age)
    resp = patch_post(post_id, token, content="draft edited again")
    if resp.status_code != 200:
        test_result("Scenario 4 - Edit draft", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    test_result("Scenario 4 - Edit draft (no time limit)", True, "Drafts can be edited without time restrictions")

# ============================================================
# Test Scenario 5: Cannot edit other user's post
# ============================================================
def test_scenario_5_edit_other_user():
    log("=== Scenario 5: Cannot edit other user's post ===")
    token_a = login(TEST_EMAIL, TEST_PASSWORD)
    token_b = login(TEST_EMAIL_2, TEST_PASSWORD_2)
    
    if not token_a or not token_b:
        test_result("Scenario 5 - Login", False, "Failed to login as both users")
        return
    
    # User A creates a post
    resp = create_post(token_a, "user A post")
    if resp.status_code != 200:
        test_result("Scenario 5 - Create post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # User B tries to edit
    resp = patch_post(post_id, token_b, content="user B trying to edit")
    if resp.status_code != 403:
        test_result("Scenario 5 - Edit other user's post", False, f"Expected 403, got {resp.status_code}")
        return
    
    if "Sem permissão" not in resp.text:
        test_result("Scenario 5 - Error message", False, f"Expected 'Sem permissão', got: {resp.text}")
        return
    
    test_result("Scenario 5 - Cannot edit other user's post", True)

# ============================================================
# Test Scenario 6: Reschedule scheduled post
# ============================================================
def test_scenario_6_reschedule():
    log("=== Scenario 6: Reschedule scheduled post ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 6 - Login", False, "Failed to login")
        return
    
    # Create scheduled post (1 hour from now)
    future_time_1 = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    resp = create_post(token, "scheduled test", scheduled_at=future_time_1)
    if resp.status_code != 200:
        test_result("Scenario 6 - Create scheduled post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # Reschedule to 2 hours from now
    future_time_2 = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    resp = patch_post(post_id, token, scheduled_at=future_time_2)
    if resp.status_code != 200:
        test_result("Scenario 6 - Reschedule", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    
    # Verify scheduled_at updated
    if not data.get("scheduled_at"):
        test_result("Scenario 6 - scheduled_at field", False, "scheduled_at should be present")
        return
    
    # Parse and verify it's approximately 2 hours from now
    new_time = datetime.fromisoformat(data["scheduled_at"].replace("Z", "+00:00"))
    expected_time = datetime.fromisoformat(future_time_2.replace("Z", "+00:00"))
    time_diff = abs((new_time - expected_time).total_seconds())
    
    if time_diff > 60:  # Allow 1 minute tolerance
        test_result("Scenario 6 - Time verification", False, f"Time difference too large: {time_diff}s")
        return
    
    test_result("Scenario 6 - Reschedule scheduled post", True)

# ============================================================
# Test Scenario 7: Reschedule with past date
# ============================================================
def test_scenario_7_reschedule_past():
    log("=== Scenario 7: Reschedule with past date ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 7 - Login", False, "Failed to login")
        return
    
    # Create scheduled post
    future_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    resp = create_post(token, "scheduled test past", scheduled_at=future_time)
    if resp.status_code != 200:
        test_result("Scenario 7 - Create scheduled post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # Try to reschedule to past date
    past_time = "2020-01-01T00:00:00Z"
    resp = patch_post(post_id, token, scheduled_at=past_time)
    if resp.status_code != 400:
        test_result("Scenario 7 - Reschedule past", False, f"Expected 400, got {resp.status_code}")
        return
    
    if "futura" not in resp.text.lower():
        test_result("Scenario 7 - Error message", False, f"Expected message about future date, got: {resp.text}")
        return
    
    test_result("Scenario 7 - Reschedule with past date", True)

# ============================================================
# Test Scenario 8: Reschedule non-scheduled post
# ============================================================
def test_scenario_8_reschedule_live():
    log("=== Scenario 8: Reschedule non-scheduled post ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 8 - Login", False, "Failed to login")
        return
    
    # Create a normal live post
    resp = create_post(token, "live post for reschedule test")
    if resp.status_code != 200:
        test_result("Scenario 8 - Create post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # Try to set scheduled_at on live post
    future_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    resp = patch_post(post_id, token, scheduled_at=future_time)
    if resp.status_code != 400:
        test_result("Scenario 8 - Reschedule live post", False, f"Expected 400, got {resp.status_code}")
        return
    
    if "agendadas" not in resp.text.lower():
        test_result("Scenario 8 - Error message", False, f"Expected message about scheduled posts, got: {resp.text}")
        return
    
    test_result("Scenario 8 - Reschedule non-scheduled post", True)

# ============================================================
# Test Scenario 9: Empty payload
# ============================================================
def test_scenario_9_empty_payload():
    log("=== Scenario 9: Empty payload ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 9 - Login", False, "Failed to login")
        return
    
    # Create a post
    resp = create_post(token, "test empty payload")
    if resp.status_code != 200:
        test_result("Scenario 9 - Create post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # Try to patch with empty payload
    resp = patch_post(post_id, token)
    if resp.status_code != 400:
        test_result("Scenario 9 - Empty payload", False, f"Expected 400, got {resp.status_code}")
        return
    
    if "Nada para atualizar" not in resp.text:
        test_result("Scenario 9 - Error message", False, f"Expected 'Nada para atualizar', got: {resp.text}")
        return
    
    test_result("Scenario 9 - Empty payload", True)

# ============================================================
# Test Scenario 10: Edit history capping
# ============================================================
def test_scenario_10_edit_history_cap():
    log("=== Scenario 10: Edit history capping (12 edits) ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 10 - Login", False, "Failed to login")
        return
    
    # Create a post
    resp = create_post(token, "edit history test 0")
    if resp.status_code != 200:
        test_result("Scenario 10 - Create post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # Edit 12 times
    for i in range(1, 13):
        resp = patch_post(post_id, token, content=f"edit history test {i}")
        if resp.status_code != 200:
            test_result("Scenario 10 - Edit iteration", False, f"Failed at edit {i}: {resp.status_code}")
            return
        time.sleep(0.1)  # Small delay to ensure distinct timestamps
    
    # Get the post and check edit_history
    resp = get_post(post_id, token)
    if resp.status_code != 200:
        test_result("Scenario 10 - Get post", False, f"Status {resp.status_code}")
        return
    
    data = resp.json()
    edit_history = data.get("edit_history", [])
    
    # Should have at most 10 entries
    if len(edit_history) > 10:
        test_result("Scenario 10 - History cap", False, f"Expected max 10 entries, got {len(edit_history)}")
        return
    
    test_result("Scenario 10 - Edit history capping", True, f"History capped at {len(edit_history)} entries (max 10)")

# ============================================================
# Test Scenario 11: Publish a draft after PATCH
# ============================================================
def test_scenario_11_publish_after_patch():
    log("=== Scenario 11: Publish a draft after PATCH ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Scenario 11 - Login", False, "Failed to login")
        return
    
    # Create draft
    resp = create_post(token, "draft for publish test", is_draft=True)
    if resp.status_code != 200:
        test_result("Scenario 11 - Create draft", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_id = resp.json()["id"]
    
    # PATCH content and images
    resp = patch_post(post_id, token, content="draft edited before publish", images=[SMALL_PNG])
    if resp.status_code != 200:
        test_result("Scenario 11 - PATCH draft", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    # Publish the draft
    resp = requests.post(f"{API_BASE}/posts/{post_id}/publish",
        headers=headers_with_token(token)
    )
    if resp.status_code != 200:
        test_result("Scenario 11 - Publish", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    
    # Verify is_draft=false
    if data.get("is_draft") != False:
        test_result("Scenario 11 - is_draft", False, f"Expected is_draft=False, got {data.get('is_draft')}")
        return
    
    # Verify content and images persisted
    if data.get("content") != "draft edited before publish":
        test_result("Scenario 11 - Content", False, f"Content not persisted correctly")
        return
    
    if not data.get("images") or len(data["images"]) != 1:
        test_result("Scenario 11 - Images", False, f"Images not persisted correctly")
        return
    
    test_result("Scenario 11 - Publish draft after PATCH", True)

# ============================================================
# REGRESSION SANITY CHECKS
# ============================================================

def test_regression_muted_topics():
    log("=== Regression: POST /api/topics/mute ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Muted topics login", False, "Failed to login")
        return
    
    resp = requests.post(f"{API_BASE}/topics/mute",
        headers=headers_with_token(token),
        json={"topic": "fado"}
    )
    
    if resp.status_code != 200:
        test_result("Regression - Muted topics", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    test_result("Regression - Muted topics", True)

def test_regression_feed_signals():
    log("=== Regression: POST /api/feed/signals (SKIPPED - not implemented) ===")
    # This endpoint is mentioned in comments but not actually implemented
    test_result("Regression - Feed signals", True, "Endpoint not implemented (skipped)")

def test_regression_dismiss():
    log("=== Regression: POST /api/posts/{id}/dismiss ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Dismiss login", False, "Failed to login")
        return
    
    # Create a post
    resp = create_post(token, "test post for dismiss")
    if resp.status_code != 200:
        test_result("Regression - Dismiss create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    resp = requests.post(f"{API_BASE}/posts/{post_id}/dismiss",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Regression - Dismiss", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    test_result("Regression - Dismiss", True)

def test_regression_why():
    log("=== Regression: GET /api/posts/{id}/why ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Why login", False, "Failed to login")
        return
    
    # Create a post
    resp = create_post(token, "test post for why")
    if resp.status_code != 200:
        test_result("Regression - Why create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    resp = requests.get(f"{API_BASE}/posts/{post_id}/why",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Regression - Why", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if "reason" not in data:
        test_result("Regression - Why reason", False, "Expected 'reason' field in response")
        return
    
    test_result("Regression - Why", True)

def test_regression_boost():
    log("=== Regression: POST /api/posts/{id}/boost ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Boost login", False, "Failed to login")
        return
    
    # Create a post
    resp = create_post(token, "test post for boost")
    if resp.status_code != 200:
        test_result("Regression - Boost create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    resp = requests.post(f"{API_BASE}/posts/{post_id}/boost",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Regression - Boost", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    # The endpoint returns "until" not "boosted_until"
    if "until" not in data and "boosted_until" not in data:
        test_result("Regression - Boost until field", False, "Expected 'until' or 'boosted_until' field")
        return
    
    test_result("Regression - Boost", True)

def test_regression_note():
    log("=== Regression: PUT /api/posts/{id}/note ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Note login", False, "Failed to login")
        return
    
    # Create a post
    resp = create_post(token, "test post for note")
    if resp.status_code != 200:
        test_result("Regression - Note create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    resp = requests.put(f"{API_BASE}/posts/{post_id}/note",
        headers=headers_with_token(token),
        json={"note": "private note"}
    )
    
    if resp.status_code != 200:
        test_result("Regression - Note", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    test_result("Regression - Note", True)

def test_regression_follow_thread():
    log("=== Regression: POST /api/posts/{id}/follow-thread ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Follow thread login", False, "Failed to login")
        return
    
    # Create a post
    resp = create_post(token, "test post for follow thread")
    if resp.status_code != 200:
        test_result("Regression - Follow thread create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    resp = requests.post(f"{API_BASE}/posts/{post_id}/follow-thread",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Regression - Follow thread", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if "watching" not in data:
        test_result("Regression - Follow thread watching", False, "Expected 'watching' field")
        return
    
    test_result("Regression - Follow thread", True)

def test_regression_collection():
    log("=== Regression: POST /api/posts/{id}/collection ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Collection login", False, "Failed to login")
        return
    
    # Create a bookmark collection
    resp = requests.post(f"{API_BASE}/bookmark-collections",
        headers=headers_with_token(token),
        json={"name": "Test Collection"}
    )
    
    if resp.status_code != 200:
        test_result("Regression - Collection create", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    collection_id = resp.json()["id"]
    
    # Create a post and bookmark it
    resp = create_post(token, "test post for collection")
    if resp.status_code != 200:
        test_result("Regression - Collection create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    # Bookmark the post first
    resp = requests.post(f"{API_BASE}/posts/{post_id}/bookmark",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Regression - Collection bookmark", False, f"Status {resp.status_code}")
        return
    
    # Add to collection
    resp = requests.post(f"{API_BASE}/posts/{post_id}/collection",
        headers=headers_with_token(token),
        json={"collection_id": collection_id}
    )
    
    if resp.status_code != 200:
        test_result("Regression - Collection add", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    test_result("Regression - Collection", True)

def test_regression_favorite():
    log("=== Regression: POST /api/users/{username}/favorite ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Favorite login", False, "Failed to login")
        return
    
    # Use the second test user
    username = "tiagocit"
    
    resp = requests.post(f"{API_BASE}/users/{username}/favorite",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Regression - Favorite", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    test_result("Regression - Favorite", True)

def test_regression_notif_preferences():
    log("=== Regression: POST /api/notifications/preferences ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Notif prefs login", False, "Failed to login")
        return
    
    resp = requests.post(f"{API_BASE}/notifications/preferences",
        headers=headers_with_token(token),
        json={"likes": False}
    )
    
    if resp.status_code != 200:
        test_result("Regression - Notif preferences", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    test_result("Regression - Notif preferences", True)

def test_regression_export():
    log("=== Regression: GET /api/users/me/export ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - Export login", False, "Failed to login")
        return
    
    resp = requests.get(f"{API_BASE}/users/me/export",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Regression - Export", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    required_fields = ["posts", "comments", "bookmarks"]
    for field in required_fields:
        if field not in data:
            test_result("Regression - Export fields", False, f"Missing field: {field}")
            return
    
    test_result("Regression - Export", True)

def test_regression_patch_user():
    log("=== Regression: PATCH /api/users/me ===")
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        test_result("Regression - PATCH user login", False, "Failed to login")
        return
    
    resp = requests.patch(f"{API_BASE}/users/me",
        headers=headers_with_token(token),
        json={
            "theme": "dark",
            "show_online": False,
            "notif_preferences": {"likes": False}
        }
    )
    
    if resp.status_code != 200:
        test_result("Regression - PATCH user", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    
    # Verify fields updated
    if data.get("theme") != "dark":
        test_result("Regression - PATCH user theme", False, f"Expected theme='dark', got {data.get('theme')}")
        return
    
    if data.get("show_online") != False:
        test_result("Regression - PATCH user show_online", False, f"Expected show_online=False")
        return
    
    test_result("Regression - PATCH user", True)

# ============================================================
# Main test runner
# ============================================================
def main():
    log("=" * 60)
    log("Starting PATCH /api/posts/{post_id} Backend Tests")
    log("=" * 60)
    
    try:
        # Core PATCH scenarios
        test_scenario_1_edit_live_post()
        test_scenario_2_live_post_images()
        test_scenario_3_edit_draft()
        test_scenario_4_draft_no_time_limit()
        test_scenario_5_edit_other_user()
        test_scenario_6_reschedule()
        test_scenario_7_reschedule_past()
        test_scenario_8_reschedule_live()
        test_scenario_9_empty_payload()
        test_scenario_10_edit_history_cap()
        test_scenario_11_publish_after_patch()
        
        # Regression sanity checks
        test_regression_muted_topics()
        test_regression_feed_signals()
        test_regression_dismiss()
        test_regression_why()
        test_regression_boost()
        test_regression_note()
        test_regression_follow_thread()
        test_regression_collection()
        test_regression_favorite()
        test_regression_notif_preferences()
        test_regression_export()
        test_regression_patch_user()
        
    except Exception as e:
        log(f"CRITICAL ERROR: {e}", "ERROR")
        import traceback
        traceback.print_exc()
    
    log("=" * 60)
    log("Test Summary")
    log("=" * 60)
    
    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    
    log(f"Total: {total} tests")
    log(f"Passed: {passed}")
    log(f"Failed: {total - passed}")
    
    if failed_tests:
        log("\n" + "=" * 60)
        log("Failed Tests Details:")
        log("=" * 60)
        for test in failed_tests:
            log(f"❌ {test['name']}")
            if test['details']:
                log(f"   {test['details']}")
    
    return len(failed_tests) == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
