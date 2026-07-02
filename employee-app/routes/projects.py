"""
routes/projects.py — All API routes for managing projects.

TABLES USED:
    projects        → main table for project data
    project_members → links employees to projects (join table)
    employees       → to validate employee exists when assigning

DATA SCOPING:
    ADMIN/DEPT_HEAD/MANAGER → see all projects
    EMPLOYEE                → see only projects they are a member of
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database import get_db
from db_models import Project, Employee, ProjectMember
from auth import require_permission, get_caller_employee

router = APIRouter()


# ==============================================================================
# ROUTE 1: Create a new project
# FROM: user input (name)
# TO:   projects TABLE (new row)
# ==============================================================================
@router.post("/projects")
def create_project(
    name: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("projects", "create"))
):
    """Creates a new project. Name must be unique."""

    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Project name cannot be empty.")

    try:
        # Check if a project with this name already exists in projects TABLE
        existing_project = db.query(Project).filter(Project.name == name.strip()).first()
        if existing_project:
            raise HTTPException(status_code=400, detail="A project with this name already exists.")

        # Create new row in projects TABLE
        new_project = Project(name=name.strip())
        db.add(new_project)
        db.commit()
        db.refresh(new_project)

        return {
            "message": "Project created successfully!",
            "id": new_project.id,
            "name": new_project.name
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 2: Assign an employee to a project
# FROM: projects TABLE (validate project), employees TABLE (validate employee)
# TO:   project_members TABLE (new row linking them)
# ==============================================================================
@router.put("/projects/{project_id}/assign/{employee_id}")
def assign_to_project(
    project_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("projects", "update"))
):
    """Adds an employee to a project. One employee can be on many projects."""

    try:
        # Find the project in projects TABLE
        project_from_db = db.query(Project).filter(Project.id == project_id).first()
        if not project_from_db:
            raise HTTPException(status_code=404, detail="Project not found.")

        # Find the employee in employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # Check if already assigned in project_members TABLE
        already_assigned = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.employee_id == employee_id
        ).first()

        if already_assigned:
            raise HTTPException(
                status_code=400,
                detail=f"{employee_from_db.name} is already assigned to {project_from_db.name}."
            )

        # Create new row in project_members TABLE
        new_membership = ProjectMember(project_id=project_id, employee_id=employee_id)
        db.add(new_membership)
        db.commit()

        return {"message": f"{employee_from_db.name} assigned to project '{project_from_db.name}'."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 2B: Remove an employee from a project
# FROM: project_members TABLE (find the membership row)
# TO:   project_members TABLE (delete the row)
# ==============================================================================
@router.delete("/projects/{project_id}/remove/{employee_id}")
def remove_from_project(
    project_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("projects", "delete"))
):
    """Removes an employee from a project."""

    try:
        # Find the membership in project_members TABLE
        membership_row = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.employee_id == employee_id
        ).first()

        if not membership_row:
            raise HTTPException(status_code=404, detail="This employee is not assigned to this project.")

        # Delete the row from project_members TABLE
        db.delete(membership_row)
        db.commit()

        return {"message": "Employee removed from project."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 3: Get all members of a project (DATA SCOPED)
# FROM: projects TABLE + project_members TABLE + employees TABLE (joined)
# TO:   API response
# ==============================================================================
@router.get("/projects/{project_id}/members")
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("projects", "read"))
):
    """Returns all employees on a project. EMPLOYEE can only view projects they're on."""

    try:
        # Find the project in projects TABLE
        project_from_db = db.query(Project).filter(Project.id == project_id).first()
        if not project_from_db:
            raise HTTPException(status_code=404, detail="Project not found.")

        # --- Scope check: EMPLOYEE can only view their own projects ---
        callers_role = user["role"]

        if callers_role not in ["HR_ADMIN", "IT_ADMIN", "DEPT_HEAD", "DEPARTMENT HEAD", "DEPARTMENT_HEAD", "MANAGER"]:
            caller_employee = get_caller_employee(user, db)
            if not caller_employee:
                raise HTTPException(status_code=403, detail="No employee profile linked to your account.")

            # Check: is the caller a member of this project? (in project_members TABLE)
            is_caller_on_this_project = db.query(ProjectMember).filter(
                ProjectMember.project_id == project_id,
                ProjectMember.employee_id == caller_employee.id
            ).first()

            if not is_caller_on_this_project:
                raise HTTPException(status_code=403, detail="You can only view projects you are a member of.")

        # Get all members by joining employees TABLE with project_members TABLE
        member_list = (
            db.query(Employee)
            .join(ProjectMember, Employee.id == ProjectMember.employee_id)
            .filter(ProjectMember.project_id == project_id)
            .all()
        )

        # --- Build the response ---
        member_details = []
        for emp in member_list:
            member_details.append({
                "id": emp.id,
                "emp_id": emp.emp_id,
                "name": emp.name,
                "department": emp.department
            })

        return {
            "project": project_from_db.name,
            "members": member_details
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 4: Get all projects (DATA SCOPED)
# FROM: projects TABLE
# TO:   API response
# ==============================================================================
@router.get("/projects")
def get_all_projects(
    db: Session = Depends(get_db),
    user=Depends(require_permission("projects", "read"))
):
    """
    Returns projects:
    - ADMIN/DEPT_HEAD/MANAGER → all projects
    - EMPLOYEE → only projects they are a member of
    """
    callers_role = user["role"]

    try:
        caller_employee = get_caller_employee(user, db)
        is_supervisor = False
        if caller_employee:
            from db_models import DepartmentSupervisor
            is_supervisor = db.query(DepartmentSupervisor).filter(
                DepartmentSupervisor.employee_id == caller_employee.id
            ).first() is not None

        if callers_role in ["HR_ADMIN", "IT_ADMIN", "DEPT_HEAD", "DEPARTMENT HEAD", "DEPARTMENT_HEAD", "MANAGER"] or is_supervisor:
            # See all projects from projects TABLE
            project_list = db.query(Project).all()
        else:
            if not caller_employee:
                raise HTTPException(status_code=403, detail="No employee profile linked to your account.")


            my_id = caller_employee.id
            project_list = (
                db.query(Project)
                .join(ProjectMember, Project.id == ProjectMember.project_id)
                .filter(ProjectMember.employee_id == my_id)
                .all()
            )

        # --- Build the response ---
        result = []
        for proj in project_list:
            result.append({
                "id": proj.id,
                "name": proj.name,
                "member_count": len(proj.members)
            })
        return result

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 5: Delete a project
# FROM: projects TABLE (find project)
# TO:   project_members TABLE (delete all memberships), projects TABLE (delete project)
# ==============================================================================
@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("projects", "delete"))
):
    """Permanently removes a project and all its member assignments."""

    try:
        # Find the project in projects TABLE
        project_from_db = db.query(Project).filter(Project.id == project_id).first()
        if not project_from_db:
            raise HTTPException(status_code=404, detail="Project not found.")

        project_name = project_from_db.name

        # Step 1: Delete all memberships from project_members TABLE
        db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()

        # Step 2: Delete the project from projects TABLE
        db.delete(project_from_db)
        db.commit()

        return {"message": f"Project '{project_name}' has been deleted."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")
