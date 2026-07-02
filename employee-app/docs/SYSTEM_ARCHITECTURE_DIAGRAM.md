# System Architecture Document & Diagrams
## Employee Management System (EMS)

### 1. Architectural Module Layering
The EMS application is structured as a layered system with clear boundaries between the user interface, the API orchestration gateway, the middleware/security checkers, and the ORM database mapping layer.

```text
  +--------------------------------------------------------------+
  |                   User Interface (React SPA)                 |
  +--------------------------------------------------------------+
                                 |
                                 v  (REST API calls / JSON payloads)
  +--------------------------------------------------------------+
  |              API Routing Gateway (FastAPI APIRouter)         |
  |     routes/auth_routes, employees, projects, departments...  |
  +--------------------------------------------------------------+
                                 |
                                 v  (Interceptors / Dependency Guards)
  +--------------------------------------------------------------+
  |             Middleware & Guards Layer (auth.py)              |
  |     JWT Verification, Dynamic Database Permissions Check     |
  +--------------------------------------------------------------+
                                 |
                                 v  (Active Transaction Context / generator yield)
  +--------------------------------------------------------------+
  |                 ORM & Entity Schema (db_models)              |
  |             SQLAlchemy models (Employee, Account...)         |
  +--------------------------------------------------------------+
                                 |
                                 v  (Database Queries)
  +--------------------------------------------------------------+
  |                 Database Instance (PostgreSQL)               |
  +--------------------------------------------------------------+
```

---

### 2. Request-Response Lifecycle
The lifecycle below demonstrates how a client request flows through the validation, authentication, and execution checks before generating a database transaction.

```text
HTTP Request (Headers & Body)
  │
  ├───> [1] Bearer Header Check (FastAPI HTTPBearer)
  │         * Extracts JWT token
  │
  ├───> [2] Token Decode & Expiration Check (auth.py)
  │         * Rejects if token expired or signature invalid
  │
  ├───> [3] Dynamic Permission Guard (require_permission)
  │         * Queries role_permissions table in PostgreSQL
  │         * Verifies if caller's role is allowed to perform action
  │
  ├───> [4] Input Validation (Pydantic models)
  │         * Checks types, lengths, and constraints
  │         * Aborts with 422 Unprocessable Entity if invalid
  │
  ├───> [5] Business Logic & Db Transaction (routes/ handlers)
  │         * Executes generator get_db() to yield SQLAlchemy SessionLocal
  │         * Enforces circular dependencies checks, department supervision rules
  │
  └───> [6] Commit and Response Serialization
            * Commits transaction, database updates saved
            * Returns sanitized JSON response to client
```

---

### 3. File System Blueprint
The files within the project repository are organized as follows:

```text
employee-app/
├── main.py (App configuration, startup mounts, Swagger config)
├── database.py (PostgreSQL engine connection, Session factory)
├── db_models.py (SQLAlchemy class model mapping and relationships)
├── auth.py (JWT signing, security decorators, permissions middleware)
├── utils.py (Password hashing routines, employee serial ID generation)
├── seed.py (Bootstrap script to build tables and seed defaults)
├── routes/ (API endpoints sub-modules)
│   ├── auth_routes.py (/auth accounts, session creation, password resets)
│   ├── employees.py (/employees directory, managers, reports)
│   ├── projects.py (/projects workspace CRUD, memberships)
│   ├── departments.py (/departments units, supervisor assignments)
│   ├── roles.py (/roles definitions)
│   └── permissions.py (/permissions dynamic access control)
└── frontend/ (React Client Application)
    ├── package.json (Front-end build configurations)
    └── src/
        ├── App.jsx (Route definitions, login guard router mounts)
        └── pages/ (Vite React components)
            ├── Dashboard.jsx (Overview cards, statistics)
            ├── Employees.jsx (Directory view, employee creation)
            ├── Login.jsx (Stateless login, token caching)
            ├── Organization.jsx (Department lists, organizational trees)
            ├── Permissions.jsx (Interactive Dynamic RBAC Matrix Grid)
            ├── Profile.jsx (Profile editor, Reset Pass/Username, Supervisions)
            └── Projects.jsx (Project lists, employee assignment panels)
```
