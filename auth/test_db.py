
import os
import psycopg
from dotenv import load_dotenv

# Load the database URL from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Check whether the connection string exists
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env")
else:
    try:
        # Attempt to connect to Neon
        with psycopg.connect(DATABASE_URL, connect_timeout=10) as conn:

            # Ask PostgreSQL for its version
            with conn.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()

                print("✅ Database connection successful!")
                print("PostgreSQL version:", version[0])

    except Exception as error:
        # Display the error if connection fails
        print("❌ Database connection failed!")
        print("Error:", error)
