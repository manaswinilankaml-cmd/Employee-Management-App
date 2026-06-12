"""
main.py — The entry point of the Employee Management System.

This file:
1. Creates the FastAPI application
2. Creates all database tables (if they don't exist)
3. Plugs in all the route files (employees, projects, auth, departments, roles, permissions)

To run this app:
    uvicorn main:app --reload

To seed admin accounts and permissions (run ONCE before using the app):
    python seed.py
"""

from fastapi import FastAPI
from database import engine, Base
from db_models import Employee, Project, Account, EmployeeSkill, ProjectMember, Department, Role, RolePermission

from routes.employees import router as employee_router
from routes.projects import router as project_router
from routes.auth_routes import router as auth_router
from routes.departments import router as department_router
from routes.roles import router as roles_router
from routes.permissions import router as permissions_router

# ─── Step 1: Create all database tables if they don't already exist ───────────
Base.metadata.create_all(bind=engine)

# ─── Step 2: Create the FastAPI application ───────────────────────────────────
app = FastAPI(
    title="Employee Management System",
    description="A system to manage employees, projects, and accounts. "
                "HR_ADMIN and IT_ADMIN have full CRUD access by default. "
                "Other roles have database-driven permissions that admins can modify at runtime.",
    version="3.0.0"
)

# ─── Step 3: Plug in all route files ─────────────────────────────────────────
app.include_router(employee_router, tags=["Employees"])
app.include_router(project_router, tags=["Projects"])
app.include_router(auth_router, tags=["Authentication"])
app.include_router(department_router, tags=["Departments"])
app.include_router(roles_router, tags=["Roles"])
app.include_router(permissions_router, tags=["Permissions"])


# ─── A simple health-check route to verify the app is running ─────────────────
@app.get("/", tags=["Health"])
def health_check():
    """
    Returns a simple message to confirm the app is running.
    No authentication required.
    """
    return {
        "status": "running",
        "app": "Employee Management System",
        "version": "3.0.0"
    }
