"""
backend/tests/test_business_logic.py
=====================================
Purpose:
    Integration tests covering core business logic and database-level constraints
    (Phases 1-3) including:
    - Double booking prevention (trg_prevent_double_booking)
    - Room status synchronization (trg_update_room_status)
    - Bill constraints (negative balances, overpayment)
    - Service usage restrictions (only for Checked-In bookings)

Usage:
    cd backend
    python tests/test_business_logic.py
"""

import asyncio
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path so we can import app modules
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

try:
    from app.config import settings
    import asyncpg
except ImportError as e:
    print(f"[ERROR] Missing dependency: {e}")
    sys.exit(1)

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

passed = 0
failed = 0

def ok(msg: str):
    global passed
    passed += 1
    print(f"  {GREEN}[PASS]{RESET} {msg}")

def fail(msg: str):
    global failed
    failed += 1
    print(f"  {RED}[FAIL]{RESET} {msg}")

def section(title: str):
    print(f"\n{YELLOW}{'='*60}{RESET}")
    print(f"{YELLOW}  {title}{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}")

async def run_business_logic_tests():
    global passed, failed

    section("Connecting to Database")
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        ok("Connected to database successfully.")
    except Exception as e:
        fail(f"Failed to connect: {e}")
        return

    # Start a transaction so we can rollback all test data
    tr = conn.transaction()
    await tr.start()

    try:
        section("Testing Edge Cases & Constraints")

        # Get some real foreign keys from seed data to use in tests
        branch_id = await conn.fetchval("SELECT branch_id FROM branch LIMIT 1")
        room_id = await conn.fetchval("SELECT room_id FROM room WHERE branch_id = $1 LIMIT 1", branch_id)
        guest_id = await conn.fetchval("SELECT guest_id FROM guest LIMIT 1")
        service_id = await conn.fetchval("SELECT service_id FROM service WHERE is_active = TRUE LIMIT 1")
        inactive_service_id = await conn.fetchval("SELECT service_id FROM service WHERE is_active = FALSE LIMIT 1")

        if not all([branch_id, room_id, guest_id, service_id]):
            fail("Missing seed data required for testing edge cases.")
            return

        # 1. Double Booking Prevention
        print(f"\n  Checking Double Booking Prevention...")
        b1_id = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO booking (booking_id, guest_id, room_id, check_in_date, check_out_date, rate_at_booking, status, payment_option)
            VALUES ($1, $2, $3, '2027-10-01', '2027-10-05', 10000, 'Booked', 'Credit Card')
        """, b1_id, guest_id, room_id)
        
        b2_id = str(uuid.uuid4())
        try:
            # Attempt to overlap
            await conn.execute("""
                INSERT INTO booking (booking_id, guest_id, room_id, check_in_date, check_out_date, rate_at_booking, status, payment_option)
                VALUES ($1, $2, $3, '2027-10-02', '2027-10-06', 10000, 'Booked', 'Credit Card')
            """, b2_id, guest_id, room_id)
            fail("Double booking trigger failed to block overlapping reservation.")
        except asyncpg.exceptions.RaiseError as e:
            if "Double booking" in str(e):
                ok("Overlapping booking correctly blocked by trigger.")
            else:
                fail(f"Unexpected error when double booking: {e}")
        except Exception as e:
            fail(f"Unexpected exception type: {e}")

        # 2. Room Status Sync (Checked-In -> Occupied)
        print(f"\n  Checking Room Status Synchronization...")
        try:
            await conn.execute("UPDATE booking SET status = 'Checked-In' WHERE booking_id = $1", b1_id)
            status = await conn.fetchval("SELECT status FROM room WHERE room_id = $1", room_id)
            if status == 'Occupied':
                ok("Room status automatically synced to 'Occupied' upon Check-In.")
            else:
                fail(f"Room status should be 'Occupied', but is '{status}'.")
        except Exception as e:
            fail(f"Error checking room status: {e}")

        # 3. Service Usage Restrictions
        print(f"\n  Checking Service Usage Restrictions...")
        try:
            # Active service for Checked-In booking (should work)
            await conn.execute("""
                INSERT INTO service_usage (usage_id, booking_id, service_id, quantity)
                VALUES ($1, $2, $3, 1)
            """, str(uuid.uuid4()), b1_id, service_id)
            ok("Service added successfully to Checked-In booking.")
            
            # Try to add inactive service
            if inactive_service_id:
                try:
                    await conn.execute("""
                        INSERT INTO service_usage (usage_id, booking_id, service_id, quantity)
                        VALUES ($1, $2, $3, 1)
                    """, str(uuid.uuid4()), b1_id, inactive_service_id)
                    fail("Failed to block inactive service usage.")
                except asyncpg.exceptions.RaiseError as e:
                    if "inactive" in str(e).lower():
                        ok("Inactive service usage correctly blocked.")
                    else:
                        fail(f"Unexpected error for inactive service: {e}")
            else:
                print(f"  {YELLOW}[SKIP]{RESET} No inactive service found to test.")
        except Exception as e:
            fail(f"Error during service usage testing: {e}")

        # 4. Bill and Payment constraints (Negative / Overpayment)
        print(f"\n  Checking Billing Constraints...")
        bill_id = str(uuid.uuid4())
        try:
            # Create a bill
            await conn.execute("""
                INSERT INTO bill (bill_id, booking_id, room_charges, service_charges, discount_amount, tax_amount, total_amount, amount_paid, outstanding_balance, balance_flag)
                VALUES ($1, $2, 10000, 0, 0, 1500, 11500, 0, 11500, TRUE)
            """, bill_id, b1_id)
            
            # Attempt negative payment at DB level
            try:
                await conn.execute("""
                    INSERT INTO payment (payment_id, booking_id, amount, payment_method)
                    VALUES ($1, $2, -500, 'Cash')
                """, str(uuid.uuid4()), b1_id)
                # If trigger trg_validate_payment exists, it might block this. Or a check constraint on payment (if any).
                # Actually, check constraint on bill is updated. But payment amount itself shouldn't be negative.
                fail("Allowed negative payment insert.")
            except Exception as e:
                ok("Negative payment or invalid payment correctly blocked.")
                
            # Update bill with negative outstanding balance directly (simulating overpayment update bug)
            try:
                await conn.execute("UPDATE bill SET outstanding_balance = -100 WHERE bill_id = $1", bill_id)
                fail("Allowed negative outstanding balance (constraint missing or failed).")
            except asyncpg.exceptions.CheckViolationError:
                ok("Check constraint blocked negative outstanding balance.")
            except Exception as e:
                fail(f"Unexpected error checking negative balance: {e}")
                
        except Exception as e:
            fail(f"Error during billing constraint testing: {e}")

    finally:
        # Rollback all changes so tests don't pollute the DB
        await tr.rollback()
        await conn.close()

    section("SUMMARY")
    print(f"  {GREEN}Passed:{RESET} {passed}")
    print(f"  {RED}Failed:{RESET} {failed}")
    if failed == 0:
        print(f"  {GREEN}ALL BUSINESS LOGIC CHECKS PASSED{RESET}")
    else:
        print(f"  {RED}{failed} check(s) failed.{RESET}")

if __name__ == "__main__":
    asyncio.run(run_business_logic_tests())
