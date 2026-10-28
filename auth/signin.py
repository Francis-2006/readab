from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from .db import pool, ph, create_token

router = APIRouter()


class SignIn(BaseModel):
    identifier: str  # username OR email
    password: str


@router.post("/signin")
def signin(data: SignIn):
    ident = data.identifier.strip().lower()
    with pool.connection() as conn:
        row = conn.execute(
            "SELECT id, username, password FROM users "
            "WHERE lower(username) = %s OR lower(email) = %s",
            (ident, ident),
        ).fetchone()

    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    if not row:
        raise invalid
    user_id, username, password = row
    try:
        ph.verify(password, data.password)
    except VerifyMismatchError:
        raise invalid

    if ph.check_needs_rehash(password):
        with pool.connection() as conn:
            conn.execute(
                "UPDATE users SET password = %s WHERE id = %s",
                (ph.hash(data.password), user_id),
            )

    return {"access_token": create_token(user_id, username), "token_type": "bearer"}