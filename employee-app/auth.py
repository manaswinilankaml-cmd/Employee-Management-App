"""
auth.py — Security guard for the application.

This file does 3 things:
1. Creates tokens (sealed ID cards) when someone logs in
2. Reads tokens to verify who is calling the API
3. Checks if the caller has permission to do what they're trying to do

TABLE USED: accounts (to find who the caller is)
TABLE USED: role_permissions (to check if they're allowed)
"""

from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
import os
from dotenv import load_dotenv

from database import get_db

# Read the secret key from the .env file
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "my-super-secret-key-change-in-production")

# Tell FastAPI to expect a "Bearer <token>" header in requests
security = HTTPBearer()


# ─── FUNCTION 1: Create a Token ──────────────────────────────────────────────
def create_token(account_id: int, role: str) -> str:
    """
    Makes a sealed ID card (JWT token) for someone who just logged in.
    The card contains: who they are (account_id) and what they can do (role).
    The card expires after 8 hours.
    """
    what_goes_inside_the_token = {
        "account_id": account_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=8),
    }

    sealed_token = jwt.encode(what_goes_inside_the_token, SECRET_KEY, algorithm="HS256")
    return sealed_token


# ─── FUNCTION 2: Read a Token ────────────────────────────────────────────────
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """
    Opens someone's sealed ID card (token) and reads what's inside.
    Returns: {"account_id": 1, "role": "HR_ADMIN"}
    If the card is expired or fake, we reject them.
    Checks the database to make sure the account is active.
    """
    the_token = credentials.credentials

    try:
        info_inside_token = jwt.decode(the_token, SECRET_KEY, algorithms=["HS256"])
        
        from db_models import Account
        account_id = info_inside_token.get("account_id")
        account_from_db = db.query(Account).filter(Account.id == account_id).first()
        
        if not account_from_db or not account_from_db.is_active:
            raise HTTPException(
                status_code=401,
                detail="Account is deactivated or does not exist. Please contact admin."
            )
            
        return info_inside_token

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please login again.")

    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token. Please login again.")


# ─── FUNCTION 3: Check Role (hardcoded — only for permissions routes) ────────
def require_role(allowed_roles: list[str]):
    """
    Simple gate: only lets specific roles through.
    Used ONLY for the /permissions routes (to avoid a chicken-and-egg problem).

    Example: require_role(["HR_ADMIN", "IT_ADMIN"])
    """
    def check_if_role_is_allowed(user=Depends(get_current_user)):

        callers_role = user["role"]

        if callers_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Your role '{callers_role}' is not allowed. "
                       f"Required roles: {allowed_roles}"
            )

        return user

    return check_if_role_is_allowed


# ─── FUNCTION 4: Check Permission (database-driven — for all other routes) ───
def require_permission(resource: str, action: str):
    """
    Checks the role_permissions TABLE in the database to see if the caller
    is allowed to perform this action on this resource.

    - resource: "employees", "projects", "accounts", "departments", or "roles"
    - action: "create", "read", "update", or "delete"

    Example: require_permission("employees", "create")
    → Goes to role_permissions table
    → Finds the row where role_name = caller's role AND resource = "employees"
    → Checks if can_create = True
    → If True: allow. If False: block with 403.
    """
    def check_if_action_is_allowed(user=Depends(get_current_user), db: Session = Depends(get_db)):

        from db_models import RolePermission

        callers_role = user["role"]

        # STEP 1: Go to the role_permissions TABLE and find this role's permissions
        permission_row = db.query(RolePermission).filter(
            RolePermission.role_name == callers_role,
            RolePermission.resource == resource
        ).first()

        # STEP 2: If no permission row exists, deny access
        if not permission_row:
            raise HTTPException(
                status_code=403,
                detail=f"No permissions configured for role '{callers_role}' on '{resource}'. "
                       f"Ask an admin to set up permissions via /permissions."
            )

        # STEP 3: Check the specific action flag (create/read/update/delete)
        is_create_allowed = permission_row.can_create
        is_read_allowed = permission_row.can_read
        is_update_allowed = permission_row.can_update
        is_delete_allowed = permission_row.can_delete

        action_is_allowed = {
            "create": is_create_allowed,
            "read": is_read_allowed,
            "update": is_update_allowed,
            "delete": is_delete_allowed,
        }

        # STEP 4: If the action is not allowed, block with 403
        if not action_is_allowed.get(action, False):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Your role '{callers_role}' cannot {action} {resource}."
            )

        # STEP 5: If allowed, return the user info so the route can use it
        return user

    return check_if_action_is_allowed


# ─── FUNCTION 5: Find out which Employee is calling the API ──────────────────
def get_caller_employee(user: dict, db: Session):
    """
    Given the caller's token info, finds their Employee record.

    HOW IT WORKS:
    1. Takes the account_id from the token
    2. Goes to the accounts TABLE → finds the account
    3. Gets the employee_id from that account
    4. Goes to the employees TABLE → returns the Employee object

    Returns None if the caller is a standalone admin (no linked employee).
    """
    from db_models import Account

    # Step 1: Get the account_id from the token
    callers_account_id = user["account_id"]

    # Step 2: Find this account in the accounts TABLE
    callers_account = db.query(Account).filter(Account.id == callers_account_id).first()

    # Step 3: If no account found, or no employee linked, return None
    if not callers_account:
        return None

    if not callers_account.employee_id:
        return None

    # Step 4: Return the linked Employee object (from employees TABLE)
    callers_employee_profile = callers_account.employee
    return callers_employee_profile
