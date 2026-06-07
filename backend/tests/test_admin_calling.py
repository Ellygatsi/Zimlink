"""Backend tests for Zim Link admin calling module (iteration 2).

Covers:
- Admin auth & guard
- Call rates CRUD
- /voice/rate-quote
- Wallet billing on /voice/call-log (success + insufficient balance)
- Admin stats aggregation + admin calls list
- Admin user credit
- Non-admin 403 enforcement
- Regression of existing user flows
"""

import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Frontend env not loaded into pytest process; read it.
    from pathlib import Path
    fe_env = Path("/app/frontend/.env").read_text()
    for line in fe_env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@superapp.com"
ADMIN_PASSWORD = "admin123"
USER_EMAIL = "user@superapp.com"
USER_PASSWORD = "user123"


# ---------- Helpers ----------
def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    body = r.json()
    return body["token"], body["user"]


def _headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin_token():
    token, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    return token


@pytest.fixture(scope="session")
def user_token():
    token, _ = _login(USER_EMAIL, USER_PASSWORD)
    return token


@pytest.fixture(scope="session")
def user_id(user_token):
    r = requests.get(f"{API}/auth/me", headers=_headers(user_token), timeout=15)
    assert r.status_code == 200
    return r.json()["id"]


# ---------- 1. Admin auth & guard ----------
class TestAdminAuth:
    def test_admin_login(self):
        token, user = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token and isinstance(token, str)
        assert user["email"] == ADMIN_EMAIL
        assert user.get("is_admin") is True

    def test_admin_me(self, admin_token):
        r = requests.get(f"{API}/admin/me", headers=_headers(admin_token), timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["is_admin"] is True
        assert body["email"] == ADMIN_EMAIL
        assert "name" in body

    def test_non_admin_blocked_on_admin_me(self, user_token):
        r = requests.get(f"{API}/admin/me", headers=_headers(user_token), timeout=15)
        assert r.status_code == 403


# ---------- 2. Call rates CRUD ----------
class TestCallRates:
    def test_list_seeded_rates(self, admin_token):
        r = requests.get(f"{API}/admin/rates", headers=_headers(admin_token), timeout=15)
        assert r.status_code == 200
        rates = r.json()
        prefixes = {x["prefix"] for x in rates}
        for expected in ["+1", "+2632", "+2634", "+2637", "+27", "+44", "default"]:
            assert expected in prefixes, f"missing seeded prefix {expected}; got {prefixes}"

    def test_create_update_delete_rate(self, admin_token):
        unique_prefix = "+9990" + str(int(time.time()))[-4:]
        # Create
        payload = {
            "name": "TEST_Region",
            "prefix": unique_prefix,
            "rate_per_minute": 0.5,
            "cost_per_minute": 0.2,
        }
        r = requests.post(f"{API}/admin/rates", headers=_headers(admin_token), json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["prefix"] == unique_prefix
        assert created["rate_per_minute"] == 0.5
        rate_id = created["id"]

        # Duplicate prefix -> 400
        r = requests.post(f"{API}/admin/rates", headers=_headers(admin_token), json=payload, timeout=15)
        assert r.status_code == 400, f"expected duplicate prefix to 400, got {r.status_code} {r.text}"

        # Update
        r = requests.put(
            f"{API}/admin/rates/{rate_id}",
            headers=_headers(admin_token),
            json={"rate_per_minute": 0.75, "name": "TEST_Region_Updated"},
            timeout=15,
        )
        assert r.status_code == 200
        updated = r.json()
        assert updated["rate_per_minute"] == 0.75
        assert updated["name"] == "TEST_Region_Updated"

        # Verify via GET
        r = requests.get(f"{API}/admin/rates", headers=_headers(admin_token), timeout=15)
        rec = next((x for x in r.json() if x["id"] == rate_id), None)
        assert rec and rec["rate_per_minute"] == 0.75

        # Delete
        r = requests.delete(f"{API}/admin/rates/{rate_id}", headers=_headers(admin_token), timeout=15)
        assert r.status_code == 200

        # Verify gone
        r = requests.get(f"{API}/admin/rates", headers=_headers(admin_token), timeout=15)
        assert not any(x["id"] == rate_id for x in r.json())

    def test_cannot_delete_default_rate(self, admin_token):
        r = requests.get(f"{API}/admin/rates", headers=_headers(admin_token), timeout=15)
        default = next((x for x in r.json() if x["prefix"] == "default"), None)
        assert default, "default rate must exist"
        r = requests.delete(f"{API}/admin/rates/{default['id']}", headers=_headers(admin_token), timeout=15)
        assert r.status_code == 400, f"expected 400 when deleting default; got {r.status_code} {r.text}"

    def test_non_admin_cannot_access_rates(self, user_token):
        r = requests.get(f"{API}/admin/rates", headers=_headers(user_token), timeout=15)
        assert r.status_code == 403


# ---------- 3. Rate-quote ----------
class TestRateQuote:
    def test_quote_zw_mobile(self, user_token):
        r = requests.get(
            f"{API}/voice/rate-quote",
            params={"to": "+263771234567"},
            headers=_headers(user_token),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["rate_per_minute"] == 0.30
        assert "Zimbabwe Mobile" in body["rate_name"]
        assert isinstance(body["balance"], (int, float))
        # max_minutes ~ balance / 0.30
        expected_max = round(body["balance"] / 0.30, 2)
        assert abs(body["max_minutes"] - expected_max) < 0.05

    def test_quote_uk(self, user_token):
        r = requests.get(
            f"{API}/voice/rate-quote",
            params={"to": "+447712345678"},
            headers=_headers(user_token),
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["rate_per_minute"] == 0.05
        assert "United Kingdom" in body["rate_name"]

    def test_quote_unknown_prefix_defaults(self, user_token):
        r = requests.get(
            f"{API}/voice/rate-quote",
            params={"to": "+99999999"},
            headers=_headers(user_token),
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["rate_per_minute"] == 0.35
        assert body["rate_name"].lower().startswith("default")


# ---------- 4. Wallet billing on call-log ----------
class TestCallLogBilling:
    def test_billing_deducts_wallet(self, user_token):
        # capture balance
        r = requests.get(f"{API}/wallet/balance", headers=_headers(user_token), timeout=15)
        assert r.status_code == 200
        before = float(r.json()["balance"])

        # Log a 60-second call to ZW mobile -> $0.30 charge
        r = requests.post(
            f"{API}/voice/call-log",
            headers=_headers(user_token),
            json={
                "to": "+263771234567",
                "duration_seconds": 60,
                "direction": "outbound",
                "status": "completed",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        entry = r.json()
        assert entry["rate_per_minute"] == 0.30
        assert entry["charge_amount"] == 0.30
        assert entry["cost_amount"] == 0.15
        assert abs(entry["profit_amount"] - 0.15) < 1e-6
        assert entry["billed"] is True
        assert entry["status"] == "completed"

        r = requests.get(f"{API}/wallet/balance", headers=_headers(user_token), timeout=15)
        after = float(r.json()["balance"])
        assert abs((before - after) - 0.30) < 1e-3, f"expected -0.30, got {before - after}"


# ---------- 5. Insufficient balance handling ----------
class TestInsufficientBalance:
    def test_billing_failed_when_no_balance(self, admin_token):
        # Register a fresh user
        email = f"TEST_lowbal_{uuid.uuid4().hex[:8]}@example.com"
        password = "pass1234"
        r = requests.post(
            f"{API}/auth/register",
            json={"email": email, "password": password, "name": "TEST low balance"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        new_token = body["token"]
        new_uid = body["user"]["id"]
        starter = float(body["user"]["wallet_balance"])

        # Drain it: credit by -starter so balance is 0
        r = requests.post(
            f"{API}/admin/users/{new_uid}/credit",
            headers=_headers(admin_token),
            json={"amount": -starter},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert abs(r.json()["wallet_balance"]) < 1e-6

        # Now credit a tiny amount ($0.05)
        r = requests.post(
            f"{API}/admin/users/{new_uid}/credit",
            headers=_headers(admin_token),
            json={"amount": 0.05},
            timeout=15,
        )
        assert r.status_code == 200
        assert abs(r.json()["wallet_balance"] - 0.05) < 1e-3

        # Attempt a 120-second call to ZW mobile -> $0.60 needed > $0.05 balance
        r = requests.post(
            f"{API}/voice/call-log",
            headers=_headers(new_token),
            json={
                "to": "+263771234567",
                "duration_seconds": 120,
                "direction": "outbound",
                "status": "completed",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        entry = r.json()
        assert entry["billed"] is False
        assert entry["status"] == "billing_failed"

        # Balance unchanged
        r = requests.get(f"{API}/wallet/balance", headers=_headers(new_token), timeout=15)
        assert abs(r.json()["balance"] - 0.05) < 1e-3


# ---------- 6. Admin stats aggregation ----------
class TestAdminStats:
    def test_stats_after_calls(self, admin_token, user_token):
        # Ensure user has balance
        r = requests.get(f"{API}/auth/me", headers=_headers(user_token), timeout=15)
        uid = r.json()["id"]
        requests.post(
            f"{API}/admin/users/{uid}/credit",
            headers=_headers(admin_token),
            json={"amount": 50},
            timeout=15,
        )

        # Log 2 calls
        for _ in range(2):
            requests.post(
                f"{API}/voice/call-log",
                headers=_headers(user_token),
                json={
                    "to": "+447712345678",
                    "duration_seconds": 60,
                    "direction": "outbound",
                    "status": "completed",
                },
                timeout=15,
            )

        r = requests.get(
            f"{API}/admin/stats/calls",
            params={"days": 30},
            headers=_headers(admin_token),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        for key in ["summary", "top_callers", "by_day", "user_count", "window_days"]:
            assert key in body, f"missing {key}"
        summary = body["summary"]
        for key in [
            "total_calls", "total_seconds", "total_revenue",
            "total_cost", "total_profit", "billed_calls",
        ]:
            assert key in summary
        assert summary["total_calls"] >= 2
        assert summary["total_revenue"] >= 0.10  # at least 2 * 0.05
        assert isinstance(body["top_callers"], list)
        assert isinstance(body["by_day"], list)
        assert isinstance(body["user_count"], int) and body["user_count"] >= 2

    def test_non_admin_blocked(self, user_token):
        r = requests.get(f"{API}/admin/stats/calls", headers=_headers(user_token), timeout=15)
        assert r.status_code == 403


# ---------- 7. Admin calls list ----------
class TestAdminCallsList:
    def test_list_calls(self, admin_token):
        r = requests.get(f"{API}/admin/calls", params={"limit": 50}, headers=_headers(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        if items:
            sample = items[0]
            for f in ["user_name", "user_email", "to", "duration_seconds",
                      "charge_amount", "profit_amount", "status", "billed", "created_at"]:
                assert f in sample, f"missing field {f}"
            # Sorted desc by created_at
            ts = [x["created_at"] for x in items]
            assert ts == sorted(ts, reverse=True)

    def test_non_admin_blocked(self, user_token):
        r = requests.get(f"{API}/admin/calls", headers=_headers(user_token), timeout=15)
        assert r.status_code == 403


# ---------- 8. Admin user credit ----------
class TestAdminCredit:
    def test_credit_user(self, admin_token, user_token, user_id):
        # Before
        r = requests.get(f"{API}/wallet/balance", headers=_headers(user_token), timeout=15)
        before = float(r.json()["balance"])
        # Credit
        r = requests.post(
            f"{API}/admin/users/{user_id}/credit",
            headers=_headers(admin_token),
            json={"amount": 25},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert abs(body["wallet_balance"] - (before + 25)) < 1e-3

        # After via GET
        r = requests.get(f"{API}/wallet/balance", headers=_headers(user_token), timeout=15)
        after = float(r.json()["balance"])
        assert abs(after - (before + 25)) < 1e-3

    def test_non_admin_cannot_credit(self, user_token, user_id):
        r = requests.post(
            f"{API}/admin/users/{user_id}/credit",
            headers=_headers(user_token),
            json={"amount": 999},
            timeout=15,
        )
        assert r.status_code == 403


# ---------- 9. Admin users list 403 ----------
class TestAdminUsersGuard:
    def test_non_admin_blocked(self, user_token):
        r = requests.get(f"{API}/admin/users", headers=_headers(user_token), timeout=15)
        assert r.status_code == 403

    def test_admin_can_list(self, admin_token):
        r = requests.get(f"{API}/admin/users", headers=_headers(admin_token), timeout=15)
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        assert any(u["email"] == ADMIN_EMAIL for u in users)
        # password_hash never leaks
        assert all("password_hash" not in u for u in users)


# ---------- 10. Regression: existing flows still work ----------
class TestRegression:
    def test_marketplace_list(self, user_token):
        r = requests.get(f"{API}/marketplace/listings", headers=_headers(user_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_community_posts(self, user_token):
        r = requests.get(f"{API}/community/posts", headers=_headers(user_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_community_channels(self, user_token):
        r = requests.get(f"{API}/community/channels", headers=_headers(user_token), timeout=15)
        assert r.status_code == 200
        chans = r.json()
        assert isinstance(chans, list)
        assert any(c["name"] == "general" for c in chans)

    def test_wallet_send(self, admin_token, user_token, user_id):
        # Ensure admin has enough; admin sends to user
        r = requests.post(
            f"{API}/wallet/send",
            headers=_headers(admin_token),
            json={"recipient_email": USER_EMAIL, "amount": 1.0, "note": "TEST_regression"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["amount"] == 1.0
        assert tx["to_email"] == USER_EMAIL

    def test_auth_me(self, user_token):
        r = requests.get(f"{API}/auth/me", headers=_headers(user_token), timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == USER_EMAIL
        assert "password_hash" not in body
