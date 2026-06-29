from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt as pyjwt
import random
import resend
import smtplib
from email.message import EmailMessage
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal
import resend
from email_templates import zimlink_email_template

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import stripe

# ----- Setup -----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"

stripe.api_key = os.environ.get("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

app = FastAPI(title="Zimlink API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zimlink")


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


def generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"

def code_expiry(minutes: int = 15) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()

def code_is_expired(expires_at: str) -> bool:
    try:
        return datetime.fromisoformat(expires_at) < datetime.now(timezone.utc)
    except Exception:
        return True

async def save_verification_code(email: str, purpose: str, code: str, extra: Optional[dict] = None) -> None:
    email = email.lower().strip()
    await db.verification_codes.delete_many({"email": email, "purpose": purpose})
    await db.verification_codes.insert_one({
        "id": new_id(),
        "email": email,
        "purpose": purpose,
        "code_hash": hash_password(code),
        "extra": extra or {},
        "attempts": 0,
        "expires_at": code_expiry(15),
        "created_at": now_iso(),
    })

async def verify_code(email: str, purpose: str, code: str) -> dict:
    email = email.lower().strip()
    record = await db.verification_codes.find_one({"email": email, "purpose": purpose})
    if not record:
        raise HTTPException(status_code=400, detail="Verification code not found or expired")

    if code_is_expired(record.get("expires_at", "")):
        await db.verification_codes.delete_one({"id": record["id"]})
        raise HTTPException(status_code=400, detail="Verification code expired")

    attempts = int(record.get("attempts", 0))
    if attempts >= 5:
        await db.verification_codes.delete_one({"id": record["id"]})
        raise HTTPException(status_code=400, detail="Too many incorrect attempts. Request a new code")

    if not verify_password(code, record.get("code_hash", "")):
        await db.verification_codes.update_one({"id": record["id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid verification code")

    return record

def send_email_code(to_email: str, code: str, purpose: str) -> None:
    app_name = os.environ.get("APP_NAME", "ZimLink").strip() or "ZimLink"
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get("FROM_EMAIL", "ZimLink <info@zimlink.me>").strip()

    if not resend_api_key:
        logger.warning("RESEND_API_KEY is missing. Email was not sent.")
        logger.warning(f"EMAIL CODE for {to_email} ({purpose}): {code}")
        return

    resend.api_key = resend_api_key

    subject = f"Your {app_name} verification code"
    if purpose == "password_reset":
        subject = f"Reset your {app_name} password"

    html = zimlink_email_template(code, purpose)

    try:
        resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
        })

        logger.info(f"Sent {purpose} code to {to_email} from {from_email}")
    except Exception as exc:
        logger.error(f"Could not send Resend email to {to_email}: {exc}")
        logger.warning(f"EMAIL CODE for {to_email} ({purpose}): {code}")


async def get_rate_for_number(to_number: str) -> dict:
    to_number = (to_number or "").strip()
    if to_number and not to_number.startswith("+"):
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

class RegisterCodeRequestIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class VerifyRegisterCodeIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)

class PasswordResetRequestIn(BaseModel):
    email: EmailStr

class PasswordResetConfirmIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6)

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
    prefix: str = Field(min_length=1, max_length=20)
    rate_per_minute: float = Field(ge=0)
    cost_per_minute: float = Field(ge=0, default=0.0)

class UpdateRateIn(BaseModel):
    name: Optional[str] = None
    prefix: Optional[str] = None
    rate_per_minute: Optional[float] = Field(default=None, ge=0)
    cost_per_minute: Optional[float] = Field(default=None, ge=0)


# ----- Auth Endpoints -----
@api.post("/auth/register/request-code")
async def request_register_code(data: RegisterCodeRequestIn):
    email = data.email.lower().strip()

    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    code = generate_otp()
    await save_verification_code(
        email=email,
        purpose="register",
        code=code,
        extra={
            "name": data.name.strip(),
            "password_hash": hash_password(data.password),
        },
    )
    send_email_code(email, code, "register")

    return {"ok": True, "message": "Verification code sent"}


@api.post("/auth/register/verify")
async def verify_register_code(data: VerifyRegisterCodeIn, response: Response):
    email = data.email.lower().strip()

    if await db.users.find_one({"email": email}):
        await db.verification_codes.delete_many({"email": email, "purpose": "register"})
        raise HTTPException(status_code=400, detail="Email already registered")

    record = await verify_code(email, "register", data.code)
    extra = record.get("extra", {})

    user_id = new_id()
    user = {
        "id": user_id,
        "email": email,
        "name": extra.get("name", "User"),
        "password_hash": extra.get("password_hash"),
        "avatar_url": "",
        "wallet_balance": 0.0,
        "phone": "",
        "is_admin": False,
        "email_verified": True,
        "created_at": now_iso(),
    }

    if not user["password_hash"]:
        raise HTTPException(status_code=400, detail="Registration session expired. Request a new code")

    await db.users.insert_one(user)
    await db.verification_codes.delete_many({"email": email, "purpose": "register"})

    token = create_access_token(user_id, email)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=7*24*3600, path="/")

    user.pop("_id", None)
    user.pop("password_hash", None)
    return {"token": token, "user": user}


# Keeps old endpoint available, but now requires email code flow through the frontend.
@api.post("/auth/register")
async def register(data: RegisterIn):
    raise HTTPException(status_code=400, detail="Email verification required. Please request a 6-digit code first")


@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user["id"], email)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=7*24*3600, path="/")

    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}


@api.post("/auth/password-reset/request-code")
async def request_password_reset_code(data: PasswordResetRequestIn):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1})

    # For privacy, return OK even if the email is not registered.
    if user:
        code = generate_otp()
        await save_verification_code(email=email, purpose="password_reset", code=code)
        send_email_code(email, code, "password_reset")

    return {"ok": True, "message": "If this email exists, a reset code has been sent"}


@api.post("/auth/password-reset/confirm")
async def confirm_password_reset(data: PasswordResetConfirmIn):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1})

    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset code or email")

    await verify_code(email, "password_reset", data.code)

    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": hash_password(data.new_password), "updated_at": now_iso()}},
    )
    await db.verification_codes.delete_many({"email": email, "purpose": "password_reset"})

    return {"ok": True, "message": "Password reset successful"}


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


# ----- Stripe Wallet Top-up -----
async def get_app_settings() -> dict:
    s = await db.app_settings.find_one({"id": "global"}, {"_id": 0})
    if not s:
        s = {
            "id": "global",
            "deposit_fee_percent": 3.0,
            "min_topup": 5.0,
            "max_topup": 500.0,
            "topup_packages": [5.0, 10.0, 25.0, 50.0, 100.0, 250.0],
        }
        await db.app_settings.insert_one(s)
        s.pop("_id", None)
    return s


@api.get("/wallet/topup/packages")
async def list_topup_packages(current=Depends(get_current_user)):
    s = await get_app_settings()
    fee_pct = float(s.get("deposit_fee_percent", 0.0))
    packages = []
    for amt in s.get("topup_packages", []):
        amt_f = float(amt)
        fee = round(amt_f * fee_pct / 100.0, 2)
        credited = round(amt_f - fee, 2)
        packages.append({
            "amount": amt_f,
            "fee": fee,
            "credited": credited,
        })
    return {
        "deposit_fee_percent": fee_pct,
        "packages": packages,
        "min_topup": s.get("min_topup", 5.0),
        "max_topup": s.get("max_topup", 500.0),
    }


class TopUpRequest(BaseModel):
    package_amount: float = Field(gt=0)
    origin_url: str


@api.post("/wallet/topup/checkout")
async def create_topup_checkout(data: TopUpRequest, request: Request, current=Depends(get_current_user)):
    s = await get_app_settings()
    allowed = [float(a) for a in s.get("topup_packages", [])]
    amt = float(data.package_amount)
    if amt not in allowed:
        raise HTTPException(status_code=400, detail="Invalid package amount")

    fee_pct = float(s.get("deposit_fee_percent", 0.0))
    fee_amount = round(amt * fee_pct / 100.0, 2)
    credited = round(amt - fee_amount, 2)

    origin = data.origin_url.rstrip("/")
    success_url = f"{origin}/wallet?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/wallet?cancelled=1"

    metadata = {
        "user_id": current["id"],
        "user_email": current["email"],
        "amount": str(amt),
        "fee_amount": str(fee_amount),
        "credited_amount": str(credited),
        "purpose": "wallet_topup",
    }

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": "Zimlink Wallet Top-up"},
                "unit_amount": int(round(amt * 100)),
            },
            "quantity": 1,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    tx = {
        "id": new_id(),
        "user_id": current["id"],
        "user_email": current["email"],
        "session_id": session.id,
        "package_amount": amt,
        "fee_amount": fee_amount,
        "credited_amount": credited,
        "currency": "usd",
        "status": "initiated",
        "payment_status": "unpaid",
        "metadata": metadata,
        "created_at": now_iso(),
        "completed_at": None,
    }
    await db.payment_transactions.insert_one(tx)

    return {"url": session.url, "session_id": session.id}


async def _process_completed_payment(session_id: str) -> dict:
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.get("payment_status") == "paid":
        return tx

    session = stripe.checkout.Session.retrieve(session_id)

    new_status = tx["status"]
    new_payment_status = tx["payment_status"]
    completed_at = tx.get("completed_at")

    if session.payment_status == "paid":
        result = await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {
                "status": "completed",
                "payment_status": "paid",
                "completed_at": now_iso(),
            }},
        )
        if result.modified_count == 1:
            await db.users.update_one(
                {"id": tx["user_id"]},
                {"$inc": {"wallet_balance": float(tx["credited_amount"])}},
            )
        new_status = "completed"
        new_payment_status = "paid"
        completed_at = now_iso()
    elif session.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "expired"}},
        )
        new_status = "expired"

    return {**tx, "status": new_status, "payment_status": new_payment_status, "completed_at": completed_at}


@api.get("/wallet/topup/status/{session_id}")
async def topup_status(session_id: str, current=Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or tx["user_id"] != current["id"]:
        raise HTTPException(status_code=404, detail="Transaction not found")
    updated = await _process_completed_payment(session_id)
    return {
        "status": updated["status"],
        "payment_status": updated["payment_status"],
        "amount": updated["package_amount"],
        "credited": updated["credited_amount"],
        "fee": updated["fee_amount"],
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
        else:
            event = stripe.Event.construct_from(
                __import__("json").loads(body), stripe.api_key
            )
        if event["type"] == "checkout.session.completed":
            session_obj = event["data"]["object"]
            session_id = session_obj["id"]
            payment_status = session_obj.get("payment_status")
            if payment_status == "paid":
                await _process_completed_payment(session_id)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook handling failed")


@api.get("/wallet/topup/history")
async def topup_history(current=Depends(get_current_user)):
    items = await db.payment_transactions.find(
        {"user_id": current["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return items


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


# ----- Community: Channels -----
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
class EventIn(BaseModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    date_time: str = Field(min_length=1)
    venue: str = Field(min_length=1)
    city: str = Field(min_length=1)
    price: float = Field(ge=0)
    total_tickets: int = Field(ge=1)
    image_url: Optional[str] = ""


@api.post("/events")
async def create_event(data: EventIn, current=Depends(get_current_user)):
    event = {
        "id": new_id(),
        "title": data.title,
        "description": data.description,
        "date_time": data.date_time,
        "venue": data.venue,
        "city": data.city,
        "price": float(data.price),
        "total_tickets": int(data.total_tickets),
        "tickets_sold": 0,
        "image_url": data.image_url or "",
        "organizer_id": current["id"],
        "organizer_name": current["name"],
        "organizer_email": current["email"],
        "created_at": now_iso(),
    }
    await db.events.insert_one(event)
    event.pop("_id", None)
    return event


@api.get("/events")
async def list_events():
    events = await db.events.find({}, {"_id": 0}).sort("date_time", 1).to_list(300)
    return events


@api.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@api.post("/events/{event_id}/buy-ticket")
async def buy_ticket(event_id: str, current=Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if int(event.get("tickets_sold", 0)) >= int(event.get("total_tickets", 0)):
        raise HTTPException(status_code=400, detail="Event is sold out")

    price = float(event.get("price", 0))
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "wallet_balance": 1})

    if price > 0 and float(user.get("wallet_balance", 0)) < price:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    if price > 0:
        await db.users.update_one({"id": current["id"]}, {"$inc": {"wallet_balance": -price}})

    await db.events.update_one({"id": event_id}, {"$inc": {"tickets_sold": 1}})

    ticket = {
        "id": new_id(),
        "event_id": event_id,
        "event_title": event["title"],
        "buyer_id": current["id"],
        "buyer_name": current["name"],
        "buyer_email": current["email"],
        "price": price,
        "created_at": now_iso(),
    }

    await db.event_tickets.insert_one(ticket)
    ticket.pop("_id", None)
    return ticket

# ----- VoIP / Telnyx -----
def get_voice_status():
    enabled = os.environ.get("TELNYX_VOICE_ENABLED", "false").lower() == "true"

    # For Telnyx WebRTC testing, the actual call is made from the frontend
    # using the Telnyx WebRTC SDK. Backend keeps wallet/rate/history logic.
    provider = os.environ.get("VOICE_PROVIDER", "telnyx")

    if not enabled:
        return {
            "enabled": False,
            "provider": provider,
            "configured": False,
            "reason": "Telnyx Voice is disabled. Set TELNYX_VOICE_ENABLED=true in backend/.env."
        }

    return {
        "enabled": True,
        "provider": provider,
        "configured": True,
        "reason": None
    }


@api.get("/voice/config")
async def voice_config(current=Depends(get_current_user)):
    user = await db.users.find_one(
        {"id": current["id"]},
        {"_id": 0, "wallet_balance": 1}
    )

    balance = float(user.get("wallet_balance", 0.0)) if user else 0.0

    return {
        **get_voice_status(),
        "balance": balance
    }


@api.get("/voice/rate-quote")
async def voice_rate_quote(to: str, current=Depends(get_current_user)):
    rate = await get_rate_for_number(to)

    user = await db.users.find_one(
        {"id": current["id"]},
        {"_id": 0, "wallet_balance": 1}
    )

    balance = float(user.get("wallet_balance", 0.0)) if user else 0.0

    if balance <= 0:
        raise HTTPException(
            status_code=400,
            detail="You do not have airtime to call. Please add balance to make calls."
        )

    rpm = float(rate.get("rate_per_minute", 0.0))
    max_minutes = (balance / rpm) if rpm > 0 else float("inf")

    return {
        "to": to,
        "provider": "telnyx",
        "rate_per_minute": rpm,
        "rate_name": rate.get("name", ""),
        "balance": balance,
        "max_minutes": round(max_minutes, 2) if rpm > 0 else None,
        "free": rpm == 0,
    }


@api.post("/voice/call-log")
async def log_call(payload: dict, current=Depends(get_current_user)):
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
        result = await db.users.update_one(
            {"id": current["id"], "wallet_balance": {"$gte": charge}},
            {"$inc": {"wallet_balance": -charge}},
        )

        billed = result.modified_count == 1

        if not billed:
            status_val = "billing_failed"

    entry = {
        "id": new_id(),
        "provider": "telnyx",
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
    items = await db.calls.find(
        {"user_id": current["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return items


# ----- Stats -----
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


# ----- Admin -----
@api.get("/admin/me")
async def admin_me(current=Depends(require_admin)):
    return {"is_admin": True, "email": current["email"], "name": current.get("name", "")}

@api.get("/admin/stats/calls")
async def admin_call_stats(days: int = 30, _=Depends(require_admin)):
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


class AdminCreditByEmailIn(BaseModel):
    email: EmailStr
    amount: float = Field(gt=0)


@api.post("/admin/users/credit-by-email")
async def admin_credit_user_by_email(data: AdminCreditByEmailIn, _=Depends(require_admin)):
    email = data.email.lower().strip()
    amount = float(data.amount)

    result = await db.users.update_one(
        {"email": email},
        {"$inc": {"wallet_balance": amount}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    user = await db.users.find_one(
        {"email": email},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "wallet_balance": 1, "is_admin": 1},
    )

    return {"ok": True, "user": user}


# ----- Admin: app settings -----
class SettingsIn(BaseModel):
    deposit_fee_percent: Optional[float] = Field(default=None, ge=0, le=100)
    min_topup: Optional[float] = Field(default=None, ge=1)
    max_topup: Optional[float] = Field(default=None, ge=1)
    topup_packages: Optional[List[float]] = None

@api.get("/admin/settings")
async def admin_get_settings(_=Depends(require_admin)):
    return await get_app_settings()

@api.put("/admin/settings")
async def admin_update_settings(data: SettingsIn, _=Depends(require_admin)):
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if "topup_packages" in update:
        update["topup_packages"] = sorted([float(a) for a in update["topup_packages"] if float(a) > 0])
    await db.app_settings.update_one({"id": "global"}, {"$set": update}, upsert=True)
    return await get_app_settings()

@api.get("/admin/topup-stats")
async def admin_topup_stats(days: int = 30, _=Depends(require_admin)):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "payment_status": "paid"}},
        {"$group": {
            "_id": None,
            "count": {"$sum": 1},
            "gross": {"$sum": "$package_amount"},
            "fees": {"$sum": "$fee_amount"},
            "credited": {"$sum": "$credited_amount"},
        }},
    ]
    agg = await db.payment_transactions.aggregate(pipeline).to_list(1)
    summary = agg[0] if agg else {"count": 0, "gross": 0.0, "fees": 0.0, "credited": 0.0}
    summary.pop("_id", None)
    recent = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"window_days": days, "summary": summary, "recent": recent}


# ----- CORS & App startup -----
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?|https://.*\.ngrok-free\.app|https://.*\.vercel\.app|https://.*\.zimlink\.me|https://zimlink\.me",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api)


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
    await db.verification_codes.create_index([("email", 1), ("purpose", 1)])
    await db.verification_codes.create_index("expires_at")

    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")

    if admin_email and admin_password:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({
                "id": new_id(),
                "email": admin_email,
                "name": "Admin",
                "password_hash": hash_password(admin_password),
                "avatar_url": "",
                "wallet_balance": 0.0,
                "phone": "",
                "is_admin": True,
                "created_at": now_iso(),
            })
            logger.info("Seeded admin user.")
        await db.users.update_one({"email": admin_email}, {"$set": {"is_admin": True}})

    await db.users.update_many(
        {"is_admin": {"$exists": False}},
        {"$set": {"is_admin": False}}
    )

    if not await db.channels.find_one({"name": "general"}):
        admin = await db.users.find_one({"email": admin_email})
        await db.channels.insert_one({
            "id": new_id(),
            "name": "general",
            "description": "Welcome to the community! Say hi here.",
            "creator_id": admin["id"] if admin else "system",
            "created_at": now_iso(),
        })

    if await db.call_rates.count_documents({}) == 0:
        defaults = [
            {"name": "Zimbabwe Mobile",   "prefix": "+2637",   "rate_per_minute": 0.30, "cost_per_minute": 0.15},
            {"name": "Zimbabwe Landline", "prefix": "+2632",   "rate_per_minute": 0.20, "cost_per_minute": 0.08},
            {"name": "Zimbabwe Harare",   "prefix": "+2634",   "rate_per_minute": 0.20, "cost_per_minute": 0.08},
            {"name": "South Africa",      "prefix": "+27",     "rate_per_minute": 0.10, "cost_per_minute": 0.04},
            {"name": "United Kingdom",    "prefix": "+44",     "rate_per_minute": 0.05, "cost_per_minute": 0.02},
            {"name": "United States",     "prefix": "+1",      "rate_per_minute": 0.05, "cost_per_minute": 0.013},
            {"name": "Default",           "prefix": "default", "rate_per_minute": 0.35, "cost_per_minute": 0.18},
        ]
        for r in defaults:
            r["id"] = new_id()
            r["created_at"] = now_iso()
        await db.call_rates.insert_many(defaults)
        logger.info(f"Seeded {len(defaults)} default call rates")


@app.on_event("shutdown")
async def shutdown():
    client.close()
