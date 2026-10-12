# ISSUE-04 — Checkout uses a stale bill, so unpaid services escape billing

| | |
|---|---|
| **Severity** | 🔴 High (revenue loss) |
| **Area** | Database — `db/procedures/checkin_checkout.sql` (+ small frontend tweak) |
| **Found** | 2026-10-12 audit |

## Problem

Reproduced sequence on a Checked-In booking:

1. `POST /billing/{id}/generate` → total 81,075.00
2. `POST /payments` 81,075.00 → balance 0
3. `POST /services/{id}/usage` 3 × Spa = 15,000 (+ tax)
4. `PATCH /bookings/{id}/checkout` → **200 Checked-Out**, with response `bill.total_amount = 81075.0`

The 15,000 LKR spa charge plus tax was never billed. Regenerating the bill afterwards shows the debt, but the guest has already left.

## Root cause

`perform_checkout` reads `fn_get_outstanding_balance()`, which returns the **stored** `bill.outstanding_balance`. That value is only refreshed when someone calls `generate_bill`. Nothing guarantees the bill is current at checkout.

## Implementation plan

### 1. Recalculate inside `perform_checkout` (DB is the source of truth)

```sql
CREATE OR REPLACE PROCEDURE perform_checkout(p_booking_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status  booking_status;
    v_room_id UUID;
    v_balance NUMERIC;
BEGIN
    SELECT status, room_id INTO v_status, v_room_id
      FROM booking
     WHERE booking_id = p_booking_id
       FOR UPDATE;                         -- see ISSUE-12

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    IF v_status <> 'Checked-In' THEN
        RAISE EXCEPTION 'Only Checked-In bookings can be checked out';
    END IF;

    -- Always bring the bill up to date (creates it if missing,
    -- keeps any existing discount because p_discount_amount = NULL)
    CALL generate_bill(p_booking_id, NULL);

    v_balance := fn_get_outstanding_balance(p_booking_id);
    IF v_balance > 0 THEN
        RAISE EXCEPTION 'Outstanding balance of LKR % — pay before checkout', v_balance;
    END IF;

    UPDATE booking
       SET status = 'Checked-Out', actual_checkout_time = NOW()
     WHERE booking_id = p_booking_id;
    -- room status handled by trg_room_status (see ISSUE-09)
END;
$$;
```

Notes:
- `generate_bill` already locks the booking row and accepts `Checked-In`.
- If the outstanding-balance exception fires, the whole CALL rolls back, including the bill refresh. That's fine: the router returns **402** and the receptionist opens the bill modal.
- With this change, the "Bill not yet generated" path at checkout disappears, because a bill is always created first.

### 2. Keep the function / procedure split

`generate_bill` is a procedure in `db/procedures/billing.sql`. Calling it from another procedure is fine and follows the AGENTS.md rule (no logic duplicated in `db/functions/`).

### 3. Frontend: show a fresh bill

In [BillPaymentModal.jsx:31](../../../frontend/src/components/BillPaymentModal.jsx#L31) the modal opens with `getBill()` (the stored bill). For a **Checked-In** booking, open with `generateBill(booking.booking_id)` (no discount argument, so the existing discount is kept). Staff will then see the services that were added since the bill was last generated.

### 4. Backend router

No change needed in [bookings.py](../../../backend/app/routers/bookings.py). The 402 mapping on `"outstanding balance"` already exists. Confirm the checkout response's `bill` block now reflects the refreshed totals.

## Tests to add

DB-level (in `test_business_logic.py`) and API-level:

1. Check in → generate → pay in full → add service usage → checkout → expect **402**, and the bill now includes the service charge.
2. Pay the remainder → checkout → 200.
3. Check in → checkout with **no bill generated** and zero services → 402 (room charges are owed), not 400.

## Acceptance criteria

- [ ] Checkout is impossible while any charge on the booking is unpaid, regardless of when the bill was last generated.
- [ ] The existing discount survives the recalculation at checkout.
- [ ] The bill modal shows current totals for in-house guests.
