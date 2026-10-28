from fastapi import APIRouter, HTTPException, status

from .db import pool

router = APIRouter()


@router.get("/books/{book_id}")
def book_details(book_id: int):
    with pool.connection() as conn:
        row = conn.execute(
            "SELECT id, title, author, description, price, cover_image "
            "FROM books WHERE id = %s",
            (book_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")

    return {
        "id": row[0],
        "title": row[1],
        "author": row[2],
        "description": row[3],
        "price": float(row[4]),
        "cover_image": row[5],
    }