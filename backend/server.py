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
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
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
    return {
        "id": post["id"], "content": post["content"], "image": post.get("image", ""),
        "created_at": post["created_at"],
        "likes_count": len(post.get("likes", [])),
        "reposts_count": len(post.get("reposts", [])),
        "comments_count": comments_count,
        "liked": viewer_id in post.get("likes", []) if viewer_id else False,
        "bookmarked": viewer_id in post.get("bookmarks", []) if viewer_id else False,
        "reposted": viewer_id in post.get("reposts", []) if viewer_id else False,
        "author": public_user(author) if author else None,
        "repost_of": repost_origin,
        "community": community,
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
                f"@{author['username']} mencionou você"
            )


# ============================================================
# Pydantic
# ============================================================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    username: str = Field(min_length=3, max_length=20)
    name: str = Field(min_length=1, max_length=50)


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


class PostIn(BaseModel):
    content: str = Field(min_length=1, max_length=500)
    image: Optional[str] = ""
    community_id: Optional[str] = None


class CommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=300)


class MessageIn(BaseModel):
    to_user_id: str
    content: str = Field(min_length=1, max_length=2000)


class StoryIn(BaseModel):
    image: str
    content: Optional[str] = ""


class CommunityIn(BaseModel):
    name: str = Field(min_length=3, max_length=40)
    description: str = Field(default="", max_length=200)


class EventIn(BaseModel):
    title: str = Field(min_length=3, max_length=80)
    description: str = Field(default="", max_length=400)
    location: str = Field(default="", max_length=120)
    starts_at: str  # ISO


# ============================================================
# Auth
# ============================================================
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    username = payload.username.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email já cadastrado")
    if await db.users.find_one({"username": username}):
        raise HTTPException(400, "Username já em uso")
    user = {
        "id": str(uuid.uuid4()), "email": email, "username": username,
        "name": payload.name, "password_hash": hash_password(payload.password),
        "bio": "", "avatar": "", "banner": "",
        "verified": False, "private": False, "onboarded": False,
        "followers": [], "following": [], "bookmarks": [],
        "last_seen": now_iso(), "created_at": now_iso(),
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
async def me(user=Depends(get_current_user)):
    return public_user(user)


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
@api.get("/users/suggestions")
async def user_suggestions(user=Depends(get_current_user)):
    cursor = db.users.find(
        {"id": {"$nin": user.get("following", []) + [user["id"]]}}, {"_id": 0},
    ).limit(5)
    users = await cursor.to_list(5)
    return [public_user(u) for u in users]


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
        raise HTTPException(404, "Usuário não encontrado")
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


@api.get("/users/{username}/posts")
async def user_posts(username: str, tab: str = "posts", viewer: Optional[dict] = Depends(maybe_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    if not await can_view_profile(user, viewer):
        return []
    if tab == "media":
        query = {"author_id": user["id"], "image": {"$ne": ""}}
    elif tab == "likes":
        query = {"likes": user["id"]}
    else:
        query = {"author_id": user["id"]}
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, viewer) for p in posts]


@api.get("/users/{username}/followers")
async def list_followers(username: str, viewer=Depends(get_current_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    if not await can_view_profile(user, viewer):
        return []
    fls = await db.users.find({"id": {"$in": user.get("followers", [])}}, {"_id": 0}).to_list(500)
    return [public_user(u) for u in fls]


@api.get("/users/{username}/following")
async def list_following(username: str, viewer=Depends(get_current_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    if not await can_view_profile(user, viewer):
        return []
    fls = await db.users.find({"id": {"$in": user.get("following", [])}}, {"_id": 0}).to_list(500)
    return [public_user(u) for u in fls]


@api.post("/users/{username}/follow")
async def follow_user(username: str, user=Depends(get_current_user)):
    target = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Usuário não encontrado")
    if target["id"] == user["id"]:
        raise HTTPException(400, "Não é possível seguir a si mesmo")
    is_following = user["id"] in target.get("followers", [])
    if is_following:
        await db.users.update_one({"id": target["id"]}, {"$pull": {"followers": user["id"]}})
        await db.users.update_one({"id": user["id"]}, {"$pull": {"following": target["id"]}})
        return {"following": False}
    await db.users.update_one({"id": target["id"]}, {"$addToSet": {"followers": user["id"]}})
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"following": target["id"]}})
    await create_notification(target["id"], "follow", user["id"], None, f"@{user['username']} começou a seguir você")
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
            raise HTTPException(403, "Você precisa entrar na comunidade primeiro")
        community_id = c["id"]
    post = {
        "id": str(uuid.uuid4()), "author_id": user["id"],
        "content": payload.content, "image": payload.image or "",
        "likes": [], "bookmarks": [], "reposts": [],
        "hashtags": extract_hashtags(payload.content),
        "community_id": community_id,
        "created_at": now_iso(),
    }
    await db.posts.insert_one(post)
    await handle_mentions(payload.content, user, post["id"])
    return await enrich_post(post, user)


@api.get("/posts/feed")
async def feed(user=Depends(get_current_user)):
    ids = user.get("following", []) + [user["id"]]
    posts = await db.posts.find({"author_id": {"$in": ids}}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, user) for p in posts]


@api.get("/posts/explore")
async def explore(viewer: Optional[dict] = Depends(maybe_user)):
    posts = await db.posts.find({"repost_of": {"$exists": False}}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, viewer) for p in posts]


@api.get("/posts/bookmarks")
async def bookmarks(user=Depends(get_current_user)):
    posts = await db.posts.find({"bookmarks": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, user) for p in posts]


@api.get("/posts/tag/{tag}")
async def posts_by_tag(tag: str, viewer: Optional[dict] = Depends(maybe_user)):
    posts = await db.posts.find(
        {"hashtags": tag.lower(), "repost_of": {"$exists": False}}, {"_id": 0}
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
    await create_notification(post["author_id"], "like", user["id"], post_id, f"@{user['username']} curtiu sua publicação")
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
    await create_notification(origin["author_id"], "repost", user["id"], origin["id"], f"@{user['username']} repostou sua publicação")
    return {"reposted": True, "reposts_count": len(origin.get("reposts", [])) + 1}


# ============================================================
# Comments
# ============================================================
@api.get("/posts/{post_id}/comments")
async def list_comments(post_id: str):
    cs = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    out = []
    for c in cs:
        author = await db.users.find_one({"id": c["author_id"]}, {"_id": 0})
        out.append({
            "id": c["id"], "content": c["content"], "created_at": c["created_at"],
            "author": public_user(author) if author else None,
        })
    return out


@api.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, payload: CommentIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    comment = {
        "id": str(uuid.uuid4()), "post_id": post_id, "author_id": user["id"],
        "content": payload.content, "created_at": now_iso(),
    }
    await db.comments.insert_one(comment)
    await create_notification(post["author_id"], "comment", user["id"], post_id, f"@{user['username']} comentou em sua publicação")
    await handle_mentions(payload.content, user, post_id)
    return {
        "id": comment["id"], "content": comment["content"],
        "created_at": comment["created_at"], "author": public_user(user),
    }


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
    c = {
        "id": str(uuid.uuid4()), "name": payload.name, "slug": slug,
        "description": payload.description, "banner": "",
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
    e = {
        "id": str(uuid.uuid4()), "title": payload.title,
        "description": payload.description, "location": payload.location,
        "starts_at": payload.starts_at, "created_by": user["id"],
        "attendees": [user["id"]], "created_at": now_iso(),
    }
    await db.events.insert_one(e)
    e.pop("_id", None)
    return _event_public(e, user)


@api.get("/events")
async def list_events(viewer: Optional[dict] = Depends(maybe_user)):
    items = await db.events.find({}, {"_id": 0}).sort("starts_at", 1).to_list(200)
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
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    out = []
    for n in items:
        from_user = await db.users.find_one({"id": n["from_user_id"]}, {"_id": 0})
        out.append({
            "id": n["id"], "type": n["type"], "text": n["text"],
            "read": n["read"], "created_at": n["created_at"],
            "post_id": n.get("post_id"),
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
async def list_conversations(user=Depends(get_current_user)):
    convs = await db.conversations.find({"participants": user["id"]}, {"_id": 0}).sort("last_at", -1).to_list(100)
    out = []
    for c in convs:
        other_id = next((p for p in c["participants"] if p != user["id"]), None)
        other = await db.users.find_one({"id": other_id}, {"_id": 0}) if other_id else None
        unread = await db.messages.count_documents({
            "conversation_key": c["key"], "sender_id": {"$ne": user["id"]}, "read": False,
        })
        out.append({
            "key": c["key"], "other_user": public_user(other) if other else None,
            "last_message": c.get("last_message", ""), "last_at": c.get("last_at"),
            "unread": unread,
        })
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


@api.post("/messages")
async def send_message(payload: MessageIn, user=Depends(get_current_user)):
    other = await db.users.find_one({"id": payload.to_user_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Usuário não encontrado")
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
# Trending
# ============================================================
@api.get("/trending")
async def trending():
    posts = await db.posts.find(
        {"hashtags": {"$exists": True, "$ne": []}}, {"_id": 0, "hashtags": 1}
    ).sort("created_at", -1).to_list(300)
    counts: dict[str, int] = {}
    for p in posts:
        for t in p.get("hashtags", []):
            counts[t] = counts.get(t, 0) + 1
    items = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:20]
    return [{"tag": k, "count": v} for k, v in items]


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


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
