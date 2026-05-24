"""
billing.py — Motor de billing do Lusorae (Stripe, production-ready).

Camada fina e REAL sobre o Stripe. Sem mocks: cada função chama o SDK a sério.
O SDK é síncrono → tudo corre em thread (`asyncio.to_thread`) para não bloquear
o event-loop. Se as chaves não estiverem configuradas, `is_configured()` é
False e os endpoints devolvem 503 (degradação graciosa, nunca um fake).

Fonte de verdade do estado premium: os WEBHOOKS do Stripe (ver server.py). Este
módulo só fala com o Stripe e mapeia price → (plano, intervalo). Nunca escreve
o estado premium a partir de input do cliente.
"""

import asyncio
import logging
import os
from typing import Optional, Tuple

logger = logging.getLogger("billing")

try:
    import stripe  # type: ignore
    _STRIPE_LIB = True
except Exception:  # pragma: no cover
    stripe = None  # type: ignore
    _STRIPE_LIB = False

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()

# price_id (Stripe) → (plano, intervalo). Definidos por env para não hardcodar.
PRICE_PLUS_MONTH = os.environ.get("STRIPE_PRICE_PLUS_MONTH", "").strip()
PRICE_PLUS_YEAR = os.environ.get("STRIPE_PRICE_PLUS_YEAR", "").strip()
PRICE_AURA_MONTH = os.environ.get("STRIPE_PRICE_AURA_MONTH", "").strip()
PRICE_AURA_YEAR = os.environ.get("STRIPE_PRICE_AURA_YEAR", "").strip()

_PRICE_TO_PLAN = {
    PRICE_PLUS_MONTH: ("plus", "month"),
    PRICE_PLUS_YEAR:  ("plus", "year"),
    PRICE_AURA_MONTH: ("aura", "month"),
    PRICE_AURA_YEAR:  ("aura", "year"),
}
_PLAN_TO_PRICE = {
    ("plus", "month"): PRICE_PLUS_MONTH,
    ("plus", "year"):  PRICE_PLUS_YEAR,
    ("aura", "month"): PRICE_AURA_MONTH,
    ("aura", "year"):  PRICE_AURA_YEAR,
}

if _STRIPE_LIB and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
    stripe.api_version = "2024-06-20"


def is_configured() -> bool:
    return bool(_STRIPE_LIB and STRIPE_SECRET_KEY)


def webhook_configured() -> bool:
    return bool(is_configured() and STRIPE_WEBHOOK_SECRET)


def price_for(plan: str, interval: str) -> str:
    return _PLAN_TO_PRICE.get((plan, interval), "") or ""


def price_to_plan(price_id: str) -> Tuple[Optional[str], Optional[str]]:
    return _PRICE_TO_PLAN.get(price_id, (None, None))


# ── Customers ───────────────────────────────────────────────────────
async def get_or_create_customer(db, user: dict) -> str:
    """Devolve o stripe_customer_id do utilizador (cria se necessário) e
    persiste o mapeamento customer→user em `stripe_customers` (necessário para
    resolver o user nos webhooks de subscrição)."""
    existing = await db.stripe_customers.find_one({"user_id": user["id"]}, {"_id": 0})
    if existing and existing.get("customer_id"):
        return existing["customer_id"]

    def _create():
        return stripe.Customer.create(
            email=user.get("email") or None,
            name=user.get("name") or user.get("username") or None,
            metadata={"user_id": user["id"], "username": user.get("username", "")},
            idempotency_key=f"cust_{user['id']}",
        )

    cust = await asyncio.to_thread(_create)
    await db.stripe_customers.update_one(
        {"user_id": user["id"]},
        {"$set": {"user_id": user["id"], "customer_id": cust["id"]}},
        upsert=True,
    )
    return cust["id"]


# ── Checkout (subscription) ─────────────────────────────────────────
async def create_checkout_session(db, user: dict, plan: str, interval: str,
                                   success_url: str, cancel_url: str) -> str:
    price = price_for(plan, interval)
    if not price:
        raise ValueError(f"price não configurado para {plan}/{interval}")
    customer_id = await get_or_create_customer(db, user)

    def _create():
        return stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": price, "quantity": 1}],
            client_reference_id=user["id"],
            subscription_data={"metadata": {"user_id": user["id"], "plan": plan}},
            # Apple Pay / Google Pay surgem automaticamente no Checkout quando
            # os métodos de cartão estão ativos no dashboard Stripe.
            allow_promotion_codes=True,
            automatic_tax={"enabled": True},
            customer_update={"address": "auto", "name": "auto"},
            billing_address_collection="auto",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user["id"], "plan": plan, "interval": interval},
        )

    session = await asyncio.to_thread(_create)
    return session["url"]


# ── Customer portal (gerir/cancelar/upgrade/downgrade/invoices) ─────
async def create_billing_portal_session(db, user: dict, return_url: str) -> str:
    rec = await db.stripe_customers.find_one({"user_id": user["id"]}, {"_id": 0})
    customer_id = rec.get("customer_id") if rec else None
    if not customer_id:
        customer_id = await get_or_create_customer(db, user)

    def _create():
        return stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)

    session = await asyncio.to_thread(_create)
    return session["url"]


async def retrieve_subscription(subscription_id: str) -> dict:
    def _get():
        return stripe.Subscription.retrieve(subscription_id)
    return await asyncio.to_thread(_get)


async def list_subscriptions_for_customer(customer_id: str) -> list:
    def _list():
        return stripe.Subscription.list(customer=customer_id, status="all", limit=10)["data"]
    return await asyncio.to_thread(_list)


# ── Webhook ─────────────────────────────────────────────────────────
def verify_and_parse_webhook(payload: bytes, sig_header: str):
    """Valida a assinatura do webhook e devolve o evento. Lança em assinatura
    inválida — o handler trata como 400 (nunca processa eventos não-assinados)."""
    if not webhook_configured():
        raise RuntimeError("webhook não configurado")
    return stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)


# ── Mapeamento de uma Subscription do Stripe → estado premium ───────
def subscription_to_state(sub: dict) -> dict:
    """Extrai o estado premium canónico de um objeto Subscription do Stripe."""
    items = (sub.get("items") or {}).get("data") or []
    price_id = items[0]["price"]["id"] if items else None
    plan, interval = price_to_plan(price_id) if price_id else (None, None)
    status = sub.get("status") or "active"
    cpe = sub.get("current_period_end")
    from datetime import datetime, timezone
    renews_at = datetime.fromtimestamp(cpe, tz=timezone.utc).isoformat() if cpe else None
    return {
        "subscription_id": sub.get("id"),
        "customer_id": sub.get("customer"),
        "plan": plan,
        "interval": interval,
        "status": status,
        "current_period_end": renews_at,
        "cancel_at_period_end": bool(sub.get("cancel_at_period_end")),
        "price_id": price_id,
    }
