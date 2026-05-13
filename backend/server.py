from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ============================================================
# Setup
# ============================================================
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
        "sub": user_id,
        "email": email,
        "type": "access",
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


def public_user(user: dict) -> dict:
    if not user:
        return None
    return {
        "id": user["id"],
        "email": user.get("email"),
        "username": user.get("username"),
        "name": user.get("name"),
        "bio": user.get("bio", ""),
        "avatar": user.get("avatar", ""),
        "banner": user.get("banner", ""),
        "verified": user.get("verified", False),
        "followers_count": len(user.get("followers", [])),
        "following_count": len(user.get("following", [])),
        "created_at": user.get("created_at"),
    }


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


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def conv_key(a: str, b: str) -> str:
    return ":".join(sorted([a, b]))


def extract_hashtags(text: str) -> list:
    return list({m.group(1).lower() for m in HASHTAG_RE.finditer(text or "")})


def extract_mentions(text: str) -> list:
    return list({m.group(1).lower() for m in MENTION_RE.finditer(text or "")})


async def enrich_post(post: dict, viewer: Optional[dict]) -> dict:
    author = await db.users.find_one({"id": post["author_id"]}, {"_id": 0})
    viewer_id = viewer["id"] if viewer else None
    comments_count = await db.comments.count_documents({"post_id": post["id"]})
    repost_origin = None
    repost_of_id = post.get("repost_of")
    if repost_of_id:
        orig = await db.posts.find_one({"id": repost_of_id}, {"_id": 0})
        if orig:
            orig_author = await db.users.find_one({"id": orig["author_id"]}, {"_id": 0})
            orig_comments = await db.comments.count_documents({"post_id": orig["id"]})
            repost_origin = {
                "id": orig["id"],
                "content": orig["content"],
                "image": orig.get("image", ""),
                "created_at": orig["created_at"],
                "likes_count": len(orig.get("likes", [])),
                "comments_count": orig_comments,
                "reposts_count": len(orig.get("reposts", [])),
                "liked": viewer_id in orig.get("likes", []) if viewer_id else False,
                "bookmarked": viewer_id in orig.get("bookmarks", []) if viewer_id else False,
                "reposted": viewer_id in orig.get("reposts", []) if viewer_id else False,
                "author": public_user(orig_author) if orig_author else None,
            }
    return {
        "id": post["id"],
        "content": post["content"],
        "image": post.get("image", ""),
        "created_at": post["created_at"],
        "likes_count": len(post.get("likes", [])),
        "reposts_count": len(post.get("reposts", [])),
        "comments_count": comments_count,
        "liked": viewer_id in post.get("likes", []) if viewer_id else False,
        "bookmarked": viewer_id in post.get("bookmarks", []) if viewer_id else False,
        "reposted": viewer_id in post.get("reposts", []) if viewer_id else False,
        "author": public_user(author) if author else None,
        "repost_of": repost_origin,
    }


async def create_notification(user_id: str, ntype: str, from_user_id: str,
                               post_id: Optional[str] = None, text: str = "") -> None:
    if user_id == from_user_id:
        return
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": ntype,
        "from_user_id": from_user_id,
        "post_id": post_id,
        "text": text,
        "read": False,
        "created_at": now_iso(),
    })


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


class UpdateProfileIn(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    banner: Optional[str] = None


class PostIn(BaseModel):
    content: str = Field(min_length=1, max_length=500)
    image: Optional[str] = ""


class CommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=300)


class MessageIn(BaseModel):
    to_user_id: str
    content: str = Field(min_length=1, max_length=2000)


class StoryIn(BaseModel):
    image: str
    content: Optional[str] = ""


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
        "id": str(uuid.uuid4()),
        "email": email,
        "username": username,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "bio": "",
        "avatar": "",
        "banner": "",
        "verified": False,
        "followers": [],
        "following": [],
        "bookmarks": [],
        "created_at": now_iso(),
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
    return {"user": public_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return public_user(user)


# ============================================================
# Users
# ============================================================
@api.get("/users/suggestions")
async def user_suggestions(user=Depends(get_current_user)):
    cursor = db.users.find(
        {"id": {"$nin": user.get("following", []) + [user["id"]]}},
        {"_id": 0},
    ).limit(5)
    users = await cursor.to_list(5)
    return [public_user(u) for u in users]


@api.get("/users/search")
async def search_users(q: str = "", user=Depends(get_current_user)):
    if not q.strip():
        return []
    regex = {"$regex": q, "$options": "i"}
    cursor = db.users.find(
        {"$or": [{"username": regex}, {"name": regex}]},
        {"_id": 0},
    ).limit(20)
    users = await cursor.to_list(20)
    return [public_user(u) for u in users]


@api.get("/users/{username}")
async def get_user(username: str, viewer: Optional[dict] = Depends(maybe_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    data = public_user(user)
    data["is_following"] = bool(viewer and viewer["id"] in user.get("followers", []))
    data["is_self"] = bool(viewer and viewer["id"] == user["id"])
    return data


@api.get("/users/{username}/posts")
async def user_posts(username: str, tab: str = "posts", viewer: Optional[dict] = Depends(maybe_user)):
    user = await db.users.find_one({"username": username.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    if tab == "media":
        query = {"author_id": user["id"], "image": {"$ne": ""}}
    elif tab == "likes":
        query = {"likes": user["id"]}
    else:
        query = {"author_id": user["id"]}
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [await enrich_post(p, viewer) for p in posts]


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
    else:
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


# ============================================================
# Posts
# ============================================================
@api.post("/posts")
async def create_post(payload: PostIn, user=Depends(get_current_user)):
    post = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "content": payload.content,
        "image": payload.image or "",
        "likes": [],
        "bookmarks": [],
        "reposts": [],
        "hashtags": extract_hashtags(payload.content),
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
    else:
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
    else:
        await db.posts.update_one({"id": post_id}, {"$addToSet": {"bookmarks": user["id"]}})
        return {"bookmarked": True}


@api.post("/posts/{post_id}/repost")
async def repost(post_id: str, user=Depends(get_current_user)):
    original = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not original:
        raise HTTPException(404, "Publicação não encontrada")
    # actual original (if reposting a repost, point to its origin)
    origin_id = original.get("repost_of") or original["id"]
    origin = await db.posts.find_one({"id": origin_id}, {"_id": 0})
    if not origin:
        raise HTTPException(404, "Publicação original não encontrada")
    already = user["id"] in origin.get("reposts", [])
    if already:
        await db.posts.update_one({"id": origin["id"]}, {"$pull": {"reposts": user["id"]}})
        await db.posts.delete_many({"author_id": user["id"], "repost_of": origin["id"]})
        return {"reposted": False, "reposts_count": len(origin.get("reposts", [])) - 1}
    else:
        await db.posts.update_one({"id": origin["id"]}, {"$addToSet": {"reposts": user["id"]}})
        new_post = {
            "id": str(uuid.uuid4()),
            "author_id": user["id"],
            "content": "",
            "image": "",
            "likes": [],
            "bookmarks": [],
            "reposts": [],
            "hashtags": [],
            "repost_of": origin["id"],
            "created_at": now_iso(),
        }
        await db.posts.insert_one(new_post)
        await create_notification(origin["author_id"], "repost", user["id"], origin["id"], f"@{user['username']} repostou sua publicação")
        return {"reposted": True, "reposts_count": len(origin.get("reposts", [])) + 1}


# ============================================================
# Comments
# ============================================================
@api.get("/posts/{post_id}/comments")
async def list_comments(post_id: str):
    cs = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    enriched = []
    for c in cs:
        author = await db.users.find_one({"id": c["author_id"]}, {"_id": 0})
        enriched.append({
            "id": c["id"],
            "content": c["content"],
            "created_at": c["created_at"],
            "author": public_user(author) if author else None,
        })
    return enriched


@api.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, payload: CommentIn, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    comment = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "author_id": user["id"],
        "content": payload.content,
        "created_at": now_iso(),
    }
    await db.comments.insert_one(comment)
    await create_notification(post["author_id"], "comment", user["id"], post_id, f"@{user['username']} comentou em sua publicação")
    await handle_mentions(payload.content, user, post_id)
    return {
        "id": comment["id"],
        "content": comment["content"],
        "created_at": comment["created_at"],
        "author": public_user(user),
    }


# ============================================================
# Stories (24h ephemeral)
# ============================================================
@api.post("/stories")
async def create_story(payload: StoryIn, user=Depends(get_current_user)):
    if not payload.image:
        raise HTTPException(400, "Imagem é obrigatória")
    now = datetime.now(timezone.utc)
    story = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "image": payload.image,
        "content": payload.content or "",
        "viewers": [],
        "created_at": now.isoformat(),
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
    # group by author
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
            "author": public_user(author),
            "stories": items_sorted,
            "has_unseen": unseen,
        })
    # put viewer's own first, others by has_unseen
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
# Notifications
# ============================================================
@api.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    out = []
    for n in items:
        from_user = await db.users.find_one({"id": n["from_user_id"]}, {"_id": 0})
        out.append({
            "id": n["id"],
            "type": n["type"],
            "text": n["text"],
            "read": n["read"],
            "created_at": n["created_at"],
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
# Messages (DMs)
# ============================================================
@api.get("/conversations")
async def list_conversations(user=Depends(get_current_user)):
    convs = await db.conversations.find({"participants": user["id"]}, {"_id": 0}).sort("last_at", -1).to_list(100)
    out = []
    for c in convs:
        other_id = next((p for p in c["participants"] if p != user["id"]), None)
        other = await db.users.find_one({"id": other_id}, {"_id": 0}) if other_id else None
        unread = await db.messages.count_documents({
            "conversation_key": c["key"],
            "sender_id": {"$ne": user["id"]},
            "read": False,
        })
        out.append({
            "key": c["key"],
            "other_user": public_user(other) if other else None,
            "last_message": c.get("last_message", ""),
            "last_at": c.get("last_at"),
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
    return {
        "other_user": public_user(other) if other else None,
        "messages": msgs,
    }


@api.post("/messages")
async def send_message(payload: MessageIn, user=Depends(get_current_user)):
    other = await db.users.find_one({"id": payload.to_user_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Usuário não encontrado")
    key = conv_key(user["id"], other["id"])
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_key": key,
        "sender_id": user["id"],
        "recipient_id": other["id"],
        "content": payload.content,
        "read": False,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    await db.conversations.update_one(
        {"key": key},
        {"$set": {
            "key": key,
            "participants": sorted([user["id"], other["id"]]),
            "last_message": payload.content,
            "last_at": msg["created_at"],
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
    ).sort("created_at", -1).to_list(200)
    counts: dict[str, int] = {}
    for p in posts:
        for t in p.get("hashtags", []):
            counts[t] = counts.get(t, 0) + 1
    items = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:6]
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
    await db.notifications.create_index("user_id")
    await db.messages.create_index("conversation_key")
    await db.conversations.create_index("key", unique=True)
    await db.stories.create_index("expires_at")
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vermillion.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "username": "admin",
            "name": "Vermillion",
            "password_hash": hash_password(admin_password),
            "bio": "Conta oficial. Bem-vindo ao Vermillion ✦",
            "avatar": "",
            "banner": "",
            "verified": True,
            "followers": [],
            "following": [],
            "bookmarks": [],
            "created_at": now_iso(),
        })
        logger.info("Admin seeded")
    else:
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password)}},
            )
        await db.users.update_one({"email": admin_email}, {"$set": {"verified": True}})


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
