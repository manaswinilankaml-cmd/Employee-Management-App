# Software Requirements Specification (SRS)
## Employee Management System (EMS)

### 1. Introduction
This Software Requirements Specification (SRS) details the functional and non-functional requirements for the Employee Management System (EMS). It provides the technical criteria for system verification.

---

### 2. Overall Description
The EMS is a web application comprising a Fastapi backend (Python 3) and a React frontend (Vite/JavaScript). The system interfaces with a PostgreSQL database using SQLAlchemy ORM.

#### 2.1 Product Perspective
* **Frontend client:** Single Page Application (SPA) communicating with the backend via JSON REST APIs.
* **Backend service:** Stateless API gateway implementing authorization checks on every endpoint.
* **Database:** Relational schema enforcing foreign keys and unique constraints.

#### 2.2 System Stack
* **Language:** Python 3.8+ (Backend), JavaScript (Frontend)
* **Frameworks:** FastAPI, React (Vite)
* **Database:** PostgreSQL
* **ORM:** SQLAlchemy
* **Authentication:** PyJWT (stateless JWT tokens)
* **Cryptography:** bcrypt (for password hashing)

---

### 3. Functional Requirements
* **FR-1 [User Auth]:** The system must generate signed HS256 JWT tokens upon successful login with credentials.
- **FR-2 [Dynamic Permission Enforcement]:** Backend endpoints must dynamically verify user access via database-driven permissions (`role_permissions` table) rather than hardcoded role labels.
- **FR-3 [Department Scoping]:** Non-administrative users (DEPT_HEAD) must only access resources (Employees, Projects, Managers) within their scoped department or supervised departments.
- **FR-4 [Supervision Extension]:** The system must support the `DepartmentSupervisor` table to allow managers (like CEO/CTO) to oversee cross-department reportees and projects.
- **FR-5 [Circular Loop Prevention]:** Circular reporting line assignments (e.g. employee A reports to B, B reports to C, C reports to A) must be blocked programmatically during manager assignment.
- **FR-6 [Administrative Account Tools]:** Admins must be able to change usernames (correcting typos) and reset passwords for any active login account.

---

### 4. Non-Functional Requirements (NFR)
* **NFR-1 [Security]:** All passwords must be hashed using bcrypt before database storage. No plain-text passwords should ever be stored or logged.
* **NFR-2 [Performance]:** Database queries must utilize request-scoped session pools (`get_db` generator) to prevent connection leaks.
* **NFR-3 [Statelessness]:** Client sessions must be stateless; user details are derived dynamically from token decoding and database validation.
* **NFR-4 [Aesthetics]:** The user interface must employ a modern design system using curated color tokens, hover micro-animations, and bento grids for clear navigation.
