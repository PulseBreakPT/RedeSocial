"""
Log redaction filter — defense-in-depth against accidental secret leakage in
logs. Wraps the standard logging stack so that ANY log record passing through
the root logger is scanned for sensitive patterns and masked before being
emitted.

Patterns covered (case-insensitive where applicable):
  • JWT tokens (3-part base64url with dots)
  • Bearer / Basic auth headers
  • API keys: sk-…, sk-live_…, sk-test_…, pk_live_…, pk_test_…
  • AWS access keys (AKIA…, ASIA…) and secret keys (40-char base64-ish)
  • Google API keys (AIza… 39 chars)
  • Stripe keys, Twilio SIDs/tokens
  • Generic "password" / "secret" / "token" / "api_key" / "authorization"
    JSON-ish key-value pairs (`"password": "…"`)
  • MongoDB URLs with embedded credentials (mongodb://user:pass@…)
  • HTTP cookies (Set-Cookie: …=…)
  • bcrypt hashes ($2b$…$…) — these are not secrets but we redact anyway
    to avoid leaking the hash structure to log scrapers.

Usage (already wired in server.py):
    from log_redaction import install_log_redaction
    install_log_redaction()

NOTE: This is a defense-in-depth layer. It does NOT replace careful logging
(don't log secrets in the first place). The redactor will mask, but a log
written before this filter is installed will leak.
"""
from __future__ import annotations

import logging
import re
from typing import Pattern


# Each entry: (compiled_regex, replacement_template).
# Replacement uses backreferences where useful so context survives.
_REDACTION_RULES: list[tuple[Pattern[str], str]] = [
    # JWT (header.payload.signature) — three base64url segments separated by dots.
    # Match conservatively (require ey-prefix of header which encodes '{').
    (re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"),
     "[JWT_REDACTED]"),

    # Authorization: Bearer XXX  /  Authorization: Basic XXX
    (re.compile(r"(?i)(authorization\s*[:=]\s*['\"]?)(bearer|basic)\s+[A-Za-z0-9._\-+/=]+"),
     r"\1\2 [REDACTED]"),

    # Stripe-style: sk_live_…, sk_test_…, pk_live_…, pk_test_…, rk_…, whsec_…
    (re.compile(r"\b(sk|pk|rk|whsec)_(live|test)_[A-Za-z0-9]{8,}"),
     r"\1_\2_[REDACTED]"),

    # OpenAI / Anthropic / generic sk-… (project keys: sk-proj-…, org keys: sk-ant-…)
    (re.compile(r"\bsk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{20,}"), "sk-[REDACTED]"),

    # AWS access keys
    (re.compile(r"\b(AKIA|ASIA)[0-9A-Z]{16}\b"), r"\1[REDACTED]"),
    # AWS secret-access-key shape: 40 chars base64-ish, hard to detect without
    # context. We only redact when prefixed with the key name.
    (re.compile(
        r"(?i)(aws_secret_access_key|aws[_-]?secret)\s*[:=]\s*['\"]?[A-Za-z0-9/+=]{30,}['\"]?"
    ), r"\1=[REDACTED]"),

    # Google API key (AIza + 35 base64ish chars — total 39, allow ±2 for safety)
    (re.compile(r"\bAIza[0-9A-Za-z_-]{33,37}\b"), "AIza[REDACTED]"),

    # Twilio Account SID / Auth Token
    (re.compile(r"\bAC[a-f0-9]{32}\b"), "AC[REDACTED]"),
    (re.compile(r"(?i)(twilio[_-]?auth[_-]?token)\s*[:=]\s*['\"]?[a-f0-9]{32}['\"]?"),
     r"\1=[REDACTED]"),

    # MongoDB URIs with embedded credentials: mongodb[+srv]://user:pass@host
    (re.compile(r"(mongodb(?:\+srv)?://)([^:@/\s]+):([^@/\s]+)@"),
     r"\1\2:[REDACTED]@"),
    # Postgres / generic URLs with creds
    (re.compile(r"((?:postgres|postgresql|mysql|redis|amqp|amqps)://)([^:@/\s]+):([^@/\s]+)@"),
     r"\1\2:[REDACTED]@"),

    # JSON / key=value style secrets — match the VALUE, preserve the KEY.
    (re.compile(
        r"(?i)(\"?(?:password|passwd|secret|api[_-]?key|access[_-]?token|"
        r"refresh[_-]?token|jwt[_-]?secret|client[_-]?secret|private[_-]?key|"
        r"service[_-]?role|cookie|set-cookie)\"?\s*[:=]\s*)"
        r"(['\"])([^'\"]{4,})\2"
    ), r"\1\2[REDACTED]\2"),

    # bcrypt hashes — not strictly secret but no reason to log them.
    (re.compile(r"\$2[abxy]\$\d{2}\$[A-Za-z0-9./]{53}"), "[BCRYPT_HASH_REDACTED]"),
]


class _RedactionFilter(logging.Filter):
    """Apply redaction rules to every formatted log record."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: D401
        try:
            # Redact the pre-formatted message (avoid double-formatting cost).
            msg = record.getMessage()
            redacted = msg
            for pattern, replacement in _REDACTION_RULES:
                redacted = pattern.sub(replacement, redacted)
            if redacted != msg:
                # Replace args so downstream formatters don't re-expand them.
                record.msg = redacted
                record.args = None
            # Also redact common structured fields if present.
            for attr in ("exc_text",):
                val = getattr(record, attr, None)
                if isinstance(val, str):
                    new_val = val
                    for pattern, replacement in _REDACTION_RULES:
                        new_val = pattern.sub(replacement, new_val)
                    if new_val != val:
                        setattr(record, attr, new_val)
        except Exception:
            # Never break logging — filter must be infallible.
            pass
        return True


_INSTALLED = False


def install_log_redaction() -> None:
    """Install the redaction filter on the root logger.

    Idempotent. Attaches the filter to every existing handler on the root
    logger plus the root itself, so it catches anything routed through the
    standard logging machinery (uvicorn, fastapi, third-party libs included).
    """
    global _INSTALLED
    if _INSTALLED:
        return
    flt = _RedactionFilter()
    root = logging.getLogger()
    root.addFilter(flt)
    for h in list(root.handlers):
        h.addFilter(flt)
    # Also attach to uvicorn loggers explicitly (they may not propagate).
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "vermillion"):
        lg = logging.getLogger(name)
        lg.addFilter(flt)
        for h in list(lg.handlers):
            h.addFilter(flt)
    _INSTALLED = True
