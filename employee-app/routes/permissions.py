"""
routes/permissions.py — API routes for managing CRUD permissions.

TABLE USED: role_permissions (read, update rows)
TABLE CHECKED: roles (to validate role exists)

Only HR_ADMIN and IT_ADMIN can access these routes.
Uses require_role() (hardcoded) instead of require_permission()
to avoid a chicken-and-egg problem.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database import get_db
from db_models import RolePermission, Role
from auth import require_role

router = APIRouter()

ADMIN_ONLY = ["HR_ADMIN", "IT_ADMIN"]


# ==============================================================================
# ROUTE 1: List all permissions
# FROM: role_permissions TABLE
# TO:   API response
# ==============================================================================
@router.get("/permissions")
def get_all_permissions(
    db: Session = Depends(get_db),
    user=Depends(require_role(ADMIN_ONLY))
):
    """Returns all role-permission rows (the full CRUD matrix)."""

    try:
        # Get all rows from role_permissions TABLE, sorted by role then resource
        all_permissions = db.query(RolePermission).order_by(
            RolePermission.role_name,
            RolePermission.resource
        ).all()

        result = []
        for perm in all_permissions:
            result.append({
                "id": perm.id,
                "role_name": perm.role_name,
                "resource": perm.resource,
                "can_create": perm.can_create,
                "can_read": perm.can_read,
                "can_update": perm.can_update,
                "can_delete": perm.can_delete
            })

        return result

    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 2: Get permissions for one role
# FROM: roles TABLE (validate role), role_permissions TABLE (get permissions)
# TO:   API response
# ==============================================================================
@router.get("/permissions/{role_name}")
def get_role_permissions(
    role_name: str,
    db: Session = Depends(get_db),
    user=Depends(require_role(ADMIN_ONLY))
):
    """Returns CRUD permissions for one specific role across all resources."""

    try:
        # Check: does this role exist in roles TABLE?
        role_from_db = db.query(Role).filter(Role.name == role_name).first()
        if not role_from_db:
            raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found.")

        # Get all permission rows for this role from role_permissions TABLE
        permissions_for_role = db.query(RolePermission).filter(
            RolePermission.role_name == role_name
        ).all()

        if not permissions_for_role:
            raise HTTPException(
                status_code=404,
                detail=f"No permissions found for role '{role_name}'. Run seed.py first."
            )

        # --- Build the response ---
        permission_details = []
        for perm in permissions_for_role:
            permission_details.append({
                "resource": perm.resource,
                "can_create": perm.can_create,
                "can_read": perm.can_read,
                "can_update": perm.can_update,
                "can_delete": perm.can_delete
            })

        return {
            "role": role_name,
            "permissions": permission_details
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 3: Update permissions for a role + resource
# FROM: role_permissions TABLE (find the row)
# TO:   role_permissions TABLE (update the CRUD flags)
# ==============================================================================
@router.put("/permissions/{role_name}/{resource}")
def update_permission(
    role_name: str,
    resource: str,
    can_create: bool = Query(None, description="Allow creating? True/False"),
    can_read: bool = Query(None, description="Allow reading? True/False"),
    can_update: bool = Query(None, description="Allow updating? True/False"),
    can_delete: bool = Query(None, description="Allow deleting? True/False"),
    db: Session = Depends(get_db),
    user=Depends(require_role(ADMIN_ONLY))
):
    """
    Updates CRUD flags for a specific role + resource.
    Only the flags you provide will change. Others stay the same.

    Example: PUT /permissions/MANAGER/employees?can_update=true
    → Goes to role_permissions TABLE
    → Finds the row WHERE role_name = MANAGER AND resource = employees
    → Sets can_update = True
    """

    # Validate resource name
    valid_resources = ["employees", "projects", "accounts", "departments", "roles"]
    if resource not in valid_resources:
        raise HTTPException(status_code=400, detail=f"Invalid resource. Must be one of: {valid_resources}")

    # Admin permissions cannot be changed (they always have full access)
    if role_name in ["HR_ADMIN", "IT_ADMIN"]:
        raise HTTPException(status_code=403, detail="Cannot modify admin permissions. They always have full access.")

    try:
        # Find the permission row in role_permissions TABLE
        permission_row = db.query(RolePermission).filter(
            RolePermission.role_name == role_name,
            RolePermission.resource == resource
        ).first()

        if not permission_row:
            # Row doesn't exist — check if the role exists first
            role_from_db = db.query(Role).filter(Role.name == role_name).first()
            if not role_from_db:
                raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found.")

            # Create a new permission row in role_permissions TABLE
            permission_row = RolePermission(
                role_name=role_name,
                resource=resource,
                can_create=can_create if can_create is not None else False,
                can_read=can_read if can_read is not None else False,
                can_update=can_update if can_update is not None else False,
                can_delete=can_delete if can_delete is not None else False
            )
            db.add(permission_row)

        else:
            # Update only the flags that were provided
            if can_create is not None:
                permission_row.can_create = can_create

            if can_read is not None:
                permission_row.can_read = can_read

            if can_update is not None:
                permission_row.can_update = can_update

            if can_delete is not None:
                permission_row.can_delete = can_delete

        db.commit()
        db.refresh(permission_row)

        return {
            "message": f"Permissions updated for {role_name} on {resource}.",
            "role_name": permission_row.role_name,
            "resource": permission_row.resource,
            "can_create": permission_row.can_create,
            "can_read": permission_row.can_read,
            "can_update": permission_row.can_update,
            "can_delete": permission_row.can_delete
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")
