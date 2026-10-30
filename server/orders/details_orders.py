from fastapi import APIRouter, Depends, HTTPException, status

from auth.db import pool
from auth.dependencies import get_current_user

router = APIRouter()


@router.get("/orders/{order_id}")
def order_details(order_id: int, user: dict = Depends(get_current_user)):
    """Show one order with its items. Only the owner can see it."""
    with pool.connection() as conn:
        # user_id is in the WHERE clause, so someone else's order looks
        # exactly like one that doesn't exist (404, no information leaked).
        order = conn.execute(
            "SELECT id, total_amount, status, created_at "
            "FROM orders WHERE id = %s AND user_id = %s",
            (order_id, user["id"]),
        ).fetchone()
        if not order:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

        # LEFT JOIN so the order still shows if an admin later deleted a book.
        rows = conn.execute(
            "SELECT oi.book_id, b.title, b.author, b.cover_image, oi.price, oi.quantity "
            "FROM order_items oi LEFT JOIN books b ON b.id = oi.book_id "
            "WHERE oi.order_id = %s ORDER BY oi.id",
            (order_id,),
        ).fetchall()

    items = [
        {
            "book_id": book_id,
            "title": title,          # None if the book was deleted
            "author": author,
            "cover_image": cover_image,
            "price": float(price),
            "quantity": quantity,
            "line_total": float(price * quantity),
        }
        for book_id, title, author, cover_image, price, quantity in rows
    ]

    oid, total, order_status, created_at = order
    return {
        "id": oid,
        "total_amount": float(total),
        "status": order_status,
        "created_at": created_at.isoformat(),
        "items": items,
    }