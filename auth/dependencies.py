import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .db import pool, JWT_SECRET

bearer_scheme = HTTPBearer()  # reads "Authorization: Bearer <token>"

unauthorized = HTTPException(
    status.HTTP_401_UNAUTHORIZED,
    "Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_token_payload(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Verify the token's signature and expiry, and make sure it was not logged out."""
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
        jti = payload["jti"]
        int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized

    with pool.connection() as conn:
        revoked = conn.execute(
            "SELECT 1 FROM revoked_tokens WHERE jti = %s", (jti,)
        ).fetchone()
    if revoked:
        raise unauthorized
    return payload


def get_current_user(payload: dict = Depends(get_token_payload)) -> dict:
    """Use on any route that needs a signed-in user:
        def route(user: dict = Depends(get_current_user))
    """
    with pool.connection() as conn:
        row = conn.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = %s",
            (int(payload["sub"]),),
        ).fetchone()
    if not row:
        raise unauthorized
    return {"id": row[0], "username": row[1], "email": row[2], "created_at": row[3]}