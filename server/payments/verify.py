from fastapi import APIRouter, Depends, HTTPException, status

from auth.db import pool
from auth.dependencies import get_current_user
from payments.paystack import verify_transaction
from payments.service import settle_payment

router = APIRouter()


@router.get("/payments/verify/{reference}")
def verify_payment(reference: str, user: dict = Depends(get_current_user)):
    """Called by the frontend after Paystack redirects the customer back.

    We ask Paystack directly whether the payment succeeded instead of trusting
    anything in the redirect URL.
    """
    with pool.connection() as conn:
        # Make sure this payment belongs to the signed-in user.
        owned = conn.execute(
            "SELECT o.id FROM payments p JOIN orders o ON o.id = p.order_id "
            "WHERE p.reference = %s AND o.user_id = %s",
            (reference, user["id"]),
        ).fetchone()
        if not owned:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")

        outcome = settle_payment(conn, reference, verify_transaction(reference))

    if outcome == "mismatch":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment amount did not match the order")

    return {
        "reference": reference,
        "order_id": owned[0],
        "paid": outcome in ("success", "already_paid"),
        "status": "success" if outcome == "already_paid" else outcome,
    }