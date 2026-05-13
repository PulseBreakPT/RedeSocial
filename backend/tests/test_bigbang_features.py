"""
Tests for the 13 'Big Bang' Vermillion features:
 1) Notes 24h
 2) Presence
 3) Community custom reactions
 4) Pin comments
 5) Series
 6) Profile Visitors
 7) Charms
 8) Roda (Inner Circle)
 9) Starter Packs
10) Hype Train
11) Collab Posts
12) Avatar Cosmetics
13) For You reason chips (/posts/explore/with-reasons)
"""
import os
import uuid
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


# -------- helpers --------
def make_user(prefix="bb"):
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
    data = r.json()["user"]
    return {"session": s, "user": data, "payload": payload}


@pytest.fixture(scope="module")
def ua():
    return make_user("a")


@pytest.fixture(scope="module")
def ub():
    return make_user("b")


@pytest.fixture(scope="module")
def uc():
    return make_user("c")


@pytest.fixture(scope="module")
def community(ua):
    """Community owned by ua."""
    r = ua["session"].post(f"{API}/communities", json={
        "name": f"BigBangComm {uuid.uuid4().hex[:6]}",
        "description": "test",
        "category": "outras",
    })
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def post_by_a(ua):
    r = ua["session"].post(f"{API}/posts", json={"content": "Big bang test post #lisboa"})
    assert r.status_code == 200, r.text
    return r.json()


# ---------- 1) Notes 24h ----------
class TestNotes:
    def test_create_and_feed(self, ua):
        r = ua["session"].post(f"{API}/notes", json={"text": "Recado de teste"})
        assert r.status_code == 200, r.text
        note = r.json()
        assert note["text"] == "Recado de teste"
        assert "expires_at" in note and "created_at" in note
        # feed
        f = ua["session"].get(f"{API}/notes/feed")
        assert f.status_code == 200
        feed = f.json()
        assert any(n["id"] == note["id"] for n in feed)

    def test_second_note_replaces_first(self, ua):
        r1 = ua["session"].post(f"{API}/notes", json={"text": "primeiro"})
        assert r1.status_code == 200
        first_id = r1.json()["id"]
        r2 = ua["session"].post(f"{API}/notes", json={"text": "segundo"})
        assert r2.status_code == 200
        f = ua["session"].get(f"{API}/notes/feed").json()
        mine = [n for n in f if n["user_id"] == ua["user"]["id"]]
        assert len(mine) == 1
        assert mine[0]["id"] != first_id
        assert mine[0]["text"] == "segundo"

    def test_text_max_60(self, ua):
        r = ua["session"].post(f"{API}/notes", json={"text": "x" * 61})
        assert r.status_code in (400, 422)

    def test_delete_note(self, ua):
        r = ua["session"].post(f"{API}/notes", json={"text": "para apagar"})
        nid = r.json()["id"]
        d = ua["session"].delete(f"{API}/notes/{nid}")
        assert d.status_code == 200
        f = ua["session"].get(f"{API}/notes/feed").json()
        assert not any(n["id"] == nid for n in f)


# ---------- 2) Presence ----------
class TestPresence:
    def test_set_and_get_presence(self, ua):
        r = ua["session"].post(f"{API}/users/me/presence", json={
            "status": "ocupado", "emoji": "💼", "text": "a trabalhar", "minutes": 60,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "ocupado"
        assert body["until"]
        g = requests.get(f"{API}/users/{ua['user']['username']}/presence")
        assert g.status_code == 200
        assert g.json()["status"] == "ocupado"

    def test_invalid_state_rejected(self, ua):
        r = ua["session"].post(f"{API}/users/me/presence", json={"status": "bogus"})
        assert r.status_code == 400

    def test_all_valid_states(self, ua):
        for st in ["online", "ausente", "ocupado", "invisivel"]:
            r = ua["session"].post(f"{API}/users/me/presence", json={"status": st})
            assert r.status_code == 200, f"{st}: {r.text}"


# ---------- 3) Community custom reactions ----------
class TestCommunityReactions:
    def test_owner_can_set_and_get(self, ua, community):
        slug = community["slug"]
        r = ua["session"].put(f"{API}/communities/{slug}/reactions", json={
            "reactions": [
                {"key": "fado", "emoji": "🎵", "label": "Fado"},
                {"key": "saudade", "emoji": "💔", "label": "Saudade"},
            ]
        })
        assert r.status_code == 200, r.text
        assert len(r.json()["reactions"]) == 2
        g = requests.get(f"{API}/communities/{slug}/reactions")
        assert g.status_code == 200
        keys = [x["key"] for x in g.json()["reactions"]]
        assert "fado" in keys and "saudade" in keys

    def test_non_owner_forbidden(self, ub, community):
        slug = community["slug"]
        r = ub["session"].put(f"{API}/communities/{slug}/reactions", json={"reactions": []})
        assert r.status_code == 403


# ---------- 4) Pin comments ----------
class TestPinComments:
    def test_only_post_author_can_pin(self, ua, ub, post_by_a):
        # ub comments on ua's post
        c = ub["session"].post(f"{API}/posts/{post_by_a['id']}/comments", json={"content": "Bom post!"})
        assert c.status_code == 200, c.text
        comment_id = c.json()["id"]
        # ub (comment author, not post author) tries to pin
        r = ub["session"].post(f"{API}/comments/{comment_id}/pin")
        assert r.status_code == 403
        # ua (post author) pins
        r2 = ua["session"].post(f"{API}/comments/{comment_id}/pin")
        assert r2.status_code == 200
        assert r2.json()["pinned"] is True

    def test_only_one_pin_per_post(self, ua, ub, post_by_a):
        c1 = ub["session"].post(f"{API}/posts/{post_by_a['id']}/comments", json={"content": "comm A"}).json()
        c2 = ub["session"].post(f"{API}/posts/{post_by_a['id']}/comments", json={"content": "comm B"}).json()
        ua["session"].post(f"{API}/comments/{c1['id']}/pin")
        ua["session"].post(f"{API}/comments/{c2['id']}/pin")
        # only c2 should remain pinned
        comments = ua["session"].get(f"{API}/posts/{post_by_a['id']}/comments").json()
        pinned = [c for c in comments if c.get("pinned_by_author")]
        assert len(pinned) == 1
        assert pinned[0]["id"] == c2["id"]


# ---------- 5) Series ----------
class TestSeries:
    def test_full_series_lifecycle(self, ua, post_by_a):
        r = ua["session"].post(f"{API}/series", json={
            "title": "Minha Série", "description": "desc", "cover_emoji": "📚",
        })
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        g = requests.get(f"{API}/series/{sid}")
        assert g.status_code == 200
        assert g.json()["title"] == "Minha Série"
        # list user series
        lst = requests.get(f"{API}/users/{ua['user']['username']}/series").json()
        assert any(s["id"] == sid for s in lst)
        # add post
        add = ua["session"].post(f"{API}/series/{sid}/posts", json={
            "post_id": post_by_a["id"], "action": "add",
        })
        assert add.status_code == 200
        assert post_by_a["id"] in add.json()["post_ids"]
        # get posts
        ps = requests.get(f"{API}/series/{sid}/posts").json()
        assert any(p["id"] == post_by_a["id"] for p in ps)
        # remove
        rem = ua["session"].post(f"{API}/series/{sid}/posts", json={
            "post_id": post_by_a["id"], "action": "remove",
        })
        assert rem.status_code == 200
        assert post_by_a["id"] not in rem.json()["post_ids"]
        # delete
        d = ua["session"].delete(f"{API}/series/{sid}")
        assert d.status_code == 200
        assert requests.get(f"{API}/series/{sid}").status_code == 404

    def test_non_owner_cannot_edit(self, ua, ub, post_by_a):
        r = ua["session"].post(f"{API}/series", json={"title": "Privada"}).json()
        sid = r["id"]
        bad = ub["session"].post(f"{API}/series/{sid}/posts", json={
            "post_id": post_by_a["id"], "action": "add",
        })
        assert bad.status_code == 403


# ---------- 6) Profile Visitors ----------
class TestVisitors:
    def test_auto_track_on_profile_view(self, ua, ub):
        # ub views ua's profile
        r = ub["session"].get(f"{API}/users/{ua['user']['username']}")
        assert r.status_code == 200
        # ua sees ub in visitors
        v = ua["session"].get(f"{API}/users/me/visitors")
        assert v.status_code == 200
        body = v.json()
        assert body.get("enabled") is True
        ids = [u["id"] for u in body["visitors"]]
        assert ub["user"]["id"] in ids

    def test_toggle_tracking_off(self, ua):
        r = ua["session"].post(f"{API}/users/me/visitors/settings", json={"track_visits": False})
        assert r.status_code == 200
        v = ua["session"].get(f"{API}/users/me/visitors")
        assert v.json()["enabled"] is False
        # restore
        ua["session"].post(f"{API}/users/me/visitors/settings", json={"track_visits": True})


# ---------- 7) Charms ----------
class TestCharms:
    def test_catalog_12_items(self):
        r = requests.get(f"{API}/charms/catalog")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 12, f"expected 12 charms, got {len(data)}"
        keys = {c["key"] for c in data}
        for k in ["fundador", "madrugador", "noctivago", "conversador", "anfitriao",
                  "explorador", "saudosista", "festeiro", "poeta", "viajante",
                  "pastelinho", "bolacampea"]:
            assert k in keys

    def test_user_charms(self, ua):
        r = requests.get(f"{API}/users/{ua['user']['username']}/charms")
        assert r.status_code == 200
        body = r.json()
        assert "unlocked" in body and "equipped" in body

    def test_equip_filters_to_unlocked_and_max_3(self, ua, community):
        # ua owns a community → 'anfitriao' should be unlocked
        body = requests.get(f"{API}/users/{ua['user']['username']}/charms").json()
        unlocked_keys = [c["key"] for c in body["unlocked"]]
        # try equipping mix of unlocked + bogus + over 3
        attempt = unlocked_keys[:3] + ["bogus_key"]
        if not attempt:
            pytest.skip("no unlocked charms to equip for this user")
        r = ua["session"].post(f"{API}/users/me/charms/equip", json={"keys": attempt})
        assert r.status_code == 200
        equipped = r.json()["equipped"]
        eq_keys = [c["key"] for c in equipped]
        assert "bogus_key" not in eq_keys
        assert len(equipped) <= 3


# ---------- 8) Roda (Inner Circle) ----------
class TestRoda:
    def test_toggle_add_remove(self, ua, ub):
        r = ua["session"].post(f"{API}/users/me/roda/{ub['user']['id']}")
        assert r.status_code == 200
        assert r.json()["action"] == "added"
        check = ua["session"].get(f"{API}/users/{ub['user']['username']}/in-roda").json()
        assert check["in_roda"] is True
        r2 = ua["session"].post(f"{API}/users/me/roda/{ub['user']['id']}")
        assert r2.json()["action"] == "removed"

    def test_cannot_add_self(self, ua):
        r = ua["session"].post(f"{API}/users/me/roda/{ua['user']['id']}")
        assert r.status_code == 400

    def test_get_my_roda(self, ua, uc):
        ua["session"].post(f"{API}/users/me/roda/{uc['user']['id']}")
        r = ua["session"].get(f"{API}/users/me/roda")
        assert r.status_code == 200
        ids = [u["id"] for u in r.json()]
        assert uc["user"]["id"] in ids
        ua["session"].post(f"{API}/users/me/roda/{uc['user']['id']}")  # cleanup


# ---------- 9) Starter Packs ----------
class TestStarterPacks:
    @pytest.fixture(scope="class")
    def pack(self, ua, ub, uc):
        r = ua["session"].post(f"{API}/starter-packs", json={
            "title": "Pessoas Fixes",
            "description": "lista",
            "user_ids": [ub["user"]["id"], uc["user"]["id"]],
            "emoji": "✨",
        })
        assert r.status_code == 200, r.text
        return r.json()

    def test_create_and_get(self, pack):
        g = requests.get(f"{API}/starter-packs/{pack['id']}")
        assert g.status_code == 200
        assert g.json()["title"] == "Pessoas Fixes"
        assert len(g.json()["users"]) == 2

    def test_discover(self, pack):
        d = requests.get(f"{API}/starter-packs/discover")
        assert d.status_code == 200
        assert any(p["id"] == pack["id"] for p in d.json())

    def test_user_packs(self, ua, pack):
        r = requests.get(f"{API}/users/{ua['user']['username']}/starter-packs")
        assert r.status_code == 200
        assert any(p["id"] == pack["id"] for p in r.json())

    def test_like_toggle(self, ub, pack):
        r = ub["session"].post(f"{API}/starter-packs/{pack['id']}/like")
        assert r.status_code == 200
        assert r.json()["action"] == "liked"
        r2 = ub["session"].post(f"{API}/starter-packs/{pack['id']}/like")
        assert r2.json()["action"] == "unliked"

    def test_follow_all(self, ub, pack):
        r = ub["session"].post(f"{API}/starter-packs/{pack['id']}/follow-all")
        assert r.status_code == 200
        # follower count >= 1 (followed ua and uc minus self/already)
        assert r.json()["followed_count"] >= 1

    def test_delete_only_owner(self, ua, ub, pack):
        bad = ub["session"].delete(f"{API}/starter-packs/{pack['id']}")
        assert bad.status_code == 404
        ok = ua["session"].delete(f"{API}/starter-packs/{pack['id']}")
        assert ok.status_code == 200


# ---------- 10) Hype Train ----------
class TestHypeTrain:
    def test_create_and_join(self, ua, ub, community):
        slug = community["slug"]
        r1 = ua["session"].post(f"{API}/communities/{slug}/hype")
        assert r1.status_code == 200, r1.text
        body1 = r1.json()
        assert body1["count"] >= 1
        assert body1["target"] == 25
        r2 = ub["session"].post(f"{API}/communities/{slug}/hype")
        assert r2.status_code == 200
        assert r2.json()["count"] >= 2
        # active
        a = requests.get(f"{API}/communities/{slug}/hype/active")
        assert a.status_code == 200
        assert a.json()["count"] >= 2
        assert "percent" in a.json()


# ---------- 11) Collab Posts ----------
class TestCollab:
    def test_invite_accept_flow(self, ua, ub):
        # New post each test to avoid interfering with other tests
        p = ua["session"].post(f"{API}/posts", json={"content": "collab post"}).json()
        # ub cannot invite (not author)
        bad = ub["session"].post(f"{API}/posts/{p['id']}/collab/invite", json={"user_id": ua["user"]["id"]})
        assert bad.status_code == 403
        # ua invites ub
        inv = ua["session"].post(f"{API}/posts/{p['id']}/collab/invite", json={"user_id": ub["user"]["id"]})
        assert inv.status_code == 200, inv.text
        # check list
        lst = requests.get(f"{API}/posts/{p['id']}/collab").json()
        assert any(u["id"] == ub["user"]["id"] for u in lst["invites"])
        # ub accepts
        acc = ub["session"].post(f"{API}/posts/{p['id']}/collab/accept")
        assert acc.status_code == 200
        lst2 = requests.get(f"{API}/posts/{p['id']}/collab").json()
        assert any(u["id"] == ub["user"]["id"] for u in lst2["collaborators"])

    def test_decline(self, ua, ub):
        p = ua["session"].post(f"{API}/posts", json={"content": "decline post"}).json()
        ua["session"].post(f"{API}/posts/{p['id']}/collab/invite", json={"user_id": ub["user"]["id"]})
        d = ub["session"].post(f"{API}/posts/{p['id']}/collab/decline")
        assert d.status_code == 200
        lst = requests.get(f"{API}/posts/{p['id']}/collab").json()
        assert not any(u["id"] == ub["user"]["id"] for u in lst.get("invites", []))

    def test_max_3_collaborators(self, ua, ub, uc):
        p = ua["session"].post(f"{API}/posts", json={"content": "max3"}).json()
        u4 = make_user("d")
        ids = [ub["user"]["id"], uc["user"]["id"], u4["user"]["id"]]
        for uid in ids:
            r = ua["session"].post(f"{API}/posts/{p['id']}/collab/invite", json={"user_id": uid})
            assert r.status_code == 200
        # 4th must fail
        u5 = make_user("e")
        r5 = ua["session"].post(f"{API}/posts/{p['id']}/collab/invite", json={"user_id": u5["user"]["id"]})
        assert r5.status_code == 400


# ---------- 12) Cosmetics ----------
class TestCosmetics:
    def test_catalog_counts(self):
        r = requests.get(f"{API}/cosmetics/catalog")
        assert r.status_code == 200
        data = r.json()
        frames = [c for c in data if c["type"] == "frame"]
        stickers = [c for c in data if c["type"] == "sticker"]
        assert len(frames) == 7
        assert len(stickers) == 7

    def test_equip_valid(self, ua):
        r = ua["session"].post(f"{API}/users/me/cosmetics/equip", json={
            "frame": "frame_coral", "sticker": "sticker_pastel",
        })
        assert r.status_code == 200
        assert r.json()["frame"] == "frame_coral"
        g = requests.get(f"{API}/users/{ua['user']['username']}/cosmetics").json()
        assert g["frame"]["id"] == "frame_coral"
        assert g["sticker"]["id"] == "sticker_pastel"

    def test_type_validation(self, ua):
        # sticker id passed as frame should be rejected
        r = ua["session"].post(f"{API}/users/me/cosmetics/equip", json={
            "frame": "sticker_pastel", "sticker": "",
        })
        assert r.status_code == 400
        r2 = ua["session"].post(f"{API}/users/me/cosmetics/equip", json={
            "frame": "", "sticker": "frame_coral",
        })
        assert r2.status_code == 400

    def test_invalid_id(self, ua):
        r = ua["session"].post(f"{API}/users/me/cosmetics/equip", json={"frame": "nope", "sticker": ""})
        assert r.status_code == 400


# ---------- 13) For You with reasons ----------
class TestForYouReasons:
    def test_anonymous_no_reasons(self):
        r = requests.get(f"{API}/posts/explore/with-reasons")
        assert r.status_code == 200
        for p in r.json():
            assert "reason" not in p or p.get("reason") is None

    def test_authenticated_returns_posts(self, ua, post_by_a):
        r = ua["session"].get(f"{API}/posts/explore/with-reasons")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # at least author's own posts visible; reason may be None for own posts
        # confirm enriched fields
        if data:
            assert "id" in data[0]
            assert "author" in data[0]

    def test_roda_reason_appears(self, ua, ub):
        # add ub to ua's roda, then ub posts; ua should see reason 'roda'
        ua["session"].post(f"{API}/users/me/roda/{ub['user']['id']}")
        ub["session"].post(f"{API}/posts", json={"content": f"post from roda {uuid.uuid4().hex[:6]}"})
        r = ua["session"].get(f"{API}/posts/explore/with-reasons")
        assert r.status_code == 200
        any_roda = any((p.get("reason") or {}).get("type") == "roda" for p in r.json())
        assert any_roda, "expected at least one post with reason.type == 'roda'"
        # cleanup
        ua["session"].post(f"{API}/users/me/roda/{ub['user']['id']}")
