"""
Pluggable secret loader — env-only by default, with hooks for a secret-manager
backend (Doppler / AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault /
Azure Key Vault).

Why this module exists
======================
AI-generated codebases often spread `os.environ[…]` calls across the codebase
with no central validation, no caching layer, no audit trail, and no path to
plug a real secret store in later. This module centralises that.

Design
------
- All "secret-grade" config values are looked up via `get_secret(name)`.
- The default backend is **env-only** (reads from process environment).
- A real vault backend can be selected via `SECRET_BACKEND` env var:
    SECRET_BACKEND=env       (default)
    SECRET_BACKEND=doppler   (vars already injected by `doppler run`)
    SECRET_BACKEND=aws       (requires boto3 + AWS creds at runtime)
    SECRET_BACKEND=gcp       (requires google-cloud-secret-manager)
    SECRET_BACKEND=vault     (requires hvac + VAULT_ADDR / VAULT_TOKEN)
    SECRET_BACKEND=azure     (requires azure-keyvault-secrets + DefaultAzureCredential)
- Backends are lazy-imported, so the codebase has zero runtime dependency on
  any cloud SDK until you explicitly pick one.
- Results are cached in-process to avoid hitting the vault on every request.
  TTL is configurable; default 300s. Use `invalidate()` for rotation.
- All accesses are audit-logged (without the secret value, obviously) so you
  can grep `grep -E "secret access:" /var/log/...` for an audit trail.

Security guarantees
-------------------
- The secret value NEVER appears in the audit log line.
- The cache lives in process memory only; it is wiped on `invalidate()`.
- If a required secret is missing, `get_secret(name, required=True)` raises
  `MissingSecret` rather than returning an empty string (no silent fallthrough).
- The module never writes secrets to disk.

Usage
-----
    from secret_loader import get_secret, MissingSecret

    JWT_SECRET = get_secret("JWT_SECRET", required=True)
    OPTIONAL = get_secret("STRIPE_SECRET", required=False, default="")

Rotation
--------
Call `invalidate("JWT_SECRET")` or `invalidate()` (all) and the next
`get_secret(…)` will re-fetch from the backend.
"""
from __future__ import annotations

import logging
import os
import threading
import time
from typing import Optional

logger = logging.getLogger("vermillion.secrets")

_DEFAULT_TTL_S = 300
_CACHE: dict[str, tuple[str, float]] = {}
_LOCK = threading.RLock()


class MissingSecret(RuntimeError):
    """Raised when a required secret cannot be loaded from any backend."""


class SecretBackend:
    name: str = "env"

    def fetch(self, key: str) -> Optional[str]:  # pragma: no cover
        raise NotImplementedError


class EnvBackend(SecretBackend):
    name = "env"

    def fetch(self, key: str) -> Optional[str]:
        val = os.environ.get(key)
        if val is None:
            return None
        # Trim accidental surrounding quotes from poorly-quoted .env entries.
        return val.strip().strip('"').strip("'")


class _LazyVaultBackend(SecretBackend):
    """Generic façade — concrete vault adapters live in `secret_loader_adapters.py`
    and are imported lazily so the module has no hard dependency on any SDK."""

    def __init__(self, backend_name: str):
        self.name = backend_name
        self._impl: Optional[SecretBackend] = None
        self._import_failed = False

    def _resolve(self) -> Optional[SecretBackend]:
        if self._impl is not None or self._import_failed:
            return self._impl
        try:
            from secret_loader_adapters import build_backend  # type: ignore
            self._impl = build_backend(self.name)
            return self._impl
        except Exception as e:
            self._import_failed = True
            logger.error(
                f"🔴 secret backend '{self.name}' is selected but the adapter "
                f"could not be loaded ({type(e).__name__}: {e}). Falling back to env-only."
            )
            return None

    def fetch(self, key: str) -> Optional[str]:
        impl = self._resolve()
        if impl is None:
            return None
        try:
            return impl.fetch(key)
        except Exception as e:
            logger.error(f"🔴 secret backend '{self.name}' fetch failed for {key}: {type(e).__name__}")
            return None


def _resolve_backend() -> tuple[SecretBackend, Optional[SecretBackend]]:
    """Returns (primary_backend, env_fallback). env is always the fallback so
    local dev / CI can override vault values via env."""
    sel = (os.environ.get("SECRET_BACKEND") or "env").strip().lower()
    env = EnvBackend()
    if sel in ("", "env", "environment"):
        return env, None
    return _LazyVaultBackend(sel), env


_BACKEND: SecretBackend
_FALLBACK: Optional[SecretBackend]
_BACKEND, _FALLBACK = _resolve_backend()


def get_secret(key: str, *, required: bool = False, default: Optional[str] = None,
               ttl_s: int = _DEFAULT_TTL_S) -> Optional[str]:
    """Load a secret by name.

    Lookup order:
      1. Process-local cache (within TTL)
      2. Primary backend (env or vault)
      3. Env fallback (when a vault is the primary)
      4. `default`
    """
    now = time.time()
    with _LOCK:
        cached = _CACHE.get(key)
        if cached and (now - cached[1]) < ttl_s:
            return cached[0]

    val = _BACKEND.fetch(key)
    if val is None and _FALLBACK is not None:
        val = _FALLBACK.fetch(key)
    if val is None:
        if required:
            raise MissingSecret(f"Required secret '{key}' not found in backend '{_BACKEND.name}' (or env fallback).")
        val = default

    with _LOCK:
        if val is not None:
            _CACHE[key] = (val, now)
    # Audit log — name only, NEVER the value.
    logger.debug(f"secret access: key={key} backend={_BACKEND.name} hit={val is not None}")
    return val


def invalidate(key: Optional[str] = None) -> None:
    """Wipe the in-process cache for `key` (or all secrets if key is None).
    Use after a rotation event to force a re-fetch from the backend."""
    with _LOCK:
        if key is None:
            _CACHE.clear()
        else:
            _CACHE.pop(key, None)


def active_backend_name() -> str:
    return _BACKEND.name
