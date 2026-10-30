from decimal import Decimal

from fastapi import APIRouter, Depends

from auth.db import pool
from auth.dependencies import get_current_user

router = APIRouter()


@router.get("/cart")
def view_cart(user: dict = Depends(get_current_user)):
    """Show the signed-in user's cart with book details and totals."""
    with pool.connection() as conn:
        # JOIN pulls the book details for each cart row. If a book was deleted
        # by an admin, its cart row has no match and is simply left out.
        rows = conn.execute(
            "SELECT c.book_id, b.title, b.author, b.price, b.cover_image, c.quantity "
            "FROM cart c JOIN books b ON b.id = c.book_id "
            "WHERE c.user_id = %s ORDER BY c.id",
            (user["id"],),
        ).fetchall()

    items = []
    total = Decimal("0")  # Decimal avoids the rounding errors floats give with money
    item_count = 0
    for book_id, title, author, price, cover_image, quantity in rows:
        line_total = price * quantity
        total += line_total
        item_count += quantity
        items.append({
            "book_id": book_id,
            "title": title,
            "author": author,
            "price": float(price),
            "cover_image": cover_image,
            "quantity": quantity,
            "line_total": float(line_total),
        })
        
        # cart_count = len(items)

    return {"items": items,
            "item_count": item_count,
            "total": float(total)
            }