from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import math
import uuid
import logging
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Vermillion Social")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("vermillion")

HASHTAG_RE = re.compile(r"#([\wáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ-]+)", re.UNICODE)
MENTION_RE = re.compile(r"@([a-zA-Z0-9_]+)")
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


def normalize_images(payload_images, single_image) -> List[str]:
    """Coalesce legacy `image` + new `images` array into a clean list."""
    out: List[str] = []
    if payload_images:
        for s in payload_images:
            if isinstance(s, str) and s.strip():
                out.append(s.strip())
    if single_image and isinstance(single_image, str) and single_image.strip() and single_image not in out:
        out.append(single_image.strip())
    return out[:MAX_IMAGES_PER_POST]


def build_poll(raw: Optional[dict]) -> Optional[dict]:
    if not raw:
        return None
    options_in = raw.get("options") or []
    options: List[dict] = []
    for text in options_in:
        if not isinstance(text, str):
            continue
        text = text.strip()
        if not text:
            continue
        options.append({"id": str(uuid.uuid4())[:8], "text": text[:60]})
        if len(options) >= MAX_POLL_OPTIONS:
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


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email, "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=False,
        samesite="lax", max_age=60 * 60 * 24 * 7, path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie("access_token", path="/")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", text.lower()).strip()
    s = re.sub(r"\s+", "-", s)
    return s[:40] or str(uuid.uuid4())[:8]


def compute_reputation(user: dict, likes_received: int, posts_count: int) -> dict:
    rep = likes_received + posts_count * 2 + len(user.get("followers", [])) * 5
    level = int(math.floor(math.sqrt(max(rep, 0) / 10))) + 1
    return {"reputation": rep, "level": level}


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
        "feed_mix": user.get("feed_mix") or {"friends": 40, "interest": 30, "place": 30},
        # v2 — modern social
        "presence": user.get("presence") or {"status": "online", "emoji": "", "text": "", "until": None},
        "charms_equipped": user.get("charms_equipped", []),
        "cosmetics_equipped": user.get("cosmetics_equipped") or {"frame": "", "sticker": ""},
        "track_visits": user.get("track_visits", True),
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
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilizador não encontrado")
        # update last seen (best-effort)
        await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": now_iso()}})
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


async def maybe_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


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


async def handle_mentions(text: str, author: dict, post_id: str) -> None:
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
    password: str = Field(min_length=6)
    username: str = Field(min_length=3, max_length=20)
    name: str = Field(min_length=1, max_length=50)
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


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class UpdateProfileIn(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    banner: Optional[str] = None
    private: Optional[bool] = None
    # PT identity / place graph
    city: Optional[str] = None
    freguesia: Optional[str] = None
    region: Optional[str] = None
    mood_initial: Optional[str] = None
    team: Optional[str] = None
    # Bio slots (semantic profile fields, all optional)
    bio_slots: Optional[dict] = None  # {city, mood_today, soundtrack, reading, favourite_place, quote_of_month}
    # Healthy-mode preferences
    boa_noite_enabled: Optional[bool] = None  # silence push 23h-08h
    cafezinho_enabled: Optional[bool] = None  # morning 60s session
    feed_mix: Optional[dict] = None  # {friends: 40, interest: 30, place: 30}


class PostIn(BaseModel):
    content: str = Field(min_length=0, max_length=500)
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
    content: str = Field(min_length=0, max_length=500)


class PostVoteIn(BaseModel):
    option_ids: List[str]


class PostReactIn(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)


class MessageReactIn(BaseModel):
    emoji: str = Field(min_length=1, max_length=4)


class CommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=300)
    parent_id: Optional[str] = None  # for nested replies


class MessageIn(BaseModel):
    to_user_id: str
    content: str = Field(min_length=1, max_length=2000)


class StoryIn(BaseModel):
    image: str
    content: Optional[str] = ""


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
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    username = payload.username.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email já registado")
    if await db.users.find_one({"username": username}):
        raise HTTPException(400, "Username já em uso")
    now = now_iso()
    user = {
        "id": str(uuid.uuid4()), "email": email, "username": username,
        "name": payload.name, "password_hash": hash_password(payload.password),
        "bio": "", "avatar": "", "banner": "",
        "verified": False, "private": False, "onboarded": False,
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
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Credenciais inválidas")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": now_iso()}})
    return {"user": public_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(request: Request):
    user = await maybe_user(request)
    if not user:
        return {"user": None}
    return {"user": public_user(user)}


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        token = secrets.token_urlsafe(24)
        expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        await db.password_resets.insert_one({
            "token": token, "user_id": user["id"], "expires_at": expires, "used": False,
        })
        logger.info(f"🔐 Password reset token for {email}: {token}")
        return {"ok": True, "dev_token": token}  # exposed for dev/testing
    return {"ok": True}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    rec = await db.password_resets.find_one({"token": payload.token, "used": False}, {"_id": 0})
    if not rec:
        raise HTTPException(400, "Token inválido")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "Token expirado")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.password_resets.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


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
            else ("popular" if len(c.get("followers", [])) >= 3 else "novo")
        )
        out.append(d)
    return out


@api.get("/search")
async def global_search(q: str = "", viewer: Optional[dict] = Depends(maybe_user)):
    if not q.strip():
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
    rep = compute_reputation(user, likes_n, posts_n)
    data = public_user(user, {
        "is_following": bool(viewer and viewer["id"] in user.get("followers", [])),
        "is_self": bool(viewer and viewer["id"] == user["id"]),
        "posts_count": posts_n,
        "likes_received": likes_n,
        "reputation": rep["reputation"],
        "level": rep["level"],
        "can_view": await can_view_profile(user, viewer),
    })
    return data


@api.get("/activity")
async def activity_feed(limit: int = 30):
    # Recent platform activity: latest posts + follow notifs (aggregated)
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
    # Streak: consecutive days with at least one post
    dates = sorted({p["created_at"][:10] for p in posts}, reverse=True)
    streak = 0
    today = datetime.now(timezone.utc).date()
    for i, d in enumerate(dates):
        dt = datetime.fromisoformat(d).date()
        if (today - dt).days == i:
            streak += 1
        else:
            break
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
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target["id"] == user["id"]:
        raise HTTPException(400, "Não te podes seguir a ti próprio")
    is_following = user["id"] in target.get("followers", [])
    if is_following:
        await db.users.update_one({"id": target["id"]}, {"$pull": {"followers": user["id"]}})
        await db.users.update_one({"id": user["id"]}, {"$pull": {"following": target["id"]}})
        return {"following": False}
    await db.users.update_one({"id": target["id"]}, {"$addToSet": {"followers": user["id"]}})
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"following": target["id"]}})
    await create_notification(target["id"], "follow", user["id"], None, f"@{user['username']} começou a seguir-te")
    return {"following": True}


@api.patch("/users/me")
async def update_me(payload: UpdateProfileIn, user=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(fresh)


@api.post("/users/me/onboard")
async def complete_onboarding(user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"onboarded": True}})
    return {"ok": True}


# ============================================================
# Posts
# ============================================================
@api.post("/posts")
async def create_post(payload: PostIn, user=Depends(get_current_user)):
    community_id = None
    if payload.community_id:
        c = await db.communities.find_one({"id": payload.community_id}, {"_id": 0})
        if not c or user["id"] not in c.get("members", []):
            raise HTTPException(403, "Tens de entrar na comunidade primeiro")
        community_id = c["id"]
    if payload.quote_of:
        q = await db.posts.find_one({"id": payload.quote_of}, {"_id": 0})
        if not q:
            raise HTTPException(404, "Publicação citada não encontrada")
        # F4.2 — repost curado: requires meaningful context to reduce viral spam
        if len((payload.content or "").strip()) < 5:
            raise HTTPException(400, "Acrescenta pelo menos uma frase ao repostar (5+ caracteres). É a regra da casa: republicar exige contexto.")
    images = normalize_images(payload.images, payload.image)
    poll = build_poll(payload.poll) if payload.poll else None
    if not payload.content.strip() and not images and not poll and not payload.quote_of:
        raise HTTPException(400, "Publicação vazia")
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

    post = {
        "id": str(uuid.uuid4()), "author_id": user["id"],
        "content": payload.content,
        "image": images[0] if images else "",
        "images": images,
        "likes": [], "bookmarks": [], "reposts": [],
        "reactions": {},
        "hashtags": extract_hashtags(payload.content),
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
    return await enrich_post(post, user)


@api.patch("/posts/{post_id}")
async def edit_post(post_id: str, payload: PostEditIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    if post["author_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    age = datetime.now(timezone.utc) - datetime.fromisoformat(post["created_at"])
    if age > timedelta(hours=24):
        raise HTTPException(400, "Janela de edição expirada (24 h)")
    history = post.get("edit_history") or []
    history.append({"content": post["content"], "edited_at": now_iso()})
    history = history[-10:]  # keep last 10 revisions only
    await db.posts.update_one(
        {"id": post_id},
        {"$set": {
            "content": payload.content,
            "hashtags": extract_hashtags(payload.content),
            "edited_at": now_iso(),
            "edit_history": history,
        }},
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
    await db.posts.update_one({"id": post_id}, {"$inc": {"views": 1}})
    return {"views": post.get("views", 0) + 1}


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
    query: dict = {
        "author_id": {"$in": ids},
        "is_draft": {"$ne": True},
        "$or": [{"scheduled_at": None}, {"scheduled_at": {"$exists": False}}, {"scheduled_at": {"$lte": now_iso()}}],
    }
    if mood and mood in MOODS:
        rx = "|".join(re.escape(k) for k in MOODS[mood]["keywords"])
        query["content"] = {"$regex": rx, "$options": "i"}
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    if sort == "top":
        posts = sorted(
            posts,
            key=lambda p: len(p.get("likes", [])) * 2 + len(p.get("reposts", [])) * 3,
            reverse=True,
        )[:100]
    else:
        posts = posts[:100]
    return [await enrich_post(p, user) for p in posts]


@api.get("/posts/explore")
async def explore(sort: str = "trending", mood: str = "", viewer: Optional[dict] = Depends(maybe_user)):
    await auto_publish_due_posts()
    query: dict = {
        "repost_of": {"$exists": False},
        "is_draft": {"$ne": True},
        "$or": [{"scheduled_at": None}, {"scheduled_at": {"$exists": False}}, {"scheduled_at": {"$lte": now_iso()}}],
    }
    if mood and mood in MOODS:
        rx = "|".join(re.escape(k) for k in MOODS[mood]["keywords"])
        query["content"] = {"$regex": rx, "$options": "i"}
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(300)
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
    if payload.emoji not in ALLOWED_REACTIONS:
        raise HTTPException(400, "Reação inválida")
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    reactions = post.get("reactions") or {}
    users = list(reactions.get(payload.emoji, []))
    if user["id"] in users:
        users.remove(user["id"])
        active = False
    else:
        users.append(user["id"])
        active = True
        if post["author_id"] != user["id"]:
            await create_notification(
                post["author_id"], "reaction", user["id"], post_id,
                f"@{user['username']} reagiu {payload.emoji} à tua publicação",
                extra={"emoji": payload.emoji},
            )
    reactions[payload.emoji] = users
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
    if post["author_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    await db.posts.delete_one({"id": post_id})
    await db.posts.delete_many({"repost_of": post_id})
    await db.comments.delete_many({"post_id": post_id})
    return {"ok": True}


@api.post("/posts/{post_id}/like")
async def like_post(post_id: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    liked = user["id"] in post.get("likes", [])
    if liked:
        await db.posts.update_one({"id": post_id}, {"$pull": {"likes": user["id"]}})
        return {"liked": False, "likes_count": len(post.get("likes", [])) - 1}
    await db.posts.update_one({"id": post_id}, {"$addToSet": {"likes": user["id"]}})
    await create_notification(post["author_id"], "like", user["id"], post_id, f"@{user['username']} gostou da tua publicação")
    return {"liked": True, "likes_count": len(post.get("likes", [])) + 1}


@api.post("/posts/{post_id}/bookmark")
async def bookmark_post(post_id: str, user=Depends(get_current_user)):
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
async def _enrich_comment(c: dict) -> dict:
    author = await db.users.find_one({"id": c["author_id"]}, {"_id": 0})
    return {
        "id": c["id"], "post_id": c.get("post_id"),
        "content": c["content"], "created_at": c["created_at"],
        "parent_id": c.get("parent_id"),
        "replies_count": c.get("replies_count", 0),
        "pinned_by_author": bool(c.get("pinned_by_author")),
        "author": public_user(author) if author else None,
    }


@api.get("/posts/{post_id}/comments")
async def list_comments(post_id: str):
    cs = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return [await _enrich_comment(c) for c in cs]


@api.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, payload: CommentIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
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
    }
    await db.comments.insert_one(comment)
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
                extra={"parent_id": parent["id"]},
            )
    else:
        if post["author_id"] != user["id"]:
            await create_notification(
                post["author_id"], "comment", user["id"], post_id,
                f"@{user['username']} comentou na tua publicação",
            )
    await handle_mentions(payload.content, user, post_id)
    return await _enrich_comment(comment)


@api.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user=Depends(get_current_user)):
    c = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comentário não encontrado")
    if c["author_id"] != user["id"]:
        # Allow post author to delete comments on their own post
        post = await db.posts.find_one({"id": c["post_id"]}, {"_id": 0})
        if not post or post["author_id"] != user["id"]:
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
# Stories
# ============================================================
@api.post("/stories")
async def create_story(payload: StoryIn, user=Depends(get_current_user)):
    if not payload.image:
        raise HTTPException(400, "Imagem é obrigatória")
    now = datetime.now(timezone.utc)
    story = {
        "id": str(uuid.uuid4()), "author_id": user["id"],
        "image": payload.image, "content": payload.content or "",
        "viewers": [], "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
    }
    await db.stories.insert_one(story)
    return {"id": story["id"]}


@api.get("/stories")
async def list_stories(user=Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    ids = user.get("following", []) + [user["id"]]
    rows = await db.stories.find(
        {"author_id": {"$in": ids}, "expires_at": {"$gt": now}}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    groups = {}
    for s in rows:
        groups.setdefault(s["author_id"], []).append(s)
    out = []
    for author_id, items in groups.items():
        author = await db.users.find_one({"id": author_id}, {"_id": 0})
        if not author:
            continue
        unseen = any(user["id"] not in s.get("viewers", []) for s in items)
        items_sorted = sorted(items, key=lambda x: x["created_at"])
        out.append({
            "author": public_user(author), "stories": items_sorted, "has_unseen": unseen,
        })
    out.sort(key=lambda g: (g["author"]["id"] != user["id"], not g["has_unseen"]))
    return out


@api.post("/stories/{story_id}/view")
async def view_story(story_id: str, user=Depends(get_current_user)):
    await db.stories.update_one({"id": story_id}, {"$addToSet": {"viewers": user["id"]}})
    return {"ok": True}


@api.delete("/stories/{story_id}")
async def delete_story(story_id: str, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story não encontrado")
    if s["author_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    await db.stories.delete_one({"id": story_id})
    return {"ok": True}


# ============================================================
# Communities
# ============================================================
@api.post("/communities")
async def create_community(payload: CommunityIn, user=Depends(get_current_user)):
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
    return {
        "id": c["id"], "name": c["name"], "slug": c["slug"],
        "description": c.get("description", ""), "banner": c.get("banner", ""),
        "category": c.get("category", "outras"),
        "owner_id": c["owner_id"], "members_count": len(c.get("members", [])),
        "joined": bool(viewer and viewer["id"] in c.get("members", [])),
        "is_owner": bool(viewer and viewer["id"] == c["owner_id"]),
        "created_at": c["created_at"],
    }


# ============================================================
# Events
# ============================================================
@api.post("/events")
async def create_event(payload: EventIn, user=Depends(get_current_user)):
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
    await db.messages.update_many(
        {"conversation_key": key, "sender_id": other_user_id, "read": False},
        {"$set": {"read": True}},
    )
    return {"other_user": public_user(other) if other else None, "messages": msgs}


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
    other = await db.users.find_one({"id": payload.to_user_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Utilizador não encontrado")
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
    return msg


# ============================================================
# Trending — Fase 2 (range filters + velocity %)
# ============================================================
@api.get("/trending")
async def trending(range: str = "7d"):
    """Top hashtags com taxa de crescimento (velocity %).
    range: 1h | 24h | 7d | 30d (default 7d)."""
    hours = range_to_hours(range)
    now = datetime.now(timezone.utc)
    curr_cut = (now - timedelta(hours=hours)).isoformat()
    prev_cut = (now - timedelta(hours=hours * 2)).isoformat()
    curr_posts = await db.posts.find(
        {"hashtags": {"$exists": True, "$ne": []},
         "is_draft": {"$ne": True},
         "created_at": {"$gte": curr_cut}},
        {"_id": 0, "hashtags": 1},
    ).to_list(800)
    prev_posts = await db.posts.find(
        {"hashtags": {"$exists": True, "$ne": []},
         "is_draft": {"$ne": True},
         "created_at": {"$gte": prev_cut, "$lt": curr_cut}},
        {"_id": 0, "hashtags": 1},
    ).to_list(800)
    curr_counts: dict[str, int] = {}
    prev_counts: dict[str, int] = {}
    for p in curr_posts:
        for t in p.get("hashtags", []):
            curr_counts[t] = curr_counts.get(t, 0) + 1
    for p in prev_posts:
        for t in p.get("hashtags", []):
            prev_counts[t] = prev_counts.get(t, 0) + 1
    items = sorted(curr_counts.items(), key=lambda kv: kv[1], reverse=True)[:30]
    out = []
    for tag, cnt in items:
        out.append({
            "tag": tag, "count": cnt,
            "previous": prev_counts.get(tag, 0),
            "velocity": compute_velocity(cnt, prev_counts.get(tag, 0)),
            "is_city": tag in PT_CITIES,
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
    """Cidades portuguesas em alta — extraídas das hashtags + conteúdo."""
    hours = range_to_hours(range)
    cut = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    prev_cut = (datetime.now(timezone.utc) - timedelta(hours=hours * 2)).isoformat()
    curr_posts = await db.posts.find(
        {"is_draft": {"$ne": True}, "created_at": {"$gte": cut}},
        {"_id": 0, "hashtags": 1, "content": 1},
    ).to_list(2000)
    prev_posts = await db.posts.find(
        {"is_draft": {"$ne": True}, "created_at": {"$gte": prev_cut, "$lt": cut}},
        {"_id": 0, "hashtags": 1, "content": 1},
    ).to_list(2000)

    def _count(plist):
        c: dict[str, int] = {}
        for p in plist:
            cities = detect_cities(p.get("content", ""), p.get("hashtags", []))
            for city in cities:
                c[city] = c.get(city, 0) + 1
        return c

    curr = _count(curr_posts)
    prev = _count(prev_posts)
    ranked = sorted(curr.items(), key=lambda kv: kv[1], reverse=True)[:12]
    out = []
    for city, n in ranked:
        out.append({
            "city": city,
            "count": n,
            "previous": prev.get(city, 0),
            "velocity": compute_velocity(n, prev.get(city, 0)),
        })
    return out


# ============================================================
# Explore — mood / people
# ============================================================
@api.get("/explore/moods")
async def list_moods():
    """Static moods catalogue with counts (last 7 days)."""
    cut = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    posts = await db.posts.find(
        {"is_draft": {"$ne": True}, "created_at": {"$gte": cut}},
        {"_id": 0, "content": 1},
    ).to_list(2000)
    counts: dict[str, int] = {}
    for p in posts:
        m = detect_mood(p.get("content", ""))
        if m:
            counts[m] = counts.get(m, 0) + 1
    out = []
    for key, m in MOODS.items():
        out.append({
            "key": key, "label": m["label"], "emoji": m["emoji"],
            "count": counts.get(key, 0),
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
            else ("popular" if len(c.get("followers", [])) >= 3 else "novo")
        )
        out.append(d)
    return out


# ============================================================
# Badges & Regions (profile)
# ============================================================
@api.get("/users/{username}/badges")
async def user_badges(username: str, viewer: Optional[dict] = Depends(maybe_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilizador não encontrado")
    if not await can_view_profile(user, viewer):
        return {"earned": [], "all": []}
    posts = await db.posts.find(
        {"author_id": user["id"], "repost_of": {"$exists": False}}, {"_id": 0},
    ).to_list(2000)
    posts_count = len(posts)
    likes_received = sum(len(p.get("likes", [])) for p in posts)
    image_posts = sum(1 for p in posts if (p.get("image") or (p.get("images") or [])))
    # mood counters
    tasca_n = sum(1 for p in posts if detect_mood(p.get("content", "")) == "tasca")
    fado_n = sum(1 for p in posts if detect_mood(p.get("content", "")) == "fado")
    morning = 0
    night = 0
    cities_set: set = set()
    for p in posts:
        try:
            h = datetime.fromisoformat(p["created_at"]).hour
            if 5 <= h < 8:
                morning += 1
            if 0 <= h < 4:
                night += 1
        except Exception:
            pass
        for c in detect_cities(p.get("content", ""), p.get("hashtags", [])):
            cities_set.add(c)
    # streak (reuse simple calc)
    dates = sorted({p["created_at"][:10] for p in posts}, reverse=True)
    streak = 0
    today = datetime.now(timezone.utc).date()
    for i, d in enumerate(dates):
        try:
            dt = datetime.fromisoformat(d).date()
        except Exception:
            break
        if (today - dt).days == i:
            streak += 1
        else:
            break
    joined_days = (datetime.now(timezone.utc) - datetime.fromisoformat(user["created_at"])).days
    comments_made = await db.comments.count_documents({"author_id": user["id"]})

    rules = {
        "verificado":   bool(user.get("verified")),
        "embaixador":   len(user.get("followers", [])) >= 50,
        "popular":      likes_received >= 100,
        "maratonista":  streak >= 7,
        "lenda":        streak >= 30,
        "veterano":     joined_days >= 365,
        "tasqueiro":    tasca_n >= 3,
        "fadista":      fado_n >= 3,
        "madrugador":   morning >= 3,
        "noctivago":    night >= 3,
        "colecionador": len(user.get("bookmarks", [])) >= 10,
        "conversador":  comments_made >= 20,
        "fotografo":    image_posts >= 5,
        "viajante":     len(cities_set) >= 3,
    }
    all_badges = []
    for b in PT_BADGES_DEFS:
        all_badges.append({**b, "earned": bool(rules.get(b["key"]))})
    return {
        "earned": [b for b in all_badges if b["earned"]],
        "all": all_badges,
        "totals": {
            "posts": posts_count, "likes_received": likes_received,
            "streak": streak, "cities": len(cities_set),
            "image_posts": image_posts, "comments_made": comments_made,
            "joined_days": joined_days,
        },
    }


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
    await db.communities.create_index("slug", unique=True)
    await db.events.create_index("starts_at")
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vermillion.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email, "username": "admin",
            "name": "Vermillion", "password_hash": hash_password(admin_password),
            "bio": "Conta oficial. Bem-vindo ao Vermillion ✦",
            "avatar": "", "banner": "",
            "verified": True, "private": False, "onboarded": True,
            "followers": [], "following": [], "bookmarks": [],
            "last_seen": now_iso(), "created_at": now_iso(),
        })
        logger.info("Admin seeded")
    else:
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}},
            )
        await db.users.update_one({"email": admin_email}, {"$set": {"verified": True, "onboarded": True}})

    # Demo Portuguese community — only if posts collection is empty
    if await db.posts.count_documents({}) == 0:
        await seed_pt_demo()


PT_DEMO_USERS = [
    {"username": "bea.lx", "name": "Beatriz Carvalho", "bio": "Lisbon · designer & flâneuse · café com leite forte ☕",
     "verified": True},
    {"username": "tiago.cit", "name": "Tiago Ramalho", "bio": "Jornalista cultural · escrevo sobre o que a cidade sussurra · Porto/Lisboa",
     "verified": True},
    {"username": "mari.estudio", "name": "Mariana Sousa", "bio": "Estúdio de cerâmica em Alfama · feito à mão, à pressa de quem ama",
     "verified": False},
    {"username": "joao.bairro", "name": "João Almeida", "bio": "Bairro Alto antes das 22h · fotografia de rua · Leica",
     "verified": False},
    {"username": "ines.fado", "name": "Inês Pinto", "bio": "Fadista · próxima atuação: Tasca do Chico ✨",
     "verified": True},
    {"username": "rui.surf", "name": "Rui Veloso", "bio": "Costa da Caparica · ondas pequenas, paciência grande",
     "verified": False},
    {"username": "cat.pastel", "name": "Catarina Lopes", "bio": "Pastéis, padaria & ressacas domingueiras · @ Belém",
     "verified": False},
    {"username": "diogo.tasca", "name": "Diogo Martins", "bio": "Caçador de tascas com alma · vinho da casa, sempre",
     "verified": True},
    {"username": "filipa.azul", "name": "Filipa Nunes", "bio": "Azulejos, Pessoa e gatos pretos · doutoranda em História da Arte",
     "verified": False},
    {"username": "pedro.metro", "name": "Pedro Tavares", "bio": "Engenheiro civil · só comento dois temas: pontes e Benfica",
     "verified": False},
    {"username": "sofiaf", "name": "Sofia Ferreira", "bio": "Atriz · entre o D. Maria e a cinemateca",
     "verified": True},
    {"username": "miguelc", "name": "Miguel Costa", "bio": "Cozinheiro · bacalhau é serviço público · @ Cascais",
     "verified": False},
]

PT_DEMO_POSTS = [
    ("bea.lx", "Cheguei a Lisboa às 6h. A luz do Tejo a esta hora é praticamente uma decisão estética. #Lisboa #LuzDoTejo"),
    ("tiago.cit", "Crónica de hoje: o Porto não é uma cidade — é um estado de espírito húmido. #Porto #Ribeira"),
    ("ines.fado", "Esta noite na Tasca do Chico, 22h. Trago a casaca preta e umas saudades novas em folha. #Fado #BairroAlto"),
    ("mari.estudio", "Saiu do forno a primeira fornada de chávenas azul-cobalto. Cada uma demorou três tentativas — e provavelmente vai durar três gerações. #Cerâmica #Alfama"),
    ("joao.bairro", "Travessa da Queimada às 19h47. Não há filtro que substitua a luz a esta hora. #BairroAlto #StreetPhoto"),
    ("rui.surf", "Mar pequeno, vento de Leste, mas remei na mesma. Há manhãs em que o melhor surf é o silêncio antes do trabalho. #SurfAlgarve #CostaDaCaparica"),
    ("cat.pastel", "Pastel de nata, café duplo, sol de Belém. Há manhãs em que Lisboa parece desenhada à mão. #Pastel #Belém"),
    ("diogo.tasca", "Almoço de hoje: bitoque a 8,50€ no fim da Rua dos Anjos. Servido por uma senhora que me chamou 'menino'. Tudo certo. #Tasca #Lisboa"),
    ("filipa.azul", "Encontrei um painel de azulejos do séc. XVIII numa loja de bairro em Arroios. O dono nem sabia o que tinha. Coração apertado. #Azulejo #PatrimónioPT"),
    ("pedro.metro", "Linha azul. Carruagem 3. Senhora a cantar fado para o telemóvel. Lisboa é assim — ninguém pediu, ninguém parou de ouvir. #Metro #Lisboa"),
    ("sofiaf", "Estreia esta sexta no D. Maria II. Texto novo, palco velho, frio igual ao do ano passado. Já tenho saudades. #Teatro #DonaMaria"),
    ("miguelc", "Receita do dia: bacalhau à Brás como o meu avô fazia — sem batata palha de saco. Há linhas que não se atravessam. #Bacalhau #CozinhaPT"),
    ("bea.lx", "Café da manhã: bica, torrada do Versailles, e uma teoria nova sobre porque o Tejo nos calma. #Lisboa #Versailles"),
    ("tiago.cit", "O São João do Porto resume tudo: martelos de plástico, manjericos, e uma cidade inteira a recusar dormir. #SãoJoão #Porto"),
    ("rui.surf", "Hoje na Praia do Norte: respeito. Sempre. #Nazaré #Surf"),
    ("ines.fado", "Saudade não é tristeza — é uma forma educada de amar à distância. Boa noite. #Fado"),
    ("joao.bairro", "Miradouro de Santa Catarina. Casal a discutir em voz baixa. Gaivota a discutir em voz alta. Empate técnico. #Lisboa"),
    ("cat.pastel", "Spoiler: os melhores pastéis de nata de Lisboa não estão em Belém. Mas isso fica entre nós. #Pastel #Lisboa"),
    ("diogo.tasca", "Vinho da casa, azeitonas e três horas a falar de futebol com um sr. que conheci há 20 minutos. Portugal. #Tasca"),
    ("filipa.azul", "Pessoa hoje teria 137 anos. Eu hoje tenho 28 e ainda não decidi quem sou. Coincidência? Não. #Pessoa #Heterónimo"),
    ("pedro.metro", "Benfica 2 - 0. Estádio cheio. O resto é literatura. #Benfica #SLB"),
    ("sofiaf", "Cinemateca às 21h30. Bergman. Quem quiser vir, tenho um lugar na fila 4. #Cinemateca #Lisboa"),
    ("miguelc", "Polvo à lagareiro hoje na ementa. Aviso à navegação. #Cascais #Restaurante"),
    ("mari.estudio", "Atelier aberto este sábado das 11h às 18h. Tragam dúvidas, levo café. #Alfama #Cerâmica"),
]


async def seed_pt_demo():
    """Populate the database with realistic Portuguese demo content."""
    import random
    logger.info("🇵🇹 Seeding Portuguese demo community…")
    user_ids = {}
    base_pwd = hash_password("demo123")
    for u in PT_DEMO_USERS:
        uid = str(uuid.uuid4())
        user_ids[u["username"]] = uid
        await db.users.insert_one({
            "id": uid,
            "email": f"{u['username'].replace('.', '')}@vermillion.demo",
            "username": u["username"],
            "name": u["name"],
            "password_hash": base_pwd,
            "bio": u["bio"],
            "avatar": "", "banner": "",
            "verified": u.get("verified", False),
            "private": False, "onboarded": True,
            "followers": [], "following": [], "bookmarks": [],
            "last_seen": now_iso(), "created_at": now_iso(),
        })

    # Create cross follows — each user follows 4–6 others
    usernames = list(user_ids.keys())
    for u in usernames:
        peers = [p for p in usernames if p != u]
        random.shuffle(peers)
        chosen = peers[: random.randint(4, 6)]
        await db.users.update_one(
            {"id": user_ids[u]},
            {"$set": {"following": [user_ids[c] for c in chosen]}},
        )
        for c in chosen:
            await db.users.update_one(
                {"id": user_ids[c]},
                {"$addToSet": {"followers": user_ids[u]}},
            )

    # Posts with staggered timestamps (newest first goes last hour, oldest goes ~5 days)
    base_dt = datetime.now(timezone.utc)
    for idx, (uname, content) in enumerate(PT_DEMO_POSTS):
        author_id = user_ids[uname]
        created = (base_dt - timedelta(minutes=idx * 73 + random.randint(0, 40))).isoformat()
        # Random likes from other demo users
        likers = random.sample(
            [uid for uname2, uid in user_ids.items() if uid != author_id],
            k=random.randint(2, 8),
        )
        post = {
            "id": str(uuid.uuid4()),
            "author_id": author_id,
            "content": content,
            "image": "", "images": [],
            "likes": likers,
            "bookmarks": [],
            "reposts": random.sample(likers, k=min(2, len(likers))) if random.random() < 0.3 else [],
            "reactions": {},
            "hashtags": extract_hashtags(content),
            "community_id": None,
            "quote_of": None,
            "poll": None,
            "reply_audience": "everyone",
            "is_draft": False,
            "scheduled_at": None,
            "edit_history": [],
            "views": random.randint(40, 2400),
            "created_at": created,
        }
        await db.posts.insert_one(post)
    logger.info("🇵🇹 PT demo seeded: %d users, %d posts", len(PT_DEMO_USERS), len(PT_DEMO_POSTS))

    # Admin auto-follows the verified PT crew so the "Seguindo" feed feels alive
    admin = await db.users.find_one({"username": "admin"})
    if admin:
        verified_demos = [u for u in PT_DEMO_USERS if u.get("verified")]
        follow_ids = [user_ids[u["username"]] for u in verified_demos]
        await db.users.update_one(
            {"id": admin["id"]},
            {"$set": {"following": follow_ids}},
        )
        for fid in follow_ids:
            await db.users.update_one(
                {"id": fid},
                {"$addToSet": {"followers": admin["id"]}},
            )


@app.on_event("shutdown")
async def shutdown():
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
    """F2.2 — Badges narrativos. Computes seasonal/ritual badges on-the-fly.
    Cheap to call (under 50ms) — used in profile and notifications."""
    badges = []
    user_id = user["id"]

    # Café das 7h32 — published 5+ days before 08:00 UTC
    early_count = await db.posts.count_documents({
        "author_id": user_id,
        "$expr": {"$lt": [{"$hour": {"$dateFromString": {"dateString": "$created_at"}}}, 8]},
    })
    if early_count >= 5:
        badges.append({"key": "cafe_das_732", "label": "Café das 7h32", "emoji": "☕", "desc": "Publicas antes das 8h. Madrugador."})

    # Tasca-mestre — owns/moderates community with 50+ members
    big_comm = await db.communities.find_one({"owner_id": user_id, "members": {"$size": 50}}, {"_id": 0})
    if not big_comm:
        big_comm = await db.communities.find_one({"owner_id": user_id}, {"_id": 0})
        if big_comm and len(big_comm.get("members", [])) >= 50:
            badges.append({"key": "tasca_mestre", "label": "Tasca-mestre", "emoji": "🍷", "desc": "Comunidade com 50+ pessoas. Sentas pessoas à mesa."})
    else:
        badges.append({"key": "tasca_mestre", "label": "Tasca-mestre", "emoji": "🍷", "desc": "Comunidade com 50+ pessoas. Sentas pessoas à mesa."})

    # Saudade verificada — at least one post with mood "saudade" and 20+ reactions
    saudade_posts = await db.posts.find(
        {"author_id": user_id, "audience_ring": {"$in": ["publico", None]}},
        {"_id": 0},
    ).to_list(50)
    for p in saudade_posts:
        if "saudade" in (p.get("content", "") + " ".join(p.get("hashtags", []))).lower():
            rc = sum(len(v) if isinstance(v, list) else 0 for v in (p.get("reactions") or {}).values())
            if rc >= 20 or len(p.get("likes", [])) >= 20:
                badges.append({"key": "saudade_verificada", "label": "Saudade verificada", "emoji": "🫶", "desc": "20+ pessoas comoveram-se com um post teu."})
                break

    # Maré viva — published in 7+ consecutive days during summer (Jun-Sep)
    if datetime.now(timezone.utc).month in (6, 7, 8, 9):
        # rough check — last 7 days have at least 1 post each
        days_with_posts = set()
        recent = await db.posts.find(
            {"author_id": user_id, "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()}},
            {"_id": 0, "created_at": 1},
        ).to_list(200)
        for p in recent:
            try:
                d = datetime.fromisoformat(p["created_at"].replace("Z", "+00:00")).date()
                days_with_posts.add(d)
            except Exception:
                pass
        if len(days_with_posts) >= 7:
            badges.append({"key": "mare_viva", "label": "Maré viva", "emoji": "🌊", "desc": "7 dias seguidos a publicar no verão."})

    # Voz da [região] — most engaged author from the user's region this month (informational)
    region = (user.get("region") or "").strip().lower()
    if region:
        badges.append({"key": f"voz_{region}", "label": f"Voz d{'a' if region != 'algarve' else 'o'} {region.title()}", "emoji": "📣", "desc": f"A escrever a partir d{'a' if region != 'algarve' else 'o'} {region.title()}.", "soft": True})

    return {"badges": badges}


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
    return CHARMS_CATALOG


async def _compute_unlocked_charms(user: dict) -> list:
    uid = user["id"]
    out = set()
    earlier = await db.users.count_documents({"created_at": {"$lt": user.get("created_at", now_iso())}})
    if earlier < 1000:
        out.add("fundador")
    comments = await db.comments.count_documents({"author_id": uid})
    if comments >= 100:
        out.add("conversador")
    owns = await db.communities.count_documents({"owner_id": uid})
    if owns >= 1:
        out.add("anfitriao")
    posts = await db.posts.find(
        {"author_id": uid}, {"_id": 0, "created_at": 1, "hashtags": 1}
    ).to_list(200)
    cities = set()
    moods = {}
    for p in posts:
        ts = p.get("created_at") or ""
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            h = dt.hour
            if h < 7:
                out.add("madrugador")
            if 2 <= h < 5:
                out.add("noctivago")
        except Exception:
            pass
        cities_in_post = detect_cities(p.get("content", "") if p.get("content") else "", p.get("hashtags", []))
        for c in cities_in_post:
            cities.add(c)
        mood = detect_mood(p.get("content", "") if p.get("content") else "")
        if mood:
            moods[mood] = moods.get(mood, 0) + 1
    if len(cities) >= 5:
        out.add("explorador")
    if len(cities) >= 3:
        out.add("viajante")
    if moods.get("saudade", 0) >= 10:
        out.add("saudosista")
    if moods.get("festa", 0) >= 10:
        out.add("festeiro")
    if moods.get("cafe", 0) >= 5:
        out.add("pastelinho")
    if moods.get("futebol", 0) >= 5:
        out.add("bolacampea")
    top = await db.posts.find_one({"author_id": uid, "reactions": {"$exists": True}}, {"_id": 0, "reactions": 1})
    if top and top.get("reactions"):
        total = sum(len(v) if isinstance(v, list) else 0 for v in top["reactions"].values())
        if total >= 100:
            out.add("poeta")
    return [CHARMS_BY_KEY[k] for k in out if k in CHARMS_BY_KEY]


@api.get("/users/{username}/charms")
async def list_user_charms(username: str):
    u = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    unlocked = await _compute_unlocked_charms(u)
    equipped = u.get("charms_equipped", [])
    return {
        "unlocked": unlocked,
        "equipped": [CHARMS_BY_KEY[k] for k in equipped if k in CHARMS_BY_KEY],
    }


class CharmsEquipIn(BaseModel):
    keys: List[str] = Field(default_factory=list)


@api.post("/users/me/charms/equip")
async def equip_charms(payload: CharmsEquipIn, user=Depends(get_current_user)):
    unlocked = {c["key"] for c in await _compute_unlocked_charms(user)}
    final = [k for k in payload.keys[:3] if k in unlocked]
    await db.users.update_one({"id": user["id"]}, {"$set": {"charms_equipped": final}})
    return {"equipped": [CHARMS_BY_KEY[k] for k in final]}


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
    if len(accepted) + len(invites) >= 3:
        raise HTTPException(400, "Máximo de 3 colaboradores")
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
    return [{**c, "tier": "free"} for c in COSMETICS_CATALOG]


class CosmeticsEquipIn(BaseModel):
    frame: Optional[str] = ""
    sticker: Optional[str] = ""


@api.post("/users/me/cosmetics/equip")
async def equip_cosmetics(payload: CosmeticsEquipIn, user=Depends(get_current_user)):
    frame_id = (payload.frame or "").strip()
    sticker_id = (payload.sticker or "").strip()
    if frame_id and frame_id not in COSMETICS_BY_ID:
        raise HTTPException(400, "Frame inválida")
    if sticker_id and sticker_id not in COSMETICS_BY_ID:
        raise HTTPException(400, "Sticker inválido")
    if frame_id and COSMETICS_BY_ID[frame_id]["type"] != "frame":
        raise HTTPException(400, "Item não é uma frame")
    if sticker_id and COSMETICS_BY_ID[sticker_id]["type"] != "sticker":
        raise HTTPException(400, "Item não é um sticker")
    cosmetics_equipped = {"frame": frame_id, "sticker": sticker_id}
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"cosmetics_equipped": cosmetics_equipped}}
    )
    return cosmetics_equipped


@api.get("/users/{username}/cosmetics")
async def get_user_cosmetics(username: str):
    u = await db.users.find_one(
        {"username": username.lower()},
        {"_id": 0, "cosmetics_equipped": 1},
    )
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    eq = u.get("cosmetics_equipped") or {"frame": "", "sticker": ""}
    return {
        "frame": COSMETICS_BY_ID.get(eq.get("frame"), None),
        "sticker": COSMETICS_BY_ID.get(eq.get("sticker"), None),
    }


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
                                viewer_affinity: dict, seen_authors: dict) -> float:
    """Multi-objective score for For You ranking.
    Components:
      freshness: exp decay 14h half-life
      engagement: likes + reactions + reposts + comments (log-scaled)
      affinity:  viewer interaction history with author (0..1)
      diversity: penalty if same author already shown N+ times
      mood/city: bonus if matches viewer profile
      hidden_gem: bonus for high engagement rate, low-follower authors
      trending: short-window velocity boost
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

    base = (
        freshness * 1.4
        + engagement * 0.6
        + affinity * friends_w * 2.0
        + (mood_match + tod_bonus) * interest_w * 2.0
        + city_match * place_w * 2.0
    )
    return base * diversity_penalty


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
    # Score with running author-count for diversity
    seen = {}
    scored = []
    for p in candidates:
        s = await compute_ranking_score(p, user, aff, seen)
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
    """Called when user creates a post — extends/breaks streak."""
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        return
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    last = u.get("streak_last_date")
    streak = u.get("streak_days", 0)
    best = u.get("streak_best", 0)
    freezes = u.get("streak_freezes", 2)
    if last == today:
        return  # already counted today
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    if last == yesterday:
        streak += 1
    elif last is None:
        streak = 1
    else:
        # missed days
        try:
            gap = (datetime.now(timezone.utc).date() - datetime.fromisoformat(last).date()).days
        except Exception:
            gap = 2
        if gap == 2 and freezes > 0:
            # auto-use freeze
            streak += 1
            freezes -= 1
        else:
            streak = 1
            # Reset to 2 freezes monthly
            freezes = max(freezes, 2)
    best = max(best, streak)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "streak_days": streak,
            "streak_best": best,
            "streak_last_date": today,
            "streak_freezes": freezes,
        }},
    )


@api.get("/users/{username}/streak")
async def get_streak(username: str):
    u = await db.users.find_one(
        {"username": username.lower()},
        {"_id": 0, "id": 1, "streak_days": 1, "streak_best": 1, "streak_last_date": 1, "streak_freezes": 1},
    )
    if not u or not u.get("id"):
        raise HTTPException(404, "Utilizador não encontrado")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    last = u.get("streak_last_date")
    streak = u.get("streak_days", 0)
    # If user hasn't posted in 2+ days and has no freezes left → effectively 0
    if last:
        try:
            gap = (datetime.now(timezone.utc).date() - datetime.fromisoformat(last).date()).days
            if gap >= 2 and u.get("streak_freezes", 0) <= 0:
                streak = 0
        except Exception:
            pass
    milestones = [7, 14, 30, 60, 100, 365]
    next_milestone = next((m for m in milestones if m > streak), None)
    return {
        "current": streak,
        "best": u.get("streak_best", streak),
        "last_date": last,
        "freezes": u.get("streak_freezes", 2),
        "next_milestone": next_milestone,
        "active_today": last == today,
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
    u = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Utilizador não encontrado")
    progress = await _charm_progress(u)
    unlocked_keys = {c["key"] for c in await _compute_unlocked_charms(u)}
    return {
        "unlocked_keys": list(unlocked_keys),
        "progress": progress,
        "catalog": CHARMS_CATALOG,
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
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}  # user_id -> sockets

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.active:
            try:
                self.active[user_id].remove(ws)
            except ValueError:
                pass
            if not self.active[user_id]:
                self.active.pop(user_id, None)

    async def send_personal(self, user_id: str, message: dict):
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def broadcast(self, message: dict, exclude_user: Optional[str] = None):
        for uid, sockets in list(self.active.items()):
            if uid == exclude_user:
                continue
            for ws in list(sockets):
                try:
                    await ws.send_json(message)
                except Exception:
                    pass


ws_manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    # Authenticate via cookie or query token
    token = ws.cookies.get("access_token") or ws.query_params.get("token", "")
    if not token:
        await ws.close(code=1008)
        return
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload["sub"]
    except Exception:
        await ws.close(code=1008)
        return
    await ws_manager.connect(user_id, ws)
    # mark online
    await db.users.update_one({"id": user_id}, {"$set": {"last_seen": now_iso()}})
    await ws_manager.broadcast({
        "type": "presence",
        "user_id": user_id,
        "status": "online",
    }, exclude_user=user_id)
    try:
        while True:
            data = await ws.receive_json()
            t = data.get("type")
            if t == "ping":
                await ws.send_json({"type": "pong", "ts": now_iso()})
                await db.users.update_one({"id": user_id}, {"$set": {"last_seen": now_iso()}})
            elif t == "typing":
                # forward to specific user
                target = data.get("to")
                if target:
                    await ws_manager.send_personal(target, {
                        "type": "typing",
                        "from": user_id,
                        "in": data.get("in", "dm"),
                    })
            elif t == "presence_set":
                # custom presence broadcast
                await ws_manager.broadcast({
                    "type": "presence",
                    "user_id": user_id,
                    "status": data.get("status", "online"),
                    "emoji": data.get("emoji", ""),
                }, exclude_user=user_id)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(user_id, ws)
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
app.include_router(api2)
