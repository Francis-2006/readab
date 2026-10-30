import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.db import pool
from auth.dependencies import get_current_user
from payments.paystack import currency, initialize_transaction

router = APIRouter()


class InitializePayment(BaseModel):
    order_id: int


@router.post("/payments/initialize")
def initialize_payment(data: InitializePayment, user: dict = Depends(get_current_user)):
    """Start a Paystack payment for one of the signed-in user's orders.

    Returns an `authorization_url`: the frontend redirects the customer there
    to pay. The amount always comes from our database, never from the client.
    """
    with pool.connection() as conn:
        # user_id in the WHERE clause: you can only pay for your own orders.
        order = conn.execute(
            "SELECT total_amount, status FROM orders WHERE id = %s AND user_id = %s",
            (data.order_id, user["id"]),
        ).fetchone()
        if not order:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

        amount, order_status = order
        if order_status != "pending":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Order is already {order_status}")

        # A fresh reference per attempt, so a customer can retry after a failure.
        reference = f"order-{data.order_id}-{uuid.uuid4().hex[:12]}"

        conn.execute(
            "INSERT INTO payments (order_id, amount, status, reference) "
            "VALUES (%s, %s, 'pending', %s)",
            (data.order_id, amount, reference),
        )

        # Called inside the transaction: if Paystack fails, the INSERT above
        # is rolled back and no orphan payment row is left behind.
        result = initialize_transaction(
            email=user["email"],
            amount=amount,
            reference=reference,
            callback_url=os.environ.get("PAYSTACK_CALLBACK_URL"),
        )

    return {
        "order_id": data.order_id,
        "reference": reference,
        "amount": float(amount),
        "currency": currency(),
        "authorization_url": result["authorization_url"],
    }