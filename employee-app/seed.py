"""
seed.py — Seeds the database with initial admin accounts, roles, and permissions.

Run this file ONCE to set up:
1. HR_ADMIN and IT_ADMIN accounts
2. Default roles (HR_ADMIN, IT_ADMIN, EMPLOYEE, MANAGER, DEPT_HEAD)
3. Default CRUD permissions for each role on each resource

Usage:
    python seed.py

After running, you can login with:
    - HR_ADMIN:  username = "hradmin",  password = "Pass@123"
    - IT_ADMIN:  username = "itadmin",  password = "Pass@123"
"""

from database import SessionLocal, engine, Base
from db_models import Account, Role, RolePermission
from utils import hash_password


def seed_admin_accounts():
    """
    Creates the two admin accounts in the database if they don't already exist.
    These admins have full CRUD permissions on everything.
    """

    # Step 1: Create all tables (if they don't exist yet)
    Base.metadata.create_all(bind=engine)

    # Step 2: Open a database session
    db = SessionLocal()

    try:
        # ─── Admin 1: HR_ADMIN ────────────────────────────────────────────────
        existing_hr = db.query(Account).filter(Account.username == "hradmin").first()
        if not existing_hr:
            hr_admin = Account(
                username="hradmin",
                password_hash=hash_password("Pass@123"),
                employee_id=None,
                role="HR_ADMIN",
                is_active=True
            )
            db.add(hr_admin)
            print("✓ HR_ADMIN account created (username: hradmin)")
        else:
            print("- HR_ADMIN account already exists, skipping.")

        # ─── Admin 2: IT_ADMIN ────────────────────────────────────────────────
        existing_it = db.query(Account).filter(Account.username == "itadmin").first()
        if not existing_it:
            it_admin = Account(
                username="itadmin",
                password_hash=hash_password("Pass@123"),
                employee_id=None,
                role="IT_ADMIN",
                is_active=True
            )
            db.add(it_admin)
            print("✓ IT_ADMIN account created (username: itadmin)")
        else:
            print("- IT_ADMIN account already exists, skipping.")

        db.commit()
        print("\nDone! Admin accounts are ready in the database.")

        # ─── Seed Default Roles ──────────────────────────────────────────────
        print("\nSeeding default roles...")
        default_roles = [
            {"name": "HR_ADMIN", "is_system_role": True},
            {"name": "IT_ADMIN", "is_system_role": True},
            {"name": "EMPLOYEE", "is_system_role": True},
            {"name": "MANAGER", "is_system_role": False},
            {"name": "DEPT_HEAD", "is_system_role": False},
        ]

        for role_data in default_roles:
            existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing_role:
                new_role = Role(name=role_data["name"], is_system_role=role_data["is_system_role"])
                db.add(new_role)
                print(f"  ✓ Role '{role_data['name']}' created")
            else:
                print(f"  - Role '{role_data['name']}' already exists, skipping.")

        db.commit()
        print("\nDone! Default roles are ready in the database.")

        # ─── Seed Default Permissions ────────────────────────────────────────
        # Format: [can_create, can_read, can_update, can_delete]
        print("\nSeeding default permissions...")
        default_permissions = {
            "HR_ADMIN":  {"employees": [1,1,1,1], "projects": [1,1,1,1], "accounts": [1,1,1,1], "departments": [1,1,1,1], "roles": [1,1,1,1]},
            "IT_ADMIN":  {"employees": [1,1,1,1], "projects": [1,1,1,1], "accounts": [1,1,1,1], "departments": [1,1,1,1], "roles": [1,1,1,1]},
            "DEPT_HEAD": {"employees": [0,1,0,0], "projects": [0,1,0,0], "accounts": [0,0,0,0], "departments": [0,1,0,0], "roles": [0,1,0,0]},
            "MANAGER":   {"employees": [0,1,0,0], "projects": [0,1,0,0], "accounts": [0,0,0,0], "departments": [0,1,0,0], "roles": [0,1,0,0]},
            "EMPLOYEE":  {"employees": [0,1,0,0], "projects": [0,1,0,0], "accounts": [0,0,0,0], "departments": [0,1,0,0], "roles": [0,1,0,0]},
        }

        for role_name, resources in default_permissions.items():
            for resource_name, flags in resources.items():
                # Check if this permission already exists
                existing_perm = db.query(RolePermission).filter(
                    RolePermission.role_name == role_name,
                    RolePermission.resource == resource_name
                ).first()

                if not existing_perm:
                    new_perm = RolePermission(
                        role_name=role_name,
                        resource=resource_name,
                        can_create=bool(flags[0]),
                        can_read=bool(flags[1]),
                        can_update=bool(flags[2]),
                        can_delete=bool(flags[3])
                    )
                    db.add(new_perm)
                    print(f"  ✓ {role_name} -> {resource_name}: C={flags[0]} R={flags[1]} U={flags[2]} D={flags[3]}")
                else:
                    print(f"  - {role_name} -> {resource_name}: already exists, skipping.")

        db.commit()
        print("\nDone! Default permissions are ready in the database.")

    except Exception as error:
        db.rollback()
        print(f"ERROR: Could not seed data: {error}")

    finally:
        db.close()


# ─── Run this when you execute: python seed.py ────────────────────────────────
if __name__ == "__main__":
    seed_admin_accounts()
