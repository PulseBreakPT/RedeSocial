#!/usr/bin/env python3
"""
Standalone secret-leak scanner — auditing tool, NOT a runtime dependency.

Usage:
    python3 scripts/secret_scan.py [path]   # default path: /app
    python3 scripts/secret_scan.py --staged # scan only files staged in git

Exits 0 if clean, 1 if anything suspicious is found.

What it catches (whitelist of patterns):
  • JWTs
  • sk-… (OpenAI / Anthropic / generic) including sk-proj-, sk-ant-, sk-svcacct-
  • Stripe keys (sk_live_, sk_test_, pk_live_, pk_test_, rk_, whsec_)
  • AWS access keys (AKIA…, ASIA…)
  • Google API keys (AIza…)
  • Twilio Account SIDs (AC[a-f0-9]{32})
  • SendGrid keys (SG.…)
  • GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
  • Slack tokens (xox[abprs]-…)
  • MongoDB / Postgres URLs with embedded credentials
  • bcrypt hashes
  • Known leaked literals from this project's history

What it deliberately tolerates:
  • The blocklist of leaked values inside log_redaction.py and server.py
    (those exist so the runtime can REJECT them).
  • The .env.example files (which have placeholders only).
  • This script itself.
  • node_modules / __pycache__ / .git
"""
from __future__ import annotations

import argparse
import re
import sys
import subprocess
from pathlib import Path

PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("JWT",                re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")),
    ("OpenAI/Anthropic",   re.compile(r"\bsk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{20,}")),
    ("Stripe",             re.compile(r"\b(?:sk|pk|rk|whsec)_(?:live|test)_[A-Za-z0-9]{8,}")),
    ("AWS_AccessKey",      re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("AWS_SecretKey",      re.compile(r"(?i)aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['\"]?[A-Za-z0-9/+=]{30,}")),
    ("Google_APIKey",      re.compile(r"\bAIza[0-9A-Za-z_-]{33,37}\b")),
    ("Twilio_SID",         re.compile(r"\bAC[a-f0-9]{32}\b")),
    ("SendGrid",           re.compile(r"\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b")),
    ("GitHub_Token",       re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b")),
    ("Slack_Token",        re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b")),
    ("DB_URL_with_creds",  re.compile(r"(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp)://[^:@/\s]+:[^@/\s]+@")),
    ("bcrypt",             re.compile(r"\$2[abxy]\$\d{2}\$[A-Za-z0-9./]{53}")),
    # Known leaked literals — pre-rotation values that must NEVER reappear.
    ("KnownLeaked_JWT",    re.compile(r"b9f2a7c1e4d6f8a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0")),
    ("KnownLeaked_Admin",  re.compile(r"Admin#Lusorae2025")),
]

# Files/dirs we don't scan
EXCLUDE_DIR_PARTS = {".git", "node_modules", "__pycache__", ".venv", "venv", "build", "dist", ".next", ".pytest_cache", ".cache"}
EXCLUDE_FILE_SUFFIXES = {".pyc", ".pyo", ".so", ".dylib", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".lock", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".zip", ".tar", ".gz"}

# Filenames where matches are EXPECTED and tolerated (these contain the
# patterns intentionally as part of detection logic or as known-leaked
# blocklists — they don't represent live credentials).
ALLOW_PATHS = {
    "backend/log_redaction.py",
    "backend/server.py",  # contains the leaked-value blocklist constant
    "scripts/secret_scan.py",
    "PRODUCTION_READINESS.md",
    "DEPLOY.md",
    "memory/test_credentials.md",  # gitignored anyway; only the rotated value lives here
}


def iter_files(root: Path, staged_only: bool):
    if staged_only:
        out = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            cwd=str(root), capture_output=True, text=True, check=True,
        ).stdout
        for line in out.splitlines():
            p = (root / line).resolve()
            if p.exists() and p.is_file():
                yield p
        return
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(part in EXCLUDE_DIR_PARTS for part in p.parts):
            continue
        if p.suffix.lower() in EXCLUDE_FILE_SUFFIXES:
            continue
        yield p


def is_allowed(rel: Path) -> bool:
    s = str(rel).replace("\\", "/")
    return s in ALLOW_PATHS


def scan(root: Path, staged_only: bool) -> int:
    findings: list[tuple[str, str, int, str]] = []
    for f in iter_files(root, staged_only):
        rel = f.relative_to(root)
        if is_allowed(rel):
            continue
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            for name, pat in PATTERNS:
                if pat.search(line):
                    findings.append((str(rel), name, i, line.strip()[:200]))
    if not findings:
        print("✅ secret_scan: clean")
        return 0
    print(f"🔴 secret_scan: {len(findings)} potential leak(s) found:\n")
    for rel, name, lineno, snippet in findings:
        print(f"  {rel}:{lineno}  [{name}]  {snippet}")
    return 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default="/app")
    ap.add_argument("--staged", action="store_true", help="scan only files staged in git")
    args = ap.parse_args()
    sys.exit(scan(Path(args.path).resolve(), args.staged))


if __name__ == "__main__":
    main()
