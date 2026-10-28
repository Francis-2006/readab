from fastapi import APIRouter, Query

from .db import pool, SUMMARY_COLS, summary

router = APIRouter()


@router.get("/books/search")
def search_books(
    q: str = Query(..., min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    q = q.strip()
    # Escape LIKE wildcards so a search for "100%" or "a_b" is taken literally
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