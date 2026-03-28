"""
API Access Control Tests — kompletné pokrytie všetkých endpointov

Overuje, že:
- Verejné endpointy sú prístupné bez autentifikácie
- Chránené endpointy vrátia 401 bez autentifikácie
- Admin endpointy vrátia 401 bez autentifikácie a 403 pre bežného používateľa
- Admin endpointy sú prístupné pre admina
- CSRF ochrana blokuje nebezpečné metódy bez tokenu

Poznámka: Pre endpointy s path parametrami (napr. {id}) sa používajú fiktívne ID.
Auth kontrola prebieha pred prístupom do DB, takže 401/403 dostaneme aj s neplatným ID.

Spustenie: docker compose exec wf-api pytest tests/test_api_access_control.py -v
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.main import app
from app.database import engine
from app.domain.entities.user import User
from app.domain.entities.refresh_token import RefreshToken
from app.domain.entities.email_verification_token import EmailVerificationToken
from app.domain.entities.password_reset_token import PasswordResetToken
from app.domain.entities.login_history import LoginHistory
from app.core.security import hash_password

# ── Testovacie prihlasovacie údaje ──────────────────────────────────────────

_SUFFIX = uuid.uuid4().hex[:8]
REGULAR_USERNAME = f"testuser_{_SUFFIX}"
REGULAR_EMAIL    = f"testuser_{_SUFFIX}@example.com"
REGULAR_PASSWORD = "TestPass123"

ADMIN_USERNAME = f"testadmin_{_SUFFIX}"
ADMIN_EMAIL    = f"testadmin_{_SUFFIX}@example.com"
ADMIN_PASSWORD = "AdminPass123"

FAKE_ID   = 99999999
FAKE_UUID = "00000000-0000-0000-0000-000000000000"

# COOKIE_SECURE=True vyžaduje https:// base_url
HTTPS_BASE = "https://testserver"
ORIGIN     = "http://localhost:5173"


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def create_test_users():
    with Session(engine) as session:
        session.add(User(
            username=REGULAR_USERNAME, email=REGULAR_EMAIL,
            first_name="Test", last_name="User",
            password_hash=hash_password(REGULAR_PASSWORD),
            role="user", is_active=True, is_verified=True,
        ))
        session.add(User(
            username=ADMIN_USERNAME, email=ADMIN_EMAIL,
            first_name="Test", last_name="Admin",
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin", is_active=True, is_verified=True,
        ))
        session.commit()
    yield
    with Session(engine) as session:
        for uname in [REGULAR_USERNAME, ADMIN_USERNAME]:
            u = session.exec(select(User).where(User.username == uname)).first()
            if u:
                for model in (RefreshToken, EmailVerificationToken, PasswordResetToken, LoginHistory):
                    rows = session.exec(select(model).where(model.user_id == u.id)).all()
                    for row in rows:
                        session.delete(row)
                session.flush()
                session.delete(u)
        session.commit()


# ── Pomocné funkcie ───────────────────────────────────────────────────────────

def make_client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False, base_url=HTTPS_BASE)


def make_authenticated_client(username: str, password: str) -> tuple[TestClient, str]:
    client = make_client()
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
        headers={"Origin": ORIGIN},
    )
    assert resp.status_code == 200, f"Login zlyhal pre {username}: {resp.text}"
    return client, resp.json()["csrf_token"]


def do_logout(client: TestClient, csrf: str) -> None:
    client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf, "Origin": ORIGIN})
    client.close()


# ════════════════════════════════════════════════════════════════════════════
# 1. JEDINÝ SKUTOČNE VEREJNÝ ENDPOINT — /version
# ════════════════════════════════════════════════════════════════════════════

def test_version_endpoint_is_public():
    """/version je prístupný bez autentifikácie."""
    with make_client() as c:
        resp = c.get("/version")
    assert resp.status_code == 200, f"/version → {resp.status_code} (mal by byť 200)"
    assert "version" in resp.json()


# ════════════════════════════════════════════════════════════════════════════
# 2. CHRÁNENÉ ENDPOINTY — vyžadujú autentifikáciu (401 bez tokenu)
# ════════════════════════════════════════════════════════════════════════════

PROTECTED_PUBLIC_GET_ENDPOINTS = [
    # events
    "/api/v1/events",
    f"/api/v1/events/{FAKE_ID}",
    f"/api/v1/events/{FAKE_ID}/statistics",
    f"/api/v1/events/{FAKE_ID}/categories",
    # athletes
    "/api/v1/athletes",
    f"/api/v1/athletes/{FAKE_ID}",
    # teams
    "/api/v1/teams",
    f"/api/v1/teams/{FAKE_ID}",
    # persons
    "/api/v1/persons",
    f"/api/v1/persons/{FAKE_ID}",
    f"/api/v1/persons/{FAKE_ID}/fights",
    "/api/v1/persons/compare",
    # rankings
    "/api/v1/rankings/categories",
    "/api/v1/rankings",
    # results
    f"/api/v1/results/{FAKE_UUID}",
]


@pytest.mark.parametrize("url", PROTECTED_PUBLIC_GET_ENDPOINTS)
def test_public_endpoint_requires_auth(url):
    """Endpointy musia vrátiť 401 bez autentifikácie."""
    with make_client() as c:
        resp = c.get(url)
    assert resp.status_code == 401, (
        f"{url} → {resp.status_code} (mal by byť 401 — vyžaduje prihlásenie)"
    )


@pytest.mark.parametrize("url", PROTECTED_PUBLIC_GET_ENDPOINTS)
def test_public_endpoint_accessible_after_login(url):
    """Endpointy musia byť prístupné po prihlásení."""
    client, csrf = make_authenticated_client(REGULAR_USERNAME, REGULAR_PASSWORD)
    try:
        resp = client.get(url)
        assert resp.status_code not in (401, 403), (
            f"{url} → {resp.status_code} po prihlásení (nemal by byť 401/403)"
        )
    finally:
        do_logout(client, csrf)


# ════════════════════════════════════════════════════════════════════════════
# 2. AUTH ENDPOINTY — verejné (registrácia, reset hesla, verifikácia)
# ════════════════════════════════════════════════════════════════════════════

def test_auth_register_is_public():
    """POST /auth/register je verejný — nevyžaduje autentifikáciu."""
    with make_client() as c:
        # Neplatné dáta → 422, ale nie 401/403
        resp = c.post("/api/v1/auth/register", json={})
    assert resp.status_code not in (401, 403)


def test_auth_login_is_public():
    """POST /auth/login je verejný — endpoint spracuje požiadavku (401 = zlé heslo, nie auth gate)."""
    with make_client() as c:
        resp = c.post("/api/v1/auth/login", json={"username": "x", "password": "y"})
    # 401 je tu očakávaný (nesprávne heslo), nie 403 (zakázaný prístup)
    assert resp.status_code != 403


def test_auth_forgot_password_is_public():
    """POST /auth/forgot-password je verejný."""
    with make_client() as c:
        resp = c.post("/api/v1/auth/forgot-password", json={"email": "x@x.com"})
    assert resp.status_code not in (401, 403)


def test_auth_resend_verification_is_public():
    """POST /auth/resend-verification je verejný."""
    with make_client() as c:
        resp = c.post("/api/v1/auth/resend-verification", json={"email": "x@x.com"})
    assert resp.status_code not in (401, 403)


def test_auth_verify_email_is_public():
    """GET /auth/verify-email/{token} je verejný."""
    with make_client() as c:
        resp = c.get("/api/v1/auth/verify-email/fake-token-xyz")
    assert resp.status_code not in (401, 403)


def test_auth_reset_password_is_public():
    """GET /auth/reset-password/{token} je verejný."""
    with make_client() as c:
        resp = c.get("/api/v1/auth/reset-password/fake-token-xyz")
    assert resp.status_code not in (401, 403)


def test_auth_me_requires_auth():
    """GET /auth/me vyžaduje autentifikáciu."""
    with make_client() as c:
        resp = c.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_auth_google_is_public():
    """POST /auth/google je verejný (overenie prebieha cez Google token, nie session cookie)."""
    with make_client() as c:
        # Neplatný Google token → 401 (invalid token), nie 403 (zakázaný prístup)
        resp = c.post("/api/v1/auth/google", json={"credential": "fake"})
    assert resp.status_code != 403


# ════════════════════════════════════════════════════════════════════════════
# 3. PROFILE ENDPOINTY — vyžadujú autentifikáciu (401 bez tokenu)
# ════════════════════════════════════════════════════════════════════════════

PROFILE_ENDPOINTS_401 = [
    # GET endpointy
    ("GET",    "/api/v1/profile/me"),
    ("GET",    "/api/v1/profile/sessions"),
    ("GET",    "/api/v1/profile/login-history"),
    # Unsafe metódy — bez auth dostaneme 401 (auth check pred CSRF)
    ("PUT",    "/api/v1/profile/me"),
    ("POST",   "/api/v1/profile/change-password"),
    ("POST",   "/api/v1/profile/sessions/revoke-all"),
    ("DELETE", f"/api/v1/profile/sessions/{FAKE_ID}"),
    ("DELETE", "/api/v1/profile/avatar"),
]


@pytest.mark.parametrize("method,url", PROFILE_ENDPOINTS_401)
def test_profile_endpoint_requires_auth(method, url):
    """Všetky profile endpointy musia odmietnuť požiadavku bez autentifikácie."""
    with make_client() as c:
        resp = c.request(method, url)
    assert resp.status_code in (401, 403), (
        f"{method} {url} → {resp.status_code} (mal by byť 401 alebo 403 bez auth)"
    )


# ════════════════════════════════════════════════════════════════════════════
# 4. ADMIN ENDPOINTY — 401 bez auth, 403 pre bežného používateľa
# ════════════════════════════════════════════════════════════════════════════

ADMIN_ENDPOINTS = [
    # users
    ("GET",   "/api/v1/admin/users"),
    ("GET",   f"/api/v1/admin/users/{FAKE_ID}"),
    ("PATCH", f"/api/v1/admin/users/{FAKE_ID}/role"),
    ("PATCH", f"/api/v1/admin/users/{FAKE_ID}/status"),
    # arena-sources
    ("GET",    "/api/v1/admin/arena-sources"),
    ("POST",   "/api/v1/admin/arena-sources"),
    ("GET",    f"/api/v1/admin/arena-sources/{FAKE_ID}"),
    ("PUT",    f"/api/v1/admin/arena-sources/{FAKE_ID}"),
    ("DELETE", f"/api/v1/admin/arena-sources/{FAKE_ID}"),
    ("POST",   f"/api/v1/admin/arena-sources/{FAKE_ID}/test"),
    ("POST",   f"/api/v1/admin/arena-sources/{FAKE_ID}/toggle"),
    # sync
    ("POST", "/api/v1/admin/sync/events"),
    ("POST", f"/api/v1/admin/sync/athletes/{FAKE_ID}"),
    ("POST", f"/api/v1/admin/sync/categories/{FAKE_ID}"),
    ("POST", f"/api/v1/admin/sync/teams/{FAKE_ID}"),
    ("POST", f"/api/v1/admin/sync/fights/{FAKE_ID}"),
    ("POST", f"/api/v1/admin/sync/victory-types/{FAKE_ID}"),
    ("POST", f"/api/v1/admin/sync/full/{FAKE_ID}"),
    # persons merge
    ("POST", "/api/v1/admin/persons/merge"),
    # sync-logs
    ("GET", "/api/v1/admin/sync-logs"),
    ("GET", f"/api/v1/admin/sync-logs/{FAKE_ID}"),
]


@pytest.mark.parametrize("method,url", ADMIN_ENDPOINTS)
def test_admin_endpoint_requires_auth(method, url):
    """Všetky admin endpointy musia odmietnuť požiadavku bez autentifikácie."""
    with make_client() as c:
        resp = c.request(method, url)
    assert resp.status_code in (401, 403), (
        f"{method} {url} → {resp.status_code} (mal by byť 401 alebo 403 bez auth)"
    )


@pytest.mark.parametrize("method,url", ADMIN_ENDPOINTS)
def test_admin_endpoint_forbidden_for_regular_user(method, url):
    """Všetky admin endpointy musia odmietnuť bežného (non-admin) používateľa."""
    client, csrf = make_authenticated_client(REGULAR_USERNAME, REGULAR_PASSWORD)
    try:
        resp = client.request(
            method, url,
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        assert resp.status_code == 403, (
            f"{method} {url} → {resp.status_code} pre bežného používateľa (mal by byť 403)"
        )
    finally:
        do_logout(client, csrf)


@pytest.mark.parametrize("method,url", [
    # Len GET endpointy — POST/PATCH/DELETE vyžadujú CSRF aj platné dáta
    ("GET", "/api/v1/admin/users"),
    ("GET", f"/api/v1/admin/users/{FAKE_ID}"),
    ("GET", "/api/v1/admin/arena-sources"),
    ("GET", f"/api/v1/admin/arena-sources/{FAKE_ID}"),
    ("GET", "/api/v1/admin/sync-logs"),
    ("GET", f"/api/v1/admin/sync-logs/{FAKE_ID}"),
])
def test_admin_get_accessible_for_admin(method, url):
    """Admin GET endpointy musia byť prístupné pre admina."""
    client, csrf = make_authenticated_client(ADMIN_USERNAME, ADMIN_PASSWORD)
    try:
        resp = client.request(method, url)
        assert resp.status_code not in (401, 403), (
            f"{method} {url} → {resp.status_code} pre admina (nemal by byť 401/403)"
        )
    finally:
        do_logout(client, csrf)


# ════════════════════════════════════════════════════════════════════════════
# 5. CSRF OCHRANA
# ════════════════════════════════════════════════════════════════════════════

def test_profile_put_blocked_without_csrf():
    """PUT /profile/me bez X-CSRF-Token musí vrátiť 403."""
    client, csrf = make_authenticated_client(REGULAR_USERNAME, REGULAR_PASSWORD)
    try:
        resp = client.put(
            "/api/v1/profile/me",
            json={"first_name": "X", "last_name": "Y", "email": REGULAR_EMAIL},
            headers={"Origin": ORIGIN},
        )
        assert resp.status_code == 403
    finally:
        do_logout(client, csrf)


def test_profile_put_allowed_with_csrf():
    """PUT /profile/me s X-CSRF-Token musí vrátiť 200."""
    client, csrf = make_authenticated_client(REGULAR_USERNAME, REGULAR_PASSWORD)
    try:
        resp = client.put(
            "/api/v1/profile/me",
            json={"first_name": "Test", "last_name": "User", "email": REGULAR_EMAIL},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        assert resp.status_code == 200
    finally:
        do_logout(client, csrf)


def test_admin_post_blocked_without_csrf():
    """POST /admin/sync/events bez X-CSRF-Token musí vrátiť 403 (aj pre admina)."""
    client, csrf = make_authenticated_client(ADMIN_USERNAME, ADMIN_PASSWORD)
    try:
        resp = client.post(
            "/api/v1/admin/sync/events",
            headers={"Origin": ORIGIN},
        )
        assert resp.status_code == 403
    finally:
        do_logout(client, csrf)


# ════════════════════════════════════════════════════════════════════════════
# 6. AUTH FLOW
# ════════════════════════════════════════════════════════════════════════════

def test_login_wrong_password_returns_401():
    with make_client() as c:
        resp = c.post("/api/v1/auth/login", json={"username": REGULAR_USERNAME, "password": "zle"})
    assert resp.status_code == 401


def test_login_nonexistent_user_returns_401():
    with make_client() as c:
        resp = c.post("/api/v1/auth/login", json={"username": "no_such_user_xyz", "password": "x"})
    assert resp.status_code == 401


def test_login_returns_csrf_token():
    with make_client() as c:
        resp = c.post("/api/v1/auth/login", json={"username": REGULAR_USERNAME, "password": REGULAR_PASSWORD})
    assert resp.status_code == 200
    assert "csrf_token" in resp.json()


def test_profile_accessible_after_login():
    client, csrf = make_authenticated_client(REGULAR_USERNAME, REGULAR_PASSWORD)
    try:
        assert client.get("/api/v1/profile/me").status_code == 200
    finally:
        do_logout(client, csrf)


def test_profile_inaccessible_after_logout():
    client, csrf = make_authenticated_client(REGULAR_USERNAME, REGULAR_PASSWORD)
    # Odhlásenie — cookies sa vymažú, ale klienta ešte nezatvárame
    client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf, "Origin": ORIGIN})
    resp = client.get("/api/v1/profile/me")
    client.close()
    assert resp.status_code == 401
