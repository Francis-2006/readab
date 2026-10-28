"""Registration endpoint for creating a new user account.

This route validates the signup payload, hashes the password with Argon2, and stores the
new account in the users table.
"""
import re

from fastapi import APIRouter, HTTPException, status
from psycopg.errors import UniqueViolation
from pydantic import BaseModel, EmailStr, field_validator

from .db import pool, ph

router = APIRouter()


class SignUp(BaseModel):
    """Request payload for a new account registration.

    Attributes:
        username: A public display name that follows the app's username rules.
        email: The user's email address.
        password: A plain-text password that will be hashed before storage.
    """
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def valid_username(cls, v):
        """Check that the username matches the app's allowed format.

        Args:
            v: The proposed username string.

        Returns:
            A trimmed username if it passes validation.

        Raises:
            ValueError: If the username is too short, too long, or contains invalid characters.
        """
        v = v.strip()
        if not re.fullmatch(r"[A-Za-z0-9_.-]{3,30}", v):
            raise ValueError("Username must be 3-30 chars: letters, numbers, _ . -")
        return v

    @field_validator("password")
    @classmethod
    def valid_password(cls, v):
        """Check that the password meets the app's minimum safety requirements.

        Args:
            v: The raw password string.

        Returns:
            The original password if it passes validation.

        Raises:
            ValueError: If the password is too short or too long.
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password too long")
        return v


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(data: SignUp):
    """Create a new user record after hashing the password.

    Args:
        data: The validated signup data from the request body.

    Returns:
        A JSON object containing the newly created user id, username, and email.

    Raises:
        HTTPException: If the username or email is already in use.
    """
    # Passwords should never be stored in plain text, so Argon2 creates a one-way hash first.
    password = ph.hash(data.password)
    try:
        with pool.connection() as conn:
            row = conn.execute(
                "INSERT INTO users (username, email, password) "
                "VALUES (%s, %s, %s) RETURNING id, username, email",
                (data.username, data.email.lower(), password),
            ).fetchone()
    except UniqueViolation:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username or email already in use")
    return {"id": row[0], "username": row[1], "email": row[2]}