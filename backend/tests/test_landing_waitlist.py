"""
Tests for the Lusorae landing pivot (Fev 2026):
- GET /api/landing/pulse — curated stats
- GET /api/landing/cities — 14 cities w/ x/y/accent
- GET /api/waitlist/check?u=... — availability check
- POST /api/waitlist/reserve — public username reservation (CSRF exempt)
"""
import os
import re
import time
import uuid
import requests
from pathlib import Path
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"


# ---------- Landing pulse ----------
class TestLandingPulse:
    def test_pulse_status_and_shape(self):
        r = requests.get(f"{API}/landing/pulse", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in (
            "cities_supported",
            "events_indexed",
            "bairros_indexed",
            "regions_covered",
            "events_next_7d",
            "reservations_total",
            "generated_at",
        ):
            assert k in data, f"missing {k} in pulse: {data}"

    def test_pulse_values_non_negative_and_typed(self):
        data = requests.get(f"{API}/landing/pulse", timeout=15).json()
        int_keys = [
            "cities_supported",
            "events_indexed",
            "bairros_indexed",
            "regions_covered",
            "events_next_7d",
            "reservations_total",
        ]
        for k in int_keys:
            assert isinstance(data[k], int), f"{k} must be int, got {type(data[k])}"
            assert data[k] is not None
            assert data[k] >= 0, f"{k} must be >= 0, got {data[k]}"

    def test_pulse_curated_non_zero(self):
        """Vanity zeros should be eliminated for landing-critical stats."""
        data = requests.get(f"{API}/landing/pulse", timeout=15).json()
        assert data["cities_supported"] > 0
        assert data["events_indexed"] > 0
        assert data["bairros_indexed"] > 0
        assert data["regions_covered"] > 0


# ---------- Landing cities ----------
class TestLandingCities:
    def test_cities_status_and_count(self):
        r = requests.get(f"{API}/landing/cities", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "cities" in data and "generated_at" in data
        assert isinstance(data["cities"], list)
        assert len(data["cities"]) == 14, f"expected 14 cities, got {len(data['cities'])}"

    def test_cities_schema(self):
        data = requests.get(f"{API}/landing/cities", timeout=15).json()
        required = {"slug", "name", "region", "tag", "x", "y", "accent",
                    "events_count", "communities_count"}
        for c in data["cities"]:
            missing = required - set(c.keys())
            assert not missing, f"city {c.get('slug')} missing {missing}"
            assert isinstance(c["x"], (int, float))
            assert isinstance(c["y"], (int, float))
            assert isinstance(c["events_count"], int)
            assert isinstance(c["communities_count"], int)

    def test_cities_islands_present(self):
        data = requests.get(f"{API}/landing/cities", timeout=15).json()
        slugs = {c["slug"] for c in data["cities"]}
        # Islands
        assert "funchal" in slugs
        assert "ponta-delgada" in slugs
        # Anchors used by frontend testids
        for s in ("lisboa", "porto", "coimbra", "braga", "faro"):
            assert s in slugs, f"missing anchor city slug {s}"

    def test_cities_have_some_events(self):
        data = requests.get(f"{API}/landing/cities", timeout=15).json()
        total_events = sum(c["events_count"] for c in data["cities"])
        assert total_events > 0, "expected at least 1 city with events_count>0"


# ---------- Waitlist check ----------
class TestWaitlistCheck:
    def test_check_available(self):
        rand = f"lus_test_{uuid.uuid4().hex[:8]}"
        r = requests.get(f"{API}/waitlist/check", params={"u": rand}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["available"] is True
        assert "message" in body

    def test_check_reserved(self):
        r = requests.get(f"{API}/waitlist/check", params={"u": "admin"}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["available"] is False
        assert body["reason"] == "reserved"

    def test_check_invalid_chars(self):
        r = requests.get(f"{API}/waitlist/check", params={"u": "A!B"}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["available"] is False
        assert body["reason"] == "invalid_chars"

    def test_check_too_short(self):
        r = requests.get(f"{API}/waitlist/check", params={"u": "a"}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["available"] is False
        assert body["reason"] == "too_short"

    def test_check_empty(self):
        r = requests.get(f"{API}/waitlist/check", params={"u": ""}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["available"] is False
        assert body["reason"] == "empty"


# ---------- Waitlist reserve ----------
@pytest.fixture(scope="module")
def unique_user():
    return f"lus_test_{uuid.uuid4().hex[:10]}"


class TestWaitlistReserve:
    def test_csrf_exempt_reserve_works_without_token(self, unique_user):
        """CSRF middleware must NOT block POST /api/waitlist/reserve."""
        payload = {
            "username": unique_user,
            "email": f"{unique_user}@example.pt",
            "city": "Lisboa",
        }
        r = requests.post(f"{API}/waitlist/reserve", json=payload, timeout=15)
        assert r.status_code != 403, (
            f"CSRF should be exempt for /api/waitlist/reserve, got 403: {r.text}"
        )
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert body["ok"] is True
        assert body["username"] == unique_user
        assert body["email"] == f"{unique_user}@example.pt"
        assert body["already_reserved"] is False
        assert isinstance(body["position"], int)
        assert body["position"] >= 1
        assert "id" in body

    def test_idempotent_same_payload(self, unique_user):
        payload = {
            "username": unique_user,
            "email": f"{unique_user}@example.pt",
            "city": "Lisboa",
        }
        r = requests.post(f"{API}/waitlist/reserve", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["already_reserved"] is True
        assert body["username"] == unique_user

    def test_conflict_different_email_same_username(self, unique_user):
        payload = {
            "username": unique_user,
            "email": f"other_{uuid.uuid4().hex[:6]}@example.pt",
        }
        r = requests.post(f"{API}/waitlist/reserve", json=payload, timeout=15)
        assert r.status_code == 409, f"expected 409, got {r.status_code}: {r.text}"
        assert "reservado" in r.text.lower()

    def test_reserved_username_admin(self):
        payload = {"username": "admin", "email": f"test_{uuid.uuid4().hex[:6]}@example.pt"}
        r = requests.post(f"{API}/waitlist/reserve", json=payload, timeout=15)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        assert "reservado" in r.text.lower()

    def test_invalid_email_422(self):
        payload = {
            "username": f"lus_test_{uuid.uuid4().hex[:6]}",
            "email": "not-an-email",
        }
        r = requests.post(f"{API}/waitlist/reserve", json=payload, timeout=15)
        assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text}"


# Cleanup test data via a final test that calls Mongo cleanup is not possible
# from outside; we rely on the prefix `lus_test_` for manual cleanup as documented.
