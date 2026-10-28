import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .db import pool, JWT_SECRET

bearer_scheme = HTTPBearer()  # reads "Authorization: Bearer <token>"


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Use on any route that needs a signed-in user:
        def route(user: dict = Depends(get_current_user))
    """
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized

    # Confirm the user still exists in the database
    with pool.connection() as conn:
        row = conn.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()
    if not row:
        raise unauthorized

    return {"id": row[0], "username": row[1], "email": row[2], "created_at": row[3]}