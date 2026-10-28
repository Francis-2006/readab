from contextlib import asynccontextmanager

from fastapi import FastAPI

from auth.db import pool, init_db
from auth import signup, signin,logout, me


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open()
    init_db()
    yield
    pool.close()


app = FastAPI(title="My Project", lifespan=lifespan)

# --- auth ---
app.include_router(signup.router)
app.include_router(signin.router)
app.include_router(logout.router)
app.include_router(me.router)