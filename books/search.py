"""Search books by title, author, or description.

This route lets users search with a text query and returns paginated results using a
case-insensitive match.
"""
from fastapi import APIRouter, Query

from .db import pool, SUMMARY_COLS, summary

router = APIRouter()


@router.get("/books/search")
def search_books(
    q: str = Query(..., min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Search for books using a text query.

    Args:
        q: The search term to look for in titles, authors, and descriptions.
        page: The page number to return.
        limit: The maximum number of results in the page.

    Returns:
        A paginated dictionary containing the query and matching book summaries.
    """
    q = q.strip()
    # Wildcards in SQL LIKE are special: % means “anything” and _ means “any single character”.
    # We escape them here so a user searching for a literal "100%" or "a_b" is not matched
    # as a wildcard pattern by accident.
    escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    p = f"%{escaped}%"
    match = "(title ILIKE %s OR author ILIKE %s OR description ILIKE %s)"

    with pool.connection() as conn:
        total = conn.execute(
            f"SELECT count(*) FROM books WHERE {match}", (p, p, p)
        ).fetchone()[0]
        rows = conn.execute(
            f"SELECT {SUMMARY_COLS} FROM books WHERE {match} "
            "ORDER BY (title ILIKE %s) DESC, (author ILIKE %s) DESC, title ASC "
            "LIMIT %s OFFSET %s",
            (p, p, p, p, p, limit, (page - 1) * limit),
        ).fetchall()

    return {
        "query": q,
        "page": page,
        "limit": limit,
        "total": total,
        "results": [summary(r) for r in rows],
    }