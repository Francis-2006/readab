from contextlib import asynccontextmanager

from fastapi import FastAPI

from auth.db import pool, init_db
from auth import signup, signin, logout, me
from books.db import init_books_table
from books import listings, search, details


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open()
    init_db()
    init_books_table()
    yield
    pool.close()


app = FastAPI(title="My Project", lifespan=lifespan)

# --- auth ---
app.include_router(signup.router)
app.include_router(signin.router)
app.include_router(logout.router)
app.include_router(me.router)

# --- books ---
# Order matters: /books/search must be registered BEFORE /books/{book_id},
# otherwise "search" would be read as a book id.
app.include_router(listings.router)
app.include_router(search.router)
app.include_router(details.router)