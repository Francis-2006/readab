from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status

from auth.db import pool
from auth.dependencies import get_current_user

router = APIRouter()


@router.post("/orders", status_code=status.HTTP_201_CREATED)
def checkout(user: dict = Depends(get_current_user)):
    """Turn the signed-in user's cart into an order (checkout).

    Everything happens in ONE transaction: the order, its items, and emptying
    the cart. If any step fails, nothing is saved and the cart stays untouched.
    The user comes from the token, and prices come from the books table, so
    the client can't send its own prices or buy for someone else.
    """
    with pool.connection() as conn:
        # 1. Read the cart with current book prices. FOR UPDATE OF c locks the
        #    cart rows so a double-click can't create two orders from one cart.
        rows = conn.execute(
            "SELECT c.book_id, b.title, b.price, c.quantity "
            "FROM cart c JOIN books b ON b.id = c.book_id "
            "WHERE c.user_id = %s ORDER BY c.id FOR UPDATE OF c",
            (user["id"],),
        ).fetchall()
        if not rows:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your cart is empty")

        # 2. Work out the total (Decimal avoids float rounding errors with money).
        total = sum((price * quantity for _, _, price, quantity in rows), Decimal("0"))

        # 3. Create the order.
        order_id, created_at = conn.execute(
            "INSERT INTO orders (user_id, total_amount, status) "
            "VALUES (%s, %s, 'pending') RETURNING id, created_at",
            (user["id"], total),
        ).fetchone()

        # 4. Copy each cart line into order_items. The price is saved as it is
        #    NOW, so later price changes never alter past orders.
        items = []
        for book_id, title, price, quantity in rows:
            conn.execute(
                "INSERT INTO order_items (order_id, book_id, price, quantity) "
                "VALUES (%s, %s, %s, %s)",
                (order_id, book_id, price, quantity),
            )
            items.append({
                "book_id": book_id,
                "title": title,
                "price": float(price),
                "quantity": quantity,
                "line_total": float(price * quantity),
            })

        # 5. Empty the cart.
        conn.execute("DELETE FROM cart WHERE user_id = %s", (user["id"],))

    return {
        "message": "Order placed",
        "order_id": order_id,
        "status": "pending",
        "total_amount": float(total),
        "created_at": created_at.isoformat(),
        "items": items,
    }