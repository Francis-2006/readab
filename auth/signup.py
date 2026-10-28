import re

from fastapi import APIRouter, HTTPException, status
from psycopg.errors import UniqueViolation
from pydantic import BaseModel, EmailStr, field_validator

from .db import pool, ph

router = APIRouter()


class SignUp(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def valid_username(cls, v):
        v = v.strip()
        if not re.fullmatch(r"[A-Za-z0-9_.-]{3,30}", v):
            raise ValueError("Username must be 3-30 chars: letters, numbers, _ . -")
        return v

    @field_validator("password")
    @classmethod
    def valid_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password too long")
        return v


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(data: SignUp):
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