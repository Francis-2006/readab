"""Application entry point for the FastAPI backend.

This file wires together the authentication routes and the book routes,
initializes the database tables at startup, and keeps the PostgreSQL connection
pool alive for the lifetime of the app.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 

from auth.db import pool, init_db
from auth import signup, signin, logout, me
from books.db import init_books_table
from books import listings, search, details


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Open database resources on startup and close them on shutdown.

    Args:
        app: The FastAPI app instance passed by the framework.

    Yields:
        Control back to the app while it is running.
    """
    # Open the shared pool once when the app starts, so every request can reuse a connection.
    pool.open()
    init_db()
    init_books_table()
    yield
    # Close the pool cleanly when the server stops to release resources.
    pool.close()


app = FastAPI(title="My Project", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Explicitly allow your frontend
    allow_credentials=True,
    allow_methods=["*"],                      # Allows POST, GET, OPTIONS, etc.
    allow_headers=["*"],                      # Allows content-type, authorization headers, etc.
)

# Auth routes handle sign-up, sign-in, logout, and reading the signed-in user's details.
app.include_router(signup.router)
app.include_router(signin.router)
app.include_router(logout.router)
app.include_router(me.router)

# Book routes are registered in a careful order.
# /books/search must come before /books/{book_id}; otherwise FastAPI may treat the word
# "search" as a book id instead of a search route.
app.include_router(listings.router)
app.include_router(search.router)
app.include_router(details.router)