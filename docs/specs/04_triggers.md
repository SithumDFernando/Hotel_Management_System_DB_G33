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
- This is a **safety net** — `create_booking()` also checks with `FOR UPDATE` lock.
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
-- Condition: only fire when booking status actually changes
IF OLD.status IS DISTINCT FROM NEW.status THEN

  CASE NEW.status
    WHEN 'Checked-In' THEN
      UPDATE room SET status = 'Occupied' WHERE room_id = NEW.room_id;

    WHEN 'Checked-Out' THEN
      UPDATE room SET status = 'Available' WHERE room_id = NEW.room_id;

    WHEN 'Cancelled' THEN
      -- Only set Available if no other active booking exists for this room today
      IF NOT EXISTS (
        SELECT 1 FROM booking
        WHERE room_id = NEW.room_id
          AND booking_id != NEW.booking_id
          AND status IN ('Booked', 'Checked-In')
          AND check_in_date <= CURRENT_DATE
          AND check_out_date > CURRENT_DATE
      ) THEN
        UPDATE room SET status = 'Available' WHERE room_id = NEW.room_id;
      END IF;

  END CASE;
END IF;
```

### Notes
- Keeps `room.status` in sync with booking lifecycle.
- Cancellation has extra logic: only frees the room if no other active booking occupies it.
- The procedures (`check_in`, `check_out`) can delegate room status updates entirely to this trigger to avoid duplication.

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
| 2 | `trg_update_room_status` | booking | AFTER UPDATE (status) | Syncs room.status with booking lifecycle |
| 3 | `trg_validate_service_usage` | service_usage | BEFORE INSERT | Validates booking status, snapshots price |
| 4 | `trg_validate_payment` | payment | BEFORE INSERT | Validates bill exists, amount ≤ balance |
