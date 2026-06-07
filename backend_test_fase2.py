#!/usr/bin/env python3
"""
Backend test for Fase 2 - Portuguese social mechanics.
Tests all Fase 2 endpoints as specified in the review request.
"""
import os
import sys
import requests
import time
import uuid
from datetime import datetime, timezone, timedelta

# Base URL — overridable via env
BASE_URL = os.environ.get(
    "BASE_URL", "https://visual-structure-cal.preview.emergentagent.com/api"
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
# Test: GET /api/trending with range filters
# ============================================================
def test_trending():
    log("=== Testing GET /api/trending ===")
    
    # Test default (7d)
    resp = requests.get(f"{BASE_URL}/trending")
    if resp.status_code != 200:
        test_result("Trending - default", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if not isinstance(data, list):
        test_result("Trending - response type", False, "Expected list")
        return
    
    # Verify structure if data exists
    if len(data) > 0:
        item = data[0]
        required_fields = ["tag", "count", "previous", "velocity", "is_city"]
        for field in required_fields:
            if field not in item:
                test_result("Trending - fields", False, f"Missing field: {field}")
                return
    
    # Test different ranges
    for range_val in ["1h", "24h", "7d", "30d"]:
        resp = requests.get(f"{BASE_URL}/trending?range={range_val}")
        if resp.status_code != 200:
            test_result(f"Trending - range={range_val}", False, f"Status {resp.status_code}")
            return
    
    test_result("Trending - all ranges", True, "All range filters work correctly")

# ============================================================
# Test: GET /api/trending/pessoas
# ============================================================
def test_trending_pessoas():
    log("=== Testing GET /api/trending/pessoas ===")
    
    resp = requests.get(f"{BASE_URL}/trending/pessoas?range=7d")
    if resp.status_code != 200:
        test_result("Trending pessoas", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if not isinstance(data, list):
        test_result("Trending pessoas - type", False, "Expected list")
        return
    
    # Verify structure if data exists
    if len(data) > 0:
        person = data[0]
        required_fields = ["id", "username", "trend_score", "trend_posts", "trend_likes"]
        for field in required_fields:
            if field not in person:
                test_result("Trending pessoas - fields", False, f"Missing field: {field}")
                return
    
    test_result("Trending pessoas", True, "Trending people endpoint works")

# ============================================================
# Test: GET /api/trending/comunidades
# ============================================================
def test_trending_comunidades():
    log("=== Testing GET /api/trending/comunidades ===")
    
    resp = requests.get(f"{BASE_URL}/trending/comunidades?range=7d")
    if resp.status_code != 200:
        test_result("Trending comunidades", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if not isinstance(data, list):
        test_result("Trending comunidades - type", False, "Expected list")
        return
    
    # Verify structure if data exists
    if len(data) > 0:
        community = data[0]
        required_fields = ["id", "name", "slug", "trend_posts", "trend_likes"]
        for field in required_fields:
            if field not in community:
                test_result("Trending comunidades - fields", False, f"Missing field: {field}")
                return
    
    test_result("Trending comunidades", True, "Trending communities endpoint works")

# ============================================================
# Test: GET /api/trending/cidades
# ============================================================
def test_trending_cidades():
    log("=== Testing GET /api/trending/cidades ===")
    
    resp = requests.get(f"{BASE_URL}/trending/cidades?range=30d")
    if resp.status_code != 200:
        test_result("Trending cidades", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if not isinstance(data, list):
        test_result("Trending cidades - type", False, "Expected list")
        return
    
    # Verify structure if data exists
    if len(data) > 0:
        city = data[0]
        required_fields = ["city", "count", "previous", "velocity"]
        for field in required_fields:
            if field not in city:
                test_result("Trending cidades - fields", False, f"Missing field: {field}")
                return
    
    test_result("Trending cidades", True, "Trending cities endpoint works")

# ============================================================
# Test: GET /api/explore/moods
# ============================================================
def test_explore_moods():
    log("=== Testing GET /api/explore/moods ===")
    
    resp = requests.get(f"{BASE_URL}/explore/moods")
    if resp.status_code != 200:
        test_result("Explore moods", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if not isinstance(data, list):
        test_result("Explore moods - type", False, "Expected list")
        return
    
    # Should have moods
    if len(data) == 0:
        test_result("Explore moods - empty", False, "Expected moods list")
        return
    
    # Verify structure
    mood = data[0]
    required_fields = ["key", "label", "emoji", "count"]
    for field in required_fields:
        if field not in mood:
            test_result("Explore moods - fields", False, f"Missing field: {field}")
            return
    
    test_result("Explore moods", True, "Moods catalogue works")

# ============================================================
# Test: GET /api/explore/by-mood
# ============================================================
def test_explore_by_mood():
    log("=== Testing GET /api/explore/by-mood ===")
    
    # Test valid moods
    valid_moods = ["tasca", "saudade", "fado", "festa", "cafe", "praia", "futebol", "cultura"]
    
    for mood in valid_moods:
        resp = requests.get(f"{BASE_URL}/explore/by-mood?mood={mood}")
        if resp.status_code != 200:
            test_result(f"Explore by-mood - {mood}", False, f"Status {resp.status_code}")
            return
        
        data = resp.json()
        if not isinstance(data, list):
            test_result(f"Explore by-mood - {mood} type", False, "Expected list")
            return
    
    # Test invalid mood
    resp = requests.get(f"{BASE_URL}/explore/by-mood?mood=invalid_mood")
    if resp.status_code != 400:
        test_result("Explore by-mood - invalid", False, f"Expected 400, got {resp.status_code}")
        return
    
    test_result("Explore by-mood", True, "All moods work, invalid mood returns 400")

# ============================================================
# Test: GET /api/explore/by-city
# ============================================================
def test_explore_by_city():
    log("=== Testing GET /api/explore/by-city ===")
    
    # Test valid city
    resp = requests.get(f"{BASE_URL}/explore/by-city?city=lisboa")
    if resp.status_code != 200:
        test_result("Explore by-city - lisboa", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if not isinstance(data, list):
        test_result("Explore by-city - type", False, "Expected list")
        return
    
    # Test invalid city
    resp = requests.get(f"{BASE_URL}/explore/by-city?city=invalid_city")
    if resp.status_code != 400:
        test_result("Explore by-city - invalid", False, f"Expected 400, got {resp.status_code}")
        return
    
    test_result("Explore by-city", True, "City filter works, invalid city returns 400")

# ============================================================
# Test: GET /api/explore/people (auth required)
# ============================================================
def test_explore_people():
    log("=== Testing GET /api/explore/people ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Explore people - login", False, "Failed to login")
        return
    
    resp = requests.get(f"{BASE_URL}/explore/people", headers=headers_with_token(token))
    if resp.status_code != 200:
        test_result("Explore people", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if not isinstance(data, list):
        test_result("Explore people - type", False, "Expected list")
        return
    
    # Verify structure if data exists
    if len(data) > 0:
        person = data[0]
        required_fields = ["id", "username", "mutual_count", "reason"]
        for field in required_fields:
            if field not in person:
                test_result("Explore people - fields", False, f"Missing field: {field}")
                return
    
    test_result("Explore people", True, "People suggestions work")

# ============================================================
# Test: Feed/Explore with mood and sort filters
# ============================================================
def test_feed_filters():
    log("=== Testing GET /api/posts/feed with filters ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Feed filters - login", False, "Failed to login")
        return
    
    # Test feed with mood
    resp = requests.get(f"{BASE_URL}/posts/feed?mood=tasca&sort=top", headers=headers_with_token(token))
    if resp.status_code != 200:
        test_result("Feed - mood filter", False, f"Status {resp.status_code}")
        return
    
    # Test feed without params (sanity check)
    resp = requests.get(f"{BASE_URL}/posts/feed", headers=headers_with_token(token))
    if resp.status_code != 200:
        test_result("Feed - no params", False, f"Status {resp.status_code}")
        return
    
    test_result("Feed filters", True, "Feed mood and sort filters work")

def test_explore_filters():
    log("=== Testing GET /api/posts/explore with filters ===")
    
    # Test explore with mood
    resp = requests.get(f"{BASE_URL}/posts/explore?mood=fado&sort=trending")
    if resp.status_code != 200:
        test_result("Explore - mood filter", False, f"Status {resp.status_code}")
        return
    
    test_result("Explore filters", True, "Explore mood and sort filters work")

# ============================================================
# Test: Enriched post fields (mood, cities, shares)
# ============================================================
def test_enriched_posts():
    log("=== Testing enriched post fields ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Enriched posts - login", False, "Failed to login")
        return
    
    # Create a post with PT content
    resp = requests.post(f"{BASE_URL}/posts", 
        headers=headers_with_token(token),
        json={"content": "Adoro a tasca em Lisboa! #Lisboa #Tasca"}
    )
    
    if resp.status_code != 200:
        test_result("Enriched posts - create", False, f"Status {resp.status_code}")
        return
    
    post = resp.json()
    
    # Verify enriched fields
    required_fields = ["mood", "cities", "shares"]
    for field in required_fields:
        if field not in post:
            test_result(f"Enriched posts - {field}", False, f"Missing field: {field}")
            return
    
    # Verify mood detection
    if post["mood"] != "tasca":
        test_result("Enriched posts - mood detection", False, f"Expected mood='tasca', got '{post['mood']}'")
        return
    
    # Verify cities detection
    if "Lisboa" not in post["cities"]:
        test_result("Enriched posts - cities detection", False, f"Expected 'Lisboa' in cities, got {post['cities']}")
        return
    
    # Verify shares is 0 initially
    if post["shares"] != 0:
        test_result("Enriched posts - shares", False, f"Expected shares=0, got {post['shares']}")
        return
    
    test_result("Enriched posts", True, "Mood, cities, and shares fields work correctly")

# ============================================================
# Test: GET /api/users/{username}/badges
# ============================================================
def test_user_badges():
    log("=== Testing GET /api/users/{username}/badges ===")
    
    # Test with admin user
    resp = requests.get(f"{BASE_URL}/users/admin/badges")
    if resp.status_code != 200:
        test_result("User badges", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    
    # Verify structure
    required_fields = ["earned", "all", "totals"]
    for field in required_fields:
        if field not in data:
            test_result(f"User badges - {field}", False, f"Missing field: {field}")
            return
    
    # Verify all badges list
    if not isinstance(data["all"], list):
        test_result("User badges - all type", False, "Expected list for 'all'")
        return
    
    # Verify badge structure
    if len(data["all"]) > 0:
        badge = data["all"][0]
        badge_fields = ["key", "emoji", "label", "desc", "earned"]
        for field in badge_fields:
            if field not in badge:
                test_result(f"User badges - badge {field}", False, f"Missing field: {field}")
                return
    
    # Verify totals structure
    totals_fields = ["posts", "likes_received", "streak", "cities", "image_posts", "comments_made", "joined_days"]
    for field in totals_fields:
        if field not in data["totals"]:
            test_result(f"User badges - totals {field}", False, f"Missing field: {field}")
            return
    
    test_result("User badges", True, "Badges endpoint works with correct structure")

# ============================================================
# Test: GET /api/users/{username}/regions
# ============================================================
def test_user_regions():
    log("=== Testing GET /api/users/{username}/regions ===")
    
    # Test with admin user
    resp = requests.get(f"{BASE_URL}/users/admin/regions")
    if resp.status_code != 200:
        test_result("User regions", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    if not isinstance(data, list):
        test_result("User regions - type", False, "Expected list")
        return
    
    # Verify structure if data exists
    if len(data) > 0:
        region = data[0]
        required_fields = ["city", "count"]
        for field in required_fields:
            if field not in region:
                test_result(f"User regions - {field}", False, f"Missing field: {field}")
                return
    
    test_result("User regions", True, "Regions endpoint works")

# ============================================================
# Test: GET /api/tags/{tag}/stats
# ============================================================
def test_tag_stats():
    log("=== Testing GET /api/tags/{tag}/stats ===")
    
    # Test with lisboa tag
    resp = requests.get(f"{BASE_URL}/tags/lisboa/stats")
    if resp.status_code != 200:
        test_result("Tag stats", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    data = resp.json()
    
    # Verify structure
    required_fields = ["tag", "total", "posts_week", "posts_prev_week", "unique_authors", 
                      "likes_week", "velocity", "is_city", "city_label", "related"]
    for field in required_fields:
        if field not in data:
            test_result(f"Tag stats - {field}", False, f"Missing field: {field}")
            return
    
    # Verify is_city for lisboa
    if not data["is_city"]:
        test_result("Tag stats - is_city", False, "Expected is_city=True for lisboa")
        return
    
    # Verify related is a list
    if not isinstance(data["related"], list):
        test_result("Tag stats - related type", False, "Expected list for related")
        return
    
    test_result("Tag stats", True, "Tag stats endpoint works")

# ============================================================
# Test: Bookmark Collections CRUD
# ============================================================
def test_bookmark_collections():
    log("=== Testing Bookmark Collections ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Bookmark collections - login", False, "Failed to login")
        return
    
    # Create collection 1
    resp = requests.post(f"{BASE_URL}/bookmark-collections",
        headers=headers_with_token(token),
        json={"name": "Coleção Teste 1"}
    )
    
    if resp.status_code != 200:
        test_result("Bookmark collections - create 1", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    collection1 = resp.json()
    collection1_id = collection1["id"]
    
    # Create collection 2
    resp = requests.post(f"{BASE_URL}/bookmark-collections",
        headers=headers_with_token(token),
        json={"name": "Coleção Teste 2"}
    )
    
    if resp.status_code != 200:
        test_result("Bookmark collections - create 2", False, f"Status {resp.status_code}")
        return
    
    collection2_id = resp.json()["id"]
    
    # List collections
    resp = requests.get(f"{BASE_URL}/bookmark-collections", headers=headers_with_token(token))
    if resp.status_code != 200:
        test_result("Bookmark collections - list", False, f"Status {resp.status_code}")
        return
    
    collections = resp.json()
    if len(collections) < 2:
        test_result("Bookmark collections - count", False, f"Expected at least 2 collections")
        return
    
    # Rename collection 1
    resp = requests.patch(f"{BASE_URL}/bookmark-collections/{collection1_id}",
        headers=headers_with_token(token),
        json={"name": "Coleção Renomeada"}
    )
    
    if resp.status_code != 200:
        test_result("Bookmark collections - rename", False, f"Status {resp.status_code}")
        return
    
    # Create a post to bookmark
    resp = requests.post(f"{BASE_URL}/posts",
        headers=headers_with_token(token),
        json={"content": "Post para bookmark"}
    )
    
    if resp.status_code != 200:
        test_result("Bookmark collections - create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    # Move post to collection 1
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/collection",
        headers=headers_with_token(token),
        json={"collection_id": collection1_id}
    )
    
    if resp.status_code != 200:
        test_result("Bookmark collections - move to collection", False, f"Status {resp.status_code}")
        return
    
    # Get bookmarks filtered by collection
    resp = requests.get(f"{BASE_URL}/posts/bookmarks?collection={collection1_id}",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Bookmark collections - filter by collection", False, f"Status {resp.status_code}")
        return
    
    bookmarks = resp.json()
    if not any(p["id"] == post_id for p in bookmarks):
        test_result("Bookmark collections - post in collection", False, "Post should be in collection")
        return
    
    # Move to null (uncategorized)
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/collection",
        headers=headers_with_token(token),
        json={"collection_id": None}
    )
    
    if resp.status_code != 200:
        test_result("Bookmark collections - move to uncategorized", False, f"Status {resp.status_code}")
        return
    
    # Get uncategorized bookmarks
    resp = requests.get(f"{BASE_URL}/posts/bookmarks?collection=uncategorized",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Bookmark collections - uncategorized", False, f"Status {resp.status_code}")
        return
    
    # Delete collection
    resp = requests.delete(f"{BASE_URL}/bookmark-collections/{collection2_id}",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Bookmark collections - delete", False, f"Status {resp.status_code}")
        return
    
    test_result("Bookmark collections", True, "All collection operations work")

# ============================================================
# Test: Community with category
# ============================================================
def test_community_category():
    log("=== Testing Community with category ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Community category - login", False, "Failed to login")
        return
    
    # Create community with category
    resp = requests.post(f"{BASE_URL}/communities",
        headers=headers_with_token(token),
        json={
            "name": "Tasca Teste",
            "description": "Uma tasca virtual",
            "category": "tasca"
        }
    )
    
    if resp.status_code != 200:
        test_result("Community category - create", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    community = resp.json()
    
    # Verify category field
    if community.get("category") != "tasca":
        test_result("Community category - field", False, f"Expected category='tasca', got '{community.get('category')}'")
        return
    
    test_result("Community category", True, "Community category works")

# ============================================================
# Test: GET /api/communities/{slug}/members
# ============================================================
def test_community_members():
    log("=== Testing GET /api/communities/{slug}/members ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Community members - login", False, "Failed to login")
        return
    
    # Create a community
    resp = requests.post(f"{BASE_URL}/communities",
        headers=headers_with_token(token),
        json={"name": "Comunidade Membros Teste", "category": "outras"}
    )
    
    if resp.status_code != 200:
        test_result("Community members - create", False, f"Status {resp.status_code}")
        return
    
    slug = resp.json()["slug"]
    
    # Get members
    resp = requests.get(f"{BASE_URL}/communities/{slug}/members")
    if resp.status_code != 200:
        test_result("Community members - get", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    members = resp.json()
    if not isinstance(members, list):
        test_result("Community members - type", False, "Expected list")
        return
    
    # Verify structure if members exist
    if len(members) > 0:
        member = members[0]
        required_fields = ["id", "username", "posts_in_community", "likes_in_community", "is_owner"]
        for field in required_fields:
            if field not in member:
                test_result(f"Community members - {field}", False, f"Missing field: {field}")
                return
    
    test_result("Community members", True, "Community members endpoint works")

# ============================================================
# Test: GET /api/communities/{slug}/stats
# ============================================================
def test_community_stats():
    log("=== Testing GET /api/communities/{slug}/stats ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Community stats - login", False, "Failed to login")
        return
    
    # Create a community
    resp = requests.post(f"{BASE_URL}/communities",
        headers=headers_with_token(token),
        json={"name": "Comunidade Stats Teste", "category": "outras"}
    )
    
    if resp.status_code != 200:
        test_result("Community stats - create", False, f"Status {resp.status_code}")
        return
    
    slug = resp.json()["slug"]
    
    # Get stats
    resp = requests.get(f"{BASE_URL}/communities/{slug}/stats")
    if resp.status_code != 200:
        test_result("Community stats - get", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    stats = resp.json()
    
    # Verify structure
    required_fields = ["members_count", "total_posts", "posts_week", "posts_prev_week", 
                      "likes_week", "unique_authors_week", "velocity", "by_day"]
    for field in required_fields:
        if field not in stats:
            test_result(f"Community stats - {field}", False, f"Missing field: {field}")
            return
    
    # Verify by_day is a list of 7 days
    if not isinstance(stats["by_day"], list) or len(stats["by_day"]) != 7:
        test_result("Community stats - by_day", False, "Expected by_day to be list of 7 days")
        return
    
    test_result("Community stats", True, "Community stats endpoint works")

# ============================================================
# Test: Event with category
# ============================================================
def test_event_category():
    log("=== Testing Event with category ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Event category - login", False, "Failed to login")
        return
    
    # Create event with category
    future_time = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    resp = requests.post(f"{BASE_URL}/events",
        headers=headers_with_token(token),
        json={
            "title": "Concerto Teste",
            "description": "Um concerto de teste",
            "location": "Lisboa",
            "starts_at": future_time,
            "category": "concerto"
        }
    )
    
    if resp.status_code != 200:
        test_result("Event category - create", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    event = resp.json()
    
    # Verify category field
    if event.get("category") != "concerto":
        test_result("Event category - field", False, f"Expected category='concerto', got '{event.get('category')}'")
        return
    
    test_result("Event category", True, "Event category works")

# ============================================================
# Test: GET /api/events with filters
# ============================================================
def test_event_filters():
    log("=== Testing GET /api/events with filters ===")
    
    # Test with category filter
    resp = requests.get(f"{BASE_URL}/events?category=concerto&when=upcoming")
    if resp.status_code != 200:
        test_result("Event filters", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    events = resp.json()
    if not isinstance(events, list):
        test_result("Event filters - type", False, "Expected list")
        return
    
    # Test without filters (sanity check)
    resp = requests.get(f"{BASE_URL}/events")
    if resp.status_code != 200:
        test_result("Event filters - no params", False, f"Status {resp.status_code}")
        return
    
    test_result("Event filters", True, "Event category and when filters work")

# ============================================================
# Test: Notifications star/snooze/delete
# ============================================================
def test_notifications_actions():
    log("=== Testing Notifications actions ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Notifications actions - login", False, "Failed to login")
        return
    
    # Get notifications
    resp = requests.get(f"{BASE_URL}/notifications", headers=headers_with_token(token))
    if resp.status_code != 200:
        test_result("Notifications actions - get", False, f"Status {resp.status_code}")
        return
    
    notifications = resp.json()
    
    # Verify starred and snoozed_until fields exist
    if len(notifications) > 0:
        notif = notifications[0]
        if "starred" not in notif or "snoozed_until" not in notif:
            test_result("Notifications actions - fields", False, "Missing starred or snoozed_until fields")
            return
        
        notif_id = notif["id"]
        
        # Test star toggle
        resp = requests.post(f"{BASE_URL}/notifications/{notif_id}/star",
            headers=headers_with_token(token)
        )
        
        if resp.status_code != 200:
            test_result("Notifications actions - star", False, f"Status {resp.status_code}")
            return
        
        star_result = resp.json()
        if "starred" not in star_result:
            test_result("Notifications actions - star result", False, "Missing starred field in response")
            return
        
        # Test snooze
        resp = requests.post(f"{BASE_URL}/notifications/{notif_id}/snooze",
            headers=headers_with_token(token),
            json={"hours": 1}
        )
        
        if resp.status_code != 200:
            test_result("Notifications actions - snooze", False, f"Status {resp.status_code}")
            return
        
        snooze_result = resp.json()
        if "snoozed_until" not in snooze_result:
            test_result("Notifications actions - snooze result", False, "Missing snoozed_until field")
            return
        
        # Test delete single notification
        resp = requests.delete(f"{BASE_URL}/notifications/{notif_id}",
            headers=headers_with_token(token)
        )
        
        if resp.status_code != 200:
            test_result("Notifications actions - delete single", False, f"Status {resp.status_code}")
            return
    
    # Test clear all read notifications
    resp = requests.delete(f"{BASE_URL}/notifications", headers=headers_with_token(token))
    if resp.status_code != 200:
        test_result("Notifications actions - clear all", False, f"Status {resp.status_code}")
        return
    
    test_result("Notifications actions", True, "Star, snooze, and delete work")

# ============================================================
# Test: Conversations pin/archive
# ============================================================
def test_conversations_actions():
    log("=== Testing Conversations pin/archive ===")
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        test_result("Conversations actions - admin login", False, "Failed to login")
        return
    
    # Create a second user
    random_suffix = str(uuid.uuid4())[:8]
    user2_email = f"user2conv_{random_suffix}@vermillion.app"
    user2_username = f"user2conv_{random_suffix}"
    user2_token = register_user(user2_email, "Test1234!", user2_username, "User Two Conv")
    
    if not user2_token:
        test_result("Conversations actions - user2 register", False, "Failed to register user2")
        return
    
    # Get user2 info
    resp = requests.get(f"{BASE_URL}/auth/me", headers=headers_with_token(user2_token))
    if resp.status_code != 200:
        test_result("Conversations actions - get user2", False, f"Status {resp.status_code}")
        return
    
    user2_id = resp.json()["id"]
    
    # Admin sends message to user2
    resp = requests.post(f"{BASE_URL}/messages",
        headers=headers_with_token(admin_token),
        json={"to_user_id": user2_id, "content": "Test message"}
    )
    
    if resp.status_code != 200:
        test_result("Conversations actions - send message", False, f"Status {resp.status_code}")
        return
    
    # Get conversations (default filter=all)
    resp = requests.get(f"{BASE_URL}/conversations?filter=all", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Conversations actions - get all", False, f"Status {resp.status_code}")
        return
    
    conversations = resp.json()
    if len(conversations) == 0:
        test_result("Conversations actions - no conversations", False, "Expected at least one conversation")
        return
    
    # Verify pinned and archived fields
    conv = conversations[0]
    if "pinned" not in conv or "archived" not in conv:
        test_result("Conversations actions - fields", False, "Missing pinned or archived fields")
        return
    
    # Pin conversation
    resp = requests.post(f"{BASE_URL}/conversations/{user2_id}/pin",
        headers=headers_with_token(admin_token)
    )
    
    if resp.status_code != 200:
        test_result("Conversations actions - pin", False, f"Status {resp.status_code}")
        return
    
    pin_result = resp.json()
    if not pin_result.get("pinned"):
        test_result("Conversations actions - pin result", False, "Expected pinned=True")
        return
    
    # Get conversations again - should show pinned=true
    resp = requests.get(f"{BASE_URL}/conversations?filter=all", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Conversations actions - get after pin", False, f"Status {resp.status_code}")
        return
    
    conversations = resp.json()
    pinned_conv = next((c for c in conversations if c["other_user"]["id"] == user2_id), None)
    if not pinned_conv or not pinned_conv.get("pinned"):
        test_result("Conversations actions - verify pinned", False, "Conversation should be pinned")
        return
    
    # Verify pinned conversation is at top
    if conversations[0]["other_user"]["id"] != user2_id:
        test_result("Conversations actions - pinned at top", False, "Pinned conversation should be at top")
        return
    
    # Get pinned filter
    resp = requests.get(f"{BASE_URL}/conversations?filter=pinned", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Conversations actions - filter pinned", False, f"Status {resp.status_code}")
        return
    
    pinned_convs = resp.json()
    if not any(c["other_user"]["id"] == user2_id for c in pinned_convs):
        test_result("Conversations actions - in pinned filter", False, "Conversation should appear in pinned filter")
        return
    
    # Archive conversation
    resp = requests.post(f"{BASE_URL}/conversations/{user2_id}/archive",
        headers=headers_with_token(admin_token)
    )
    
    if resp.status_code != 200:
        test_result("Conversations actions - archive", False, f"Status {resp.status_code}")
        return
    
    # Get conversations with filter=all (should not include archived)
    resp = requests.get(f"{BASE_URL}/conversations?filter=all", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Conversations actions - get after archive", False, f"Status {resp.status_code}")
        return
    
    conversations = resp.json()
    if any(c["other_user"]["id"] == user2_id for c in conversations):
        test_result("Conversations actions - archived hidden from all", False, "Archived conversation should not appear in filter=all")
        return
    
    # Get archived filter
    resp = requests.get(f"{BASE_URL}/conversations?filter=archived", headers=headers_with_token(admin_token))
    if resp.status_code != 200:
        test_result("Conversations actions - filter archived", False, f"Status {resp.status_code}")
        return
    
    archived_convs = resp.json()
    if not any(c["other_user"]["id"] == user2_id for c in archived_convs):
        test_result("Conversations actions - in archived filter", False, "Conversation should appear in archived filter")
        return
    
    test_result("Conversations actions", True, "Pin and archive work correctly")

# ============================================================
# Test: POST /api/posts/{id}/share
# ============================================================
def test_post_share():
    log("=== Testing POST /api/posts/{id}/share ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Post share - login", False, "Failed to login")
        return
    
    # Create a post
    resp = requests.post(f"{BASE_URL}/posts",
        headers=headers_with_token(token),
        json={"content": "Post para partilhar"}
    )
    
    if resp.status_code != 200:
        test_result("Post share - create", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    initial_shares = resp.json().get("shares", 0)
    
    # Share the post
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/share",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Post share - share", False, f"Status {resp.status_code}: {resp.text}")
        return
    
    # Get the post again
    resp = requests.get(f"{BASE_URL}/posts/{post_id}")
    if resp.status_code != 200:
        test_result("Post share - get post", False, f"Status {resp.status_code}")
        return
    
    post = resp.json()
    if post.get("shares", 0) != initial_shares + 1:
        test_result("Post share - shares count", False, f"Expected shares={initial_shares + 1}, got {post.get('shares')}")
        return
    
    test_result("Post share", True, "Share counter works")

# ============================================================
# Test: Catalogue endpoints
# ============================================================
def test_catalogue():
    log("=== Testing Catalogue endpoints ===")
    
    # Test community categories
    resp = requests.get(f"{BASE_URL}/catalog/community-categories")
    if resp.status_code != 200:
        test_result("Catalogue - community categories", False, f"Status {resp.status_code}")
        return
    
    data = resp.json()
    if not isinstance(data, list) or len(data) == 0:
        test_result("Catalogue - community categories data", False, "Expected non-empty list")
        return
    
    # Test event categories
    resp = requests.get(f"{BASE_URL}/catalog/event-categories")
    if resp.status_code != 200:
        test_result("Catalogue - event categories", False, f"Status {resp.status_code}")
        return
    
    data = resp.json()
    if not isinstance(data, list) or len(data) == 0:
        test_result("Catalogue - event categories data", False, "Expected non-empty list")
        return
    
    # Test cities
    resp = requests.get(f"{BASE_URL}/catalog/cities")
    if resp.status_code != 200:
        test_result("Catalogue - cities", False, f"Status {resp.status_code}")
        return
    
    data = resp.json()
    if not isinstance(data, list) or len(data) == 0:
        test_result("Catalogue - cities data", False, "Expected non-empty list")
        return
    
    test_result("Catalogue", True, "All catalogue endpoints work")

# ============================================================
# Sanity checks for legacy endpoints
# ============================================================
def test_legacy_sanity():
    log("=== Testing Legacy Sanity Checks ===")
    
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        test_result("Legacy sanity - login", False, "Failed to login")
        return
    
    # Create simple post
    resp = requests.post(f"{BASE_URL}/posts",
        headers=headers_with_token(token),
        json={"content": "Simple legacy post"}
    )
    
    if resp.status_code != 200:
        test_result("Legacy sanity - create post", False, f"Status {resp.status_code}")
        return
    
    post_id = resp.json()["id"]
    
    # Like
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/like",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Legacy sanity - like", False, f"Status {resp.status_code}")
        return
    
    # Repost
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/repost",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Legacy sanity - repost", False, f"Status {resp.status_code}")
        return
    
    # Bookmark
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/bookmark",
        headers=headers_with_token(token)
    )
    
    if resp.status_code != 200:
        test_result("Legacy sanity - bookmark", False, f"Status {resp.status_code}")
        return
    
    # Comment
    resp = requests.post(f"{BASE_URL}/posts/{post_id}/comments",
        headers=headers_with_token(token),
        json={"content": "Legacy comment"}
    )
    
    if resp.status_code != 200:
        test_result("Legacy sanity - comment", False, f"Status {resp.status_code}")
        return
    
    # Feed without params
    resp = requests.get(f"{BASE_URL}/posts/feed", headers=headers_with_token(token))
    if resp.status_code != 200:
        test_result("Legacy sanity - feed", False, f"Status {resp.status_code}")
        return
    
    # Trending without params
    resp = requests.get(f"{BASE_URL}/trending")
    if resp.status_code != 200:
        test_result("Legacy sanity - trending", False, f"Status {resp.status_code}")
        return
    
    test_result("Legacy sanity", True, "All legacy endpoints still work")

# ============================================================
# Main test runner
# ============================================================
def main():
    log("=" * 60)
    log("Starting Fase 2 Backend Tests")
    log("=" * 60)
    
    try:
        # Trending endpoints
        test_trending()
        test_trending_pessoas()
        test_trending_comunidades()
        test_trending_cidades()
        
        # Explore endpoints
        test_explore_moods()
        test_explore_by_mood()
        test_explore_by_city()
        test_explore_people()
        
        # Feed/Explore filters
        test_feed_filters()
        test_explore_filters()
        
        # Enriched posts
        test_enriched_posts()
        
        # Profile extras
        test_user_badges()
        test_user_regions()
        
        # Tag stats
        test_tag_stats()
        
        # Bookmark collections
        test_bookmark_collections()
        
        # Communities
        test_community_category()
        test_community_members()
        test_community_stats()
        
        # Events
        test_event_category()
        test_event_filters()
        
        # Notifications
        test_notifications_actions()
        
        # Conversations
        test_conversations_actions()
        
        # Post share
        test_post_share()
        
        # Catalogue
        test_catalogue()
        
        # Legacy sanity checks
        test_legacy_sanity()
        
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
