"""
backend/app/schemas/guest.py
=============================
Purpose:
    Pydantic models for guest-related request validation and response
    serialisation. These are used by `routers/guests.py` to validate
    incoming JSON and shape API responses.

Models to implement:

    class GuestBase(BaseModel):
        \"\"\"Shared fields for create and update.\"\"\"
        full_name:            str
        nic_passport:         str
        email:                str
        phone:                str
        date_of_birth:        date | None = None
        nationality:          str | None = None
        gender:               str | None = None
        guest_type:           Literal["Individual", "Corporate"] = "Individual"
        company_name:         str | None = None
        company_reg_number:   str | None = None
        billing_contact_name: str | None = None

        @model_validator(mode="after")
        def corporate_must_have_company(self):
            if self.guest_type == "Corporate" and not self.company_name:
                raise ValueError("company_name is required for Corporate guests")
            return self

    class GuestCreate(GuestBase):
        pass  # All fields for creation

    class GuestUpdate(GuestBase):
        \"\"\"All fields optional for partial updates (use Optional[...]).\"\"\"
        full_name: str | None = None
        nic_passport: str | None = None
        # ... all fields optional

    class GuestOut(GuestBase):
        \"\"\"Response model — adds the DB-generated guest_id.\"\"\"
        guest_id: UUID

        class Config:
            from_attributes = True  # Allows mapping from asyncpg Record objects

Database table mapped:
    guest
"""

# TODO: Implement guest schemas
