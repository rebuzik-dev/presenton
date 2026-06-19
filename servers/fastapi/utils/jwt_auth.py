from datetime import datetime
from typing import Optional

import jwt
from fastapi import Request
from starlette.responses import Response

from services.auth_service import decode_access_token
from utils.datetime_utils import get_current_utc_datetime


AUTH_TOKEN_COOKIE_NAME = "auth_token"


def get_access_token_from_request(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    return (
        request.cookies.get(AUTH_TOKEN_COOKIE_NAME)
        or request.query_params.get("token")
        or None
    )


def get_access_token_payload_from_request(request: Request) -> Optional[dict]:
    token = get_access_token_from_request(request)
    if not token:
        return None

    try:
        return decode_access_token(token)
    except (jwt.PyJWTError, RuntimeError, ValueError):
        return None


def is_access_token_request(request: Request) -> bool:
    payload = get_access_token_payload_from_request(request)
    return bool(payload and payload.get("sub"))


def _is_secure_request(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    if forwarded_proto.lower() == "https":
        return True
    return request.url.scheme == "https"


def set_access_token_cookie(
    response: Response,
    token: str,
    expires_at: datetime,
    request: Request,
) -> None:
    max_age = max(
        0,
        int((expires_at - get_current_utc_datetime()).total_seconds()),
    )
    response.set_cookie(
        key=AUTH_TOKEN_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=_is_secure_request(request),
        samesite="lax",
        path="/",
    )


def clear_access_token_cookie(response: Response, request: Request) -> None:
    response.delete_cookie(
        key=AUTH_TOKEN_COOKIE_NAME,
        httponly=True,
        secure=_is_secure_request(request),
        samesite="lax",
        path="/",
    )
