"""
Tests for new Vermillion features:
- Password recovery (forgot/reset)
- Communities
- Events
- Followers/Following lists
- Privacy toggle
- Reputation/Level
- Online status
- Onboarding flag
- Global search
"""
import os
import uuid
import time
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


def make_user(prefix="u"):
    s = requests.Session()
    uid = uuid.uuid4().hex[:8]
    payload = {
        "email": f"test_{prefix}_{uid}@vermillion-test.com",
        "password": "passw0rd!",
        "username": f"test_{prefix}_{uid}",
        "name": f"Test {prefix.upper()}",
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.text}"
    return {"session": s, "data": r.json()["user"], "payload": payload}


@pytest.fixture(scope="module")
def ua():
    return make_user("a")


@pytest.fixture(scope="module")
def ub():
    return make_user("b")


@pytest.fixture(scope="module")
def uc():
    return make_user("c")


# ---------------- Password Recovery ----------------
class TestPasswordRecovery:
    def test_forgot_returns_dev_token_and_reset_changes_password(self):
        u = make_user("pw")
        email = u["payload"]["email"]
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        token = body.get("dev_token")
        assert token, f"dev_token missing: {body}"

        new_pw = "newPass1234!"
        r2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": new_pw})
        assert r2.status_code == 200

        # old password fails
        s = requests.Session()
        old = s.post(f"{API}/auth/login", json={"email": email, "password": u["payload"]["password"]})
        assert old.status_code == 401

        # new password works
        s2 = requests.Session()
        ok = s2.post(f"{API}/auth/login", json={"email": email, "password": new_pw})
        assert ok.status_code == 200, ok.text

    def test_reset_with_invalid_token_fails(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "bogus123", "password": "abcdef"})
        assert r.status_code == 400

    def test_forgot_for_unknown_email_still_ok(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "nobody-xyz@vermillion-test.com"})
        assert r.status_code == 200
        assert r.json().get("ok") is True
        assert "dev_token" not in r.json()


# ---------------- Communities ----------------
@pytest.fixture(scope="module")
def community_state():
    return {}


class TestCommunities:
    def test_create_community_with_slug(self, ua, community_state):
        name = f"Tech Talk {uuid.uuid4().hex[:5]}"
        r = ua["session"].post(f"{API}/communities", json={"name": name, "description": "About tech"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["name"] == name
        assert body["slug"]
        assert body["members_count"] == 1
        assert body["joined"] is True
        assert body["is_owner"] is True
        community_state["slug"] = body["slug"]
        community_state["id"] = body["id"]

    def test_list_communities(self, ua, community_state):
        r = ua["session"].get(f"{API}/communities")
        assert r.status_code == 200
        slugs = [c["slug"] for c in r.json()]
        assert community_state["slug"] in slugs

    def test_get_one_community(self, ua, community_state):
        r = ua["session"].get(f"{API}/communities/{community_state['slug']}")
        assert r.status_code == 200
        assert r.json()["slug"] == community_state["slug"]

    def test_post_to_community_requires_membership(self, ub, community_state):
        # ub is not member
        r = ub["session"].post(f"{API}/posts", json={"content": "hi", "community_id": community_state["id"]})
        assert r.status_code == 403, r.text

    def test_join_community_then_post(self, ub, community_state):
        r = ub["session"].post(f"{API}/communities/{community_state['slug']}/join")
        assert r.status_code == 200
        assert r.json()["joined"] is True
        r2 = ub["session"].post(f"{API}/posts", json={"content": "olá comunidade #tech", "community_id": community_state["id"]})
        assert r2.status_code == 200, r2.text
        assert r2.json()["community"]["slug"] == community_state["slug"]
        community_state["post_id"] = r2.json()["id"]

    def test_community_posts_list_contains_post(self, ua, community_state):
        r = ua["session"].get(f"{API}/communities/{community_state['slug']}/posts")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert community_state["post_id"] in ids

    def test_join_toggle_leaves(self, ub, community_state):
        r = ub["session"].post(f"{API}/communities/{community_state['slug']}/join")
        assert r.status_code == 200
        assert r.json()["joined"] is False
        # rejoin so other tests not affected
        ub["session"].post(f"{API}/communities/{community_state['slug']}/join")


# ---------------- Events ----------------
@pytest.fixture(scope="module")
def event_state():
    return {}


class TestEvents:
    def test_create_event(self, ua, event_state):
        r = ua["session"].post(f"{API}/events", json={
            "title": f"Encontro {uuid.uuid4().hex[:5]}",
            "description": "Talk about tech",
            "location": "Online",
            "starts_at": "2030-01-15T18:00:00+00:00",
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["attending"] is True
        assert body["is_owner"] is True
        assert body["attendees_count"] == 1
        event_state["id"] = body["id"]

    def test_list_events_sorted(self, ua, event_state):
        r = ua["session"].get(f"{API}/events")
        assert r.status_code == 200
        ids = [e["id"] for e in r.json()]
        assert event_state["id"] in ids

    def test_get_event(self, ua, event_state):
        r = ua["session"].get(f"{API}/events/{event_state['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == event_state["id"]
        assert r.json().get("creator")

    def test_attend_toggle(self, ub, event_state):
        r = ub["session"].post(f"{API}/events/{event_state['id']}/attend")
        assert r.status_code == 200
        assert r.json()["attending"] is True
        # toggle off
        r2 = ub["session"].post(f"{API}/events/{event_state['id']}/attend")
        assert r2.json()["attending"] is False


# ---------------- Followers/Following ----------------
class TestFollowsLists:
    def test_followers_and_following_after_follow(self, ua, ub):
        # ua follows ub
        ua["session"].post(f"{API}/users/{ub['data']['username']}/follow")
        r = ua["session"].get(f"{API}/users/{ub['data']['username']}/followers")
        assert r.status_code == 200
        usernames = [u["username"] for u in r.json()]
        assert ua["data"]["username"] in usernames

        r2 = ua["session"].get(f"{API}/users/{ua['data']['username']}/following")
        assert r2.status_code == 200
        usernames = [u["username"] for u in r2.json()]
        assert ub["data"]["username"] in usernames


# ---------------- Privacy ----------------
class TestPrivacy:
    def test_set_private_hides_profile_and_posts_from_non_followers(self, uc, ua):
        # uc sets private, creates a post
        uc["session"].patch(f"{API}/users/me", json={"private": True})
        uc["session"].post(f"{API}/posts", json={"content": "private content"})

        # ua is non-follower
        r = ua["session"].get(f"{API}/users/{uc['data']['username']}")
        assert r.status_code == 200
        assert r.json().get("can_view") is False

        rp = ua["session"].get(f"{API}/users/{uc['data']['username']}/posts")
        assert rp.status_code == 200
        assert rp.json() == []

        rf = ua["session"].get(f"{API}/users/{uc['data']['username']}/followers")
        assert rf.status_code == 200
        assert rf.json() == []

    def test_self_can_view_own_private(self, uc):
        r = uc["session"].get(f"{API}/users/{uc['data']['username']}")
        assert r.status_code == 200
        assert r.json().get("can_view") is True


# ---------------- Reputation & Online ----------------
class TestReputationOnline:
    def test_reputation_fields_present(self, ua):
        r = ua["session"].get(f"{API}/users/{ua['data']['username']}")
        assert r.status_code == 200
        body = r.json()
        for k in ("level", "reputation", "posts_count", "likes_received"):
            assert k in body, f"missing field {k}"
        assert isinstance(body["level"], int)
        assert isinstance(body["reputation"], int)

    def test_online_status_true_after_recent_activity(self, ua):
        # ua just made requests, last_seen should be recent → online
        ua["session"].get(f"{API}/auth/me")
        r = ua["session"].get(f"{API}/users/{ua['data']['username']}")
        assert r.status_code == 200
        assert r.json().get("online") is True


# ---------------- Onboarding ----------------
class TestOnboarding:
    def test_new_user_onboarded_false_then_true(self):
        u = make_user("ob")
        # /auth/me returns user with onboarded=false
        r = u["session"].get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json().get("onboarded") is False
        # complete onboarding
        r2 = u["session"].post(f"{API}/users/me/onboard")
        assert r2.status_code == 200
        r3 = u["session"].get(f"{API}/auth/me")
        assert r3.json().get("onboarded") is True


# ---------------- Global search ----------------
class TestGlobalSearch:
    def test_search_returns_users_posts_tags(self, ua):
        # Create post with hashtag
        tag = f"srchtag{uuid.uuid4().hex[:5]}"
        ua["session"].post(f"{API}/posts", json={"content": f"buscar isto #{tag}"})
        time.sleep(0.3)
        r = ua["session"].get(f"{API}/search", params={"q": tag})
        assert r.status_code == 200
        body = r.json()
        assert "users" in body and "posts" in body and "tags" in body
        # tag entry expected when there are posts
        assert any(t["tag"] == tag for t in body["tags"])
