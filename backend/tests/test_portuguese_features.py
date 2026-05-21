"""
Tests for Portuguese-themed Vermillion features and bug fix:
- /api/auth/me anonymous boot (must NOT 401)
- /api/trending with range param (1h/24h/7d/30d) returning hashtags + velocity
- /api/trending/{pessoas,comunidades,cidades}
- /api/explore/by-mood (Saudade, Tasca, Festa, Fado, etc.)
- /api/users/{username}/badges (Portuguese badges)
"""
import os
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

# Admin credentials must come from env (no hardcoding).
_ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip()
_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip()


# ---------- Bug fix: anonymous boot ----------
class TestAuthMeAnonymousBoot:
    """Critical bug fix: anonymous boot must not 401 on /api/auth/me."""

    def test_anonymous_me_returns_200_user_null(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 200, (
            f"anonymous /auth/me must be 200, got {r.status_code}: {r.text}"
        )
        body = r.json()
        assert "user" in body, f"response missing 'user' key: {body}"
        assert body["user"] is None, f"expected user=None, got {body['user']}"

    def test_authenticated_me_returns_user_object(self):
        import pytest
        if not _ADMIN_EMAIL or not _ADMIN_PASSWORD:
            pytest.skip("ADMIN_EMAIL/ADMIN_PASSWORD not set in env")
        s = requests.Session()
        r = s.post(
            f"{API}/auth/login",
            json={"email": _ADMIN_EMAIL, "password": _ADMIN_PASSWORD},
        )
        assert r.status_code == 200
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 200
        body = r2.json()
        assert body.get("user") is not None
        assert body["user"]["username"] == "admin"
        assert body["user"]["email"] == _ADMIN_EMAIL


# ---------- Trending with PT range ----------
class TestTrendingRanges:
    def test_trending_1h(self):
        r = requests.get(f"{API}/trending", params={"range": "1h"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            item = data[0]
            assert "tag" in item
            # velocity expected per spec
            assert "velocity" in item or "count" in item

    def test_trending_24h(self):
        r = requests.get(f"{API}/trending", params={"range": "24h"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_trending_7d(self):
        r = requests.get(f"{API}/trending", params={"range": "7d"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_trending_30d(self):
        r = requests.get(f"{API}/trending", params={"range": "30d"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_trending_pessoas(self):
        r = requests.get(f"{API}/trending/pessoas", params={"range": "7d"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_trending_comunidades(self):
        r = requests.get(f"{API}/trending/comunidades", params={"range": "7d"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_trending_cidades(self):
        r = requests.get(f"{API}/trending/cidades", params={"range": "30d"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Explore by mood (Portuguese themes) ----------
class TestExploreByMood:
    def test_explore_by_mood_saudade(self):
        r = requests.get(f"{API}/explore/by-mood", params={"mood": "saudade"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_explore_by_mood_tasca(self):
        r = requests.get(f"{API}/explore/by-mood", params={"mood": "tasca"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_explore_by_mood_festa(self):
        r = requests.get(f"{API}/explore/by-mood", params={"mood": "festa"})
        assert r.status_code == 200

    def test_explore_by_mood_fado(self):
        r = requests.get(f"{API}/explore/by-mood", params={"mood": "fado"})
        assert r.status_code == 200

    def test_explore_by_mood_empty(self):
        r = requests.get(f"{API}/explore/by-mood", params={"mood": ""})
        # Empty mood is invalid by design -> 400
        assert r.status_code == 400

    def test_explore_by_mood_invalid(self):
        r = requests.get(f"{API}/explore/by-mood", params={"mood": "invalid_mood_xyz"})
        assert r.status_code == 400


# ---------- User badges ----------
class TestUserBadges:
    def test_admin_badges(self):
        r = requests.get(f"{API}/users/admin/badges")
        assert r.status_code == 200
        data = r.json()
        # Could be a list of badges or an object with badges field
        assert isinstance(data, (list, dict))

    def test_unknown_user_badges_returns_404_or_empty(self):
        r = requests.get(f"{API}/users/nonexistent_xyz_999/badges")
        # Acceptable: 404 OR 200 with empty list
        assert r.status_code in (200, 404)
