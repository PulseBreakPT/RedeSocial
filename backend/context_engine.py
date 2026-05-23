"""
context_engine.py — Fase 4 / Context Engine.

Pesos contextuais para o feed que reagem ao mundo real: hora do dia,
dia da semana, evento do calendário PT do dia e o mood dominante do Pulse
Engine. Tudo é **math puro + lookup table** — SEM IA, sem randoms. O sinal
é honesto: deriva do relógio e do calendário, que são verdades objectivas.

Uso típico (no /feed/v2, uma vez por pedido):

    ctx = context_engine.get_feed_context_weights(
        now,
        dominant_mood=<pulse dominant_mood ou None>,
        calendar_theme=<tema do evento de hoje ou None>,
        calendar_label=<label do evento de hoje ou None>,
    )
    # depois passa `ctx` a compute_ranking_score(post, ..., context=ctx)

Saída:
    {
      "tempo": "lento" | "normal" | "rápido",
      "slot": "madrugada"|"manha"|"almoco"|"tarde"|"prime"|"noite",
      "freshness_mult": float,     # multiplica o peso de frescura no scoring
      "mood_boost_for": str|None,  # mood que ganha boost suave agora
      "mood_boost": float,         # intensidade (0..0.20)
      "label": str,                # texto curto, pt-PT, para a UI
    }
"""

from datetime import datetime
from typing import Optional

# Nomes pt-PT (Monday=0 .. Sunday=6, como datetime.weekday()).
_DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

# Mood "natural" de cada slot do dia — usado só quando não há sinal mais
# forte (calendário ou pulse). Mapeia para os moods do detect_mood/MOODS.
_SLOT_DEFAULT_MOOD = {
    "madrugada": "saudade",
    "manha":     "cafe",
    "almoco":    None,
    "tarde":     None,
    "prime":     "cultura",
    "noite":     "festa",
}

# Frase de slot para o label da UI.
_SLOT_PHRASE = {
    "madrugada": "de madrugada",
    "manha":     "de manhã",
    "almoco":    "à hora de almoço",
    "tarde":     "à tarde",
    "prime":     "ao fim do dia",
    "noite":     "à noite",
}

# Frase de tempo (ritmo) para o label da UI.
_TEMPO_PHRASE = {
    "lento":  "ritmo calmo",
    "normal": "ritmo normal",
    "rápido": "a rede está acesa",
}

# Multiplicador de frescura por tempo: quanto mais acesa a rede, mais o
# feed favorece o que é recente (o "agora" pesa mais).
_FRESHNESS_MULT = {
    "lento":  0.85,
    "normal": 1.0,
    "rápido": 1.20,
}


def _hour_slot(hour: int) -> str:
    """Bucket de hora-do-dia. `hour` é 0..23 (UTC, igual ao resto do
    scoring que usa now.hour). Portugal continental é UTC+0/UTC+1, por
    isso o desvio é no máximo de 1h — irrelevante para buckets largos."""
    if 0 <= hour < 6:
        return "madrugada"
    if 6 <= hour < 12:
        return "manha"
    if 12 <= hour < 14:
        return "almoco"
    if 14 <= hour < 18:
        return "tarde"
    if 18 <= hour < 22:
        return "prime"
    return "noite"  # 22-24


def _tempo_for(slot: str, weekday: int) -> str:
    """Ritmo da rede a partir do slot + dia da semana.
    weekday: Monday=0 .. Sunday=6."""
    is_weekend_night = weekday in (4, 5) and slot in ("prime", "noite")  # sex/sáb
    if slot == "prime" or is_weekend_night:
        return "rápido"
    if slot == "madrugada":
        return "lento"
    if weekday == 6 and slot in ("manha", "almoco", "tarde"):  # domingo de dia
        return "lento"
    return "normal"


def get_feed_context_weights(
    now: Optional[datetime] = None,
    dominant_mood: Optional[str] = None,
    calendar_theme: Optional[str] = None,
    calendar_label: Optional[str] = None,
) -> dict:
    """Devolve pesos + label contextuais. Determinístico: mesmos inputs →
    mesmo output. Nunca lança — em erro devolve um contexto neutro."""
    try:
        now = now or datetime.utcnow()
        hour = now.hour
        weekday = now.weekday()
        slot = _hour_slot(hour)
        tempo = _tempo_for(slot, weekday)

        # Prioridade do mood a dar boost: evento de calendário > pulse
        # dominante > mood natural do slot. Calendário/pulse são sinais
        # fortes (boost 0.18); o do slot é suave (0.08).
        mood_boost_for = None
        mood_boost = 0.0
        if calendar_theme:
            mood_boost_for, mood_boost = calendar_theme, 0.18
        elif dominant_mood:
            mood_boost_for, mood_boost = dominant_mood, 0.18
        else:
            sd = _SLOT_DEFAULT_MOOD.get(slot)
            if sd:
                mood_boost_for, mood_boost = sd, 0.08

        # Label pt-PT para a UI.
        dia = _DIAS[weekday]
        if calendar_label:
            label = f"{calendar_label} · {_TEMPO_PHRASE[tempo]}"
        else:
            label = f"{dia} {_SLOT_PHRASE[slot]} · {_TEMPO_PHRASE[tempo]}"

        return {
            "tempo": tempo,
            "slot": slot,
            "freshness_mult": _FRESHNESS_MULT[tempo],
            "mood_boost_for": mood_boost_for,
            "mood_boost": mood_boost,
            "label": label,
        }
    except Exception:
        return {
            "tempo": "normal",
            "slot": "tarde",
            "freshness_mult": 1.0,
            "mood_boost_for": None,
            "mood_boost": 0.0,
            "label": "",
        }
