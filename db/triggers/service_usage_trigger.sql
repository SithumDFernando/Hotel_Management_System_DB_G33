-- =============================================================================
-- db/triggers/service_usage_trigger.sql
-- =============================================================================
-- Purpose:
--   Validates that a service can only be added to a booking that is currently
--   in 'Checked-In' status. Prevents staff from accidentally logging services
--   against a future ('Booked') or past ('Checked-Out') booking.
--
--   Also snapshots the service's current base_price into service_usage.unit_price
--   at INSERT time to preserve billing immutability (the same pattern used for
--   booking.rate_at_booking).

-- =============================================================================

-- Implementation below:
CREATE OR REPLACE FUNCTION trg_validate_service_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_booking_status VARCHAR(20);
    v_unit_price     NUMERIC(10,2);
BEGIN
    -- Step 1: Validate booking is currently Checked-In
    SELECT status INTO v_booking_status
    FROM   booking WHERE booking_id = NEW.booking_id;

    IF v_booking_status <> 'Checked-In' THEN
        RAISE EXCEPTION
            'Services can only be added to a Checked-In booking. Current status: %', 
            COALESCE(v_booking_status, 'Not Found');
    END IF;

    -- Step 2: Snapshot the service price if not explicitly provided
    IF NEW.unit_price IS NULL OR NEW.unit_price = 0 THEN
        SELECT base_price INTO v_unit_price
        FROM   service WHERE service_id = NEW.service_id;

        IF v_unit_price IS NULL THEN
            RAISE EXCEPTION 'Service with ID % does not exist', NEW.service_id;
        END IF;

        NEW.unit_price := v_unit_price;
    END IF;

    RETURN NEW;  -- Allow the INSERT to proceed with snapshotted unit_price
END;
$$;

DROP TRIGGER IF EXISTS trg_service_usage ON service_usage;

CREATE TRIGGER trg_service_usage
BEFORE INSERT ON service_usage
FOR EACH ROW
EXECUTE FUNCTION trg_validate_service_usage();
