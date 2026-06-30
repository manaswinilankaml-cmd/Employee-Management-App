# FastAPI Backend Architecture & Engineering Blueprint

This document serves as the primary technical manual for the backend of the Employee Management System (EMS). It provides a comprehensive analysis of the system architecture, file structures, API endpoints, core Python paradigms, database integrations, and dynamic authorization routines.

---

## 1. System Module & Routing Hierarchy

The backend system is structured modularly. The layout below maps the dependencies, demonstrating how configuration modules feed into route handlers, security checkpoints, and database operations.

```text
main.py (Application Entrypoint)
├── Database & ORM Mapping Configuration
│   ├── database.py (PostgreSQL Engine & Session Factory)
│   └── db_models.py (SQLAlchemy Entity Schemas)
├── Security & Middlewares (auth.py)
│   ├── utils.py (Bcrypt Cryptography)
│   └── PyJWT (Token Sign/Verify Engines)
└── API Router Endpoints Mounting (routes/)
    ├── auth_routes.py (/auth Accounts)
    ├── employees.py (/employees Directory)
    ├── projects.py (/projects Workspaces)
    ├── departments.py (/departments Structure)
    ├── roles.py (/roles Custom Definitions)
    └── permissions.py (/permissions Dynamic Grid)
```

---

## 2. Core Engineering, Python & FastAPI Concepts

### A. Database Transaction Context Management
* **Python Generators (`yield`):** The dependency `get_db()` utilizes Python generators to yield a database session context to route handlers. Wrapping the generator in a `try-finally` block guarantees that the database session `db.close()` is executed immediately after the request finishes, preventing transaction leaks or connection pooling exhaustion.
* **Transaction Rollbacks:** Any database modification operations (`add()`, `delete()`, `commit()`) are bound in `try-except` blocks. In case of unexpected database errors (such as integrity exceptions or connection failures), the session executes `db.rollback()` to revert the transaction, ensuring database state integrity.

### B. Dynamic Role-Based Access Control (RBAC)
Unlike typical static systems that hardcode role verification inside function bodies, this system employs a **database-driven permission matrix**:
* **Roles Table:** Stores role identities (e.g. system roles `HR_ADMIN`, `IT_ADMIN`, `EMPLOYEE`, and custom roles like `DEPARTMENT HEAD` or `MANAGER`).
* **Permissions Table:** Maps roles to resources (`employees`, `projects`, `accounts`, `departments`, `roles`) with boolean operation flags: `can_create`, `can_read`, `can_update`, and `can_delete`.
* **Dynamic Dependency Guards:** The dependency wrapper `require_permission(resource, action)` dynamically queries the permissions table for the user's role on every incoming request.

### C. Resource Access Scoping & Role Name Normalization
Scoping parameters determine what data accounts can query:
* **HR_ADMIN & IT_ADMIN:** Possess global scoping and can view and edit all records.
* **DEPARTMENT HEAD:** (Normalized dynamically to accept `"DEPT_HEAD"`, `"DEPARTMENT HEAD"`, or `"DEPARTMENT_HEAD"`). Department heads are scoped strictly to their own department. They can only query, create, or update employee records belonging to their department.
* **MANAGER:** Scoped to reportees. Managers can only view themselves and employees whose `manager_id` matches their own primary key.
* **EMPLOYEE:** Scoped strictly to their own profile details.

### D. Self-Referential ORM Mapping & Reporting Tree Mappings
* **Reporting Lines:** The `employees` table contains a nullable self-referential foreign key `manager_id` pointing to `Employee.id`.
* **Cascade Safeguard:** Deleting a manager triggers an `ondelete="SET NULL"` rule in the database, resetting their reports' manager fields to `NULL` to avoid foreign key violations.
* **Circular Mappings Verification:** To prevent circular reporting loops, the system checks any new reporting relationship by traversing the reporting tree upward to verify that the proposed manager does not report to the employee.

---

## 3. Core Modules & Configuration Blueprint

### A. [database.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/database.py)
*Provides database engine setup, connection pooling, and request session management.*

```text
DATABASE_URL (.env Config)
└── create_engine (Establishes connection pool: pool_size=5, max_overflow=10)
     └── sessionmaker (Creates session objects: autocommit=False, autoflush=False)
          └── SessionLocal (Generates database transaction sessions)
               └── get_db() (Generates request-scoped generator dependency)
```

*   **`get_db()`**
    *   **Description:** Generator function that yields a database session context to FastAPI routes.
    *   **Inputs:** None.
    *   **Actions:** Instantiates a database session from `SessionLocal()`. Yields the session context to the route handler. Guarantees session closure via a `finally` block.
    *   **Outputs:** Yields an active SQLAlchemy `Session`.
    *   **Exceptions:** Propagates internal SQLAlchemy connection exceptions.

### B. [db_models.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/db_models.py)
*Defines SQLAlchemy ORM mappings, constraints, and relationships for system entities.*

```text
DATABASE ENTITY RELATIONSHIPS & CONSTRAINTS
├── Role (Authorization profiles)
│   ├── Primary Key: id (Integer)
│   ├── Unique Key: name (String)
│   ├── Attribute: is_system_role (Boolean)
│   └── Relationships:
│       ├── One-to-Many with RolePermission (role_name -> role_permissions.role_name)
│       ├── One-to-Many with Employee (name -> employees.role)
│       └── One-to-Many with Account (name -> accounts.role)
├── Department (Business units)
│   ├── Primary Key: id (Integer)
│   ├── Unique Key: name (String)
│   └── Relationships:
│       └── One-to-Many with Employee (name -> employees.department)
├── Employee (Staff profiles)
│   ├── Primary Key: id (Integer)
│   ├── Unique Key: emp_id (String)
│   ├── Foreign Key: department (String -> departments.name)
│   ├── Foreign Key: role (String -> roles.name)
│   ├── Foreign Key: manager_id (Integer self-referential -> employees.id)
│   └── Relationships:
│       ├── One-to-One with Account (employee_id -> accounts.employee_id)
│       ├── One-to-Many with EmployeeSkill (employee_id -> employee_skills.employee_id)
│       └── One-to-Many with ProjectMember (employee_id -> project_members.employee_id)
├── EmployeeSkill (Skill tags)
│   ├── Primary Key: id (Integer)
│   ├── Foreign Key: employee_id (Integer -> employees.id)
│   └── Attribute: skill (String)
├── Project (Business tasks)
│   ├── Primary Key: id (Integer)
│   ├── Unique Key: name (String)
│   └── Relationships:
│       └── One-to-Many with ProjectMember (project_id -> project_members.project_id)
├── ProjectMember (Join table)
│   ├── Primary Key: id (Integer)
│   ├── Foreign Key: project_id (Integer -> projects.id)
│   └── Foreign Key: employee_id (Integer -> employees.id)
└── Account (User login credentials)
    ├── Primary Key: id (Integer)
    ├── Unique Key: username (String)
    ├── Attribute: password_hash (String)
    ├── Attribute: is_active (Boolean)
    ├── Foreign Key: role (String -> roles.name)
    └── Foreign Key: employee_id (Integer -> employees.id)
```

---

### C. [utils.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/utils.py)
*Provides cryptography routines and employee serial ID formatting.*

*   **`generate_employee_id(org_code: str, year: int, number: int) -> str`**
    *   **Description:** Formats a serial sequence number into a standard corporate identity.
    *   **Inputs:** `org_code` (str, e.g., "IM"), `year` (int, e.g., 2026), `number` (int).
    *   **Actions:** Zero-pads the integer sequence to 4 digits and returns the formatted ID.
    *   **Outputs:** `str` (e.g. `IM-2026-0001`).
*   **`hash_password(password: str) -> str`**
    *   **Description:** Generates a secure salt and hash of a password using the bcrypt algorithm.
    *   **Inputs:** `password` (str).
    *   **Outputs:** `str` (bcrypt hash string).
*   **`verify_password(plain_password: str, hashed_password: str) -> bool`**
    *   **Description:** Verifies a plain text password against a bcrypt hash in constant time.
    *   **Inputs:** `plain_password` (str), `hashed_password` (str).
    *   **Outputs:** `bool` (True if passwords match, False otherwise).

### D. [auth.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/auth.py)
*Handles JWT token cryptographic signing, verification, and security route guarding.*

*   **`create_token(account_id: int, role: str) -> str`**
    *   **Description:** Generates a signed stateless JWT token.
    *   **Inputs:** `account_id` (int), `role` (str).
    *   **Actions:** Encodes `account_id`, `role`, and `exp` (set to 8 hours) using the server's `SECRET_KEY` and the `HS256` signature algorithm.
    *   **Outputs:** `str` (cryptographically signed JWT token).
*   **`get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> dict`**
    *   **Description:** Decode and verify the JWT bearer token from the request headers.
    *   **Inputs:** Bearer authentication token from the request header, database session.
    *   **Actions:** Decodes the JWT token. Queries the `Account` table to verify the user exists, is active, and extracts their current database role.
    *   **Outputs:** `dict` containing account metadata (`account_id`, `role`, `employee_id`, `emp_id`, `username`).
    *   **Exceptions:** Raises `401 Unauthorized` if the token is expired, has an invalid signature, or the user account is deactivated.
*   **`require_role(allowed_roles: list[str]) -> callable`**
    *   **Description:** Security dependency to restrict access to specific static system roles.
    *   **Inputs:** `allowed_roles` (list of strings).
    *   **Outputs:** Dependency wrapper function.
    *   **Exceptions:** Raises `403 Forbidden` if the user's role is not in the allowed list.
*   **`require_permission(resource: str, action: str) -> callable`**
    *   **Description:** Security dependency to enforce the database-driven permissions matrix dynamically.
    *   **Inputs:** `resource` (str, e.g., `employees`), `action` (str, e.g., `read`).
    *   **Actions:** Queries the `role_permissions` table to check if the caller's role has the requested permission flag set to True.
    *   **Outputs:** Dependency wrapper function.
    *   **Exceptions:** Raises `403 Forbidden` if permission is denied.
*   **`get_caller_employee(user: dict, db: Session) -> Employee`**
    *   **Description:** Helper function to resolve the employee profile linked to the user's account.
    *   **Inputs:** User context dictionary, database session.
    *   **Outputs:** SQLAlchemy `Employee` instance, or `None`.

### E. [seed.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/seed.py)
*Initializes database schema, seeds default roles, departments, system accounts, and the baseline permissions matrix.*

*   **`seed_admin_accounts()`**
    *   **Description:** Creates database tables, seeds default departments, baseline system roles (`HR_ADMIN`, `IT_ADMIN`, `EMPLOYEE`, `MANAGER`, `DEPT_HEAD`), default permissions, and baseline administrative accounts (`hradmin` and `itadmin` with password `Pass@123`).
    *   **Inputs:** None.
    *   **Actions:** Executes database queries. Uses transaction rollbacks on error.
    *   **Outputs:** Console logs of initialization progress.

---

## 4. API Endpoints & Route Specifications

All route files are modules that register API endpoints using FastAPI's `APIRouter`. They are mounted onto the main FastAPI application instance inside `main.py`.

---

### A. [routes/auth_routes.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/auth_routes.py)
*Responsible for user session authentication, login, account registration, and password management.*

*   **`login(username: str = Body(), password: str = Body(), db: Session = Depends(get_db))`**
    *   **Method / Path:** `POST /auth/login`
    *   **Description:** Authenticates user credentials and returns a JWT access token.
    *   **Inputs:** JSON body with `username` and `password`, database session.
    *   **Actions:** Checks the `Account` table for a username match (case-insensitive). Verifies the password using bcrypt. Checks if the account is active. Generates a signed JWT access token.
    *   **Outputs:** JSON containing the JWT access token and user metadata.
    *   **Exceptions:** Raises `401 Unauthorized` for invalid credentials. Raises `403 Forbidden` if the account is deactivated.
*   **`create_account(employee_id: int, username: str = Body(), password: str = Body(), role: str = Body(), db: Session = Depends(get_db), user=Depends(require_permission("accounts", "create")))`**
    *   **Method / Path:** `POST /auth/create-account/{employee_id}`
    *   **Description:** Provisions login credentials for an existing employee.
    *   **Inputs:** Employee ID, JSON body (username, password, role), database session, user context.
    *   **Actions:** Verifies that the employee exists and does not already have an account. Verifies that the username is not taken. Ensures admin roles are not assigned through this endpoint. Hashes the password and saves the account record. Syncs the role column on the employee profile.
    *   **Exceptions:** Raises `404 Not Found` if the employee does not exist. Raises `400 Bad Request` if the role is invalid or username is taken.
*   **`deactivate_account(account_id: int, db: Session = Depends(get_db), user=Depends(require_permission("accounts", "update")))`**
    *   **Method / Path:** `PUT /auth/deactivate/{account_id}`
    *   **Description:** Disables login access for an account.
    *   **Inputs:** Account ID, database session, user context.
    *   **Actions:** Sets `is_active = False` in the `Account` table. Prevents deactivating administrative accounts (`HR_ADMIN` or `IT_ADMIN`).
    *   **Exceptions:** Raises `404 Not Found` if the account does not exist. Raises `403 Forbidden` if attempting to deactivate an admin.
*   **`reactivate_account(account_id: int, db: Session = Depends(get_db), user=Depends(require_permission("accounts", "update")))`**
    *   **Method / Path:** `PUT /auth/reactivate/{account_id}`
    *   **Description:** Restores login access to a deactivated account.
    *   **Inputs:** Account ID, database session, user context.
    *   **Actions:** Sets `is_active = True` in the `Account` table.
    *   **Exceptions:** Raises `404 Not Found` if the account does not exist. Raises `400 Bad Request` if the account is already active.
*   **`change_password(current_password: str = Body(), new_password: str = Body(), db: Session = Depends(get_db), user=Depends(get_current_user))`**
    *   **Method / Path:** `PUT /auth/change-password`
    *   **Description:** Allows any authenticated user to update their own password.
    *   **Inputs:** JSON body (current_password, new_password), database session, user context.
    *   **Actions:** Verifies the current password. Hashes and updates the password in the database.
    *   **Exceptions:** Raises `400 Bad Request` if the current password verification fails.
*   **`admin_reset_password(account_id: int, new_password: str = Body(embed=True), db: Session = Depends(get_db), user=Depends(require_permission("accounts", "update")))`**
    *   **Method / Path:** `PUT /auth/admin-reset-password/{account_id}`
    *   **Description:** Allows administrators to reset any user's password without needing the current password.
    *   **Inputs:** Account ID, JSON body (new_password), database session, user context.
    *   **Actions:** Hashes and saves the new password for the target account.
    *   **Exceptions:** Raises `404 Not Found` if the account does not exist.

---

### B. [routes/employees.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/employees.py)
*Handles employee profiles, directory listings, skills mappings, and reporting hierarchy assignments.*

*   **`get_all_employees(db: Session = Depends(get_db), user=Depends(get_current_user))`**
    *   **Method / Path:** `GET /employees`
    *   **Description:** Retrieves the employee directory list, applying role-based data scoping.
    *   **Inputs:** Database session, user context.
    *   **Actions:** 
        *   **`HR_ADMIN` / `IT_ADMIN`:** Retrieves all employees, sorted in descending order of employee ID (`Employee.emp_id.desc()`).
        *   **`DEPARTMENT HEAD`:** (Accepts `"DEPT_HEAD"`, `"DEPARTMENT HEAD"`, or `"DEPARTMENT_HEAD"` dynamically). Retrieves only employees belonging to the department head's department.
        *   **`MANAGER`:** Retrieves the manager's profile and their direct reportees.
        *   **`EMPLOYEE`:** Retrieves only their own profile details.
    *   **Outputs:** JSON list of employee objects.
*   **`get_one_employee(employee_id: str, db: Session = Depends(get_db), user=Depends(get_current_user))`**
    *   **Method / Path:** `GET /employees/{employee_id}`
    *   **Description:** Retrieves a single employee profile.
    *   **Inputs:** Employee ID, database session, user context.
    *   **Actions:** Resolves the employee profile. Applies scoping rules (e.g., department heads can only view profiles within their own department).
    *   **Exceptions:** Raises `404 Not Found` if the employee does not exist. Raises `403 Forbidden` if scoping rules are violated.
*   **`create_employee(name: str = Body(), department: str = Body(), role: str = Body(), db: Session = Depends(get_db), user=Depends(require_permission("employees", "create")))`**
    *   **Method / Path:** `POST /employees`
    *   **Description:** Adds a new employee profile to the system.
    *   **Inputs:** JSON body (name, department, role), database session, user context.
    *   **Actions:** Validates that the department and role exist. Generates a unique serial employee ID (e.g., `IM-2026-0045`). Saves the new employee profile.
    *   **Exceptions:** Raises `400 Bad Request` if the role or department does not exist, or the name is empty.
*   **`update_employee(employee_id: str, department: str = Body(), role: str = Body(), db: Session = Depends(get_db), user=Depends(require_permission("employees", "update")))`**
    *   **Method / Path:** `PUT /employees/{employee_id}`
    *   **Description:** Updates an employee's department and role.
    *   **Inputs:** Employee ID, JSON body (department, role), database session, user context.
    *   **Actions:** Verifies that the employee, department, and role exist. Updates the profile. Syncs the role change to the associated user login account if one exists.
    *   **Exceptions:** Raises `404 Not Found` if the employee does not exist. Raises `400 Bad Request` if the role or department is invalid.
*   **`assign_manager(employee_id: str, manager_emp_id: str, db: Session = Depends(get_db), user=Depends(get_current_user))`**
    *   **Method / Path:** `POST /employees/{employee_id}/assign-manager/{manager_emp_id}`
    *   **Description:** Sets the manager for an employee.
    *   **Inputs:** Employee ID, Manager Employee ID, database session, user context.
    *   **Actions:** Verifies that the employee and manager exist. Ensures an employee cannot be their own manager. Verifies department boundaries for department heads (who can only assign managers and reports within their own department). Runs a validation loop to prevent circular reporting lines.
    *   **Exceptions:** Raises `400 Bad Request` if circular dependencies or self-reporting are detected. Raises `403 Forbidden` if department boundary rules are violated.
*   **`remove_manager(employee_id: str, db: Session = Depends(get_db), user=Depends(get_current_user))`**
    *   **Method / Path:** `POST /employees/{employee_id}/remove-manager`
    *   **Description:** Removes the manager assignment for an employee.
    *   **Inputs:** Employee ID, database session, user context.
    *   **Actions:** Verifies that the employee exists, checks department boundaries for department heads, and sets `manager_id = None`.
    *   **Exceptions:** Raises `400 Bad Request` if the employee has no manager assigned. Raises `403 Forbidden` if department boundary rules are violated.
*   **`get_reportees(manager_emp_id: str, db: Session = Depends(get_db), user=Depends(get_current_user))`**
    *   **Method / Path:** `GET /employees/{manager_emp_id}/reportees`
    *   **Description:** Retrieves all direct reportees of a manager.
    *   **Inputs:** Manager Employee ID, database session, user context.
    *   **Actions:** Resolves the manager. Applies scoping rules (e.g., department heads can only view reports of managers within their own department).
    *   **Outputs:** JSON list of employee profiles.
*   **`add_skill(employee_id: str, skill_name: str = Body(embed=True), db: Session = Depends(get_db), user=Depends(require_permission("employees", "update")))`**
    *   **Method / Path:** `POST /employees/{employee_id}/skills`
    *   **Description:** Adds a skill tag to an employee profile.
    *   **Inputs:** Employee ID, JSON body (skill_name), database session, user context.
    *   **Actions:** Verifies that the employee exists and doesn't already have the skill. Saves the skill to the `employee_skills` table.
    *   **Exceptions:** Raises `400 Bad Request` if the skill name is empty or already exists on the profile.
*   **`remove_skill(employee_id: str, skill_name: str, db: Session = Depends(get_db), user=Depends(require_permission("employees", "update")))`**
    *   **Method / Path:** `DELETE /employees/{employee_id}/skills/{skill_name}`
    *   **Description:** Removes a skill tag from an employee profile.
    *   **Inputs:** Employee ID, Skill Name, database session, user context.
    *   **Actions:** Verifies that the employee has the skill and deletes the record from `employee_skills`.
    *   **Exceptions:** Raises `404 Not Found` if the skill record does not exist.
*   **`get_employees_by_skill_and_department(department: str, skill: str, db: Session = Depends(get_db), user=Depends(get_current_user))`**
    *   **Method / Path:** `GET /employees/department/{department}/skill/{skill}`
    *   **Description:** Searches for employees with a specific skill within a department.
    *   **Inputs:** Department Name, Skill Name, database session, user context.
    *   **Actions:** Performs a database query joining `Employee` and `EmployeeSkill` tables. Applies department scoping checks for department heads.
    *   **Outputs:** JSON list of matching employee profiles.

---

### C. [routes/projects.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/projects.py)
*Handles projects and workspace member assignments.*

*   **`get_all_projects(db: Session = Depends(get_db), user=Depends(get_current_user))`**
    *   **Method / Path:** `GET /projects`
    *   **Description:** Retrieves all projects, applying role-based access scoping.
    *   **Inputs:** Database session, user context.
    *   **Actions:** 
        *   **Admins, Department Heads, Managers:** Retrieves all projects.
        *   **Employees:** Retrieves only projects that the employee is assigned to.
    *   **Outputs:** JSON list of project records.
*   **`create_project(name: str = Body(embed=True), db: Session = Depends(get_db), user=Depends(require_permission("projects", "create")))`**
    *   **Method / Path:** `POST /projects`
    *   **Description:** Adds a new project to the system.
    *   **Inputs:** JSON body (name), database session, user context.
    *   **Actions:** Verifies that the project name is unique and adds the record.
    *   **Exceptions:** Raises `400 Bad Request` if the name is empty or already taken.
*   **`assign_member(project_id: int, employee_id: int, db: Session = Depends(get_db), user=Depends(require_permission("projects", "update")))`**
    *   **Method / Path:** `POST /projects/{project_id}/assign/{employee_id}`
    *   **Description:** Assigns an employee to a project.
    *   **Inputs:** Project ID, Employee ID, database session, user context.
    *   **Actions:** Verifies that the project and employee exist, and that the assignment is unique. Saves the record to the `project_members` join table.
    *   **Exceptions:** Raises `404 Not Found` if project or employee is missing. Raises `400 Bad Request` if the employee is already assigned.
*   **`remove_member(project_id: int, employee_id: int, db: Session = Depends(get_db), user=Depends(require_permission("projects", "update")))`**
    *   **Method / Path:** `DELETE /projects/{project_id}/remove/{employee_id}`
    *   **Description:** Removes an employee assignment from a project.
    *   **Inputs:** Project ID, Employee ID, database session, user context.
    *   **Actions:** Deletes the record from `project_members`.
    *   **Exceptions:** Raises `404 Not Found` if the assignment does not exist.
*   **`get_project_members(project_id: int, db: Session = Depends(get_db), user=Depends(get_current_user))`**
    *   **Method / Path:** `GET /projects/{project_id}/members`
    *   **Description:** Retrieves all employees assigned to a project.
    *   **Inputs:** Project ID, database session, user context.
    *   **Actions:** Resolves the project, enforces scoping for standard employees (who can only view members of projects they belong to), and queries assigned employees.
    *   **Outputs:** JSON list of employee profiles.

---

### D. [routes/departments.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/departments.py)
*Provides CRUD operations for company departments.*

*   **`get_all_departments(db: Session = Depends(get_db), user=Depends(require_permission("departments", "read")))`**
    *   **Method / Path:** `GET /departments`
    *   **Description:** Retrieves the list of all departments.
    *   **Outputs:** JSON list of department names.
*   **`create_department(name: str = Body(embed=True), db: Session = Depends(get_db), user=Depends(require_permission("departments", "create")))`**
    *   **Method / Path:** `POST /departments`
    *   **Description:** Creates a new department.
    *   **Inputs:** JSON body (name), database session, user context.
    *   **Actions:** Verifies uniqueness and saves the new department record.
    *   **Exceptions:** Raises `400 Bad Request` if the name is empty or already exists.
*   **`delete_department(name: str, db: Session = Depends(get_db), user=Depends(require_permission("departments", "delete")))`**
    *   **Method / Path:** `DELETE /departments/{name}`
    *   **Description:** Deletes a department.
    *   **Inputs:** Department Name, database session, user context.
    *   **Actions:** Deletes the department record. Note: Database constraints block deletion if employee records are still assigned to the department.
    *   **Exceptions:** Raises `404 Not Found` if the department does not exist. Raises `400 Bad Request` if the department is not empty.

---

### E. [routes/roles.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/roles.py)
*Provides CRUD operations for system and custom roles.*

*   **`get_all_roles(db: Session = Depends(get_db), user=Depends(require_permission("roles", "read")))`**
    *   **Method / Path:** `GET /roles`
    *   **Description:** Retrieves all roles.
    *   **Outputs:** JSON list of role records (includes `name` and `is_system_role`).
*   **`create_role(name: str = Body(), is_system_role: bool = Body(default=False), db: Session = Depends(get_db), user=Depends(require_permission("roles", "create")))`**
    *   **Method / Path:** `POST /roles`
    *   **Description:** Creates a new custom role.
    *   **Inputs:** JSON body (name, is_system_role), database session, user context.
    *   **Actions:** Saves the new role record. Automatically initializes full permissions in the `role_permissions` matrix table for this new role (all flags default to False).
    *   **Exceptions:** Raises `400 Bad Request` if the name is empty or already exists.
*   **`delete_role(name: str, db: Session = Depends(get_db), user=Depends(require_permission("roles", "delete")))`**
    *   **Method / Path:** `DELETE /roles/{name}`
    *   **Description:** Deletes a custom role.
    *   **Inputs:** Role Name, database session, user context.
    *   **Actions:** Prevents deleting system roles (`is_system_role == True`). Deletes the role record and its associated permissions matrix row.
    *   **Exceptions:** Raises `404 Not Found` if the role does not exist. Raises `400 Bad Request` if attempting to delete a system role, or if employee records are still assigned to the role.

---

### F. [routes/permissions.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/permissions.py)
*Enables dynamic, real-time configuration of the role permissions matrix.*

*   **`get_all_permissions(db: Session = Depends(get_db), user=Depends(require_permission("roles", "read")))`**
    *   **Method / Path:** `GET /permissions`
    *   **Description:** Retrieves the complete role permissions matrix.
    *   **Outputs:** JSON list of permission mapping objects.
*   **`get_permissions_for_role(role_name: str, db: Session = Depends(get_db), user=Depends(require_permission("roles", "read")))`**
    *   **Method / Path:** `GET /permissions/{role_name}`
    *   **Description:** Retrieves all permission flags assigned to a specific role.
    *   **Inputs:** Role Name, database session, user context.
    *   **Outputs:** JSON list of permission mappings for the role.
    *   **Exceptions:** Raises `404 Not Found` if the role does not exist.
*   **`update_permission(role_name: str, resource: str, can_create: bool = Query(None), can_read: bool = Query(None), can_update: bool = Query(None), can_delete: bool = Query(None), db: Session = Depends(get_db), user=Depends(require_permission("roles", "update")))`**
    *   **Method / Path:** `PUT /permissions/{role_name}/{resource}`
    *   **Description:** Dynamically modifies permission flags for a role on a specific resource.
    *   **Inputs:** Role Name, Resource Name, boolean query flags, database session, user context.
    *   **Actions:** Prevents modifying permissions for administrative system roles (`HR_ADMIN` and `IT_ADMIN`). Updates the specified flags for the role.
    *   **Exceptions:** Raises `404 Not Found` if the role does not exist. Raises `400 Bad Request` if attempting to modify permissions for system admins.
