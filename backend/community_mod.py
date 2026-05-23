"""
community_mod.py — Moderação completa por comunidade.

Cada comunidade é um "bairro" com auto-governo: o dono (owner) e os
moderadores podem moderar; membros podem reportar. Tudo com lógica
explícita de permissões, enforcement real (banidos/silenciados não
publicam) e um log de moderação auditável.

Modelo (campos adicionados ao doc da comunidade, todos opcionais/retro-
compatíveis):
  moderators: [user_id]            # além do owner
  banned:     [user_id]            # expulsos: não entram nem publicam
  muted:      {user_id: until_iso} # silenciados até uma data (não publicam)

Coleções novas:
  community_reports   {id, community_id, kind, target_id, reporter_id,
                       reason, detail, status, created_at, resolved_*}
  community_mod_log   {id, community_id, actor_id, action, target_id,
                       target_kind, detail, created_at}

Helpers puros aqui; os endpoints vivem no server.py (precisam de db/auth/ws),
como o resto. Sem IA — só regras determinísticas.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

ROLE_OWNER = "owner"
ROLE_MOD = "mod"
ROLE_MEMBER = "member"

REPORT_KINDS = ("post", "comment", "user")
MOD_ACTIONS = ("remove_post", "ban_user", "unban_user", "mute_user", "unmute_user",
               "add_mod", "remove_mod", "resolve_report", "dismiss_report")


def role_of(community: dict, user: Optional[dict]) -> Optional[str]:
    """Papel do utilizador NESTA comunidade.
    Admins globais são tratados como owner-level (podem sempre moderar)."""
    if not user:
        return None
    uid = user.get("id")
    if user.get("is_admin"):
        return ROLE_OWNER
    if uid == community.get("owner_id"):
        return ROLE_OWNER
    if uid in (community.get("moderators") or []):
        return ROLE_MOD
    if uid in (community.get("members") or []):
        return ROLE_MEMBER
    return None


def can_moderate(community: dict, user: Optional[dict]) -> bool:
    return role_of(community, user) in (ROLE_OWNER, ROLE_MOD)


def is_owner(community: dict, user: Optional[dict]) -> bool:
    return role_of(community, user) == ROLE_OWNER


def is_banned(community: dict, user_id: str) -> bool:
    return bool(user_id) and user_id in (community.get("banned") or [])


def muted_until(community: dict, user_id: str) -> Optional[str]:
    m = (community.get("muted") or {}).get(user_id)
    return m or None


def is_muted(community: dict, user_id: str, now: Optional[datetime] = None) -> bool:
    until = muted_until(community, user_id)
    if not until:
        return False
    now = now or datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(str(until).replace("Z", "+00:00")) > now
    except Exception:
        return False


def can_write(community: dict, user: Optional[dict], now: Optional[datetime] = None) -> tuple:
    """(allowed: bool, reason: str|None). Regras de escrita na comunidade."""
    if not user:
        return False, "Autenticação necessária"
    uid = user.get("id")
    if user.get("is_admin"):
        return True, None
    if is_banned(community, uid):
        return False, "Foste expulso desta comunidade"
    if is_muted(community, uid, now):
        return False, "Estás silenciado nesta comunidade"
    if uid not in (community.get("members") or []):
        return False, "Tens de entrar na comunidade primeiro"
    return True, None


def public_report(doc: dict, target_author: Optional[dict] = None) -> dict:
    out = {
        "id": doc.get("id"),
        "community_id": doc.get("community_id"),
        "kind": doc.get("kind"),
        "target_id": doc.get("target_id"),
        "reporter_id": doc.get("reporter_id"),
        "reason": doc.get("reason"),
        "detail": doc.get("detail", ""),
        "status": doc.get("status", "open"),
        "created_at": doc.get("created_at"),
        "resolved_by": doc.get("resolved_by"),
        "resolved_action": doc.get("resolved_action"),
        "resolved_at": doc.get("resolved_at"),
    }
    if target_author:
        out["target_author"] = target_author
    return out


def modlog_doc(community_id: str, actor_id: str, action: str, *,
               target_id: Optional[str] = None, target_kind: Optional[str] = None,
               detail: str = "") -> dict:
    return {
        "id": str(uuid.uuid4()),
        "community_id": community_id,
        "actor_id": actor_id,
        "action": action,
        "target_id": target_id,
        "target_kind": target_kind,
        "detail": detail or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def init_community_mod_indexes(db) -> None:
    import logging
    logger = logging.getLogger("community_mod")
    try:
        await db.community_reports.create_index(
            [("community_id", 1), ("status", 1), ("created_at", -1)], name="creports_lookup"
        )
        await db.community_reports.create_index("id", unique=True, name="creports_id")
        await db.community_mod_log.create_index(
            [("community_id", 1), ("created_at", -1)], name="cmodlog_lookup"
        )
        logger.info("community_mod: indexes ready")
    except Exception as exc:
        logger.warning(f"community_mod: index creation skipped: {exc}")
