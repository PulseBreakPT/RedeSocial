"""
happenings.py — Micro-eventos sociais de comunidade ("o bairro a ferver").

Um HAPPENING é um EPISÓDIO detetado e persistido do sinal contínuo do pulso:
quando uma comunidade aquece de forma real (temperatura alta OU desvio forte à
sua própria baseline), abre-se um happening; quando acalma, fecha. Cada
happening fica em memória (TTL 30d) → "ontem às 21h isto fervilhou".

TRÊS PAPÉIS DISTINTOS (não fundir):
  · pulso     — sinal contínuo a cada 60s (community_pulse).
  · happening — episódio detetado/persistido desse sinal (este módulo).
  · hype      — humanos a AMPLIFICAR um happening ativo (amplifiers[]).

Honestidade: a deteção é 100% derivada do snapshot real do pulso (que já é
gated por MIN_ABSOLUTE_COUNT/baseline própria). Hype nunca cria um happening;
um happening nunca fabrica contagens de hype.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger("happenings")

HOT_TEMPS = {"em_brasa", "a_ferver"}
DELTA_HOT = 50.0           # % acima da baseline → episódio
SCORE_FLOOR = 20.0         # piso absoluto p/ o ramo de delta (evita ruído)
CLOSE_AFTER_QUIET_TICKS = 3  # ~3 ticks calmos (≈3min) → fecha
PEAK_BUMP = 15.0           # só re-anuncia "peak" se subir este tanto
TTL_SECONDS = 30 * 24 * 3600


def _top_trend(snap: dict) -> Optional[dict]:
    mt = snap.get("meaningful_trends") or []
    if mt:
        return {"tag": mt[0].get("tag"), "label": mt[0].get("label")}
    tr = snap.get("trends") or []
    if tr:
        return {"tag": tr[0].get("tag"), "label": tr[0].get("label")}
    return None


def _is_hot(snap: dict) -> bool:
    score = snap.get("score") or 0
    temp = snap.get("temperature")
    delta = snap.get("delta_pct")
    if temp in HOT_TEMPS:
        return True
    return delta is not None and delta >= DELTA_HOT and score >= SCORE_FLOOR


def new_happening_doc(community: dict, snap: dict, now: Optional[datetime] = None) -> dict:
    now = now or datetime.now(timezone.utc)
    score = float(snap.get("score") or 0)
    kind = snap.get("temperature") if snap.get("temperature") in HOT_TEMPS else "delta"
    return {
        "id": str(uuid.uuid4()),
        "community_id": community["id"],
        "slug": community.get("slug"),
        "kind": kind,
        "peak_score": score,
        "last_score": score,
        "delta_pct": snap.get("delta_pct"),
        "dominant_mood": snap.get("dominant_mood"),
        "dominant_mood_label": snap.get("dominant_mood_label"),
        "top_trend": _top_trend(snap),
        "started_at": now.isoformat(),
        "ended_at": None,
        "amplifiers": [],
        "quiet_ticks": 0,
        "expire_at": now + timedelta(seconds=TTL_SECONDS),
    }


def public_happening(doc: dict) -> dict:
    return {
        "id": doc.get("id"),
        "community_id": doc.get("community_id"),
        "slug": doc.get("slug"),
        "kind": doc.get("kind"),
        "peak_score": doc.get("peak_score"),
        "delta_pct": doc.get("delta_pct"),
        "dominant_mood_label": doc.get("dominant_mood_label"),
        "top_trend": doc.get("top_trend"),
        "started_at": doc.get("started_at"),
        "ended_at": doc.get("ended_at"),
        "amplifiers_count": len(doc.get("amplifiers") or []),
        "active": doc.get("ended_at") is None,
    }


async def _broadcast(ws_manager, community_id: str, phase: str, doc: dict) -> None:
    if ws_manager is None:
        return
    try:
        await ws_manager.broadcast_to_community(community_id, {
            "type": "community_happening",
            "phase": phase,                       # started | peak | ended | amplified
            "community_id": community_id,
            "slug": doc.get("slug"),
            "happening": public_happening(doc),
        })
    except Exception:
        pass


async def detect_and_update(db, community: dict, snap: dict, ws_manager,
                            now: Optional[datetime] = None, on_started=None) -> Optional[dict]:
    """Chamado a cada tick do pulso com o snapshot real. Abre/estende/fecha o
    happening da comunidade. `on_started(community, doc)` permite fan-out de
    notificações (Onda D) sem acoplar este módulo às notificações."""
    now = now or datetime.now(timezone.utc)
    cid = community["id"]
    score = float(snap.get("score") or 0)
    active = await db.community_happenings.find_one({"community_id": cid, "ended_at": None}, {"_id": 0})

    if _is_hot(snap):
        if active:
            update = {
                "last_score": score, "quiet_ticks": 0,
                "delta_pct": snap.get("delta_pct"),
                "dominant_mood": snap.get("dominant_mood"),
                "dominant_mood_label": snap.get("dominant_mood_label"),
                "top_trend": _top_trend(snap),
            }
            phase = None
            if score > (active.get("peak_score") or 0) + PEAK_BUMP:
                update["peak_score"] = score
                phase = "peak"
            await db.community_happenings.update_one({"id": active["id"]}, {"$set": update})
            if phase:
                await _broadcast(ws_manager, cid, "peak", {**active, **update})
            return None
        doc = new_happening_doc(community, snap, now)
        await db.community_happenings.insert_one(dict(doc))
        await _broadcast(ws_manager, cid, "started", doc)
        if on_started:
            try:
                await on_started(community, doc)
            except Exception as exc:
                logger.warning(f"happenings: on_started hook failed: {exc}")
        return {"event": "started", "happening": doc}

    if active:
        quiet = (active.get("quiet_ticks") or 0) + 1
        if quiet >= CLOSE_AFTER_QUIET_TICKS:
            ended_at = now.isoformat()
            await db.community_happenings.update_one(
                {"id": active["id"]}, {"$set": {"ended_at": ended_at, "quiet_ticks": quiet}}
            )
            await _broadcast(ws_manager, cid, "ended", {**active, "ended_at": ended_at})
            return {"event": "ended", "happening": {**active, "ended_at": ended_at}}
        await db.community_happenings.update_one(
            {"id": active["id"]}, {"$set": {"quiet_ticks": quiet, "last_score": score}}
        )
    return None


async def open_happening_community_ids(db) -> list:
    try:
        return await db.community_happenings.distinct("community_id", {"ended_at": None})
    except Exception:
        return []


async def init_happening_indexes(db) -> None:
    try:
        await db.community_happenings.create_index("expire_at", expireAfterSeconds=0, name="happening_ttl")
        await db.community_happenings.create_index(
            [("community_id", 1), ("started_at", -1)], name="happening_lookup"
        )
        await db.community_happenings.create_index(
            [("community_id", 1), ("ended_at", 1)], name="happening_active"
        )
        logger.info("happenings: indexes ready")
    except Exception as exc:
        logger.warning(f"happenings: index creation skipped: {exc}")
