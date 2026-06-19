from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.middlewares import SessionAuthMiddleware
from api.v1.auth.router import API_V1_AUTH_ROUTER
from enums.user_role import UserRole
from models.sql.user import UserModel
from services.auth_service import create_access_token
from services.database import get_async_session
from utils.simple_auth import setup_initial_credentials


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _AuthSession:
    def __init__(self, user: UserModel):
        self.user = user

    async def get(self, _model, key):
        return self.user if key == self.user.id else None

    async def execute(self, *_args, **_kwargs):
        return _ScalarResult(self.user.id)


def _make_user() -> UserModel:
    return UserModel(
        username="admin",
        password_hash="unused",
        role=UserRole.superadmin.value,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def test_auth_status_accepts_jwt_cookie(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-secret-with-at-least-32-bytes")
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")
    user = _make_user()
    token, _expires_at = create_access_token(user)

    app = FastAPI()

    async def override_session():
        yield _AuthSession(user)

    app.dependency_overrides[get_async_session] = override_session
    app.include_router(API_V1_AUTH_ROUTER)

    client = TestClient(app)
    client.cookies.set("auth_token", token)
    response = client.get("/api/v1/auth/status")

    assert response.status_code == 200
    assert response.json() == {
        "configured": True,
        "authenticated": True,
        "username": "admin",
    }


def test_session_auth_middleware_accepts_jwt_bearer(monkeypatch, tmp_path):
    monkeypatch.setenv("JWT_SECRET", "test-secret-with-at-least-32-bytes")
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")
    monkeypatch.setenv("USER_CONFIG_PATH", str(tmp_path / "userConfig.json"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    setup_initial_credentials("admin", "secret123")

    user = _make_user()
    token, _expires_at = create_access_token(user)

    app = FastAPI()
    app.add_middleware(SessionAuthMiddleware)

    @app.get("/api/v1/protected")
    async def protected():
        return {"ok": True}

    response = TestClient(app).get(
        "/api/v1/protected",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True}
