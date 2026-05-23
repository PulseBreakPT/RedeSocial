"""
community_graph.py — Núcleo social & densidade de uma comunidade.

Constrói o grafo de interação REAL dentro da comunidade (30d) a partir de
comentários, respostas e gostos, e deriva:

  · núcleo     — as pessoas que mais dão vida (maior grau no grafo)
  · densidade  — quão interligada está a comunidade (arestas / possíveis)
  · as tuas pessoas aqui — laços mais fortes do viewer (cálculo on-demand)

Honestidade: arestas só de interações reais. Sem interações suficientes →
"ainda a formar-se", nunca um núcleo inventado. Não é leaderboard: a densidade
coletiva é o headline; o núcleo é "quem dá vida", não um ranking de vaidade.

O grafo é PESADO → corre num loop próprio (45min) e fica em cache
(community_graph_cache, TTL 2d). Nunca no hot path.
"""

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List, Optional

logger = logging.getLogger("community_graph")

RECENT_DAYS = 30
POSTS_CAP = 1500
COMMENTS_CAP = 6000
LOOP_INTERVAL_SECONDS = 2700   # 45min
CACHE_TTL_SECONDS = 2 * 24 * 3600
MIN_EDGES = 3                  # < isto → "ainda a formar-se"
NUCLEO_SIZE = 8

# Pesos de aresta por tipo de interação (conversa pesa mais que gosto).
W_COMMENT = 2.0
W_REPLY = 3.0
W_LIKE = 1.0


def _pair(a: str, b: str):
    return (a, b) if a <= b else (b, a)


async def build_graph(db, community: dict, now: Optional[datetime] = None) -> dict:
    """Constrói o grafo e devolve o doc de cache (não persiste aqui)."""
    cid = community["id"]
    now = now or datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=RECENT_DAYS)).isoformat()

    posts = await db.posts.find(
        {"community_id": cid, "created_at": {"$gte": cutoff}},
        {"_id": 0, "id": 1, "author_id": 1, "likes": 1},
    ).to_list(POSTS_CAP)
    post_author = {p["id"]: p.get("author_id") for p in posts if p.get("id")}

    comments = await db.comments.find(
        {"community_id": cid, "created_at": {"$gte": cutoff}},
        {"_id": 0, "id": 1, "author_id": 1, "post_id": 1, "parent_id": 1},
    ).to_list(COMMENTS_CAP)
    comment_author = {c["id"]: c.get("author_id") for c in comments if c.get("id")}

    edges = defaultdict(float)
    degree = defaultdict(float)

    def add_edge(a, b, w):
        if not a or not b or a == b:
            return
        edges[_pair(a, b)] += w
        degree[a] += w
        degree[b] += w

    # Comentário → autor do post; resposta → autor do comentário-pai.
    for c in comments:
        ca = c.get("author_id")
        if c.get("parent_id") and c["parent_id"] in comment_author:
            add_edge(ca, comment_author[c["parent_id"]], W_REPLY)
        else:
            add_edge(ca, post_author.get(c.get("post_id")), W_COMMENT)

    # Gostos → autor do post.
    for p in posts:
        pa = p.get("author_id")
        for liker in (p.get("likes") or []):
            add_edge(liker, pa, W_LIKE)

    participants = list(degree.keys())
    n = len(participants)
    edges_n = len(edges)
    possible = n * (n - 1) / 2 if n >= 2 else 0
    density = round(min(1.0, edges_n / possible), 3) if possible else 0.0

    top = sorted(degree.items(), key=lambda kv: -kv[1])[:NUCLEO_SIZE]
    nucleo = [{"user_id": uid, "score": round(deg, 1)} for uid, deg in top]

    return {
        "community_id": cid,
        "nucleo": nucleo,
        "density": density,
        "edges_n": edges_n,
        "participants_n": n,
        "forming": edges_n < MIN_EDGES,
        "computed_at": now.isoformat(),
        "expire_at": now + timedelta(seconds=CACHE_TTL_SECONDS),
    }


async def get_nucleo(db, community: dict) -> dict:
    """Cache → ou constrói se faltar/expirou."""
    cid = community["id"]
    doc = await db.community_graph_cache.find_one({"community_id": cid}, {"_id": 0})
    if doc:
        return doc
    doc = await build_graph(db, community)
    try:
        await db.community_graph_cache.replace_one({"community_id": cid}, dict(doc), upsert=True)
    except Exception:
        pass
    return doc


async def your_people(db, viewer_id: str, community: dict, limit: int = 6) -> List[dict]:
    """On-demand: membros com quem o viewer mais interage NESTA comunidade.
    Leve (queries focadas no viewer), não o grafo todo."""
    cid = community["id"]
    members = set(community.get("members", []) or [])
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=RECENT_DAYS)).isoformat()
    weight = defaultdict(float)

    # Posts do viewer (para gostos/comentários recebidos) e posts da comunidade
    # que o viewer comentou/gostou.
    comm_posts = await db.posts.find(
        {"community_id": cid, "created_at": {"$gte": cutoff}},
        {"_id": 0, "id": 1, "author_id": 1, "likes": 1},
    ).to_list(POSTS_CAP)
    author_of = {p["id"]: p.get("author_id") for p in comm_posts}
    viewer_posts = {p["id"] for p in comm_posts if p.get("author_id") == viewer_id}

    # Gostos do viewer em posts de outros + gostos de outros nos posts do viewer.
    for p in comm_posts:
        pa = p.get("author_id")
        likes = p.get("likes") or []
        if pa and pa != viewer_id and viewer_id in likes:
            weight[pa] += W_LIKE
        if p["id"] in viewer_posts:
            for liker in likes:
                if liker != viewer_id:
                    weight[liker] += W_LIKE

    # Comentários do viewer em posts da comunidade → autores desses posts.
    v_comments = await db.comments.find(
        {"community_id": cid, "author_id": viewer_id, "created_at": {"$gte": cutoff}},
        {"_id": 0, "post_id": 1},
    ).to_list(COMMENTS_CAP)
    for c in v_comments:
        pa = author_of.get(c.get("post_id"))
        if pa and pa != viewer_id:
            weight[pa] += W_COMMENT

    # Comentários de outros nos posts do viewer.
    if viewer_posts:
        others = await db.comments.find(
            {"community_id": cid, "post_id": {"$in": list(viewer_posts)}, "created_at": {"$gte": cutoff}},
            {"_id": 0, "author_id": 1},
        ).to_list(COMMENTS_CAP)
        for c in others:
            ca = c.get("author_id")
            if ca and ca != viewer_id:
                weight[ca] += W_COMMENT

    ranked = sorted(
        ((uid, w) for uid, w in weight.items() if uid in members),
        key=lambda kv: -kv[1],
    )[:limit]
    return [{"user_id": uid, "score": round(w, 1)} for uid, w in ranked]


async def recompute_all(db, cap: int = 1000) -> int:
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=RECENT_DAYS)).isoformat()
    try:
        ids = await db.posts.distinct(
            "community_id", {"community_id": {"$ne": None}, "created_at": {"$gte": cutoff}}
        )
    except Exception:
        return 0
    ids = [c for c in (ids or []) if c][:cap]
    updated = 0
    for cid in ids:
        comm = await db.communities.find_one({"id": cid}, {"_id": 0, "id": 1, "members": 1})
        if not comm:
            continue
        try:
            doc = await build_graph(db, comm, now)
            await db.community_graph_cache.replace_one({"community_id": cid}, dict(doc), upsert=True)
            updated += 1
        except Exception:
            pass
    logger.info(f"community_graph: recomputed {updated}/{len(ids)} communities")
    return updated


async def init_community_graph_indexes(db) -> None:
    try:
        await db.community_graph_cache.create_index("community_id", unique=True, name="cgraph_id")
        await db.community_graph_cache.create_index("expire_at", expireAfterSeconds=0, name="cgraph_ttl")
        logger.info("community_graph: indexes ready")
    except Exception as exc:
        logger.warning(f"community_graph: index creation skipped: {exc}")


_loop_task: Optional[asyncio.Task] = None


async def _loop(db) -> None:
    logger.info("community_graph: loop starting")
    await asyncio.sleep(60)
    while True:
        try:
            await recompute_all(db)
        except asyncio.CancelledError:
            logger.info("community_graph: loop cancelled")
            raise
        except Exception as exc:
            logger.exception(f"community_graph: recompute error: {exc}")
        await asyncio.sleep(LOOP_INTERVAL_SECONDS)


def start_community_graph_loop(db) -> asyncio.Task:
    global _loop_task
    if _loop_task is not None and not _loop_task.done():
        return _loop_task
    _loop_task = asyncio.create_task(_loop(db), name="community_graph_loop")
    return _loop_task


async def stop_community_graph_loop() -> None:
    global _loop_task
    if _loop_task and not _loop_task.done():
        _loop_task.cancel()
        try:
            await _loop_task
        except asyncio.CancelledError:
            pass
        _loop_task = None
