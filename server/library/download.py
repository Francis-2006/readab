from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from auth.db import pool
from auth.dependencies import get_current_user
from library.access import can_download

router = APIRouter()


def resolve_book_path(file_path: str) -> Path:
    """Turn the file_path stored in the books table into a real path on disk.

    Absolute paths are used as they are. Relative paths are relative to the
    folder the server is started from. If admin/storage.py saves files
    differently, this is the only function to adjust.
    """
    return Path(file_path)


@router.get("/books/{book_id}/download")
def download_book(book_id: int, user: dict = Depends(get_current_user)):
    """Send the book file, but only to a signed-in user who is allowed it:
    the book is free, or the user has a PAID order containing it.

    The file path comes from the database, never from the request, so the
    client can't ask for any other file on the server.
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

    path = resolve_book_path(file_path)
    if not path.is_file():
        # The database says there's a file but the disk disagrees: our problem, not the user's.
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "The book file is unavailable"
        )

    return FileResponse(
        path,
        filename=f"{title}{path.suffix}",  # e.g. "Atomic Habits.pdf"
        headers={"Cache-Control": "private, no-store"},
    )