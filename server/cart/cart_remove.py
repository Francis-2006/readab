from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.db import pool
from auth.dependencies import get_current_user

router = APIRouter()


@router.delete("/cart/{book_id}")
def remove_from_cart(
    book_id: int,
    # Optional: reduce by this many instead of removing the whole item.
    quantity: Optional[int] = Query(None, ge=1, le=99),
    user: dict = Depends(get_current_user),
):
    """Remove a book from the signed-in user's cart.

    - DELETE /cart/5            removes the book completely
    - DELETE /cart/5?quantity=1 reduces it by 1 (and removes it if that reaches 0)

    The WHERE clause always includes user_id from the token, so a user can only
    ever touch their own cart.
    """
    with pool.connection() as conn:
        # Find the item. FOR UPDATE locks the row until we finish, so two quick
        # clicks can't both read the same quantity and miscount.
        row = conn.execute(
            "SELECT quantity FROM cart WHERE user_id = %s AND book_id = %s FOR UPDATE",
            (user["id"], book_id),
        ).fetchone()
        if not row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Book is not in your cart")

        # No quantity given means "remove everything", so nothing remains.
        remaining = 0 if quantity is None else row[0] - quantity

        if remaining <= 0:
            # Nothing left: delete the row.
            conn.execute(
                "DELETE FROM cart WHERE user_id = %s AND book_id = %s",
                (user["id"], book_id),
            )
            return {"message": "Removed from cart", "book_id": book_id}

        # Some left: just lower the quantity.
        conn.execute(
            "UPDATE cart SET quantity = %s WHERE user_id = %s AND book_id = %s",
            (remaining, user["id"], book_id),
        )
    return {"message": "Quantity reduced", "book_id": book_id, "quantity": remaining}