"""
routes/roles.py — API routes for managing roles.

TABLE USED: roles (create, read, delete rows)
TABLE CHECKED: employees, accounts (before deleting, to make sure no one uses the role)
TABLE UPDATED: role_permissions (auto-seed permissions for new roles, delete when role deleted)
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database import get_db
from db_models import Role, Employee, Account, RolePermission
from auth import require_permission

router = APIRouter()


# ==============================================================================
# ROUTE 1: Create a role
# FROM: user input (name)
# TO:   roles TABLE (new row), role_permissions TABLE (5 new rows with read-only defaults)
# ==============================================================================
@router.post("/roles")
def create_role(
    name: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("roles", "create"))
):
    """Creates a new role and auto-seeds it with read-only permissions on all resources."""

    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Role name cannot be empty.")

    role_name = name.strip().upper()

    try:
        # Check if this role already exists in roles TABLE
        existing_role = db.query(Role).filter(Role.name == role_name).first()
        if existing_role:
            raise HTTPException(status_code=400, detail="This role already exists.")

        # Create new row in roles TABLE
        new_role = Role(name=role_name, is_system_role=False)
        db.add(new_role)

        # Auto-seed: create 5 permission rows in role_permissions TABLE (one per resource)
        all_resources = ["employees", "projects", "accounts", "departments", "roles"]

        for resource_name in all_resources:
            new_permission_row = RolePermission(
                role_name=role_name,
                resource=resource_name,
                can_create=False,
                can_read=True,
                can_update=False,
                can_delete=False
            )
            db.add(new_permission_row)

        db.commit()
        db.refresh(new_role)

        return {
            "message": f"Role '{role_name}' created with default read-only permissions.",
            "id": new_role.id,
            "name": new_role.name
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 2: List all roles
# FROM: roles TABLE
# TO:   API response
# ==============================================================================
@router.get("/roles")
def get_all_roles(
    db: Session = Depends(get_db),
    user=Depends(require_permission("roles", "read"))
):
    """Returns all roles."""

    try:
        # Get all rows from roles TABLE
        all_roles = db.query(Role).all()

        result = []
        for each_role in all_roles:
            result.append({
                "id": each_role.id,
                "name": each_role.name,
                "is_system_role": each_role.is_system_role
            })

        return result

    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 3: Delete a role
# FROM: roles TABLE (find role), employees TABLE + accounts TABLE (check usage)
# TO:   role_permissions TABLE (delete permission rows), roles TABLE (delete role)
# ==============================================================================
@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("roles", "delete"))
):
    """
    Deletes a role and its permission entries.
    Cannot delete system roles (HR_ADMIN, IT_ADMIN).
    Cannot delete if employees or accounts are still using this role.
    """

    try:
        # Find the role in roles TABLE
        role_from_db = db.query(Role).filter(Role.id == role_id).first()
        if not role_from_db:
            raise HTTPException(status_code=404, detail="Role not found.")

        # System roles cannot be deleted
        if role_from_db.is_system_role:
            raise HTTPException(status_code=403, detail=f"Cannot delete system role '{role_from_db.name}'.")

        # Check: are any employees using this role? (employees TABLE)
        employees_using_this_role = db.query(Employee).filter(Employee.role == role_from_db.name).count()

        # Check: are any accounts using this role? (accounts TABLE)
        accounts_using_this_role = db.query(Account).filter(Account.role == role_from_db.name).count()

        if employees_using_this_role > 0 or accounts_using_this_role > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete: {employees_using_this_role} employee(s) and "
                       f"{accounts_using_this_role} account(s) use role '{role_from_db.name}'. "
                       f"Reassign them first."
            )

        role_name = role_from_db.name

        # Step 1: Delete all permission rows for this role from role_permissions TABLE
        db.query(RolePermission).filter(RolePermission.role_name == role_name).delete()

        # Step 2: Delete the role from roles TABLE
        db.delete(role_from_db)
        db.commit()

        return {"message": f"Role '{role_name}' and its permissions have been deleted."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 4: Update a role name
# FROM: roles TABLE (find role)
# TO:   roles TABLE (update name)
# ==============================================================================
@router.put("/roles/{role_id}")
def update_role_name(
    role_id: int,
    new_name: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("roles", "update"))
):
    """
    Updates a role's name.
    CASCADE: Automatically updates all employees, accounts, and permissions using this role.
    """

    if not new_name or not new_name.strip():
        raise HTTPException(status_code=400, detail="Role name cannot be empty.")

    new_role_name = new_name.strip().upper()

    try:
        # Find the role in roles TABLE
        role_from_db = db.query(Role).filter(Role.id == role_id).first()
        if not role_from_db:
            raise HTTPException(status_code=404, detail="Role not found.")

        # System roles cannot be renamed
        if role_from_db.is_system_role:
            raise HTTPException(status_code=403, detail=f"Cannot rename system role '{role_from_db.name}'.")

        # Check if the new name is already taken
        if db.query(Role).filter(Role.name == new_role_name).first():
            raise HTTPException(status_code=400, detail="This role name is already taken.")

        # Update the name
        role_from_db.name = new_role_name
        db.commit()
        db.refresh(role_from_db)

        return {
            "message": "Role updated successfully!",
            "id": role_from_db.id,
            "name": role_from_db.name
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")
