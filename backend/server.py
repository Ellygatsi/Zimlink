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


async def require_admin(current=Depends(get_current_user)) -> dict:
    if not current.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current


async def get_rate_for_number(to_number: str) -> dict:
    """Find the best matching call rate for an E.164 number by longest-prefix match.
    Falls back to the 'default' rate if no prefix matches."""
    to_number = (to_number or "").strip()
    if to_number and not to_number.startswith("+"):
        # In-app client-id calls are free
        if not to_number[0].isdigit():
            return {"rate_per_minute": 0.0, "name": "In-app", "prefix": ""}
    rates = await db.call_rates.find({}, {"_id": 0}).to_list(100)
    best = None
    for r in rates:
        prefix = r.get("prefix", "")
        if prefix == "default":
            continue
        if prefix and to_number.startswith(prefix):
            if best is None or len(prefix) > len(best.get("prefix", "")):
                best = r
    if best:
        return best
    default = next((r for r in rates if r.get("prefix") == "default"), None)
    return default or {"rate_per_minute": 0.30, "name": "Default", "prefix": "default"}


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

class CallRateIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    prefix: str = Field(min_length=1, max_length=20)  # e.g. "+2637" or "default"
    rate_per_minute: float = Field(ge=0)
    cost_per_minute: float = Field(ge=0, default=0.0)  # what Twilio charges us

class UpdateRateIn(BaseModel):
    name: Optional[str] = None
    prefix: Optional[str] = None
    rate_per_minute: Optional[float] = Field(default=None, ge=0)
    cost_per_minute: Optional[float] = Field(default=None, ge=0)


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
    recipient = await db.users.find_one(
        {"email": data.recipient_email.lower()},
        {"_id": 0, "id": 1, "name": 1, "email": 1},
    )
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if recipient["id"] == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot send to yourself")
    sender = await db.users.find_one(
        {"id": current["id"]},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "wallet_balance": 1},
    )
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
    item = await db.listings.find_one({"id": listing_id}, {"_id": 0, "seller_id": 1})
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
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "likes": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Not found")
    uid = current["id"]
    current_likes = post.get("likes", [])
    if uid in current_likes:
        await db.posts.update_one({"id": post_id}, {"$pull": {"likes": uid}})
        likes_count = len(current_likes) - 1
        liked = False
    else:
        await db.posts.update_one({"id": post_id}, {"$addToSet": {"likes": uid}})
        likes_count = len(current_likes) + 1
        liked = True
    return {"liked": liked, "likes_count": likes_count}

@api.get("/community/posts/{post_id}/comments")
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return comments

@api.post("/community/posts/{post_id}/comments")
async def add_comment(post_id: str, data: CommentIn, current=Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "id": 1})
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
    chan = await db.channels.find_one({"id": channel_id}, {"_id": 0, "id": 1})
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

@api.api_route("/voice/twiml", methods=["POST", "GET"])
async def voice_twiml(request: Request):
    """TwiML endpoint Twilio calls to know how to handle an outgoing browser call.
    Twilio sends form-encoded params; we read 'To' and dial it as a PSTN number
    if it starts with '+', otherwise treat as a Voice SDK client identity."""
    from twilio.twiml.voice_response import VoiceResponse, Dial
    form = {}
    try:
        form_data = await request.form()
        form = dict(form_data)
    except Exception:
        pass
    to_value = (form.get("To") or request.query_params.get("To") or "").strip()
    response = VoiceResponse()
    if not to_value:
        response.say("No destination specified.")
        return Response(content=str(response), media_type="text/xml")
    caller_id = os.environ.get("TWILIO_VOICE_CALLER_ID", "")
    dial = Dial(caller_id=caller_id, answer_on_bridge=True, timeout=30)
    if to_value.startswith("+") and len(to_value) >= 8:
        dial.number(to_value)
    else:
        dial.client(to_value)
    response.append(dial)
    return Response(content=str(response), media_type="text/xml")


@api.get("/voice/rate-quote")
async def voice_rate_quote(to: str, current=Depends(get_current_user)):
    """Return what the rate per minute is for the given destination + balance + max minutes."""
    rate = await get_rate_for_number(to)
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "wallet_balance": 1})
    balance = float(user.get("wallet_balance", 0.0)) if user else 0.0
    rpm = float(rate.get("rate_per_minute", 0.0))
    max_minutes = (balance / rpm) if rpm > 0 else float("inf")
    return {
        "to": to,
        "rate_per_minute": rpm,
        "rate_name": rate.get("name", ""),
        "balance": balance,
        "max_minutes": round(max_minutes, 2) if rpm > 0 else None,
        "free": rpm == 0,
    }


@api.post("/voice/call-log")
async def log_call(payload: dict, current=Depends(get_current_user)):
    """Log a finished call and bill the caller's wallet based on configured rates."""
    to = (payload.get("to") or "").strip()
    duration = max(0, min(int(payload.get("duration_seconds", 0) or 0), 4 * 60 * 60))
    status_val = payload.get("status", "completed")
    direction = payload.get("direction", "outbound")

    rate = await get_rate_for_number(to)
    rpm = float(rate.get("rate_per_minute", 0.0))
    cpm = float(rate.get("cost_per_minute", 0.0))
    charge = round(rpm * (duration / 60.0), 4) if direction == "outbound" else 0.0
    cost = round(cpm * (duration / 60.0), 4) if direction == "outbound" else 0.0

    billed = False
    if charge > 0:
        # Atomic balance decrement only if user has enough.
        result = await db.users.update_one(
            {"id": current["id"], "wallet_balance": {"$gte": charge}},
            {"$inc": {"wallet_balance": -charge}},
        )
        billed = result.modified_count == 1
        if not billed:
            status_val = "billing_failed"

    entry = {
        "id": new_id(),
        "user_id": current["id"],
        "user_name": current.get("name", ""),
        "user_email": current.get("email", ""),
        "to": to,
        "to_name": payload.get("to_name", ""),
        "direction": direction,
        "duration_seconds": duration,
        "status": status_val,
        "rate_per_minute": rpm,
        "cost_per_minute": cpm,
        "charge_amount": charge,
        "cost_amount": cost,
        "profit_amount": round(charge - cost, 4),
        "billed": billed,
        "rate_name": rate.get("name", ""),
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


# ----- Admin: Calling module -----
@api.get("/admin/me")
async def admin_me(current=Depends(require_admin)):
    return {"is_admin": True, "email": current["email"], "name": current.get("name", "")}

@api.get("/admin/stats/calls")
async def admin_call_stats(days: int = 30, _=Depends(require_admin)):
    """Aggregate call stats over the past N days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "direction": "outbound"}},
        {"$group": {
            "_id": None,
            "total_calls": {"$sum": 1},
            "total_seconds": {"$sum": "$duration_seconds"},
            "total_revenue": {"$sum": "$charge_amount"},
            "total_cost": {"$sum": "$cost_amount"},
            "total_profit": {"$sum": "$profit_amount"},
            "billed_calls": {"$sum": {"$cond": ["$billed", 1, 0]}},
        }},
    ]
    agg = await db.calls.aggregate(pipeline).to_list(1)
    summary = agg[0] if agg else {
        "total_calls": 0, "total_seconds": 0, "total_revenue": 0.0,
        "total_cost": 0.0, "total_profit": 0.0, "billed_calls": 0,
    }
    summary.pop("_id", None)

    # Top callers by spend
    top_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "direction": "outbound", "billed": True}},
        {"$group": {
            "_id": "$user_id",
            "user_name": {"$first": "$user_name"},
            "user_email": {"$first": "$user_email"},
            "calls": {"$sum": 1},
            "minutes": {"$sum": {"$divide": ["$duration_seconds", 60]}},
            "spent": {"$sum": "$charge_amount"},
        }},
        {"$sort": {"spent": -1}},
        {"$limit": 5},
    ]
    top_callers = await db.calls.aggregate(top_pipeline).to_list(5)
    for t in top_callers:
        t["user_id"] = t.pop("_id")

    # By-day series for chart
    by_day_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "direction": "outbound"}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "calls": {"$sum": 1},
            "revenue": {"$sum": "$charge_amount"},
            "minutes": {"$sum": {"$divide": ["$duration_seconds", 60]}},
        }},
        {"$sort": {"_id": 1}},
    ]
    by_day = await db.calls.aggregate(by_day_pipeline).to_list(60)
    by_day = [{"date": d["_id"], "calls": d["calls"], "revenue": d["revenue"], "minutes": d["minutes"]} for d in by_day]

    user_count = await db.users.count_documents({})
    return {
        "window_days": days,
        "summary": summary,
        "top_callers": top_callers,
        "by_day": by_day,
        "user_count": user_count,
    }

@api.get("/admin/calls")
async def admin_list_calls(limit: int = 100, _=Depends(require_admin)):
    items = await db.calls.find({}, {"_id": 0}).sort("created_at", -1).to_list(min(limit, 500))
    return items

@api.get("/admin/rates")
async def admin_list_rates(_=Depends(require_admin)):
    items = await db.call_rates.find({}, {"_id": 0}).sort("prefix", 1).to_list(200)
    return items

@api.post("/admin/rates")
async def admin_create_rate(data: CallRateIn, _=Depends(require_admin)):
    prefix = data.prefix.strip()
    existing = await db.call_rates.find_one({"prefix": prefix})
    if existing:
        raise HTTPException(status_code=400, detail="A rate with this prefix already exists")
    rate = {
        "id": new_id(),
        "name": data.name,
        "prefix": prefix,
        "rate_per_minute": float(data.rate_per_minute),
        "cost_per_minute": float(data.cost_per_minute),
        "created_at": now_iso(),
    }
    await db.call_rates.insert_one(rate)
    rate.pop("_id", None)
    return rate

@api.put("/admin/rates/{rate_id}")
async def admin_update_rate(rate_id: str, data: UpdateRateIn, _=Depends(require_admin)):
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.call_rates.update_one({"id": rate_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rate not found")
    updated = await db.call_rates.find_one({"id": rate_id}, {"_id": 0})
    return updated

@api.delete("/admin/rates/{rate_id}")
async def admin_delete_rate(rate_id: str, _=Depends(require_admin)):
    rate = await db.call_rates.find_one({"id": rate_id}, {"_id": 0, "prefix": 1})
    if not rate:
        raise HTTPException(status_code=404, detail="Rate not found")
    if rate.get("prefix") == "default":
        raise HTTPException(status_code=400, detail="Cannot delete the default rate")
    await db.call_rates.delete_one({"id": rate_id})
    return {"ok": True}

@api.get("/admin/users")
async def admin_list_users(_=Depends(require_admin)):
    items = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return items

@api.post("/admin/users/{user_id}/credit")
async def admin_credit_user(user_id: str, payload: dict, _=Depends(require_admin)):
    amount = float(payload.get("amount", 0))
    if amount == 0:
        raise HTTPException(status_code=400, detail="amount must be non-zero")
    result = await db.users.update_one({"id": user_id}, {"$inc": {"wallet_balance": amount}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "name": 1, "wallet_balance": 1})
    return user


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
    await db.calls.create_index([("user_id", 1), ("created_at", -1)])
    await db.calls.create_index("created_at")
    await db.call_rates.create_index("prefix", unique=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    # Seed admin & test user
    for email_key, pw_key, name, balance, is_admin in [
        ("ADMIN_EMAIL", "ADMIN_PASSWORD", "Admin", 1000.0, True),
        ("TEST_USER_EMAIL", "TEST_USER_PASSWORD", "Test User", 500.0, False),
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
                "is_admin": is_admin,
                "created_at": now_iso(),
            })
            logger.info(f"Seeded user: {email} (admin={is_admin})")
    # Backfill: ensure admin email user has is_admin=True
    if admin_email:
        await db.users.update_one({"email": admin_email}, {"$set": {"is_admin": True}})
    # Backfill: ensure all other users have is_admin field
    await db.users.update_many({"is_admin": {"$exists": False}}, {"$set": {"is_admin": False}})

    # Seed a default channel
    if not await db.channels.find_one({"name": "general"}):
        admin = await db.users.find_one({"email": admin_email})
        await db.channels.insert_one({
            "id": new_id(),
            "name": "general",
            "description": "Welcome to the community! Say hi here.",
            "creator_id": admin["id"] if admin else "system",
            "created_at": now_iso(),
        })

    # Seed default call rates (only if none exist)
    if await db.call_rates.count_documents({}) == 0:
        defaults = [
            {"name": "Zimbabwe Mobile",   "prefix": "+2637",  "rate_per_minute": 0.30, "cost_per_minute": 0.15},
            {"name": "Zimbabwe Landline", "prefix": "+2632",  "rate_per_minute": 0.20, "cost_per_minute": 0.08},
            {"name": "Zimbabwe Harare",   "prefix": "+2634",  "rate_per_minute": 0.20, "cost_per_minute": 0.08},
            {"name": "South Africa",      "prefix": "+27",    "rate_per_minute": 0.10, "cost_per_minute": 0.04},
            {"name": "United Kingdom",    "prefix": "+44",    "rate_per_minute": 0.05, "cost_per_minute": 0.02},
            {"name": "United States",     "prefix": "+1",     "rate_per_minute": 0.05, "cost_per_minute": 0.013},
            {"name": "Default",           "prefix": "default","rate_per_minute": 0.35, "cost_per_minute": 0.18},
        ]
        for r in defaults:
            r["id"] = new_id()
            r["created_at"] = now_iso()
        await db.call_rates.insert_many(defaults)
        logger.info(f"Seeded {len(defaults)} default call rates")


@app.on_event("shutdown")
async def shutdown():
    client.close()
