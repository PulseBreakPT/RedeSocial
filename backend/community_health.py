"""
community_health.py — Saúde do bairro (espelha o reputation_engine).

Cada comunidade tem um `health_score` (0–100) recalculado em background. Mede
QUALIDADE de vida coletiva, não volume:

  + reciprocidade (comentários que são respostas em fios)
  + diversidade de autores (não dominada por 1–2 pessoas)
  + regulares (membros que voltam — last_seen recente)
  − toxicidade (léxico PT curado, reutilizado do reputation_engine)
  − reports na comunidade

REGRAS DE OURO (iguais ao reputation_engine):
  * NUNCA exposto publicamente como número/badge. Influencia subtilmente a
    DESCOBERTA (comunidades vivas+saudáveis sobem) e um painel PRIVADO de mods.
  * SEM IA. Contagem + léxico + matemática determinística.
  * Default NEUTRO. Comunidades inativas não são penalizadas.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import reputation_engine  # reutiliza _is_toxic, _clamp, NEUTRAL

logger = logging.getLogger("community_health")

RECENT_DAYS = 14            # janela mais curta → descoberta mais fresca
REGULARS_DAYS = 7
CONTENT_SCAN_LIMIT = 200
ACTIVE_CAP = 2000
LOOP_INTERVAL_SECONDS = 3600   # 1h (descoberta fresca)
SNAPSHOT_TTL_SECONDS = 30 * 24 * 3600

NEUTRAL = reputation_engine.NEUTRAL_SCORE


def health_multiplier_community(score: Optional[int]) -> float:
    """Multiplicador para a descoberta. Subtil: bairros tóxicos/frios descem,
    vivos+saudáveis sobem. Nunca mostrado."""
    if score is None:
        return 1.0
    if score < 30:
        return 0.85
    if score > 70:
        return 1.10
    return 1.0


async def compute_community_health(db, community: dict, now: Optional[datetime] = None) -> dict:
    """Devolve {'score': int, 'breakdown': {...}}. Determinístico; nunca lança."""
    cid = community["id"]
    try:
        now = now or datetime.now(timezone.utc)
        cutoff = (now - timedelta(days=RECENT_DAYS)).isoformat()
        reg_cutoff = (now - timedelta(days=REGULARS_DAYS)).isoformat()

        posts_n = await db.posts.count_documents(
            {"community_id": cid, "created_at": {"$gte": cutoff}, "is_draft": {"$ne": True}}
        )
        comments_n = await db.comments.count_documents(
            {"community_id": cid, "created_at": {"$gte": cutoff}}
        )
        replies_n = await db.comments.count_documents(
            {"community_id": cid, "parent_id": {"$ne": None}, "created_at": {"$gte": cutoff}}
        )
        distinct_authors = await db.posts.distinct(
            "author_id", {"community_id": cid, "created_at": {"$gte": cutoff}}
        )
        n_authors = len(distinct_authors or [])

        members = community.get("members", []) or []
        regulars = 0
        if members:
            regulars = await db.users.count_documents(
                {"id": {"$in": members}, "last_seen": {"$gte": reg_cutoff}}
            )

        # Toxicidade: amostra de conteúdo recente da comunidade.
        recent = await db.posts.find(
            {"community_id": cid, "created_at": {"$gte": cutoff}},
            {"_id": 0, "content": 1},
        ).sort("created_at", -1).to_list(CONTENT_SCAN_LIMIT)
        recent_c = await db.comments.find(
            {"community_id": cid, "created_at": {"$gte": cutoff}},
            {"_id": 0, "content": 1},
        ).sort("created_at", -1).to_list(CONTENT_SCAN_LIMIT)
        toxic_hits = sum(
            1 for it in (recent + recent_c) if reputation_engine._is_toxic(it.get("content", ""))
        )

        reports_n = await db.community_reports.count_documents({"community_id": cid})

        total_activity = posts_n + comments_n
        reciprocity = (replies_n / comments_n) if comments_n else 0.0

        # ── Math determinística (começa em NEUTRAL) ──────────────────
        score = float(NEUTRAL)
        if total_activity > 0:
            score += 8
        score += 15 * min(1.0, reciprocity)        # fios, não monólogos
        score += min(15, n_authors)                # muitas vozes
        score += min(10, regulars)                 # gente que volta
        score -= min(30, toxic_hits * 5)
        score -= min(30, reports_n * 6)

        breakdown = {
            "posts": posts_n, "comments": comments_n, "replies": replies_n,
            "reciprocity": round(reciprocity, 2), "distinct_authors": n_authors,
            "regulars_7d": regulars, "toxic_hits": toxic_hits, "reports": reports_n,
        }
        return {"score": reputation_engine._clamp(score), "breakdown": breakdown}
    except Exception as exc:
        logger.warning(f"community_health: compute failed for {cid}: {exc}")
        return {"score": NEUTRAL, "breakdown": {}}


async def _active_community_ids(db, now: datetime, cap: int) -> List[str]:
    cutoff = (now - timedelta(days=RECENT_DAYS)).isoformat()
    try:
        ids = await db.posts.distinct(
            "community_id", {"community_id": {"$ne": None}, "created_at": {"$gte": cutoff}}
        )
    except Exception:
        return []
    return [c for c in (ids or []) if c][:cap]


async def recompute_all(db, cap: int = ACTIVE_CAP) -> int:
    now = datetime.now(timezone.utc)
    ids = await _active_community_ids(db, now, cap)
    updated = 0
    for cid in ids:
        comm = await db.communities.find_one({"id": cid}, {"_id": 0, "id": 1, "members": 1})
        if not comm:
            continue
        res = await compute_community_health(db, comm, now)
        try:
            await db.communities.update_one(
                {"id": cid},
                {"$set": {"health_score": res["score"], "health_breakdown": res["breakdown"]}},
            )
            await db.community_health_snapshots.insert_one({
                "community_id": cid, "score": res["score"], "breakdown": res["breakdown"],
                "taken_at": now.isoformat(),
                "expire_at": now + timedelta(seconds=SNAPSHOT_TTL_SECONDS),
            })
            updated += 1
        except Exception:
            pass
    logger.info(f"community_health: recomputed {updated}/{len(ids)} communities")
    return updated


async def init_community_health_indexes(db) -> None:
    try:
        await db.communities.create_index("health_score")
        await db.community_health_snapshots.create_index("expire_at", expireAfterSeconds=0, name="chealth_ttl")
        await db.community_health_snapshots.create_index(
            [("community_id", 1), ("taken_at", -1)], name="chealth_lookup"
        )
        logger.info("community_health: indexes ready")
    except Exception as exc:
        logger.warning(f"community_health: index creation skipped: {exc}")


_loop_task: Optional[asyncio.Task] = None


async def _loop(db) -> None:
    logger.info("community_health: loop starting")
    await asyncio.sleep(45)
    while True:
        try:
            await recompute_all(db)
        except asyncio.CancelledError:
            logger.info("community_health: loop cancelled")
            raise
        except Exception as exc:
            logger.exception(f"community_health: recompute error: {exc}")
        await asyncio.sleep(LOOP_INTERVAL_SECONDS)


def start_community_health_loop(db) -> asyncio.Task:
    global _loop_task
    if _loop_task is not None and not _loop_task.done():
        return _loop_task
    _loop_task = asyncio.create_task(_loop(db), name="community_health_loop")
    return _loop_task


async def stop_community_health_loop() -> None:
    global _loop_task
    if _loop_task and not _loop_task.done():
        _loop_task.cancel()
        try:
            await _loop_task
        except asyncio.CancelledError:
            pass
        _loop_task = None
