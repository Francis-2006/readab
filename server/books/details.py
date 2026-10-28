"""Detailed view for a single book record.

This route returns the full public metadata for one book, including the description and
cover image, while still leaving out internal file storage details.
"""
from fastapi import APIRouter, HTTPException, status

from .db import pool

router = APIRouter()


@router.get("/books/{book_id}")
def book_details(book_id: int):
    """Return the full details for one book by id.

    Args:
        book_id: The numeric id of the book to fetch.

    Returns:
        A dictionary with the book's full public metadata.

    Raises:
        HTTPException: If the book does not exist.
    """
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