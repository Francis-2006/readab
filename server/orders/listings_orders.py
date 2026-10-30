from fastapi import APIRouter, Depends

from auth.db import pool
from auth.dependencies import get_current_user

router = APIRouter()


@router.get("/orders")
def list_orders(user: dict = Depends(get_current_user)):
    """List the signed-in user's orders, newest first."""
    with pool.connection() as conn:
        rows = conn.execute(
            "SELECT o.id, o.total_amount, o.status, o.created_at, "
            "       COALESCE(SUM(oi.quantity), 0) "
            "FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id "
            "WHERE o.user_id = %s "
            "GROUP BY o.id ORDER BY o.created_at DESC, o.id DESC",
            (user["id"],),
        ).fetchall()

    return {
        "orders": [
            {
                "id": order_id,
                "total_amount": float(total),
                "status": order_status,
                "created_at": created_at.isoformat(),
                "item_count": int(item_count),
            }
            for order_id, total, order_status, created_at, item_count in rows
        ]
    }