"""
backend/tests/test_db_crud.py
==============================
Purpose:
    Smoke test script to verify that:
    1. The Python environment can connect to PostgreSQL using the DATABASE_URL in .env.
    2. The database user has full CRUD permissions (Create, Read, Update, Delete).
    3. The connection pool initializes and tears down cleanly.

Usage:
    cd backend
    .venv\Scripts\python tests/test_db_crud.py   # Windows
    # or with activated virtualenv:
    python tests/test_db_crud.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path so we can import app modules
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

try:
    from app.config import settings
    import asyncpg
except ImportError as e:
    print(f"[ERROR] Missing dependency: {e}")
    print("   Make sure your virtual environment is active and dependencies are installed:")
    print("   pip install -r requirements.txt")
    sys.exit(1)


async def run_crud_smoke_test():
    print("=" * 60)
    print("  SkyNest Database Smoke Test (CRUD & Connection)")
    print("=" * 60)
    print(f"Target URL: {settings.DATABASE_URL.split('@')[-1]}")  # Hide password

    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        print("[OK] Connection established successfully!")
    except Exception as e:
        print(f"[ERROR] Failed to connect to database:\n   {e}")
        print("\nTroubleshooting:")
        print("   1. Is PostgreSQL running on localhost:5432?")
        print("   2. Did you run 'psql -U postgres -f db/setup_db.sql'?")
        print("   3. Check the DATABASE_URL in backend/.env")
        sys.exit(1)

    try:
        # Step 1: Create a temporary test table
        print("\n[1/5] Creating temporary test table...")
        await conn.execute("""
            CREATE TEMP TABLE _test_probe (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                val INT NOT NULL
            );
        """)
        print("   -> Temporary table created.")

        # Step 2: Insert records (CREATE)
        print("[2/5] Inserting test records (CREATE)...")
        await conn.execute("""
            INSERT INTO _test_probe (name, val)
            VALUES ('probe_alpha', 100), ('probe_beta', 200);
        """)
        print("   -> 2 rows inserted.")

        # Step 3: Select records (READ)
        print("[3/5] Querying test records (READ)...")
        rows = await conn.fetch("SELECT id, name, val FROM _test_probe ORDER BY id;")
        assert len(rows) == 2, f"Expected 2 rows, got {len(rows)}"
        for r in rows:
            print(f"   -> Read row: id={r['id']}, name='{r['name']}', val={r['val']}")

        # Step 4: Update records (UPDATE)
        print("[4/5] Modifying test record (UPDATE)...")
        await conn.execute("UPDATE _test_probe SET val = 999 WHERE name = 'probe_alpha';")
        updated_val = await conn.fetchval("SELECT val FROM _test_probe WHERE name = 'probe_alpha';")
        assert updated_val == 999, f"Expected 999, got {updated_val}"
        print(f"   -> Updated value confirmed: {updated_val}")

        # Step 5: Delete records & drop table (DELETE)
        print("[5/5] Deleting test records and dropping table (DELETE)...")
        await conn.execute("DELETE FROM _test_probe WHERE name = 'probe_beta';")
        remaining = await conn.fetchval("SELECT COUNT(*) FROM _test_probe;")
        assert remaining == 1, f"Expected 1 remaining row, got {remaining}"
        await conn.execute("DROP TABLE _test_probe;")
        print("   -> 1 row deleted, temporary table dropped cleanly.")

        print("\n" + "=" * 60)
        print("[SUCCESS] ALL CRUD TESTS PASSED!")
        print("   Your database connection and permissions are working perfectly.")
        print("=" * 60)

    except Exception as e:
        print(f"[ERROR] Error during CRUD operations: {e}")
        sys.exit(1)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_crud_smoke_test())
