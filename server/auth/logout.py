"""Logout endpoint for revoking JWTs.

The user sends a valid bearer token here, and this route marks that token as revoked so
it can no longer be used on protected routes.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from .db import pool
from .dependencies import get_token_payload

router = APIRouter()


@router.post("/logout")
def logout(payload: dict = Depends(get_token_payload)):
    """Revoke the current bearer token so it cannot be used again.

    Args:
        payload: The validated JWT payload from the auth dependency.

    Returns:
        A success message telling the client the token was revoked.
    """
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    with pool.connection() as conn:
        # Store the jti in a blacklist table so this exact token can be rejected later.
        # The token is kept until its original expiry time, which matches the JWT lifespan.
        conn.execute(
            "INSERT INTO revoked_tokens (jti, expires_at) VALUES (%s, %s) "
            "ON CONFLICT (jti) DO NOTHING",
            (payload["jti"], expires_at),
        )
        # Expired entries are never useful, so delete them to keep the blacklist small and tidy.
        conn.execute("DELETE FROM revoked_tokens WHERE expires_at < now()")
    return {"message": "Logged out"}