"""
routes/departments.py — API routes for managing departments.

TABLE USED: departments (create, read, delete rows)
TABLE CHECKED: employees (before deleting, to make sure no one is in that department)
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database import get_db
from db_models import Department, Employee, DepartmentSupervisor
from auth import require_permission


router = APIRouter()


# ==============================================================================
# ROUTE 1: Create a department
# FROM: user input (name)
# TO:   departments TABLE (new row)
# ==============================================================================
@router.post("/departments")
def create_department(
    name: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("departments", "create"))
):
    """Creates a new department. Name must be unique."""

    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Department name cannot be empty.")

    try:
        # Check if this department already exists in departments TABLE
        existing_department = db.query(Department).filter(Department.name == name.strip()).first()
        if existing_department:
            raise HTTPException(status_code=400, detail="This department already exists.")

        # Create new row in departments TABLE
        new_department = Department(name=name.strip())
        db.add(new_department)
        db.commit()
        db.refresh(new_department)

        return {
            "message": "Department created successfully!",
            "id": new_department.id,
            "name": new_department.name
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 2: List all departments
# FROM: departments TABLE
# TO:   API response
# ==============================================================================
@router.get("/departments")
def get_all_departments(
    db: Session = Depends(get_db),
    user=Depends(require_permission("departments", "read"))
):
    """Returns all departments."""

    try:
        # Get all rows from departments TABLE
        all_departments = db.query(Department).all()

        result = []
        for dept in all_departments:
            result.append({"id": dept.id, "name": dept.name})

        return result

    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 3: Delete a department
# FROM: departments TABLE (find department), employees TABLE (check if anyone uses it)
# TO:   departments TABLE (delete row)
# ==============================================================================
@router.delete("/departments/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("departments", "delete"))
):
    """Deletes a department. Blocked if any employees are still assigned to it."""

    try:
        # Find the department in departments TABLE
        department_from_db = db.query(Department).filter(Department.id == department_id).first()
        if not department_from_db:
            raise HTTPException(status_code=404, detail="Department not found.")

        # Check: are any employees still in this department? (employees TABLE)
        number_of_employees_in_dept = db.query(Employee).filter(
            Employee.department == department_from_db.name
        ).count()

        if number_of_employees_in_dept > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete: {number_of_employees_in_dept} employee(s) are in '{department_from_db.name}'. "
                       f"Reassign them first."
            )

        # Delete the row from departments TABLE
        department_name = department_from_db.name
        db.delete(department_from_db)
        db.commit()

        return {"message": f"Department '{department_name}' has been deleted."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 4: Update a department name
# FROM: departments TABLE (find department)
# TO:   departments TABLE (update name)
# ==============================================================================
@router.put("/departments/{department_id}")
def update_department(
    department_id: int,
    new_name: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("departments", "update"))
):
    """
    Updates a department's name.
    CASCADE: Automatically updates all employees in this department.
    """

    if not new_name or not new_name.strip():
        raise HTTPException(status_code=400, detail="Department name cannot be empty.")

    try:
        # Find the department in departments TABLE
        department_from_db = db.query(Department).filter(Department.id == department_id).first()
        if not department_from_db:
            raise HTTPException(status_code=404, detail="Department not found.")

        # Check if the new name is already taken
        if db.query(Department).filter(Department.name == new_name.strip()).first():
            raise HTTPException(status_code=400, detail="This department name is already taken.")

        # Update the name
        department_from_db.name = new_name.strip()
        db.commit()
        db.refresh(department_from_db)

        return {
            "message": "Department updated successfully!",
            "id": department_from_db.id,
            "name": department_from_db.name
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 5: Assign a supervisor to a department
# FROM: department_id, employee_id
# TO:   department_supervisors TABLE (new row)
# ==============================================================================
@router.post("/departments/{department_id}/supervisors/{employee_id}")
def assign_department_supervisor(
    department_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("departments", "update"))
):
    """Assigns an employee to supervise a department (for cross-department management)."""
    try:
        # Check if department exists
        department_from_db = db.query(Department).filter(Department.id == department_id).first()
        if not department_from_db:
            raise HTTPException(status_code=404, detail="Department not found.")

        # Check if employee exists
        employee_from_db = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # Check if duplicate
        existing = db.query(DepartmentSupervisor).filter(
            DepartmentSupervisor.department_id == department_id,
            DepartmentSupervisor.employee_id == employee_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="This employee is already a supervisor for this department.")

        # Create supervisor record
        new_supervisor = DepartmentSupervisor(department_id=department_id, employee_id=employee_id)
        db.add(new_supervisor)
        db.commit()

        return {
            "message": f"{employee_from_db.name} is now a supervisor of the {department_from_db.name} department.",
            "employee_id": employee_id,
            "department_id": department_id
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 6: Remove a supervisor from a department
# FROM: department_id, employee_id
# TO:   department_supervisors TABLE (delete row)
# ==============================================================================
@router.delete("/departments/{department_id}/supervisors/{employee_id}")
def remove_department_supervisor(
    department_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("departments", "update"))
):
    """Removes an employee's supervisor status for a department."""
    try:
        # Check if supervisor record exists
        record = db.query(DepartmentSupervisor).filter(
            DepartmentSupervisor.department_id == department_id,
            DepartmentSupervisor.employee_id == employee_id
        ).first()

        if not record:
            raise HTTPException(status_code=404, detail="Supervisor record not found.")

        db.delete(record)
        db.commit()

        return {"message": "Supervisor assignment removed successfully."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 7: List all supervisors of a department
# FROM: department_supervisors TABLE (filtered by department_id)
# TO:   API response
# ==============================================================================
@router.get("/departments/{department_id}/supervisors")
def get_department_supervisors(
    department_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("departments", "read"))
):
    """Lists all employees who supervise this department."""
    try:
        # Check if department exists
        department_from_db = db.query(Department).filter(Department.id == department_id).first()
        if not department_from_db:
            raise HTTPException(status_code=404, detail="Department not found.")

        supervisors = db.query(DepartmentSupervisor).filter(
            DepartmentSupervisor.department_id == department_id
        ).all()

        result = []
        for s in supervisors:
            result.append({
                "employee_id": s.employee.id,
                "emp_id": s.employee.emp_id,
                "name": s.employee.name,
                "department": s.employee.department,
                "role": s.employee.role
            })

        return result

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 8: List all departments supervised by an employee
# FROM: department_supervisors TABLE (filtered by employee_id)
# TO:   API response
# ==============================================================================
@router.get("/employees/{employee_id}/supervisions")
def get_employee_supervisions(
    employee_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission("departments", "read"))
):
    """Lists all departments that this employee supervises."""
    try:
        # Check if employee exists
        employee_from_db = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        supervisions = db.query(DepartmentSupervisor).filter(
            DepartmentSupervisor.employee_id == employee_id
        ).all()

        result = []
        for s in supervisions:
            result.append({
                "department_id": s.department.id,
                "name": s.department.name
            })

        return result

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")

