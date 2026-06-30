# Backend Architecture & System Design Guide

This document provides a deep-dive architectural blueprint of the Employee Management System (EMS) backend. It details the system design, framework choices, core database structures, security protocols, and advanced Python and FastAPI paradigms employed in the system.

---

## 1. Architectural Module Hierarchy

The EMS backend follows a modular, layer-separated structure. The layout below maps the parent-child dependencies of each module, from the core database configurations up to the endpoint router layers:

```text
EMS System Entrypoint (main.py)
├── API Routing Layer (routes/)
│   ├── auth_routes.py (/auth Account Mappings)
│   ├── employees.py (/employees Directory CRUD)
│   ├── projects.py (/projects Workspace Mappings)
│   ├── departments.py (/departments Structure)
│   ├── roles.py (/roles Custom Definitions)
│   └── permissions.py (/permissions Dynamic Grid)
├── Security & Authorization (auth.py)
│   ├── JWT Cryptography (PyJWT)
│   ├── Password Hashing (Passlib/Bcrypt)
│   └── Dynamic RBAC Middleware (Dynamic Matrix Checks)
└── Database Engine & Config (database.py)
    ├── SQLAlchemy ORM Mapping (db_models.py)
    ├── Alembic Migrations Configuration (alembic/)
    └── PostgreSQL Instance Connection
```

---

## 2. Core Python Concepts & Database Engine

At the foundation of the architecture is the **SQLAlchemy Object-Relational Mapper (ORM)** and Python's native resource-management tools.

```text
[1] Database Engine (PostgreSQL Connection URL)
 └── [2] SessionLocal Factory (Creates transaction-scoped Session objects)
      └── [3] get_db() Context Manager (Generates db session context using 'yield')
           └── [4] FastAPI Route Execution (Accepts session via Dependency Injection)
                └── [5] Transaction Release (db.close() executing in 'finally' block)
```

### A. Context Managers & Generator Functions
To prevent connection leaks and ensure database transactions are closed safely, the backend utilizes Python **Generators** inside a context manager loop:
* **The `get_db()` function** utilizes the `yield` keyword.
* Python treats functions containing `yield` as generator objects. 
* When FastAPI executes the route, it runs `get_db()` up to the `yield` statement, passing the database session context to the handler.
* Once the route handler returns its response (or encounters an error), the control returns to `get_db()`, executing the `finally` block to close the database transaction:
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() # Executes unconditionally after the response is sent
```

### B. Transaction Safety and SQLAlchemy Cascades
* **Rollbacks on Exceptions:** All database write routines (Create, Update, Delete) are wrapped in `try-except` blocks. If database constraints are violated (e.g. unique username check or foreign key mismatches), the session executes `db.rollback()` to discard the transaction, maintaining state integrity.
* **On-Delete Cascades:** Relationships between entities are defined using SQLAlchemy's structural cascade arguments:
  * **Employee to Employee (Reporting Lines):** The `manager_id` points self-referentially to `Employee.id`. If a manager profile is deleted, `ondelete="SET NULL"` is triggered on the database level, ensuring all direct reports have their manager field cleared rather than causing orphaned rows.
  * **Employee to Account:** A `1:1` relationship. If an Employee profile is deleted, their associated login `Account` is automatically purged via cascading rules.

---

## 3. FastAPI Framework & Request-Response Lifecycles

FastAPI coordinates incoming HTTP requests, routes them to handlers, translates database models, and generates live documentation.

```text
HTTP Client Request
└── Route Matching (APIRouter)
     └── Dependency Injection Resolvers (Depends)
          └── Pydantic Schema Parsing & Validation
               ├── INVALID DATA: Abort with 422 Unprocessable Entity Response
               └── VALID DATA: Execute Database Query (SQLAlchemy ORM)
                    └── Pydantic Response Serialization (stripping sensitive columns)
                         └── Return HTTP JSON Response
```

### A. Dependency Injection (`Depends`)
FastAPI's dependency injection container handles setup and safety constraints:
* **Decoupled Database Sessions:** Routes do not instantiate database connections. They declare `db: Session = Depends(get_db)`, allowing FastAPI to inject the current request's session automatically.
* **Declarative Guards:** Security policies are declared inside route parameters using `Depends(get_current_user)` or `Depends(require_permission("resource", "action"))`. The request is intercepted, evaluated, and aborted with an HTTP error before execution reaches the function body if checks fail.

### B. Pydantic Schemas & Input Sanitization
The system employs Pydantic models to define strict data boundaries:
* **JSON Deserialization:** Incoming request bodies are matched against Pydantic definitions (e.g., `EmployeeCreate`). Data types are verified, strings trimmed, and unknown fields dropped during parsing.
* **JSON Serialization:** Outgoing database models are passed through Pydantic response schemas (e.g., `EmployeeResponse`), stripping sensitive parameters (like hashed password columns) before rendering JSON to the client.

### C. Exception Handling Architecture
HTTP status codes are returned using FastAPI’s `HTTPException`:
* `400 Bad Request`: Used for logical validation issues (e.g., circular reporting line loops, self-management, or empty names).
* `401 Unauthorized`: Used for authentication failures (e.g., invalid passwords, missing headers, or expired tokens).
* `403 Forbidden`: Used for authorization denials (e.g., role-based RBAC constraints, or department-scoping violations).
* `404 Not Found`: Returned when resources do not exist in the database.

---

## 4. Security, Cryptography & Access Control (RBAC)

The system maintains security via dynamic Role-Based Access Control (RBAC) and stateless cryptographic tokens.

```text
Client Request Header (Bearer <JWT>)
└── Decode JWT Signature (auth.py)
     └── Verify Expiry & Signature Integrity (HS256 algorithm)
          └── Fetch Active Account DB Status
               ├── ADMIN ROLE (HR_ADMIN / IT_ADMIN)
               │    └── Global Scoping (Full Access Granted)
               └── CUSTOM / DEFAULT ROLES
                    └── Query Database Permission Matrix (can_read/create/update/delete)
                         ├── Flag is FALSE: Abort with 403 Forbidden
                         └── Flag is TRUE: Enforce Dynamic Data Scopes
                              ├── Department Head: Filtered to same Department
                              ├── Manager: Filtered to self and direct reports
                              └── Employee: Filtered strictly to self profile record
```

### A. Stateless JWT Authentication
* **No Database Sessions:** Sessions are not persisted in the database. When a user logs in, a JSON Web Token (JWT) is cryptographically signed using the `HS256` HMAC-SHA256 algorithm with a private `SECRET_KEY`.
* **Payload Contents:** The token payload contains the account's unique ID, current role, and the token expiration timestamp (`exp` set to 8 hours).
* **Cryptographic Verification:** Every request decodes the token. If the signature is invalid or the token expired, the request is instantly rejected on the API boundary.

### B. Passlib Bcrypt Hashing
* Passwords are never saved in plain text.
* The system utilizes **Bcrypt**, a slow, salted hashing function. 
* Salting inserts random bytes into the password before hashing, which prevents rainbow table attacks.
* Hashing verification uses `pwd_context.verify()` inside `utils.py`, preventing timing attacks by comparing password hashes in constant time.

### C. Database-Driven RBAC Matrix
Unlike static systems where permissions are hardcoded into decorators, authorization is dynamic:
* The `role_permissions` table maps roles to resources with four CRUD flags: `can_create`, `can_read`, `can_update`, and `can_delete`.
* The dependency `require_permission(resource, action)` dynamically queries this matrix on every request.
* Administrators can change these permissions at runtime in the UI, modifying system access rules immediately without restarting the application or modifying code.
