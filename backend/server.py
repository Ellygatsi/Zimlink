from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ----- Setup -----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"

app = FastAPI(title="SuperApp API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("superapp")


# ----- Helpers -----
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----- Models -----
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class SendMoneyIn(BaseModel):
    recipient_email: EmailStr
    amount: float = Field(gt=0)
    note: Optional[str] = ""

class ListingIn(BaseModel):
    title: str
    description: str
    price: float = Field(ge=0)
    category: Literal["goods", "services"]
    image_url: Optional[str] = ""

class PostIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    image_url: Optional[str] = ""

class CommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=500)

class ChannelIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    description: Optional[str] = ""

class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


# ----- Auth Endpoints -----
@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_id()
    user = {
        "id": user_id,
        "email": email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "avatar_url": "",
        "wallet_balance": 100.0,  # starter bonus
        "phone": "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user_id, email)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=7*24*3600, path="/")
    user.pop("_id", None)
    user.pop("password_hash", None)
    return {"token": token, "user": user}

@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], email)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=7*24*3600, path="/")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


# ----- Users / Contacts -----
@api.get("/users")
async def list_users(current=Depends(get_current_user)):
    users = await db.users.find({"id": {"$ne": current["id"]}}, {"_id": 0, "password_hash": 0}).to_list(200)
    return users


# ----- Wallet -----
@api.get("/wallet/balance")
async def get_balance(current=Depends(get_current_user)):
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "wallet_balance": 1})
    return {"balance": user.get("wallet_balance", 0.0)}

@api.post("/wallet/send")
async def send_money(data: SendMoneyIn, current=Depends(get_current_user)):
    recipient = await db.users.find_one({"email": data.recipient_email.lower()})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if recipient["id"] == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot send to yourself")
    sender = await db.users.find_one({"id": current["id"]})
    if sender["wallet_balance"] < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    await db.users.update_one({"id": sender["id"]}, {"$inc": {"wallet_balance": -data.amount}})
    await db.users.update_one({"id": recipient["id"]}, {"$inc": {"wallet_balance": data.amount}})
    tx = {
        "id": new_id(),
        "from_id": sender["id"],
        "from_name": sender["name"],
        "from_email": sender["email"],
        "to_id": recipient["id"],
        "to_name": recipient["name"],
        "to_email": recipient["email"],
        "amount": data.amount,
        "note": data.note or "",
        "created_at": now_iso(),
    }
    await db.transactions.insert_one(tx)
    tx.pop("_id", None)
    return tx

@api.get("/wallet/transactions")
async def transactions(current=Depends(get_current_user)):
    uid = current["id"]
    txs = await db.transactions.find(
        {"$or": [{"from_id": uid}, {"to_id": uid}]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return txs


# ----- Marketplace -----
@api.post("/marketplace/listings")
async def create_listing(data: ListingIn, current=Depends(get_current_user)):
    listing = {
        "id": new_id(),
        "title": data.title,
        "description": data.description,
        "price": data.price,
        "category": data.category,
        "image_url": data.image_url or "",
        "seller_id": current["id"],
        "seller_name": current["name"],
        "seller_email": current["email"],
        "created_at": now_iso(),
    }
    await db.listings.insert_one(listing)
    listing.pop("_id", None)
    return listing

@api.get("/marketplace/listings")
async def get_listings(category: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    items = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api.get("/marketplace/listings/{listing_id}")
async def get_listing(listing_id: str):
    item = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    return item

@api.delete("/marketplace/listings/{listing_id}")
async def delete_listing(listing_id: str, current=Depends(get_current_user)):
    item = await db.listings.find_one({"id": listing_id})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    if item["seller_id"] != current["id"]:
        raise HTTPException(status_code=403, detail="Not your listing")
    await db.listings.delete_one({"id": listing_id})
    return {"ok": True}


# ----- Community: Posts (feed) -----
@api.post("/community/posts")
async def create_post(data: PostIn, current=Depends(get_current_user)):
    post = {
        "id": new_id(),
        "author_id": current["id"],
        "author_name": current["name"],
        "content": data.content,
        "image_url": data.image_url or "",
        "likes": [],
        "comment_count": 0,
        "created_at": now_iso(),
    }
    await db.posts.insert_one(post)
    post.pop("_id", None)
    return post

@api.get("/community/posts")
async def get_posts():
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return posts

@api.post("/community/posts/{post_id}/like")
async def like_post(post_id: str, current=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Not found")
    uid = current["id"]
    if uid in post.get("likes", []):
        await db.posts.update_one({"id": post_id}, {"$pull": {"likes": uid}})
        liked = False
    else:
        await db.posts.update_one({"id": post_id}, {"$addToSet": {"likes": uid}})
        liked = True
    updated = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return {"liked": liked, "likes_count": len(updated.get("likes", []))}

@api.get("/community/posts/{post_id}/comments")
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return comments

@api.post("/community/posts/{post_id}/comments")
async def add_comment(post_id: str, data: CommentIn, current=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    c = {
        "id": new_id(),
        "post_id": post_id,
        "author_id": current["id"],
        "author_name": current["name"],
        "content": data.content,
        "created_at": now_iso(),
    }
    await db.comments.insert_one(c)
    await db.posts.update_one({"id": post_id}, {"$inc": {"comment_count": 1}})
    c.pop("_id", None)
    return c


# ----- Community: Channels (Discord-style) -----
@api.get("/community/channels")
async def get_channels():
    chans = await db.channels.find({}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return chans

@api.post("/community/channels")
async def create_channel(data: ChannelIn, current=Depends(get_current_user)):
    chan = {
        "id": new_id(),
        "name": data.name,
        "description": data.description or "",
        "creator_id": current["id"],
        "created_at": now_iso(),
    }
    await db.channels.insert_one(chan)
    chan.pop("_id", None)
    return chan

@api.get("/community/channels/{channel_id}/messages")
async def channel_messages(channel_id: str):
    msgs = await db.channel_messages.find({"channel_id": channel_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs

@api.post("/community/channels/{channel_id}/messages")
async def post_channel_message(channel_id: str, data: MessageIn, current=Depends(get_current_user)):
    chan = await db.channels.find_one({"id": channel_id})
    if not chan:
        raise HTTPException(status_code=404, detail="Channel not found")
    m = {
        "id": new_id(),
        "channel_id": channel_id,
        "author_id": current["id"],
        "author_name": current["name"],
        "content": data.content,
        "created_at": now_iso(),
    }
    await db.channel_messages.insert_one(m)
    m.pop("_id", None)
    return m


# ----- VoIP (Twilio scaffold, feature-flagged) -----
def get_voice_status():
    enabled = os.environ.get("TWILIO_VOICE_ENABLED", "false").lower() == "true"
    required = [
        os.environ.get("TWILIO_ACCOUNT_SID"),
        os.environ.get("TWILIO_API_KEY_SID"),
        os.environ.get("TWILIO_API_KEY_SECRET"),
        os.environ.get("TWILIO_TWIML_APP_SID"),
    ]
    configured = all(v for v in required)
    if not enabled:
        return {"enabled": False, "configured": configured, "reason": "Twilio Voice is disabled. Add credentials and set TWILIO_VOICE_ENABLED=true."}
    if not configured:
        return {"enabled": False, "configured": False, "reason": "Missing Twilio environment variables."}
    return {"enabled": True, "configured": True, "reason": None}

@api.get("/voice/config")
async def voice_config():
    return get_voice_status()

@api.get("/voice/token")
async def voice_token(current=Depends(get_current_user)):
    status_info = get_voice_status()
    if not status_info["enabled"]:
        raise HTTPException(status_code=503, detail=status_info["reason"])
    from twilio.jwt.access_token import AccessToken
    from twilio.jwt.access_token.grants import VoiceGrant
    token = AccessToken(
        os.environ["TWILIO_ACCOUNT_SID"],
        os.environ["TWILIO_API_KEY_SID"],
        os.environ["TWILIO_API_KEY_SECRET"],
        identity=current["id"],
        ttl=3600,
    )
    grant = VoiceGrant(
        outgoing_application_sid=os.environ["TWILIO_TWIML_APP_SID"],
        incoming_allow=True,
    )
    token.add_grant(grant)
    jwt_token = token.to_jwt()
    if isinstance(jwt_token, bytes):
        jwt_token = jwt_token.decode("utf-8")
    return {"token": jwt_token, "identity": current["id"]}

@api.post("/voice/call-log")
async def log_call(payload: dict, current=Depends(get_current_user)):
    entry = {
        "id": new_id(),
        "user_id": current["id"],
        "to": payload.get("to", ""),
        "to_name": payload.get("to_name", ""),
        "direction": payload.get("direction", "outbound"),
        "duration_seconds": int(payload.get("duration_seconds", 0)),
        "status": payload.get("status", "completed"),
        "created_at": now_iso(),
    }
    await db.calls.insert_one(entry)
    entry.pop("_id", None)
    return entry

@api.get("/voice/call-history")
async def call_history(current=Depends(get_current_user)):
    items = await db.calls.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


# ----- Stats for dashboard -----
@api.get("/stats/home")
async def home_stats(current=Depends(get_current_user)):
    uid = current["id"]
    user = await db.users.find_one({"id": uid}, {"_id": 0, "wallet_balance": 1})
    tx_count = await db.transactions.count_documents({"$or": [{"from_id": uid}, {"to_id": uid}]})
    listing_count = await db.listings.count_documents({})
    post_count = await db.posts.count_documents({})
    call_count = await db.calls.count_documents({"user_id": uid})
    recent_post = await db.posts.find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    recent_listing = await db.listings.find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    return {
        "balance": user.get("wallet_balance", 0.0) if user else 0.0,
        "tx_count": tx_count,
        "listing_count": listing_count,
        "post_count": post_count,
        "call_count": call_count,
        "recent_post": recent_post,
        "recent_listing": recent_listing,
    }


# ----- App config / startup -----
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.listings.create_index("created_at")
    await db.posts.create_index("created_at")
    await db.transactions.create_index([("from_id", 1), ("created_at", -1)])
    await db.channels.create_index("name")
    # Seed admin & test user
    for email_key, pw_key, name, balance in [
        ("ADMIN_EMAIL", "ADMIN_PASSWORD", "Admin", 1000.0),
        ("TEST_USER_EMAIL", "TEST_USER_PASSWORD", "Test User", 500.0),
    ]:
        email = os.environ.get(email_key, "").lower()
        password = os.environ.get(pw_key, "")
        if not email or not password:
            continue
        existing = await db.users.find_one({"email": email})
        if not existing:
            await db.users.insert_one({
                "id": new_id(),
                "email": email,
                "name": name,
                "password_hash": hash_password(password),
                "avatar_url": "",
                "wallet_balance": balance,
                "phone": "",
                "created_at": now_iso(),
            })
            logger.info(f"Seeded user: {email}")
    # Seed a default channel
    if not await db.channels.find_one({"name": "general"}):
        admin = await db.users.find_one({"email": os.environ.get("ADMIN_EMAIL", "").lower()})
        await db.channels.insert_one({
            "id": new_id(),
            "name": "general",
            "description": "Welcome to the community! Say hi here.",
            "creator_id": admin["id"] if admin else "system",
            "created_at": now_iso(),
        })


@app.on_event("shutdown")
async def shutdown():
    client.close()
