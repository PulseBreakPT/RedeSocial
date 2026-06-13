"""
community_pulse.py — Comunidades vivas (presence-first).

Motor de "pulso" por comunidade: espelha o pulse_engine global mas com tudo
filtrado por `community_id`. Mede atividade REAL (posts/comentários/ativos na
janela de 60s), compara com a baseline da própria comunidade à mesma hora
(memória social → ritmo horário) e deriva sinais humanos:

  · temperatura social  (fria → a ferver)
  · estado atual        (calma / ativa / intensa / acima do normal)
  · energia live        (0..1 normalizado, para a UI)
  · mood coletivo       (léxico PT, reutilizado do pulse_engine)
  · trends internas     (hashtags a crescer DENTRO da comunidade)

Honestidade do sinal: nada é inventado. Os mesmos thresholds do pulse_engine
(MIN_ABSOLUTE_COUNT, MIN_RELATIVE_DELTA) decidem o que é "meaningful". Sem
sinal → os campos vêm a zero/None e a UI mostra "calma", nunca uma mentira.

Persistência: snapshots em `community_pulse_snapshots` (TTL) para construir
a baseline horária e a memória social. Um loop de background só processa as
comunidades ATIVAS (com atividade recente), difundindo o pulso às salas WS.
"""

import asyncio
import logging
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

# Reutiliza helpers já provados do motor global (sem duplicar lógica).
from pulse_engine import (
    _aggregate_topics,
    _aggregate_moods,
    _detect_moods_in_text,  # noqa: F401 (importado p/ paridade/uso futuro)
    MOOD_LABEL,
    _delta_pct,
    _is_meaningful,
)

logger = logging.getLogger("community_pulse")

WINDOW_SECONDS = 60
ONLINE_THRESHOLD_SECONDS = 300        # last_seen ≤ 5min = "online"
BASELINE_LOOKBACK_DAYS = 7
BASELINE_WINDOW_MINUTES = 45          # ±45min à volta da hora atual
SNAPSHOT_TTL_SECONDS = 30 * 24 * 3600  # 30d de memória social
LOOP_INTERVAL_SECONDS = 60
ACTIVE_LOOKBACK_MINUTES = 20          # comunidade "ativa" = atividade ≤ 20min
CACHE_MAX_AGE_SECONDS = 20            # cache curto no hot path

# Pesos para o "score" de atividade da comunidade (post pesa mais que like
# implícito; comentário é conversa; utilizador ativo é presença).
W_POST = 6.0
W_COMMENT = 4.0
W_ACTIVE = 3.0


# ─────────────────────────────────────────────────────────────────────
# DERIVAÇÕES HUMANAS (temperatura / estado / energia)
# ─────────────────────────────────────────────────────────────────────

def temperature_for(score: float) -> Tuple[str, str]:
    """(key, label pt-PT). Escala alinhada com o 'heat' por-post do feed."""
    if score >= 70:
        return "a_ferver", "A ferver"
    if score >= 45:
        return "em_brasa", "Em brasa"
    if score >= 25:
        return "quente", "Quente"
    if score >= 10:
        return "morna", "Morna"
    return "fria", "Fria"


def state_for(score: float, delta_pct: Optional[float], active_users: int) -> Tuple[str, str]:
    """(key, label). Combina intensidade absoluta com desvio à baseline."""
    if delta_pct is not None and delta_pct >= 50 and score >= 10:
        return "acima_do_normal", "Acima do normal"
    if score >= 45:
        return "intensa", "Intensa"
    if score >= 10 or active_users >= 3:
        return "ativa", "Ativa"
    return "calma", "Calma"


def energy_for(score: float) -> float:
    """Energia normalizada 0..1 para a UI (cap suave em ~120)."""
    return round(min(1.0, max(0.0, score / 120.0)), 3)


def _score(posts: int, comments: int, active: int) -> float:
    return W_POST * posts + W_COMMENT * comments + W_ACTIVE * active


# ─────────────────────────────────────────────────────────────────────
# QUERIES (janela + baseline), tudo filtrado por community_id
# ─────────────────────────────────────────────────────────────────────

async def _fetch_window(db, community_id: str, w_start: str, w_end: str) -> Tuple[List[dict], List[dict]]:
    posts = await db.posts.find(
        {"community_id": community_id, "created_at": {"$gte": w_start, "$lt": w_end}, "is_draft": {"$ne": True}},
        {"_id": 0, "id": 1, "author_id": 1, "content": 1, "hashtags": 1, "created_at": 1},
    ).to_list(2000)
    # Comentários trazem community_id denormalizado (ver server.py na criação).
    comments = await db.comments.find(
        {"community_id": community_id, "created_at": {"$gte": w_start, "$lt": w_end}},
        {"_id": 0, "id": 1, "author_id": 1, "post_id": 1, "content": 1, "created_at": 1},
    ).to_list(2000)
    return posts, comments


async def _members_online(db, members: List[str]) -> int:
    if not members:
        return 0
    threshold = (datetime.now(timezone.utc) - timedelta(seconds=ONLINE_THRESHOLD_SECONDS)).isoformat()
    try:
        return await db.users.count_documents(
            {"id": {"$in": members}, "last_seen": {"$gte": threshold}}
        )
    except Exception:
        return 0


async def _fetch_baseline_history(db, community_id: str, hour_of_day: int) -> List[dict]:
    """Snapshots desta comunidade em ±BASELINE_WINDOW_MINUTES à volta desta
    hora-do-dia, nos últimos BASELINE_LOOKBACK_DAYS dias. Filtro de hora em
    Python (dataset minúsculo)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=BASELINE_LOOKBACK_DAYS)).isoformat()
    rows = await db.community_pulse_snapshots.find(
        {"community_id": community_id, "taken_at": {"$gte": cutoff}},
        {"_id": 0},
    ).to_list(4000)
    out = []
    for r in rows:
        try:
            ts = datetime.fromisoformat(str(r["taken_at"]).replace("Z", "+00:00"))
        except Exception:
            continue
        diff = abs((ts.hour * 60 + ts.minute) - (hour_of_day * 60))
        diff = min(diff, 1440 - diff)
        if diff <= BASELINE_WINDOW_MINUTES:
            out.append(r)
    return out


def _baseline_median(history: List[dict], path: List[str]) -> float:
    vals = []
    for h in history:
        node = h
        for k in path:
            node = (node or {}).get(k) if isinstance(node, dict) else None
        if isinstance(node, (int, float)):
            vals.append(float(node))
    if not vals:
        return 0.0
    vals.sort()
    n = len(vals)
    mid = n // 2
    return vals[mid] if n % 2 else (vals[mid - 1] + vals[mid]) / 2.0


def _baseline_topic(history: List[dict], tag: str) -> float:
    vals = []
    for h in history:
        for t in (h.get("trends") or []):
            if t.get("tag") == tag:
                vals.append(float(t.get("count_60s", 0)))
                break
        else:
            vals.append(0.0)
    if not vals:
        return 0.0
    vals.sort()
    n = len(vals)
    mid = n // 2
    return vals[mid] if n % 2 else (vals[mid - 1] + vals[mid]) / 2.0


# ─────────────────────────────────────────────────────────────────────
# COMPUTE
# ─────────────────────────────────────────────────────────────────────

async def compute_community_pulse(db, community: dict) -> dict:
    """Snapshot completo do pulso de uma comunidade (não persiste)."""
    cid = community["id"]
    now = datetime.now(timezone.utc)
    w_end = now.isoformat()
    w_start = (now - timedelta(seconds=WINDOW_SECONDS)).isoformat()

    posts, comments = await _fetch_window(db, cid, w_start, w_end)
    posts_n = len(posts)
    comments_n = len(comments)
    active_ids = {p.get("author_id") for p in posts if p.get("author_id")}
    active_ids |= {c.get("author_id") for c in comments if c.get("author_id")}
    active_users = len(active_ids)

    members = community.get("members", []) or []
    online = await _members_online(db, members)

    score = _score(posts_n, comments_n, active_users)

    # Baseline da própria comunidade à mesma hora.
    history = await _fetch_baseline_history(db, cid, now.hour)
    base_score = _baseline_median(history, ["score"])
    delta_pct = _delta_pct(score, base_score)

    temp_key, temp_label = temperature_for(score)
    state_key, state_label = state_for(score, delta_pct, active_users)

    # Trends internas (hashtags a crescer dentro da comunidade).
    topic_counts: Counter = _aggregate_topics(posts)
    trends = []
    for tag, count in topic_counts.most_common(8):
        base_t = _baseline_topic(history, tag)
        trends.append({
            "tag": tag,
            "label": f"#{tag}",
            "count_60s": count,
            "delta_pct": _delta_pct(count, base_t),
            "meaningful": _is_meaningful(count, base_t),
        })

    # Mood coletivo (top mood da janela, se houver sinal).
    mood_counts: Counter = _aggregate_moods(posts)
    dominant_mood = None
    if mood_counts:
        top_mood, top_n = mood_counts.most_common(1)[0]
        if top_n >= 2:
            dominant_mood = top_mood

    return {
        "community_id": cid,
        "slug": community.get("slug"),
        "taken_at": w_end,
        "window_seconds": WINDOW_SECONDS,
        "totals": {
            "posts_60s": posts_n,
            "comments_60s": comments_n,
            "active_users_60s": active_users,
            "members_online": online,
            "members_total": len(members),
        },
        "score": round(score, 2),
        "baseline_score": round(base_score, 2),
        "delta_pct": delta_pct,
        "energy": energy_for(score),
        "temperature": temp_key,
        "temperature_label": temp_label,
        "state": state_key,
        "state_label": state_label,
        "dominant_mood": dominant_mood,
        "dominant_mood_label": MOOD_LABEL.get(dominant_mood) if dominant_mood else None,
        "trends": trends,
        "meaningful_trends": [t for t in trends if t["meaningful"]],
    }


# ─────────────────────────────────────────────────────────────────────
# PERSISTÊNCIA + CACHE
# ─────────────────────────────────────────────────────────────────────

_cache: Dict[str, Tuple[dict, float]] = {}   # cid -> (snapshot, monotonic_ts)

# Gancho opcional chamado quando um happening abre — o server.py liga aqui o
# fan-out de notificações (Onda D) sem o motor depender das notificações.
_HAPPENING_ON_STARTED = None


def set_happening_on_started(cb) -> None:
    global _HAPPENING_ON_STARTED
    _HAPPENING_ON_STARTED = cb


async def _persist(db, snap: dict) -> None:
    doc = dict(snap)
    doc.pop("meaningful_trends", None)  # derivável; não persistir
    doc["expire_at"] = datetime.now(timezone.utc) + timedelta(seconds=SNAPSHOT_TTL_SECONDS)
    try:
        await db.community_pulse_snapshots.insert_one(doc)
    except Exception as exc:
        logger.warning(f"community_pulse: persist failed: {exc}")


async def get_pulse(db, community: dict, *, persist: bool = False) -> dict:
    """Pulso da comunidade com cache curto. `persist=True` grava o snapshot
    (usado pelo loop, não pelo hot path de leitura)."""
    cid = community["id"]
    cached = _cache.get(cid)
    if cached and (time.monotonic() - cached[1]) < CACHE_MAX_AGE_SECONDS:
        return cached[0]
    snap = await compute_community_pulse(db, community)
    _cache[cid] = (snap, time.monotonic())
    if persist:
        await _persist(db, snap)
    return snap


# ─────────────────────────────────────────────────────────────────────
# LOOP — só comunidades ativas
# ─────────────────────────────────────────────────────────────────────

_loop_task: Optional[asyncio.Task] = None


async def _active_community_ids(db) -> List[str]:
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=ACTIVE_LOOKBACK_MINUTES)).isoformat()
    try:
        from_posts = await db.posts.distinct(
            "community_id", {"community_id": {"$ne": None}, "created_at": {"$gte": cutoff}}
        )
        from_comments = await db.comments.distinct(
            "community_id", {"community_id": {"$ne": None}, "created_at": {"$gte": cutoff}}
        )
    except Exception:
        return []
    ids = {c for c in (list(from_posts) + list(from_comments)) if c}
    return list(ids)


async def _tick_once(db, ws_manager) -> None:
    cids = await _active_community_ids(db)
    # Inclui comunidades com gente presente nas salas WS (mesmo sem posts).
    try:
        if ws_manager is not None:
            present = getattr(ws_manager, "viewers_by_community", {}) or {}
            cids = list({*cids, *[c for c, s in present.items() if s]})
    except Exception:
        pass
    # Inclui comunidades com um happening ABERTO, para o conseguir fechar
    # mesmo que já tenham acalmado e saído do conjunto "ativo".
    try:
        import happenings
        open_h = await happenings.open_happening_community_ids(db)
        cids = list({*cids, *open_h})
    except Exception:
        open_h = []
    if not cids:
        return
    comms = await db.communities.find(
        {"id": {"$in": cids}}, {"_id": 0, "id": 1, "slug": 1, "members": 1}
    ).to_list(len(cids))
    for comm in comms:
        try:
            snap = await compute_community_pulse(db, comm)
            _cache[comm["id"]] = (snap, time.monotonic())
            await _persist(db, snap)
            if ws_manager is not None:
                await ws_manager.broadcast_to_community(comm["id"], {
                    "type": "community_pulse",
                    "community_id": comm["id"],
                    "slug": comm.get("slug"),
                    "pulse": snap,
                })
            # Deteção de micro-eventos (abre/estende/fecha happening real).
            try:
                import happenings
                await happenings.detect_and_update(db, comm, snap, ws_manager,
                                                   on_started=_HAPPENING_ON_STARTED)
            except Exception as exc:
                logger.warning(f"community_pulse: happening detect failed for {comm.get('id')}: {exc}")
        except Exception as exc:
            logger.warning(f"community_pulse: tick failed for {comm.get('id')}: {exc}")


async def _loop(db, ws_manager) -> None:
    logger.info("community_pulse: loop starting")
    await asyncio.sleep(5)
    while True:
        try:
            await _tick_once(db, ws_manager)
        except asyncio.CancelledError:
            logger.info("community_pulse: loop cancelled")
            raise
        except Exception as exc:
            logger.exception(f"community_pulse: tick error: {exc}")
        await asyncio.sleep(LOOP_INTERVAL_SECONDS)


def start_community_pulse_loop(db, ws_manager) -> asyncio.Task:
    global _loop_task
    if _loop_task is not None and not _loop_task.done():
        return _loop_task
    _loop_task = asyncio.create_task(_loop(db, ws_manager), name="community_pulse_loop")
    return _loop_task


async def stop_community_pulse_loop() -> None:
    global _loop_task
    if _loop_task and not _loop_task.done():
        _loop_task.cancel()
        try:
            await _loop_task
        except asyncio.CancelledError:
            pass
        _loop_task = None


async def init_community_pulse_indexes(db) -> None:
    try:
        await db.community_pulse_snapshots.create_index("expire_at", expireAfterSeconds=0, name="cpulse_ttl")
        await db.community_pulse_snapshots.create_index(
            [("community_id", 1), ("taken_at", -1)], name="cpulse_lookup"
        )
        logger.info("community_pulse: indexes ready")
    except Exception as exc:
        logger.warning(f"community_pulse: index creation skipped: {exc}")
