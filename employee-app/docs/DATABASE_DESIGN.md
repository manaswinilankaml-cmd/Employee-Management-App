# Database Design Document
## Employee Management System (EMS)

### 1. Database Engine
* **Engine:** PostgreSQL
* **ORM:** SQLAlchemy (Python)
* **Migrations Tool:** Alembic

---

### 2. Entity Relationship Diagram (ASCII Structure)
The diagram below shows the primary foreign keys and tables mappings:

```text
  +------------------+         +------------------+         +--------------------------+
  |    departments   |         |     employees    |         |   department_supervisors |
  +------------------+         +------------------+         +--------------------------+
  | id (PK, Serial)  |<---+    | id (PK, Serial)  |<--------| employee_id (FK, Unique) |
  | name (UQ, Varchar)|    +---| department (FK)  |         | department_id (FK, UQ)   |
  +------------------+         | role (FK)        |---+     +--------------------------+
                               | manager_id (FK)  |   |
                               +------------------+   |
                                 ^      |             |
                                 |      |             v
  +------------------+           |      |           +------------------+
  |     accounts     |-----------+      |           |      roles       |
  +------------------+                  |           +------------------+
  | id (PK, Serial)  |                  |           | id (PK, Serial)  |
  | username (UQ)    |                  |           | name (UQ)        |<---+
  | employee_id (FK) |                  |           +------------------+    |
  | role (FK)--------+                  |                                   |
  +------------------+                  v                                   |
                               +------------------+         +------------------+    |
                               | project_members  |         | role_permissions |    |
                               +------------------+         +------------------+    |
                               | project_id (FK)  |         | role_name (FK)---+----+
                               | employee_id (FK) |         | resource         |
                               +------------------+         +------------------+
                                        |
                                        v
                               +------------------+
                               |     projects     |
                               +------------------+
                               | id (PK, Serial)  |
                               | name (UQ)        |
                               +------------------+
```

---

### 3. Schema & Data Dictionary

#### 3.1 Table: `roles`
Stores authorization security levels.
* `id` (Integer, Primary Key, Auto-increment)
* `name` (VARCHAR(255), Unique, Nullable=False)
* `is_system_role` (Boolean, Default=False)

#### 3.2 Table: `departments`
Stores company department units.
* `id` (Integer, Primary Key, Auto-increment)
* `name` (VARCHAR(255), Unique, Nullable=False)

#### 3.3 Table: `employees`
Stores employee profiles.
* `id` (Integer, Primary Key, Auto-increment)
* `emp_id` (VARCHAR(255), Unique, Index=True)
* `name` (VARCHAR(255), Nullable=False)
* `department` (VARCHAR(255), ForeignKey("departments.name"))
* `role` (VARCHAR(255), ForeignKey("roles.name"), Nullable=True)
* `manager_id` (Integer, ForeignKey("employees.id", ondelete="SET NULL"), Nullable=True)

#### 3.4 Table: `employee_skills`
Stores professional skills of employees (One-to-Many).
* `id` (Integer, Primary Key, Auto-increment)
* `employee_id` (Integer, ForeignKey("employees.id", ondelete="CASCADE"))
* `skill` (VARCHAR(255), Nullable=False)

#### 3.5 Table: `accounts`
Stores login credentials and application roles.
* `id` (Integer, Primary Key, Auto-increment)
* `username` (VARCHAR(255), Unique, Nullable=False)
* `password_hash` (VARCHAR(255), Nullable=False)
* `is_active` (Boolean, Default=True)
* `role` (VARCHAR(255), ForeignKey("roles.name"))
* `employee_id` (Integer, ForeignKey("employees.id", ondelete="CASCADE"), Nullable=True)

#### 3.6 Table: `projects`
Stores team project containers.
* `id` (Integer, Primary Key, Auto-increment)
* `name` (VARCHAR(255), Unique, Nullable=False)

#### 3.7 Table: `project_members`
Links employees to projects (Many-to-Many Join Table).
* `id` (Integer, Primary Key, Auto-increment)
* `project_id` (Integer, ForeignKey("projects.id", ondelete="CASCADE"))
* `employee_id` (Integer, ForeignKey("employees.id", ondelete="CASCADE"))
* **Constraint:** Unique(project_id, employee_id)

#### 3.8 Table: `role_permissions`
Stores CRUD permissions grid for RBAC verification.
* `id` (Integer, Primary Key, Auto-increment)
* `role_name` (VARCHAR(255), ForeignKey("roles.name", onupdate="CASCADE"))
* `resource` (VARCHAR(255), Nullable=False)
* `can_create` (Boolean, Default=False)
* `can_read` (Boolean, Default=False)
* `can_update` (Boolean, Default=False)
* `can_delete` (Boolean, Default=False)
* **Constraint:** Unique(role_name, resource)

#### 3.9 Table: `department_supervisors`
Defines supervision relationships (Many-to-Many Join Table).
* `id` (Integer, Primary Key, Auto-increment)
* `employee_id` (Integer, ForeignKey("employees.id", ondelete="CASCADE"))
* `department_id` (Integer, ForeignKey("departments.id", ondelete="CASCADE"))
* **Constraint:** Unique(employee_id, department_id)
