"""
backend/app/routers/admin.py
=============================
Purpose:
    System-wide administration endpoints accessible only to users with the
    `admin` role. Covers branch management and user account management.
    These are used by the `AdminDashboard` frontend page.
    
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.auth import hash_password
from app.db import get_db
from app.dependencies import require_role

router = APIRouter()


# =============================================================================
# Pydantic Request / Response Models
# =============================================================================

# -- Branch -------------------------------------------------------------------

class BranchCreate(BaseModel):
    name: str
    city: str
    address: str
    phone: str
    manager_name: str


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    manager_name: Optional[str] = None


class BranchOut(BaseModel):
    branch_id: str
    name: str
    city: str
    address: str
    phone: str
    manager_name: str
    total_rooms: int
    active_bookings: int


class BranchListResponse(BaseModel):
    branches: list[BranchOut]
    total: int


# -- User Account -------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str                        # 'admin' | 'manager' | 'receptionist' | 'guest'
    branch_id: Optional[str] = None
    guest_id: Optional[str] = None


class UserPatch(BaseModel):
    role: Optional[str] = None
    branch_id: Optional[str] = None


class UserOut(BaseModel):
    account_id: str
    email: str
    role: str
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    guest_id: Optional[str] = None
    guest_name: Optional[str] = None


class UserListResponse(BaseModel):
    users: list[UserOut]
    total: int


# =============================================================================
# Branch Endpoints
# =============================================================================

# -- GET /api/admin/branches --------------------------------------------------

@router.get("/branches", response_model=BranchListResponse)
async def list_branches( db=Depends(get_db), _user=Depends(require_role("admin")) ):

    """
    List all hotel branches with basic stats (total rooms, active bookings).
    Access: admin only.
    """
    rows = await db.fetch(
        """
        SELECT
            b.branch_id,
            b.name,
            b.city,
            b.address,
            b.phone,
            b.manager_name,
            COUNT(DISTINCT r.room_id) AS total_rooms,
            COUNT(DISTINCT bk.booking_id)
                FILTER (WHERE bk.status IN ('Booked', 'Checked-In')) AS active_bookings
        FROM branch b
        LEFT JOIN room r ON r.branch_id = b.branch_id
        LEFT JOIN booking bk ON bk.room_id = r.room_id
        GROUP BY b.branch_id
        ORDER BY b.name
        """
    )

    branches = [
        BranchOut(
            branch_id=str(row["branch_id"]),
            name=row["name"],
            city=row["city"],
            address=row["address"],
            phone=row["phone"],
            manager_name=row["manager_name"],
            total_rooms=row["total_rooms"],
            active_bookings=row["active_bookings"],
        )
        for row in rows
    ]

    return BranchListResponse(branches=branches, total=len(branches))



# -- POST /api/admin/branches -------------------------------------------------

@router.post("/branches", status_code=status.HTTP_201_CREATED)
async def create_branch(
    body: BranchCreate,
    db=Depends(get_db),
    _user=Depends(require_role("admin")),
):
    """
    Create a new hotel branch.
    Returns 409 if a branch with the same name already exists.
    Access: admin only.
    """
    existing = await db.fetchrow(
        "SELECT branch_id FROM branch WHERE name = $1",
        body.name,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A branch named '{body.name}' already exists.",
        )

    row = await db.fetchrow(
        """
        INSERT INTO branch (name, city, address, phone, manager_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING branch_id
        """,
        body.name,
        body.city,
        body.address,
        body.phone,
        body.manager_name,
    )

    return {"branch_id": str(row["branch_id"])}


# -- PUT /api/admin/branches/{branch_id} --------------------------------------

@router.put("/branches/{branch_id}")
async def update_branch(
    branch_id: str,
    body: BranchUpdate,
    db=Depends(get_db),
    _user=Depends(require_role("admin")),
):
    """
    Partially update an existing branch (only supplied fields are changed).
    Returns 404 if the branch does not exist.
    Returns 400 if no fields are supplied.
    Access: admin only.
    """
    existing = await db.fetchrow(
        "SELECT * FROM branch WHERE branch_id = $1::UUID",
        branch_id,
    )
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Branch {branch_id} not found.",
        )

    # Only override fields that were explicitly provided
    updated = dict(existing)
    changed = []

    if body.name is not None:
        updated["name"] = body.name
        changed.append("name")
    if body.city is not None:
        updated["city"] = body.city
        changed.append("city")
    if body.address is not None:
        updated["address"] = body.address
        changed.append("address")
    if body.phone is not None:
        updated["phone"] = body.phone
        changed.append("phone")
    if body.manager_name is not None:
        updated["manager_name"] = body.manager_name
        changed.append("manager_name")

    if not changed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    await db.execute(
        """
        UPDATE branch
        SET name = $1, city = $2, address = $3, phone = $4, manager_name = $5
        WHERE branch_id = $6::UUID
        """,
        updated["name"],
        updated["city"],
        updated["address"],
        updated["phone"],
        updated["manager_name"],
        branch_id,
    )

    return {"branch_id": branch_id, "updated_fields": changed}


# =============================================================================
# User Account Endpoints
# =============================================================================

VALID_ROLES = {"admin", "manager", "receptionist", "guest"}


# -- GET /api/admin/users -----------------------------------------------------

@router.get("/users", response_model=UserListResponse)
async def list_users(
    db=Depends(get_db),
    _user=Depends(require_role("admin")),
):
    """
    List all user_account rows with joined branch name and guest full name.
    Access: admin only.
    """
    rows = await db.fetch(
        """
        SELECT
            ua.account_id,
            ua.email,
            ua.role,
            ua.branch_id,
            b.name AS branch_name,
            ua.guest_id,
            g.full_name AS guest_name
        FROM user_account ua
        LEFT JOIN branch b ON b.branch_id = ua.branch_id
        LEFT JOIN guest g ON g.guest_id = ua.guest_id
        ORDER BY ua.role, ua.email
        """
    )

    users = [
        UserOut(
            account_id=str(row["account_id"]),
            email=row["email"],
            role=row["role"],
            branch_id=str(row["branch_id"]) if row["branch_id"] else None,
            branch_name=row["branch_name"],
            guest_id=str(row["guest_id"]) if row["guest_id"] else None,
            guest_name=row["guest_name"],
        )
        for row in rows
    ]

    return UserListResponse(users=users, total=len(users))


# -- POST /api/admin/users ----------------------------------------------------

@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db=Depends(get_db),
    _user=Depends(require_role("admin")),
):
    """
    Create a new staff or admin user account.
    The plaintext password is hashed with bcrypt before storage.
    Access: admin only.
    Returns: { account_id }
    """
    
    # Validate role value against DB enum
    if body.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{body.role}'. Must be one of: {', '.join(sorted(VALID_ROLES))}",
        )

    # Email must be unique across all accounts
    existing = await db.fetchrow(
        "SELECT account_id FROM user_account WHERE email = $1",
        body.email,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{body.email}' already exists.",
        )

    # Validate branch_id FK if provided
    if body.branch_id:
        branch = await db.fetchrow(
            "SELECT branch_id FROM branch WHERE branch_id = $1::UUID",
            body.branch_id,
        )
        if branch is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Branch {body.branch_id} not found.",
            )

    # Validate guest_id FK if provided
    if body.guest_id:
        guest = await db.fetchrow(
            "SELECT guest_id FROM guest WHERE guest_id = $1::UUID",
            body.guest_id,
        )
        if guest is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Guest {body.guest_id} not found.",
            )

    # Hash the plaintext password before persisting
    hashed = hash_password(body.password)

    row = await db.fetchrow(
        """
        INSERT INTO user_account (guest_id, branch_id, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5::user_role)
        RETURNING account_id
        """,
        body.guest_id or None,
        body.branch_id or None,
        body.email,
        hashed,
        body.role,
    )

    return {"account_id": str(row["account_id"])}


# -- PATCH /api/admin/users/{account_id} --------------------------------------

@router.patch("/users/{account_id}")
async def patch_user(
    account_id: str,
    body: UserPatch,
    db=Depends(get_db),
    _user=Depends(require_role("admin")),
):
    """
    Update a user's role and/or branch assignment.
    Only supplied (non-None) fields are changed.
    Pass branch_id as an empty string to clear the branch assignment.
    Access: admin only.
    """
    existing = await db.fetchrow(
        "SELECT account_id, role, branch_id FROM user_account WHERE account_id = $1::UUID",
        account_id,
    )
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User account {account_id} not found.",
        )

    new_role = existing["role"]
    new_branch_id = existing["branch_id"]
    changed = []

    if body.role is not None:
        if body.role not in VALID_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{body.role}'. Must be one of: {', '.join(sorted(VALID_ROLES))}",
            )
        new_role = body.role
        changed.append("role")

    if body.branch_id is not None:
        # Empty string means "clear the branch assignment"
        if body.branch_id.strip() == "":
            new_branch_id = None
            changed.append("branch_id")
        else:
            branch = await db.fetchrow(
                "SELECT branch_id FROM branch WHERE branch_id = $1::UUID",
                body.branch_id,
            )
            if branch is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Branch {body.branch_id} not found.",
                )
            new_branch_id = body.branch_id
            changed.append("branch_id")

    if not changed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    await db.execute(
        """
        UPDATE user_account
        SET role = $1::user_role, branch_id = $2
        WHERE account_id = $3::UUID
        """,
        new_role,
        new_branch_id,
        account_id,
    )

    return {"account_id": account_id, "updated_fields": changed}




    



