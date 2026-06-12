"""
db_models.py — Defines all the database tables for our Employee Management System.

Think of each class below as a table in a spreadsheet.
Each variable inside (Column) is a column in that spreadsheet.

IMPORTANT: Admin accounts (HR_ADMIN, IT_ADMIN) are decoupled from the Employee table.
That means admins don't need to be employees — they are standalone accounts.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE 1: Employee
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Stores every employee's basic information.
# Like a row in an HR spreadsheet: one row = one person.
class Employee(Base):
    __tablename__ = "employees"

    # The auto-generated number (1, 2, 3, ...) that the database uses internally
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # A human-readable ID like "IM-2026-0001"
    emp_id = Column(String, unique=True, index=True)

    # The person's full name
    name = Column(String, nullable=False)

    # Which department they belong to (e.g., "Engineering", "HR")
    department = Column(String, nullable=False)

    # Their role in the system (e.g., "MANAGER", "EMPLOYEE")
    role = Column(String, nullable=True)

    # Who is their manager? Points to another employee's id.
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

    # ─── Relationships (shortcuts for easier queries, NOT actual columns) ─────
    # "manager" lets us do: employee.manager → returns the manager Employee object
    manager = relationship("Employee", remote_side=[id], backref="reportees")

    # "account" lets us do: employee.account → returns their Account object (if they have one)
    # cascade="all, delete-orphan" means: if we delete the employee, delete their account too
    account = relationship("Account", back_populates="employee", uselist=False, cascade="all, delete-orphan")

    # "skills" lets us do: employee.skills → returns list of EmployeeSkill objects
    # cascade="all, delete-orphan" means: if we delete the employee, delete their skills too
    skills = relationship("EmployeeSkill", back_populates="employee", cascade="all, delete-orphan")

    # "project_memberships" lets us see which projects this employee is on
    # cascade="all, delete-orphan" means: if we delete the employee, remove them from all projects
    project_memberships = relationship("ProjectMember", back_populates="employee", cascade="all, delete-orphan")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE 2: EmployeeSkill
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Each row = one skill for one employee.
# If an employee knows Python and SQL, they get 2 rows here.
class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Which employee has this skill?
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    # The skill name (e.g., "Python", "SQL", "Leadership")
    skill = Column(String, nullable=False)

    # Relationship back to the Employee table
    employee = relationship("Employee", back_populates="skills")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE 3: Account
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Login credentials. Can belong to an employee OR be a standalone admin account.
# employee_id is NULLABLE — admins (HR_ADMIN, IT_ADMIN) don't need to be employees.
class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # The login username (must be unique — no two people can have the same one)
    username = Column(String, unique=True, index=True, nullable=False)

    # The scrambled (hashed) password — we NEVER store the real password
    password_hash = Column(String, nullable=False)

    # Which employee does this account belong to? (NULL for standalone admins)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

    # What role does this account have? (HR_ADMIN, IT_ADMIN, EMPLOYEE, MANAGER, DEPT_HEAD)
    role = Column(String, nullable=False)

    # Is this account active? (False = locked out)
    is_active = Column(Boolean, default=True)

    # Relationship back to the Employee table (will be None for standalone admins)
    employee = relationship("Employee", back_populates="account")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE 4: Department
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# A list of valid departments in the company.
class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Department name (e.g., "HR", "Engineering") — must be unique
    name = Column(String, unique=True, nullable=False)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE 5: Role
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# A list of valid roles in the organization.
# Admins can add custom roles (e.g., "TEAM_LEAD", "INTERN").
# System roles (HR_ADMIN, IT_ADMIN) cannot be deleted.
class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Role name (e.g., "MANAGER", "TEAM_LEAD") — must be unique
    name = Column(String, unique=True, nullable=False)

    # Is this a system role that cannot be deleted? (True for HR_ADMIN, IT_ADMIN)
    is_system_role = Column(Boolean, default=False)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE 6: Project
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# A project that employees can be assigned to.
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Project name (e.g., "Website Redesign") — must be unique
    name = Column(String, unique=True, nullable=False)

    # All the members assigned to this project
    members = relationship("ProjectMember", back_populates="project")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE 7: ProjectMember (Join Table)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Links employees to projects. One employee can be on many projects.
# One project can have many employees. This table connects them.
# UniqueConstraint prevents the same employee being assigned to the same project twice.
class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("project_id", "employee_id"),)

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Which project?
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    # Which employee?
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    # Relationships for easy navigation
    project = relationship("Project", back_populates="members")
    employee = relationship("Employee", back_populates="project_memberships")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE 8: RolePermission
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Stores CRUD permissions for each role on each resource.
# Admins can grant or revoke permissions at runtime via API.
#
# Example row: role_name="MANAGER", resource="employees",
#              can_create=False, can_read=True, can_update=False, can_delete=False
# → Managers can view employees but cannot create, update, or delete them.
class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_name", "resource"),)

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Which role does this permission apply to? (e.g., "MANAGER", "EMPLOYEE")
    role_name = Column(String, nullable=False)

    # Which resource does this permission apply to? (e.g., "employees", "projects")
    resource = Column(String, nullable=False)

    # The four CRUD flags — True means allowed, False means denied
    can_create = Column(Boolean, default=False)
    can_read = Column(Boolean, default=False)
    can_update = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
  