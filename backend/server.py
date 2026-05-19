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
import base64
import io
import pyotp
import qrcode
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

app = FastAPI(title="Lusorae Social")
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


def create_access_token(user_id: str, email: str, jti: Optional[str] = None) -> str:
    payload = {
        "sub": user_id, "email": email, "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    if jti:
        payload["jti"] = jti
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


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
        # Soft engagement signals (server-side now — see /api2/feed/signals)
        "muted_authors": user.get("muted_authors", []),
        "muted_topics": user.get("muted_topics", []),
        "favorites": user.get("favorites", []),
        "dismissed_posts": user.get("dismissed_posts", []),
        "boosted_posts": user.get("boosted_posts", []),
        "post_notes": user.get("post_notes") or {},
        "followed_threads": user.get("followed_threads", []),
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
        # B-029 — session revocation check
        jti = payload.get("jti")
        if jti:
            sess = await db.sessions.find_one({"jti": jti}, {"_id": 0, "revoked": 1})
            if sess and sess.get("revoked"):
                raise HTTPException(status_code=401, detail="Sessão terminada")
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
    totp_code: Optional[str] = None  # 2FA — required when account has 2fa_enabled


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


class TwoFASetupConfirmIn(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class TwoFADisableIn(BaseModel):
    password: str
    code: Optional[str] = None  # TOTP or backup code


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=200)


class DeleteAccountIn(BaseModel):
    password: str
    confirm: str  # must equal "APAGAR"


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
    content: Optional[str] = Field(default=None, max_length=500)
    images: Optional[List[str]] = None  # only used when editing a draft / scheduled
    scheduled_at: Optional[str] = None  # rescheduling a scheduled post


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
async def check_username(u: str = ""):
    """Public, unauthenticated endpoint used by the registration form to give
    real-time availability feedback on the player ID (username)."""
    raw = (u or "").strip()
    if not raw:
        return {"available": False, "reason": "empty", "message": "Escolhe um username."}
    if len(raw) < 3:
        return {"available": False, "reason": "too_short", "message": "Mínimo 3 caracteres."}
    if len(raw) > 20:
        return {"available": False, "reason": "too_long", "message": "Máximo 20 caracteres."}
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
async def check_email(e: str = ""):
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
        return {"available": False, "reason": "disposable", "message": "Emails descartáveis não são aceites."}
    existing = await db.users.find_one({"email": raw}, {"_id": 0, "id": 1})
    if existing:
        return {"available": False, "reason": "taken", "message": "Já existe uma conta com este email."}
    return {"available": True, "message": "Disponível."}


@api.post("/auth/register")
async def register(payload: RegisterIn, request: Request, response: Response):
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
    token = create_access_token(user["id"], email, jti=jti)
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Credenciais inválidas")
    # B-013 — 2FA gate
    if user.get("two_fa_enabled") and user.get("two_fa_secret"):
        code = (payload.totp_code or "").strip()
        if not code:
            raise HTTPException(403, "Código 2FA necessário")
        if not await _verify_2fa_code(user, code):
            raise HTTPException(401, "Código 2FA inválido")
    # B-014 — login alert before creating new session
    await maybe_emit_login_alert(user, request)
    jti = await create_session(user["id"], request, source="login")
    token = create_access_token(user["id"], email, jti=jti)
    set_auth_cookie(response, token)
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": now_iso()}})
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
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            jti = payload.get("jti")
            if jti:
                await db.sessions.update_one(
                    {"jti": jti},
                    {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "logout"}},
                )
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
async def forgot_password(payload: ForgotPasswordIn):
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
        logger.info(f"🔐 Password reset token for {email} (via_recovery={used_recovery}): {token}")
        return {"ok": True, "dev_token": token, "via_recovery": used_recovery}
    return {"ok": True}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    rec = await db.password_resets.find_one({"token": payload.token, "used": False}, {"_id": 0})
    if not rec:
        raise HTTPException(400, "Token inválido")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "Token expirado")
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
    if current_jti:
        await db.sessions.update_many(
            {"user_id": user["id"], "revoked": False, "jti": {"$ne": current_jti}},
            {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "password_change"}},
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
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("jti")
    except Exception:
        return None


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
    return {"ok": True}


@api.post("/auth/sessions/revoke-others")
async def revoke_other_sessions(request: Request, user=Depends(get_current_user)):
    current_jti = _extract_jti_from_request(request)
    q = {"user_id": user["id"], "revoked": {"$ne": True}}
    if current_jti:
        q["jti"] = {"$ne": current_jti}
    res = await db.sessions.update_many(
        q,
        {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "user_revoke_all"}},
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
    return await enrich_post(post, user)


@api.patch("/posts/{post_id}")
async def edit_post(post_id: str, payload: PostEditIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    if post["author_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    is_draft = bool(post.get("is_draft"))
    is_scheduled = bool(post.get("scheduled_at"))
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
    muted_topics = set((t or "").lower() for t in (user.get("muted_topics", []) or []))
    dismissed = set(user.get("dismissed_posts", []) or [])
    visible_ids = [aid for aid in ids if aid not in muted_authors]
    query: dict = {
        "author_id": {"$in": visible_ids},
        "is_draft": {"$ne": True},
        "$or": [{"scheduled_at": None}, {"scheduled_at": {"$exists": False}}, {"scheduled_at": {"$lte": now_iso()}}],
    }
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
    if viewer:
        muted_authors = list(set(viewer.get("muted_authors", []) or []))
        if muted_authors:
            query["author_id"] = {"$nin": muted_authors}
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
    elif sort == "old":
        enriched.sort(key=lambda c: (not c.get("pinned_by_author"), c.get("created_at", "")))
    else:  # new
        enriched.sort(key=lambda c: (not c.get("pinned_by_author"), c.get("created_at", "")), reverse=False)
    return enriched


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
    await daily_checkin(user["id"])
    await award_xp(user["id"], "create_comment")
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
    return await _enrich_comment(comment, user)


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
    "location", "countdown", "music", "link",
}


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
    media_type = (payload.media_type or "image").lower()
    if media_type not in {"image", "video", "text"}:
        media_type = "image"
    if media_type == "image" and not payload.image:
        raise HTTPException(400, "Imagem obrigatória para story de imagem")
    if media_type == "video" and not payload.video:
        raise HTTPException(400, "Vídeo obrigatório para story de vídeo")
    if media_type == "text" and not (payload.text_content or "").strip():
        raise HTTPException(400, "Texto obrigatório para story de texto")
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
    if s["author_id"] != user["id"]:
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
    range: 1h | 24h | 7d | 30d (default 7d)."""
    hours = range_to_hours(range)
    now = datetime.now(timezone.utc)
    curr_cut = (now - timedelta(hours=hours)).isoformat()
    prev_cut = (now - timedelta(hours=hours * 2)).isoformat()
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
            curr_counts[t] = curr_counts.get(t, 0) + 1
            by_tag_curr.setdefault(t, []).append(p)
    for p in prev_posts:
        for t in p.get("hashtags", []):
            prev_counts[t] = prev_counts.get(t, 0) + 1
            by_tag_prev.setdefault(t, []).append(p)
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
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vermillion.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email, "username": "admin",
            "name": "Lusorae", "password_hash": hash_password(admin_password),
            "bio": "Conta oficial. Bem-vindo ao Lusorae ✦",
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
        await db.users.update_one({"email": admin_email}, {"$set": {"verified": True, "onboarded": True, "name": "Lusorae", "bio": "Conta oficial. Bem-vindo ao Lusorae ✦"}})

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
    p = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Publicação não encontrada")
    await db.reports.insert_one({
        "id": str(uuid.uuid4()), "kind": "post", "target_id": post_id,
        "reporter_id": user["id"], "reason": (payload.reason or "outro")[:40],
        "detail": (payload.detail or "")[:400], "created_at": now_iso(), "status": "open",
    })
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
    c = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Comentário não encontrado")
    await db.reports.insert_one({
        "id": str(uuid.uuid4()),
        "kind": "comment", "target_id": comment_id,
        "reporter_id": user["id"], "reason": (payload.reason or "outro")[:40],
        "detail": (payload.detail or "")[:400], "created_at": now_iso(),
        "status": "open",
    })
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
    content: str = Field(min_length=1, max_length=2000)


class MessageInV2(BaseModel):
    to_user_id: str
    content: Optional[str] = Field(default="", max_length=2000)
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
    other = await db.users.find_one({"id": payload.to_user_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Utilizador não encontrado")
    # Block check — if either side blocked the other, reject
    if user["id"] in (other.get("blocked") or []) or other["id"] in (user.get("blocked") or []):
        raise HTTPException(403, "Bloqueado")
    key = conv_key(user["id"], other["id"])
    kind = (payload.kind or "text").lower()
    content = (payload.content or "").strip()
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
        "image": (payload.image or "")[:200000] if kind == "image" else "",
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
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    await db.reports.insert_one({
        "id": str(uuid.uuid4()), "kind": "user", "target_id": target["id"],
        "reporter_id": user["id"], "reason": (payload.reason or "outro")[:40],
        "detail": (payload.detail or "")[:400], "created_at": now_iso(), "status": "open",
    })
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


app.include_router(api2)
