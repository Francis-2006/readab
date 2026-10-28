from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from .db import pool
from .dependencies import get_token_payload

router = APIRouter()


@router.post("/logout")
def logout(payload: dict = Depends(get_token_payload)):
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    with pool.connection() as conn:
        # Blacklist this token until it would have expired anyway
        conn.execute(
            "INSERT INTO revoked_tokens (jti, expires_at) VALUES (%s, %s) "
            "ON CONFLICT (jti) DO NOTHING",
            (payload["jti"], expires_at),
        )
        # Housekeeping: expired tokens are invalid anyway, so forget them
        conn.execute("DELETE FROM revoked_tokens WHERE expires_at < now()")
    return {"message": "Logged out"}