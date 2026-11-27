from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, HTTPException, status

from auth.db import pool
from auth.dependencies import get_current_user
from library.storage import create_signed_url, split_storage_ref
from payments.paystack import verify_transaction
from payments.service import settle_payment

router = APIRouter()

# How long the links in this response stay valid. If one expires, the frontend
# can get a fresh one from GET /books/{book_id}/download (still needs the token).
DOWNLOAD_LINK_SECONDS = 300


@router.get("/payments/verify/{reference}")
def verify_payment(reference: str, user: dict = Depends(get_current_user)):
    """Called by the frontend after Paystack redirects the customer back.

    We ask Paystack directly whether the payment succeeded instead of trusting
    anything in the redirect URL. Once it is confirmed, the response also
    contains a temporary download link for each book in the order.
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

        order_id = owned[0]
        outcome = settle_payment(conn, reference, verify_transaction(reference))

        if outcome == "mismatch":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Payment amount did not match the order"
            )

        paid = outcome in ("success", "already_paid")
        books = []
        if paid:
            # The books in this order that actually have a file.
            books = conn.execute(
                "SELECT b.id, b.title, b.file_path "
                "FROM order_items oi JOIN books b ON b.id = oi.book_id "
                "WHERE oi.order_id = %s AND b.file_path IS NOT NULL ORDER BY oi.id",
                (order_id,),
            ).fetchall()

    # Signing talks to Supabase, so it happens after the database work is done.
    downloads = []
    for book_id, title, file_path in books:
        extension = PurePosixPath(split_storage_ref(file_path)[1]).suffix
        try:
            url = create_signed_url(
                file_path, f"{title}{extension}", expires_in=DOWNLOAD_LINK_SECONDS
            )
        except HTTPException:
            url = None  # payment still succeeded; the user can retry via /books/{id}/download
        downloads.append({"book_id": book_id, "title": title, "download_url": url})

    return {
        "reference": reference,
        "order_id": order_id,
        "paid": paid,
        "status": "success" if outcome == "already_paid" else outcome,
        # "downloads": downloads,
        "download_links_expire_in": DOWNLOAD_LINK_SECONDS,
    }