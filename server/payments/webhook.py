import hashlib
import hmac
import json

from fastapi import APIRouter, HTTPException, Request, status
from starlette.concurrency import run_in_threadpool

from auth.db import pool
from payments.paystack import secret_key, verify_transaction
from payments.service import settle_payment

router = APIRouter()


def _process(reference: str) -> None:
    with pool.connection() as conn:
        # Don't trust the webhook body for the result: re-check with Paystack.
        settle_payment(conn, reference, verify_transaction(reference))


@router.post("/payments/webhook")
async def paystack_webhook(request: Request):
    """Paystack calls this itself when a payment finishes, even if the customer
    closed the browser before being redirected back. No login: the HMAC
    signature proves the request really came from Paystack."""
    body = await request.body()  # raw bytes: the signature is computed over these

    expected = hmac.new(secret_key().encode(), body, hashlib.sha512).hexdigest()
    received = request.headers.get("x-paystack-signature", "")
    if not hmac.compare_digest(expected, received):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid signature")

    event = json.loads(body)
    if event.get("event") == "charge.success":
        reference = event.get("data", {}).get("reference")
        if reference:
            await run_in_threadpool(_process, reference)

    # Always 200 for a valid signature, or Paystack keeps retrying.
    return {"received": True}