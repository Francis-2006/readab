"""Endpoint that returns the currently logged-in user.

This file is intentionally small: the real authentication work happens in the shared
security dependency, while this route simply reads the current user and returns it.
"""
from fastapi import APIRouter, Depends

from .dependencies import get_current_user

router = APIRouter()


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    """Return the signed-in user's profile information.

    Args:
        user: The user data loaded by the auth dependency after JWT validation.

    Returns:
        A dictionary containing the current user's id, username, email, and created_at.
    """
    return user