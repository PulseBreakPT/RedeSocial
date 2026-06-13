"""
Lusorae — Automod PT (Fase 3)
=================================================
Filtro mínimo e efectivo de conteúdo abusivo em português.

Regras:
  • lista curta de palavrões PT com contextos comuns
  • detecção de spam: links repetidos, ALL CAPS extensivo, repetição
  • bypass: admins nunca são filtrados (resolvido no caller)

NÃO é um modelo de ML — é uma rede de segurança rápida. Combina com
os limites de rate-limit / hashtags existentes em server.py.
"""
import re
from typing import Tuple

# ─── PT bad words (versão mínima) ──────────────────────────────────────────
# Mantemos lista curta. Bordas \b para evitar falsos positivos em palavras
# compostas (ex: "puta" vs "computador"). Não cobrimos l33t-speak — esse
# patamar exige ML; primeiro filtro = ataques óbvios e harassment directo.
_BAD_WORDS_PT = [
    # insultos pessoais directos
    r"\bf(?:o|0)de(?:s|m)?-?te\b",          # fode-te / fodes / fodem-te
    r"\bvai\s+(?:para\s+)?(?:o\s+)?caralho\b",
    r"\bfilho\s+da\s+puta\b",
    r"\bfilho\s+de\s+uma\s+puta\b",
    r"\bcabr(?:ã|a)o\b",
    r"\bmerd(?:a|oso)\b",                   # também mata "merdas"
    r"\bidiot(?:a|as)\b",
    r"\bimbecil\b",
    r"\bestupid(?:o|a)\b",
    r"\botari(?:o|a)\b",
    r"\bcorn(?:o|a)\b",
    # discurso de ódio (versões básicas)
    r"\bpreto\s+(?:de\s+)?merda\b",
    r"\bbic(?:h|h)a\s+(?:de\s+)?merda\b",
    r"\bgay\s+(?:de\s+)?merda\b",
]

_BAD_WORDS_RE = re.compile("|".join(_BAD_WORDS_PT), flags=re.IGNORECASE)

# ─── Sinais de spam ────────────────────────────────────────────────────────
_URL_RE = re.compile(r"https?://\S+", flags=re.IGNORECASE)
_CAPS_RE = re.compile(r"[A-ZÀ-Ÿ]")
_REPETITION_RE = re.compile(r"(.)\1{8,}")  # >8 mesmo char seguido


def analyse_text(text: str) -> Tuple[bool, str, str]:
    """
    Returns (blocked, reason_code, friendly_pt_message).
    - blocked=True  → bloquear publicação
    - reason_code   → "bad_words" | "spam_caps" | "spam_repeat" | "spam_links"
    - friendly      → mensagem PT a mostrar ao utilizador (sem revelar palavras)
    """
    if not text or not isinstance(text, str):
        return False, "", ""

    # 1) palavrões PT — mata harassment óbvio
    if _BAD_WORDS_RE.search(text):
        return True, "bad_words", (
            "Esta publicação contém linguagem que não é permitida no Lusorae. "
            "Reescreve com respeito."
        )

    # 2) caps lock extensivo (>70% de uppercase em texto longo)
    stripped = re.sub(r"[^A-Za-zÀ-ÿ]", "", text)
    if len(stripped) >= 40:
        caps = len(_CAPS_RE.findall(stripped))
        if caps / max(1, len(stripped)) > 0.7:
            return True, "spam_caps", (
                "Está tudo em maiúsculas. Aqui não se grita — reescreve em tom normal."
            )

    # 3) repetição absurda (aaaaaaaaaa, !!!!!!!!!!)
    if _REPETITION_RE.search(text):
        return True, "spam_repeat", (
            "Demasiada repetição de caracteres. Reescreve sem martelar a tecla."
        )

    # 4) excesso de URLs (3+) — anti-spam de links
    urls = _URL_RE.findall(text)
    if len(urls) >= 3:
        return True, "spam_links", (
            "Demasiados links numa só publicação (máx 2)."
        )

    return False, "", ""


def is_safe(text: str) -> bool:
    """Quick check — True se está OK para publicar."""
    blocked, _, _ = analyse_text(text or "")
    return not blocked
