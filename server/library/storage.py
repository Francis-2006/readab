"""Talks to Supabase Storage. Only this file knows how the book files are stored."""
import logging
import os
import re
from urllib.parse import quote, unquote

from dotenv import load_dotenv
import httpx
from fastapi import HTTPException, status


load_dotenv(override=True)

# Matches stored links such as:
#   https://xxxx.supabase.co/storage/v1/object/public/books/folder/file.pdf
# and captures the bucket ("books") and the path inside it ("folder/file.pdf").
log = logging.getLogger("uvicorn.error")

_URL_PATTERN = re.compile(r"/object/(?:public|sign|authenticated)/([^/]+)/(.+?)(?:\?|$)")


def split_storage_ref(file_path: str) -> tuple[str, str]:
    """Work out (bucket, path inside bucket) from whatever is saved in books.file_path.

    It can be a full Supabase URL, or just the path inside the bucket (in which
    case SUPABASE_BOOKS_BUCKET says which bucket).
    """
    match = _URL_PATTERN.search(file_path)
    if match:
        return match.group(1), unquote(match.group(2))
    return os.environ.get("SUPABASE_BOOKS_BUCKET", "books"), file_path.lstrip("/")


def create_signed_url(file_path: str, filename: str, expires_in: int = 60) -> str:
    """Ask Supabase for a temporary link to a PRIVATE file.

    The link works for `expires_in` seconds, then dies. Uses the service-role
    key, which must stay on the server (never in the frontend or in git).
    """
    base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not base_url or not service_key:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "File storage is not configured"
        )

    bucket, path = split_storage_ref(file_path)
    try:
        resp = httpx.post(
            f"{base_url}/storage/v1/object/sign/{bucket}/{quote(path)}",
            json={"expiresIn": expires_in},
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
            },
            timeout=15,
        )
    except httpx.HTTPError:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not reach file storage")

    if resp.status_code != 200:
        # Shown in the server terminal (never sent to the client) so you can see why.
        log.warning(
            "Supabase signing failed: status=%s bucket=%r path=%r response=%s",
            resp.status_code, bucket, path, resp.text[:300],
        )
        if resp.status_code in (400, 404):
            # Supabase answers 400/404 "Object not found" when bucket or path is wrong.
            raise HTTPException(status.HTTP_404_NOT_FOUND, "The book file could not be found")
        # 401/403 and others: a configuration problem (wrong or missing key), not the user's fault.
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "File storage rejected the request"
        )

    signed = resp.json().get("signedURL", "")
    if not signed.startswith("http"):
        signed = f"{base_url}/storage/v1{signed}"

    # download=<name> makes the browser save it as "Title.pdf" instead of opening it.
    return f"{signed}&download={quote(filename)}"