"""The single place that decides who may download a book."""
from decimal import Decimal

# Order statuses that unlock downloads. Add e.g. "shipped" here later if you
# introduce more statuses after payment. "pending"/"cancelled" never unlock.
PAID_STATUSES = ("paid",)


def can_download(conn, user_id: int, book_id: int, price: Decimal) -> bool:
    """True if the book is free, or the user has a paid order containing it."""
    if price == 0:
        return True

    row = conn.execute(
        "SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id "
        "WHERE o.user_id = %s AND oi.book_id = %s AND o.status = ANY(%s) LIMIT 1",
        (user_id, book_id, list(PAID_STATUSES)),
    ).fetchone()
    return row is not None