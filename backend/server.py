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
import secrets
import hashlib
import resend
import smtplib
from email.message import EmailMessage
from html import escape
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal
import qrcode
import io
import base64

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


def get_email_logo_url() -> str:
    return os.environ.get(
        "ZIMLINK_LOGO_URL",
        "https://www.zimlink.me/images/logo.png",
    ).strip()


def branded_email_template(
    title: str,
    preview_text: str,
    content_html: str,
    eyebrow: str = "ZimLink",
    footer_text: str = "This is an automated email from ZimLink.",
) -> str:
    """
    Shared modern email shell used by every ZimLink email.

    The logo sits on a white background because the supplied logo image already
    has a white background. Green is used below the logo as an accent rather
    than as a ribbon behind it.
    """
    safe_logo_url = escape(get_email_logo_url(), quote=True)
    safe_title = escape(title)
    safe_preview_text = escape(preview_text)
    safe_eyebrow = escape(eyebrow)
    safe_footer_text = escape(footer_text)

    return f"""
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>{safe_title}</title>
      </head>

      <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111111;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          {safe_preview_text}
        </div>

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="width:100%;background:#f4f4f5;"
        >
          <tr>
            <td align="center" style="padding:28px 12px;">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="width:100%;max-width:580px;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);"
              >
                <tr>
                  <td align="center" style="background:#ffffff;padding:28px 24px 22px;">
                    <img
                      src="{safe_logo_url}"
                      alt="ZimLink"
                      width="210"
                      style="display:block;width:210px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;"
                    />
                  </td>
                </tr>

                <tr>
                  <td style="height:5px;background:#16a34a;font-size:0;line-height:0;">
                    &nbsp;
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px 30px 12px;">
                    <p style="margin:0 0 10px;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#16a34a;">
                      {safe_eyebrow}
                    </p>

                    <h1 style="margin:0;font-size:27px;line-height:1.25;font-weight:700;color:#111111;">
                      {safe_title}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:8px 30px 34px;">
                    {content_html}
                  </td>
                </tr>

                <tr>
                  <td style="background:#fafafa;border-top:1px solid #eeeeee;padding:20px 30px;text-align:center;">
                    <p style="margin:0;font-size:11px;line-height:1.6;color:#a1a1aa;">
                      {safe_footer_text}
                    </p>

                    <p style="margin:6px 0 0;font-size:11px;line-height:1.6;color:#a1a1aa;">
                      © ZimLink
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def send_email_code(to_email: str, code: str, purpose: str) -> None:
    app_name = os.environ.get("APP_NAME", "ZimLink").strip() or "ZimLink"
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get(
        "FROM_EMAIL",
        "ZimLink <info@zimlink.me>",
    ).strip()

    if not resend_api_key:
        logger.warning("RESEND_API_KEY is missing. Email was not sent.")
        logger.warning("EMAIL CODE for %s (%s): %s", to_email, purpose, code)
        return

    resend.api_key = resend_api_key

    purpose_content = {
        "register": {
            "subject": f"Verify your {app_name} account",
            "title": "Verify your email",
            "preview": "Use your six-digit code to finish creating your ZimLink account.",
            "eyebrow": "Account verification",
            "message": (
                "Use the six-digit verification code below to finish creating "
                "your ZimLink account."
            ),
            "notice": (
                "This code expires in 15 minutes. Do not share it with anyone."
            ),
        },
        "password_reset": {
            "subject": f"Reset your {app_name} password",
            "title": "Reset your password",
            "preview": "Use your six-digit code to reset your ZimLink password.",
            "eyebrow": "Password recovery",
            "message": (
                "We received a request to reset your password. Enter the "
                "six-digit code below in ZimLink to continue."
            ),
            "notice": (
                "This code expires in 15 minutes. If you did not request a "
                "password reset, you can safely ignore this email."
            ),
        },
        "email_change_old": {
            "subject": f"Confirm your current {app_name} email",
            "title": "Confirm your current email",
            "preview": "Use your six-digit code to approve your email-address change.",
            "eyebrow": "Security confirmation",
            "message": (
                "Use the code below to confirm that you requested to change "
                "the email address on your ZimLink account."
            ),
            "notice": (
                "This code expires in 15 minutes. Do not share it with anyone."
            ),
        },
        "email_change_new": {
            "subject": f"Verify your new {app_name} email",
            "title": "Verify your new email",
            "preview": "Use your six-digit code to verify your new ZimLink email.",
            "eyebrow": "Email verification",
            "message": (
                "Use the code below to verify this email address and complete "
                "the change on your ZimLink account."
            ),
            "notice": (
                "This code expires in 15 minutes. Do not share it with anyone."
            ),
        },
        "delete_account": {
            "subject": f"Confirm your {app_name} account deletion",
            "title": "Confirm account deletion",
            "preview": "Use your six-digit code to confirm deletion of your ZimLink account.",
            "eyebrow": "Important security action",
            "message": (
                "A request was made to permanently delete your ZimLink account. "
                "Enter the code below only if you made this request."
            ),
            "notice": (
                "This code expires in 15 minutes. If you did not request this, "
                "do not use the code and contact ZimLink support."
            ),
        },
    }

    details = purpose_content.get(
        purpose,
        {
            "subject": f"Your {app_name} verification code",
            "title": "Your verification code",
            "preview": "Use your six-digit ZimLink verification code.",
            "eyebrow": "Security verification",
            "message": "Use the six-digit verification code below to continue.",
            "notice": "This code expires in 15 minutes. Do not share it with anyone.",
        },
    )

    safe_code = escape(code)
    safe_message = escape(details["message"])
    safe_notice = escape(details["notice"])

    content_html = f"""
      <p style="margin:0;font-size:15px;line-height:1.7;color:#52525b;">
        {safe_message}
      </p>

      <div style="margin:28px 0;text-align:center;">
        <div style="display:inline-block;min-width:250px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px 18px;">
          <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#15803d;">
            Verification code
          </p>

          <p style="margin:0;font-size:36px;line-height:1.1;font-weight:700;letter-spacing:9px;color:#111111;">
            {safe_code}
          </p>
        </div>
      </div>

      <div style="background:#fafafa;border:1px solid #eeeeee;border-radius:12px;padding:15px 16px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
          {safe_notice}
        </p>
      </div>
    """

    html = branded_email_template(
        title=details["title"],
        preview_text=details["preview"],
        content_html=content_html,
        eyebrow=details["eyebrow"],
        footer_text=(
            "This is an automated security email from ZimLink. "
            "Please do not reply."
        ),
    )

    try:
        resend.Emails.send({
            "from": from_email,
            "to": [to_email],
            "subject": details["subject"],
            "html": html,
        })
        logger.info(
            "Sent %s code to %s from %s",
            purpose,
            to_email,
            from_email,
        )
    except Exception as exc:
        logger.error("Could not send Resend email to %s: %s", to_email, exc)
        logger.warning("EMAIL CODE for %s (%s): %s", to_email, purpose, code)


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def send_password_reset_link_email(to_email: str, reset_url: str) -> None:
    """
    Retained for compatibility with the older reset-link endpoints.
    The current frontend uses the six-digit-code flow.
    """
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get(
        "FROM_EMAIL",
        "ZimLink <info@zimlink.me>",
    ).strip()

    if not resend_api_key:
        logger.warning(
            "RESEND_API_KEY is missing. Password reset link was not sent."
        )
        return

    resend.api_key = resend_api_key
    safe_reset_url = escape(reset_url, quote=True)

    content_html = f"""
      <p style="margin:0;font-size:15px;line-height:1.7;color:#52525b;">
        We received a request to reset your ZimLink password. Use the button
        below to create a new password.
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a
          href="{safe_reset_url}"
          style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 24px;border-radius:10px;"
        >
          Reset password
        </a>
      </div>

      <div style="background:#fafafa;border:1px solid #eeeeee;border-radius:12px;padding:15px 16px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
          This link expires in 30 minutes and can only be used once. If you did
          not request this reset, you can safely ignore this email.
        </p>
      </div>
    """

    html = branded_email_template(
        title="Reset your password",
        preview_text="Use your secure link to reset your ZimLink password.",
        content_html=content_html,
        eyebrow="Password recovery",
        footer_text=(
            "This is an automated security email from ZimLink. "
            "Please do not reply."
        ),
    )

    resend.Emails.send({
        "from": from_email,
        "to": [to_email],
        "subject": "Reset your ZimLink password",
        "html": html,
    })


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


def generate_qr_base64(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()



def send_ticket_emails(tickets: list, event: dict, buyer: dict):
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get(
        "FROM_EMAIL",
        "ZimLink <info@zimlink.me>",
    ).strip()

    if not resend_api_key:
        logger.warning("RESEND_API_KEY missing — ticket emails not sent")
        return

    resend.api_key = resend_api_key

    safe_event_title = escape(str(event.get("title", "Event")))
    safe_event_city = escape(str(event.get("city", "")))
    safe_event_venue = escape(str(event.get("venue", "")))
    safe_event_datetime = escape(str(event.get("date_time", "")))
    safe_buyer_name = escape(str(buyer.get("name", "Guest")))

    for ticket in tickets:
        qr_b64 = generate_qr_base64(f"ZIMLINK-TICKET:{ticket['id']}")
        safe_ticket_id = escape(str(ticket["id"]))
        ticket_number = int(ticket.get("ticket_number", 1))
        total_in_order = int(ticket.get("total_in_order", 1))
        ticket_price = float(ticket.get("price", 0.0))

        content_html = f"""
          <p style="margin:0;font-size:15px;line-height:1.7;color:#52525b;">
            Hi {safe_buyer_name}, your ticket is confirmed. Keep this email
            available when you arrive at the event.
          </p>

          <div style="margin:24px 0;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px;">
            <p style="margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#15803d;">
              Event
            </p>
            <p style="margin:0;font-size:21px;line-height:1.35;font-weight:700;color:#111111;">
              {safe_event_title}
            </p>
            <p style="margin:7px 0 0;font-size:13px;line-height:1.5;color:#52525b;">
              {safe_event_city} · {safe_event_venue}
            </p>
          </div>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr>
              <td style="padding:12px 0;color:#71717a;border-bottom:1px solid #eeeeee;">Date and time</td>
              <td align="right" style="padding:12px 0;color:#111111;font-weight:600;border-bottom:1px solid #eeeeee;">{safe_event_datetime}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#71717a;border-bottom:1px solid #eeeeee;">Venue</td>
              <td align="right" style="padding:12px 0;color:#111111;font-weight:600;border-bottom:1px solid #eeeeee;">{safe_event_venue}, {safe_event_city}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#71717a;border-bottom:1px solid #eeeeee;">Ticket</td>
              <td align="right" style="padding:12px 0;color:#111111;font-weight:600;border-bottom:1px solid #eeeeee;">{ticket_number} of {total_in_order}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#71717a;border-bottom:1px solid #eeeeee;">Price</td>
              <td align="right" style="padding:12px 0;color:#111111;font-weight:600;border-bottom:1px solid #eeeeee;">${ticket_price:.2f}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#71717a;">Ticket ID</td>
              <td align="right" style="padding:12px 0;color:#111111;font-family:monospace;font-size:11px;">{safe_ticket_id}</td>
            </tr>
          </table>

          <div style="margin-top:24px;text-align:center;background:#fafafa;border:1px solid #eeeeee;border-radius:16px;padding:20px;">
            <img
              src="data:image/png;base64,{qr_b64}"
              alt="Ticket QR code"
              width="170"
              style="display:block;width:170px;height:170px;margin:0 auto;border:0;"
            />
            <p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:#71717a;">
              Present this QR code at the entrance.
            </p>
          </div>
        """

        html = branded_email_template(
            title="Your ticket is confirmed",
            preview_text=f"Your ticket for {event.get('title', 'the event')} is ready.",
            content_html=content_html,
            eyebrow="Event confirmation",
            footer_text=(
                "This ticket is non-transferable. Present it at entry. "
                "Powered by ZimLink."
            ),
        )

        try:
            resend.Emails.send({
                "from": from_email,
                "to": [buyer["email"]],
                "subject": f"Your ticket for {event['title']}",
                "html": html,
            })
            logger.info("Ticket email sent to %s", buyer["email"])
        except Exception:
            logger.exception("Ticket email failed")

        logger.info(
            "Ticket %s emailed to %s",
            ticket["id"],
            buyer["email"],
        )



def send_topup_completed_email(
    to_email: str,
    customer_name: str,
    amount: float,
    new_balance: float,
    transaction_id: str,
    completed_at: str,
) -> Optional[str]:
    """
    Send a branded wallet top-up confirmation through Resend.
    """
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get(
        "FROM_EMAIL",
        "ZimLink <info@zimlink.me>",
    ).strip()
    frontend_url = os.environ.get(
        "FRONTEND_URL",
        "https://www.zimlink.me",
    ).strip().rstrip("/")

    if not resend_api_key:
        raise RuntimeError("RESEND_API_KEY is missing")

    resend.api_key = resend_api_key

    safe_name = escape((customer_name or "there").strip())
    safe_email = escape(to_email)
    safe_transaction_id = escape(transaction_id)
    safe_completed_at = escape(completed_at)
    wallet_url = escape(f"{frontend_url}/wallet", quote=True)

    content_html = f"""
      <p style="margin:0;font-size:15px;line-height:1.7;color:#52525b;">
        Hi {safe_name}, your payment was confirmed and your funds are now
        available in your ZimLink wallet.
      </p>

      <div style="margin:24px 0;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:23px;text-align:center;">
        <p style="margin:0 0 7px;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:#15803d;">
          Amount added
        </p>
        <p style="margin:0;font-size:42px;line-height:1.1;font-weight:700;color:#111111;">
          ${amount:.2f}
        </p>
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;color:#71717a;border-bottom:1px solid #eeeeee;">New wallet balance</td>
          <td align="right" style="padding:12px 0;font-weight:700;color:#111111;border-bottom:1px solid #eeeeee;">${new_balance:.2f}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#71717a;border-bottom:1px solid #eeeeee;">Transaction reference</td>
          <td align="right" style="padding:12px 0;font-family:monospace;font-size:11px;color:#111111;border-bottom:1px solid #eeeeee;">{safe_transaction_id}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#71717a;border-bottom:1px solid #eeeeee;">Completed</td>
          <td align="right" style="padding:12px 0;color:#111111;border-bottom:1px solid #eeeeee;">{safe_completed_at}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#71717a;">Account</td>
          <td align="right" style="padding:12px 0;color:#111111;">{safe_email}</td>
        </tr>
      </table>

      <div style="text-align:center;margin-top:28px;">
        <a
          href="{wallet_url}"
          style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 24px;border-radius:10px;"
        >
          View your wallet
        </a>
      </div>
    """

    html = branded_email_template(
        title="Your wallet top-up is complete",
        preview_text=f"${amount:.2f} has been added to your ZimLink wallet.",
        content_html=content_html,
        eyebrow="Payment confirmation",
        footer_text=(
            "This is an automatic payment notification from ZimLink. "
            "Please do not reply."
        ),
    )

    response = resend.Emails.send({
        "from": from_email,
        "to": [to_email],
        "subject": f"ZimLink top-up complete — ${amount:.2f} added",
        "html": html,
    })

    if isinstance(response, dict):
        return response.get("id")

    return getattr(response, "id", None)


async def ensure_topup_completed_email(tx: dict) -> None:
    """
    Claim and send one top-up email per Stripe session.

    Both the wallet status endpoint and Stripe webhook can process the same
    checkout. The atomic claim prevents them from sending duplicate emails.
    A failed email can be retried by a later status check or webhook delivery.
    """
    session_id = tx.get("session_id")
    if not session_id or tx.get("payment_status") != "paid":
        return

    claim = await db.payment_transactions.update_one(
        {
            "session_id": session_id,
            "payment_status": "paid",
            "topup_email_status": {"$nin": ["sending", "sent"]},
        },
        {
            "$set": {
                "topup_email_status": "sending",
                "topup_email_attempted_at": now_iso(),
            }
        },
    )

    if claim.modified_count != 1:
        return

    try:
        user = await db.users.find_one(
            {"id": tx["user_id"]},
            {
                "_id": 0,
                "name": 1,
                "email": 1,
                "wallet_balance": 1,
            },
        )
        if not user or not user.get("email"):
            raise RuntimeError("Top-up user or email address was not found")

        completed_at = tx.get("completed_at") or now_iso()
        resend_email_id = send_topup_completed_email(
            to_email=user["email"],
            customer_name=user.get("name", "there"),
            amount=float(tx.get("credited_amount", 0.0)),
            new_balance=float(user.get("wallet_balance", 0.0)),
            transaction_id=tx.get("id") or session_id,
            completed_at=completed_at,
        )

        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "topup_email_status": "sent",
                    "topup_email_sent_at": now_iso(),
                    "topup_email_resend_id": resend_email_id,
                },
                "$unset": {"topup_email_error": ""},
            },
        )
        logger.info(
            "Top-up confirmation email sent to %s for session %s",
            user["email"],
            session_id,
        )
    except Exception as exc:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "topup_email_status": "failed",
                    "topup_email_error": str(exc)[:500],
                }
            },
        )
        # The payment and wallet credit remain successful even if email fails.
        logger.exception(
            "Top-up confirmation email failed for Stripe session %s",
            session_id,
        )


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
    phone: Optional[str] = ""

class VerifyRegisterCodeIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)

class PasswordResetRequestIn(BaseModel):
    email: EmailStr

class PasswordResetConfirmIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6)

class PasswordResetLinkRequestIn(BaseModel):
    email: EmailStr

class PasswordResetLinkConfirmIn(BaseModel):
    token: str = Field(min_length=32)
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

class EventIn(BaseModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    date_time: str = Field(min_length=1)
    venue: str = Field(min_length=1)
    city: str = Field(min_length=1)
    price: float = Field(ge=0)
    total_tickets: int = Field(ge=1)
    image_url: Optional[str] = ""

class BuyTicketIn(BaseModel):
    quantity: int = Field(ge=1, le=10, default=1)

class ContactIn(BaseModel):
    name: Optional[str] = ""
    number: str = Field(min_length=1)


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
            "phone": data.phone or "",
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
        "phone": extra.get("phone", ""),
        "avatar_url": "",
        "wallet_balance": 0.0,
        "is_admin": False,
        "is_verified_seller": False,
        "account_status": "active",
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


@api.post("/auth/password-reset/request-link")
async def request_password_reset_link(data: PasswordResetLinkRequestIn):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1, "email": 1})

    if user:
        raw_token = secrets.token_urlsafe(48)
        token_hash = hash_reset_token(raw_token)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()

        await db.password_reset_tokens.update_many(
            {"user_id": user["id"], "used_at": None},
            {"$set": {"invalidated_at": now_iso()}},
        )

        await db.password_reset_tokens.insert_one({
            "id": new_id(),
            "user_id": user["id"],
            "email": email,
            "token_hash": token_hash,
            "expires_at": expires_at,
            "used_at": None,
            "invalidated_at": None,
            "created_at": now_iso(),
        })

        frontend_url = os.environ.get("FRONTEND_URL", "https://zimlink.me").strip().rstrip("/")
        reset_url = f"{frontend_url}/reset-password?token={raw_token}"

        try:
            send_password_reset_link_email(email, reset_url)
        except Exception as exc:
            logger.exception("Could not send password reset link to %s: %s", email, exc)

    return {
        "ok": True,
        "message": "If an account exists for this email, a reset link has been sent.",
    }


@api.post("/auth/password-reset/confirm-link")
async def confirm_password_reset_link(data: PasswordResetLinkConfirmIn):
    token_hash = hash_reset_token(data.token)
    record = await db.password_reset_tokens.find_one({
        "token_hash": token_hash,
        "used_at": None,
        "invalidated_at": None,
    })

    if not record:
        raise HTTPException(status_code=400, detail="This password reset link is invalid or has already been used.")

    try:
        expires_at = datetime.fromisoformat(record["expires_at"])
    except Exception:
        expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)

    if expires_at < datetime.now(timezone.utc):
        await db.password_reset_tokens.update_one(
            {"id": record["id"]},
            {"$set": {"invalidated_at": now_iso()}},
        )
        raise HTTPException(status_code=400, detail="This password reset link has expired. Request a new one.")

    claim = await db.password_reset_tokens.update_one(
        {"id": record["id"], "used_at": None, "invalidated_at": None},
        {"$set": {"used_at": now_iso()}},
    )
    if claim.modified_count != 1:
        raise HTTPException(status_code=400, detail="This password reset link has already been used.")

    result = await db.users.update_one(
        {"id": record["user_id"]},
        {"$set": {"password_hash": hash_password(data.new_password), "updated_at": now_iso()}},
    )
    if result.matched_count != 1:
        raise HTTPException(status_code=404, detail="User account not found.")

    await db.password_reset_tokens.update_many(
        {"user_id": record["user_id"], "used_at": None},
        {"$set": {"invalidated_at": now_iso()}},
    )
    return {"ok": True, "message": "Password reset successful."}


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
    """Global wallet/top-up settings.

    For Stripe, users are credited the full package amount.
    Stripe processing fees are not shown to users and are not deducted from wallet credit.
    """
    settings = await db.app_settings.find_one({"id": "global"}, {"_id": 0})
    if not settings:
        settings = {
            "id": "global",
            "deposit_fee_percent": 0.0,
            "min_topup": 5.0,
            "max_topup": 500.0,
            "topup_packages": [5.0, 10.0, 25.0, 50.0, 100.0, 250.0],
            "created_at": now_iso(),
        }
        await db.app_settings.insert_one(settings)
        settings.pop("_id", None)
    return settings


@api.get("/wallet/topup/packages")
async def list_topup_packages(current=Depends(get_current_user)):
    settings = await get_app_settings()
    packages = []

    for amount in settings.get("topup_packages", [5.0, 10.0, 25.0, 50.0, 100.0]):
        amount_f = float(amount)
        packages.append({
            "amount": amount_f,
            "fee": 0.0,
            "credited": amount_f,
        })

    return {
        "deposit_fee_percent": 0.0,
        "packages": packages,
        "min_topup": float(settings.get("min_topup", 5.0)),
        "max_topup": float(settings.get("max_topup", 500.0)),
    }


class TopUpRequest(BaseModel):
    package_amount: float = Field(gt=0)
    origin_url: str


@api.post("/wallet/topup/checkout")
async def create_topup_checkout(data: TopUpRequest, current=Depends(get_current_user)):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    settings = await get_app_settings()
    allowed = [float(a) for a in settings.get("topup_packages", [])]
    amount = float(data.package_amount)

    if amount not in allowed:
        raise HTTPException(status_code=400, detail="Invalid package amount")

    # User pays this amount and receives the full amount in ZimLink wallet.
    # Stripe fees are absorbed by ZimLink and are not shown/deducted from user credit.
    fee_amount = 0.0
    credited_amount = amount

    origin = data.origin_url.rstrip("/")
    success_url = f"{origin}/wallet?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/wallet?cancelled=1"

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"ZimLink Wallet Top-up ${amount:.2f}",
                    },
                    "unit_amount": int(round(amount * 100)),
                },
                "quantity": 1,
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "purpose": "wallet_topup",
                "user_id": current["id"],
                "user_email": current["email"],
                "amount": str(amount),
                "fee_amount": str(fee_amount),
                "credited_amount": str(credited_amount),
            },
        )
    except Exception as exc:
        logger.error(f"Stripe checkout creation failed: {exc}")
        raise HTTPException(status_code=502, detail="Could not create Stripe checkout session")

    tx = {
        "id": new_id(),
        "provider": "stripe",
        "user_id": current["id"],
        "user_email": current["email"],
        "session_id": session.id,
        "package_amount": amount,
        "fee_amount": fee_amount,
        "credited_amount": credited_amount,
        "currency": "usd",
        "status": "initiated",
        "payment_status": "unpaid",
        "created_at": now_iso(),
        "completed_at": None,
        "topup_email_status": "pending",
        "topup_email_attempted_at": None,
        "topup_email_sent_at": None,
    }
    await db.payment_transactions.insert_one(tx)

    return {
        "url": session.url,
        "checkout_url": session.url,
        "session_id": session.id,
    }


async def _process_completed_payment(session_id: str) -> dict:
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # A webhook and the browser status poll can reach this function at nearly
    # the same time. If payment was already processed, do not credit again,
    # but still retry a notification that was never sent.
    if tx.get("payment_status") == "paid":
        await ensure_topup_completed_email(tx)
        latest = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0},
        )
        return latest or tx

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        logger.error(f"Stripe session retrieve failed: {exc}")
        raise HTTPException(status_code=502, detail="Could not verify payment status")

    if session.payment_status == "paid":
        completed_at = now_iso()

        result = await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},
            {
                "$set": {
                    "status": "completed",
                    "payment_status": "paid",
                    "completed_at": completed_at,
                }
            },
        )

        if result.modified_count == 1:
            await db.users.update_one(
                {"id": tx["user_id"]},
                {"$inc": {"wallet_balance": float(tx.get("credited_amount", 0.0))}},
            )
            tx["status"] = "completed"
            tx["payment_status"] = "paid"
            tx["completed_at"] = completed_at

            # Email errors are handled internally and never reverse or block
            # a successfully credited wallet top-up.
            await ensure_topup_completed_email(tx)
        else:
            # Another request completed the transaction first. Reload it and
            # let the email claim logic determine whether a message is needed.
            tx = await db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0},
            ) or tx
            await ensure_topup_completed_email(tx)

    elif getattr(session, "status", None) == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "expired"}},
        )
        tx["status"] = "expired"

    latest = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0},
    )
    return latest or tx


@api.get("/wallet/topup/status/{session_id}")
async def topup_status(session_id: str, current=Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or tx.get("user_id") != current["id"]:
        raise HTTPException(status_code=404, detail="Transaction not found")

    updated = await _process_completed_payment(session_id)
    return {
        "status": updated.get("status"),
        "payment_status": updated.get("payment_status"),
        "amount": float(updated.get("package_amount", 0.0)),
        "credited": float(updated.get("credited_amount", 0.0)),
        "fee": 0.0,
    }


@api.get("/wallet/topup/history")
async def topup_history(current=Depends(get_current_user)):
    items = await db.payment_transactions.find(
        {"user_id": current["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return items


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("Stripe-Signature", "")

    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        else:
            # Helpful during local/dev testing only. In production, set STRIPE_WEBHOOK_SECRET.
            import json
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
    except Exception as exc:
        logger.error(f"Stripe webhook error: {exc}")
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook")

    if event["type"] == "checkout.session.completed":
        session_obj = event["data"]["object"]
        session_id = session_obj["id"]
        payment_status = session_obj.get("payment_status")

        if payment_status == "paid":
            try:
                await _process_completed_payment(session_id)
            except Exception as exc:
                logger.error(f"Could not process Stripe payment {session_id}: {exc}")
                raise HTTPException(status_code=500, detail="Could not process payment")

    return {"ok": True}


# ----- Marketplace -----
@api.post("/marketplace/listings")
async def create_listing(data: ListingIn, current=Depends(get_current_user)):
    if not current.get("is_admin") and not current.get("is_verified_seller"):
        raise HTTPException(
            status_code=403,
            detail="You must be a verified seller before posting on Marketplace."
        )

    listing = {
        "status": "active",
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


# ----- Events -----
@api.post("/events")
async def create_event(data: EventIn, current=Depends(get_current_user)):
    if not current.get("is_admin") and not current.get("is_verified_seller"):
        raise HTTPException(
            status_code=403,
            detail="You must be a verified seller before posting events."
        )

    event = {
        "status": "active",
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
async def buy_ticket(event_id: str, data: BuyTicketIn = BuyTicketIn(), current=Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    remaining = int(event.get("total_tickets", 0)) - int(event.get("tickets_sold", 0))
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Event is sold out")
    if data.quantity > remaining:
        raise HTTPException(status_code=400, detail=f"Only {remaining} tickets left")

    price = float(event.get("price", 0))
    total_cost = price * data.quantity

    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "wallet_balance": 1})
    if total_cost > 0 and float(user.get("wallet_balance", 0)) < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    if total_cost > 0:
        await db.users.update_one({"id": current["id"]}, {"$inc": {"wallet_balance": -total_cost}})

    await db.events.update_one({"id": event_id}, {"$inc": {"tickets_sold": data.quantity}})

    tickets = []
    for i in range(data.quantity):
        ticket = {
            "id": new_id(),
            "event_id": event_id,
            "event_title": event["title"],
            "event_date": event["date_time"],
            "event_venue": event["venue"],
            "event_city": event["city"],
            "buyer_id": current["id"],
            "buyer_name": current["name"],
            "buyer_email": current["email"],
            "price": price,
            "ticket_number": i + 1,
            "total_in_order": data.quantity,
            "created_at": now_iso(),
        }
        await db.event_tickets.insert_one(ticket)
        ticket.pop("_id", None)
        tickets.append(ticket)

    try:
        send_ticket_emails(tickets, event, current)
    except Exception as e:
        logger.error(f"Failed to send ticket emails: {e}")

    return {"tickets": tickets, "total_cost": total_cost}


# ----- VoIP / Telnyx -----
def get_voice_status():
    enabled = os.environ.get("TELNYX_VOICE_ENABLED", "false").lower() == "true"
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
    return {**get_voice_status(), "balance": balance}


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


@api.get("/voice/call-history")
async def get_call_history(
    limit: int = 100,
    current=Depends(get_current_user),
):
    """
    Return the logged-in user's most recent calls.

    This endpoint was missing previously even though the frontend requested it.
    """
    safe_limit = max(1, min(int(limit), 500))

    items = await db.calls.find(
        {"user_id": current["id"]},
        {"_id": 0},
    ).sort(
        [("started_at", -1), ("created_at", -1)]
    ).to_list(safe_limit)

    return items


async def save_call_log(payload: dict, current: dict) -> dict:
    to = (payload.get("to") or "").strip()
    if not to:
        raise HTTPException(status_code=400, detail="Call number is required")

    call_session_id = (
        payload.get("call_session_id")
        or payload.get("session_id")
        or new_id()
    )

    # Idempotency: the browser may receive several end events for one call.
    # Reusing the same call_session_id prevents duplicate history and billing.
    existing = await db.calls.find_one(
        {
            "user_id": current["id"],
            "call_session_id": call_session_id,
        },
        {"_id": 0},
    )
    if existing:
        return existing

    try:
        duration = int(payload.get("duration_seconds", 0) or 0)
    except (TypeError, ValueError):
        duration = 0

    duration = max(0, min(duration, 4 * 60 * 60))

    allowed_statuses = {
        "completed",
        "no_answer",
        "failed",
        "cancelled",
        "busy",
        "rejected",
        "billing_failed",
    }
    status_val = str(payload.get("status") or "completed").lower()
    if status_val not in allowed_statuses:
        status_val = "failed"

    direction = str(payload.get("direction") or "outbound").lower()
    if direction not in {"outbound", "inbound"}:
        direction = "outbound"

    started_at = payload.get("started_at") or now_iso()
    connected_at = payload.get("connected_at")
    ended_at = payload.get("ended_at") or now_iso()

    rate = await get_rate_for_number(to)
    rpm = float(rate.get("rate_per_minute", 0.0))
    cpm = float(rate.get("cost_per_minute", 0.0))

    # Only connected, completed outbound calls are billable.
    billable = (
        direction == "outbound"
        and status_val == "completed"
        and duration > 0
    )

    charge = round(rpm * (duration / 60.0), 4) if billable else 0.0
    cost = round(cpm * (duration / 60.0), 4) if billable else 0.0
    billed = False

    if charge > 0:
        result = await db.users.update_one(
            {
                "id": current["id"],
                "wallet_balance": {"$gte": charge},
            },
            {"$inc": {"wallet_balance": -charge}},
        )
        billed = result.modified_count == 1

        if not billed:
            status_val = "billing_failed"

    entry = {
        "id": new_id(),
        "call_session_id": call_session_id,
        "provider": "telnyx",
        "user_id": current["id"],
        "user_name": current.get("name", ""),
        "user_email": current.get("email", ""),
        "to": to,
        "to_name": (payload.get("to_name") or "").strip(),
        "direction": direction,
        "duration_seconds": duration,
        "status": status_val,
        "started_at": started_at,
        "connected_at": connected_at,
        "ended_at": ended_at,
        "rate_per_minute": rpm,
        "cost_per_minute": cpm,
        "charge_amount": charge,
        "cost_amount": cost,
        "profit_amount": round(charge - cost, 4),
        "billed": billed,
        "rate_name": rate.get("name", ""),
        "created_at": now_iso(),
    }

    try:
        await db.calls.insert_one(entry)
    except Exception as exc:
        # A unique-index race means another request stored this same call.
        duplicate = await db.calls.find_one(
            {
                "user_id": current["id"],
                "call_session_id": call_session_id,
            },
            {"_id": 0},
        )
        if duplicate:
            return duplicate

        logger.exception("Could not store call log: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Could not store call history",
        )

    entry.pop("_id", None)
    return entry


@api.post("/voice/call-log")
async def log_call(
    payload: dict,
    current=Depends(get_current_user),
):
    return await save_call_log(payload, current)


@api.post("/voice/call-log/beacon")
async def log_call_beacon(request: Request):
    """
    Best-effort page-close logger.

    Cookies are preferred. token_fallback is accepted only because sendBeacon
    cannot add an Authorization header.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid call log payload")

    try:
        current = await get_current_user(request)
    except HTTPException:
        token = payload.pop("token_fallback", None)
        if not token:
            raise

        try:
            decoded = pyjwt.decode(
                token,
                JWT_SECRET,
                algorithms=[JWT_ALGO],
            )
            current = await db.users.find_one(
                {"id": decoded["sub"]},
                {"_id": 0, "password_hash": 0},
            )
        except Exception:
            current = None

        if not current:
            raise HTTPException(status_code=401, detail="Not authenticated")

    return await save_call_log(payload, current)


@api.post("/telnyx/texml")
async def telnyx_texml_webhook(request: Request):
    """
    Telnyx calls this whenever a call event happens on the SIP Connection /
    TeXML Application tied to Zimlink. It expects TeXML (XML) back telling
    it what to do with the call.
    """
    form = await request.form()
    call_direction = form.get("Direction")
    to_number = form.get("To")
    from_number = form.get("From")

    logger.info(f"[Telnyx] direction={call_direction} to={to_number} from={from_number}")

    texml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Dial callerId="{from_number}" answerOnBridge="true">
            <Number>{to_number}</Number>
        </Dial>
    </Response>"""

    return Response(content=texml, media_type="application/xml")


# ----- Contacts -----
@api.get("/voice/contacts")
async def list_contacts(current=Depends(get_current_user)):
    contacts = await db.contacts.find(
        {"user_id": current["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return contacts


@api.post("/voice/contacts")
async def add_contact(data: ContactIn, current=Depends(get_current_user)):
    number = data.number.strip()
    if not number.startswith("+"):
        raise HTTPException(
            status_code=400,
            detail="Use international format, for example +26377XXXXXXX."
        )

    # Avoid duplicate numbers per user.
    existing = await db.contacts.find_one({"user_id": current["id"], "number": number})
    if existing:
        raise HTTPException(status_code=400, detail="This number is already in your contacts")

    contact = {
        "id": new_id(),
        "user_id": current["id"],
        "name": (data.name or "").strip(),
        "number": number,
        "created_at": now_iso(),
    }
    await db.contacts.insert_one(contact)
    contact.pop("_id", None)
    return contact


@api.delete("/voice/contacts/{contact_id}")
async def delete_contact(contact_id: str, current=Depends(get_current_user)):
    result = await db.contacts.delete_one({"id": contact_id, "user_id": current["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"ok": True}


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

@api.get("/admin/marketplace/listings")
async def admin_get_marketplace_listings(
    q: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    _=Depends(require_admin)
):
    query = {}

    if category and category != "all":
        query["category"] = category

    if status and status != "all":
        query["status"] = status

    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"seller_name": {"$regex": q, "$options": "i"}},
            {"seller_email": {"$regex": q, "$options": "i"}},
        ]

    listings = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return listings


@api.patch("/admin/marketplace/listings/{listing_id}/approve")
async def admin_approve_listing(listing_id: str, _=Depends(require_admin)):
    result = await db.listings.update_one(
        {"id": listing_id},
        {"$set": {"status": "approved", "approved_at": now_iso()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")

    return {"ok": True}


@api.patch("/admin/marketplace/listings/{listing_id}/reject")
async def admin_reject_listing(listing_id: str, _=Depends(require_admin)):
    result = await db.listings.update_one(
        {"id": listing_id},
        {"$set": {"status": "rejected", "rejected_at": now_iso()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")

    return {"ok": True}


@api.delete("/admin/marketplace/listings/{listing_id}")
async def admin_delete_listing(listing_id: str, _=Depends(require_admin)):
    result = await db.listings.delete_one({"id": listing_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")

    return {"ok": True}

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
        {"_id": 0, "id": 1, "name": 1, "email": 1, "wallet_balance": 1, "is_admin": 1, "is_verified_seller": 1, "account_status": 1},
    )

    return {"ok": True, "user": user}


@api.patch("/admin/users/{user_id}/make-admin")
async def admin_make_user_admin(user_id: str, _=Depends(require_admin)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_admin": True, "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": user}


@api.patch("/admin/users/{user_id}/remove-admin")
async def admin_remove_user_admin(user_id: str, current=Depends(require_admin)):
    if user_id == current.get("id"):
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access")

    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_admin": False, "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": user}


@api.patch("/admin/users/{user_id}/verify-seller")
async def admin_verify_seller(user_id: str, _=Depends(require_admin)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_verified_seller": True, "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": user}


@api.patch("/admin/users/{user_id}/remove-verification")
async def admin_remove_seller_verification(user_id: str, _=Depends(require_admin)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_verified_seller": False, "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": user}


@api.patch("/admin/users/{user_id}/status")
async def admin_update_user_status(user_id: str, payload: dict, current=Depends(require_admin)):
    status_value = (payload.get("status") or "").strip().lower()
    if status_value not in ["active", "suspended"]:
        raise HTTPException(status_code=400, detail="Status must be active or suspended")
    if user_id == current.get("id") and status_value == "suspended":
        raise HTTPException(status_code=400, detail="You cannot suspend your own account")

    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"account_status": status_value, "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": user}


@api.get("/admin/marketplace/listings")
async def admin_marketplace_listings(limit: int = 300, _=Depends(require_admin)):
    items = await db.listings.find({}, {"_id": 0}).sort("created_at", -1).to_list(min(limit, 500))
    return items


@api.delete("/admin/marketplace/listings/{listing_id}")
async def admin_delete_marketplace_listing(listing_id: str, _=Depends(require_admin)):
    result = await db.listings.delete_one({"id": listing_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"ok": True}


@api.get("/admin/events")
async def admin_events(limit: int = 300, _=Depends(require_admin)):
    items = await db.events.find({}, {"_id": 0}).sort("created_at", -1).to_list(min(limit, 500))
    return items


@api.delete("/admin/events/{event_id}")
async def admin_delete_event(event_id: str, _=Depends(require_admin)):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.event_tickets.delete_many({"event_id": event_id})
    return {"ok": True}


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

# ----- Profile / Account -----

class UpdateProfileIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)

class RequestEmailChangeIn(BaseModel):
    new_email: EmailStr

class ConfirmEmailChangeIn(BaseModel):
    old_email_code: str = Field(min_length=6, max_length=6)
    new_email_code: str = Field(min_length=6, max_length=6)
    new_email: EmailStr

class DeleteAccountIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)

class SupportMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


@api.patch("/auth/profile")
async def update_profile(data: UpdateProfileIn, current=Depends(get_current_user)):
    update = {}
    if data.name:
        update["name"] = data.name.strip()
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.users.update_one({"id": current["id"]}, {"$set": update})
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    return user


@api.post("/auth/email-change/request")
async def request_email_change(data: RequestEmailChangeIn, current=Depends(get_current_user)):
    new_email = data.new_email.lower().strip()

    if new_email == current["email"]:
        raise HTTPException(status_code=400, detail="New email is the same as current email")

    existing = await db.users.find_one({"email": new_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    old_code = generate_otp()
    new_code = generate_otp()

    await save_verification_code(
        email=current["email"],
        purpose="email_change_old",
        code=old_code,
        extra={"new_email": new_email},
    )
    await save_verification_code(
        email=new_email,
        purpose="email_change_new",
        code=new_code,
    )

    send_email_code(current["email"], old_code, "email_change_old")
    send_email_code(new_email, new_code, "email_change_new")

    return {"ok": True, "message": "Verification codes sent to both email addresses"}


@api.post("/auth/email-change/confirm")
async def confirm_email_change(data: ConfirmEmailChangeIn, current=Depends(get_current_user)):
    new_email = data.new_email.lower().strip()

    await verify_code(current["email"], "email_change_old", data.old_email_code)
    await verify_code(new_email, "email_change_new", data.new_email_code)

    await db.users.update_one(
        {"id": current["id"]},
        {"$set": {"email": new_email, "updated_at": now_iso()}},
    )
    await db.verification_codes.delete_many({"email": current["email"], "purpose": "email_change_old"})
    await db.verification_codes.delete_many({"email": new_email, "purpose": "email_change_new"})

    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    return user


@api.post("/auth/delete-account/request")
async def request_delete_account(current=Depends(get_current_user)):
    code = generate_otp()
    await save_verification_code(email=current["email"], purpose="delete_account", code=code)
    send_email_code(current["email"], code, "delete_account")
    return {"ok": True, "message": "Verification code sent to your email"}


@api.post("/auth/delete-account/confirm")
async def confirm_delete_account(data: DeleteAccountIn, current=Depends(get_current_user), response: Response = None):
    await verify_code(current["email"], "delete_account", data.code)
    await db.users.delete_one({"id": current["id"]})
    await db.verification_codes.delete_many({"email": current["email"]})
    if response:
        response.delete_cookie("access_token", path="/")
    return {"ok": True, "message": "Account deleted"}


@api.post("/support/message")
async def send_support_message(
    data: SupportMessageIn,
    current=Depends(get_current_user),
):
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get(
        "FROM_EMAIL",
        "ZimLink <info@zimlink.me>",
    ).strip()

    if not resend_api_key:
        raise HTTPException(
            status_code=500,
            detail="Support email not configured",
        )

    resend.api_key = resend_api_key

    safe_name = escape(str(current.get("name", "User")))
    safe_email = escape(str(current.get("email", "")))
    safe_user_id = escape(str(current.get("id", "")))
    safe_message = escape(data.message).replace("\n", "<br/>")

    content_html = f"""
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:18px;margin-bottom:22px;">
        <p style="margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#15803d;">
          Submitted by
        </p>
        <p style="margin:0;font-size:17px;font-weight:700;color:#111111;">
          {safe_name}
        </p>
        <p style="margin:5px 0 0;font-size:13px;color:#52525b;">
          {safe_email}
        </p>
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:22px;">
        <tr>
          <td style="padding:11px 0;color:#71717a;border-bottom:1px solid #eeeeee;">User ID</td>
          <td align="right" style="padding:11px 0;color:#111111;font-family:monospace;font-size:11px;border-bottom:1px solid #eeeeee;">{safe_user_id}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;color:#71717a;">Reply email</td>
          <td align="right" style="padding:11px 0;color:#111111;">{safe_email}</td>
        </tr>
      </table>

      <div style="background:#fafafa;border:1px solid #eeeeee;border-radius:14px;padding:18px;">
        <p style="margin:0 0 9px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#71717a;">
          Message
        </p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#27272a;">
          {safe_message}
        </p>
      </div>
    """

    html = branded_email_template(
        title="New support message",
        preview_text=f"New support request from {current.get('name', 'a ZimLink user')}.",
        content_html=content_html,
        eyebrow="Customer support",
        footer_text="This message was submitted through the ZimLink application.",
    )

    try:
        resend.Emails.send({
            "from": from_email,
            "to": ["info@zimlink.me"],
            "reply_to": current["email"],
            "subject": (
                f"Support: {current['name']} — "
                f"{data.message[:60]}..."
            ),
            "html": html,
        })
        logger.info("Support message from %s", current["email"])
        return {"ok": True, "message": "Message sent"}
    except Exception as exc:
        logger.error("Support email failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Could not send message",
        )


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
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.password_reset_tokens.create_index([("user_id", 1), ("created_at", -1)])
    await db.password_reset_tokens.create_index("expires_at")
    await db.contacts.create_index([("user_id", 1), ("created_at", -1)])
    await db.contacts.create_index([("user_id", 1), ("number", 1)])
    await db.calls.create_index(
        [("user_id", 1), ("call_session_id", 1)],
        unique=True,
        sparse=True,
    )
    await db.calls.create_index(
        [("user_id", 1), ("started_at", -1)]
    )
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.payment_transactions.create_index([("user_id", 1), ("created_at", -1)])

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
                "is_verified_seller": True,
                "account_status": "active",
                "created_at": now_iso(),
            })
            logger.info("Seeded admin user.")
        await db.users.update_one({"email": admin_email}, {"$set": {"is_admin": True}})

    await db.users.update_many(
        {"is_admin": {"$exists": False}},
        {"$set": {"is_admin": False}}
    )
    await db.users.update_many(
        {"is_verified_seller": {"$exists": False}},
        {"$set": {"is_verified_seller": False}}
    )
    await db.users.update_many(
        {"account_status": {"$exists": False}},
        {"$set": {"account_status": "active"}}
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