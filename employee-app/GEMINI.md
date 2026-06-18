# Employee Management System (FastAPI)

A robust backend system for managing employees, projects, departments, and roles with a dynamic Role-Based Access Control (RBAC) system.

## Project Overview

- **Framework:** FastAPI (Python 3.x)
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Migrations:** Alembic
- **Authentication:** JWT (JSON Web Tokens) with stateless verification.
- **Authorization:** Dynamic RBAC where permissions (Create, Read, Update, Delete) for roles on resources are stored in the database.
- **Documentation:** Interactive Swagger UI available at `/docs`.

## Architecture

- `main.py`: Entry point. Configures the FastAPI app and registers routers.
- `routes/`: Modular endpoint definitions for Employees, Projects, Auth, etc.
- `db_models.py`: SQLAlchemy table definitions.
- `database.py`: Database engine and session management.
- `auth.py`: Security logic, JWT creation/decoding, and permission dependencies.
- `seed.py`: Script to initialize the database with default roles, permissions, and admin accounts.
- `utils.py`: General utility functions (e.g., password hashing).

## Building and Running

### Prerequisites

- Python 3.8+
- PostgreSQL instance running.
- `.env` file in the root directory with the following variables:
  ```env
  DATABASE_URL=postgresql://user:password@localhost:5432/dbname
  SECRET_KEY=your_super_secret_key_here
  ```

### Setup

1.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

2.  **Install Dependencies:**
    *(Note: Ensure all required packages like fastapi, uvicorn, sqlalchemy, psycopg2-binary, pyjwt, python-dotenv are installed)*
    ```bash
    pip install fastapi uvicorn sqlalchemy psycopg2-binary pyjwt python-dotenv alembic
    ```

3.  **Database Migrations:**
    Initialize or update the database schema:
    ```bash
    alembic upgrade head
    ```

4.  **Seed Initial Data:**
    Run the seeding script to create default roles and admin accounts:
    ```bash
    python seed.py
    ```

### Running the Application

Start the development server:
```bash
uvicorn main:app --reload
```
The API will be available at `http://127.0.0.1:8000`.

## Development Conventions

- **Modular Routes:** Always use `APIRouter` in the `routes/` directory and include them in `main.py`.
- **Database Sessions:** Use the `get_db` dependency for database access in route handlers.
- **Security:** 
    - Use `get_current_user` to require authentication.
    - Use `require_permission(resource, action)` for granular access control.
- **Schemas:** Pydantic models should be used for request validation and response serialization (Check `routes/` for examples).
- **Naming:** Follow PEP 8 conventions. Use descriptive names for database models and columns.

## Testing

- **Swagger UI:** Use `http://127.0.0.1:8000/docs` for manual testing of endpoints.
- **Postman:** Request collections can be organized to test the full lifecycle of the API.
- **Admin Credentials (Post-Seed):**
    - **HR Admin:** `hradmin` / `Pass@123`
    - **IT Admin:** `itadmin` / `Pass@123`
