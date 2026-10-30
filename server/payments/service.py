"""The one place that marks a payment (and its order) as paid.

Both the browser callback (verify.py) and Paystack's webhook (webhook.py) call
settle_payment(), so the logic is identical and safe to run twice.
"""
from payments.paystack import currency, to_subunit


def settle_payment(conn, reference: str, data: dict) -> str:
    """Apply Paystack's verified transaction `data` to our payment + order.

    Returns one of: "not_found", "already_paid", "mismatch", "success",
    "failed", "pending".
    """
    # Lock the payment row so the callback and the webhook can't both
    # process the same payment at the same moment.
    row = conn.execute(
        "SELECT id, order_id, amount, status FROM payments WHERE reference = %s FOR UPDATE",
        (reference,),
    ).fetchone()
    if not row:
        return "not_found"

    payment_id, order_id, amount, payment_status = row
    if payment_status == "success":
        return "already_paid"  # idempotent: running twice changes nothing

    paystack_status = data.get("status")

    if paystack_status == "success":
        # Never trust the status alone: the amount and currency must match too.
        if data.get("amount") != to_subunit(amount) or data.get("currency") != currency():
            return "mismatch"
        conn.execute("UPDATE payments SET status = 'success' WHERE id = %s", (payment_id,))
        conn.execute(
            "UPDATE orders SET status = 'paid' WHERE id = %s AND status = 'pending'",
            (order_id,),
        )
        return "success"

    if paystack_status == "failed":
        conn.execute("UPDATE payments SET status = 'failed' WHERE id = %s", (payment_id,))
        return "failed"

    # "abandoned", "ongoing", etc.: the customer may still finish paying.
    return "pending"