"""
End-to-end backend tests for Vermillion social network.
Covers: auth, users, posts (text+image), feed/explore/bookmarks, tags,
likes/bookmarks/reposts, comments, mentions, stories, notifications,
DMs, trending.
"""
import os
import uuid
import time
import base64
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # Fallback to reading frontend/.env
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break

API = f"{BASE_URL}/api"

# Admin credentials must come from env (no hardcoding).
_ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip()
_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip()

# Tiny 1x1 PNG base64
PNG_1x1 = "data:image/png;base64," + base64.b64encode(
    bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "890000000d49444154789c63f8cf000000030001a4d3a0670000000049454e44ae426082"
    )
).decode()


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def user_a():
    s = requests.Session()
    uid = uuid.uuid4().hex[:8]
    payload = {
        "email": f"test_a_{uid}@vermillion-test.com",
        "password": "passw0rd!",
        "username": f"test_a_{uid}",
        "name": "Test A",
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register A failed: {r.text}"
    return {"session": s, "data": r.json()["user"], "payload": payload}


@pytest.fixture(scope="module")
def user_b():
    s = requests.Session()
    uid = uuid.uuid4().hex[:8]
    payload = {
        "email": f"test_b_{uid}@vermillion-test.com",
        "password": "passw0rd!",
        "username": f"test_b_{uid}",
        "name": "Test B",
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register B failed: {r.text}"
    return {"session": s, "data": r.json()["user"], "payload": payload}


# ---------- Auth ----------
class TestAuth:
    def test_admin_login_sets_cookie_and_returns_user(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["email"] == _ADMIN_EMAIL
        assert body["user"]["verified"] is True
        assert body["user"]["username"] == "admin"
        assert "access_token" in s.cookies

    def test_me_anonymous_returns_user_null(self):
        # Anonymous boot must NOT 401 — it should return 200 {user: null}
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 200, f"anon /auth/me should be 200, got {r.status_code}"
        assert r.json() == {"user": None}

    def test_me_with_session(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        body = r.json()
        assert "user" in body and body["user"] is not None
        assert body["user"]["username"] == "admin"

    def test_invalid_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": _ADMIN_EMAIL or "admin@example.com", "password": "definitely_wrong_password_xyz"})
        assert r.status_code == 401

    def test_register_user_b_is_not_verified(self, user_b):
        assert user_b["data"]["verified"] is False

    def test_logout_clears_cookie(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD})
        s.post(f"{API}/auth/logout")
        r = s.get(f"{API}/auth/me")
        # After logout, /auth/me now returns 200 {user: null}
        assert r.status_code == 200
        assert r.json().get("user") is None


# ---------- Users ----------
class TestUsers:
    def test_get_user_profile(self, admin_session, user_a):
        r = admin_session.get(f"{API}/users/{user_a['data']['username']}")
        assert r.status_code == 200
        assert r.json()["username"] == user_a["data"]["username"]
        assert "is_following" in r.json()

    def test_user_not_found(self, admin_session):
        r = admin_session.get(f"{API}/users/nonexistent_user_xyz_999")
        assert r.status_code == 404

    def test_suggestions(self, admin_session):
        r = admin_session.get(f"{API}/users/suggestions")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_search(self, admin_session, user_a):
        r = admin_session.get(f"{API}/users/search", params={"q": user_a["data"]["username"][:5]})
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(u["username"] == user_a["data"]["username"] for u in r.json())

    def test_follow_toggle(self, user_a, user_b):
        r = user_a["session"].post(f"{API}/users/{user_b['data']['username']}/follow")
        assert r.status_code == 200
        assert r.json()["following"] is True
        # Verify B has a follow notification
        r2 = user_b["session"].get(f"{API}/notifications")
        assert r2.status_code == 200
        types = [n["type"] for n in r2.json()]
        assert "follow" in types

    def test_cannot_follow_self(self, user_a):
        r = user_a["session"].post(f"{API}/users/{user_a['data']['username']}/follow")
        assert r.status_code == 400

    def test_patch_me(self, user_a):
        r = user_a["session"].patch(f"{API}/users/me", json={"bio": "hello vermillion"})
        assert r.status_code == 200
        assert r.json()["bio"] == "hello vermillion"


# ---------- Posts / hashtags / mentions ----------
@pytest.fixture(scope="module")
def post_state():
    return {}


class TestPosts:
    def test_create_post_with_hashtag_and_mention(self, user_a, user_b, post_state):
        content = f"Olá mundo #vermillion #pt-br @{user_b['data']['username']} ✦"
        r = user_a["session"].post(f"{API}/posts", json={"content": content})
        assert r.status_code == 200
        body = r.json()
        assert body["content"] == content
        assert body["author"]["username"] == user_a["data"]["username"]
        post_state["post_id"] = body["id"]

    def test_create_post_with_image(self, user_a, post_state):
        r = user_a["session"].post(f"{API}/posts", json={"content": "com imagem #media", "image": PNG_1x1})
        assert r.status_code == 200
        assert r.json()["image"].startswith("data:image/")
        post_state["image_post_id"] = r.json()["id"]

    def test_post_appears_in_feed(self, user_a, post_state):
        r = user_a["session"].get(f"{API}/posts/feed")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert post_state["post_id"] in ids

    def test_post_appears_in_explore(self, post_state):
        r = requests.get(f"{API}/posts/explore")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert post_state["post_id"] in ids

    def test_hashtag_extraction_and_tag_endpoint(self, post_state):
        r = requests.get(f"{API}/posts/tag/vermillion")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert post_state["post_id"] in ids, "post with #vermillion not returned by /posts/tag/vermillion"

    def test_mention_creates_notification(self, user_b):
        r = user_b["session"].get(f"{API}/notifications")
        assert r.status_code == 200
        types = [n["type"] for n in r.json()]
        assert "mention" in types, f"expected mention notification, got types={types}"

    def test_like_toggle_and_notification(self, user_b, user_a, post_state):
        r = user_b["session"].post(f"{API}/posts/{post_state['post_id']}/like")
        assert r.status_code == 200
        assert r.json()["liked"] is True
        # notification to A
        r2 = user_a["session"].get(f"{API}/notifications")
        assert any(n["type"] == "like" for n in r2.json())
        # toggle back
        r3 = user_b["session"].post(f"{API}/posts/{post_state['post_id']}/like")
        assert r3.json()["liked"] is False

    def test_bookmark_toggle(self, user_b, post_state):
        r = user_b["session"].post(f"{API}/posts/{post_state['post_id']}/bookmark")
        assert r.status_code == 200
        assert r.json()["bookmarked"] is True
        rb = user_b["session"].get(f"{API}/posts/bookmarks")
        assert rb.status_code == 200
        assert any(p["id"] == post_state["post_id"] for p in rb.json())

    def test_repost_creates_entry_and_notification(self, user_b, user_a, post_state):
        r = user_b["session"].post(f"{API}/posts/{post_state['post_id']}/repost")
        assert r.status_code == 200
        assert r.json()["reposted"] is True
        # B's feed should contain a post with repost_of pointing to original
        rb = user_b["session"].get(f"{API}/posts/feed")
        assert any(p.get("repost_of") and p["repost_of"]["id"] == post_state["post_id"] for p in rb.json())
        # A gets a repost notification
        rn = user_a["session"].get(f"{API}/notifications")
        assert any(n["type"] == "repost" for n in rn.json())

    def test_comment_with_mention(self, user_b, user_a, post_state):
        # B comments on A's post mentioning A
        content = f"comentário @{user_a['data']['username']} #replytag"
        r = user_b["session"].post(
            f"{API}/posts/{post_state['post_id']}/comments",
            json={"content": content},
        )
        assert r.status_code == 200
        # A should have both a comment notification + a mention notification
        rn = user_a["session"].get(f"{API}/notifications")
        types = [n["type"] for n in rn.json()]
        assert "comment" in types
        assert types.count("mention") >= 1

    def test_list_comments(self, post_state):
        r = requests.get(f"{API}/posts/{post_state['post_id']}/comments")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_user_posts_tabs(self, user_a, post_state):
        # posts tab
        rp = requests.get(f"{API}/users/{user_a['data']['username']}/posts", params={"tab": "posts"})
        assert rp.status_code == 200
        assert any(p["id"] == post_state["post_id"] for p in rp.json())
        # media tab
        rm = requests.get(f"{API}/users/{user_a['data']['username']}/posts", params={"tab": "media"})
        assert rm.status_code == 200
        assert all(p["image"] for p in rm.json())
        assert any(p["id"] == post_state["image_post_id"] for p in rm.json())

    def test_get_single_post(self, post_state):
        r = requests.get(f"{API}/posts/{post_state['post_id']}")
        assert r.status_code == 200
        assert r.json()["id"] == post_state["post_id"]

    def test_delete_post_forbidden_for_non_author(self, user_b, post_state):
        r = user_b["session"].delete(f"{API}/posts/{post_state['post_id']}")
        assert r.status_code == 403


# ---------- Stories ----------
class TestStories:
    def test_create_story_requires_image(self, user_a):
        r = user_a["session"].post(f"{API}/stories", json={"image": "", "content": ""})
        assert r.status_code == 400

    def test_create_and_list_story(self, user_a):
        r = user_a["session"].post(f"{API}/stories", json={"image": PNG_1x1, "content": "hello"})
        assert r.status_code == 200
        sid = r.json()["id"]
        rl = user_a["session"].get(f"{API}/stories")
        assert rl.status_code == 200
        # find group of user_a
        groups = rl.json()
        assert any(g["author"]["id"] == user_a["data"]["id"] for g in groups)
        # view + delete
        rv = user_a["session"].post(f"{API}/stories/{sid}/view")
        assert rv.status_code == 200
        rd = user_a["session"].delete(f"{API}/stories/{sid}")
        assert rd.status_code == 200


# ---------- Notifications ----------
class TestNotifications:
    def test_unread_count_and_read_all(self, user_a):
        r = user_a["session"].get(f"{API}/notifications/unread-count")
        assert r.status_code == 200
        assert "count" in r.json()
        r2 = user_a["session"].post(f"{API}/notifications/read-all")
        assert r2.status_code == 200
        r3 = user_a["session"].get(f"{API}/notifications/unread-count")
        assert r3.json()["count"] == 0


# ---------- Messages ----------
class TestMessages:
    def test_send_and_fetch_messages(self, user_a, user_b):
        r = user_a["session"].post(
            f"{API}/messages",
            json={"to_user_id": user_b["data"]["id"], "content": "oi B"},
        )
        assert r.status_code == 200
        # B fetches
        rg = user_b["session"].get(f"{API}/messages/{user_a['data']['id']}")
        assert rg.status_code == 200
        body = rg.json()
        assert body["other_user"]["id"] == user_a["data"]["id"]
        assert any(m["content"] == "oi B" for m in body["messages"])

    def test_conversations_listed(self, user_a):
        r = user_a["session"].get(f"{API}/conversations")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_messages_unread_count(self, user_a):
        r = user_a["session"].get(f"{API}/messages/unread-count")
        assert r.status_code == 200
        assert "count" in r.json()


# ---------- Trending ----------
class TestTrending:
    def test_trending_returns_hashtags(self):
        r = requests.get(f"{API}/trending")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        tags = [i["tag"] for i in items]
        assert "vermillion" in tags or len(items) > 0


# ---------- Cleanup ----------
@pytest.fixture(scope="module", autouse=True)
def cleanup(request, user_a, user_b, admin_session, post_state):
    yield
    try:
        # delete posts created by user_a
        for key in ("post_id", "image_post_id"):
            pid = post_state.get(key)
            if pid:
                user_a["session"].delete(f"{API}/posts/{pid}")
    except Exception:
        pass
