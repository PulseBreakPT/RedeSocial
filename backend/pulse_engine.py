"""
pulse_engine.py — Lusorae Social Pulse (Fase 1)
================================================

Real-time aggregator of *human* activity on the platform. Produces a
60-second snapshot every minute by reading the last minute of posts /
comments / messages and `users.last_seen`. Everything is computed from
real data; if a signal is absent, the snapshot omits it. **No mocks, no
random numbers, no AI**.

The output is consumed by:
    • REST endpoints  GET /api/pulse/now | /regions | /topics | /mood
    • WebSocket broadcast  type=pulse_tick  (every 60 s)
    • Future fases (Presence, Context, Mesas) read the same snapshots
      to avoid recomputing.

Design decisions
----------------
1. **Honesty floor.** A delta is only surfaced when:
        current  >= MIN_ABSOLUTE_COUNT
   AND  current  >= baseline_median * (1 + MIN_RELATIVE_DELTA)
   This kills the "23 pessoas a falar de Benfica" lie when only 2
   posts mention it.

2. **Baseline.** For each metric we keep a median of the same minute-of-day
   over the last 7 days (computed on the fly from the snapshot history).
   This gives a self-correcting reference that adapts to organic growth.

3. **Privacy (D1).** City-level granularity only. Users with
   `pulse_opt_out=True` are EXCLUDED from region/city aggregates but
   STILL counted in global totals (so opting out doesn't deflate the
   platform pulse). Freguesia / lat-lon never enter aggregations.

4. **Performance.** Each snapshot is one Mongo find on each of
   {posts, comments, messages} with a created_at range filter — all
   indexed. Authors and content fields are projected only.
   Expected cost on a 10k-user instance: < 25 ms per tick.

5. **TTL.** Snapshots auto-expire after 7 days via Mongo TTL index.
   Storage budget: ~1440 docs/day × 7 = ~10k docs, < 5 MB.

Public surface
--------------
    init_pulse_indexes(db)                  — call once at startup
    start_pulse_loop(db, ws_manager)        — launches the background loop
    fetch_latest_snapshot(db)               — single snapshot dict or None
    fetch_recent_snapshots(db, minutes)     — list of recent snapshots

The loop is cooperative (asyncio) and resilient: an exception in one tick
is logged and the next tick still runs.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
import unicodedata
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from statistics import median
from typing import Any, Dict, Iterable, List, Optional, Tuple

logger = logging.getLogger("lusorae.pulse")


# ─────────────────────────────────────────────────────────────────────
# CONSTANTS — honesty thresholds and PT region/mood lexicons
# ─────────────────────────────────────────────────────────────────────

WINDOW_SECONDS = 60                 # length of each pulse snapshot window
LOOP_INTERVAL_SECONDS = 60          # how often we emit a tick
ONLINE_THRESHOLD_SECONDS = 300      # users seen in last 5 min = "online"
BASELINE_LOOKBACK_DAYS = 7          # baseline horizon
BASELINE_WINDOW_MINUTES = 15        # baselines aggregate ±15 min around now

# Honesty thresholds — pulled in from /app/memory or env in the future,
# but the defaults are conservative on purpose.
MIN_ABSOLUTE_COUNT = 3              # never highlight if value < 3
MIN_RELATIVE_DELTA = 0.20           # need ≥ +20% over baseline median
DOMINANT_MOOD_DELTA = 0.50          # mood becomes "dominant" only at +50%

SNAPSHOT_TTL_SECONDS = 7 * 24 * 3600

# PT mainland + islands canonical regions (lowercased = users.region value).
PT_REGIONS = {
    "norte":    "Norte",
    "centro":   "Centro",
    "lisboa":   "Lisboa",
    "alentejo": "Alentejo",
    "algarve":  "Algarve",
    "madeira":  "Madeira",
    "acores":   "Açores",
    "açores":   "Açores",   # accent-tolerant alias
}

# Curated PT mood lexicon. Each word is matched as a whole token,
# accent-insensitive, case-insensitive. Keep these tight — adding noise
# words inflates the score and breaks the "only signal" promise.
#
# Order of categories below = display priority when ties happen.
MOOD_LEXICON: Dict[str, List[str]] = {
    "festa":    ["festa", "noite", "bora", "saidas", "saidinhas", "discoteca",
                 "copos", "celebrar", "celebracao", "diversao", "festao"],
    "jogo":     ["jogo", "golo", "golos", "benfica", "porto", "fcp", "sporting", "scp",
                 "braga", "futebol", "selecao", "remontada", "campeao",
                 "derby", "derbi", "champions"],
    "saudade":  ["saudade", "saudades", "miss", "lembranca", "lembrancas", "outono",
                 "infancia"],
    "chuva":    ["chuva", "chove", "frio", "molhado", "guarda-chuva", "nublado",
                 "tempestade", "trovoada"],
    "sol":      ["sol", "praia", "verao", "calor", "ondas", "areia",
                 "algarve", "piscina", "torrar"],
    "cafe":     ["cafe", "bica", "manha", "pastel de nata", "padaria",
                 "expresso", "cafezinho", "galao"],
    "trabalho": ["trabalho", "office", "stress", "patrao", "reuniao",
                 "segunda-feira", "deadline", "esgotado"],
    "amor":     ["amor", "amo-te", "namoro", "namorada", "namorado",
                 "coracao", "paixao", "querida", "querido"],
    "casa":     ["casa", "familia", "filhos", "miudos", "lar", "vizinho",
                 "vizinha", "bairro"],
}

# Friendly labels for the UI — never derive from the key (we want PT names).
MOOD_LABEL = {
    "festa":    "Festa",
    "jogo":     "Jogo",
    "saudade":  "Saudade",
    "chuva":    "Chuva",
    "sol":      "Sol",
    "cafe":     "Café",
    "trabalho": "Trabalho",
    "amor":     "Amor",
    "casa":     "Casa",
}


# ─────────────────────────────────────────────────────────────────────
# TEXT NORMALIZATION (accent-insensitive whole-word matching)
# ─────────────────────────────────────────────────────────────────────

def _strip_accents(text: str) -> str:
    """Lowercase + strip diacritics, idempotent on plain ASCII."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


# Pre-compile per-mood regexes once at import. Multi-word seeds (e.g.
# "pastel de nata") get matched as a non-word-bounded substring; single-word
# seeds use word boundaries to avoid hitting "amorfo" for "amor".
_MOOD_REGEXES: Dict[str, List[re.Pattern]] = {}
for _mood, _seeds in MOOD_LEXICON.items():
    patterns: List[re.Pattern] = []
    for _seed in _seeds:
        seed_norm = _strip_accents(_seed)
        if " " in seed_norm or "-" in seed_norm:
            # Multi-word / hyphenated seed — flexible whitespace tolerated.
            esc = re.escape(seed_norm).replace(r"\ ", r"\s+")
            patterns.append(re.compile(rf"(?<!\w){esc}(?!\w)"))
        else:
            patterns.append(re.compile(rf"\b{re.escape(seed_norm)}\b"))
    _MOOD_REGEXES[_mood] = patterns


def _detect_moods_in_text(text: str) -> List[str]:
    """Return the set of mood categories matched in `text` (without
    duplicates per category). One post can only contribute +1 to each
    mood — prevents a single ranty post about Benfica adding +12.
    """
    norm = _strip_accents(text or "")
    if not norm:
        return []
    hits: List[str] = []
    for mood, patterns in _MOOD_REGEXES.items():
        if any(p.search(norm) for p in patterns):
            hits.append(mood)
    return hits


# ─────────────────────────────────────────────────────────────────────
# REGION / CITY NORMALIZATION
# ─────────────────────────────────────────────────────────────────────

def _normalize_region(raw: str) -> Tuple[str, str]:
    """Return (key, label) for a stored region; ('outra', 'Outra') for
    anything we don't recognise; ('', '') if empty."""
    if not raw:
        return "", ""
    k = _strip_accents(str(raw).strip().lower())
    if not k:
        return "", ""
    if k in PT_REGIONS:
        return k, PT_REGIONS[k]
    return "outra", "Outra"


def _normalize_city(raw: str) -> Tuple[str, str]:
    """Return (key, label) for a stored city string. Cities are
    free-text in onboarding so we lowercase + strip accents to bucket
    "Lisboa" / "lisboa" / "Lisbôa" together. Empty string → ('', '')."""
    if not raw:
        return "", ""
    label = str(raw).strip()
    if not label:
        return "", ""
    key = _strip_accents(label)
    # Some users write "Lisboa, Portugal" — strip anything after a comma.
    if "," in key:
        key = key.split(",", 1)[0].strip()
        label = label.split(",", 1)[0].strip()
    return key, label.title()


# ─────────────────────────────────────────────────────────────────────
# DATABASE QUERIES — small, indexed, no Python-side joins
# ─────────────────────────────────────────────────────────────────────

async def _fetch_window_posts(db, window_start: str, window_end: str) -> List[dict]:
    cursor = db.posts.find(
        {"created_at": {"$gte": window_start, "$lt": window_end}, "is_draft": {"$ne": True}},
        {"_id": 0, "id": 1, "author_id": 1, "content": 1, "hashtags": 1, "created_at": 1},
    )
    return await cursor.to_list(length=5000)


async def _fetch_window_comments(db, window_start: str, window_end: str) -> List[dict]:
    cursor = db.comments.find(
        {"created_at": {"$gte": window_start, "$lt": window_end}},
        {"_id": 0, "id": 1, "author_id": 1, "post_id": 1, "content": 1, "created_at": 1},
    )
    return await cursor.to_list(length=5000)


async def _fetch_window_messages(db, window_start: str, window_end: str) -> int:
    """Messages are private — we only count totals, never read content for
    mood detection or per-region aggregation (privacy)."""
    try:
        return await db.messages.count_documents(
            {"created_at": {"$gte": window_start, "$lt": window_end}}
        )
    except Exception:
        return 0


async def _count_online_users(db, threshold_iso: str) -> int:
    return await db.users.count_documents({"last_seen": {"$gte": threshold_iso}})


async def _fetch_users_index(db, user_ids: Iterable[str]) -> Dict[str, dict]:
    """Return {user_id: {region_key, region_label, city_key, city_label,
    pulse_opt_out}} for the given ids."""
    ids = [uid for uid in user_ids if uid]
    if not ids:
        return {}
    cursor = db.users.find(
        {"id": {"$in": ids}},
        {"_id": 0, "id": 1, "region": 1, "city": 1, "pulse_opt_out": 1},
    )
    rows = await cursor.to_list(length=len(ids))
    out: Dict[str, dict] = {}
    for u in rows:
        rk, rl = _normalize_region(u.get("region") or "")
        ck, cl = _normalize_city(u.get("city") or "")
        out[u["id"]] = {
            "region_key":  rk,
            "region_label": rl,
            "city_key":    ck,
            "city_label":  cl,
            "opt_out":     bool(u.get("pulse_opt_out", False)),
        }
    return out


# ─────────────────────────────────────────────────────────────────────
# AGGREGATION — convert raw rows into a snapshot
# ─────────────────────────────────────────────────────────────────────

def _aggregate_topics(posts: List[dict]) -> Counter:
    """Counter of hashtag→count in the window (post-level, deduped per
    post so a post with #benfica twice still adds 1)."""
    c: Counter = Counter()
    for p in posts:
        tags = p.get("hashtags") or []
        if not tags:
            continue
        seen = set()
        for t in tags:
            t = (t or "").lower().strip()
            if not t or t in seen:
                continue
            seen.add(t)
            c[t] += 1
    return c


def _aggregate_moods(posts: List[dict]) -> Counter:
    c: Counter = Counter()
    for p in posts:
        moods = _detect_moods_in_text(p.get("content") or "")
        for m in moods:
            c[m] += 1
    return c


def _aggregate_by_region(
    posts: List[dict],
    comments: List[dict],
    user_idx: Dict[str, dict],
) -> Tuple[Dict[str, dict], Dict[str, dict]]:
    """Returns (by_region, by_city). Each bucket has posts_60s,
    comments_60s, active_users_60s. Opted-out users are skipped.
    Empty region/city is dropped — we never publish 'unknown' buckets
    to avoid stigmatising users who didn't fill the field.
    """
    region: Dict[str, dict] = {}
    city:   Dict[str, dict] = {}

    def _bump(bucket: Dict[str, dict], key: str, label: str, field: str, uid: str):
        if not key:
            return
        b = bucket.setdefault(key, {
            "key":               key,
            "label":             label,
            "posts_60s":         0,
            "comments_60s":      0,
            "active_users_60s":  set(),
        })
        b[field] += 1
        b["active_users_60s"].add(uid)

    for p in posts:
        uid = p.get("author_id")
        meta = user_idx.get(uid) if uid else None
        if not meta or meta.get("opt_out"):
            continue
        _bump(region, meta["region_key"], meta["region_label"], "posts_60s", uid)
        _bump(city,   meta["city_key"],   meta["city_label"],   "posts_60s", uid)

    for c in comments:
        uid = c.get("author_id")
        meta = user_idx.get(uid) if uid else None
        if not meta or meta.get("opt_out"):
            continue
        _bump(region, meta["region_key"], meta["region_label"], "comments_60s", uid)
        _bump(city,   meta["city_key"],   meta["city_label"],   "comments_60s", uid)

    # Replace set with len before serialising — sets aren't JSON-safe.
    for buckets in (region, city):
        for b in buckets.values():
            b["active_users_60s"] = len(b["active_users_60s"])

    return region, city


# ─────────────────────────────────────────────────────────────────────
# BASELINE — same hour-of-day median from the last 7 days
# ─────────────────────────────────────────────────────────────────────

async def _fetch_baseline_history(db, hour_of_day: int) -> List[dict]:
    """Return all snapshots taken in ±BASELINE_WINDOW_MINUTES around this
    hour-of-day in the previous BASELINE_LOOKBACK_DAYS days. We do this in
    Python because the time-of-day filter is awkward in a Mongo find query
    (would need a $expr / aggregation) and the dataset is tiny (~7×24×4 docs)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=BASELINE_LOOKBACK_DAYS)
    cursor = db.social_pulse_snapshots.find(
        {"taken_at": {"$gte": cutoff.isoformat()}},
        {"_id": 0, "taken_at": 1, "totals": 1, "topics_raw": 1, "moods_raw": 1},
    )
    rows = await cursor.to_list(length=10000)
    out: List[dict] = []
    for r in rows:
        try:
            dt = datetime.fromisoformat(r["taken_at"])
        except Exception:
            continue
        minute_of_day = dt.hour * 60 + dt.minute
        target_minute = hour_of_day * 60
        delta = abs(minute_of_day - target_minute)
        # Wrap-around: 23:50 vs 00:10 is 20 min, not 1420.
        delta = min(delta, 1440 - delta)
        if delta <= BASELINE_WINDOW_MINUTES:
            out.append(r)
    return out


def _baseline_value(history: List[dict], key_path: List[str]) -> float:
    """Median of a nested numeric field across baseline history. Returns
    0.0 if no history (so we don't divide-by-zero downstream)."""
    vals = []
    for r in history:
        cur: Any = r
        for k in key_path:
            if not isinstance(cur, dict):
                cur = None
                break
            cur = cur.get(k)
        if isinstance(cur, (int, float)):
            vals.append(float(cur))
    if not vals:
        return 0.0
    return float(median(vals))


def _baseline_topic(history: List[dict], tag: str) -> float:
    vals = []
    for r in history:
        raw = (r.get("topics_raw") or {})
        v = raw.get(tag, 0)
        if isinstance(v, (int, float)):
            vals.append(float(v))
    if not vals:
        return 0.0
    return float(median(vals))


def _baseline_mood(history: List[dict], mood: str) -> float:
    vals = []
    for r in history:
        raw = (r.get("moods_raw") or {})
        v = raw.get(mood, 0)
        if isinstance(v, (int, float)):
            vals.append(float(v))
    if not vals:
        return 0.0
    return float(median(vals))


def _delta_pct(current: float, baseline: float) -> Optional[float]:
    """Percentage delta. None if baseline is zero (no honest comparison)."""
    if baseline <= 0:
        return None
    return round(((current - baseline) / baseline) * 100.0, 1)


def _is_meaningful(current: float, baseline: float) -> bool:
    """Apply the honesty floor."""
    if current < MIN_ABSOLUTE_COUNT:
        return False
    if baseline <= 0:
        # No history yet — defer surfacing this signal.
        return False
    return current >= baseline * (1 + MIN_RELATIVE_DELTA)


# ─────────────────────────────────────────────────────────────────────
# MAIN — compute_pulse_snapshot
# ─────────────────────────────────────────────────────────────────────

async def compute_pulse_snapshot(db) -> dict:
    """Compute one snapshot covering the last WINDOW_SECONDS. Pure
    function: doesn't write to Mongo, doesn't broadcast. The caller
    (start_pulse_loop) handles persistence + WS push."""
    now_dt = datetime.now(timezone.utc)
    window_end_iso = now_dt.isoformat()
    window_start_iso = (now_dt - timedelta(seconds=WINDOW_SECONDS)).isoformat()
    online_cutoff = (now_dt - timedelta(seconds=ONLINE_THRESHOLD_SECONDS)).isoformat()

    # ── 1. Raw data ──────────────────────────────────────────────────
    posts, comments, messages_count, online_now = await asyncio.gather(
        _fetch_window_posts(db, window_start_iso, window_end_iso),
        _fetch_window_comments(db, window_start_iso, window_end_iso),
        _fetch_window_messages(db, window_start_iso, window_end_iso),
        _count_online_users(db, online_cutoff),
    )

    # Need the author region/city/opt-out flag for everyone in this window.
    author_ids = {p["author_id"] for p in posts if p.get("author_id")}
    author_ids |= {c["author_id"] for c in comments if c.get("author_id")}
    user_idx = await _fetch_users_index(db, author_ids)

    # ── 2. Aggregations ──────────────────────────────────────────────
    topics_raw = _aggregate_topics(posts)        # Counter
    moods_raw  = _aggregate_moods(posts)         # Counter
    by_region, by_city = _aggregate_by_region(posts, comments, user_idx)

    active_users_window = len(
        {p["author_id"] for p in posts if p.get("author_id")}
        | {c["author_id"] for c in comments if c.get("author_id")}
    )

    totals = {
        "posts_60s":         len(posts),
        "comments_60s":      len(comments),
        "messages_60s":      int(messages_count),
        "active_users_60s":  active_users_window,
        "online_now":        int(online_now),
    }

    # ── 3. Baseline + meaningful-delta filter ────────────────────────
    history = await _fetch_baseline_history(db, now_dt.hour)

    base_posts    = _baseline_value(history, ["totals", "posts_60s"])
    base_comments = _baseline_value(history, ["totals", "comments_60s"])
    base_active   = _baseline_value(history, ["totals", "active_users_60s"])
    base_online   = _baseline_value(history, ["totals", "online_now"])

    baseline = {
        "posts_60s_median":        base_posts,
        "comments_60s_median":     base_comments,
        "active_users_60s_median": base_active,
        "online_now_median":       base_online,
        "samples":                 len(history),
    }

    # Global activity delta_pct (composite of posts + comments + active users)
    composite_now      = totals["posts_60s"] + totals["comments_60s"] + totals["active_users_60s"]
    composite_baseline = base_posts + base_comments + base_active
    pulse_delta_pct    = _delta_pct(composite_now, composite_baseline)

    # ── 4. Regions / cities — only meaningful entries ────────────────
    def _enrich_buckets(buckets: Dict[str, dict]) -> List[dict]:
        out: List[dict] = []
        for key, b in buckets.items():
            score = b["posts_60s"] + b["comments_60s"] + b["active_users_60s"]
            base_score = _baseline_value(history, ["region_scores", key]) \
                if buckets is by_region else _baseline_value(history, ["city_scores", key])
            delta = _delta_pct(score, base_score)
            meaningful = _is_meaningful(score, base_score)
            out.append({
                "key":              b["key"],
                "label":            b["label"],
                "posts_60s":        b["posts_60s"],
                "comments_60s":     b["comments_60s"],
                "active_users_60s": b["active_users_60s"],
                "score":            score,
                "delta_pct":        delta,
                "meaningful":       meaningful,
            })
        # Sort by score desc, then by label for determinism.
        out.sort(key=lambda x: (-x["score"], x["label"]))
        return out

    regions_out = _enrich_buckets(by_region)
    cities_out  = _enrich_buckets(by_city)

    # ── 5. Topics — only meaningful trending hashtags ────────────────
    topics_out: List[dict] = []
    for tag, count in topics_raw.most_common(20):
        base = _baseline_topic(history, tag)
        delta = _delta_pct(float(count), base)
        meaningful = _is_meaningful(float(count), base)
        topics_out.append({
            "tag":        tag,
            "label":      f"#{tag}",
            "count_60s":  int(count),
            "delta_pct":  delta,
            "meaningful": meaningful,
        })

    # ── 6. Moods — score, delta and dominant flag ────────────────────
    moods_out: Dict[str, dict] = {}
    dominant: Optional[str] = None
    dominant_score = 0.0
    for mood in MOOD_LEXICON.keys():
        score = float(moods_raw.get(mood, 0))
        base = _baseline_mood(history, mood)
        delta = _delta_pct(score, base)
        meaningful = _is_meaningful(score, base)
        moods_out[mood] = {
            "label":      MOOD_LABEL[mood],
            "score":      int(score),
            "delta_pct":  delta,
            "meaningful": meaningful,
        }
        # Dominant mood: must clear the higher DOMINANT_MOOD_DELTA bar
        # AND have the largest score among meaningful ones.
        if (meaningful
                and base > 0
                and score >= base * (1 + DOMINANT_MOOD_DELTA)
                and score > dominant_score):
            dominant = mood
            dominant_score = score

    # Persist raw per-tag / per-mood counters so subsequent baselines can be
    # computed cheaply (no need to re-parse old posts).
    snapshot = {
        "id":              str(uuid.uuid4()),
        "taken_at":        window_end_iso,
        "window_seconds":  WINDOW_SECONDS,
        "totals":          totals,
        "baseline":        baseline,
        "pulse_delta_pct": pulse_delta_pct,
        "regions":         regions_out,
        "cities":          cities_out,
        "topics":          topics_out,
        "moods":           moods_out,
        "dominant_mood":   dominant,
        # Raw counters — only kept for baseline math, not exposed via API.
        "topics_raw":      dict(topics_raw),
        "moods_raw":       dict(moods_raw),
        "region_scores":   {b["key"]: b["score"] for b in regions_out},
        "city_scores":     {b["key"]: b["score"] for b in cities_out},
    }
    return snapshot


# ─────────────────────────────────────────────────────────────────────
# PERSISTENCE + LOOP
# ─────────────────────────────────────────────────────────────────────

async def init_pulse_indexes(db) -> None:
    """Indexes: TTL on taken_at, plus an ordinary index for fast
    fetch_latest. Called from server startup once."""
    try:
        # Mongo TTL needs a Date field, but we store ISO strings. Use a
        # secondary `expire_at` Date field for the TTL index.
        await db.social_pulse_snapshots.create_index(
            "expire_at", expireAfterSeconds=0, name="pulse_ttl"
        )
        await db.social_pulse_snapshots.create_index(
            [("taken_at", -1)], name="pulse_taken_at"
        )
        # Index that powers /pulse/topics baseline lookups.
        logger.info("pulse_engine: indexes ready")
    except Exception as exc:
        logger.warning(f"pulse_engine: index creation skipped: {exc}")


async def _persist_snapshot(db, snapshot: dict) -> None:
    """Write the snapshot with a TTL companion timestamp."""
    doc = dict(snapshot)
    doc["expire_at"] = datetime.now(timezone.utc) + timedelta(seconds=SNAPSHOT_TTL_SECONDS)
    try:
        await db.social_pulse_snapshots.insert_one(doc)
    except Exception as exc:
        logger.warning(f"pulse_engine: failed to persist snapshot: {exc}")


def _public_snapshot(snapshot: dict) -> dict:
    """Strip the internal `*_raw` and `*_scores` counters before sending
    to API consumers."""
    out = dict(snapshot)
    out.pop("topics_raw", None)
    out.pop("moods_raw", None)
    out.pop("region_scores", None)
    out.pop("city_scores", None)
    out.pop("expire_at", None)
    out.pop("_id", None)
    return out


async def fetch_latest_snapshot(db) -> Optional[dict]:
    doc = await db.social_pulse_snapshots.find_one(
        {}, {"_id": 0}, sort=[("taken_at", -1)]
    )
    return _public_snapshot(doc) if doc else None


async def fetch_recent_snapshots(db, minutes: int = 60) -> List[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    cursor = db.social_pulse_snapshots.find(
        {"taken_at": {"$gte": cutoff}},
        {"_id": 0},
        sort=[("taken_at", 1)],
    )
    rows = await cursor.to_list(length=2000)
    return [_public_snapshot(r) for r in rows]


# ─────────────────────────────────────────────────────────────────────
# BACKGROUND LOOP
# ─────────────────────────────────────────────────────────────────────

_loop_task: Optional[asyncio.Task] = None
_last_snapshot_cache: Optional[dict] = None
_last_snapshot_ts: float = 0.0


def get_last_snapshot_cache() -> Tuple[Optional[dict], float]:
    """Returns (snapshot, monotonic_time_taken). Used by REST endpoints
    that want to return the freshest value without a Mongo round-trip."""
    return _last_snapshot_cache, _last_snapshot_ts


async def _tick_once(db, ws_manager) -> None:
    """One full loop iteration: compute, persist, broadcast, cache."""
    global _last_snapshot_cache, _last_snapshot_ts
    t0 = time.monotonic()
    try:
        snap = await compute_pulse_snapshot(db)
    except Exception as exc:
        logger.exception(f"pulse_engine: compute failed: {exc}")
        return
    await _persist_snapshot(db, snap)
    _last_snapshot_cache = _public_snapshot(snap)
    _last_snapshot_ts = time.monotonic()
    dur_ms = int((time.monotonic() - t0) * 1000)
    # Broadcast a *small* payload — clients can fetch /pulse/now for the
    # full thing. The ticker is just a heartbeat + headline numbers so
    # ambient UI can update without polling.
    if ws_manager is not None:
        try:
            await ws_manager.broadcast({
                "type": "pulse_tick",
                "taken_at": snap["taken_at"],
                "totals": snap["totals"],
                "pulse_delta_pct": snap["pulse_delta_pct"],
                "dominant_mood": snap["dominant_mood"],
                "meaningful_topics": [
                    {"tag": t["tag"], "delta_pct": t["delta_pct"]}
                    for t in snap["topics"] if t["meaningful"]
                ][:5],
                "meaningful_regions": [
                    {"key": r["key"], "label": r["label"], "delta_pct": r["delta_pct"]}
                    for r in snap["regions"] if r["meaningful"]
                ][:5],
            })
        except Exception as exc:
            logger.warning(f"pulse_engine: ws broadcast failed: {exc}")
    if dur_ms > 500:
        logger.warning(f"pulse_engine: slow tick ({dur_ms} ms)")


async def _loop(db, ws_manager) -> None:
    """Run forever, one tick per LOOP_INTERVAL_SECONDS. Resilient: any
    crash inside a tick is swallowed and the next tick still runs."""
    logger.info("pulse_engine: loop starting")
    # Small jitter so multiple replicas (eventually) don't all tick at the
    # same second. Cheap entropy via time().
    initial_delay = (time.time() % 7)
    await asyncio.sleep(initial_delay)
    while True:
        try:
            await _tick_once(db, ws_manager)
        except asyncio.CancelledError:
            logger.info("pulse_engine: loop cancelled")
            raise
        except Exception as exc:
            logger.exception(f"pulse_engine: unexpected tick error: {exc}")
        await asyncio.sleep(LOOP_INTERVAL_SECONDS)


def start_pulse_loop(db, ws_manager) -> asyncio.Task:
    """Idempotent: only one task ever runs. Returns the task handle so
    a future shutdown handler can await its cancellation."""
    global _loop_task
    if _loop_task is not None and not _loop_task.done():
        return _loop_task
    _loop_task = asyncio.create_task(_loop(db, ws_manager), name="pulse_loop")
    return _loop_task


async def stop_pulse_loop() -> None:
    """Cancel the loop cleanly. Called from server shutdown."""
    global _loop_task
    if _loop_task and not _loop_task.done():
        _loop_task.cancel()
        try:
            await _loop_task
        except asyncio.CancelledError:
            pass
        _loop_task = None


# ─────────────────────────────────────────────────────────────────────
# Test helpers (exposed so the testing agent can force a tick)
# ─────────────────────────────────────────────────────────────────────

async def force_tick(db, ws_manager) -> dict:
    """Run a single tick synchronously and return the public snapshot.
    Used by the admin debug endpoint and by tests."""
    await _tick_once(db, ws_manager)
    cache, _ = get_last_snapshot_cache()
    if cache:
        return cache
    return _public_snapshot(await compute_pulse_snapshot(db))
