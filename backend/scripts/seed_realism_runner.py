# -*- coding: utf-8 -*-
"""
LUSORAE — SEED NETWORK REALISM Ω · RUNNER
==========================================
Injecta a rede semente curada em `seed_realism_data.py` no MongoDB.

Resultado:
  50 utilizadores, ~500 posts, ~1000 comentários, mapa de follows,
  comunidades (join automático conforme interesses se já existirem),
  trending inicial (hashtags derivam dos próprios posts).

Todos os documentos são marcados com:
  is_seed         = True
  seed_marker     = "lusorae_omega_v1"

Comandos:
  python -m scripts.seed_realism_runner --dry-run     # sample + audit, sem escrever
  python -m scripts.seed_realism_runner --apply       # injecta tudo
  python -m scripts.seed_realism_runner --reset       # apaga tudo o que o seed criou
  python -m scripts.seed_realism_runner --audit       # corre auditoria contra DB

Princípios (Ω):
  - Reprodutível (seed RNG fixa)
  - Idempotente em --reset/--apply (cada execução --apply começa por --reset)
  - Voz humana, gralhas naturais, hashtags raras (~12% dos posts)
  - Timestamps espalhados pelos últimos 14 dias com peso horário PT
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import os
import random
import re
import sys
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

# permite execução directa: python -m scripts.seed_realism_runner
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

# import after sys.path
from scripts.seed_realism_data import (  # noqa: E402
    PERSONAS,
    VOICES,
    COMMENTS,
    HASHTAGS,
)

# ════════════════════════════════════════════════════════════════════════════
# CONFIG
# ════════════════════════════════════════════════════════════════════════════

SEED_MARKER = "lusorae_omega_v1"
DEFAULT_PASSWORD = "LusoraeSeed2026!"
RNG_SEED = 20260214  # reprodutibilidade

POST_WINDOW_DAYS = 14
TARGET_POSTS = 500
TARGET_COMMENTS = 1000

# Distribuição horária realista de publicação (PT, fuso de Lisboa)
# (hora_inicio, hora_fim, peso) — soma normalizada internamente
HOUR_WEIGHTS = [
    (7, 9, 0.07),     # café manhã
    (9, 12, 0.10),    # trabalho de manhã (menos)
    (12, 14, 0.18),   # almoço — pico
    (14, 17, 0.08),   # tarde
    (17, 19, 0.10),   # saída do trabalho
    (19, 22, 0.28),   # prime evening — pico
    (22, 24, 0.13),   # noite
    (0, 2, 0.04),     # madrugada
    (2, 7, 0.02),     # quase ninguém
]


# Índices da tupla persona (ver docstring em seed_realism_data.py):
# 0=id 1=first 2=last 3=username 4=age 5=city 6=region 7=freguesia
# 8=prof 9=bio 10=team 11=mood 12=interests 13=voice_tag
# 14=p_daily_post 15=p_comment 16=p_reply 17=p_dm 18=photo_brief
I_USER, I_AGE, I_CITY, I_REGION, I_FREG = 3, 4, 5, 6, 7
I_PROF, I_BIO, I_TEAM, I_MOOD, I_INTERESTS, I_VOICE = 8, 9, 10, 11, 12, 13
I_P_POST, I_P_COMMENT, I_P_REPLY, I_P_DM, I_PHOTO = 14, 15, 16, 17, 18


# Posts por persona — peso = p_daily_post; reescalado para somar TARGET_POSTS
def compute_post_counts(personas: list[tuple]) -> dict[str, int]:
    weights = {p[I_USER]: float(p[I_P_POST]) for p in personas}
    total_w = sum(weights.values())
    raw = {u: TARGET_POSTS * w / total_w for u, w in weights.items()}
    # arredondamento Hare–Niemeyer (mantém o total exacto)
    floored = {u: int(v) for u, v in raw.items()}
    remainder = TARGET_POSTS - sum(floored.values())
    leftovers = sorted(
        ((raw[u] - floored[u], u) for u in raw), reverse=True
    )
    for i in range(remainder):
        _, u = leftovers[i % len(leftovers)]
        floored[u] += 1
    # mínimo 1, máximo 22 (variação humana)
    for u in floored:
        floored[u] = max(1, min(22, floored[u]))
    return floored


# ════════════════════════════════════════════════════════════════════════════
# VOZ HUMANA — substituição de tokens + gralhas controladas
# ════════════════════════════════════════════════════════════════════════════

PLACEHOLDER_RE = re.compile(r"\$(cidade|bairro|time|hashtag)")


def substitute_placeholders(text: str, persona: tuple, rng: random.Random) -> str:
    """$cidade $bairro $time $hashtag → variações humanas reais."""
    city = persona[I_CITY]
    bairro = persona[I_FREG] if persona[I_FREG] else city
    hour = f"{rng.randint(6, 23):02d}h{rng.choice(['00', '14', '37', '52', '17', '23', '08'])}"

    def repl(m: re.Match) -> str:
        key = m.group(1)
        if key == "cidade":
            return city
        if key == "bairro":
            return bairro
        if key == "time":
            return hour
        if key == "hashtag":
            # raro, devolve "" mais vezes do que tag
            return ""
        return ""

    return PLACEHOLDER_RE.sub(repl, text)


# pequenas adulterações para soar humano (com prob baixa)
GRAULHAS_MAP = [
    ("está", "tá"),
    ("estava", "tava"),
    ("estou", "tou"),
    ("também", "tb"),
    ("não", "n"),
]


def humanize(text: str, rng: random.Random) -> str:
    # remove ponto final em ~40% dos posts curtos (humano comum em PT online)
    out = text
    if len(out) < 90 and rng.random() < 0.4 and out.endswith("."):
        out = out[:-1]
    # ~12% chance de meter uma gralha controlada
    if rng.random() < 0.12:
        before, after = rng.choice(GRAULHAS_MAP)
        out = out.replace(before, after, 1)
    # ~10% chance de meter primeira letra minúscula
    if rng.random() < 0.10 and out and out[0].isupper():
        out = out[0].lower() + out[1:]
    return out


# hashtags aparecem em poucos posts (~12%); quando aparecem, são 1 ou 2 max.
def maybe_attach_hashtag(text: str, persona: tuple, rng: random.Random) -> str:
    p = 0.12
    if rng.random() > p:
        return text
    interests = persona[I_INTERESTS] or []
    # mapeia interesse → bucket de HASHTAGS
    bucket_map = {
        "futebol": "futebol", "cafe": "cafe", "praia": "praia",
        "surf": "praia", "musica": "musica", "cinema": "cultura",
        "livros": "cultura", "tasca": "tasca", "cultura": "cultura",
    }
    candidates: list[str] = []
    for it in interests:
        b = bucket_map.get(it)
        if b and HASHTAGS.get(b):
            candidates.extend(HASHTAGS[b])
    # adiciona um city-tag de baixa frequência
    city = persona[I_CITY].lower().replace(" ", "")
    if rng.random() < 0.5 and city in HASHTAGS.get("cidade", []):
        candidates.append(city)
    if not candidates:
        return text
    tag = rng.choice(candidates)
    sep = " " if not text.endswith(("\n", " ")) else ""
    return f"{text}{sep}#{tag}"


# ════════════════════════════════════════════════════════════════════════════
# TIMESTAMPS REALISTAS
# ════════════════════════════════════════════════════════════════════════════

def random_post_timestamp(rng: random.Random, base: datetime) -> datetime:
    """Devolve timestamp aleatório nos últimos POST_WINDOW_DAYS,
    com peso horário PT realista."""
    days_ago = rng.uniform(0, POST_WINDOW_DAYS)
    day = base - timedelta(days=days_ago)
    # escolhe intervalo horário ponderado
    weights = [w for _, _, w in HOUR_WEIGHTS]
    h_start, h_end, _ = rng.choices(HOUR_WEIGHTS, weights=weights, k=1)[0]
    if h_end <= h_start:
        h_end += 24
    hour_decimal = rng.uniform(h_start, h_end)
    hour = int(hour_decimal) % 24
    minute = int((hour_decimal - int(hour_decimal)) * 60)
    second = rng.randint(0, 59)
    return day.replace(hour=hour, minute=minute, second=second, microsecond=0)


# ════════════════════════════════════════════════════════════════════════════
# GRAFO DE FOLLOWS — heurística realista
# ════════════════════════════════════════════════════════════════════════════

def build_follow_graph(personas: list[tuple], rng: random.Random) -> dict[str, set[str]]:
    """Constrói grafo de follows com mistura:
      - 60% mesma cidade
      - 30% interesses partilhados
      - 15% aleatório
      - 35% bidireccionalidade
    Cada persona segue 10–80 outras (depende da idade — mais novos = mais follows).
    """
    # idx por username
    by_user = {p[I_USER]: p for p in personas}
    usernames = list(by_user.keys())
    graph: dict[str, set[str]] = {u: set() for u in usernames}

    for src_user in usernames:
        src = by_user[src_user]
        age = src[I_AGE]
        # mais novos seguem mais
        if age < 25:
            target = rng.randint(40, 80)
        elif age < 35:
            target = rng.randint(25, 60)
        elif age < 45:
            target = rng.randint(15, 45)
        elif age < 55:
            target = rng.randint(12, 30)
        else:
            target = rng.randint(10, 25)

        # candidatos ponderados
        pool: list[tuple[str, float]] = []
        for dst_user in usernames:
            if dst_user == src_user:
                continue
            dst = by_user[dst_user]
            score = 0.0
            # mesma cidade
            if src[I_CITY] == dst[I_CITY]:
                score += 0.6
            # mesma região (mas cidade diferente)
            elif src[I_REGION] == dst[I_REGION]:
                score += 0.15
            # interesses partilhados
            shared = set(src[I_INTERESTS] or []) & set(dst[I_INTERESTS] or [])
            score += 0.10 * len(shared)
            # mesmo clube
            if src[I_TEAM] != "nenhum" and src[I_TEAM] == dst[I_TEAM]:
                score += 0.15
            # mood semelhante
            if src[I_MOOD] == dst[I_MOOD]:
                score += 0.05
            # diferença etária — distância suaviza
            age_diff = abs(src[I_AGE] - dst[I_AGE])
            score += max(0, 0.10 - age_diff * 0.005)
            # ruído aleatório (descoberta orgânica)
            score += rng.uniform(0, 0.08)
            pool.append((dst_user, max(score, 0.01)))

        # selecciona target sem repetir, ponderado
        pool.sort(key=lambda x: -x[1])
        chosen: set[str] = set()
        # 70% dos picks vão aos top da pool, 30% à cauda longa (descoberta orgânica)
        top_cut = pool[: max(target * 2, 12)]
        rest_cut = [x for x in pool if x not in top_cut]
        while len(chosen) < target:
            use_top = rng.random() < 0.7 if (top_cut and rest_cut) else bool(top_cut)
            if use_top and top_cut:
                weights = [s for _, s in top_cut]
                pick = rng.choices(top_cut, weights=weights, k=1)[0]
                top_cut.remove(pick)
                chosen.add(pick[0])
            elif rest_cut:
                pick = rng.choice(rest_cut)
                rest_cut.remove(pick)
                chosen.add(pick[0])
            else:
                break
        graph[src_user] = chosen

    # bidireccionalidade
    for u in usernames:
        for v in list(graph[u]):
            if rng.random() < 0.35:
                graph[v].add(u)
    return graph


# ════════════════════════════════════════════════════════════════════════════
# COMENTÁRIOS — selecção de comentadores e tom
# ════════════════════════════════════════════════════════════════════════════

def classify_post_tone(content: str, voice_tag: str) -> str:
    """Heurística leve para escolher tipos de comentário coerentes."""
    c = content.lower()
    if any(w in c for w in ["?", "alguém sabe", "como", "onde", "quanto"]):
        return "question"
    if voice_tag in {"ironica_noite", "cansada_honesta"} or "kkk" in c:
        return "joke_or_irony"
    if voice_tag in {"pai_cansado", "mae_cansada", "enfermeira_urgencia"}:
        return "empathy_or_agree"
    if voice_tag in {"surfista_chill", "fotografo_amador", "musico_local"}:
        return "praise_light"
    return "mixed"


def pick_comment_text(post_tone: str, commenter_voice: str, rng: random.Random) -> str:
    """Escolhe uma reacção curta consistente."""
    if post_tone == "question":
        return rng.choice(COMMENTS["question"] + COMMENTS["follow_up"])
    if post_tone == "joke_or_irony":
        if rng.random() < 0.65:
            return rng.choice(COMMENTS["joke"] + COMMENTS["irony"])
        return rng.choice(COMMENTS["agree"])
    if post_tone == "empathy_or_agree":
        return rng.choice(COMMENTS["empathy"] + COMMENTS["agree"])
    if post_tone == "praise_light":
        return rng.choice(COMMENTS["praise_light"] + COMMENTS["agree"])
    # mixed
    bag = (COMMENTS["agree"] * 3 + COMMENTS["joke"] * 2 + COMMENTS["irony"]
           + COMMENTS["follow_up"] + COMMENTS["praise_light"]
           + COMMENTS["empathy"] + COMMENTS["disagree"])
    if rng.random() < 0.06:
        bag = COMMENTS["city_local"]
    return rng.choice(bag)


def weighted_commenter_pick(
    author: str,
    personas_by_user: dict[str, tuple],
    follow_graph: dict[str, set[str]],
    rng: random.Random,
    n: int,
) -> list[str]:
    """Selecciona n comentadores diferentes, com peso por relação."""
    author_p = personas_by_user[author]
    pool = []
    for u, p in personas_by_user.items():
        if u == author:
            continue
        score = 0.05  # baseline
        # se segue o autor → mais provável comentar
        if author in follow_graph.get(u, set()):
            score += 0.35 * float(p[I_P_COMMENT])  # p_comment_on_followed
        # se autor segue o comentador → reciprocidade
        if u in follow_graph.get(author, set()):
            score += 0.15
        # mesma cidade
        if author_p[I_CITY] == p[I_CITY]:
            score += 0.20
        # interesses partilhados
        shared = set(author_p[I_INTERESTS] or []) & set(p[I_INTERESTS] or [])
        score += 0.08 * len(shared)
        # voice tag compatível
        if author_p[I_VOICE] == p[I_VOICE]:
            score += 0.10
        score = max(score, 0.01)
        pool.append((u, score))
    # sample sem reposição
    chosen = []
    candidates = list(pool)
    for _ in range(n):
        if not candidates:
            break
        weights = [s for _, s in candidates]
        pick = rng.choices(candidates, weights=weights, k=1)[0]
        candidates.remove(pick)
        chosen.append(pick[0])
    return chosen


# ════════════════════════════════════════════════════════════════════════════
# UTILITÁRIOS USER
# ════════════════════════════════════════════════════════════════════════════

# bcrypt sync (não queremos asyncify aqui)
import bcrypt  # noqa: E402


def bcrypt_hash(password: str) -> str:
    """Compatível com auth_security._hash_password_sync (bcrypt cost 12)."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def email_for(persona: tuple) -> str:
    first = persona[1].lower()
    last = persona[2].lower()
    # remove diacríticos
    import unicodedata
    nfkd = unicodedata.normalize("NFKD", f"{first}.{last}")
    base = "".join(ch for ch in nfkd if not unicodedata.combining(ch))
    base = re.sub(r"[^a-z.]", "", base)
    return f"{base}@seed.lusorae.pt"


# ════════════════════════════════════════════════════════════════════════════
# GERAÇÃO COMPLETA — em memória, depois insere
# ════════════════════════════════════════════════════════════════════════════

def generate_dataset(password: str, rng: random.Random) -> dict[str, list[dict]]:
    """Devolve dict com listas 'users', 'posts', 'comments' prontos a inserir.
    Também imprime um sumário do mapa de follows / comunidades.
    """
    now = datetime.now(timezone.utc)
    personas_by_user = {p[3]: p for p in PERSONAS}

    # 1) FOLLOWS
    print("→ construir grafo de follows…")
    graph = build_follow_graph(PERSONAS, rng)
    print(f"  grafo: {sum(len(v) for v in graph.values())} arestas (média "
          f"{sum(len(v) for v in graph.values()) / max(len(graph), 1):.1f}/persona)")

    # 2) USERS (calcula passes 2x para incluir followers/following)
    pw_hash = bcrypt_hash(password)
    print(f"→ password hash bcrypt computado (cost 12)")
    users: list[dict] = []
    user_id_by_username: dict[str, str] = {}
    for p in PERSONAS:
        (pid, first, last, username, age, city, region, freguesia, prof, bio,
         team, mood, interests, voice_tag, p_post, p_comment, p_reply, p_dm,
         photo) = p
        uid = str(uuid.uuid4())
        user_id_by_username[username] = uid
        users.append({
            "id": uid,
            "email": email_for(p),
            "username": username.lower(),
            "name": f"{first} {last}",
            "password_hash": pw_hash,
            "bio": bio,
            "avatar": "",  # sem geração de imagem
            "banner": "",
            "verified": False,
            "private": False,
            "onboarded": True,
            "followers": [],
            "following": [],
            "bookmarks": [],
            "last_seen": (now - timedelta(hours=rng.randint(0, 36))).isoformat(),
            "created_at": (now - timedelta(days=POST_WINDOW_DAYS + rng.randint(0, 10))).isoformat(),
            "city": city,
            "freguesia": freguesia,
            "region": region,
            "mood_initial": mood,
            "team": "" if team == "nenhum" else team,
            "bio_slots": {
                "profession": prof,
                "interests": ", ".join(interests[:3]),
                "photo_brief": photo,
            },
            "boa_noite_enabled": True,
            "cafezinho_enabled": False,
            "feed_mix": {"friends": 40, "interest": 30, "place": 30},
            "login_alerts_enabled": True,
            "show_online": True,
            "typing_indicator": True,
            "searchable": True,
            "pulse_opt_out": False,
            "consent": {
                "terms_accepted": True,
                "age_confirmed": True,
                "marketing_opt_in": False,
                "terms_version": 1,
                "privacy_version": 1,
                "accepted_at": (now - timedelta(days=POST_WINDOW_DAYS + 1)).isoformat(),
            },
            # metadados de seed
            "is_seed": True,
            "seed_marker": SEED_MARKER,
            "seed_persona_id": pid,
            "seed_voice_tag": voice_tag,
            "seed_photo_brief": photo,
            "seed_interests": interests,
            "seed_age": age,
            "seed_p_post": p_post,
            "seed_p_comment": p_comment,
            "seed_p_reply": p_reply,
            "seed_p_dm": p_dm,
        })

    # popula followers/following a partir do grafo
    by_uid = {u["id"]: u for u in users}
    for src_user, targets in graph.items():
        src_uid = user_id_by_username[src_user]
        for dst_user in targets:
            dst_uid = user_id_by_username[dst_user]
            by_uid[src_uid]["following"].append(dst_uid)
            by_uid[dst_uid]["followers"].append(src_uid)

    # 4) POSTS
    print("→ gerar posts (~500)…")
    post_counts = compute_post_counts(PERSONAS)
    posts: list[dict] = []
    voice_fragments_used: dict[str, list[int]] = defaultdict(list)  # diversidade
    for p in PERSONAS:
        username = p[I_USER]
        voice_tag = p[I_VOICE]
        n = post_counts[username]
        voice_pool = VOICES.get(voice_tag, VOICES["cansada_honesta"])
        # baralha o pool por persona (sem reposição imediata)
        shuffled = list(voice_pool)
        rng.shuffle(shuffled)
        for i in range(n):
            fragment = shuffled[i % len(shuffled)]
            text = substitute_placeholders(fragment, p, rng)
            text = humanize(text, rng)
            text = maybe_attach_hashtag(text, p, rng)
            ts = random_post_timestamp(rng, now)
            hashtags = list({m.group(1).lower() for m in re.finditer(
                r"#([\wáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ-]+)", text)})
            posts.append({
                "id": str(uuid.uuid4()),
                "author_id": user_id_by_username[username],
                "content": text,
                "image": "",
                "images": [],
                "likes": [],
                "bookmarks": [],
                "reposts": [],
                "reactions": {},
                "hashtags": hashtags,
                "community_id": None,
                "quote_of": None,
                "poll": None,
                "reply_audience": "everyone",
                "audience_ring": "publico",
                "is_draft": False,
                "scheduled_at": None,
                "edit_history": [],
                "views": rng.randint(0, 14),
                "created_at": ts.isoformat(),
                "is_seed": True,
                "seed_marker": SEED_MARKER,
            })
    posts.sort(key=lambda x: x["created_at"])
    print(f"  {len(posts)} posts gerados")

    # adiciona alguns likes/reposts realistas (poucos, esparsos)
    print("→ semear likes & reposts esparsos…")
    for post in posts:
        author = post["author_id"]
        # candidatos = seguidores do autor + alguma sobreposição de interesses
        n_likes = rng.choices([0, 1, 2, 3, 5, 8], weights=[35, 25, 18, 12, 6, 4], k=1)[0]
        n_reposts = rng.choices([0, 1, 2], weights=[88, 10, 2], k=1)[0]
        candidates = [u["id"] for u in users if u["id"] != author]
        rng.shuffle(candidates)
        post["likes"] = candidates[:n_likes]
        post["reposts"] = candidates[n_likes:n_likes + n_reposts]

    # 4) COMENTÁRIOS (~1000)
    print("→ gerar ~1000 comentários cruzados…")
    comments: list[dict] = []
    # distribui comentários por post (lei de potência leve)
    # 40% dos posts ficam sem comentário; outros recebem 1-8 ponderado
    n_total = TARGET_COMMENTS
    comment_assignments: list[tuple[dict, int]] = []
    for post in posts:
        n = rng.choices([0, 1, 2, 3, 4, 6, 8],
                        weights=[40, 24, 14, 9, 6, 4, 3], k=1)[0]
        comment_assignments.append((post, n))
    raw_total = sum(n for _, n in comment_assignments)
    # reescala para ficar próximo de TARGET_COMMENTS
    scale = n_total / max(raw_total, 1)
    rescaled: list[tuple[dict, int]] = []
    for post, n in comment_assignments:
        rescaled.append((post, max(0, round(n * scale))))
    # ajusta totais finais
    diff = n_total - sum(n for _, n in rescaled)
    if diff != 0:
        # adiciona/remove de posts aleatórios
        for _ in range(abs(diff)):
            idx = rng.randrange(len(rescaled))
            post, n = rescaled[idx]
            n_new = max(0, n + (1 if diff > 0 else -1))
            rescaled[idx] = (post, n_new)

    for post, n_comments in rescaled:
        if n_comments == 0:
            continue
        author_uid = post["author_id"]
        author_username = next(u for u, uid in user_id_by_username.items() if uid == author_uid)
        author_p = personas_by_user[author_username]
        post_tone = classify_post_tone(post["content"], author_p[I_VOICE])
        commenters = weighted_commenter_pick(
            author_username, personas_by_user, graph, rng, n_comments)
        # constrói uma "thread" — 75% comentários root, 25% replies a alguém anterior
        thread_root_ids: list[str] = []
        for i, commenter_username in enumerate(commenters):
            commenter_p = personas_by_user[commenter_username]
            text = pick_comment_text(post_tone, commenter_p[I_VOICE], rng)
            text = humanize(text, rng)
            parent_id = None
            if i > 0 and thread_root_ids and rng.random() < 0.25:
                parent_id = rng.choice(thread_root_ids)
            ts = datetime.fromisoformat(post["created_at"]) + timedelta(
                minutes=rng.randint(2, 60 * 24 * 3),
                seconds=rng.randint(0, 59))
            cid = str(uuid.uuid4())
            comment = {
                "id": cid,
                "post_id": post["id"],
                "author_id": user_id_by_username[commenter_username],
                "content": text,
                "created_at": ts.isoformat(),
                "parent_id": parent_id,
                "replies_count": 0,
                "community_id": None,
                "is_seed": True,
                "seed_marker": SEED_MARKER,
            }
            comments.append(comment)
            if parent_id is None:
                thread_root_ids.append(cid)
        # actualiza replies_count agora
        replies_by_parent: Counter = Counter()
        for c in comments:
            if c["post_id"] == post["id"] and c.get("parent_id"):
                replies_by_parent[c["parent_id"]] += 1
        for c in comments:
            if c["id"] in replies_by_parent:
                c["replies_count"] = replies_by_parent[c["id"]]
    print(f"  {len(comments)} comentários gerados")

    return {
        "users": users,
        "posts": posts,
        "comments": comments,
        "graph": graph,
        "user_id_by_username": user_id_by_username,
    }


# ════════════════════════════════════════════════════════════════════════════
# DB OPERATIONS
# ════════════════════════════════════════════════════════════════════════════

async def get_db():
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    return client, client[db_name]


async def do_reset() -> dict[str, int]:
    client, db = await get_db()
    try:
        r1 = await db.users.delete_many({"seed_marker": SEED_MARKER})
        r2 = await db.posts.delete_many({"seed_marker": SEED_MARKER})
        r3 = await db.comments.delete_many({"seed_marker": SEED_MARKER})
        # remove referências de likes/reposts nos posts não-seed (raro mas seguro)
        # — neste contexto seed e não-seed estão isolados; saltamos.
        return {
            "users_deleted": r1.deleted_count,
            "posts_deleted": r2.deleted_count,
            "comments_deleted": r3.deleted_count,
        }
    finally:
        client.close()


async def do_apply(dataset: dict[str, list]) -> dict[str, int]:
    client, db = await get_db()
    try:
        await db.users.delete_many({"seed_marker": SEED_MARKER})
        await db.posts.delete_many({"seed_marker": SEED_MARKER})
        await db.comments.delete_many({"seed_marker": SEED_MARKER})
        # inserts em lote
        if dataset["users"]:
            await db.users.insert_many(dataset["users"])
        # posts em batches de 200
        for i in range(0, len(dataset["posts"]), 200):
            await db.posts.insert_many(dataset["posts"][i:i + 200])
        for i in range(0, len(dataset["comments"]), 300):
            await db.comments.insert_many(dataset["comments"][i:i + 300])

        # join automático nas comunidades existentes (por interesse)
        joins = 0
        # mapa de interesse → slug heurístico
        slug_map = {
            "futebol": ["futebol", "primeira-liga", "selecao"],
            "cinema": ["cinema", "filmes"],
            "livros": ["livros", "leitura"],
            "musica": ["musica", "concertos"],
            "fotografia": ["fotografia", "foto"],
            "surf": ["surf", "praia"],
            "corrida": ["corrida", "running"],
            "caminhadas": ["caminhadas", "trilhos"],
            "culinaria": ["culinaria", "receitas"],
            "gaming": ["gaming", "jogos"],
            "tecnologia": ["tecnologia", "tech"],
            "universidade": ["universidade", "estudantes"],
            "empreendedorismo": ["empreendedorismo", "startups"],
            "jardinagem": ["jardinagem", "horta"],
            "pesca": ["pesca"],
            "motas": ["motas", "moto"],
            "familia": ["familia"],
            "series": ["series", "tv"],
            "cafe": ["cafe", "cafes"],
            "cultura": ["cultura"],
        }
        for u in dataset["users"]:
            for interest in u.get("seed_interests", []):
                for slug_try in slug_map.get(interest, []):
                    comm = await db.communities.find_one(
                        {"slug": slug_try}, {"_id": 0, "id": 1, "members": 1})
                    if comm:
                        if u["id"] not in (comm.get("members") or []):
                            await db.communities.update_one(
                                {"id": comm["id"]},
                                {"$addToSet": {"members": u["id"]}})
                            joins += 1
                        break  # 1 community per interest

        return {
            "users_inserted": len(dataset["users"]),
            "posts_inserted": len(dataset["posts"]),
            "comments_inserted": len(dataset["comments"]),
            "community_joins": joins,
        }
    finally:
        client.close()


# ════════════════════════════════════════════════════════════════════════════
# AUDITORIA — Ω validação anti-IA
# ════════════════════════════════════════════════════════════════════════════

def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def audit_dataset(dataset: dict[str, list], verbose: bool = False) -> dict[str, Any]:
    posts = dataset["posts"]
    comments = dataset["comments"]
    users = dataset["users"]

    # 1) distribuição etária
    age_buckets = Counter()
    for u in users:
        a = u["seed_age"]
        if a < 25:
            age_buckets["18-24"] += 1
        elif a < 35:
            age_buckets["25-34"] += 1
        elif a < 45:
            age_buckets["35-44"] += 1
        elif a < 55:
            age_buckets["45-54"] += 1
        else:
            age_buckets["55+"] += 1

    # 2) distribuição geográfica
    cities = Counter(u["city"] for u in users)

    # 3) post stats
    post_lens = [len(p["content"]) for p in posts]
    no_hashtag = sum(1 for p in posts if not p["hashtags"])
    has_lowercase_start = sum(1 for p in posts if p["content"] and p["content"][0].islower())
    has_punct_skip = sum(1 for p in posts if not p["content"].rstrip().endswith((".", "!", "?")))

    # diversidade lexical — Jaccard entre amostras random
    bag_per_user = defaultdict(set)
    for p in posts:
        words = set(re.findall(r"[a-záéíóúâêîôûãõç]{3,}", p["content"].lower()))
        bag_per_user[p["author_id"]].update(words)
    bag_list = [b for b in bag_per_user.values() if b]
    pair_jacc = []
    if len(bag_list) >= 2:
        rng = random.Random(99)
        for _ in range(60):
            a, b = rng.sample(bag_list, 2)
            pair_jacc.append(jaccard(a, b))
    mean_jacc = sum(pair_jacc) / max(len(pair_jacc), 1)

    # 4) follow stats
    graph = dataset.get("graph") or {}
    sizes = [len(v) for v in graph.values()] if graph else []

    # 5) comment naturalness — quantos posts têm ≥1 comentário
    posts_with_comments = len({c["post_id"] for c in comments})

    # 6) timestamps spread
    ts_hours = Counter()
    for p in posts:
        dt = datetime.fromisoformat(p["created_at"])
        ts_hours[dt.hour] += 1

    report = {
        "users_total": len(users),
        "posts_total": len(posts),
        "comments_total": len(comments),
        "age_distribution": dict(age_buckets),
        "city_distribution": dict(cities),
        "post_len_avg": round(sum(post_lens) / max(len(post_lens), 1), 1),
        "post_len_max": max(post_lens) if post_lens else 0,
        "post_len_p95": sorted(post_lens)[int(len(post_lens) * 0.95)] if post_lens else 0,
        "posts_without_hashtag_pct": round(100 * no_hashtag / max(len(posts), 1), 1),
        "posts_lowercase_start_pct": round(100 * has_lowercase_start / max(len(posts), 1), 1),
        "posts_no_terminal_punct_pct": round(100 * has_punct_skip / max(len(posts), 1), 1),
        "lexical_jaccard_mean": round(mean_jacc, 3),
        "follow_size_min": min(sizes) if sizes else 0,
        "follow_size_max": max(sizes) if sizes else 0,
        "follow_size_avg": round(sum(sizes) / max(len(sizes), 1), 1),
        "posts_with_comments": posts_with_comments,
        "posts_with_comments_pct": round(100 * posts_with_comments / max(len(posts), 1), 1),
        "hour_distribution": dict(sorted(ts_hours.items())),
    }

    # CHECKS
    checks = []
    checks.append(("post_len_max <= 280", report["post_len_max"] <= 280))
    checks.append(("posts_without_hashtag >= 70%", report["posts_without_hashtag_pct"] >= 70))
    checks.append(("posts_lowercase_start >= 10%", report["posts_lowercase_start_pct"] >= 10))
    checks.append(("lexical_jaccard_mean < 0.20", report["lexical_jaccard_mean"] < 0.20))
    checks.append(("follow_size in [10..80]",
                   report["follow_size_min"] >= 10 and report["follow_size_max"] <= 80))
    checks.append(("age has all 5 buckets", len(report["age_distribution"]) == 5))
    checks.append(("cities >= 8 different", len(report["city_distribution"]) >= 8))
    checks.append(("evening hours (19-22) > morning (7-9) volume",
                   sum(report["hour_distribution"].get(h, 0) for h in (19, 20, 21))
                   > sum(report["hour_distribution"].get(h, 0) for h in (7, 8, 9))))
    report["checks"] = [(name, bool(ok)) for name, ok in checks]
    report["checks_pass"] = sum(1 for _, ok in checks if ok)
    report["checks_total"] = len(checks)

    if verbose:
        print("\n──────── AUDITORIA Ω ────────")
        for k, v in report.items():
            if k != "checks":
                print(f"  {k}: {v}")
        print("\n  Checks:")
        for name, ok in report["checks"]:
            badge = "✓" if ok else "✗"
            print(f"   {badge} {name}")
        print(f"\n  Score: {report['checks_pass']}/{report['checks_total']}\n")

    return report


def sample_posts(dataset: dict[str, list], n: int = 20) -> None:
    print("\n──────── 20 POSTS DE AMOSTRA (cego) ────────")
    rng = random.Random(7)
    sample = rng.sample(dataset["posts"], min(n, len(dataset["posts"])))
    user_by_uid = {u["id"]: u for u in dataset["users"]}
    for p in sample:
        u = user_by_uid[p["author_id"]]
        ts = datetime.fromisoformat(p["created_at"]).strftime("%a %H:%M")
        print(f"\n  @{u['username']} ({u['seed_age']}, {u['city']}) · {ts}")
        print(f"    {p['content']}")
    print("\n──────────────────────────────────────────\n")


# ════════════════════════════════════════════════════════════════════════════
# CLI
# ════════════════════════════════════════════════════════════════════════════

async def audit_against_db() -> dict[str, Any]:
    client, db = await get_db()
    try:
        users = await db.users.find({"seed_marker": SEED_MARKER}, {"_id": 0}).to_list(None)
        posts = await db.posts.find({"seed_marker": SEED_MARKER}, {"_id": 0}).to_list(None)
        comments = await db.comments.find({"seed_marker": SEED_MARKER}, {"_id": 0}).to_list(None)
    finally:
        client.close()
    # reconstrói grafo para auditoria
    graph = {u["username"]: set() for u in users}
    by_uid = {u["id"]: u for u in users}
    for u in users:
        for follow_uid in u.get("following", []):
            if follow_uid in by_uid:
                graph[u["username"]].add(by_uid[follow_uid]["username"])
    return audit_dataset(
        {"users": users, "posts": posts, "comments": comments, "graph": graph},
        verbose=True)


def main():
    parser = argparse.ArgumentParser(description="Lusorae Ω Seed Network Runner")
    parser.add_argument("--apply", action="store_true", help="Insere no DB")
    parser.add_argument("--dry-run", action="store_true", help="Gera em memória + audita + sample")
    parser.add_argument("--reset", action="store_true", help="Apaga todos os docs seed_marker=v1")
    parser.add_argument("--audit", action="store_true", help="Audita o que já está em DB")
    parser.add_argument("--password", default=DEFAULT_PASSWORD,
                        help="Password aplicada a todas as personas")
    parser.add_argument("--sample", type=int, default=20,
                        help="Quantos posts mostrar em --dry-run")
    args = parser.parse_args()

    if not any([args.apply, args.dry_run, args.reset, args.audit]):
        parser.print_help()
        return 1

    if args.audit:
        return asyncio.run(audit_against_db()) and 0

    if args.reset:
        result = asyncio.run(do_reset())
        print(f"✓ Reset: {result}")
        return 0

    rng = random.Random(RNG_SEED)
    print(f"════ Lusorae Ω Seed Network ════")
    print(f"  marcador: {SEED_MARKER}")
    print(f"  password: {args.password}")
    print(f"  RNG seed: {RNG_SEED}")
    print()
    dataset = generate_dataset(args.password, rng)
    sample_posts(dataset, args.sample)
    audit_dataset(dataset, verbose=True)

    if args.dry_run:
        print("✓ Dry run OK — nada foi escrito.")
        return 0

    if args.apply:
        print("→ A inserir em MongoDB…")
        result = asyncio.run(do_apply(dataset))
        print(f"✓ Apply: {result}")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
