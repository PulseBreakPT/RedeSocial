"""
Lusorae — Push Notifications (Web Push / VAPID)
=================================================
Mini-stack:
  • carrega VAPID keys de env (gera em memória se ausente — só dev)
  • envia push best-effort via pywebpush
  • persistência de subscriptions: db.push_subscriptions
"""
import os
import json
import base64
import logging
from typing import Optional

logger = logging.getLogger("vermillion.push")

# Lazy imports — pywebpush + cryptography são pesados, só carregar se push usado.
_PYWEBPUSH_OK = None
def _load_pywebpush():
    global _PYWEBPUSH_OK
    if _PYWEBPUSH_OK is not None:
        return _PYWEBPUSH_OK
    try:
        from pywebpush import webpush, WebPushException  # noqa
        _PYWEBPUSH_OK = True
    except Exception as e:
        logger.warning("pywebpush indisponível (%s) — push silenciado", e)
        _PYWEBPUSH_OK = False
    return _PYWEBPUSH_OK


# ─── VAPID keys ────────────────────────────────────────────────────────────
def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _generate_vapid_pair() -> tuple[str, str]:
    """Gera par de chaves VAPID P-256. Só usado se env vars ausentes."""
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    priv = ec.generate_private_key(ec.SECP256R1())
    priv_pem = priv.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("ascii")
    pub = priv.public_key()
    raw_pub = pub.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    pub_b64 = _b64url(raw_pub)
    return priv_pem, pub_b64


_VAPID_PRIV: Optional[str] = None
_VAPID_PUB: Optional[str] = None
_VAPID_SUBJECT: str = "mailto:admin@lusorae.pt"


def init_vapid():
    """Carrega ou gera VAPID. Idempotente."""
    global _VAPID_PRIV, _VAPID_PUB, _VAPID_SUBJECT
    if _VAPID_PRIV and _VAPID_PUB:
        return
    priv = os.environ.get("VAPID_PRIVATE_KEY_PEM", "").strip()
    pub = os.environ.get("VAPID_PUBLIC_KEY_B64", "").strip()
    subj = os.environ.get("VAPID_SUBJECT", "").strip()
    if subj:
        _VAPID_SUBJECT = subj
    if priv and pub:
        _VAPID_PRIV, _VAPID_PUB = priv, pub
        logger.info("VAPID carregado de env (pub=%s…)", pub[:12])
        return
    # gera em memória para dev (subscriptions ficam inválidas em reboot)
    try:
        priv_gen, pub_gen = _generate_vapid_pair()
        _VAPID_PRIV, _VAPID_PUB = priv_gen, pub_gen
        logger.warning(
            "VAPID auto-gerado em memória (dev). Em produção define "
            "VAPID_PRIVATE_KEY_PEM e VAPID_PUBLIC_KEY_B64."
        )
    except Exception as e:
        logger.error("Falha a gerar VAPID: %s", e)


def public_key() -> str:
    init_vapid()
    return _VAPID_PUB or ""


def is_configured() -> bool:
    init_vapid()
    return bool(_VAPID_PRIV and _VAPID_PUB)


# ─── Envio ─────────────────────────────────────────────────────────────────
async def send_to_user(db, user_id: str, title: str, body: str,
                       url: str = "/", icon: Optional[str] = None,
                       tag: Optional[str] = None) -> int:
    """Envia push best-effort a todas as subscriptions do user. Retorna nº enviados."""
    if not is_configured() or not _load_pywebpush():
        return 0
    cursor = db.push_subscriptions.find({"user_id": user_id}, {"_id": 0})
    subs = await cursor.to_list(20)
    if not subs:
        return 0
    sent = 0
    for s in subs:
        try:
            ok = _send_one(s, title, body, url, icon, tag)
            if ok:
                sent += 1
            else:
                # endpoint morto → remover
                await db.push_subscriptions.delete_one({"endpoint": s.get("endpoint")})
        except Exception as e:
            logger.warning("push send failed user=%s: %s", user_id, e)
    return sent


def _send_one(sub: dict, title: str, body: str, url: str,
              icon: Optional[str], tag: Optional[str]) -> bool:
    from pywebpush import webpush, WebPushException
    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "icon": icon or "/android-chrome-192x192.png",
        "tag": tag or "lusorae",
    })
    try:
        webpush(
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": sub.get("keys") or {},
            },
            data=payload,
            vapid_private_key=_VAPID_PRIV,
            vapid_claims={"sub": _VAPID_SUBJECT},
            ttl=86400,
        )
        return True
    except WebPushException as e:
        sc = getattr(e, "response", None)
        code = sc.status_code if sc is not None else 0
        if code in (404, 410):
            return False  # gone — apagar
        logger.warning("WebPush erro código=%s: %s", code, e)
        return True  # mantemos subscription mas registamos
    except Exception as e:
        logger.warning("WebPush erro inesperado: %s", e)
        return True
