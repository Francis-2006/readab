from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, HTTPException, status

from auth.db import pool
from auth.dependencies import get_current_user
from library.access import can_download
from library.storage import create_signed_url, split_storage_ref

router = APIRouter()

LINK_LIFETIME_SECONDS = 500


@router.get("/books/{book_id}/download")
def download_book(book_id: int, user: dict = Depends(get_current_user)):
    """Give a signed-in user a short-lived download link, but only if the book
    is free or they have a PAID order containing it.

    The frontend calls this with the Bearer token, receives `download_url`, and
    then simply opens that link. The link expires after 500 seconds and works
    without a token, so a plain <a href> or window.location is enough.
    """
    with pool.connection() as conn:
        book = conn.execute(
            "SELECT title, price, file_path FROM books WHERE id = %s", (book_id,)
        ).fetchone()
        if not book:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")

        title, price, file_path = book
        if not file_path:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "This book has no file")

        if not can_download(conn, user["id"], book_id, price):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Purchase this book to download it"
            )

    _, stored_path = split_storage_ref(file_path)
    extension = PurePosixPath(stored_path).suffix  # ".pdf", ".epub", ...

    url = create_signed_url(
        file_path,
        filename=f"{title}{extension}",
        expires_in=LINK_LIFETIME_SECONDS,
    )
    return {"download_url": url, "expires_in": LINK_LIFETIME_SECONDS}