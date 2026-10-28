"""Shared pieces for the books endpoints."""
from auth.db import pool  # same Neon connection pool the auth code uses

BOOKS_SCHEMA = """
CREATE TABLE IF NOT EXISTS books (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    author      TEXT NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    cover_image TEXT,
    file_path   TEXT
);
"""


def init_books_table():
    with pool.connection() as conn:
        conn.execute(BOOKS_SCHEMA)


# Short version, used in lists and search results.
# NOTE: file_path is deliberately NOT here or in the details endpoint.
SUMMARY_COLS = "id, title, author, price, cover_image"


def summary(row) -> dict:
    return {
        "id": row[0],
        "title": row[1],
        "author": row[2],
        "price": float(row[3]),
        "cover_image": row[4],
    }