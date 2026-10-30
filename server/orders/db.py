from auth.db import pool


def init_orders_tables():
    """Create the orders tables if they don't exist yet. Safe to run on every startup."""
    with pool.connection() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS orders ("
            "  id BIGSERIAL PRIMARY KEY,"
            "  user_id BIGINT NOT NULL,"
            "  total_amount NUMERIC(10, 2) NOT NULL,"
            "  status TEXT NOT NULL DEFAULT 'pending',"
            "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()"
            ")"
        )
        conn.execute(
            "CREATE TABLE IF NOT EXISTS order_items ("
            "  id BIGSERIAL PRIMARY KEY,"
            "  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,"
            "  book_id BIGINT NOT NULL,"
            "  price NUMERIC(10, 2) NOT NULL"
            ")"
        )
        # Cart rows have a quantity, so order items need one too.
        # This adds it to an existing table and does nothing if it's already there.
        conn.execute(
            "ALTER TABLE order_items "
            "ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id)"
        )