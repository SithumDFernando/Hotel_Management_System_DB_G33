"""
backend/app/routers/guests.py
==============================
Purpose:
    Manages hotel guest profiles (the `guest` table). Receptionists use
    this to register new guests at check-in or look up existing guests when
    creating bookings on their behalf.

Endpoints to implement:
    GET /api/guests
        - Returns a list of all guests (for receptionist dropdown when creating
          a booking).
        - Supports optional query param `search` (name, NIC/passport, email).
        - Access: receptionist, manager, admin.

    GET /api/guests/{guest_id}
        - Returns full profile for a single guest including their booking history.
        - Access: receptionist, manager, admin, or the guest themselves
          (via guest_id on their user_account).

    POST /api/guests
        - Body: GuestCreate schema (full_name, nic_passport, email, phone,
                date_of_birth?, nationality?, gender?, guest_type,
                company_name?, company_reg_number?, billing_contact_name?).
        - Inserts a new guest row. Validates that company_name is present
          when guest_type = 'Corporate'.
        - Access: receptionist, admin.

    PUT /api/guests/{guest_id}
        - Updates an existing guest profile.
        - Access: receptionist, admin.

Database table used:
    guest

Dependencies:
    - app.db            (get_db)
    - app.dependencies  (get_current_user, require_role)
    - app.schemas.guest (GuestCreate, GuestUpdate, GuestOut)
"""

# TODO: Implement guests router
