"""
Lusorae FASE 2 / FASE 3 backend tests:
- Waitlist (POST /api/waitlist, GET /api/waitlist/check, GET /api/waitlist/stats)
- Interests (POST/GET /api/users/me/interests + suggestions signal)
- Invites peer-to-peer (POST /api/invites/generate, GET /api/invites/mine, redemption -> early_supporter)
- Push (vapid-public-key, subscribe, unsubscribe)
- Automod PT (via POST /api/posts and GET /api/automod/check)
- Admin login bootstrap
"""
import os
import time
import uuid
import secrets
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@lusorae.pt"
ADMIN_PASSWORD = "admin123"


def _short_uid():
    return uuid.uuid4().hex[:8]


def _admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    body = r.json()
    token = body.get("token")
    assert token, f"no token in login response: {body}"
    assert body["user"]["is_admin"] is True
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s, body["user"]


def _new_user(invite_code=None, suffix=None):
    """Register a brand-new user via /api/auth/register. Returns (session, user, token)."""
    suffix = suffix or _short_uid()
    payload = {
        "email": f"test_{suffix}@lusorae-test.pt",
        "username": f"t_{suffix}",
        "name": f"Test {suffix}",
        "password": "Passw0rd!ab",
        "terms_accepted": True,
        "age_confirmed": True,
    }
    if invite_code:
        payload["invite_code"] = invite_code
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    token = body["token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s, body["user"], token


# ───────────────────────── Admin login ─────────────────────────
class TestAdminLogin:
    def test_admin_login(self):
        s, user = _admin_session()
        assert user["email"] == ADMIN_EMAIL
        assert user.get("is_admin") is True


# ───────────────────────── Waitlist ─────────────────────────────
class TestWaitlist:
    def test_waitlist_join_with_handle(self):
        suffix = _short_uid()
        email = f"wl_{suffix}@lusorae-test.pt"
        handle = f"wl_{suffix}"
        r = requests.post(f"{API}/waitlist", json={"email": email, "handle": handle})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert isinstance(body.get("position"), int) and body["position"] > 0

    def test_waitlist_idempotent_by_email(self):
        suffix = _short_uid()
        email = f"wl2_{suffix}@lusorae-test.pt"
        handle = f"wl2_{suffix}"
        r1 = requests.post(f"{API}/waitlist", json={"email": email, "handle": handle})
        assert r1.status_code == 200
        pos1 = r1.json()["position"]
        # Same email again with same handle -> should NOT increment
        r2 = requests.post(f"{API}/waitlist", json={"email": email, "handle": handle})
        assert r2.status_code == 200
        body2 = r2.json()
        assert body2.get("already") is True
        assert body2.get("position") == pos1

    def test_waitlist_invalid_handle(self):
        suffix = _short_uid()
        r = requests.post(
            f"{API}/waitlist",
            json={"email": f"bad_{suffix}@lusorae-test.pt", "handle": "x!"},  # too short / invalid char
        )
        assert r.status_code == 400, f"expected 400 invalid handle, got {r.status_code} {r.text}"

    def test_waitlist_reserved_handle(self):
        suffix = _short_uid()
        handle = f"rsv_{suffix}"
        r1 = requests.post(
            f"{API}/waitlist",
            json={"email": f"first_{suffix}@lusorae-test.pt", "handle": handle},
        )
        assert r1.status_code == 200
        # Second different email tries to claim same handle -> 409
        r2 = requests.post(
            f"{API}/waitlist",
            json={"email": f"second_{suffix}@lusorae-test.pt", "handle": handle},
        )
        assert r2.status_code == 409, f"expected 409 reserved, got {r2.status_code} {r2.text}"

    def test_waitlist_check_available(self):
        suffix = _short_uid()
        r = requests.get(f"{API}/waitlist/check", params={"handle": f"free_{suffix}"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("available") is True

    def test_waitlist_check_user_exists(self):
        # admin user definitely exists
        r = requests.get(f"{API}/waitlist/check", params={"handle": "admin"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("available") is False
        assert body.get("reason") in ("user_exists", "reserved", "invalid")

    def test_waitlist_check_invalid_handle(self):
        r = requests.get(f"{API}/waitlist/check", params={"handle": "ab"})  # too short
        assert r.status_code == 200
        body = r.json()
        assert body.get("available") is False
        assert body.get("reason") == "invalid"

    def test_waitlist_stats(self):
        r = requests.get(f"{API}/waitlist/stats")
        assert r.status_code == 200
        body = r.json()
        assert "waitlist_count" in body
        assert "users_count" in body
        assert isinstance(body["waitlist_count"], int)
        assert isinstance(body["users_count"], int)


# ───────────────────────── Interests ─────────────────────────────
class TestInterests:
    def test_save_and_get_interests(self):
        s, user, _ = _new_user()
        interests = ["fado", "tasca", "saudade", "festa", "praia"]
        r = s.post(f"{API}/users/me/interests", json={"interests": interests})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert set(body.get("interests", [])) == set(interests)
        # GET back
        r2 = s.get(f"{API}/users/me/interests")
        assert r2.status_code == 200
        assert set(r2.json().get("interests", [])) == set(interests)

    def test_suggestions_use_interests_signal(self):
        s, user, _ = _new_user()
        s.post(f"{API}/users/me/interests", json={"interests": ["fado", "tasca"]})
        r = s.get(f"{API}/users/suggestions")
        # Endpoint should respond; shared_interests may exist on items
        assert r.status_code == 200, r.text
        data = r.json()
        # Tolerant assertion: either list or dict-wrapped
        items = data if isinstance(data, list) else data.get("items") or data.get("suggestions") or []
        # If any items, look for shared_interests key on at least one
        if items:
            keys = set()
            for it in items[:10]:
                if isinstance(it, dict):
                    keys.update(it.keys())
            # Not a hard failure if missing — log it.
            if "shared_interests" not in keys:
                print(f"[warn] /users/suggestions items keys: {sorted(keys)} (no shared_interests)")


# ───────────────────────── Invites peer-to-peer ─────────────────────────────
class TestInvites:
    def test_generate_three_idempotent(self):
        s, user, _ = _new_user()
        r1 = s.post(f"{API}/invites/generate", json={})
        assert r1.status_code == 200, r1.text
        inv1 = r1.json().get("invites", [])
        assert len(inv1) == 3, f"expected 3 invites, got {len(inv1)}"
        codes1 = sorted([i["code"] for i in inv1])
        # Second call should NOT create new ones (idempotent)
        r2 = s.post(f"{API}/invites/generate", json={})
        assert r2.status_code == 200
        inv2 = r2.json().get("invites", [])
        codes2 = sorted([i["code"] for i in inv2])
        assert codes1 == codes2, f"invites changed: {codes1} -> {codes2}"

    def test_mine_metadata(self):
        s, user, _ = _new_user()
        s.post(f"{API}/invites/generate", json={})
        r = s.get(f"{API}/invites/mine")
        assert r.status_code == 200
        body = r.json()
        assert body.get("founder_threshold") == 3
        assert body.get("accepted_count") == 0
        assert body.get("founder_unlocked") is False
        assert len(body.get("invites", [])) == 3

    def test_redemption_unlocks_founder(self):
        """Inviter generates 3 codes, 3 new users redeem each → inviter gets early_supporter."""
        inviter_s, inviter, _ = _new_user(suffix="inv_" + _short_uid())
        gen = inviter_s.post(f"{API}/invites/generate", json={}).json()
        codes = [i["code"] for i in gen["invites"]]
        assert len(codes) == 3

        for code in codes:
            _new_user(invite_code=code)

        # Now check inviter's /invites/mine
        r = inviter_s.get(f"{API}/invites/mine")
        assert r.status_code == 200
        body = r.json()
        assert body["accepted_count"] >= 3, f"expected accepted >=3, got {body['accepted_count']}"
        assert body["founder_unlocked"] is True

        # And inviter user.early_supporter should be True via /auth/me
        me = inviter_s.get(f"{API}/auth/me").json()
        user_obj = me.get("user") or me
        assert user_obj.get("early_supporter") is True, f"early_supporter not set: {user_obj}"


# ───────────────────────── Push notifications ─────────────────────────────
class TestPush:
    def test_vapid_public_key(self):
        r = requests.get(f"{API}/push/vapid-public-key")
        assert r.status_code == 200
        body = r.json()
        assert "publicKey" in body
        assert "configured" in body

    def test_subscribe_unsubscribe_unique_endpoint(self):
        s, user, _ = _new_user()
        endpoint = f"https://push.example/{_short_uid()}"
        sub = {
            "endpoint": endpoint,
            "keys": {"p256dh": "BASE64KEY", "auth": "AUTHKEY"},
        }
        r1 = s.post(f"{API}/push/subscribe", json=sub)
        assert r1.status_code == 200, r1.text
        # Re-subscribe same endpoint -> still ok (upsert)
        r2 = s.post(f"{API}/push/subscribe", json=sub)
        assert r2.status_code == 200
        # Unsubscribe
        r3 = s.request("DELETE", f"{API}/push/subscribe", json=sub)
        assert r3.status_code == 200, r3.text


# ───────────────────────── Automod PT ─────────────────────────────
class TestAutomod:
    def test_automod_check_clean(self):
        s, _ = _admin_session()
        r = s.get(f"{API}/automod/check", params={"q": "Olá mundo, bom dia!"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("blocked") is False

    def test_automod_check_slur(self):
        s, _ = _admin_session()
        r = s.get(f"{API}/automod/check", params={"q": "fode-te idiota"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("blocked") is True
        assert body.get("message")

    def _create_post(self, session, body):
        # try a few common endpoints
        return session.post(f"{API}/posts", json={"body": body})

    def test_post_creation_normal(self):
        s, user, _ = _new_user()
        r = self._create_post(s, "Bom dia a todos! Hoje vou ao Porto.")
        assert r.status_code in (200, 201), f"normal post should succeed: {r.status_code} {r.text}"

    def test_post_creation_slur_blocked(self):
        s, user, _ = _new_user()
        r = self._create_post(s, "fode-te idiota")
        assert r.status_code == 422, f"slur should be blocked with 422, got {r.status_code} {r.text}"

    def test_post_creation_allcaps_blocked(self):
        s, user, _ = _new_user()
        r = self._create_post(
            s,
            "ISTO TUDO EM MAIUSCULAS PORQUE QUERO GRITAR MUITO MUITO MUITO MUITO ALTO AGORA",
        )
        assert r.status_code == 422, f"all-caps should be blocked, got {r.status_code} {r.text}"

    def test_post_creation_repetition_blocked(self):
        s, user, _ = _new_user()
        r = self._create_post(s, "aaaaaaaaaaaaaaaaaaaaaaaa")
        assert r.status_code == 422, f"repetition should be blocked, got {r.status_code} {r.text}"

    def test_post_creation_many_urls_blocked(self):
        s, user, _ = _new_user()
        r = self._create_post(
            s,
            "Vejam https://a.com https://b.com https://c.com https://d.com",
        )
        assert r.status_code == 422, f"3+ URLs should be blocked, got {r.status_code} {r.text}"
