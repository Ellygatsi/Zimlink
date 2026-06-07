"""Backend tests for Zim Link Stripe Wallet Top-up + Admin settings (iteration 3).

Covers:
- register no longer grants $100 bonus (wallet_balance == 0.0)
- GET /api/wallet/topup/packages math
- POST /api/wallet/topup/checkout (valid + invalid amounts)
- payment_transactions row persistence
- /api/wallet/topup/status/{id} (own + foreign) + idempotency
- /api/webhook/stripe exposed & 400s on bogus signature
- /api/admin/settings GET/PUT (admin only) & propagation
- /api/admin/topup-stats (admin only)
- regression: wallet/send, voice/rate-quote, admin/calls, admin/rates
- restore default settings after tests
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://voip-wallet-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@superapp.com"
ADMIN_PASSWORD = "admin123"
USER_EMAIL = "user@superapp.com"
USER_PASSWORD = "user123"

DEFAULT_PACKAGES = [5.0, 10.0, 25.0, 50.0, 100.0, 250.0]
DEFAULT_FEE = 3.0


# ---------- fixtures ----------
def _new_session():
    """Use a fresh session per role to avoid cookie carry-over (backend prefers
    access_token cookie over Authorization Bearer header)."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def session():
    return _new_session()


def _login(session, email, password):
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_sess_token():
    s = _new_session()
    t = _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
    return s, t


@pytest.fixture(scope="session")
def user_sess_token():
    s = _new_session()
    t = _login(s, USER_EMAIL, USER_PASSWORD)
    return s, t


@pytest.fixture(scope="session")
def admin_token(admin_sess_token):
    return admin_sess_token[1]


@pytest.fixture(scope="session")
def user_token(user_sess_token):
    return user_sess_token[1]


@pytest.fixture
def admin_session(admin_sess_token, admin_token):
    # Always create a fresh requests.Session for each test to avoid cookie
    # precedence (backend reads access_token cookie BEFORE Authorization header).
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    # DEBUG: verify admin token works
    r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"[DBG admin_session] /auth/me -> {r.status_code} is_admin={r.json().get('is_admin') if r.status_code==200 else 'n/a'} email={r.json().get('email') if r.status_code==200 else r.text[:60]}")
    return s


@pytest.fixture
def user_session(user_sess_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session", autouse=True)
def restore_defaults(request):
    """Ensure defaults are in place before tests AND restored after the run."""
    s = _new_session()
    token = _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
    s.cookies.clear()
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    s.put(f"{API}/admin/settings", headers=h, json={
        "deposit_fee_percent": DEFAULT_FEE,
        "topup_packages": DEFAULT_PACKAGES,
        "min_topup": 5.0,
        "max_topup": 500.0,
    })

    def _teardown():
        s.cookies.clear()
        s.put(f"{API}/admin/settings", headers=h, json={
            "deposit_fee_percent": DEFAULT_FEE,
            "topup_packages": DEFAULT_PACKAGES,
            "min_topup": 5.0,
            "max_topup": 500.0,
        })
    request.addfinalizer(_teardown)


# ---------- register: no $100 bonus ----------
class TestRegisterNoBonus:
    def test_new_user_wallet_is_zero(self, session):
        email = f"TEST_topup_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register", json={
            "email": email, "password": "pass1234", "name": "Topup Tester",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user" in data
        assert data["user"]["wallet_balance"] == 0.0, (
            f"Expected 0.0 wallet on register, got {data['user']['wallet_balance']}"
        )
        # double-check via /wallet/balance
        token = data["token"]
        r2 = session.get(f"{API}/wallet/balance",
                         headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert r2.json()["balance"] == 0.0


# ---------- /wallet/topup/packages ----------
class TestTopupPackages:
    def test_packages_math(self, session, user_headers):
        r = session.get(f"{API}/wallet/topup/packages", headers=user_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["deposit_fee_percent"] == DEFAULT_FEE
        assert body["min_topup"] == 5.0
        assert body["max_topup"] == 500.0
        pkgs = body["packages"]
        amounts = [p["amount"] for p in pkgs]
        assert amounts == DEFAULT_PACKAGES, f"got {amounts}"
        for p in pkgs:
            expected_fee = round(p["amount"] * DEFAULT_FEE / 100.0, 2)
            assert p["fee"] == expected_fee, p
            assert p["credited"] == round(p["amount"] - expected_fee, 2), p


# ---------- /wallet/topup/checkout ----------
class TestTopupCheckout:
    def test_checkout_valid_creates_session_and_tx(self, session, user_headers):
        r = session.post(f"{API}/wallet/topup/checkout", headers=user_headers, json={
            "package_amount": 10, "origin_url": BASE_URL,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("url", "").startswith("http"), body
        sid = body.get("session_id")
        assert sid and isinstance(sid, str)
        # store for next tests
        pytest._topup_session_id = sid  # type: ignore[attr-defined]

        # Verify status endpoint shows initiated/unpaid (data persistence)
        rs = session.get(f"{API}/wallet/topup/status/{sid}", headers=user_headers)
        assert rs.status_code == 200, rs.text
        st = rs.json()
        assert st["status"] in ("initiated", "open"), st
        assert st["payment_status"] == "unpaid", st
        assert st["amount"] == 10.0
        assert st["fee"] == round(10.0 * DEFAULT_FEE / 100.0, 2)
        assert st["credited"] == round(10.0 - st["fee"], 2)

    def test_checkout_invalid_amount_decimal(self, session, user_headers):
        r = session.post(f"{API}/wallet/topup/checkout", headers=user_headers, json={
            "package_amount": 7.5, "origin_url": BASE_URL,
        })
        assert r.status_code == 400, r.text
        assert "Invalid package amount" in r.text

    def test_checkout_invalid_amount_high(self, session, user_headers):
        r = session.post(f"{API}/wallet/topup/checkout", headers=user_headers, json={
            "package_amount": 999, "origin_url": BASE_URL,
        })
        assert r.status_code == 400, r.text


# ---------- /wallet/topup/status idempotency + cross-user 404 ----------
class TestTopupStatus:
    def test_status_idempotent_two_calls(self, session, user_headers):
        sid = getattr(pytest, "_topup_session_id", None)
        assert sid, "previous test should have created a session"
        # First call - already done in earlier test. Call twice more and confirm stable.
        r1 = session.get(f"{API}/wallet/topup/status/{sid}", headers=user_headers)
        r2 = session.get(f"{API}/wallet/topup/status/{sid}", headers=user_headers)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json() == r2.json()
        assert r1.json()["payment_status"] == "unpaid"

        # Balance must NOT have changed (still 0 or whatever it was) — call wallet balance & confirm session unpaid
        rb = session.get(f"{API}/wallet/balance", headers=user_headers)
        assert rb.status_code == 200
        # Cannot assert specific value (admin may credit user in other tests) — but credited_amount must not be applied.
        # We at least confirm the response is stable.

    def test_status_other_user_404(self, admin_session, admin_headers):
        sid = getattr(pytest, "_topup_session_id", None)
        assert sid
        r = admin_session.get(f"{API}/wallet/topup/status/{sid}", headers=admin_headers)
        assert r.status_code == 404, r.text


# ---------- webhook ----------
class TestWebhook:
    def test_webhook_route_exists_and_400s_on_bogus_sig(self, session):
        r = session.post(
            f"{API}/webhook/stripe",
            headers={"Stripe-Signature": "bogus", "Content-Type": "application/json"},
            data="{}",
        )
        # Either 400 (bad signature) or some 4xx — must NOT be 401/403/404
        assert r.status_code not in (401, 403, 404), f"webhook route should be public, got {r.status_code}: {r.text}"
        assert 400 <= r.status_code < 500, r.text


# ---------- admin/settings + admin/topup-stats ----------
class TestAdminSettings:
    def test_get_settings_admin(self, admin_session, admin_headers):
        r = admin_session.get(f"{API}/admin/settings", headers=admin_headers)
        assert r.status_code == 200, r.text
        s = r.json()
        for k in ("deposit_fee_percent", "min_topup", "max_topup", "topup_packages"):
            assert k in s, s
        assert s.get("id") == "global"

    def test_get_settings_forbidden_non_admin(self, user_session, user_headers):
        r = user_session.get(f"{API}/admin/settings", headers=user_headers)
        assert r.status_code == 403, r.text

    def test_put_settings_forbidden_non_admin(self, user_session, user_headers):
        r = user_session.put(f"{API}/admin/settings", headers=user_headers, json={
            "deposit_fee_percent": 9.0,
        })
        assert r.status_code == 403, r.text

    def test_admin_topup_stats_forbidden_non_admin(self, user_session, user_headers):
        r = user_session.get(f"{API}/admin/topup-stats", headers=user_headers)
        assert r.status_code == 403, r.text

    def test_admin_topup_stats_admin(self, admin_session, admin_headers):
        r = admin_session.get(f"{API}/admin/topup-stats?days=30", headers=admin_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "summary" in body and "recent" in body
        assert isinstance(body["recent"], list)
        s = body["summary"]
        for k in ("count", "gross", "fees", "credited"):
            assert k in s, body

    def test_put_settings_updates_and_propagates(self, admin_session, user_session, admin_headers, user_headers):
        new_packages = [2.0, 5.0, 10.0, 20.0, 50.0]
        new_fee = 5.0
        r = admin_session.put(f"{API}/admin/settings", headers=admin_headers, json={
            "deposit_fee_percent": new_fee,
            "topup_packages": new_packages,
        })
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["deposit_fee_percent"] == new_fee
        assert updated["topup_packages"] == new_packages

        # /wallet/topup/packages must reflect new packages & fee
        rp = user_session.get(f"{API}/wallet/topup/packages", headers=user_headers)
        assert rp.status_code == 200
        body = rp.json()
        assert body["deposit_fee_percent"] == new_fee
        assert [p["amount"] for p in body["packages"]] == new_packages
        for p in body["packages"]:
            assert p["fee"] == round(p["amount"] * new_fee / 100.0, 2)

        # Old $25 package should now reject (not in allow-list)
        rc = user_session.post(f"{API}/wallet/topup/checkout", headers=user_headers, json={
            "package_amount": 25, "origin_url": BASE_URL,
        })
        assert rc.status_code == 400, rc.text

        # New $20 package should be valid
        rc2 = user_session.post(f"{API}/wallet/topup/checkout", headers=user_headers, json={
            "package_amount": 20, "origin_url": BASE_URL,
        })
        assert rc2.status_code == 200, rc2.text
        sid2 = rc2.json()["session_id"]
        # status reflects new fee math
        rs2 = user_session.get(f"{API}/wallet/topup/status/{sid2}", headers=user_headers)
        assert rs2.status_code == 200
        st2 = rs2.json()
        assert st2["amount"] == 20.0
        assert st2["fee"] == round(20.0 * new_fee / 100.0, 2)
        assert st2["credited"] == round(20.0 - st2["fee"], 2)

        # Restore defaults so subsequent tests aren't affected
        admin_session.put(f"{API}/admin/settings", headers=admin_headers, json={
            "deposit_fee_percent": DEFAULT_FEE,
            "topup_packages": DEFAULT_PACKAGES,
        })


# ---------- regression: wallet send + voice rate-quote + admin/calls + admin/rates ----------
class TestRegression:
    def test_wallet_send_works(self, admin_session, admin_headers):
        rb = admin_session.get(f"{API}/wallet/balance", headers=admin_headers)
        assert rb.status_code == 200
        bal = rb.json()["balance"]
        if bal < 1.0:
            me = admin_session.get(f"{API}/auth/me", headers=admin_headers).json()
            admin_session.post(f"{API}/admin/users/{me['id']}/credit",
                               headers=admin_headers, json={"amount": 5.0})
        r = admin_session.post(f"{API}/wallet/send", headers=admin_headers, json={
            "recipient_email": USER_EMAIL, "amount": 1.0, "note": "regression test",
        })
        assert r.status_code == 200, r.text

    def test_voice_rate_quote(self, user_session, user_headers):
        r = user_session.get(f"{API}/voice/rate-quote?to=%2B12025550100", headers=user_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "rate_per_minute" in body, body
        assert body["rate_per_minute"] >= 0

    def test_admin_calls_and_rates(self, admin_session, admin_headers):
        r = admin_session.get(f"{API}/admin/calls?limit=5", headers=admin_headers)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)
        r2 = admin_session.get(f"{API}/admin/rates", headers=admin_headers)
        assert r2.status_code == 200, r2.text
        assert isinstance(r2.json(), list)
