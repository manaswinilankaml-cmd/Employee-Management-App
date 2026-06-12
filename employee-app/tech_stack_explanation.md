# Employee Management App - Tech Stack Explanation

This document provides a detailed, section-by-section explanation of where and how each technology in the tech stack is used within the Employee Management Application.

---

## 1. FastAPI
FastAPI is the core web framework used to build the REST API endpoints and manage application logic, request/response lifecycle, and dependency injection.

### Where it is used:
* **[main.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/main.py):** The application entry point where the FastAPI app instance is created and sub-routers are registered.
* **[routes/](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/routes/) Directory:** Houses all endpoint modules:
  * [auth_routes.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/routes/auth_routes.py) — Credentials & login.
  * [employees.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/routes/employees.py) — Employee CRUD & details.
  * [projects.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/routes/projects.py) — Project details & memberships.
  * [departments.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/routes/departments.py) — Department tracking.
  * [roles.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/routes/roles.py) — Role configuration.
  * [permissions.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/routes/permissions.py) — Dynamic permission management.

### How it is used:
* **App Instantiation:** Defined in `main.py` using `app = FastAPI(...)` with metadata such as title, description, and API version.
* **Router Aggregation:** Utilizes `APIRouter()` in individual route modules, which are imported and registered in the main application via `app.include_router(router, tags=[...])`.
* **Dependency Injection:** Uses `Depends` to inject database sessions (`get_db`) and security/authorization layers (e.g., `get_current_user` and `require_permission`).
* **Request & Response Handling:** Parses incoming JSON request payloads via `Body()` and automatically serializes SQLAlchemy structures or standard python dicts into outgoing JSON responses.

---

## 2. PostgreSQL
PostgreSQL is the database engine that provides persistent relational storage for the application.

### Where it is used:
* **Configuration:** Defined in the `.env` file via `DATABASE_URL` and loaded in [database.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/database.py).
* **Storage:** Holds the persistent tables on the PostgreSQL instance.

### How it is used:
* Serves as the relational storage layer. The database hosts the following tables:
  1. `employees` — Standard worker demographics and reporting hierarchy.
  2. `employee_skills` — Skills mapped to employees (one-to-many relationship).
  3. `accounts` — Login credentials, active status flags, and roles.
  4. `departments` — Company departments.
  5. `roles` — Custom and system roles.
  6. `projects` — Active projects.
  7. `project_members` — Bridge table mapping employees to projects (many-to-many relationship).
  8. `role_permissions` — Table storing CRUD access flags (create, read, update, delete) for roles on resources.

---

## 3. SQLAlchemy
SQLAlchemy is the Object-Relational Mapper (ORM) that translates Python objects and queries into raw SQL queries executed on PostgreSQL.

### Where it is used:
* **[database.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/database.py):** Initializes the engine, sessionmaker, and declarative base class.
* **[db_models.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/db_models.py):** Defines the database table models.
* **[auth.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/auth.py) & [routes/](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/routes/):** Used to perform all database queries.

### How it is used:
* **ORM Mapping:** Table models are declared as Python classes inheriting from `Base = declarative_base()`. It maps data types (e.g. `Column`, `Integer`, `String`), constraints (`UniqueConstraint`), and links tables using `ForeignKey` and `relationship()`.
* **Session Management:** Provides a `get_db()` generator yielding a `SessionLocal()` object, which is injected into routes using FastAPI dependency injection. The session tracks object states and is committed (`db.commit()`), queried (`db.query()`), or rolled back (`db.rollback()`) within try-except blocks.

---

## 4. JWT (JSON Web Tokens)
JWT is used to implement a stateless, secure authentication and authorization mechanism for client requests.

### Where it is used:
* **[auth.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/auth.py):** Contains logic to encode and decode tokens.
* **[routes/auth_routes.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/routes/auth_routes.py):** Issues tokens upon successful login (`/auth/login`).

### How it is used:
* **Token Creation:** The `create_token(account_id, role)` helper signs a payload including the `account_id`, `role`, and expiration timestamp (`exp` set to 8 hours) using the `PyJWT` library, `HS256` hashing algorithm, and the environmental `SECRET_KEY`.
* **Token Verification:** Custom dependency `get_current_user` extracts the JWT bearer token from the client's request `Authorization: Bearer <token>` header, decodes it using `jwt.decode()`, checks for validity/expiration, and extracts the payload.
* **Role-Based Access Control (RBAC):** The `require_permission(resource, action)` dependency uses the decoded token's role to query the `role_permissions` database table and check if the role has permission to run the requested action (create/read/update/delete) on that resource.

---

## 5. Alembic
Alembic is the database migration tool used to manage and track schema changes incremental over time.

### Where it is used:
* **`alembic.ini`:** Global configuration file at the root level of the project.
* **`alembic/` Directory:** Hosts migration configurations (`env.py`) and generated versions (`alembic/versions/` subdirectory).

### How it is used:
* **Schema Evolution:** Connects to the database and tracks modifications made to [db_models.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/db_models.py) relative to the database state.
* **Migration Scripts:** Command lines such as `alembic revision --autogenerate -m "description"` generate migration scripts under `alembic/versions/` which are executed via `alembic upgrade head` to safely apply changes (like adding/removing fields or tables) to the PostgreSQL instance without wiping existing data.

---

## 6. Swagger
Swagger automatically generates interactive API documentation for developer reference and manual API testing.

### Where it is used:
* Available at `/docs` when running the FastAPI server.
* Configuration defined in [main.py](file:///d:/Emp_App_Repo/Employee-Management-App/employee-app/main.py) and annotations throughout route handlers.

### How it is used:
* **Auto-Documentation:** Parses FastAPI path decorators, parameters, type annotations, schemas, and descriptions to yield an OpenAPI specification.
* **Testing Client:** Groups routes by resource using tags (e.g. `Employees`, `Authentication`), and renders schemas for expected requests/responses, enabling live requests to be sent from the browser.

---

## 7. Postman
Postman is an external application used by developers to test, automate, and organize API request structures.

### Where it is used:
* Client-side tool run on development machines.

### How it is used:
* **REST API Testing:** Configures and saves request collections matching application routes (like GET, POST, PUT, DELETE operations).
* **JWT Request Headers:** Simulates frontend client behavior by sending raw JSON request bodies, receiving and saving authentication tokens, and injecting the Bearer Token into headers to verify correct response status codes (200, 201, 401, 403, 404, etc.).
