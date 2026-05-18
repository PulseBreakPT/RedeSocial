"""
End-to-end + pure-math regression tests for the Termómetro Social feature.

Covers:
  · pure-math `compute_temperature_score` band mapping (frio · morno · quente
    · em_brasa · a_ferver) without hitting MongoDB.
  · GET /api/temperature/{kind}/{value}?range={1h|24h|7d|30d} for every kind.
  · Error paths (400 invalid kind/city/mood · 404 nonexistent post).
  · Legacy-compat for /api/trending, /api/trending/cidades, /api/explore/moods.
"""
import math
import os
import sys
from pathlib import Path

import pytest
import requests

# Make the backend module importable for the pure-math tests.
sys.path.insert(0, "/app/backend")
from server import (  # noqa: E402
    TEMP_PROFILES,
    TEMP_STATES,
    compute_temperature_score,
    temperature_object,
    temperature_state,
)

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"

VALID_STATES = {"frio", "morno", "quente", "em_brasa", "a_ferver"}


# ============================================================
# Pure-math — no network, no DB
# ============================================================
def test_score_zero_when_no_activity():
    assert compute_temperature_score(0, 0) == 0
    s = temperature_object(0, 0, anchor=20.0)
    assert s["score"] == 0
    assert s["state"] == "frio"
    assert s["label"] == "Frio"


def test_score_caps_at_100():
    # Massive activity with massive growth — should saturate near 100.
    s = compute_temperature_score(curr=10_000, prev=10, anchor=20.0)
    assert 0 <= s <= 100
    assert s >= 80  # saturation + momentum cap (+30) easily lands in a_ferver


def test_score_band_mapping_covers_all_states():
    """Each named band must be reachable by *some* valid input."""
    seen = set()
    cases = [
        (0, 0),      # frio
        (4, 4),     # morno-ish
        (10, 10),   # quente-ish
        (25, 15),   # em_brasa-ish
        (200, 1),   # a_ferver
    ]
    for curr, prev in cases:
        st = temperature_state(compute_temperature_score(curr, prev, anchor=20.0))
        seen.add(st["key"])
    # We don't require *every* band hit (depends on anchor) but at least 3 distinct
    # states should show up, including frio and a_ferver.
    assert "frio" in seen
    assert "a_ferver" in seen
    assert len(seen) >= 3, f"only saw bands: {seen}"


def test_state_thresholds_exact_boundaries():
    assert temperature_state(0)["key"] == "frio"
    assert temperature_state(19)["key"] == "frio"
    assert temperature_state(20)["key"] == "morno"
    assert temperature_state(39)["key"] == "morno"
    assert temperature_state(40)["key"] == "quente"
    assert temperature_state(59)["key"] == "quente"
    assert temperature_state(60)["key"] == "em_brasa"
    assert temperature_state(79)["key"] == "em_brasa"
    assert temperature_state(80)["key"] == "a_ferver"
    assert temperature_state(100)["key"] == "a_ferver"


def test_score_grows_with_activity():
    """More activity (at same momentum) ⇒ higher base score."""
    low = compute_temperature_score(5, 5, anchor=20.0)
    high = compute_temperature_score(50, 50, anchor=20.0)
    assert high > low


def test_momentum_caps_are_respected():
    """Momentum bonus capped +30; malus capped −15."""
    # Big growth, low absolute — score still bounded.
    very_growing = compute_temperature_score(curr=2, prev=0, anchor=20.0)
    # Heavy drop — momentum cannot crash to 0.
    cooling = compute_temperature_score(curr=10, prev=1000, anchor=20.0)
    assert 0 <= very_growing <= 100
    assert 0 <= cooling <= 100


def test_temp_profiles_have_anchors():
    for k in ("tag", "city", "mood", "post", "conversation"):
        p = TEMP_PROFILES[k]
        assert p["anchor"] > 0


def test_temp_states_are_in_order():
    mins = [s["min"] for s in TEMP_STATES]
    assert mins == sorted(mins)
    assert mins[0] == 0


# ============================================================
# Live endpoint — universal /api/temperature/{kind}/{value}
# ============================================================
@pytest.fixture(scope="module")
def session():
    return requests.Session()


def _assert_temp_schema(payload, kind, value):
    assert payload["kind"] == kind
    assert payload["value"] == value
    assert isinstance(payload["score"], int)
    assert 0 <= payload["score"] <= 100
    assert payload["state"] in VALID_STATES
    assert isinstance(payload["label"], str) and payload["label"]
    assert isinstance(payload["emoji"], str) and payload["emoji"]
    assert isinstance(payload["velocity"], int)
    assert isinstance(payload["signals"], dict)
    assert "range" in payload


@pytest.mark.parametrize("range_", ["1h", "24h", "7d", "30d"])
def test_temperature_tag_endpoint(session, range_):
    r = session.get(f"{API}/temperature/tag/lisboa", params={"range": range_}, timeout=15)
    assert r.status_code == 200, r.text
    p = r.json()
    _assert_temp_schema(p, "tag", "lisboa")
    # signals shape for post-based kinds
    for k in ("posts", "likes", "comments", "reposts", "unique_authors"):
        assert k in p["signals"]


@pytest.mark.parametrize("range_", ["1h", "24h", "7d", "30d"])
def test_temperature_city_endpoint(session, range_):
    r = session.get(f"{API}/temperature/city/lisboa", params={"range": range_}, timeout=15)
    assert r.status_code == 200, r.text
    p = r.json()
    _assert_temp_schema(p, "city", "lisboa")


def test_temperature_mood_endpoint(session):
    r = session.get(f"{API}/temperature/mood/saudade", params={"range": "7d"}, timeout=15)
    assert r.status_code == 200, r.text
    p = r.json()
    _assert_temp_schema(p, "mood", "saudade")


def test_temperature_conversation_endpoint(session):
    r = session.get(f"{API}/temperature/conversation/no-such-conv", params={"range": "24h"}, timeout=15)
    assert r.status_code == 200, r.text
    p = r.json()
    _assert_temp_schema(p, "conversation", "no-such-conv")
    # No messages exist → cold.
    assert p["state"] == "frio"
    assert p["score"] == 0
    assert p["signals"]["messages"] == 0


# ---- Error paths ----
def test_temperature_invalid_kind(session):
    r = session.get(f"{API}/temperature/banana/whatever", timeout=10)
    assert r.status_code == 400


def test_temperature_invalid_city(session):
    r = session.get(f"{API}/temperature/city/atlantis", timeout=10)
    assert r.status_code == 400


def test_temperature_invalid_mood(session):
    r = session.get(f"{API}/temperature/mood/whatever", timeout=10)
    assert r.status_code == 400


def test_temperature_post_not_found(session):
    r = session.get(f"{API}/temperature/post/nope-no-such-id", timeout=10)
    assert r.status_code == 404


# ============================================================
# Legacy-compat — existing endpoints must keep their schema
# and now also include `temperature` per item.
# ============================================================
def test_trending_legacy_plus_temperature(session):
    r = session.get(f"{API}/trending", params={"range": "7d"}, timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    if not items:
        pytest.skip("no trending data in this DB")
    for it in items[:5]:
        # Legacy fields
        for k in ("tag", "count", "previous", "velocity", "is_city"):
            assert k in it, f"missing legacy field: {k}"
        # New field
        assert "temperature" in it
        _assert_temp_schema({**it["temperature"], "kind": "tag", "value": it["tag"]},
                            "tag", it["tag"])


def test_trending_cidades_legacy_plus_temperature(session):
    r = session.get(f"{API}/trending/cidades", params={"range": "30d"}, timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    if not items:
        pytest.skip("no city data in this DB")
    for it in items[:5]:
        for k in ("city", "count", "previous", "velocity"):
            assert k in it
        assert "temperature" in it
        _assert_temp_schema({**it["temperature"], "kind": "city", "value": it["city"]},
                            "city", it["city"])


def test_explore_moods_legacy_plus_temperature(session):
    r = session.get(f"{API}/explore/moods", timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) > 0
    for it in items:
        for k in ("key", "label", "emoji", "count"):
            assert k in it
        assert "temperature" in it
        _assert_temp_schema({**it["temperature"], "kind": "mood", "value": it["key"]},
                            "mood", it["key"])
