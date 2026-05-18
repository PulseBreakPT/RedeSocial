#!/usr/bin/env python3
"""
Stories 2.0 Backend Test Suite
Comprehensive testing of all Stories endpoints as per review request
"""

import requests
import json
import base64
from typing import Optional, Dict, Any

# Backend URL from frontend/.env
BASE_URL = "https://create-spotlight.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@vermillion.app"
ADMIN_PASSWORD = "admin123"

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
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=json_data, timeout=30)
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

# Tiny base64 PNG (1x1 transparent pixel)
TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# Tiny base64 MP4 (minimal valid MP4)
TINY_MP4 = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAu1tZGF0AAACrQYF//+c3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1MiByMjg1NCBlOWE1OTAzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAA"

def test_01_admin_login():
    """Test 1: Admin login"""
    status, data, err = make_request("POST", "/auth/login", json_data={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if status == 200 and data:
        token = data.get("access_token") or data.get("token")
        if token:
            log_test("Test 1 - Admin Login", True, f"Status: {status}, Token received")
            return token
    
    log_test("Test 1 - Admin Login", False, f"Status: {status}, Error: {err or data}")
    return None

def test_02_get_second_user(admin_token: str):
    """Test 2: Get second user for multi-user flows"""
    # Try filipa.azul first
    status, data, err = make_request("POST", "/auth/login", json_data={
        "email": "filipa.azul",
        "password": "filipa123"
    })
    
    if status == 200 and data:
        token = data.get("access_token") or data.get("token")
        if token:
            log_test("Test 2 - Second User Login (filipa.azul)", True, f"Status: {status}")
            return token, data.get("user", {}).get("id"), data.get("user", {}).get("username")
    
    # Try creating tester2.story
    status, data, err = make_request("POST", "/auth/register", json_data={
        "email": "tester2.story@vermillion.app",
        "password": "Tester2!@",
        "username": "tester2story",
        "name": "Tester Two"
    })
    
    if status in [200, 201] and data:
        token = data.get("access_token") or data.get("token")
        if token:
            log_test("Test 2 - Second User Created (tester2story)", True, f"Status: {status}")
            return token, data.get("user", {}).get("id"), data.get("user", {}).get("username")
    
    log_test("Test 2 - Second User", False, f"Could not login or create second user. Status: {status}, Error: {err or data}")
    return None, None, None

def test_03_stories_catalog():
    """Test 3: GET /api/stories/catalog"""
    status, data, err = make_request("GET", "/stories/catalog")
    
    if status != 200:
        log_test("Test 3 - Stories Catalog", False, f"Status: {status}, Error: {err or data}")
        return False
    
    # Verify structure
    checks = []
    checks.append(("backgrounds" in data and isinstance(data["backgrounds"], list), "backgrounds list"))
    checks.append((len(data.get("backgrounds", [])) >= 12, "12+ backgrounds"))
    checks.append(("fonts" in data and isinstance(data["fonts"], list), "fonts list"))
    checks.append(("audiences" in data and isinstance(data["audiences"], list), "audiences list"))
    checks.append((len(data.get("audiences", [])) == 3, "3 audiences"))
    checks.append(("reactions" in data and isinstance(data["reactions"], list), "reactions list"))
    checks.append((len(data.get("reactions", [])) == 8, "8 reactions"))
    checks.append(("sticker_types" in data and isinstance(data["sticker_types"], list), "sticker_types list"))
    checks.append((len(data.get("sticker_types", [])) == 9, "9 sticker types"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("Test 3 - Stories Catalog", True, "All fields present and valid")
    else:
        log_test("Test 3 - Stories Catalog", False, f"Missing/invalid: {', '.join(failed_checks)}")
    
    return all_passed

def test_04_create_text_story(admin_token: str):
    """Test 4: POST /api/stories - TEXT story"""
    status, data, err = make_request("POST", "/stories", admin_token, json_data={
        "media_type": "text",
        "text_content": "Olá Vermillion",
        "background": "fado",
        "font_style": "neon",
        "text_color": "#ffffff",
        "audience": "everyone",
        "allow_replies": True,
        "allow_reactions": True
    })
    
    if status in [200, 201] and data and "id" in data:
        log_test("Test 4 - Create TEXT Story", True, f"Status: {status}, Story ID: {data['id']}")
        return data["id"]
    else:
        log_test("Test 4 - Create TEXT Story", False, f"Status: {status}, Error: {err or data}")
        return None

def test_05_verify_text_story_in_list(admin_token: str, story_id: str):
    """Test 5: Verify TEXT story appears in GET /api/stories"""
    status, data, err = make_request("GET", "/stories", admin_token)
    
    if status != 200:
        log_test("Test 5 - Verify TEXT Story in List", False, f"Status: {status}, Error: {err or data}")
        return False
    
    # Find admin's group
    admin_group = None
    for group in data:
        if group.get("author", {}).get("username") == "admin":
            admin_group = group
            break
    
    if not admin_group:
        log_test("Test 5 - Verify TEXT Story in List", False, "Admin's story group not found")
        return False
    
    # Find the story
    story = None
    for s in admin_group.get("stories", []):
        if s.get("id") == story_id:
            story = s
            break
    
    if not story:
        log_test("Test 5 - Verify TEXT Story in List", False, f"Story {story_id} not found in list")
        return False
    
    # Verify fields
    checks = []
    checks.append((story.get("media_type") == "text", "media_type=text"))
    checks.append((story.get("text_content") == "Olá Vermillion", "text_content correct"))
    checks.append((story.get("background") == "fado", "background=fado"))
    checks.append(("background_css" in story, "background_css populated"))
    checks.append((story.get("font_style") == "neon", "font_style=neon"))
    checks.append((story.get("audience") == "everyone", "audience=everyone"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("Test 5 - Verify TEXT Story in List", True, "All fields correct")
    else:
        log_test("Test 5 - Verify TEXT Story in List", False, f"Failed: {', '.join(failed_checks)}")
    
    return all_passed

def test_06_create_image_story_with_stickers(admin_token: str):
    """Test 6: POST /api/stories - IMAGE story with stickers (poll, question, slider)"""
    status, data, err = make_request("POST", "/stories", admin_token, json_data={
        "media_type": "image",
        "image": TINY_PNG,
        "caption": "Lisboa",
        "audience": "everyone",
        "allow_replies": True,
        "allow_reactions": True,
        "stickers": [
            {
                "type": "poll",
                "x": 0.5,
                "y": 0.6,
                "data": {
                    "question": "Sim ou não?",
                    "options": [
                        {"id": "a", "text": "Sim"},
                        {"id": "b", "text": "Não"}
                    ]
                }
            },
            {
                "type": "question",
                "x": 0.3,
                "y": 0.4,
                "data": {
                    "prompt": "Que tal?",
                    "placeholder": "Diz..."
                }
            },
            {
                "type": "slider",
                "x": 0.7,
                "y": 0.3,
                "data": {
                    "prompt": "Avalia",
                    "emoji": "🔥"
                }
            }
        ]
    })
    
    if status not in [200, 201] or not data or "id" not in data:
        log_test("Test 6 - Create IMAGE Story with Stickers", False, f"Status: {status}, Error: {err or data}")
        return None, None, None, None
    
    story_id = data["id"]
    
    # Verify in list
    status, list_data, err = make_request("GET", "/stories", admin_token)
    if status != 200:
        log_test("Test 6 - Create IMAGE Story with Stickers", False, f"Could not verify in list. Status: {status}")
        return story_id, None, None, None
    
    # Find the story
    story = None
    for group in list_data:
        for s in group.get("stories", []):
            if s.get("id") == story_id:
                story = s
                break
        if story:
            break
    
    if not story:
        log_test("Test 6 - Create IMAGE Story with Stickers", False, "Story not found in list")
        return story_id, None, None, None
    
    # Verify stickers
    stickers = story.get("stickers", [])
    if len(stickers) != 3:
        log_test("Test 6 - Create IMAGE Story with Stickers", False, f"Expected 3 stickers, got {len(stickers)}")
        return story_id, None, None, None
    
    poll_sticker = next((s for s in stickers if s.get("type") == "poll"), None)
    question_sticker = next((s for s in stickers if s.get("type") == "question"), None)
    slider_sticker = next((s for s in stickers if s.get("type") == "slider"), None)
    
    checks = []
    checks.append((poll_sticker is not None, "poll sticker exists"))
    checks.append((question_sticker is not None, "question sticker exists"))
    checks.append((slider_sticker is not None, "slider sticker exists"))
    
    if poll_sticker:
        poll_options = poll_sticker.get("data", {}).get("options", [])
        checks.append((len(poll_options) == 2, "poll has 2 options"))
        checks.append(("results" in poll_sticker, "poll has results field"))
    
    if question_sticker:
        checks.append(("answers_count" in question_sticker, "question has answers_count"))
    
    if slider_sticker:
        checks.append(("responses_count" in slider_sticker, "slider has responses_count"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("Test 6 - Create IMAGE Story with Stickers", True, "Story created with 3 stickers, all fields correct")
    else:
        log_test("Test 6 - Create IMAGE Story with Stickers", False, f"Failed: {', '.join(failed_checks)}")
    
    return (story_id, 
            poll_sticker.get("id") if poll_sticker else None,
            question_sticker.get("id") if question_sticker else None,
            slider_sticker.get("id") if slider_sticker else None)

def test_07_create_video_story_roda(admin_token: str):
    """Test 7: POST /api/stories - VIDEO story with audience=roda"""
    status, data, err = make_request("POST", "/stories", admin_token, json_data={
        "media_type": "video",
        "video": TINY_MP4,
        "caption": "Vídeo privado",
        "audience": "roda",
        "allow_replies": True,
        "allow_reactions": True
    })
    
    if status in [200, 201] and data and "id" in data:
        log_test("Test 7 - Create VIDEO Story (roda)", True, f"Status: {status}, Story ID: {data['id']}")
        return data["id"]
    else:
        log_test("Test 7 - Create VIDEO Story (roda)", False, f"Status: {status}, Error: {err or data}")
        return None

def test_08_visibility_roda_before_add(user2_token: str, video_story_id: str):
    """Test 8: Verify USER2 cannot see roda story before being added"""
    status, data, err = make_request("GET", "/stories", user2_token)
    
    if status != 200:
        log_test("Test 8 - Roda Visibility (before add)", False, f"Status: {status}, Error: {err or data}")
        return False
    
    # Check if video story is visible
    for group in data:
        for story in group.get("stories", []):
            if story.get("id") == video_story_id:
                log_test("Test 8 - Roda Visibility (before add)", False, "Roda story visible to non-roda user")
                return False
    
    log_test("Test 8 - Roda Visibility (before add)", True, "Roda story correctly hidden from non-roda user")
    return True

def test_09_add_user_to_roda(admin_token: str, user2_id: str):
    """Test 9: Add USER2 to admin's roda"""
    # Try POST /api/users/me/roda/{user_id}
    status, data, err = make_request("POST", f"/users/me/roda/{user2_id}", admin_token)
    
    if status in [200, 201]:
        log_test("Test 9 - Add User to Roda", True, f"Status: {status}")
        return True
    
    # Try alternative: PATCH /api/users/me with roda field
    status, data, err = make_request("PATCH", "/users/me", admin_token, json_data={
        "roda": [user2_id]
    })
    
    if status == 200:
        log_test("Test 9 - Add User to Roda (via PATCH)", True, f"Status: {status}")
        return True
    
    log_test("Test 9 - Add User to Roda", False, f"Could not add user to roda. Status: {status}, Error: {err or data}")
    return False

def test_10_visibility_roda_after_add(user2_token: str, video_story_id: str):
    """Test 10: Verify USER2 can see roda story after being added"""
    status, data, err = make_request("GET", "/stories", user2_token)
    
    if status != 200:
        log_test("Test 10 - Roda Visibility (after add)", False, f"Status: {status}, Error: {err or data}")
        return False
    
    # Check if video story is visible
    for group in data:
        for story in group.get("stories", []):
            if story.get("id") == video_story_id:
                log_test("Test 10 - Roda Visibility (after add)", True, "Roda story now visible to roda member")
                return True
    
    log_test("Test 10 - Roda Visibility (after add)", False, "Roda story still not visible after adding to roda")
    return False

def test_11_view_story(user2_token: str, story_id: str):
    """Test 11: POST /api/stories/{id}/view"""
    status, data, err = make_request("POST", f"/stories/{story_id}/view", user2_token)
    
    if status == 200 and data and data.get("ok"):
        log_test("Test 11 - View Story", True, f"Status: {status}")
        return True
    else:
        log_test("Test 11 - View Story", False, f"Status: {status}, Error: {err or data}")
        return False

def test_12_react_to_story(user2_token: str, story_id: str):
    """Test 12: POST /api/stories/{id}/react - toggle reaction"""
    # First reaction
    status, data, err = make_request("POST", f"/stories/{story_id}/react", user2_token, json_data={
        "emoji": "❤️"
    })
    
    if status != 200 or not data:
        log_test("Test 12 - React to Story", False, f"First reaction failed. Status: {status}, Error: {err or data}")
        return False
    
    if data.get("reaction") != "❤️":
        log_test("Test 12 - React to Story", False, f"Expected reaction='❤️', got {data.get('reaction')}")
        return False
    
    # Toggle off (same emoji)
    status, data, err = make_request("POST", f"/stories/{story_id}/react", user2_token, json_data={
        "emoji": "❤️"
    })
    
    if status != 200 or not data:
        log_test("Test 12 - React to Story", False, f"Toggle off failed. Status: {status}, Error: {err or data}")
        return False
    
    if data.get("reaction") is not None:
        log_test("Test 12 - React to Story", False, f"Expected reaction=null after toggle, got {data.get('reaction')}")
        return False
    
    # React again for later tests
    status, data, err = make_request("POST", f"/stories/{story_id}/react", user2_token, json_data={
        "emoji": "❤️"
    })
    
    log_test("Test 12 - React to Story", True, "Reaction toggle works correctly")
    return True

def test_13_react_invalid_emoji(user2_token: str, story_id: str):
    """Test 13: POST /api/stories/{id}/react with invalid emoji"""
    status, data, err = make_request("POST", f"/stories/{story_id}/react", user2_token, json_data={
        "emoji": "🦄"
    })
    
    if status == 400:
        log_test("Test 13 - React Invalid Emoji", True, f"Correctly rejected invalid emoji with 400")
        return True
    else:
        log_test("Test 13 - React Invalid Emoji", False, f"Expected 400, got {status}")
        return False

def test_14_reply_to_story(user2_token: str, story_id: str):
    """Test 14: POST /api/stories/{id}/reply"""
    status, data, err = make_request("POST", f"/stories/{story_id}/reply", user2_token, json_data={
        "content": "Adorei!"
    })
    
    if status == 200 and data and data.get("ok"):
        log_test("Test 14 - Reply to Story", True, f"Status: {status}, Message ID: {data.get('message_id')}")
        return True
    else:
        log_test("Test 14 - Reply to Story", False, f"Status: {status}, Error: {err or data}")
        return False

def test_15_poll_vote(user2_token: str, image_story_id: str, poll_sticker_id: str):
    """Test 15: POST /api/stories/{id}/poll-vote - vote and switch"""
    # Vote for option "a"
    status, data, err = make_request("POST", f"/stories/{image_story_id}/poll-vote", user2_token, json_data={
        "sticker_id": poll_sticker_id,
        "option_id": "a"
    })
    
    if status != 200 or not data or not data.get("ok"):
        log_test("Test 15 - Poll Vote", False, f"First vote failed. Status: {status}, Error: {err or data}")
        return False
    
    sticker = data.get("sticker", {})
    results = sticker.get("results", {})
    if results.get("viewer_vote") != "a":
        log_test("Test 15 - Poll Vote", False, f"Expected viewer_vote='a', got {results.get('viewer_vote')}")
        return False
    
    # Switch to option "b"
    status, data, err = make_request("POST", f"/stories/{image_story_id}/poll-vote", user2_token, json_data={
        "sticker_id": poll_sticker_id,
        "option_id": "b"
    })
    
    if status != 200 or not data or not data.get("ok"):
        log_test("Test 15 - Poll Vote", False, f"Vote switch failed. Status: {status}, Error: {err or data}")
        return False
    
    sticker = data.get("sticker", {})
    results = sticker.get("results", {})
    if results.get("viewer_vote") != "b":
        log_test("Test 15 - Poll Vote", False, f"Expected viewer_vote='b' after switch, got {results.get('viewer_vote')}")
        return False
    
    # Verify option "a" has 0 votes
    options = results.get("options", [])
    option_a = next((o for o in options if o.get("id") == "a"), None)
    if option_a and option_a.get("votes") != 0:
        log_test("Test 15 - Poll Vote", False, f"Expected option 'a' to have 0 votes, got {option_a.get('votes')}")
        return False
    
    log_test("Test 15 - Poll Vote", True, "Poll vote and switch works correctly")
    return True

def test_16_question_answer(user2_token: str, image_story_id: str, question_sticker_id: str):
    """Test 16: POST /api/stories/{id}/question-answer"""
    status, data, err = make_request("POST", f"/stories/{image_story_id}/question-answer", user2_token, json_data={
        "sticker_id": question_sticker_id,
        "content": "100% sim"
    })
    
    if status == 200 and data and data.get("ok"):
        log_test("Test 16 - Question Answer", True, f"Status: {status}")
        return True
    else:
        log_test("Test 16 - Question Answer", False, f"Status: {status}, Error: {err or data}")
        return False

def test_17_slider_response(user2_token: str, image_story_id: str, slider_sticker_id: str):
    """Test 17: POST /api/stories/{id}/slider-response"""
    status, data, err = make_request("POST", f"/stories/{image_story_id}/slider-response", user2_token, json_data={
        "sticker_id": slider_sticker_id,
        "value": 0.8
    })
    
    if status != 200 or not data or not data.get("ok"):
        log_test("Test 17 - Slider Response", False, f"Status: {status}, Error: {err or data}")
        return False
    
    sticker = data.get("sticker", {})
    average = sticker.get("average")
    if average is None or abs(average - 0.8) > 0.01:
        log_test("Test 17 - Slider Response", False, f"Expected average ~0.8, got {average}")
        return False
    
    log_test("Test 17 - Slider Response", True, f"Status: {status}, Average: {average}")
    return True

def test_18_viewers_list(admin_token: str, text_story_id: str):
    """Test 18: GET /api/stories/{id}/viewers (author-only)"""
    status, data, err = make_request("GET", f"/stories/{text_story_id}/viewers", admin_token)
    
    if status != 200:
        log_test("Test 18 - Viewers List (author)", False, f"Status: {status}, Error: {err or data}")
        return False
    
    checks = []
    checks.append(("viewers" in data, "viewers field"))
    checks.append(("total_views" in data, "total_views field"))
    checks.append(("reactions_breakdown" in data, "reactions_breakdown field"))
    checks.append((data.get("total_views", 0) >= 1, "at least 1 view"))
    
    # Check if USER2 is in viewers (if they viewed it)
    viewers = data.get("viewers", [])
    has_user2 = any(v.get("user", {}).get("username") in ["filipa.azul", "tester2story"] for v in viewers)
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("Test 18 - Viewers List (author)", True, f"Total views: {data.get('total_views')}, USER2 present: {has_user2}")
    else:
        log_test("Test 18 - Viewers List (author)", False, f"Failed: {', '.join(failed_checks)}")
    
    return all_passed

def test_19_viewers_list_non_author(user2_token: str, text_story_id: str):
    """Test 19: GET /api/stories/{id}/viewers (non-author should get 403)"""
    status, data, err = make_request("GET", f"/stories/{text_story_id}/viewers", user2_token)
    
    if status == 403:
        log_test("Test 19 - Viewers List (non-author)", True, "Correctly rejected with 403")
        return True
    else:
        log_test("Test 19 - Viewers List (non-author)", False, f"Expected 403, got {status}")
        return False

def test_20_replies_list(admin_token: str, text_story_id: str):
    """Test 20: GET /api/stories/{id}/replies (author-only)"""
    status, data, err = make_request("GET", f"/stories/{text_story_id}/replies", admin_token)
    
    if status != 200:
        log_test("Test 20 - Replies List (author)", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if not isinstance(data, list):
        log_test("Test 20 - Replies List (author)", False, f"Expected list, got {type(data)}")
        return False
    
    # Check if USER2's reply is present
    has_reply = any(r.get("content") == "Adorei!" for r in data)
    
    if has_reply:
        log_test("Test 20 - Replies List (author)", True, f"Found USER2's reply in {len(data)} replies")
    else:
        log_test("Test 20 - Replies List (author)", False, f"USER2's reply not found in {len(data)} replies")
    
    return has_reply

def test_21_sticker_responders_poll(admin_token: str, image_story_id: str, poll_sticker_id: str):
    """Test 21: GET /api/stories/{id}/sticker/{sticker_id}/responders (poll)"""
    status, data, err = make_request("GET", f"/stories/{image_story_id}/sticker/{poll_sticker_id}/responders", admin_token)
    
    if status != 200:
        log_test("Test 21 - Sticker Responders (poll)", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if data.get("type") != "poll":
        log_test("Test 21 - Sticker Responders (poll)", False, f"Expected type='poll', got {data.get('type')}")
        return False
    
    results = data.get("results", [])
    if not isinstance(results, list):
        log_test("Test 21 - Sticker Responders (poll)", False, "results is not a list")
        return False
    
    log_test("Test 21 - Sticker Responders (poll)", True, f"Got {len(results)} options with responders")
    return True

def test_22_sticker_responders_question(admin_token: str, image_story_id: str, question_sticker_id: str):
    """Test 22: GET /api/stories/{id}/sticker/{sticker_id}/responders (question)"""
    status, data, err = make_request("GET", f"/stories/{image_story_id}/sticker/{question_sticker_id}/responders", admin_token)
    
    if status != 200:
        log_test("Test 22 - Sticker Responders (question)", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if data.get("type") != "question":
        log_test("Test 22 - Sticker Responders (question)", False, f"Expected type='question', got {data.get('type')}")
        return False
    
    answers = data.get("answers", [])
    has_answer = any(a.get("content") == "100% sim" for a in answers)
    
    if has_answer:
        log_test("Test 22 - Sticker Responders (question)", True, f"Found USER2's answer in {len(answers)} answers")
    else:
        log_test("Test 22 - Sticker Responders (question)", False, f"USER2's answer not found in {len(answers)} answers")
    
    return has_answer

def test_23_sticker_responders_slider(admin_token: str, image_story_id: str, slider_sticker_id: str):
    """Test 23: GET /api/stories/{id}/sticker/{sticker_id}/responders (slider)"""
    status, data, err = make_request("GET", f"/stories/{image_story_id}/sticker/{slider_sticker_id}/responders", admin_token)
    
    if status != 200:
        log_test("Test 23 - Sticker Responders (slider)", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if data.get("type") != "slider":
        log_test("Test 23 - Sticker Responders (slider)", False, f"Expected type='slider', got {data.get('type')}")
        return False
    
    responses = data.get("responses", [])
    has_response = any(abs(r.get("value", 0) - 0.8) < 0.01 for r in responses)
    
    if has_response:
        log_test("Test 23 - Sticker Responders (slider)", True, f"Found USER2's response in {len(responses)} responses")
    else:
        log_test("Test 23 - Sticker Responders (slider)", False, f"USER2's response not found in {len(responses)} responses")
    
    return has_response

def test_24_allow_reactions_false(admin_token: str, user2_token: str):
    """Test 24: Create story with allow_reactions=false, verify POST /react returns 400"""
    # Create story
    status, data, err = make_request("POST", "/stories", admin_token, json_data={
        "media_type": "text",
        "text_content": "Sem reações",
        "background": "coral",
        "allow_reactions": False,
        "allow_replies": True
    })
    
    if status not in [200, 201] or not data or "id" not in data:
        log_test("Test 24 - Allow Reactions False", False, f"Story creation failed. Status: {status}")
        return False
    
    story_id = data["id"]
    
    # Try to react
    status, data, err = make_request("POST", f"/stories/{story_id}/react", user2_token, json_data={
        "emoji": "❤️"
    })
    
    if status == 400:
        log_test("Test 24 - Allow Reactions False", True, "Correctly rejected reaction with 400")
        return True
    else:
        log_test("Test 24 - Allow Reactions False", False, f"Expected 400, got {status}")
        return False

def test_25_allow_replies_false(admin_token: str, user2_token: str):
    """Test 25: Create story with allow_replies=false, verify POST /reply returns 400"""
    # Create story
    status, data, err = make_request("POST", "/stories", admin_token, json_data={
        "media_type": "text",
        "text_content": "Sem respostas",
        "background": "ocean",
        "allow_reactions": True,
        "allow_replies": False
    })
    
    if status not in [200, 201] or not data or "id" not in data:
        log_test("Test 25 - Allow Replies False", False, f"Story creation failed. Status: {status}")
        return False
    
    story_id = data["id"]
    
    # Try to reply
    status, data, err = make_request("POST", f"/stories/{story_id}/reply", user2_token, json_data={
        "content": "Tentando responder"
    })
    
    if status == 400:
        log_test("Test 25 - Allow Replies False", True, "Correctly rejected reply with 400")
        return True
    else:
        log_test("Test 25 - Allow Replies False", False, f"Expected 400, got {status}")
        return False

def test_26_reply_to_own_story(admin_token: str):
    """Test 26: Reply to own story should return 400"""
    # Create story
    status, data, err = make_request("POST", "/stories", admin_token, json_data={
        "media_type": "text",
        "text_content": "Meu story",
        "background": "dusk"
    })
    
    if status not in [200, 201] or not data or "id" not in data:
        log_test("Test 26 - Reply to Own Story", False, f"Story creation failed. Status: {status}")
        return False
    
    story_id = data["id"]
    
    # Try to reply to own story
    status, data, err = make_request("POST", f"/stories/{story_id}/reply", admin_token, json_data={
        "content": "Respondendo a mim mesmo"
    })
    
    if status == 400:
        log_test("Test 26 - Reply to Own Story", True, "Correctly rejected self-reply with 400")
        return True
    else:
        log_test("Test 26 - Reply to Own Story", False, f"Expected 400, got {status}")
        return False

def test_27_mute_author(user2_token: str, user2_id: str, admin_token: str):
    """Test 27: POST /api/users/me/stories-mute/{author_id} - mute and verify stories disappear"""
    # Get admin's user ID
    status, data, err = make_request("GET", "/users/admin", user2_token)
    if status != 200:
        log_test("Test 27 - Mute Author", False, f"Could not get admin profile. Status: {status}")
        return False
    
    admin_id = data.get("id")
    
    # Mute admin
    status, data, err = make_request("POST", f"/users/me/stories-mute/{admin_id}", user2_token)
    
    if status != 200 or not data:
        log_test("Test 27 - Mute Author", False, f"Mute failed. Status: {status}, Error: {err or data}")
        return False
    
    if data.get("action") != "muted":
        log_test("Test 27 - Mute Author", False, f"Expected action='muted', got {data.get('action')}")
        return False
    
    # Verify admin's stories don't appear
    status, list_data, err = make_request("GET", "/stories", user2_token)
    if status != 200:
        log_test("Test 27 - Mute Author", False, f"Could not get stories. Status: {status}")
        return False
    
    admin_stories_visible = any(g.get("author", {}).get("username") == "admin" for g in list_data)
    
    if admin_stories_visible:
        log_test("Test 27 - Mute Author", False, "Admin's stories still visible after mute")
        return False
    
    # Unmute
    status, data, err = make_request("POST", f"/users/me/stories-mute/{admin_id}", user2_token)
    
    if status != 200 or data.get("action") != "unmuted":
        log_test("Test 27 - Mute Author", False, f"Unmute failed. Status: {status}")
        return False
    
    # Verify stories reappear
    status, list_data, err = make_request("GET", "/stories", user2_token)
    admin_stories_visible = any(g.get("author", {}).get("username") == "admin" for g in list_data)
    
    if not admin_stories_visible:
        log_test("Test 27 - Mute Author", False, "Admin's stories not visible after unmute")
        return False
    
    log_test("Test 27 - Mute Author", True, "Mute/unmute works correctly")
    return True

def test_28_archive(admin_token: str):
    """Test 28: GET /api/stories/archive"""
    status, data, err = make_request("GET", "/stories/archive", admin_token)
    
    if status != 200:
        log_test("Test 28 - Archive", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if not isinstance(data, list):
        log_test("Test 28 - Archive", False, f"Expected list, got {type(data)}")
        return False
    
    if len(data) == 0:
        log_test("Test 28 - Archive", True, "Archive endpoint works (empty, no expired stories)")
    else:
        log_test("Test 28 - Archive", True, f"Archive endpoint works, returned {len(data)} stories")
    
    return True

def test_29_create_highlight(admin_token: str, text_story_id: str, image_story_id: str):
    """Test 29: POST /api/highlights"""
    status, data, err = make_request("POST", "/highlights", admin_token, json_data={
        "title": "Lisboa 2025",
        "story_ids": [text_story_id, image_story_id],
        "cover": text_story_id
    })
    
    if status not in [200, 201] or not data or "id" not in data:
        log_test("Test 29 - Create Highlight", False, f"Status: {status}, Error: {err or data}")
        return None
    
    highlight_id = data["id"]
    
    checks = []
    checks.append((data.get("title") == "Lisboa 2025", "title correct"))
    checks.append((len(data.get("story_ids", [])) == 2, "2 stories"))
    checks.append((data.get("cover") == text_story_id, "cover set"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("Test 29 - Create Highlight", True, f"Highlight ID: {highlight_id}")
    else:
        log_test("Test 29 - Create Highlight", False, f"Failed: {', '.join(failed_checks)}")
    
    return highlight_id if all_passed else None

def test_30_get_user_highlights(admin_token: str, highlight_id: str):
    """Test 30: GET /api/users/admin/highlights"""
    status, data, err = make_request("GET", "/users/admin/highlights")
    
    if status != 200:
        log_test("Test 30 - Get User Highlights", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if not isinstance(data, list):
        log_test("Test 30 - Get User Highlights", False, f"Expected list, got {type(data)}")
        return False
    
    # Find our highlight
    highlight = next((h for h in data if h.get("id") == highlight_id), None)
    
    if not highlight:
        log_test("Test 30 - Get User Highlights", False, f"Highlight {highlight_id} not found")
        return False
    
    checks = []
    checks.append(("cover_resolved" in highlight, "cover_resolved present"))
    checks.append(("stories_count" in highlight, "stories_count present"))
    
    if "cover_resolved" in highlight:
        cover = highlight["cover_resolved"]
        checks.append(("media_type" in cover, "cover has media_type"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("Test 30 - Get User Highlights", True, f"Found highlight with cover_resolved")
    else:
        log_test("Test 30 - Get User Highlights", False, f"Failed: {', '.join(failed_checks)}")
    
    return all_passed

def test_31_get_highlight_detail(admin_token: str, highlight_id: str):
    """Test 31: GET /api/highlights/{id}"""
    status, data, err = make_request("GET", f"/highlights/{highlight_id}", admin_token)
    
    if status != 200:
        log_test("Test 31 - Get Highlight Detail", False, f"Status: {status}, Error: {err or data}")
        return False
    
    checks = []
    checks.append(("highlight" in data, "highlight field"))
    checks.append(("stories" in data, "stories field"))
    checks.append(("owner" in data, "owner field"))
    
    if "stories" in data:
        checks.append((isinstance(data["stories"], list), "stories is list"))
        checks.append((len(data["stories"]) == 2, "2 stories"))
    
    all_passed = all(check[0] for check in checks)
    failed_checks = [check[1] for check in checks if not check[0]]
    
    if all_passed:
        log_test("Test 31 - Get Highlight Detail", True, "All fields present")
    else:
        log_test("Test 31 - Get Highlight Detail", False, f"Failed: {', '.join(failed_checks)}")
    
    return all_passed

def test_32_update_highlight(admin_token: str, highlight_id: str):
    """Test 32: PATCH /api/highlights/{id}"""
    status, data, err = make_request("PATCH", f"/highlights/{highlight_id}", admin_token, json_data={
        "title": "Lx 2025"
    })
    
    if status != 200:
        log_test("Test 32 - Update Highlight", False, f"Status: {status}, Error: {err or data}")
        return False
    
    if data.get("title") != "Lx 2025":
        log_test("Test 32 - Update Highlight", False, f"Expected title='Lx 2025', got {data.get('title')}")
        return False
    
    log_test("Test 32 - Update Highlight", True, "Title updated successfully")
    return True

def test_33_add_story_to_highlight(admin_token: str, highlight_id: str, video_story_id: str):
    """Test 33: POST /api/highlights/{id}/stories/{story_id}"""
    status, data, err = make_request("POST", f"/highlights/{highlight_id}/stories/{video_story_id}", admin_token)
    
    if status != 200:
        log_test("Test 33 - Add Story to Highlight", False, f"Status: {status}, Error: {err or data}")
        return False
    
    story_ids = data.get("story_ids", [])
    if video_story_id not in story_ids:
        log_test("Test 33 - Add Story to Highlight", False, f"Story {video_story_id} not in story_ids")
        return False
    
    log_test("Test 33 - Add Story to Highlight", True, f"Story added, total: {len(story_ids)}")
    return True

def test_34_remove_story_from_highlight(admin_token: str, highlight_id: str, video_story_id: str):
    """Test 34: DELETE /api/highlights/{id}/stories/{story_id}"""
    status, data, err = make_request("DELETE", f"/highlights/{highlight_id}/stories/{video_story_id}", admin_token)
    
    if status != 200:
        log_test("Test 34 - Remove Story from Highlight", False, f"Status: {status}, Error: {err or data}")
        return False
    
    story_ids = data.get("story_ids", [])
    if video_story_id in story_ids:
        log_test("Test 34 - Remove Story from Highlight", False, f"Story {video_story_id} still in story_ids")
        return False
    
    log_test("Test 34 - Remove Story from Highlight", True, f"Story removed, remaining: {len(story_ids)}")
    return True

def test_35_delete_highlight(admin_token: str, highlight_id: str):
    """Test 35: DELETE /api/highlights/{id}"""
    status, data, err = make_request("DELETE", f"/highlights/{highlight_id}", admin_token)
    
    if status != 200:
        log_test("Test 35 - Delete Highlight", False, f"Status: {status}, Error: {err or data}")
        return False
    
    # Verify it's gone
    status, data, err = make_request("GET", f"/highlights/{highlight_id}", admin_token)
    
    if status == 404:
        log_test("Test 35 - Delete Highlight", True, "Highlight deleted, GET returns 404")
        return True
    else:
        log_test("Test 35 - Delete Highlight", False, f"Expected 404 after delete, got {status}")
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("STORIES 2.0 BACKEND TEST SUITE")
    print("=" * 80)
    print()
    
    # Test 1: Admin login
    admin_token = test_01_admin_login()
    if not admin_token:
        print("\n❌ CRITICAL: Admin login failed. Cannot continue.")
        return
    
    # Test 2: Get second user
    user2_token, user2_id, user2_username = test_02_get_second_user(admin_token)
    if not user2_token:
        print("\n❌ CRITICAL: Could not get second user. Cannot continue multi-user tests.")
        # Continue with single-user tests
    
    # Test 3: Stories catalog
    test_03_stories_catalog()
    
    # Test 4-5: Create and verify TEXT story
    text_story_id = test_04_create_text_story(admin_token)
    if text_story_id:
        test_05_verify_text_story_in_list(admin_token, text_story_id)
    
    # Test 6: Create IMAGE story with stickers
    image_story_id, poll_sticker_id, question_sticker_id, slider_sticker_id = test_06_create_image_story_with_stickers(admin_token)
    
    # Test 7: Create VIDEO story with roda audience
    video_story_id = test_07_create_video_story_roda(admin_token)
    
    # Multi-user tests
    if user2_token and video_story_id:
        # Test 8-10: Roda visibility
        test_08_visibility_roda_before_add(user2_token, video_story_id)
        if user2_id:
            test_09_add_user_to_roda(admin_token, user2_id)
            test_10_visibility_roda_after_add(user2_token, video_story_id)
        
        # Test 11-17: Interactions
        if text_story_id:
            test_11_view_story(user2_token, text_story_id)
            test_12_react_to_story(user2_token, text_story_id)
            test_13_react_invalid_emoji(user2_token, text_story_id)
            test_14_reply_to_story(user2_token, text_story_id)
        
        if image_story_id and poll_sticker_id and question_sticker_id and slider_sticker_id:
            test_15_poll_vote(user2_token, image_story_id, poll_sticker_id)
            test_16_question_answer(user2_token, image_story_id, question_sticker_id)
            test_17_slider_response(user2_token, image_story_id, slider_sticker_id)
        
        # Test 18-23: Author-only endpoints
        if text_story_id:
            test_18_viewers_list(admin_token, text_story_id)
            test_19_viewers_list_non_author(user2_token, text_story_id)
            test_20_replies_list(admin_token, text_story_id)
        
        if image_story_id and poll_sticker_id and question_sticker_id and slider_sticker_id:
            test_21_sticker_responders_poll(admin_token, image_story_id, poll_sticker_id)
            test_22_sticker_responders_question(admin_token, image_story_id, question_sticker_id)
            test_23_sticker_responders_slider(admin_token, image_story_id, slider_sticker_id)
        
        # Test 24-26: Allow flags
        test_24_allow_reactions_false(admin_token, user2_token)
        test_25_allow_replies_false(admin_token, user2_token)
        test_26_reply_to_own_story(admin_token)
        
        # Test 27: Mute
        if user2_id:
            test_27_mute_author(user2_token, user2_id, admin_token)
    
    # Test 28: Archive
    test_28_archive(admin_token)
    
    # Test 29-35: Highlights
    if text_story_id and image_story_id:
        highlight_id = test_29_create_highlight(admin_token, text_story_id, image_story_id)
        if highlight_id:
            test_30_get_user_highlights(admin_token, highlight_id)
            test_31_get_highlight_detail(admin_token, highlight_id)
            test_32_update_highlight(admin_token, highlight_id)
            if video_story_id:
                test_33_add_story_to_highlight(admin_token, highlight_id, video_story_id)
                test_34_remove_story_from_highlight(admin_token, highlight_id, video_story_id)
            test_35_delete_highlight(admin_token, highlight_id)
    
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
