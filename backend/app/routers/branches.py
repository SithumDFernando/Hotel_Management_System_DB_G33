"""
backend/app/routers/branches.py
================================
Purpose:
    Public, read-only branch directory used by the Home and Rooms pages
    (branch cards, filter dropdowns). The admin-only `/api/admin/branches`
    keeps the management view (stats, manager name, CRUD).

Endpoints:
    GET /api/branches — Public. Minimal branch info, ordered by name.
"""

from fastapi import APIRouter, Depends

from app.db import get_db
from app.schemas.branch import PublicBranch, PublicBranchList

router = APIRouter()



@router.get("", response_model=PublicBranchList)
async def list_public_branches(db=Depends(get_db)):
    """List all branches (public, no stats or staff details)."""
    rows = await db.fetch(
        "SELECT branch_id, name, city, address, phone FROM branch ORDER BY name"
    )
    branches = [
        PublicBranch(
            branch_id=str(r["branch_id"]),
            name=r["name"],
            city=r["city"],
            address=r["address"],
            phone=r["phone"],
        )
        for r in rows
    ]
    return PublicBranchList(branches=branches, total=len(branches))
