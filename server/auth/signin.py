"""Login endpoint for authenticating a user with username or email.

The route checks the database for a matching user, verifies the password with Argon2,
and returns a JWT if the credentials are valid.
"""
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from .db import pool, ph, create_token

router = APIRouter()


class SignIn(BaseModel):
    """Request payload for the login route.

    Attributes:
        identifier: A username or email address submitted by the user.
        password: The plain-text password supplied when logging in.
    """
    identifier: str  # username OR email
    password: str


@router.post("/signin")
def signin(data: SignIn):
    """Authenticate a user and issue a JWT access token.

    Args:
        data: The SignIn payload containing the username/email and password.

    Returns:
        A JSON object with an access_token and the token type of bearer.

    Raises:
        HTTPException: If the credentials are invalid or the password does not match.
    """
    ident = data.identifier.strip().lower()
    with pool.connection() as conn:
        # We match either the username or email using lowercase comparisons so the login is
        # case-insensitive without changing the stored data.
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
        # Argon2 checks the submitted password against the stored password hash.
        ph.verify(password, data.password)
    except VerifyMismatchError:
        raise invalid

    if ph.check_needs_rehash(password):
        with pool.connection() as conn:
            # If the password hash is in an older format, rehash it to keep security up to date.
            conn.execute(
                "UPDATE users SET password = %s WHERE id = %s",
                (ph.hash(data.password), user_id),
            )

    return {"access_token": create_token(user_id, username), "token_type": "bearer"}