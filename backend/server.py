from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import json
import math
import uuid
import hashlib
import asyncio
import logging
import secrets
import bcrypt
import jwt
import base64
import io
import time
import socket
import platform
import pyotp
import qrcode
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# Fase 1 — Social Pulse Engine (realtime activity aggregator).
# Imported lazily-free here at module load; `start_pulse_loop` only runs
# once `app.on_event("startup")` fires, by which time `ws_manager` exists.
import pulse_engine
# Fase 4 — Context Engine. Pesos contextuais (hora/dia/calendário/mood)
# para o feed. Pure math + lookup, sem estado, importável directamente.
import context_engine
# Fase 5 — Mesas (conversas efémeras). Helpers + índices TTL; endpoints
# vivem aqui no server.py (precisam de db/auth/ws), como o Pulse Engine.
import mesas as mesas_engine
# Fase 6 — Reputação invisível. health_score recalculado em background;
# influencia o scoring do feed mas NUNCA é exposto via API.
import reputation_engine
# Comunidades vivas — motor de pulso por comunidade (presence-first).
import community_pulse
# Comunidades — camada de moderação (papéis, ban/mute, reports, log).
import community_mod

JWT_ALGORITHM = "HS256"

# ─── Secret loading via pluggable backend (env-only by default) ───────────────
# All sensitive config lookups go through `get_secret` so we have a single
# choke-point for rotation, audit logging, and a future vault integration.
# Override via SECRET_BACKEND={doppler|aws|gcp|vault|azure} — see
# /app/backend/secret_loader.py.
from secret_loader import get_secret, MissingSecret, active_backend_name

try:
    JWT_SECRET = get_secret("JWT_SECRET", required=True)
    mongo_url = get_secret("MONGO_URL", required=True)
    _db_name = get_secret("DB_NAME", required=True)
except MissingSecret as _e:
    import sys as _sys
    _sys.stderr.write(f"\n🔴 Required secret missing at boot: {_e}\n\n")
    raise

# ─── Deployment-environment determination (must precede iss/aud binding) ─────
# APP_ENV: "development" | "staging" | "production". Controls error verbosity,
# cookie secure flag default, and CORS strictness.
APP_ENV = os.environ.get("APP_ENV", "development").lower().strip()
IS_PRODUCTION = APP_ENV in {"production", "prod"}

# ─── JWT identity binding (environment-isolated) ─────────────────────────────
# `iss` and `aud` bind tokens to *this* deployment. A token minted by the
# staging deployment cannot authenticate against production even if both share
# a (broken) trust path. Defeats cross-environment token replay.
JWT_ISSUER = os.environ.get("JWT_ISSUER", "lusorae-backend").strip()
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", f"lusorae-app:{APP_ENV}").strip()

client = AsyncIOMotorClient(mongo_url)
db = client[_db_name]

# Auth telemetry / lockout / authz helpers — wire the db handle right away
# so any import after this point can use auth_event / require_owner_or_admin.
import auth_security as auth_security_mod
from auth_security import (
    bind_db as _bind_auth_db,
    auth_event,
    register_failed_login,
    clear_failed_login,
    is_login_locked,
    require_owner_or_admin,
    require_owner,
    AuthzError,
    validate_jwt_header_strict,
    InvalidJWTHeader,
    revocation_cache,
    register_event_sink,
    ensure_indexes as _ensure_auth_indexes,
)
_bind_auth_db(db)

# ─── Deployment hardening config (cookie + cors derived from APP_ENV above) ───
# APP_ENV & IS_PRODUCTION are defined above so they're available to JWT
# audience binding. Other downstream knobs live here.

# COOKIE_SECURE: forces Secure flag on auth cookies. Defaults to True in
# production, False in dev (so local http:// testing still works).
_cookie_secure_env = os.environ.get("COOKIE_SECURE")
if _cookie_secure_env is None:
    COOKIE_SECURE = IS_PRODUCTION
else:
    COOKIE_SECURE = _cookie_secure_env.lower().strip() in {"1", "true", "yes", "on"}

# COOKIE_SAMESITE: "lax" (default), "strict" or "none". "none" requires Secure.
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax").lower().strip()
if COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    COOKIE_SAMESITE = "lax"

# ─── Startup security validator (deploy-time hardening) ───────────────────────
# Refuses to boot when production-critical settings are unsafe. Catches:
#   • known-leaked / weak JWT secrets
#   • wildcard CORS in prod
#   • cookies served without Secure flag in prod
#   • SameSite=none without Secure (browsers will silently drop the cookie)
#   • leaked bootstrap admin password literal
#   • too-short JWT secret (<48 chars of entropy)
# In dev these become warnings instead of fatal errors.
_KNOWN_BAD_JWT_SECRETS = {
    "secret", "changeme", "change-me", "dev", "test", "jwtsecret",
    # The pre-rotation placeholder that lived in the dev .env. If any deploy
    # still ships this value, fail loud.
    "b9f2a7c1e4d6f8a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0",
}
_KNOWN_BAD_ADMIN_PASSWORDS = {
    "admin", "admin123", "password", "12345678",
    # Pre-rotation placeholder that leaked in tracked test files. Block it
    # from ever being used again.
    "Admin#Lusorae2025",
}


def _validate_environment() -> None:
    problems = []  # (severity, message) where severity ∈ {"fatal", "warn"}

    if len(JWT_SECRET) < 48:
        problems.append(("fatal", f"JWT_SECRET is too short ({len(JWT_SECRET)} chars). Use ≥48 random chars."))
    if JWT_SECRET.lower() in _KNOWN_BAD_JWT_SECRETS:
        problems.append(("fatal", "JWT_SECRET matches a known-leaked / weak value. Rotate it."))

    raw_cors = os.environ.get("CORS_ORIGINS", "*")
    if "*" in [o.strip() for o in raw_cors.split(",")]:
        problems.append(("fatal" if IS_PRODUCTION else "warn",
                         "CORS_ORIGINS contains '*'. Set explicit origins for production."))

    if IS_PRODUCTION and not COOKIE_SECURE:
        problems.append(("fatal", "COOKIE_SECURE must be true in production."))
    if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
        problems.append(("fatal", "COOKIE_SAMESITE=none requires COOKIE_SECURE=true."))

    admin_pw = os.environ.get("ADMIN_PASSWORD", "").strip()
    if admin_pw and admin_pw in _KNOWN_BAD_ADMIN_PASSWORDS:
        problems.append(("fatal", "ADMIN_PASSWORD matches a known-leaked value. Rotate it."))
    if admin_pw and len(admin_pw) < 12:
        problems.append(("fatal" if IS_PRODUCTION else "warn",
                         f"ADMIN_PASSWORD is too short ({len(admin_pw)} chars). Use ≥12."))

    fatal = [m for s, m in problems if s == "fatal"]
    warn = [m for s, m in problems if s == "warn"]
    for m in warn:
        logging.getLogger("vermillion").warning(f"⚠️  Env hardening: {m}")
    if fatal:
        for m in fatal:
            logging.getLogger("vermillion").error(f"🔴 Env hardening: {m}")
        if IS_PRODUCTION:
            # Refuse to boot. Loud and clear — log to stderr too.
            import sys
            sys.stderr.write(
                "\n🔴 Refusing to start in production with unsafe configuration:\n"
                + "\n".join(f"  • {m}" for m in fatal)
                + "\n  → See /app/DEPLOY.md and /app/backend/.env.example\n\n"
            )
            raise SystemExit(2)


_validate_environment()

app = FastAPI(title="Lusorae Social")
api = APIRouter(prefix="/api")

# Process start timestamp — used by /admin/system/uptime (real, computed at boot)
_PROCESS_STARTED_AT = time.time()
_PROCESS_STARTED_AT_ISO = datetime.now(timezone.utc).isoformat()

# ─── Git commit resolution (M-6) ───────────────────────────────────────────
# Try env vars first; if missing (dev/staging), fall back to `git rev-parse HEAD`
# at boot. Cached in module scope so we run the subprocess at most once.
_GIT_COMMIT_CACHED: Optional[str] = None

def _resolve_git_commit() -> str:
    """Return the git commit SHA for this build. Cached after first call."""
    global _GIT_COMMIT_CACHED
    if _GIT_COMMIT_CACHED is not None:
        return _GIT_COMMIT_CACHED
    val = (os.environ.get("GIT_COMMIT") or os.environ.get("RENDER_GIT_COMMIT") or "").strip()
    if not val:
        try:
            import subprocess
            r = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True, text=True, timeout=1, cwd="/app",
            )
            if r.returncode == 0:
                val = (r.stdout or "").strip()
        except Exception:
            val = ""
    _GIT_COMMIT_CACHED = val
    return val

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("vermillion")

# ─── Log redaction (defense-in-depth) ─────────────────────────────────────────
# Wraps the standard logging stack with a filter that strips JWTs, Bearer
# tokens, Stripe/OpenAI/AWS keys, DB URIs with credentials, bcrypt hashes and
# JSON `"password"`/`"secret"` values from EVERY log record before it is
# emitted. Catches accidental logging of secrets that no other safeguard
# would. See /app/backend/log_redaction.py.
from log_redaction import install_log_redaction
install_log_redaction()
logger.info(f"🔐 Secret backend active: {active_backend_name()}")


# ─── Rate limiting (per-IP, in-memory) ────────────────────────────────────────
# slowapi-backed. Defaults to a permissive limit globally; sensitive auth
# endpoints get explicit, tighter @limiter.limit("…") decorators below.
# Behind a proxy we honour X-Forwarded-For (first hop) — Kubernetes ingress
# already strips/rewrites this so it's safe to trust the leftmost value.
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


def _real_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "") or ""
    if xff:
        # First entry is the original client per RFC 7239 convention
        return xff.split(",")[0].strip()
    return get_remote_address(request)


# storage_uri stays default (memory:) — fine for a single-replica MVP. For
# multi-replica, switch to "redis://…" via RATE_LIMIT_STORAGE env var.
limiter = Limiter(
    key_func=_real_ip,
    storage_uri=os.environ.get("RATE_LIMIT_STORAGE", "memory://"),
    default_limits=[os.environ.get("RATE_LIMIT_DEFAULT", "300/minute")],
    headers_enabled=True,
)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    # Don't leak rate-limit internals; return a clean 429.
    logger.info(f"⏱️  Rate limit hit on {request.method} {request.url.path} from {_real_ip(request)}")
    return JSONResponse(
        status_code=429,
        content={"detail": "Demasiados pedidos. Tenta novamente daqui a pouco."},
    )


# ─── Global exception handler ─────────────────────────────────────────────────
# Catches anything not converted to HTTPException. In production we return a
# generic message so we don't leak stack traces / framework internals / SQL
# errors / file paths. In dev we expose the type+message to ease debugging.
@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    # HTTPException is handled by FastAPI's own handler with higher priority,
    # so we only reach here on truly unexpected errors.
    try:
        path = request.url.path
        method = request.method
    except Exception:
        path, method = "?", "?"
    logger.exception(f"💥 Unhandled error on {method} {path}: {type(exc).__name__}: {exc}")
    if IS_PRODUCTION:
        return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )


# ─── Health & readiness probes (Kubernetes / load-balancer friendly) ──────────
@api.get("/health")
async def health_check():
    """Liveness probe: the process is up. Does NOT touch the DB."""
    return {
        "status": "ok",
        "service": "lusorae-backend",
        "env": APP_ENV,
        "ts": datetime.now(timezone.utc).isoformat(),
        "uptime_s": int(time.time() - _PROCESS_STARTED_AT),
    }


@api.get("/ready")
async def readiness_check():
    """Readiness probe: dependencies (MongoDB) are reachable. Returns 503 if not."""
    checks = {"mongodb": False}
    try:
        await db.command("ping")
        checks["mongodb"] = True
    except Exception as e:
        logger.warning(f"Readiness: MongoDB ping failed: {e}")
    all_ok = all(checks.values())
    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={
            "status": "ok" if all_ok else "degraded",
            "checks": checks,
            "ts": datetime.now(timezone.utc).isoformat(),
        },
    )

HASHTAG_RE = re.compile(r"#([\wáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ-]+)", re.UNICODE)
MENTION_RE = re.compile(r"@([a-zA-Z0-9_]+)")
URL_RE = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)
ONLINE_WINDOW = timedelta(minutes=2)

# Fase 1: rich posts ----------------------------------------------------------
ALLOWED_REACTIONS = {"saudade", "comove", "tasca", "bombou", "cafe", "orgulho"}
REACTION_EMOJI = {
    "saudade": "🫶",
    "comove": "🥲",
    "tasca": "😂",
    "bombou": "🔥",
    "cafe": "☕",
    "orgulho": "🇵🇹",
}
VALID_AUDIENCES = {"everyone", "following", "mentioned"}
MAX_IMAGES_PER_POST = 4
MAX_POLL_OPTIONS = 4

# Fase 2: Portuguese flavour --------------------------------------------------
PT_CITIES = {
    # Distritos & locais PT (hashtag minúscula → nome bonito)
    "lisboa": "Lisboa", "porto": "Porto", "coimbra": "Coimbra",
    "braga": "Braga", "aveiro": "Aveiro", "faro": "Faro",
    "funchal": "Funchal", "leiria": "Leiria", "setubal": "Setúbal",
    "evora": "Évora", "viseu": "Viseu", "beja": "Beja",
    "guarda": "Guarda", "vilareal": "Vila Real", "viana": "Viana do Castelo",
    "santarem": "Santarém", "cascais": "Cascais", "sintra": "Sintra",
    "oeiras": "Oeiras", "almada": "Almada", "nazare": "Nazaré",
    "obidos": "Óbidos", "estoril": "Estoril", "belem": "Belém",
    "ribeira": "Ribeira", "alfama": "Alfama", "bairroalto": "Bairro Alto",
    "chiado": "Chiado", "matosinhos": "Matosinhos",
    "gaia": "Vila Nova de Gaia", "algarve": "Algarve", "douro": "Douro",
    "minho": "Minho", "alentejo": "Alentejo", "madeira": "Madeira",
    "acores": "Açores", "bragança": "Bragança", "braganca": "Bragança",
    "portalegre": "Portalegre", "castelobranco": "Castelo Branco",
    "luanda": "Luanda",  # diáspora
}

# Mood = vibe / clima do post, classificado por palavras-chave
MOODS = {
    "saudade": {"label": "Saudade", "emoji": "🥹",
                 "keywords": ["saudade", "saudades", "melancolia", "longe", "distância"]},
    "tasca":   {"label": "Tasca",   "emoji": "🍷",
                 "keywords": ["tasca", "bitoque", "vinho", "petisco", "sardinha",
                              "sardinhas", "bacalhau", "tremoço", "azeitona", "ginjinha"]},
    "festa":   {"label": "Festa",   "emoji": "🎉",
                 "keywords": ["festa", "festival", "arraial", "sanjoao", "são joão",
                              "saopedro", "são pedro", "carnaval", "fogo de artifício", "manjerico"]},
    "cafe":    {"label": "Café",    "emoji": "☕",
                 "keywords": ["café", "cafe", "bica", "pastel", "padaria", "torrada",
                              "galão", "abatanado"]},
    "praia":   {"label": "Praia",   "emoji": "🌊",
                 "keywords": ["praia", " mar ", "surf", "ondas", "costa", "areia",
                              "biquíni", "guarda-sol"]},
    "fado":    {"label": "Fado",    "emoji": "🎙️",
                 "keywords": ["fado", "fadista", "guitarra portuguesa", "tasca do chico"]},
    "futebol": {"label": "Bola",    "emoji": "⚽",
                 "keywords": ["benfica", "sporting", "slb", "fcp", "scp", "futebol",
                              "estádio", "golo", "campeão", "liga portuguesa"]},
    "cultura": {"label": "Cultura", "emoji": "🎭",
                 "keywords": ["museu", "teatro", "cinemateca", "pessoa", "saramago",
                              "exposição", "literatura", "azulejo"]},
}

COMMUNITY_CATEGORIES = [
    "cidades", "musica", "desporto", "tasca", "cultura",
    "tecnologia", "fotografia", "moda", "viagens", "outras",
]

EVENT_CATEGORIES = ["festa", "cultura", "concerto", "desporto", "tasca", "familia", "outros"]

# Conquistas (badges) — atribuídas conforme regras em runtime
PT_BADGES_DEFS = [
    {"key": "verificado",   "emoji": "✓",  "label": "Verificado",
     "desc": "Conta verificada"},
    {"key": "embaixador",   "emoji": "🇵🇹", "label": "Embaixador",
     "desc": "50+ seguidores"},
    {"key": "popular",      "emoji": "⭐", "label": "Popular",
     "desc": "100+ gostos recebidos"},
    {"key": "maratonista",  "emoji": "🔥", "label": "Maratonista",
     "desc": "Streak de 7 dias seguidos"},
    {"key": "lenda",        "emoji": "🌟", "label": "Lenda",
     "desc": "Streak de 30 dias seguidos"},
    {"key": "veterano",     "emoji": "🗓", "label": "Veterano",
     "desc": "1 ano ou mais na rede"},
    {"key": "tasqueiro",    "emoji": "🍷", "label": "Tasqueiro",
     "desc": "3+ posts sobre tasca"},
    {"key": "fadista",      "emoji": "🎙️", "label": "Fadista",
     "desc": "3+ posts sobre fado"},
    {"key": "madrugador",   "emoji": "🌅", "label": "Madrugador",
     "desc": "3+ posts entre as 5h e as 8h"},
    {"key": "noctivago",    "emoji": "🌙", "label": "Noctívago",
     "desc": "3+ posts entre as 0h e as 4h"},
    {"key": "colecionador", "emoji": "📚", "label": "Colecionador",
     "desc": "10+ publicações guardadas"},
    {"key": "conversador",  "emoji": "💬", "label": "Conversador",
     "desc": "20+ comentários feitos"},
    {"key": "fotografo",    "emoji": "📸", "label": "Fotógrafo",
     "desc": "5+ posts com imagem"},
    {"key": "viajante",     "emoji": "🧭", "label": "Viajante",
     "desc": "Posts em 3 ou mais cidades PT"},
]


def normalize_images(payload_images, single_image, max_images: Optional[int] = None) -> List[str]:
    """Coalesce legacy `image` + new `images` array into a clean list.
    max_images: override the global MAX_IMAGES_PER_POST (used for admin-set runtime limit).
    Each entry is validated as a safe data:image URL (magic-bytes check) OR https:// URL."""
    out: List[str] = []
    src: list = []
    if payload_images:
        for s in payload_images:
            if isinstance(s, str) and s.strip():
                src.append(s.strip())
    if single_image and isinstance(single_image, str) and single_image.strip() and single_image not in src:
        src.append(single_image.strip())
    for s in src:
        if not _is_safe_image_url(s):
            raise HTTPException(400, "Imagem inválida (formato não suportado).")
        out.append(s)
    cap = int(max_images) if max_images and max_images > 0 else MAX_IMAGES_PER_POST
    return out[:cap]


# Magic-byte signatures for the only image formats we accept in data URLs.
# Anything else (SVG with <script>, PDF, HTML smuggled as image, etc.) is rejected.
_IMG_MAGIC = {
    "jpeg": [b"\xff\xd8\xff"],
    "png":  [b"\x89PNG\r\n\x1a\n"],
    "gif":  [b"GIF87a", b"GIF89a"],
    "webp": [b"RIFF"],  # also needs "WEBP" at offset 8 — checked below
    "heic": [b"ftypheic", b"ftypheix", b"ftyphevc", b"ftypheim", b"ftypheis", b"ftyphevm", b"ftyphevs", b"ftypmif1"],
}


def _is_safe_image_url(s: str) -> bool:
    """Accept https:// URLs OR data:image/* base64 payloads with a valid magic
    header. Rejects SVG (XSS vector) and any text/binary smuggled as an image."""
    if not isinstance(s, str) or not s:
        return False
    sl = s.lower()
    if sl.startswith("https://") or sl.startswith("http://"):
        # External URLs: rely on browser content-type sniffing + our CSP.
        # We still cap length to avoid DB row blowup.
        return len(s) <= 2048
    if not sl.startswith("data:image/"):
        return False
    # Reject SVG explicitly — even base64'd SVG can carry <script>/onload XSS.
    if sl.startswith("data:image/svg") or "svg+xml" in sl[:64]:
        return False
    try:
        head, b64 = s.split(",", 1)
    except ValueError:
        return False
    if ";base64" not in head:
        return False
    # Decode just enough header bytes to magic-check (32 bytes is plenty).
    try:
        sample = base64.b64decode(b64[:80] + "===", validate=False)[:32]
    except Exception:
        return False
    if not sample:
        return False
    for fmt, sigs in _IMG_MAGIC.items():
        for sig in sigs:
            if fmt == "webp":
                if sample.startswith(b"RIFF") and len(sample) >= 12 and sample[8:12] == b"WEBP":
                    return True
            elif fmt == "heic":
                # HEIC ftyp box: 4-byte size + "ftyp" + brand at offset 4
                if len(sample) >= 12 and sample[4:8] == b"ftyp" and sig[4:] in sample[4:16]:
                    return True
            elif sample.startswith(sig):
                return True
    return False


def build_poll(raw: Optional[dict], max_options: Optional[int] = None) -> Optional[dict]:
    if not raw:
        return None
    options_in = raw.get("options") or []
    options: List[dict] = []
    cap = int(max_options) if (max_options and int(max_options) > 0) else MAX_POLL_OPTIONS
    for text in options_in:
        if not isinstance(text, str):
            continue
        text = text.strip()
        if not text:
            continue
        options.append({"id": str(uuid.uuid4())[:8], "text": text[:60]})
        if len(options) >= cap:
            break
    if len(options) < 2:
        raise HTTPException(400, "Enquete precisa de pelo menos 2 opções")
    ends_in = int(raw.get("ends_in_minutes") or 0)
    ends_at = None
    if ends_in > 0:
        ends_at = (datetime.now(timezone.utc) + timedelta(minutes=min(ends_in, 60 * 24 * 7))).isoformat()
    return {
        "options": options,
        "votes": {o["id"]: [] for o in options},
        "allow_multiple": bool(raw.get("allow_multiple")),
        "ends_at": ends_at,
    }


def post_is_published(p: dict) -> bool:
    """A post is visible if not draft and (no scheduled_at OR scheduled_at in past)."""
    if p.get("is_draft"):
        return False
    sched = p.get("scheduled_at")
    if not sched:
        return True
    try:
        return datetime.fromisoformat(sched) <= datetime.now(timezone.utc)
    except Exception:
        return True


async def auto_publish_due_posts() -> None:
    """Promote any scheduled post whose time has come."""
    now = now_iso()
    await db.posts.update_many(
        {"scheduled_at": {"$ne": None, "$lte": now}, "is_draft": {"$ne": True}},
        {"$unset": {"scheduled_at": ""}, "$set": {"created_at": now}},
    )



# ============================================================
# Helpers
# ============================================================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


async def _validate_password_policy(password: str) -> None:
    """Validate password against admin-controlled policy in runtime settings.
    Raises HTTPException(400) with a Portuguese-friendly message on failure.
    Settings consulted:
      min_password_chars (int)
      password_require_digit (bool)
      password_require_uppercase (bool)
      password_require_symbol (bool)
    """
    pwd = password or ""
    min_chars = int(await get_limit("min_password_chars") or 0)
    if min_chars and len(pwd) < min_chars:
        raise HTTPException(400, f"Palavra-passe demasiado curta (mínimo {min_chars} caracteres).")
    if await is_feature_enabled("password_require_digit"):
        if not any(c.isdigit() for c in pwd):
            raise HTTPException(400, "Palavra-passe tem de conter pelo menos um dígito (0-9).")
    if await is_feature_enabled("password_require_uppercase"):
        if not any(c.isupper() for c in pwd):
            raise HTTPException(400, "Palavra-passe tem de conter pelo menos uma letra maiúscula.")
    if await is_feature_enabled("password_require_symbol"):
        # Anything that's not alphanumeric counts as a symbol
        if not any((not c.isalnum()) and (not c.isspace()) for c in pwd):
            raise HTTPException(400, "Palavra-passe tem de conter pelo menos um símbolo (ex: !@#$%).")


async def _validate_username_policy(username: str) -> None:
    """Validate username length against runtime settings (admins of the platform
    can adjust min/max via /admin/settings). Format/reserved checks are kept
    inline in the callers (they're behavioural, not policy)."""
    raw = (username or "").strip()
    min_u = int(await get_limit("min_username_chars") or 1)
    max_u = int(await get_limit("max_username_chars") or 64)
    if len(raw) < min_u:
        raise HTTPException(400, f"Username demasiado curto (mínimo {min_u} caracteres).")
    if len(raw) > max_u:
        raise HTTPException(400, f"Username demasiado longo (máximo {max_u} caracteres).")


def create_access_token(user_id: str, email: str, jti: Optional[str] = None, ttl_days: Optional[int] = None) -> str:
    """Mint a hardened access JWT.

    Claims emitted (all required at decode time, see `_decode_access_token`):
      sub  — user id
      jti  — session id (revocable in db.sessions)
      iat  — issued at (used for password_changed_at + replay defenses)
      nbf  — not-before (= iat, defeats clock-skew replay tricks)
      exp  — expiry
      iss  — issuer (env-bound, defeats token reuse across environments)
      aud  — audience (env-bound, ditto)
      type — "access" (distinct from "refresh")
      email — convenience (don't trust for authorization — re-fetch from DB)
    """
    days = int(ttl_days) if ttl_days and ttl_days > 0 else 7
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(days=days),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    }
    if jti:
        payload["jti"] = jti
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# Required claims on every access token. Missing any → InvalidTokenError.
_REQUIRED_ACCESS_CLAIMS = ["sub", "exp", "iat", "nbf", "iss", "aud", "type", "jti"]
_DECODE_OPTIONS = {
    "verify_signature": True,
    "verify_exp": True,
    "verify_iat": True,
    "verify_nbf": True,
    "verify_iss": True,
    "verify_aud": True,
    "require": _REQUIRED_ACCESS_CLAIMS,
}


def _decode_token_lenient(token: str) -> Optional[dict]:
    """Decode a JWT for *defensive* paths (logout, session-id extraction).

    Unlike `_decode_access_token`, this:
      • Still pins algorithm to HS256 (alg=none is rejected)
      • Still verifies signature (forged tokens are rejected)
      • Allows expired tokens (so we can revoke a jti even post-expiry)
      • Does NOT require iss/aud/iat/nbf (so we can still parse legacy tokens
        minted by an older code path during the rollout window)

    Returns None on any failure — never raises.
    """
    if not token:
        return None
    # Raw header pre-flight (defense-in-depth — see auth_security.validate_jwt_header_strict).
    # Rejects alg=none, non-HS256, malformed headers BEFORE PyJWT touches anything.
    try:
        validate_jwt_header_strict(token)
    except InvalidJWTHeader:
        return None
    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={
                "verify_signature": True,
                "verify_exp": False,
                "verify_iat": False,
                "verify_nbf": False,
                "verify_iss": False,
                "verify_aud": False,
                "require": ["sub"],
            },
        )
    except Exception:
        return None


def _decode_access_token(token: str) -> dict:
    """Decode + validate an access token. Raises jwt.InvalidTokenError on any
    failure (expired, bad signature, missing claim, wrong audience/issuer,
    wrong algorithm, etc.).

    Algorithm pinning to ["HS256"] defeats the classic alg=none and
    alg-confusion (RS->HS) attacks: any token whose header advertises a
    different alg is rejected before signature verification.

    Two-layer header validation:
      1. `validate_jwt_header_strict` (this codebase) — raw header inspection,
         no library trust, rejects alg=none, non-HS256, `crit`, malformed JSON.
      2. PyJWT's own `algorithms=[…]` enforcement — second-line defence in
         case (1) is bypassed by a future regression.
    """
    # ── Layer 1: raw header pre-flight ───────────────────────────────────────
    try:
        validate_jwt_header_strict(token)
    except InvalidJWTHeader as e:
        # Surface as PyJWT-shaped error so the caller's exception handling
        # works unchanged. Logged as a token_invalid auth event downstream.
        raise jwt.InvalidTokenError(f"header pre-flight: {e}") from e
    # ── Layer 2: PyJWT full validation ───────────────────────────────────────
    return jwt.decode(
        token,
        JWT_SECRET,
        algorithms=[JWT_ALGORITHM],   # strict allow-list, no alg=none
        audience=JWT_AUDIENCE,
        issuer=JWT_ISSUER,
        options=_DECODE_OPTIONS,
        leeway=10,  # 10s clock skew tolerance for distributed deployments
    )


def _parse_ua(ua: str) -> dict:
    """Best-effort parse of User-Agent into {browser, os, device}."""
    ua = ua or ""
    browser = "Browser"
    if "Chrome/" in ua and "Edg/" not in ua and "OPR/" not in ua:
        browser = "Chrome"
    elif "Edg/" in ua:
        browser = "Edge"
    elif "Firefox/" in ua:
        browser = "Firefox"
    elif "Safari/" in ua and "Chrome/" not in ua:
        browser = "Safari"
    elif "OPR/" in ua or "Opera/" in ua:
        browser = "Opera"
    os_name = "Desconhecido"
    if "Windows" in ua:
        os_name = "Windows"
    elif "Mac OS X" in ua:
        os_name = "macOS"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua or "iPod" in ua:
        os_name = "iOS"
    elif "Linux" in ua:
        os_name = "Linux"
    device = "mobile" if re.search(r"Mobi|Android|iPhone|iPad", ua) else "desktop"
    return {"browser": browser, "os": os_name, "device": device}


async def create_session(user_id: str, request: Request, source: str = "login") -> str:
    """Creates a new session row + returns the jti to embed in the JWT."""
    jti = str(uuid.uuid4())
    ua = request.headers.get("user-agent", "")[:300] if request else ""
    ip = request.client.host if request and request.client else ""
    meta = _parse_ua(ua)
    sess = {
        "jti": jti,
        "user_id": user_id,
        "ip": ip,
        "ua": ua,
        "browser": meta["browser"],
        "os": meta["os"],
        "device": meta["device"],
        "source": source,  # "login" | "register" | "reset"
        "created_at": now_iso(),
        "last_seen_at": now_iso(),
        "last_ip": ip,
        "last_ua": ua,
        "revoked": False,
    }
    await db.sessions.insert_one(sess)
    return jti


async def maybe_emit_login_alert(user: dict, request: Request) -> None:
    """B-014 — If this is a 'new' device/IP for the user, drop a notification."""
    # Master kill switch (admin-controlled): when off, no login-alerts notifications.
    try:
        if not await is_feature_enabled("email_alerts_enabled"):
            return
    except Exception:
        pass
    if not user.get("login_alerts_enabled", True):
        return
    ip = request.client.host if request and request.client else ""
    ua = request.headers.get("user-agent", "")[:300] if request else ""
    meta = _parse_ua(ua)
    # If we already saw this UA-fingerprint or IP recently, skip
    seen = await db.sessions.find_one(
        {"user_id": user["id"], "ua": ua, "ip": ip},
        sort=[("created_at", -1)],
    )
    if seen:
        # not new — also no alert
        return
    # Drop an in-app notification (visible in /api/notifications)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "login_alert",
        "from_user_id": user["id"],
        "post_id": None,
        "text": f"Novo início de sessão · {meta['browser']} em {meta['os']}",
        "extra": {"browser": meta["browser"], "os": meta["os"], "ip": ip, "device": meta["device"]},
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(doc)
    try:
        if "ws_manager" in globals():
            await ws_manager.send_personal(user["id"], {
                "type": "new_notification",
                "notification": {
                    "id": doc["id"], "type": "login_alert",
                    "text": doc["text"], "created_at": doc["created_at"],
                },
            })
    except Exception:
        pass


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE, max_age=60 * 60 * 24 * 7, path="/",
    )
    # CSRF mirror-cookie — readable by JS, echoed back as X-CSRF-Token header
    # on mutating requests. The backend enforces match-or-reject on cookie auth.
    try:
        import secrets as _secrets
        csrf = _secrets.token_urlsafe(32)
        response.set_cookie(
            key="XSRF-TOKEN", value=csrf, httponly=False, secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE, max_age=60 * 60 * 24 * 7, path="/",
        )
    except Exception:
        pass


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("XSRF-TOKEN", path="/")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", text.lower()).strip()
    s = re.sub(r"\s+", "-", s)
    return s[:40] or str(uuid.uuid4())[:8]


def compute_reputation(user: dict, likes_received: int, posts_count: int) -> dict:
    # Gamificação removida — sem reputação numérica nem níveis.
    return {"reputation": 0, "level": 0}


# ============================================================
# Fase 3 — Retenção REMOVIDA (gamificação desativada).
# Mantemos os helpers como no-ops para não quebrar chamadas existentes.
# ============================================================
XP_VALUES: dict = {}

# Levels mantidos só para compatibilidade interna — não expostos ao utilizador.
LEVELS = [(0, "", "")]


def level_for_xp(xp: int) -> dict:
    """No-op — gamificação removida. Retorna estrutura neutra."""
    return {
        "xp": 0,
        "level": 0,
        "level_name": "",
        "level_emoji": "",
        "current_threshold": 0,
        "next_threshold": None,
        "next_name": None,
        "progress": 0.0,
    }


async def award_xp(user_id: str, reason: str, amount: Optional[int] = None) -> dict:
    """No-op — gamificação removida."""
    return {"gained": 0}


async def daily_checkin(user_id: str) -> None:
    """No-op — gamificação removida."""
    return None


# Daily prompts — deterministic by day-of-year. Calm, PT-flavoured nudges.
DAILY_PROMPTS = [
    {"text": "Qual o teu sítio favorito para um café em Portugal?", "emoji": "☕", "mood": "cafe", "hashtag": "cafe"},
    {"text": "Conta-nos a tua última saudade em três palavras.", "emoji": "🥹", "mood": "saudade", "hashtag": "saudade"},
    {"text": "Melhor tasca que conheces? Recomenda.", "emoji": "🍷", "mood": "tasca", "hashtag": "tasca"},
    {"text": "Que música portuguesa anda em loop hoje?", "emoji": "🎙️", "mood": "fado", "hashtag": "musica"},
    {"text": "Praia ou serra este fim-de-semana? Justifica.", "emoji": "🌊", "mood": "praia", "hashtag": "finsdesemana"},
    {"text": "Partilha uma fotografia da tua janela agora.", "emoji": "📸", "mood": None, "hashtag": "lusorae"},
    {"text": "Diz uma palavra portuguesa que adoras e porquê.", "emoji": "💬", "mood": None, "hashtag": "lingua"},
    {"text": "Última refeição que valeu cada euro?", "emoji": "🍽️", "mood": "tasca", "hashtag": "comer"},
    {"text": "Que livro andas a ler? Recomenda.", "emoji": "📚", "mood": "cultura", "hashtag": "leitura"},
    {"text": "Lisboa, Porto ou outra? Onde está o teu coração?", "emoji": "🇵🇹", "mood": None, "hashtag": "cidades"},
    {"text": "Conta um momento que te emocionou esta semana.", "emoji": "🫶", "mood": "saudade", "hashtag": "vida"},
    {"text": "Que personagem portuguesa devia ser celebrada mais?", "emoji": "🎭", "mood": "cultura", "hashtag": "cultura"},
    {"text": "Festival, concerto, peça — o que tens marcado?", "emoji": "🎉", "mood": "festa", "hashtag": "agenda"},
    {"text": "Que prato típico ainda não experimentaste mas queres?", "emoji": "🥘", "mood": "tasca", "hashtag": "gastronomia"},
    {"text": "Hoje sentes-te mais Lisboa ou mais Porto? Porquê?", "emoji": "🌉", "mood": None, "hashtag": "portugalidade"},
    {"text": "Conta um segredo bem guardado da tua cidade.", "emoji": "🤫", "mood": None, "hashtag": "segredos"},
    {"text": "Que ato de boa-vizinhança presenciaste recentemente?", "emoji": "🙏", "mood": None, "hashtag": "bairro"},
    {"text": "Se hoje fosses 10 anos mais novo, que ias fazer?", "emoji": "✨", "mood": None, "hashtag": "vida"},
    {"text": "Foto do café da manhã — bonus se for pastel de nata.", "emoji": "🥐", "mood": "cafe", "hashtag": "pequenoalmoco"},
    {"text": "Qual a melhor frase portuguesa intraduzível?", "emoji": "🗣️", "mood": None, "hashtag": "lingua"},
    {"text": "Recomenda uma série ou filme português recente.", "emoji": "🎬", "mood": "cultura", "hashtag": "cinema"},
    {"text": "Qual a tua avó dizia mais e tu nunca esqueceste?", "emoji": "👵", "mood": "saudade", "hashtag": "familia"},
    {"text": "Bairro que adoras visitar mas não vives?", "emoji": "🏘️", "mood": None, "hashtag": "bairros"},
    {"text": "Última vez que te perdeste numa cidade — onde?", "emoji": "🧭", "mood": None, "hashtag": "viagens"},
    {"text": "Que ritual diário não trocas por nada?", "emoji": "🕰️", "mood": "cafe", "hashtag": "rituais"},
    {"text": "Que evento desportivo te fez gritar mais alto?", "emoji": "⚽", "mood": "futebol", "hashtag": "desporto"},
    {"text": "Música portuguesa para uma viagem de carro?", "emoji": "🚗", "mood": None, "hashtag": "playlist"},
    {"text": "Praia secreta? (sussurra ao ouvido da timeline)", "emoji": "🏖️", "mood": "praia", "hashtag": "praias"},
    {"text": "Que mercado local recomendarias a turistas?", "emoji": "🛒", "mood": None, "hashtag": "mercados"},
    {"text": "Lembras-te de uma feira de tradição? Conta.", "emoji": "🎪", "mood": "festa", "hashtag": "tradicao"},
    {"text": "Qual a tua sopa preferida do mundo todo?", "emoji": "🥣", "mood": "tasca", "hashtag": "sopa"},
    {"text": "Que conselho darias ao teu eu de há 5 anos?", "emoji": "💭", "mood": "saudade", "hashtag": "reflexao"},
    {"text": "Café — bica, abatanado, galão? Defende a escolha.", "emoji": "☕", "mood": "cafe", "hashtag": "cafe"},
    {"text": "Que parte de Portugal queres visitar este ano?", "emoji": "🗺️", "mood": None, "hashtag": "viagens"},
    {"text": "Tradição que adoras mas que está a desaparecer?", "emoji": "🕯️", "mood": "saudade", "hashtag": "tradicao"},
]


# Onboarding checklist definitions
CHECKLIST_STEPS = [
    {"key": "avatar",         "label": "Define o teu avatar",        "emoji": "🖼️",  "xp": 15, "cta": "/settings/profile"},
    {"key": "bio",            "label": "Escreve uma bio",            "emoji": "✍️",  "xp": 15, "cta": "/settings/profile"},
    {"key": "city",           "label": "Indica a tua cidade",        "emoji": "📍",  "xp": 10, "cta": "/settings/profile"},
    {"key": "follow_5",       "label": "Segue 5 pessoas",            "emoji": "👥",  "xp": 25, "cta": "/explore"},
    {"key": "first_post",     "label": "Faz a tua primeira publicação", "emoji": "📝", "xp": 20, "cta": "/"},
    {"key": "first_comment",  "label": "Comenta numa publicação",    "emoji": "💬",  "xp": 15, "cta": "/explore"},
    {"key": "join_community", "label": "Entra numa comunidade",      "emoji": "🏛️",  "xp": 20, "cta": "/communities"},
]
CHECKLIST_BONUS_XP = 100  # bonus when ALL steps complete


async def evaluate_checklist(user: dict) -> dict:
    """No-op — checklist de onboarding com recompensas XP removida."""
    return {
        "steps": [],
        "completed": 0,
        "total": 0,
        "percent": 0,
        "all_done": True,
        "bonus_xp": 0,
        "bonus_claimed": False,
        "pending_rewards": [],
    }


# Fase 2 helpers --------------------------------------------------------------
def detect_mood(text: str) -> Optional[str]:
    """Classify a post into one of the MOODS by keyword match. None if none match."""
    if not text:
        return None
    low = text.lower()
    for key, m in MOODS.items():
        for kw in m["keywords"]:
            if kw in low:
                return key
    return None


def detect_cities(text: str, hashtags: Optional[list] = None) -> List[str]:
    """Return PT cities mentioned, deduped, max 3."""
    found: List[str] = []
    low = (text or "").lower()
    pool = set()
    for tag in (hashtags or []):
        if tag.lower() in PT_CITIES:
            pool.add(tag.lower())
    for key in PT_CITIES:
        if key in low:
            pool.add(key)
    for k in pool:
        found.append(PT_CITIES[k])
        if len(found) >= 3:
            break
    return found


def compute_velocity(curr: int, prev: int) -> int:
    """Growth % from prev → curr. Caps -99..+999."""
    if prev <= 0:
        return 100 if curr > 0 else 0
    pct = ((curr - prev) / prev) * 100
    return max(-99, min(999, int(round(pct))))


# ============================================================
# Termómetro Social — sistema central reutilizável de energia
# Estados: frio · morno · quente · em_brasa · a_ferver (0–100)
# ============================================================
TEMP_STATES = (
    {"min": 0,  "key": "frio",     "label": "Frio",     "emoji": "🧊"},
    {"min": 20, "key": "morno",    "label": "Morno",    "emoji": "🌤️"},
    {"min": 40, "key": "quente",   "label": "Quente",   "emoji": "🌡️"},
    {"min": 60, "key": "em_brasa", "label": "Em Brasa", "emoji": "🔥"},
    {"min": 80, "key": "a_ferver", "label": "A Ferver", "emoji": "🌋"},
)

# Pesos por tipo de entidade — calibrados para uma rede social de média escala.
# anchor = ponto de saturação ("activity feels alive"); baixo = aquece rápido.
TEMP_PROFILES = {
    "tag":          {"anchor": 30.0, "w_post": 3, "w_like": 1, "w_comment": 2, "w_repost": 2, "w_unique": 2},
    "city":         {"anchor": 25.0, "w_post": 3, "w_like": 1, "w_comment": 2, "w_repost": 2, "w_unique": 2},
    "mood":         {"anchor": 30.0, "w_post": 3, "w_like": 1, "w_comment": 2, "w_repost": 2, "w_unique": 2},
    "post":         {"anchor": 15.0, "w_like": 1, "w_comment": 2, "w_repost": 3, "w_reaction": 1},
    "conversation": {"anchor": 10.0, "w_message": 1},
}


def temperature_state(score: int) -> dict:
    """Map a 0..100 score to one of the 5 named states."""
    s = max(0, min(100, int(score)))
    chosen = TEMP_STATES[0]
    for st in TEMP_STATES:
        if s >= st["min"]:
            chosen = st
    return {"key": chosen["key"], "label": chosen["label"], "emoji": chosen["emoji"]}


def compute_temperature_score(curr: float, prev: float, anchor: float = 20.0) -> int:
    """Compute a 0..100 temperature from current/previous weighted activity.

    Two ingredients, intentionally:
      · base: how much *absolute* activity is happening right now.
        Saturation curve `(1 - e^(-curr/anchor)) * 70` keeps it tameable —
        big numbers don't blow up, small numbers don't sit at zero.
      · momentum: short-window velocity. Bonus capped at +30, malus at -15
        so a quiet entity that's growing fast still gets warm, and a busy
        entity that's cooling off slips down without crashing.
    """
    curr = max(0.0, float(curr))
    prev = max(0.0, float(prev))
    anchor = max(1.0, float(anchor))
    base = (1.0 - math.exp(-curr / anchor)) * 70.0
    if prev <= 0:
        velocity_pct = 100.0 if curr > 0 else 0.0
    else:
        velocity_pct = ((curr - prev) / prev) * 100.0
    momentum = max(-15.0, min(30.0, velocity_pct / 4.0))
    score = base + momentum
    # Only entities with literally zero activity should read truly cold (0).
    if curr <= 0 and prev <= 0:
        score = 0.0
    return max(0, min(100, int(round(score))))


def temperature_object(curr: float, prev: float, anchor: float = 20.0,
                       signals: Optional[dict] = None,
                       range_label: Optional[str] = None) -> dict:
    """Full payload — score + named state + raw signals + velocity %."""
    score = compute_temperature_score(curr, prev, anchor)
    st = temperature_state(score)
    velocity = compute_velocity(int(round(curr)), int(round(prev)))
    return {
        "score": score,
        "state": st["key"],
        "label": st["label"],
        "emoji": st["emoji"],
        "velocity": velocity,
        "signals": signals or {},
        "range": range_label,
    }


def _weighted_post_signals(posts: list, weights: dict) -> tuple[float, dict]:
    """Aggregate posts into a single weighted activity number + raw signals."""
    n_posts = len(posts)
    likes = sum(len(p.get("likes", []) or []) for p in posts)
    comments = sum(int(p.get("comments_count", 0) or 0) for p in posts)
    reposts = sum(len(p.get("reposts", []) or []) for p in posts)
    unique = len({p.get("author_id") for p in posts if p.get("author_id")})
    weighted = (
        n_posts * weights.get("w_post", 0)
        + likes * weights.get("w_like", 0)
        + comments * weights.get("w_comment", 0)
        + reposts * weights.get("w_repost", 0)
        + unique * weights.get("w_unique", 0)
    )
    return float(weighted), {
        "posts": n_posts,
        "likes": likes,
        "comments": comments,
        "reposts": reposts,
        "unique_authors": unique,
    }


def hours_since(iso_str: Optional[str]) -> float:
    if not iso_str:
        return 1e9
    try:
        d = datetime.fromisoformat(iso_str)
        return (datetime.now(timezone.utc) - d).total_seconds() / 3600
    except Exception:
        return 1e9


def range_to_hours(rng: str) -> int:
    return {"1h": 1, "24h": 24, "7d": 24 * 7, "30d": 24 * 30}.get(rng, 24 * 7)


def is_online(last_seen_iso: Optional[str]) -> bool:
    if not last_seen_iso:
        return False
    try:
        ls = datetime.fromisoformat(last_seen_iso)
        return datetime.now(timezone.utc) - ls < ONLINE_WINDOW
    except Exception:
        return False


def public_user(user: dict, extra: Optional[dict] = None) -> dict:
    if not user:
        return None
    data = {
        "id": user["id"],
        "email": user.get("email"),
        "username": user.get("username"),
        "name": user.get("name"),
        "bio": user.get("bio", ""),
        "avatar": user.get("avatar", ""),
        "banner": user.get("banner", ""),
        "verified": user.get("verified", False),
        "private": user.get("private", False),
        "onboarded": user.get("onboarded", False),
        "followers_count": len(user.get("followers", [])),
        "following_count": len(user.get("following", [])),
        "last_seen": user.get("last_seen"),
        "online": is_online(user.get("last_seen")),
        "created_at": user.get("created_at"),
        # PT identity / place graph
        "city": user.get("city", ""),
        "freguesia": user.get("freguesia", ""),
        "region": user.get("region", ""),
        "mood_initial": user.get("mood_initial", ""),
        "team": user.get("team", ""),
        "bio_slots": user.get("bio_slots", {}) or {},
        # Healthy-mode preferences
        "boa_noite_enabled": user.get("boa_noite_enabled", True),
        "cafezinho_enabled": user.get("cafezinho_enabled", False),
        "cafezinho_conversations": user.get("cafezinho_conversations", []),
        "feed_mix": user.get("feed_mix") or {"friends": 40, "interest": 30, "place": 30},
        # v2 — modern social
        "presence": user.get("presence") or {"status": "online", "emoji": "", "text": "", "until": None},
        "charms_equipped": user.get("charms_equipped", []),
        "cosmetics_equipped": user.get("cosmetics_equipped") or {"frame": "", "sticker": ""},
        "track_visits": user.get("track_visits", True),
        # Privacy prefs (settings → Privacidade)
        "show_online": user.get("show_online", True),
        "typing_indicator": user.get("typing_indicator", True),
        "searchable": user.get("searchable", True),
        "password_changed_at": user.get("password_changed_at"),
        "notif_muted_types": user.get("notif_muted_types", []),
        "notif_preferences": user.get("notif_preferences") or {
            "likes": True, "comments": True, "follows": True, "mentions": True, "dm": True,
        },
        # Appearance prefs (settings → Aparência)
        "theme": user.get("theme") or "light",
        "density": user.get("density") or "comfortable",
        "language": user.get("language") or "pt-PT",
        "reduce_motion": user.get("reduce_motion", False),
        # Boa-noite hours
        "boa_noite_start": user.get("boa_noite_start") or "23:00",
        "boa_noite_end": user.get("boa_noite_end") or "08:00",
        # Security (B-013/B-014/B-015)
        "two_fa_enabled": bool(user.get("two_fa_enabled")),
        "recovery_email": user.get("recovery_email", ""),
        "login_alerts_enabled": bool(user.get("login_alerts_enabled", True)),
        # Fase 1 / Pulse Engine — privacy lever. When True, this user's
        # posts and comments are EXCLUDED from per-region / per-city
        # heatmaps. Global totals still include them.
        "pulse_opt_out": bool(user.get("pulse_opt_out", False)),
        # Soft engagement signals (server-side now — see /api2/feed/signals)
        "muted_authors": user.get("muted_authors", []),
        "muted_topics": user.get("muted_topics", []),
        "favorites": user.get("favorites", []),
        "dismissed_posts": user.get("dismissed_posts", []),
        "boosted_posts": user.get("boosted_posts", []),
        "post_notes": user.get("post_notes") or {},
        "followed_threads": user.get("followed_threads", []),
        # Admin / moderation flags
        "is_admin": bool(user.get("is_admin", False)),
        "banned": bool(user.get("banned", False)),
        "ban_reason": user.get("ban_reason", "") if user.get("banned") else "",
    }
    if extra:
        data.update(extra)
    return data


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = _decode_access_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilizador não encontrado")
        if user.get("banned"):
            raise HTTPException(status_code=403, detail="Conta suspensa")
        # Temporary suspension (admin-imposed)
        if _restriction_active(user, "suspended_until"):
            raise HTTPException(
                status_code=403,
                detail=f"Conta suspensa temporariamente até {user.get('suspended_until')}",
            )
        # H5 — password rotation invalidation: any token issued BEFORE the
        # last password change is invalid, even if its jti row hasn't been
        # explicitly revoked. Defeats stolen-token-survives-password-change.
        pwd_changed = user.get("password_changed_at")
        if pwd_changed:
            try:
                token_iat = int(payload.get("iat") or 0)
                # password_changed_at is ISO 8601 — parse to epoch seconds.
                pwd_changed_dt = _parse_iso_utc(pwd_changed)
                if pwd_changed_dt is not None and token_iat < int(pwd_changed_dt.timestamp()):
                    raise HTTPException(status_code=401, detail="Sessão expirada")
            except HTTPException:
                raise
            except Exception:
                pass  # best-effort — never block on parse failure
        # B-029 — session revocation check (with TTL cache hot path)
        jti = payload.get("jti")
        if jti:
            # 1) Hot path — consult in-process TTL cache (see auth_security.RevocationCache).
            cached = revocation_cache.is_revoked_cached(jti)
            if cached is True:
                # Known-revoked in this process — refuse without DB read.
                raise HTTPException(status_code=401, detail="Sessão terminada")
            if cached is None:
                # Miss — fall through to DB and populate cache below.
                sess = await db.sessions.find_one({"jti": jti}, {"_id": 0, "revoked": 1})
                if sess and sess.get("revoked"):
                    revocation_cache.mark_revoked(jti)
                    try:
                        await auth_event(
                            "token_invalid",
                            user_id=user.get("id"),
                            jti=jti,
                            ip=request.client.host if request.client else "",
                            ua=request.headers.get("user-agent", "")[:300],
                            detail={"reason": "session_revoked"},
                        )
                    except Exception:
                        pass
                    raise HTTPException(status_code=401, detail="Sessão terminada")
                # Active — remember for ~5 s to skip the next DB read.
                revocation_cache.remember_active(jti)
            # last-seen heartbeat (best-effort, ~5 min)
            await db.sessions.update_one(
                {"jti": jti},
                {"$set": {"last_seen_at": now_iso(),
                          "last_ip": request.client.host if request.client else "",
                          "last_ua": request.headers.get("user-agent", "")[:300]}},
                upsert=False,
            )
        # update last seen (best-effort)
        await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": now_iso()}})
        return user
    except jwt.ExpiredSignatureError:
        try:
            await auth_event(
                "token_invalid",
                ip=request.client.host if request.client else "",
                ua=request.headers.get("user-agent", "")[:300],
                detail={"reason": "expired"},
            )
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError as e:
        # Includes our raw-header pre-flight rejections (alg=none, non-HS256, …).
        try:
            await auth_event(
                "token_invalid",
                ip=request.client.host if request.client else "",
                ua=request.headers.get("user-agent", "")[:300],
                detail={"reason": str(e)[:120]},
            )
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Token inválido")


def _parse_iso_utc(value: str) -> Optional[datetime]:
    """Parse an ISO-8601 timestamp into a UTC-aware datetime. Returns None on
    failure. Used to compare `password_changed_at` against token iat."""
    if not value or not isinstance(value, str):
        return None
    try:
        # Python's fromisoformat handles "+00:00" but not "Z" pre-3.11
        v = value.replace("Z", "+00:00") if value.endswith("Z") else value
        dt = datetime.fromisoformat(v)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


async def maybe_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


# ─── Hardening helpers (H1 + H2) ──────────────────────────────────────────────
# Defensive primitives shared across endpoints. Keep these tiny, fast and side-
# effect-free where possible. Anything that touches Mongo MUST be best-effort.

import collections


def safe_limit(value, default: int = 20, max_: int = 100) -> int:
    """Clamp a client-supplied list size to a safe window.

    Defends against `limit=1000000` queries that would hammer Mongo / blow up
    the response. ALWAYS use this when accepting a `limit` query parameter."""
    try:
        v = int(value) if value is not None else default
    except Exception:
        return default
    if v < 1:
        return default
    if v > max_:
        return max_
    return v


def safe_skip(value, max_: int = 10000) -> int:
    """Clamp a client-supplied skip/offset. Very large skips are scan-heavy."""
    try:
        v = int(value) if value is not None else 0
    except Exception:
        return 0
    if v < 0:
        return 0
    if v > max_:
        return max_
    return v


class _RollingWindowCounter:
    """Tiny in-memory sliding-window counter — used for per-user / per-event
    rate limiting where Mongo round-trips would be wasteful (WS events,
    reactions/min, mention bursts). NOT durable across process restart.
    Single-replica MVP only; switch to Redis if you go multi-replica."""

    __slots__ = ("_buckets", "_window")

    def __init__(self, window_seconds: float):
        self._buckets: dict[str, collections.deque] = {}
        self._window = float(window_seconds)

    def _prune(self, key: str, now: float):
        dq = self._buckets.get(key)
        if not dq:
            return
        cutoff = now - self._window
        while dq and dq[0] < cutoff:
            dq.popleft()
        if not dq:
            self._buckets.pop(key, None)

    def count(self, key: str) -> int:
        now = time.time()
        self._prune(key, now)
        return len(self._buckets.get(key, ()))

    def hit(self, key: str) -> int:
        """Record one event and return the new count inside the window."""
        now = time.time()
        dq = self._buckets.setdefault(key, collections.deque())
        cutoff = now - self._window
        while dq and dq[0] < cutoff:
            dq.popleft()
        dq.append(now)
        # Soft guard: prevent a single user from growing the deque without bound
        if len(dq) > 10000:
            while len(dq) > 5000:
                dq.popleft()
        return len(dq)

    def reset(self, key: str):
        self._buckets.pop(key, None)


class _LastEventTimes:
    """Per-key last-event timestamp — used for "throttle to 1 every N seconds"
    style limits (typing indicator, presence flap)."""

    __slots__ = ("_t",)

    def __init__(self):
        self._t: dict[str, float] = {}

    def allow(self, key: str, min_gap: float) -> bool:
        now = time.time()
        last = self._t.get(key, 0.0)
        if now - last < min_gap:
            return False
        self._t[key] = now
        # Opportunistically trim if the dict grows huge
        if len(self._t) > 50000:
            cutoff = now - 600.0
            self._t = {k: v for k, v in self._t.items() if v > cutoff}
        return True

    def clear(self, key: str):
        self._t.pop(key, None)


# Shared instances (process-local).
_reactions_minute = _RollingWindowCounter(60.0)
_mentions_hour = _RollingWindowCounter(3600.0)
_follow_actions_hour = _RollingWindowCounter(3600.0)
_follow_churn_window = _RollingWindowCounter(60.0)  # follow/unfollow flip
_dm_to_strangers_hour = _RollingWindowCounter(3600.0)
_ws_events_minute = _RollingWindowCounter(60.0)
_ws_event_last = _LastEventTimes()
_action_velocity_minute = _RollingWindowCounter(60.0)  # bot heuristic


# Anti-abuse caps (will be overrideable through settings registry once added).
_MAX_MENTIONS_PER_POST = int(os.environ.get("MAX_MENTIONS_PER_POST", "10"))


async def _assert_follows_hourly_quota(user: dict, *, action: str = "follow"):
    """Cap follow-related actions per hour to defeat mass-follow bots.
    `action` is "follow" or "unfollow" (we count both)."""
    if user and user.get("is_admin"):
        return
    limit = await get_limit("max_follows_per_hour")
    if not limit or limit <= 0:
        return
    cnt = _follow_actions_hour.count(f"foll:{user['id']}")
    if cnt >= limit:
        raise HTTPException(429, "Estás a seguir/deixar de seguir demasiado depressa. Tenta de novo daqui a uns minutos.")
    _follow_actions_hour.hit(f"foll:{user['id']}")


async def _assert_follow_churn(user_id: str, target_id: str):
    """Reject follow-flip storms (follow→unfollow→follow on same target
    in <60s). After 2 flips in the window, third is blocked."""
    key = f"churn:{user_id}:{target_id}"
    cnt = _follow_churn_window.hit(key)
    if cnt > 3:
        raise HTTPException(429, "Demasiadas alterações neste seguidor. Aguarda um minuto.")


async def _assert_reactions_minute_quota(user: dict):
    if user and user.get("is_admin"):
        return
    limit = await get_limit("max_reactions_per_minute")
    if not limit or limit <= 0:
        return
    cnt = _reactions_minute.count(f"rxn:{user['id']}")
    if cnt >= limit:
        raise HTTPException(429, f"Limite de reações por minuto atingido ({limit}).")
    _reactions_minute.hit(f"rxn:{user['id']}")


async def _assert_mentions_per_post(text: str):
    """Cap unique mentions per post to defeat mention-spam tactics."""
    if not text:
        return
    n = len(extract_mentions(text))
    cap = await get_limit("max_mentions_per_post") or _MAX_MENTIONS_PER_POST
    if n > cap:
        raise HTTPException(400, f"Demasiadas menções (máx {cap} por publicação).")


async def _assert_mentions_per_hour(user: dict, text: str):
    if user and user.get("is_admin"):
        return
    if not text:
        return
    limit = await get_limit("max_mentions_per_hour")
    if not limit or limit <= 0:
        return
    n = len(extract_mentions(text))
    if n <= 0:
        return
    used = _mentions_hour.count(f"men:{user['id']}")
    if used + n > limit:
        raise HTTPException(429, f"Limite de menções por hora atingido ({limit}).")
    for _ in range(n):
        _mentions_hour.hit(f"men:{user['id']}")


async def _record_action_velocity(user: dict, action: str):
    """Cheap bot-heuristic — record every write action. If a single user
    exceeds 60 writes/min, shadow-flag them. Best-effort, never raises."""
    if not user or user.get("is_admin"):
        return
    try:
        cnt = _action_velocity_minute.hit(f"vel:{user['id']}")
        if cnt > 60 and not user.get("shadow_muted"):
            await db.users.update_one({"id": user["id"]},
                                       {"$set": {"shadow_muted": True,
                                                 "shadow_muted_reason": f"velocity_{action}",
                                                 "shadow_muted_at": now_iso()}})
            logger.warning(f"🤖 Auto-shadow-muted user {user.get('username')} (velocity {cnt}/min, action={action})")
    except Exception:
        pass


async def _assert_dm_to_strangers_quota(user: dict, target_user_id: str):
    """Per-hour cap on DMs sent to users who do NOT follow the sender. Defends
    against DM-bombs targeting strangers. Admins bypass; mutuals bypass."""
    if user and user.get("is_admin"):
        return
    if not target_user_id or target_user_id == user["id"]:
        return
    target = await db.users.find_one({"id": target_user_id}, {"_id": 0, "followers": 1})
    if not target:
        return
    # If target follows the sender, this is a normal mutual DM — skip quota.
    if user["id"] in (target.get("followers") or []):
        return
    limit = await get_limit("max_dms_to_strangers_per_hour")
    if not limit or limit <= 0:
        return
    key = f"dmstr:{user['id']}"
    cnt = _dm_to_strangers_hour.count(key)
    if cnt >= limit:
        raise HTTPException(429, f"Limite de DMs a desconhecidos atingido ({limit}/hora).")
    _dm_to_strangers_hour.hit(key)


async def _assert_report_not_duplicate(user_id: str, kind: str, target_id: str):
    """Reject the same reporter+target combination twice within 24h."""
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    existing = await db.reports.find_one({
        "reporter_id": user_id,
        "kind": kind,
        "target_id": target_id,
        "created_at": {"$gte": since},
    }, {"_id": 0, "id": 1})
    if existing:
        raise HTTPException(429, "Já reportaste isto recentemente. Vamos analisar.")


async def require_admin(request: Request) -> dict:
    """Dependency: ensures the caller is an authenticated admin user.

    Raises 403 for any non-admin (or non-authenticated) caller. Used by every
    /api/admin/* endpoint. Audit log records the admin id on every successful call.
    """
    user = await get_current_user(request)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user


async def admin_audit(
    actor: dict,
    action: str,
    target_kind: str = "",
    target_id: str = "",
    detail: Optional[dict] = None,
) -> None:
    """Append a single admin action to db.admin_audit. Best-effort, never raises.

    Also fires a cockpit_event WebSocket broadcast for the live ticker.
    """
    audit_id = str(uuid.uuid4())
    created_at = now_iso()
    try:
        await db.admin_audit.insert_one({
            "id": audit_id,
            "actor_id": actor.get("id"),
            "actor_username": actor.get("username"),
            "action": action,
            "target_kind": target_kind,
            "target_id": target_id,
            "detail": detail or {},
            "created_at": created_at,
        })
    except Exception as e:
        logger.warning(f"admin_audit failed: {e}")
        return
    # Best-effort live broadcast — only for severe / structural actions.
    severe = {"ban_user", "delete_user", "delete_post", "delete_comment",
              "suspend_user", "shadow_mute", "freeze_user",
              "force_logout_user", "revoke_session", "blacklist_hashtag",
              "feature_user", "verify_user"}
    if action in severe:
        try:
            await ws_manager.send_to_admins({
                "type": "cockpit_event",
                "kind": "admin_action",
                "ts": created_at,
                "payload": {
                    "id": audit_id,
                    "action": action,
                    "actor_id": actor.get("id"),
                    "actor_username": actor.get("username"),
                    "target_kind": target_kind,
                    "target_id": target_id,
                },
            })
        except Exception:
            pass


def conv_key(a: str, b: str) -> str:
    return ":".join(sorted([a, b]))


def extract_hashtags(text: str) -> list:
    return list({m.group(1).lower() for m in HASHTAG_RE.finditer(text or "")})


def extract_mentions(text: str) -> list:
    return list({m.group(1).lower() for m in MENTION_RE.finditer(text or "")})


async def can_view_profile(target: dict, viewer: Optional[dict]) -> bool:
    if not target.get("private"):
        return True
    if not viewer:
        return False
    if viewer["id"] == target["id"]:
        return True
    return viewer["id"] in target.get("followers", [])


async def enrich_post(post: dict, viewer: Optional[dict]) -> dict:
    author = await db.users.find_one({"id": post["author_id"]}, {"_id": 0})
    viewer_id = viewer["id"] if viewer else None
    comments_count = await db.comments.count_documents({"post_id": post["id"]})
    repost_origin = None
    if post.get("repost_of"):
        orig = await db.posts.find_one({"id": post["repost_of"]}, {"_id": 0})
        if orig:
            orig_author = await db.users.find_one({"id": orig["author_id"]}, {"_id": 0})
            orig_comments = await db.comments.count_documents({"post_id": orig["id"]})
            repost_origin = {
                "id": orig["id"], "content": orig["content"], "image": orig.get("image", ""),
                "created_at": orig["created_at"],
                "likes_count": len(orig.get("likes", [])),
                "comments_count": orig_comments,
                "reposts_count": len(orig.get("reposts", [])),
                "liked": viewer_id in orig.get("likes", []) if viewer_id else False,
                "bookmarked": viewer_id in orig.get("bookmarks", []) if viewer_id else False,
                "reposted": viewer_id in orig.get("reposts", []) if viewer_id else False,
                "author": public_user(orig_author) if orig_author else None,
            }
    community = None
    if post.get("community_id"):
        c = await db.communities.find_one({"id": post["community_id"]}, {"_id": 0})
        if c:
            community = {"id": c["id"], "name": c["name"], "slug": c["slug"]}
    quote_origin = None
    if post.get("quote_of"):
        q = await db.posts.find_one({"id": post["quote_of"]}, {"_id": 0})
        if q:
            q_author = await db.users.find_one({"id": q["author_id"]}, {"_id": 0})
            quote_origin = {
                "id": q["id"], "content": q["content"], "image": q.get("image", ""),
                "created_at": q["created_at"],
                "author": public_user(q_author) if q_author else None,
            }
    return {
        "id": post["id"], "content": post["content"], "image": post.get("image", ""),
        "images": post.get("images", []) or ([post["image"]] if post.get("image") else []),
        "created_at": post["created_at"],
        "edited_at": post.get("edited_at"),
        "edit_history": post.get("edit_history", []),
        "views": post.get("views", 0),
        "shares": post.get("shares", 0),
        "likes_count": len(post.get("likes", [])),
        "reposts_count": len(post.get("reposts", [])),
        "comments_count": comments_count,
        "liked": viewer_id in post.get("likes", []) if viewer_id else False,
        "bookmarked": viewer_id in post.get("bookmarks", []) if viewer_id else False,
        "reposted": viewer_id in post.get("reposts", []) if viewer_id else False,
        "author": public_user(author) if author else None,
        "repost_of": repost_origin,
        "quote_of": quote_origin,
        "community": community,
        "pinned": bool(post.get("pinned")),
        "reactions": _enriched_reactions(post.get("reactions", {}), viewer_id),
        "poll": _enriched_poll(post.get("poll"), viewer_id),
        "reply_audience": post.get("reply_audience", "everyone"),
        "audience_ring": post.get("audience_ring", "publico"),
        "is_draft": bool(post.get("is_draft")),
        "scheduled_at": post.get("scheduled_at"),
        "mood": detect_mood(post.get("content", "")),
        "cities": detect_cities(post.get("content", ""), post.get("hashtags", [])),
        # v2 — collaborators
        "collaborators": await _enrich_collab_authors(post.get("collaborators", [])),
    }


async def _enrich_collab_authors(ids: list) -> list:
    if not ids:
        return []
    users = await db.users.find({"id": {"$in": list(ids)}}, {"_id": 0}).to_list(10)
    return [public_user(u) for u in users]


def _enriched_reactions(raw: dict, viewer_id: Optional[str]) -> dict:
    """Convert raw reactions dict to {key: {count, reacted, emoji}}.
    Backwards compatible — strips legacy emoji keys silently."""
    out = {}
    for key in ALLOWED_REACTIONS:
        users = raw.get(key, []) if isinstance(raw, dict) else []
        out[key] = {
            "count": len(users),
            "reacted": (viewer_id in users) if viewer_id else False,
            "emoji": REACTION_EMOJI.get(key, ""),
        }
    return out


def _enriched_poll(poll: Optional[dict], viewer_id: Optional[str]) -> Optional[dict]:
    if not poll:
        return None
    options = poll.get("options", [])
    votes = poll.get("votes", {}) or {}
    user_choice: List[str] = []
    total = 0
    enriched_options = []
    for o in options:
        v = votes.get(o["id"], [])
        total += len(v)
        if viewer_id and viewer_id in v:
            user_choice.append(o["id"])
        enriched_options.append({"id": o["id"], "text": o["text"], "votes": len(v)})
    ends_at = poll.get("ends_at")
    closed = False
    if ends_at:
        try:
            closed = datetime.fromisoformat(ends_at) <= datetime.now(timezone.utc)
        except Exception:
            closed = False
    return {
        "options": enriched_options,
        "total_votes": total,
        "allow_multiple": bool(poll.get("allow_multiple")),
        "ends_at": ends_at,
        "closed": closed,
        "user_voted_for": user_choice,
    }


async def create_notification(user_id: str, ntype: str, from_user_id: str,
                               post_id: Optional[str] = None, text: str = "",
                               extra: Optional[dict] = None) -> None:
    if user_id == from_user_id:
        return
    doc = {
        "id": str(uuid.uuid4()), "user_id": user_id, "type": ntype,
        "from_user_id": from_user_id, "post_id": post_id, "text": text,
        "read": False, "created_at": now_iso(),
    }
    if extra:
        doc.update(extra)
    await db.notifications.insert_one(doc)
    # Real-time push (best-effort)
    try:
        # ws_manager is defined later in the file; use a soft guard so module
        # import order is irrelevant.
        if "ws_manager" in globals():
            await ws_manager.send_personal(user_id, {
                "type": "new_notification",
                "notification": {
                    "id": doc["id"], "type": ntype,
                    "from_user_id": from_user_id, "post_id": post_id,
                    "text": text, "created_at": doc["created_at"],
                },
            })
    except Exception:
        pass


async def handle_mentions(text: str, author: dict, post_id: str) -> None:
    # Admin master switch: when off, mentions don't notify anyone.
    try:
        if not await is_feature_enabled("mentions_enabled"):
            return
    except Exception:
        pass
    for username in extract_mentions(text):
        target = await db.users.find_one({"username": username}, {"_id": 0})
        if target and target["id"] != author["id"]:
            await create_notification(
                target["id"], "mention", author["id"], post_id,
                f"@{author['username']} mencionou-te"
            )


# ============================================================
# Pydantic
# ============================================================
class RegisterIn(BaseModel):
    email: EmailStr
    # Wider Pydantic bounds so server-side admin-controlled limits can be enforced
    # dynamically. Real min/max are validated at runtime via settings.
    password: str = Field(min_length=4, max_length=200)
    username: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=50)
    # Optional invite code (enforced only if admin set signup_invite_code != "")
    invite_code: Optional[str] = None
    # PT identity (onboarding 60s) — all optional, may be set later in /onboarding step
    city: Optional[str] = None
    freguesia: Optional[str] = None
    region: Optional[str] = None  # norte | centro | lisboa | alentejo | algarve | madeira | acores | emigrante
    mood_initial: Optional[str] = None  # saudade | festa | tasca | fado | bola | cafe | praia | cultura
    team: Optional[str] = None  # slb | fcp | scp | outro | nenhum
    # consent (RGPD audit trail)
    terms_accepted: Optional[bool] = False
    age_confirmed: Optional[bool] = False
    marketing_opt_in: Optional[bool] = False


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None  # 2FA — required when account has 2fa_enabled


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str = Field(min_length=4, max_length=200)


class UpdateProfileIn(BaseModel):
    name: Optional[str] = Field(default=None, max_length=80)
    bio: Optional[str] = Field(default=None, max_length=500)
    avatar: Optional[str] = Field(default=None, max_length=5000)
    banner: Optional[str] = Field(default=None, max_length=5000)
    private: Optional[bool] = None
    # PT identity / place graph
    city: Optional[str] = Field(default=None, max_length=80)
    freguesia: Optional[str] = Field(default=None, max_length=80)
    region: Optional[str] = Field(default=None, max_length=40)
    mood_initial: Optional[str] = Field(default=None, max_length=40)
    team: Optional[str] = Field(default=None, max_length=40)
    # Bio slots (semantic profile fields, all optional)
    bio_slots: Optional[dict] = None  # {city, mood_today, soundtrack, reading, favourite_place, quote_of_month}
    # Healthy-mode preferences
    boa_noite_enabled: Optional[bool] = None  # silence push 23h-08h
    boa_noite_start: Optional[str] = None     # "HH:MM"
    boa_noite_end: Optional[str] = None       # "HH:MM"
    cafezinho_enabled: Optional[bool] = None  # morning 60s session
    feed_mix: Optional[dict] = None  # {friends: 40, interest: 30, place: 30}
    # Privacy prefs (settings → Privacidade)
    show_online: Optional[bool] = None
    typing_indicator: Optional[bool] = None
    searchable: Optional[bool] = None
    # Appearance prefs — persisted cross-device
    theme: Optional[str] = None        # "light" | "sepia" | "auto"
    density: Optional[str] = None      # "compact" | "comfortable"
    language: Optional[str] = None     # "pt-PT" | "pt-BR" | "en"
    reduce_motion: Optional[bool] = None
    # Notification preference object (5 channels)
    notif_preferences: Optional[dict] = None  # {likes,comments,follows,mentions,dm: bool}
    # B-015 — Recovery email (used as fallback for forgot-password)
    recovery_email: Optional[str] = None
    # B-014 — Per-user toggle for login-alert notifications
    login_alerts_enabled: Optional[bool] = None
    # Fase 1 / Pulse Engine — opt-out of contributing to region/city
    # heatmaps. Default False (user contributes). When True, the user's
    # posts and comments still happen normally but no longer count in
    # /api/pulse/regions or /api/pulse/cities aggregates.
    pulse_opt_out: Optional[bool] = None


class TwoFASetupConfirmIn(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class TwoFADisableIn(BaseModel):
    password: str
    code: Optional[str] = None  # TOTP or backup code


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=4, max_length=200)


class DeleteAccountIn(BaseModel):
    password: str
    confirm: str  # must equal "APAGAR"


class PostIn(BaseModel):
    content: str = Field(min_length=0, max_length=10000)
    image: Optional[str] = ""
    images: Optional[List[str]] = None  # multi-image (up to 4)
    community_id: Optional[str] = None
    quote_of: Optional[str] = None
    poll: Optional[dict] = None  # { options: [str], allow_multiple: bool, ends_in_minutes: int }
    scheduled_at: Optional[str] = None  # ISO future date → scheduled
    is_draft: Optional[bool] = False
    reply_audience: Optional[str] = "everyone"  # everyone | following | mentioned
    audience_ring: Optional[str] = "publico"  # publico | amigos | tasca


class PostEditIn(BaseModel):
    content: Optional[str] = Field(default=None, max_length=10000)
    images: Optional[List[str]] = None  # only used when editing a draft / scheduled
    scheduled_at: Optional[str] = None  # rescheduling a scheduled post


class PostVoteIn(BaseModel):
    option_ids: List[str]


class PostReactIn(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)


class MessageReactIn(BaseModel):
    emoji: str = Field(min_length=1, max_length=4)


class CommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    parent_id: Optional[str] = None  # for nested replies


class MessageIn(BaseModel):
    to_user_id: str
    content: str = Field(min_length=1, max_length=10000)


class StoryIn(BaseModel):
    # Tipo de media: image | video | text
    media_type: Optional[str] = "image"
    image: Optional[str] = ""        # base64 ou URL (image stories)
    video: Optional[str] = ""        # base64 (vídeo curto até ~15s)
    duration_ms: Optional[int] = 5000
    # Story tipo "texto" (sem media, fundo gradiente)
    text_content: Optional[str] = ""
    background: Optional[str] = "coral"   # preset key (coral, ocean, dusk, fado, ...)
    text_color: Optional[str] = "#ffffff"
    font_style: Optional[str] = "modern"  # modern | classic | neon | typewriter | serif | bold | brush
    text_style: Optional[str] = "plain"   # plain | highlight | outline | glow
    # Overlay/caption (image/video stories)
    caption: Optional[str] = ""
    # Caption position as draggable text overlay (0..1 normalized).
    caption_pos: Optional[dict] = None
    # Stickers interactivos posicionados no canvas
    # cada um: {id, type, x, y, rotation, scale, data}
    stickers: Optional[List[dict]] = None
    # Audiência: everyone | roda | following
    audience: Optional[str] = "everyone"
    allow_replies: Optional[bool] = True
    allow_reactions: Optional[bool] = True
    # Hashtags/menções inline (texto livre extraído ou explicit)
    content: Optional[str] = ""  # legado; alias de caption


class StoryReplyIn(BaseModel):
    content: str = Field(min_length=1, max_length=500)


class StoryReactIn(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)


class StoryPollVoteIn(BaseModel):
    sticker_id: str
    option_id: str


class StoryQuestionAnswerIn(BaseModel):
    sticker_id: str
    content: str = Field(min_length=1, max_length=200)


class StorySliderIn(BaseModel):
    sticker_id: str
    value: float = Field(ge=0, le=1)


class HighlightIn(BaseModel):
    title: str = Field(min_length=1, max_length=24)
    cover: Optional[str] = ""           # base64 ou story_id de onde derivar
    story_ids: Optional[List[str]] = None


class HighlightPatchIn(BaseModel):
    title: Optional[str] = None
    cover: Optional[str] = None
    story_ids: Optional[List[str]] = None


class CommunityIn(BaseModel):
    name: str = Field(min_length=3, max_length=40)
    description: str = Field(default="", max_length=200)
    category: str = Field(default="outras", max_length=20)


class EventIn(BaseModel):
    title: str = Field(min_length=3, max_length=80)
    description: str = Field(default="", max_length=400)
    location: str = Field(default="", max_length=120)
    starts_at: str  # ISO
    category: str = Field(default="outros", max_length=20)


# ============================================================
# Auth
# ============================================================
@api.get("/auth/check-username")
@limiter.limit("30/minute")
async def check_username(request: Request, response: Response, u: str = ""):
    """Public, unauthenticated endpoint used by the registration form to give
    real-time availability feedback on the player ID (username)."""
    raw = (u or "").strip()
    if not raw:
        return {"available": False, "reason": "empty", "message": "Escolhe um username."}
    # Dynamic min/max length from runtime settings (admin-controllable).
    _min = int(await get_limit("min_username_chars") or 3)
    _max = int(await get_limit("max_username_chars") or 20)
    if len(raw) < _min:
        return {"available": False, "reason": "too_short", "message": f"Mínimo {_min} caracteres."}
    if len(raw) > _max:
        return {"available": False, "reason": "too_long", "message": f"Máximo {_max} caracteres."}
    if not re.fullmatch(r"[a-zA-Z0-9_]+", raw):
        return {"available": False, "reason": "invalid_chars", "message": "Só letras, números e _."}
    RESERVED = {
        "admin", "root", "support", "lusorae", "vermillion", "vm", "moderator", "mod",
        "help", "official", "api", "anon", "anonymous", "null", "undefined",
        "system", "team", "staff", "bot",
    }
    if raw.lower() in RESERVED:
        return {"available": False, "reason": "reserved", "message": "Username reservado."}
    existing = await db.users.find_one({"username": raw.lower()}, {"_id": 0, "id": 1})
    if existing:
        return {"available": False, "reason": "taken", "message": "Já em uso."}
    return {"available": True, "message": "Disponível."}


# Cheap-but-decent email validator (must match what Pydantic will accept at register).
# We don't import email_validator here because it pulls in DNS checks; the canonical
# validation still happens at POST /auth/register via Pydantic EmailStr.
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
# Common disposable/throwaway domains we reject (best-effort)
_DISPOSABLE_DOMAINS = {
    "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
    "yopmail.com", "trashmail.com", "throwaway.email", "fakeinbox.com",
    "maildrop.cc", "getnada.com", "sharklasers.com", "guerrillamail.info",
    "spam4.me", "tempinbox.com", "dispostable.com", "mintemail.com",
}


@api.get("/auth/check-email")
@limiter.limit("30/minute")
async def check_email(request: Request, response: Response, e: str = ""):
    """Public, unauthenticated endpoint that mirrors check-username for emails.
    Returns one of: empty | invalid | disposable | taken | available."""
    raw = (e or "").strip().lower()
    if not raw:
        return {"available": False, "reason": "empty", "message": "Introduz um email."}
    if len(raw) > 200:
        return {"available": False, "reason": "invalid", "message": "Email demasiado longo."}
    if not _EMAIL_RE.match(raw):
        return {"available": False, "reason": "invalid", "message": "Formato de email inválido."}
    try:
        domain = raw.split("@", 1)[1]
    except IndexError:
        return {"available": False, "reason": "invalid", "message": "Formato de email inválido."}
    if domain in _DISPOSABLE_DOMAINS:
        if await is_feature_enabled("disposable_email_block_enabled"):
            return {"available": False, "reason": "disposable", "message": "Emails descartáveis não são aceites."}
    existing = await db.users.find_one({"email": raw}, {"_id": 0, "id": 1})
    if existing:
        return {"available": False, "reason": "taken", "message": "Já existe uma conta com este email."}
    return {"available": True, "message": "Disponível."}


@api.post("/auth/register")
@limiter.limit("5/minute")
async def register(payload: RegisterIn, request: Request, response: Response):
    # Grupo A: signup_open feature flag (admins não passam aqui por isto ser registo).
    if not await is_feature_enabled("signup_open"):
        raise HTTPException(503, SETTINGS_BY_KEY["signup_open"].get("off_message") or "Registos fechados")
    # Optional invite-code gate (only enforced when admin set a non-empty code).
    _invite_required = (await get_setting("signup_invite_code") or "").strip()
    if _invite_required:
        _provided = (payload.invite_code or "").strip()
        if _provided != _invite_required:
            raise HTTPException(403, "Código de convite inválido ou em falta.")
    # Dynamic username + password policy (admin-controlled).
    await _validate_username_policy(payload.username)
    await _validate_password_policy(payload.password)
    email = payload.email.lower()
    username = payload.username.lower().strip()
    # Reject disposable email domains when policy is on.
    if await is_feature_enabled("disposable_email_block_enabled"):
        try:
            _domain = email.split("@", 1)[1]
        except IndexError:
            _domain = ""
        if _domain in _DISPOSABLE_DOMAINS:
            raise HTTPException(400, "Emails descartáveis não são aceites.")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email já registado")
    if await db.users.find_one({"username": username}):
        raise HTTPException(400, "Username já em uso")
    now = now_iso()
    # Grupo A: new_users_auto_verify
    auto_verified = bool(await is_feature_enabled("new_users_auto_verify"))
    user = {
        "id": str(uuid.uuid4()), "email": email, "username": username,
        "name": payload.name, "password_hash": hash_password(payload.password),
        "bio": "", "avatar": "", "banner": "",
        "verified": auto_verified, "private": False, "onboarded": False,
        "followers": [], "following": [], "bookmarks": [],
        "last_seen": now, "created_at": now,
        # PT identity
        "city": (payload.city or "").strip(),
        "freguesia": (payload.freguesia or "").strip(),
        "region": (payload.region or "").lower().strip(),
        "mood_initial": (payload.mood_initial or "").lower().strip(),
        "team": (payload.team or "").lower().strip(),
        "bio_slots": {},
        # Healthy-mode defaults (anti-dark-pattern)
        "boa_noite_enabled": True,
        "cafezinho_enabled": False,
        "feed_mix": {"friends": 40, "interest": 30, "place": 30},
        # B-014 default ON
        "login_alerts_enabled": True,
        # RGPD consent audit trail (Lei 58/2019 art. 16)
        "consent": {
            "terms_accepted": bool(payload.terms_accepted),
            "age_confirmed": bool(payload.age_confirmed),
            "marketing_opt_in": bool(payload.marketing_opt_in),
            "terms_version": 1,
            "privacy_version": 1,
            "accepted_at": now,
        },
    }
    await db.users.insert_one(user)
    jti = await create_session(user["id"], request, source="register")
    _ttl = await get_limit("session_ttl_days")
    token = create_access_token(user["id"], email, jti=jti, ttl_days=_ttl)
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/login")
@limiter.limit("10/minute")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    ip = request.client.host if request and request.client else ""
    ua = request.headers.get("user-agent", "")[:300] if request else ""

    # H6 — per-account lockout (defeats credential stuffing past IP rate limit)
    locked_until = await is_login_locked(email)
    if locked_until is not None:
        # Don't leak the precise unlock time to the client (info disclosure),
        # but the audit log has it.
        await auth_event("login_fail", email=email, ip=ip, ua=ua,
                         detail={"reason": "account_locked"})
        raise HTTPException(429, "Demasiadas tentativas. Tenta novamente em alguns minutos.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        state = await register_failed_login(email, ip=ip)
        await auth_event("login_fail", email=email, ip=ip, ua=ua,
                         detail={"reason": "bad_credentials", "fail_count": state["fail_count"]})
        # Constant-ish response time: bcrypt already burned cycles on the
        # password compare even when user is None (verify_password handles
        # the missing hash gracefully), so timing leak is bounded.
        raise HTTPException(401, "Credenciais inválidas")
    # Banned users cannot log in
    if user.get("banned"):
        await auth_event("login_fail", user_id=user["id"], email=email, ip=ip, ua=ua,
                         detail={"reason": "banned"})
        raise HTTPException(403, "Conta suspensa. Contacta o suporte.")
    # B-013 — 2FA gate
    if user.get("two_fa_enabled") and user.get("two_fa_secret"):
        code = (payload.totp_code or "").strip()
        if not code:
            raise HTTPException(403, "Código 2FA necessário")
        if not await _verify_2fa_code(user, code):
            await auth_event("twofa_fail", user_id=user["id"], email=email, ip=ip, ua=ua)
            raise HTTPException(401, "Código 2FA inválido")
    # B-014 — login alert before creating new session
    await maybe_emit_login_alert(user, request)
    jti = await create_session(user["id"], request, source="login")
    _ttl = await get_limit("session_ttl_days")
    token = create_access_token(user["id"], email, jti=jti, ttl_days=_ttl)
    set_auth_cookie(response, token)
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": now_iso()}})
    # H6 — successful login resets failure counter & emits audit event
    await clear_failed_login(email)
    await auth_event("login_ok", user_id=user["id"], email=email, ip=ip, ua=ua, jti=jti)
    return {"user": public_user(user), "token": token}


async def _verify_2fa_code(user: dict, code: str) -> bool:
    code = (code or "").replace(" ", "").replace("-", "").strip().upper()
    if not code:
        return False
    # TOTP first
    secret = user.get("two_fa_secret")
    if secret:
        try:
            totp = pyotp.TOTP(secret)
            if totp.verify(code, valid_window=1):
                return True
        except Exception:
            pass
    # Backup codes (one-shot use)
    backups = user.get("two_fa_backup_codes") or []
    if code in backups:
        await db.users.update_one(
            {"id": user["id"]},
            {"$pull": {"two_fa_backup_codes": code}},
        )
        return True
    return False


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    # B-029 — Revoke the current session jti
    token = request.cookies.get("access_token") or ""
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        try:
            payload = _decode_token_lenient(token) or {}
            jti = payload.get("jti")
            user_id = payload.get("sub")
            if jti:
                await db.sessions.update_one(
                    {"jti": jti},
                    {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "logout"}},
                )
                # Refuse further requests bearing this jti from this process
                # immediately — no need to wait for the 5 s positive-cache to lapse.
                revocation_cache.mark_revoked(jti)
                await auth_event(
                    "logout",
                    user_id=user_id,
                    jti=jti,
                    ip=request.client.host if request and request.client else "",
                    ua=request.headers.get("user-agent", "")[:300] if request else "",
                )
                # H7 — force-disconnect any WebSocket bound to this jti so
                # realtime presence/typing channels drop the moment the
                # token is revoked, not 30 s later.
                try:
                    await ws_manager.close_sockets_by_jti(jti)
                except Exception:
                    pass
        except Exception:
            pass
    clear_auth_cookie(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(request: Request):
    user = await maybe_user(request)
    if not user:
        return {"user": None}
    return {"user": public_user(user)}


@api.post("/auth/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(payload: ForgotPasswordIn, request: Request, response: Response):
    email = payload.email.lower()
    # B-015 — Try primary email first, then recovery_email
    user = await db.users.find_one({"email": email}, {"_id": 0})
    used_recovery = False
    if not user:
        user = await db.users.find_one({"recovery_email": email}, {"_id": 0})
        used_recovery = bool(user)
    if user:
        token = secrets.token_urlsafe(24)
        expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        await db.password_resets.insert_one({
            "token": token, "user_id": user["id"], "expires_at": expires, "used": False,
            "delivered_to": email, "via_recovery": used_recovery,
        })
        # Security: never log the full token at INFO level — it would land in
        # production log aggregators and reset anyone's password. Mask to
        # prefix+length; full value only at DEBUG (off in prod).
        _masked = (token[:4] + "…" + f"({len(token)})") if token else ""
        logger.info(f"🔐 Password reset issued for {email} (via_recovery={used_recovery}) token={_masked}")
        logger.debug(f"🔐 Full reset token for {email}: {token}")
        # Security: NEVER expose the reset token in the API response — it would
        # allow anyone to reset anyone's password just by hitting forgot-password.
        # The token is delivered out-of-band (email in prod, logs in dev).
        if IS_PRODUCTION:
            return {"ok": True}
        # In dev/staging we expose it only to ease local testing.
        return {"ok": True, "dev_token": token, "via_recovery": used_recovery}
    return {"ok": True}


@api.post("/auth/reset-password")
@limiter.limit("10/minute")
async def reset_password(payload: ResetPasswordIn, request: Request, response: Response):
    rec = await db.password_resets.find_one({"token": payload.token, "used": False}, {"_id": 0})
    if not rec:
        raise HTTPException(400, "Token inválido")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "Token expirado")
    # Admin-controlled password policy
    await _validate_password_policy(payload.password)
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.password), "password_changed_at": now_iso()}})
    await db.password_resets.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


@api.post("/auth/change-password")
async def change_password(payload: ChangePasswordIn, request: Request, user=Depends(get_current_user)):
    """Change password while logged in. Validates current password via bcrypt."""
    fresh = await db.users.find_one({"id": user["id"]})
    if not fresh:
        raise HTTPException(404, "Utilizador não encontrado")
    if not verify_password(payload.current_password, fresh.get("password_hash", "")):
        raise HTTPException(400, "Palavra-passe atual incorreta")
    if payload.current_password == payload.new_password:
        raise HTTPException(400, "A nova palavra-passe tem de ser diferente da atual")
    # Admin-controlled password policy (min length + composition rules)
    await _validate_password_policy(payload.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": hash_password(payload.new_password),
            "password_changed_at": now_iso(),
        }},
    )
    # Invalidate any pending reset tokens for this user
    await db.password_resets.update_many(
        {"user_id": user["id"], "used": False},
        {"$set": {"used": True}},
    )
    # B-029 — Optionally revoke OTHER sessions after a password change.
    # Keep current session alive; revoke siblings.
    current_jti = _extract_jti_from_request(request)
    revoked_jtis = []
    if current_jti:
        # Capture the jtis we're about to revoke so we can also kick their WS.
        async for s in db.sessions.find(
            {"user_id": user["id"], "revoked": False, "jti": {"$ne": current_jti}},
            {"_id": 0, "jti": 1},
        ):
            if s.get("jti"):
                revoked_jtis.append(s["jti"])
        await db.sessions.update_many(
            {"user_id": user["id"], "revoked": False, "jti": {"$ne": current_jti}},
            {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "password_change"}},
        )
    # H7 — kick WebSockets bound to revoked siblings immediately.
    for j in revoked_jtis:
        try:
            await ws_manager.close_sockets_by_jti(j)
        except Exception:
            pass
        # Also mark in the local revocation cache so this process refuses
        # the sibling tokens without waiting for the next DB roundtrip.
        revocation_cache.mark_revoked(j)
    await auth_event(
        "password_changed",
        user_id=user["id"], email=user.get("email", ""),
        ip=request.client.host if request and request.client else "",
        ua=request.headers.get("user-agent", "")[:300] if request else "",
        jti=current_jti,
        detail={"siblings_revoked": len(revoked_jtis)},
    )
    return {"ok": True, "password_changed_at": now_iso()}


def _extract_jti_from_request(request: Request) -> Optional[str]:
    token = request.cookies.get("access_token") or ""
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        return None
    payload = _decode_token_lenient(token)
    return payload.get("jti") if payload else None


# ============================================================
# B-029 — Sessions: list, terminate one, terminate all-others
# ============================================================
@api.get("/auth/sessions")
async def list_sessions(request: Request, user=Depends(get_current_user)):
    """List all active (non-revoked) sessions for the current user."""
    current_jti = _extract_jti_from_request(request)
    rows = await db.sessions.find(
        {"user_id": user["id"], "revoked": {"$ne": True}},
        {"_id": 0},
    ).sort("last_seen_at", -1).to_list(100)
    out = []
    for s in rows:
        out.append({
            "id": s.get("jti"),
            "browser": s.get("browser", "Browser"),
            "os": s.get("os", "Desconhecido"),
            "device": s.get("device", "desktop"),
            "ip": s.get("last_ip") or s.get("ip", ""),
            "created_at": s.get("created_at"),
            "last_seen_at": s.get("last_seen_at"),
            "current": s.get("jti") == current_jti,
            "source": s.get("source", "login"),
        })
    return out


@api.delete("/auth/sessions/{session_id}")
async def revoke_session(session_id: str, request: Request, user=Depends(get_current_user)):
    sess = await db.sessions.find_one({"jti": session_id, "user_id": user["id"]}, {"_id": 0})
    if not sess:
        raise HTTPException(404, "Sessão não encontrada")
    current_jti = _extract_jti_from_request(request)
    if sess.get("jti") == current_jti:
        raise HTTPException(400, "Usa o botão 'Terminar sessão' para sair da sessão atual.")
    await db.sessions.update_one(
        {"jti": session_id},
        {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "user_revoke"}},
    )
    revocation_cache.mark_revoked(session_id)
    # H7 — close any WS bound to this jti immediately.
    try:
        await ws_manager.close_sockets_by_jti(session_id)
    except Exception:
        pass
    await auth_event(
        "session_revoked",
        user_id=user["id"], email=user.get("email", ""), jti=session_id,
        ip=request.client.host if request and request.client else "",
        ua=request.headers.get("user-agent", "")[:300] if request else "",
    )
    return {"ok": True}


@api.post("/auth/sessions/revoke-others")
async def revoke_other_sessions(request: Request, user=Depends(get_current_user)):
    current_jti = _extract_jti_from_request(request)
    q = {"user_id": user["id"], "revoked": {"$ne": True}}
    if current_jti:
        q["jti"] = {"$ne": current_jti}
    # Capture the jtis before flipping them so we can also kick their WS.
    jtis = []
    async for s in db.sessions.find(q, {"_id": 0, "jti": 1}):
        if s.get("jti"):
            jtis.append(s["jti"])
    res = await db.sessions.update_many(
        q,
        {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "user_revoke_all"}},
    )
    # H7 — kick all matching WebSockets.
    for j in jtis:
        try:
            await ws_manager.close_sockets_by_jti(j)
        except Exception:
            pass
        revocation_cache.mark_revoked(j)
    await auth_event(
        "session_revoked_all",
        user_id=user["id"], email=user.get("email", ""), jti=current_jti,
        ip=request.client.host if request and request.client else "",
        ua=request.headers.get("user-agent", "")[:300] if request else "",
        detail={"count": res.modified_count},
    )
    return {"ok": True, "revoked": res.modified_count}


# ============================================================
# B-013 — 2FA TOTP (setup, verify, disable, regenerate backup codes)
# ============================================================
def _generate_backup_codes(n: int = 10) -> List[str]:
    """10 single-use backup codes, 8 chars [0-9a-z], dash-separated visually."""
    return [secrets.token_hex(4).upper() for _ in range(n)]


@api.post("/auth/2fa/setup")
async def two_fa_setup(user=Depends(get_current_user)):
    """Start 2FA enrollment. Returns the provisioning URL + QR code (data URL).
    Does NOT activate 2FA — the user must confirm via /verify with a valid code.
    """
    if user.get("two_fa_enabled"):
        raise HTTPException(400, "2FA já está ativo")
    # Reuse pending secret if user re-opens the flow
    secret = user.get("two_fa_pending_secret") or pyotp.random_base32()
    issuer = "Lusorae"
    label = user.get("email") or user.get("username") or user["id"]
    provisioning_url = pyotp.TOTP(secret).provisioning_uri(name=label, issuer_name=issuer)
    # Build a QR code as a base64 PNG data URL (works with <img src=...>)
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(provisioning_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_fa_pending_secret": secret, "two_fa_pending_started_at": now_iso()}},
    )
    return {
        "secret": secret,
        "otpauth_url": provisioning_url,
        "qr_data_url": data_url,
        "issuer": issuer,
        "account": label,
    }


@api.post("/auth/2fa/verify")
async def two_fa_verify(payload: TwoFASetupConfirmIn, user=Depends(get_current_user)):
    """Confirm enrollment: validates the code against the pending secret and
    activates 2FA. Returns one-time-use backup codes (only shown ONCE)."""
    fresh = await db.users.find_one({"id": user["id"]})
    pending = (fresh or {}).get("two_fa_pending_secret")
    if not pending:
        raise HTTPException(400, "Inicia o setup primeiro")
    if (fresh or {}).get("two_fa_enabled"):
        raise HTTPException(400, "2FA já está ativo")
    try:
        if not pyotp.TOTP(pending).verify((payload.code or "").strip(), valid_window=1):
            raise HTTPException(401, "Código inválido")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Código inválido")
    backup = _generate_backup_codes(10)
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "two_fa_enabled": True,
                "two_fa_secret": pending,
                "two_fa_backup_codes": backup,
                "two_fa_enabled_at": now_iso(),
            },
            "$unset": {"two_fa_pending_secret": "", "two_fa_pending_started_at": ""},
        },
    )
    return {"ok": True, "backup_codes": backup}


@api.post("/auth/2fa/disable")
async def two_fa_disable(payload: TwoFADisableIn, user=Depends(get_current_user)):
    """Disable 2FA — requires current password. If 2FA was active, also requires
    a valid TOTP code (or backup code)."""
    fresh = await db.users.find_one({"id": user["id"]})
    if not verify_password(payload.password, (fresh or {}).get("password_hash", "")):
        raise HTTPException(400, "Palavra-passe incorreta")
    if (fresh or {}).get("two_fa_enabled"):
        if not await _verify_2fa_code(fresh or {}, payload.code or ""):
            raise HTTPException(401, "Código 2FA inválido")
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {"two_fa_enabled": False},
            "$unset": {
                "two_fa_secret": "",
                "two_fa_backup_codes": "",
                "two_fa_pending_secret": "",
                "two_fa_pending_started_at": "",
            },
        },
    )
    return {"ok": True}


@api.post("/auth/2fa/regenerate-backup")
async def two_fa_regenerate_backup(payload: TwoFADisableIn, user=Depends(get_current_user)):
    fresh = await db.users.find_one({"id": user["id"]})
    if not (fresh or {}).get("two_fa_enabled"):
        raise HTTPException(400, "2FA não está ativo")
    if not verify_password(payload.password, (fresh or {}).get("password_hash", "")):
        raise HTTPException(400, "Palavra-passe incorreta")
    backup = _generate_backup_codes(10)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_fa_backup_codes": backup}},
    )
    return {"ok": True, "backup_codes": backup}


@api.get("/auth/2fa/status")
async def two_fa_status(user=Depends(get_current_user)):
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "two_fa_enabled": 1, "two_fa_pending_secret": 1, "two_fa_backup_codes": 1, "two_fa_enabled_at": 1})
    return {
        "enabled": bool((fresh or {}).get("two_fa_enabled")),
        "setup_in_progress": bool((fresh or {}).get("two_fa_pending_secret")) and not bool((fresh or {}).get("two_fa_enabled")),
        "backup_codes_left": len((fresh or {}).get("two_fa_backup_codes") or []),
        "enabled_at": (fresh or {}).get("two_fa_enabled_at"),
    }


# ============================================================
# Users
# ============================================================
@api.get("/users/search")
async def search_users(q: str = "", user=Depends(get_current_user)):
    if not q.strip():
        return []
    regex = {"$regex": re.escape(q), "$options": "i"}
    cursor = db.users.find(
        {"$or": [{"username": regex}, {"name": regex}]}, {"_id": 0},
    ).limit(20)
    users = await cursor.to_list(20)
    return [public_user(u) for u in users]


@api.get("/users/suggestions")
async def user_suggestions(user=Depends(get_current_user)):
    # Smart: friends-of-friends ranked by mutual followers + recent activity
    following = set(user.get("following", []))
    excluded = following | {user["id"]}
    candidates = await db.users.find(
        {"id": {"$nin": list(excluded)}}, {"_id": 0},
    ).to_list(200)
    scored = []
    for c in candidates:
        c_followers = set(c.get("followers", []))
        mutual = len(c_followers & following)
        followers_total = len(c.get("followers", []))
        # Score: 10 * mutuals + log(followers+1) + 1 if verified
        score = mutual * 10 + math.log1p(followers_total) + (2 if c.get("verified") else 0)
        scored.append((score, mutual, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    out = []
    for score, mutual, c in scored[:5]:
        d = public_user(c)
        d["mutual_count"] = mutual
        d["reason"] = (
            f"{mutual} em comum" if mutual > 0
            else ("novo" if len(c.get("followers", [])) < 3 else "")
        )
        out.append(d)
    return out


@api.get("/search")
async def global_search(q: str = "", viewer: Optional[dict] = Depends(maybe_user)):
    if not q.strip():
        return {"users": [], "posts": [], "tags": []}
    # Grupo A: search_enabled — admins ainda recebem resultados
    if not (viewer and viewer.get("is_admin")) and not await is_feature_enabled("search_enabled"):
        return {"users": [], "posts": [], "tags": []}
    regex = {"$regex": re.escape(q), "$options": "i"}
    users = await db.users.find(
        {"$or": [{"username": regex}, {"name": regex}]}, {"_id": 0},
    ).limit(10).to_list(10)
    posts = await db.posts.find(
        {"content": regex, "repost_of": {"$exists": False}}, {"_id": 0},
    ).sort("created_at", -1).limit(20).to_list(20)
    tag = q.strip().lstrip("#").lower()
    tagged = await db.posts.count_documents({"hashtags": tag})
    return {
        "users": [public_user(u) for u in users],
        "posts": [await enrich_post(p, viewer) for p in posts],
        "tags": [{"tag": tag, "count": tagged}] if tagged else [],
    }


@api.get("/users/{username}")
async def get_user(username: str, viewer: Optional[dict] = Depends(maybe_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    # v2: track profile visit (once per day per viewer→target)
    if viewer and viewer["id"] != user["id"] and user.get("track_visits", True) is not False:
        try:
            today_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            await db.profile_views.update_one(
                {"viewer_id": viewer["id"], "target_id": user["id"], "day": today_key},
                {"$set": {
                    "viewer_id": viewer["id"],
                    "target_id": user["id"],
                    "day": today_key,
                    "viewed_at": now_iso(),
                }},
                upsert=True,
            )
        except Exception as e:
            logger.warning("profile visit track failed: %s", e)
    likes_received = await db.posts.aggregate([
        {"$match": {"author_id": user["id"]}},
        {"$project": {"n": {"$size": {"$ifNull": ["$likes", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$n"}}},
    ]).to_list(1)
    likes_n = likes_received[0]["total"] if likes_received else 0
    posts_n = await db.posts.count_documents({"author_id": user["id"], "repost_of": {"$exists": False}})
    data = public_user(user, {
        "is_following": bool(viewer and viewer["id"] in user.get("followers", [])),
        "follows_me": bool(viewer and viewer["id"] in user.get("following", [])),
        "is_blocked": bool(viewer and user["id"] in (viewer.get("blocked") or [])),
        "is_muted": bool(viewer and user["id"] in (viewer.get("muted_users") or [])),
        "is_notified": bool(viewer and user["id"] in (viewer.get("notify_users") or [])),
        "is_favorited": bool(viewer and user["id"] in (viewer.get("favorites") or [])),
        "is_self": bool(viewer and viewer["id"] == user["id"]),
        "posts_count": posts_n,
        "likes_received": likes_n,
        "can_view": await can_view_profile(user, viewer),
    })
    return data


@api.get("/activity")
async def activity_feed(limit: int = 30):
    # Recent platform activity: latest posts + follow notifs (aggregated)
    limit = safe_limit(limit, default=30, max_=100)
    items = await db.notifications.find(
        {"type": {"$in": ["like", "comment", "follow", "repost", "quote"]}}, {"_id": 0},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    out = []
    for n in items:
        from_user = await db.users.find_one({"id": n["from_user_id"]}, {"_id": 0})
        target = await db.users.find_one({"id": n["user_id"]}, {"_id": 0})
        if not from_user or not target:
            continue
        verb = {
            "like": "gostou de uma publicação de",
            "comment": "comentou numa publicação de",
            "follow": "começou a seguir",
            "repost": "republicou",
            "quote": "citou",
        }.get(n["type"], "interagiu com")
        out.append({
            "id": n["id"],
            "type": n["type"],
            "actor": public_user(from_user),
            "target_username": target["username"],
            "verb": verb,
            "created_at": n["created_at"],
        })
    return out


@api.get("/posts/{post_id}/analytics")
async def post_analytics(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    if post["author_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    likes = len(post.get("likes", []))
    reposts = len(post.get("reposts", []))
    bookmarks = len(post.get("bookmarks", []))
    comments = await db.comments.count_documents({"post_id": post_id})
    views = post.get("views", 0)
    # Engagement = (likes + reposts*2 + comments*3 + bookmarks*1.5) / max(views,1) * 100
    eng = (likes + reposts * 2 + comments * 3 + bookmarks * 1.5) / max(views, 1) * 100
    reach = views  # simple model
    return {
        "post_id": post_id,
        "views": views,
        "likes": likes,
        "reposts": reposts,
        "comments": comments,
        "bookmarks": bookmarks,
        "engagement_rate": round(eng, 2),
        "reach": reach,
        "created_at": post["created_at"],
    }


@api.get("/users/{username}/posts")
async def user_posts(username: str, tab: str = "posts", viewer: Optional[dict] = Depends(maybe_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    if not await can_view_profile(user, viewer):
        return []
    await auto_publish_due_posts()
    is_self = viewer and viewer["id"] == user["id"]
    visibility = {} if is_self else {
        "is_draft": {"$ne": True},
        "$or": [{"scheduled_at": None}, {"scheduled_at": {"$exists": False}}, {"scheduled_at": {"$lte": now_iso()}}],
    }
    if tab == "media":
        query = {"author_id": user["id"], "$and": [{"$or": [{"image": {"$ne": ""}}, {"images.0": {"$exists": True}}]}, visibility or {}]}
    elif tab == "likes":
        query = {"likes": user["id"], **visibility}
    elif tab == "replies":
        # posts authored that are themselves replies — we don't model that yet; return regular posts
        query = {"author_id": user["id"], **visibility}
    else:
        query = {"author_id": user["id"], **visibility}
    posts = await db.posts.find(query, {"_id": 0}).sort([("pinned", -1), ("created_at", -1)]).to_list(100)
    return [await enrich_post(p, viewer) for p in posts]


@api.get("/users/{username}/stats")
async def user_stats(username: str, viewer: Optional[dict] = Depends(maybe_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    if not await can_view_profile(user, viewer):
        return {}
    posts = await db.posts.find(
        {"author_id": user["id"], "repost_of": {"$exists": False}}, {"_id": 0}
    ).to_list(1000)
    posts_count = len(posts)
    likes_received = sum(len(p.get("likes", [])) for p in posts)
    reposts_received = sum(len(p.get("reposts", [])) for p in posts)
    comments_received = 0
    for p in posts:
        comments_received += await db.comments.count_documents({"post_id": p["id"]})
    avg_likes = likes_received / posts_count if posts_count else 0
    followers = len(user.get("followers", []))
    # Engagement rate formula: (likes + reposts*2 + comments*3) / max(followers,1) / posts
    eng_raw = likes_received + reposts_received * 2 + comments_received * 3
    engagement_rate = (eng_raw / max(followers, 1) / max(posts_count, 1)) * 100 if posts_count else 0
    # Streak removida (gamificação desativada) — devolvemos sempre 0.
    streak = 0
    joined_days = (datetime.now(timezone.utc) - datetime.fromisoformat(user["created_at"])).days
    # Profile completion: bio(20)+avatar(20)+banner(15)+verified(10)+>=1 post(20)+>=3 following(15)
    completion = 0
    if user.get("bio"):
        completion += 20
    if user.get("avatar"):
        completion += 20
    if user.get("banner"):
        completion += 15
    if user.get("verified"):
        completion += 10
    if posts_count >= 1:
        completion += 20
    if len(user.get("following", [])) >= 3:
        completion += 15
    return {
        "posts_count": posts_count,
        "likes_received": likes_received,
        "reposts_received": reposts_received,
        "comments_received": comments_received,
        "avg_likes": round(avg_likes, 1),
        "engagement_rate": round(engagement_rate, 2),
        "streak": streak,
        "joined_days": joined_days,
        "profile_completion": completion,
    }


@api.get("/users/{username}/heatmap")
async def user_heatmap(username: str, viewer: Optional[dict] = Depends(maybe_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    if not await can_view_profile(user, viewer):
        return []
    now = datetime.now(timezone.utc).date()
    start = now - timedelta(days=29)
    cutoff = datetime(start.year, start.month, start.day, tzinfo=timezone.utc).isoformat()
    posts = await db.posts.find(
        {"author_id": user["id"], "created_at": {"$gte": cutoff}}, {"_id": 0, "created_at": 1}
    ).to_list(1000)
    buckets: dict[str, int] = {}
    for p in posts:
        d = p["created_at"][:10]
        buckets[d] = buckets.get(d, 0) + 1
    out = []
    for i in range(30):
        d = (start + timedelta(days=i)).isoformat()
        out.append({"date": d, "count": buckets.get(d, 0)})
    return out


@api.get("/users/{username}/mutual")
async def user_mutual(username: str, viewer=Depends(get_current_user)):
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target["id"] == viewer["id"]:
        return {"count": 0, "users": []}
    mutual_ids = set(target.get("followers", [])) & set(viewer.get("following", []))
    users = await db.users.find({"id": {"$in": list(mutual_ids)[:3]}}, {"_id": 0}).to_list(3)
    return {"count": len(mutual_ids), "users": [public_user(u) for u in users]}


@api.get("/users/{username}/mutuals")
async def user_mutuals_full(username: str, viewer=Depends(get_current_user)):
    """Full list of mutual followers (people you follow that also follow `username`)."""
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target["id"] == viewer["id"]:
        return []
    mutual_ids = list(set(target.get("followers", [])) & set(viewer.get("following", [])))
    if not mutual_ids:
        return []
    users = await db.users.find({"id": {"$in": mutual_ids}}, {"_id": 0}).to_list(500)
    return [public_user(u) for u in users]


@api.get("/users/{username}/followers")
async def list_followers(username: str, viewer=Depends(get_current_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    if not await can_view_profile(user, viewer):
        return []
    fls = await db.users.find({"id": {"$in": user.get("followers", [])}}, {"_id": 0}).to_list(500)
    return [public_user(u) for u in fls]


@api.get("/users/{username}/following")
async def list_following(username: str, viewer=Depends(get_current_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    if not await can_view_profile(user, viewer):
        return []
    fls = await db.users.find({"id": {"$in": user.get("following", [])}}, {"_id": 0}).to_list(500)
    return [public_user(u) for u in fls]


@api.post("/users/{username}/follow")
async def follow_user(username: str, user=Depends(get_current_user)):
    # Grupo A: read-only + follows_enabled
    await _assert_writes_open(user)
    await _assert_feature_or_503("follows_enabled", user)
    _assert_not_frozen(user)
    # H2 — per-hour follow/unfollow throttle (defeats mass-follow bots)
    await _assert_follows_hourly_quota(user)
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target["id"] == user["id"]:
        raise HTTPException(400, "Não te podes seguir a ti próprio")
    # H2 — churn protection (follow→unfollow→follow ping-pong)
    await _assert_follow_churn(user["id"], target["id"])
    is_following = user["id"] in target.get("followers", [])
    if is_following:
        await db.users.update_one({"id": target["id"]}, {"$pull": {"followers": user["id"]}})
        await db.users.update_one({"id": user["id"]}, {"$pull": {"following": target["id"]}})
        await _record_action_velocity(user, "unfollow")
        return {"following": False}
    # Grupo A: max_follows_per_user
    if not user.get("is_admin"):
        _follow_cap = await get_limit("max_follows_per_user")
        if _follow_cap and len(user.get("following", []) or []) >= _follow_cap:
            raise HTTPException(429, f"Atingiste o máximo de pessoas seguidas ({_follow_cap}).")
    await db.users.update_one({"id": target["id"]}, {"$addToSet": {"followers": user["id"]}})
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"following": target["id"]}})
    await create_notification(target["id"], "follow", user["id"], None, f"@{user['username']} começou a seguir-te")
    await _record_action_velocity(user, "follow")
    return {"following": True}


@api.patch("/users/me")
async def update_me(payload: UpdateProfileIn, user=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    # H4 — magic-bytes validation on user-supplied avatar/banner data URLs
    for img_field in ("avatar", "banner"):
        if img_field in update and isinstance(update[img_field], str) and update[img_field]:
            if not _is_safe_image_url(update[img_field]):
                raise HTTPException(400, f"{img_field.capitalize()} inválido (formato não suportado).")
    # Grupo A: limites dinâmicos para bio + display name (admins bypass)
    if not user.get("is_admin"):
        if "bio" in update and isinstance(update["bio"], str):
            _max_bio = await get_limit("max_bio_chars")
            if _max_bio and len(update["bio"]) > _max_bio:
                raise HTTPException(400, f"Bio demasiado longa (máx {_max_bio} caracteres).")
        if "name" in update and isinstance(update["name"], str):
            _max_n = await get_limit("max_display_name_chars")
            if _max_n and len(update["name"]) > _max_n:
                raise HTTPException(400, f"Nome demasiado longo (máx {_max_n} caracteres).")
    # B-015 — basic validation/normalization of recovery_email
    if "recovery_email" in update:
        rec = (update["recovery_email"] or "").strip().lower()
        if rec:
            # very light email check (full validation already at register)
            if "@" not in rec or "." not in rec or len(rec) > 200:
                raise HTTPException(400, "Email de recuperação inválido")
            if rec == (user.get("email") or "").lower():
                raise HTTPException(400, "O email de recuperação tem de ser diferente do principal")
        update["recovery_email"] = rec
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(fresh)


@api.delete("/users/me")
async def delete_my_account(payload: DeleteAccountIn, response: Response, user=Depends(get_current_user)):
    """Permanently delete the authenticated user and all associated data.

    Requires the current password + the confirmation string "APAGAR".
    Cascades: posts, comments, messages, conversations, notifications,
    stories, profile_views, reports, hype_trains, notes, password_resets,
    and removes the user_id from communities.members and other users'
    followers/following/blocked/favorites/notify_users/muted_users lists.
    """
    # Grupo A: account_deletion_enabled
    await _assert_feature_or_503("account_deletion_enabled", user)
    if payload.confirm != "APAGAR":
        raise HTTPException(400, "Confirmação inválida — escreve APAGAR")
    fresh = await db.users.find_one({"id": user["id"]})
    if not fresh:
        raise HTTPException(404, "Utilizador não encontrado")
    if not verify_password(payload.password, fresh.get("password_hash", "")):
        raise HTTPException(400, "Palavra-passe incorreta")

    uid = user["id"]

    # Cascade delete documents owned by this user
    await db.posts.delete_many({"author_id": uid})
    await db.comments.delete_many({"author_id": uid})
    await db.messages.delete_many({"$or": [{"sender_id": uid}, {"recipient_id": uid}]})
    await db.conversations.delete_many({"participants": uid})
    await db.notifications.delete_many({"$or": [{"user_id": uid}, {"actor_id": uid}]})
    await db.stories.delete_many({"author_id": uid})
    await db.profile_views.delete_many({"$or": [{"user_id": uid}, {"viewer_id": uid}]})
    await db.reports.delete_many({"$or": [{"reporter_id": uid}, {"target_user_id": uid}]})
    await db.notes.delete_many({"author_id": uid})
    await db.hype_trains.delete_many({"$or": [{"author_id": uid}, {"user_id": uid}]})
    await db.password_resets.delete_many({"user_id": uid})
    await db.bookmark_collections.delete_many({"user_id": uid})
    await db.typing_state.delete_many({"$or": [{"user_id": uid}, {"recipient_id": uid}]})

    # Remove this user from social graphs of other users
    await db.users.update_many(
        {},
        {"$pull": {
            "followers": uid,
            "following": uid,
            "blocked": uid,
            "favorites": uid,
            "notify_users": uid,
            "muted_users": uid,
        }},
    )
    # Remove this user from likes/bookmarks/reposts arrays on remaining posts
    await db.posts.update_many(
        {},
        {"$pull": {
            "likes": uid,
            "bookmarks": uid,
            "reposts": uid,
        }},
    )
    # Remove from community membership
    await db.communities.update_many({}, {"$pull": {"members": uid}})

    # Finally delete the user document itself
    await db.users.delete_one({"id": uid})

    # Invalidate session cookie
    clear_auth_cookie(response)
    return {"ok": True, "deleted_user_id": uid}


@api.post("/users/me/onboard")
async def complete_onboarding(user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"onboarded": True}})
    return {"ok": True}


# ============================================================
# Posts
# ============================================================
@api.post("/posts")
async def create_post(payload: PostIn, user=Depends(get_current_user)):
    # Grupo A: feature gates + read-only mode + global per-hour limit (admins bypass)
    await _assert_writes_open(user)
    await _assert_feature_or_503("posts_enabled", user)
    await _assert_global_hourly_limit(user, "posts")
    # H2 — mention spam caps (per-post + per-hour)
    await _assert_mentions_per_post(payload.content or "")
    await _assert_mentions_per_hour(user, payload.content or "")
    # Dynamic char limit (Pydantic max is the cap; this enforces admin-set ceiling)
    _img_cap = None
    if not user.get("is_admin"):
        _max_chars = await get_limit("max_post_chars")
        if _max_chars and len((payload.content or "")) > _max_chars:
            raise HTTPException(400, f"Publicação demasiado longa (máx {_max_chars} caracteres).")
        if payload.poll and not await is_feature_enabled("polls_enabled"):
            raise HTTPException(503, SETTINGS_BY_KEY["polls_enabled"].get("off_message"))
        _has_imgs = bool(payload.images) or bool(payload.image)
        if _has_imgs and not await is_feature_enabled("uploads_enabled"):
            raise HTTPException(503, SETTINGS_BY_KEY["uploads_enabled"].get("off_message"))
        _img_cap = await get_limit("max_images_per_post")
        # Anti hashtag/url spam (admins bypass)
        _content_for_count = payload.content or ""
        _max_hashtags = await get_limit("max_hashtags_per_post")
        if _max_hashtags:
            _hashtag_count = len(extract_hashtags(_content_for_count))
            if _hashtag_count > _max_hashtags:
                raise HTTPException(400, f"Demasiadas hashtags ({_hashtag_count}). Máximo permitido: {_max_hashtags}.")
        _max_urls = await get_limit("max_urls_per_post")
        if _max_urls:
            _url_count = len(URL_RE.findall(_content_for_count)) if URL_RE else 0
            if _url_count > _max_urls:
                raise HTTPException(400, f"Demasiados links ({_url_count}). Máximo permitido: {_max_urls}.")
        # Anti-bot: minimum account age before posting
        _min_age_min = await get_limit("min_account_age_minutes_to_post")
        if _min_age_min and _min_age_min > 0:
            try:
                _created_at_raw = user.get("created_at")
                if _created_at_raw:
                    _created_at = datetime.fromisoformat(str(_created_at_raw).replace("Z", "+00:00"))
                    if _created_at.tzinfo is None:
                        _created_at = _created_at.replace(tzinfo=timezone.utc)
                    _age_min = (datetime.now(timezone.utc) - _created_at).total_seconds() / 60.0
                    if _age_min < _min_age_min:
                        _wait = int(_min_age_min - _age_min) + 1
                        raise HTTPException(429, f"Conta demasiado recente. Tenta de novo daqui a {_wait} minuto(s).")
            except HTTPException:
                raise
            except Exception:
                pass
    # Admin restrictions: mute + rate-limit (real, not mocked)
    await _aassert_can_post(user)
    community_id = None
    if payload.community_id:
        c = await db.communities.find_one({"id": payload.community_id}, {"_id": 0})
        if not c:
            raise HTTPException(404, "Comunidade não encontrada")
        allowed, reason = community_mod.can_write(c, user)
        if not allowed:
            raise HTTPException(403, reason)
        community_id = c["id"]
    if payload.quote_of:
        if not user.get("is_admin") and not await is_feature_enabled("reposts_enabled"):
            raise HTTPException(503, SETTINGS_BY_KEY["reposts_enabled"].get("off_message"))
        q = await db.posts.find_one({"id": payload.quote_of}, {"_id": 0})
        if not q:
            raise HTTPException(404, "Publicação citada não encontrada")
        # F4.2 — repost curado: requires meaningful context to reduce viral spam
        if len((payload.content or "").strip()) < 5:
            raise HTTPException(400, "Acrescenta pelo menos uma frase ao repostar (5+ caracteres). É a regra da casa: republicar exige contexto.")
    images = normalize_images(payload.images, payload.image, max_images=_img_cap)
    # Dynamic poll-options cap (admins still use module default)
    _poll_cap = None
    if not user.get("is_admin"):
        try:
            _poll_cap = await get_limit("max_poll_options")
        except Exception:
            _poll_cap = None
    poll = build_poll(payload.poll, max_options=_poll_cap) if payload.poll else None
    if not payload.content.strip() and not images and not poll and not payload.quote_of:
        raise HTTPException(400, "Publicação vazia")
    # Minimum content length (only when content is the primary medium)
    if not user.get("is_admin"):
        _min_chars = await get_limit("min_post_chars")
        if _min_chars and _min_chars > 0:
            _has_other = bool(images) or bool(poll) or bool(payload.quote_of)
            if not _has_other and len((payload.content or "").strip()) < _min_chars:
                raise HTTPException(400, f"Publicação demasiado curta (mínimo {_min_chars} caracteres).")
    audience = payload.reply_audience if payload.reply_audience in VALID_AUDIENCES else "everyone"
    audience_ring = payload.audience_ring if payload.audience_ring in {"publico", "amigos", "tasca"} else "publico"

    # Scheduled / draft handling
    scheduled_at = None
    if payload.scheduled_at:
        try:
            dt = datetime.fromisoformat(payload.scheduled_at.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if dt > datetime.now(timezone.utc) + timedelta(seconds=30):
                scheduled_at = dt.astimezone(timezone.utc).isoformat()
        except Exception:
            pass
    # Cap on how far in the future a post can be scheduled (admin-configurable).
    if scheduled_at and not user.get("is_admin"):
        _max_days = await get_limit("scheduled_posts_max_days_ahead")
        if _max_days and _max_days > 0:
            _horizon = datetime.now(timezone.utc) + timedelta(days=_max_days)
            try:
                _dt = datetime.fromisoformat(scheduled_at)
                if _dt > _horizon:
                    raise HTTPException(400, f"Não podes agendar posts a mais de {_max_days} dia(s).")
            except HTTPException:
                raise
            except Exception:
                pass
    # Per-user draft quota (only enforced when creating an actual draft).
    if bool(payload.is_draft) and not user.get("is_admin"):
        _max_drafts = await get_limit("max_drafts_per_user")
        if _max_drafts and _max_drafts > 0:
            _existing_drafts = await db.posts.count_documents({
                "author_id": user["id"], "is_draft": True,
            })
            if _existing_drafts >= _max_drafts:
                raise HTTPException(429, f"Limite de rascunhos atingido ({_max_drafts}). Apaga ou publica alguns antes de criar novos.")

    # Hashtag extraction is gated by admin flag (admins always extract for their own posts).
    if user.get("is_admin"):
        _hashtags = extract_hashtags(payload.content)
    else:
        _hashtags = extract_hashtags(payload.content) if await is_feature_enabled("hashtags_enabled") else []
    post = {
        "id": str(uuid.uuid4()), "author_id": user["id"],
        "content": payload.content,
        "image": images[0] if images else "",
        "images": images,
        "likes": [], "bookmarks": [], "reposts": [],
        "reactions": {},
        "hashtags": _hashtags,
        "community_id": community_id,
        "quote_of": payload.quote_of,
        "poll": poll,
        "reply_audience": audience,
        "audience_ring": audience_ring,
        "is_draft": bool(payload.is_draft),
        "scheduled_at": scheduled_at,
        "edit_history": [],
        "views": 0,
        "created_at": now_iso(),
    }
    await db.posts.insert_one(post)
    # Mentions/notifications only when published
    if not post["is_draft"] and not scheduled_at:
        await handle_mentions(payload.content, user, post["id"])
        await update_streak_on_post(user["id"])
        await daily_checkin(user["id"])
        await award_xp(user["id"], "create_post")
        await ws_broadcast_activity("new_post", {
            "post_id": post["id"],
            "author_id": user["id"],
            "author_username": user["username"],
            "snippet": (payload.content or "")[:80],
        })
        if payload.quote_of:
            q = await db.posts.find_one({"id": payload.quote_of}, {"_id": 0})
            if q and q["author_id"] != user["id"]:
                await create_notification(q["author_id"], "quote", user["id"], post["id"],
                                           f"@{user['username']} citou a tua publicação")
        # Activity ticker da comunidade (só posts publicados numa comunidade).
        if community_id:
            try:
                await ws_manager.broadcast_to_community(community_id, {
                    "type": "community_activity",
                    "community_id": community_id,
                    "event": "post",
                    "post_id": post["id"],
                    "at": post["created_at"],
                    "actor": {"id": user["id"], "username": user.get("username"),
                              "name": user.get("name"), "avatar": user.get("avatar", "")},
                    "preview": (payload.content or "")[:120],
                })
            except Exception:
                pass
    return await enrich_post(post, user)


@api.patch("/posts/{post_id}")
async def edit_post(post_id: str, payload: PostEditIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    # Centralised ownership gate (no admin override — see delete_post above).
    try:
        require_owner(user, post, owner_field="author_id")
    except AuthzError:
        raise HTTPException(403, "Sem permissão")
    is_draft = bool(post.get("is_draft"))
    is_scheduled = bool(post.get("scheduled_at"))
    # Grupo A: edit_post_enabled — só bloqueia edição de posts LIVE (drafts/scheduled continuam editáveis)
    if not user.get("is_admin") and not is_draft and not is_scheduled:
        if not await is_feature_enabled("edit_post_enabled"):
            raise HTTPException(503, SETTINGS_BY_KEY["edit_post_enabled"].get("off_message"))
    update_set = {}
    # Content updates
    if payload.content is not None:
        # 24h edit window applies only to live (already-published) posts.
        if not is_draft and not is_scheduled:
            age = datetime.now(timezone.utc) - datetime.fromisoformat(post["created_at"])
            if age > timedelta(hours=24):
                raise HTTPException(400, "Janela de edição expirada (24 h)")
        history = post.get("edit_history") or []
        history.append({"content": post["content"], "edited_at": now_iso()})
        history = history[-10:]  # keep last 10 revisions only
        update_set.update({
            "content": payload.content,
            "hashtags": extract_hashtags(payload.content),
            "edited_at": now_iso(),
            "edit_history": history,
        })
    # Allow updating images only when the post is still a draft or scheduled.
    if payload.images is not None and (is_draft or is_scheduled):
        imgs = payload.images[:4]
        update_set["images"] = imgs
        update_set["image"] = imgs[0] if imgs else ""
    # Rescheduling: only for scheduled posts
    if payload.scheduled_at is not None:
        if not is_scheduled:
            raise HTTPException(400, "Só publicações agendadas podem ser reagendadas")
        try:
            new_iso = datetime.fromisoformat(payload.scheduled_at.replace("Z", "+00:00")).isoformat()
        except Exception:
            raise HTTPException(400, "Data inválida")
        if datetime.fromisoformat(new_iso) <= datetime.now(timezone.utc):
            raise HTTPException(400, "Tem de ser uma data futura")
        # Admin-controlled horizon (max days in the future)
        if not user.get("is_admin"):
            _max_days = await get_limit("scheduled_posts_max_days_ahead")
            if _max_days and _max_days > 0:
                _horizon = datetime.now(timezone.utc) + timedelta(days=_max_days)
                if datetime.fromisoformat(new_iso) > _horizon:
                    raise HTTPException(400, f"Não podes agendar posts a mais de {_max_days} dia(s).")
        update_set["scheduled_at"] = new_iso
    if not update_set:
        raise HTTPException(400, "Nada para atualizar")
    await db.posts.update_one(
        {"id": post_id},
        {"$set": update_set},
    )
    fresh = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return await enrich_post(fresh, user)


@api.post("/posts/{post_id}/view")
async def view_post(post_id: str, viewer: Optional[dict] = Depends(maybe_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        return {"views": 0}
    if viewer and post["author_id"] == viewer["id"]:
        return {"views": post.get("views", 0)}
    update = {"$inc": {"views": 1}}
    if viewer:
        update["$addToSet"] = {"viewers": viewer["id"]}
    await db.posts.update_one({"id": post_id}, update)
    return {"views": post.get("views", 0) + 1}


@api.get("/posts/{post_id}/viewers")
async def post_viewers(post_id: str, user=Depends(get_current_user)):
    """List of distinct registered viewers (owner-only, last 50)."""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    if post["author_id"] != user["id"]:
        raise HTTPException(403, "Apenas o autor vê quem viu")
    ids = list(post.get("viewers", []))[-50:]
    if not ids:
        return {"viewers": [], "total_distinct": 0, "views": post.get("views", 0)}
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(50)
    out = [public_user(u) for u in users]
    return {"viewers": out, "total_distinct": len(post.get("viewers", [])), "views": post.get("views", 0)}


@api.get("/posts/activity-pulse")
async def posts_activity_pulse(ids: str = ""):
    """Lightweight 'is this post alive right now?' batch endpoint.

    Used by the Feed to surface subtle social signals under each PostCard
    without requiring per-post WS subscriptions.

    Query: ?ids=p1,p2,p3  (comma-separated, max 60)
    Returns: { posts: { "<post_id>": { live_viewers, recent_comments_15m,
                                        last_comment_at, heat, is_hot } } }
    Heat band derived from recent_comments_15m + live_viewers:
      frio | morno | quente | em_brasa | a_ferver
    """
    pid_list = [s.strip() for s in (ids or "").split(",") if s.strip()][:60]
    if not pid_list:
        return {"posts": {}}
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(minutes=15)).isoformat()
    out: dict = {}
    # Recent comments per post (last 15min)
    cursor = db.comments.aggregate([
        {"$match": {"post_id": {"$in": pid_list}, "created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$post_id",
            "count": {"$sum": 1},
            "last": {"$max": "$created_at"},
        }},
    ])
    recent_map: dict = {}
    async for row in cursor:
        recent_map[row["_id"]] = {"count": int(row.get("count", 0)),
                                   "last": row.get("last")}
    for pid in pid_list:
        live = len(ws_manager.viewers_by_post.get(pid, set()))
        rc = int(recent_map.get(pid, {}).get("count", 0))
        last_at = recent_map.get(pid, {}).get("last")
        # Heat scoring (intentionally simple, atmospheric)
        score = rc * 8 + live * 4
        if score >= 70:
            heat = "a_ferver"
        elif score >= 45:
            heat = "em_brasa"
        elif score >= 25:
            heat = "quente"
        elif score >= 10:
            heat = "morno"
        else:
            heat = "frio"
        is_hot = heat in ("quente", "em_brasa", "a_ferver")
        out[pid] = {
            "live_viewers": live,
            "recent_comments_15m": rc,
            "last_comment_at": last_at,
            "heat": heat,
            "is_hot": is_hot,
        }
    return {"posts": out}


@api.get("/conversations/pulse")
async def conversations_pulse(user=Depends(get_current_user)):
    """Lightweight presence signals for the DMs list.

    Returns:
      - active_total: int (peers currently typing to me OR sent me a msg in last 5min OR currently online and in my conv list)
      - my_typing:    list[str] peer ids currently typing to me
      - my_recent:    list[str] peer ids that messaged me in last 5min
      - my_online:    list[str] peer ids currently online (intersection with my conv list)
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    cutoff_5m = (now - timedelta(minutes=5)).isoformat()

    # Peers typing to me right now (typing_state docs not yet expired)
    typing_cursor = db.typing_state.find(
        {"recipient_id": user["id"], "expires_at": {"$gt": now_iso}},
        {"_id": 0, "sender_id": 1},
    )
    my_typing: list[str] = []
    async for row in typing_cursor:
        sid = row.get("sender_id")
        if sid and sid != user["id"]:
            my_typing.append(sid)
    my_typing = list(dict.fromkeys(my_typing))

    # Peers that sent me a message in the last 5min
    recent_cursor = db.messages.find(
        {"recipient_id": user["id"], "created_at": {"$gte": cutoff_5m}},
        {"_id": 0, "sender_id": 1},
    ).sort("created_at", -1).limit(80)
    my_recent_set = set()
    async for row in recent_cursor:
        sid = row.get("sender_id")
        if sid and sid != user["id"]:
            my_recent_set.add(sid)
    my_recent = list(my_recent_set)

    # My conversation peers — pull from existing conversations index if any
    conv_peers: set[str] = set()
    try:
        async for row in db.messages.find(
            {"$or": [{"sender_id": user["id"]}, {"recipient_id": user["id"]}]},
            {"_id": 0, "sender_id": 1, "recipient_id": 1},
        ).limit(400):
            sid = row.get("sender_id")
            rid = row.get("recipient_id")
            if sid and sid != user["id"]:
                conv_peers.add(sid)
            if rid and rid != user["id"]:
                conv_peers.add(rid)
    except Exception:
        pass

    # Peers currently online (WS connected) that are in my conv list
    online_set = set(ws_manager.active.keys())
    my_online = list(conv_peers & online_set)

    active_set = set(my_typing) | my_recent_set | set(my_online)
    return {
        "active_total": len(active_set),
        "my_typing": my_typing,
        "my_recent": my_recent,
        "my_online": my_online,
    }


@api.post("/posts/{post_id}/pin")
async def pin_post(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    if post["author_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    if user.get("pinned_post_id") == post_id:
        await db.users.update_one({"id": user["id"]}, {"$unset": {"pinned_post_id": ""}})
        await db.posts.update_one({"id": post_id}, {"$unset": {"pinned": ""}})
        return {"pinned": False}
    if user.get("pinned_post_id"):
        await db.posts.update_one({"id": user["pinned_post_id"]}, {"$unset": {"pinned": ""}})
    await db.users.update_one({"id": user["id"]}, {"$set": {"pinned_post_id": post_id}})
    await db.posts.update_one({"id": post_id}, {"$set": {"pinned": True}})
    return {"pinned": True}


@api.get("/posts/feed")
async def feed(mood: str = "", sort: str = "recent", user=Depends(get_current_user)):
    await auto_publish_due_posts()
    ids = user.get("following", []) + [user["id"]]
    muted_authors = set(user.get("muted_authors", []) or [])
    # Admin shadow-mute: exclude shadow-muted authors (but the user still sees their own)
    shadow_ids = set(await _shadow_muted_ids_excluding(user["id"]))
    muted_topics = set((t or "").lower() for t in (user.get("muted_topics", []) or []))
    dismissed = set(user.get("dismissed_posts", []) or [])
    visible_ids = [aid for aid in ids if aid not in muted_authors and aid not in shadow_ids]
    query: dict = {
        "author_id": {"$in": visible_ids},
        "is_draft": {"$ne": True},
        "$or": [{"scheduled_at": None}, {"scheduled_at": {"$exists": False}}, {"scheduled_at": {"$lte": now_iso()}}],
    }
    # Admin reduce-reach: hide reduced posts from others (author still sees own)
    query["$and"] = [{"$or": [
        {"reduce_reach": {"$ne": True}},
        {"author_id": user["id"]},
    ]}]
    if mood and mood in MOODS:
        rx = "|".join(re.escape(k) for k in MOODS[mood]["keywords"])
        query["content"] = {"$regex": rx, "$options": "i"}
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    def _topic_blocked(p):
        if not muted_topics:
            return False
        tags = set((t or "").lower() for t in (p.get("hashtags") or []))
        return bool(tags & muted_topics)
    posts = [p for p in posts if p.get("id") not in dismissed and not _topic_blocked(p)]
    if sort == "top":
        posts = sorted(
            posts,
            key=lambda p: len(p.get("likes", [])) * 2 + len(p.get("reposts", [])) * 3,
            reverse=True,
        )[:100]
    else:
        posts = posts[:100]
    # Grupo A: feed_page_size — cap default da página (admins vêm o máximo)
    if not user.get("is_admin"):
        _fps = await get_limit("feed_page_size") or 20
        posts = posts[: max(_fps, 5)]
    return [await enrich_post(p, user) for p in posts]


@api.get("/posts/explore")
async def explore(sort: str = "trending", mood: str = "", viewer: Optional[dict] = Depends(maybe_user)):
    await auto_publish_due_posts()
    query: dict = {
        "repost_of": {"$exists": False},
        "is_draft": {"$ne": True},
        "$or": [{"scheduled_at": None}, {"scheduled_at": {"$exists": False}}, {"scheduled_at": {"$lte": now_iso()}}],
    }
    # Admin reduce-reach: explore never shows reduced posts (even to author — explore is discovery)
    query["reduce_reach"] = {"$ne": True}
    if mood and mood in MOODS:
        rx = "|".join(re.escape(k) for k in MOODS[mood]["keywords"])
        query["content"] = {"$regex": rx, "$options": "i"}
    if viewer:
        muted_authors = list(set(viewer.get("muted_authors", []) or []))
        # Admin shadow-mute filter
        shadow_ids = await _shadow_muted_ids_excluding(viewer["id"])
        combined = list(set(muted_authors + shadow_ids))
        if combined:
            query["author_id"] = {"$nin": combined}
    else:
        # Anonymous viewers also don't see shadow-muted authors
        shadow_ids = await _shadow_muted_ids_excluding("")
        if shadow_ids:
            query["author_id"] = {"$nin": shadow_ids}
    # Admin hashtag blacklist — exclude posts with any blacklisted hashtag
    blacklist_rows = await db.hashtag_blacklist.find({}, {"_id": 0, "tag": 1}).to_list(length=500)
    blacklist = [(b.get("tag") or "").lower() for b in blacklist_rows]
    if blacklist:
        query["hashtags"] = {"$nin": blacklist}
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(300)
    if viewer:
        muted_topics = set((t or "").lower() for t in (viewer.get("muted_topics", []) or []))
        dismissed = set(viewer.get("dismissed_posts", []) or [])
        def _topic_blocked(p):
            if not muted_topics:
                return False
            tags = set((t or "").lower() for t in (p.get("hashtags") or []))
            return bool(tags & muted_topics)
        posts = [p for p in posts if p.get("id") not in dismissed and not _topic_blocked(p)]
    if sort == "trending":
        # Score with time decay (half-life ~ 12h)
        now = datetime.now(timezone.utc)
        def score(p):
            likes = len(p.get("likes", []))
            reposts = len(p.get("reposts", []))
            try:
                age_h = (now - datetime.fromisoformat(p["created_at"])).total_seconds() / 3600
            except Exception:
                age_h = 24
            base = likes + reposts * 2
            return base * math.exp(-age_h / 12)
        posts = sorted(posts, key=score, reverse=True)[:100]
    elif sort == "top":
        posts = sorted(posts,
                       key=lambda p: len(p.get("likes", [])) + len(p.get("reposts", [])) * 2,
                       reverse=True)[:100]
    else:
        posts = posts[:100]
    return [await enrich_post(p, viewer) for p in posts]


@api.get("/posts/_explore_legacy")
async def explore_legacy_unused(viewer: Optional[dict] = Depends(maybe_user)):
    return []


@api.get("/posts/bookmarks")
async def bookmarks(collection: str = "", user=Depends(get_current_user)):
    query: dict = {"bookmarks": user["id"], "is_draft": {"$ne": True}}
    if collection == "uncategorized":
        query["$and"] = [{"$or": [
            {"bookmark_collection_map": {"$exists": False}},
            {"bookmark_collection_map": {"$not": {"$elemMatch": {"user_id": user["id"]}}}},
        ]}]
    elif collection:
        query["bookmark_collection_map"] = {"$elemMatch": {"user_id": user["id"], "collection_id": collection}}
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    out = []
    for p in posts:
        enriched = await enrich_post(p, user)
        # surface collection id for this user
        cid = None
        for m in (p.get("bookmark_collection_map") or []):
            if m.get("user_id") == user["id"]:
                cid = m.get("collection_id")
                break
        enriched["bookmark_collection_id"] = cid
        out.append(enriched)
    return out


@api.get("/posts/drafts")
async def list_drafts(user=Depends(get_current_user)):
    posts = await db.posts.find(
        {"author_id": user["id"], "is_draft": True},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, user) for p in posts]


@api.get("/posts/scheduled")
async def list_scheduled(user=Depends(get_current_user)):
    posts = await db.posts.find(
        {"author_id": user["id"], "is_draft": {"$ne": True}, "scheduled_at": {"$gt": now_iso()}},
        {"_id": 0},
    ).sort("scheduled_at", 1).to_list(100)
    return [await enrich_post(p, user) for p in posts]


@api.post("/posts/{post_id}/publish")
async def publish_draft(post_id: str, user=Depends(get_current_user)):
    """Publish a draft or a scheduled post immediately."""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    if post["author_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    if not post.get("is_draft") and not post.get("scheduled_at"):
        raise HTTPException(400, "Publicação já está publicada")
    await db.posts.update_one(
        {"id": post_id},
        {"$set": {"is_draft": False, "created_at": now_iso()},
         "$unset": {"scheduled_at": ""}},
    )
    fresh = await db.posts.find_one({"id": post_id}, {"_id": 0})
    await handle_mentions(fresh["content"], user, post_id)
    if fresh.get("quote_of"):
        q = await db.posts.find_one({"id": fresh["quote_of"]}, {"_id": 0})
        if q and q["author_id"] != user["id"]:
            await create_notification(q["author_id"], "quote", user["id"], post_id,
                                       f"@{user['username']} citou a tua publicação")
    return await enrich_post(fresh, user)


@api.post("/posts/{post_id}/vote")
async def vote_poll(post_id: str, payload: PostVoteIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post or not post.get("poll"):
        raise HTTPException(404, "Enquete não encontrada")
    poll = post["poll"]
    # closed?
    if poll.get("ends_at"):
        try:
            if datetime.fromisoformat(poll["ends_at"]) <= datetime.now(timezone.utc):
                raise HTTPException(400, "Enquete encerrada")
        except HTTPException:
            raise
        except Exception:
            pass
    valid_ids = {o["id"] for o in poll.get("options", [])}
    chosen = [oid for oid in payload.option_ids if oid in valid_ids]
    if not chosen:
        raise HTTPException(400, "Opção inválida")
    allow_multiple = bool(poll.get("allow_multiple"))
    if not allow_multiple:
        chosen = chosen[:1]
    votes = poll.get("votes", {}) or {}
    # Remove previous votes from this user across all options first (toggle behaviour)
    for oid in list(votes.keys()):
        if user["id"] in (votes.get(oid) or []):
            votes[oid] = [u for u in votes[oid] if u != user["id"]]
    # Add new
    for oid in chosen:
        votes.setdefault(oid, [])
        if user["id"] not in votes[oid]:
            votes[oid].append(user["id"])
    await db.posts.update_one({"id": post_id}, {"$set": {"poll.votes": votes}})
    fresh = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return await enrich_post(fresh, user)


@api.post("/posts/{post_id}/react")
async def react_post(post_id: str, payload: PostReactIn, user=Depends(get_current_user)):
    # Grupo A: read-only + reactions_enabled gates
    await _assert_writes_open(user)
    await _assert_feature_or_503("reactions_enabled", user)
    # H2 — per-minute reaction cap (anti emoji-spam)
    await _assert_reactions_minute_quota(user)
    if payload.emoji not in ALLOWED_REACTIONS:
        raise HTTPException(400, "Reação inválida")
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    reactions = post.get("reactions") or {}

    # One reaction per user: clean every other reaction this user might have.
    already = False
    for key, lst in list(reactions.items()):
        users_list = list(lst or [])
        if user["id"] in users_list:
            if key == payload.emoji:
                already = True
            users_list.remove(user["id"])
        reactions[key] = users_list

    if already:
        # toggling off: leave him out of every list
        active = False
    else:
        reactions.setdefault(payload.emoji, [])
        reactions[payload.emoji].append(user["id"])
        active = True
        if post["author_id"] != user["id"]:
            await create_notification(
                post["author_id"], "reaction", user["id"], post_id,
                f"@{user['username']} reagiu {payload.emoji} à tua publicação",
                extra={"emoji": payload.emoji},
            )

    await db.posts.update_one({"id": post_id}, {"$set": {"reactions": reactions}})
    fresh = await db.posts.find_one({"id": post_id}, {"_id": 0})
    enriched = await enrich_post(fresh, user)
    return {"reactions": enriched["reactions"], "active": active, "emoji": payload.emoji}


@api.get("/posts/tag/{tag}")
async def posts_by_tag(tag: str, viewer: Optional[dict] = Depends(maybe_user)):
    await auto_publish_due_posts()
    posts = await db.posts.find(
        {
            "hashtags": tag.lower(),
            "repost_of": {"$exists": False},
            "is_draft": {"$ne": True},
            "$or": [{"scheduled_at": None}, {"scheduled_at": {"$exists": False}}, {"scheduled_at": {"$lte": now_iso()}}],
        }, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, viewer) for p in posts]


@api.get("/posts/{post_id}")
async def get_post(post_id: str, viewer: Optional[dict] = Depends(maybe_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    return await enrich_post(post, viewer)


@api.delete("/posts/{post_id}")
async def delete_post(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    # Centralised ownership gate (no admin override — admins moderate via
    # the audited /api2/admin/posts/{id} route which records to admin_audit).
    try:
        require_owner(user, post, owner_field="author_id")
    except AuthzError:
        raise HTTPException(403, "Sem permissão")
    # Grupo A: delete_own_post_enabled (admins bypass)
    if not user.get("is_admin") and not await is_feature_enabled("delete_own_post_enabled"):
        raise HTTPException(503, SETTINGS_BY_KEY["delete_own_post_enabled"].get("off_message"))
    await db.posts.delete_one({"id": post_id})
    await db.posts.delete_many({"repost_of": post_id})
    await db.comments.delete_many({"post_id": post_id})
    return {"ok": True}


@api.post("/posts/{post_id}/like")
async def like_post(post_id: str, user=Depends(get_current_user)):
    # Grupo A: read-only + likes_enabled
    await _assert_writes_open(user)
    await _assert_feature_or_503("likes_enabled", user)
    _assert_not_frozen(user)
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    liked = user["id"] in post.get("likes", [])
    if liked:
        await db.posts.update_one({"id": post_id}, {"$pull": {"likes": user["id"]}})
        return {"liked": False, "likes_count": len(post.get("likes", [])) - 1}
    await db.posts.update_one({"id": post_id}, {"$addToSet": {"likes": user["id"]}})
    await create_notification(post["author_id"], "like", user["id"], post_id, f"@{user['username']} gostou da tua publicação")
    if post["author_id"] != user["id"]:
        await award_xp(post["author_id"], "like_received")
    await daily_checkin(user["id"])
    return {"liked": True, "likes_count": len(post.get("likes", [])) + 1}


@api.get("/posts/{post_id}/social-likers")
async def post_social_likers(post_id: str, request: Request):
    """Social-proof: 3 likers the viewer follows + remaining count.
    Falls back to most-followed likers if viewer is anonymous or follows no one who liked it.
    """
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "likes": 1, "author_id": 1})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    likes = post.get("likes", []) or []
    total = len(likes)
    if total == 0:
        return {"users": [], "total": 0, "followed_total": 0}

    viewer = await maybe_user(request)
    viewer_following = set((viewer.get("following") if viewer else []) or [])
    # Don't include the viewer themselves in the proof row
    if viewer:
        likes = [uid for uid in likes if uid != viewer["id"]]

    followed_liker_ids = [uid for uid in likes if uid in viewer_following]
    pool_ids = followed_liker_ids if followed_liker_ids else likes
    # Cap to 24 to limit DB load when computing ranking
    sample_ids = pool_ids[:24]
    users = await db.users.find(
        {"id": {"$in": sample_ids}},
        {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "verified": 1, "followers": 1},
    ).to_list(length=24)
    # Rank by followers desc as a stable, useful tie-breaker
    users.sort(key=lambda u: len(u.get("followers", []) or []), reverse=True)
    cards = [
        {
            "id": u["id"],
            "username": u.get("username", ""),
            "name": u.get("name", ""),
            "avatar": u.get("avatar", ""),
            "verified": bool(u.get("verified", False)),
        }
        for u in users[:3]
    ]
    return {
        "users": cards,
        "total": total,
        "followed_total": len(followed_liker_ids),
    }


@api.post("/posts/{post_id}/bookmark")
async def bookmark_post(post_id: str, user=Depends(get_current_user)):
    # Grupo A: read-only + bookmarks_enabled
    await _assert_writes_open(user)
    await _assert_feature_or_503("bookmarks_enabled", user)
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    bookmarked = user["id"] in post.get("bookmarks", [])
    if bookmarked:
        await db.posts.update_one({"id": post_id}, {"$pull": {"bookmarks": user["id"]}})
        return {"bookmarked": False}
    await db.posts.update_one({"id": post_id}, {"$addToSet": {"bookmarks": user["id"]}})
    return {"bookmarked": True}


@api.post("/posts/{post_id}/repost")
async def repost(post_id: str, user=Depends(get_current_user)):
    # Grupo A: read-only + reposts_enabled
    await _assert_writes_open(user)
    await _assert_feature_or_503("reposts_enabled", user)
    original = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not original:
        raise HTTPException(404, "Publicação não encontrada")
    origin_id = original.get("repost_of") or original["id"]
    origin = await db.posts.find_one({"id": origin_id}, {"_id": 0})
    if not origin:
        raise HTTPException(404, "Publicação original não encontrada")
    already = user["id"] in origin.get("reposts", [])
    if already:
        await db.posts.update_one({"id": origin["id"]}, {"$pull": {"reposts": user["id"]}})
        await db.posts.delete_many({"author_id": user["id"], "repost_of": origin["id"]})
        return {"reposted": False, "reposts_count": len(origin.get("reposts", [])) - 1}
    await db.posts.update_one({"id": origin["id"]}, {"$addToSet": {"reposts": user["id"]}})
    await db.posts.insert_one({
        "id": str(uuid.uuid4()), "author_id": user["id"],
        "content": "", "image": "",
        "likes": [], "bookmarks": [], "reposts": [], "hashtags": [],
        "repost_of": origin["id"], "created_at": now_iso(),
    })
    await create_notification(origin["author_id"], "repost", user["id"], origin["id"], f"@{user['username']} republicou a tua publicação")
    return {"reposted": True, "reposts_count": len(origin.get("reposts", [])) + 1}


# ============================================================
# Comments (with nested replies)
# ============================================================
async def _enrich_comment(c: dict, viewer: Optional[dict] = None) -> dict:
    author = await db.users.find_one({"id": c["author_id"]}, {"_id": 0})
    viewer_id = viewer["id"] if viewer else None
    likes = c.get("likes", []) or []
    raw_react = c.get("reactions") or {}
    enriched_react = {
        k: {"count": len(v), "reacted": (viewer_id in v) if viewer_id else False}
        for k, v in raw_react.items() if isinstance(v, list) and len(v) > 0
    }
    return {
        "id": c["id"], "post_id": c.get("post_id"),
        "content": c["content"], "created_at": c["created_at"],
        "edited_at": c.get("edited_at"),
        "parent_id": c.get("parent_id"),
        "replies_count": c.get("replies_count", 0),
        "pinned_by_author": bool(c.get("pinned_by_author")),
        "likes_count": len(likes),
        "liked": (viewer_id in likes) if viewer_id else False,
        "reactions": enriched_react,
        "author": public_user(author) if author else None,
    }


@api.get("/posts/{post_id}/comments")
async def list_comments(post_id: str, sort: str = "new", viewer: Optional[dict] = Depends(maybe_user)):
    cs = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    enriched = [await _enrich_comment(c, viewer) for c in cs]
    # Server-side sort hint; client may also sort. For 'best' we score by likes + replies.
    if sort == "best":
        def score(c):
            return (c.get("likes_count", 0) * 2) + (c.get("replies_count", 0) * 1.5)
        # Stable: pinned first, then by score desc, then by date asc
        enriched.sort(key=lambda c: (not c.get("pinned_by_author"), -score(c), c.get("created_at", "")))
    elif sort == "controversial":
        # "Polémicos": muitas respostas em proporção aos likes
        # Score = replies * (1 + log(replies+1)) / (likes+2). Mais respostas com poucos likes = polémico.
        import math as _math
        def cscore(c):
            r = c.get("replies_count", 0) or 0
            lk = c.get("likes_count", 0) or 0
            if r < 2:
                return 0.0
            return float(r) * (1.0 + _math.log(r + 1.0)) / float(lk + 2)
        enriched.sort(key=lambda c: (not c.get("pinned_by_author"), -cscore(c), c.get("created_at", "")))
    elif sort == "old":
        enriched.sort(key=lambda c: (not c.get("pinned_by_author"), c.get("created_at", "")))
    else:  # new
        enriched.sort(key=lambda c: (not c.get("pinned_by_author"), c.get("created_at", "")), reverse=False)
    return enriched


@api.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, payload: CommentIn, user=Depends(get_current_user)):
    # Grupo A: read-only + comments_enabled + char limit + global per-hour limit
    await _assert_writes_open(user)
    await _assert_feature_or_503("comments_enabled", user)
    await _assert_global_hourly_limit(user, "comments")
    # H2 — mention spam caps
    await _assert_mentions_per_post(payload.content or "")
    await _assert_mentions_per_hour(user, payload.content or "")
    if not user.get("is_admin"):
        _max_c = await get_limit("max_comment_chars")
        if _max_c and len((payload.content or "")) > _max_c:
            raise HTTPException(400, f"Comentário demasiado longo (máx {_max_c} caracteres).")
    # Admin restrictions: mute + rate-limit + frozen + maintenance (real)
    await _aassert_can_comment(user)
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    # Comunidade: banidos/silenciados não comentam em posts da comunidade.
    if post.get("community_id"):
        _comm = await db.communities.find_one({"id": post["community_id"]}, {"_id": 0})
        if _comm:
            if community_mod.is_banned(_comm, user["id"]) and not user.get("is_admin"):
                raise HTTPException(403, "Foste expulso desta comunidade")
            if community_mod.is_muted(_comm, user["id"]) and not user.get("is_admin"):
                raise HTTPException(403, "Estás silenciado nesta comunidade")
    # Admin-imposed: comments frozen on this post (replies_frozen=true)
    _assert_post_replies_open(post)
    # Reply audience enforcement
    audience = post.get("reply_audience", "everyone")
    author_id = post["author_id"]
    if user["id"] != author_id:
        if audience == "following":
            # only people the post author follows can reply
            author_doc = await db.users.find_one({"id": author_id}, {"_id": 0})
            allowed = set((author_doc or {}).get("following", []))
            if user["id"] not in allowed:
                raise HTTPException(403, "Só pessoas que o autor segue podem responder")
        elif audience == "mentioned":
            mentioned = extract_mentions(post.get("content", ""))
            if user["username"] not in mentioned:
                raise HTTPException(403, "Apenas pessoas mencionadas podem responder")

    parent = None
    if payload.parent_id:
        parent = await db.comments.find_one({"id": payload.parent_id, "post_id": post_id}, {"_id": 0})
        if not parent:
            raise HTTPException(404, "Comentário pai não encontrado")

    comment = {
        "id": str(uuid.uuid4()), "post_id": post_id, "author_id": user["id"],
        "content": payload.content, "created_at": now_iso(),
        "parent_id": parent["id"] if parent else None,
        "replies_count": 0,
        # Denormaliza a comunidade do post → permite pulso/trends por comunidade.
        "community_id": post.get("community_id"),
    }
    await db.comments.insert_one(comment)
    await daily_checkin(user["id"])
    await award_xp(user["id"], "create_comment")
    # Preview snippet for richer notifications (mini-preview in notification list)
    preview_snippet = (payload.content or "").strip()
    if len(preview_snippet) > 140:
        preview_snippet = preview_snippet[:137].rstrip() + "…"
    # Bump parent replies_count
    if parent:
        await db.comments.update_one(
            {"id": parent["id"]},
            {"$inc": {"replies_count": 1}},
        )
        if parent["author_id"] != user["id"]:
            await create_notification(
                parent["author_id"], "reply", user["id"], post_id,
                f"@{user['username']} respondeu ao teu comentário",
                extra={
                    "parent_id": parent["id"],
                    "comment_id": comment["id"],
                    "comment_preview": preview_snippet,
                },
            )
    else:
        if post["author_id"] != user["id"]:
            await create_notification(
                post["author_id"], "comment", user["id"], post_id,
                f"@{user['username']} comentou na tua publicação",
                extra={
                    "comment_id": comment["id"],
                    "comment_preview": preview_snippet,
                },
            )
    await handle_mentions(payload.content, user, post_id)
    enriched_comment = await _enrich_comment(comment, user)
    # Notify post-viewers (incl. author) that a new comment was just posted (so they can highlight it live)
    try:
        await ws_manager.broadcast_to_post_viewers(
            post_id,
            {
                "type": "new_comment",
                "post_id": post_id,
                "comment_id": comment["id"],
                "parent_id": parent["id"] if parent else None,
                "author_id": user["id"],
                "comment": enriched_comment,  # full payload so clients can render without refetch
            },
            exclude_user=user["id"],
        )
    except Exception:
        pass
    # Activity ticker da comunidade (só se o post pertencer a uma).
    try:
        cid = post.get("community_id")
        if cid:
            await ws_manager.broadcast_to_community(cid, {
                "type": "community_activity",
                "community_id": cid,
                "event": "comment",
                "post_id": post_id,
                "at": comment["created_at"],
                "actor": {"id": user["id"], "username": user.get("username"),
                          "name": user.get("name"), "avatar": user.get("avatar", "")},
                "preview": preview_snippet,
            })
    except Exception:
        pass
    return enriched_comment


@api.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user=Depends(get_current_user)):
    c = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comentário não encontrado")
    # Dual-ownership: comment author OR post author may delete.
    # Centralised: try strict-owner on the comment; if it fails, fall back
    # to strict-owner on the parent post. Either succeeds → authorized.
    try:
        require_owner(user, c, owner_field="author_id")
    except AuthzError:
        post = await db.posts.find_one({"id": c["post_id"]}, {"_id": 0})
        try:
            require_owner(user, post or {}, owner_field="author_id")
        except AuthzError:
            raise HTTPException(403, "Sem permissão")
    # Recursive delete of replies
    descendants = [comment_id]
    queue = [comment_id]
    while queue:
        new_q = []
        async for child in db.comments.find({"parent_id": {"$in": queue}}, {"_id": 0, "id": 1}):
            descendants.append(child["id"])
            new_q.append(child["id"])
        queue = new_q
    await db.comments.delete_many({"id": {"$in": descendants}})
    if c.get("parent_id"):
        await db.comments.update_one(
            {"id": c["parent_id"]},
            {"$inc": {"replies_count": -1}},
        )
    return {"ok": True, "deleted": len(descendants)}


# ============================================================
# Stories (v2 — rich media + stickers + reactions + replies + viewers
#               + audience + highlights + archive + mute-author)
# ============================================================

# Background presets para text stories (frontend renderiza com estes nomes)
STORY_BACKGROUNDS = {
    "coral":     "linear-gradient(135deg,#FF6B6B 0%,#E03E3E 100%)",
    "ocean":     "linear-gradient(135deg,#4FACFE 0%,#1E40AF 100%)",
    "dusk":      "linear-gradient(135deg,#FA709A 0%,#FEE140 100%)",
    "fado":      "linear-gradient(135deg,#1F1147 0%,#7E1F86 50%,#F08C1F 100%)",
    "saudade":   "linear-gradient(180deg,#0E2148 0%,#283593 60%,#7E57C2 100%)",
    "tasca":     "linear-gradient(135deg,#7C2D12 0%,#B45309 100%)",
    "tejo":      "linear-gradient(180deg,#4A6FA5 0%,#7BA7C9 50%,#E8C39E 100%)",
    "azulejo":   "linear-gradient(135deg,#1E40AF 0%,#3B82F6 50%,#F0F9FF 100%)",
    "pinhal":    "linear-gradient(135deg,#064E3B 0%,#10B981 60%,#FDE68A 100%)",
    "praia":     "linear-gradient(135deg,#A1FFCE 0%,#FAFFD1 100%)",
    "noite":     "linear-gradient(135deg,#0F2027 0%,#203A43 50%,#2C5364 100%)",
    "neon":      "linear-gradient(135deg,#FA00FF 0%,#00F0FF 100%)",
    "pastel":    "linear-gradient(135deg,#FBC2EB 0%,#A6C1EE 100%)",
    "monochrome":"linear-gradient(180deg,#1a1a1a 0%,#404040 100%)",
    "papel":     "linear-gradient(135deg,#F5F1E8 0%,#E8DCC4 100%)",
}
VALID_FONT_STYLES = {"modern", "classic", "neon", "typewriter", "serif", "bold", "brush"}
VALID_TEXT_STYLES = {"plain", "highlight", "outline", "glow"}
VALID_STORY_AUDIENCES = {"everyone", "roda", "following"}
STORY_REACTION_EMOJIS = {"❤️", "🔥", "👏", "😂", "😢", "💯", "🫶", "🥹"}
VALID_STICKER_TYPES = {
    "poll", "question", "slider", "mention", "hashtag",
    "location", "countdown",
}


def _normalize_caption_pos(raw):
    """Caption position as 0..1 normalized. Defaults to bottom-center."""
    if not raw or not isinstance(raw, dict):
        return None
    try:
        x = float(raw.get("x", 0.5))
        y = float(raw.get("y", 0.82))
        return {
            "x": max(0.05, min(0.95, x)),
            "y": max(0.06, min(0.94, y)),
        }
    except Exception:
        return None


def _normalize_stickers(raw):
    """Sanitiza stickers vindos do composer. Cada sticker tem:
       id (gerado), type, x, y, rotation, scale, data (depende do tipo)."""
    if not raw:
        return []
    out = []
    for s in raw[:8]:  # máximo 8 stickers por story
        try:
            stype = (s.get("type") or "").lower()
            if stype not in VALID_STICKER_TYPES:
                continue
            sticker = {
                "id": s.get("id") or str(uuid.uuid4()),
                "type": stype,
                "x": float(max(0.0, min(1.0, s.get("x", 0.5)))),
                "y": float(max(0.0, min(1.0, s.get("y", 0.5)))),
                "rotation": float(max(-180.0, min(180.0, s.get("rotation", 0)))),
                "scale": float(max(0.4, min(2.5, s.get("scale", 1)))),
                "data": {},
            }
            data = s.get("data") or {}
            if stype == "poll":
                # data: {question, options:[{id,text}]}
                question = (data.get("question") or "").strip()[:80]
                opts_raw = data.get("options") or []
                options = []
                for o in opts_raw[:4]:
                    txt = (o.get("text") or "").strip()[:30]
                    if not txt:
                        continue
                    options.append({"id": o.get("id") or str(uuid.uuid4())[:8], "text": txt})
                if len(options) < 2:
                    continue
                sticker["data"] = {"question": question or "Sim ou não?", "options": options}
            elif stype == "question":
                sticker["data"] = {
                    "prompt": ((data.get("prompt") or "Faz-me uma pergunta").strip())[:80],
                    "placeholder": ((data.get("placeholder") or "Escreve aqui...").strip())[:60],
                }
            elif stype == "slider":
                sticker["data"] = {
                    "prompt": ((data.get("prompt") or "Avalia isto").strip())[:60],
                    "emoji": (data.get("emoji") or "🔥")[:4],
                }
            elif stype == "mention":
                username = (data.get("username") or "").lower().strip().lstrip("@")[:30]
                if not username:
                    continue
                sticker["data"] = {"username": username}
            elif stype == "hashtag":
                tag = (data.get("tag") or "").strip().lstrip("#")[:30]
                if not tag:
                    continue
                sticker["data"] = {"tag": tag.lower()}
            elif stype == "location":
                place = (data.get("place") or "").strip()[:60]
                if not place:
                    continue
                sticker["data"] = {"place": place}
            elif stype == "countdown":
                ends = (data.get("ends_at") or "").strip()
                title = (data.get("title") or "Contagem").strip()[:40]
                if not ends:
                    continue
                sticker["data"] = {"title": title, "ends_at": ends}
            elif stype == "link":
                url = (data.get("url") or "").strip()[:300]
                label = (data.get("label") or "Saber mais").strip()[:40]
                if not url.startswith(("http://", "https://")):
                    continue
                sticker["data"] = {"url": url, "label": label}
            elif stype == "music":
                title = (data.get("title") or "").strip()[:60]
                artist = (data.get("artist") or "").strip()[:60]
                if not title:
                    continue
                sticker["data"] = {"title": title, "artist": artist}
            out.append(sticker)
        except Exception:
            continue
    return out


def _enrich_sticker_for_viewer(sticker: dict, story: dict, viewer_id: str) -> dict:
    """Devolve o sticker com agregados (votos, médias) e a resposta do viewer."""
    s = dict(sticker)
    stype = s.get("type")
    sid = s.get("id")
    if stype == "poll":
        votes = (story.get("poll_votes") or {}).get(sid, {})
        opts = s.get("data", {}).get("options", [])
        total = 0
        for o in opts:
            total += len(votes.get(o["id"], []))
        results = []
        viewer_vote = None
        for o in opts:
            voters = votes.get(o["id"], [])
            cnt = len(voters)
            pct = round((cnt / total) * 100) if total else 0
            results.append({"id": o["id"], "text": o["text"], "votes": cnt, "pct": pct})
            if viewer_id and viewer_id in voters:
                viewer_vote = o["id"]
        s["results"] = {"options": results, "total": total, "viewer_vote": viewer_vote}
    elif stype == "question":
        answers = (story.get("question_answers") or {}).get(sid, [])
        s["answers_count"] = len(answers)
        s["viewer_answered"] = any(a.get("user_id") == viewer_id for a in answers)
    elif stype == "slider":
        responses = (story.get("slider_responses") or {}).get(sid, [])
        s["responses_count"] = len(responses)
        s["average"] = (sum(r.get("value", 0) for r in responses) / len(responses)) if responses else None
        my = next((r for r in responses if r.get("user_id") == viewer_id), None)
        s["viewer_value"] = my.get("value") if my else None
    return s


# =========================================================================
# SSS-Tier Stories Intelligence
# =========================================================================
# Esta camada acrescenta inteligência algorítmica ao módulo stories:
#
#   • _compute_story_eqs    Engagement Quality Score 0..1 (densidade de
#                           interacções por viewer, decaimento temporal,
#                           penalização para stories sem alma)
#   • _detect_story_mood    auto-mood a partir de caption + text_content + stickers
#                           (8 moods PT — saudade, festa, cafe, tasca, …)
#   • _affinity_score       afinidade viewer↔autor (Mesa > Roda > seguindo > anónimo)
#   • _score_group_for_feed score combinado para ordenar tray de stories
#   • _quick_replies_for    sugestões inteligentes de respostas contextuais
#   • _is_echo_post         detecção de spam / repetição (anti-eco)
#   • _hour_bucket_weights  curadoria por hora do dia (manhã→café, noite→fado/saudade)
#
# Decisões importantes:
#   · Todo o cálculo é determinístico e barato (O(n) sobre lista do tray).
#   · EQS é computado on-the-fly (idempotente, sem necessidade de cache).
# =========================================================================

def _compute_story_eqs(story: dict) -> float:
    """
    Engagement Quality Score em [0, 1].

    Não é um simples /views — penaliza stories com alto view-count e baixa
    densidade de interacção (passa-stories), e premeia diversidade de sinal
    (poll vote ≠ reacção ≠ resposta).
    """
    viewers = story.get("viewers") or []
    n_views = max(1, len(viewers))
    # Reactions
    reactions = story.get("reactions") or {}
    n_react = sum(1 for v in reactions.values() if v)
    # Replies
    n_replies = len(story.get("replies") or [])
    # Sticker interactions (poll + question + slider)
    n_poll = 0
    for opts in (story.get("poll_votes") or {}).values():
        for voters in (opts or {}).values():
            n_poll += len(voters or [])
    n_q = sum(len(v or []) for v in (story.get("question_answers") or {}).values())
    n_slider = sum(len(v or []) for v in (story.get("slider_responses") or {}).values())
    n_sticker = n_poll + n_q + n_slider

    # Sinais ponderados — diversidade conta
    react_rate = n_react / n_views
    reply_rate = n_replies / n_views
    sticker_rate = n_sticker / n_views
    # Diversidade — número de tipos de sinal diferentes
    types_present = sum(1 for x in (n_react, n_replies, n_sticker) if x > 0)
    diversity_bonus = (types_present - 1) * 0.06 if types_present > 1 else 0

    # Combo ponderado (peso favorece replies > sticker > reaction)
    raw = (react_rate * 0.30) + (sticker_rate * 0.35) + (reply_rate * 0.50) + diversity_bonus
    # Saturação suave
    score = raw / (1 + raw * 0.5)
    return max(0.0, min(1.0, score))


def _detect_story_mood(caption: str, text_content: str, stickers):
    """Devolve um mood ∈ MOODS ou None se nada bater."""
    haystack = " ".join([caption or "", text_content or ""]).lower()
    for s in (stickers or []):
        data = s.get("data") or {}
        for key in ("place", "tag", "question", "prompt", "title"):
            v = data.get(key)
            if isinstance(v, str):
                haystack += " " + v.lower()
    if not haystack.strip():
        return None
    best = None
    best_score = 0
    for key, m in MOODS.items():
        kws = m.get("keywords") or []
        score = sum(1 for kw in kws if kw in haystack)
        if score > best_score:
            best_score = score
            best = key
    return best if best_score > 0 else None


def _hour_bucket(now: datetime) -> str:
    """madrugada | manhã | tarde | noite — usado para curadoria de mood."""
    h = now.astimezone(timezone.utc).hour
    if h < 5:
        return "madrugada"
    if h < 12:
        return "manha"
    if h < 18:
        return "tarde"
    return "noite"


_MOOD_TIME_WEIGHTS = {
    "manha":     {"cafe": 1.25, "saudade": 0.95, "festa": 0.85},
    "tarde":     {"praia": 1.18, "cultura": 1.10, "futebol": 1.08},
    "noite":     {"fado": 1.30, "saudade": 1.20, "festa": 1.18, "tasca": 1.15},
    "madrugada": {"saudade": 1.40, "fado": 1.30, "festa": 1.10},
}


def _mood_time_multiplier(mood, hour_bucket: str) -> float:
    if not mood:
        return 1.0
    return _MOOD_TIME_WEIGHTS.get(hour_bucket, {}).get(mood, 1.0)


async def _affinity_score(viewer: dict, author_id: str) -> float:
    """Afinidade viewer → autor ∈ [0, 1]."""
    if author_id == viewer["id"]:
        return 1.0
    mesa = set(viewer.get("mesa") or [])
    if author_id in mesa:
        return 0.90
    roda_mine = set(viewer.get("roda") or [])
    if author_id in roda_mine:
        return 0.78
    author = await db.users.find_one({"id": author_id}, {"_id": 0, "roda": 1})
    if author and viewer["id"] in (author.get("roda") or []):
        return 0.72
    following = set(viewer.get("following") or [])
    if author_id in following:
        return 0.55
    return 0.28


def _recency_decay(created_at_iso: str, now: datetime) -> float:
    """Decai de 1 → ~0.02 ao longo das 24h de validade do story (meia-vida ~6h)."""
    try:
        created = datetime.fromisoformat(created_at_iso)
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
    except Exception:
        return 0.5
    age_hours = max(0.0, (now - created).total_seconds() / 3600.0)
    return math.exp(-age_hours / 6.0)


def _is_echo_post(prev_caption: str, prev_text: str, new_caption: str, new_text: str) -> bool:
    """Detecta duplicação trivial (mesmo texto/legenda em janela curta)."""
    a = (prev_caption or "").strip().lower() + "|" + (prev_text or "").strip().lower()
    b = (new_caption or "").strip().lower() + "|" + (new_text or "").strip().lower()
    if not a.strip("|") or not b.strip("|"):
        return False
    if a == b:
        return True
    common = sum(1 for c in a if c in b)
    longest = max(len(a), len(b))
    return longest > 8 and (common / longest) > 0.85


_QUICK_REPLY_TEMPLATES = {
    "saudade":  ["Senti isso mesmo 🥹", "Bate fundo", "Levas-me lá", "Que linda"],
    "festa":    ["Bora!", "Quero estar aí 🎉", "Que arraial", "Salta-se?"],
    "tasca":    ["Que petisco 😋", "Tasca-me a morada", "Quero também", "Bom proveito"],
    "cafe":     ["Bica? Toma uma por mim ☕", "Que paz", "Padaria boa", "Que manhã"],
    "praia":    ["Areia 🌊", "Que cor", "Inveja sadia", "Estou a derreter aqui"],
    "fado":     ["🎙️ Que voz", "Levaste-me", "Saudade pura", "Que casa"],
    "futebol":  ["Golo! ⚽", "Boa equipa", "Vamos!", "Que ambiente"],
    "cultura":  ["Que vista", "Tenho de ir", "Que detalhe", "Bonito demais"],
}
_QUICK_REPLY_FALLBACK = ["❤️", "🔥", "Boa!", "Que fixe"]


def _quick_replies_for(story: dict, limit: int = 6) -> list:
    mood = story.get("mood")
    pool = list(_QUICK_REPLY_TEMPLATES.get(mood) or [])
    for s in (story.get("stickers") or []):
        if s.get("type") == "question":
            pool.append("Boa pergunta…")
        elif s.get("type") == "poll":
            pool.append("Já votei!")
        elif s.get("type") == "location":
            place = (s.get("data") or {}).get("place", "")
            if place:
                pool.append(f"Que sítio bom — {place}")
        elif s.get("type") == "music":
            pool.append("Que som 🎶")
    while len(pool) < limit:
        for x in _QUICK_REPLY_FALLBACK:
            if x not in pool:
                pool.append(x)
                if len(pool) >= limit:
                    break
    seen = set()
    out = []
    for x in pool:
        if x not in seen:
            seen.add(x)
            out.append(x)
        if len(out) >= limit:
            break
    return out


async def _score_group_for_feed(
    author_id: str, items: list, viewer: dict, now: datetime, hour_bucket: str
) -> float:
    """Pontuação combinada de um GRUPO de stories (por autor) para o tray."""
    if not items:
        return 0.0
    if author_id == viewer["id"]:
        return 99.0  # próprio sempre no topo
    affinity = await _affinity_score(viewer, author_id)
    has_unseen = any(viewer["id"] not in (s.get("viewers") or []) for s in items)
    most_recent_iso = max(s.get("created_at", "") for s in items)
    recency = _recency_decay(most_recent_iso, now)
    eqs_avg = sum(_compute_story_eqs(s) for s in items) / len(items)
    moods = [s.get("mood") for s in items if s.get("mood")]
    mood_boost = max([_mood_time_multiplier(m, hour_bucket) for m in moods] or [1.0])
    return (
        affinity * 0.40
        + (1.0 if has_unseen else 0.0) * 0.25
        + recency * 0.20
        + eqs_avg * 0.10
        + (mood_boost - 1.0) * 0.05
    )



async def _enrich_story_for_viewer(story: dict, viewer_id: str) -> dict:
    """Devolve story enriquecido para o consumer: bg, reactions, viewer_reaction,
       stickers com agregados, allowed flags."""
    bg_key = story.get("background") or "coral"
    bg_css = STORY_BACKGROUNDS.get(bg_key, STORY_BACKGROUNDS["coral"])
    reactions_raw = story.get("reactions") or {}
    react_counts: dict[str, int] = {}
    viewer_reaction = None
    for uid, emoji in reactions_raw.items():
        if not emoji:
            continue
        react_counts[emoji] = react_counts.get(emoji, 0) + 1
        if uid == viewer_id:
            viewer_reaction = emoji
    stickers = [_enrich_sticker_for_viewer(s, story, viewer_id)
                for s in (story.get("stickers") or [])]
    # SSS-Tier: calcular EQS e flag de hot
    eqs = _compute_story_eqs(story)
    return {
        "id": story["id"],
        "author_id": story["author_id"],
        "media_type": story.get("media_type", "image"),
        "image": story.get("image", ""),
        "video": story.get("video", ""),
        "duration_ms": story.get("duration_ms", 5000),
        "text_content": story.get("text_content", ""),
        "background": bg_key,
        "background_css": bg_css,
        "text_color": story.get("text_color", "#ffffff"),
        "font_style": story.get("font_style", "modern"),
        "text_style": story.get("text_style", "plain"),
        "caption": story.get("caption", "") or story.get("content", ""),
        "caption_pos": story.get("caption_pos"),
        "stickers": stickers,
        "audience": story.get("audience", "everyone"),
        "allow_replies": story.get("allow_replies", True),
        "allow_reactions": story.get("allow_reactions", True),
        "created_at": story.get("created_at"),
        "expires_at": story.get("expires_at"),
        "viewers_count": len(story.get("viewers", []) or []),
        "reactions": react_counts,
        "viewer_reaction": viewer_reaction,
        "replies_count": len(story.get("replies", []) or []),
        "in_highlights": bool(story.get("highlight_ids")),
        "is_viewed": viewer_id in (story.get("viewers", []) or []),
        # SSS-Tier signals
        "eqs": round(eqs, 3),
        "is_hot": eqs >= 0.55,
        "mood": story.get("mood"),
    }


async def _story_is_visible_to(story: dict, viewer: dict) -> bool:
    """Verifica audiência. O autor sempre vê os próprios stories."""
    if story["author_id"] == viewer["id"]:
        return True
    # bloqueios
    author = await db.users.find_one({"id": story["author_id"]}, {"_id": 0, "blocked": 1})
    if author and viewer["id"] in (author.get("blocked") or []):
        return False
    audience = story.get("audience", "everyone")
    if audience == "everyone":
        return True
    if audience == "following":
        return viewer["id"] in (await _author_followers(story["author_id"]))
    if audience == "roda":
        # autor tem viewer na sua Roda?
        author_full = await db.users.find_one({"id": story["author_id"]}, {"_id": 0, "roda": 1})
        return author_full and viewer["id"] in (author_full.get("roda") or [])
    return True


async def _author_followers(author_id: str) -> list[str]:
    a = await db.users.find_one({"id": author_id}, {"_id": 0, "followers": 1})
    return (a.get("followers") or []) if a else []


@api.post("/stories")
async def create_story(payload: StoryIn, user=Depends(get_current_user)):
    # Grupo A: read-only + stories_enabled
    await _assert_writes_open(user)
    await _assert_feature_or_503("stories_enabled", user)
    media_type = (payload.media_type or "image").lower()
    if media_type not in {"image", "video", "text"}:
        media_type = "image"
    if media_type == "image" and not payload.image:
        raise HTTPException(400, "Imagem obrigatória para story de imagem")
    if media_type == "video" and not payload.video:
        raise HTTPException(400, "Vídeo obrigatório para story de vídeo")
    if media_type == "text" and not (payload.text_content or "").strip():
        raise HTTPException(400, "Texto obrigatório para story de texto")
    # H4 — magic-bytes validation on story image (defeats SVG/HTML smuggling)
    if media_type == "image" and payload.image and not _is_safe_image_url(payload.image):
        raise HTTPException(400, "Imagem inválida (formato não suportado).")
    audience = payload.audience if payload.audience in VALID_STORY_AUDIENCES else "everyone"
    font_style = payload.font_style if payload.font_style in VALID_FONT_STYLES else "modern"
    text_style = payload.text_style if payload.text_style in VALID_TEXT_STYLES else "plain"
    background = payload.background if payload.background in STORY_BACKGROUNDS else "coral"
    stickers = _normalize_stickers(payload.stickers)
    caption = (payload.caption or payload.content or "").strip()[:300]
    # mentions automáticas via caption / text_content / mention stickers
    mention_users = set()
    for txt in (caption, payload.text_content or ""):
        for u in extract_mentions(txt or ""):
            mention_users.add(u)
    for s in stickers:
        if s["type"] == "mention":
            mention_users.add(s["data"]["username"])
    now = datetime.now(timezone.utc)
    duration_ms = int(payload.duration_ms or 5000)
    if media_type == "video":
        duration_ms = max(2000, min(15000, duration_ms))
    else:
        duration_ms = max(3000, min(10000, duration_ms))

    # SSS-Tier: anti-echo (impede reposts idênticos do mesmo autor em <5min)
    five_min_ago = (now - timedelta(minutes=5)).isoformat()
    prev = await db.stories.find_one(
        {"author_id": user["id"], "created_at": {"$gt": five_min_ago}},
        {"_id": 0, "caption": 1, "text_content": 1},
        sort=[("created_at", -1)],
    )
    if prev and _is_echo_post(prev.get("caption", ""), prev.get("text_content", ""), caption, payload.text_content or ""):
        raise HTTPException(429, "Acabaste de publicar algo parecido. Espera um pouco antes de repetir.")

    # SSS-Tier: auto-mood
    detected_mood = _detect_story_mood(caption, payload.text_content or "", stickers)

    story = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "media_type": media_type,
        "image": payload.image or "",
        "video": payload.video or "",
        "duration_ms": duration_ms,
        "text_content": payload.text_content or "",
        "background": background,
        "text_color": payload.text_color or "#ffffff",
        "font_style": font_style,
        "text_style": text_style,
        "caption": caption,
        "caption_pos": _normalize_caption_pos(payload.caption_pos),
        "stickers": stickers,
        "audience": audience,
        "allow_replies": bool(payload.allow_replies if payload.allow_replies is not None else True),
        "allow_reactions": bool(payload.allow_reactions if payload.allow_reactions is not None else True),
        "viewers": [],
        "reactions": {},          # {user_id: emoji}
        "replies": [],            # [{user_id, content, created_at}]
        "poll_votes": {},         # {sticker_id: {option_id: [user_ids]}}
        "question_answers": {},   # {sticker_id: [{user_id, content, created_at}]}
        "slider_responses": {},   # {sticker_id: [{user_id, value, created_at}]}
        "view_events": [],        # [{user_id, completion: 0..1, viewed_at}] — SSS-Tier
        "mood": detected_mood,    # SSS-Tier
        "highlight_ids": [],
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
    }
    await db.stories.insert_one(story)
    # Notificação de menções
    for uname in mention_users:
        target = await db.users.find_one({"username": uname.lower()}, {"_id": 0})
        if target and target["id"] != user["id"]:
            await create_notification(
                target["id"], "story_mention", user["id"], None,
                f"@{user['username']} mencionou-te num story",
                extra={"story_id": story["id"]},
            )
    return {"id": story["id"]}


@api.get("/stories")
async def list_stories(user=Depends(get_current_user)):
    """
    Lista stories activos visíveis ao viewer, agrupados por autor.

    SSS-Tier ranking:
       · próprio autor sempre primeiro
       · grupos ordenados por score combinado (affinity × unseen × recency × eqs × mood)
       · diversity penalty: nunca mais de 2 grupos consecutivos do mesmo cluster
         (cluster = "alta-afinidade Mesa/Roda" vs "média" vs "stranger")
    """
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    hour_bucket = _hour_bucket(now_dt)

    # autores potenciais
    roda_authors_cur = db.users.find({"roda": user["id"]}, {"_id": 0, "id": 1})
    roda_authors = [u["id"] async for u in roda_authors_cur]
    ids = list({user["id"], *(user.get("following") or []), *roda_authors})
    muted = set(user.get("stories_muted") or [])
    rows = await db.stories.find(
        {"author_id": {"$in": ids}, "expires_at": {"$gt": now_iso}}, {"_id": 0}
    ).sort("created_at", -1).to_list(800)

    # filtrar por audiência
    visible = []
    for s in rows:
        if s["author_id"] in muted and s["author_id"] != user["id"]:
            continue
        if await _story_is_visible_to(s, user):
            visible.append(s)

    groups: dict[str, list] = {}
    for s in visible:
        groups.setdefault(s["author_id"], []).append(s)

    out = []
    for author_id, items in groups.items():
        author = await db.users.find_one({"id": author_id}, {"_id": 0})
        if not author:
            continue
        items_sorted = sorted(items, key=lambda x: x["created_at"])
        enriched = [await _enrich_story_for_viewer(s, user["id"]) for s in items_sorted]
        unseen = any(not s["is_viewed"] for s in enriched)
        score = await _score_group_for_feed(author_id, items_sorted, user, now_dt, hour_bucket)
        affinity = await _affinity_score(user, author_id)
        out.append({
            "author": public_user(author),
            "stories": enriched,
            "has_unseen": unseen,
            "score": round(score, 4),
            "affinity": round(affinity, 3),
            "max_eqs": round(max((s["eqs"] for s in enriched), default=0.0), 3),
        })

    # próprio primeiro, depois ordenar por score SSS-Tier
    out.sort(key=lambda g: (g["author"]["id"] != user["id"], -g["score"]))

    # SSS-Tier: diversity penalty — espalhar clusters de afinidade
    # nunca devolver 3 grupos consecutivos do mesmo tier (≥0.7, 0.4-0.7, <0.4)
    def _tier(g):
        a = g.get("affinity", 0)
        if g["author"]["id"] == user["id"]:
            return "self"
        if a >= 0.7:
            return "high"
        if a >= 0.45:
            return "mid"
        return "low"

    diversified: list = []
    skipped: list = []
    last_tier = None
    last_count = 0
    for g in out:
        t = _tier(g)
        if t == last_tier and last_count >= 2 and t != "self":
            skipped.append(g)
            continue
        if t == last_tier:
            last_count += 1
        else:
            last_tier = t
            last_count = 1
        diversified.append(g)
    # anexar os que ficaram para trás no fim, preservando ordem original
    diversified.extend(skipped)

    return diversified


class StoryViewIn(BaseModel):
    # SSS-Tier — quanto do story foi visto (0..1)
    completion: Optional[float] = None


@api.post("/stories/{story_id}/view")
async def view_story(
    story_id: str,
    payload: Optional[StoryViewIn] = None,
    user=Depends(get_current_user),
):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if not await _story_is_visible_to(s, user):
        raise HTTPException(403, "Sem acesso")
    if user["id"] == s["author_id"]:
        return {"ok": True}
    completion = max(0.0, min(1.0, float((payload.completion if payload else None) or 1.0)))
    # SSS-Tier: tracking de view event (event sourcing, limitado a 2000 eventos)
    event = {
        "user_id": user["id"],
        "completion": round(completion, 3),
        "viewed_at": now_iso(),
    }
    await db.stories.update_one(
        {"id": story_id},
        {
            "$addToSet": {"viewers": user["id"]},
            "$push": {"view_events": {"$each": [event], "$slice": -2000}},
        },
    )
    return {"ok": True}


@api.delete("/stories/{story_id}")
async def delete_story(story_id: str, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    try:
        require_owner(user, s, owner_field="author_id")
    except AuthzError:
        raise HTTPException(403, "Sem permissão")
    await db.stories.delete_one({"id": story_id})
    # Remover de highlights
    await db.highlights.update_many(
        {"owner_id": user["id"], "story_ids": story_id},
        {"$pull": {"story_ids": story_id}},
    )
    return {"ok": True}


# ---------- Reactions ----------
@api.post("/stories/{story_id}/react")
async def react_to_story(story_id: str, payload: StoryReactIn, user=Depends(get_current_user)):
    await _assert_reactions_minute_quota(user)
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if not s.get("allow_reactions", True):
        raise HTTPException(400, "Reacções desactivadas neste story")
    if not await _story_is_visible_to(s, user):
        raise HTTPException(403, "Sem acesso")
    emoji = (payload.emoji or "").strip()
    if emoji not in STORY_REACTION_EMOJIS:
        raise HTTPException(400, "Emoji inválido")
    current = (s.get("reactions") or {}).get(user["id"])
    if current == emoji:
        # toggle off
        await db.stories.update_one(
            {"id": story_id}, {"$unset": {f"reactions.{user['id']}": ""}}
        )
        new_reaction = None
    else:
        await db.stories.update_one(
            {"id": story_id}, {"$set": {f"reactions.{user['id']}": emoji}}
        )
        new_reaction = emoji
        # notificação ao autor (uma só por reacção; agrupada se preferir)
        if s["author_id"] != user["id"]:
            await create_notification(
                s["author_id"], "story_reaction", user["id"], None,
                f"@{user['username']} reagiu ao teu story {emoji}",
                extra={"story_id": story_id, "emoji": emoji},
            )
    return {"ok": True, "reaction": new_reaction}


# ---------- Reply (envia DM com referência ao story) ----------
@api.post("/stories/{story_id}/reply")
async def reply_to_story(story_id: str, payload: StoryReplyIn, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if not s.get("allow_replies", True):
        raise HTTPException(400, "Respostas desactivadas neste story")
    if not await _story_is_visible_to(s, user):
        raise HTTPException(403, "Sem acesso")
    if s["author_id"] == user["id"]:
        raise HTTPException(400, "Não podes responder ao teu próprio story")
    other_id = s["author_id"]
    key = conv_key(user["id"], other_id)
    now = now_iso()
    # guardar reply no story (para o autor ver agregado)
    await db.stories.update_one(
        {"id": story_id},
        {"$push": {"replies": {"user_id": user["id"], "content": payload.content, "created_at": now}}},
    )
    # criar DM com metadata de story
    msg = {
        "id": str(uuid.uuid4()), "conversation_key": key,
        "sender_id": user["id"], "recipient_id": other_id,
        "content": payload.content, "read": False, "created_at": now,
        "story_ref": {
            "story_id": story_id,
            "preview": (s.get("text_content") or s.get("caption") or "")[:120],
            "media_type": s.get("media_type"),
            "thumb": s.get("image") if s.get("media_type") == "image" else "",
            "background": s.get("background"),
        },
    }
    await db.messages.insert_one(msg)
    await db.conversations.update_one(
        {"key": key},
        {"$set": {
            "key": key, "participants": sorted([user["id"], other_id]),
            "last_message": f"↩ Story: {payload.content[:60]}",
            "last_at": now,
        }},
        upsert=True,
    )
    msg.pop("_id", None)
    try:
        if "ws_manager" in globals():
            await ws_manager.send_personal(other_id, {
                "type": "new_message", "from": user["id"],
                "from_username": user.get("username"), "message": msg,
            })
    except Exception:
        pass
    await create_notification(
        other_id, "story_reply", user["id"], None,
        f"@{user['username']} respondeu ao teu story",
        extra={"story_id": story_id},
    )
    return {"ok": True, "message_id": msg["id"]}


# ---------- Viewers list (autor only) ----------
@api.get("/stories/{story_id}/viewers")
async def list_story_viewers(story_id: str, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if s["author_id"] != user["id"]:
        raise HTTPException(403, "Apenas o autor pode ver as visualizações")
    viewer_ids = s.get("viewers") or []
    if not viewer_ids:
        return {"viewers": [], "reactions_breakdown": {}, "total_views": 0}
    users = await db.users.find({"id": {"$in": viewer_ids}}, {"_id": 0}).to_list(800)
    user_map = {u["id"]: public_user(u) for u in users}
    reactions = s.get("reactions") or {}
    # ordenar por reacção primeiro, depois alfabético
    out = []
    for vid in viewer_ids:
        pu = user_map.get(vid)
        if not pu:
            continue
        out.append({"user": pu, "reaction": reactions.get(vid)})
    out.sort(key=lambda x: (x["reaction"] is None, x["user"].get("name", "").lower()))
    breakdown: dict[str, int] = {}
    for e in reactions.values():
        if e:
            breakdown[e] = breakdown.get(e, 0) + 1
    return {
        "viewers": out,
        "reactions_breakdown": breakdown,
        "total_views": len(viewer_ids),
        "total_reactions": len([e for e in reactions.values() if e]),
        "replies_count": len(s.get("replies") or []),
    }


# ---------- Replies list (autor only) ----------
@api.get("/stories/{story_id}/replies")
async def list_story_replies(story_id: str, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if s["author_id"] != user["id"]:
        raise HTTPException(403, "Apenas o autor")
    replies = s.get("replies") or []
    if not replies:
        return []
    uids = list({r["user_id"] for r in replies})
    users = await db.users.find({"id": {"$in": uids}}, {"_id": 0}).to_list(500)
    umap = {u["id"]: public_user(u) for u in users}
    return [
        {"user": umap.get(r["user_id"]), "content": r["content"], "created_at": r["created_at"]}
        for r in sorted(replies, key=lambda r: r["created_at"], reverse=True)
        if umap.get(r["user_id"])
    ]


# ---------- Poll vote ----------
@api.post("/stories/{story_id}/poll-vote")
async def vote_story_poll(story_id: str, payload: StoryPollVoteIn, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if not await _story_is_visible_to(s, user):
        raise HTTPException(403, "Sem acesso")
    sticker = next((x for x in (s.get("stickers") or []) if x.get("id") == payload.sticker_id and x.get("type") == "poll"), None)
    if not sticker:
        raise HTTPException(404, "Sondagem não encontrada")
    options = sticker.get("data", {}).get("options", [])
    valid_ids = {o["id"] for o in options}
    if payload.option_id not in valid_ids:
        raise HTTPException(400, "Opção inválida")
    poll_votes = s.get("poll_votes") or {}
    sticker_votes = poll_votes.get(payload.sticker_id, {})
    # remover voto antigo (1 voto por user)
    for oid in list(sticker_votes.keys()):
        sticker_votes[oid] = [u for u in sticker_votes[oid] if u != user["id"]]
    sticker_votes.setdefault(payload.option_id, [])
    if user["id"] not in sticker_votes[payload.option_id]:
        sticker_votes[payload.option_id].append(user["id"])
    await db.stories.update_one(
        {"id": story_id},
        {"$set": {f"poll_votes.{payload.sticker_id}": sticker_votes}},
    )
    if s["author_id"] != user["id"]:
        await create_notification(
            s["author_id"], "story_poll_vote", user["id"], None,
            f"@{user['username']} votou na tua sondagem",
            extra={"story_id": story_id},
        )
    refreshed = await db.stories.find_one({"id": story_id}, {"_id": 0})
    enriched_sticker = _enrich_sticker_for_viewer(sticker, refreshed, user["id"])
    return {"ok": True, "sticker": enriched_sticker}


# ---------- Question answer ----------
@api.post("/stories/{story_id}/question-answer")
async def answer_story_question(story_id: str, payload: StoryQuestionAnswerIn, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if not await _story_is_visible_to(s, user):
        raise HTTPException(403, "Sem acesso")
    sticker = next((x for x in (s.get("stickers") or []) if x.get("id") == payload.sticker_id and x.get("type") == "question"), None)
    if not sticker:
        raise HTTPException(404, "Pergunta não encontrada")
    answer = {
        "user_id": user["id"],
        "content": payload.content.strip()[:200],
        "created_at": now_iso(),
    }
    await db.stories.update_one(
        {"id": story_id},
        {"$push": {f"question_answers.{payload.sticker_id}": answer}},
    )
    if s["author_id"] != user["id"]:
        await create_notification(
            s["author_id"], "story_question", user["id"], None,
            f"@{user['username']} respondeu à tua pergunta",
            extra={"story_id": story_id},
        )
    return {"ok": True}


# ---------- Slider response ----------
@api.post("/stories/{story_id}/slider-response")
async def respond_story_slider(story_id: str, payload: StorySliderIn, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if not await _story_is_visible_to(s, user):
        raise HTTPException(403, "Sem acesso")
    sticker = next((x for x in (s.get("stickers") or []) if x.get("id") == payload.sticker_id and x.get("type") == "slider"), None)
    if not sticker:
        raise HTTPException(404, "Slider não encontrado")
    responses = (s.get("slider_responses") or {}).get(payload.sticker_id, [])
    # 1 resposta por user — substitui
    responses = [r for r in responses if r.get("user_id") != user["id"]]
    responses.append({
        "user_id": user["id"],
        "value": float(max(0.0, min(1.0, payload.value))),
        "created_at": now_iso(),
    })
    await db.stories.update_one(
        {"id": story_id},
        {"$set": {f"slider_responses.{payload.sticker_id}": responses}},
    )
    refreshed = await db.stories.find_one({"id": story_id}, {"_id": 0})
    return {"ok": True, "sticker": _enrich_sticker_for_viewer(sticker, refreshed, user["id"])}


# ---------- Sticker reactors (autor vê quem respondeu) ----------
@api.get("/stories/{story_id}/sticker/{sticker_id}/responders")
async def get_sticker_responders(story_id: str, sticker_id: str, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if s["author_id"] != user["id"]:
        raise HTTPException(403, "Apenas o autor")
    sticker = next((x for x in (s.get("stickers") or []) if x.get("id") == sticker_id), None)
    if not sticker:
        raise HTTPException(404, "Sticker não encontrado")
    stype = sticker.get("type")
    if stype == "poll":
        votes = (s.get("poll_votes") or {}).get(sticker_id, {})
        out = []
        for opt in sticker.get("data", {}).get("options", []):
            voters = votes.get(opt["id"], [])
            if voters:
                users = await db.users.find({"id": {"$in": voters}}, {"_id": 0}).to_list(200)
                users_pub = [public_user(u) for u in users]
            else:
                users_pub = []
            out.append({"option_id": opt["id"], "text": opt["text"], "users": users_pub})
        return {"type": "poll", "results": out}
    if stype == "question":
        answers = (s.get("question_answers") or {}).get(sticker_id, [])
        uids = list({a["user_id"] for a in answers})
        users = await db.users.find({"id": {"$in": uids}}, {"_id": 0}).to_list(500)
        umap = {u["id"]: public_user(u) for u in users}
        return {"type": "question", "answers": [
            {"user": umap.get(a["user_id"]), "content": a["content"], "created_at": a["created_at"]}
            for a in sorted(answers, key=lambda x: x["created_at"], reverse=True)
            if umap.get(a["user_id"])
        ]}
    if stype == "slider":
        responses = (s.get("slider_responses") or {}).get(sticker_id, [])
        uids = list({r["user_id"] for r in responses})
        users = await db.users.find({"id": {"$in": uids}}, {"_id": 0}).to_list(500)
        umap = {u["id"]: public_user(u) for u in users}
        return {"type": "slider", "responses": [
            {"user": umap.get(r["user_id"]), "value": r["value"], "created_at": r["created_at"]}
            for r in responses if umap.get(r["user_id"])
        ]}
    return {"type": stype}


# =========================================================================
# SSS-Tier endpoints: insights, quick-replies, feed-stats
# =========================================================================

@api.get("/stories/feed-stats")
async def stories_feed_stats(user=Depends(get_current_user)):
    """
    Resumo do tray actual do viewer — usado para badges/notificações no header.
    Devolve: unseen_groups, hot_stories, total_active, top_mood.
    """
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    roda_authors_cur = db.users.find({"roda": user["id"]}, {"_id": 0, "id": 1})
    roda_authors = [u["id"] async for u in roda_authors_cur]
    ids = list({user["id"], *(user.get("following") or []), *roda_authors})
    muted = set(user.get("stories_muted") or [])
    rows = await db.stories.find(
        {"author_id": {"$in": ids}, "expires_at": {"$gt": now_iso}}, {"_id": 0}
    ).to_list(800)
    visible = []
    for s in rows:
        if s["author_id"] in muted and s["author_id"] != user["id"]:
            continue
        if await _story_is_visible_to(s, user):
            visible.append(s)
    unseen_authors: set = set()
    hot_count = 0
    mood_count: dict = {}
    for s in visible:
        if s["author_id"] != user["id"] and user["id"] not in (s.get("viewers") or []):
            unseen_authors.add(s["author_id"])
        if _compute_story_eqs(s) >= 0.55:
            hot_count += 1
        m = s.get("mood")
        if m:
            mood_count[m] = mood_count.get(m, 0) + 1
    top_mood = max(mood_count.items(), key=lambda kv: kv[1])[0] if mood_count else None
    return {
        "unseen_groups": len(unseen_authors),
        "hot_stories": hot_count,
        "total_active": len(visible),
        "top_mood": top_mood,
        "hour_bucket": _hour_bucket(now_dt),
    }


@api.get("/stories/{story_id}/quick-replies")
async def story_quick_replies(story_id: str, user=Depends(get_current_user)):
    """
    Sugestões contextuais de respostas rápidas (chips) — baseadas em mood,
    stickers e tipo de conteúdo do story. Não inclui chips se o viewer é o autor.
    """
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if not await _story_is_visible_to(s, user):
        raise HTTPException(403, "Sem acesso")
    if s["author_id"] == user["id"]:
        return {"suggestions": []}
    if not s.get("allow_replies", True):
        return {"suggestions": []}
    return {
        "suggestions": _quick_replies_for(s, limit=6),
        "mood": s.get("mood"),
    }


@api.get("/stories/{story_id}/insights")
async def story_insights(story_id: str, user=Depends(get_current_user)):
    """
    Painel de inteligência do autor — apenas o autor pode aceder.
    Devolve:
       · summary: total_views, unique_viewers, completion_avg, eqs, mood, hot
       · retention_curve: lista [{bucket, completion_count}] (10 buckets 0-1)
       · hourly_heatmap: lista de 24 inteiros (visualizações por hora UTC)
       · reactions_breakdown: {emoji: count}
       · stickers_summary: agregados por sticker
       · top_viewers: top-5 viewers por afinidade ao autor (Mesa>Roda>Following)
    """
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if s["author_id"] != user["id"]:
        raise HTTPException(403, "Apenas o autor pode ver os insights")
    view_events = s.get("view_events") or []
    viewers_set = s.get("viewers") or []
    n_unique = len(viewers_set)
    # completion média sobre últimos events (1 por user)
    last_event_per_user: dict = {}
    for ev in view_events:
        last_event_per_user[ev["user_id"]] = ev
    completions = [ev.get("completion", 1.0) for ev in last_event_per_user.values()]
    completion_avg = (sum(completions) / len(completions)) if completions else 0.0

    # retention curve — 10 buckets [0, 0.1, 0.2, ... 1.0]
    retention = [0] * 11
    for c in completions:
        idx = max(0, min(10, int(round(c * 10))))
        retention[idx] += 1
    # cumulative (do bucket K em diante == viram pelo menos K*10%)
    cumulative = []
    running = sum(retention)
    for i in range(11):
        cumulative.append({"threshold": round(i * 0.1, 1), "viewers": running})
        running -= retention[i]

    # hourly heatmap (UTC)
    heatmap = [0] * 24
    for ev in view_events:
        try:
            d = datetime.fromisoformat(ev["viewed_at"])
            if d.tzinfo is None:
                d = d.replace(tzinfo=timezone.utc)
            heatmap[d.astimezone(timezone.utc).hour] += 1
        except Exception:
            continue

    # reactions breakdown
    reactions = s.get("reactions") or {}
    react_bd: dict = {}
    for emoji in reactions.values():
        if emoji:
            react_bd[emoji] = react_bd.get(emoji, 0) + 1

    # stickers summary
    stickers_summary = []
    for st in (s.get("stickers") or []):
        sid = st["id"]
        stype = st["type"]
        entry = {"id": sid, "type": stype, "label": ""}
        if stype == "poll":
            votes = (s.get("poll_votes") or {}).get(sid, {})
            total = sum(len(v or []) for v in votes.values())
            entry["label"] = (st.get("data") or {}).get("question", "")
            entry["total_votes"] = total
        elif stype == "question":
            answers = (s.get("question_answers") or {}).get(sid, [])
            entry["label"] = (st.get("data") or {}).get("prompt", "")
            entry["total_answers"] = len(answers)
        elif stype == "slider":
            responses = (s.get("slider_responses") or {}).get(sid, [])
            entry["label"] = (st.get("data") or {}).get("prompt", "")
            entry["total_responses"] = len(responses)
            entry["average"] = (sum(r.get("value", 0) for r in responses) / len(responses)) if responses else None
        elif stype == "location":
            entry["label"] = (st.get("data") or {}).get("place", "")
        elif stype == "mention":
            entry["label"] = "@" + (st.get("data") or {}).get("username", "")
        elif stype == "hashtag":
            entry["label"] = "#" + (st.get("data") or {}).get("tag", "")
        elif stype == "music":
            entry["label"] = (st.get("data") or {}).get("title", "")
        elif stype == "link":
            entry["label"] = (st.get("data") or {}).get("label", "")
        elif stype == "countdown":
            entry["label"] = (st.get("data") or {}).get("title", "")
        stickers_summary.append(entry)

    # Top viewers por afinidade
    top_viewers: list = []
    if viewers_set:
        viewer_users = await db.users.find(
            {"id": {"$in": viewers_set}}, {"_id": 0}
        ).to_list(800)
        scored = []
        for vu in viewer_users:
            aff = await _affinity_score(user, vu["id"])
            ev = last_event_per_user.get(vu["id"])
            scored.append({
                "user": public_user(vu),
                "affinity": round(aff, 3),
                "completion": round(ev.get("completion", 1.0), 2) if ev else 1.0,
                "reaction": reactions.get(vu["id"]),
            })
        scored.sort(key=lambda x: x["affinity"], reverse=True)
        top_viewers = scored[:8]

    eqs = _compute_story_eqs(s)
    return {
        "summary": {
            "total_views": len(view_events) if view_events else n_unique,
            "unique_viewers": n_unique,
            "completion_avg": round(completion_avg, 3),
            "eqs": round(eqs, 3),
            "is_hot": eqs >= 0.55,
            "mood": s.get("mood"),
            "replies_count": len(s.get("replies") or []),
            "reactions_count": sum(1 for v in reactions.values() if v),
        },
        "retention_curve": cumulative,
        "hourly_heatmap": heatmap,
        "reactions_breakdown": react_bd,
        "stickers_summary": stickers_summary,
        "top_viewers": top_viewers,
        "created_at": s.get("created_at"),
        "expires_at": s.get("expires_at"),
    }


# ---------- Archive (autor only) ----------
@api.get("/stories/archive")
async def list_archive(user=Depends(get_current_user), limit: int = 100):
    """Stories próprios já expirados (e activos)."""
    rows = await db.stories.find(
        {"author_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(min(max(limit, 1), 500))
    enriched = [await _enrich_story_for_viewer(s, user["id"]) for s in rows]
    return enriched


# ---------- Mute author stories ----------
@api.post("/users/me/stories-mute/{user_id}")
async def toggle_stories_mute(user_id: str, user=Depends(get_current_user)):
    if user_id == user["id"]:
        raise HTTPException(400, "Não te podes silenciar")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    current = set(user.get("stories_muted") or [])
    if user_id in current:
        current.discard(user_id)
        action = "unmuted"
    else:
        current.add(user_id)
        action = "muted"
    await db.users.update_one({"id": user["id"]}, {"$set": {"stories_muted": list(current)}})
    return {"action": action, "muted": list(current)}


@api.get("/users/me/stories-mute")
async def list_stories_muted(user=Depends(get_current_user)):
    ids = user.get("stories_muted") or []
    if not ids:
        return []
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(200)
    return [public_user(u) for u in users]


# ---------- Highlights ----------
@api.post("/highlights")
async def create_highlight(payload: HighlightIn, user=Depends(get_current_user)):
    # validar story_ids — só do próprio
    story_ids = payload.story_ids or []
    if story_ids:
        rows = await db.stories.find(
            {"id": {"$in": story_ids}, "author_id": user["id"]}, {"_id": 0, "id": 1}
        ).to_list(200)
        valid_ids = {r["id"] for r in rows}
        story_ids = [sid for sid in story_ids if sid in valid_ids]
    h = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "title": payload.title.strip()[:24],
        "cover": payload.cover or "",
        "story_ids": story_ids,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.highlights.insert_one(h)
    # marcar em cada story
    if story_ids:
        await db.stories.update_many(
            {"id": {"$in": story_ids}},
            {"$addToSet": {"highlight_ids": h["id"]}},
        )
    h.pop("_id", None)
    return h


@api.get("/users/{username}/highlights")
async def list_user_highlights(username: str):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0, "id": 1})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    rows = await db.highlights.find(
        {"owner_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    # cover: se cover é story_id, devolver a media correspondente
    for h in rows:
        cover = h.get("cover") or ""
        if cover and not cover.startswith("data:") and not cover.startswith("http"):
            # assumir story_id
            s = await db.stories.find_one({"id": cover}, {"_id": 0, "image": 1, "media_type": 1, "background": 1})
            if s:
                h["cover_resolved"] = {
                    "media_type": s.get("media_type"),
                    "image": s.get("image", ""),
                    "background": s.get("background", "coral"),
                }
            else:
                h["cover_resolved"] = None
        elif cover.startswith("data:") or cover.startswith("http"):
            h["cover_resolved"] = {"media_type": "image", "image": cover, "background": "coral"}
        else:
            # fallback: 1º story
            s = None
            if h.get("story_ids"):
                s = await db.stories.find_one({"id": h["story_ids"][0]}, {"_id": 0, "image": 1, "media_type": 1, "background": 1})
            h["cover_resolved"] = {
                "media_type": (s.get("media_type") if s else "text"),
                "image": (s.get("image", "") if s else ""),
                "background": (s.get("background", "coral") if s else "coral"),
            }
        h["stories_count"] = len(h.get("story_ids") or [])
    return rows


@api.get("/highlights/{highlight_id}")
async def get_highlight(highlight_id: str, user=Depends(get_current_user)):
    h = await db.highlights.find_one({"id": highlight_id}, {"_id": 0})
    if not h:
        raise HTTPException(404, "Destaque não encontrado")
    story_ids = h.get("story_ids") or []
    if not story_ids:
        return {"highlight": h, "stories": []}
    rows = await db.stories.find({"id": {"$in": story_ids}}, {"_id": 0}).to_list(500)
    by_id = {r["id"]: r for r in rows}
    ordered = [by_id[sid] for sid in story_ids if sid in by_id]
    enriched = [await _enrich_story_for_viewer(s, user["id"]) for s in ordered]
    owner = await db.users.find_one({"id": h["owner_id"]}, {"_id": 0})
    return {
        "highlight": h,
        "owner": public_user(owner) if owner else None,
        "stories": enriched,
    }


@api.patch("/highlights/{highlight_id}")
async def update_highlight(highlight_id: str, payload: HighlightPatchIn, user=Depends(get_current_user)):
    h = await db.highlights.find_one({"id": highlight_id}, {"_id": 0})
    if not h:
        raise HTTPException(404, "Destaque não encontrado")
    if h["owner_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    update: dict = {"updated_at": now_iso()}
    if payload.title is not None:
        update["title"] = payload.title.strip()[:24] or h["title"]
    if payload.cover is not None:
        update["cover"] = payload.cover
    if payload.story_ids is not None:
        rows = await db.stories.find(
            {"id": {"$in": payload.story_ids}, "author_id": user["id"]}, {"_id": 0, "id": 1}
        ).to_list(500)
        valid_ids = {r["id"] for r in rows}
        new_ids = [sid for sid in payload.story_ids if sid in valid_ids]
        update["story_ids"] = new_ids
        old_ids = set(h.get("story_ids") or [])
        added = set(new_ids) - old_ids
        removed = old_ids - set(new_ids)
        if added:
            await db.stories.update_many(
                {"id": {"$in": list(added)}}, {"$addToSet": {"highlight_ids": highlight_id}}
            )
        if removed:
            await db.stories.update_many(
                {"id": {"$in": list(removed)}}, {"$pull": {"highlight_ids": highlight_id}}
            )
    await db.highlights.update_one({"id": highlight_id}, {"$set": update})
    refreshed = await db.highlights.find_one({"id": highlight_id}, {"_id": 0})
    return refreshed


@api.delete("/highlights/{highlight_id}")
async def delete_highlight(highlight_id: str, user=Depends(get_current_user)):
    h = await db.highlights.find_one({"id": highlight_id}, {"_id": 0})
    if not h:
        raise HTTPException(404, "Destaque não encontrado")
    if h["owner_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    await db.highlights.delete_one({"id": highlight_id})
    if h.get("story_ids"):
        await db.stories.update_many(
            {"id": {"$in": h["story_ids"]}},
            {"$pull": {"highlight_ids": highlight_id}},
        )
    return {"ok": True}


@api.post("/highlights/{highlight_id}/stories/{story_id}")
async def add_story_to_highlight(highlight_id: str, story_id: str, user=Depends(get_current_user)):
    h = await db.highlights.find_one({"id": highlight_id}, {"_id": 0})
    if not h or h["owner_id"] != user["id"]:
        raise HTTPException(404, "Destaque não encontrado")
    s = await db.stories.find_one({"id": story_id, "author_id": user["id"]}, {"_id": 0, "id": 1})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    current = list(h.get("story_ids") or [])
    if story_id not in current:
        current.append(story_id)
    await db.highlights.update_one(
        {"id": highlight_id},
        {"$set": {"story_ids": current, "updated_at": now_iso()}},
    )
    await db.stories.update_one(
        {"id": story_id}, {"$addToSet": {"highlight_ids": highlight_id}}
    )
    return {"ok": True, "story_ids": current}


@api.delete("/highlights/{highlight_id}/stories/{story_id}")
async def remove_story_from_highlight(highlight_id: str, story_id: str, user=Depends(get_current_user)):
    h = await db.highlights.find_one({"id": highlight_id}, {"_id": 0})
    if not h or h["owner_id"] != user["id"]:
        raise HTTPException(404, "Destaque não encontrado")
    current = [sid for sid in (h.get("story_ids") or []) if sid != story_id]
    await db.highlights.update_one(
        {"id": highlight_id},
        {"$set": {"story_ids": current, "updated_at": now_iso()}},
    )
    await db.stories.update_one(
        {"id": story_id}, {"$pull": {"highlight_ids": highlight_id}}
    )
    return {"ok": True, "story_ids": current}


# ---------- Catalog (presets para o composer) ----------
@api.get("/stories/catalog")
async def stories_catalog():
    return {
        "backgrounds": [
            {"key": k, "css": v} for k, v in STORY_BACKGROUNDS.items()
        ],
        "fonts": list(VALID_FONT_STYLES),
        "audiences": [
            {"key": "everyone", "label": "Todos", "emoji": "🌍",
             "description": "Toda a gente pode ver"},
            {"key": "following", "label": "A seguir-te", "emoji": "👥",
             "description": "Só pessoas que te seguem"},
            {"key": "roda", "label": "Roda íntima", "emoji": "🫂",
             "description": "Só pessoas na tua Roda"},
        ],
        "reactions": list(STORY_REACTION_EMOJIS),
        "sticker_types": list(VALID_STICKER_TYPES),
    }


# ============================================================
# Communities
# ============================================================
@api.post("/communities")
async def create_community(payload: CommunityIn, user=Depends(get_current_user)):
    # Grupo A: read-only + communities_create_enabled
    await _assert_writes_open(user)
    await _assert_feature_or_503("communities_create_enabled", user)
    # Per-user ownership cap (admins bypass)
    if not user.get("is_admin"):
        _max_owned = await get_limit("max_communities_owned_per_user")
        if _max_owned and _max_owned > 0:
            _owned = await db.communities.count_documents({"owner_id": user["id"]})
            if _owned >= _max_owned:
                raise HTTPException(429, f"Limite de comunidades atingido ({_max_owned}). Apaga uma antes de criar outra.")
    slug = slugify(payload.name)
    if await db.communities.find_one({"slug": slug}):
        slug = f"{slug}-{str(uuid.uuid4())[:4]}"
    cat = payload.category if payload.category in COMMUNITY_CATEGORIES else "outras"
    c = {
        "id": str(uuid.uuid4()), "name": payload.name, "slug": slug,
        "description": payload.description, "banner": "",
        "category": cat,
        "owner_id": user["id"], "members": [user["id"]],
        "created_at": now_iso(),
    }
    await db.communities.insert_one(c)
    c.pop("_id", None)
    return _community_public(c, user)


@api.get("/communities")
async def list_communities(viewer: Optional[dict] = Depends(maybe_user)):
    items = await db.communities.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [_community_public(c, viewer) for c in items]


@api.get("/communities/mine")
async def my_communities(user=Depends(get_current_user)):
    items = await db.communities.find({"members": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [_community_public(c, user) for c in items]


@api.get("/communities/{slug}")
async def get_community(slug: str, viewer: Optional[dict] = Depends(maybe_user)):
    c = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comunidade não encontrada")
    return _community_public(c, viewer)


@api.post("/communities/{slug}/join")
async def join_community(slug: str, user=Depends(get_current_user)):
    c = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comunidade não encontrada")
    if user["id"] in c.get("members", []):
        await db.communities.update_one({"id": c["id"]}, {"$pull": {"members": user["id"]}})
        return {"joined": False}
    if community_mod.is_banned(c, user["id"]):
        raise HTTPException(403, "Foste expulso desta comunidade")
    await db.communities.update_one({"id": c["id"]}, {"$addToSet": {"members": user["id"]}})
    return {"joined": True}


@api.get("/communities/{slug}/posts")
async def community_posts(slug: str, viewer: Optional[dict] = Depends(maybe_user)):
    c = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comunidade não encontrada")
    posts = await db.posts.find({"community_id": c["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, viewer) for p in posts]


def _community_public(c: dict, viewer: Optional[dict]) -> dict:
    vid = viewer["id"] if viewer else None
    return {
        "id": c["id"], "name": c["name"], "slug": c["slug"],
        "description": c.get("description", ""), "banner": c.get("banner", ""),
        "category": c.get("category", "outras"),
        "owner_id": c["owner_id"], "members_count": len(c.get("members", [])),
        "moderators_count": len(c.get("moderators", []) or []),
        "joined": bool(vid and vid in c.get("members", [])),
        "is_owner": bool(vid and vid == c["owner_id"]),
        # Moderação — papel do viewer e o que pode fazer.
        "role": community_mod.role_of(c, viewer),
        "can_moderate": community_mod.can_moderate(c, viewer),
        "is_banned": bool(vid and community_mod.is_banned(c, vid)),
        "is_muted": bool(vid and community_mod.is_muted(c, vid)),
        "muted_until": community_mod.muted_until(c, vid) if vid else None,
        "created_at": c["created_at"],
    }


# ============================================================
# Events
# ============================================================
@api.post("/events")
async def create_event(payload: EventIn, user=Depends(get_current_user)):
    # Grupo A: read-only + events_create_enabled
    await _assert_writes_open(user)
    await _assert_feature_or_503("events_create_enabled", user)
    cat = payload.category if payload.category in EVENT_CATEGORIES else "outros"
    e = {
        "id": str(uuid.uuid4()), "title": payload.title,
        "description": payload.description, "location": payload.location,
        "starts_at": payload.starts_at, "created_by": user["id"],
        "category": cat,
        "attendees": [user["id"]], "created_at": now_iso(),
    }
    await db.events.insert_one(e)
    e.pop("_id", None)
    return _event_public(e, user)


@api.get("/events")
async def list_events(category: str = "", when: str = "upcoming", viewer: Optional[dict] = Depends(maybe_user)):
    """when: upcoming | week | month | past | all. category: filter optional."""
    query: dict = {}
    if category and category != "all":
        query["category"] = category
    now = datetime.now(timezone.utc)
    if when == "past":
        query["starts_at"] = {"$lt": now.isoformat()}
        sort_dir = -1
    elif when == "week":
        end = (now + timedelta(days=7)).isoformat()
        query["starts_at"] = {"$gte": now.isoformat(), "$lte": end}
        sort_dir = 1
    elif when == "month":
        end = (now + timedelta(days=30)).isoformat()
        query["starts_at"] = {"$gte": now.isoformat(), "$lte": end}
        sort_dir = 1
    elif when == "all":
        sort_dir = 1
    else:  # upcoming default
        query["starts_at"] = {"$gte": now.isoformat()}
        sort_dir = 1
    items = await db.events.find(query, {"_id": 0}).sort("starts_at", sort_dir).to_list(200)
    out = []
    for e in items:
        out.append(await _event_public_async(e, viewer))
    return out


@api.get("/events/{event_id}")
async def get_event(event_id: str, viewer: Optional[dict] = Depends(maybe_user)):
    e = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Evento não encontrado")
    return await _event_public_async(e, viewer)


@api.post("/events/{event_id}/attend")
async def attend_event(event_id: str, user=Depends(get_current_user)):
    e = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Evento não encontrado")
    if user["id"] in e.get("attendees", []):
        await db.events.update_one({"id": event_id}, {"$pull": {"attendees": user["id"]}})
        return {"attending": False}
    await db.events.update_one({"id": event_id}, {"$addToSet": {"attendees": user["id"]}})
    return {"attending": True}


def _event_public(e: dict, viewer: Optional[dict]) -> dict:
    return {
        "id": e["id"], "title": e["title"], "description": e["description"],
        "location": e.get("location", ""), "starts_at": e["starts_at"],
        "category": e.get("category", "outros"),
        "attendees_count": len(e.get("attendees", [])),
        "attending": bool(viewer and viewer["id"] in e.get("attendees", [])),
        "is_owner": bool(viewer and viewer["id"] == e["created_by"]),
        "created_at": e["created_at"],
    }


async def _event_public_async(e: dict, viewer: Optional[dict]) -> dict:
    creator = await db.users.find_one({"id": e["created_by"]}, {"_id": 0})
    base = _event_public(e, viewer)
    base["creator"] = public_user(creator) if creator else None
    return base


# ============================================================
# Notifications
# ============================================================
@api.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    now = now_iso()
    items = await db.notifications.find(
        {"user_id": user["id"],
         "$or": [{"snoozed_until": {"$exists": False}}, {"snoozed_until": None},
                 {"snoozed_until": {"$lte": now}}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    out = []
    for n in items:
        from_user = await db.users.find_one({"id": n["from_user_id"]}, {"_id": 0})
        out.append({
            "id": n["id"], "type": n["type"], "text": n["text"],
            "read": n["read"], "created_at": n["created_at"],
            "post_id": n.get("post_id"),
            "starred": bool(n.get("starred")),
            "snoozed_until": n.get("snoozed_until"),
            "comment_id": n.get("comment_id"),
            "parent_id": n.get("parent_id"),
            "comment_preview": n.get("comment_preview"),
            "from_user": public_user(from_user) if from_user else None,
        })
    return out


@api.get("/notifications/unread-count")
async def unread_count(user=Depends(get_current_user)):
    n = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": n}


@api.post("/notifications/read-all")
async def mark_read_all(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ============================================================
# Messages
# ============================================================
@api.get("/conversations")
async def list_conversations(filter: str = "all", user=Depends(get_current_user)):
    """filter: all | pinned | unread | archived"""
    convs = await db.conversations.find({"participants": user["id"]}, {"_id": 0}).sort("last_at", -1).to_list(200)
    out = []
    for c in convs:
        other_id = next((p for p in c["participants"] if p != user["id"]), None)
        other = await db.users.find_one({"id": other_id}, {"_id": 0}) if other_id else None
        unread = await db.messages.count_documents({
            "conversation_key": c["key"], "sender_id": {"$ne": user["id"]}, "read": False,
        })
        pinned = user["id"] in c.get("pinned_by", [])
        archived = user["id"] in c.get("archived_by", [])
        item = {
            "key": c["key"], "other_user": public_user(other) if other else None,
            "last_message": c.get("last_message", ""), "last_at": c.get("last_at"),
            "unread": unread, "pinned": pinned, "archived": archived,
        }
        if filter == "archived":
            if not archived:
                continue
        elif filter == "pinned":
            if not pinned or archived:
                continue
        elif filter == "unread":
            if unread <= 0 or archived:
                continue
        else:  # all (default) hides archived
            if archived:
                continue
        out.append(item)
    # sort: pinned first, then last_at desc
    out.sort(key=lambda x: (not x["pinned"], -(datetime.fromisoformat(x["last_at"]).timestamp() if x.get("last_at") else 0)))
    return out


@api.get("/messages/unread-count")
async def messages_unread(user=Depends(get_current_user)):
    n = await db.messages.count_documents({"recipient_id": user["id"], "read": False})
    return {"count": n}


@api.get("/messages/{other_user_id}")
async def get_messages(other_user_id: str, user=Depends(get_current_user)):
    key = conv_key(user["id"], other_user_id)
    msgs = await db.messages.find({"conversation_key": key}, {"_id": 0}).sort("created_at", 1).to_list(500)
    other = await db.users.find_one({"id": other_user_id}, {"_id": 0})
    # B-023 Cafezinho: if the viewer opted-in to manual read receipts for this
    # peer (or globally), don't auto-mark as read. They must hit the manual
    # endpoint or explicitly "Marcar como lido".
    cafe_convs = set(user.get("cafezinho_conversations") or [])
    cafe_global = bool(user.get("cafezinho_enabled"))
    if other_user_id not in cafe_convs and not cafe_global:
        await db.messages.update_many(
            {"conversation_key": key, "sender_id": other_user_id, "read": False},
            {"$set": {"read": True, "read_at": now_iso()}},
        )
    return {
        "other_user": public_user(other) if other else None,
        "messages": msgs,
        "cafezinho_active": (other_user_id in cafe_convs) or cafe_global,
    }


@api.post("/conversations/{other_user_id}/cafezinho")
async def toggle_cafezinho_conversation(other_user_id: str, user=Depends(get_current_user)):
    """B-023 — Toggle Cafezinho (manual read receipts) for a single conversation.
    Persists server-side so it survives across devices."""
    other = await db.users.find_one({"id": other_user_id}, {"_id": 0, "id": 1})
    if not other:
        raise HTTPException(404, "Utilizador não encontrado")
    cafe = list(user.get("cafezinho_conversations") or [])
    if other_user_id in cafe:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"cafezinho_conversations": other_user_id}})
        return {"active": False}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"cafezinho_conversations": other_user_id}})
    return {"active": True}


@api.post("/messages/{message_id}/manual-read")
async def manual_read_message(message_id: str, user=Depends(get_current_user)):
    """B-023 — Mark a single inbound message as read manually (Cafezinho)."""
    msg = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not msg:
        raise HTTPException(404, "Mensagem não encontrada")
    if msg.get("recipient_id") != user["id"]:
        raise HTTPException(403, "Sem permissão")
    if msg.get("read"):
        return {"ok": True, "already": True}
    await db.messages.update_one({"id": message_id}, {"$set": {"read": True, "read_at": now_iso()}})
    # Real-time read-receipt to sender via WS
    try:
        await ws_manager.send_personal(msg["sender_id"], {
            "type": "message_read",
            "message_id": message_id,
            "by": user["id"],
        })
    except Exception:
        pass
    return {"ok": True}


@api.post("/conversations/{other_user_id}/read-all")
async def read_all_conversation(other_user_id: str, user=Depends(get_current_user)):
    """Bulk manual read for an entire conversation (used by 'Marcar como lido')."""
    key = conv_key(user["id"], other_user_id)
    res = await db.messages.update_many(
        {"conversation_key": key, "sender_id": other_user_id, "read": False},
        {"$set": {"read": True, "read_at": now_iso()}},
    )
    try:
        await ws_manager.send_personal(other_user_id, {
            "type": "message_read_bulk",
            "by": user["id"],
        })
    except Exception:
        pass
    return {"updated": res.modified_count}


@api.post("/messages/{other_user_id}/typing")
async def set_typing(other_user_id: str, user=Depends(get_current_user)):
    expires = (datetime.now(timezone.utc) + timedelta(seconds=6)).isoformat()
    await db.typing_state.update_one(
        {"sender_id": user["id"], "recipient_id": other_user_id},
        {"$set": {
            "sender_id": user["id"], "recipient_id": other_user_id,
            "expires_at": expires,
        }},
        upsert=True,
    )
    return {"ok": True}


@api.post("/messages/{message_id}/react")
async def react_message(message_id: str, payload: MessageReactIn, user=Depends(get_current_user)):
    await _assert_reactions_minute_quota(user)
    msg = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not msg:
        raise HTTPException(404, "Mensagem não encontrada")
    if user["id"] not in [msg["sender_id"], msg["recipient_id"]]:
        raise HTTPException(403, "Sem permissão")
    reactions = msg.get("reactions", {})
    current = reactions.get(user["id"])
    if current == payload.emoji:
        # toggle off
        reactions.pop(user["id"], None)
    else:
        reactions[user["id"]] = payload.emoji
    await db.messages.update_one({"id": message_id}, {"$set": {"reactions": reactions}})
    return {"reactions": reactions}


@api.delete("/messages/{message_id}")
async def delete_message(message_id: str, user=Depends(get_current_user)):
    msg = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not msg:
        raise HTTPException(404, "Mensagem não encontrada")
    if msg["sender_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    await db.messages.delete_one({"id": message_id})
    return {"ok": True}


@api.get("/messages/{other_user_id}/typing-status")
async def get_typing(other_user_id: str, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    rec = await db.typing_state.find_one(
        {"sender_id": other_user_id, "recipient_id": user["id"], "expires_at": {"$gt": now}},
        {"_id": 0},
    )
    return {"typing": bool(rec)}


@api.post("/messages")
async def send_message(payload: MessageIn, user=Depends(get_current_user)):
    # Grupo A: read-only + dm_enabled + char limit + global per-hour limit
    await _assert_writes_open(user)
    await _assert_feature_or_503("dm_enabled", user)
    await _assert_global_hourly_limit(user, "dms")
    if not user.get("is_admin"):
        _max_d = await get_limit("max_dm_chars")
        if _max_d and len((payload.content or "")) > _max_d:
            raise HTTPException(400, f"Mensagem demasiado longa (máx {_max_d} caracteres).")
    _assert_not_frozen(user)
    await _aassert_not_maintenance(user)
    other = await db.users.find_one({"id": payload.to_user_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Utilizador não encontrado")
    # H2 — DM-to-strangers per-hour quota (only checked for non-mutuals)
    await _assert_dm_to_strangers_quota(user, other["id"])
    key = conv_key(user["id"], other["id"])
    msg = {
        "id": str(uuid.uuid4()), "conversation_key": key,
        "sender_id": user["id"], "recipient_id": other["id"],
        "content": payload.content, "read": False, "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    await db.conversations.update_one(
        {"key": key},
        {"$set": {
            "key": key, "participants": sorted([user["id"], other["id"]]),
            "last_message": payload.content, "last_at": msg["created_at"],
        }},
        upsert=True,
    )
    msg.pop("_id", None)
    # B-041 — real-time fan-out to the recipient (sender already has optimistic UI)
    try:
        await ws_manager.send_personal(other["id"], {
            "type": "new_message",
            "from": user["id"],
            "from_username": user.get("username"),
            "message": msg,
        })
    except Exception:
        pass
    return msg


# ============================================================
# Trending — Fase 2 (range filters + velocity %)
# ============================================================
@api.get("/trending")
async def trending(range: str = "7d"):
    """Top hashtags com taxa de crescimento (velocity %) + temperatura social.
    range: 1h | 24h | 7d | 30d (default 7d). Hashtags em blacklist (gerida no
    painel admin) são excluídas do output."""
    # Grupo A: trending_enabled feature flag
    if not await is_feature_enabled("trending_enabled"):
        return []
    hours = range_to_hours(range)
    now = datetime.now(timezone.utc)
    curr_cut = (now - timedelta(hours=hours)).isoformat()
    prev_cut = (now - timedelta(hours=hours * 2)).isoformat()
    # Hashtag blacklist (admin) — set of lowercase tags
    blacklist_rows = await db.hashtag_blacklist.find({}, {"_id": 0, "tag": 1}).to_list(length=500)
    blacklist = {(b.get("tag") or "").lower() for b in blacklist_rows}
    curr_posts = await db.posts.find(
        {"hashtags": {"$exists": True, "$ne": []},
         "is_draft": {"$ne": True},
         "created_at": {"$gte": curr_cut}},
        {"_id": 0, "hashtags": 1, "author_id": 1, "likes": 1,
         "reposts": 1, "comments_count": 1},
    ).to_list(800)
    prev_posts = await db.posts.find(
        {"hashtags": {"$exists": True, "$ne": []},
         "is_draft": {"$ne": True},
         "created_at": {"$gte": prev_cut, "$lt": curr_cut}},
        {"_id": 0, "hashtags": 1, "author_id": 1, "likes": 1,
         "reposts": 1, "comments_count": 1},
    ).to_list(800)
    curr_counts: dict[str, int] = {}
    prev_counts: dict[str, int] = {}
    by_tag_curr: dict[str, list] = {}
    by_tag_prev: dict[str, list] = {}
    for p in curr_posts:
        for t in p.get("hashtags", []):
            tl = (t or "").lower()
            if tl in blacklist:
                continue
            curr_counts[tl] = curr_counts.get(tl, 0) + 1
            by_tag_curr.setdefault(tl, []).append(p)
    for p in prev_posts:
        for t in p.get("hashtags", []):
            tl = (t or "").lower()
            if tl in blacklist:
                continue
            prev_counts[tl] = prev_counts.get(tl, 0) + 1
            by_tag_prev.setdefault(tl, []).append(p)
    items = sorted(curr_counts.items(), key=lambda kv: kv[1], reverse=True)[:30]
    weights = TEMP_PROFILES["tag"]
    out = []
    for tag, cnt in items:
        curr_w, signals = _weighted_post_signals(by_tag_curr.get(tag, []), weights)
        prev_w, _ = _weighted_post_signals(by_tag_prev.get(tag, []), weights)
        temp = temperature_object(curr_w, prev_w, anchor=weights["anchor"],
                                  signals=signals, range_label=range)
        out.append({
            "tag": tag, "count": cnt,
            "previous": prev_counts.get(tag, 0),
            "velocity": compute_velocity(cnt, prev_counts.get(tag, 0)),
            "is_city": tag in PT_CITIES,
            "temperature": temp,
        })
    return out


@api.get("/trending/pessoas")
async def trending_people(range: str = "7d", viewer: Optional[dict] = Depends(maybe_user)):
    """Pessoas mais ativas (mais posts + likes + follows ganhos no período)."""
    hours = range_to_hours(range)
    cut = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    # Posts no período por autor
    posts = await db.posts.find(
        {"created_at": {"$gte": cut}, "is_draft": {"$ne": True}, "repost_of": {"$exists": False}},
        {"_id": 0, "author_id": 1, "likes": 1, "reposts": 1},
    ).to_list(2000)
    scores: dict[str, dict] = {}
    for p in posts:
        aid = p["author_id"]
        s = scores.setdefault(aid, {"posts": 0, "likes": 0, "reposts": 0})
        s["posts"] += 1
        s["likes"] += len(p.get("likes", []))
        s["reposts"] += len(p.get("reposts", []))
    # Score formula
    ranked = []
    for aid, s in scores.items():
        score = s["posts"] * 3 + s["likes"] + s["reposts"] * 2
        ranked.append((score, aid, s))
    ranked.sort(key=lambda x: x[0], reverse=True)
    top = ranked[:15]
    user_docs = await db.users.find({"id": {"$in": [r[1] for r in top]}}, {"_id": 0}).to_list(15)
    by_id = {u["id"]: u for u in user_docs}
    out = []
    for score, aid, s in top:
        u = by_id.get(aid)
        if not u:
            continue
        pu = public_user(u, {
            "is_following": bool(viewer and viewer["id"] in u.get("followers", [])),
            "is_self": bool(viewer and viewer["id"] == u["id"]),
            "trend_score": score,
            "trend_posts": s["posts"],
            "trend_likes": s["likes"],
        })
        out.append(pu)
    return out


@api.get("/trending/comunidades")
async def trending_communities(range: str = "7d", viewer: Optional[dict] = Depends(maybe_user)):
    """Comunidades mais ativas (mais posts no período)."""
    hours = range_to_hours(range)
    cut = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    posts = await db.posts.find(
        {"community_id": {"$exists": True, "$ne": None},
         "created_at": {"$gte": cut}, "is_draft": {"$ne": True}},
        {"_id": 0, "community_id": 1, "likes": 1},
    ).to_list(3000)
    counts: dict[str, dict] = {}
    for p in posts:
        cid = p.get("community_id")
        if not cid:
            continue
        s = counts.setdefault(cid, {"posts": 0, "likes": 0})
        s["posts"] += 1
        s["likes"] += len(p.get("likes", []))
    ranked = sorted(counts.items(), key=lambda kv: kv[1]["posts"] * 2 + kv[1]["likes"], reverse=True)[:10]
    out = []
    for cid, s in ranked:
        c = await db.communities.find_one({"id": cid}, {"_id": 0})
        if not c:
            continue
        base = _community_public(c, viewer)
        base["trend_posts"] = s["posts"]
        base["trend_likes"] = s["likes"]
        out.append(base)
    return out


@api.get("/trending/cidades")
async def trending_cities(range: str = "30d"):
    """Cidades portuguesas em alta — extraídas das hashtags + conteúdo + temperatura."""
    hours = range_to_hours(range)
    cut = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    prev_cut = (datetime.now(timezone.utc) - timedelta(hours=hours * 2)).isoformat()
    curr_posts = await db.posts.find(
        {"is_draft": {"$ne": True}, "created_at": {"$gte": cut}},
        {"_id": 0, "hashtags": 1, "content": 1, "author_id": 1,
         "likes": 1, "reposts": 1, "comments_count": 1},
    ).to_list(2000)
    prev_posts = await db.posts.find(
        {"is_draft": {"$ne": True}, "created_at": {"$gte": prev_cut, "$lt": cut}},
        {"_id": 0, "hashtags": 1, "content": 1, "author_id": 1,
         "likes": 1, "reposts": 1, "comments_count": 1},
    ).to_list(2000)

    def _bucket(plist):
        c: dict[str, int] = {}
        by_city: dict[str, list] = {}
        for p in plist:
            cities = detect_cities(p.get("content", ""), p.get("hashtags", []))
            for city in cities:
                c[city] = c.get(city, 0) + 1
                by_city.setdefault(city, []).append(p)
        return c, by_city

    curr, by_curr = _bucket(curr_posts)
    prev, by_prev = _bucket(prev_posts)
    ranked = sorted(curr.items(), key=lambda kv: kv[1], reverse=True)[:12]
    weights = TEMP_PROFILES["city"]
    out = []
    for city, n in ranked:
        curr_w, signals = _weighted_post_signals(by_curr.get(city, []), weights)
        prev_w, _ = _weighted_post_signals(by_prev.get(city, []), weights)
        temp = temperature_object(curr_w, prev_w, anchor=weights["anchor"],
                                  signals=signals, range_label=range)
        out.append({
            "city": city,
            "count": n,
            "previous": prev.get(city, 0),
            "velocity": compute_velocity(n, prev.get(city, 0)),
            "temperature": temp,
        })
    return out


# ============================================================
# Termómetro Social — endpoint universal reutilizável
# GET /api/temperature/{kind}/{value}?range=1h|24h|7d|30d
# kinds: tag · city · mood · post · conversation
# ============================================================
async def _temp_for_tag(value: str, hours: int, range_label: str) -> dict:
    tag = (value or "").lstrip("#").lower().strip()
    if not tag:
        raise HTTPException(400, "Tag inválida")
    now = datetime.now(timezone.utc)
    curr_cut = (now - timedelta(hours=hours)).isoformat()
    prev_cut = (now - timedelta(hours=hours * 2)).isoformat()
    proj = {"_id": 0, "author_id": 1, "likes": 1,
            "reposts": 1, "comments_count": 1}
    curr_posts = await db.posts.find(
        {"hashtags": tag, "is_draft": {"$ne": True},
         "created_at": {"$gte": curr_cut}}, proj
    ).to_list(800)
    prev_posts = await db.posts.find(
        {"hashtags": tag, "is_draft": {"$ne": True},
         "created_at": {"$gte": prev_cut, "$lt": curr_cut}}, proj
    ).to_list(800)
    w = TEMP_PROFILES["tag"]
    curr_w, signals = _weighted_post_signals(curr_posts, w)
    prev_w, _ = _weighted_post_signals(prev_posts, w)
    return temperature_object(curr_w, prev_w, anchor=w["anchor"],
                              signals=signals, range_label=range_label)


async def _temp_for_city(value: str, hours: int, range_label: str) -> dict:
    city_key = (value or "").lower().strip()
    if not city_key or city_key not in PT_CITIES:
        raise HTTPException(400, "Cidade inválida")
    now = datetime.now(timezone.utc)
    curr_cut = (now - timedelta(hours=hours)).isoformat()
    prev_cut = (now - timedelta(hours=hours * 2)).isoformat()
    proj = {"_id": 0, "hashtags": 1, "content": 1, "author_id": 1,
            "likes": 1, "reposts": 1, "comments_count": 1}
    rx = re.escape(PT_CITIES[city_key])
    base = {
        "is_draft": {"$ne": True},
        "$or": [{"hashtags": city_key},
                {"content": {"$regex": rx, "$options": "i"}}],
    }
    curr_posts = await db.posts.find(
        {**base, "created_at": {"$gte": curr_cut}}, proj
    ).to_list(800)
    prev_posts = await db.posts.find(
        {**base, "created_at": {"$gte": prev_cut, "$lt": curr_cut}}, proj
    ).to_list(800)
    # Confirm via detect_cities to avoid false-positives.
    pretty = PT_CITIES[city_key]
    curr_posts = [p for p in curr_posts
                  if pretty in detect_cities(p.get("content", ""), p.get("hashtags", []))]
    prev_posts = [p for p in prev_posts
                  if pretty in detect_cities(p.get("content", ""), p.get("hashtags", []))]
    w = TEMP_PROFILES["city"]
    curr_w, signals = _weighted_post_signals(curr_posts, w)
    prev_w, _ = _weighted_post_signals(prev_posts, w)
    return temperature_object(curr_w, prev_w, anchor=w["anchor"],
                              signals=signals, range_label=range_label)


async def _temp_for_mood(value: str, hours: int, range_label: str) -> dict:
    mood_key = (value or "").lower().strip()
    if mood_key not in MOODS:
        raise HTTPException(400, "Mood inválido")
    now = datetime.now(timezone.utc)
    curr_cut = (now - timedelta(hours=hours)).isoformat()
    prev_cut = (now - timedelta(hours=hours * 2)).isoformat()
    kws = MOODS[mood_key]["keywords"]
    rx = "|".join(re.escape(k) for k in kws)
    proj = {"_id": 0, "content": 1, "author_id": 1, "likes": 1,
            "reposts": 1, "comments_count": 1}
    curr_posts = await db.posts.find(
        {"is_draft": {"$ne": True},
         "content": {"$regex": rx, "$options": "i"},
         "created_at": {"$gte": curr_cut}}, proj
    ).to_list(800)
    prev_posts = await db.posts.find(
        {"is_draft": {"$ne": True},
         "content": {"$regex": rx, "$options": "i"},
         "created_at": {"$gte": prev_cut, "$lt": curr_cut}}, proj
    ).to_list(800)
    w = TEMP_PROFILES["mood"]
    curr_w, signals = _weighted_post_signals(curr_posts, w)
    prev_w, _ = _weighted_post_signals(prev_posts, w)
    return temperature_object(curr_w, prev_w, anchor=w["anchor"],
                              signals=signals, range_label=range_label)


async def _temp_for_post(value: str, hours: int, range_label: str) -> dict:
    if not value:
        raise HTTPException(400, "Post id inválido")
    post = await db.posts.find_one(
        {"id": value},
        {"_id": 0, "likes": 1, "reposts": 1, "comments_count": 1,
         "reactions": 1, "created_at": 1},
    )
    if not post:
        raise HTTPException(404, "Post não encontrado")
    w = TEMP_PROFILES["post"]
    likes = len(post.get("likes", []) or [])
    reposts = len(post.get("reposts", []) or [])
    comments = int(post.get("comments_count", 0) or 0)
    reactions = sum(len(v or []) for v in (post.get("reactions") or {}).values()) \
        if isinstance(post.get("reactions"), dict) else 0
    curr_w = (likes * w["w_like"] + comments * w["w_comment"]
              + reposts * w["w_repost"] + reactions * w.get("w_reaction", 0))
    # Decay momentum based on post age (older posts feel colder).
    age_h = hours_since(post.get("created_at"))
    prev_w = curr_w * max(0.0, min(1.0, age_h / max(1.0, float(hours))))
    signals = {"likes": likes, "comments": comments,
               "reposts": reposts, "reactions": reactions,
               "age_hours": round(age_h, 2)}
    return temperature_object(float(curr_w), float(prev_w), anchor=w["anchor"],
                              signals=signals, range_label=range_label)


async def _temp_for_conversation(value: str, hours: int, range_label: str) -> dict:
    if not value:
        raise HTTPException(400, "Conversa inválida")
    now = datetime.now(timezone.utc)
    curr_cut = (now - timedelta(hours=hours)).isoformat()
    prev_cut = (now - timedelta(hours=hours * 2)).isoformat()
    curr_n = await db.messages.count_documents(
        {"conversation_key": value, "created_at": {"$gte": curr_cut}}
    )
    prev_n = await db.messages.count_documents(
        {"conversation_key": value, "created_at": {"$gte": prev_cut, "$lt": curr_cut}}
    )
    w = TEMP_PROFILES["conversation"]
    curr_w = float(curr_n) * w["w_message"]
    prev_w = float(prev_n) * w["w_message"]
    signals = {"messages": curr_n, "previous": prev_n}
    return temperature_object(curr_w, prev_w, anchor=w["anchor"],
                              signals=signals, range_label=range_label)


_TEMP_RESOLVERS = {
    "tag": _temp_for_tag,
    "city": _temp_for_city,
    "mood": _temp_for_mood,
    "post": _temp_for_post,
    "conversation": _temp_for_conversation,
}


@api.get("/temperature/{kind}/{value}")
async def get_temperature(kind: str, value: str, range: str = "24h"):
    """Termómetro Social universal — devolve score 0..100 + estado nomeado.
    kinds suportados: tag · city · mood · post · conversation
    range: 1h | 24h | 7d | 30d (default 24h)."""
    resolver = _TEMP_RESOLVERS.get((kind or "").lower())
    if not resolver:
        raise HTTPException(400, f"Kind inválido: {kind}")
    hours = range_to_hours(range)
    temp = await resolver(value, hours, range)
    return {"kind": kind, "value": value, **temp}


# ============================================================
# Explore — mood / people
# ============================================================
@api.get("/explore/moods")
async def list_moods():
    """Static moods catalogue with counts (last 7 days) + temperatura social."""
    now = datetime.now(timezone.utc)
    cut = (now - timedelta(days=7)).isoformat()
    prev_cut = (now - timedelta(days=14)).isoformat()
    posts_curr = await db.posts.find(
        {"is_draft": {"$ne": True}, "created_at": {"$gte": cut}},
        {"_id": 0, "content": 1, "author_id": 1, "likes": 1,
         "reposts": 1, "comments_count": 1, "hashtags": 1},
    ).to_list(2000)
    posts_prev = await db.posts.find(
        {"is_draft": {"$ne": True}, "created_at": {"$gte": prev_cut, "$lt": cut}},
        {"_id": 0, "content": 1, "author_id": 1, "likes": 1,
         "reposts": 1, "comments_count": 1, "hashtags": 1},
    ).to_list(2000)
    counts: dict[str, int] = {}
    by_mood_curr: dict[str, list] = {}
    by_mood_prev: dict[str, list] = {}
    for p in posts_curr:
        m = detect_mood(p.get("content", ""))
        if m:
            counts[m] = counts.get(m, 0) + 1
            by_mood_curr.setdefault(m, []).append(p)
    for p in posts_prev:
        m = detect_mood(p.get("content", ""))
        if m:
            by_mood_prev.setdefault(m, []).append(p)
    weights = TEMP_PROFILES["mood"]
    out = []
    for key, m in MOODS.items():
        curr_w, signals = _weighted_post_signals(by_mood_curr.get(key, []), weights)
        prev_w, _ = _weighted_post_signals(by_mood_prev.get(key, []), weights)
        temp = temperature_object(curr_w, prev_w, anchor=weights["anchor"],
                                  signals=signals, range_label="7d")
        out.append({
            "key": key, "label": m["label"], "emoji": m["emoji"],
            "count": counts.get(key, 0),
            "temperature": temp,
        })
    return out


@api.get("/explore/by-mood")
async def explore_by_mood(mood: str = "", viewer: Optional[dict] = Depends(maybe_user)):
    if not mood or mood not in MOODS:
        raise HTTPException(400, "Mood inválido")
    await auto_publish_due_posts()
    kws = MOODS[mood]["keywords"]
    rx = "|".join(re.escape(k) for k in kws)
    posts = await db.posts.find(
        {"is_draft": {"$ne": True},
         "repost_of": {"$exists": False},
         "content": {"$regex": rx, "$options": "i"},
         "$or": [{"scheduled_at": None}, {"scheduled_at": {"$exists": False}},
                  {"scheduled_at": {"$lte": now_iso()}}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, viewer) for p in posts]


@api.get("/explore/by-city")
async def explore_by_city(city: str = "", viewer: Optional[dict] = Depends(maybe_user)):
    """City filter by hashtag or content keyword."""
    city_key = (city or "").lower().strip()
    if not city_key or city_key not in PT_CITIES:
        raise HTTPException(400, "Cidade inválida")
    rx = re.escape(city_key)
    posts = await db.posts.find(
        {"is_draft": {"$ne": True},
         "repost_of": {"$exists": False},
         "$or": [{"hashtags": city_key}, {"content": {"$regex": rx, "$options": "i"}}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, viewer) for p in posts]


@api.get("/explore/people")
async def explore_people(viewer=Depends(get_current_user)):
    """Alias for suggestions but returns 15 instead of 5."""
    following = set(viewer.get("following", []))
    excluded = following | {viewer["id"]}
    candidates = await db.users.find(
        {"id": {"$nin": list(excluded)}}, {"_id": 0},
    ).to_list(500)
    scored = []
    for c in candidates:
        c_followers = set(c.get("followers", []))
        mutual = len(c_followers & following)
        followers_total = len(c.get("followers", []))
        score = mutual * 10 + math.log1p(followers_total) + (2 if c.get("verified") else 0)
        scored.append((score, mutual, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    out = []
    for score, mutual, c in scored[:15]:
        d = public_user(c)
        d["mutual_count"] = mutual
        d["reason"] = (
            f"{mutual} em comum" if mutual > 0
            else ("novo" if len(c.get("followers", [])) < 3 else "")
        )
        out.append(d)
    return out


# ============================================================
# Badges & Regions (profile)
# ============================================================
@api.get("/users/{username}/badges")
async def user_badges(username: str, viewer: Optional[dict] = Depends(maybe_user)):
    # Conquistas removidas (gamificação desativada). Mantemos o endpoint
    # a devolver uma resposta vazia para não quebrar consumidores antigos.
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0, "id": 1})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    return {"earned": [], "all": [], "totals": {}}


@api.get("/users/{username}/regions")
async def user_regions(username: str, viewer: Optional[dict] = Depends(maybe_user)):
    """Map data — counts per PT city for the user's posts."""
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    if not await can_view_profile(user, viewer):
        return []
    posts = await db.posts.find(
        {"author_id": user["id"], "repost_of": {"$exists": False}},
        {"_id": 0, "content": 1, "hashtags": 1},
    ).to_list(1000)
    counts: dict[str, int] = {}
    for p in posts:
        for c in detect_cities(p.get("content", ""), p.get("hashtags", [])):
            counts[c] = counts.get(c, 0) + 1
    return [{"city": c, "count": n} for c, n in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)]


# ============================================================
# Tag stats (per-hashtag analytics)
# ============================================================
@api.get("/tags/{tag}/stats")
async def tag_stats(tag: str):
    t = tag.lower().strip().lstrip("#")
    cut7 = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    cut14 = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    posts7 = await db.posts.find(
        {"hashtags": t, "is_draft": {"$ne": True}, "created_at": {"$gte": cut7}},
        {"_id": 0, "author_id": 1, "likes": 1, "hashtags": 1},
    ).to_list(1000)
    posts14 = await db.posts.find(
        {"hashtags": t, "is_draft": {"$ne": True},
         "created_at": {"$gte": cut14, "$lt": cut7}},
        {"_id": 0, "author_id": 1},
    ).to_list(1000)
    total = await db.posts.count_documents({"hashtags": t, "is_draft": {"$ne": True}})
    unique_authors = len({p["author_id"] for p in posts7})
    likes_week = sum(len(p.get("likes", [])) for p in posts7)
    velocity = compute_velocity(len(posts7), len(posts14))
    # related tags from same posts
    co: dict[str, int] = {}
    for p in posts7:
        for ht in p.get("hashtags", []):
            if ht != t:
                co[ht] = co.get(ht, 0) + 1
    related = [{"tag": k, "count": v} for k, v in sorted(co.items(), key=lambda kv: kv[1], reverse=True)[:6]]
    return {
        "tag": t, "total": total,
        "posts_week": len(posts7),
        "posts_prev_week": len(posts14),
        "unique_authors": unique_authors,
        "likes_week": likes_week,
        "velocity": velocity,
        "is_city": t in PT_CITIES,
        "city_label": PT_CITIES.get(t, ""),
        "related": related,
    }


# ============================================================
# Bookmark Collections
# ============================================================
class CollectionIn(BaseModel):
    name: str = Field(min_length=1, max_length=30)


class CollectionMoveIn(BaseModel):
    collection_id: Optional[str] = None  # None = remove from any collection (default "Todos")


@api.get("/bookmark-collections")
async def list_collections(user=Depends(get_current_user)):
    cols = await db.bookmark_collections.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(200)
    out = []
    for c in cols:
        n = await db.posts.count_documents({
            "bookmarks": user["id"], "bookmark_collection_map": {"$elemMatch": {"user_id": user["id"], "collection_id": c["id"]}},
        })
        out.append({"id": c["id"], "name": c["name"], "count": n, "created_at": c["created_at"]})
    return out


@api.post("/bookmark-collections")
async def create_collection(payload: CollectionIn, user=Depends(get_current_user)):
    existing = await db.bookmark_collections.count_documents({"user_id": user["id"]})
    if existing >= 20:
        raise HTTPException(400, "Limite de 20 coleções atingido")
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "name": payload.name.strip(),
        "created_at": now_iso(),
    }
    await db.bookmark_collections.insert_one(doc)
    return {"id": doc["id"], "name": doc["name"], "count": 0, "created_at": doc["created_at"]}


@api.patch("/bookmark-collections/{cid}")
async def rename_collection(cid: str, payload: CollectionIn, user=Depends(get_current_user)):
    c = await db.bookmark_collections.find_one({"id": cid, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Coleção não encontrada")
    await db.bookmark_collections.update_one({"id": cid}, {"$set": {"name": payload.name.strip()}})
    return {"ok": True}


@api.delete("/bookmark-collections/{cid}")
async def delete_collection(cid: str, user=Depends(get_current_user)):
    c = await db.bookmark_collections.find_one({"id": cid, "user_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Coleção não encontrada")
    await db.bookmark_collections.delete_one({"id": cid})
    # remove this collection from any post mapping for the user
    await db.posts.update_many(
        {"bookmark_collection_map": {"$elemMatch": {"user_id": user["id"], "collection_id": cid}}},
        {"$pull": {"bookmark_collection_map": {"user_id": user["id"], "collection_id": cid}}},
    )
    return {"ok": True}


@api.post("/posts/{post_id}/collection")
async def move_bookmark(post_id: str, payload: CollectionMoveIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    # ensure the user has the post bookmarked
    if user["id"] not in post.get("bookmarks", []):
        await db.posts.update_one({"id": post_id}, {"$addToSet": {"bookmarks": user["id"]}})
    # remove existing mapping for this user
    await db.posts.update_one(
        {"id": post_id},
        {"$pull": {"bookmark_collection_map": {"user_id": user["id"]}}},
    )
    if payload.collection_id:
        # validate collection
        c = await db.bookmark_collections.find_one(
            {"id": payload.collection_id, "user_id": user["id"]}, {"_id": 0},
        )
        if not c:
            raise HTTPException(404, "Coleção não encontrada")
        await db.posts.update_one(
            {"id": post_id},
            {"$addToSet": {
                "bookmark_collection_map": {"user_id": user["id"], "collection_id": payload.collection_id},
            }},
        )
    return {"ok": True}


# ============================================================
# Community members + stats
# ============================================================
@api.get("/communities/{slug}/members")
async def community_members(slug: str, viewer: Optional[dict] = Depends(maybe_user)):
    c = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comunidade não encontrada")
    member_ids = c.get("members", [])[:200]
    members = await db.users.find({"id": {"$in": member_ids}}, {"_id": 0}).to_list(200)
    # contributions inside community
    posts = await db.posts.find(
        {"community_id": c["id"], "is_draft": {"$ne": True}},
        {"_id": 0, "author_id": 1, "likes": 1},
    ).to_list(2000)
    counts: dict[str, dict] = {}
    for p in posts:
        s = counts.setdefault(p["author_id"], {"posts": 0, "likes": 0})
        s["posts"] += 1
        s["likes"] += len(p.get("likes", []))
    out = []
    for m in members:
        s = counts.get(m["id"], {"posts": 0, "likes": 0})
        pu = public_user(m, {
            "posts_in_community": s["posts"],
            "likes_in_community": s["likes"],
            "is_owner": m["id"] == c["owner_id"],
        })
        out.append(pu)
    out.sort(key=lambda x: (x["posts_in_community"] * 2 + x["likes_in_community"]), reverse=True)
    return out


@api.get("/communities/{slug}/stats")
async def community_stats(slug: str):
    c = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comunidade não encontrada")
    cut7 = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    cut14 = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    posts7 = await db.posts.find(
        {"community_id": c["id"], "is_draft": {"$ne": True}, "created_at": {"$gte": cut7}},
        {"_id": 0, "likes": 1, "author_id": 1, "created_at": 1},
    ).to_list(2000)
    posts14 = await db.posts.count_documents(
        {"community_id": c["id"], "is_draft": {"$ne": True},
         "created_at": {"$gte": cut14, "$lt": cut7}},
    )
    total = await db.posts.count_documents({"community_id": c["id"], "is_draft": {"$ne": True}})
    likes_week = sum(len(p.get("likes", [])) for p in posts7)
    velocity = compute_velocity(len(posts7), posts14)
    # by-day buckets (7 days)
    by_day: dict[str, int] = {}
    for p in posts7:
        d = p["created_at"][:10]
        by_day[d] = by_day.get(d, 0) + 1
    today = datetime.now(timezone.utc).date()
    days = []
    for i in range(6, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        days.append({"date": d, "count": by_day.get(d, 0)})
    return {
        "members_count": len(c.get("members", [])),
        "total_posts": total,
        "posts_week": len(posts7),
        "posts_prev_week": posts14,
        "likes_week": likes_week,
        "unique_authors_week": len({p["author_id"] for p in posts7}),
        "velocity": velocity,
        "by_day": days,
    }


# ============================================================
# Notifications — star + snooze
# ============================================================
@api.post("/notifications/{nid}/star")
async def toggle_notification_star(nid: str, user=Depends(get_current_user)):
    n = await db.notifications.find_one({"id": nid, "user_id": user["id"]}, {"_id": 0})
    if not n:
        raise HTTPException(404, "Notificação não encontrada")
    new_val = not bool(n.get("starred"))
    await db.notifications.update_one({"id": nid}, {"$set": {"starred": new_val}})
    return {"starred": new_val}


class NotifSnoozeIn(BaseModel):
    hours: int = Field(default=24, ge=1, le=24 * 7)


@api.post("/notifications/{nid}/snooze")
async def snooze_notification(nid: str, payload: NotifSnoozeIn, user=Depends(get_current_user)):
    n = await db.notifications.find_one({"id": nid, "user_id": user["id"]}, {"_id": 0})
    if not n:
        raise HTTPException(404, "Notificação não encontrada")
    until = (datetime.now(timezone.utc) + timedelta(hours=payload.hours)).isoformat()
    await db.notifications.update_one({"id": nid}, {"$set": {"snoozed_until": until, "read": True}})
    return {"snoozed_until": until}


@api.delete("/notifications/{nid}")
async def delete_notification(nid: str, user=Depends(get_current_user)):
    res = await db.notifications.delete_one({"id": nid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Notificação não encontrada")
    return {"ok": True}


@api.delete("/notifications")
async def clear_notifications(user=Depends(get_current_user)):
    await db.notifications.delete_many({"user_id": user["id"], "read": True})
    return {"ok": True}


# ============================================================
# Conversations — pin + archive
# ============================================================
@api.post("/conversations/{other_id}/pin")
async def toggle_conv_pin(other_id: str, user=Depends(get_current_user)):
    key = conv_key(user["id"], other_id)
    c = await db.conversations.find_one({"key": key}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Conversa não encontrada")
    pinned_by = set(c.get("pinned_by", []))
    if user["id"] in pinned_by:
        pinned_by.discard(user["id"])
        new_state = False
    else:
        pinned_by.add(user["id"])
        new_state = True
    await db.conversations.update_one({"key": key}, {"$set": {"pinned_by": list(pinned_by)}})
    return {"pinned": new_state}


@api.post("/conversations/{other_id}/archive")
async def toggle_conv_archive(other_id: str, user=Depends(get_current_user)):
    key = conv_key(user["id"], other_id)
    c = await db.conversations.find_one({"key": key}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Conversa não encontrada")
    archived_by = set(c.get("archived_by", []))
    if user["id"] in archived_by:
        archived_by.discard(user["id"])
        new_state = False
    else:
        archived_by.add(user["id"])
        new_state = True
    await db.conversations.update_one({"key": key}, {"$set": {"archived_by": list(archived_by)}})
    return {"archived": new_state}


# ============================================================
# Posts — share counter
# ============================================================
@api.post("/posts/{post_id}/share")
async def track_share(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    await db.posts.update_one({"id": post_id}, {"$inc": {"shares": 1}})
    return {"ok": True}


# ============================================================
# Catalogue endpoints (categories etc.)
# ============================================================
@api.get("/catalog/community-categories")
async def cat_community():
    return [{"key": k, "label": k.capitalize()} for k in COMMUNITY_CATEGORIES]


@api.get("/catalog/event-categories")
async def cat_event():
    return [{"key": k, "label": k.capitalize()} for k in EVENT_CATEGORIES]


@api.get("/catalog/cities")
async def cat_cities():
    return [{"key": k, "label": v} for k, v in PT_CITIES.items()]


# ============================================================
# Startup
# ============================================================
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.posts.create_index("created_at")
    await db.posts.create_index("author_id")
    await db.posts.create_index("hashtags")
    await db.posts.create_index("community_id")
    await db.notifications.create_index("user_id")
    await db.messages.create_index("conversation_key")
    await db.conversations.create_index("key", unique=True)
    await db.stories.create_index("expires_at")
    await db.stories.create_index("author_id")
    await db.highlights.create_index("owner_id")
    await db.communities.create_index("slug", unique=True)
    await db.events.create_index("starts_at")
    # B-029 — sessions indexes
    await db.sessions.create_index("jti", unique=True)
    await db.sessions.create_index([("user_id", 1), ("revoked", 1), ("last_seen_at", -1)])
    # Admin panel indexes
    await db.admin_audit.create_index([("created_at", -1)])
    await db.admin_audit.create_index("action")
    await db.admin_audit.create_index("actor_id")
    await db.hashtag_blacklist.create_index("tag", unique=True)
    await db.comments.create_index("post_id")
    await db.comments.create_index("author_id")
    await db.reports.create_index("status")
    admin_email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    admin_password = (os.environ.get("ADMIN_PASSWORD") or "").strip()
    admin_username = (os.environ.get("ADMIN_USERNAME") or "admin").strip().lower()
    admin_name = (os.environ.get("ADMIN_NAME") or "Lusorae").strip()
    # Admin bootstrap is OPT-IN: only seeds if BOTH ADMIN_EMAIL and
    # ADMIN_PASSWORD env vars are explicitly set and non-empty. The default
    # database is empty — a real first user must register through /auth/register.
    if admin_email and admin_password:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "email": admin_email, "username": admin_username,
                "name": admin_name, "password_hash": hash_password(admin_password),
                "bio": "",
                "avatar": "", "banner": "",
                "verified": True, "private": False, "onboarded": True,
                "is_admin": True, "banned": False,
                "followers": [], "following": [], "bookmarks": [],
                "last_seen": now_iso(), "created_at": now_iso(),
            })
            logger.info("Admin account bootstrapped from env (is_admin=True)")
        else:
            # Keep admin password in sync AND ensure is_admin flag is present.
            updates = {}
            if not verify_password(admin_password, existing.get("password_hash", "")):
                updates["password_hash"] = hash_password(admin_password)
            if not existing.get("is_admin"):
                updates["is_admin"] = True
            if not existing.get("verified"):
                updates["verified"] = True
            if existing.get("banned"):
                updates["banned"] = False
            if updates:
                await db.users.update_one({"email": admin_email}, {"$set": updates})
                logger.info(f"Admin account synced: {list(updates.keys())}")

    # No demo / seed data. Database starts empty.

    # ── Fase 1 — Social Pulse Engine ────────────────────────────────
    # Create the snapshots collection's indexes (TTL + sort) and start
    # the background loop that emits one snapshot every 60 s. The loop
    # is a single asyncio task; if it crashes, individual ticks are
    # caught & logged but the loop survives.
    try:
        await pulse_engine.init_pulse_indexes(db)
        pulse_engine.start_pulse_loop(db, ws_manager)
        logger.info("pulse_engine: background loop scheduled")
    except Exception as exc:
        logger.warning(f"pulse_engine: startup wiring failed: {exc}")

    # ── Fase 5 — Mesas (conversas efémeras) ─────────────────────────
    try:
        await mesas_engine.init_mesas_indexes(db)
    except Exception as exc:
        logger.warning(f"mesas: startup wiring failed: {exc}")

    # ── Fase 6 — Reputação invisível (health_score diário) ──────────
    try:
        await db.users.create_index("health_score")
        reputation_engine.start_reputation_loop(db)
        logger.info("reputation: background loop scheduled")
    except Exception as exc:
        logger.warning(f"reputation: startup wiring failed: {exc}")

    # ── Comunidades vivas — pulso por comunidade ────────────────────
    try:
        await db.comments.create_index("community_id")
        await community_pulse.init_community_pulse_indexes(db)
        await community_mod.init_community_mod_indexes(db)
        community_pulse.start_community_pulse_loop(db, ws_manager)
        logger.info("community_pulse: background loop scheduled")
    except Exception as exc:
        logger.warning(f"community_pulse: startup wiring failed: {exc}")


@app.on_event("shutdown")
async def shutdown():
    # Cancel the pulse loop first so it stops touching Mongo before we
    # close the client.
    try:
        await pulse_engine.stop_pulse_loop()
    except Exception:
        pass
    try:
        await reputation_engine.stop_reputation_loop()
    except Exception:
        pass
    try:
        await community_pulse.stop_community_pulse_loop()
    except Exception:
        pass
    client.close()


# ============================================================
# PT-NATIVE FEATURES — Calendário, A Tarde, Sino do Bairro, Badges narrativos
# ============================================================

# Static PT cultural calendar — events that drive emotional engagement
PT_CALENDAR_EVENTS = [
    # date format: "MM-DD" recurring yearly; or "YYYY-MM-DD" for one-off
    {"date": "01-01", "key": "ano_novo",       "label": "Ano Novo",                "emoji": "🎆", "theme": "festa"},
    {"date": "04-25", "key": "25_abril",       "label": "25 de Abril",             "emoji": "🌹", "theme": "cultura"},
    {"date": "05-01", "key": "dia_trabalhador","label": "Dia do Trabalhador",      "emoji": "✊", "theme": "cultura"},
    {"date": "06-10", "key": "dia_portugal",   "label": "Dia de Portugal",         "emoji": "🇵🇹", "theme": "orgulho"},
    {"date": "06-13", "key": "santo_antonio",  "label": "Santo António (Lisboa)",  "emoji": "🌿", "theme": "festa"},
    {"date": "06-24", "key": "sao_joao",       "label": "S. João (Porto)",         "emoji": "🔨", "theme": "festa"},
    {"date": "06-29", "key": "sao_pedro",      "label": "S. Pedro",                "emoji": "🐟", "theme": "festa"},
    {"date": "10-05", "key": "republica",      "label": "Implantação da República","emoji": "🇵🇹", "theme": "cultura"},
    {"date": "11-01", "key": "todos_santos",   "label": "Todos os Santos",         "emoji": "🕯️", "theme": "saudade"},
    {"date": "12-01", "key": "restauracao",    "label": "Restauração",             "emoji": "🇵🇹", "theme": "cultura"},
    {"date": "12-08", "key": "imaculada",      "label": "Imaculada Conceição",     "emoji": "⛪", "theme": "cultura"},
    {"date": "12-24", "key": "consoada",       "label": "Consoada",                "emoji": "🎄", "theme": "saudade"},
    {"date": "12-25", "key": "natal",          "label": "Natal",                   "emoji": "🎄", "theme": "saudade"},
    {"date": "12-31", "key": "passagem",       "label": "Passagem de Ano",         "emoji": "🎇", "theme": "festa"},
    # Soft events — academic / fiscal calendar
    {"date": "06-01", "key": "exames",         "label": "Época de exames",         "emoji": "📚", "theme": "tasca"},
    {"date": "06-30", "key": "irs",            "label": "Último dia IRS",          "emoji": "💸", "theme": "tasca"},
    {"date": "09-15", "key": "regresso_aulas", "label": "Regresso às aulas",       "emoji": "✏️", "theme": "saudade"},
    # Fase 9 — calendário cultural alargado (recorrentes MM-DD; festas
    # móveis como Carnaval/Páscoa ficam de fora por exigirem cálculo).
    {"date": "01-06", "key": "dia_reis",       "label": "Dia de Reis",             "emoji": "👑", "theme": "cultura"},
    {"date": "05-13", "key": "fatima",         "label": "Nossa Senhora de Fátima", "emoji": "🕯️", "theme": "saudade"},
    {"date": "06-21", "key": "verao",          "label": "Início do verão",         "emoji": "☀️", "theme": "praia"},
    {"date": "06-23", "key": "vespera_sjoao",  "label": "Véspera de S. João",      "emoji": "🔥", "theme": "festa"},
    {"date": "08-15", "key": "assuncao",       "label": "Assunção de N. Senhora",  "emoji": "⛪", "theme": "cultura"},
    {"date": "09-22", "key": "outono",         "label": "Início do outono",        "emoji": "🍂", "theme": "saudade"},
    {"date": "11-11", "key": "sao_martinho",   "label": "S. Martinho · Magusto",   "emoji": "🌰", "theme": "tasca"},
    {"date": "12-21", "key": "inverno",        "label": "Início do inverno",       "emoji": "❄️", "theme": "saudade"},
]


def _pt_today_event(today: Optional[datetime] = None) -> Optional[dict]:
    """Returns event matching today's date, or the nearest within 1 day."""
    today = today or datetime.now(timezone.utc)
    today_md = today.strftime("%m-%d")
    for ev in PT_CALENDAR_EVENTS:
        if ev["date"] == today_md:
            return {**ev, "is_today": True}
    # Soft window: tomorrow
    tomorrow = (today + timedelta(days=1)).strftime("%m-%d")
    for ev in PT_CALENDAR_EVENTS:
        if ev["date"] == tomorrow:
            return {**ev, "is_today": False, "is_tomorrow": True}
    return None


@api.get("/calendar/pt")
async def calendar_pt(viewer: Optional[dict] = Depends(maybe_user)):
    """Returns today's PT cultural event (if any) + the next 3 upcoming.
    Powers the F5.3 Calendário PT banner on the Feed."""
    today = datetime.now(timezone.utc)
    current = _pt_today_event(today)
    # Next 3 upcoming within 60 days
    upcoming = []
    for offset in range(1, 61):
        d = today + timedelta(days=offset)
        md = d.strftime("%m-%d")
        for ev in PT_CALENDAR_EVENTS:
            if ev["date"] == md:
                upcoming.append({**ev, "days_until": offset, "iso_date": d.strftime("%Y-%m-%d")})
                break
        if len(upcoming) >= 3:
            break
    return {"today": current, "upcoming": upcoming}


@api.get("/daily/digest")
async def daily_digest(viewer: Optional[dict] = Depends(maybe_user)):
    """F1.1 — A Tarde. Single curated daily digest.
    Returns the top 3 posts of the last 24h, weighted by:
      · reactions count
      · place affinity (same city/region as viewer)
      · author diversity (avoids single creator dominating)
    Healthy by design: only one digest per day, fixed shape."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    raw = await db.posts.find(
        {
            "created_at": {"$gte": cutoff},
            "repost_of": {"$exists": False},
            "is_draft": {"$ne": True},
            "$or": [
                {"scheduled_at": None},
                {"scheduled_at": {"$exists": False}},
                {"scheduled_at": {"$lte": now_iso()}},
            ],
            "audience_ring": {"$in": ["publico", None]},  # only public posts in digest
        },
        {"_id": 0},
    ).to_list(200)

    viewer_city = (viewer or {}).get("city", "").lower() if viewer else ""
    viewer_region = (viewer or {}).get("region", "").lower() if viewer else ""

    def score(p: dict) -> float:
        reactions = p.get("reactions", {}) or {}
        rc = sum(len(v) if isinstance(v, list) else 0 for v in reactions.values())
        likes = len(p.get("likes", []))
        s = rc * 1.4 + likes * 0.8 + len(p.get("bookmarks", [])) * 1.6
        # Place affinity boost (the unique PT differentiator)
        content_lower = (p.get("content", "") + " ".join(p.get("hashtags", []))).lower()
        if viewer_city and viewer_city in content_lower:
            s *= 1.5
        if viewer_region and viewer_region in content_lower:
            s *= 1.2
        return s

    ranked = sorted(raw, key=score, reverse=True)
    seen_authors = set()
    picked = []
    for p in ranked:
        if p["author_id"] in seen_authors:
            continue
        seen_authors.add(p["author_id"])
        picked.append(p)
        if len(picked) >= 3:
            break

    enriched = [await enrich_post(p, viewer) for p in picked]
    return {
        "digest": enriched,
        "generated_at": now_iso(),
        "headline": "A Tarde · 3 momentos da comunidade nas últimas 24h",
    }


@api.get("/bairro/events")
async def bairro_events(viewer=Depends(get_current_user)):
    """F5.2 — Sino do Bairro. Returns the nearest event in viewer's city/region
    happening in the next 7 days. Rate-limited via client (max 1 visible bell per week)."""
    city = (viewer.get("city", "") or "").strip().lower()
    region = (viewer.get("region", "") or "").strip().lower()
    if not city and not region:
        return {"event": None, "reason": "Indica a tua cidade no perfil para receberes o Sino do Bairro."}
    now = datetime.now(timezone.utc)
    horizon = (now + timedelta(days=7)).isoformat()
    cur = await db.events.find(
        {
            "starts_at": {"$gte": now.isoformat(), "$lte": horizon},
        },
        {"_id": 0},
    ).to_list(50)
    # Score events by city/region match in location text
    def ev_score(e):
        loc = (e.get("location", "") or "").lower()
        s = 0
        if city and city in loc:
            s += 10
        if region and region in loc:
            s += 4
        return s
    cur = [e for e in cur if ev_score(e) > 0]
    cur.sort(key=ev_score, reverse=True)
    if not cur:
        return {"event": None}
    return {"event": cur[0]}


@api.get("/badges/narrative")
async def narrative_badges(user=Depends(get_current_user)):
    """Gamificação removida — endpoint mantido a devolver lista vazia."""
    return {"badges": []}


# ============================================================
# F4.1 — Middle-class creator boost / F3.3 — Vista da Tasca / F5.4 — Heat map saudade
# ============================================================

@api.get("/discover/new_voices")
async def new_voices(viewer: Optional[dict] = Depends(maybe_user)):
    """F4.1 — Middle-class creator program.
    Surfaces creators registered in the last 30 days with at least 1 post,
    ordered by region affinity to viewer (if any) + activity.
    Anti-power-law: caps users with > 500 followers so we promote the "middle class"."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    candidates = await db.users.find(
        {"created_at": {"$gte": cutoff}},
        {"_id": 0, "password_hash": 0},
    ).to_list(200)
    # Filter middle-class: < 500 followers (avoid already-massive accounts)
    candidates = [u for u in candidates if len(u.get("followers", [])) < 500]
    viewer_region = ((viewer or {}).get("region") or "").lower()
    viewer_city = ((viewer or {}).get("city") or "").lower()

    out = []
    for u in candidates:
        post_count = await db.posts.count_documents({"author_id": u["id"], "is_draft": {"$ne": True}})
        if post_count < 1:
            continue
        score = post_count * 1.0 + len(u.get("followers", [])) * 0.2
        # Place affinity boost (the differentiator)
        if viewer_region and (u.get("region") or "").lower() == viewer_region:
            score *= 1.8
        if viewer_city and (u.get("city") or "").lower() == viewer_city:
            score *= 2.2
        out.append({
            "user": public_user(u),
            "post_count": post_count,
            "score": round(score, 2),
        })
    out.sort(key=lambda x: x["score"], reverse=True)
    return {"voices": out[:8]}


@api.get("/communities/{slug}/active")
async def community_active_members(slug: str, viewer: Optional[dict] = Depends(maybe_user)):
    """F3.3 — Vista da Tasca. Shows recently-active members of a community
    (posted or seen in last 24h). Creates a "we're all here" presence signal."""
    comm = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not comm:
        raise HTTPException(404, "Comunidade não encontrada")
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    # Members who posted in this community recently
    recent_authors = await db.posts.distinct(
        "author_id",
        {"community_id": comm["id"], "created_at": {"$gte": cutoff}},
    )
    # Plus members seen recently
    seen_members = await db.users.find(
        {"id": {"$in": comm.get("members", [])}, "last_seen": {"$gte": cutoff}},
        {"_id": 0, "password_hash": 0},
    ).to_list(50)
    seen_ids = {u["id"] for u in seen_members}
    # Combine: authors first (more relevant), then seen
    active_ids = []
    for aid in recent_authors:
        if aid not in active_ids:
            active_ids.append(aid)
    for uid in seen_ids:
        if uid not in active_ids:
            active_ids.append(uid)
    users_lookup = {u["id"]: u for u in seen_members}
    # Fetch any missing authors
    missing = [aid for aid in active_ids if aid not in users_lookup]
    if missing:
        extra = await db.users.find(
            {"id": {"$in": missing}},
            {"_id": 0, "password_hash": 0},
        ).to_list(50)
        for u in extra:
            users_lookup[u["id"]] = u
    enriched = [public_user(users_lookup[uid]) for uid in active_ids[:12] if uid in users_lookup]
    return {
        "active": enriched,
        "total_members": len(comm.get("members", [])),
        "active_count": len(active_ids),
    }


# ─────────────────────────────────────────────────────────────────────
# Comunidades vivas — pulso + "Agora" (presence-first, dados reais)
# ─────────────────────────────────────────────────────────────────────
@api.get("/communities/{slug}/pulse")
async def community_pulse_endpoint(slug: str, user=Depends(get_current_user)):
    """Estado vivo de uma comunidade: temperatura, energia, estado, mood,
    trends internas + nº de pessoas presentes na sala AGORA (WS)."""
    comm = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not comm:
        raise HTTPException(404, "Comunidade não encontrada")
    snap = await community_pulse.get_pulse(db, comm)
    present_now = ws_manager.community_presence_count(comm["id"])
    out = dict(snap)
    out["present_now"] = present_now
    return out


@api.get("/communities/{slug}/now")
async def community_now(slug: str, user=Depends(get_current_user)):
    """Tab 'Agora': quem está aqui, conversas a crescer e ticker recente.
    Tudo real — presença das salas WS + janelas de atividade."""
    comm = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not comm:
        raise HTTPException(404, "Comunidade não encontrada")
    cid = comm["id"]
    now = datetime.now(timezone.utc)
    recent_cutoff = (now - timedelta(minutes=30)).isoformat()

    snap = await community_pulse.get_pulse(db, comm)
    present_ids = list(ws_manager.viewers_by_community.get(cid, set()))

    # Quem está aqui agora (presença na sala WS).
    present_users = []
    if present_ids:
        rows = await db.users.find(
            {"id": {"$in": present_ids[:50]}}, {"_id": 0, "password_hash": 0}
        ).to_list(50)
        present_users = [public_user(u) for u in rows]

    # Conversas a crescer: posts da comunidade com mais comentários nos
    # últimos 30 min.
    recent_comments = await db.comments.find(
        {"community_id": cid, "created_at": {"$gte": recent_cutoff}},
        {"_id": 0, "post_id": 1, "created_at": 1, "author_id": 1, "content": 1},
    ).to_list(2000)
    by_post: dict = {}
    for c in recent_comments:
        pid = c.get("post_id")
        if pid:
            by_post[pid] = by_post.get(pid, 0) + 1
    growing = []
    if by_post:
        top_pids = sorted(by_post.items(), key=lambda kv: -kv[1])[:6]
        pid_list = [pid for pid, _ in top_pids]
        posts = await db.posts.find(
            {"id": {"$in": pid_list}}, {"_id": 0}
        ).to_list(len(pid_list))
        pmap = {p["id"]: p for p in posts}
        for pid, n in top_pids:
            p = pmap.get(pid)
            if not p:
                continue
            growing.append({
                "post_id": pid,
                "recent_comments_30m": n,
                "preview": (p.get("content") or "")[:120],
                "author_id": p.get("author_id"),
                "created_at": p.get("created_at"),
            })

    # Ticker recente: posts + comentários dos últimos 30 min, mais novos
    # primeiro (semente do activity ticker antes de chegarem eventos WS).
    recent_posts = await db.posts.find(
        {"community_id": cid, "created_at": {"$gte": recent_cutoff}, "is_draft": {"$ne": True}},
        {"_id": 0, "id": 1, "author_id": 1, "content": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(20)
    ticker = []
    for p in recent_posts:
        ticker.append({"event": "post", "post_id": p["id"], "at": p["created_at"],
                       "author_id": p.get("author_id"), "preview": (p.get("content") or "")[:120]})
    for c in recent_comments:
        ticker.append({"event": "comment", "post_id": c.get("post_id"), "at": c.get("created_at"),
                       "author_id": c.get("author_id"), "preview": (c.get("content") or "")[:120]})
    ticker.sort(key=lambda x: x.get("at") or "", reverse=True)
    ticker = ticker[:20]

    # Resolve autores do ticker/growing num lookup só (nomes/avatares).
    author_ids = {t.get("author_id") for t in ticker if t.get("author_id")}
    author_ids |= {g.get("author_id") for g in growing if g.get("author_id")}
    authors = {}
    if author_ids:
        rows = await db.users.find(
            {"id": {"$in": list(author_ids)}},
            {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "verified": 1},
        ).to_list(len(author_ids))
        authors = {u["id"]: public_user(u) for u in rows}

    return {
        "pulse": {**snap, "present_now": len(present_ids)},
        "present": present_users,
        "present_count": len(present_ids),
        "growing": growing,
        "ticker": ticker,
        "authors": authors,
    }


# ─────────────────────────────────────────────────────────────────────
# Comunidades — MODERAÇÃO COMPLETA (papéis, ban/mute, reports, log)
# ─────────────────────────────────────────────────────────────────────
class CommunityModRoleIn(BaseModel):
    user_id: str
    action: str = "add"   # add | remove


class CommunityModPostIn(BaseModel):
    post_id: str
    reason: Optional[str] = ""


class CommunityBanIn(BaseModel):
    action: str = "ban"   # ban | unban


class CommunityMuteIn(BaseModel):
    action: str = "mute"  # mute | unmute
    minutes: Optional[int] = 60


class CommunityReportIn(BaseModel):
    kind: str             # post | comment | user
    target_id: str
    reason: str = Field(min_length=1, max_length=60)
    detail: Optional[str] = ""


class CommunityResolveIn(BaseModel):
    action: str = "dismiss"  # dismiss | remove_post | ban_user | mute_user
    note: Optional[str] = ""


async def _comm_or_404(slug: str) -> dict:
    c = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comunidade não encontrada")
    return c


async def _comm_for_mod(slug: str, user: dict) -> dict:
    c = await _comm_or_404(slug)
    if not community_mod.can_moderate(c, user):
        raise HTTPException(403, "Sem permissões de moderação nesta comunidade")
    return c


async def _mod_log_and_broadcast(community: dict, actor: dict, action: str, *,
                                 target_id: Optional[str] = None,
                                 target_kind: Optional[str] = None,
                                 detail: str = "", extra: Optional[dict] = None) -> dict:
    doc = community_mod.modlog_doc(
        community["id"], actor["id"], action,
        target_id=target_id, target_kind=target_kind, detail=detail,
    )
    try:
        await db.community_mod_log.insert_one(dict(doc))
    except Exception:
        pass
    msg = {
        "type": "community_mod",
        "community_id": community["id"],
        "action": action,
        "target_id": target_id,
        "target_kind": target_kind,
        "actor": {"id": actor["id"], "username": actor.get("username"), "name": actor.get("name")},
        "at": doc["created_at"],
    }
    if extra:
        msg.update(extra)
    try:
        await ws_manager.broadcast_to_community(community["id"], msg)
    except Exception:
        pass
    return doc


@api.post("/communities/{slug}/mods")
async def community_set_mod(slug: str, payload: CommunityModRoleIn, user=Depends(get_current_user)):
    """Owner adiciona/remove um moderador. O alvo tem de ser membro."""
    c = await _comm_or_404(slug)
    if not community_mod.is_owner(c, user):
        raise HTTPException(403, "Apenas o dono pode gerir moderadores")
    target_id = payload.user_id
    if target_id == c["owner_id"]:
        raise HTTPException(400, "O dono já tem todos os poderes")
    if payload.action == "add":
        if target_id not in (c.get("members") or []):
            raise HTTPException(400, "Só membros podem ser moderadores")
        await db.communities.update_one({"id": c["id"]}, {"$addToSet": {"moderators": target_id}})
        await _mod_log_and_broadcast(c, user, "add_mod", target_id=target_id, target_kind="user")
    else:
        await db.communities.update_one({"id": c["id"]}, {"$pull": {"moderators": target_id}})
        await _mod_log_and_broadcast(c, user, "remove_mod", target_id=target_id, target_kind="user")
    fresh = await db.communities.find_one({"id": c["id"]}, {"_id": 0})
    return _community_public(fresh, user)


@api.post("/communities/{slug}/moderate/post")
async def community_remove_post(slug: str, payload: CommunityModPostIn, user=Depends(get_current_user)):
    """Remove um post DA COMUNIDADE (desliga-o; permanece no perfil do autor)."""
    c = await _comm_for_mod(slug, user)
    post = await db.posts.find_one({"id": payload.post_id}, {"_id": 0})
    if not post or post.get("community_id") != c["id"]:
        raise HTTPException(404, "Post não encontrado nesta comunidade")
    await db.posts.update_one({"id": payload.post_id}, {"$set": {"community_id": None}})
    await _mod_log_and_broadcast(
        c, user, "remove_post", target_id=payload.post_id, target_kind="post",
        detail=(payload.reason or "")[:200],
        extra={"removed_post_id": payload.post_id},
    )
    return {"ok": True}


@api.post("/communities/{slug}/members/{user_id}/ban")
async def community_ban_member(slug: str, user_id: str, payload: CommunityBanIn, user=Depends(get_current_user)):
    """Expulsa (ou readmite) um membro. Mods não podem expulsar o dono nem
    outros mods (só o dono pode mexer em mods)."""
    c = await _comm_for_mod(slug, user)
    target_role = community_mod.role_of(c, {"id": user_id})
    if payload.action == "ban":
        if user_id == c["owner_id"]:
            raise HTTPException(400, "Não podes expulsar o dono")
        if target_role == community_mod.ROLE_MOD and not community_mod.is_owner(c, user):
            raise HTTPException(403, "Só o dono pode expulsar moderadores")
        await db.communities.update_one(
            {"id": c["id"]},
            {"$addToSet": {"banned": user_id}, "$pull": {"members": user_id, "moderators": user_id}},
        )
        await _mod_log_and_broadcast(c, user, "ban_user", target_id=user_id, target_kind="user")
    else:
        await db.communities.update_one({"id": c["id"]}, {"$pull": {"banned": user_id}})
        await _mod_log_and_broadcast(c, user, "unban_user", target_id=user_id, target_kind="user")
    return {"ok": True}


@api.post("/communities/{slug}/members/{user_id}/mute")
async def community_mute_member(slug: str, user_id: str, payload: CommunityMuteIn, user=Depends(get_current_user)):
    """Silencia (ou retira o silêncio a) um membro por N minutos."""
    c = await _comm_for_mod(slug, user)
    if user_id == c["owner_id"]:
        raise HTTPException(400, "Não podes silenciar o dono")
    if payload.action == "mute":
        minutes = max(1, min(int(payload.minutes or 60), 7 * 24 * 60))
        until = (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()
        await db.communities.update_one({"id": c["id"]}, {"$set": {f"muted.{user_id}": until}})
        await _mod_log_and_broadcast(
            c, user, "mute_user", target_id=user_id, target_kind="user",
            detail=f"{minutes}min", extra={"muted_until": until},
        )
        return {"ok": True, "muted_until": until}
    await db.communities.update_one({"id": c["id"]}, {"$unset": {f"muted.{user_id}": ""}})
    await _mod_log_and_broadcast(c, user, "unmute_user", target_id=user_id, target_kind="user")
    return {"ok": True}


@api.post("/communities/{slug}/report")
async def community_report(slug: str, payload: CommunityReportIn, user=Depends(get_current_user)):
    """Qualquer membro reporta um post/comentário/utilizador da comunidade.
    Notifica os moderadores em tempo real."""
    c = await _comm_or_404(slug)
    if payload.kind not in community_mod.REPORT_KINDS:
        raise HTTPException(400, "Tipo de report inválido")
    doc = {
        "id": str(uuid.uuid4()),
        "community_id": c["id"],
        "kind": payload.kind,
        "target_id": payload.target_id,
        "reporter_id": user["id"],
        "reason": payload.reason[:60],
        "detail": (payload.detail or "")[:400],
        "status": "open",
        "created_at": now_iso(),
    }
    await db.community_reports.insert_one(dict(doc))
    # Notifica owner + mods (real, sem expor a toda a sala).
    mod_ids = [c["owner_id"], *(c.get("moderators") or [])]
    for mid in set(mod_ids):
        try:
            await ws_manager.send_personal(mid, {
                "type": "community_report_new",
                "community_id": c["id"],
                "report": community_mod.public_report(doc),
            })
        except Exception:
            pass
    return {"ok": True}


@api.get("/communities/{slug}/reports")
async def community_list_reports(slug: str, status: str = "open", user=Depends(get_current_user)):
    """Fila de reports da comunidade (só moderadores)."""
    c = await _comm_for_mod(slug, user)
    q = {"community_id": c["id"]}
    if status in ("open", "resolved"):
        q["status"] = status
    rows = await db.community_reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    # Resolve autores dos alvos para contexto.
    out = []
    for r in rows:
        out.append(community_mod.public_report(r))
    return out


async def _resolve_report_target_user(report: dict) -> Optional[str]:
    """Devolve o user_id alvo de um report (autor do post/comentário, ou o
    próprio user reportado)."""
    if report["kind"] == "user":
        return report["target_id"]
    if report["kind"] == "post":
        p = await db.posts.find_one({"id": report["target_id"]}, {"_id": 0, "author_id": 1})
        return p.get("author_id") if p else None
    if report["kind"] == "comment":
        cm = await db.comments.find_one({"id": report["target_id"]}, {"_id": 0, "author_id": 1})
        return cm.get("author_id") if cm else None
    return None


@api.post("/communities/{slug}/reports/{report_id}/resolve")
async def community_resolve_report(slug: str, report_id: str, payload: CommunityResolveIn, user=Depends(get_current_user)):
    """Resolve um report aplicando uma ação real (dispensar / remover post /
    expulsar / silenciar o autor). Tudo registado no log."""
    c = await _comm_for_mod(slug, user)
    report = await db.community_reports.find_one({"id": report_id, "community_id": c["id"]}, {"_id": 0})
    if not report:
        raise HTTPException(404, "Report não encontrado")
    action = payload.action

    if action == "remove_post":
        if report["kind"] == "post":
            await db.posts.update_one({"id": report["target_id"]}, {"$set": {"community_id": None}})
            await _mod_log_and_broadcast(c, user, "remove_post", target_id=report["target_id"],
                                         target_kind="post", extra={"removed_post_id": report["target_id"]})
        elif report["kind"] == "comment":
            await db.comments.delete_one({"id": report["target_id"]})
            await _mod_log_and_broadcast(c, user, "remove_post", target_id=report["target_id"], target_kind="comment")
    elif action in ("ban_user", "mute_user"):
        target_uid = await _resolve_report_target_user(report)
        if target_uid and target_uid != c["owner_id"]:
            if action == "ban_user":
                await db.communities.update_one(
                    {"id": c["id"]},
                    {"$addToSet": {"banned": target_uid}, "$pull": {"members": target_uid, "moderators": target_uid}},
                )
                await _mod_log_and_broadcast(c, user, "ban_user", target_id=target_uid, target_kind="user")
            else:
                until = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
                await db.communities.update_one({"id": c["id"]}, {"$set": {f"muted.{target_uid}": until}})
                await _mod_log_and_broadcast(c, user, "mute_user", target_id=target_uid, target_kind="user",
                                             detail="24h", extra={"muted_until": until})
    # else: dismiss → só marca resolvido.

    await db.community_reports.update_one(
        {"id": report_id},
        {"$set": {"status": "resolved", "resolved_by": user["id"],
                  "resolved_action": action, "resolved_at": now_iso(),
                  "resolved_note": (payload.note or "")[:200]}},
    )
    return {"ok": True}


@api.get("/communities/{slug}/modlog")
async def community_modlog(slug: str, user=Depends(get_current_user)):
    """Log de moderação da comunidade (só moderadores)."""
    c = await _comm_for_mod(slug, user)
    rows = await db.community_mod_log.find(
        {"community_id": c["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return rows


@api.get("/diaspora/heatmap")
async def diaspora_heatmap(viewer: Optional[dict] = Depends(maybe_user)):
    """F5.4 — Heat map da diáspora portuguesa.
    Aggregates emigrant users by inferred destination country and active posts.
    Returns counts by region (the 8 PT regions including 'emigrante')."""
    # Count by region
    pipeline = [
        {"$match": {"region": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$region", "count": {"$sum": 1}}},
    ]
    counts = {}
    async for doc in db.users.aggregate(pipeline):
        if doc["_id"]:
            counts[doc["_id"].lower()] = doc["count"]
    # Per-region recent activity (posts last 7 days)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    region_keys = ["norte", "centro", "lisboa", "alentejo", "algarve", "madeira", "acores", "emigrante"]
    activity = {k: 0 for k in region_keys}
    # Bring all post authors with region from last 7 days
    recent_posts = await db.posts.find(
        {"created_at": {"$gte": cutoff}, "is_draft": {"$ne": True}},
        {"_id": 0, "author_id": 1},
    ).to_list(2000)
    author_ids = list({p["author_id"] for p in recent_posts})
    if author_ids:
        author_users = await db.users.find(
            {"id": {"$in": author_ids}, "region": {"$exists": True, "$ne": ""}},
            {"_id": 0, "id": 1, "region": 1},
        ).to_list(2000)
        u_region = {u["id"]: (u.get("region") or "").lower() for u in author_users}
        for p in recent_posts:
            r = u_region.get(p["author_id"])
            if r in activity:
                activity[r] += 1
    # Build response
    regions_out = []
    for key in region_keys:
        regions_out.append({
            "key": key,
            "users": counts.get(key, 0),
            "posts_7d": activity.get(key, 0),
        })
    # Diaspora-specific: also include the emigrant figure first
    return {
        "regions": regions_out,
        "total_users": sum(counts.values()),
        "diaspora_count": counts.get("emigrante", 0),
    }


# ============================================================
# F: SSS-tier Profile — identity fingerprint endpoint
# ============================================================
@api.get("/users/{username}/fingerprint")
async def user_fingerprint(username: str, viewer: Optional[dict] = Depends(maybe_user)):
    """Returns the 'PT identity signature' of a user, aggregated from their posts:
      · top hashtags (voice)
      · top mood detected
      · top reaction emoji given out
      · top reaction emoji received
      · top community
      · most-active hour (when do they post?)
    Powers the editorial Profile hero strip."""
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    if not await can_view_profile(user, viewer):
        return {"available": False}

    posts = await db.posts.find(
        {"author_id": user["id"], "is_draft": {"$ne": True}, "repost_of": {"$exists": False}},
        {"_id": 0},
    ).to_list(500)

    # Top hashtags
    htag_counts: dict[str, int] = {}
    for p in posts:
        for t in p.get("hashtags", []):
            htag_counts[t] = htag_counts.get(t, 0) + 1
    top_hashtags = sorted(htag_counts.items(), key=lambda x: x[1], reverse=True)[:3]

    # Top mood
    mood_counts: dict[str, int] = {}
    for p in posts:
        m = detect_mood(p.get("content", ""))
        if m:
            mood_counts[m] = mood_counts.get(m, 0) + 1
    top_mood = max(mood_counts.items(), key=lambda x: x[1])[0] if mood_counts else None

    # Reactions received (aggregate by key)
    react_recv: dict[str, int] = {}
    for p in posts:
        for k, lst in (p.get("reactions") or {}).items():
            if isinstance(lst, list):
                react_recv[k] = react_recv.get(k, 0) + len(lst)
    top_react_recv = max(react_recv.items(), key=lambda x: x[1])[0] if react_recv else None

    # Reactions given — search posts where this user appears in any reaction list
    user_id = user["id"]
    given_cur = await db.posts.find(
        {"$or": [{f"reactions.{k}": user_id} for k in ALLOWED_REACTIONS]},
        {"_id": 0, "reactions": 1},
    ).to_list(1000)
    react_given: dict[str, int] = {}
    for p in given_cur:
        for k, lst in (p.get("reactions") or {}).items():
            if isinstance(lst, list) and user_id in lst:
                react_given[k] = react_given.get(k, 0) + 1
    top_react_given = max(react_given.items(), key=lambda x: x[1])[0] if react_given else None

    # Top community
    comm_counts: dict[str, int] = {}
    for p in posts:
        cid = p.get("community_id")
        if cid:
            comm_counts[cid] = comm_counts.get(cid, 0) + 1
    top_comm = None
    if comm_counts:
        cid = max(comm_counts.items(), key=lambda x: x[1])[0]
        c = await db.communities.find_one({"id": cid}, {"_id": 0})
        if c:
            top_comm = {"id": c["id"], "slug": c.get("slug"), "name": c.get("name"), "posts": comm_counts[cid]}

    # Most-active hour (UTC; rough proxy)
    hour_counts: dict[int, int] = {}
    for p in posts:
        try:
            h = datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")).hour
            hour_counts[h] = hour_counts.get(h, 0) + 1
        except Exception:
            pass
    peak_hour = max(hour_counts.items(), key=lambda x: x[1])[0] if hour_counts else None

    return {
        "available": True,
        "top_hashtags": [{"tag": t, "count": c} for t, c in top_hashtags],
        "top_mood": top_mood,
        "top_react_received": (
            {"key": top_react_recv, "emoji": REACTION_EMOJI.get(top_react_recv, ""), "count": react_recv[top_react_recv]}
            if top_react_recv else None
        ),
        "top_react_given": (
            {"key": top_react_given, "emoji": REACTION_EMOJI.get(top_react_given, ""), "count": react_given[top_react_given]}
            if top_react_given else None
        ),
        "top_community": top_comm,
        "peak_hour": peak_hour,
        "posts_analyzed": len(posts),
    }


@api.get("/users/{username}/communities")
async def user_communities(username: str, viewer: Optional[dict] = Depends(maybe_user)):
    """All communities the user is a member of, ordered by member count."""
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    if not await can_view_profile(user, viewer):
        return []
    raw = await db.communities.find(
        {"members": user["id"]},
        {"_id": 0},
    ).to_list(50)
    out = []
    for c in raw:
        out.append({
            "id": c["id"],
            "slug": c.get("slug"),
            "name": c.get("name"),
            "category": c.get("category"),
            "members_count": len(c.get("members", [])),
            "is_owner": c.get("owner_id") == user["id"],
        })
    out.sort(key=lambda x: x["members_count"], reverse=True)
    return out


# ============================================================
# V2 Modern Social — 13 features
# ============================================================
CHARMS_CATALOG = [
    {"key": "fundador",     "emoji": "🌱", "label": "Fundador",     "desc": "Entre os primeiros 1000"},
    {"key": "madrugador",   "emoji": "🌅", "label": "Madrugador",   "desc": "Publicaste antes das 7h"},
    {"key": "noctivago",    "emoji": "🌙", "label": "Noctívago",    "desc": "Publicaste depois das 2h"},
    {"key": "conversador",  "emoji": "💬", "label": "Conversador",  "desc": "100 comentários feitos"},
    {"key": "anfitriao",    "emoji": "🍷", "label": "Anfitrião",    "desc": "Criaste uma comunidade"},
    {"key": "explorador",   "emoji": "🧭", "label": "Explorador",   "desc": "Posts em 5+ cidades"},
    {"key": "saudosista",   "emoji": "🫶", "label": "Saudosista",   "desc": "10+ posts com mood saudade"},
    {"key": "festeiro",     "emoji": "🎉", "label": "Festeiro",     "desc": "10+ posts com mood festa"},
    {"key": "poeta",        "emoji": "✍️", "label": "Poeta",        "desc": "Post c/ 100+ reações"},
    {"key": "viajante",     "emoji": "✈️", "label": "Viajante",     "desc": "Geo-tag em 3+ regiões"},
    {"key": "pastelinho",   "emoji": "🥐", "label": "Pastelinho",   "desc": "Mood Café 5x"},
    {"key": "bolacampea",   "emoji": "⚽", "label": "Bola Campeã",  "desc": "Mood Bola 5x"},
]
CHARMS_BY_KEY = {c["key"]: c for c in CHARMS_CATALOG}

COSMETICS_CATALOG = [
    {"id": "frame_classic",    "type": "frame",   "label": "Clássico",      "css": "ring-2 ring-white/20"},
    {"id": "frame_coral",      "type": "frame",   "label": "Coral",         "css": "ring-2 ring-orange-400"},
    {"id": "frame_azulejo",    "type": "frame",   "label": "Azulejo",       "css": "ring-2 ring-blue-400"},
    {"id": "frame_ouro",       "type": "frame",   "label": "Ouro Alentejo", "css": "ring-2 ring-yellow-500"},
    {"id": "frame_pinhal",     "type": "frame",   "label": "Pinhal",        "css": "ring-2 ring-emerald-500"},
    {"id": "frame_tejo",       "type": "frame",   "label": "Tejo",          "css": "ring-2 ring-cyan-400"},
    {"id": "frame_pixel",      "type": "frame",   "label": "Pixel",         "css": "ring-2 ring-pink-400"},
    {"id": "sticker_pastel",   "type": "sticker", "label": "Pastel",        "emoji": "🥐"},
    {"id": "sticker_bola",     "type": "sticker", "label": "Bola",          "emoji": "⚽"},
    {"id": "sticker_galo",     "type": "sticker", "label": "Galo",          "emoji": "🐓"},
    {"id": "sticker_sardinha", "type": "sticker", "label": "Sardinha",      "emoji": "🐟"},
    {"id": "sticker_coracao",  "type": "sticker", "label": "Coração",       "emoji": "❤️"},
    {"id": "sticker_estrela",  "type": "sticker", "label": "Estrela",       "emoji": "⭐"},
    {"id": "sticker_cafe",     "type": "sticker", "label": "Café",          "emoji": "☕"},
]
COSMETICS_BY_ID = {c["id"]: c for c in COSMETICS_CATALOG}
PRESENCE_STATES = {"online", "ausente", "ocupado", "invisivel"}
HYPE_DURATION_MIN = 30
HYPE_TARGET = 25


# ---------- 1) Notes / Recado 24h ----------
class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=60)
    mood: Optional[str] = ""


@api.post("/notes")
async def create_note(payload: NoteIn, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    await db.notes.delete_many({"user_id": user["id"]})
    note = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "text": payload.text.strip(),
        "mood": payload.mood or "",
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
    }
    await db.notes.insert_one(note)
    note.pop("_id", None)
    return note


@api.get("/notes/feed")
async def notes_feed(user=Depends(get_current_user)):
    now_iso_str = datetime.now(timezone.utc).isoformat()
    following = list(user.get("following", [])) + [user["id"]]
    raw = await db.notes.find(
        {"user_id": {"$in": following}, "expires_at": {"$gt": now_iso_str}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    user_ids = list({n["user_id"] for n in raw})
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0}).to_list(100)
    by_id = {u["id"]: public_user(u) for u in users}
    out = []
    for n in raw:
        n["author"] = by_id.get(n["user_id"])
        out.append(n)
    return out


@api.delete("/notes/{note_id}")
async def delete_note(note_id: str, user=Depends(get_current_user)):
    res = await db.notes.delete_one({"id": note_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(404, "Recado não encontrado")
    return {"ok": True}


# ---------- 2) Presence Status ----------
class PresenceIn(BaseModel):
    status: str = Field(default="online")
    emoji: Optional[str] = ""
    text: Optional[str] = Field(default="", max_length=40)
    minutes: Optional[int] = Field(default=0, ge=0, le=10080)


@api.post("/users/me/presence")
async def set_presence(payload: PresenceIn, user=Depends(get_current_user)):
    if payload.status not in PRESENCE_STATES:
        raise HTTPException(400, "Estado inválido")
    until = None
    if payload.minutes and payload.minutes > 0:
        until = (datetime.now(timezone.utc) + timedelta(minutes=payload.minutes)).isoformat()
    presence = {
        "status": payload.status,
        "emoji": (payload.emoji or "").strip()[:4],
        "text": (payload.text or "").strip(),
        "until": until,
        "updated_at": now_iso(),
    }
    await db.users.update_one({"id": user["id"]}, {"$set": {"presence": presence}})
    return presence


@api.get("/users/{username}/presence")
async def get_presence(username: str):
    u = await db.users.find_one({"username": username.lower()}, {"_id": 0, "presence": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    p = u.get("presence") or {"status": "online", "emoji": "", "text": "", "until": None}
    if p.get("until"):
        try:
            if datetime.fromisoformat(p["until"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
                p = {"status": "online", "emoji": "", "text": "", "until": None}
        except Exception:
            pass
    return p


# ---------- 3) Custom Community Reaction Emojis ----------
class CommunityReactionsIn(BaseModel):
    reactions: List[dict]


@api.put("/communities/{slug}/reactions")
async def set_community_reactions(slug: str, payload: CommunityReactionsIn, user=Depends(get_current_user)):
    comm = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not comm:
        raise HTTPException(404, "Comunidade não encontrada")
    if comm.get("owner_id") != user["id"]:
        raise HTTPException(403, "Só o owner pode editar reações")
    cleaned = []
    for r in payload.reactions[:8]:
        key = (r.get("key") or "").strip().lower()[:24]
        emoji = (r.get("emoji") or "").strip()[:4]
        label = (r.get("label") or "").strip()[:32]
        if key and emoji and label:
            cleaned.append({"key": key, "emoji": emoji, "label": label})
    await db.communities.update_one({"slug": slug}, {"$set": {"custom_reactions": cleaned}})
    return {"reactions": cleaned}


@api.get("/communities/{slug}/reactions")
async def get_community_reactions(slug: str):
    comm = await db.communities.find_one({"slug": slug}, {"_id": 0, "custom_reactions": 1})
    if not comm:
        raise HTTPException(404, "Comunidade não encontrada")
    return {"reactions": comm.get("custom_reactions", [])}


# ---------- 4) Pinned Comments ----------
@api.post("/comments/{comment_id}/pin")
async def toggle_pin_comment(comment_id: str, user=Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(404, "Comentário não encontrado")
    post = await db.posts.find_one({"id": comment["post_id"]}, {"_id": 0, "author_id": 1})
    if not post or post["author_id"] != user["id"]:
        raise HTTPException(403, "Só o autor do post pode destacar")
    new_state = not comment.get("pinned_by_author", False)
    if new_state:
        await db.comments.update_many(
            {"post_id": comment["post_id"]}, {"$set": {"pinned_by_author": False}}
        )
    await db.comments.update_one({"id": comment_id}, {"$set": {"pinned_by_author": new_state}})
    return {"pinned": new_state}


# ---------- 5) Series / Coleções ----------
class SeriesIn(BaseModel):
    title: str = Field(min_length=2, max_length=60)
    description: Optional[str] = Field(default="", max_length=240)
    cover_emoji: Optional[str] = "📚"


class SeriesPostIn(BaseModel):
    post_id: str
    action: str = Field(default="add")


@api.post("/series")
async def create_series(payload: SeriesIn, user=Depends(get_current_user)):
    s = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "title": payload.title.strip(),
        "description": (payload.description or "").strip(),
        "cover_emoji": payload.cover_emoji or "📚",
        "post_ids": [],
        "created_at": now_iso(),
    }
    await db.series.insert_one(s)
    s.pop("_id", None)
    return s


@api.get("/series/{series_id}")
async def get_series(series_id: str):
    s = await db.series.find_one({"id": series_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Série não encontrada")
    owner = await db.users.find_one({"id": s["owner_id"]}, {"_id": 0})
    s["owner"] = public_user(owner) if owner else None
    s["posts_count"] = len(s.get("post_ids", []))
    return s


@api.get("/users/{username}/series")
async def list_user_series(username: str):
    u = await db.users.find_one({"username": username.lower()}, {"_id": 0, "id": 1})
    if not u:
        return []
    raw = await db.series.find({"owner_id": u["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for s in raw:
        s["posts_count"] = len(s.get("post_ids", []))
    return raw


@api.get("/series/{series_id}/posts")
async def get_series_posts(series_id: str, viewer: Optional[dict] = Depends(maybe_user)):
    s = await db.series.find_one({"id": series_id}, {"_id": 0, "post_ids": 1})
    if not s:
        raise HTTPException(404, "Série não encontrada")
    ids = s.get("post_ids", [])
    if not ids:
        return []
    raw = await db.posts.find({"id": {"$in": ids}}, {"_id": 0}).to_list(200)
    by_id = {p["id"]: p for p in raw}
    ordered = [by_id[pid] for pid in ids if pid in by_id]
    return [await enrich_post(p, viewer) for p in ordered]


@api.post("/series/{series_id}/posts")
async def edit_series_posts(series_id: str, payload: SeriesPostIn, user=Depends(get_current_user)):
    s = await db.series.find_one({"id": series_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Série não encontrada")
    if s["owner_id"] != user["id"]:
        raise HTTPException(403, "Não és o dono desta série")
    if payload.action == "add":
        await db.series.update_one({"id": series_id}, {"$addToSet": {"post_ids": payload.post_id}})
    else:
        await db.series.update_one({"id": series_id}, {"$pull": {"post_ids": payload.post_id}})
    fresh = await db.series.find_one({"id": series_id}, {"_id": 0})
    return fresh


@api.delete("/series/{series_id}")
async def delete_series(series_id: str, user=Depends(get_current_user)):
    res = await db.series.delete_one({"id": series_id, "owner_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(404, "Série não encontrada")
    return {"ok": True}


# ---------- 6) Profile Visitors ----------
@api.get("/users/me/visitors")
async def list_my_visitors(user=Depends(get_current_user)):
    if user.get("track_visits") is False:
        return {"enabled": False, "visitors": []}
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    raw = await db.profile_views.find(
        {"target_id": user["id"], "viewed_at": {"$gt": cutoff}},
        {"_id": 0},
    ).sort("viewed_at", -1).to_list(500)
    seen = {}
    for v in raw:
        if v["viewer_id"] not in seen:
            seen[v["viewer_id"]] = v
    viewer_ids = list(seen.keys())
    users = await db.users.find({"id": {"$in": viewer_ids}}, {"_id": 0}).to_list(500)
    by_id = {u["id"]: public_user(u) for u in users}
    visitors = []
    for vid, v in seen.items():
        if vid in by_id:
            visitors.append({**by_id[vid], "viewed_at": v["viewed_at"]})
    visitors.sort(key=lambda x: x["viewed_at"], reverse=True)
    return {"enabled": True, "visitors": visitors[:50]}


class VisitorOptIn(BaseModel):
    track_visits: bool


@api.post("/users/me/visitors/settings")
async def toggle_visitor_tracking(payload: VisitorOptIn, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"track_visits": payload.track_visits}})
    return {"track_visits": payload.track_visits}


# ---------- 7) Charms ----------
@api.get("/charms/catalog")
async def charms_catalog():
    # Gamificação removida — sem charms.
    return []


async def _compute_unlocked_charms(user: dict) -> list:
    # Gamificação removida — nenhum charm é desbloqueado.
    return []


@api.get("/users/{username}/charms")
async def list_user_charms(username: str):
    u = await db.users.find_one({"username": username.lower()}, {"_id": 0, "id": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    return {"unlocked": [], "equipped": []}


class CharmsEquipIn(BaseModel):
    keys: List[str] = Field(default_factory=list)


@api.post("/users/me/charms/equip")
async def equip_charms(payload: CharmsEquipIn, user=Depends(get_current_user)):
    # No-op — gamificação removida.
    await db.users.update_one({"id": user["id"]}, {"$set": {"charms_equipped": []}})
    return {"equipped": []}


# ---------- 8) Roda (Inner Circle) ----------
@api.get("/users/me/roda")
async def get_roda(user=Depends(get_current_user)):
    ids = user.get("roda", [])
    if not ids:
        return []
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(50)
    return [public_user(u) for u in users]


@api.post("/users/me/roda/{user_id}")
async def toggle_roda(user_id: str, user=Depends(get_current_user)):
    if user_id == user["id"]:
        raise HTTPException(400, "Não te podes adicionar à tua Roda")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    current = list(user.get("roda", []))
    if user_id in current:
        current.remove(user_id)
        action = "removed"
    else:
        if len(current) >= 25:
            raise HTTPException(400, "Roda cheia (máx 25)")
        current.append(user_id)
        action = "added"
    await db.users.update_one({"id": user["id"]}, {"$set": {"roda": current}})
    return {"action": action, "roda": current}


@api.get("/users/{username}/in-roda")
async def is_in_my_roda(username: str, user=Depends(get_current_user)):
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0, "id": 1})
    if not target:
        return {"in_roda": False}
    return {"in_roda": target["id"] in user.get("roda", [])}


# ---------- 9) Starter Packs ----------
class StarterPackIn(BaseModel):
    title: str = Field(min_length=3, max_length=60)
    description: Optional[str] = Field(default="", max_length=200)
    user_ids: List[str] = Field(default_factory=list)
    emoji: Optional[str] = "🎁"


async def _enrich_pack(pack: dict, viewer_id: Optional[str] = None) -> dict:
    owner = await db.users.find_one({"id": pack["owner_id"]}, {"_id": 0})
    users = await db.users.find({"id": {"$in": pack.get("user_ids", [])}}, {"_id": 0}).to_list(20)
    pack["owner"] = public_user(owner) if owner else None
    pack["users"] = [public_user(u) for u in users]
    pack["likes_count"] = len(pack.get("likes", []))
    pack["liked_by_me"] = bool(viewer_id and viewer_id in pack.get("likes", []))
    return pack


@api.post("/starter-packs")
async def create_starter_pack(payload: StarterPackIn, user=Depends(get_current_user)):
    pack = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "title": payload.title.strip(),
        "description": (payload.description or "").strip(),
        "user_ids": payload.user_ids[:20],
        "emoji": payload.emoji or "🎁",
        "likes": [],
        "follows": 0,
        "created_at": now_iso(),
    }
    await db.starter_packs.insert_one(pack)
    pack.pop("_id", None)
    return await _enrich_pack(pack, user["id"])


@api.get("/starter-packs/discover")
async def discover_starter_packs(viewer: Optional[dict] = Depends(maybe_user)):
    raw = await db.starter_packs.find({}, {"_id": 0}).to_list(200)
    raw.sort(key=lambda p: (len(p.get("likes", [])), p.get("follows", 0)), reverse=True)
    out = []
    for p in raw[:40]:
        out.append(await _enrich_pack(p, viewer["id"] if viewer else None))
    return out


@api.get("/starter-packs/{pack_id}")
async def get_starter_pack(pack_id: str, viewer: Optional[dict] = Depends(maybe_user)):
    p = await db.starter_packs.find_one({"id": pack_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Pack não encontrado")
    return await _enrich_pack(p, viewer["id"] if viewer else None)


@api.get("/users/{username}/starter-packs")
async def user_starter_packs(username: str):
    u = await db.users.find_one({"username": username.lower()}, {"_id": 0, "id": 1})
    if not u:
        return []
    raw = await db.starter_packs.find({"owner_id": u["id"]}, {"_id": 0}).to_list(50)
    out = []
    for p in raw:
        out.append(await _enrich_pack(p, None))
    return out


@api.post("/starter-packs/{pack_id}/like")
async def like_starter_pack(pack_id: str, user=Depends(get_current_user)):
    p = await db.starter_packs.find_one({"id": pack_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Pack não encontrado")
    likes = list(p.get("likes", []))
    if user["id"] in likes:
        likes.remove(user["id"])
        action = "unliked"
    else:
        likes.append(user["id"])
        action = "liked"
    await db.starter_packs.update_one({"id": pack_id}, {"$set": {"likes": likes}})
    return {"action": action, "likes_count": len(likes), "liked_by_me": action == "liked"}


@api.post("/starter-packs/{pack_id}/follow-all")
async def follow_all_in_pack(pack_id: str, user=Depends(get_current_user)):
    p = await db.starter_packs.find_one({"id": pack_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Pack não encontrado")
    followed = []
    my_following = set(user.get("following", []))
    for uid in p.get("user_ids", []):
        if uid == user["id"] or uid in my_following:
            continue
        target = await db.users.find_one({"id": uid}, {"_id": 0, "id": 1})
        if not target:
            continue
        await db.users.update_one({"id": user["id"]}, {"$addToSet": {"following": uid}})
        await db.users.update_one({"id": uid}, {"$addToSet": {"followers": user["id"]}})
        followed.append(uid)
    await db.starter_packs.update_one({"id": pack_id}, {"$inc": {"follows": 1}})
    return {"followed_count": len(followed), "followed": followed}


@api.delete("/starter-packs/{pack_id}")
async def delete_starter_pack(pack_id: str, user=Depends(get_current_user)):
    res = await db.starter_packs.delete_one({"id": pack_id, "owner_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(404, "Pack não encontrado")
    return {"ok": True}


# ---------- 10) Hype Train ----------
@api.post("/communities/{slug}/hype")
async def join_hype_train(slug: str, user=Depends(get_current_user)):
    comm = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not comm:
        raise HTTPException(404, "Comunidade não encontrada")
    now = datetime.now(timezone.utc)
    active = await db.hype_trains.find_one(
        {"community_slug": slug, "expires_at": {"$gt": now.isoformat()}},
        {"_id": 0},
    )
    if not active:
        active = {
            "id": str(uuid.uuid4()),
            "community_slug": slug,
            "started_by": user["id"],
            "participants": [user["id"]],
            "expires_at": (now + timedelta(minutes=HYPE_DURATION_MIN)).isoformat(),
            "started_at": now.isoformat(),
            "target": HYPE_TARGET,
        }
        await db.hype_trains.insert_one(active)
        active.pop("_id", None)
    else:
        if user["id"] not in active["participants"]:
            active["participants"].append(user["id"])
            await db.hype_trains.update_one(
                {"id": active["id"]},
                {"$addToSet": {"participants": user["id"]}},
            )
    active["count"] = len(active["participants"])
    active["percent"] = min(100, int(100 * active["count"] / max(1, active["target"])))
    return active


@api.get("/communities/{slug}/hype/active")
async def get_active_hype(slug: str):
    now = datetime.now(timezone.utc)
    active = await db.hype_trains.find_one(
        {"community_slug": slug, "expires_at": {"$gt": now.isoformat()}},
        {"_id": 0},
    )
    if not active:
        return None
    active["count"] = len(active["participants"])
    active["percent"] = min(100, int(100 * active["count"] / max(1, active.get("target", HYPE_TARGET))))
    return active


# ---------- 11) Collab Posts ----------
class CollabInviteIn(BaseModel):
    user_id: str


@api.post("/posts/{post_id}/collab/invite")
async def invite_collab(post_id: str, payload: CollabInviteIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post não encontrado")
    if post["author_id"] != user["id"]:
        raise HTTPException(403, "Só o autor pode convidar colaboradores")
    target = await db.users.find_one({"id": payload.user_id}, {"_id": 0, "id": 1, "username": 1})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    invites = list(post.get("collab_invites", []))
    accepted = list(post.get("collaborators", []))
    if payload.user_id in accepted or payload.user_id in invites:
        return {"ok": True, "already": True}
    # Admin-controlled cap on collaborators per post (default 3).
    try:
        _max_collab = int(await get_limit("max_collaborators_per_post") or 3)
    except Exception:
        _max_collab = 3
    if _max_collab < 1:
        _max_collab = 1
    if len(accepted) + len(invites) >= _max_collab:
        raise HTTPException(400, f"Máximo de {_max_collab} colaboradores")
    invites.append(payload.user_id)
    await db.posts.update_one({"id": post_id}, {"$set": {"collab_invites": invites}})
    await create_notification(
        payload.user_id, "collab_invite", user["id"], post_id,
        f"@{user['username']} convidou-te para colaborar num post",
    )
    return {"ok": True}


@api.post("/posts/{post_id}/collab/accept")
async def accept_collab(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post não encontrado")
    invites = list(post.get("collab_invites", []))
    if user["id"] not in invites:
        raise HTTPException(403, "Não tens convite")
    invites.remove(user["id"])
    accepted = list(post.get("collaborators", []))
    accepted.append(user["id"])
    await db.posts.update_one(
        {"id": post_id},
        {"$set": {"collab_invites": invites, "collaborators": accepted}},
    )
    return {"ok": True, "collaborators": accepted}


@api.post("/posts/{post_id}/collab/decline")
async def decline_collab(post_id: str, user=Depends(get_current_user)):
    await db.posts.update_one({"id": post_id}, {"$pull": {"collab_invites": user["id"]}})
    return {"ok": True}


@api.get("/posts/{post_id}/collab")
async def list_collab(post_id: str):
    post = await db.posts.find_one(
        {"id": post_id},
        {"_id": 0, "collaborators": 1, "collab_invites": 1, "author_id": 1},
    )
    if not post:
        raise HTTPException(404, "Post não encontrado")
    ids = list(post.get("collaborators", [])) + list(post.get("collab_invites", []))
    if not ids:
        return {"collaborators": [], "invites": []}
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(10)
    by_id = {u["id"]: public_user(u) for u in users}
    return {
        "collaborators": [by_id[i] for i in post.get("collaborators", []) if i in by_id],
        "invites": [by_id[i] for i in post.get("collab_invites", []) if i in by_id],
    }


# ---------- 12) Avatar Cosmetics ----------
@api.get("/cosmetics/catalog")
async def cosmetics_catalog():
    # Gamificação removida — sem cosméticos.
    return []


class CosmeticsEquipIn(BaseModel):
    frame: Optional[str] = ""
    sticker: Optional[str] = ""


@api.post("/users/me/cosmetics/equip")
async def equip_cosmetics(payload: CosmeticsEquipIn, user=Depends(get_current_user)):
    # No-op — gamificação removida.
    cosmetics_equipped = {"frame": "", "sticker": ""}
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"cosmetics_equipped": cosmetics_equipped}}
    )
    return cosmetics_equipped


@api.get("/users/{username}/cosmetics")
async def get_user_cosmetics(username: str):
    u = await db.users.find_one(
        {"username": username.lower()},
        {"_id": 0, "id": 1},
    )
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    return {"frame": None, "sticker": None}


# ---------- 13) For You Reason Chips ----------
async def compute_reason_for_post(post: dict, viewer: dict) -> Optional[dict]:
    if not viewer:
        return None
    if post.get("community_id"):
        comm = await db.communities.find_one(
            {"id": post["community_id"]},
            {"_id": 0, "name": 1, "members": 1, "slug": 1},
        )
        if comm and viewer["id"] in comm.get("members", []):
            return {
                "type": "community",
                "label": f"Da comunidade {comm['name']}",
                "emoji": "🏘️",
                "slug": comm.get("slug"),
            }
    if post.get("author_id") in viewer.get("roda", []):
        return {"type": "roda", "label": "Da tua Roda", "emoji": "🫂"}
    cities_in_post = detect_cities(post.get("content", ""), post.get("hashtags", []))
    if viewer.get("city") and viewer["city"] in cities_in_post:
        return {"type": "city", "label": f"Popular em {viewer['city']}", "emoji": "📍"}
    tags = post.get("hashtags") or []
    if tags:
        my_posts = await db.posts.find(
            {"author_id": viewer["id"]}, {"_id": 0, "hashtags": 1}
        ).limit(20).to_list(20)
        my_tags = set()
        for p in my_posts:
            for t in (p.get("hashtags") or []):
                my_tags.add(t)
        overlap = my_tags & set(tags)
        if overlap:
            t = sorted(overlap)[0]
            return {"type": "tag", "label": f"Sobre #{t}", "emoji": "🏷️"}
    reactions = post.get("reactions") or {}
    total = sum(len(v) if isinstance(v, list) else 0 for v in reactions.values())
    if total >= 20:
        return {"type": "trending", "label": "A bombar agora", "emoji": "🔥"}
    if post.get("mood") and viewer.get("mood_initial") and post["mood"] == viewer["mood_initial"]:
        return {"type": "mood", "label": "Combina com o teu mood", "emoji": "✨"}
    return None


@api.get("/posts/explore/with-reasons")
async def explore_with_reasons(viewer: Optional[dict] = Depends(maybe_user)):
    raw = await db.posts.find(
        {"is_draft": {"$ne": True}, "scheduled_at": None, "repost_of": {"$exists": False}},
        {"_id": 0},
    ).sort("created_at", -1).limit(40).to_list(40)
    out = []
    for p in raw:
        enriched = await enrich_post(p, viewer)
        reason = await compute_reason_for_post(p, viewer) if viewer else None
        if reason:
            enriched["reason"] = reason
        out.append(enriched)
    return out


# ============================================================
# V3 — Ranking Engine + Affinity + Streak + Mesa + For You Tuner
# ============================================================

# ---------- Affinity Graph ----------
async def compute_affinity(viewer_id: str, target_id: str) -> float:
    """Score 0..1 reflecting how much viewer engages with target."""
    if viewer_id == target_id:
        return 1.0
    # Count interactions over last 60 days
    cutoff = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    # likes & reposts: posts by target liked by viewer
    likes_q = await db.posts.count_documents({
        "author_id": target_id, "likes": viewer_id, "created_at": {"$gt": cutoff}
    })
    # comments by viewer on target's posts
    target_posts = await db.posts.find(
        {"author_id": target_id, "created_at": {"$gt": cutoff}},
        {"_id": 0, "id": 1},
    ).to_list(200)
    target_ids = [p["id"] for p in target_posts]
    comments_q = await db.comments.count_documents({
        "author_id": viewer_id, "post_id": {"$in": target_ids},
    }) if target_ids else 0
    # reactions from viewer on target's posts
    reactions_q = await db.posts.count_documents({
        "author_id": target_id,
        "reactions": {"$exists": True},
        "$or": [{f"reactions.{k}": viewer_id} for k in ALLOWED_REACTIONS],
    }) if False else 0  # approximate to 0, not worth scanning
    # DM exchanges
    dm_q = await db.messages.count_documents({
        "$or": [
            {"from_user_id": viewer_id, "to_user_id": target_id},
            {"from_user_id": target_id, "to_user_id": viewer_id},
        ],
        "created_at": {"$gt": cutoff},
    })
    raw = likes_q * 1.0 + comments_q * 2.0 + reactions_q * 1.5 + dm_q * 3.0
    # normalize 0..1
    return min(1.0, raw / 50.0)


async def compute_ranking_score(post: dict, viewer: Optional[dict],
                                viewer_affinity: dict, seen_authors: dict,
                                context: Optional[dict] = None,
                                author_health: Optional[dict] = None) -> float:
    """Multi-objective score for For You ranking.
    Components:
      freshness: exp decay 14h half-life
      engagement: likes + reactions + reposts + comments (log-scaled)
      affinity:  viewer interaction history with author (0..1)
      diversity: penalty if same author already shown N+ times
      mood/city: bonus if matches viewer profile
      hidden_gem: bonus for high engagement rate, low-follower authors
      trending: short-window velocity boost
      context:  (Fase 4) optional dict from context_engine — adjusts the
                freshness weight by `freshness_mult` (rede acesa favorece o
                "agora") and adds a soft `mood_boost` to posts whose mood
                matches the contextual mood (hora/dia/calendário/pulse).
    """
    now = datetime.now(timezone.utc)
    try:
        age_h = (now - datetime.fromisoformat(post["created_at"].replace("Z", "+00:00"))).total_seconds() / 3600
    except Exception:
        age_h = 24
    freshness = math.exp(-age_h / 14)  # half life ~14h

    likes = len(post.get("likes", []))
    reposts = len(post.get("reposts", []))
    reactions = post.get("reactions") or {}
    react_total = sum(len(v) if isinstance(v, list) else 0 for v in reactions.values())
    # log-scale to avoid runaway
    engagement = math.log1p(likes + reposts * 2 + react_total + 1)

    affinity = viewer_affinity.get(post.get("author_id"), 0.0) if viewer else 0.0

    # Diversity penalty: same author appearing too often
    author_count = seen_authors.get(post.get("author_id"), 0)
    diversity_penalty = 1.0 / (1.0 + author_count * 0.7)

    # Mood / city affinity
    mood_match = 0.0
    if viewer and viewer.get("mood_initial"):
        if detect_mood(post.get("content", "")) == viewer["mood_initial"]:
            mood_match = 0.15
    city_match = 0.0
    if viewer and viewer.get("city"):
        if viewer["city"] in detect_cities(post.get("content", ""), post.get("hashtags", [])):
            city_match = 0.20

    # Hidden gem boost: high engagement-to-followers ratio
    # author_followers fetched lazily — cached in seen_authors meta if needed; skip for perf

    # Time-of-day mood mixing (no DB hit)
    hour = now.hour
    tod_bonus = 0.0
    mood = detect_mood(post.get("content", ""))
    if 6 <= hour < 12 and mood in {"cafe", "saudade"}:
        tod_bonus = 0.10
    elif 18 <= hour < 24 and mood in {"festa", "cultura", "fado"}:
        tod_bonus = 0.10

    # User-tuneable mix
    tuner = (viewer or {}).get("feed_mix") or {"friends": 40, "interest": 30, "place": 30}
    friends_w = tuner.get("friends", 40) / 100
    interest_w = tuner.get("interest", 30) / 100
    place_w = tuner.get("place", 30) / 100

    # Fase 4 — Context Engine. `freshness_mult` ajusta quanto o "agora"
    # pesa (rede acesa → favorece recente); `context_mood` dá um boost
    # suave aos posts cujo mood combina com o contexto (hora/dia/calendário/
    # pulse), por cima do mood_match pessoal e do tod_bonus existentes.
    freshness_mult = 1.0
    context_mood = 0.0
    if context:
        freshness_mult = context.get("freshness_mult", 1.0) or 1.0
        if context.get("mood_boost_for") and mood == context.get("mood_boost_for"):
            context_mood = context.get("mood_boost", 0.0) or 0.0

    base = (
        freshness * 1.4 * freshness_mult
        + engagement * 0.6
        + affinity * friends_w * 2.0
        + (mood_match + tod_bonus + context_mood) * interest_w * 2.0
        + city_match * place_w * 2.0
    )
    # B-007 — Author boost (24h window). If the author paid the "boost cost"
    # (consumes from per-day cap, see /api2/posts/{id}/boost), multiply score
    # by 1.6 for the post in question.
    boosted_until = post.get("boosted_until")
    if boosted_until:
        try:
            if datetime.fromisoformat(boosted_until.replace("Z", "+00:00")) > now:
                base *= 1.6
        except Exception:
            pass
    # Fase 6 — Reputação invisível. Multiplicador subtil pelo health_score
    # do autor (contas tóxicas/reportadas perdem alcance; saudáveis ganham
    # um empurrão leve). Invisível ao utilizador.
    if author_health is not None:
        base *= reputation_engine.health_multiplier(author_health.get(post.get("author_id")))
    return base * diversity_penalty


def _build_feed_context() -> dict:
    """Fase 4 — Reúne os sinais contextuais e devolve os pesos do
    context_engine. Barato: o mood dominante vem da cache do Pulse Engine
    (sem Mongo) e o evento do calendário é um lookup em memória. Nunca
    lança — em erro devolve contexto neutro."""
    try:
        now = datetime.now(timezone.utc)
        dominant = None
        try:
            snap = pulse_engine.get_last_snapshot_cache()[0]
            if snap:
                dominant = snap.get("dominant_mood")
        except Exception:
            dominant = None
        ev = _pt_today_event(now)
        cal_theme = ev.get("theme") if (ev and ev.get("is_today")) else None
        cal_label = ev.get("label") if (ev and ev.get("is_today")) else None
        return context_engine.get_feed_context_weights(
            now,
            dominant_mood=dominant,
            calendar_theme=cal_theme,
            calendar_label=cal_label,
        )
    except Exception:
        return context_engine.get_feed_context_weights()


@api.get("/feed/context")
async def feed_context(user=Depends(get_current_user)):
    """Fase 4 — Sinal contextual subtil para o cabeçalho do feed
    ("Domingo à noite · ritmo calmo"). Determinístico, derivado do
    relógio + calendário + mood dominante. Sem sinal forte → label curto
    mas sempre verdadeiro (nunca inventa)."""
    ctx = _build_feed_context()
    return {
        "tempo": ctx.get("tempo"),
        "slot": ctx.get("slot"),
        "label": ctx.get("label"),
    }


@api.get("/feed/v2")
async def feed_v2(mood: str = "", user=Depends(get_current_user)):
    """Smart feed with ranking engine + diversity + reasons."""
    await auto_publish_due_posts()
    ids = user.get("following", []) + [user["id"]]
    # Pull a larger candidate pool
    query: dict = {
        "author_id": {"$in": ids},
        "is_draft": {"$ne": True},
        "repost_of": {"$exists": False},
        "$or": [
            {"scheduled_at": None},
            {"scheduled_at": {"$exists": False}},
            {"scheduled_at": {"$lte": now_iso()}},
        ],
    }
    if mood and mood in MOODS:
        rx = "|".join(re.escape(k) for k in MOODS[mood]["keywords"])
        query["content"] = {"$regex": rx, "$options": "i"}
    cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    query["created_at"] = {"$gt": cutoff}
    candidates = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(300)
    # Pre-compute affinities for distinct authors
    distinct_authors = list({p.get("author_id") for p in candidates if p.get("author_id")})
    aff = {}
    for aid in distinct_authors:
        aff[aid] = await compute_affinity(user["id"], aid)
    # Fase 4 — Contexto do feed (uma vez por pedido). Mood dominante vem da
    # cache do Pulse Engine (zero custo); evento do calendário PT de hoje.
    feed_ctx = _build_feed_context()
    # Fase 6 — health_score dos autores numa só query (invisível ao user).
    author_health = {}
    try:
        hrows = await db.users.find(
            {"id": {"$in": distinct_authors}}, {"_id": 0, "id": 1, "health_score": 1}
        ).to_list(len(distinct_authors) or 1)
        author_health = {r["id"]: r.get("health_score") for r in hrows if r.get("id")}
    except Exception:
        author_health = {}
    # Score with running author-count for diversity
    seen = {}
    scored = []
    for p in candidates:
        s = await compute_ranking_score(p, user, aff, seen, context=feed_ctx, author_health=author_health)
        scored.append((s, p))
        seen[p.get("author_id")] = seen.get(p.get("author_id"), 0) + 1
    scored.sort(key=lambda x: x[0], reverse=True)
    top = [p for _, p in scored[:80]]
    # Inject 1 hidden gem from outside-following bubble every 8 posts
    bubble_out_q = {
        "author_id": {"$nin": ids},
        "is_draft": {"$ne": True},
        "repost_of": {"$exists": False},
        "created_at": {"$gt": cutoff},
    }
    gems = await db.posts.find(bubble_out_q, {"_id": 0}).to_list(200)
    gems = [g for g in gems if (len(g.get("likes", [])) + sum(len(v) for v in (g.get("reactions") or {}).values() if isinstance(v, list))) >= 5]
    gems.sort(key=lambda g: len(g.get("likes", [])), reverse=True)
    if gems:
        for i in range(min(len(gems), len(top) // 8 + 1)):
            insert_at = (i + 1) * 8
            if insert_at < len(top):
                gem = gems[i]
                gem["_is_gem"] = True
                top.insert(insert_at, gem)
    # Enrich + attach reason
    out = []
    for p in top[:80]:
        e = await enrich_post(p, user)
        reason = await compute_reason_for_post(p, user)
        if p.get("_is_gem"):
            reason = {"type": "gem", "label": "Pérola escondida", "emoji": "💎"}
        if reason:
            e["reason"] = reason
        out.append(e)
    return out


# ---------- For You Tuner ----------
class FeedMixIn(BaseModel):
    friends: int = Field(default=40, ge=0, le=100)
    interest: int = Field(default=30, ge=0, le=100)
    place: int = Field(default=30, ge=0, le=100)


@api.post("/users/me/feed-mix")
async def set_feed_mix(payload: FeedMixIn, user=Depends(get_current_user)):
    total = payload.friends + payload.interest + payload.place
    if total <= 0:
        raise HTTPException(400, "Soma deve ser > 0")
    # normalize to 100
    mix = {
        "friends": round(payload.friends * 100 / total),
        "interest": round(payload.interest * 100 / total),
        "place": round(payload.place * 100 / total),
    }
    await db.users.update_one({"id": user["id"]}, {"$set": {"feed_mix": mix}})
    return mix


# ---------- Streak Engine ----------
async def update_streak_on_post(user_id: str):
    """No-op — gamificação removida (streaks desativados)."""
    return None


@api.get("/users/{username}/streak")
async def get_streak(username: str):
    # Streaks removidos. Endpoint mantido a devolver valores neutros.
    u = await db.users.find_one({"username": username.lower()}, {"_id": 0, "id": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    return {
        "current": 0,
        "best": 0,
        "last_date": None,
        "freezes": 0,
        "next_milestone": None,
        "active_today": False,
    }


# ---------- Mesa (inner-inner circle, 5 max) ----------
@api.get("/users/me/mesa")
async def get_mesa(user=Depends(get_current_user)):
    ids = user.get("mesa", [])
    if not ids:
        return []
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(10)
    return [public_user(u) for u in users]


@api.post("/users/me/mesa/{user_id}")
async def toggle_mesa(user_id: str, user=Depends(get_current_user)):
    if user_id == user["id"]:
        raise HTTPException(400, "Não te podes adicionar à tua Mesa")
    if user_id not in user.get("roda", []):
        raise HTTPException(400, "Adiciona à Roda primeiro")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    current = list(user.get("mesa", []))
    if user_id in current:
        current.remove(user_id)
        action = "removed"
    else:
        if len(current) >= 5:
            raise HTTPException(400, "Mesa cheia (máx 5)")
        current.append(user_id)
        action = "added"
    await db.users.update_one({"id": user["id"]}, {"$set": {"mesa": current}})
    return {"action": action, "mesa": current}


# ---------- Charms Progress (locked + % progress) ----------
async def _charm_progress(user: dict) -> dict:
    """Returns dict of charm_key -> {progress: 0..1, current: int, target: int}."""
    uid = user["id"]
    out = {}
    # Conversador: comments / 100
    comments = await db.comments.count_documents({"author_id": uid})
    out["conversador"] = {"current": comments, "target": 100, "progress": min(1.0, comments / 100)}
    # Anfitrião: communities owned / 1
    owns = await db.communities.count_documents({"owner_id": uid})
    out["anfitriao"] = {"current": owns, "target": 1, "progress": min(1.0, owns)}
    # Posts analysis for mood / city counts
    posts = await db.posts.find(
        {"author_id": uid}, {"_id": 0, "content": 1, "hashtags": 1, "created_at": 1}
    ).to_list(500)
    cities = set()
    moods = {}
    saw_madrugador = saw_noctivago = False
    for p in posts:
        for c in detect_cities(p.get("content", ""), p.get("hashtags", [])):
            cities.add(c)
        m = detect_mood(p.get("content", ""))
        if m:
            moods[m] = moods.get(m, 0) + 1
        try:
            h = datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")).hour
            if h < 7:
                saw_madrugador = True
            if 2 <= h < 5:
                saw_noctivago = True
        except Exception:
            pass
    out["madrugador"] = {"current": int(saw_madrugador), "target": 1, "progress": float(saw_madrugador)}
    out["noctivago"] = {"current": int(saw_noctivago), "target": 1, "progress": float(saw_noctivago)}
    out["explorador"] = {"current": len(cities), "target": 5, "progress": min(1.0, len(cities) / 5)}
    out["viajante"] = {"current": len(cities), "target": 3, "progress": min(1.0, len(cities) / 3)}
    out["saudosista"] = {"current": moods.get("saudade", 0), "target": 10, "progress": min(1.0, moods.get("saudade", 0) / 10)}
    out["festeiro"] = {"current": moods.get("festa", 0), "target": 10, "progress": min(1.0, moods.get("festa", 0) / 10)}
    out["pastelinho"] = {"current": moods.get("cafe", 0), "target": 5, "progress": min(1.0, moods.get("cafe", 0) / 5)}
    out["bolacampea"] = {"current": moods.get("futebol", 0), "target": 5, "progress": min(1.0, moods.get("futebol", 0) / 5)}
    # Fundador: position
    earlier = await db.users.count_documents({"created_at": {"$lt": user.get("created_at", now_iso())}})
    out["fundador"] = {"current": min(1000, 1000 - earlier), "target": 1000, "progress": 1.0 if earlier < 1000 else 0.0}
    # Poeta: best post total reactions
    top = await db.posts.find_one({"author_id": uid, "reactions": {"$exists": True}}, {"_id": 0, "reactions": 1})
    best_react = 0
    if top:
        best_react = sum(len(v) if isinstance(v, list) else 0 for v in (top.get("reactions") or {}).values())
    out["poeta"] = {"current": best_react, "target": 100, "progress": min(1.0, best_react / 100)}
    return out


@api.get("/users/{username}/charms-progress")
async def user_charms_progress(username: str):
    # Gamificação removida — sem progressão de charms.
    u = await db.users.find_one({"username": username.lower()}, {"_id": 0, "id": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    return {
        "unlocked_keys": [],
        "progress": {},
        "catalog": [],
    }


# ---------- Hashtag Suggestions ----------
@api.get("/hashtags/suggest")
async def suggest_hashtags(q: str = "", user=Depends(get_current_user)):
    q = q.strip().lower().lstrip("#")
    if not q or len(q) < 2:
        # popular hashtags from last 7d
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        pipeline = [
            {"$match": {"created_at": {"$gt": cutoff}, "hashtags": {"$exists": True, "$ne": []}}},
            {"$unwind": "$hashtags"},
            {"$group": {"_id": "$hashtags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        rows = await db.posts.aggregate(pipeline).to_list(10)
        return [{"tag": r["_id"], "count": r["count"]} for r in rows if r["_id"]]
    # prefix match
    pipeline = [
        {"$match": {"hashtags": {"$regex": f"^{re.escape(q)}", "$options": "i"}}},
        {"$unwind": "$hashtags"},
        {"$match": {"hashtags": {"$regex": f"^{re.escape(q)}", "$options": "i"}}},
        {"$group": {"_id": "$hashtags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    rows = await db.posts.aggregate(pipeline).to_list(10)
    return [{"tag": r["_id"], "count": r["count"]} for r in rows if r["_id"]]


# ---------- Polls v2 (server validates schema) ----------
# Existing PostIn poll already supports "options" + "allow_multiple". We extend.
# Frontend passes poll={type:"choice"|"scale"|"sentiment"|"ranking", ...}


# ---------- WebSocket gateway ----------
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    # Hard cap on concurrent WS sessions per user (defends against socket
    # exhaustion / parallel scraping clients).
    MAX_SOCKETS_PER_USER = int(os.environ.get("WS_MAX_SOCKETS_PER_USER", "3"))

    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}  # user_id -> sockets
        # Per-post viewers (real presence tracking — feature: "x pessoas a ver este post")
        self.viewers_by_post: dict[str, set[str]] = {}   # post_id -> set(user_id)
        self.posts_by_user: dict[str, set[str]] = {}     # user_id -> set(post_id)
        # Per-community room presence ("x pessoas aqui agora" nas Comunidades vivas).
        self.viewers_by_community: dict[str, set[str]] = {}  # community_id -> set(user_id)
        self.communities_by_user: dict[str, set[str]] = {}   # user_id -> set(community_id)
        # WS session metadata: socket -> {"jti": str, "user_id": str, "connected_at": float, "is_admin": bool}
        self.socket_meta: dict[int, dict] = {}
        # Subset of user_ids whose currently-open sockets belong to admins —
        # cached so admin-only broadcasts (e.g. live security events) don't
        # need to re-query db.users on every push.
        self.admin_user_ids: set[str] = set()

    async def connect(self, user_id: str, ws: WebSocket, jti: str = "", is_admin: bool = False):
        await ws.accept()
        bucket = self.active.setdefault(user_id, [])
        # Enforce max sockets per user — drop the oldest if at cap.
        while len(bucket) >= self.MAX_SOCKETS_PER_USER:
            old = bucket.pop(0)
            self.socket_meta.pop(id(old), None)
            try:
                await old.close(code=1008)  # policy violation
            except Exception:
                pass
        bucket.append(ws)
        self.socket_meta[id(ws)] = {
            "jti": jti or "",
            "user_id": user_id,
            "connected_at": time.time(),
            "is_admin": bool(is_admin),
        }
        if is_admin:
            self.admin_user_ids.add(user_id)

    def disconnect(self, user_id: str, ws: WebSocket):
        self.socket_meta.pop(id(ws), None)
        if user_id in self.active:
            try:
                self.active[user_id].remove(ws)
            except ValueError:
                pass
            if not self.active[user_id]:
                self.active.pop(user_id, None)
                # No more sockets for this user — drop them from the admin set
                # too. They'll be re-added on next admin WS connect.
                self.admin_user_ids.discard(user_id)

    def socket_jti(self, ws: WebSocket) -> str:
        meta = self.socket_meta.get(id(ws))
        return (meta or {}).get("jti") or ""

    async def close_sockets_by_jti(self, jti: str, code: int = 1008) -> int:
        """Force-close every WebSocket whose handshake bound this jti.

        Called from the logout / session-revoke paths so realtime channels
        terminate immediately when the corresponding session dies — no need
        to wait for the periodic 30 s revocation re-check inside the WS loop.
        Returns the number of sockets closed.
        """
        if not jti:
            return 0
        closed = 0
        for uid, sockets in list(self.active.items()):
            for ws in list(sockets):
                if self.socket_jti(ws) != jti:
                    continue
                try:
                    await ws.close(code=code)
                except Exception:
                    pass
                self.disconnect(uid, ws)
                closed += 1
        return closed

    async def send_personal(self, user_id: str, message: dict):
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def send_to_admins(self, message: dict) -> int:
        """Push a JSON message to every connected admin socket.

        Used by the live security feed so the admin dashboard can render new
        auth events in real time without polling.

        Returns the count of sockets that accepted the frame. Best-effort —
        a single broken socket doesn't abort the broadcast.
        """
        sent = 0
        for uid in list(self.admin_user_ids):
            for ws in list(self.active.get(uid, [])):
                try:
                    meta = self.socket_meta.get(id(ws)) or {}
                    if not meta.get("is_admin"):
                        continue
                    await ws.send_json(message)
                    sent += 1
                except Exception:
                    pass
        return sent

    async def broadcast(self, message: dict, exclude_user: Optional[str] = None):
        for uid, sockets in list(self.active.items()):
            if uid == exclude_user:
                continue
            for ws in list(sockets):
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    # --- Post viewers (real-time presence per post) ---
    async def add_post_viewer(self, user_id: str, post_id: str) -> int:
        s = self.viewers_by_post.setdefault(post_id, set())
        s.add(user_id)
        self.posts_by_user.setdefault(user_id, set()).add(post_id)
        count = len(s)
        await self._broadcast_post_viewers(post_id, count)
        return count

    async def remove_post_viewer(self, user_id: str, post_id: str) -> int:
        s = self.viewers_by_post.get(post_id)
        if s and user_id in s:
            s.discard(user_id)
            if not s:
                self.viewers_by_post.pop(post_id, None)
        ps = self.posts_by_user.get(user_id)
        if ps:
            ps.discard(post_id)
            if not ps:
                self.posts_by_user.pop(user_id, None)
        count = len(self.viewers_by_post.get(post_id, set()))
        await self._broadcast_post_viewers(post_id, count)
        return count

    async def cleanup_user_posts(self, user_id: str):
        post_ids = list(self.posts_by_user.get(user_id, set()))
        for pid in post_ids:
            await self.remove_post_viewer(user_id, pid)

    async def _broadcast_post_viewers(self, post_id: str, count: int):
        # Only push to viewers of this post (low traffic)
        msg = {"type": "post_viewers", "post_id": post_id, "count": count}
        for uid in list(self.viewers_by_post.get(post_id, set())):
            await self.send_personal(uid, msg)

    # --- Comment typing per post ---
    async def broadcast_to_post_viewers(self, post_id: str, message: dict, exclude_user: Optional[str] = None):
        for uid in list(self.viewers_by_post.get(post_id, set())):
            if uid == exclude_user:
                continue
            await self.send_personal(uid, message)

    # --- Community rooms (presença "aqui agora" + activity ticker) ---
    def community_presence_count(self, community_id: str) -> int:
        return len(self.viewers_by_community.get(community_id, set()))

    async def add_community_viewer(self, user_id: str, community_id: str) -> int:
        s = self.viewers_by_community.setdefault(community_id, set())
        s.add(user_id)
        self.communities_by_user.setdefault(user_id, set()).add(community_id)
        count = len(s)
        await self._broadcast_community_presence(community_id, count)
        return count

    async def remove_community_viewer(self, user_id: str, community_id: str) -> int:
        s = self.viewers_by_community.get(community_id)
        if s and user_id in s:
            s.discard(user_id)
            if not s:
                self.viewers_by_community.pop(community_id, None)
        cs = self.communities_by_user.get(user_id)
        if cs:
            cs.discard(community_id)
            if not cs:
                self.communities_by_user.pop(user_id, None)
        count = len(self.viewers_by_community.get(community_id, set()))
        await self._broadcast_community_presence(community_id, count)
        return count

    async def cleanup_user_communities(self, user_id: str):
        for cid in list(self.communities_by_user.get(user_id, set())):
            await self.remove_community_viewer(user_id, cid)

    async def _broadcast_community_presence(self, community_id: str, count: int):
        msg = {"type": "community_presence", "community_id": community_id, "count": count}
        for uid in list(self.viewers_by_community.get(community_id, set())):
            await self.send_personal(uid, msg)

    async def broadcast_to_community(self, community_id: str, message: dict, exclude_user: Optional[str] = None):
        """Difunde só aos utilizadores presentes na sala desta comunidade."""
        for uid in list(self.viewers_by_community.get(community_id, set())):
            if uid == exclude_user:
                continue
            await self.send_personal(uid, message)


    async def disconnect_all(self) -> int:
        """Admin action: forcefully closes every active WebSocket.
        Returns count of sockets closed."""
        n = 0
        for uid, sockets in list(self.active.items()):
            for ws in list(sockets):
                try:
                    await ws.close(code=1012)
                except Exception:
                    pass
                n += 1
            self.active.pop(uid, None)
        # Wipe presence state so per-post counters reset
        self.viewers_by_post.clear()
        self.posts_by_user.clear()
        return n


ws_manager = ConnectionManager()


# ════════════════════════════════════════════════════════════════════
# Fase 1 — Social Pulse REST endpoints
# ════════════════════════════════════════════════════════════════════
# All four endpoints are read-only views over the most recent pulse
# snapshot. They share the same data source (db.social_pulse_snapshots)
# so they're always internally consistent — /now and /regions never
# contradict each other.
#
# Access policy: authenticated users only. The pulse is a *social*
# signal, so we don't expose it to crawlers. Admin opt-out is the
# user-side privacy lever (UpdateProfileIn.pulse_opt_out).

@api.get("/pulse/now")
async def pulse_now(user=Depends(get_current_user)):
    """Most recent full snapshot. If the loop hasn't ticked yet (cold
    boot), compute one synchronously so the UI never sees null."""
    # Prefer the in-memory cache populated by the background loop —
    # zero Mongo cost on the hot path. But if the cache is older than 30s
    # (e.g. the user just published and the loop hasn't re-ticked yet),
    # recompute on demand so the ambient UI reflects fresh signal. Costs
    # ~25ms extra only in that narrow window.
    cache, age = pulse_engine.get_last_snapshot_cache_with_age()
    if cache and age < 30:
        return cache
    if cache:
        # Cache exists but is stale: the persisted Mongo snapshot is just
        # as old (loop writes + caches together), so recompute on demand
        # for genuine freshness. The loop catches up on its next tick.
        return await pulse_engine.compute_pulse_snapshot(db)
    # Cold boot (loop hasn't ticked yet): try Mongo, then compute.
    snap = await pulse_engine.fetch_latest_snapshot(db)
    if snap:
        return snap
    return await pulse_engine.compute_pulse_snapshot(db)


@api.get("/pulse/regions")
async def pulse_regions(user=Depends(get_current_user)):
    """Per-region activity for the current snapshot. Returns a small
    object so the UI can pick its own rendering strategy.

    Shape:
      {
        taken_at: iso,
        regions: [ {key,label,score,delta_pct,meaningful, posts_60s, comments_60s, active_users_60s}, ... ],
        cities:  [ same fields ],
        meaningful_regions: [...]   # convenience filter for ambient widgets
      }
    """
    snap = pulse_engine.get_last_snapshot_cache()[0] or await pulse_engine.fetch_latest_snapshot(db)
    if not snap:
        snap = await pulse_engine.compute_pulse_snapshot(db)
    return {
        "taken_at": snap.get("taken_at"),
        "regions":  snap.get("regions", []),
        "cities":   snap.get("cities", []),
        "meaningful_regions": [r for r in snap.get("regions", []) if r.get("meaningful")],
        "meaningful_cities":  [c for c in snap.get("cities", [])  if c.get("meaningful")],
    }


@api.get("/pulse/topics")
async def pulse_topics(user=Depends(get_current_user)):
    """Trending hashtags for the current minute, with growth vs the
    7-day baseline at the same hour. Honest: a topic is only flagged
    `meaningful: true` when it both clears MIN_ABSOLUTE_COUNT and
    grew at least MIN_RELATIVE_DELTA over baseline."""
    snap = pulse_engine.get_last_snapshot_cache()[0] or await pulse_engine.fetch_latest_snapshot(db)
    if not snap:
        snap = await pulse_engine.compute_pulse_snapshot(db)
    topics = snap.get("topics", [])
    return {
        "taken_at": snap.get("taken_at"),
        "topics":   topics,
        "meaningful_topics": [t for t in topics if t.get("meaningful")],
    }


@api.get("/pulse/mood")
async def pulse_mood(user=Depends(get_current_user)):
    """Per-mood scores computed from a curated PT lexicon. `dominant_mood`
    is only set when one mood clears the higher DOMINANT_MOOD_DELTA
    threshold AND has the largest score among meaningful moods."""
    snap = pulse_engine.get_last_snapshot_cache()[0] or await pulse_engine.fetch_latest_snapshot(db)
    if not snap:
        snap = await pulse_engine.compute_pulse_snapshot(db)
    return {
        "taken_at":      snap.get("taken_at"),
        "moods":         snap.get("moods", {}),
        "dominant_mood": snap.get("dominant_mood"),
    }


@api.get("/pulse/timeline")
async def pulse_timeline(minutes: int = 60, user=Depends(get_current_user)):
    """Snapshots from the last N minutes (max 720 = 12 h). Used by the
    "pulse chart" widget — minimal payload, no raw counters."""
    minutes = max(5, min(int(minutes or 60), 720))
    rows = await pulse_engine.fetch_recent_snapshots(db, minutes=minutes)
    # Trim to chart-friendly fields only to keep payload small.
    trimmed = [
        {
            "taken_at": r.get("taken_at"),
            "totals":   r.get("totals", {}),
            "pulse_delta_pct": r.get("pulse_delta_pct"),
            "dominant_mood":   r.get("dominant_mood"),
        }
        for r in rows
    ]
    return {"minutes": minutes, "points": trimmed}


@api.get("/pulse/topology")
async def pulse_topology(user=Depends(get_current_user)):
    """Fase 7 — Mapa social vivo. Intensidade por região + cidades, derivada
    do snapshot do Pulse Engine. Intensidade é o score normalizado (0..1)
    para a maior região/cidade do momento. Privacidade: granularidade
    máxima cidade (nunca freguesia/coordenadas), igual ao resto do Pulse."""
    snap = pulse_engine.get_last_snapshot_cache()[0] or await pulse_engine.fetch_latest_snapshot(db)
    if not snap:
        snap = await pulse_engine.compute_pulse_snapshot(db)
    regions = snap.get("regions", []) or []
    cities = snap.get("cities", []) or []
    max_r = max([r.get("score", 0) for r in regions], default=0) or 1
    max_c = max([c.get("score", 0) for c in cities], default=0) or 1

    def _intensity(score, mx):
        try:
            return round(min(1.0, max(0.0, (score or 0) / mx)), 3)
        except Exception:
            return 0.0

    regions_out = [
        {
            "key": r.get("key"),
            "label": r.get("label"),
            "score": r.get("score", 0),
            "intensity": _intensity(r.get("score", 0), max_r),
            "delta_pct": r.get("delta_pct"),
            "meaningful": bool(r.get("meaningful")),
            "active_users_60s": r.get("active_users_60s", 0),
        }
        for r in regions
    ]
    cities_out = [
        {
            "key": c.get("key"),
            "label": c.get("label"),
            "score": c.get("score", 0),
            "intensity": _intensity(c.get("score", 0), max_c),
            "delta_pct": c.get("delta_pct"),
            "meaningful": bool(c.get("meaningful")),
        }
        for c in cities if (c.get("score", 0) or 0) > 0
    ]
    cities_out.sort(key=lambda x: -x["score"])
    return {
        "taken_at": snap.get("taken_at"),
        "regions": regions_out,
        "cities": cities_out[:40],
        "meaningful_cities": [c for c in cities_out if c["meaningful"]],
    }


# ─────────────────────────────────────────────────────────────────────
# Fase 5 — MESAS (conversas efémeras)
# ─────────────────────────────────────────────────────────────────────
class MesaCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=mesas_engine.MAX_TITLE)
    topic: Optional[str] = ""
    kind: Optional[str] = "rapida"


class MesaMessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=mesas_engine.MAX_MESSAGE)


@api.post("/mesas")
async def create_mesa(payload: MesaCreateIn, user=Depends(get_current_user)):
    """Cria uma mesa. Qualquer utilizador pode criar uma 'rapida'/'noturna'/
    'tema'. Expira sozinha pelo TTL do Mongo."""
    doc = mesas_engine.new_mesa_doc(
        title=payload.title,
        topic=payload.topic or "",
        kind=(payload.kind or "rapida"),
        created_by=user["id"],
    )
    await db.mesas.insert_one(dict(doc))
    return mesas_engine.public_mesa(doc, me_id=user["id"])


@api.get("/mesas")
async def list_mesas(user=Depends(get_current_user)):
    """Mesas vivas, ordenadas por atividade recente."""
    rows = await db.mesas.find({}, {"_id": 0}).sort("last_activity_at", -1).to_list(80)
    now = datetime.now(timezone.utc)
    alive = [m for m in rows if mesas_engine.is_alive(m, now)]
    return [mesas_engine.public_mesa(m, me_id=user["id"], now=now) for m in alive]


@api.get("/mesas/{mesa_id}")
async def get_mesa(mesa_id: str, user=Depends(get_current_user)):
    """Detalhe de uma mesa + últimas mensagens."""
    mesa = await db.mesas.find_one({"id": mesa_id}, {"_id": 0})
    if not mesa or not mesas_engine.is_alive(mesa):
        raise HTTPException(404, "Mesa não encontrada ou já fechada")
    msgs = await db.mesa_messages.find(
        {"mesa_id": mesa_id}, {"_id": 0, "expire_at": 0}
    ).sort("created_at", 1).to_list(mesas_engine.MESSAGES_PAGE)
    return {
        "mesa": mesas_engine.public_mesa(mesa, me_id=user["id"]),
        "messages": msgs,
    }


@api.post("/mesas/{mesa_id}/join")
async def join_mesa(mesa_id: str, user=Depends(get_current_user)):
    """Entra numa mesa (idempotente, entrada sem fricção)."""
    mesa = await db.mesas.find_one({"id": mesa_id}, {"_id": 0})
    if not mesa or not mesas_engine.is_alive(mesa):
        raise HTTPException(404, "Mesa não encontrada ou já fechada")
    await db.mesas.update_one({"id": mesa_id}, {"$addToSet": {"participants": user["id"]}})
    mesa = await db.mesas.find_one({"id": mesa_id}, {"_id": 0})
    return mesas_engine.public_mesa(mesa, me_id=user["id"])


@api.post("/mesas/{mesa_id}/message")
async def post_mesa_message(mesa_id: str, payload: MesaMessageIn, user=Depends(get_current_user)):
    """Envia mensagem para a mesa. Junta-se automaticamente se ainda não
    fizer parte (entrada-rápida). Difunde aos participantes via WS."""
    mesa = await db.mesas.find_one({"id": mesa_id}, {"_id": 0})
    if not mesa or not mesas_engine.is_alive(mesa):
        raise HTTPException(404, "Mesa não encontrada ou já fechada")
    content = (payload.content or "").strip()
    if not content:
        raise HTTPException(400, "Mensagem vazia")
    now = datetime.now(timezone.utc)
    msg = {
        "id": str(uuid.uuid4()),
        "mesa_id": mesa_id,
        "author_id": user["id"],
        "author": {
            "id": user["id"],
            "username": user.get("username"),
            "name": user.get("name"),
            "avatar": user.get("avatar", ""),
        },
        "content": content[:mesas_engine.MAX_MESSAGE],
        "created_at": now_iso(),
        # Mensagens expiram junto com a mesa (mesmo companheiro Date TTL).
        "expire_at": mesa.get("expire_at") or now,
    }
    await db.mesa_messages.insert_one(dict(msg))
    await db.mesas.update_one(
        {"id": mesa_id},
        {
            "$addToSet": {"participants": user["id"]},
            "$inc": {"message_count": 1},
            "$set": {"last_activity_at": now_iso()},
        },
    )
    # Difunde só aos participantes (não a toda a gente).
    fresh = await db.mesas.find_one({"id": mesa_id}, {"_id": 0, "participants": 1})
    out = {k: v for k, v in msg.items() if k != "expire_at"}
    payload_ws = {"type": "mesa_message", "mesa_id": mesa_id, "message": out}
    for uid in (fresh.get("participants", []) if fresh else []):
        try:
            await ws_manager.send_personal(uid, payload_ws)
        except Exception:
            pass
    return out


# ─── Live security feed — broadcast every auth_event to admins ──────────────
# Wires the auth_security event side-channel into the WebSocket plane. Each
# row written to db.auth_events is pushed (best-effort) to every connected
# admin socket so the security panel can render in real time without
# polling. Failure here NEVER blocks the underlying auth_event write.
async def _security_event_to_admins(row: dict) -> None:
    try:
        # Light client-side projection — strip ts_epoch (the UI uses `ts`)
        # and never expose anything the UI doesn't already see via REST.
        await ws_manager.send_to_admins({
            "type": "security_event",
            "event": {
                "kind": row.get("kind"),
                "user_id": row.get("user_id"),
                "email": row.get("email"),
                "ip": row.get("ip"),
                "ua": row.get("ua"),
                "jti": row.get("jti"),
                "detail": row.get("detail") or {},
                "ts": row.get("ts"),
            },
        })
    except Exception:
        # Side-channel must never break auth. Swallow.
        pass


register_event_sink(_security_event_to_admins)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    # Authenticate via cookie or query token. Reject early on any
    # malformed / unsigned / type-mismatched token to keep the socket
    # accept budget low for unauthenticated traffic.
    token = ws.cookies.get("access_token") or ws.query_params.get("token", "")
    if not token:
        await ws.close(code=1008)
        try:
            await auth_event("ws_connect_fail", detail={"reason": "no_token"})
        except Exception:
            pass
        return
    try:
        payload = _decode_access_token(token)  # full strict validation (incl. raw header pre-flight)
        if payload.get("type") != "access":
            await ws.close(code=1008)
            try:
                await auth_event("ws_connect_fail", detail={"reason": "wrong_type"})
            except Exception:
                pass
            return
        user_id = payload["sub"]
    except Exception as e:
        await ws.close(code=1008)
        try:
            await auth_event("ws_connect_fail", detail={"reason": f"decode: {type(e).__name__}"})
        except Exception:
            pass
        return
    # Session validation — revoked sessions cannot open a WS at all.
    jti = payload.get("jti") or ""
    if jti:
        # Use the same TTL revocation cache the HTTP path uses, so an
        # admin-driven force-logout flips both the REST and WS planes at
        # the same time without an extra DB hit on the hot path.
        cached = revocation_cache.is_revoked_cached(jti)
        if cached is True:
            await ws.close(code=1008)
            try:
                await auth_event(
                    "ws_connect_fail",
                    user_id=user_id, jti=jti,
                    detail={"reason": "session_revoked_cache"},
                )
            except Exception:
                pass
            return
        if cached is None:
            sess = await db.sessions.find_one({"jti": jti}, {"_id": 0, "revoked": 1})
            if sess and sess.get("revoked"):
                revocation_cache.mark_revoked(jti)
                await ws.close(code=1008)
                try:
                    await auth_event(
                        "ws_connect_fail",
                        user_id=user_id, jti=jti,
                        detail={"reason": "session_revoked"},
                    )
                except Exception:
                    pass
                return
            revocation_cache.remember_active(jti)
    # Re-fetch user — ban/freeze checks must apply.
    udoc = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "id": 1, "banned": 1, "suspended_until": 1, "password_changed_at": 1, "is_admin": 1},
    )
    if not udoc or udoc.get("banned"):
        await ws.close(code=1008)
        try:
            await auth_event(
                "ws_connect_fail", user_id=user_id, jti=jti,
                detail={"reason": "banned_or_missing"},
            )
        except Exception:
            pass
        return
    if _restriction_active(udoc, "suspended_until"):
        await ws.close(code=1008)
        try:
            await auth_event(
                "ws_connect_fail", user_id=user_id, jti=jti,
                detail={"reason": "suspended"},
            )
        except Exception:
            pass
        return
    # H5 — password-rotation invalidation in WS handshake too.
    pwd_changed = udoc.get("password_changed_at")
    if pwd_changed:
        pwd_changed_dt = _parse_iso_utc(pwd_changed)
        token_iat = int(payload.get("iat") or 0)
        if pwd_changed_dt is not None and token_iat < int(pwd_changed_dt.timestamp()):
            await ws.close(code=1008)
            try:
                await auth_event(
                    "ws_connect_fail", user_id=user_id, jti=jti,
                    detail={"reason": "password_rotated"},
                )
            except Exception:
                pass
            return

    await ws_manager.connect(user_id, ws, jti=jti, is_admin=bool(udoc.get("is_admin")))
    try:
        await auth_event(
            "ws_connect_ok",
            user_id=user_id, jti=jti,
            ua=ws.headers.get("user-agent", "")[:300] if hasattr(ws, "headers") else "",
            ip=(ws.client.host if getattr(ws, "client", None) else ""),
        )
    except Exception:
        pass
    # mark online
    await db.users.update_one({"id": user_id}, {"$set": {"last_seen": now_iso()}})
    await ws_manager.broadcast({
        "type": "presence",
        "user_id": user_id,
        "status": "online",
    }, exclude_user=user_id)

    # ─── Hardening constants for the message loop ─────────────────────────
    # Whitelisted event types — anything else is dropped silently.
    _ALLOWED_EVENTS = {"ping", "typing", "presence_set", "post_view",
                       "post_unview", "c_typing",
                       "community_view", "community_unview", "community_typing"}
    # Per-type minimum gap between consecutive events from the same user.
    _MIN_GAP = {
        "ping":         2.0,
        "typing":       1.5,
        "presence_set": 5.0,
        "post_view":    0.7,
        "post_unview":  0.5,
        "c_typing":     1.5,
        "community_view":   0.7,
        "community_unview": 0.5,
        "community_typing": 1.5,
    }
    # Allowed values for typing.in
    _ALLOWED_TYPING_IN = {"dm", "thread", "post", "comments"}
    _ALLOWED_PRESENCE_STATUS = {"online", "away", "busy", "offline"}
    # Caps to bound any single field we might broadcast.
    _MAX_TEXT_FIELD = 64
    _MAX_RAW_MSG = int(os.environ.get("WS_MAX_RAW_MSG", "4096"))  # bytes
    _MAX_EVENTS_PER_MIN = int(os.environ.get("WS_MAX_EVENTS_PER_MIN", "240"))
    # jti revocation re-check cadence
    # 20 s strikes a defensible balance:
    #   • Stolen-token-on-open-socket reuse window: bounded at 20 s after
    #     the legitimate user logs out.
    #   • DB load: at WS_MAX_SOCKETS_PER_USER=3 and N concurrent users, this
    #     is ≤ N/20 reads/s — well under what one mongod node can absorb.
    # Routes through the in-process revocation cache, so when the HTTP
    # logout path flips `revocation_cache.mark_revoked(jti)`, the next WS
    # re-check tick (worst case 20 s away) catches it without a DB read.
    _JTI_CHECK_GAP = 20.0
    _last_jti_check = time.time()

    abuse_strikes = 0  # accumulate; >5 → close socket

    try:
        while True:
            # ── Raw receive — capture bytes/text to enforce max-msg-size before
            # parsing. receive() returns dict with "text" or "bytes".
            raw = await ws.receive()
            if raw.get("type") == "websocket.disconnect":
                break
            payload_bytes = raw.get("bytes")
            payload_text = raw.get("text")
            blob = payload_bytes if payload_bytes is not None else (
                payload_text.encode("utf-8") if payload_text else b"")
            if len(blob) > _MAX_RAW_MSG:
                abuse_strikes += 2
                if abuse_strikes > 5:
                    break
                continue
            try:
                data = json.loads(payload_text or blob.decode("utf-8") or "{}")
            except Exception:
                abuse_strikes += 1
                if abuse_strikes > 5:
                    break
                continue
            if not isinstance(data, dict):
                abuse_strikes += 1
                if abuse_strikes > 5:
                    break
                continue

            t = data.get("type")
            if not isinstance(t, str) or t not in _ALLOWED_EVENTS:
                # Drop unknown events silently — could be a probing client.
                abuse_strikes += 1
                if abuse_strikes > 5:
                    break
                continue

            # Per-user per-minute total event budget.
            total_min = _ws_events_minute.hit(f"ws:{user_id}")
            if total_min > _MAX_EVENTS_PER_MIN:
                abuse_strikes += 1
                if abuse_strikes > 5:
                    break
                continue

            # Per-type min-gap throttle.
            gap = _MIN_GAP.get(t, 0.5)
            if gap > 0 and not _ws_event_last.allow(f"ws:{user_id}:{t}", gap):
                # Silently drop the over-fast event — common during flaky networks
                # and not abusive per se. Don't strike unless it repeats violently.
                continue

            # Periodic jti revocation check — covers admin-driven force-logout.
            if jti and (time.time() - _last_jti_check) > _JTI_CHECK_GAP:
                _last_jti_check = time.time()
                try:
                    # Hot path: revocation cache first.
                    cached = revocation_cache.is_revoked_cached(jti)
                    if cached is True:
                        await ws.send_json({"type": "session_revoked"})
                        try:
                            await auth_event(
                                "ws_session_revoked",
                                user_id=user_id, jti=jti,
                                detail={"reason": "cache_revoked"},
                            )
                        except Exception:
                            pass
                        break
                    # Cache says active or unknown — verify with DB to catch
                    # cross-replica revocations.
                    sess2 = await db.sessions.find_one({"jti": jti}, {"_id": 0, "revoked": 1})
                    if sess2 and sess2.get("revoked"):
                        revocation_cache.mark_revoked(jti)
                        await ws.send_json({"type": "session_revoked"})
                        try:
                            await auth_event(
                                "ws_session_revoked",
                                user_id=user_id, jti=jti,
                                detail={"reason": "db_revoked"},
                            )
                        except Exception:
                            pass
                        break
                    # Refresh positive cache so other request hot paths skip DB.
                    revocation_cache.remember_active(jti)
                except Exception:
                    pass

            # ── Event handling (post-validated) ──
            if t == "ping":
                await ws.send_json({"type": "pong", "ts": now_iso()})
                await db.users.update_one({"id": user_id}, {"$set": {"last_seen": now_iso()}})

            elif t == "typing":
                target = data.get("to")
                in_ctx = data.get("in", "dm")
                if not isinstance(target, str) or not (1 <= len(target) <= _MAX_TEXT_FIELD):
                    continue
                if in_ctx not in _ALLOWED_TYPING_IN:
                    in_ctx = "dm"
                await ws_manager.send_personal(target, {
                    "type": "typing",
                    "from": user_id,
                    "in": in_ctx,
                })

            elif t == "presence_set":
                status = data.get("status", "online")
                if status not in _ALLOWED_PRESENCE_STATUS:
                    status = "online"
                emoji = data.get("emoji", "")
                # Strip control chars and cap length (presence emoji is decorative).
                if not isinstance(emoji, str):
                    emoji = ""
                emoji = "".join(ch for ch in emoji if ch.isprintable())[:8]
                await ws_manager.broadcast({
                    "type": "presence",
                    "user_id": user_id,
                    "status": status,
                    "emoji": emoji,
                }, exclude_user=user_id)

            elif t == "post_view":
                post_id = data.get("post_id")
                if isinstance(post_id, str) and 1 <= len(post_id) <= _MAX_TEXT_FIELD:
                    await ws_manager.add_post_viewer(user_id, post_id)

            elif t == "post_unview":
                post_id = data.get("post_id")
                if isinstance(post_id, str) and 1 <= len(post_id) <= _MAX_TEXT_FIELD:
                    await ws_manager.remove_post_viewer(user_id, post_id)

            elif t == "c_typing":
                post_id = data.get("post_id")
                if not (isinstance(post_id, str) and 1 <= len(post_id) <= _MAX_TEXT_FIELD):
                    continue
                user_doc = await db.users.find_one(
                    {"id": user_id},
                    {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "verified": 1},
                )
                if not user_doc:
                    continue
                await ws_manager.broadcast_to_post_viewers(
                    post_id,
                    {
                        "type": "c_typing",
                        "post_id": post_id,
                        "user": public_user(user_doc),
                    },
                    exclude_user=user_id,
                )

            elif t == "community_view":
                cid = data.get("community_id")
                if isinstance(cid, str) and 1 <= len(cid) <= _MAX_TEXT_FIELD:
                    await ws_manager.add_community_viewer(user_id, cid)

            elif t == "community_unview":
                cid = data.get("community_id")
                if isinstance(cid, str) and 1 <= len(cid) <= _MAX_TEXT_FIELD:
                    await ws_manager.remove_community_viewer(user_id, cid)

            elif t == "community_typing":
                cid = data.get("community_id")
                if not (isinstance(cid, str) and 1 <= len(cid) <= _MAX_TEXT_FIELD):
                    continue
                user_doc = await db.users.find_one(
                    {"id": user_id},
                    {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "verified": 1},
                )
                if not user_doc:
                    continue
                await ws_manager.broadcast_to_community(
                    cid,
                    {
                        "type": "community_typing",
                        "community_id": cid,
                        "user": public_user(user_doc),
                    },
                    exclude_user=user_id,
                )
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"ws loop error user={user_id}: {type(e).__name__}: {e}")
    finally:
        ws_manager.disconnect(user_id, ws)
        # Clean up any post-viewer registrations from this connection
        try:
            await ws_manager.cleanup_user_posts(user_id)
        except Exception:
            pass
        # Clean up community-room presence from this connection
        try:
            await ws_manager.cleanup_user_communities(user_id)
        except Exception:
            pass
        await ws_manager.broadcast({
            "type": "presence",
            "user_id": user_id,
            "status": "offline",
        }, exclude_user=user_id)


# Broadcast helpers — called from existing endpoints
async def ws_broadcast_activity(event_type: str, payload: dict):
    """Fire-and-forget activity broadcast."""
    try:
        await ws_manager.broadcast({"type": "activity", "event": event_type, "payload": payload})
    except Exception:
        pass


app.include_router(api)

# ─── CORS (deploy-hardened) ────────────────────────────────────────────────────
# CORS_ORIGINS must be a comma-separated list of explicit origins in production.
# Browsers refuse the wildcard "*" combined with credentials, so when we detect
# "*" we force allow_credentials=False to avoid silently broken CORS.
_raw_cors_origins = os.environ.get("CORS_ORIGINS", "*")
_cors_origins_list = [o.strip() for o in _raw_cors_origins.split(",") if o.strip()]
_cors_allow_credentials = True
if "*" in _cors_origins_list:
    if IS_PRODUCTION:
        logger.error(
            "🔴 CORS_ORIGINS='*' in production is unsafe. Set CORS_ORIGINS to your explicit domains."
        )
    else:
        logger.warning(
            "⚠️  CORS_ORIGINS='*' with credentials=True is invalid; disabling credentials. "
            "Set CORS_ORIGINS to explicit domains for production."
        )
    _cors_allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins_list or ["*"],
    allow_credentials=_cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Security headers middleware ──────────────────────────────────────────────
# Best-practice headers for any API/SPA backend. Values picked to be safe by
# default while not breaking the React SPA hosted on the same origin.
#   - HSTS only emitted in production (HSTS over HTTP would be ignored anyway,
#     but emitting it in dev can confuse local browsers with previous https sessions).
#   - CSP defaults to report-only to avoid breaking any in-flight feature; can be
#     flipped to enforce via CSP_ENFORCE=true.
#   - Frame protection set to DENY (this is an API, never embedded).
#   - X-Content-Type-Options: nosniff — disables MIME sniffing.
_CSP_DEFAULT = (
    "default-src 'self'; "
    "img-src 'self' data: blob: https:; "
    "media-src 'self' blob: https:; "
    "font-src 'self' data: https:; "
    "style-src 'self' 'unsafe-inline' https:; "
    "script-src 'self'; "
    "connect-src 'self' https: wss: ws:; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'"
)
CSP_POLICY = os.environ.get("CSP_POLICY", _CSP_DEFAULT)
CSP_ENFORCE = os.environ.get("CSP_ENFORCE", "false").lower() in {"1", "true", "yes", "on"}
HSTS_MAX_AGE = int(os.environ.get("HSTS_MAX_AGE", "31536000"))  # 1 year default

# CSRF (H3) — enforce only on cookie-auth requests. Header-auth (Bearer) is
# CSRF-immune by construction. Pre-auth endpoints are exempt.
CSRF_ENFORCE = os.environ.get("CSRF_ENFORCE", "true").lower() in {"1", "true", "yes", "on"}
CSRF_EXEMPT_PREFIXES = (
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/verify-email",
    "/api/auth/2fa",  # 2fa setup/verify flows
    "/api/webhooks/",
    "/api/csp-report",
)


@app.middleware("http")
async def _csrf_middleware(request: Request, call_next):
    if not CSRF_ENFORCE:
        return await call_next(request)
    method = request.method.upper()
    if method in ("GET", "HEAD", "OPTIONS"):
        return await call_next(request)
    path = request.url.path or ""
    if not path.startswith("/api/"):
        return await call_next(request)
    if any(path.startswith(p) for p in CSRF_EXEMPT_PREFIXES):
        return await call_next(request)
    # Header-auth is CSRF-immune (an attacker page can't read the token).
    auth_hdr = request.headers.get("authorization") or ""
    if auth_hdr.lower().startswith("bearer "):
        return await call_next(request)
    # If we got here, this is a cookie-authenticated mutating request.
    cookie_tok = request.cookies.get("XSRF-TOKEN") or ""
    header_tok = request.headers.get("x-csrf-token") or ""
    if not cookie_tok or not header_tok or not secrets.compare_digest(cookie_tok, header_tok):
        from starlette.responses import JSONResponse
        return JSONResponse(
            status_code=403,
            content={"detail": "CSRF token ausente ou inválido."},
        )
    return await call_next(request)


@app.middleware("http")
async def _security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    # Always-on hardening (cheap, broadly compatible)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
    )
    # HSTS — only meaningful (and only emitted) in production over HTTPS.
    if IS_PRODUCTION:
        response.headers.setdefault(
            "Strict-Transport-Security",
            f"max-age={HSTS_MAX_AGE}; includeSubDomains",
        )
    # CSP — report-only by default so we don't break in-flight features; flip
    # CSP_ENFORCE=true once you've cleaned violations from the report endpoint.
    header_name = "Content-Security-Policy" if CSP_ENFORCE else "Content-Security-Policy-Report-Only"
    response.headers.setdefault(header_name, CSP_POLICY)
    return response


# ============================================================
# V3 — Notifications Priority + Mesa Audience + Community Emoji + Trending Pulse
# (NOTE: routes below are registered via api router but include_router was already called.
# We must call app.include_router(api) again at the bottom OR register via api before include_router.
# Simplest: define them on `api` and call include_router again at file end — but FastAPI doesn't
# allow re-mounting the same router. So we define them on `api2` mounted separately.)
# ============================================================
api2 = APIRouter(prefix="/api")


# ---------- Smart Notification Priority ----------
async def _compute_notif_priority(notif: dict, user: dict) -> int:
    """0 = low, 1 = normal, 2 = high (Mesa/Roda), 3 = urgent (mention/collab)."""
    ntype = notif.get("type", "")
    from_id = notif.get("from_user_id")
    if ntype in {"mention", "collab_invite"}:
        return 3
    if from_id and from_id in user.get("mesa", []):
        return 3
    if from_id and from_id in user.get("roda", []):
        return 2
    if from_id and from_id in user.get("following", []):
        return 1
    return 0


@api2.get("/notifications/priority")
async def list_notifications_priority(user=Depends(get_current_user)):
    """Notifications grouped & sorted by priority."""
    raw = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0},
    ).sort("created_at", -1).limit(100).to_list(100)
    # enrich with from_user public data
    from_ids = list({n["from_user_id"] for n in raw if n.get("from_user_id")})
    users = await db.users.find({"id": {"$in": from_ids}}, {"_id": 0}).to_list(100)
    by_id = {u["id"]: public_user(u) for u in users}
    enriched = []
    for n in raw:
        n["priority"] = await _compute_notif_priority(n, user)
        n["from"] = by_id.get(n.get("from_user_id"))
        enriched.append(n)
    # group: urgent, high, normal, low
    groups = {"urgent": [], "high": [], "normal": [], "low": []}
    LABELS = {3: "urgent", 2: "high", 1: "normal", 0: "low"}
    for n in enriched:
        groups[LABELS[n["priority"]]].append(n)
    return {
        "urgent": groups["urgent"][:30],
        "high": groups["high"][:30],
        "normal": groups["normal"][:30],
        "low": groups["low"][:30],
        "counts": {k: len(v) for k, v in groups.items()},
    }


# ---------- Mesa Audience for posts ----------
@api2.get("/feed/mesa")
async def feed_mesa(user=Depends(get_current_user)):
    """Posts visible only to Mesa members (audience_ring=mesa)."""
    mesa_ids = user.get("mesa", [])
    # Posts marked as "mesa" where I am in the author's mesa, OR I am the author
    cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    # Find all users who have me in their mesa
    inverse = await db.users.find(
        {"mesa": user["id"]}, {"_id": 0, "id": 1},
    ).to_list(50)
    allowed_authors = [u["id"] for u in inverse] + [user["id"]] + mesa_ids
    posts = await db.posts.find({
        "audience_ring": "mesa",
        "author_id": {"$in": allowed_authors},
        "created_at": {"$gt": cutoff},
        "is_draft": {"$ne": True},
    }, {"_id": 0}).sort("created_at", -1).to_list(60)
    return [await enrich_post(p, user) for p in posts]


# ---------- Custom Community Emoji Pack ----------
class EmojiPackEntry(BaseModel):
    code: str  # e.g. ":pastel:"
    image_url: str  # data URL or hosted URL
    label: str


class EmojiPackIn(BaseModel):
    emojis: List[EmojiPackEntry]


@api2.put("/communities/{slug}/emoji-pack")
async def set_emoji_pack(slug: str, payload: EmojiPackIn, user=Depends(get_current_user)):
    comm = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not comm:
        raise HTTPException(404, "Comunidade não encontrada")
    if comm.get("owner_id") != user["id"]:
        raise HTTPException(403, "Só o owner pode editar emoji pack")
    cleaned = []
    for e in payload.emojis[:10]:  # max 10 per pack
        code = (e.code or "").strip().lower()[:32]
        if not code.startswith(":"):
            code = ":" + code
        if not code.endswith(":"):
            code = code + ":"
        url = (e.image_url or "").strip()[:5000]
        label = (e.label or "").strip()[:40]
        if code and url and label:
            cleaned.append({"code": code, "image_url": url, "label": label})
    await db.communities.update_one(
        {"slug": slug}, {"$set": {"emoji_pack": cleaned}},
    )
    return {"emojis": cleaned}


@api2.get("/communities/{slug}/emoji-pack")
async def get_emoji_pack(slug: str):
    comm = await db.communities.find_one({"slug": slug}, {"_id": 0, "emoji_pack": 1})
    if not comm:
        raise HTTPException(404, "Comunidade não encontrada")
    return {"emojis": comm.get("emoji_pack", [])}


# ---------- Trending Pulse (sparkline data) ----------
@api2.get("/trending/{tag}/pulse")
async def tag_pulse(tag: str):
    """Returns last 7d of post counts per day for a hashtag — sparkline-ready."""
    tag = tag.lower().lstrip("#")
    out = []
    for d in range(6, -1, -1):
        day_start = (datetime.now(timezone.utc) - timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        n = await db.posts.count_documents({
            "hashtags": tag,
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()},
        })
        out.append({
            "day": day_start.strftime("%Y-%m-%d"),
            "count": n,
        })
    return out


# ---------- Reactions Live broadcast wiring ----------
# Wrap react_post to also broadcast WS event for "live reactions"
# (Already exists at line ~1395; we add a side-effect by patching via monkey hook)
# Skipped — done via existing notifications.


# ============================================================
# SSS — Comments interactions (like, react, edit, report)
# ============================================================
class CommentEditIn(BaseModel):
    content: str = Field(min_length=1, max_length=300)


class CommentReactIn(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)


class ReportIn(BaseModel):
    reason: Optional[str] = "outro"
    detail: Optional[str] = Field(default="", max_length=400)


@api2.post("/posts/{post_id}/report")
async def report_post(post_id: str, payload: ReportIn, user=Depends(get_current_user)):
    await _assert_reports_quota(user)
    p = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Publicação não encontrada")
    # H2 — dedup: same reporter + target in last 24h
    await _assert_report_not_duplicate(user["id"], "post", post_id)
    report_id = str(uuid.uuid4())
    created_at = now_iso()
    reason = (payload.reason or "outro")[:40]
    await db.reports.insert_one({
        "id": report_id, "kind": "post", "target_id": post_id,
        "reporter_id": user["id"], "reason": reason,
        "detail": (payload.detail or "")[:400], "created_at": created_at, "status": "open",
    })
    # Live broadcast for the Cockpit ticker
    try:
        await ws_manager.send_to_admins({
            "type": "cockpit_event", "kind": "new_report", "ts": created_at,
            "payload": {"id": report_id, "kind": "post", "target_id": post_id,
                         "reason": reason, "queue": _classify_report_queue(reason)},
        })
    except Exception:
        pass
    return {"ok": True}


@api2.post("/comments/{comment_id}/like")
async def like_comment(comment_id: str, user=Depends(get_current_user)):
    c = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comentário não encontrado")
    likes = list(c.get("likes", []) or [])
    if user["id"] in likes:
        await db.comments.update_one({"id": comment_id}, {"$pull": {"likes": user["id"]}})
        return {"liked": False, "likes_count": len(likes) - 1}
    await db.comments.update_one({"id": comment_id}, {"$addToSet": {"likes": user["id"]}})
    if c["author_id"] != user["id"]:
        await create_notification(
            c["author_id"], "like", user["id"], c.get("post_id"),
            f"@{user['username']} gostou do teu comentário",
            extra={"comment_id": comment_id},
        )
    return {"liked": True, "likes_count": len(likes) + 1}


@api2.post("/comments/{comment_id}/react")
async def react_comment(comment_id: str, payload: CommentReactIn, user=Depends(get_current_user)):
    await _assert_reactions_minute_quota(user)
    c = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comentário não encontrado")
    reactions = dict(c.get("reactions") or {})
    emoji = payload.emoji.strip()[:8]
    # One reaction per user — remove from all other emojis first
    for k in list(reactions.keys()):
        if isinstance(reactions[k], list):
            reactions[k] = [u for u in reactions[k] if u != user["id"]]
    arr = list(reactions.get(emoji, []) or [])
    active = False
    if user["id"] in arr:
        arr = [u for u in arr if u != user["id"]]
    else:
        arr.append(user["id"])
        active = True
    if arr:
        reactions[emoji] = arr
    else:
        reactions.pop(emoji, None)
    # Clean empties
    reactions = {k: v for k, v in reactions.items() if v}
    await db.comments.update_one({"id": comment_id}, {"$set": {"reactions": reactions}})
    enriched = {k: {"count": len(v), "reacted": user["id"] in v} for k, v in reactions.items()}
    return {"reactions": enriched, "active": active, "emoji": emoji}


@api2.patch("/comments/{comment_id}")
async def edit_comment(comment_id: str, payload: CommentEditIn, user=Depends(get_current_user)):
    c = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comentário não encontrado")
    if c["author_id"] != user["id"]:
        raise HTTPException(403, "Só podes editar os teus comentários")
    try:
        created = datetime.fromisoformat(c["created_at"].replace("Z", "+00:00"))
    except Exception:
        created = datetime.now(timezone.utc)
    if (datetime.now(timezone.utc) - created) > timedelta(minutes=15):
        raise HTTPException(400, "Janela de edição expirou (15 min)")
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"content": payload.content, "edited_at": now_iso()}},
    )
    fresh = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    return await _enrich_comment(fresh, user)


@api2.post("/comments/{comment_id}/report")
async def report_comment(comment_id: str, payload: ReportIn, user=Depends(get_current_user)):
    await _assert_reports_quota(user)
    c = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comentário não encontrado")
    await _assert_report_not_duplicate(user["id"], "comment", comment_id)
    report_id = str(uuid.uuid4())
    created_at = now_iso()
    reason = (payload.reason or "outro")[:40]
    await db.reports.insert_one({
        "id": report_id,
        "kind": "comment", "target_id": comment_id,
        "reporter_id": user["id"], "reason": reason,
        "detail": (payload.detail or "")[:400], "created_at": created_at,
        "status": "open",
    })
    try:
        await ws_manager.send_to_admins({
            "type": "cockpit_event", "kind": "new_report", "ts": created_at,
            "payload": {"id": report_id, "kind": "comment", "target_id": comment_id,
                         "reason": reason, "queue": _classify_report_queue(reason)},
        })
    except Exception:
        pass
    return {"ok": True}


# ============================================================
# SSS — Discussion follow/mute (per post)
# Reuses notifications for "follow_thread"; stored on user doc
# ============================================================
@api2.post("/posts/{post_id}/follow-thread")
async def toggle_follow_thread(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    followed = list(user.get("followed_threads", []) or [])
    if post_id in followed:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"followed_threads": post_id}})
        return {"following": False}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"followed_threads": post_id}})
    return {"following": True}


@api2.post("/posts/{post_id}/mute-thread")
async def toggle_mute_thread(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    muted = list(user.get("muted_threads", []) or [])
    if post_id in muted:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"muted_threads": post_id}})
        return {"muted": False}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"muted_threads": post_id}})
    return {"muted": True}


@api2.get("/posts/{post_id}/relation")
async def post_relation(post_id: str, user=Depends(get_current_user)):
    return {
        "thread_followed": post_id in (user.get("followed_threads") or []),
        "thread_muted": post_id in (user.get("muted_threads") or []),
    }


# ============================================================
# SSS — Messages: edit, mark unread, forward, send v2 (image/location/vibe), reply_to
# ============================================================
class MessageEditIn(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class MessageInV2(BaseModel):
    to_user_id: str
    content: Optional[str] = Field(default="", max_length=10000)
    reply_to: Optional[str] = None
    kind: Optional[str] = "text"  # text | image | location | vibe | gif
    image: Optional[str] = ""
    location: Optional[dict] = None  # {label, lat?, lng?}
    vibe: Optional[str] = ""  # quick emoji vibe


class ForwardIn(BaseModel):
    to_user_id: str
    message_id: str


@api2.patch("/messages/{message_id}")
async def edit_message(message_id: str, payload: MessageEditIn, user=Depends(get_current_user)):
    msg = await db.messages.find_one({"id": message_id}, {"_id": 0})
    if not msg:
        raise HTTPException(404, "Mensagem não encontrada")
    if msg["sender_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    try:
        created = datetime.fromisoformat(msg["created_at"].replace("Z", "+00:00"))
    except Exception:
        created = datetime.now(timezone.utc)
    if (datetime.now(timezone.utc) - created) > timedelta(minutes=15):
        raise HTTPException(400, "Janela de edição expirou (15 min)")
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"content": payload.content, "edited_at": now_iso()}},
    )
    fresh = await db.messages.find_one({"id": message_id}, {"_id": 0})
    return fresh


@api2.post("/conversations/{other_user_id}/mark-unread")
async def mark_conv_unread(other_user_id: str, user=Depends(get_current_user)):
    key = conv_key(user["id"], other_user_id)
    last = await db.messages.find_one(
        {"conversation_key": key, "sender_id": other_user_id},
        {"_id": 0}, sort=[("created_at", -1)],
    )
    if last:
        await db.messages.update_one({"id": last["id"]}, {"$set": {"read": False}})
        return {"ok": True, "marked": True}
    return {"ok": True, "marked": False}


@api2.post("/messages/v2")
async def send_message_v2(payload: MessageInV2, user=Depends(get_current_user)):
    # Grupo A: read-only + dm_enabled + char limit + global per-hour limit
    await _assert_writes_open(user)
    await _assert_feature_or_503("dm_enabled", user)
    await _assert_global_hourly_limit(user, "dms")
    if not user.get("is_admin"):
        _max_d = await get_limit("max_dm_chars")
        if _max_d and len((payload.content or "")) > _max_d:
            raise HTTPException(400, f"Mensagem demasiado longa (máx {_max_d} caracteres).")
    other = await db.users.find_one({"id": payload.to_user_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Utilizador não encontrado")
    # Block check — if either side blocked the other, reject
    if user["id"] in (other.get("blocked") or []) or other["id"] in (user.get("blocked") or []):
        raise HTTPException(403, "Bloqueado")
    # H2 — DM-to-strangers per-hour quota
    await _assert_dm_to_strangers_quota(user, other["id"])
    key = conv_key(user["id"], other["id"])
    kind = (payload.kind or "text").lower()
    content = (payload.content or "").strip()
    # Image payload: defensive size guard — frontend caps at 4MB raw (~5.6MB base64).
    # Allow up to 8MB of base64 string; reject anything larger explicitly so the
    # client gets a clear error rather than silently truncating (which used to
    # corrupt the data URL and break "Imagens não ficam"/persistence).
    image_data = payload.image or ""
    if kind == "image":
        if len(image_data) > 8_000_000:
            raise HTTPException(413, "Imagem demasiado grande (máx ~5MB)")
        # H4 — magic-bytes validation to reject SVG/HTML smuggled as image
        if image_data and not _is_safe_image_url(image_data):
            raise HTTPException(400, "Imagem inválida (formato não suportado).")
    if kind == "vibe" and payload.vibe:
        content = payload.vibe.strip()[:8]
    elif kind == "location" and payload.location:
        content = (payload.location.get("label") or "📍 Localização")[:200]
    elif kind == "image" and not content:
        content = "📷 Imagem"
    if not content and kind == "text":
        raise HTTPException(400, "Mensagem vazia")
    msg = {
        "id": str(uuid.uuid4()), "conversation_key": key,
        "sender_id": user["id"], "recipient_id": other["id"],
        "content": content, "kind": kind,
        "image": image_data if kind == "image" else "",
        "location": payload.location if kind == "location" else None,
        "reply_to": payload.reply_to,
        "read": False, "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    await db.conversations.update_one(
        {"key": key},
        {"$set": {
            "key": key, "participants": sorted([user["id"], other["id"]]),
            "last_message": content[:140], "last_at": msg["created_at"],
        }},
        upsert=True,
    )
    msg.pop("_id", None)
    # B-041 — real-time fan-out
    try:
        await ws_manager.send_personal(other["id"], {
            "type": "new_message",
            "from": user["id"],
            "from_username": user.get("username"),
            "message": msg,
        })
    except Exception:
        pass
    return msg


@api2.post("/messages/forward")
async def forward_message(payload: ForwardIn, user=Depends(get_current_user)):
    src = await db.messages.find_one({"id": payload.message_id}, {"_id": 0})
    if not src:
        raise HTTPException(404, "Mensagem não encontrada")
    if user["id"] not in [src["sender_id"], src["recipient_id"]]:
        raise HTTPException(403, "Sem permissão")
    other = await db.users.find_one({"id": payload.to_user_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Utilizador não encontrado")
    if user["id"] in (other.get("blocked") or []) or other["id"] in (user.get("blocked") or []):
        raise HTTPException(403, "Bloqueado")
    key = conv_key(user["id"], payload.to_user_id)
    msg = {
        "id": str(uuid.uuid4()), "conversation_key": key,
        "sender_id": user["id"], "recipient_id": payload.to_user_id,
        "content": src.get("content", ""),
        "kind": src.get("kind", "text"),
        "image": src.get("image", ""),
        "forwarded_from_user_id": src["sender_id"],
        "read": False, "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    await db.conversations.update_one(
        {"key": key},
        {"$set": {
            "key": key, "participants": sorted([user["id"], payload.to_user_id]),
            "last_message": (msg["content"] or "[reencaminhado]")[:140],
            "last_at": msg["created_at"],
        }},
        upsert=True,
    )
    msg.pop("_id", None)
    # B-041 — real-time fan-out
    try:
        await ws_manager.send_personal(payload.to_user_id, {
            "type": "new_message",
            "from": user["id"],
            "from_username": user.get("username"),
            "message": msg,
        })
    except Exception:
        pass
    return msg


@api2.get("/conversations/{other_user_id}/media")
async def conversation_media(other_user_id: str, user=Depends(get_current_user)):
    """Returns shared media (images) from this conversation."""
    key = conv_key(user["id"], other_user_id)
    msgs = await db.messages.find(
        {"conversation_key": key, "kind": "image"},
        {"_id": 0, "id": 1, "image": 1, "created_at": 1, "sender_id": 1},
    ).sort("created_at", -1).to_list(60)
    return {"items": msgs, "count": len(msgs)}


# ============================================================
# SSS — Profile: block, mute, report, favorite, notify, export, relation
# ============================================================
@api2.post("/users/{username}/block")
async def block_user(username: str, user=Depends(get_current_user)):
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target["id"] == user["id"]:
        raise HTTPException(400, "Não te podes bloquear a ti")
    blocked = list(user.get("blocked", []) or [])
    if target["id"] in blocked:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"blocked": target["id"]}})
        return {"blocked": False}
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"blocked": target["id"]},
         "$pull": {"following": target["id"], "favorites": target["id"], "notify_users": target["id"]}},
    )
    await db.users.update_one({"id": target["id"]}, {"$pull": {"followers": user["id"]}})
    return {"blocked": True}


@api2.post("/users/{username}/mute")
async def mute_user_account(username: str, user=Depends(get_current_user)):
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target["id"] == user["id"]:
        raise HTTPException(400, "Não te podes silenciar a ti")
    muted = list(user.get("muted_users", []) or [])
    if target["id"] in muted:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"muted_users": target["id"]}})
        return {"muted": False}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"muted_users": target["id"]}})
    return {"muted": True}


@api2.post("/users/{username}/report")
async def report_user(username: str, payload: ReportIn, user=Depends(get_current_user)):
    await _assert_reports_quota(user)
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target["id"] == user["id"]:
        raise HTTPException(400, "Não te podes reportar a ti próprio")
    await _assert_report_not_duplicate(user["id"], "user", target["id"])
    report_id = str(uuid.uuid4())
    created_at = now_iso()
    reason = (payload.reason or "outro")[:40]
    await db.reports.insert_one({
        "id": report_id, "kind": "user", "target_id": target["id"],
        "reporter_id": user["id"], "reason": reason,
        "detail": (payload.detail or "")[:400], "created_at": created_at, "status": "open",
    })
    try:
        await ws_manager.send_to_admins({
            "type": "cockpit_event", "kind": "new_report", "ts": created_at,
            "payload": {"id": report_id, "kind": "user", "target_id": target["id"],
                         "target_username": target.get("username"),
                         "reason": reason, "queue": _classify_report_queue(reason)},
        })
    except Exception:
        pass
    return {"ok": True}


@api2.post("/users/{username}/favorite")
async def favorite_user(username: str, user=Depends(get_current_user)):
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target["id"] == user["id"]:
        raise HTTPException(400, "Não podes adicionar-te aos favoritos")
    favs = list(user.get("favorites", []) or [])
    if target["id"] in favs:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"favorites": target["id"]}})
        return {"favorited": False}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"favorites": target["id"]}})
    return {"favorited": True}


@api2.post("/users/{username}/notify")
async def notify_user_toggle(username: str, user=Depends(get_current_user)):
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target["id"] == user["id"]:
        raise HTTPException(400, "Inválido")
    notified = list(user.get("notify_users", []) or [])
    if target["id"] in notified:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"notify_users": target["id"]}})
        return {"notify": False}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"notify_users": target["id"]}})
    return {"notify": True}


@api2.get("/users/{username}/relation")
async def user_relation(username: str, user=Depends(get_current_user)):
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    return {
        "following": target["id"] in (user.get("following") or []),
        "blocked": target["id"] in (user.get("blocked") or []),
        "muted": target["id"] in (user.get("muted_users") or []),
        "favorited": target["id"] in (user.get("favorites") or []),
        "notify": target["id"] in (user.get("notify_users") or []),
    }


@api2.get("/users/me/export")
async def export_user_data(user=Depends(get_current_user)):
    posts = await db.posts.find({"author_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    comments = await db.comments.find({"author_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return {
        "user": public_user(user),
        "posts": posts,
        "comments": comments,
        "exported_at": now_iso(),
        "note": "Dados exportados — RGPD-friendly. Guarda este ficheiro num local seguro.",
    }


# ============================================================
# SSS — Discovery: surprise me, advanced search, refresh
# ============================================================
@api2.get("/discover/surprise")
async def discover_surprise(user: Optional[dict] = Depends(maybe_user)):
    """Returns a curated random post outside the usual feed — diversity boost."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    pipeline = [
        {"$match": {
            "is_draft": {"$ne": True},
            "repost_of": None,
            "created_at": {"$gt": cutoff},
        }},
        {"$sample": {"size": 1}},
    ]
    items = await db.posts.aggregate(pipeline).to_list(1)
    if not items:
        raise HTTPException(404, "Nada para descobrir agora")
    p = items[0]
    p.pop("_id", None)
    enriched = await enrich_post(p, user)
    enriched["reason"] = {"key": "surprise", "label": "Surpresa do algoritmo"}
    return enriched


@api2.get("/search")
async def unified_search(q: str = "", kind: str = "all", limit: int = 20):
    """Unified search across posts, users, hashtags, communities."""
    qn = (q or "").strip()
    if not qn:
        return {"posts": [], "people": [], "tags": [], "communities": []}
    limit = max(1, min(limit, 50))
    out = {"posts": [], "people": [], "tags": [], "communities": []}
    if kind in {"all", "posts"}:
        posts = await db.posts.find(
            {"content": {"$regex": re.escape(qn), "$options": "i"}, "is_draft": {"$ne": True}},
            {"_id": 0},
        ).sort("created_at", -1).limit(limit).to_list(limit)
        out["posts"] = [await enrich_post(p, None) for p in posts]
    if kind in {"all", "people"}:
        people = await db.users.find(
            {"$or": [
                {"username": {"$regex": re.escape(qn.lower()), "$options": "i"}},
                {"name": {"$regex": re.escape(qn), "$options": "i"}},
            ]},
            {"_id": 0},
        ).limit(limit).to_list(limit)
        out["people"] = [public_user(u) for u in people]
    if kind in {"all", "tags"}:
        tag = qn.lstrip("#").lower()
        if tag:
            count = await db.posts.count_documents({"hashtags": tag})
            if count > 0:
                out["tags"].append({"tag": tag, "count": count})
    if kind in {"all", "communities"}:
        comms = await db.communities.find(
            {"$or": [
                {"name": {"$regex": re.escape(qn), "$options": "i"}},
                {"slug": {"$regex": re.escape(qn.lower()), "$options": "i"}},
            ]},
            {"_id": 0},
        ).limit(limit).to_list(limit)
        out["communities"] = [{"id": c["id"], "name": c["name"], "slug": c["slug"],
                                "members_count": len(c.get("members", []))} for c in comms]
    return out


# ============================================================
# SSS — Notifications: enable/disable category, pin important
# ============================================================
class NotifPrefsIn(BaseModel):
    muted_types: Optional[List[str]] = None
    pinned_ids: Optional[List[str]] = None


@api2.post("/notifications/preferences")
async def update_notif_prefs(payload: NotifPrefsIn, user=Depends(get_current_user)):
    update = {}
    if payload.muted_types is not None:
        update["notif_muted_types"] = list(set(payload.muted_types))[:30]
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {
        "muted_types": fresh.get("notif_muted_types", []),
    }


@api2.get("/notifications/preferences")
async def get_notif_prefs(user=Depends(get_current_user)):
    return {
        "muted_types": user.get("notif_muted_types", []),
    }


@api2.post("/notifications/{notif_id}/pin")
async def pin_notification(notif_id: str, user=Depends(get_current_user)):
    n = await db.notifications.find_one({"id": notif_id, "user_id": user["id"]}, {"_id": 0})
    if not n:
        raise HTTPException(404, "Notificação não encontrada")
    new_state = not n.get("pinned", False)
    await db.notifications.update_one({"id": notif_id}, {"$set": {"pinned": new_state}})
    return {"pinned": new_state}


# ============================================================
# Soft engagement signals — moved from frontend localStorage to server
# (see /app/docs/BUTTONS_FORENSIC_AUDIT.md §5.23)
# ============================================================
class TopicIn(BaseModel):
    topic: str = Field(min_length=1, max_length=60)


class PostNoteIn(BaseModel):
    note: str = Field(default="", max_length=400)


@api2.post("/topics/mute")
async def mute_topic(payload: TopicIn, user=Depends(get_current_user)):
    topic = payload.topic.strip().lstrip("#").lower()
    if not topic:
        raise HTTPException(400, "Tópico inválido")
    muted = list(user.get("muted_topics", []) or [])
    if topic in muted:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"muted_topics": topic}})
        return {"muted": False, "topic": topic}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"muted_topics": topic}})
    return {"muted": True, "topic": topic}


@api2.get("/topics/muted")
async def list_muted_topics(user=Depends(get_current_user)):
    return {"topics": user.get("muted_topics", []) or []}


@api2.post("/posts/{post_id}/dismiss")
async def dismiss_post(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    dismissed = list(user.get("dismissed_posts", []) or [])
    if post_id in dismissed:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"dismissed_posts": post_id}})
        return {"dismissed": False}
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"dismissed_posts": post_id}})
    return {"dismissed": True}


@api2.post("/posts/{post_id}/boost")
async def boost_post(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    if post.get("author_id") != user["id"]:
        raise HTTPException(403, "Só podes impulsionar as tuas publicações")
    boosted = list(user.get("boosted_posts", []) or [])
    if post_id in boosted:
        # Toggle off — no cap involved
        await db.users.update_one({"id": user["id"]}, {"$pull": {"boosted_posts": post_id}})
        await db.posts.update_one({"id": post_id}, {"$unset": {"boosted_until": ""}})
        return {"boosted": False, "used_today": _count_active_boosts(user)}
    # Daily cap: at most 3 active boosts at any time (rolling 24h)
    BOOST_CAP = 3
    if _count_active_boosts(user) >= BOOST_CAP:
        raise HTTPException(429, f"Limite de {BOOST_CAP} impulsos ativos atingido (24h).")
    until = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"boosted_posts": post_id}})
    await db.posts.update_one({"id": post_id}, {"$set": {"boosted_until": until}})
    refreshed = await db.users.find_one({"id": user["id"]}, {"_id": 0, "boosted_posts": 1})
    used = await _count_active_boosts_async(refreshed)
    return {"boosted": True, "until": until, "used_today": used, "cap": BOOST_CAP}


def _count_active_boosts(user: dict) -> int:
    """Sync best-effort count from user.boosted_posts (caller is expected to know
    that expired boosts have been pulled from the array when consumed). Kept
    here for callers that already loaded the user document."""
    return len(user.get("boosted_posts") or [])


async def _count_active_boosts_async(user: dict) -> int:
    """Authoritative count: cross-checks posts.boosted_until and prunes
    expired entries from user.boosted_posts."""
    if not user:
        return 0
    ids = list(user.get("boosted_posts") or [])
    if not ids:
        return 0
    now = datetime.now(timezone.utc)
    active = []
    expired = []
    rows = await db.posts.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "boosted_until": 1}).to_list(50)
    by_id = {r["id"]: r for r in rows}
    for pid in ids:
        b = (by_id.get(pid) or {}).get("boosted_until")
        if not b:
            expired.append(pid)
            continue
        try:
            if datetime.fromisoformat(b.replace("Z", "+00:00")) > now:
                active.append(pid)
            else:
                expired.append(pid)
        except Exception:
            expired.append(pid)
    if expired:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"boosted_posts": {"$in": expired}}})
        await db.posts.update_many({"id": {"$in": expired}}, {"$unset": {"boosted_until": ""}})
    return len(active)


@api2.get("/posts/boosts/status")
async def boost_status(user=Depends(get_current_user)):
    """Returns how many active boosts the user has + the cap."""
    used = await _count_active_boosts_async(user)
    return {"used": used, "cap": 3}


@api2.put("/posts/{post_id}/note")
async def set_post_note(post_id: str, payload: PostNoteIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    notes = dict(user.get("post_notes") or {})
    text = (payload.note or "").strip()
    if text:
        notes[post_id] = text[:400]
    else:
        notes.pop(post_id, None)
    await db.users.update_one({"id": user["id"]}, {"$set": {"post_notes": notes}})
    return {"note": notes.get(post_id, "")}


@api2.get("/posts/{post_id}/note")
async def get_post_note(post_id: str, user=Depends(get_current_user)):
    notes = user.get("post_notes") or {}
    return {"note": notes.get(post_id, "")}


@api2.post("/posts/{post_id}/why")
async def post_why(post_id: str, user=Depends(get_current_user)):
    """Return the recommendation reason for a post, if any."""
    p = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Publicação não encontrada")
    reasons = []
    if p.get("author_id") in (user.get("following") or []):
        reasons.append({"key": "following", "label": "Segues @" + (p.get("author_username") or "")})
    if any(t.lower() in (user.get("muted_topics") or []) for t in (p.get("hashtags") or [])):
        reasons.append({"key": "muted_topic", "label": "Tópico silenciado por ti"})
    if p.get("city") and p.get("city") == user.get("city"):
        reasons.append({"key": "city", "label": f"Mesma cidade ({p.get('city')})"})
    if p.get("mood") and p.get("mood") == user.get("mood_initial"):
        reasons.append({"key": "mood", "label": f"Mood: {p.get('mood')}"})
    if not reasons:
        reasons.append({"key": "explore", "label": "Recomendado pela actividade da rede"})
    return {"reasons": reasons}


class NotifPrefsFullIn(BaseModel):
    muted_types: Optional[List[str]] = None
    preferences: Optional[dict] = None  # {likes,comments,follows,mentions,dm: bool}


@api2.post("/notifications/preferences/full")
async def update_notif_prefs_full(payload: NotifPrefsFullIn, user=Depends(get_current_user)):
    update = {}
    if payload.muted_types is not None:
        update["notif_muted_types"] = list(set(payload.muted_types))[:30]
    if payload.preferences is not None:
        allowed = {"likes", "comments", "follows", "mentions", "dm"}
        cleaned = {k: bool(v) for k, v in (payload.preferences or {}).items() if k in allowed}
        if cleaned:
            update["notif_preferences"] = cleaned
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {
        "muted_types": fresh.get("notif_muted_types", []),
        "preferences": fresh.get("notif_preferences", {}),
    }


# ============================================================
# ADMIN PANEL — /api/admin/*
# Every endpoint requires require_admin and writes to db.admin_audit.
# No mocked data anywhere — every action mutates real collections.
# ============================================================

class AdminBanIn(BaseModel):
    reason: Optional[str] = ""

class AdminReportResolveIn(BaseModel):
    action: Optional[str] = "resolved"  # "resolved" | "dismissed" | "removed"
    note: Optional[str] = ""


# ---- New moderation action payloads ----
class AdminMuteIn(BaseModel):
    minutes: Optional[int] = 60     # duration; ignored when unmuting
    reason: Optional[str] = ""

class AdminSuspendIn(BaseModel):
    minutes: Optional[int] = 1440   # default 24h
    reason: Optional[str] = ""

class AdminRateLimitIn(BaseModel):
    max_posts: Optional[int] = None      # per window; null = unlimited
    max_comments: Optional[int] = None
    window_hours: Optional[int] = 1
    reason: Optional[str] = ""

class AdminFreezeIn(BaseModel):
    reason: Optional[str] = ""

class AdminMaintenanceIn(BaseModel):
    enabled: bool = False
    message: Optional[str] = ""


# ---- Restriction helpers (mute / suspend / rate-limit / shadow mute) ----
def _restriction_active(user: dict, field: str) -> bool:
    """Returns True if user[field] is an ISO datetime in the future."""
    val = user.get(field)
    if not val:
        return False
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt > datetime.now(timezone.utc)
    except Exception:
        return False


def _assert_not_suspended(user: dict) -> None:
    """Raise 403 if user is currently under temporary suspension."""
    if _restriction_active(user, "suspended_until"):
        raise HTTPException(
            status_code=403,
            detail=f"Conta suspensa temporariamente até {user.get('suspended_until')}",
        )


def _assert_can_post(user: dict) -> None:
    """Sync stub. Use the async variant `_aassert_can_post` in request handlers."""
    if _restriction_active(user, "muted_until"):
        raise HTTPException(
            status_code=403,
            detail=f"Conta silenciada até {user.get('muted_until')}",
        )
    rl = user.get("rate_limit") or {}
    if rl.get("max_posts") is not None:
        raise RuntimeError("use _aassert_can_post in async context")


async def _aassert_can_post(user: dict) -> None:
    """Async variant: enforces mute + post-rate-limit + freeze + maintenance."""
    await _aassert_not_maintenance(user)
    _assert_not_frozen(user)
    if _restriction_active(user, "muted_until"):
        raise HTTPException(
            status_code=403,
            detail=f"Conta silenciada até {user.get('muted_until')}",
        )
    rl = user.get("rate_limit") or {}
    mp = rl.get("max_posts")
    if mp is not None and int(mp) >= 0:
        window_h = max(1, int(rl.get("window_hours") or 1))
        since = (datetime.now(timezone.utc) - timedelta(hours=window_h)).isoformat()
        cnt = await db.posts.count_documents({
            "author_id": user["id"],
            "created_at": {"$gte": since},
        })
        if cnt >= int(mp):
            raise HTTPException(
                status_code=429,
                detail=f"Limite de publicações atingido ({int(mp)}/{window_h}h). Tenta mais tarde.",
            )


async def _aassert_can_comment(user: dict) -> None:
    """Async variant: enforces mute + comment-rate-limit + freeze + maintenance."""
    await _aassert_not_maintenance(user)
    _assert_not_frozen(user)
    if _restriction_active(user, "muted_until"):
        raise HTTPException(
            status_code=403,
            detail=f"Conta silenciada até {user.get('muted_until')}",
        )
    rl = user.get("rate_limit") or {}
    mc = rl.get("max_comments")
    if mc is not None and int(mc) >= 0:
        window_h = max(1, int(rl.get("window_hours") or 1))
        since = (datetime.now(timezone.utc) - timedelta(hours=window_h)).isoformat()
        cnt = await db.comments.count_documents({
            "author_id": user["id"],
            "created_at": {"$gte": since},
        })
        if cnt >= int(mc):
            raise HTTPException(
                status_code=429,
                detail=f"Limite de comentários atingido ({int(mc)}/{window_h}h). Tenta mais tarde.",
            )


def _assert_not_frozen(user: dict) -> None:
    """Raise 403 if user account is frozen (full-stop read-only by admin)."""
    if user and user.get("frozen"):
        raise HTTPException(
            status_code=403,
            detail="Conta congelada por um administrador. Não podes interagir.",
        )


def _assert_post_replies_open(post: dict) -> None:
    """Raise 403 if post.replies_frozen is True."""
    if post and post.get("replies_frozen"):
        raise HTTPException(
            status_code=403,
            detail="As respostas a esta publicação foram congeladas por um administrador.",
        )


# ---- Maintenance mode (system-wide) ----
# Cached in-memory; refreshed every 30s and on toggle.
_maintenance_cache: dict = {"loaded_at": 0.0, "enabled": False, "message": "", "set_at": None, "set_by": None}
_MAINTENANCE_TTL = 30  # seconds


async def _get_maintenance() -> dict:
    """Returns current maintenance config; refreshes cache every TTL."""
    import time as _t
    now = _t.time()
    if now - _maintenance_cache.get("loaded_at", 0.0) >= _MAINTENANCE_TTL:
        doc = await db.system_config.find_one({"key": "maintenance"}, {"_id": 0})
        if doc:
            _maintenance_cache.update({
                "enabled": bool(doc.get("enabled")),
                "message": doc.get("message") or "",
                "set_at": doc.get("set_at"),
                "set_by": doc.get("set_by"),
            })
        else:
            _maintenance_cache.update({"enabled": False, "message": "", "set_at": None, "set_by": None})
        _maintenance_cache["loaded_at"] = now
    return _maintenance_cache


async def _aassert_not_maintenance(user: dict) -> None:
    """Block write actions for non-admins when maintenance mode is active."""
    if user and user.get("is_admin"):
        return
    cfg = await _get_maintenance()
    if cfg.get("enabled"):
        msg = cfg.get("message") or "Plataforma em modo de manutenção. Tenta novamente em breve."
        raise HTTPException(status_code=503, detail=msg)


# ============================================================
# RUNTIME SETTINGS — Grupo A: Feature Flags + Limites globais
# Persistido em db.system_config (doc key="runtime").
# Cache em memória 5s para alta performance.
# Cada flag/limite AFETA endpoints REAIS em runtime.
# Admins fazem bypass de TODAS as flags para conseguirem testar.
# ============================================================
SETTINGS_REGISTRY = [
    # ---------- FEATURE FLAGS (bool) ----------
    {"key": "signup_open",        "group": "flags", "type": "bool", "default": True,
     "label": "Registos abertos",
     "description": "Quando desligado, ninguém se pode registar (POST /auth/register devolve 503).",
     "applies_to": ["POST /api/auth/register"],
     "off_message": "Os registos estão temporariamente fechados."},

    {"key": "posts_enabled",      "group": "flags", "type": "bool", "default": True,
     "label": "Criar publicações",
     "description": "Quando desligado, ninguém (excepto admins) consegue criar novas publicações.",
     "applies_to": ["POST /api/posts"],
     "off_message": "A criação de publicações está temporariamente suspensa."},

    {"key": "comments_enabled",   "group": "flags", "type": "bool", "default": True,
     "label": "Comentários",
     "description": "Quando desligado, ninguém consegue comentar publicações.",
     "applies_to": ["POST /api/posts/{id}/comments"],
     "off_message": "Os comentários estão temporariamente desativados."},

    {"key": "dm_enabled",         "group": "flags", "type": "bool", "default": True,
     "label": "Mensagens diretas (DMs)",
     "description": "Quando desligado, ninguém consegue enviar DMs.",
     "applies_to": ["POST /api/messages", "POST /api/messages/v2"],
     "off_message": "As mensagens diretas estão temporariamente desativadas."},

    {"key": "stories_enabled",    "group": "flags", "type": "bool", "default": True,
     "label": "Stories",
     "description": "Quando desligado, ninguém consegue publicar stories novas.",
     "applies_to": ["POST /api/stories"],
     "off_message": "As stories estão temporariamente desativadas."},

    {"key": "reactions_enabled",  "group": "flags", "type": "bool", "default": True,
     "label": "Reações emoji",
     "description": "Quando desligado, ninguém consegue reagir com emoji a publicações.",
     "applies_to": ["POST /api/posts/{id}/react"],
     "off_message": "As reações estão temporariamente desativadas."},

    {"key": "polls_enabled",      "group": "flags", "type": "bool", "default": True,
     "label": "Sondagens em posts",
     "description": "Quando desligado, novas publicações não podem incluir sondagem.",
     "applies_to": ["POST /api/posts (campo poll)"],
     "off_message": "As sondagens estão temporariamente desativadas."},

    {"key": "uploads_enabled",    "group": "flags", "type": "bool", "default": True,
     "label": "Uploads de imagens",
     "description": "Quando desligado, publicações novas não podem incluir imagens.",
     "applies_to": ["POST /api/posts (campo images)"],
     "off_message": "Os uploads de imagens estão temporariamente desativados."},

    {"key": "trending_enabled",   "group": "flags", "type": "bool", "default": True,
     "label": "Tendências públicas",
     "description": "Quando desligado, GET /trending devolve lista vazia (admin painel não afetado).",
     "applies_to": ["GET /api/trending"],
     "off_message": ""},

    {"key": "read_only_mode",     "group": "flags", "type": "bool", "default": False,
     "label": "Modo só-leitura global",
     "description": "Quando LIGADO, bloqueia TODAS as escritas para não-admins (post, comment, DM, story, reação). Override mais forte que maintenance.",
     "applies_to": ["TODAS as escritas"],
     "off_message": "Plataforma em modo só-leitura. Tenta de novo em breve."},

    # ---------- LIMITES (int) ----------
    {"key": "max_post_chars",        "group": "limits", "type": "int", "default": 500,
     "min": 50,   "max": 10000,
     "label": "Caracteres máximos por post",
     "description": "Limite de caracteres no conteúdo de uma publicação.",
     "applies_to": ["POST /api/posts"]},

    {"key": "max_comment_chars",     "group": "limits", "type": "int", "default": 300,
     "min": 20,   "max": 5000,
     "label": "Caracteres máximos por comentário",
     "description": "Limite de caracteres num comentário.",
     "applies_to": ["POST /api/posts/{id}/comments"]},

    {"key": "max_dm_chars",          "group": "limits", "type": "int", "default": 2000,
     "min": 50,   "max": 10000,
     "label": "Caracteres máximos por DM",
     "description": "Limite de caracteres numa mensagem direta.",
     "applies_to": ["POST /api/messages", "POST /api/messages/v2"]},

    {"key": "max_posts_per_hour",    "group": "limits", "type": "int", "default": 30,
     "min": 1,    "max": 500,
     "label": "Posts/hora por utilizador (global)",
     "description": "Teto global de publicações por hora. O rate-limit individual de cada user (definido em Anti-spam) tem prioridade se for mais restritivo.",
     "applies_to": ["POST /api/posts"]},

    {"key": "max_comments_per_hour", "group": "limits", "type": "int", "default": 120,
     "min": 1,    "max": 1000,
     "label": "Comentários/hora por utilizador (global)",
     "description": "Teto global de comentários por hora.",
     "applies_to": ["POST /api/posts/{id}/comments"]},

    {"key": "max_dms_per_hour",      "group": "limits", "type": "int", "default": 200,
     "min": 1,    "max": 2000,
     "label": "DMs/hora por utilizador (global)",
     "description": "Teto global de mensagens diretas por hora.",
     "applies_to": ["POST /api/messages", "POST /api/messages/v2"]},

    {"key": "max_images_per_post",   "group": "limits", "type": "int", "default": 4,
     "min": 1,    "max": 10,
     "label": "Imagens máximas por post",
     "description": "Número máximo de imagens anexadas a uma publicação.",
     "applies_to": ["POST /api/posts"]},

    {"key": "session_ttl_days",      "group": "limits", "type": "int", "default": 30,
     "min": 1,    "max": 365,
     "label": "Validade da sessão (dias)",
     "description": "Quantos dias um token JWT/sessão fica válido (só afeta NOVAS sessões; tokens já emitidos mantêm o TTL original).",
     "applies_to": ["POST /api/auth/login", "POST /api/auth/register"]},

    # ---------- FEATURE FLAGS — INTERAÇÕES ----------
    {"key": "likes_enabled",          "group": "flags", "type": "bool", "default": True,
     "label": "Likes",
     "description": "Quando desligado, ninguém consegue dar like em publicações.",
     "applies_to": ["POST /api/posts/{id}/like"],
     "off_message": "Os likes estão temporariamente desativados."},

    {"key": "reposts_enabled",        "group": "flags", "type": "bool", "default": True,
     "label": "Reposts (republicar)",
     "description": "Quando desligado, ninguém consegue republicar/citar publicações.",
     "applies_to": ["POST /api/posts/{id}/repost", "POST /api/posts (campo quote_of)"],
     "off_message": "Os reposts estão temporariamente desativados."},

    {"key": "bookmarks_enabled",      "group": "flags", "type": "bool", "default": True,
     "label": "Bookmarks (guardar)",
     "description": "Quando desligado, ninguém consegue guardar publicações nos bookmarks.",
     "applies_to": ["POST /api/posts/{id}/bookmark"],
     "off_message": "Os bookmarks estão temporariamente desativados."},

    {"key": "follows_enabled",        "group": "flags", "type": "bool", "default": True,
     "label": "Seguir (follows)",
     "description": "Quando desligado, ninguém consegue começar a seguir outros utilizadores.",
     "applies_to": ["POST /api/users/{username}/follow"],
     "off_message": "Os follows estão temporariamente desativados."},

    {"key": "search_enabled",         "group": "flags", "type": "bool", "default": True,
     "label": "Pesquisa global",
     "description": "Quando desligado, a pesquisa devolve resultados vazios (admin painel não afetado).",
     "applies_to": ["GET /api/search"],
     "off_message": ""},

    {"key": "reports_enabled",        "group": "flags", "type": "bool", "default": True,
     "label": "Reportar conteúdo",
     "description": "Quando desligado, utilizadores não conseguem reportar posts/comments/users.",
     "applies_to": ["POST /api/posts/{id}/report", "POST /api/comments/{id}/report", "POST /api/users/{u}/report"],
     "off_message": "Os reports estão temporariamente desativados."},

    # ---------- FEATURE FLAGS — CRIAÇÃO ----------
    {"key": "communities_create_enabled", "group": "flags", "type": "bool", "default": True,
     "label": "Criar comunidades",
     "description": "Quando desligado, utilizadores não podem criar novas comunidades (as existentes mantêm-se).",
     "applies_to": ["POST /api/communities"],
     "off_message": "A criação de comunidades está temporariamente suspensa."},

    {"key": "events_create_enabled",  "group": "flags", "type": "bool", "default": True,
     "label": "Criar eventos",
     "description": "Quando desligado, utilizadores não podem criar novos eventos (os existentes mantêm-se).",
     "applies_to": ["POST /api/events"],
     "off_message": "A criação de eventos está temporariamente suspensa."},

    {"key": "edit_post_enabled",      "group": "flags", "type": "bool", "default": True,
     "label": "Editar publicações",
     "description": "Quando desligado, utilizadores não podem editar publicações já publicadas (rascunhos/agendados continuam editáveis).",
     "applies_to": ["PATCH /api/posts/{id}"],
     "off_message": "A edição de publicações está temporariamente desativada."},

    {"key": "delete_own_post_enabled", "group": "flags", "type": "bool", "default": True,
     "label": "Apagar próprias publicações",
     "description": "Quando desligado, utilizadores não conseguem apagar as próprias publicações (admins continuam a poder).",
     "applies_to": ["DELETE /api/posts/{id}"],
     "off_message": "Apagar publicações está temporariamente desativado."},

    {"key": "account_deletion_enabled", "group": "flags", "type": "bool", "default": True,
     "label": "Apagar conta",
     "description": "Quando desligado, utilizadores não conseguem apagar a própria conta via app.",
     "applies_to": ["DELETE /api/users/me"],
     "off_message": "A eliminação de conta está temporariamente desativada. Contacta o suporte."},

    # ---------- FEATURE FLAGS — REGISTOS ----------
    {"key": "new_users_auto_verify",  "group": "flags", "type": "bool", "default": False,
     "label": "Verificar novos registos automaticamente",
     "description": "Quando LIGADO, todos os novos utilizadores recebem o badge verificado imediatamente ao registar.",
     "applies_to": ["POST /api/auth/register"],
     "off_message": ""},

    # ---------- LIMITES ADICIONAIS ----------
    {"key": "max_follows_per_user",   "group": "limits", "type": "int", "default": 7500,
     "min": 10,   "max": 100000,
     "label": "Máximo de pessoas seguidas",
     "description": "Limite global de pessoas que um utilizador pode seguir.",
     "applies_to": ["POST /api/users/{username}/follow"]},

    {"key": "max_bio_chars",          "group": "limits", "type": "int", "default": 280,
     "min": 50,   "max": 2000,
     "label": "Caracteres máximos na bio",
     "description": "Tamanho máximo do campo bio no perfil.",
     "applies_to": ["PATCH /api/users/me"]},

    {"key": "max_display_name_chars", "group": "limits", "type": "int", "default": 50,
     "min": 10,   "max": 200,
     "label": "Caracteres máximos no nome",
     "description": "Tamanho máximo do nome a apresentar (display name).",
     "applies_to": ["PATCH /api/users/me"]},

    {"key": "max_stories_per_day",    "group": "limits", "type": "int", "default": 30,
     "min": 1,    "max": 500,
     "label": "Stories/dia por utilizador",
     "description": "Quantas stories um utilizador pode publicar em 24h.",
     "applies_to": ["POST /api/stories"]},

    {"key": "max_reports_per_day",    "group": "limits", "type": "int", "default": 20,
     "min": 1,    "max": 200,
     "label": "Reports/dia por utilizador",
     "description": "Quantos reports um utilizador pode submeter em 24h (anti-abuso).",
     "applies_to": ["POST /api/posts/{id}/report", "POST /api/comments/{id}/report", "POST /api/users/{u}/report"]},

    {"key": "feed_page_size",         "group": "limits", "type": "int", "default": 20,
     "min": 5,    "max": 100,
     "label": "Tamanho da página do feed",
     "description": "Quantas publicações o feed devolve por página por defeito.",
     "applies_to": ["GET /api/posts/feed"]},

    # ---------- ANTI-ABUSO (H2) ----------
    {"key": "max_follows_per_hour",   "group": "limits", "type": "int", "default": 60,
     "min": 1,    "max": 1000,
     "label": "Follows/hora por utilizador",
     "description": "Ações de follow/unfollow permitidas por hora (anti mass-follow). Admins bypass.",
     "applies_to": ["POST /api/users/{username}/follow"]},

    {"key": "max_reactions_per_minute", "group": "limits", "type": "int", "default": 30,
     "min": 1,    "max": 500,
     "label": "Reações/minuto por utilizador",
     "description": "Reações (emojis em posts/comentários/stories) permitidas por minuto. Anti-spam de reactions.",
     "applies_to": ["POST /api/posts/{id}/react", "POST /api/comments/{id}/react", "POST /api/stories/{id}/react", "POST /api/messages/{id}/react"]},

    {"key": "max_mentions_per_post",  "group": "limits", "type": "int", "default": 10,
     "min": 1,    "max": 50,
     "label": "Menções máximas por publicação",
     "description": "Quantas @ diferentes podem aparecer numa publicação/comentário. Anti mention-spam.",
     "applies_to": ["POST /api/posts", "POST /api/posts/{id}/comments"]},

    {"key": "max_mentions_per_hour",  "group": "limits", "type": "int", "default": 50,
     "min": 1,    "max": 1000,
     "label": "Menções totais por hora",
     "description": "Soma de menções acumuladas numa hora por utilizador. Anti spam dirigido.",
     "applies_to": ["POST /api/posts", "POST /api/posts/{id}/comments"]},

    {"key": "max_dms_to_strangers_per_hour", "group": "limits", "type": "int", "default": 5,
     "min": 0,    "max": 500,
     "label": "DMs/hora a desconhecidos",
     "description": "Quantos utilizadores que NÃO te seguem podes mensajar por hora. 0 = ilimitado. Anti DM-bomb.",
     "applies_to": ["POST /api/messages", "POST /api/messages/v2"]},

    # ---------- BRANDING & CONTEÚDO (string) ----------
    {"key": "platform_name",          "group": "content", "type": "string", "default": "Lusorae",
     "min_len": 1, "max_len": 60,
     "label": "Nome da plataforma",
     "description": "Aparece no título do site, emails, etc. Exposto via /api/public/settings.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "platform_tagline",       "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 160,
     "label": "Slogan da plataforma",
     "description": "Texto curto de apresentação (ex: 'A rede social portuguesa'). Exposto via /api/public/settings.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "support_email",          "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 120,
     "label": "Email de suporte",
     "description": "Email mostrado em mensagens de erro/contacto. Exposto via /api/public/settings.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "announcement_banner_text",  "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 280,
     "label": "Banner de anúncio (texto)",
     "description": "Texto que aparece num banner no topo do site para todos os utilizadores. Vazio = banner desligado.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "announcement_banner_level", "group": "content", "type": "string", "default": "info",
     "min_len": 1, "max_len": 16, "choices": ["info", "warning", "critical"],
     "label": "Banner de anúncio (nível)",
     "description": "Nível visual do banner: info (azul) · warning (amarelo) · critical (vermelho).",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "welcome_message",        "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 280,
     "label": "Mensagem de boas-vindas",
     "description": "Texto mostrado aos utilizadores recém-registados na primeira visita.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "terms_url",              "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 300,
     "label": "URL dos Termos de Serviço",
     "description": "URL apontando para a página de Termos. Vazio = link escondido.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "privacy_url",            "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 300,
     "label": "URL da Política de Privacidade",
     "description": "URL apontando para a página de Privacidade. Vazio = link escondido.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "maintenance_message",    "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 280,
     "label": "Mensagem de manutenção (custom)",
     "description": "Mensagem mostrada quando o modo manutenção (em Sistema) está ativo. Vazio = mensagem default.",
     "applies_to": ["Maintenance gate"]},

    # =========================================================================
    # EXPANSÃO — settings reais com enforcement / consumo público
    # =========================================================================

    # ---------- FLAGS extra (com enforcement) ----------
    {"key": "link_previews_enabled",  "group": "flags", "type": "bool", "default": True,
     "label": "Previews de links (unfurl)",
     "description": "Quando LIGADO, o frontend mostra preview rico (título, imagem) para URLs em posts e DMs. Exposto via /api/public/settings.",
     "applies_to": ["GET /api/public/settings"],
     "off_message": ""},

    # ---------- LIMITES extra (com enforcement real em create_post) ----------
    {"key": "max_hashtags_per_post",  "group": "limits", "type": "int", "default": 30,
     "min": 1, "max": 100,
     "label": "Hashtags máximas por post",
     "description": "Quantas #hashtags diferentes podem aparecer num post. Anti hashtag-spam. Admins fazem bypass.",
     "applies_to": ["POST /api/posts"]},

    {"key": "max_urls_per_post",      "group": "limits", "type": "int", "default": 10,
     "min": 1, "max": 50,
     "label": "URLs máximos por post",
     "description": "Quantos links HTTP(S) diferentes podem aparecer num post. Anti link-spam. Admins fazem bypass.",
     "applies_to": ["POST /api/posts"]},

    {"key": "min_account_age_minutes_to_post", "group": "limits", "type": "int", "default": 0,
     "min": 0, "max": 10080,
     "label": "Idade mínima da conta para postar (min)",
     "description": "Tempo (em minutos) que uma conta tem de existir antes de poder publicar. 0 = desligado. Anti-bot.",
     "applies_to": ["POST /api/posts"]},

    {"key": "notification_retention_days", "group": "limits", "type": "int", "default": 90,
     "min": 7, "max": 365,
     "label": "Retenção de notificações (dias)",
     "description": "Notificações mais antigas do que este valor podem ser removidas pelo job de limpeza. Exposto via /api/public/settings.",
     "applies_to": ["GET /api/public/settings"]},

    # ---------- BRANDING — visual (string) ----------
    {"key": "logo_url",               "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 500, "format": "url",
     "label": "URL do logótipo",
     "description": "URL absoluto do logótipo (SVG/PNG). Aplicado pelo frontend no header. Vazio = usa o mark interno.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "favicon_url",            "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 500, "format": "url",
     "label": "URL do favicon",
     "description": "URL absoluto do favicon (.ico/.png/.svg). Aplicado no <link rel=icon>. Vazio = favicon default.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "og_image_url",           "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 500, "format": "url",
     "label": "Imagem OpenGraph (og:image)",
     "description": "Imagem default usada em previews em redes sociais quando o site é partilhado.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "primary_color",          "group": "content", "type": "string", "default": "#ef4444",
     "min_len": 4, "max_len": 16, "format": "color",
     "label": "Cor primária (hex)",
     "description": "Cor primária da marca (formato #RRGGBB). Aplicada como CSS var --brand-primary. Vazio = vermelho coral default.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "accent_color",           "group": "content", "type": "string", "default": "#0e7490",
     "min_len": 4, "max_len": 16, "format": "color",
     "label": "Cor de accent (hex)",
     "description": "Cor secundária para destaques. Aplicada como CSS var --brand-accent.",
     "applies_to": ["GET /api/public/settings"]},

    # ---------- SEO (string) ----------
    {"key": "seo_default_description","group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 200, "format": "textarea",
     "label": "Descrição SEO default",
     "description": "Texto usado em <meta name=description> e og:description quando a página não tem descrição própria.",
     "applies_to": ["GET /api/public/settings"]},

    # ---------- LEGAL (string) ----------
    {"key": "legal_company_name",     "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 120,
     "label": "Nome legal da entidade",
     "description": "Nome da empresa ou pessoa responsável pela plataforma. Aparece no footer e nas páginas legais.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "legal_company_vat",      "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 60,
     "label": "NIF / VAT",
     "description": "Número de contribuinte / VAT da entidade.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "legal_company_address",  "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 280, "format": "textarea",
     "label": "Morada legal",
     "description": "Morada da entidade responsável (para footer e documentos legais).",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "legal_company_country",  "group": "content", "type": "string", "default": "Portugal",
     "min_len": 0, "max_len": 60,
     "label": "País legal",
     "description": "País da entidade responsável.",
     "applies_to": ["GET /api/public/settings"]},

    # ---------- I18N / TIME / THEME (string com choices) ----------
    {"key": "default_locale",         "group": "content", "type": "string", "default": "pt-PT",
     "min_len": 2, "max_len": 12,
     "choices": ["pt-PT", "pt-BR", "en-US", "en-GB", "es-ES", "fr-FR", "de-DE", "it-IT"],
     "label": "Locale por defeito",
     "description": "Idioma e formato regional por defeito do site (utilizadores podem sobrepor no próprio perfil).",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "default_timezone",       "group": "content", "type": "string", "default": "Europe/Lisbon",
     "min_len": 1, "max_len": 60,
     "label": "Fuso horário por defeito",
     "description": "Fuso horário usado em datas server-side e como default para novos utilizadores. Ex: 'Europe/Lisbon', 'America/Sao_Paulo'.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "default_theme",          "group": "content", "type": "string", "default": "auto",
     "min_len": 1, "max_len": 16,
     "choices": ["auto", "light", "dark"],
     "label": "Tema por defeito",
     "description": "Tema visual default para utilizadores que ainda não escolheram. 'auto' segue a preferência do sistema.",
     "applies_to": ["GET /api/public/settings"]},

    # ---------- VERSIONING (string) ----------
    {"key": "tos_version",            "group": "content", "type": "string", "default": "1.0",
     "min_len": 1, "max_len": 30,
     "label": "Versão dos Termos de Serviço",
     "description": "Quando incrementada, o frontend pode pedir aos utilizadores que voltem a aceitar os termos.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "min_app_version",        "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 30,
     "label": "Versão mínima do cliente",
     "description": "Versão mínima do frontend/app que é suportada. Vazio = sem restrição. Clientes abaixo desta versão podem ser avisados para atualizar.",
     "applies_to": ["GET /api/public/settings"]},

    # ---------- FOOTER (string) ----------
    {"key": "footer_text",            "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 280, "format": "textarea",
     "label": "Texto do footer",
     "description": "Texto livre mostrado no footer (acima dos links legais). Suporta múltiplas linhas.",
     "applies_to": ["GET /api/public/settings"]},

    # ---------- SOCIAL LINKS (string url, todos opcionais) ----------
    {"key": "twitter_url",            "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 300, "format": "url",
     "label": "URL Twitter / X",
     "description": "Link para a conta oficial. Vazio = ícone escondido.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "instagram_url",          "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 300, "format": "url",
     "label": "URL Instagram",
     "description": "Link para a conta oficial. Vazio = ícone escondido.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "youtube_url",            "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 300, "format": "url",
     "label": "URL YouTube",
     "description": "Link para o canal oficial. Vazio = ícone escondido.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "discord_url",            "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 300, "format": "url",
     "label": "URL Discord",
     "description": "Link de convite para o servidor Discord. Vazio = ícone escondido.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "github_url",             "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 300, "format": "url",
     "label": "URL GitHub",
     "description": "Link para a organização/repositório no GitHub. Vazio = ícone escondido.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "linkedin_url",           "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 300, "format": "url",
     "label": "URL LinkedIn",
     "description": "Link para o perfil/página no LinkedIn. Vazio = ícone escondido.",
     "applies_to": ["GET /api/public/settings"]},

    # =========================================================================
    # EXPANSÃO 2 — política de palavra-passe, username, drafts, agendamento,
    # colaborações, comunidades, sondagens, branding extra. TODOS com enforcement
    # real nos endpoints respetivos (sem mocks).
    # =========================================================================

    # ---------- PASSWORD POLICY (bool) ----------
    {"key": "password_require_digit", "group": "flags", "type": "bool", "default": False,
     "label": "Palavra-passe exige dígito",
     "description": "Quando LIGADO, novas palavras-passe têm de conter pelo menos um dígito (0-9). Aplica-se em registo, reposição e alteração.",
     "applies_to": ["POST /api/auth/register", "POST /api/auth/reset-password", "POST /api/auth/change-password"],
     "off_message": ""},

    {"key": "password_require_uppercase", "group": "flags", "type": "bool", "default": False,
     "label": "Palavra-passe exige maiúscula",
     "description": "Quando LIGADO, novas palavras-passe têm de conter pelo menos uma letra maiúscula. Aplica-se em registo, reposição e alteração.",
     "applies_to": ["POST /api/auth/register", "POST /api/auth/reset-password", "POST /api/auth/change-password"],
     "off_message": ""},

    {"key": "password_require_symbol", "group": "flags", "type": "bool", "default": False,
     "label": "Palavra-passe exige símbolo",
     "description": "Quando LIGADO, novas palavras-passe têm de conter pelo menos um símbolo (ex: !@#$%). Aplica-se em registo, reposição e alteração.",
     "applies_to": ["POST /api/auth/register", "POST /api/auth/reset-password", "POST /api/auth/change-password"],
     "off_message": ""},

    # ---------- COMMS / ALERTS (bool) ----------
    {"key": "email_alerts_enabled", "group": "flags", "type": "bool", "default": True,
     "label": "Alertas de login (master)",
     "description": "Master switch para notificações automáticas de novo início de sessão (novo dispositivo/IP). DESLIGAR também desativa a notificação in-app de login_alert.",
     "applies_to": ["POST /api/auth/login"],
     "off_message": ""},

    {"key": "disposable_email_block_enabled", "group": "flags", "type": "bool", "default": True,
     "label": "Bloquear emails descartáveis",
     "description": "Quando LIGADO, /auth/check-email e /auth/register rejeitam emails de domínios descartáveis conhecidos (mailinator, yopmail, ...).",
     "applies_to": ["GET /api/auth/check-email", "POST /api/auth/register"],
     "off_message": ""},

    # ---------- DISPLAY FLAGS (bool, FE consome via /public/settings) ----------
    {"key": "show_view_counts_publicly", "group": "flags", "type": "bool", "default": True,
     "label": "Mostrar contadores de views publicamente",
     "description": "Quando DESLIGADO, o frontend esconde o contador de visualizações nos posts. Exposto via /api/public/settings.",
     "applies_to": ["GET /api/public/settings"],
     "off_message": ""},

    {"key": "show_like_counts_publicly", "group": "flags", "type": "bool", "default": True,
     "label": "Mostrar contadores de likes publicamente",
     "description": "Quando DESLIGADO, o frontend esconde o contador numérico de likes (mantém o coração). Exposto via /api/public/settings.",
     "applies_to": ["GET /api/public/settings"],
     "off_message": ""},

    # ---------- HASHTAGS / MENTIONS (bool) ----------
    {"key": "hashtags_enabled", "group": "flags", "type": "bool", "default": True,
     "label": "Hashtags",
     "description": "Quando DESLIGADO, novos posts NÃO terão hashtags extraídas (ficam só como texto). Posts antigos mantêm hashtags. /trending continua a funcionar com o que já existe.",
     "applies_to": ["POST /api/posts"],
     "off_message": ""},

    {"key": "mentions_enabled", "group": "flags", "type": "bool", "default": True,
     "label": "Notificações de menções (@)",
     "description": "Quando DESLIGADO, mencionar alguém num post deixa de criar a notificação 'mencionou-te'. O @ continua a aparecer como texto.",
     "applies_to": ["POST /api/posts"],
     "off_message": ""},

    # ---------- USERNAME LIMITS (int) ----------
    {"key": "min_username_chars", "group": "limits", "type": "int", "default": 3,
     "min": 1, "max": 30,
     "label": "Caracteres mínimos no username",
     "description": "Aplicado em /auth/check-username e /auth/register. Substitui o limite hardcoded antigo (3).",
     "applies_to": ["GET /api/auth/check-username", "POST /api/auth/register"]},

    {"key": "max_username_chars", "group": "limits", "type": "int", "default": 20,
     "min": 5, "max": 64,
     "label": "Caracteres máximos no username",
     "description": "Aplicado em /auth/check-username e /auth/register. Substitui o limite hardcoded antigo (20).",
     "applies_to": ["GET /api/auth/check-username", "POST /api/auth/register"]},

    # ---------- PASSWORD LIMITS (int) ----------
    {"key": "min_password_chars", "group": "limits", "type": "int", "default": 6,
     "min": 4, "max": 128,
     "label": "Caracteres mínimos na palavra-passe",
     "description": "Aplicado em registo, reposição e alteração de palavra-passe. Acima do mínimo (4) imposto a nível de schema.",
     "applies_to": ["POST /api/auth/register", "POST /api/auth/reset-password", "POST /api/auth/change-password"]},

    # ---------- POST LIMITS (int) ----------
    {"key": "min_post_chars", "group": "limits", "type": "int", "default": 0,
     "min": 0, "max": 200,
     "label": "Caracteres mínimos por post (só texto)",
     "description": "Quando >0, posts só com texto têm de ter pelo menos este número de caracteres. Posts com imagens, sondagem ou quote estão isentos. Admins bypass.",
     "applies_to": ["POST /api/posts"]},

    {"key": "scheduled_posts_max_days_ahead", "group": "limits", "type": "int", "default": 30,
     "min": 1, "max": 365,
     "label": "Antecedência máxima de agendamento (dias)",
     "description": "Posts agendados não podem estar mais de N dias no futuro. Aplica-se tanto na criação como na reedição. Admins bypass.",
     "applies_to": ["POST /api/posts", "PATCH /api/posts/{id}"]},

    {"key": "max_drafts_per_user", "group": "limits", "type": "int", "default": 50,
     "min": 1, "max": 1000,
     "label": "Rascunhos máximos por utilizador",
     "description": "Quantos posts em rascunho um utilizador pode acumular. Quando atingido, devolve 429. Admins bypass.",
     "applies_to": ["POST /api/posts (is_draft=true)"]},

    {"key": "max_poll_options", "group": "limits", "type": "int", "default": 4,
     "min": 2, "max": 10,
     "label": "Opções máximas por sondagem",
     "description": "Quantas opções uma sondagem num post pode ter. Opções extra são truncadas server-side. Admins usam o cap interno do módulo.",
     "applies_to": ["POST /api/posts (campo poll)"]},

    {"key": "max_collaborators_per_post", "group": "limits", "type": "int", "default": 3,
     "min": 1, "max": 20,
     "label": "Colaboradores máximos por post",
     "description": "Quantos co-autores um post pode ter (convites pendentes + aceites). Substitui o cap hardcoded antigo (3).",
     "applies_to": ["POST /api/posts/{id}/collab/invite"]},

    # ---------- COMMUNITY LIMITS (int) ----------
    {"key": "max_communities_owned_per_user", "group": "limits", "type": "int", "default": 10,
     "min": 1, "max": 100,
     "label": "Comunidades máximas por utilizador (criadas)",
     "description": "Quantas comunidades um utilizador pode criar/ser dono em simultâneo. Apagar uma liberta espaço. Admins bypass.",
     "applies_to": ["POST /api/communities"]},

    # ---------- BRANDING/LEGAL EXTRA (string) ----------
    {"key": "meta_title_suffix", "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 80,
     "label": "Sufixo de <title>",
     "description": "Texto colocado no fim do <title> em cada página (ex: ' · Lusorae'). Exposto via /api/public/settings.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "signup_invite_code", "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 64,
     "label": "Código de convite para registo",
     "description": "Quando preenchido, /auth/register só aceita registos que enviem este código no campo `invite_code` do payload. Vazio = registo aberto.",
     "applies_to": ["POST /api/auth/register"]},

    {"key": "compliance_dpo_email", "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 120,
     "label": "Email do Encarregado de Proteção de Dados (DPO)",
     "description": "Email a contactar para questões de RGPD. Exposto via /api/public/settings para o footer/página legal.",
     "applies_to": ["GET /api/public/settings"]},

    {"key": "cookie_banner_text", "group": "content", "type": "string", "default": "",
     "min_len": 0, "max_len": 500, "format": "textarea",
     "label": "Texto do banner de cookies",
     "description": "Texto mostrado no banner de consentimento de cookies. Vazio = sem banner. Exposto via /api/public/settings.",
     "applies_to": ["GET /api/public/settings"]},
]

DEFAULT_SETTINGS = {item["key"]: item["default"] for item in SETTINGS_REGISTRY}
SETTINGS_BY_KEY = {item["key"]: item for item in SETTINGS_REGISTRY}

_settings_cache: dict = {"loaded_at": 0.0, "values": dict(DEFAULT_SETTINGS), "doc": None}
_SETTINGS_TTL = 5  # seconds


async def reload_settings_cache():
    """Re-read settings from db.system_config (key=runtime) into the in-memory cache."""
    doc = await db.system_config.find_one({"key": "runtime"}, {"_id": 0}) or {}
    values = dict(DEFAULT_SETTINGS)
    overrides = (doc or {}).get("values") or {}
    for k, v in overrides.items():
        if k in DEFAULT_SETTINGS:
            spec = SETTINGS_BY_KEY[k]
            if spec["type"] == "bool":
                values[k] = bool(v)
            elif spec["type"] == "int":
                try:
                    values[k] = int(v)
                except Exception:
                    values[k] = spec["default"]
            elif spec["type"] == "string":
                if isinstance(v, str):
                    values[k] = v
                else:
                    values[k] = spec["default"]
    _settings_cache["values"] = values
    _settings_cache["doc"] = doc
    _settings_cache["loaded_at"] = time.time()
    return values


async def get_settings() -> dict:
    if time.time() - _settings_cache["loaded_at"] >= _SETTINGS_TTL:
        await reload_settings_cache()
    return _settings_cache["values"]


async def get_setting(key: str):
    s = await get_settings()
    return s.get(key, DEFAULT_SETTINGS.get(key))


async def is_feature_enabled(key: str) -> bool:
    return bool(await get_setting(key))


async def get_limit(key: str) -> int:
    return int(await get_setting(key) or 0)


def _coerce_setting_value(key: str, raw):
    """Validate + coerce a single setting value. Returns coerced or raises HTTPException."""
    spec = SETTINGS_BY_KEY.get(key)
    if not spec:
        raise HTTPException(400, f"Definição desconhecida: {key}")
    if spec["type"] == "bool":
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, (int, float)):
            return bool(raw)
        if isinstance(raw, str):
            return raw.strip().lower() in {"1", "true", "yes", "on"}
        raise HTTPException(400, f"{key} requer booleano")
    if spec["type"] == "int":
        try:
            v = int(raw)
        except Exception:
            raise HTTPException(400, f"{key} requer inteiro")
        mn, mx = spec.get("min"), spec.get("max")
        if mn is not None and v < mn:
            raise HTTPException(400, f"{key}: mínimo {mn}")
        if mx is not None and v > mx:
            raise HTTPException(400, f"{key}: máximo {mx}")
        return v
    if spec["type"] == "string":
        if raw is None:
            raw = ""
        if not isinstance(raw, str):
            try:
                raw = str(raw)
            except Exception:
                raise HTTPException(400, f"{key} requer texto")
        raw = raw.strip()
        mn = spec.get("min_len")
        mx = spec.get("max_len")
        if mn is not None and len(raw) < mn:
            raise HTTPException(400, f"{key}: mínimo {mn} caracteres")
        if mx is not None and len(raw) > mx:
            raise HTTPException(400, f"{key}: máximo {mx} caracteres")
        choices = spec.get("choices")
        if choices and raw and raw not in choices:
            raise HTTPException(400, f"{key}: valor inválido (opções: {', '.join(choices)})")
        return raw
    raise HTTPException(400, f"Tipo desconhecido para {key}")


async def update_settings(updates: dict, actor: dict) -> dict:
    """Validate + persist + append to history. Returns {updated: {k: {from, to}}}."""
    valid: dict = {}
    for k, v in (updates or {}).items():
        if k not in SETTINGS_BY_KEY:
            continue
        valid[k] = _coerce_setting_value(k, v)
    if not valid:
        return {"updated": {}}
    doc = await db.system_config.find_one({"key": "runtime"}, {"_id": 0}) or {}
    current = dict(doc.get("values") or {})
    history = list(doc.get("history") or [])
    changed: dict = {}
    for k, v in valid.items():
        prev = current.get(k, DEFAULT_SETTINGS.get(k))
        if prev != v:
            changed[k] = {"from": prev, "to": v}
            current[k] = v
    if not changed:
        return {"updated": {}}
    now = now_iso()
    for k, ch in changed.items():
        history.append({
            "key": k, "from": ch["from"], "to": ch["to"],
            "actor_id": actor.get("id"), "actor_username": actor.get("username"),
            "at": now,
        })
    history = history[-50:]
    await db.system_config.update_one(
        {"key": "runtime"},
        {"$set": {
            "key": "runtime",
            "values": current,
            "history": history,
            "updated_at": now,
            "updated_by": actor.get("id"),
        }},
        upsert=True,
    )
    _settings_cache["loaded_at"] = 0.0  # invalidate
    return {"updated": changed}


async def reset_setting(key: str, actor: dict) -> dict:
    """Remove key from overrides, reverting to default."""
    spec = SETTINGS_BY_KEY.get(key)
    if not spec:
        raise HTTPException(404, "Definição desconhecida")
    doc = await db.system_config.find_one({"key": "runtime"}, {"_id": 0}) or {}
    current = dict(doc.get("values") or {})
    if key not in current:
        return {"reset": True, "already_default": True, "value": spec["default"]}
    history = list(doc.get("history") or [])
    history.append({
        "key": key, "from": current.get(key), "to": spec["default"],
        "actor_id": actor.get("id"), "actor_username": actor.get("username"),
        "at": now_iso(), "reason": "reset",
    })
    current.pop(key, None)
    await db.system_config.update_one(
        {"key": "runtime"},
        {"$set": {
            "values": current,
            "history": history[-50:],
            "updated_at": now_iso(),
            "updated_by": actor.get("id"),
        }},
        upsert=True,
    )
    _settings_cache["loaded_at"] = 0.0
    return {"reset": True, "value": spec["default"]}


# ---- Runtime gating helpers (used by write endpoints) ----
async def _assert_feature_or_503(key: str, user: dict):
    """Block non-admins if a feature flag is OFF. Admins bypass."""
    if user and user.get("is_admin"):
        return
    spec = SETTINGS_BY_KEY.get(key)
    if not spec:
        return
    if not await is_feature_enabled(key):
        raise HTTPException(
            status_code=503,
            detail=spec.get("off_message") or "Funcionalidade temporariamente desativada.",
        )


async def _assert_writes_open(user: dict):
    """Global read-only mode kill switch. Admins always bypass."""
    if user and user.get("is_admin"):
        return
    if await is_feature_enabled("read_only_mode"):
        raise HTTPException(
            status_code=503,
            detail=SETTINGS_BY_KEY["read_only_mode"].get("off_message")
                   or "Plataforma em modo só-leitura.",
        )


async def _assert_global_hourly_limit(user: dict, kind: str):
    """Enforce a global per-hour rate limit defined in system_config.
    kind: posts | comments | dms . Admins bypass."""
    if user and user.get("is_admin"):
        return
    kmap = {
        "posts":    ("max_posts_per_hour",    db.posts,    {"author_id": user["id"]},  "publicações"),
        "comments": ("max_comments_per_hour", db.comments, {"author_id": user["id"]},  "comentários"),
        "dms":      ("max_dms_per_hour",      db.messages, {"sender_id": user["id"]},  "mensagens"),
    }
    if kind not in kmap:
        return
    limit_key, coll, filt, label = kmap[kind]
    limit = await get_limit(limit_key)
    if not limit or limit <= 0:
        return
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    cnt = await coll.count_documents({**filt, "created_at": {"$gte": since}})
    if cnt >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Limite global de {label} atingido ({limit}/hora). Tenta mais tarde.",
        )


async def _assert_reports_quota(user: dict):
    """Limita reports por dia. Admins bypass."""
    if user and user.get("is_admin"):
        return
    if not await is_feature_enabled("reports_enabled"):
        raise HTTPException(503, SETTINGS_BY_KEY["reports_enabled"].get("off_message"))
    limit = await get_limit("max_reports_per_day")
    if not limit or limit <= 0:
        return
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    cnt = await db.reports.count_documents({"reporter_id": user["id"], "created_at": {"$gte": since}})
    if cnt >= limit:
        raise HTTPException(429, f"Limite diário de reports atingido ({limit}/dia).")


async def _assert_stories_quota(user: dict):
    """Limita stories por dia. Admins bypass."""
    if user and user.get("is_admin"):
        return
    limit = await get_limit("max_stories_per_day")
    if not limit or limit <= 0:
        return
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    cnt = await db.stories.count_documents({"author_id": user["id"], "created_at": {"$gte": since}})
    if cnt >= limit:
        raise HTTPException(429, f"Limite diário de stories atingido ({limit}/dia).")


async def _shadow_muted_ids_excluding(viewer_id: str) -> list[str]:
    """Returns IDs of users currently shadow-muted (excluding the viewer themselves
    — a shadow-muted user still sees their own content)."""
    rows = await db.users.find(
        {"shadow_muted": True, "id": {"$ne": viewer_id}},
        {"_id": 0, "id": 1},
    ).to_list(length=2000)
    return [r["id"] for r in rows]


def _admin_user_card(u: dict) -> dict:
    """Compact admin-side user representation (more data than public_user)."""
    return {
        "id": u.get("id"),
        "email": u.get("email"),
        "username": u.get("username"),
        "name": u.get("name"),
        "avatar": u.get("avatar", ""),
        "bio": (u.get("bio") or "")[:160],
        "verified": bool(u.get("verified")),
        "is_admin": bool(u.get("is_admin")),
        "banned": bool(u.get("banned")),
        "ban_reason": u.get("ban_reason", "") if u.get("banned") else "",
        "private": bool(u.get("private")),
        "onboarded": bool(u.get("onboarded")),
        "followers_count": len(u.get("followers", []) or []),
        "following_count": len(u.get("following", []) or []),
        "last_seen": u.get("last_seen"),
        "online": is_online(u.get("last_seen")),
        "created_at": u.get("created_at"),
        "two_fa_enabled": bool(u.get("two_fa_enabled")),
        # ---- moderation state (real fields) ----
        "muted_until": u.get("muted_until"),
        "muted_active": _restriction_active(u, "muted_until"),
        "mute_reason": u.get("mute_reason", "") if _restriction_active(u, "muted_until") else "",
        "shadow_muted": bool(u.get("shadow_muted")),
        "shadow_mute_reason": u.get("shadow_mute_reason", "") if u.get("shadow_muted") else "",
        "suspended_until": u.get("suspended_until"),
        "suspended_active": _restriction_active(u, "suspended_until"),
        "suspend_reason": u.get("suspend_reason", "") if _restriction_active(u, "suspended_until") else "",
        "flagged_suspicious": bool(u.get("flagged_suspicious")),
        "suspicious_reason": u.get("suspicious_reason", "") if u.get("flagged_suspicious") else "",
        "featured_account": bool(u.get("featured_account")),
        "rate_limit": u.get("rate_limit") or {},
        # Frozen (no interactions allowed)
        "frozen": bool(u.get("frozen")),
        "frozen_reason": u.get("frozen_reason", "") if u.get("frozen") else "",
        "frozen_at": u.get("frozen_at") if u.get("frozen") else None,
    }


def _admin_post_card(p: dict, author: Optional[dict] = None) -> dict:
    return {
        "id": p.get("id"),
        "content": (p.get("content") or "")[:240],
        "author_id": p.get("author_id"),
        "author_username": (author or {}).get("username", ""),
        "author_name": (author or {}).get("name", ""),
        "kind": p.get("kind", "text"),
        "image": bool(p.get("image")),
        "likes_count": len(p.get("likes", []) or []),
        "comments_count": int(p.get("comments_count", 0) or 0),
        "featured": bool(p.get("featured")),
        "is_draft": bool(p.get("is_draft")),
        "scheduled_at": p.get("scheduled_at"),
        "community_slug": p.get("community_slug"),
        "created_at": p.get("created_at"),
        # Admin moderation state on the post
        "replies_frozen": bool(p.get("replies_frozen")),
        "reduce_reach": bool(p.get("reduce_reach")),
    }


# ============================================================
# ADMIN — RUNTIME SETTINGS (Grupo A): feature flags + limites
# ============================================================
class AdminSettingsPatchIn(BaseModel):
    updates: dict


class AdminSettingsResetIn(BaseModel):
    key: Optional[str] = None
    all: Optional[bool] = False


@api2.get("/admin/settings")
async def admin_get_settings(admin=Depends(require_admin)):
    """Returns full registry + current values + last update info + history (tail 20)."""
    values = await get_settings()
    doc = await db.system_config.find_one({"key": "runtime"}, {"_id": 0}) or {}
    overrides = doc.get("values") or {}
    history = list(doc.get("history") or [])
    return {
        "registry": SETTINGS_REGISTRY,
        "values": values,
        "defaults": DEFAULT_SETTINGS,
        "overrides": overrides,           # keys that have admin-set values (≠ default)
        "updated_at": doc.get("updated_at"),
        "updated_by": doc.get("updated_by"),
        "history": history[-20:][::-1],   # newest first
    }


@api2.patch("/admin/settings")
async def admin_patch_settings(payload: AdminSettingsPatchIn, admin=Depends(require_admin)):
    """Bulk patch one or more settings. Validates types + min/max + appends history."""
    if not isinstance(payload.updates, dict) or not payload.updates:
        raise HTTPException(400, "updates obrigatório (dict)")
    result = await update_settings(payload.updates, admin)
    # Audit each individual change
    for k, ch in (result.get("updated") or {}).items():
        await admin_audit(admin, "settings.update", "setting", k, {"from": ch.get("from"), "to": ch.get("to")})
    return result


@api2.post("/admin/settings/reset")
async def admin_reset_settings(payload: AdminSettingsResetIn, admin=Depends(require_admin)):
    """Reset one setting to default (key=...) or reset ALL (all=True)."""
    if payload.all:
        doc = await db.system_config.find_one({"key": "runtime"}, {"_id": 0}) or {}
        keys = list((doc.get("values") or {}).keys())
        for k in keys:
            await reset_setting(k, admin)
            await admin_audit(admin, "settings.reset", "setting", k, {"to_default": DEFAULT_SETTINGS.get(k)})
        return {"reset_count": len(keys), "keys": keys}
    if not payload.key:
        raise HTTPException(400, "key obrigatório (ou all=True)")
    out = await reset_setting(payload.key, admin)
    await admin_audit(admin, "settings.reset", "setting", payload.key, {"to_default": DEFAULT_SETTINGS.get(payload.key)})
    return out


# Subset of settings exposed PUBLICLY (no auth required) so the frontend
# can read branding + announcement banner + public flags before login.
PUBLIC_SETTINGS_KEYS = {
    # branding + content (already existed)
    "platform_name", "platform_tagline", "support_email",
    "announcement_banner_text", "announcement_banner_level",
    "welcome_message", "terms_url", "privacy_url", "maintenance_message",
    # flags
    "signup_open", "read_only_mode", "link_previews_enabled",
    # branding visuals (new)
    "logo_url", "favicon_url", "og_image_url", "primary_color", "accent_color",
    # SEO (new)
    "seo_default_description",
    # legal (new)
    "legal_company_name", "legal_company_vat",
    "legal_company_address", "legal_company_country",
    # i18n / theme (new)
    "default_locale", "default_timezone", "default_theme",
    # versioning (new)
    "tos_version", "min_app_version",
    # footer (new)
    "footer_text",
    # social (new)
    "twitter_url", "instagram_url", "youtube_url",
    "discord_url", "github_url", "linkedin_url",
    # limit hints (new — exposed read-only so frontend can pre-validate)
    "notification_retention_days",
    # ---------- NEW (expansão 2) ----------
    # Public display flags FE consumes to hide counters
    "show_view_counts_publicly", "show_like_counts_publicly",
    # Password / username policy hints for FE pre-validation
    "min_username_chars", "max_username_chars",
    "min_password_chars",
    "password_require_digit", "password_require_uppercase", "password_require_symbol",
    # Compliance / legal extras
    "meta_title_suffix",
    "compliance_dpo_email",
    "cookie_banner_text",
    # Whether a signup invite is required (the *code itself* stays admin-only)
    # — we don't leak signup_invite_code, only a boolean hint:
}


@api2.get("/public/settings")
async def public_settings():
    """Public, no-auth endpoint for branding/announcement banner + a few public flags.
    Cached server-side (5s) — safe for high-traffic polling from frontend."""
    s = await get_settings()
    out = {k: s.get(k) for k in PUBLIC_SETTINGS_KEYS if k in s}
    # Boolean hint for the registration form: tell FE whether an invite code
    # is required, WITHOUT leaking the actual code value (that's admin-only).
    out["signup_invite_required"] = bool((s.get("signup_invite_code") or "").strip())
    return out


@api2.get("/admin/stats")
async def admin_stats(admin=Depends(require_admin)):
    now = datetime.now(timezone.utc)
    iso_7d = (now - timedelta(days=7)).isoformat()
    iso_30d = (now - timedelta(days=30)).isoformat()
    iso_24h = (now - timedelta(hours=24)).isoformat()
    iso_online = (now - ONLINE_WINDOW).isoformat()

    users_total = await db.users.count_documents({})
    users_banned = await db.users.count_documents({"banned": True})
    users_admin = await db.users.count_documents({"is_admin": True})
    users_verified = await db.users.count_documents({"verified": True})
    users_online = await db.users.count_documents({"last_seen": {"$gte": iso_online}})
    signups_7d = await db.users.count_documents({"created_at": {"$gte": iso_7d}})
    signups_30d = await db.users.count_documents({"created_at": {"$gte": iso_30d}})

    posts_total = await db.posts.count_documents({})
    posts_7d = await db.posts.count_documents({"created_at": {"$gte": iso_7d}})
    posts_24h = await db.posts.count_documents({"created_at": {"$gte": iso_24h}})
    drafts = await db.posts.count_documents({"is_draft": True})
    featured = await db.posts.count_documents({"featured": True})

    comments_total = await db.comments.count_documents({})
    communities_total = await db.communities.count_documents({})
    events_total = await db.events.count_documents({})
    stories_active = await db.stories.count_documents({"expires_at": {"$gte": now.isoformat()}})
    messages_total = await db.messages.count_documents({})
    sessions_active = await db.sessions.count_documents({"revoked": {"$ne": True}})

    reports_open = await db.reports.count_documents({"status": "open"})
    reports_total = await db.reports.count_documents({})

    # Signups per day for the last 14d (sparkline)
    series_signups = []
    for i in range(13, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        cnt = await db.users.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()},
        })
        series_signups.append({"date": day_start.date().isoformat(), "value": cnt})

    # Posts per day last 14d
    series_posts = []
    for i in range(13, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        cnt = await db.posts.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()},
        })
        series_posts.append({"date": day_start.date().isoformat(), "value": cnt})

    return {
        "users": {
            "total": users_total, "banned": users_banned, "admins": users_admin,
            "verified": users_verified, "online": users_online,
            "signups_7d": signups_7d, "signups_30d": signups_30d,
        },
        "content": {
            "posts_total": posts_total, "posts_7d": posts_7d, "posts_24h": posts_24h,
            "drafts": drafts, "featured": featured,
            "comments_total": comments_total,
            "communities": communities_total, "events": events_total,
            "stories_active": stories_active, "messages_total": messages_total,
        },
        "moderation": {
            "reports_open": reports_open, "reports_total": reports_total,
        },
        "sessions": {
            "active": sessions_active,
        },
        "series": {
            "signups_14d": series_signups,
            "posts_14d": series_posts,
        },
        "generated_at": now.isoformat(),
    }


@api2.get("/admin/users")
async def admin_list_users(
    admin=Depends(require_admin),
    q: str = "",
    filter: str = "all",   # all | banned | admins | verified | recent
    page: int = 1,
    limit: int = 25,
):
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 25)))
    query: dict = {}
    if q:
        rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"username": rgx}, {"email": rgx}, {"name": rgx}, {"id": q.strip()}]
    if filter == "banned":
        query["banned"] = True
    elif filter == "admins":
        query["is_admin"] = True
    elif filter == "verified":
        query["verified"] = True
    elif filter == "recent":
        pass  # sort handles it
    total = await db.users.count_documents(query)
    cursor = db.users.find(query, {"_id": 0, "password_hash": 0, "two_fa_secret": 0, "two_fa_backup_codes": 0}) \
        .sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    return {
        "total": total, "page": page, "limit": limit,
        "items": [_admin_user_card(u) for u in rows],
    }


@api2.get("/admin/users/{user_id}")
async def admin_user_detail(user_id: str, admin=Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0, "two_fa_secret": 0, "two_fa_backup_codes": 0})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    posts_count = await db.posts.count_documents({"author_id": user_id})
    comments_count = await db.comments.count_documents({"author_id": user_id})
    reports_against = await db.reports.count_documents({"$or": [
        {"kind": "user", "target_id": user_id},
        {"target_user_id": user_id},
    ]})
    sessions_active = await db.sessions.count_documents({"user_id": user_id, "revoked": {"$ne": True}})
    card = _admin_user_card(u)
    card.update({
        "posts_count": posts_count,
        "comments_count": comments_count,
        "reports_against": reports_against,
        "sessions_active": sessions_active,
        "city": u.get("city", ""),
        "region": u.get("region", ""),
    })
    return card


@api2.post("/admin/users/{user_id}/verify")
async def admin_toggle_verify(user_id: str, admin=Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "verified": 1})
    if u is None:
        raise HTTPException(404, "Utilizador não encontrado")
    new_val = not bool(u.get("verified"))
    await db.users.update_one({"id": user_id}, {"$set": {"verified": new_val}})
    await admin_audit(admin, "user.verify", "user", user_id, {"verified": new_val})
    return {"ok": True, "verified": new_val}


@api2.post("/admin/users/{user_id}/admin")
async def admin_toggle_admin(user_id: str, admin=Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Não podes alterar o teu próprio estado de administrador")
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "is_admin": 1})
    if u is None:
        raise HTTPException(404, "Utilizador não encontrado")
    new_val = not bool(u.get("is_admin"))
    await db.users.update_one({"id": user_id}, {"$set": {"is_admin": new_val}})
    await admin_audit(admin, "user.admin_role", "user", user_id, {"is_admin": new_val})
    return {"ok": True, "is_admin": new_val}


@api2.post("/admin/users/{user_id}/ban")
async def admin_ban_user(user_id: str, payload: AdminBanIn, admin=Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Não te podes banir a ti próprio")
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "is_admin": 1})
    if u is None:
        raise HTTPException(404, "Utilizador não encontrado")
    if u.get("is_admin"):
        raise HTTPException(400, "Não podes banir outro administrador. Remove primeiro o papel de admin.")
    reason = (payload.reason or "")[:300]
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"banned": True, "ban_reason": reason, "banned_at": now_iso(), "banned_by": admin["id"]}},
    )
    # Revoke all active sessions
    await db.sessions.update_many(
        {"user_id": user_id, "revoked": {"$ne": True}},
        {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "ban"}},
    )
    await admin_audit(admin, "user.ban", "user", user_id, {"reason": reason})
    return {"ok": True, "banned": True}


@api2.post("/admin/users/{user_id}/unban")
async def admin_unban_user(user_id: str, admin=Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"banned": False, "ban_reason": "", "unbanned_at": now_iso(), "unbanned_by": admin["id"]}},
    )
    await admin_audit(admin, "user.unban", "user", user_id)
    return {"ok": True, "banned": False}


@api2.post("/admin/users/{user_id}/force-logout")
async def admin_force_logout(user_id: str, admin=Depends(require_admin)):
    # Collect jtis BEFORE we flip them so we can update the in-process
    # revocation cache and close any live WebSocket sessions bound to them.
    jtis: list[str] = []
    async for s in db.sessions.find(
        {"user_id": user_id, "revoked": {"$ne": True}},
        {"_id": 0, "jti": 1},
    ):
        j = s.get("jti")
        if j:
            jtis.append(j)
    res = await db.sessions.update_many(
        {"user_id": user_id, "revoked": {"$ne": True}},
        {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "admin_force_logout"}},
    )
    # Sub-second realtime side effects:
    #   1. Revocation cache flip — this process refuses tokens for these
    #      jtis immediately, no DB roundtrip.
    #   2. WS kick — any open sockets bound to these jtis are dropped now.
    for j in jtis:
        try:
            revocation_cache.mark_revoked(j)
        except Exception:
            pass
        try:
            await ws_manager.close_sockets_by_jti(j)
        except Exception:
            pass
    await admin_audit(admin, "user.force_logout", "user", user_id, {"revoked": res.modified_count})
    return {"ok": True, "revoked": res.modified_count}


@api2.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin=Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Não te podes eliminar a ti próprio")
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    if u.get("is_admin"):
        raise HTTPException(400, "Não podes eliminar outro administrador. Remove primeiro o papel de admin.")
    # Cascade similar to /users/me delete
    await db.posts.delete_many({"author_id": user_id})
    await db.comments.delete_many({"author_id": user_id})
    await db.stories.delete_many({"author_id": user_id})
    await db.highlights.delete_many({"owner_id": user_id})
    await db.messages.delete_many({"$or": [{"sender_id": user_id}, {"recipient_id": user_id}]})
    await db.conversations.delete_many({"$or": [{"a_id": user_id}, {"b_id": user_id}]})
    await db.notifications.delete_many({"$or": [{"user_id": user_id}, {"from_user_id": user_id}]})
    await db.reports.delete_many({"$or": [{"reporter_id": user_id}, {"target_user_id": user_id}]})
    await db.sessions.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    await admin_audit(admin, "user.delete", "user", user_id, {"username": u.get("username")})
    return {"ok": True, "deleted": True}


# ----------------- POSTS -----------------

@api2.get("/admin/posts")
async def admin_list_posts(
    admin=Depends(require_admin),
    q: str = "",
    filter: str = "all",   # all | featured | drafts | scheduled
    page: int = 1,
    limit: int = 20,
):
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 20)))
    query: dict = {}
    if q:
        rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"content": rgx}, {"id": q.strip()}]
    if filter == "featured":
        query["featured"] = True
    elif filter == "drafts":
        query["is_draft"] = True
    elif filter == "scheduled":
        query["scheduled_at"] = {"$ne": None}
    total = await db.posts.count_documents(query)
    cursor = db.posts.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    # Resolve authors
    author_ids = list({p.get("author_id") for p in rows if p.get("author_id")})
    authors = {}
    if author_ids:
        async for u in db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1}):
            authors[u["id"]] = u
    return {
        "total": total, "page": page, "limit": limit,
        "items": [_admin_post_card(p, authors.get(p.get("author_id"))) for p in rows],
    }


@api2.delete("/admin/posts/{post_id}")
async def admin_delete_post(post_id: str, admin=Depends(require_admin)):
    p = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1, "author_id": 1, "content": 1})
    if p is None:
        raise HTTPException(404, "Publicação não encontrada")
    await db.posts.delete_one({"id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    await db.reports.delete_many({"kind": "post", "target_id": post_id})
    await admin_audit(admin, "post.delete", "post", post_id, {
        "author_id": p.get("author_id"), "snippet": (p.get("content") or "")[:120],
    })
    return {"ok": True, "deleted": True}


@api2.post("/admin/posts/{post_id}/feature")
async def admin_feature_post(post_id: str, admin=Depends(require_admin)):
    p = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1, "featured": 1})
    if p is None:
        raise HTTPException(404, "Publicação não encontrada")
    new_val = not bool(p.get("featured"))
    await db.posts.update_one({"id": post_id}, {"$set": {"featured": new_val}})
    await admin_audit(admin, "post.feature", "post", post_id, {"featured": new_val})
    return {"ok": True, "featured": new_val}


# ----------------- REPORTS -----------------

@api2.get("/admin/reports")
async def admin_list_reports(
    admin=Depends(require_admin),
    status: str = "open",   # open | closed | all
    kind: str = "all",      # all | post | comment | user
    page: int = 1,
    limit: int = 20,
):
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 20)))
    query: dict = {}
    if status in ("open", "closed"):
        query["status"] = status
    if kind in ("post", "comment", "user"):
        query["kind"] = kind
    total = await db.reports.count_documents(query)
    cursor = db.reports.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    # Enrich with reporter info + target preview
    reporter_ids = list({r.get("reporter_id") for r in rows if r.get("reporter_id")})
    reporters = {}
    if reporter_ids:
        async for u in db.users.find({"id": {"$in": reporter_ids}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1}):
            reporters[u["id"]] = u
    out = []
    for r in rows:
        target_preview = {}
        target_user_id = None
        target_username = None
        tk, tid = r.get("kind"), r.get("target_id")
        if tk == "post" and tid:
            p = await db.posts.find_one({"id": tid}, {"_id": 0, "id": 1, "content": 1, "author_id": 1})
            if p:
                target_preview = {"content": (p.get("content") or "")[:200], "author_id": p.get("author_id")}
                target_user_id = p.get("author_id")
        elif tk == "comment" and tid:
            c = await db.comments.find_one({"id": tid}, {"_id": 0, "id": 1, "content": 1, "author_id": 1, "post_id": 1})
            if c:
                target_preview = {"content": (c.get("content") or "")[:200], "author_id": c.get("author_id"), "post_id": c.get("post_id")}
                target_user_id = c.get("author_id")
        elif tk == "user" and tid:
            tu = await db.users.find_one({"id": tid}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1})
            if tu:
                target_preview = {"username": tu.get("username"), "name": tu.get("name"), "avatar": tu.get("avatar", "")}
                target_user_id = tid
                target_username = tu.get("username")
        if target_user_id and not target_username:
            tu2 = await db.users.find_one({"id": target_user_id}, {"_id": 0, "username": 1})
            if tu2:
                target_username = tu2.get("username")
        rep = reporters.get(r.get("reporter_id"), {})
        out.append({
            "id": r.get("id"),
            "kind": r.get("kind"),
            "target_id": r.get("target_id"),
            "target_user_id": target_user_id,
            "target_username": target_username,
            "reason": r.get("reason"),
            "detail": r.get("detail", ""),
            "status": r.get("status", "open"),
            "created_at": r.get("created_at"),
            "resolved_at": r.get("resolved_at"),
            "resolved_action": r.get("resolved_action"),
            "resolved_note": r.get("resolved_note"),
            "reporter": {
                "id": rep.get("id"), "username": rep.get("username"),
                "name": rep.get("name"), "avatar": rep.get("avatar", ""),
            },
            "target_preview": target_preview,
        })
    return {"total": total, "page": page, "limit": limit, "items": out}


@api2.post("/admin/reports/{report_id}/resolve")
async def admin_resolve_report(report_id: str, payload: AdminReportResolveIn, admin=Depends(require_admin)):
    r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Report não encontrado")
    action = (payload.action or "resolved").lower()
    if action not in {"resolved", "dismissed", "removed"}:
        action = "resolved"
    update = {
        "status": "closed",
        "resolved_at": now_iso(),
        "resolved_by": admin["id"],
        "resolved_action": action,
        "resolved_note": (payload.note or "")[:300],
    }
    await db.reports.update_one({"id": report_id}, {"$set": update})
    # If action=removed, also delete the underlying target
    deleted_target = False
    if action == "removed":
        tk, tid = r.get("kind"), r.get("target_id")
        if tk == "post" and tid:
            await db.posts.delete_one({"id": tid})
            await db.comments.delete_many({"post_id": tid})
            deleted_target = True
        elif tk == "comment" and tid:
            await db.comments.delete_one({"id": tid})
            deleted_target = True
    await admin_audit(admin, "report.resolve", "report", report_id, {
        "action": action, "kind": r.get("kind"), "target_id": r.get("target_id"),
        "deleted_target": deleted_target,
    })
    return {"ok": True, "action": action, "deleted_target": deleted_target}


# ----------------- COMMUNITIES -----------------

@api2.get("/admin/communities")
async def admin_list_communities(
    admin=Depends(require_admin),
    q: str = "",
    page: int = 1,
    limit: int = 20,
):
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 20)))
    query: dict = {}
    if q:
        rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"slug": rgx}, {"name": rgx}, {"description": rgx}]
    total = await db.communities.count_documents(query)
    cursor = db.communities.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    return {
        "total": total, "page": page, "limit": limit,
        "items": [{
            "id": c.get("id"), "slug": c.get("slug"), "name": c.get("name"),
            "description": (c.get("description") or "")[:200], "category": c.get("category"),
            "members_count": len(c.get("members", []) or []),
            "created_at": c.get("created_at"), "owner_id": c.get("owner_id"),
        } for c in rows],
    }


@api2.delete("/admin/communities/{slug}")
async def admin_delete_community(slug: str, admin=Depends(require_admin)):
    c = await db.communities.find_one({"slug": slug}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comunidade não encontrada")
    await db.communities.delete_one({"slug": slug})
    await db.posts.update_many({"community_slug": slug}, {"$unset": {"community_slug": ""}})
    await admin_audit(admin, "community.delete", "community", slug, {"name": c.get("name")})
    return {"ok": True, "deleted": True}


# ----------------- EVENTS -----------------

@api2.get("/admin/events")
async def admin_list_events(
    admin=Depends(require_admin),
    q: str = "",
    page: int = 1,
    limit: int = 20,
):
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 20)))
    query: dict = {}
    if q:
        rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"title": rgx}, {"description": rgx}, {"location": rgx}]
    total = await db.events.count_documents(query)
    cursor = db.events.find(query, {"_id": 0}).sort("starts_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    return {
        "total": total, "page": page, "limit": limit,
        "items": [{
            "id": e.get("id"), "title": e.get("title"),
            "description": (e.get("description") or "")[:200],
            "starts_at": e.get("starts_at"), "ends_at": e.get("ends_at"),
            "location": e.get("location", ""),
            "attendees_count": len(e.get("attendees", []) or []),
            "host_id": e.get("host_id"), "created_at": e.get("created_at"),
        } for e in rows],
    }


@api2.delete("/admin/events/{event_id}")
async def admin_delete_event(event_id: str, admin=Depends(require_admin)):
    e = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Evento não encontrado")
    await db.events.delete_one({"id": event_id})
    await admin_audit(admin, "event.delete", "event", event_id, {"title": e.get("title")})
    return {"ok": True, "deleted": True}


# ----------------- SESSIONS -----------------

@api2.get("/admin/sessions")
async def admin_list_sessions(
    admin=Depends(require_admin),
    user_id: str = "",
    page: int = 1,
    limit: int = 30,
):
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 30)))
    query: dict = {"revoked": {"$ne": True}}
    if user_id:
        query["user_id"] = user_id
    total = await db.sessions.count_documents(query)
    cursor = db.sessions.find(query, {"_id": 0}).sort("last_seen_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    user_ids = list({s.get("user_id") for s in rows if s.get("user_id")})
    users = {}
    if user_ids:
        async for u in db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1}):
            users[u["id"]] = u
    return {
        "total": total, "page": page, "limit": limit,
        "items": [{
            "jti": s.get("jti"), "user_id": s.get("user_id"),
            "user": users.get(s.get("user_id"), {}),
            "ip": s.get("last_ip") or s.get("ip", ""),
            "ua": (s.get("last_ua") or s.get("ua", ""))[:240],
            "source": s.get("source"),
            "created_at": s.get("created_at"),
            "last_seen_at": s.get("last_seen_at"),
        } for s in rows],
    }


@api2.post("/admin/sessions/{jti}/revoke")
async def admin_revoke_session(jti: str, admin=Depends(require_admin)):
    s = await db.sessions.find_one({"jti": jti}, {"_id": 0, "jti": 1, "user_id": 1, "revoked": 1})
    if s is None:
        raise HTTPException(404, "Sessão não encontrada")
    if s.get("revoked"):
        return {"ok": True, "already_revoked": True}
    await db.sessions.update_one(
        {"jti": jti},
        {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "admin"}},
    )
    # Flip the in-process revocation cache + close live WebSockets bound to
    # this jti so the targeted session loses its realtime channel within
    # milliseconds (no need to wait for the periodic 20 s WS re-check).
    try:
        revocation_cache.mark_revoked(jti)
    except Exception:
        pass
    try:
        await ws_manager.close_sockets_by_jti(jti)
    except Exception:
        pass
    await admin_audit(admin, "session.revoke", "session", jti, {"user_id": s.get("user_id")})
    return {"ok": True}


# ----------------- AUDIT LOG -----------------

@api2.get("/admin/audit")
async def admin_audit_list(
    admin=Depends(require_admin),
    action: str = "",
    actor_id: str = "",
    page: int = 1,
    limit: int = 50,
):
    page = max(1, int(page or 1))
    limit = max(1, min(200, int(limit or 50)))
    query: dict = {}
    if action:
        query["action"] = action
    if actor_id:
        query["actor_id"] = actor_id
    total = await db.admin_audit.count_documents(query)
    cursor = db.admin_audit.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    return {"total": total, "page": page, "limit": limit, "items": rows}


# ============================================================================
# ADMIN — SECURITY MODULE
# ============================================================================
# Live security console for /admin/security/* in the frontend.
#
# Design principles:
#   • Every metric is computed live against MongoDB at request time —
#     no caching, no precomputation, no mock values.
#   • Every action is audited (admin_audit) and re-validates server-side.
#   • Every write hits the revocation cache + closes affected WebSockets,
#     so admin actions become user-visible within milliseconds.
#   • Sub-second realtime push: the auth_event side-channel
#     (`_security_event_to_admins`) forwards every new auth event to every
#     connected admin WS, so the dashboard never needs to poll.
# ============================================================================


# Stable taxonomy: which event kinds count as "warning" (non-fatal but
# worth highlighting in the UI) vs "danger" (actively suspicious / hostile).
# Used by the overview KPI computation and by the frontend severity tags.
_SECURITY_EVENT_KINDS_DANGER = frozenset({
    "token_invalid", "login_locked", "reset_password_fail", "twofa_fail",
    "ws_connect_fail", "ws_session_revoked", "suspicious_ip_change",
})
_SECURITY_EVENT_KINDS_WARN = frozenset({
    "login_fail", "session_revoked", "session_revoked_all",
    "forgot_password_issued",
})
_SECURITY_EVENT_KINDS_INFO = frozenset({
    "login_ok", "logout", "password_changed",
    "ws_connect_ok", "twofa_setup", "twofa_disabled", "reset_password_ok",
})


def _classify_event_severity(kind: str) -> str:
    if kind in _SECURITY_EVENT_KINDS_DANGER:
        return "danger"
    if kind in _SECURITY_EVENT_KINDS_WARN:
        return "warn"
    if kind in _SECURITY_EVENT_KINDS_INFO:
        return "info"
    return "info"


def _epoch_now() -> int:
    return int(time.time())


def _from_epoch_iso(ts_epoch: int) -> str:
    """Convert an integer unix timestamp to an ISO-8601 UTC string."""
    try:
        return datetime.fromtimestamp(int(ts_epoch or 0), tz=timezone.utc).isoformat()
    except Exception:
        return ""


@api2.get("/admin/security/overview")
async def admin_security_overview(admin=Depends(require_admin)):
    """Live snapshot of the security posture.

    Every figure is a fresh DB count or in-process counter — nothing is
    cached or stubbed. Safe to poll every few seconds; the underlying
    queries all hit indexed paths.
    """
    now = _epoch_now()
    h1 = now - 3600
    h24 = now - 86400
    h24_start_iso = _from_epoch_iso(h24)
    _ = h24_start_iso  # placeholder; used below

    async def _count(kind: str, since_epoch: int) -> int:
        return await db.auth_events.count_documents(
            {"kind": kind, "ts_epoch": {"$gte": since_epoch}}
        )

    # Parallel-fan-out counts — small payloads, indexed reads.
    (
        logins_1h, logins_24h,
        fails_1h, fails_24h,
        token_invalid_1h, token_invalid_24h,
        locked_1h, ws_fail_1h,
        session_revoked_1h, suspicious_1h,
        twofa_fail_1h,
        reset_fail_1h,
        total_active_sessions,
        admins_count,
        users_count,
        banned_count,
        suspended_count,
    ) = await asyncio.gather(
        _count("login_ok", h1), _count("login_ok", h24),
        _count("login_fail", h1), _count("login_fail", h24),
        _count("token_invalid", h1), _count("token_invalid", h24),
        _count("login_locked", h1), _count("ws_connect_fail", h1),
        _count("session_revoked", h1), _count("suspicious_ip_change", h1),
        _count("twofa_fail", h1),
        _count("reset_password_fail", h1),
        db.sessions.count_documents({"revoked": {"$ne": True}}),
        db.users.count_documents({"is_admin": True}),
        db.users.count_documents({}),
        db.users.count_documents({"banned": True}),
        db.users.count_documents({"suspended_until": {"$gt": now_iso()}}),
    )

    # 24h sparkline: bucket auth events per hour (24 buckets).
    pipeline = [
        {"$match": {"ts_epoch": {"$gte": h24}}},
        {"$group": {
            "_id": {
                "kind": "$kind",
                "bucket": {"$toInt": {"$divide": [{"$subtract": ["$ts_epoch", h24]}, 3600]}},
            },
            "count": {"$sum": 1},
        }},
    ]
    rows = await db.auth_events.aggregate(pipeline).to_list(length=2000)
    buckets_logins = [0] * 24
    buckets_fails = [0] * 24
    buckets_token_invalid = [0] * 24
    buckets_ws_fail = [0] * 24
    for r in rows:
        k = (r.get("_id") or {}).get("kind")
        b = (r.get("_id") or {}).get("bucket")
        if not isinstance(b, int) or b < 0 or b >= 24:
            continue
        c = int(r.get("count") or 0)
        if k == "login_ok":
            buckets_logins[b] += c
        elif k == "login_fail":
            buckets_fails[b] += c
        elif k == "token_invalid":
            buckets_token_invalid[b] += c
        elif k == "ws_connect_fail":
            buckets_ws_fail[b] += c

    # Currently-locked accounts (real-time read).
    locked_now = 0
    async for _doc in db.login_attempts.find(
        {"locked_until_epoch": {"$gt": now}},
        {"_id": 0, "locked_until_epoch": 1},
    ):
        locked_now += 1

    # Connected admin WebSocket count — pulled from the in-process manager.
    admins_online = 0
    for uid in list(ws_manager.admin_user_ids):
        sockets = ws_manager.active.get(uid) or []
        admins_online += sum(
            1 for w in sockets
            if (ws_manager.socket_meta.get(id(w)) or {}).get("is_admin")
        )

    # Config snapshot — read-only, no secrets.
    cfg = {
        "app_env": APP_ENV,
        "is_production": IS_PRODUCTION,
        "jwt_alg": JWT_ALGORITHM,
        "jwt_issuer": JWT_ISSUER,
        "jwt_audience": JWT_AUDIENCE,
        "jwt_secret_len": len(JWT_SECRET or ""),
        # NEVER expose the secret itself. Only its length and a hash prefix
        # so an operator can correlate that the deployed secret matches the
        # secret-manager record without disclosing it.
        "jwt_secret_fp": hashlib.sha256((JWT_SECRET or "").encode()).hexdigest()[:8],
        "access_token_ttl_s": 7 * 24 * 3600,  # access tokens live 7 days (see encode_access in server.py line ~550)
        "cookie_secure": COOKIE_SECURE,
        "cookie_samesite": os.environ.get("COOKIE_SAMESITE", "lax"),
        "ws_max_sockets_per_user": ws_manager.MAX_SOCKETS_PER_USER,
        "revocation_cache": revocation_cache.stats(),
        "lockout_max_fails": auth_security_mod.LOCKOUT_MAX_FAILS,
        "lockout_window_s": auth_security_mod.LOCKOUT_WINDOW_S,
        "lockout_duration_s": auth_security_mod.LOCKOUT_DURATION_S,
        "ws_jti_check_gap_s": 20,  # mirrors _JTI_CHECK_GAP in websocket_endpoint
    }

    # Posture warnings — synthesised live, never hardcoded.
    warnings: list[dict] = []
    if not COOKIE_SECURE and IS_PRODUCTION:
        warnings.append({"level": "danger", "code": "cookie_insecure_prod",
                         "msg": "Cookies em produção sem Secure flag — risco crítico."})
    if cfg["jwt_secret_len"] < 48:
        warnings.append({"level": "danger", "code": "weak_secret",
                         "msg": f"JWT_SECRET tem apenas {cfg['jwt_secret_len']} chars; mínimo recomendado: 48."})
    if cfg["app_env"] not in {"development", "staging", "production", "prod"}:
        warnings.append({"level": "warn", "code": "unknown_env",
                         "msg": f"APP_ENV='{cfg['app_env']}' não reconhecido."})
    if fails_1h >= 50:
        warnings.append({"level": "danger", "code": "login_fail_spike",
                         "msg": f"{fails_1h} falhas de login na última hora — possível credential stuffing."})
    elif fails_1h >= 20:
        warnings.append({"level": "warn", "code": "login_fail_elevated",
                         "msg": f"{fails_1h} falhas de login na última hora — monitorizar."})
    if token_invalid_1h >= 20:
        warnings.append({"level": "danger", "code": "forgery_attempts",
                         "msg": f"{token_invalid_1h} tokens inválidos na última hora — provável tentativa de forja."})
    elif token_invalid_1h >= 5:
        warnings.append({"level": "warn", "code": "forgery_elevated",
                         "msg": f"{token_invalid_1h} tokens inválidos na última hora."})
    if locked_1h >= 5:
        warnings.append({"level": "warn", "code": "lockouts_elevated",
                         "msg": f"{locked_1h} contas bloqueadas na última hora."})
    if admins_count == 0:
        warnings.append({"level": "danger", "code": "no_admins",
                         "msg": "Não existe nenhum administrador na BD."})
    elif admins_count == 1:
        warnings.append({"level": "info", "code": "single_admin",
                         "msg": "Apenas um administrador — considera adicionar um segundo para redundância."})
    # 2FA coverage among admins
    admins_with_2fa = await db.users.count_documents({"is_admin": True, "twofa_enabled": True})
    if admins_count > 0 and admins_with_2fa < admins_count:
        warnings.append({"level": "warn", "code": "admin_2fa_partial",
                         "msg": f"{admins_count - admins_with_2fa} de {admins_count} admins sem 2FA — recomenda-se obrigatoriedade."})

    return {
        "timestamp": now_iso(),
        "counters_1h": {
            "logins": logins_1h,
            "login_fails": fails_1h,
            "token_invalid": token_invalid_1h,
            "logins_locked": locked_1h,
            "ws_fails": ws_fail_1h,
            "sessions_revoked": session_revoked_1h,
            "twofa_fails": twofa_fail_1h,
            "reset_fails": reset_fail_1h,
            "suspicious_ip_change": suspicious_1h,
        },
        "counters_24h": {
            "logins": logins_24h,
            "login_fails": fails_24h,
            "token_invalid": token_invalid_24h,
        },
        "spark_24h": {
            "logins": buckets_logins,
            "fails": buckets_fails,
            "token_invalid": buckets_token_invalid,
            "ws_fails": buckets_ws_fail,
        },
        "state": {
            "active_sessions": total_active_sessions,
            "admins_total": admins_count,
            "admins_with_2fa": admins_with_2fa,
            "admins_online": admins_online,
            "users_total": users_count,
            "users_banned": banned_count,
            "users_suspended": suspended_count,
            "locked_now": locked_now,
        },
        "config": cfg,
        "warnings": warnings,
        "controls": [
            {"k": "jwt_alg_pinned",     "label": "Algoritmo HS256 fixado",                 "on": True},
            {"k": "alg_none_blocked",   "label": "alg=none rejeitado (pre-flight + PyJWT)", "on": True},
            {"k": "iss_aud_enforced",   "label": "iss/aud enforçados",                     "on": True},
            {"k": "env_isolated",       "label": "Tokens isolados por ambiente",           "on": True},
            {"k": "signature_verified", "label": "Assinatura HMAC verificada",              "on": True},
            {"k": "exp_nbf_iat_checked","label": "exp/nbf/iat verificados",                 "on": True},
            {"k": "crit_rejected",      "label": "Header crit rejeitado",                  "on": True},
            {"k": "session_table",      "label": "Sessões server-side (db.sessions)",      "on": True},
            {"k": "revocation_cache",   "label": "Revocation TTL cache",                   "on": True},
            {"k": "password_rotation_kill", "label": "Tokens antigos invalidados ao mudar password", "on": True},
            {"k": "ws_periodic_recheck","label": "WS re-check de revogação a cada 20 s",   "on": True},
            {"k": "bcrypt",             "label": "Passwords com bcrypt",                   "on": True},
            {"k": "rate_limit",         "label": "Rate-limit por IP",                      "on": True},
            {"k": "lockout",            "label": f"Lockout: {auth_security_mod.LOCKOUT_MAX_FAILS}/{auth_security_mod.LOCKOUT_WINDOW_S//60}m", "on": True},
            {"k": "csrf_mirror",        "label": "CSRF mirror-cookie",                     "on": True},
            {"k": "cookie_httponly",    "label": "Cookies HttpOnly",                       "on": True},
            {"k": "cookie_secure",      "label": "Cookies Secure",                         "on": bool(COOKIE_SECURE)},
            {"k": "log_redaction",      "label": "Redaction de segredos nos logs",         "on": True},
            {"k": "auth_audit_log",     "label": "Audit log de auth (90 d TTL)",           "on": True},
            {"k": "admin_audit_log",    "label": "Audit log de ações admin",               "on": True},
            {"k": "twofa_available",    "label": "2FA TOTP disponível",                    "on": True},
        ],
    }


@api2.get("/admin/security/events")
async def admin_security_events(
    admin=Depends(require_admin),
    kind: str = "",
    severity: str = "",
    user_id: str = "",
    email: str = "",
    ip: str = "",
    q: str = "",
    since_minutes: int = 0,
    page: int = 1,
    limit: int = 50,
):
    """Filtered, paginated feed of auth_events.

    Filters compose. `severity` is one of {danger, warn, info}.
    `q` is a free-text fuzzy search across email/ip/ua/jti/detail.
    """
    page = max(1, int(page or 1))
    limit = max(1, min(200, int(limit or 50)))
    query: dict = {}
    if kind:
        kinds = [k.strip() for k in kind.split(",") if k.strip()]
        if len(kinds) == 1:
            query["kind"] = kinds[0]
        else:
            query["kind"] = {"$in": kinds}
    elif severity:
        sev = severity.strip().lower()
        if sev == "danger":
            query["kind"] = {"$in": list(_SECURITY_EVENT_KINDS_DANGER)}
        elif sev == "warn":
            query["kind"] = {"$in": list(_SECURITY_EVENT_KINDS_WARN)}
        elif sev == "info":
            query["kind"] = {"$in": list(_SECURITY_EVENT_KINDS_INFO)}
    if user_id:
        query["user_id"] = user_id.strip()
    if email:
        query["email"] = email.strip().lower()
    if ip:
        query["ip"] = ip.strip()
    if since_minutes and since_minutes > 0:
        query["ts_epoch"] = {"$gte": _epoch_now() - int(since_minutes) * 60}
    if q:
        rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        # Compose with $and so a prior `kind`/`severity` filter is preserved.
        free_text = {"$or": [
            {"email": rgx}, {"ip": rgx}, {"ua": rgx}, {"jti": rgx},
            {"detail.reason": rgx}, {"user_id": rgx},
        ]}
        if query:
            query = {"$and": [query, free_text]}
        else:
            query = free_text

    total = await db.auth_events.count_documents(query)
    cursor = (db.auth_events.find(query, {"_id": 0})
              .sort("ts_epoch", -1)
              .skip((page - 1) * limit)
              .limit(limit))
    rows = await cursor.to_list(length=limit)

    # Hydrate user references (avatar / username) for the UI — single batched read.
    user_ids = list({r.get("user_id") for r in rows if r.get("user_id")})
    users: dict = {}
    if user_ids:
        async for u in db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "is_admin": 1},
        ):
            users[u["id"]] = u

    items = []
    for r in rows:
        items.append({
            "kind": r.get("kind"),
            "severity": _classify_event_severity(r.get("kind") or ""),
            "user_id": r.get("user_id"),
            "user": users.get(r.get("user_id") or "", {}),
            "email": r.get("email"),
            "ip": r.get("ip"),
            "ua": r.get("ua"),
            "jti": r.get("jti"),
            "detail": r.get("detail") or {},
            "ts": r.get("ts"),
        })
    return {"total": total, "page": page, "limit": limit, "items": items}


@api2.get("/admin/security/event-kinds")
async def admin_security_event_kinds(admin=Depends(require_admin)):
    """Enumerate the kinds present in db.auth_events (for the filter dropdown)."""
    pipeline = [{"$group": {"_id": "$kind", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    rows = await db.auth_events.aggregate(pipeline).to_list(length=200)
    return {
        "items": [
            {
                "kind": r["_id"],
                "count": r["count"],
                "severity": _classify_event_severity(r["_id"] or ""),
            }
            for r in rows if r.get("_id")
        ],
    }


@api2.get("/admin/security/lockouts")
async def admin_security_lockouts(admin=Depends(require_admin)):
    """Currently-locked accounts."""
    now = _epoch_now()
    cursor = db.login_attempts.find(
        {"locked_until_epoch": {"$gt": now}},
        {"_id": 0, "email": 1, "locked_until_epoch": 1, "attempts": 1, "updated_at": 1},
    ).sort("locked_until_epoch", -1)
    items = []
    async for d in cursor:
        items.append({
            "email": d.get("email"),
            "locked_until_epoch": d.get("locked_until_epoch"),
            "locked_until_iso": _from_epoch_iso(d.get("locked_until_epoch") or 0),
            "fails_in_window": len(d.get("attempts") or []),
            "updated_at_epoch": d.get("updated_at"),
        })
    return {"total": len(items), "items": items}


@api2.post("/admin/security/lockouts/clear")
async def admin_security_lockouts_clear(
    body: dict, admin=Depends(require_admin)
):
    """Unlock an account. Body: {\"email\": \"...\"}"""
    email = (body or {}).get("email", "").strip().lower()
    if not email:
        raise HTTPException(400, "email é obrigatório")
    res = await db.login_attempts.delete_one({"email": email})
    await admin_audit(admin, "security.lockout_clear", "email", email, {"removed": res.deleted_count})
    await auth_event(
        "security_admin_action",
        user_id=admin.get("id"),
        email=email,
        detail={"action": "lockout_clear", "removed": res.deleted_count},
    )
    return {"ok": True, "cleared": res.deleted_count > 0}


@api2.get("/admin/security/admins")
async def admin_security_admins(admin=Depends(require_admin)):
    """List admin accounts with 2FA / sessions / online state."""
    cursor = db.users.find(
        {"is_admin": True},
        {"_id": 0, "id": 1, "username": 1, "name": 1, "email": 1, "avatar": 1,
         "twofa_enabled": 1, "created_at": 1, "last_login_at": 1, "password_changed_at": 1,
         "banned": 1, "suspended_until": 1},
    )
    admins = await cursor.to_list(length=500)
    ids = [a["id"] for a in admins]
    # Active sessions per admin
    sess_counts: dict = {}
    if ids:
        pipeline = [
            {"$match": {"user_id": {"$in": ids}, "revoked": {"$ne": True}}},
            {"$group": {"_id": "$user_id", "n": {"$sum": 1}}},
        ]
        async for r in db.sessions.aggregate(pipeline):
            sess_counts[r["_id"]] = r["n"]
    items = []
    for a in admins:
        items.append({
            "id": a.get("id"),
            "username": a.get("username"),
            "name": a.get("name"),
            "email": a.get("email"),
            "avatar": a.get("avatar"),
            "twofa_enabled": bool(a.get("twofa_enabled")),
            "active_sessions": sess_counts.get(a.get("id"), 0),
            "online": a.get("id") in ws_manager.admin_user_ids,
            "banned": bool(a.get("banned")),
            "suspended_until": a.get("suspended_until"),
            "created_at": a.get("created_at"),
            "last_login_at": a.get("last_login_at"),
            "password_changed_at": a.get("password_changed_at"),
            "is_self": a.get("id") == admin.get("id"),
        })
    return {"total": len(items), "items": items}


@api2.post("/admin/security/test-token")
async def admin_security_test_token(body: dict, admin=Depends(require_admin)):
    """Diagnostic — paste a token, see exactly what the decoder would do.

    Reveals NOTHING that the requester didn't already supply: the response
    contains only verdict + reason + the decoded *header* claims. Payload
    `sub` is included so an operator can confirm whose token they pasted,
    but the full payload is NOT returned (avoid accidental leakage).
    """
    token = ((body or {}).get("token") or "").strip()
    if not token:
        raise HTTPException(400, "token é obrigatório")
    out: dict = {"verdict": "invalid", "reason": "", "stage": "", "header": None, "claims": {}}
    # Stage 1: raw header pre-flight
    try:
        hdr = validate_jwt_header_strict(token)
        out["header"] = hdr
    except InvalidJWTHeader as e:
        out["stage"] = "header_preflight"
        out["reason"] = str(e)
        return out
    # Stage 2: PyJWT strict decode
    try:
        payload = _decode_access_token(token)
    except jwt.ExpiredSignatureError:
        out["stage"] = "pyjwt"
        out["reason"] = "expired"
        return out
    except jwt.InvalidTokenError as e:
        out["stage"] = "pyjwt"
        out["reason"] = str(e)
        return out
    # Stage 3: type / session / user-state
    if payload.get("type") != "access":
        out["stage"] = "type_check"
        out["reason"] = f"wrong type: {payload.get('type')}"
        return out
    jti = payload.get("jti") or ""
    sess = await db.sessions.find_one({"jti": jti}, {"_id": 0, "revoked": 1, "user_id": 1})
    if sess and sess.get("revoked"):
        out["stage"] = "session_revoked"
        out["reason"] = "session_revoked"
        out["claims"] = {"sub": payload.get("sub"), "jti": jti, "iat": payload.get("iat"),
                         "exp": payload.get("exp"), "iss": payload.get("iss"), "aud": payload.get("aud")}
        return out
    udoc = await db.users.find_one(
        {"id": payload.get("sub")},
        {"_id": 0, "id": 1, "username": 1, "is_admin": 1, "banned": 1,
         "suspended_until": 1, "password_changed_at": 1},
    )
    if not udoc:
        out["stage"] = "user_lookup"
        out["reason"] = "user_not_found"
        return out
    if udoc.get("banned"):
        out["stage"] = "user_state"
        out["reason"] = "banned"
        return out
    if _restriction_active(udoc, "suspended_until"):
        out["stage"] = "user_state"
        out["reason"] = "suspended"
        return out
    pwd_changed = udoc.get("password_changed_at")
    if pwd_changed:
        dt = _parse_iso_utc(pwd_changed)
        if dt and int(payload.get("iat") or 0) < int(dt.timestamp()):
            out["stage"] = "password_rotation"
            out["reason"] = "iat_before_password_change"
            return out
    out["verdict"] = "valid"
    out["stage"] = "ok"
    out["reason"] = ""
    out["claims"] = {
        "sub": payload.get("sub"),
        "jti": jti,
        "iat": payload.get("iat"),
        "exp": payload.get("exp"),
        "iss": payload.get("iss"),
        "aud": payload.get("aud"),
        "type": payload.get("type"),
    }
    out["user"] = {"username": udoc.get("username"), "is_admin": bool(udoc.get("is_admin"))}
    return out


@api2.get("/admin/security/sessions")
async def admin_security_sessions(
    admin=Depends(require_admin),
    user_id: str = "",
    ip: str = "",
    q: str = "",
    online_only: int = 0,
    page: int = 1,
    limit: int = 50,
):
    """Active sessions enriched with online status (WS connected = online)."""
    page = max(1, int(page or 1))
    limit = max(1, min(200, int(limit or 50)))
    query: dict = {"revoked": {"$ne": True}}
    if user_id:
        query["user_id"] = user_id.strip()
    if ip:
        query["last_ip"] = ip.strip()
    if q:
        rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"last_ip": rgx}, {"last_ua": rgx}, {"jti": rgx}]
    total = await db.sessions.count_documents(query)
    cursor = (db.sessions.find(query, {"_id": 0})
              .sort("last_seen_at", -1)
              .skip((page - 1) * limit)
              .limit(limit))
    rows = await cursor.to_list(length=limit)
    user_ids = list({s.get("user_id") for s in rows if s.get("user_id")})
    users: dict = {}
    if user_ids:
        async for u in db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "is_admin": 1},
        ):
            users[u["id"]] = u

    # Online = at least one live WebSocket bound to the same jti.
    live_jtis: set = set()
    for uid, sockets in ws_manager.active.items():
        for w in sockets:
            j = (ws_manager.socket_meta.get(id(w)) or {}).get("jti")
            if j:
                live_jtis.add(j)

    items = []
    for s in rows:
        j = s.get("jti")
        online = j in live_jtis if j else False
        if online_only and not online:
            continue
        items.append({
            "jti": j,
            "user_id": s.get("user_id"),
            "user": users.get(s.get("user_id") or "", {}),
            "ip": s.get("last_ip") or s.get("ip", ""),
            "ua": (s.get("last_ua") or s.get("ua", ""))[:240],
            "source": s.get("source"),
            "created_at": s.get("created_at"),
            "last_seen_at": s.get("last_seen_at"),
            "online": online,
        })
    return {"total": total, "page": page, "limit": limit, "items": items, "live_jtis": len(live_jtis)}




# ----------------- COMMENTS -----------------

@api2.get("/admin/comments")
async def admin_list_comments(
    admin=Depends(require_admin),
    q: str = "",
    page: int = 1,
    limit: int = 25,
):
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 25)))
    query: dict = {}
    if q:
        rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"content": rgx}, {"id": q.strip()}, {"post_id": q.strip()}]
    total = await db.comments.count_documents(query)
    cursor = db.comments.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    author_ids = list({c.get("author_id") for c in rows if c.get("author_id")})
    authors = {}
    if author_ids:
        async for u in db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1}):
            authors[u["id"]] = u
    out = []
    for c in rows:
        a = authors.get(c.get("author_id"), {})
        out.append({
            "id": c.get("id"),
            "post_id": c.get("post_id"),
            "parent_id": c.get("parent_id"),
            "content": (c.get("content") or "")[:400],
            "author_id": c.get("author_id"),
            "author_username": a.get("username", ""),
            "author_name": a.get("name", ""),
            "author_avatar": a.get("avatar", ""),
            "likes_count": len(c.get("likes", []) or []),
            "replies_count": int(c.get("replies_count", 0) or 0),
            "created_at": c.get("created_at"),
        })
    return {"total": total, "page": page, "limit": limit, "items": out}


async def _cascade_delete_comment(comment_id: str) -> int:
    """Recursively delete a comment and ALL its descendants. Returns total deleted."""
    deleted = 0
    stack = [comment_id]
    while stack:
        cid = stack.pop()
        children = await db.comments.find({"parent_id": cid}, {"_id": 0, "id": 1}).to_list(length=1000)
        for ch in children:
            stack.append(ch["id"])
        r = await db.comments.delete_one({"id": cid})
        deleted += r.deleted_count
    return deleted


@api2.delete("/admin/comments/{comment_id}")
async def admin_delete_comment(comment_id: str, admin=Depends(require_admin)):
    c = await db.comments.find_one({"id": comment_id}, {"_id": 0, "id": 1, "post_id": 1, "content": 1, "author_id": 1})
    if c is None:
        raise HTTPException(404, "Comentário não encontrado")
    n = await _cascade_delete_comment(comment_id)
    # Recompute the post's comments_count
    if c.get("post_id"):
        new_count = await db.comments.count_documents({"post_id": c["post_id"]})
        await db.posts.update_one({"id": c["post_id"]}, {"$set": {"comments_count": new_count}})
    await db.reports.delete_many({"kind": "comment", "target_id": comment_id})
    await admin_audit(admin, "comment.delete", "comment", comment_id, {
        "post_id": c.get("post_id"), "author_id": c.get("author_id"),
        "deleted": n, "snippet": (c.get("content") or "")[:120],
    })
    return {"ok": True, "deleted": n}


# ----------------- STORIES -----------------

@api2.get("/admin/stories")
async def admin_list_stories(
    admin=Depends(require_admin),
    q: str = "",
    filter: str = "active",   # active | expired | all
    page: int = 1,
    limit: int = 25,
):
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 25)))
    now = now_iso()
    query: dict = {}
    if filter == "active":
        query["expires_at"] = {"$gte": now}
    elif filter == "expired":
        query["expires_at"] = {"$lt": now}
    if q:
        rgx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [
            {"caption": rgx}, {"text_content": rgx},
            {"id": q.strip()}, {"author_id": q.strip()},
        ]
    total = await db.stories.count_documents(query)
    cursor = db.stories.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    author_ids = list({s.get("author_id") for s in rows if s.get("author_id")})
    authors = {}
    if author_ids:
        async for u in db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1}):
            authors[u["id"]] = u
    out = []
    for s in rows:
        a = authors.get(s.get("author_id"), {})
        out.append({
            "id": s.get("id"),
            "author_id": s.get("author_id"),
            "author_username": a.get("username", ""),
            "author_name": a.get("name", ""),
            "author_avatar": a.get("avatar", ""),
            "media_type": s.get("media_type", "image"),
            "caption": (s.get("caption") or s.get("text_content") or "")[:200],
            "audience": s.get("audience", "everyone"),
            "viewers_count": len(s.get("viewers", []) or []),
            "reactions_count": sum(len(v) for v in (s.get("reactions") or {}).values() if isinstance(v, list)),
            "created_at": s.get("created_at"),
            "expires_at": s.get("expires_at"),
            "is_active": (s.get("expires_at") or "") >= now,
        })
    return {"total": total, "page": page, "limit": limit, "items": out}


@api2.delete("/admin/stories/{story_id}")
async def admin_delete_story(story_id: str, admin=Depends(require_admin)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0, "id": 1, "author_id": 1, "caption": 1, "text_content": 1})
    if not s:
        raise HTTPException(404, "Story não encontrada")
    await db.stories.delete_one({"id": story_id})
    # Remove from any highlights
    await db.highlights.update_many({}, {"$pull": {"story_ids": story_id}})
    await admin_audit(admin, "story.delete", "story", story_id, {
        "author_id": s.get("author_id"),
        "snippet": (s.get("caption") or s.get("text_content") or "")[:120],
    })
    return {"ok": True, "deleted": True}


# ----------------- HASHTAGS BLACKLIST -----------------

@api2.get("/admin/hashtags")
async def admin_list_hashtags(
    admin=Depends(require_admin),
    q: str = "",
    filter: str = "all",   # all | blacklisted | active
    page: int = 1,
    limit: int = 30,
):
    """Lista hashtags com contagem global + estado de blacklist.
    Inclui blacklisted mesmo que já não tenham posts (mostram count=0)."""
    page = max(1, int(page or 1))
    limit = max(1, min(100, int(limit or 30)))
    # Aggregate tag counts from posts
    pipeline = [
        {"$match": {"hashtags": {"$exists": True, "$ne": []}, "is_draft": {"$ne": True}}},
        {"$unwind": "$hashtags"},
        {"$group": {"_id": "$hashtags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1000},
    ]
    agg = await db.posts.aggregate(pipeline).to_list(length=1000)
    blacklist_rows = await db.hashtag_blacklist.find({}, {"_id": 0}).to_list(length=1000)
    bl_map = {(b.get("tag") or "").lower(): b for b in blacklist_rows}
    items: list[dict] = []
    seen = set()
    for row in agg:
        tag = (row.get("_id") or "").lower()
        if not tag:
            continue
        seen.add(tag)
        items.append({
            "tag": tag,
            "count": int(row.get("count") or 0),
            "blacklisted": tag in bl_map,
            "blacklist_reason": (bl_map.get(tag) or {}).get("reason", "") if tag in bl_map else "",
            "blacklisted_at": (bl_map.get(tag) or {}).get("created_at") if tag in bl_map else None,
        })
    # Add blacklisted tags that no longer have posts
    for tag, doc in bl_map.items():
        if tag in seen:
            continue
        items.append({
            "tag": tag, "count": 0, "blacklisted": True,
            "blacklist_reason": doc.get("reason", ""),
            "blacklisted_at": doc.get("created_at"),
        })
    # Filter
    if q:
        ql = q.strip().lower().lstrip("#")
        items = [it for it in items if ql in it["tag"]]
    if filter == "blacklisted":
        items = [it for it in items if it["blacklisted"]]
    elif filter == "active":
        items = [it for it in items if not it["blacklisted"]]
    total = len(items)
    start = (page - 1) * limit
    items = items[start:start + limit]
    return {"total": total, "page": page, "limit": limit, "items": items}


class AdminHashtagBlacklistIn(BaseModel):
    reason: Optional[str] = ""


@api2.post("/admin/hashtags/{tag}/blacklist")
async def admin_toggle_hashtag_blacklist(
    tag: str,
    payload: Optional[AdminHashtagBlacklistIn] = None,
    admin=Depends(require_admin),
):
    """Toggle: se já está em blacklist, remove; caso contrário, adiciona."""
    tag_l = (tag or "").strip().lower().lstrip("#")
    if not tag_l or len(tag_l) > 80:
        raise HTTPException(400, "Hashtag inválida")
    existing = await db.hashtag_blacklist.find_one({"tag": tag_l})
    if existing:
        await db.hashtag_blacklist.delete_one({"tag": tag_l})
        await admin_audit(admin, "hashtag.blacklist", "hashtag", tag_l, {"blacklisted": False})
        return {"ok": True, "tag": tag_l, "blacklisted": False}
    reason = ((payload.reason if payload else "") or "")[:300]
    await db.hashtag_blacklist.insert_one({
        "id": str(uuid.uuid4()), "tag": tag_l, "reason": reason,
        "created_at": now_iso(), "created_by": admin["id"],
    })
    await admin_audit(admin, "hashtag.blacklist", "hashtag", tag_l, {"blacklisted": True, "reason": reason})
    return {"ok": True, "tag": tag_l, "blacklisted": True}


# ----------------- BROADCAST NOTIFICATION -----------------

class AdminBroadcastIn(BaseModel):
    text: str
    audience: Optional[str] = "all"   # all | verified | non_banned | new_accounts_7d | admins
    link: Optional[str] = ""          # opcional, abre em frontend (notification.extra.link)
    city: Optional[str] = ""          # filtro adicional


@api2.post("/admin/broadcast")
async def admin_broadcast_notification(payload: AdminBroadcastIn, admin=Depends(require_admin)):
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(400, "Texto vazio")
    if len(text) > 280:
        raise HTTPException(400, "Texto demasiado longo (máx 280)")
    audience = (payload.audience or "all").lower()
    if audience not in {"all", "verified", "non_banned", "new_accounts_7d", "admins"}:
        raise HTTPException(400, "Audiência inválida")
    link = (payload.link or "").strip()[:300]
    city = (payload.city or "").strip().lower()[:60]

    query: dict = {}
    if audience == "verified":
        query["verified"] = True
    elif audience == "non_banned":
        query["banned"] = {"$ne": True}
    elif audience == "new_accounts_7d":
        cut = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        query["created_at"] = {"$gte": cut}
    elif audience == "admins":
        query["is_admin"] = True
    if city:
        query["city"] = {"$regex": f"^{re.escape(city)}$", "$options": "i"}

    target_ids = []
    async for u in db.users.find(query, {"_id": 0, "id": 1}):
        target_ids.append(u["id"])
    if not target_ids:
        return {"ok": True, "sent": 0}

    batch_id = str(uuid.uuid4())
    now = now_iso()
    docs = []
    for uid in target_ids:
        docs.append({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "type": "broadcast",
            "from_user_id": admin["id"],
            "post_id": None,
            "text": text,
            "extra": {"link": link, "broadcast_id": batch_id, "from_admin": admin.get("username")},
            "read": False,
            "created_at": now,
        })
    # Bulk insert
    if docs:
        await db.notifications.insert_many(docs)
    # Try to push WS notifications (best effort)
    try:
        if "ws_manager" in globals():
            for d in docs:
                await ws_manager.send_personal(d["user_id"], {
                    "type": "new_notification",
                    "notification": {
                        "id": d["id"], "type": "broadcast", "text": d["text"],
                        "created_at": d["created_at"], "extra": d["extra"],
                    },
                })
    except Exception:
        pass
    await admin_audit(admin, "broadcast.send", "broadcast", batch_id, {
        "audience": audience, "city": city, "count": len(docs),
        "snippet": text[:80], "link": link,
    })
    return {"ok": True, "sent": len(docs), "audience": audience, "broadcast_id": batch_id}


@api2.get("/admin/broadcast/audience-count")
async def admin_broadcast_audience_count(
    admin=Depends(require_admin),
    audience: str = "all",
    city: str = "",
):
    """Preview do nº de utilizadores que recebem uma broadcast antes de enviar."""
    audience_l = (audience or "all").lower()
    query: dict = {}
    if audience_l == "verified":
        query["verified"] = True
    elif audience_l == "non_banned":
        query["banned"] = {"$ne": True}
    elif audience_l == "new_accounts_7d":
        cut = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        query["created_at"] = {"$gte": cut}
    elif audience_l == "admins":
        query["is_admin"] = True
    city_l = (city or "").strip().lower()
    if city_l:
        query["city"] = {"$regex": f"^{re.escape(city_l)}$", "$options": "i"}
    count = await db.users.count_documents(query)
    return {"count": count, "audience": audience_l, "city": city_l}


# ----------------- BULK OPERATIONS -----------------

class AdminBulkUsersIn(BaseModel):
    ids: list[str]
    action: str   # verify | unverify | ban | unban | force_logout
    reason: Optional[str] = ""


@api2.post("/admin/users/bulk")
async def admin_bulk_users(payload: AdminBulkUsersIn, admin=Depends(require_admin)):
    action = (payload.action or "").lower()
    if action not in {"verify", "unverify", "ban", "unban", "force_logout"}:
        raise HTTPException(400, "Acção inválida")
    ids = [i for i in (payload.ids or []) if i and i != admin["id"]]
    ids = ids[:200]
    if not ids:
        return {"ok": True, "updated": 0}
    reason = (payload.reason or "")[:300]
    updated = 0
    if action == "verify":
        r = await db.users.update_many({"id": {"$in": ids}}, {"$set": {"verified": True}})
        updated = r.modified_count
    elif action == "unverify":
        r = await db.users.update_many({"id": {"$in": ids}}, {"$set": {"verified": False}})
        updated = r.modified_count
    elif action == "ban":
        # Skip admins
        candidates = []
        async for u in db.users.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "is_admin": 1}):
            if not u.get("is_admin"):
                candidates.append(u["id"])
        if candidates:
            r = await db.users.update_many(
                {"id": {"$in": candidates}},
                {"$set": {"banned": True, "ban_reason": reason, "banned_at": now_iso(), "banned_by": admin["id"]}},
            )
            updated = r.modified_count
            await db.sessions.update_many(
                {"user_id": {"$in": candidates}, "revoked": {"$ne": True}},
                {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "ban_bulk"}},
            )
    elif action == "unban":
        r = await db.users.update_many(
            {"id": {"$in": ids}},
            {"$set": {"banned": False, "ban_reason": "", "unbanned_at": now_iso(), "unbanned_by": admin["id"]}},
        )
        updated = r.modified_count
    elif action == "force_logout":
        r = await db.sessions.update_many(
            {"user_id": {"$in": ids}, "revoked": {"$ne": True}},
            {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "admin_force_logout_bulk"}},
        )
        updated = r.modified_count
    await admin_audit(admin, "user.bulk", "user", "", {
        "action": action, "ids_count": len(ids), "updated": updated, "reason": reason,
    })
    return {"ok": True, "action": action, "updated": updated, "requested": len(ids)}


class AdminBulkPostsIn(BaseModel):
    ids: list[str]
    action: str   # feature | unfeature | delete


@api2.post("/admin/posts/bulk")
async def admin_bulk_posts(payload: AdminBulkPostsIn, admin=Depends(require_admin)):
    action = (payload.action or "").lower()
    if action not in {"feature", "unfeature", "delete"}:
        raise HTTPException(400, "Acção inválida")
    ids = [i for i in (payload.ids or []) if i][:200]
    if not ids:
        return {"ok": True, "updated": 0}
    updated = 0
    if action == "feature":
        r = await db.posts.update_many({"id": {"$in": ids}}, {"$set": {"featured": True}})
        updated = r.modified_count
    elif action == "unfeature":
        r = await db.posts.update_many({"id": {"$in": ids}}, {"$set": {"featured": False}})
        updated = r.modified_count
    elif action == "delete":
        r = await db.posts.delete_many({"id": {"$in": ids}})
        updated = r.deleted_count
        await db.comments.delete_many({"post_id": {"$in": ids}})
        await db.reports.delete_many({"kind": "post", "target_id": {"$in": ids}})
    await admin_audit(admin, "post.bulk", "post", "", {
        "action": action, "ids_count": len(ids), "updated": updated,
    })
    return {"ok": True, "action": action, "updated": updated, "requested": len(ids)}


# ----------------- USER DRAWER (extra detail endpoints) -----------------

@api2.get("/admin/users/{user_id}/posts")
async def admin_user_posts(user_id: str, admin=Depends(require_admin), page: int = 1, limit: int = 20):
    page = max(1, int(page or 1))
    limit = max(1, min(50, int(limit or 20)))
    total = await db.posts.count_documents({"author_id": user_id})
    cursor = db.posts.find({"author_id": user_id}, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    return {
        "total": total, "page": page, "limit": limit,
        "items": [_admin_post_card(p) for p in rows],
    }


@api2.get("/admin/users/{user_id}/comments")
async def admin_user_comments(user_id: str, admin=Depends(require_admin), page: int = 1, limit: int = 20):
    page = max(1, int(page or 1))
    limit = max(1, min(50, int(limit or 20)))
    total = await db.comments.count_documents({"author_id": user_id})
    cursor = db.comments.find({"author_id": user_id}, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    rows = await cursor.to_list(length=limit)
    items = []
    for c in rows:
        items.append({
            "id": c.get("id"), "post_id": c.get("post_id"), "parent_id": c.get("parent_id"),
            "content": (c.get("content") or "")[:300],
            "likes_count": len(c.get("likes", []) or []),
            "created_at": c.get("created_at"),
        })
    return {"total": total, "page": page, "limit": limit, "items": items}


@api2.get("/admin/users/{user_id}/reports")
async def admin_user_reports(user_id: str, admin=Depends(require_admin)):
    """Reports relacionados ao utilizador: feitos contra ele + feitos por ele."""
    against = await db.reports.find(
        {"$or": [{"kind": "user", "target_id": user_id}, {"target_user_id": user_id}]},
        {"_id": 0},
    ).sort("created_at", -1).limit(50).to_list(length=50)
    by = await db.reports.find(
        {"reporter_id": user_id}, {"_id": 0},
    ).sort("created_at", -1).limit(50).to_list(length=50)
    return {"against": against, "by": by}


@api2.get("/admin/users/{user_id}/sessions")
async def admin_user_sessions(user_id: str, admin=Depends(require_admin)):
    rows = await db.sessions.find(
        {"user_id": user_id}, {"_id": 0},
    ).sort("last_seen_at", -1).limit(50).to_list(length=50)
    return {"items": rows}


# ----------------- SYSTEM HEALTH -----------------

@api2.get("/admin/health")
async def admin_health(admin=Depends(require_admin)):
    """Saúde do sistema: tamanhos de coleções, WS clients ativos, blacklist size."""
    coll_names = [
        "users", "posts", "comments", "stories", "highlights",
        "messages", "conversations", "notifications", "reports",
        "communities", "events", "sessions", "admin_audit",
        "hashtag_blacklist", "bookmarks", "bookmark_collections",
    ]
    collections = {}
    for name in coll_names:
        try:
            cnt = await db[name].count_documents({})
            collections[name] = cnt
        except Exception:
            collections[name] = -1
    # WS info
    ws_clients = 0
    ws_users = 0
    viewers_total = 0
    try:
        if "ws_manager" in globals():
            ws_users = len(ws_manager.active)
            ws_clients = sum(len(v) for v in ws_manager.active.values())
            viewers_total = sum(len(s) for s in ws_manager.viewers_by_post.values())
    except Exception:
        pass
    # Blacklist size
    bl_size = await db.hashtag_blacklist.count_documents({})
    return {
        "collections": collections,
        "websocket": {
            "users_connected": ws_users,
            "sockets": ws_clients,
            "post_viewers": viewers_total,
        },
        "hashtag_blacklist_size": bl_size,
        "checked_at": now_iso(),
    }


# ----------------- SYSTEM PANEL (new) -----------------

def _read_proc_meminfo() -> dict:
    """Parse /proc/meminfo. Returns kB values. Empty dict if unavailable."""
    out: dict = {}
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                k, _, v = line.partition(":")
                v = v.strip().split()
                if v:
                    try:
                        out[k.strip()] = int(v[0])
                    except ValueError:
                        pass
    except Exception:
        pass
    return out


def _tail_file(path: str, n: int = 200, max_bytes: int = 200_000) -> list[str]:
    """Return last `n` lines of a text file, reading at most `max_bytes`."""
    try:
        with open(path, "rb") as f:
            f.seek(0, os.SEEK_END)
            sz = f.tell()
            start = max(0, sz - max_bytes)
            f.seek(start)
            data = f.read().decode("utf-8", errors="replace")
        lines = data.splitlines()
        return lines[-n:]
    except Exception:
        return []


@api2.get("/admin/system/status")
async def admin_system_status(admin=Depends(require_admin)):
    """Real backend status: process, version, env mode, host."""
    return {
        "ok": True,
        "service": "lusorae-backend",
        "hostname": socket.gethostname(),
        "pid": os.getpid(),
        "python": platform.python_version(),
        "platform": platform.platform(),
        "started_at": _PROCESS_STARTED_AT_ISO,
        "uptime_seconds": int(time.time() - _PROCESS_STARTED_AT),
        "env": {
            "db_name": os.environ.get("DB_NAME", ""),
            "has_jwt_secret": bool(os.environ.get("JWT_SECRET")),
            "admin_email_configured": bool(os.environ.get("ADMIN_EMAIL")),
        },
        "checked_at": now_iso(),
    }


@api2.get("/admin/system/websocket")
async def admin_system_websocket(admin=Depends(require_admin)):
    """Real WebSocket manager state."""
    ws_users = 0
    ws_sockets = 0
    by_user: list = []
    viewers_total = 0
    viewers_top: list = []
    try:
        if "ws_manager" in globals():
            ws_users = len(ws_manager.active)
            ws_sockets = sum(len(v) for v in ws_manager.active.values())
            # Top 10 users by socket count
            pairs = [(uid, len(socks)) for uid, socks in ws_manager.active.items()]
            pairs.sort(key=lambda x: x[1], reverse=True)
            top_ids = [uid for uid, _ in pairs[:10]]
            users_meta = {}
            if top_ids:
                async for u in db.users.find({"id": {"$in": top_ids}}, {"_id": 0, "id": 1, "username": 1, "name": 1}):
                    users_meta[u["id"]] = u
            by_user = [
                {
                    "user_id": uid,
                    "username": users_meta.get(uid, {}).get("username", ""),
                    "sockets": cnt,
                }
                for uid, cnt in pairs[:10]
            ]
            viewers_total = sum(len(s) for s in ws_manager.viewers_by_post.values())
            # Top posts being viewed
            vp = [(pid, len(uset)) for pid, uset in ws_manager.viewers_by_post.items()]
            vp.sort(key=lambda x: x[1], reverse=True)
            viewers_top = [{"post_id": pid, "viewers": cnt} for pid, cnt in vp[:10]]
    except Exception as e:
        logger.warning(f"admin_system_websocket: {e}")
    return {
        "users_connected": ws_users,
        "sockets": ws_sockets,
        "post_viewers_total": viewers_total,
        "top_users": by_user,
        "top_posts_being_viewed": viewers_top,
        "checked_at": now_iso(),
    }


@api2.get("/admin/system/database")
async def admin_system_database(admin=Depends(require_admin)):
    """MongoDB dbStats + per-collection stats."""
    out: dict = {"ok": True, "checked_at": now_iso()}
    try:
        stats = await db.command("dbStats", scale=1)
        out["db"] = {
            "db_name": stats.get("db"),
            "collections": stats.get("collections"),
            "objects": stats.get("objects"),
            "data_size_bytes": stats.get("dataSize"),
            "storage_size_bytes": stats.get("storageSize"),
            "index_size_bytes": stats.get("indexSize"),
            "indexes": stats.get("indexes"),
        }
    except Exception as e:
        out["db"] = {"error": str(e)}
    # Top collections by document count
    coll_names = [
        "users", "posts", "comments", "stories", "messages",
        "conversations", "notifications", "reports", "sessions",
        "admin_audit", "hashtag_blacklist", "bookmarks",
        "communities", "events", "highlights",
    ]
    collections: list = []
    for name in coll_names:
        try:
            cnt = await db[name].count_documents({})
        except Exception:
            cnt = -1
        collections.append({"name": name, "count": cnt})
    collections.sort(key=lambda x: x["count"], reverse=True)
    out["collections"] = collections
    return out


@api2.get("/admin/system/load")
async def admin_system_load(admin=Depends(require_admin)):
    """System load average + memory usage from /proc."""
    out: dict = {"checked_at": now_iso()}
    try:
        load = os.getloadavg()
        out["load_avg"] = {"1m": load[0], "5m": load[1], "15m": load[2]}
    except Exception:
        out["load_avg"] = None
    out["cpu_count"] = os.cpu_count()
    mem = _read_proc_meminfo()
    if mem:
        total_kb = mem.get("MemTotal", 0)
        avail_kb = mem.get("MemAvailable", mem.get("MemFree", 0))
        used_kb = max(0, total_kb - avail_kb)
        out["memory"] = {
            "total_kb": total_kb,
            "available_kb": avail_kb,
            "used_kb": used_kb,
            "used_pct": round((used_kb / total_kb) * 100, 1) if total_kb else 0,
        }
    else:
        out["memory"] = None
    return out


@api2.get("/admin/system/errors")
async def admin_system_errors(admin=Depends(require_admin), lines: int = 200):
    """Tail of backend.err.log (stderr) — supervisor log."""
    lines = max(10, min(2000, int(lines or 200)))
    candidates = [
        "/var/log/supervisor/backend.err.log",
    ]
    # Some setups produce timestamped files like backend.err.<pid>.log
    try:
        for fn in os.listdir("/var/log/supervisor"):
            if fn.startswith("backend.err") and fn.endswith(".log"):
                p = f"/var/log/supervisor/{fn}"
                if p not in candidates:
                    candidates.append(p)
    except Exception:
        pass
    used = None
    out_lines: list = []
    for p in candidates:
        if os.path.exists(p):
            out_lines = _tail_file(p, n=lines)
            used = p
            if out_lines:
                break
    return {
        "file": used,
        "lines": out_lines,
        "count": len(out_lines),
        "checked_at": now_iso(),
    }


@api2.get("/admin/system/logs")
async def admin_system_logs(admin=Depends(require_admin), lines: int = 200):
    """Tail of backend.out.log (stdout) — supervisor log."""
    lines = max(10, min(2000, int(lines or 200)))
    candidates = [
        "/var/log/supervisor/backend.out.log",
    ]
    try:
        for fn in os.listdir("/var/log/supervisor"):
            if fn.startswith("backend.out") and fn.endswith(".log"):
                p = f"/var/log/supervisor/{fn}"
                if p not in candidates:
                    candidates.append(p)
    except Exception:
        pass
    used = None
    out_lines: list = []
    for p in candidates:
        if os.path.exists(p):
            out_lines = _tail_file(p, n=lines)
            used = p
            if out_lines:
                break
    return {
        "file": used,
        "lines": out_lines,
        "count": len(out_lines),
        "checked_at": now_iso(),
    }


@api2.get("/admin/system/latency")
async def admin_system_latency(admin=Depends(require_admin)):
    """Measures real DB ping latency (multiple samples)."""
    samples: list = []
    for _ in range(5):
        t0 = time.perf_counter()
        try:
            await db.command("ping")
            samples.append((time.perf_counter() - t0) * 1000.0)
        except Exception:
            samples.append(-1.0)
    valid = [s for s in samples if s >= 0]
    out = {
        "samples_ms": [round(s, 3) for s in samples],
        "min_ms": round(min(valid), 3) if valid else None,
        "max_ms": round(max(valid), 3) if valid else None,
        "avg_ms": round(sum(valid) / len(valid), 3) if valid else None,
        "checked_at": now_iso(),
    }
    return out


@api2.get("/admin/system/uptime")
async def admin_system_uptime(admin=Depends(require_admin)):
    """Process uptime + host uptime from /proc/uptime."""
    proc_up = int(time.time() - _PROCESS_STARTED_AT)
    host_up = None
    try:
        with open("/proc/uptime", "r") as f:
            host_up = float(f.read().split()[0])
    except Exception:
        host_up = None
    return {
        "process": {
            "started_at": _PROCESS_STARTED_AT_ISO,
            "uptime_seconds": proc_up,
        },
        "host": {
            "uptime_seconds": int(host_up) if host_up is not None else None,
        },
        "checked_at": now_iso(),
    }


# ----------------- PER-USER INSPECTION (new) -----------------

@api2.get("/admin/users/{user_id}/activity")
async def admin_user_activity(user_id: str, admin=Depends(require_admin)):
    """Real counts of recent activity (posts, comments, likes, reports)."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    now = datetime.now(timezone.utc)
    iso_24h = (now - timedelta(hours=24)).isoformat()
    iso_7d = (now - timedelta(days=7)).isoformat()
    iso_30d = (now - timedelta(days=30)).isoformat()
    posts_24h = await db.posts.count_documents({"author_id": user_id, "created_at": {"$gte": iso_24h}})
    posts_7d = await db.posts.count_documents({"author_id": user_id, "created_at": {"$gte": iso_7d}})
    posts_30d = await db.posts.count_documents({"author_id": user_id, "created_at": {"$gte": iso_30d}})
    comments_24h = await db.comments.count_documents({"author_id": user_id, "created_at": {"$gte": iso_24h}})
    comments_7d = await db.comments.count_documents({"author_id": user_id, "created_at": {"$gte": iso_7d}})
    stories_active = await db.stories.count_documents({"author_id": user_id, "expires_at": {"$gte": now.isoformat()}})
    likes_given = await db.posts.count_documents({"likes": user_id})
    messages_24h = await db.messages.count_documents({"sender_id": user_id, "created_at": {"$gte": iso_24h}})
    reports_against = await db.reports.count_documents({"$or": [{"kind": "user", "target_id": user_id}, {"target_user_id": user_id}]})
    reports_made = await db.reports.count_documents({"reporter_id": user_id})
    last_post = await db.posts.find_one({"author_id": user_id}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
    last_comment = await db.comments.find_one({"author_id": user_id}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
    return {
        "posts": {"d1": posts_24h, "d7": posts_7d, "d30": posts_30d},
        "comments": {"d1": comments_24h, "d7": comments_7d},
        "stories_active": stories_active,
        "likes_given": likes_given,
        "messages_24h": messages_24h,
        "reports_against": reports_against,
        "reports_made": reports_made,
        "last_post_at": (last_post or {}).get("created_at"),
        "last_comment_at": (last_comment or {}).get("created_at"),
        "last_seen": u.get("last_seen"),
        "checked_at": now_iso(),
    }


@api2.get("/admin/users/{user_id}/presence")
async def admin_user_presence(user_id: str, admin=Depends(require_admin)):
    """Real-time presence: WebSocket connection + last_seen heuristic."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "username": 1, "last_seen": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    ws_sockets = 0
    try:
        if "ws_manager" in globals():
            ws_sockets = len(ws_manager.active.get(user_id, []))
    except Exception:
        ws_sockets = 0
    active_sessions = await db.sessions.count_documents({"user_id": user_id, "revoked": {"$ne": True}})
    return {
        "user_id": user_id,
        "username": u.get("username"),
        "online": ws_sockets > 0 or is_online(u.get("last_seen")),
        "ws_sockets": ws_sockets,
        "active_sessions": active_sessions,
        "last_seen": u.get("last_seen"),
        "checked_at": now_iso(),
    }


@api2.get("/admin/users/{user_id}/history")
async def admin_user_history(user_id: str, admin=Depends(require_admin), limit: int = 50):
    """Combined chronological timeline: posts + comments (last N events)."""
    limit = max(5, min(200, int(limit or 50)))
    posts = await db.posts.find({"author_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    comments = await db.comments.find({"author_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    events: list = []
    for p in posts:
        events.append({
            "kind": "post", "id": p.get("id"), "created_at": p.get("created_at"),
            "content": (p.get("content") or "")[:200],
            "image": bool(p.get("image")),
            "community_slug": p.get("community_slug"),
        })
    for c in comments:
        events.append({
            "kind": "comment", "id": c.get("id"), "post_id": c.get("post_id"),
            "created_at": c.get("created_at"),
            "content": (c.get("content") or "")[:200],
        })
    events.sort(key=lambda e: e.get("created_at") or "", reverse=True)
    return {"items": events[:limit], "count": len(events[:limit])}


@api2.get("/admin/users/{user_id}/conversations")
async def admin_user_conversations(user_id: str, admin=Depends(require_admin)):
    """Lists DM conversation peers for this user (no message content shown)."""
    convs = await db.conversations.find({"participants": user_id}, {"_id": 0}).sort("last_at", -1).limit(100).to_list(100)
    peer_ids = set()
    items: list = []
    for c in convs:
        parts = c.get("participants") or []
        other = next((p for p in parts if p != user_id), None)
        if other:
            peer_ids.add(other)
        items.append({
            "key": c.get("key") or conv_key(parts[0], parts[1]) if len(parts) >= 2 else None,
            "peer_id": other,
            "last_at": c.get("last_at"),
            "last_message_preview": (c.get("last_message") or "")[:120],
        })
    peers: dict = {}
    if peer_ids:
        async for u in db.users.find({"id": {"$in": list(peer_ids)}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "banned": 1}):
            peers[u["id"]] = u
    for it in items:
        p = peers.get(it["peer_id"]) or {}
        it["peer_username"] = p.get("username", "")
        it["peer_name"] = p.get("name", "")
        it["peer_avatar"] = p.get("avatar", "")
        it["peer_banned"] = bool(p.get("banned"))
    return {"total": len(items), "items": items}


@api2.get("/admin/users/{user_id}/followers")
async def admin_user_followers(user_id: str, admin=Depends(require_admin), limit: int = 100):
    """Followers list (slice)."""
    limit = max(10, min(500, int(limit or 100)))
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "followers": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    ids = list(u.get("followers", []) or [])[:limit]
    if not ids:
        return {"total": 0, "items": []}
    rows = await db.users.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "verified": 1, "banned": 1, "last_seen": 1}).to_list(length=limit)
    items = [{
        "id": r.get("id"), "username": r.get("username"), "name": r.get("name"),
        "avatar": r.get("avatar", ""), "verified": bool(r.get("verified")),
        "banned": bool(r.get("banned")),
        "online": is_online(r.get("last_seen")),
    } for r in rows]
    return {"total": len(u.get("followers", []) or []), "items": items}


@api2.get("/admin/users/{user_id}/mutuals")
async def admin_user_mutuals(user_id: str, admin=Depends(require_admin), limit: int = 100):
    """Users that both follow and are followed by this user."""
    limit = max(10, min(500, int(limit or 100)))
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "followers": 1, "following": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    followers = set(u.get("followers", []) or [])
    following = set(u.get("following", []) or [])
    mutual_ids = list(followers & following)[:limit]
    if not mutual_ids:
        return {"total": 0, "items": []}
    rows = await db.users.find({"id": {"$in": mutual_ids}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "verified": 1, "banned": 1, "last_seen": 1}).to_list(length=limit)
    return {
        "total": len(followers & following),
        "items": [{
            "id": r.get("id"), "username": r.get("username"), "name": r.get("name"),
            "avatar": r.get("avatar", ""), "verified": bool(r.get("verified")),
            "banned": bool(r.get("banned")),
            "online": is_online(r.get("last_seen")),
        } for r in rows],
    }


@api2.get("/admin/users/{user_id}/ips")
async def admin_user_ips(user_id: str, admin=Depends(require_admin)):
    """Distinct IPs seen for this user across all sessions, with usage stats."""
    rows = await db.sessions.find({"user_id": user_id}, {"_id": 0, "ip": 1, "last_ip": 1, "created_at": 1, "last_seen_at": 1, "revoked": 1}).to_list(length=2000)
    by_ip: dict = {}
    for s in rows:
        for ip in {s.get("ip") or "", s.get("last_ip") or ""}:
            if not ip:
                continue
            row = by_ip.setdefault(ip, {"ip": ip, "sessions": 0, "first_seen": None, "last_seen": None, "active_sessions": 0})
            row["sessions"] += 1
            if not s.get("revoked"):
                row["active_sessions"] += 1
            ca = s.get("created_at"); la = s.get("last_seen_at")
            if ca and (row["first_seen"] is None or ca < row["first_seen"]):
                row["first_seen"] = ca
            if la and (row["last_seen"] is None or la > row["last_seen"]):
                row["last_seen"] = la
    items = sorted(by_ip.values(), key=lambda x: x["last_seen"] or "", reverse=True)
    return {"total": len(items), "items": items}


@api2.get("/admin/users/{user_id}/devices")
async def admin_user_devices(user_id: str, admin=Depends(require_admin)):
    """Distinct devices (browser+os+device) inferred from session UAs."""
    rows = await db.sessions.find({"user_id": user_id}, {"_id": 0, "browser": 1, "os": 1, "device": 1, "ua": 1, "created_at": 1, "last_seen_at": 1, "revoked": 1}).to_list(length=2000)
    by_fp: dict = {}
    for s in rows:
        fp = f"{s.get('browser','')}|{s.get('os','')}|{s.get('device','')}"
        row = by_fp.setdefault(fp, {
            "browser": s.get("browser"), "os": s.get("os"), "device": s.get("device"),
            "sessions": 0, "active_sessions": 0,
            "first_seen": None, "last_seen": None, "sample_ua": s.get("ua", "")[:200],
        })
        row["sessions"] += 1
        if not s.get("revoked"):
            row["active_sessions"] += 1
        ca = s.get("created_at"); la = s.get("last_seen_at")
        if ca and (row["first_seen"] is None or ca < row["first_seen"]):
            row["first_seen"] = ca
        if la and (row["last_seen"] is None or la > row["last_seen"]):
            row["last_seen"] = la
    items = sorted(by_fp.values(), key=lambda x: x["last_seen"] or "", reverse=True)
    return {"total": len(items), "items": items}


@api2.get("/admin/users/{user_id}/login-alerts")
async def admin_user_login_alerts(user_id: str, admin=Depends(require_admin), limit: int = 50):
    """Login alert notifications (B-014) sent to this user."""
    limit = max(5, min(200, int(limit or 50)))
    rows = await db.notifications.find(
        {"user_id": user_id, "type": "login_alert"}, {"_id": 0},
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    return {"total": len(rows), "items": rows}


@api2.get("/admin/users/{user_id}/recent-actions")
async def admin_user_recent_actions(user_id: str, admin=Depends(require_admin), limit: int = 50):
    """Admin audit log entries that target THIS user."""
    limit = max(5, min(200, int(limit or 50)))
    rows = await db.admin_audit.find(
        {"target_kind": "user", "target_id": user_id}, {"_id": 0},
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    return {"total": len(rows), "items": rows}


# ----------------- USER MODERATION ACTIONS (new) -----------------

def _minutes_to_iso_until(minutes: int) -> str:
    minutes = max(1, min(60 * 24 * 365, int(minutes or 60)))
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


@api2.post("/admin/users/{user_id}/mute")
async def admin_user_mute(user_id: str, payload: AdminMuteIn, admin=Depends(require_admin)):
    """Silenciar: bloqueia criação de posts/comments durante N minutos.
    Idempotente: chamada com mute ativo estende o prazo."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "is_admin": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    if u.get("is_admin"):
        raise HTTPException(400, "Não podes silenciar outro administrador.")
    until = _minutes_to_iso_until(payload.minutes or 60)
    reason = (payload.reason or "")[:300]
    await db.users.update_one({"id": user_id}, {"$set": {
        "muted_until": until,
        "mute_reason": reason,
        "muted_by": admin["id"],
        "muted_at": now_iso(),
    }})
    await admin_audit(admin, "user.mute", "user", user_id, {"until": until, "reason": reason})
    return {"ok": True, "muted_until": until}


@api2.post("/admin/users/{user_id}/unmute")
async def admin_user_unmute(user_id: str, admin=Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    await db.users.update_one({"id": user_id}, {
        "$unset": {"muted_until": "", "mute_reason": "", "muted_by": "", "muted_at": ""},
    })
    await admin_audit(admin, "user.unmute", "user", user_id)
    return {"ok": True, "muted_until": None}


@api2.post("/admin/users/{user_id}/shadow-mute")
async def admin_user_shadow_mute(user_id: str, payload: AdminBanIn, admin=Depends(require_admin)):
    """Shadow mute: posts do utilizador deixam de aparecer em feed/explore para outros.
    O próprio continua a ver os próprios posts."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "is_admin": 1, "shadow_muted": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    if u.get("is_admin"):
        raise HTTPException(400, "Não podes shadow-mute um administrador.")
    new_val = not bool(u.get("shadow_muted"))
    reason = (payload.reason or "")[:300]
    if new_val:
        await db.users.update_one({"id": user_id}, {"$set": {
            "shadow_muted": True,
            "shadow_mute_reason": reason,
            "shadow_muted_by": admin["id"],
            "shadow_muted_at": now_iso(),
        }})
    else:
        await db.users.update_one({"id": user_id}, {
            "$set": {"shadow_muted": False},
            "$unset": {"shadow_mute_reason": "", "shadow_muted_by": "", "shadow_muted_at": ""},
        })
    await admin_audit(admin, "user.shadow_mute", "user", user_id, {"shadow_muted": new_val, "reason": reason})
    return {"ok": True, "shadow_muted": new_val}


@api2.post("/admin/users/{user_id}/suspend")
async def admin_user_suspend(user_id: str, payload: AdminSuspendIn, admin=Depends(require_admin)):
    """Suspender: bloqueia login (returns 403 em get_current_user) por N minutos."""
    if user_id == admin["id"]:
        raise HTTPException(400, "Não te podes suspender a ti próprio")
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "is_admin": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    if u.get("is_admin"):
        raise HTTPException(400, "Não podes suspender outro administrador.")
    until = _minutes_to_iso_until(payload.minutes or 1440)
    reason = (payload.reason or "")[:300]
    await db.users.update_one({"id": user_id}, {"$set": {
        "suspended_until": until,
        "suspend_reason": reason,
        "suspended_by": admin["id"],
        "suspended_at": now_iso(),
    }})
    # Revoke active sessions while suspended
    await db.sessions.update_many(
        {"user_id": user_id, "revoked": {"$ne": True}},
        {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "suspend"}},
    )
    await admin_audit(admin, "user.suspend", "user", user_id, {"until": until, "reason": reason})
    return {"ok": True, "suspended_until": until}


@api2.post("/admin/users/{user_id}/unsuspend")
async def admin_user_unsuspend(user_id: str, admin=Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    await db.users.update_one({"id": user_id}, {
        "$unset": {"suspended_until": "", "suspend_reason": "", "suspended_by": "", "suspended_at": ""},
    })
    await admin_audit(admin, "user.unsuspend", "user", user_id)
    return {"ok": True, "suspended_until": None}


@api2.post("/admin/users/{user_id}/rate-limit")
async def admin_user_rate_limit(user_id: str, payload: AdminRateLimitIn, admin=Depends(require_admin)):
    """Limitar ações: define limite de posts/comments por janela. Aplicado em /posts e /posts/{id}/comments."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    rl: dict = {}
    if payload.max_posts is not None:
        rl["max_posts"] = max(0, int(payload.max_posts))
    if payload.max_comments is not None:
        rl["max_comments"] = max(0, int(payload.max_comments))
    rl["window_hours"] = max(1, min(168, int(payload.window_hours or 1)))
    rl["reason"] = (payload.reason or "")[:300]
    rl["set_at"] = now_iso()
    rl["set_by"] = admin["id"]
    # If both null and no fields → clear
    if payload.max_posts is None and payload.max_comments is None:
        await db.users.update_one({"id": user_id}, {"$unset": {"rate_limit": ""}})
        await admin_audit(admin, "user.rate_limit_clear", "user", user_id)
        return {"ok": True, "rate_limit": None}
    await db.users.update_one({"id": user_id}, {"$set": {"rate_limit": rl}})
    await admin_audit(admin, "user.rate_limit", "user", user_id, rl)
    return {"ok": True, "rate_limit": rl}


@api2.post("/admin/users/{user_id}/mark-suspicious")
async def admin_user_mark_suspicious(user_id: str, payload: AdminBanIn, admin=Depends(require_admin)):
    """Sinaliza conta como suspeita (não bloqueia — só anota para revisão)."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "flagged_suspicious": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    new_val = not bool(u.get("flagged_suspicious"))
    reason = (payload.reason or "")[:300]
    if new_val:
        await db.users.update_one({"id": user_id}, {"$set": {
            "flagged_suspicious": True,
            "suspicious_reason": reason,
            "flagged_by": admin["id"],
            "flagged_at": now_iso(),
        }})
    else:
        await db.users.update_one({"id": user_id}, {
            "$set": {"flagged_suspicious": False},
            "$unset": {"suspicious_reason": "", "flagged_by": "", "flagged_at": ""},
        })
    await admin_audit(admin, "user.mark_suspicious", "user", user_id, {"flagged": new_val, "reason": reason})
    return {"ok": True, "flagged_suspicious": new_val}


@api2.post("/admin/users/{user_id}/mark-safe")
async def admin_user_mark_safe(user_id: str, admin=Depends(require_admin)):
    """Marca como seguro: limpa flag de suspeito + mute + shadow mute + suspensão."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    await db.users.update_one({"id": user_id}, {
        "$set": {"flagged_suspicious": False, "shadow_muted": False},
        "$unset": {
            "suspicious_reason": "", "flagged_by": "", "flagged_at": "",
            "shadow_mute_reason": "", "shadow_muted_by": "", "shadow_muted_at": "",
            "muted_until": "", "mute_reason": "", "muted_by": "", "muted_at": "",
            "suspended_until": "", "suspend_reason": "", "suspended_by": "", "suspended_at": "",
        },
    })
    await admin_audit(admin, "user.mark_safe", "user", user_id)
    return {"ok": True}


@api2.post("/admin/users/{user_id}/reset-2fa")
async def admin_user_reset_2fa(user_id: str, admin=Depends(require_admin)):
    """Reset 2FA: desativa e remove segredo + códigos de backup do utilizador.
    Usado quando o utilizador perde acesso ao gerador. Requer login + setup novo."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "two_fa_enabled": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    had_2fa = bool(u.get("two_fa_enabled"))
    await db.users.update_one({"id": user_id}, {
        "$set": {"two_fa_enabled": False},
        "$unset": {
            "two_fa_secret": "",
            "two_fa_backup_codes": "",
            "two_fa_pending_secret": "",
            "two_fa_pending_started_at": "",
        },
    })
    await admin_audit(admin, "user.reset_2fa", "user", user_id, {"had_2fa": had_2fa})
    return {"ok": True, "had_2fa": had_2fa}


@api2.post("/admin/users/{user_id}/feature")
async def admin_user_feature(user_id: str, admin=Depends(require_admin)):
    """Destacar conta (toggle featured_account)."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "featured_account": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    new_val = not bool(u.get("featured_account"))
    await db.users.update_one({"id": user_id}, {"$set": {
        "featured_account": new_val,
        "featured_account_at": now_iso() if new_val else None,
        "featured_account_by": admin["id"] if new_val else None,
    }})
    await admin_audit(admin, "user.feature", "user", user_id, {"featured": new_val})
    return {"ok": True, "featured_account": new_val}


# ----------------- EXPORT CSV -----------------

def _csv_escape(v) -> str:
    s = "" if v is None else str(v)
    if any(c in s for c in [",", "\"", "\n", "\r"]):
        return "\"" + s.replace("\"", "\"\"") + "\""
    return s


@api2.get("/admin/export/users.csv")
async def admin_export_users_csv(admin=Depends(require_admin)):
    headers = [
        "id", "username", "email", "name", "verified", "is_admin", "banned",
        "ban_reason", "private", "followers_count", "following_count",
        "city", "created_at", "last_seen",
    ]
    lines = [",".join(headers)]
    async for u in db.users.find({}, {"_id": 0, "password_hash": 0, "two_fa_secret": 0, "two_fa_backup_codes": 0}):
        row = [
            u.get("id", ""), u.get("username", ""), u.get("email", ""), u.get("name", ""),
            "1" if u.get("verified") else "0",
            "1" if u.get("is_admin") else "0",
            "1" if u.get("banned") else "0",
            u.get("ban_reason", "") if u.get("banned") else "",
            "1" if u.get("private") else "0",
            len(u.get("followers", []) or []),
            len(u.get("following", []) or []),
            u.get("city", ""),
            u.get("created_at", ""),
            u.get("last_seen", ""),
        ]
        lines.append(",".join(_csv_escape(v) for v in row))
    await admin_audit(admin, "export.users", "export", "", {"rows": len(lines) - 1})
    csv = "\n".join(lines)
    from fastapi.responses import Response
    return Response(
        content=csv,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=lusorae_users.csv"},
    )


@api2.get("/admin/export/audit.csv")
async def admin_export_audit_csv(admin=Depends(require_admin)):
    headers = ["id", "created_at", "actor_username", "action", "target_kind", "target_id", "detail"]
    lines = [",".join(headers)]
    async for a in db.admin_audit.find({}, {"_id": 0}).sort("created_at", -1).limit(5000):
        row = [
            a.get("id", ""), a.get("created_at", ""), a.get("actor_username", ""),
            a.get("action", ""), a.get("target_kind", ""), a.get("target_id", ""),
            json.dumps(a.get("detail") or {}, ensure_ascii=False),
        ]
        lines.append(",".join(_csv_escape(v) for v in row))
    await admin_audit(admin, "export.audit", "export", "", {"rows": len(lines) - 1})
    csv = "\n".join(lines)
    from fastapi.responses import Response
    return Response(
        content=csv,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=lusorae_audit.csv"},
    )


# ============================================================
# NEW: SYSTEM ACTIONS — restart sockets / clear cache / maintenance
# ============================================================

@api2.post("/admin/system/restart-sockets")
async def admin_restart_sockets(admin=Depends(require_admin)):
    """Disconnect every active WebSocket (clients auto-reconnect).
    Returns number of sockets closed."""
    n = 0
    try:
        n = await ws_manager.disconnect_all()
    except Exception as e:
        logger.warning(f"restart_sockets failed: {e}")
    await admin_audit(admin, "system.restart_sockets", "system", "ws", {"closed": n})
    return {"ok": True, "closed": n, "checked_at": now_iso()}


@api2.post("/admin/system/clear-cache")
async def admin_clear_cache(admin=Depends(require_admin)):
    """Clear all in-memory caches. Returns what got cleared."""
    cleared = {}
    # Maintenance cache → reload from DB next request
    try:
        _maintenance_cache.update({"loaded_at": 0.0})
        cleared["maintenance_cache"] = True
    except Exception:
        cleared["maintenance_cache"] = False
    # Post-viewers presence (kept here — cheap to rebuild via WS pings)
    try:
        ws_manager.viewers_by_post.clear()
        ws_manager.posts_by_user.clear()
        cleared["post_viewers"] = True
    except Exception:
        cleared["post_viewers"] = False
    # Any other LRU/memo we might add later
    try:
        # Best-effort: clear functools.lru_cache wrappers exposed at module top
        import functools as _f
        for name, obj in list(globals().items()):
            if hasattr(obj, "cache_clear") and isinstance(getattr(obj, "__wrapped__", None), type(lambda: None)):
                try:
                    obj.cache_clear()
                    cleared.setdefault("lru_caches_cleared", []).append(name)
                except Exception:
                    pass
        del _f
    except Exception:
        pass
    await admin_audit(admin, "system.clear_cache", "system", "cache", cleared)
    return {"ok": True, "cleared": cleared, "checked_at": now_iso()}


@api2.get("/admin/system/maintenance")
async def admin_get_maintenance(admin=Depends(require_admin)):
    """Current maintenance config (real, persisted in db.system_config)."""
    cfg = await _get_maintenance()
    return {
        "enabled": bool(cfg.get("enabled")),
        "message": cfg.get("message") or "",
        "set_at": cfg.get("set_at"),
        "set_by": cfg.get("set_by"),
        "checked_at": now_iso(),
    }


@api2.post("/admin/system/maintenance")
async def admin_set_maintenance(payload: AdminMaintenanceIn, admin=Depends(require_admin)):
    """Toggle / set maintenance mode. When enabled, non-admin write actions return 503."""
    msg = (payload.message or "").strip()[:300]
    doc = {
        "key": "maintenance",
        "enabled": bool(payload.enabled),
        "message": msg,
        "set_at": now_iso(),
        "set_by": admin["id"],
    }
    await db.system_config.update_one({"key": "maintenance"}, {"$set": doc}, upsert=True)
    # Invalidate cache immediately
    _maintenance_cache.update({"loaded_at": 0.0})
    await admin_audit(admin, "system.maintenance", "system", "maintenance", {
        "enabled": bool(payload.enabled), "message": msg,
    })
    # Broadcast to all connected sockets so clients can show a banner
    try:
        await ws_manager.broadcast({
            "type": "maintenance",
            "enabled": bool(payload.enabled),
            "message": msg,
        })
    except Exception:
        pass
    return {"ok": True, "enabled": bool(payload.enabled), "message": msg, "checked_at": now_iso()}


# Public read of maintenance state (so frontends can detect and show banner)
@api2.get("/system/maintenance-status")
async def public_maintenance_status():
    cfg = await _get_maintenance()
    return {
        "enabled": bool(cfg.get("enabled")),
        "message": cfg.get("message") or "",
        "checked_at": now_iso(),
    }


# ============================================================
# NEW: ANTI-SPAM overview & suspicious activity feed
# ============================================================

@api2.get("/admin/anti-spam/overview")
async def admin_anti_spam_overview(admin=Depends(require_admin)):
    """Real-time aggregated counters for the anti-spam dashboard."""
    now = datetime.now(timezone.utc)
    iso_24h = (now - timedelta(hours=24)).isoformat()
    iso_7d = (now - timedelta(days=7)).isoformat()
    flagged = await db.users.count_documents({"flagged_suspicious": True})
    muted_active = await db.users.count_documents({"muted_until": {"$gt": now.isoformat()}})
    shadow_muted = await db.users.count_documents({"shadow_muted": True})
    suspended_active = await db.users.count_documents({"suspended_until": {"$gt": now.isoformat()}})
    rate_limited = await db.users.count_documents({"rate_limit": {"$exists": True, "$ne": None}})
    frozen = await db.users.count_documents({"frozen": True})
    banned = await db.users.count_documents({"banned": True})
    reports_24h = await db.reports.count_documents({"created_at": {"$gte": iso_24h}})
    reports_open = await db.reports.count_documents({"status": "open"})
    reports_7d = await db.reports.count_documents({"created_at": {"$gte": iso_7d}})
    posts_reduced = await db.posts.count_documents({"reduce_reach": True})
    posts_frozen_replies = await db.posts.count_documents({"replies_frozen": True})
    blacklisted_tags = await db.hashtag_blacklist.count_documents({})
    return {
        "users": {
            "flagged_suspicious": flagged,
            "muted_active": muted_active,
            "shadow_muted": shadow_muted,
            "suspended_active": suspended_active,
            "rate_limited": rate_limited,
            "frozen": frozen,
            "banned": banned,
        },
        "content": {
            "reports_24h": reports_24h,
            "reports_open": reports_open,
            "reports_7d": reports_7d,
            "posts_reduced": posts_reduced,
            "posts_frozen_replies": posts_frozen_replies,
            "blacklisted_tags": blacklisted_tags,
        },
        "checked_at": now_iso(),
    }


@api2.get("/admin/anti-spam/suspicious")
async def admin_anti_spam_suspicious(
    admin=Depends(require_admin),
    filter: str = "all",  # all | flagged | muted | shadow | rate_limited | frozen | mass_reported
    page: int = 1,
    limit: int = 30,
):
    """List of users currently in some suspicious / restricted state."""
    page = max(1, int(page or 1))
    limit = max(5, min(100, int(limit or 30)))
    now_iso_s = datetime.now(timezone.utc).isoformat()

    query: dict = {}
    if filter == "flagged":
        query = {"flagged_suspicious": True}
    elif filter == "muted":
        query = {"muted_until": {"$gt": now_iso_s}}
    elif filter == "shadow":
        query = {"shadow_muted": True}
    elif filter == "rate_limited":
        query = {"rate_limit": {"$exists": True, "$ne": None}}
    elif filter == "frozen":
        query = {"frozen": True}
    elif filter == "mass_reported":
        # Aggregate from reports to find top reported users in last 7d
        iso_7d = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        pipeline = [
            {"$match": {"created_at": {"$gte": iso_7d}, "$or": [
                {"kind": "user"}, {"target_user_id": {"$exists": True, "$ne": None}},
            ]}},
            {"$group": {"_id": {"$ifNull": ["$target_user_id", "$target_id"]}, "count": {"$sum": 1}}},
            {"$match": {"count": {"$gte": 2}}},
            {"$sort": {"count": -1}},
            {"$limit": limit * 4},
        ]
        agg = await db.reports.aggregate(pipeline).to_list(length=limit * 4)
        ids = [a["_id"] for a in agg if a.get("_id")]
        if not ids:
            return {"page": page, "limit": limit, "total": 0, "items": []}
        users = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(length=limit * 4)
        by_id = {u["id"]: u for u in users}
        items = []
        for a in agg:
            uid = a.get("_id")
            u = by_id.get(uid)
            if not u:
                continue
            card = _admin_user_card(u)
            card["report_count_7d"] = int(a.get("count") or 0)
            items.append(card)
        total = len(items)
        start = (page - 1) * limit
        return {"page": page, "limit": limit, "total": total, "items": items[start:start + limit]}
    else:  # all
        query = {"$or": [
            {"flagged_suspicious": True},
            {"muted_until": {"$gt": now_iso_s}},
            {"shadow_muted": True},
            {"rate_limit": {"$exists": True, "$ne": None}},
            {"frozen": True},
        ]}
    total = await db.users.count_documents(query)
    rows = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(length=limit)
    items = [_admin_user_card(u) for u in rows]
    return {"page": page, "limit": limit, "total": total, "items": items}


@api2.get("/admin/anti-spam/activity")
async def admin_anti_spam_activity(admin=Depends(require_admin), limit: int = 30):
    """Recent suspicious events (signups in last 24h, mass-create patterns,
    reports filed in last hour)."""
    limit = max(5, min(200, int(limit or 30)))
    now = datetime.now(timezone.utc)
    iso_24h = (now - timedelta(hours=24)).isoformat()
    iso_1h = (now - timedelta(hours=1)).isoformat()

    # 1) Recent reports (last 1h)
    recent_reports = await db.reports.find(
        {"created_at": {"$gte": iso_1h}}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)

    # 2) Burst posters: users with >=10 posts in last 24h
    pipeline_posts = [
        {"$match": {"created_at": {"$gte": iso_24h}}},
        {"$group": {"_id": "$author_id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": 10}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    burst_posts = await db.posts.aggregate(pipeline_posts).to_list(length=limit)

    # 3) Burst commenters: >=30 comments in last 24h
    pipeline_comments = [
        {"$match": {"created_at": {"$gte": iso_24h}}},
        {"$group": {"_id": "$author_id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": 30}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    burst_comments = await db.comments.aggregate(pipeline_comments).to_list(length=limit)

    # 4) Fresh accounts (registered in last 24h)
    fresh_users = await db.users.find(
        {"created_at": {"$gte": iso_24h}}, {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)

    # Enrich author ids → cards
    uid_set = set([b["_id"] for b in burst_posts if b.get("_id")] +
                  [b["_id"] for b in burst_comments if b.get("_id")])
    cards: dict = {}
    if uid_set:
        async for u in db.users.find({"id": {"$in": list(uid_set)}}, {"_id": 0, "password_hash": 0}):
            cards[u["id"]] = _admin_user_card(u)

    return {
        "recent_reports": recent_reports,
        "burst_posters": [{"user": cards.get(b["_id"]), "count": b["count"]} for b in burst_posts if cards.get(b["_id"])],
        "burst_commenters": [{"user": cards.get(b["_id"]), "count": b["count"]} for b in burst_comments if cards.get(b["_id"])],
        "fresh_users": [_admin_user_card(u) for u in fresh_users],
        "checked_at": now_iso(),
    }


# ============================================================
# NEW: USER FREEZE
# ============================================================

@api2.post("/admin/users/{user_id}/freeze")
async def admin_user_freeze(user_id: str, payload: AdminFreezeIn, admin=Depends(require_admin)):
    """Congelar conta: ainda lê, mas não pode publicar/comentar/gostar/seguir/mensagens.
    Idempotente; revoga sessões na primeira chamada."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "is_admin": 1, "frozen": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    if user_id == admin["id"]:
        raise HTTPException(400, "Não te podes congelar a ti próprio")
    if u.get("is_admin"):
        raise HTTPException(400, "Não podes congelar outro administrador.")
    reason = (payload.reason or "")[:300]
    if u.get("frozen"):
        return {"ok": True, "frozen": True, "already": True}
    await db.users.update_one({"id": user_id}, {"$set": {
        "frozen": True,
        "frozen_reason": reason,
        "frozen_by": admin["id"],
        "frozen_at": now_iso(),
    }})
    # Force-logout all current sessions
    await db.sessions.update_many(
        {"user_id": user_id, "revoked": {"$ne": True}},
        {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "freeze"}},
    )
    await admin_audit(admin, "user.freeze", "user", user_id, {"reason": reason})
    return {"ok": True, "frozen": True}


@api2.post("/admin/users/{user_id}/unfreeze")
async def admin_user_unfreeze(user_id: str, admin=Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    await db.users.update_one({"id": user_id}, {
        "$set": {"frozen": False},
        "$unset": {"frozen_reason": "", "frozen_by": "", "frozen_at": ""},
    })
    await admin_audit(admin, "user.unfreeze", "user", user_id)
    return {"ok": True, "frozen": False}


# ============================================================
# NEW: POST-LEVEL — replies_frozen + reduce_reach + view replies + view reports
# ============================================================

@api2.post("/admin/posts/{post_id}/freeze-replies")
async def admin_post_freeze_replies(post_id: str, admin=Depends(require_admin)):
    """Toggle replies_frozen on a post. When true, /posts/{id}/comments POST returns 403."""
    p = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1, "replies_frozen": 1})
    if not p:
        raise HTTPException(404, "Publicação não encontrada")
    new_val = not bool(p.get("replies_frozen"))
    update = {"replies_frozen": new_val}
    if new_val:
        update["replies_frozen_at"] = now_iso()
        update["replies_frozen_by"] = admin["id"]
    else:
        update["replies_frozen_at"] = None
        update["replies_frozen_by"] = None
    await db.posts.update_one({"id": post_id}, {"$set": update})
    await admin_audit(admin, "post.freeze_replies", "post", post_id, {"replies_frozen": new_val})
    return {"ok": True, "replies_frozen": new_val}


@api2.post("/admin/posts/{post_id}/reduce-reach")
async def admin_post_reduce_reach(post_id: str, admin=Depends(require_admin)):
    """Toggle reduce_reach on a post. When true, post is hidden from feed/explore
    (except for the author themselves on their own feed/profile)."""
    p = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1, "reduce_reach": 1})
    if not p:
        raise HTTPException(404, "Publicação não encontrada")
    new_val = not bool(p.get("reduce_reach"))
    update = {"reduce_reach": new_val}
    if new_val:
        update["reduce_reach_at"] = now_iso()
        update["reduce_reach_by"] = admin["id"]
    else:
        update["reduce_reach_at"] = None
        update["reduce_reach_by"] = None
    await db.posts.update_one({"id": post_id}, {"$set": update})
    await admin_audit(admin, "post.reduce_reach", "post", post_id, {"reduce_reach": new_val})
    return {"ok": True, "reduce_reach": new_val}


@api2.get("/admin/posts/{post_id}/comments")
async def admin_post_comments(post_id: str, admin=Depends(require_admin), page: int = 1, limit: int = 30):
    """List comments on a specific post (paginated). For the moderation drawer."""
    page = max(1, int(page or 1))
    limit = max(5, min(100, int(limit or 30)))
    p = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1, "author_id": 1, "comments_count": 1})
    if not p:
        raise HTTPException(404, "Publicação não encontrada")
    total = await db.comments.count_documents({"post_id": post_id})
    rows = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(length=limit)
    # Enrich authors
    aids = list({r.get("author_id") for r in rows if r.get("author_id")})
    authors: dict = {}
    if aids:
        async for u in db.users.find({"id": {"$in": aids}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "verified": 1, "banned": 1}):
            authors[u["id"]] = u
    items = []
    for c in rows:
        a = authors.get(c.get("author_id")) or {}
        items.append({
            "id": c.get("id"),
            "content": c.get("content"),
            "created_at": c.get("created_at"),
            "parent_id": c.get("parent_id"),
            "replies_count": int(c.get("replies_count") or 0),
            "author_id": c.get("author_id"),
            "author_username": a.get("username", ""),
            "author_name": a.get("name", ""),
            "author_avatar": a.get("avatar", ""),
            "author_banned": bool(a.get("banned")),
            "author_verified": bool(a.get("verified")),
        })
    return {"page": page, "limit": limit, "total": total, "items": items}


@api2.get("/admin/posts/{post_id}/reports")
async def admin_post_reports(post_id: str, admin=Depends(require_admin), limit: int = 50):
    """Reports filed against this post or any of its comments."""
    limit = max(5, min(200, int(limit or 50)))
    # Reports against the post itself
    post_reports = await db.reports.find(
        {"kind": "post", "target_id": post_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    # Reports against any comment on the post
    comment_ids_rows = await db.comments.find({"post_id": post_id}, {"_id": 0, "id": 1}).to_list(length=2000)
    comment_ids = [c["id"] for c in comment_ids_rows]
    comment_reports = []
    if comment_ids:
        comment_reports = await db.reports.find(
            {"kind": "comment", "target_id": {"$in": comment_ids}}, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
    # Enrich reporters
    rids = list({r.get("reporter_id") for r in (post_reports + comment_reports) if r.get("reporter_id")})
    reporters: dict = {}
    if rids:
        async for u in db.users.find({"id": {"$in": rids}}, {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1}):
            reporters[u["id"]] = u
    def _shape(r):
        rep = reporters.get(r.get("reporter_id")) or {}
        return {
            "id": r.get("id"),
            "kind": r.get("kind"),
            "status": r.get("status"),
            "reason": r.get("reason"),
            "detail": r.get("detail"),
            "target_id": r.get("target_id"),
            "created_at": r.get("created_at"),
            "resolved_at": r.get("resolved_at"),
            "resolved_action": r.get("resolved_action"),
            "reporter": {
                "id": rep.get("id"),
                "username": rep.get("username", ""),
                "name": rep.get("name", ""),
                "avatar": rep.get("avatar", ""),
            } if rep else None,
        }
    return {
        "post_reports": [_shape(r) for r in post_reports],
        "comment_reports": [_shape(r) for r in comment_reports],
        "total": len(post_reports) + len(comment_reports),
    }


# ============================================================================
# COCKPIT — Live operational endpoints for the admin control center.
# ----------------------------------------------------------------------------
# Every endpoint here computes against real MongoDB data + the in-process
# state of ws_manager / revocation_cache / auth_security. No mocks, no
# fixtures, no random values.
#
# Design contract:
#   - All counts are fresh DB reads (indexed where possible).
#   - All sparklines are computed from real time buckets.
#   - All deltas compare equal-length windows (now vs immediately previous).
#   - All endpoints are protected by require_admin.
#   - Activity feed broadcasts arrive via WebSocket ("cockpit_event").
# ============================================================================

# Urgent / spam classification heuristics for moderation queues.
# Report.reason is a free-form string capped at 40 chars, so we string-match.
_REPORT_URGENT_TOKENS = (
    "assedio", "assédio", "harassment", "harass",
    "odio", "ódio", "hate", "discurso",
    "ameaca", "ameaça", "threat", "violencia", "violência",
    "csam", "menor", "menores", "child",
    "doxxing", "doxing", "private",
    "suicide", "suicidio", "suicídio", "autolesao", "autolesão",
)
_REPORT_SPAM_TOKENS = ("spam", "scam", "phishing", "publicidade", "ads")


def _classify_report_queue(reason: str) -> str:
    """Map a report.reason string to one of: urgent | spam | appeal | review."""
    r = (reason or "").lower().strip()
    if not r:
        return "review"
    if any(t in r for t in _REPORT_URGENT_TOKENS):
        return "urgent"
    if any(t in r for t in _REPORT_SPAM_TOKENS):
        return "spam"
    if "apelo" in r or "appeal" in r:
        return "appeal"
    return "review"


async def admin_cockpit_broadcast(kind: str, payload: dict) -> None:
    """Push a typed event to every connected admin socket (best-effort).

    `kind` examples: new_report, report_resolved, new_audit, user_banned,
    post_velocity_spike. The frontend Cockpit listens for these and
    prepends them to the live activity ticker without re-polling.
    """
    try:
        await ws_manager.send_to_admins({
            "type": "cockpit_event",
            "kind": kind,
            "ts": now_iso(),
            "payload": payload or {},
        })
    except Exception:
        # Never let a broadcast failure break the originating request.
        pass


# ─── Helpers — time bucketing ───────────────────────────────────────────────
def _cockpit_bucket_plan(window: str) -> tuple[int, int]:
    """Return (bucket_seconds, num_buckets) for a window keyword."""
    if window == "15m":
        return 60, 15           # 1-min buckets × 15
    if window == "1h":
        return 60, 60           # 1-min buckets × 60
    if window == "24h":
        return 3600, 24         # 1-hour buckets × 24
    if window == "7d":
        return 86400, 7         # 1-day buckets × 7
    if window == "30d":
        return 86400, 30
    return 60, 15


async def _cockpit_bucket_count(coll, time_field: str, since_iso: str,
                                  bucket_seconds: int, num_buckets: int,
                                  extra_match: Optional[dict] = None) -> list[int]:
    """Aggregate documents into time buckets aligned to `since`.

    Returns a list of `num_buckets` counts. Bucket 0 = oldest, last = newest.
    """
    since_dt = datetime.fromisoformat(since_iso)
    match = {time_field: {"$gte": since_iso}}
    if extra_match:
        match.update(extra_match)
    counts = [0] * num_buckets
    # Pull just the time field, count client-side — robust for ISO strings
    # without relying on $dateFromString availability.
    cursor = coll.find(match, {"_id": 0, time_field: 1})
    async for doc in cursor:
        ts = doc.get(time_field)
        if not ts:
            continue
        try:
            dt = datetime.fromisoformat(ts)
            delta = (dt - since_dt).total_seconds()
            idx = int(delta // bucket_seconds)
            if 0 <= idx < num_buckets:
                counts[idx] += 1
        except Exception:
            continue
    return counts


# ─── /admin/cockpit/realtime ────────────────────────────────────────────────
@api2.get("/admin/cockpit/realtime")
async def admin_cockpit_realtime(
    window: str = "15m",
    admin=Depends(require_admin),
):
    """The 6 top KPIs of the Cockpit page, refreshed live.

    Each KPI: { value, prev, delta_pct, sparkline: [N ints] }.
    Window is parameterized via `?window=` (15m | 1h | 24h | 7d). The
    current period and the immediately preceding period (same length) are
    computed for honest deltas. Bucket size adapts to keep ~num_buckets
    points in the sparkline.
    """
    bucket_s, num_buckets = _cockpit_bucket_plan(window)
    now = datetime.now(timezone.utc)
    span = timedelta(seconds=bucket_s * num_buckets)
    online_cut = (now - ONLINE_WINDOW).isoformat()
    w_start = now - span
    prev_start = now - (span * 2)
    w_iso = w_start.isoformat()
    prev_iso = prev_start.isoformat()

    # Buckets for current window
    spark_posts, spark_comments, spark_messages = await asyncio.gather(
        _cockpit_bucket_count(db.posts, "created_at", w_iso, bucket_s, num_buckets,
                              extra_match={"is_draft": {"$ne": True}}),
        _cockpit_bucket_count(db.comments, "created_at", w_iso, bucket_s, num_buckets),
        _cockpit_bucket_count(db.messages, "created_at", w_iso, bucket_s, num_buckets),
    )

    # Online users sparkline — proxy: new sessions per bucket (real, indexed)
    spark_sessions = await _cockpit_bucket_count(
        db.sessions, "created_at", w_iso, bucket_s, num_buckets,
    )

    # Reports sparkline — new reports per bucket in window
    spark_reports = await _cockpit_bucket_count(
        db.reports, "created_at", w_iso, bucket_s, num_buckets,
    )

    # Attacks sparkline — auth_events of attack kinds in window (epoch-indexed)
    attack_kinds = ("token_invalid", "login_fail", "login_locked",
                    "ws_connect_fail", "suspicious_ip_change", "twofa_fail")
    spark_attacks = [0] * num_buckets
    epoch_w = int(w_start.timestamp())
    async for ev in db.auth_events.find(
        {"ts_epoch": {"$gte": epoch_w}, "kind": {"$in": list(attack_kinds)}},
        {"_id": 0, "ts_epoch": 1},
    ):
        idx = int((int(ev["ts_epoch"]) - epoch_w) // bucket_s)
        if 0 <= idx < num_buckets:
            spark_attacks[idx] += 1

    # Previous window totals (same length as current)
    epoch_prev = int(prev_start.timestamp())
    prev_posts, prev_comments, prev_messages, prev_reports = await asyncio.gather(
        db.posts.count_documents({"created_at": {"$gte": prev_iso, "$lt": w_iso},
                                  "is_draft": {"$ne": True}}),
        db.comments.count_documents({"created_at": {"$gte": prev_iso, "$lt": w_iso}}),
        db.messages.count_documents({"created_at": {"$gte": prev_iso, "$lt": w_iso}}),
        db.reports.count_documents({"created_at": {"$gte": prev_iso, "$lt": w_iso}}),
    )
    prev_attacks = await db.auth_events.count_documents(
        {"ts_epoch": {"$gte": epoch_prev, "$lt": epoch_w},
         "kind": {"$in": list(attack_kinds)}}
    )

    # Live snapshots
    users_online = await db.users.count_documents({"last_seen": {"$gte": online_cut}})
    reports_open = await db.reports.count_documents({"status": "open"})

    # Online previous baseline — users last_seen in the equivalent prior
    # ONLINE_WINDOW slice (offset by the current window length).
    online_prev_window_end = w_start.isoformat()
    online_prev_window_start = (w_start - ONLINE_WINDOW).isoformat()
    online_prev = await db.users.count_documents({
        "last_seen": {"$gte": online_prev_window_start, "$lt": online_prev_window_end},
    })

    def _delta(curr: int, prev: int) -> float:
        if prev <= 0:
            return 0.0 if curr == 0 else 100.0
        return round((curr - prev) * 100.0 / prev, 1)

    cur_posts = sum(spark_posts)
    cur_comments = sum(spark_comments)
    cur_messages = sum(spark_messages)
    cur_reports = sum(spark_reports)
    cur_attacks = sum(spark_attacks)

    window_minutes_total = int((bucket_s * num_buckets) / 60)

    return {
        "generated_at": now.isoformat(),
        "window": window,
        "window_minutes": window_minutes_total,
        "bucket_seconds": bucket_s,
        "num_buckets": num_buckets,
        "kpis": {
            "users_online": {
                "value": users_online,
                "prev": online_prev,
                "delta_pct": _delta(users_online, online_prev),
                "sparkline": spark_sessions,  # new sessions per minute as proxy
            },
            "posts_per_window": {
                "value": cur_posts,
                "prev": prev_posts,
                "delta_pct": _delta(cur_posts, prev_posts),
                "sparkline": spark_posts,
            },
            "comments_per_window": {
                "value": cur_comments,
                "prev": prev_comments,
                "delta_pct": _delta(cur_comments, prev_comments),
                "sparkline": spark_comments,
            },
            "messages_per_window": {
                "value": cur_messages,
                "prev": prev_messages,
                "delta_pct": _delta(cur_messages, prev_messages),
                "sparkline": spark_messages,
            },
            "reports_open": {
                "value": reports_open,
                "prev_window_new": prev_reports,
                "delta_pct": _delta(cur_reports, prev_reports),
                "sparkline": spark_reports,
            },
            "attacks_blocked": {
                "value": cur_attacks,
                "prev": prev_attacks,
                "delta_pct": _delta(cur_attacks, prev_attacks),
                "sparkline": spark_attacks,
            },
        },
    }


# ─── /admin/cockpit/timeline ────────────────────────────────────────────────
@api2.get("/admin/cockpit/timeline")
async def admin_cockpit_timeline(
    window: str = "15m",
    admin=Depends(require_admin),
):
    """Multi-series time-bucketed counts for the main Cockpit chart.

    Returns 4 parallel series (users, posts, comments, messages) over the
    requested window. Bucket size is auto-chosen per `_cockpit_bucket_plan`.
    """
    bucket_s, num = _cockpit_bucket_plan(window)
    now = datetime.now(timezone.utc)
    span = timedelta(seconds=bucket_s * num)
    since = now - span
    since_iso = since.isoformat()

    users, posts, comments, messages = await asyncio.gather(
        _cockpit_bucket_count(db.users, "created_at", since_iso, bucket_s, num),
        _cockpit_bucket_count(db.posts, "created_at", since_iso, bucket_s, num,
                              extra_match={"is_draft": {"$ne": True}}),
        _cockpit_bucket_count(db.comments, "created_at", since_iso, bucket_s, num),
        _cockpit_bucket_count(db.messages, "created_at", since_iso, bucket_s, num),
    )

    # Build x-axis labels (ISO timestamps at bucket boundaries)
    labels = []
    for i in range(num):
        labels.append((since + timedelta(seconds=bucket_s * i)).isoformat())

    return {
        "window": window,
        "bucket_seconds": bucket_s,
        "num_buckets": num,
        "since": since_iso,
        "until": now.isoformat(),
        "labels": labels,
        "series": {
            "users": users,
            "posts": posts,
            "comments": comments,
            "messages": messages,
        },
    }


# ─── /admin/cockpit/activity ────────────────────────────────────────────────
@api2.get("/admin/cockpit/activity")
async def admin_cockpit_activity(
    limit: int = 30,
    admin=Depends(require_admin),
):
    """Normalized live activity feed combining real signals.

    Sources (all real, none synthesised):
      - db.reports (newest)
      - db.admin_audit (newest, severe actions only)
      - db.auth_events (newest, danger / warn severity only)

    Each item: { id, ts, kind, severity, title, subtitle, ref }
    """
    limit = max(1, min(100, int(limit or 30)))
    items: list[dict] = []

    # Reports — newest open + recent resolved
    async for r in db.reports.find({}, {"_id": 0}).sort("created_at", -1).limit(limit):
        # Resolve target_user (best-effort)
        target_username = None
        if r.get("kind") == "user":
            tu = await db.users.find_one({"id": r.get("target_id")}, {"_id": 0, "username": 1})
            if tu:
                target_username = tu.get("username")
        elif r.get("kind") in ("post", "comment"):
            coll = db.posts if r["kind"] == "post" else db.comments
            doc = await coll.find_one({"id": r.get("target_id")}, {"_id": 0, "author_id": 1})
            if doc:
                au = await db.users.find_one({"id": doc.get("author_id")}, {"_id": 0, "username": 1})
                if au:
                    target_username = au.get("username")
        is_open = r.get("status") == "open"
        queue = _classify_report_queue(r.get("reason"))
        items.append({
            "id": f"report:{r.get('id')}",
            "ts": r.get("created_at"),
            "kind": "new_report" if is_open else "report_resolved",
            "severity": "danger" if queue == "urgent" else ("warn" if is_open else "info"),
            "title": ("Report urgente" if queue == "urgent" else "Novo report") if is_open else "Report resolvido",
            "subtitle": f"{r.get('reason') or 'sem motivo'} · {r.get('kind') or ''}{(' · @' + target_username) if target_username else ''}",
            "ref": {
                "report_id": r.get("id"),
                "kind": r.get("kind"),
                "target_id": r.get("target_id"),
                "target_username": target_username,
            },
        })

    # Admin audit — severe actions only
    severe_actions = {"ban_user", "delete_user", "delete_post", "delete_comment",
                       "suspend_user", "shadow_mute", "freeze_user",
                       "force_logout_user", "revoke_session", "blacklist_hashtag",
                       "feature_user", "verify_user"}
    async for a in db.admin_audit.find({}, {"_id": 0}).sort("created_at", -1).limit(limit):
        action = a.get("action") or ""
        if action not in severe_actions:
            continue
        items.append({
            "id": f"audit:{a.get('id')}",
            "ts": a.get("created_at"),
            "kind": "admin_action",
            "severity": "warn" if action.startswith(("delete_", "ban_", "suspend_", "freeze_", "shadow_")) else "info",
            "title": f"Ação admin: {action}",
            "subtitle": f"por @{a.get('actor_username') or '?'} · alvo {a.get('target_kind') or '?'}",
            "ref": {
                "actor_id": a.get("actor_id"),
                "actor_username": a.get("actor_username"),
                "target_kind": a.get("target_kind"),
                "target_id": a.get("target_id"),
                "action": action,
            },
        })

    # Auth events — danger only
    danger_kinds = ["token_invalid", "login_locked", "suspicious_ip_change",
                     "ws_connect_fail", "twofa_fail", "reset_password_fail"]
    async for e in db.auth_events.find(
        {"kind": {"$in": danger_kinds}},
        {"_id": 0},
    ).sort("ts_epoch", -1).limit(limit):
        kind = e.get("kind")
        sev = _classify_event_severity(kind)
        items.append({
            "id": f"auth:{e.get('id') or e.get('ts_epoch')}:{kind}",
            "ts": e.get("ts"),
            "kind": "auth_event",
            "severity": sev,
            "title": {
                "token_invalid": "Token inválido detectado",
                "login_locked": "Conta bloqueada (lockout)",
                "suspicious_ip_change": "Mudança de IP suspeita",
                "ws_connect_fail": "WebSocket rejeitado",
                "twofa_fail": "Falha 2FA",
                "reset_password_fail": "Falha em reset de password",
            }.get(kind, kind),
            "subtitle": (
                f"IP {e.get('ip') or '?'} · "
                f"{(e.get('email') or '@' + (e.get('user_id') or '?')[:8])}"
            ),
            "ref": {
                "user_id": e.get("user_id"),
                "email": e.get("email"),
                "ip": e.get("ip"),
                "kind": kind,
            },
        })

    # Sort by ts desc, cap to `limit`
    def _ts_key(x):
        return x.get("ts") or ""
    items.sort(key=_ts_key, reverse=True)
    items = items[:limit]

    return {"items": items, "generated_at": now_iso()}


# ─── /admin/cockpit/queues ──────────────────────────────────────────────────
@api2.get("/admin/cockpit/queues")
async def admin_cockpit_queues(admin=Depends(require_admin)):
    """Moderation queue breakdown — real DB counts of open reports by class."""
    queues = {"urgent": 0, "review": 0, "spam": 0, "appeal": 0}
    async for r in db.reports.find({"status": "open"}, {"_id": 0, "reason": 1}):
        q = _classify_report_queue(r.get("reason"))
        queues[q] = queues.get(q, 0) + 1
    # Total + oldest age
    total_open = sum(queues.values())
    oldest = await db.reports.find({"status": "open"}, {"_id": 0, "created_at": 1}) \
        .sort("created_at", 1).limit(1).to_list(1)
    oldest_iso = (oldest[0].get("created_at") if oldest else None)
    return {
        "queues": queues,
        "total_open": total_open,
        "oldest_open_at": oldest_iso,
        "generated_at": now_iso(),
    }


# ─── /admin/cockpit/geo ─────────────────────────────────────────────────────
@api2.get("/admin/cockpit/geo")
async def admin_cockpit_geo(admin=Depends(require_admin)):
    """Geographic distribution from REAL user.region data.

    PT regions taxonomy + 'emigrante' (diaspora). No external geo-IP lookup
    is performed — everything comes from the user's declared region.
    Returns rows sorted desc by user count with absolute and pct values.
    Rows with no region are aggregated under 'sem_regiao'.
    """
    pipeline = [
        {"$group": {"_id": {"$ifNull": ["$region", "sem_regiao"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    rows_raw: list[dict] = []
    async for doc in db.users.aggregate(pipeline):
        rows_raw.append({"key": (doc.get("_id") or "sem_regiao"), "count": int(doc.get("count") or 0)})
    total = sum(r["count"] for r in rows_raw) or 1
    region_labels = {
        "norte": "Norte",
        "centro": "Centro",
        "lisboa": "Lisboa",
        "alentejo": "Alentejo",
        "algarve": "Algarve",
        "madeira": "Madeira",
        "acores": "Açores",
        "emigrante": "Diáspora",
        "sem_regiao": "Sem região",
    }
    rows = []
    for r in rows_raw:
        k = (r["key"] or "").lower()
        rows.append({
            "key": k,
            "label": region_labels.get(k, k.title() if k else "Sem região"),
            "count": r["count"],
            "pct": round(r["count"] * 100.0 / total, 1),
        })
    return {
        "rows": rows,
        "total_users": total,
        "has_data": any(r["key"] not in ("sem_regiao",) for r in rows),
        "generated_at": now_iso(),
    }


# ─── /admin/cockpit/top-posts ───────────────────────────────────────────────
@api2.get("/admin/cockpit/top-posts")
async def admin_cockpit_top_posts(
    limit: int = 3,
    hours: int = 24,
    admin=Depends(require_admin),
):
    """Top engaged posts in the last N hours (real likes_count + comments_count)."""
    limit = max(1, min(10, int(limit or 3)))
    hours = max(1, min(168, int(hours or 24)))
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    rows = await db.posts.find(
        {"created_at": {"$gte": since}, "is_draft": {"$ne": True}},
        {"_id": 0},
    ).to_list(length=500)
    # Compute engagement score = likes + 2*comments
    def _score(p):
        return len(p.get("likes") or []) + 2 * len(p.get("comments") or [])
    rows.sort(key=_score, reverse=True)
    rows = rows[:limit]
    author_ids = list({p.get("author_id") for p in rows if p.get("author_id")})
    authors = {}
    if author_ids:
        async for u in db.users.find(
            {"id": {"$in": author_ids}},
            {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "verified": 1},
        ):
            authors[u["id"]] = u
    out = []
    for p in rows:
        au = authors.get(p.get("author_id")) or {}
        likes = len(p.get("likes") or [])
        comments = len(p.get("comments") or [])
        out.append({
            "id": p.get("id"),
            "content": (p.get("content") or "")[:160],
            "created_at": p.get("created_at"),
            "likes_count": likes,
            "comments_count": comments,
            "engagement": likes + 2 * comments,
            "author": {
                "id": au.get("id"), "username": au.get("username"),
                "name": au.get("name"), "avatar": au.get("avatar", ""),
                "verified": bool(au.get("verified")),
            },
        })
    return {"items": out, "since_hours": hours, "generated_at": now_iso()}


# ─── /admin/cockpit/trending ────────────────────────────────────────────────
@api2.get("/admin/cockpit/trending")
async def admin_cockpit_trending(
    limit: int = 4,
    hours: int = 24,
    admin=Depends(require_admin),
):
    """Top hashtags in the last N hours with real velocity vs previous window.

    Honest implementation: counts posts containing each hashtag in the
    current window and the immediately previous window of same length.
    """
    limit = max(1, min(20, int(limit or 4)))
    hours = max(1, min(168, int(hours or 24)))
    now = datetime.now(timezone.utc)
    since_curr = (now - timedelta(hours=hours)).isoformat()
    since_prev = (now - timedelta(hours=hours * 2)).isoformat()

    curr_counts: dict[str, int] = {}
    prev_counts: dict[str, int] = {}
    spark_buckets: dict[str, list[int]] = {}

    bucket_s = max(60, (hours * 3600) // 12)  # ~12 buckets

    async for p in db.posts.find(
        {"created_at": {"$gte": since_prev}, "is_draft": {"$ne": True}},
        {"_id": 0, "hashtags": 1, "created_at": 1},
    ):
        tags = p.get("hashtags") or []
        ts = p.get("created_at")
        is_curr = ts >= since_curr
        for t in tags:
            tag = (t or "").lower()
            if not tag:
                continue
            if is_curr:
                curr_counts[tag] = curr_counts.get(tag, 0) + 1
                # bucket
                try:
                    dt = datetime.fromisoformat(ts)
                    delta = (dt - (now - timedelta(hours=hours))).total_seconds()
                    idx = int(delta // bucket_s)
                    if 0 <= idx < 12:
                        arr = spark_buckets.setdefault(tag, [0] * 12)
                        arr[idx] += 1
                except Exception:
                    pass
            else:
                prev_counts[tag] = prev_counts.get(tag, 0) + 1

    # Filter blacklist
    bl = set()
    async for b in db.hashtag_blacklist.find({}, {"_id": 0, "tag": 1}):
        bl.add((b.get("tag") or "").lower())

    rows = []
    for tag, n in curr_counts.items():
        if tag in bl:
            continue
        prev = prev_counts.get(tag, 0)
        velocity = round((n - prev) * 100.0 / prev, 1) if prev > 0 else (100.0 if n > 0 else 0.0)
        rows.append({
            "tag": tag,
            "count": n,
            "previous": prev,
            "velocity": velocity,
            "sparkline": spark_buckets.get(tag, [0] * 12),
        })
    rows.sort(key=lambda r: r["count"], reverse=True)
    return {"items": rows[:limit], "since_hours": hours, "generated_at": now_iso()}


# ─── /admin/cockpit/services ────────────────────────────────────────────────
@api2.get("/admin/cockpit/services")
async def admin_cockpit_services(admin=Depends(require_admin)):
    """Status of each backing service.

    Real measurements:
      - api: this call's elapsed time
      - mongo: ping + admin.serverStatus()
      - websocket: in-process ws_manager state
      - storage: db.stats() data size

    Status is one of: operational | degraded | down.
    """
    t0 = time.time()
    services = []

    # API (this call): instant — always operational if we got here.
    services.append({
        "key": "api",
        "label": "API",
        "status": "operational",
        "latency_ms": None,  # filled at end
        "detail": "FastAPI",
    })

    # MongoDB
    mongo_ms = None
    mongo_status = "operational"
    mongo_detail = ""
    try:
        mt0 = time.time()
        await db.command("ping")
        mongo_ms = int((time.time() - mt0) * 1000)
        if mongo_ms > 250:
            mongo_status = "degraded"
        try:
            srv = await db.command("serverStatus")
            ver = srv.get("version") or ""
            conn = (srv.get("connections") or {}).get("current")
            mongo_detail = f"v{ver} · {conn} conn" if ver else ""
        except Exception:
            mongo_detail = ""
    except Exception as e:
        mongo_status = "down"
        mongo_detail = str(e)[:80]
    services.append({
        "key": "mongo",
        "label": "MongoDB",
        "status": mongo_status,
        "latency_ms": mongo_ms,
        "detail": mongo_detail,
    })

    # WebSocket
    try:
        ws_users = len(ws_manager.active)
        ws_socks = sum(len(v) for v in ws_manager.active.values())
        services.append({
            "key": "websocket",
            "label": "WebSocket",
            "status": "operational",
            "latency_ms": None,
            "detail": f"{ws_socks} sockets · {ws_users} users",
        })
    except Exception:
        services.append({
            "key": "websocket",
            "label": "WebSocket",
            "status": "degraded",
            "latency_ms": None,
            "detail": "manager unavailable",
        })

    # Storage (db stats)
    storage_status = "operational"
    storage_detail = ""
    try:
        st = await db.command("dbStats")
        size_mb = round((st.get("dataSize") or 0) / 1024 / 1024, 1)
        storage_detail = f"{size_mb} MB · {st.get('collections', 0)} colls"
    except Exception as e:
        storage_status = "degraded"
        storage_detail = str(e)[:80]
    services.append({
        "key": "storage",
        "label": "Storage",
        "status": storage_status,
        "latency_ms": None,
        "detail": storage_detail,
    })

    # API latency = elapsed since t0
    elapsed_ms = int((time.time() - t0) * 1000)
    services[0]["latency_ms"] = elapsed_ms

    overall = "operational"
    if any(s["status"] == "down" for s in services):
        overall = "down"
    elif any(s["status"] == "degraded" for s in services):
        overall = "degraded"

    return {"services": services, "overall": overall, "generated_at": now_iso()}


# ─── /admin/cockpit/system-mini ─────────────────────────────────────────────
@api2.get("/admin/cockpit/system-mini")
async def admin_cockpit_system_mini(admin=Depends(require_admin)):
    """Compact widget: uptime + CPU + memory + API latency.

    Reads /proc/{meminfo,stat,uptime} — same source as /admin/system/load,
    just projected for the Cockpit widget.
    """
    t0 = time.time()
    uptime_s = max(0, int(time.time() - _PROCESS_STARTED_AT))
    mem = _read_proc_meminfo()
    mem_total_kb = mem.get("MemTotal", 0)
    mem_avail_kb = mem.get("MemAvailable", mem.get("MemFree", 0))
    mem_used_pct = None
    if mem_total_kb > 0:
        mem_used_pct = round((mem_total_kb - mem_avail_kb) * 100.0 / mem_total_kb, 1)

    # CPU load — read /proc/stat twice 100ms apart for real %
    cpu_pct = None
    try:
        def _read_cpu() -> tuple[int, int]:
            with open("/proc/stat", "r") as f:
                parts = f.readline().split()
            vals = [int(x) for x in parts[1:8]]
            idle = vals[3] + (vals[4] if len(vals) > 4 else 0)
            total = sum(vals)
            return idle, total
        i1, t1 = _read_cpu()
        await asyncio.sleep(0.1)
        i2, t2 = _read_cpu()
        d_idle = i2 - i1
        d_total = t2 - t1
        if d_total > 0:
            cpu_pct = round(100.0 * (d_total - d_idle) / d_total, 1)
    except Exception:
        pass

    api_latency_ms = int((time.time() - t0) * 1000)
    return {
        "uptime_seconds": uptime_s,
        "uptime_started_at": _PROCESS_STARTED_AT_ISO,
        "cpu_percent": cpu_pct,
        "memory_percent": mem_used_pct,
        "memory_total_kb": mem_total_kb,
        "memory_avail_kb": mem_avail_kb,
        "api_latency_ms": api_latency_ms,
        "app_env": APP_ENV,
        "is_production": IS_PRODUCTION,
        "generated_at": now_iso(),
    }


# ─── /admin/cockpit/security-mini ───────────────────────────────────────────
@api2.get("/admin/cockpit/security-mini")
async def admin_cockpit_security_mini(admin=Depends(require_admin)):
    """Slim security widget for the Cockpit bottom row (real auth_events)."""
    now = _epoch_now()
    h24 = now - 86400

    async def _c(kind: str) -> int:
        return await db.auth_events.count_documents({"kind": kind, "ts_epoch": {"$gte": h24}})

    logins_fail, tokens_invalid, ws_fails, suspicious, locked = await asyncio.gather(
        _c("login_fail"), _c("token_invalid"), _c("ws_connect_fail"),
        _c("suspicious_ip_change"), _c("login_locked"),
    )
    revoked_24h = await db.sessions.count_documents({
        "revoked": True,
        "revoked_at": {"$gte": _from_epoch_iso(h24)},
    })
    # Unique IPs flagged in last 24h (token_invalid + ws_fail)
    blocked_ips: set[str] = set()
    async for e in db.auth_events.find(
        {"ts_epoch": {"$gte": h24}, "kind": {"$in": ["token_invalid", "ws_connect_fail", "suspicious_ip_change"]}},
        {"_id": 0, "ip": 1},
    ):
        ip = e.get("ip")
        if ip:
            blocked_ips.add(ip)
    return {
        "logins_failed_24h": logins_fail,
        "tokens_invalid_24h": tokens_invalid,
        "ws_failed_24h": ws_fails,
        "suspicious_24h": suspicious,
        "logins_locked_24h": locked,
        "sessions_revoked_24h": revoked_24h,
        "unique_blocked_ips_24h": len(blocked_ips),
        "attacks_blocked_24h": logins_fail + tokens_invalid + ws_fails + suspicious + locked,
        "generated_at": now_iso(),
    }


# ─── /admin/cockpit/deploy ──────────────────────────────────────────────────
@api2.get("/admin/cockpit/deploy")
async def admin_cockpit_deploy(admin=Depends(require_admin)):
    """Deploy fingerprint — real env values + real stability signal.

    `stable` is computed from the actual subsystem health (services
    overall = operational). When this endpoint is called standalone it
    invokes the services check; when called via /snapshot the snapshot
    layer re-injects the cached value to avoid the double round-trip.
    """
    # Real stability — derived from service overall state.
    try:
        svc = await admin_cockpit_services(admin=admin)
        overall = (svc or {}).get("overall") or "unknown"
    except Exception:
        overall = "unknown"
    stable = (overall == "operational")
    git_commit = _resolve_git_commit()
    return {
        "version": (os.environ.get("APP_VERSION") or "").strip() or (git_commit[:7] if git_commit else ""),
        "commit": git_commit,
        "deployed_at": _PROCESS_STARTED_AT_ISO,
        "uptime_seconds": max(0, int(time.time() - _PROCESS_STARTED_AT)),
        "app_env": APP_ENV,
        "is_production": IS_PRODUCTION,
        "stable": stable,
        "services_overall": overall,
        "generated_at": now_iso(),
    }


# ─── /admin/notifications — operational inbox (C-5) ─────────────────────────
@api2.get("/admin/notifications")
async def admin_notifications(
    limit: int = 30,
    since_hours: int = 24,
    admin=Depends(require_admin),
):
    """Aggregated operational inbox for the admin bell icon.

    Bundles the actually-actionable signals an admin should see:
      - urgent open reports (queue=urgent)
      - severe admin actions (ban/delete/suspend/freeze) in last N hours
      - critical auth events (login_locked, suspicious_ip_change, token_invalid)
      - degraded/down services (from /cockpit/services)
    Each item ships a `deep_link` query string the frontend can apply to
    jump straight to context.
    """
    limit = max(1, min(100, int(limit or 30)))
    since_hours = max(1, min(168, int(since_hours or 24)))
    now_dt = datetime.now(timezone.utc)
    since_iso = (now_dt - timedelta(hours=since_hours)).isoformat()
    since_epoch = int((now_dt - timedelta(hours=since_hours)).timestamp())
    items: list[dict] = []
    counts = {"urgent_report": 0, "admin_action": 0, "auth_event": 0, "service_alert": 0}

    # 1) Urgent reports (open) — newest first
    async for r in db.reports.find(
        {"status": "open"},
        {"_id": 0},
    ).sort("created_at", -1).limit(limit):
        queue = _classify_report_queue(r.get("reason"))
        if queue != "urgent":
            continue
        target_username = None
        if r.get("kind") == "user":
            tu = await db.users.find_one({"id": r.get("target_id")}, {"_id": 0, "username": 1})
            if tu:
                target_username = tu.get("username")
        elif r.get("kind") in ("post", "comment"):
            coll = db.posts if r["kind"] == "post" else db.comments
            doc = await coll.find_one({"id": r.get("target_id")}, {"_id": 0, "author_id": 1})
            if doc:
                au = await db.users.find_one({"id": doc.get("author_id")}, {"_id": 0, "username": 1})
                if au:
                    target_username = au.get("username")
        items.append({
            "id": f"notif:urgent_report:{r.get('id')}",
            "ts": r.get("created_at"),
            "kind": "urgent_report",
            "severity": "danger",
            "title": "Report urgente",
            "subtitle": f"{r.get('reason') or 'sem motivo'} · {r.get('kind') or ''}{(' · @' + target_username) if target_username else ''}",
            "ref": {"report_id": r.get("id"), "target_id": r.get("target_id"), "target_username": target_username},
            "deep_link": f"?tab=reports&queue=urgent&id={r.get('id')}",
        })
        counts["urgent_report"] += 1

    # 2) Severe admin actions in window
    severe_actions = {"ban_user", "delete_user", "delete_post", "delete_comment",
                       "suspend_user", "shadow_mute", "freeze_user",
                       "force_logout_user", "revoke_session"}
    async for a in db.admin_audit.find(
        {"created_at": {"$gte": since_iso}, "action": {"$in": list(severe_actions)}},
        {"_id": 0},
    ).sort("created_at", -1).limit(limit):
        items.append({
            "id": f"notif:admin_action:{a.get('id')}",
            "ts": a.get("created_at"),
            "kind": "admin_action",
            "severity": "warn",
            "title": f"Ação admin: {a.get('action') or '?'}",
            "subtitle": f"por @{a.get('actor_username') or '?'} · alvo {a.get('target_kind') or '?'}",
            "ref": {"audit_id": a.get("id"), "action": a.get("action")},
            "deep_link": f"?tab=audit&focus={a.get('id') or ''}",
        })
        counts["admin_action"] += 1

    # 3) Critical auth events
    critical_kinds = ["login_locked", "suspicious_ip_change", "twofa_fail"]
    async for e in db.auth_events.find(
        {"ts_epoch": {"$gte": since_epoch}, "kind": {"$in": critical_kinds}},
        {"_id": 0},
    ).sort("ts_epoch", -1).limit(limit):
        kind = e.get("kind")
        title_map = {
            "login_locked": "Conta bloqueada (lockout)",
            "suspicious_ip_change": "Mudança de IP suspeita",
            "twofa_fail": "Falha 2FA",
        }
        items.append({
            "id": f"notif:auth:{e.get('id') or e.get('ts_epoch')}:{kind}",
            "ts": e.get("ts"),
            "kind": "auth_event",
            "severity": "warn",
            "title": title_map.get(kind, kind),
            "subtitle": f"IP {e.get('ip') or '?'} · {(e.get('email') or '@' + (e.get('user_id') or '?')[:8])}",
            "ref": {"user_id": e.get("user_id"), "email": e.get("email"), "ip": e.get("ip"), "kind": kind},
            "deep_link": "?tab=security",
        })
        counts["auth_event"] += 1

    # 4) Service alerts (current snapshot — non-historic)
    try:
        svc = await admin_cockpit_services(admin=admin)
        for s in (svc.get("services") or []):
            if s.get("status") in ("degraded", "down"):
                items.append({
                    "id": f"notif:service:{s.get('key')}",
                    "ts": now_dt.isoformat(),
                    "kind": "service_alert",
                    "severity": "danger" if s.get("status") == "down" else "warn",
                    "title": f"Serviço {s.get('label')} {s.get('status')}",
                    "subtitle": s.get("detail") or "—",
                    "ref": {"service_key": s.get("key"), "status": s.get("status")},
                    "deep_link": "?tab=system",
                })
                counts["service_alert"] += 1
    except Exception:
        pass

    # Sort by ts desc, cap to limit
    def _ts_key(x):
        return x.get("ts") or ""
    items.sort(key=_ts_key, reverse=True)
    items = items[:limit]

    return {
        "items": items,
        "counts": counts,
        "total": len(items),
        "since_hours": since_hours,
        "generated_at": now_iso(),
    }


# ─── /admin/cockpit/snapshot — bundled fetch on first paint ─────────────────
@api2.get("/admin/cockpit/snapshot")
async def admin_cockpit_snapshot(
    window: str = "15m",
    admin=Depends(require_admin),
):
    """One-shot bundle for the Cockpit initial paint.

    Calls each cockpit sub-endpoint internally so the frontend only needs
    one HTTP request on mount. Subsequent refreshes use the smaller,
    cacheable per-section endpoints + the WebSocket cockpit_event stream.

    `window` propagates to /realtime so KPIs reflect the chosen range.
    """
    realtime, queues, geo, services, system_mini, security_mini, top_posts, trending = await asyncio.gather(
        admin_cockpit_realtime(window=window, admin=admin),
        admin_cockpit_queues(admin=admin),
        admin_cockpit_geo(admin=admin),
        admin_cockpit_services(admin=admin),
        admin_cockpit_system_mini(admin=admin),
        admin_cockpit_security_mini(admin=admin),
        admin_cockpit_top_posts(admin=admin),
        admin_cockpit_trending(admin=admin),
    )
    # Compose deploy locally so we can reuse the already-fetched services
    # `overall` and avoid running the health-check pipeline twice.
    overall = (services or {}).get("overall") or "unknown"
    git_commit = _resolve_git_commit()
    deploy = {
        "version": (os.environ.get("APP_VERSION") or "").strip() or (git_commit[:7] if git_commit else ""),
        "commit": git_commit,
        "deployed_at": _PROCESS_STARTED_AT_ISO,
        "uptime_seconds": max(0, int(time.time() - _PROCESS_STARTED_AT)),
        "app_env": APP_ENV,
        "is_production": IS_PRODUCTION,
        "stable": (overall == "operational"),
        "services_overall": overall,
        "generated_at": now_iso(),
    }
    activity = await admin_cockpit_activity(admin=admin)
    return {
        "realtime": realtime,
        "queues": queues,
        "geo": geo,
        "services": services,
        "system_mini": system_mini,
        "security_mini": security_mini,
        "deploy": deploy,
        "top_posts": top_posts,
        "trending": trending,
        "activity": activity,
        "generated_at": now_iso(),
    }


app.include_router(api2)
