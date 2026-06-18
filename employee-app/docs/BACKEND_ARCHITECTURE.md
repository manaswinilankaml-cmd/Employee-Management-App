# Backend Architecture & System Design

## 1. System Overview
The Employee Management System (EMS) is built on a modular FastAPI backend with a dynamic PostgreSQL-backed Role-Based Access Control (RBAC) system.

## 2. Structural Mind Map
```mermaid
mindmap
  root((EMS Backend))
    Core Tables
      Employees
        Details: emp_id, name, dept, role, manager_id
        Relations: Skills, Account, ProjectMembers
      Accounts
        Auth: username, password_hash, is_active
        Access: Linked to Employee OR Standalone Admin
      Projects
        Details: name
        Relations: ProjectMembers (Join Table)
      Departments
        Details: name
    RBAC System
      Roles
        Types: System (Admin) vs Custom
      Permissions
        Matrix: Resource x Role x Action (C,R,U,D)
    API Services
      Auth Service
        Login: JWT Generation
        Access Control: Role & Permission Guards
      Management Services
        Employee CRUD
        Project CRUD
        Dept/Role CRUD
```

## 3. Data Schema
| Model | Description | Key Relationships |
| :--- | :--- | :--- |
| **Employee** | Central entity for staff data. | Account (1:1), Skills (1:N), Projects (M:N) |
| **Account** | Credentials and Role assignment. | Employee (Optional), Role (FK) |
| **Project** | Business initiatives. | Members (M:N via ProjectMember) |
| **Department** | Organizational grouping. | Employees (N:1) |
| **RolePermission** | Dynamic CRUD flags per role. | Maps Roles to Resources |

## 4. Security Architecture
- **Authentication:** Stateless JWT (JSON Web Tokens) with an 8-hour expiry.
- **Authorization:** 
    - `require_role`: Hardcoded gates for critical system settings.
    - `require_permission`: Database-driven checks for granular resource access (Create, Read, Update, Delete).
- **Password Safety:** Bcrypt hashing via `utils.py`.
