# API Specification & Route Reference
## Employee Management System (EMS)

### 1. Overview
The EMS backend exposes standard REST API endpoints. All requests and responses exchange JSON payloads. The system provides an interactive Swagger UI at `http://127.0.0.1:8000/docs` or ReDoc at `http://127.0.0.1:8000/redoc`.

---

### 2. Authorization Headers
All endpoints except `POST /auth/login` require an `Authorization` HTTP header populated with the JWT bearer token:
```http
Authorization: Bearer <your_jwt_access_token>
```

---

### 3. API Routes

#### 3.1 Authentication Mappings (`/auth`)

* **`POST /auth/login`**
  * **Description:** Authenticates credentials and returns a JWT access token.
  * **Body:** `{"username": "...", "password": "..."}`
  * **Response:** `{"access_token": "...", "token_type": "bearer", "role": "..."}`

* **`POST /auth/create-account/{employee_id}`**
  * **Description:** Provisions a login account for an existing employee profile.
  * **Body:** `{"username": "...", "password": "...", "role": "..."}`
  * **Access:** Accounts: Create

* **`PUT /auth/toggle-account-status/{account_id}`**
  * **Description:** Enables or deactivates login access for a user.
  * **Access:** Accounts: Update (blocks deactivating system admins).

* **`PUT /auth/change-password`**
  * **Description:** Authenticated users update their own password.
  * **Body:** `{"current_password": "...", "new_password": "..."}`

* **`PUT /auth/admin-reset-password/{account_id}`**
  * **Description:** Reset password and/or change username for an account.
  * **Body:** `{"new_password": "...", "new_username": "..."}` (Both optional, but at least one required).
  * **Access:** Accounts: Update

---

#### 3.2 Employees & Directory Mappings (`/employees`)

* **`GET /employees`**
  * **Description:** List employees, scoped by the caller's role and supervision scopes.
  * **Access:** Employees: Read

* **`GET /employees/{employee_id}`**
  * **Description:** Fetch detail profile of a single employee.
  * **Access:** Employees: Read (enforces scope rules).

* **`POST /employees`**
  * **Description:** Add a new employee profile.
  * **Body:** `{"name": "...", "department": "...", "role": "..."}`
  * **Access:** Employees: Create

* **`PUT /employees/{employee_id}/manager`**
  * **Description:** Set manager reporting connection.
  * **Query Parameters:** `manager_emp_id` (string)
  * **Access:** Employees: Update (enforces circular validation and supervision department bounds).

* **`GET /employees/{manager_emp_id}/reportees`**
  * **Description:** Fetch reportees list for a manager.
  * **Access:** Employees: Read

* **`POST /employees/{employee_id}/skills`**
  * **Description:** Add skill tag.
  * **Body:** `{"skill_name": "..."}`
  * **Access:** Employees: Update

* **`DELETE /employees/{employee_id}/skills/{skill_name}`**
  * **Description:** Remove skill tag.
  * **Access:** Employees: Update

---

#### 3.3 Project Workspaces (`/projects`)

* **`GET /projects`**
  * **Description:** List projects.
  * **Access:** Projects: Read

* **`POST /projects`**
  * **Description:** Create a new project.
  * **Query Parameters:** `name` (string)
  * **Access:** Projects: Create

* **`POST /projects/{project_id}/assign/{employee_id}`**
  * **Description:** Add member to project.
  * **Access:** Projects: Update

* **`DELETE /projects/{project_id}/remove/{employee_id}`**
  * **Description:** Remove member from project.
  * **Access:** Projects: Update

---

#### 3.4 Departments & Supervision Mappings (`/departments`)

* **`GET /departments`**
  * **Description:** Fetch departments list.
  * **Access:** Departments: Read

* **`POST /departments`**
  * **Description:** Add a new department.
  * **Access:** Departments: Create

* **`POST /departments/{department_id}/supervisors/{employee_id}`**
  * **Description:** Assign employee to supervise department (cross-department management scope).
  * **Access:** Departments: Update

* **`DELETE /departments/{department_id}/supervisors/{employee_id}`**
  * **Description:** Remove department supervisor assignment.
  * **Access:** Departments: Update

* **`GET /departments/{department_id}/supervisors`**
  * **Description:** List supervisors for a department.
  * **Access:** Departments: Read

* **`GET /employees/{employee_id}/supervisions`**
  * **Description:** List departments supervised by an employee.
  * **Access:** Departments: Read
