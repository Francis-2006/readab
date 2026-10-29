from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth.db import pool                       # the shared Neon connection pool
from auth.dependencies import get_current_user  # the sign-in guard

router = APIRouter()


class AddToCart(BaseModel):
    """What the frontend sends when someone clicks "Add to cart"."""
    book_id: int
    quantity: int = Field(1, ge=1, le=99)  # defaults to 1, must be between 1 and 99


@router.post("/cart")
def add_to_cart(data: AddToCart, user: dict = Depends(get_current_user)):
    """Add a book to the signed-in user's cart.

    If the book is already in their cart, its quantity goes up instead of
    creating a second row. The user comes from the token, never from the
    request body, so nobody can add items to someone else's cart.
    """
    with pool.connection() as conn:
        # 1. Make sure the book really exists.
        exists = conn.execute("SELECT 1 FROM books WHERE id = %s", (data.book_id,)).fetchone()
        if not exists:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")

        # 2. Already in this user's cart? Then just increase the quantity.
        #    LEAST(..., 99) stops the quantity growing past 99.
        row = conn.execute(
            "UPDATE cart SET quantity = LEAST(quantity + %s, 99) "
            "WHERE user_id = %s AND book_id = %s RETURNING quantity",
            (data.quantity, user["id"], data.book_id),
        ).fetchone()

        # 3. Not in the cart yet? Then create a new row.
        if row is None:
            row = conn.execute(
                "INSERT INTO cart (user_id, book_id, quantity) "
                "VALUES (%s, %s, %s) RETURNING quantity",
                (user["id"], data.book_id, data.quantity),
            ).fetchone()

    return {"message": "Added to cart", "book_id": data.book_id, "quantity": row[0]}