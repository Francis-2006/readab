"""FastAPI dependency helpers for checking authentication state.

These functions verify JWTs, block logged-out tokens, and load the current user for
protected endpoints.
"""
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .db import pool, JWT_SECRET

# This tells FastAPI to read the Authorization header in the usual "Bearer <token>" format.
bearer_scheme = HTTPBearer()

unauthorized = HTTPException(
    status.HTTP_401_UNAUTHORIZED,
    "Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_token_payload(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Validate the JWT signature, expiry, and logout blacklist.

    Args:
        creds: The bearer token passed in the Authorization header.

    Returns:
        The decoded JWT payload if the token is valid and not revoked.

    Raises:
        HTTPException: If the token is missing, expired, invalid, or logged out.
    """
    try:
        # Decode the token with the app's secret and require the expected algorithm.
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
        jti = payload["jti"]
        int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized

    with pool.connection() as conn:
        # If this jti is in the revoked_tokens table, the user logged out and the token must
        # not be accepted anywhere else.
        revoked = conn.execute(
            "SELECT 1 FROM revoked_tokens WHERE jti = %s", (jti,)
        ).fetchone()
    if revoked:
        raise unauthorized
    return payload


def get_current_user(payload: dict = Depends(get_token_payload)) -> dict:
    """Return the signed-in user record for protected endpoints.

    Args:
        payload: The validated JWT payload from get_token_payload.

    Returns:
        A dictionary with the user's public account data.

    Raises:
        HTTPException: If the user no longer exists in the database.
    """
    with pool.connection() as conn:
        row = conn.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = %s",
            (int(payload["sub"]),),
        ).fetchone()
    if not row:
        raise unauthorized
    return {"id": row[0], "username": row[1], "email": row[2], "created_at": row[3]}