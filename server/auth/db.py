"""Shared authentication helpers and database setup.

This module holds the PostgreSQL pool, the password hasher, the user schema, and the
JWT helper used by the login and logout flows.
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# This pool is tuned for Neon: the database may close idle connections automatically,
# so we test each connection before reusing it and recycle older ones.
pool = ConnectionPool(
    DATABASE_URL,
    min_size=1,
    max_size=5,
    open=False,
    check=ConnectionPool.check_connection,
    max_idle=60,
    max_lifetime=300,
    kwargs={
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
)

# Argon2 is a slow, memory-hard password hashing algorithm that is much safer than plain
# hashing or a fast algorithm that is easier to brute-force.
ph = PasswordHasher()

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    username      TEXT NOT NULL,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti        TEXT PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);
"""


def init_db():
    """Create the login schema and any required support tables if they do not exist.

    Returns:
        None. The database is updated in place.
    """
    with pool.connection() as conn:
        conn.execute(SCHEMA)


def create_token(user_id: int, username: str) -> str:
    """Create a signed JWT for a logged-in user.

    Args:
        user_id: The database id of the user.
        username: The username to place in the token payload.

    Returns:
        A JWT string that can be sent to protected API routes.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        # jti is a unique token id. It lets the app revoke one token without blocking all
        # tokens for the same user when the user logs out.
        "jti": uuid.uuid4().hex,
        "username": username,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")