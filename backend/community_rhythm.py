"""
community_rhythm.py — Ritmo & memória social de uma comunidade.

Lê os snapshots já persistidos pelo motor de pulso (`community_pulse_snapshots`,
TTL 30d) e deriva — sem persistência nova, sem IA — o "ritmo" do bairro:

  · perfil horário      → a que horas isto costuma encher (mediana por hora)
  · sparkline 24h       → a respiração do último dia
  · horas fortes        → as horas-pico reais da comunidade
  · "a esta hora…"      → a hora atual costuma ter movimento?
  · dias vivos          → dias UTC SEGUIDOS com atividade significativa
                          (COLETIVO — nunca um streak individual)

Honestidade: tudo sai dos snapshots reais. Sem snapshots → tudo a zero/None e
a UI mostra "ainda sem ritmo", nunca um número inventado. O limiar de "hora
forte" reusa a semântica do pulso (score ≥ 10 ≈ comunidade "ativa").
"""

from datetime import datetime, timedelta, timezone
from statistics import median
from typing import List, Optional

# Score ≥ este valor ≈ estado "ativa"/"morna" no community_pulse → hora com vida.
STRONG_HOUR_MIN_SCORE = 10.0
# Estados que contam como "dia vivo".
ALIVE_STATES = {"ativa", "intensa", "acima_do_normal"}


def _parse(ts) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None


def _is_alive_snapshot(snap: dict) -> bool:
    if snap.get("state") in ALIVE_STATES:
        return True
    for t in (snap.get("trends") or []):
        if t.get("meaningful"):
            return True
    return False


def hourly_profile(snapshots: List[dict]) -> List[dict]:
    """Mediana de score por hora-do-dia (0..23). Sempre 24 entradas."""
    buckets: dict = {h: [] for h in range(24)}
    for s in snapshots:
        ts = _parse(s.get("taken_at"))
        if ts is None:
            continue
        score = s.get("score")
        if isinstance(score, (int, float)):
            buckets[ts.hour].append(float(score))
    out = []
    for h in range(24):
        vals = buckets[h]
        med = round(median(vals), 2) if vals else 0.0
        out.append({
            "hour": h,
            "median_score": med,
            "samples": len(vals),
            "strong": med >= STRONG_HOUR_MIN_SCORE,
        })
    return out


def strong_hours(profile: List[dict]) -> List[int]:
    """Horas-pico reais: as horas fortes, ordenadas pela mediana (máx 6)."""
    strong = [p for p in profile if p["strong"]]
    strong.sort(key=lambda p: -p["median_score"])
    return [p["hour"] for p in strong[:6]]


def sparkline_24h(snapshots: List[dict], now: Optional[datetime] = None) -> List[dict]:
    """24 pontos (mais antigo → agora): mediana de score por hora civil das
    últimas 24h. Horas sem dados → 0 (honesto)."""
    now = now or datetime.now(timezone.utc)
    cur_hour = now.replace(minute=0, second=0, microsecond=0)
    buckets: dict = {}
    for s in snapshots:
        ts = _parse(s.get("taken_at"))
        if ts is None:
            continue
        key = ts.replace(minute=0, second=0, microsecond=0)
        score = s.get("score")
        if isinstance(score, (int, float)):
            buckets.setdefault(key, []).append(float(score))
    points = []
    for i in range(23, -1, -1):
        slot = cur_hour - timedelta(hours=i)
        vals = buckets.get(slot, [])
        points.append({
            "hour": slot.hour,
            "value": round(median(vals), 2) if vals else 0.0,
        })
    return points


def dias_vivos(snapshots: List[dict], now: Optional[datetime] = None) -> int:
    """Dias UTC consecutivos (a terminar hoje ou ontem) com ≥1 snapshot vivo.
    Coletivo: mede a vida da comunidade, reinicia honestamente quando há um dia
    morto pelo meio."""
    now = now or datetime.now(timezone.utc)
    alive_days = set()
    for s in snapshots:
        if not _is_alive_snapshot(s):
            continue
        ts = _parse(s.get("taken_at"))
        if ts is None:
            continue
        alive_days.add(ts.date())
    if not alive_days:
        return 0
    today = now.date()
    # Âncora: hoje (se já vivo) senão ontem (run que terminou ontem).
    if today in alive_days:
        cursor = today
    elif (today - timedelta(days=1)) in alive_days:
        cursor = today - timedelta(days=1)
    else:
        return 0
    streak = 0
    while cursor in alive_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def this_hour_hint(profile: List[dict], now: Optional[datetime] = None) -> dict:
    """A hora atual costuma encher? (com base na mediana histórica da hora)."""
    now = now or datetime.now(timezone.utc)
    p = profile[now.hour] if 0 <= now.hour < len(profile) else {"median_score": 0.0, "strong": False, "samples": 0}
    return {
        "hour": now.hour,
        "median_score": p["median_score"],
        "fills": bool(p["strong"]) and p["samples"] >= 3,
    }


def build_rhythm(snapshots: List[dict], now: Optional[datetime] = None) -> dict:
    """Agrega tudo num payload pronto para a API."""
    now = now or datetime.now(timezone.utc)
    profile = hourly_profile(snapshots)
    return {
        "hourly": profile,
        "sparkline_24h": sparkline_24h(snapshots, now),
        "strong_hours": strong_hours(profile),
        "dias_vivos": dias_vivos(snapshots, now),
        "this_hour_hint": this_hour_hint(profile, now),
        "samples": len(snapshots),
    }
