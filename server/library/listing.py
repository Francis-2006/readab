from fastapi import APIRouter, Depends

from auth.db import pool
from auth.dependencies import get_current_user
from library.access import PAID_STATUSES

router = APIRouter()


@router.get("/library")
def my_library(user: dict = Depends(get_current_user)):
    """The books the signed-in user has paid for, ready to download."""
    with pool.connection() as conn:
        rows = conn.execute(
            "SELECT DISTINCT b.id, b.title, b.author, b.cover_image "
            "FROM books b "
            "JOIN order_items oi ON oi.book_id = b.id "
            "JOIN orders o ON o.id = oi.order_id "
            "WHERE o.user_id = %s AND o.status = ANY(%s) AND b.file_path IS NOT NULL "
            "ORDER BY b.title",
            (user["id"], list(PAID_STATUSES)),
        ).fetchall()

    return {
        "books": [
            {
                "book_id": book_id,
                "title": title,
                "author": author,
                "cover_image": cover_image,
                "download_url": f"/books/{book_id}/download",
            }
            for book_id, title, author, cover_image in rows
        ]
    }