"""
routes/employees.py — All API routes for managing employees.

PERMISSION CHECK (before every route):
    require_permission("employees", "create/read/update/delete")
    → Checks the role_permissions TABLE to see if the caller's role is allowed.

DATA SCOPING (inside read routes):
    HR_ADMIN / IT_ADMIN → see ALL employees
    DEPT_HEAD           → see only employees in THEIR department
    MANAGER             → see only THEIR reportees + themselves
    EMPLOYEE            → see only THEIR OWN profile

TABLES USED:
    employees       → main table for all employee data
    departments     → to validate department names
    employee_skills → to manage skills (one row per skill per employee)
    accounts        → to sync role changes
    roles           → to validate role names
    project_members → cleaned up when deleting an employee
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import or_

from database import get_db
from db_models import Employee, EmployeeSkill, Account, ProjectMember, Role, Department
from utils import generate_employee_id
from auth import require_permission, get_caller_employee

router = APIRouter()


# ==============================================================================
# ROUTE 1: Create a new employee
# FROM: user input (name, department)
# TO:   employees TABLE (new row)
# ==============================================================================
@router.post("/createemployee")
def add_employee(
    name: str,
    department: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "create"))
):
    """Creates a new employee. Department must exist in departments TABLE first."""

    # --- Validation ---
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    if not department or not department.strip():
        raise HTTPException(status_code=400, detail="Department cannot be empty.")

    # Check: does this department exist in the departments TABLE?
    department_from_db = db.query(Department).filter(Department.name == department.strip()).first()

    if not department_from_db:
        all_departments = db.query(Department).all()
        department_names = [d.name for d in all_departments]
        raise HTTPException(
            status_code=400,
            detail=f"Department '{department}' does not exist. "
                   f"Available: {department_names}. "
                   f"Create it first via POST /departments."
        )

    # --- Create the employee ---
    try:
        # Step 1: Create the employee row without emp_id first
        new_employee = Employee(
            name=name.strip(),
            department=department.strip(),
            role="EMPLOYEE"
        )

        db.add(new_employee)
        # Step 2: Flush to assign the auto-incremented primary key 'id'
        db.flush()

        # Step 3: Use the guaranteed unique 'id' to generate the business 'emp_id'
        new_employee.emp_id = generate_employee_id("IM", 2026, new_employee.id)

        db.commit()
        db.refresh(new_employee)

        return {
            "message": "Employee created successfully!",
            "id": new_employee.id,
            "emp_id": new_employee.emp_id,
            "name": new_employee.name,
            "department": new_employee.department
        }

    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 2: Get all employees (DATA SCOPED by caller's role)
# FROM: employees TABLE
# TO:   API response (filtered by role)
# ==============================================================================
@router.get("/employees")
def get_all_employees(
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "read"))
):
    """
    Returns employees based on who is calling:
    - ADMIN → all employees from employees TABLE
    - DEPT_HEAD → only employees where department = caller's department
    - MANAGER → only employees where manager_id = caller's id
    - EMPLOYEE → only the caller's own row
    """
    callers_role = user["role"]

    try:
        # --- ADMIN: see everyone ---
        if callers_role in ["HR_ADMIN", "IT_ADMIN"]:
            employee_list = db.query(Employee).all()

        # --- NON-ADMIN: see limited data ---
        else:
            caller_employee = get_caller_employee(user, db)

            if not caller_employee:
                raise HTTPException(status_code=403, detail="No employee profile linked to your account.")

            if callers_role == "DEPT_HEAD":
                # Get all employees WHERE department = my department
                my_department = caller_employee.department
                employee_list = db.query(Employee).filter(Employee.department == my_department).all()

            elif callers_role == "MANAGER":
                # Get employees WHERE manager_id = my id, PLUS myself
                my_id = caller_employee.id
                employee_list = db.query(Employee).filter(
                    or_(Employee.manager_id == my_id, Employee.id == my_id)
                ).all()

            else:
                # EMPLOYEE or any other role: see only myself
                employee_list = [caller_employee]

        # --- Build the response ---
        result = []
        for emp in employee_list:
            result.append({
                "id": emp.id,
                "emp_id": emp.emp_id,
                "name": emp.name,
                "department": emp.department,
                "role": emp.role,
                "manager_id": emp.manager_id
            })
        return result

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 3: Get one employee by their readable ID (DATA SCOPED)
# FROM: employees TABLE (one row)
# TO:   API response
# ==============================================================================
@router.get("/employees/{employee_id}")
def get_one_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "read"))
):
    """
    Finds one employee by their readable ID (e.g., "IM-2026-0001").
    Non-admins can only see employees within their scope.
    """
    try:
        # Find this employee in the employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.emp_id == employee_id).first()

        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # --- Scope check: can the caller see THIS employee? ---
        callers_role = user["role"]

        if callers_role not in ["HR_ADMIN", "IT_ADMIN"]:
            caller_employee = get_caller_employee(user, db)

            if not caller_employee:
                raise HTTPException(status_code=403, detail="No employee profile linked to your account.")

            # DEPT_HEAD: can only see employees in their department
            if callers_role == "DEPT_HEAD":
                if employee_from_db.department != caller_employee.department:
                    raise HTTPException(status_code=403, detail="You can only view employees in your department.")

            # MANAGER: can only see their reportees + themselves
            elif callers_role == "MANAGER":
                is_my_reportee = (employee_from_db.manager_id == caller_employee.id)
                is_myself = (employee_from_db.id == caller_employee.id)
                if not is_my_reportee and not is_myself:
                    raise HTTPException(status_code=403, detail="You can only view your own reportees.")

            # EMPLOYEE or any other role: can only see themselves
            else:
                if employee_from_db.id != caller_employee.id:
                    raise HTTPException(status_code=403, detail="You can only view your own profile.")

        # --- Build the response ---
        # Get this employee's skills from the employee_skills TABLE
        skill_names = [each_skill.skill for each_skill in employee_from_db.skills]

        return {
            "id": employee_from_db.id,
            "emp_id": employee_from_db.emp_id,
            "name": employee_from_db.name,
            "department": employee_from_db.department,
            "role": employee_from_db.role,
            "manager_id": employee_from_db.manager_id,
            "skills": skill_names
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 4: Assign an employee to a department
# FROM: departments TABLE (validate), employees TABLE (find employee)
# TO:   employees TABLE (update department column)
# ==============================================================================
@router.put("/employees/{employee_id}/assign-department/{department}")
def assign_employee_to_department(
    employee_id: str,
    department: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "update"))
):
    """Changes which department an employee belongs to."""

    if not department or not department.strip():
        raise HTTPException(status_code=400, detail="Department cannot be empty.")

    # Check: does this department exist in the departments TABLE?
    department_from_db = db.query(Department).filter(Department.name == department.strip()).first()

    if not department_from_db:
        all_departments = db.query(Department).all()
        department_names = [d.name for d in all_departments]
        raise HTTPException(
            status_code=400,
            detail=f"Department '{department}' does not exist. "
                   f"Available: {department_names}. "
                   f"Create it first via POST /departments."
        )

    try:
        # Find the employee in the employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.emp_id == employee_id).first()

        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # Update the department column in employees TABLE
        employee_from_db.department = department.strip()
        db.commit()
        db.refresh(employee_from_db)

        return {
            "message": f"{employee_from_db.name} moved to {department}.",
            "emp_id": employee_from_db.emp_id,
            "department": employee_from_db.department
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 5: Get employees by department (DATA SCOPED)
# FROM: employees TABLE (filtered by department)
# TO:   API response
# ==============================================================================
@router.get("/employees/department/{department}")
def get_employees_by_department(
    department: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "read"))
):
    """Returns employees in a department, filtered by the caller's scope."""

    callers_role = user["role"]

    try:
        # --- Scope check for non-admins ---
        if callers_role not in ["HR_ADMIN", "IT_ADMIN"]:
            caller_employee = get_caller_employee(user, db)

            if not caller_employee:
                raise HTTPException(status_code=403, detail="No employee profile linked to your account.")

            # DEPT_HEAD can only query their OWN department
            if callers_role == "DEPT_HEAD":
                if department != caller_employee.department:
                    raise HTTPException(status_code=403, detail="You can only view your own department.")

        # Get all employees in this department from employees TABLE
        employees_in_this_department = db.query(Employee).filter(Employee.department == department).all()

        # MANAGER and EMPLOYEE: further filter the results
        if callers_role not in ["HR_ADMIN", "IT_ADMIN", "DEPT_HEAD"]:
            caller_employee = get_caller_employee(user, db)

            if callers_role == "MANAGER":
                # Keep only my reportees + myself
                my_id = caller_employee.id
                employees_in_this_department = [
                    emp for emp in employees_in_this_department
                    if emp.manager_id == my_id or emp.id == my_id
                ]
            else:
                # EMPLOYEE: keep only myself
                employees_in_this_department = [
                    emp for emp in employees_in_this_department
                    if emp.id == caller_employee.id
                ]

        # --- Build the response ---
        result = []
        for emp in employees_in_this_department:
            result.append({
                "id": emp.id,
                "emp_id": emp.emp_id,
                "name": emp.name,
                "department": emp.department,
                "role": emp.role
            })
        return result

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 6: Update an employee's role
# FROM: roles TABLE (validate), employees TABLE (find employee)
# TO:   employees TABLE (update role), accounts TABLE (sync role)
# ==============================================================================
@router.put("/employees/{employee_id}/update-role")
def update_role(
    employee_id: str,
    new_role: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "update"))
):
    """Changes an employee's role. Also updates their account's role to stay in sync."""

    # Check: does this role exist in the roles TABLE?
    role_from_db = db.query(Role).filter(Role.name == new_role).first()

    if not role_from_db:
        all_roles = db.query(Role).all()
        role_names = [r.name for r in all_roles]
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {role_names}")

    try:
        # Find the employee in the employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.emp_id == employee_id).first()

        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # --- Privilege Escalation Check ---
        system_admin_roles = ["HR_ADMIN", "IT_ADMIN"]
        callers_role = user["role"]

        # If the new role is an admin role, OR if the employee is currently an admin,
        # then the caller MUST be an admin.
        if (new_role in system_admin_roles or employee_from_db.role in system_admin_roles) and callers_role not in system_admin_roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to assign or modify administrative roles."
            )

        # Update role in employees TABLE
        employee_from_db.role = new_role

        # Also update role in accounts TABLE (keep them in sync)
        account_from_db = db.query(Account).filter(Account.employee_id == employee_from_db.id).first()
        if account_from_db:
            account_from_db.role = new_role

        db.commit()
        db.refresh(employee_from_db)

        return {
            "message": f"{employee_from_db.name}'s role updated to {new_role}.",
            "emp_id": employee_from_db.emp_id,
            "role": employee_from_db.role
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 7: Assign a manager to an employee
# FROM: employees TABLE (find both employee and manager)
# TO:   employees TABLE (update manager_id column)
# ==============================================================================
@router.put("/employees/{employee_id}/manager")
def assign_manager(
    employee_id: str,
    manager_emp_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "update"))
):
    """Sets who manages a given employee."""

    try:
        # Find the employee in employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.emp_id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # Find the manager in employees TABLE
        manager_from_db = db.query(Employee).filter(Employee.emp_id == manager_emp_id).first()
        if not manager_from_db:
            raise HTTPException(status_code=404, detail="Manager not found.")

        # Can't be your own manager
        if employee_from_db.emp_id == manager_emp_id:
            raise HTTPException(status_code=400, detail="An employee cannot be their own manager.")

        # --- Circular Management Check ---
        # Ensure that the manager does not report to this employee (directly or indirectly)
        # This prevents a loop in the reporting structure.
        check_ptr = manager_from_db
        visited_ids = {employee_from_db.id}
        
        while check_ptr is not None:
            if check_ptr.id in visited_ids:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Circular management detected: {manager_from_db.name} already reports to {employee_from_db.name} (directly or indirectly)."
                )
            # Move up the chain
            if check_ptr.manager_id:
                check_ptr = db.query(Employee).filter(Employee.id == check_ptr.manager_id).first()
            else:
                break

        # Update manager_id in employees TABLE
        employee_from_db.manager_id = manager_from_db.id
        db.commit()
        db.refresh(employee_from_db)

        return {
            "message": f"{employee_from_db.name} now reports to {manager_from_db.name}.",
            "emp_id": employee_from_db.emp_id,
            "manager": manager_from_db.name
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 8: Get all employees who report to a manager (DATA SCOPED)
# FROM: employees TABLE (filtered by manager_id)
# TO:   API response
# ==============================================================================
@router.get("/employees/{manager_emp_id}/reportees")
def get_reportees(
    manager_emp_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "read"))
):
    """
    Returns employees who report to this manager.
    - MANAGER: can only see their own reportees
    - DEPT_HEAD: can see reportees of managers in their department
    - EMPLOYEE: cannot use this route
    """
    try:
        # Find the manager in employees TABLE
        manager_from_db = db.query(Employee).filter(Employee.emp_id == manager_emp_id).first()
        if not manager_from_db:
            raise HTTPException(status_code=404, detail="Manager not found.")

        # --- Scope check ---
        callers_role = user["role"]

        if callers_role not in ["HR_ADMIN", "IT_ADMIN"]:
            caller_employee = get_caller_employee(user, db)

            if not caller_employee:
                raise HTTPException(status_code=403, detail="No employee profile linked to your account.")

            if callers_role == "MANAGER":
                if manager_from_db.id != caller_employee.id:
                    raise HTTPException(status_code=403, detail="You can only view your own reportees.")

            elif callers_role == "DEPT_HEAD":
                if manager_from_db.department != caller_employee.department:
                    raise HTTPException(status_code=403, detail="You can only view reportees of managers in your department.")

            else:
                raise HTTPException(status_code=403, detail="Employees cannot view reportee lists.")

        # Get all employees WHERE manager_id = this manager, from employees TABLE
        reportee_list = db.query(Employee).filter(Employee.manager_id == manager_from_db.id).all()

        if not reportee_list:
            raise HTTPException(status_code=404, detail="No reportees found for this manager.")

        # --- Build the response ---
        result = []
        for emp in reportee_list:
            result.append({
                "id": emp.id,
                "emp_id": emp.emp_id,
                "name": emp.name,
                "department": emp.department,
                "role": emp.role
            })
        return result

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 9: Add skills to an employee
# FROM: employee_skills TABLE (check existing), user input (new skills)
# TO:   employee_skills TABLE (new rows)
# ==============================================================================
@router.put("/employees/{employee_id}/skills")
def update_skills(
    employee_id: str,
    skills: list[str],
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "update"))
):
    """Adds new skills. Skips skills the employee already has."""

    if not skills:
        raise HTTPException(status_code=400, detail="Skills list cannot be empty.")

    try:
        # Find the employee in employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.emp_id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # Get skills this employee already has from employee_skills TABLE
        existing_skill_names = set()
        for each_skill in employee_from_db.skills:
            existing_skill_names.add(each_skill.skill)

        # Add only NEW skills to the employee_skills TABLE
        newly_added_skills = []
        for skill_name in skills:
            clean_skill_name = skill_name.strip()

            if clean_skill_name and clean_skill_name not in existing_skill_names:
                new_skill_row = EmployeeSkill(employee_id=employee_from_db.id, skill=clean_skill_name)
                db.add(new_skill_row)
                newly_added_skills.append(clean_skill_name)

        db.commit()
        db.refresh(employee_from_db)

        # Get ALL current skills after the update
        all_current_skills = [each_skill.skill for each_skill in employee_from_db.skills]

        return {
            "message": f"Skills updated for {employee_from_db.name}.",
            "added": newly_added_skills,
            "all_skills": all_current_skills
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 9B: Remove a skill from an employee
# FROM: employee_skills TABLE (find the skill row)
# TO:   employee_skills TABLE (delete the row)
# ==============================================================================
@router.delete("/employees/{employee_id}/skills/{skill_name}")
def remove_skill(
    employee_id: str,
    skill_name: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "update"))
):
    """Removes one skill from an employee."""

    try:
        # Find the employee in employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.emp_id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # Find this specific skill in the employee_skills TABLE
        skill_row = db.query(EmployeeSkill).filter(
            EmployeeSkill.employee_id == employee_from_db.id,
            EmployeeSkill.skill == skill_name
        ).first()

        if not skill_row:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found for this employee.")

        # Delete the skill row from employee_skills TABLE
        db.delete(skill_row)
        db.commit()

        return {"message": f"Skill '{skill_name}' removed from {employee_from_db.name}."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 10: Find employees by department AND skill (DATA SCOPED)
# FROM: employees TABLE + employee_skills TABLE (joined)
# TO:   API response
# ==============================================================================
@router.get("/employees/department/{department}/skill/{skill}")
def get_employees_by_skill_and_department(
    department: str,
    skill: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "read"))
):
    """Finds employees in a department who have a specific skill."""

    callers_role = user["role"]

    try:
        # --- Scope check ---
        if callers_role not in ["HR_ADMIN", "IT_ADMIN"]:
            caller_employee = get_caller_employee(user, db)
            if not caller_employee:
                raise HTTPException(status_code=403, detail="No employee profile linked to your account.")

            if callers_role == "DEPT_HEAD" and department != caller_employee.department:
                raise HTTPException(status_code=403, detail="You can only search within your own department.")

        from sqlalchemy import func

        # Join employees TABLE with employee_skills TABLE
        # WHERE department = given department AND skill = given skill (case-insensitive)
        matching_employees = (
            db.query(Employee)
            .join(EmployeeSkill, Employee.id == EmployeeSkill.employee_id)
            .filter(Employee.department == department)
            .filter(func.lower(EmployeeSkill.skill) == skill.strip().lower())
            .all()
        )

        # MANAGER and EMPLOYEE: further filter
        if callers_role not in ["HR_ADMIN", "IT_ADMIN", "DEPT_HEAD"]:
            caller_employee = get_caller_employee(user, db)
            my_id = caller_employee.id

            if callers_role == "MANAGER":
                matching_employees = [e for e in matching_employees if e.manager_id == my_id or e.id == my_id]
            else:
                matching_employees = [e for e in matching_employees if e.id == my_id]

        # --- Build the response ---
        result = []
        for emp in matching_employees:
            all_skills = [each_skill.skill for each_skill in emp.skills]
            result.append({
                "id": emp.id,
                "emp_id": emp.emp_id,
                "name": emp.name,
                "department": emp.department,
                "skills": all_skills
            })
        return result

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 11: Delete an employee
# FROM: employees TABLE (find employee)
# TO:   employees TABLE (delete row + nullify reportees' manager_id)
#       cascade auto-deletes from: accounts, employee_skills, project_members
# ==============================================================================
@router.delete("/employees/{employee_id}")
def delete_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "delete"))
):
    """
    Permanently removes an employee.
    ALSO: sets manager_id = None for anyone who reported to this employee.
    CASCADE: automatically deletes their account, skills, and project memberships.
    """
    try:
        # Find the employee in employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.emp_id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        employee_name = employee_from_db.name

        # Delete the employee from employees TABLE
        # DB CASCADE automatically handles: accounts, employee_skills, project_members
        # DB SET NULL automatically handles: reportees' manager_id
        db.delete(employee_from_db)
        db.commit()

        return {"message": f"Employee '{employee_name}' has been deleted."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 12: Update an employee's name
# FROM: employees TABLE (find employee)
# TO:   employees TABLE (update name column)
# ==============================================================================
@router.put("/employees/{employee_id}/update-name")
def update_name(
    employee_id: str,
    new_name: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "update"))
):
    """Changes an employee's name."""

    if not new_name or not new_name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    try:
        # Find the employee in employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.emp_id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        # Update name in employees TABLE
        employee_from_db.name = new_name.strip()
        db.commit()
        db.refresh(employee_from_db)

        return {
            "message": f"Name updated to {employee_from_db.name}.",
            "emp_id": employee_from_db.emp_id,
            "name": employee_from_db.name
        }

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")


# ==============================================================================
# ROUTE 13: Remove a manager from an employee
# FROM: employees TABLE (find employee)
# TO:   employees TABLE (set manager_id = None)
# ==============================================================================
@router.put("/employees/{employee_id}/remove-manager")
def remove_manager(
    employee_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_permission("employees", "update"))
):
    """Removes the manager assignment (sets manager to nobody)."""

    try:
        # Find the employee in employees TABLE
        employee_from_db = db.query(Employee).filter(Employee.emp_id == employee_id).first()
        if not employee_from_db:
            raise HTTPException(status_code=404, detail="Employee not found.")

        if employee_from_db.manager_id is None:
            raise HTTPException(status_code=400, detail="This employee has no manager assigned.")

        # Set manager_id = None in employees TABLE
        employee_from_db.manager_id = None
        db.commit()

        return {"message": f"{employee_from_db.name} no longer has a manager assigned."}

    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(error)}")
