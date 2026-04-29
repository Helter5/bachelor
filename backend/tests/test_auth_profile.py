"""
Auth Flow + Profile Functionality + Input Validation Tests

Pokrýva:
1. Auth flow — registrácia, prihlásenie, email verifikácia, password reset
2. Profile funkčnosť — GET/PUT profil, zmena hesla, sessions, login history
3. Input validácia — 422 pre neplatné vstupné dáta

Spustenie: docker compose exec wf-api pytest tests/test_auth_profile.py -v
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
from app.core.security import (
    hash_password,
    create_email_verification_token,
    create_password_reset_token,
)

# ── Konštanty ─────────────────────────────────────────────────────────────────

HTTPS_BASE = "https://testserver"
ORIGIN     = "http://localhost:5173"


# ── Pomocné funkcie ───────────────────────────────────────────────────────────

def uid() -> str:
    return uuid.uuid4().hex[:8]


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


def create_user(
    username: str,
    email: str,
    password: str,
    *,
    is_verified: bool = True,
    is_active: bool = True,
    role: str = "user",
) -> int:
    """Vytvorí používateľa v DB a vráti jeho ID."""
    with Session(engine) as session:
        user = User(
            username=username,
            email=email,
            first_name="Test",
            last_name="User",
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
            is_verified=is_verified,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user.id


def delete_user(username: str) -> None:
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if user:
            for model in (RefreshToken, EmailVerificationToken, PasswordResetToken, LoginHistory):
                rows = session.exec(select(model).where(model.user_id == user.id)).all()
                for row in rows:
                    session.delete(row)
            session.flush()
            session.delete(user)
        session.commit()


# ════════════════════════════════════════════════════════════════════════════
# 1. REGISTRÁCIA
# ════════════════════════════════════════════════════════════════════════════

class TestRegistration:

    def test_register_success_returns_201(self):
        """Úspešná registrácia vráti 201 s údajmi používateľa."""
        u = uid()
        username = f"user_{u}"
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={
                "username": username,
                "email": f"{username}@example.com",
                "password": "ValidPass1",
                "first_name": "Test",
                "last_name": "User",
            })
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == username
        assert data["email"] == f"{username}@example.com"
        delete_user(username)

    def test_register_does_not_expose_password(self):
        """Odpoveď neobsahuje heslo ani jeho hash."""
        u = uid()
        username = f"safe_{u}"
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={
                "username": username,
                "email": f"{username}@example.com",
                "password": "ValidPass1",
                "first_name": "Test",
                "last_name": "User",
            })
        assert resp.status_code == 201
        data = resp.json()
        assert "password" not in data
        assert "password_hash" not in data
        delete_user(username)

    def test_register_duplicate_username_returns_400(self):
        """Registrácia s existujúcim username vráti 400."""
        u = uid()
        username = f"dup_{u}"
        with make_client() as c:
            c.post("/api/v1/auth/register", json={
                "username": username,
                "email": f"first_{u}@example.com",
                "password": "ValidPass1",
                "first_name": "A",
                "last_name": "B",
            })
            resp = c.post("/api/v1/auth/register", json={
                "username": username,
                "email": f"second_{u}@example.com",
                "password": "ValidPass1",
                "first_name": "A",
                "last_name": "B",
            })
        assert resp.status_code == 400
        delete_user(username)

    def test_register_duplicate_email_returns_400(self):
        """Registrácia s existujúcim emailom vráti 400."""
        u = uid()
        username_first = f"first_{u}"
        email = f"dup_{u}@example.com"
        with make_client() as c:
            c.post("/api/v1/auth/register", json={
                "username": username_first,
                "email": email,
                "password": "ValidPass1",
                "first_name": "A",
                "last_name": "B",
            })
            resp = c.post("/api/v1/auth/register", json={
                "username": f"second_{u}",
                "email": email,
                "password": "ValidPass1",
                "first_name": "A",
                "last_name": "B",
            })
        assert resp.status_code == 400
        delete_user(username_first)

    def test_register_new_user_is_not_verified(self):
        """Nový používateľ má is_verified=False (čaká na overenie emailu)."""
        u = uid()
        username = f"newreg_{u}"
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={
                "username": username,
                "email": f"{username}@example.com",
                "password": "ValidPass1",
                "first_name": "A",
                "last_name": "B",
            })
        assert resp.status_code == 201
        with Session(engine) as session:
            user = session.exec(select(User).where(User.username == username)).first()
            assert user is not None
            assert user.is_verified is False
        delete_user(username)


# ════════════════════════════════════════════════════════════════════════════
# 2. PRIHLÁSENIE
# ════════════════════════════════════════════════════════════════════════════

_LOGIN_SUFFIX   = uid()
LOGIN_USERNAME  = f"logintest_{_LOGIN_SUFFIX}"
LOGIN_EMAIL     = f"logintest_{_LOGIN_SUFFIX}@example.com"
LOGIN_PASSWORD  = "LoginPass123"

UNVERIF_SUFFIX   = uid()
UNVERIF_USERNAME = f"unverif_{UNVERIF_SUFFIX}"
UNVERIF_EMAIL    = f"unverif_{UNVERIF_SUFFIX}@example.com"
UNVERIF_PASSWORD = "UnverifPass123"

INACTIVE_SUFFIX   = uid()
INACTIVE_USERNAME = f"inactive_{INACTIVE_SUFFIX}"
INACTIVE_EMAIL    = f"inactive_{INACTIVE_SUFFIX}@example.com"
INACTIVE_PASSWORD = "InactivePass123"


@pytest.fixture(scope="module", autouse=True)
def login_test_users():
    create_user(LOGIN_USERNAME, LOGIN_EMAIL, LOGIN_PASSWORD, is_verified=True)
    create_user(UNVERIF_USERNAME, UNVERIF_EMAIL, UNVERIF_PASSWORD, is_verified=False)
    create_user(INACTIVE_USERNAME, INACTIVE_EMAIL, INACTIVE_PASSWORD, is_active=False, is_verified=True)
    yield
    for uname in [LOGIN_USERNAME, UNVERIF_USERNAME, INACTIVE_USERNAME]:
        delete_user(uname)


class TestLogin:

    def test_login_success_returns_csrf_token(self):
        """Úspešné prihlásenie vráti 200 a csrf_token."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": LOGIN_USERNAME, "password": LOGIN_PASSWORD,
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 200
        assert "csrf_token" in resp.json()

    def test_login_sets_access_token_cookie(self):
        """Prihlásenie nastaví HttpOnly access_token cookie."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": LOGIN_USERNAME, "password": LOGIN_PASSWORD,
            }, headers={"Origin": ORIGIN})
            assert resp.status_code == 200
            assert "access_token" in c.cookies

    def test_login_by_email(self):
        """Prihlásenie pomocou emailu namiesto username funguje."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": LOGIN_EMAIL, "password": LOGIN_PASSWORD,
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 200

    def test_login_wrong_password_returns_401(self):
        """Prihlásenie so zlým heslom vráti 401."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": LOGIN_USERNAME, "password": "WrongPass999",
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 401

    def test_login_nonexistent_user_returns_401(self):
        """Prihlásenie neexistujúceho používateľa vráti 401."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": "ghost_user_xyz", "password": "SomePass123",
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 401

    def test_login_unverified_returns_403(self):
        """Prihlásenie neverifikovaného používateľa vráti 403."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": UNVERIF_USERNAME, "password": UNVERIF_PASSWORD,
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 403
        assert "verify" in resp.json()["detail"].lower()

    def test_login_inactive_returns_403(self):
        """Prihlásenie neaktívneho používateľa vráti 403."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": INACTIVE_USERNAME, "password": INACTIVE_PASSWORD,
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 403


# ════════════════════════════════════════════════════════════════════════════
# 3. EMAIL VERIFIKÁCIA
# ════════════════════════════════════════════════════════════════════════════

_EV_SUFFIX      = uid()
EV_USERNAME     = f"toverif_{_EV_SUFFIX}"
EV_EMAIL        = f"toverif_{_EV_SUFFIX}@example.com"
EV_PASSWORD     = "VerifPass123"
EV_USER_ID: int = 0


@pytest.fixture(scope="module", autouse=True)
def email_verif_user():
    global EV_USER_ID
    EV_USER_ID = create_user(EV_USERNAME, EV_EMAIL, EV_PASSWORD, is_verified=False)
    yield
    delete_user(EV_USERNAME)


class TestEmailVerification:

    def test_verify_invalid_token_returns_400(self):
        """Neplatný verifikačný token vráti 400."""
        with make_client() as c:
            resp = c.get("/api/v1/auth/verify-email/invalid-token-xyz-123")
        assert resp.status_code == 400

    def test_login_before_verification_fails(self):
        """Prihlásenie pred verifikáciou vráti 403."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": EV_USERNAME, "password": EV_PASSWORD,
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 403

    def test_verify_valid_token_returns_200(self):
        """Platný verifikačný token úspešne overí email a vráti 200."""
        with Session(engine) as session:
            plain_token, _, _ = create_email_verification_token(EV_USER_ID, session)
        with make_client() as c:
            resp = c.get(f"/api/v1/auth/verify-email/{plain_token}")
        assert resp.status_code == 200
        assert "verified" in resp.json()["message"].lower()

    def test_is_verified_set_to_true_in_db(self):
        """Verifikačný endpoint nastaví is_verified=True priamo v databáze."""
        # Dedikovaný izolovaný používateľ — nezávisí na stave predošlých testov
        u = uid()
        username = f"dbcheck_{u}"
        user_id = create_user(username, f"{username}@example.com", "CheckPass123", is_verified=False)

        # Overíme, že is_verified je False pred verifikáciou
        with Session(engine) as session:
            user = session.get(User, user_id)
            assert user.is_verified is False

        # Zavoláme verifikačný endpoint
        with Session(engine) as session:
            plain_token, _, _ = create_email_verification_token(user_id, session)
        with make_client() as c:
            resp = c.get(f"/api/v1/auth/verify-email/{plain_token}")
        assert resp.status_code == 200

        # Overíme, že is_verified je True po verifikácii — priamo v DB
        with Session(engine) as session:
            user = session.get(User, user_id)
            assert user is not None
            assert user.is_verified is True

        delete_user(username)

    def test_login_after_verification_succeeds(self):
        """Po verifikácii je možné sa prihlásiť."""
        # Ensure verified (previous test may have done it)
        with Session(engine) as session:
            user = session.get(User, EV_USER_ID)
            if not user.is_verified:
                user.is_verified = True
                session.add(user)
                session.commit()
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": EV_USERNAME, "password": EV_PASSWORD,
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 200

    def test_verify_same_token_twice_returns_200(self):
        """Verifikácia už overeného emailu vráti 200 (idempotentné)."""
        with Session(engine) as session:
            plain_token, _, _ = create_email_verification_token(EV_USER_ID, session)
        with Session(engine) as session:
            user = session.get(User, EV_USER_ID)
            user.is_verified = True
            session.add(user)
            session.commit()
        with make_client() as c:
            resp = c.get(f"/api/v1/auth/verify-email/{plain_token}")
        assert resp.status_code == 200


# ════════════════════════════════════════════════════════════════════════════
# 4. PASSWORD RESET
# ════════════════════════════════════════════════════════════════════════════

_PR_SUFFIX      = uid()
PR_USERNAME     = f"resetuser_{_PR_SUFFIX}"
PR_EMAIL        = f"resetuser_{_PR_SUFFIX}@example.com"
PR_PASSWORD     = "OriginalPass123"
PR_USER_ID: int = 0


@pytest.fixture(scope="module", autouse=True)
def password_reset_user():
    global PR_USER_ID
    PR_USER_ID = create_user(PR_USERNAME, PR_EMAIL, PR_PASSWORD, is_verified=True)
    yield
    delete_user(PR_USERNAME)


class TestPasswordReset:

    def test_forgot_password_nonexistent_email_returns_200(self):
        """forgot-password pre neexistujúci email vráti 200 (neodhaliť existenciu účtu)."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/forgot-password", json={
                "email": "nobody@example.com"
            })
        assert resp.status_code == 200

    def test_reset_invalid_token_returns_400(self):
        """Neplatný reset token vráti 400."""
        with make_client() as c:
            resp = c.get("/api/v1/auth/reset-password/invalid-token-xyz-123")
        assert resp.status_code == 400

    def test_reset_valid_token_returns_200(self):
        """Platný reset token zmení heslo a vráti 200."""
        with Session(engine) as session:
            plain_token, _, _ = create_password_reset_token(PR_USER_ID, session)
        with make_client() as c:
            resp = c.get(f"/api/v1/auth/reset-password/{plain_token}")
        assert resp.status_code == 200
        assert "reset" in resp.json()["message"].lower()

    def test_old_password_fails_after_reset(self):
        """Po resete hesla staré heslo nefunguje (login vráti 401)."""
        # Reset password
        with Session(engine) as session:
            plain_token, _, _ = create_password_reset_token(PR_USER_ID, session)
        with make_client() as c:
            c.get(f"/api/v1/auth/reset-password/{plain_token}")
        # Try login with old password
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": PR_USERNAME, "password": PR_PASSWORD,
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 401


# ════════════════════════════════════════════════════════════════════════════
# 5. PROFILE FUNKČNOSŤ
# ════════════════════════════════════════════════════════════════════════════

_PROF_SUFFIX  = uid()
PROF_USERNAME = f"profuser_{_PROF_SUFFIX}"
PROF_EMAIL    = f"profuser_{_PROF_SUFFIX}@example.com"
PROF_PASSWORD = "ProfilePass123"


@pytest.fixture(scope="module", autouse=True)
def profile_user():
    create_user(PROF_USERNAME, PROF_EMAIL, PROF_PASSWORD, is_verified=True)
    yield
    delete_user(PROF_USERNAME)


class TestProfileGet:

    def test_get_profile_returns_correct_username(self):
        """GET /profile/me vráti správne meno používateľa."""
        client, _ = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.get("/api/v1/profile/me")
        client.close()
        assert resp.status_code == 200
        assert resp.json()["username"] == PROF_USERNAME

    def test_get_profile_does_not_expose_password(self):
        """GET /profile/me neobsahuje heslo ani hash."""
        client, _ = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.get("/api/v1/profile/me")
        client.close()
        assert resp.status_code == 200
        data = resp.json()
        assert "password" not in data
        assert "password_hash" not in data

    def test_get_sessions_returns_list(self):
        """GET /profile/sessions vráti zoznam aktívnych sessions."""
        client, _ = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.get("/api/v1/profile/sessions")
        client.close()
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_login_history_returns_list(self):
        """GET /profile/login-history vráti zoznam záznamov."""
        client, csrf = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.get("/api/v1/profile/login-history")
        client.close()
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_login_history_contains_login_method(self):
        """Záznamy login-history obsahujú pole login_method."""
        client, _ = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.get("/api/v1/profile/login-history")
        client.close()
        assert resp.status_code == 200
        history = resp.json()
        if history:
            assert "login_method" in history[0]
            assert history[0]["login_method"] in ("local", "google", None)


class TestProfileUpdate:

    def test_update_first_and_last_name(self):
        """PUT /profile/me aktualizuje meno a priezvisko."""
        client, csrf = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.put(
            "/api/v1/profile/me",
            json={"first_name": "Nové", "last_name": "Meno"},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Nové"
        assert data["last_name"] == "Meno"

    def test_update_email_to_unique_succeeds(self):
        """PUT /profile/me s novým unikátnym emailom uspeje."""
        u = uid()
        new_email = f"unique_{u}@example.com"
        client, csrf = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.put(
            "/api/v1/profile/me",
            json={"email": new_email},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        # Restore original email
        client.put(
            "/api/v1/profile/me",
            json={"email": PROF_EMAIL},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        assert resp.status_code == 200
        assert resp.json()["email"] == new_email

    def test_update_email_duplicate_returns_400(self):
        """PUT /profile/me s emailom iného používateľa vráti 400."""
        u = uid()
        other_username = f"other_{u}"
        other_email    = f"other_{u}@example.com"
        create_user(other_username, other_email, "OtherPass123")

        client, csrf = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.put(
            "/api/v1/profile/me",
            json={"email": other_email},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        delete_user(other_username)

        assert resp.status_code == 400

    def test_update_without_csrf_returns_403(self):
        """PUT /profile/me bez CSRF tokenu vráti 403."""
        client, _ = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.put(
            "/api/v1/profile/me",
            json={"first_name": "Test"},
            headers={"Origin": ORIGIN},
        )
        client.close()
        assert resp.status_code == 403


class TestChangePassword:

    def test_wrong_current_password_returns_400(self):
        """Zmena hesla so zlým aktuálnym heslom vráti 400."""
        client, csrf = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.post(
            "/api/v1/profile/change-password",
            json={"current_password": "WrongPass999", "new_password": "NewPass123"},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        assert resp.status_code == 400

    def test_change_password_success(self):
        """Zmena hesla so správnym aktuálnym heslom uspeje a vráti 200."""
        u = uid()
        uname = f"chpass_{u}"
        pwd   = "TempPass123"
        new_pwd = "NewTempPass456"
        create_user(uname, f"{uname}@example.com", pwd)

        client, csrf = make_authenticated_client(uname, pwd)
        resp = client.post(
            "/api/v1/profile/change-password",
            json={"current_password": pwd, "new_password": new_pwd},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        delete_user(uname)

        assert resp.status_code == 200

    def test_change_password_revokes_sessions(self):
        """Po zmene hesla sú ostatné sessions odvolané."""
        u = uid()
        uname = f"revoke_{u}"
        pwd   = "RevokePass123"
        new_pwd = "RevokeNew456"
        create_user(uname, f"{uname}@example.com", pwd)

        client, csrf = make_authenticated_client(uname, pwd)
        other_client, _ = make_authenticated_client(uname, pwd)
        client.post(
            "/api/v1/profile/change-password",
            json={"current_password": pwd, "new_password": new_pwd},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        current_resp = client.get("/api/v1/profile/me")
        other_resp = other_client.get("/api/v1/profile/me")
        client.close()
        other_client.close()
        delete_user(uname)

        assert current_resp.status_code == 200
        assert other_resp.status_code == 401


class TestSessions:

    def test_revoke_all_sessions_returns_200(self):
        """POST /profile/sessions/revoke-all odhlási ostatné relácie."""
        u = uid()
        uname = f"sessions_{u}"
        pwd = "SessionsPass123"
        create_user(uname, f"{uname}@example.com", pwd)

        client, csrf = make_authenticated_client(uname, pwd)
        other_client, _ = make_authenticated_client(uname, pwd)
        resp = client.post(
            "/api/v1/profile/sessions/revoke-all",
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        current_resp = client.get("/api/v1/profile/me")
        other_resp = other_client.get("/api/v1/profile/me")
        client.close()
        other_client.close()
        delete_user(uname)

        assert resp.status_code == 200
        assert "revoked" in resp.json()["message"].lower()
        assert current_resp.status_code == 200
        assert other_resp.status_code == 401

    def test_active_sessions_marks_current_session(self):
        """GET /profile/sessions označí aktuálnu reláciu podľa refresh cookie."""
        u = uid()
        uname = f"current_session_{u}"
        pwd = "CurrentPass123"
        create_user(uname, f"{uname}@example.com", pwd)

        client, _ = make_authenticated_client(uname, pwd)
        resp = client.get("/api/v1/profile/sessions")
        client.close()
        delete_user(uname)

        assert resp.status_code == 200
        assert sum(1 for item in resp.json() if item["is_current"]) == 1

    def test_revoke_nonexistent_session_returns_404(self):
        """DELETE /profile/sessions/99999999 pre neexistujúcu session vráti 404."""
        client, csrf = make_authenticated_client(PROF_USERNAME, PROF_PASSWORD)
        resp = client.delete(
            "/api/v1/profile/sessions/99999999",
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        assert resp.status_code == 404


# ════════════════════════════════════════════════════════════════════════════
# 6. INPUT VALIDÁCIA (422)
# ════════════════════════════════════════════════════════════════════════════

_VAL_SUFFIX  = uid()
VAL_USERNAME = f"valuser_{_VAL_SUFFIX}"
VAL_EMAIL    = f"valuser_{_VAL_SUFFIX}@example.com"
VAL_PASSWORD = "ValidPass123"


@pytest.fixture(scope="module", autouse=True)
def validation_user():
    create_user(VAL_USERNAME, VAL_EMAIL, VAL_PASSWORD)
    yield
    delete_user(VAL_USERNAME)


class TestRegistrationValidation:
    """Pydantic validácia pri registrácii → 422."""

    def test_empty_username_422(self):
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={
                "username": "", "email": "x@x.com", "password": "ValidPass1",
                "first_name": "A", "last_name": "B",
            })
        assert resp.status_code == 422

    def test_short_username_422(self):
        """Username kratší ako 4 znaky → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={
                "username": "ab", "email": "x@x.com", "password": "ValidPass1",
                "first_name": "A", "last_name": "B",
            })
        assert resp.status_code == 422

    def test_short_password_422(self):
        """Heslo kratšie ako 6 znakov → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={
                "username": "validuser", "email": "x@x.com", "password": "abc",
                "first_name": "A", "last_name": "B",
            })
        assert resp.status_code == 422

    def test_invalid_email_format_422(self):
        """Neplatný formát emailu → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={
                "username": "validuser", "email": "not-an-email", "password": "ValidPass1",
                "first_name": "A", "last_name": "B",
            })
        assert resp.status_code == 422

    def test_missing_email_422(self):
        """Chýbajúci email → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={
                "username": "validuser", "password": "ValidPass1",
                "first_name": "A", "last_name": "B",
            })
        assert resp.status_code == 422

    def test_missing_password_422(self):
        """Chýbajúce heslo → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={
                "username": "validuser", "email": "x@x.com",
                "first_name": "A", "last_name": "B",
            })
        assert resp.status_code == 422

    def test_empty_body_422(self):
        """Prázdne telo → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/register", json={})
        assert resp.status_code == 422


class TestLoginValidation:
    """Pydantic validácia pri prihlásení → 422."""

    def test_empty_username_422(self):
        """Prázdny username → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": "", "password": "SomePass1",
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 422

    def test_empty_password_422(self):
        """Prázdne heslo → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": "someuser", "password": "",
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 422

    def test_missing_username_422(self):
        """Chýbajúci username → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "password": "SomePass1",
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 422

    def test_missing_body_422(self):
        """Prázdne telo → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={})
        assert resp.status_code == 422

    def test_too_long_password_422(self):
        """Heslo dlhšie ako 128 znakov → 422."""
        with make_client() as c:
            resp = c.post("/api/v1/auth/login", json={
                "username": "someuser", "password": "x" * 129,
            }, headers={"Origin": ORIGIN})
        assert resp.status_code == 422


class TestChangePasswordValidation:
    """Pydantic validácia pri zmene hesla → 422."""

    def test_empty_current_password_422(self):
        """Prázdne aktuálne heslo → 422."""
        client, csrf = make_authenticated_client(VAL_USERNAME, VAL_PASSWORD)
        resp = client.post(
            "/api/v1/profile/change-password",
            json={"current_password": "", "new_password": "NewPass123"},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        assert resp.status_code == 422

    def test_too_short_new_password_422(self):
        """Nové heslo kratšie ako 6 znakov → 422."""
        client, csrf = make_authenticated_client(VAL_USERNAME, VAL_PASSWORD)
        resp = client.post(
            "/api/v1/profile/change-password",
            json={"current_password": VAL_PASSWORD, "new_password": "abc"},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        assert resp.status_code == 422

    def test_too_long_new_password_422(self):
        """Nové heslo dlhšie ako 128 znakov → 422."""
        client, csrf = make_authenticated_client(VAL_USERNAME, VAL_PASSWORD)
        resp = client.post(
            "/api/v1/profile/change-password",
            json={"current_password": VAL_PASSWORD, "new_password": "x" * 129},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        assert resp.status_code == 422

    def test_missing_new_password_422(self):
        """Chýbajúce nové heslo → 422."""
        client, csrf = make_authenticated_client(VAL_USERNAME, VAL_PASSWORD)
        resp = client.post(
            "/api/v1/profile/change-password",
            json={"current_password": VAL_PASSWORD},
            headers={"X-CSRF-Token": csrf, "Origin": ORIGIN},
        )
        client.close()
        assert resp.status_code == 422
