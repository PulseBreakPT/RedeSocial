"""
reputation_engine.py — Fase 6 / Reputação Humana Invisível.

Cada utilizador tem um `health_score` (0–100) recalculado em background
(diário). Mede QUALIDADE de presença, não popularidade:

  + reciprocidade (responder a respostas, entrar em fios)
  + diversidade conversacional (não falar só com 3 pessoas)
  + presença regular mas não obsessiva
  − reports contra o utilizador / o seu conteúdo
  − toxicidade detetada por um léxico PT curado

REGRAS DE OURO:
  * NUNCA exposto via API. Vive em `users.health_score` e só influencia o
    scoring do feed (subtil). Sem leaderboards, sem badges, sem níveis.
  * SEM IA. Tudo é contagem + léxico curado + matemática determinística.
  * Default neutro (None → multiplicador 1.0). Inativos não são penalizados.

Padrão de loop idêntico ao pulse_engine (asyncio task, start/stop).
"""

import asyncio
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import List, Optional

logger = logging.getLogger("reputation")

RECENT_DAYS = 30
ACTIVE_USER_CAP = 5000          # processa só utilizadores activos recentemente
CONTENT_SCAN_LIMIT = 60         # posts+comentários recentes lidos por utilizador
LOOP_INTERVAL_SECONDS = 86400   # diário

NEUTRAL_SCORE = 50

# Léxico PT de toxicidade — curado e conservador (insultos/ataques óbvios).
# Deliberadamente pequeno para minimizar falsos positivos. Tudo minúsculas;
# o match é por fronteira de palavra (não apanha substrings inocentes).
TOXIC_LEXICON_PT = {
    "idiota", "imbecil", "estúpido", "estupido", "burro", "parvo", "otário",
    "otario", "cretino", "palhaço", "palhaco", "lixo", "nojento", "patético",
    "patetico", "verme", "escumalha", "cala-te", "vai-te lixar", "merda",
    "anormal", "tarado", "corno", "vergonha alheia", "ninguém te aturas",
}
# Pré-compila um regex de fronteira de palavra para os tokens de palavra única.
_SINGLE = [t for t in TOXIC_LEXICON_PT if " " not in t]
_PHRASES = [t for t in TOXIC_LEXICON_PT if " " in t]
_TOXIC_RE = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in _SINGLE) + r")\b", re.IGNORECASE
) if _SINGLE else None


def _is_toxic(text: str) -> bool:
    if not text:
        return False
    low = text.lower()
    if _TOXIC_RE and _TOXIC_RE.search(low):
        return True
    return any(p in low for p in _PHRASES)


def _clamp(v: float) -> int:
    return int(max(0, min(100, round(v))))


def health_multiplier(score: Optional[int]) -> float:
    """Multiplicador para o scoring do feed. Subtil de propósito:
    contas tóxicas/reportadas perdem alcance; presença saudável ganha um
    empurrão leve. Invisível ao utilizador."""
    if score is None:
        return 1.0
    if score < 30:
        return 0.75
    if score > 75:
        return 1.08
    return 1.0


async def compute_user_health(db, user_id: str, now: Optional[datetime] = None) -> int:
    """Calcula o health_score de um utilizador a partir de sinais reais dos
    últimos RECENT_DAYS. Determinístico; nunca lança (erro → NEUTRAL)."""
    try:
        now = now or datetime.now(timezone.utc)
        cutoff = (now - timedelta(days=RECENT_DAYS)).isoformat()

        posts_n = await db.posts.count_documents(
            {"author_id": user_id, "created_at": {"$gte": cutoff}}
        )
        comments_n = await db.comments.count_documents(
            {"author_id": user_id, "created_at": {"$gte": cutoff}}
        )
        replies_n = await db.comments.count_documents(
            {"author_id": user_id, "parent_id": {"$ne": None}, "created_at": {"$gte": cutoff}}
        )
        distinct_posts = await db.comments.distinct(
            "post_id", {"author_id": user_id, "created_at": {"$gte": cutoff}}
        )
        diversity = len(distinct_posts or [])

        # Conteúdo recente para toxicidade + ids para reports de conteúdo.
        recent_posts = await db.posts.find(
            {"author_id": user_id, "created_at": {"$gte": cutoff}},
            {"_id": 0, "id": 1, "content": 1},
        ).sort("created_at", -1).to_list(CONTENT_SCAN_LIMIT)
        recent_comments = await db.comments.find(
            {"author_id": user_id, "created_at": {"$gte": cutoff}},
            {"_id": 0, "id": 1, "content": 1},
        ).sort("created_at", -1).to_list(CONTENT_SCAN_LIMIT)

        toxic_hits = sum(
            1 for it in (recent_posts + recent_comments) if _is_toxic(it.get("content", ""))
        )

        content_ids = [it["id"] for it in (recent_posts + recent_comments) if it.get("id")]
        reports_user = await db.reports.count_documents(
            {"kind": "user", "target_id": user_id}
        )
        reports_content = 0
        if content_ids:
            reports_content = await db.reports.count_documents(
                {"kind": {"$in": ["post", "comment"]}, "target_id": {"$in": content_ids}}
            )
        reports_n = reports_user + reports_content

        total_activity = posts_n + comments_n

        # ── Math determinística (começa em NEUTRAL) ──────────────────
        score = float(NEUTRAL_SCORE)

        # Presença: existir e participar conta (mas com tecto).
        if total_activity > 0:
            score += 8
        # Reciprocidade: fração de comentários que são respostas em fios.
        if comments_n > 0:
            score += 15 * min(1.0, replies_n / comments_n)
        # Diversidade conversacional: falar com muitos fios distintos.
        score += min(15, diversity)
        # Penalizações.
        score -= min(40, reports_n * 8)
        score -= min(40, toxic_hits * 10)
        # Obsessão: volume extremo (>~10/dia em média) — penalização leve.
        if total_activity > RECENT_DAYS * 10:
            score -= 10

        return _clamp(score)
    except Exception as exc:
        logger.warning(f"reputation: compute failed for {user_id}: {exc}")
        return NEUTRAL_SCORE


async def _active_user_ids(db, now: datetime, cap: int) -> List[str]:
    cutoff = (now - timedelta(days=RECENT_DAYS)).isoformat()
    rows = await db.users.find(
        {"last_seen": {"$gte": cutoff}}, {"_id": 0, "id": 1}
    ).limit(cap).to_list(cap)
    return [r["id"] for r in rows if r.get("id")]


async def recompute_all(db, cap: int = ACTIVE_USER_CAP) -> int:
    """Recalcula o health_score de todos os utilizadores activos recentes.
    Devolve quantos foram actualizados."""
    now = datetime.now(timezone.utc)
    ids = await _active_user_ids(db, now, cap)
    updated = 0
    for uid in ids:
        score = await compute_user_health(db, uid, now)
        try:
            await db.users.update_one({"id": uid}, {"$set": {"health_score": score}})
            updated += 1
        except Exception:
            pass
    logger.info(f"reputation: recomputed {updated}/{len(ids)} users")
    return updated


# ── Background loop (mesmo padrão do pulse_engine) ──────────────────
_loop_task: Optional[asyncio.Task] = None


async def _loop(db) -> None:
    logger.info("reputation: loop starting")
    # Atraso inicial curto para não competir com o arranque.
    await asyncio.sleep(30)
    while True:
        try:
            await recompute_all(db)
        except asyncio.CancelledError:
            logger.info("reputation: loop cancelled")
            raise
        except Exception as exc:
            logger.exception(f"reputation: recompute error: {exc}")
        await asyncio.sleep(LOOP_INTERVAL_SECONDS)


def start_reputation_loop(db) -> asyncio.Task:
    """Idempotente: só corre uma task."""
    global _loop_task
    if _loop_task is not None and not _loop_task.done():
        return _loop_task
    _loop_task = asyncio.create_task(_loop(db), name="reputation_loop")
    return _loop_task


async def stop_reputation_loop() -> None:
    global _loop_task
    if _loop_task and not _loop_task.done():
        _loop_task.cancel()
        try:
            await _loop_task
        except asyncio.CancelledError:
            pass
        _loop_task = None
