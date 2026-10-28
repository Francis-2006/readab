from fastapi import APIRouter, Query

from .db import pool, SUMMARY_COLS, summary

router = APIRouter()


@router.get("/books")
def list_books(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    with pool.connection() as conn:
        total = conn.execute("SELECT count(*) FROM books").fetchone()[0]
        rows = conn.execute(
            f"SELECT {SUMMARY_COLS} FROM books ORDER BY title ASC LIMIT %s OFFSET %s",
            (limit, (page - 1) * limit),
        ).fetchall()

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "results": [summary(r) for r in rows],
    }