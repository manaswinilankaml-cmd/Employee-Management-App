"""
routes/auth_routes.py — API routes for login and account management.

TABLES USED:
    accounts  → stores login credentials (username, hashed password, role)
    employees → to find the employee when creating an account
    roles     → to validate the role exists

Password and username are sent in the REQUEST BODY (not in the URL).
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database import get_db
from db_models import Account, Employee, Role
from auth import require_permission, create_token, get_current_user, SECRET_KEY
from utils import hash_password, verify_password

router = APIRouter()


# ==============================================================================
# ROUTE 1: Create an account for an employee
# FROM: employees TABLE (find employee), roles TABLE (validate role)
# TO:   accounts TABLE (new row), employees TABLE (sync role column)
# ==============================================================================
@router.post("/auth/create-account/{employee_id}")
def create_account(
    employee_id: int,
    username: str = Body(),
    password: str = Body(),
    role: str = Body(),
    db: Session = Depends(get_db),
    user=Depends(require_permission("accounts", "create"))
):
    """
    Creates a login account for an existing employee.
    Admin accounts (HR_ADMIN, IT_ADMIN) are created via seed.py, not here.
    """

    # --- Validation ---

    # Can't assign admin roles through this route
    system_admin_roles = ["HR_ADMIN", "IT_ADMIN"]
    if role in system_admin_roles:
        raise HTTPException(status_code=400, detail="Admin accounts are created via seed.py, not this route.")

    # Check: does this role exist in the roles TABLE?
    role_from_db = db.query(Role).filter(Role.name == role).first()
    if not role_from_db:
        non_admin_roles = db.query(Role).filter(Role.name.notin_(system_admin_roles)).all()
        available_role_names = [r.name for r in non_admin_roles]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {available_role_names}. "
                   f"Create new roles via POST /roles."
        )

    if not username or not username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty.")

    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    try:
        # Step 1: Find the employee in employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # Step 2: Check if this employee already has an account in accounts TABLE
        existing_account = db.query(Account).filter(Account.employee_id == employee_id).first()
        if existing_account:
            raise HTTPException(status_code=400, detail="This employee already has an account.")

        # Step 3: Check if username is already taken in accounts TABLE
        username_taken = db.query(Account).filter(func.lower(Account.username) == username.strip().lower()).first()
        if username_taken:
            raise HTTPException(status_code=400, detail="Username already exists. Pick another one.")

        # Step 4: Create new row in accounts TABLE
        scrambled_password = hash_password(password)

        new_account = Account(
            username=username.strip(),
            password_hash=scrambled_password,
            employee_id=employee_id,
            role=role,
            is_active=True
        )
        db.add(new_account)

        # Step 5: Sync the role column in employees TABLE
        employee_from_db.role = role

        db.commit()
        db.refresh(new_account)

        return {
            "message": f"Account created for {employee_from_db.name}.",
            "username": new_account.username,
            "role": new_account.role,
            "is_active": new_account.is_active
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 2: Login (NO authentication required)
# FROM: accounts TABLE (find account, check password)
# TO:   API response (JWT token)
# ==============================================================================
@router.post("/auth/login")
def login(
    username: str = Body(),
    password: str = Body(),
    db: Session = Depends(get_db)
):
    """
    Verifies username + password, then returns a JWT token.
    Works for both admin and employee accounts.
    """
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    try:
        # Step 1: Find the account by username in accounts TABLE
        account_from_db = db.query(Account).filter(func.lower(Account.username) == username.strip().lower()).first()

        # Step 2: Check if account exists and password matches
        if not account_from_db:
            raise HTTPException(status_code=401, detail="Invalid username or password.")

        if not verify_password(password, account_from_db.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password.")

        # Step 3: Check if account is active
        if not account_from_db.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated. Contact admin.")

        # Step 4: Create a token and return it
        token = create_token(account_from_db.id, account_from_db.role)

        # Get readable emp_id if employee profile is linked
        emp_id = None
        if account_from_db.employee:
            emp_id = account_from_db.employee.emp_id

        return {
            "message": "Login successful!",
            "token": token,
            "role": account_from_db.role,
            "employee_id": account_from_db.employee_id,
            "emp_id": emp_id,
            "username": account_from_db.username
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 3: Deactivate an account
# FROM: accounts TABLE (find account)
# TO:   accounts TABLE (set is_active = False)
# ==============================================================================
@router.put("/auth/deactivate/{account_id}")
def deactivate_account(
    account_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("accounts", "update"))
):
    """Deactivates an account so the user can no longer login."""

    try:
        # Find the account in accounts TABLE
        account_from_db = db.query(Account).filter(Account.id == account_id).first()
        if not account_from_db:
            raise HTTPException(status_code=404, detail="Account not found.")

        # Can't deactivate admin accounts
        if account_from_db.role in ["HR_ADMIN", "IT_ADMIN"]:
            raise HTTPException(status_code=403, detail="Cannot deactivate admin accounts.")

        # Set is_active = False in accounts TABLE
        account_from_db.is_active = False
        db.commit()

        return {"message": f"Account '{account_from_db.username}' has been deactivated."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 4: List all accounts
# FROM: accounts TABLE
# TO:   API response
# ==============================================================================
@router.get("/auth/accounts")
def get_all_accounts(
    db: Session = Depends(get_db),
    user=Depends(require_permission("accounts", "read"))
):
    """Returns all accounts. Useful to find account IDs for deactivation."""

    try:
        # Get all rows from accounts TABLE
        all_accounts = db.query(Account).all()

        result = []
        for acc in all_accounts:
            result.append({
                "id": acc.id,
                "username": acc.username,
                "role": acc.role,
                "employee_id": acc.employee_id,
                "is_active": acc.is_active
            })

        return result

    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 5: Reactivate an account
# FROM: accounts TABLE (find account)
# TO:   accounts TABLE (set is_active = True)
# ==============================================================================
@router.put("/auth/reactivate/{account_id}")
def reactivate_account(
    account_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("accounts", "update"))
):
    """Reactivates a deactivated account so the user can login again."""

    try:
        # Find the account in accounts TABLE
        account_from_db = db.query(Account).filter(Account.id == account_id).first()
        if not account_from_db:
            raise HTTPException(status_code=404, detail="Account not found.")

        if account_from_db.is_active:
            raise HTTPException(status_code=400, detail="Account is already active.")

        # Set is_active = True in accounts TABLE
        account_from_db.is_active = True
        db.commit()

        return {"message": f"Account '{account_from_db.username}' has been reactivated."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 6: Change own password (authenticated user)
# FROM: current_password, new_password
# TO:   accounts TABLE (update password_hash)
# ==============================================================================
@router.post("/auth/change-password")
def change_password(
    current_password: str = Body(),
    new_password: str = Body(),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Allows any logged-in user to change their own password."""
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current password and new password are required.")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        
    try:
        account_id = user["account_id"]
        account_from_db = db.query(Account).filter(Account.id == account_id).first()
        
        if not account_from_db:
            raise HTTPException(status_code=404, detail="Account not found.")
            
        if not verify_password(current_password, account_from_db.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect current password.")
            
        account_from_db.password_hash = hash_password(new_password)
        db.commit()
        
        return {"message": "Password changed successfully."}
        
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 7: Admin resets a user's password (authenticated admin)
# FROM: new_password
# TO:   accounts TABLE (update password_hash)
# ==============================================================================
@router.put("/auth/admin-reset-password/{account_id}")
def admin_reset_password(
    account_id: int,
    new_password: str = Body(default=None),
    new_username: str = Body(default=None),
    db: Session = Depends(get_db),
    user=Depends(require_permission("accounts", "update"))
):
    """Allows an administrator (with update accounts permission) to reset a user's password and/or change their username."""
    if not new_password and not new_username:
        raise HTTPException(status_code=400, detail="Either new password or new username must be provided.")
        
    try:
        account_from_db = db.query(Account).filter(Account.id == account_id).first()
        if not account_from_db:
            raise HTTPException(status_code=404, detail="Account not found.")

        updated_fields = []

        # Handle username update
        if new_username is not None:
            username_cleaned = new_username.strip()
            if not username_cleaned:
                raise HTTPException(status_code=400, detail="Username cannot be empty.")
                
            # Check uniqueness
            existing_user = db.query(Account).filter(
                func.lower(Account.username) == username_cleaned.lower(),
                Account.id != account_id
            ).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Username already exists. Pick another one.")
                
            account_from_db.username = username_cleaned
            updated_fields.append("username")

        # Handle password update
        if new_password is not None:
            if len(new_password) < 6:
                raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
            account_from_db.password_hash = hash_password(new_password)
            updated_fields.append("password")

        db.commit()
        db.refresh(account_from_db)
        
        fields_str = " and ".join(updated_fields)
        return {"message": f"Account details ({fields_str}) for user '{account_from_db.username}' updated successfully."}
        
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")



# ==============================================================================
# ROUTE 8: Forgot password (unauthenticated flow)
# FROM: username, emp_id (or admin_secret for standalone accounts), new_password
# TO:   accounts TABLE (update password_hash)
# ==============================================================================
@router.post("/auth/forgot-password")
def forgot_password(
    username: str = Body(),
    emp_id: str = Body(default=None),
    admin_secret: str = Body(default=None),
    new_password: str = Body(),
    db: Session = Depends(get_db)
):
    """Allows resetting a password if credentials can be verified without logging in."""
    if not username or not new_password:
        raise HTTPException(status_code=400, detail="Username and new password are required.")
        
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        
    try:
        # Find the account by username (case-insensitive)
        account_from_db = db.query(Account).filter(func.lower(Account.username) == username.strip().lower()).first()
        if not account_from_db:
            raise HTTPException(status_code=404, detail="Username not found.")
            
        if not account_from_db.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated. Cannot reset password.")
            
        # If it is a standalone admin account (no employee linked)
        if account_from_db.employee_id is None:
            # Requires admin secret from env
            if not admin_secret or admin_secret != SECRET_KEY:
                raise HTTPException(
                    status_code=400, 
                    detail="For standalone admin accounts, a valid Admin Security Key is required to reset password."
                )
        else:
            # For standard employees, verify their Employee ID
            if not emp_id or not emp_id.strip():
                raise HTTPException(status_code=400, detail="Employee ID is required to verify your identity.")
                
            employee = account_from_db.employee
            if not employee or employee.emp_id.strip().lower() != emp_id.strip().lower():
                raise HTTPException(status_code=400, detail="Identity verification failed. Employee ID does not match.")
                
        # If verification passes, update password
        account_from_db.password_hash = hash_password(new_password)
        db.commit()
        
        return {"message": "Password reset successfully. You can now login with your new password."}
        
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")
