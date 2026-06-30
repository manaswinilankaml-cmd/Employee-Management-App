# Frontend-Backend Integration & Security Boundary Guide

This document details the communication protocol, state synchronization, and authorization boundaries between the React client and the FastAPI backend service.

---

## 1. Full-Stack Data Flow Hierarchy

The relationship and communication flow between the React user interface, state management, HTTP client layer, and the FastAPI routers are structured as a vertical pipeline:

```text
React User Interface (Vite Client)
└── React State Context (Manages Auth & cached permissions)
     └── Trigger Actions (Axios/Fetch HTTP Client)
          └── Inject Bearer <JWT> into Authorization Headers
               └── FastAPI API Router Gateway
                    └── Decode JWT Security Middleware
                         └── Dynamic Database Permissions Matcher
                              └── Database Commit / Query (SQLAlchemy ORM)
                                   └── Return JSON Data Response (Serialized via Pydantic)
                                        └── Re-render React UI Component (Reconcile DOM)
```

---

## 2. Authentication & JWT Handshake Protocol

The session lifecycle is stateless. Authenticated requests use standard HTTP headers to transmit credentials:

```text
[1] Submit LoginForm (React credentials capture)
 └── [2] POST Request payload sent to /auth/login
      └── [3] Password Verification (Bcrypt comparison check)
           └── [4] Generate JWT Signature (HS256 with Private Secret Key)
                └── [5] Return Access Token in HTTP JSON Response
                     └── [6] Save JWT into Local Storage (localStorage.setItem)
                          └── [7] Inject Token as Authorization: Bearer <JWT> in all headers
```

### A. JWT Transmission & Storage
1. **Login Handshake:** The React frontend captures `username` and `password` and executes a `POST` request with a JSON payload to `/auth/login`.
2. **Token Issuance:** The backend verifies the password hash, generates a JWT, and returns it inside a JSON wrapper:
   ```json
   {
     "message": "Login successful!",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "role": "DEPARTMENT HEAD",
     "employee_id": 19,
     "emp_id": "IM-2026-0019",
     "username": "Anjan"
   }
   ```
3. **Client Cache:** The React application extracts the token and metadata, saving them in local storage.

### B. Header Injection & Axios/Fetch Setup
All subsequent API requests require authentication. The client adds the token to the standard `Authorization` header:
```javascript
const token = localStorage.getItem('token');
const response = await fetch('/employees', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 3. Dynamic UI Sync & Dynamic RBAC Guarding

To maintain visual consistency and prevent unauthorized attempts, the React client synchronizes its view permissions directly with the dynamic database RBAC matrix.

```text
App Mount / Login Successful
└── GET /permissions/{role} (Retrieve Dynamic Flags)
     └── Cache Permission State in React Context
          ├── employee?.can_create == True
          │    └── Render "Add Employee" UI Component
          └── employee?.can_delete == True
               └── Render "Delete" Action Button
```

### A. Dynamic UI Guarding
* The frontend fetches `/permissions/{role}` immediately after a successful login.
* The fetched permission flags (e.g., `can_create`, `can_read`, `can_update`, `can_delete` for resources like `employees`, `projects`, `accounts`) are cached in state.
* UI elements are rendered conditionally:
  ```jsx
  {permissions.employees?.can_create && (
    <button onClick={openCreateModal}>Add Employee</button>
  )}
  ```

### B. Absolute API Enforcement
UI guarding is for user experience only. The backend acts as the source of truth and enforces security regardless of frontend UI overrides:
* Even if an attacker unhides a "Delete" button in the browser DOM, executing the corresponding `DELETE /employees/{id}` request will trigger the backend `require_permission("employees", "delete")` check, resulting in a `403 Forbidden` response.

---

## 4. REST Endpoint API Mapping Matrix

The contract between the React interface and the FastAPI routers maps as follows:

| React Page / Component | User Action | HTTP Method | API Endpoint | Success Handler |
| :--- | :--- | :--- | :--- | :--- |
| **Login.jsx** | Form Submit | `POST` | `/auth/login` | Stores token, routes to `/` |
| **Employees.jsx** | Load Directory | `GET` | `/employees` | Renders employee table (Admin gets sorted, Dept Head gets department scope) |
| **Employees.jsx** | Search Skills | `GET` | `/employees/department/{dept}/skill/{skill}` | Renders filtered skill list |
| **Profile.jsx** | Edit Details | `PUT` | `/employees/{emp_id}/update-name` | Updates state, displays success toast |
| **Profile.jsx** | Save Manager | `POST` | `/employees/{emp_id}/assign-manager/{mgr_emp_id}` | Refreshes reporting hierarchy card |
| **Profile.jsx** | Remove Manager | `POST` | `/employees/{emp_id}/remove-manager` | Clears reporting supervisor field |
| **Profile.jsx** | Split Role Selection | `PUT` | `/employees/{id}/role` | Updates profile role status |
| **Profile.jsx** | Create Account | `POST` | `/auth/create-account/{employee_id}` | Registers login account, defaults to employee profile role |
| **Profile.jsx** | Deactivate User | `PUT` | `/auth/deactivate/{account_id}` | Sets user status to disabled |
| **Projects.jsx** | Load List | `GET` | `/projects` | Renders project card layout |
| **Permissions.jsx** | Toggle Matrix | `PUT` | `/permissions/{role}/{resource}` | Updates dynamic permissions matrix instantly |

---

## 5. API Response & Error Handling Protocols

The frontend uses interceptor logic to handle HTTP responses gracefully:
* **`200 OK` / `201 Created`:** Parse JSON response body and update UI state.
* **`401 Unauthorized`:** Triggered when the JWT token signature is invalid or expired. The frontend immediately clears `localStorage` and redirects the user to the `/login` screen.
* **`403 Forbidden`:** Triggered by RBAC permissions violations or department scoping checks. The frontend cancels the action and renders an alert toast: *"Error: You do not have permission to execute this operation."*
* **`422 Unprocessable Entity`:** Triggered when form parameters fail FastAPI's Pydantic model validations. The client highlights the specific invalid input fields.
