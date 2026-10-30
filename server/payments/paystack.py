"""Thin wrapper around the Paystack REST API. Nothing else talks to Paystack directly."""
import os
from decimal import Decimal, ROUND_HALF_UP

import httpx
from fastapi import HTTPException, status

BASE_URL = "https://api.paystack.co"


def currency() -> str:
    return os.environ.get("PAYSTACK_CURRENCY", "GHS")


def secret_key() -> str:
    key = os.environ.get("PAYSTACK_SECRET_KEY")
    if not key:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "Payments are not configured"
        )
    return key


def to_subunit(amount: Decimal) -> int:
    """Paystack wants the smallest unit: 25.50 GHS -> 2550 pesewas."""
    return int((Decimal(amount) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _call(method: str, path: str, json: dict | None = None) -> dict:
    try:
        resp = httpx.request(
            method,
            f"{BASE_URL}{path}",
            json=json,
            headers={"Authorization": f"Bearer {secret_key()}"},
            timeout=20,
        )
        body = resp.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not reach the payment provider")

    if not resp.is_success or not body.get("status"):
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Payment provider error: {body.get('message', 'unknown error')}",
        )
    return body["data"]


def initialize_transaction(email: str, amount: Decimal, reference: str, callback_url: str | None) -> dict:
    payload = {
        "email": email,
        "amount": to_subunit(amount),
        "currency": currency(),
        "reference": reference,
    }
    if callback_url:
        payload["callback_url"] = callback_url
    return _call("POST", "/transaction/initialize", payload)


def verify_transaction(reference: str) -> dict:
    return _call("GET", f"/transaction/verify/{reference}")