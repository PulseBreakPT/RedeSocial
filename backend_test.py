#!/usr/bin/env python3
"""
Backend test suite for new changes:
1. One reaction per user enforcement on POST /api/posts/{post_id}/react (high priority)
2. POST /api/stories accepts optional caption_pos (medium priority)
3. Music/link sticker types are dropped at creation (low priority)
"""

import requests
import json
import base64
from typing import Optional

# Backend URL from frontend/.env
BASE_URL = "https://moderation-hub-61.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@vermillion.app"
ADMIN_PASSWORD = "admin123"

# ALLOWED_REACTIONS from backend
ALLOWED_REACTIONS = ["saudade", "comove", "tasca", "bombou", "cafe", "orgulho"]


class TestRunner:
    def __init__(self):
        self.token = None
        self.passed = 0
        self.failed = 0
        self.test_results = []

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        prefix = {
            "INFO": "ℹ️",
            "PASS": "✅",
            "FAIL": "❌",
            "WARN": "⚠️"
        }.get(level, "•")
        print(f"{prefix} {message}")

    def assert_equal(self, actual, expected, message: str):
        """Assert equality and track results"""
        if actual == expected:
            self.log(f"PASS: {message}", "PASS")
            self.passed += 1
            return True
        else:
            self.log(f"FAIL: {message} | Expected: {expected}, Got: {actual}", "FAIL")
            self.failed += 1
            return False

    def assert_true(self, condition: bool, message: str):
        """Assert true condition"""
        if condition:
            self.log(f"PASS: {message}", "PASS")
            self.passed += 1
            return True
        else:
            self.log(f"FAIL: {message}", "FAIL")
            self.failed += 1
            return False

    def assert_in(self, item, container, message: str):
        """Assert item in container"""
        if item in container:
            self.log(f"PASS: {message}", "PASS")
            self.passed += 1
            return True
        else:
            self.log(f"FAIL: {message} | {item} not in {container}", "FAIL")
            self.failed += 1
            return False

    def login(self) -> bool:
        """Login and get access token"""
        self.log("=" * 80)
        self.log("TEST SUITE: Backend Changes Validation")
        self.log("=" * 80)
        self.log(f"Logging in as {ADMIN_EMAIL}...")
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token") or data.get("access_token")
            if self.token:
                self.log(f"Login successful. Token: {self.token[:20]}...", "PASS")
                return True
            else:
                self.log(f"Login failed: No token in response", "FAIL")
                return False
        else:
            self.log(f"Login failed: {response.status_code} - {response.text}", "FAIL")
            return False

    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.token}"}

    def test_one_reaction_per_user(self):
        """
        Test 1: One reaction per user enforcement (HIGH PRIORITY)
        - Step A: React with 'saudade' → expect active:true, saudade.count incremented, reacted=true
        - Step B: React with 'bombou' → expect active:true, saudade.count decremented, bombou.count incremented
        - Step C: React with 'bombou' again → expect active:false, bombou.count decremented
        """
        self.log("\n" + "=" * 80)
        self.log("TEST 1: One Reaction Per User Enforcement (HIGH PRIORITY)")
        self.log("=" * 80)

        # Get or create a post
        self.log("Step 0: Getting or creating a test post...")
        feed_response = requests.get(
            f"{BASE_URL}/posts/feed",
            headers=self.get_headers()
        )
        
        post_id = None
        if feed_response.status_code == 200:
            posts = feed_response.json()
            if posts and len(posts) > 0:
                post_id = posts[0]["id"]
                self.log(f"Using existing post: {post_id}")
            else:
                # Create a new post
                create_response = requests.post(
                    f"{BASE_URL}/posts",
                    headers=self.get_headers(),
                    json={"content": "Test post for reaction testing"}
                )
                if create_response.status_code in [200, 201]:
                    post_id = create_response.json()["id"]
                    self.log(f"Created new post: {post_id}")
        
        if not post_id:
            self.log("Failed to get or create a post", "FAIL")
            self.failed += 1
            return

        # Step A: React with 'saudade'
        self.log("\nStep A: Reacting with 'saudade'...")
        react_a = requests.post(
            f"{BASE_URL}/posts/{post_id}/react",
            headers=self.get_headers(),
            json={"emoji": "saudade"}
        )
        
        if react_a.status_code == 200:
            data_a = react_a.json()
            self.log(f"Response: {json.dumps(data_a, indent=2)}")
            
            self.assert_true(data_a.get("active") == True, "Step A: active should be true")
            self.assert_equal(data_a.get("emoji"), "saudade", "Step A: emoji should be 'saudade'")
            
            reactions_a = data_a.get("reactions", {})
            saudade_a = reactions_a.get("saudade", {})
            self.assert_true(saudade_a.get("count", 0) >= 1, "Step A: saudade.count should be >= 1")
            self.assert_true(saudade_a.get("reacted") == True, "Step A: saudade.reacted should be true")
        else:
            self.log(f"Step A failed: {react_a.status_code} - {react_a.text}", "FAIL")
            self.failed += 1
            return

        # Step B: React with 'bombou' (should remove 'saudade' automatically)
        self.log("\nStep B: Switching reaction to 'bombou'...")
        react_b = requests.post(
            f"{BASE_URL}/posts/{post_id}/react",
            headers=self.get_headers(),
            json={"emoji": "bombou"}
        )
        
        if react_b.status_code == 200:
            data_b = react_b.json()
            self.log(f"Response: {json.dumps(data_b, indent=2)}")
            
            self.assert_true(data_b.get("active") == True, "Step B: active should be true")
            self.assert_equal(data_b.get("emoji"), "bombou", "Step B: emoji should be 'bombou'")
            
            reactions_b = data_b.get("reactions", {})
            
            # KEY TEST: saudade should be decremented (reacted=false)
            saudade_b = reactions_b.get("saudade", {})
            self.assert_true(saudade_b.get("reacted") == False, 
                           "Step B: saudade.reacted should be false (previous reaction removed)")
            
            # bombou should be incremented (reacted=true)
            bombou_b = reactions_b.get("bombou", {})
            self.assert_true(bombou_b.get("count", 0) >= 1, "Step B: bombou.count should be >= 1")
            self.assert_true(bombou_b.get("reacted") == True, "Step B: bombou.reacted should be true")
        else:
            self.log(f"Step B failed: {react_b.status_code} - {react_b.text}", "FAIL")
            self.failed += 1
            return

        # Step C: React with 'bombou' again (toggle off)
        self.log("\nStep C: Toggling off 'bombou' reaction...")
        react_c = requests.post(
            f"{BASE_URL}/posts/{post_id}/react",
            headers=self.get_headers(),
            json={"emoji": "bombou"}
        )
        
        if react_c.status_code == 200:
            data_c = react_c.json()
            self.log(f"Response: {json.dumps(data_c, indent=2)}")
            
            self.assert_true(data_c.get("active") == False, "Step C: active should be false (toggled off)")
            self.assert_equal(data_c.get("emoji"), "bombou", "Step C: emoji should be 'bombou'")
            
            reactions_c = data_c.get("reactions", {})
            bombou_c = reactions_c.get("bombou", {})
            self.assert_true(bombou_c.get("reacted") == False, 
                           "Step C: bombou.reacted should be false (toggled off)")
            
            # Verify user no longer appears in any reaction list
            all_reacted_false = all(
                not reactions_c.get(emoji, {}).get("reacted", False) 
                for emoji in ALLOWED_REACTIONS
            )
            self.assert_true(all_reacted_false, 
                           "Step C: User should not appear in any reaction list (all reacted=false)")
        else:
            self.log(f"Step C failed: {react_c.status_code} - {react_c.text}", "FAIL")
            self.failed += 1

    def test_caption_pos(self):
        """
        Test 2: POST /api/stories accepts optional caption_pos (MEDIUM PRIORITY)
        - Create story with caption_pos: {x:0.4, y:0.6}
        - Verify GET /api/stories returns caption_pos preserved
        - Test clamping: {x:1.5, y:-0.2} → {x:0.95, y:0.06}
        """
        self.log("\n" + "=" * 80)
        self.log("TEST 2: Stories caption_pos Support (MEDIUM PRIORITY)")
        self.log("=" * 80)

        # Small base64 PNG (1x1 transparent pixel)
        small_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        image_data = f"data:image/png;base64,{small_png}"

        # Test 2A: Normal caption_pos
        self.log("\nTest 2A: Creating story with caption_pos {x:0.4, y:0.6}...")
        story_payload_a = {
            "media_type": "image",
            "image": image_data,
            "caption": "Test caption",
            "caption_pos": {"x": 0.4, "y": 0.6}
        }
        
        create_a = requests.post(
            f"{BASE_URL}/stories",
            headers=self.get_headers(),
            json=story_payload_a
        )
        
        story_id_a = None
        if create_a.status_code in [200, 201]:
            data_a = create_a.json()
            story_id_a = data_a.get("id")
            self.log(f"Story created: {story_id_a}")
            
            # Note: POST /api/stories only returns {"id": "..."}, not the full story object
            # caption_pos will be verified via GET /api/stories
        else:
            self.log(f"Test 2A failed: {create_a.status_code} - {create_a.text}", "FAIL")
            self.failed += 1

        # Verify via GET /api/stories
        self.log("\nVerifying caption_pos via GET /api/stories...")
        get_stories = requests.get(
            f"{BASE_URL}/stories",
            headers=self.get_headers()
        )
        
        if get_stories.status_code == 200:
            author_groups = get_stories.json()
            found = False
            # Stories are grouped by author
            for group in author_groups:
                for story in group.get("stories", []):
                    if story.get("id") == story_id_a:
                        found = True
                        caption_pos = story.get("caption_pos")
                        if caption_pos:
                            self.assert_equal(caption_pos.get("x"), 0.4, 
                                            "GET /api/stories: caption_pos.x should be 0.4")
                            self.assert_equal(caption_pos.get("y"), 0.6, 
                                            "GET /api/stories: caption_pos.y should be 0.6")
                        else:
                            self.log("GET /api/stories: caption_pos missing", "FAIL")
                            self.failed += 1
                        break
                if found:
                    break
            
            if not found:
                self.log(f"Story {story_id_a} not found in GET /api/stories", "WARN")
        else:
            self.log(f"GET /api/stories failed: {get_stories.status_code}", "FAIL")
            self.failed += 1

        # Test 2B: Clamping test
        self.log("\nTest 2B: Testing caption_pos clamping with {x:1.5, y:-0.2}...")
        
        # Add longer delay to avoid rate limiting (anti-echo is 5 minutes)
        import time
        self.log("Waiting 8 seconds to avoid rate limiting...")
        time.sleep(8)
        
        story_payload_b = {
            "media_type": "image",
            "image": image_data,
            "caption": "Clamping test",
            "caption_pos": {"x": 1.5, "y": -0.2}
        }
        
        create_b = requests.post(
            f"{BASE_URL}/stories",
            headers=self.get_headers(),
            json=story_payload_b
        )
        
        if create_b.status_code in [200, 201]:
            data_b = create_b.json()
            story_id_b = data_b.get("id")
            self.log(f"Story created: {story_id_b}")
            
            caption_pos_b = data_b.get("caption_pos")
            if caption_pos_b:
                # Expected clamping: x: max(0.05, min(0.95, 1.5)) = 0.95
                #                    y: max(0.06, min(0.94, -0.2)) = 0.06
                self.assert_equal(caption_pos_b.get("x"), 0.95, 
                                "Test 2B: caption_pos.x should be clamped to 0.95")
                self.assert_equal(caption_pos_b.get("y"), 0.06, 
                                "Test 2B: caption_pos.y should be clamped to 0.06")
            else:
                self.log("Test 2B: caption_pos not in response", "FAIL")
                self.failed += 1
        else:
            self.log(f"Test 2B failed: {create_b.status_code} - {create_b.text}", "FAIL")
            self.failed += 1

    def test_music_link_stickers_dropped(self):
        """
        Test 3: Music/link sticker types are dropped at creation (LOW PRIORITY)
        - Create story with stickers: music, link, hashtag
        - Verify GET /api/stories returns ONLY hashtag sticker (music and link dropped)
        """
        self.log("\n" + "=" * 80)
        self.log("TEST 3: Music/Link Stickers Dropped (LOW PRIORITY)")
        self.log("=" * 80)

        # Add delay to avoid rate limiting
        import time
        time.sleep(3)

        # Small base64 PNG
        small_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        image_data = f"data:image/png;base64,{small_png}"

        self.log("\nCreating story with music, link, and hashtag stickers...")
        story_payload = {
            "media_type": "image",
            "image": image_data,
            "caption": "Sticker test",
            "stickers": [
                {
                    "type": "music",
                    "x": 0.3,
                    "y": 0.3,
                    "data": {
                        "title": "Test Song",
                        "artist": "Test Artist"
                    }
                },
                {
                    "type": "link",
                    "x": 0.5,
                    "y": 0.5,
                    "data": {
                        "url": "https://example.com",
                        "label": "Test Link"
                    }
                },
                {
                    "type": "hashtag",
                    "x": 0.7,
                    "y": 0.7,
                    "data": {
                        "tag": "oi"
                    }
                }
            ]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/stories",
            headers=self.get_headers(),
            json=story_payload
        )
        
        story_id = None
        if create_response.status_code in [200, 201]:
            data = create_response.json()
            story_id = data.get("id")
            self.log(f"Story created: {story_id}")
            
            # Check stickers in create response
            stickers = data.get("stickers", [])
            self.log(f"Stickers in create response: {len(stickers)} sticker(s)")
            for sticker in stickers:
                self.log(f"  - Type: {sticker.get('type')}")
        else:
            self.log(f"Story creation failed: {create_response.status_code} - {create_response.text}", "FAIL")
            self.failed += 1
            return

        # Verify via GET /api/stories
        self.log("\nVerifying stickers via GET /api/stories...")
        get_stories = requests.get(
            f"{BASE_URL}/stories",
            headers=self.get_headers()
        )
        
        if get_stories.status_code == 200:
            author_groups = get_stories.json()
            found = False
            # Stories are grouped by author
            for group in author_groups:
                for story in group.get("stories", []):
                    if story.get("id") == story_id:
                        found = True
                        stickers = story.get("stickers", [])
                        
                        self.log(f"Found story with {len(stickers)} sticker(s)")
                        
                        # Should have exactly 1 sticker (hashtag)
                        self.assert_equal(len(stickers), 1, 
                                        "Should have exactly 1 sticker (music and link dropped)")
                        
                        if len(stickers) == 1:
                            sticker_type = stickers[0].get("type")
                            self.assert_equal(sticker_type, "hashtag", 
                                            "Remaining sticker should be 'hashtag'")
                            
                            # Verify hashtag data
                            sticker_data = stickers[0].get("data", {})
                            self.assert_equal(sticker_data.get("tag"), "oi", 
                                            "Hashtag tag should be 'oi'")
                        
                        # Verify music and link are NOT present
                        sticker_types = [s.get("type") for s in stickers]
                        self.assert_true("music" not in sticker_types, 
                                       "Music sticker should be dropped")
                        self.assert_true("link" not in sticker_types, 
                                       "Link sticker should be dropped")
                        break
                if found:
                    break
            
            if not found:
                self.log(f"Story {story_id} not found in GET /api/stories", "FAIL")
                self.failed += 1
        else:
            self.log(f"GET /api/stories failed: {get_stories.status_code}", "FAIL")
            self.failed += 1

    def run_all_tests(self):
        """Run all test suites"""
        if not self.login():
            self.log("Cannot proceed without authentication", "FAIL")
            return

        # Run tests in priority order
        self.test_one_reaction_per_user()  # High priority
        self.test_caption_pos()             # Medium priority
        self.test_music_link_stickers_dropped()  # Low priority

        # Summary
        self.log("\n" + "=" * 80)
        self.log("TEST SUMMARY")
        self.log("=" * 80)
        total = self.passed + self.failed
        pass_rate = (self.passed / total * 100) if total > 0 else 0
        
        self.log(f"Total Tests: {total}")
        self.log(f"Passed: {self.passed} ✅", "PASS")
        if self.failed > 0:
            self.log(f"Failed: {self.failed} ❌", "FAIL")
        self.log(f"Pass Rate: {pass_rate:.1f}%")
        
        if self.failed == 0:
            self.log("\n🎉 ALL TESTS PASSED!", "PASS")
        else:
            self.log(f"\n⚠️  {self.failed} test(s) failed. Review output above.", "WARN")


if __name__ == "__main__":
    runner = TestRunner()
    runner.run_all_tests()
