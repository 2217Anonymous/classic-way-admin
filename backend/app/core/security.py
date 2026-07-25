from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings
from app.utils.exceptions import AuthenticationError

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def create_access_token(
    subject: str,
    expires_minutes: int | None = None,
    **extra_claims: Any,
) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expires,
        "type": "access",
        **extra_claims,
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def create_refresh_token(
    subject: str,
    expires_days: int | None = None,
    **extra_claims: Any,
) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        days=expires_days or settings.refresh_token_expire_days
    )
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expires,
        "type": "refresh",
        **extra_claims,
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])


def decode_token(token: str, expected_type: str | None = None) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise AuthenticationError("Invalid or expired token") from exc

    if expected_type is not None and payload.get("type") != expected_type:
        raise AuthenticationError(f"Expected a {expected_type} token")
    return payload