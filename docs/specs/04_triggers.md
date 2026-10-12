# 04 — Triggers

> All triggers enforce business rules at the database level — they fire regardless of whether the action comes from the API, a direct SQL session, or a migration script.

---

## 1. Double Booking Prevention Trigger

| Property | Value |
|----------|-------|
| **Name** | `trg_prevent_double_booking` |
| **Table** | `booking` |
| **Timing** | BEFORE INSERT OR UPDATE |
| **Fires on** | Each row |

### Logic

```
IF NEW.status NOT IN ('Cancelled', 'Checked-Out') THEN
  PERFORM 1 FROM room WHERE room_id = NEW.room_id FOR UPDATE;  -- serialize per room
  IF EXISTS (
    SELECT 1 FROM booking
    WHERE room_id = NEW.room_id
      AND booking_id != NEW.booking_id  -- exclude self on UPDATE
      AND status NOT IN ('Cancelled', 'Checked-Out')
      AND check_in_date < NEW.check_out_date
      AND check_out_date > NEW.check_in_date
  ) THEN
    RAISE EXCEPTION 'Double booking: Room % is already reserved for overlapping dates', NEW.room_id;
  END IF;
END IF;
RETURN NEW;
```

### Notes
- **Concurrency:** the trigger locks the room row first, so two concurrent bookings for the same room run one after another; the second waits for the first to commit, then sees it and gets this error. Without the lock both `EXISTS` checks would pass under READ COMMITTED, because neither sees the other's uncommitted insert.
- The guarantee is the exclusion constraint `excl_booking_room_overlap` (see `01_database_design.md` §2.9). It also catches anything that skips the trigger; the API maps its error to 409.
- The trigger catches edge cases like direct SQL INSERTs or status UPDATEs that reactivate a cancelled booking.
- Does NOT fire for Cancelled/Checked-Out status transitions (those free up the room).

---

## 2. Room Status Trigger

| Property | Value |
|----------|-------|
| **Name** | `trg_update_room_status` |
| **Table** | `booking` |
| **Timing** | AFTER UPDATE |
| **Fires on** | Each row — only when `status` column changes |

### Logic

```
IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

IF NEW.status = 'Checked-In' THEN
  -- Guest arrives: Available -> Occupied (never overrides Maintenance)
  UPDATE room SET status = 'Occupied'
   WHERE room_id = NEW.room_id AND status = 'Available';

ELSIF OLD.status = 'Checked-In' AND NEW.status IN ('Checked-Out', 'Cancelled') THEN
  -- Guest leaves: Occupied -> Available, unless another booking is still in
  UPDATE room SET status = 'Available'
   WHERE room_id = NEW.room_id AND status = 'Occupied'
     AND NOT EXISTS (SELECT 1 FROM booking
                      WHERE room_id = NEW.room_id
                        AND booking_id <> NEW.booking_id
                        AND status = 'Checked-In');
END IF;
-- Booked -> Cancelled: the room was never occupied by this booking -> no change
RETURN NEW;
```

### Room status policy
| Room status | Who changes it |
|---|---|
| `Available` ↔ `Occupied` | **Only this trigger**, from booking events. `perform_checkin` / `perform_checkout` / `cancel_booking` do not touch the `room` table. |
| `Maintenance` | **Only manually**, via `PATCH /rooms/{id}/status`. No booking event sets or clears it. |

| Start room | Booking transition | Room after |
|---|---|---|
| Maintenance | Booked → Cancelled | Maintenance |
| Available | Booked → Cancelled | Available |
| Available | Booked → Checked-In | Occupied |
| Occupied | Checked-In → Checked-Out | Available |
| Maintenance (set mid-stay) | Checked-In → Checked-Out | Maintenance |

### Notes
- Every `UPDATE room` is guarded by the status it expects, so a booking event never overwrites `Maintenance`.
- The manual endpoint enforces the same consistency: `Available` is refused while a booking is `Checked-In`, and `Occupied` without one (409). See `02_api_contract.md`.
- Runs `AFTER UPDATE OF status` in the same transaction as the booking change.

---

## 3. Service Usage Validation Trigger

| Property | Value |
|----------|-------|
| **Name** | `trg_validate_service_usage` |
| **Table** | `service_usage` |
| **Timing** | BEFORE INSERT |
| **Fires on** | Each row |

### Logic

```
-- 1. Booking must be Checked-In
IF (SELECT status FROM booking WHERE booking_id = NEW.booking_id) != 'Checked-In' THEN
  RAISE EXCEPTION 'Services can only be added to Checked-In bookings';
END IF;

-- 2. Service must be active
IF (SELECT is_active FROM service WHERE service_id = NEW.service_id) = FALSE THEN
  RAISE EXCEPTION 'Service % is inactive', NEW.service_id;
END IF;

-- 3. Snapshot the unit_price from service catalogue
NEW.unit_price := (SELECT base_price FROM service WHERE service_id = NEW.service_id);
NEW.usage_date := COALESCE(NEW.usage_date, CURRENT_DATE);

RETURN NEW;
```

### Notes
- **Auto-snapshots** `unit_price` from the service catalogue — the API layer doesn't need to pass it.
- Defaults `usage_date` to today if not provided.
- Prevents adding services to bookings that aren't currently checked in.

---

## 4. Payment Validation Trigger (Optional)

| Property | Value |
|----------|-------|
| **Name** | `trg_validate_payment` |
| **Table** | `payment` |
| **Timing** | BEFORE INSERT |
| **Fires on** | Each row |

### Logic

```
-- Bill must exist
IF NOT EXISTS (SELECT 1 FROM bill WHERE booking_id = NEW.booking_id) THEN
  RAISE EXCEPTION 'Cannot record payment — bill not yet generated';
END IF;

-- Amount must not exceed outstanding balance
IF NEW.amount > (SELECT outstanding_balance FROM bill WHERE booking_id = NEW.booking_id) THEN
  RAISE EXCEPTION 'Payment amount exceeds outstanding balance';
END IF;
```

### Notes
- This is a **defense-in-depth** trigger — `record_payment()` procedure already validates, but this catches direct INSERTs.
- Marked as optional: if all payments always go through `record_payment()`, this is redundant.

---

## Summary Table

| # | Trigger Name | Table | Timing | Purpose |
|---|-------------|-------|--------|---------|
| 1 | `trg_prevent_double_booking` | booking | BEFORE INSERT/UPDATE | Prevents overlapping reservations |
| 2 | `trg_update_room_status` | booking | AFTER UPDATE (status) | Sole owner of room Available ↔ Occupied; never overrides Maintenance |
| 3 | `trg_validate_service_usage` | service_usage | BEFORE INSERT | Validates booking status, snapshots price |
| 4 | `trg_validate_payment` | payment | BEFORE INSERT | Validates bill exists, amount ≤ balance |
