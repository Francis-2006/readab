"""Quick database connectivity check for local development.

This script reads the DATABASE_URL from the environment and tests whether the app can
connect to the PostgreSQL database.
"""

import os
import psycopg
from dotenv import load_dotenv

# Load the database URL from .env so the script can use the same configuration as the app.
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# If the environment is missing the database URL, the script cannot connect at all.
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env")
else:
    try:
        # Connect to Neon/PostgreSQL and confirm that credentials and networking are working.
        with psycopg.connect(DATABASE_URL, connect_timeout=10) as conn:

            # Ask PostgreSQL for its version to confirm the database is responding correctly.
            with conn.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()

                print("✅ Database connection successful!")
                print("PostgreSQL version:", version[0])

    except Exception as error:
        # Show any error details so the developer can fix the connection problem quickly.
        print("❌ Database connection failed!")
        print("Error:", error)
