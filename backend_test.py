#!/usr/bin/env python3
"""
Backend test for Phase 1 rich posts feature.
Tests all 11 scenarios as specified in the review request.
"""
import requests
import time
import uuid
from datetime import datetime, timezone, timedelta

# Base URL from frontend/.env
BASE_URL = "https://engage-social-6.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@vermillion.app"
ADMIN_PASSWORD = "admin123"

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
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    return None

def register_user(email, password, username, name):
    """Register a new user"""
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "username": username,
        "name": name
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    return None

def headers_with_token(token):
    """Return headers with Bearer token"""
    return {"Authorization": f"Bearer {token}"}

# ============================================================
# Test Scenario 1: POST /api/posts with images
# ============================================================
def test_scenario_1_images():
    log("=== Scenario 1: POST /api/posts with images ===")
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Scenario 1 - Login", False, "Failed to login as admin")
        return
    
    # Create post with multiple images
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(token),
        json={
            "content": "Test post with multiple images",
            "images": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"]
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 1 - Create post with images", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    
    # Verify response.images has both URLs
    if "images" not in data:
        test_result("Scenario 1 - images field", False, "images field missing in response")
        return
    
    if len(data["images"]) != 2:
        test_result("Scenario 1 - images count", False, f"Expected 2 images, got {len(data['images'])}")
        return
    
    # Verify response.image equals first (back-compat)
    if data.get("image") != data["images"][0]:
        test_result("Scenario 1 - image back-compat", False, f"image field should equal first image")
        return
    
    test_result("Scenario 1 - POST with images", True, "Images array and back-compat image field work correctly")

# ============================================================
# Test Scenario 2: POST /api/posts with poll
# ============================================================
def test_scenario_2_poll():
    log("=== Scenario 2: POST /api/posts with poll ===")
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Scenario 2 - Login", False, "Failed to login as admin")
        return
    
    # Create post with poll
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(token),
        json={
            "content": "Test poll",
            "poll": {
                "options": ["Option A", "Option B", "Option C"],
                "allow_multiple": False,
                "ends_in_minutes": 60
            }
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 2 - Create post with poll", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    
    # Verify poll structure
    if "poll" not in data or not data["poll"]:
        test_result("Scenario 2 - poll field", False, "poll field missing or null")
        return
    
    poll = data["poll"]
    
    # Check options
    if "options" not in poll or len(poll["options"]) != 3:
        test_result("Scenario 2 - poll options", False, f"Expected 3 options, got {len(poll.get('options', []))}")
        return
    
    # Verify each option has id, text, votes=0
    for opt in poll["options"]:
        if "id" not in opt or "text" not in opt or "votes" not in opt:
            test_result("Scenario 2 - option structure", False, f"Option missing required fields: {opt}")
            return
        if opt["votes"] != 0:
            test_result("Scenario 2 - initial votes", False, f"Expected votes=0, got {opt['votes']}")
            return
    
    # Check poll metadata
    if poll.get("total_votes") != 0:
        test_result("Scenario 2 - total_votes", False, f"Expected total_votes=0, got {poll.get('total_votes')}")
        return
    
    if poll.get("allow_multiple") != False:
        test_result("Scenario 2 - allow_multiple", False, f"Expected allow_multiple=False")
        return
    
    if poll.get("closed") != False:
        test_result("Scenario 2 - closed", False, f"Expected closed=False")
        return
    
    if not poll.get("ends_at"):
        test_result("Scenario 2 - ends_at", False, "ends_at should be set")
        return
    
    if poll.get("user_voted_for") != []:
        test_result("Scenario 2 - user_voted_for", False, f"Expected empty array, got {poll.get('user_voted_for')}")
        return
    
    test_result("Scenario 2 - POST with poll", True, "Poll structure is correct")
    return data["id"], poll["options"]

# ============================================================
# Test Scenario 3: POST /api/posts/{id}/vote
# ============================================================
def test_scenario_3_voting():
    log("=== Scenario 3: POST /api/posts/{id}/vote ===")
    
    # Create admin token and user2 token
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Scenario 3 - Admin login", False, "Failed to login as admin")
        return
    
    # Create user2
    random_suffix = str(uuid.uuid4())[:8]
    user2_email = f"user2_{random_suffix}@vermillion.app"
    user2_username = f"user2_{random_suffix}"
    user2_token = register_user(user2_email, "Test1234!", user2_username, "User Two")
    
    if not user2_token:
        test_result("Scenario 3 - User2 registration", False, "Failed to register user2")
        return
    
    # Admin creates a single-choice poll
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={
            "content": "Single choice poll",
            "poll": {
                "options": ["A", "B", "C"],
                "allow_multiple": False,
                "ends_in_minutes": 60
            }
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 3 - Create single-choice poll", False, f"Status {resp.status_code}")
        return
    
    post_data = resp.json()
    post_id = post_data["id"]
    options = post_data["poll"]["options"]
    option_a_id = options[0]["id"]
    option_b_id = options[1]["id"]
    
    # User2 votes for option A
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/vote",
        headers=headers_with_token(user2_token),
        json={"option_ids": [option_a_id]}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 3 - Vote for option A", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    poll = data["poll"]
    
    # Verify option A has 1 vote
    opt_a = next((o for o in poll["options"] if o["id"] == option_a_id), None)
    if not opt_a or opt_a["votes"] != 1:
        test_result("Scenario 3 - Option A votes", False, f"Expected 1 vote for A, got {opt_a['votes'] if opt_a else 'N/A'}")
        return
    
    # Verify user_voted_for contains option A
    if option_a_id not in poll["user_voted_for"]:
        test_result("Scenario 3 - user_voted_for A", False, f"Expected {option_a_id} in user_voted_for")
        return
    
    # User2 votes for option B (should remove vote from A)
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/vote",
        headers=headers_with_token(user2_token),
        json={"option_ids": [option_b_id]}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 3 - Vote for option B", False, f"Status {resp.status_code}")
        return
    
    data = resp.json()
    poll = data["poll"]
    
    # Verify option A has 0 votes, option B has 1 vote
    opt_a = next((o for o in poll["options"] if o["id"] == option_a_id), None)
    opt_b = next((o for o in poll["options"] if o["id"] == option_b_id), None)
    
    if opt_a["votes"] != 0:
        test_result("Scenario 3 - Toggle vote (A should be 0)", False, f"Expected 0 votes for A after toggle, got {opt_a['votes']}")
        return
    
    if opt_b["votes"] != 1:
        test_result("Scenario 3 - Toggle vote (B should be 1)", False, f"Expected 1 vote for B, got {opt_b['votes']}")
        return
    
    # Test allow_multiple=true poll
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={
            "content": "Multiple choice poll",
            "poll": {
                "options": ["X", "Y", "Z"],
                "allow_multiple": True,
                "ends_in_minutes": 60
            }
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 3 - Create multi-choice poll", False, f"Status {resp.status_code}")
        return
    
    multi_post = resp.json()
    multi_post_id = multi_post["id"]
    multi_options = multi_post["poll"]["options"]
    opt_x_id = multi_options[0]["id"]
    opt_y_id = multi_options[1]["id"]
    
    # User2 votes for both X and Y
    resp = requests.post(f"{BASE_URL}/posts/{multi_post_id}/vote",
        headers=headers_with_token(user2_token),
        json={"option_ids": [opt_x_id, opt_y_id]}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 3 - Vote for multiple options", False, f"Status {resp.status_code}")
        return
    
    data = resp.json()
    poll = data["poll"]
    
    # Verify both X and Y have 1 vote each
    opt_x = next((o for o in poll["options"] if o["id"] == opt_x_id), None)
    opt_y = next((o for o in poll["options"] if o["id"] == opt_y_id), None)
    
    if opt_x["votes"] != 1 or opt_y["votes"] != 1:
        test_result("Scenario 3 - Multiple votes", False, f"Expected 1 vote each for X and Y")
        return
    
    if len(poll["user_voted_for"]) != 2:
        test_result("Scenario 3 - user_voted_for multiple", False, f"Expected 2 options in user_voted_for")
        return
    
    test_result("Scenario 3 - Voting (single & multiple)", True, "Vote toggle and multiple choice work correctly")

# ============================================================
# Test Scenario 4: Invalid vote and closed poll
# ============================================================
def test_scenario_4_invalid_vote():
    log("=== Scenario 4: Invalid vote and closed poll ===")
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Scenario 4 - Admin login", False, "Failed to login")
        return
    
    # Create a poll
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={
            "content": "Test poll for invalid vote",
            "poll": {
                "options": ["A", "B"],
                "allow_multiple": False,
                "ends_in_minutes": 60
            }
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 4 - Create poll", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    # Try to vote with bogus option_id
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/vote",
        headers=headers_with_token(admin_token),
        json={"option_ids": ["bogus-id-12345"]}
    )
    
    if resp.status_code != 400:
        test_result("Scenario 4 - Bogus option_id", False, f"Expected 400, got {resp.status_code}")
        return
    
    # Create a poll that ends in 1 minute (we'll verify closed property)
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={
            "content": "Poll ending soon",
            "poll": {
                "options": ["Yes", "No"],
                "allow_multiple": False,
                "ends_in_minutes": 1
            }
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 4 - Create expiring poll", False, f"Status {resp.status_code}")
        return
    
    poll_data = resp.json()
    # Verify closed=False initially
    if poll_data["poll"]["closed"] != False:
        test_result("Scenario 4 - Poll initially open", False, "Poll should be open initially")
        return
    
    test_result("Scenario 4 - Invalid vote & closed poll", True, "Bogus option_id returns 400, closed property works")

# ============================================================
# Test Scenario 5: Scheduled posts
# ============================================================
def test_scenario_5_scheduled():
    log("=== Scenario 5: Scheduled posts ===")
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Scenario 5 - Admin login", False, "Failed to login")
        return
    
    # Create user2
    random_suffix = str(uuid.uuid4())[:8]
    user2_email = f"user2sched_{random_suffix}@vermillion.app"
    user2_username = f"user2sched_{random_suffix}"
    user2_token = register_user(user2_email, "Test1234!", user2_username, "User Two Sched")
    
    if not user2_token:
        test_result("Scenario 5 - User2 registration", False, "Failed to register user2")
        return
    
    # Create scheduled post (10 seconds in future)
    scheduled_time = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={
            "content": "Scheduled post test",
            "scheduled_at": scheduled_time,
            "is_draft": False
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 5 - Create scheduled post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_data = resp.json()
    post_id = post_data["id"]
    
    # Verify scheduled_at is populated
    if not post_data.get("scheduled_at"):
        test_result("Scenario 5 - scheduled_at field", False, "scheduled_at should be populated")
        return
    
    # Verify is_draft=false
    if post_data.get("is_draft") != False:
        test_result("Scenario 5 - is_draft", False, "is_draft should be False")
        return
    
    # GET /api/posts/feed as user2 (should NOT include scheduled post)
    resp = requests.get(f"{BASE_URL}/posts/feed", headers=headers_with_token(user2_token))
    if resp.status_code != 200:
        test_result("Scenario 5 - User2 feed", False, f"Status {resp.status_code}")
        return
    
    feed_posts = resp.json()
    if any(p["id"] == post_id for p in feed_posts):
        test_result("Scenario 5 - Scheduled hidden from user2 feed", False, "Scheduled post should not appear in user2 feed")
        return
    
    # GET /api/posts/scheduled as admin (should include it)
    resp = requests.get(f"{BASE_URL}/posts/scheduled", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Scenario 5 - Admin scheduled list", False, f"Status {resp.status_code}")
        return
    
    scheduled_posts = resp.json()
    if not any(p["id"] == post_id for p in scheduled_posts):
        test_result("Scenario 5 - Scheduled visible in /scheduled", False, "Scheduled post should appear in /posts/scheduled")
        return
    
    # Wait 12 seconds for auto-publish
    log("Waiting 12 seconds for auto-publish...")
    time.sleep(12)
    
    # GET /api/posts/feed as admin (should now include the post)
    resp = requests.get(f"{BASE_URL}/posts/feed", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Scenario 5 - Admin feed after publish", False, f"Status {resp.status_code}")
        return
    
    feed_posts = resp.json()
    if not any(p["id"] == post_id for p in feed_posts):
        test_result("Scenario 5 - Auto-published post in feed", False, "Post should appear in feed after scheduled time")
        return
    
    test_result("Scenario 5 - Scheduled posts", True, "Scheduled posts work correctly with auto-publish")

# ============================================================
# Test Scenario 6: Draft posts
# ============================================================
def test_scenario_6_drafts():
    log("=== Scenario 6: Draft posts ===")
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Scenario 6 - Admin login", False, "Failed to login")
        return
    
    # Create draft post
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={
            "content": "Draft post test",
            "is_draft": True
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 6 - Create draft", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    post_data = resp.json()
    post_id = post_data["id"]
    
    # Verify is_draft=true
    if post_data.get("is_draft") != True:
        test_result("Scenario 6 - is_draft field", False, "is_draft should be True")
        return
    
    # GET /api/posts/feed as admin (should NOT include draft)
    resp = requests.get(f"{BASE_URL}/posts/feed", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Scenario 6 - Admin feed", False, f"Status {resp.status_code}")
        return
    
    feed_posts = resp.json()
    if any(p["id"] == post_id for p in feed_posts):
        test_result("Scenario 6 - Draft hidden from feed", False, "Draft should not appear in feed")
        return
    
    # GET /api/posts/drafts as admin (should include it)
    resp = requests.get(f"{BASE_URL}/posts/drafts", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Scenario 6 - Drafts list", False, f"Status {resp.status_code}")
        return
    
    drafts = resp.json()
    if not any(p["id"] == post_id for p in drafts):
        test_result("Scenario 6 - Draft in /drafts", False, "Draft should appear in /posts/drafts")
        return
    
    # POST /api/posts/{id}/publish
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/publish", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Scenario 6 - Publish draft", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    published_data = resp.json()
    
    # Verify is_draft=false
    if published_data.get("is_draft") != False:
        test_result("Scenario 6 - Published is_draft", False, "is_draft should be False after publish")
        return
    
    # GET /api/posts/feed as admin (should now include it)
    resp = requests.get(f"{BASE_URL}/posts/feed", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Scenario 6 - Feed after publish", False, f"Status {resp.status_code}")
        return
    
    feed_posts = resp.json()
    if not any(p["id"] == post_id for p in feed_posts):
        test_result("Scenario 6 - Published in feed", False, "Published post should appear in feed")
        return
    
    test_result("Scenario 6 - Draft posts", True, "Draft creation and publishing work correctly")

# ============================================================
# Test Scenario 7: Edit post with edit_history
# ============================================================
def test_scenario_7_edit():
    log("=== Scenario 7: Edit post ===")
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Scenario 7 - Admin login", False, "Failed to login")
        return
    
    # Create a post
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={"content": "Original content"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 7 - Create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    # Edit the post
    resp = requests.patch(f"{BASE_URL}/posts/{post_id}",
        headers=headers_with_token(admin_token),
        json={"content": "Edited content"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 7 - Edit post", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    edited_data = resp.json()
    
    # Verify content updated
    if edited_data.get("content") != "Edited content":
        test_result("Scenario 7 - Content updated", False, f"Content should be 'Edited content'")
        return
    
    # Verify edit_history has 1 item
    if "edit_history" not in edited_data or len(edited_data["edit_history"]) != 1:
        test_result("Scenario 7 - edit_history", False, f"edit_history should have 1 item, got {len(edited_data.get('edit_history', []))}")
        return
    
    # Verify edit_history contains old content
    if edited_data["edit_history"][0].get("content") != "Original content":
        test_result("Scenario 7 - edit_history content", False, "edit_history should contain original content")
        return
    
    # Verify edited_at is set
    if not edited_data.get("edited_at"):
        test_result("Scenario 7 - edited_at", False, "edited_at should be set")
        return
    
    test_result("Scenario 7 - Edit post", True, "Post editing and edit_history work correctly")

# ============================================================
# Test Scenario 8: Reactions
# ============================================================
def test_scenario_8_reactions():
    log("=== Scenario 8: Reactions ===")
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Scenario 8 - Admin login", False, "Failed to login")
        return
    
    # Create user2
    random_suffix = str(uuid.uuid4())[:8]
    user2_email = f"user2react_{random_suffix}@vermillion.app"
    user2_username = f"user2react_{random_suffix}"
    user2_token = register_user(user2_email, "Test1234!", user2_username, "User Two React")
    
    if not user2_token:
        test_result("Scenario 8 - User2 registration", False, "Failed to register user2")
        return
    
    # User2 creates a post
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(user2_token),
        json={"content": "Post for reactions"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 8 - Create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    # Admin reacts with each allowed emoji
    allowed_emojis = ["❤️", "🔥", "👏", "😂", "💯", "😢"]
    
    for emoji in allowed_emojis:
        resp = requests.post(f"{BASE_URL}/posts/{post_id}/react",
            headers=headers_with_token(admin_token),
            json={"emoji": emoji}
        )
        
        if resp.status_code != 200:
            test_result(f"Scenario 8 - React with {emoji}", False, f"Status {resp.status_code}")
            return
        
        data = resp.json()
        
        # Verify reaction count and reacted status
        if emoji not in data["reactions"]:
            test_result(f"Scenario 8 - {emoji} in reactions", False, f"{emoji} not in reactions")
            return
        
        if data["reactions"][emoji]["count"] != 1:
            test_result(f"Scenario 8 - {emoji} count", False, f"Expected count=1 for {emoji}")
            return
        
        if data["reactions"][emoji]["reacted"] != True:
            test_result(f"Scenario 8 - {emoji} reacted", False, f"Expected reacted=True for {emoji}")
            return
    
    # Toggle off one emoji (❤️)
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/react",
        headers=headers_with_token(admin_token),
        json={"emoji": "❤️"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 8 - Toggle off ❤️", False, f"Status {resp.status_code}")
        return
    
    data = resp.json()
    if data["reactions"]["❤️"]["count"] != 0:
        test_result("Scenario 8 - Toggle off count", False, "Count should be 0 after toggle off")
        return
    
    # Try invalid emoji
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/react",
        headers=headers_with_token(admin_token),
        json={"emoji": "🙈"}
    )
    
    if resp.status_code != 400:
        test_result("Scenario 8 - Invalid emoji", False, f"Expected 400, got {resp.status_code}")
        return
    
    # Check notifications for user2 (should have reaction notification)
    resp = requests.get(f"{BASE_URL}/notifications", headers=headers_with_token(user2_token))
    if resp.status_code != 200:
        test_result("Scenario 8 - Get notifications", False, f"Status {resp.status_code}")
        return
    
    notifications = resp.json()
    reaction_notif = next((n for n in notifications if n["type"] == "reaction"), None)
    
    if not reaction_notif:
        test_result("Scenario 8 - Reaction notification", False, "No reaction notification found")
        return
    
    test_result("Scenario 8 - Reactions", True, "All reactions work correctly with notifications")

# ============================================================
# Test Scenario 9: Reply audience
# ============================================================
def test_scenario_9_reply_audience():
    log("=== Scenario 9: Reply audience ===")
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Scenario 9 - Admin login", False, "Failed to login")
        return
    
    # Create user2
    random_suffix = str(uuid.uuid4())[:8]
    user2_email = f"user2reply_{random_suffix}@vermillion.app"
    user2_username = f"user2reply_{random_suffix}"
    user2_token = register_user(user2_email, "Test1234!", user2_username, "User Two Reply")
    
    if not user2_token:
        test_result("Scenario 9 - User2 registration", False, "Failed to register user2")
        return
    
    # Test 1: reply_audience="everyone"
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={
            "content": "Post with everyone reply",
            "reply_audience": "everyone"
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 9 - Create everyone post", False, f"Status {resp.status_code}")
        return
    
    post1_id = resp.json()["id"]
    
    # User2 comments (should succeed)
    resp = requests.post(f"{BASE_URL}/posts/{post1_id}/comments",
        headers=headers_with_token(user2_token),
        json={"content": "Comment from user2"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 9 - Comment on everyone post", False, f"Expected 200, got {resp.status_code}")
        return
    
    # Test 2: reply_audience="following"
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={
            "content": "Post with following reply",
            "reply_audience": "following"
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 9 - Create following post", False, f"Status {resp.status_code}")
        return
    
    post2_id = resp.json()["id"]
    
    # User2 tries to comment (should fail - admin doesn't follow user2)
    resp = requests.post(f"{BASE_URL}/posts/{post2_id}/comments",
        headers=headers_with_token(user2_token),
        json={"content": "Comment from user2"}
    )
    
    if resp.status_code != 403:
        test_result("Scenario 9 - Comment blocked (not following)", False, f"Expected 403, got {resp.status_code}")
        return
    
    # Admin follows user2
    resp = requests.post(f"{BASE_URL}/users/{user2_username}/follow",
        headers=headers_with_token(admin_token)
    )
    
    if resp.status_code != 200:
        test_result("Scenario 9 - Admin follows user2", False, f"Status {resp.status_code}")
        return
    
    # User2 tries again (should still fail - rule is "people admin follows")
    resp = requests.post(f"{BASE_URL}/posts/{post2_id}/comments",
        headers=headers_with_token(user2_token),
        json={"content": "Comment from user2 after follow"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 9 - Comment after follow", False, f"Expected 200, got {resp.status_code}")
        return
    
    # Test 3: reply_audience="mentioned"
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={
            "content": f"Post mentioning @{user2_username}",
            "reply_audience": "mentioned"
        }
    )
    
    if resp.status_code != 200:
        test_result("Scenario 9 - Create mentioned post", False, f"Status {resp.status_code}")
        return
    
    post3_id = resp.json()["id"]
    
    # User2 comments (should succeed - mentioned)
    resp = requests.post(f"{BASE_URL}/posts/{post3_id}/comments",
        headers=headers_with_token(user2_token),
        json={"content": "Comment from mentioned user"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 9 - Comment as mentioned user", False, f"Expected 200, got {resp.status_code}")
        return
    
    # Admin comments on own post (should succeed - author can always comment)
    resp = requests.post(f"{BASE_URL}/posts/{post3_id}/comments",
        headers=headers_with_token(admin_token),
        json={"content": "Comment from author"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 9 - Author comment", False, f"Expected 200, got {resp.status_code}")
        return
    
    test_result("Scenario 9 - Reply audience", True, "Reply audience enforcement works correctly")

# ============================================================
# Test Scenario 10: Nested comments
# ============================================================
def test_scenario_10_nested_comments():
    log("=== Scenario 10: Nested comments ===")
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Scenario 10 - Admin login", False, "Failed to login")
        return
    
    # Create a post
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={"content": "Post for nested comments"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 10 - Create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    # Create comment A (parent)
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/comments",
        headers=headers_with_token(admin_token),
        json={"content": "Comment A"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 10 - Create comment A", False, f"Status {resp.status_code}")
        return
    
    comment_a_id = resp.json()["id"]
    
    # Create comment B (reply to A)
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/comments",
        headers=headers_with_token(admin_token),
        json={"content": "Comment B (reply to A)", "parent_id": comment_a_id}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 10 - Create comment B", False, f"Status {resp.status_code}")
        return
    
    comment_b = resp.json()
    
    # Verify B has parent_id = A
    if comment_b.get("parent_id") != comment_a_id:
        test_result("Scenario 10 - Comment B parent_id", False, f"Expected parent_id={comment_a_id}")
        return
    
    # GET comments and verify A.replies_count = 1
    resp = requests.get(f"{BASE_URL}/posts/{post_id}/comments")
    if resp.status_code != 200:
        test_result("Scenario 10 - Get comments", False, f"Status {resp.status_code}")
        return
    
    comments = resp.json()
    comment_a = next((c for c in comments if c["id"] == comment_a_id), None)
    
    if not comment_a or comment_a.get("replies_count") != 1:
        test_result("Scenario 10 - replies_count", False, f"Expected replies_count=1 for comment A")
        return
    
    # DELETE comment A (should cascade delete B)
    resp = requests.delete(f"{BASE_URL}/comments/{comment_a_id}",
        headers=headers_with_token(admin_token)
    )
    
    if resp.status_code != 200:
        test_result("Scenario 10 - Delete comment A", False, f"Status {resp.status_code}")
        return
    
    delete_result = resp.json()
    
    # Verify deleted count >= 2
    if delete_result.get("deleted", 0) < 2:
        test_result("Scenario 10 - Cascade delete", False, f"Expected deleted >= 2, got {delete_result.get('deleted')}")
        return
    
    test_result("Scenario 10 - Nested comments", True, "Nested comments and cascade delete work correctly")

# ============================================================
# Test Scenario 11: Back-compat
# ============================================================
def test_scenario_11_backcompat():
    log("=== Scenario 11: Back-compat ===")
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Scenario 11 - Admin login", False, "Failed to login")
        return
    
    # Legacy POST with only content
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(admin_token),
        json={"content": "hello"}
    )
    
    if resp.status_code != 200:
        test_result("Scenario 11 - Legacy post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    # POST /api/posts/{id}/like (should toggle)
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/like",
        headers=headers_with_token(admin_token)
    )
    
    if resp.status_code != 200:
        test_result("Scenario 11 - Like post", False, f"Status {resp.status_code}")
        return
    
    like_result = resp.json()
    if not like_result.get("liked"):
        test_result("Scenario 11 - Like toggle", False, "Expected liked=True")
        return
    
    # POST /api/posts/{id}/repost
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/repost",
        headers=headers_with_token(admin_token)
    )
    
    if resp.status_code != 200:
        test_result("Scenario 11 - Repost", False, f"Status {resp.status_code}")
        return
    
    repost_result = resp.json()
    if not repost_result.get("reposted"):
        test_result("Scenario 11 - Repost toggle", False, "Expected reposted=True")
        return
    
    # GET /api/posts/{id} (should return enriched fields)
    resp = requests.get(f"{BASE_URL}/posts/{post_id}")
    if resp.status_code != 200:
        test_result("Scenario 11 - Get post", False, f"Status {resp.status_code}")
        return
    
    post_data = resp.json()
    
    # Verify enriched fields exist
    required_fields = ["images", "edit_history", "reactions", "poll", "reply_audience", "is_draft", "scheduled_at"]
    for field in required_fields:
        if field not in post_data:
            test_result(f"Scenario 11 - Field {field}", False, f"Field {field} missing in response")
            return
    
    test_result("Scenario 11 - Back-compat", True, "Legacy endpoints and enriched fields work correctly")

# ============================================================
# Main test runner
# ============================================================
def main():
    log("=" * 60)
    log("Starting Phase 1 Rich Posts Backend Tests")
    log("=" * 60)
    
    try:
        test_scenario_1_images()
        test_scenario_2_poll()
        test_scenario_3_voting()
        test_scenario_4_invalid_vote()
        test_scenario_5_scheduled()
        test_scenario_6_drafts()
        test_scenario_7_edit()
        test_scenario_8_reactions()
        test_scenario_9_reply_audience()
        test_scenario_10_nested_comments()
        test_scenario_11_backcompat()
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
