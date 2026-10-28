"""Add sample books.

    python seed_books.py            # add samples if the table is empty
    python seed_books.py --reset    # DROP the books table, recreate it, add samples
"""
import sys

from auth.db import pool
from books.db import init_books_table

# (title, author, description, price)   -- prices are placeholders
BOOKS = [
    ("Things Fall Apart", "Chinua Achebe",
     "A story of a proud Igbo leader and the arrival of colonial rule in his village.", 12.99),
    ("Half of a Yellow Sun", "Chimamanda Ngozi Adichie",
     "Lives intertwine during the Nigerian civil war.", 14.99),
    ("Americanah", "Chimamanda Ngozi Adichie",
     "A Nigerian woman navigates identity and love between Lagos, the US and the UK.", 14.50),
    ("Pride and Prejudice", "Jane Austen",
     "Elizabeth Bennet and Mr Darcy overcome first impressions and social pressure.", 9.99),
    ("1984", "George Orwell",
     "A man resists a totalitarian state that watches and rewrites everything.", 10.99),
    ("The Alchemist", "Paulo Coelho",
     "A shepherd boy journeys across the desert in search of his personal legend.", 11.50),
    ("Atomic Habits", "James Clear",
     "A practical guide to building good habits through small, consistent changes.", 16.99),
    ("Sapiens", "Yuval Noah Harari",
     "A sweeping history of humankind from the Stone Age to the present.", 18.00),
    ("Clean Code", "Robert C. Martin",
     "Principles and practices for writing readable, maintainable software.", 29.99),
    ("The Pragmatic Programmer", "Andrew Hunt and David Thomas",
     "Practical advice on becoming a better and more effective programmer.", 32.50),
]

pool.open()
if "--reset" in sys.argv:
    with pool.connection() as conn:
        conn.execute("DROP TABLE IF EXISTS books")
    print("Dropped old books table.")
init_books_table()

with pool.connection() as conn:
    count = conn.execute("SELECT count(*) FROM books").fetchone()[0]
    if count:
        print(f"books table already has {count} rows, skipping.")
    else:
        for title, author, desc, price in BOOKS:
            conn.execute(
                "INSERT INTO books (title, author, description, price) "
                "VALUES (%s, %s, %s, %s)",
                (title, author, desc, price),
            )
        print(f"Added {len(BOOKS)} books.")
pool.close()