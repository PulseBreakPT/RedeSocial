"""
mesas.py — Fase 5 / Mesas (conversas efémeras).

Uma "Mesa" é uma sala de conversa com TTL natural: nasce, vive enquanto
houver gente, e expira sozinha (timer ou inatividade). Sem histórico
eterno, sem pressão de "manter a conversa viva" para sempre — como uma
mesa de tasca: enche, conversa-se, e fecha quando a noite acaba.

Este módulo tem só lógica pura + criação de índices. Os endpoints vivem
no server.py (precisam de @api, db, get_current_user, ws_manager), tal
como os endpoints do Pulse Engine. A expiração é feita pelo TTL do Mongo
(campo `expire_at` Date), espelhando o padrão do pulse_engine.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

# Tipos de mesa e respetivo TTL. Tudo determinístico.
#   rapida  — 2h, qualquer um cria.
#   noturna — até às 06:00 (UTC) seguintes.
#   tema    — 24h, atada a um tópico/hashtag.
MESA_KINDS = ("rapida", "noturna", "tema")

# Limites simples (sem gamificação, só sanidade).
MAX_TITLE = 80
MAX_TOPIC = 60
MAX_MESSAGE = 1000
MESSAGES_PAGE = 50

# Inatividade: uma mesa sem atividade há mais que isto é considerada morta
# pelas listagens (o TTL do Mongo trata da remoção física mais tarde).
INACTIVITY_SECONDS = 6 * 3600


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def compute_expiry(kind: str, now: Optional[datetime] = None) -> Tuple[datetime, str]:
    """Devolve (expires_at_datetime, expires_reason) para o tipo de mesa.
    Determinístico a partir de `now`."""
    now = now or datetime.now(timezone.utc)
    if kind == "noturna":
        # Próximas 06:00 UTC.
        target = now.replace(hour=6, minute=0, second=0, microsecond=0)
        if now >= target:
            target = target + timedelta(days=1)
        return target, "timer"
    if kind == "tema":
        return now + timedelta(hours=24), "timer"
    # rapida (default)
    return now + timedelta(hours=2), "timer"


def new_mesa_doc(*, title: str, topic: str, kind: str, created_by: str,
                 now: Optional[datetime] = None) -> dict:
    """Constrói o documento de uma mesa nova (com companheiro TTL)."""
    import uuid
    now = now or datetime.now(timezone.utc)
    if kind not in MESA_KINDS:
        kind = "rapida"
    expires_at, reason = compute_expiry(kind, now)
    return {
        "id": str(uuid.uuid4()),
        "title": (title or "").strip()[:MAX_TITLE],
        "topic": (topic or "").strip()[:MAX_TOPIC],
        "kind": kind,
        "created_by": created_by,
        "created_at": _iso(now),
        "expires_at": _iso(expires_at),
        "expires_reason": reason,
        "participants": [created_by],
        "message_count": 0,
        "last_activity_at": _iso(now),
        # Companheiro Date para o índice TTL do Mongo (mesmo padrão do pulse).
        "expire_at": expires_at,
    }


def seconds_left(mesa: dict, now: Optional[datetime] = None) -> int:
    """Segundos até expirar (>=0). 0 = expirada."""
    now = now or datetime.now(timezone.utc)
    try:
        exp = datetime.fromisoformat(str(mesa.get("expires_at")).replace("Z", "+00:00"))
        return max(0, int((exp - now).total_seconds()))
    except Exception:
        return 0


def is_alive(mesa: dict, now: Optional[datetime] = None) -> bool:
    """Mesa viva = ainda dentro do TTL. (A inatividade afeta a ordenação,
    não mata a mesa — isso fica para o TTL físico do Mongo.)"""
    return seconds_left(mesa, now) > 0


def public_mesa(mesa: dict, me_id: Optional[str] = None,
                now: Optional[datetime] = None) -> dict:
    """Forma pública de uma mesa (sem o campo Date `expire_at` nem `_id`)."""
    participants = mesa.get("participants", []) or []
    return {
        "id": mesa.get("id"),
        "title": mesa.get("title", ""),
        "topic": mesa.get("topic", ""),
        "kind": mesa.get("kind", "rapida"),
        "created_by": mesa.get("created_by"),
        "created_at": mesa.get("created_at"),
        "expires_at": mesa.get("expires_at"),
        "expires_reason": mesa.get("expires_reason", "timer"),
        "participants_count": len(participants),
        "message_count": mesa.get("message_count", 0),
        "last_activity_at": mesa.get("last_activity_at"),
        "seconds_left": seconds_left(mesa, now),
        "is_participant": bool(me_id and me_id in participants),
    }


async def init_mesas_indexes(db) -> None:
    """Índices: TTL em `expire_at` (Date) + ordenação por atividade. As
    mensagens vivem em `mesa_messages`, também com TTL próprio."""
    import logging
    logger = logging.getLogger("mesas")
    try:
        await db.mesas.create_index("expire_at", expireAfterSeconds=0, name="mesas_ttl")
        await db.mesas.create_index([("last_activity_at", -1)], name="mesas_activity")
        await db.mesas.create_index("id", unique=True, name="mesas_id")
        await db.mesa_messages.create_index("expire_at", expireAfterSeconds=0, name="mesa_msgs_ttl")
        await db.mesa_messages.create_index([("mesa_id", 1), ("created_at", 1)], name="mesa_msgs_lookup")
        logger.info("mesas: indexes ready")
    except Exception as exc:
        logger.warning(f"mesas: index creation skipped: {exc}")
