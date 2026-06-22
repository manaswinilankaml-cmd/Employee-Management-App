# Employee Management System — Role Permissions Matrix

This document summarizes the operations that the **Department Head (`DEPT_HEAD`)**, **Manager (`MANAGER`)**, and **Employee (`EMPLOYEE`)** roles can and cannot perform on the system.

There are two layers of security constraints applied to these roles:
1. **Database-Driven Role Permissions (RBAC):** General CRUD permissions stored in the database.
2. **Application-Level Data Filtering:** Fine-grained context checks implemented in the API routes (e.g., in `routes/employees.py` and `routes/projects.py`) to restrict view access based on department boundaries or management hierarchy.

---

## Operations Permission Matrix

| Resource / Module | Operation / Action | Department Head (`DEPT_HEAD`) | Manager (`MANAGER`) | Employee (`EMPLOYEE`) |
| :--- | :--- | :--- | :--- | :--- |
| **Employees** | **Create / Add** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **Read / List** | ⚠️ Only employees in **their own** department | ⚠️ Only **their direct reportees** and themselves | ⚠️ Only **their own** profile details |
| | **Update / Edit** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **Delete** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **View Reportees** | ⚠️ Only reportees of managers in **their own** department | ⚠️ Only **their own** direct reportees | ❌ Cannot perform |
| **Projects** | **Create / Add** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **Read / List** | 🟢 Can view all projects & members | 🟢 Can view all projects & members | ⚠️ Only projects **they are assigned to** as members |
| | **Assign / Remove Members**| ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **Delete** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| **Accounts** | **Create Account** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **List Accounts** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **Deactivate / Reactivate** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **Change Own Password** | 🟢 Can perform (Self-service) | 🟢 Can perform (Self-service) | 🟢 Can perform (Self-service) |
| | **Forgot/Reset Password** | 🟢 Can perform (Verify with Employee ID) | 🟢 Can perform (Verify with Employee ID) | 🟢 Can perform (Verify with Employee ID) |
| | **Admin Password Reset** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| **Departments** | **Create / Update / Delete** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **Read / List** | 🟢 Can view all departments | 🟢 Can view all departments | 🟢 Can view all departments |
| **Roles** | **Create / Update / Delete** | ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |
| | **Read / List** | 🟢 Can view all roles | 🟢 Can view all roles | 🟢 Can view all roles |
| **Permissions (RBAC)**| **View / Modify Permissions**| ❌ Cannot perform | ❌ Cannot perform | ❌ Cannot perform |

---

## Highlights of Key Restrictions

* **Employee Data Boundary:** While `DEPT_HEAD`, `MANAGER`, and `EMPLOYEE` are granted `Read` access to the employee model, the route backend (`routes/employees.py`) filters the database results dynamically:
  * A `DEPT_HEAD` is limited to viewing employee records within their own department.
  * A `MANAGER` is limited to viewing their direct reportees.
  * An `EMPLOYEE` is restricted to viewing only their own record.
* **Project Membership Limit:** The project lists and member details (`routes/projects.py`) are unrestricted for `DEPT_HEAD` and `MANAGER`, but an `EMPLOYEE` is barred from querying projects they do not participate in.
* **Account Controls:** Accounts management is completely disabled for these non-admin roles in `routes/auth_routes.py`, except for self-service password modifications.
