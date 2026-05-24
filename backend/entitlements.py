"""
entitlements.py — Motor de direitos premium do Lusorae.

Verdade premium = SEMPRE server-side. O frontend nunca decide o plano; só
reflete o que este motor resolve a partir do estado persistido (sincronizado
pelos webhooks do Stripe). Anti-spoofing por design: o `plan` vive no doc do
utilizador (denormalizado para leitura rápida) mas é escrito apenas pelo fluxo
de billing/webhook, nunca por input do cliente.

Dois tiers, alinhados com o manifesto (vende-se pertença/identidade/presença,
nunca alcance/algoritmo):
  · free
  · plus  — "melhorar a experiência"
  · aura  — "o Lusorae faz parte da tua vida digital"

Tudo determinístico, sem IA, sem métricas falsas.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

PLANS = ("free", "plus", "aura")
PLAN_RANK = {"free": 0, "plus": 1, "aura": 2}

# Período de graça após falha de pagamento: mantém os direitos enquanto o
# Stripe tenta recobrar (evita cortar a experiência por um cartão expirado).
GRACE_DAYS = 7

# ── Matriz de direitos: feature_key → plano mínimo ──────────────────
# NUNCA inclui alcance/visibilidade/algoritmo. Só expressão, conforto,
# identidade, presença, memória — coisas que melhoram a vida digital da
# pessoa sem distorcer o social dos outros.
ENTITLEMENTS = {
    # — LUSORAE PLUS —
    "profile_premium_styling": "plus",
    "profile_premium_banner": "plus",
    "presence_advanced": "plus",
    "presence_music": "plus",
    "moods_premium": "plus",
    "stories_advanced": "plus",
    "stories_analytics": "plus",
    "stories_archive_premium": "plus",
    "feed_calm": "plus",
    "social_filters": "plus",
    "energy_filters": "plus",
    "collections_unlimited": "plus",
    "reactions_premium": "plus",
    "social_widgets": "plus",
    "personal_signature": "plus",
    "discover_subtle_highlight": "plus",
    "early_supporter_badge": "plus",
    # — LUSORAE AURA (inclui tudo do Plus + a camada viva) —
    "social_memory": "aura",
    "presence_history": "aura",
    "profile_atmosphere": "aura",
    "contextual_identity": "aura",
    "living_profile": "aura",
    "rhythm_insights": "aura",
    "social_memory_widgets": "aura",
    "personal_social_analytics": "aura",
    "presence_rich": "aura",
    "signature_expanded": "aura",
    "layouts_exclusive": "aura",
    "moods_exclusive": "aura",
    "atmosphere_engine": "aura",
    "ambient_profile": "aura",
}

# ── Limites por plano (override do default global via plan_limit) ───
PLAN_LIMITS = {
    "collections_max":      {"free": 5,    "plus": 100000, "aura": 100000},
    "story_duration_ms":    {"free": 5000, "plus": 15000,  "aura": 30000},
    "bookmarks_folders_max": {"free": 3,   "plus": 100000, "aura": 100000},
    "presence_status_chars": {"free": 64,  "plus": 140,    "aura": 240},
}


def _parse(ts) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None


def plan_of(user: Optional[dict], now: Optional[datetime] = None) -> str:
    """Plano EFETIVO do utilizador (considera estado + período pago + graça).
    Fonte: campos denormalizados no doc do user, escritos só pelo billing."""
    if not user:
        return "free"
    plan = user.get("plan") or "free"
    if plan not in PLANS or plan == "free":
        return "free"
    now = now or datetime.now(timezone.utc)
    status = user.get("plan_status") or "active"
    exp = _parse(user.get("plan_expires_at"))

    if status in ("active", "trialing"):
        # Ativo: válido (se houver fim de período, respeita-o com folga).
        if exp is None or now <= exp:
            return plan
        return "free"
    if status in ("past_due", "grace", "unpaid"):
        # Falha de pagamento: mantém direitos durante a graça.
        grace_until = _parse(user.get("grace_until"))
        if grace_until and now <= grace_until:
            return plan
        if exp and now <= exp:
            return plan
        return "free"
    if status in ("canceled", "cancelled"):
        # Cancelado mas pago até ao fim do período.
        if exp and now <= exp:
            return plan
        return "free"
    return "free"


def is_premium(user: Optional[dict]) -> bool:
    return plan_of(user) != "free"


def has_entitlement(user: Optional[dict], key: str) -> bool:
    required = ENTITLEMENTS.get(key)
    if required is None:
        return True  # feature sem gating premium
    return PLAN_RANK.get(plan_of(user), 0) >= PLAN_RANK.get(required, 99)


def plan_limit(user: Optional[dict], key: str, global_default: Optional[int] = None) -> int:
    """Limite efetivo: o plano só pode AUMENTAR o default global, nunca reduzir."""
    row = PLAN_LIMITS.get(key)
    if not row:
        return int(global_default or 0)
    val = row.get(plan_of(user), row.get("free", 0))
    if global_default is not None:
        return max(int(global_default), int(val))
    return int(val)


def resolved_entitlements(user: Optional[dict]) -> dict:
    """Mapa {feature_key: bool} para o cliente refletir (nunca para decidir)."""
    return {k: has_entitlement(user, k) for k in ENTITLEMENTS}


def grace_until_from(now: Optional[datetime] = None) -> str:
    now = now or datetime.now(timezone.utc)
    return (now + timedelta(days=GRACE_DAYS)).isoformat()


def public_premium(user: Optional[dict]) -> dict:
    """Forma pública e segura do estado premium (sem ids de billing)."""
    p = plan_of(user)
    return {
        "plan": p,
        "is_premium": p != "free",
        "status": (user or {}).get("plan_status", "active") if p != "free" else "none",
        "renews_at": (user or {}).get("plan_expires_at") if p != "free" else None,
        "cancel_at_period_end": bool((user or {}).get("plan_cancel_at_period_end")) if p != "free" else False,
        "since": (user or {}).get("plan_since") if p != "free" else None,
        "early_supporter": bool((user or {}).get("early_supporter")),
    }
