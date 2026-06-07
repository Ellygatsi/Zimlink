"""SuperApp backend regression tests - auth, wallet, marketplace, community, voice, stats."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://voip-wallet-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@superapp.com"
ADMIN_PASSWORD = "admin123"
USER_EMAIL = "user@superapp.com"
USER_PASSWORD = "user123"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    data = r.json()
    return data["token"], data["user"], r


def _headers(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin():
    tok, user, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    return {"token": tok, "user": user, "h": _headers(tok)}


@pytest.fixture(scope="session")
def testuser():
    tok, user, _ = _login(USER_EMAIL, USER_PASSWORD)
    return {"token": tok, "user": user, "h": _headers(tok)}


# ---------- Auth ----------
class TestAuth:
    def test_login_admin_returns_token_and_cookie(self):
        tok, user, resp = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert isinstance(tok, str) and len(tok) > 20
        assert user["email"] == ADMIN_EMAIL
        assert "password_hash" not in user
        # cookie set
        assert "access_token" in resp.cookies or any(
            "access_token" in c for c in resp.headers.get("set-cookie", "")
        )

    def test_login_test_user(self):
        tok, user, _ = _login(USER_EMAIL, USER_PASSWORD)
        assert user["email"] == USER_EMAIL

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_endpoint(self, admin):
        r = requests.get(f"{API}/auth/me", headers=admin["h"], timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_register_new_user_gets_starter_bonus(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": "pass123", "name": "TEST New"},
                          timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["wallet_balance"] == 100.0
        assert data["token"]
        # duplicate
        r2 = requests.post(f"{API}/auth/register",
                           json={"email": email, "password": "pass123", "name": "Dup"}, timeout=15)
        assert r2.status_code == 400


# ---------- Wallet ----------
class TestWallet:
    def test_admin_balance(self, admin):
        r = requests.get(f"{API}/wallet/balance", headers=admin["h"], timeout=15)
        assert r.status_code == 200
        bal = r.json()["balance"]
        assert isinstance(bal, (int, float))
        assert bal >= 0

    def test_send_money_flow(self, admin, testuser):
        # Snapshot balances
        b1 = requests.get(f"{API}/wallet/balance", headers=admin["h"]).json()["balance"]
        b2 = requests.get(f"{API}/wallet/balance", headers=testuser["h"]).json()["balance"]
        amt = 12.5
        r = requests.post(f"{API}/wallet/send", headers=admin["h"],
                          json={"recipient_email": USER_EMAIL, "amount": amt, "note": "TEST send"},
                          timeout=20)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["amount"] == amt
        assert tx["from_email"] == ADMIN_EMAIL
        assert tx["to_email"] == USER_EMAIL
        assert "_id" not in tx

        b1_after = requests.get(f"{API}/wallet/balance", headers=admin["h"]).json()["balance"]
        b2_after = requests.get(f"{API}/wallet/balance", headers=testuser["h"]).json()["balance"]
        assert round(b1 - b1_after, 2) == amt
        assert round(b2_after - b2, 2) == amt

    def test_self_send_blocked(self, admin):
        r = requests.post(f"{API}/wallet/send", headers=admin["h"],
                          json={"recipient_email": ADMIN_EMAIL, "amount": 1, "note": ""}, timeout=15)
        assert r.status_code == 400

    def test_insufficient_balance(self, testuser):
        r = requests.post(f"{API}/wallet/send", headers=testuser["h"],
                          json={"recipient_email": ADMIN_EMAIL, "amount": 9999999, "note": ""}, timeout=15)
        assert r.status_code == 400

    def test_recipient_not_found(self, admin):
        r = requests.post(f"{API}/wallet/send", headers=admin["h"],
                          json={"recipient_email": "nobody_xyz@nope.com", "amount": 1}, timeout=15)
        assert r.status_code == 404

    def test_transactions_history(self, admin):
        r = requests.get(f"{API}/wallet/transactions", headers=admin["h"], timeout=15)
        assert r.status_code == 200
        txs = r.json()
        assert isinstance(txs, list)
        assert len(txs) >= 1
        assert all("_id" not in t for t in txs)


# ---------- Marketplace ----------
class TestMarketplace:
    listing_id = None

    def test_create_listing(self, admin):
        payload = {"title": "TEST Bicycle", "description": "Used bike", "price": 50.0,
                   "category": "goods", "image_url": ""}
        r = requests.post(f"{API}/marketplace/listings", headers=admin["h"], json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == payload["title"]
        assert d["category"] == "goods"
        assert d["seller_email"] == ADMIN_EMAIL
        TestMarketplace.listing_id = d["id"]

    def test_get_listing_by_id(self):
        assert TestMarketplace.listing_id
        r = requests.get(f"{API}/marketplace/listings/{TestMarketplace.listing_id}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == TestMarketplace.listing_id

    def test_get_listing_not_found(self):
        r = requests.get(f"{API}/marketplace/listings/no-such-id", timeout=15)
        assert r.status_code == 404

    def test_filter_and_search(self, admin):
        # service listing for filter test
        requests.post(f"{API}/marketplace/listings", headers=admin["h"],
                      json={"title": "TEST Plumbing", "description": "fix pipes",
                            "price": 30, "category": "services"}, timeout=15)
        r = requests.get(f"{API}/marketplace/listings?category=services", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert all(i["category"] == "services" for i in items)
        r2 = requests.get(f"{API}/marketplace/listings?q=Bicycle", timeout=15)
        assert r2.status_code == 200
        assert any("Bicycle" in i["title"] for i in r2.json())

    def test_delete_only_owner(self, admin, testuser):
        # testuser cannot delete admin's listing
        r = requests.delete(f"{API}/marketplace/listings/{TestMarketplace.listing_id}",
                            headers=testuser["h"], timeout=15)
        assert r.status_code == 403
        # owner can
        r2 = requests.delete(f"{API}/marketplace/listings/{TestMarketplace.listing_id}",
                             headers=admin["h"], timeout=15)
        assert r2.status_code == 200
        r3 = requests.get(f"{API}/marketplace/listings/{TestMarketplace.listing_id}", timeout=15)
        assert r3.status_code == 404


# ---------- Community Posts ----------
class TestCommunityPosts:
    post_id = None

    def test_create_post(self, admin):
        r = requests.post(f"{API}/community/posts", headers=admin["h"],
                          json={"content": "TEST hello community"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["content"] == "TEST hello community"
        assert d["likes"] == []
        assert d["comment_count"] == 0
        TestCommunityPosts.post_id = d["id"]

    def test_feed_list(self):
        r = requests.get(f"{API}/community/posts", timeout=15)
        assert r.status_code == 200
        assert any(p["id"] == TestCommunityPosts.post_id for p in r.json())

    def test_like_toggle(self, testuser):
        pid = TestCommunityPosts.post_id
        r = requests.post(f"{API}/community/posts/{pid}/like", headers=testuser["h"], timeout=15)
        assert r.status_code == 200
        assert r.json() == {"liked": True, "likes_count": 1}
        r2 = requests.post(f"{API}/community/posts/{pid}/like", headers=testuser["h"], timeout=15)
        assert r2.json() == {"liked": False, "likes_count": 0}

    def test_comment_and_count(self, testuser):
        pid = TestCommunityPosts.post_id
        r = requests.post(f"{API}/community/posts/{pid}/comments", headers=testuser["h"],
                          json={"content": "nice TEST"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["content"] == "nice TEST"
        # comment_count incremented
        feed = requests.get(f"{API}/community/posts", timeout=15).json()
        post = next(p for p in feed if p["id"] == pid)
        assert post["comment_count"] == 1
        # GET comments
        gc = requests.get(f"{API}/community/posts/{pid}/comments", timeout=15)
        assert gc.status_code == 200
        assert any(c["content"] == "nice TEST" for c in gc.json())


# ---------- Community Channels ----------
class TestChannels:
    def test_list_has_general(self):
        r = requests.get(f"{API}/community/channels", timeout=15)
        assert r.status_code == 200
        names = [c["name"] for c in r.json()]
        assert "general" in names

    def test_create_channel_and_message(self, admin):
        cname = f"TEST_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/community/channels", headers=admin["h"],
                          json={"name": cname, "description": "t"}, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        rm = requests.post(f"{API}/community/channels/{cid}/messages", headers=admin["h"],
                           json={"content": "hi TEST"}, timeout=15)
        assert rm.status_code == 200
        assert rm.json()["content"] == "hi TEST"
        gm = requests.get(f"{API}/community/channels/{cid}/messages", timeout=15)
        assert gm.status_code == 200
        assert any(m["content"] == "hi TEST" for m in gm.json())

    def test_message_to_unknown_channel(self, admin):
        r = requests.post(f"{API}/community/channels/no-such/messages", headers=admin["h"],
                          json={"content": "x"}, timeout=15)
        assert r.status_code == 404


# ---------- Voice (feature-flagged off) ----------
class TestVoice:
    def test_voice_config_disabled(self):
        r = requests.get(f"{API}/voice/config", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["enabled"] is False
        assert d.get("reason")

    def test_voice_token_503(self, admin):
        r = requests.get(f"{API}/voice/token", headers=admin["h"], timeout=15)
        assert r.status_code == 503

    def test_voice_token_requires_auth(self):
        r = requests.get(f"{API}/voice/token", timeout=15)
        assert r.status_code == 401

    def test_call_log_and_history(self, admin):
        payload = {"to": "+15551234567", "to_name": "TEST Mom",
                   "direction": "outbound", "duration_seconds": 42, "status": "completed"}
        r = requests.post(f"{API}/voice/call-log", headers=admin["h"], json=payload, timeout=15)
        assert r.status_code == 200
        entry = r.json()
        assert entry["duration_seconds"] == 42
        assert entry["to_name"] == "TEST Mom"
        h = requests.get(f"{API}/voice/call-history", headers=admin["h"], timeout=15)
        assert h.status_code == 200
        assert any(c["id"] == entry["id"] for c in h.json())


# ---------- Stats ----------
class TestStats:
    def test_home_stats(self, admin):
        r = requests.get(f"{API}/stats/home", headers=admin["h"], timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["balance", "tx_count", "listing_count", "post_count", "call_count"]:
            assert k in d
        assert isinstance(d["tx_count"], int)
