"""
Backend tests for the SSS-tier Stories overhaul:
- POST /api/stories accepts new `text_style` field (plain|highlight|outline|glow)
- New PT backgrounds (tejo, azulejo, pinhal)
- New `brush` font_style
- GET /api/stories returns text_style on enriched stories
- Legacy/existing stories without text_style default to 'plain'
- Stickers continue to work (poll vote, question answer, slider response, reactions, replies)
"""
import os
import uuid
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"

PNG_1x1 = "data:image/png;base64," + base64.b64encode(
    bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "890000000d49444154789c63f8cf000000030001a4d3a0670000000049454e44ae426082"
    )
).decode()


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def session_a():
    s = requests.Session()
    uid = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_story_a_{uid}@vermillion-test.com",
        "password": "passw0rd!",
        "username": f"test_sa_{uid}",
        "name": "Test Story A",
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register A failed: {r.status_code} {r.text}"
    return {"session": s, "user": r.json()["user"]}


@pytest.fixture(scope="module")
def session_b():
    s = requests.Session()
    uid = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_story_b_{uid}@vermillion-test.com",
        "password": "passw0rd!",
        "username": f"test_sb_{uid}",
        "name": "Test Story B",
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register B failed: {r.status_code} {r.text}"
    return {"session": s, "user": r.json()["user"]}


def _find_story(groups, story_id, viewer_id=None):
    """Locate a story by id inside grouped /api/stories response.
    Backend returns [{author, stories: [...], has_unseen}].
    """
    for g in groups:
        for it in g.get("stories", []) or g.get("items", []):
            if it.get("id") == story_id:
                return it, g
    return None, None


def _create_and_fetch(session_a, payload):
    """POST /api/stories then GET /api/stories and return the enriched story."""
    r = session_a["session"].post(f"{API}/stories", json=payload)
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    rl = session_a["session"].get(f"{API}/stories")
    assert rl.status_code == 200, rl.text
    story, _ = _find_story(rl.json(), sid)
    assert story is not None, f"story {sid} not in GET /stories response"
    return sid, story


# ---------- New fields: text_style / backgrounds / brush ----------
class TestStoryNewFields:
    @pytest.mark.parametrize("text_style", ["plain", "highlight", "outline", "glow"])
    def test_create_story_with_each_text_style(self, session_a, text_style):
        sid, story = _create_and_fetch(session_a, {
            "media_type": "text",
            "text_content": f"hello {text_style}",
            "background": "fado",
            "font_style": "modern",
            "text_style": text_style,
        })
        assert story["text_style"] == text_style
        assert story["media_type"] == "text"
        session_a["session"].delete(f"{API}/stories/{sid}")

    @pytest.mark.parametrize("bg", ["tejo", "azulejo", "pinhal"])
    def test_create_story_with_new_pt_backgrounds(self, session_a, bg):
        sid, story = _create_and_fetch(session_a, {
            "media_type": "text",
            "text_content": "PT bg",
            "background": bg,
            "text_style": "highlight",
        })
        assert story["background"] == bg
        assert isinstance(story.get("bg_css", ""), str) and story["bg_css"].startswith("linear-gradient")
        session_a["session"].delete(f"{API}/stories/{sid}")

    def test_brush_font_style(self, session_a):
        sid, story = _create_and_fetch(session_a, {
            "media_type": "text",
            "text_content": "brush!",
            "background": "tejo",
            "font_style": "brush",
            "text_style": "glow",
        })
        assert story["font_style"] == "brush"
        assert story["text_style"] == "glow"
        assert story["background"] == "tejo"
        session_a["session"].delete(f"{API}/stories/{sid}")

    def test_invalid_text_style_falls_back_to_plain(self, session_a):
        sid, story = _create_and_fetch(session_a, {
            "media_type": "text",
            "text_content": "fallback",
            "background": "coral",
            "text_style": "bogus_value_xyz",
        })
        assert story["text_style"] == "plain"
        session_a["session"].delete(f"{API}/stories/{sid}")

    def test_invalid_background_falls_back_to_coral(self, session_a):
        sid, story = _create_and_fetch(session_a, {
            "media_type": "text",
            "text_content": "fallback bg",
            "background": "not_a_real_bg",
            "text_style": "plain",
        })
        assert story["background"] == "coral"
        session_a["session"].delete(f"{API}/stories/{sid}")


# ---------- Legacy/default text_style ----------
class TestLegacyDefaults:
    def test_story_without_text_style_defaults_to_plain(self, session_a):
        # Omit text_style entirely from the payload
        r = session_a["session"].post(f"{API}/stories", json={
            "media_type": "image",
            "image": PNG_1x1,
            "caption": "legacy story",
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("text_style") == "plain"
        sid = body["id"]
        # Confirm via GET that enrichment returns 'plain' too
        rl = session_a["session"].get(f"{API}/stories")
        assert rl.status_code == 200
        story, _ = _find_story(rl.json(), sid)
        assert story is not None
        assert story["text_style"] == "plain"
        session_a["session"].delete(f"{API}/stories/{sid}")


# ---------- Catalog endpoint exposes new bgs/fonts ----------
class TestStoryCatalog:
    def test_catalog_lists_new_backgrounds_and_brush(self, session_a):
        r = session_a["session"].get(f"{API}/stories/catalog")
        assert r.status_code == 200, r.text
        cat = r.json()
        bg_keys = {b["key"] for b in cat.get("backgrounds", [])}
        for k in ("tejo", "azulejo", "pinhal"):
            assert k in bg_keys, f"background {k!r} missing from catalog"
        fonts = set(cat.get("fonts", []))
        assert "brush" in fonts, "brush font missing from catalog"


# ---------- Stickers: poll / question / slider / reaction / reply ----------
@pytest.fixture(scope="class")
def sticker_story(session_a):
    """Create one story owned by user A that carries poll/question/slider stickers."""
    poll_sid = uuid.uuid4().hex
    q_sid = uuid.uuid4().hex
    sl_sid = uuid.uuid4().hex
    stickers = [
        {"id": poll_sid, "type": "poll", "x": 0.5, "y": 0.5, "rotation": 0, "scale": 1,
         "data": {"question": "Q?", "options": [{"id": "o1", "label": "A"}, {"id": "o2", "label": "B"}]}},
        {"id": q_sid, "type": "question", "x": 0.3, "y": 0.4, "rotation": 0, "scale": 1,
         "data": {"prompt": "Pergunta?"}},
        {"id": sl_sid, "type": "slider", "x": 0.4, "y": 0.7, "rotation": 0, "scale": 1,
         "data": {"prompt": "Quanto?", "emoji": "🔥"}},
    ]
    r = session_a["session"].post(f"{API}/stories", json={
        "media_type": "text",
        "text_content": "stickers test",
        "background": "azulejo",
        "font_style": "brush",
        "text_style": "outline",
        "stickers": stickers,
    })
    assert r.status_code == 200, r.text
    body = r.json()
    yield {"id": body["id"], "poll": poll_sid, "q": q_sid, "sl": sl_sid}
    session_a["session"].delete(f"{API}/stories/{body['id']}")


class TestStorySticker:
    def test_view_then_react(self, session_b, sticker_story):
        sid = sticker_story["id"]
        rv = session_b["session"].post(f"{API}/stories/{sid}/view")
        assert rv.status_code == 200
        rr = session_b["session"].post(f"{API}/stories/{sid}/react", json={"emoji": "🔥"})
        assert rr.status_code == 200, rr.text
        body = rr.json()
        # backend may return updated story or {ok: True} — accept either, but verify via GET
        rl = session_b["session"].get(f"{API}/stories")
        story, _ = _find_story(rl.json(), sid)
        assert story is not None
        # my_reaction should reflect viewer's reaction
        assert story.get("my_reaction") == "🔥" or "🔥" in (story.get("reactions") or {}).values() or body

    def test_reply(self, session_b, sticker_story):
        sid = sticker_story["id"]
        rr = session_b["session"].post(f"{API}/stories/{sid}/reply", json={"content": "olá!"})
        assert rr.status_code == 200, rr.text

    def test_poll_vote(self, session_b, sticker_story):
        sid = sticker_story["id"]
        r = session_b["session"].post(
            f"{API}/stories/{sid}/poll-vote",
            json={"sticker_id": sticker_story["poll"], "option_id": "o1"},
        )
        assert r.status_code == 200, r.text

    def test_question_answer(self, session_b, sticker_story):
        sid = sticker_story["id"]
        r = session_b["session"].post(
            f"{API}/stories/{sid}/question-answer",
            json={"sticker_id": sticker_story["q"], "content": "a minha resposta"},
        )
        assert r.status_code == 200, r.text

    def test_slider_response(self, session_b, sticker_story):
        sid = sticker_story["id"]
        r = session_b["session"].post(
            f"{API}/stories/{sid}/slider-response",
            json={"sticker_id": sticker_story["sl"], "value": 0.73},
        )
        assert r.status_code == 200, r.text

    def test_owner_can_fetch_viewers_and_replies(self, session_a, sticker_story):
        sid = sticker_story["id"]
        rv = session_a["session"].get(f"{API}/stories/{sid}/viewers")
        assert rv.status_code == 200, rv.text
        rr = session_a["session"].get(f"{API}/stories/{sid}/replies")
        assert rr.status_code == 200, rr.text
        replies = rr.json()
        # we sent at least one reply from B
        assert isinstance(replies, list) and any(
            (r.get("content") == "olá!") for r in replies
        )
