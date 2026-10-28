from fastapi import APIRouter, Depends

from .dependencies import get_current_user

router = APIRouter()


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user