"""Shared database helpers and response formatting for the books routes.

This file defines the books table schema and the small summary formatter used by list and
search responses. It also keeps file_path out of public API responses on purpose.
"""
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
    """Create the books table if it does not already exist.

    Returns:
        None. The schema is created in the shared database connection pool.
    """
    with pool.connection() as conn:
        conn.execute(BOOKS_SCHEMA)


# Short version, used in lists and search results.
# file_path is intentionally excluded so the API does not expose local filesystem details.
SUMMARY_COLS = "id, title, author, price, cover_image"


def summary(row) -> dict:
    """Convert a database row into a public book summary payload.

    Args:
        row: A database row containing book fields in the summary column order.

    Returns:
        A dictionary with the public information returned to clients.
    """
    return {
        "id": row[0],
        "title": row[1],
        "author": row[2],
        "price": float(row[3]),
        "cover_image": row[4],
    }