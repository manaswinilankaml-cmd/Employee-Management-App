# Role & Permission Matrix
## Employee Management System (EMS)

### 1. Dynamic RBAC Architecture
The Employee Management System employs a dynamic, database-driven Role-Based Access Control (RBAC) model. Permissions are evaluated on every incoming API request by checking user roles against the permissions matrix stored in the database.

* **Resource Types:** `employees`, `projects`, `accounts`, `departments`, `roles`
* **Access Actions:** `create` (Create), `read` (Read), `update` (Update), `delete` (Delete)

---

### 2. Default Permission Matrix
Below is the default configuration of permissions loaded from `seed.py`.

* **`1`** = Permission Allowed (True)
* **`0`** = Permission Denied (False)

| Role | employees | projects | accounts | departments | roles |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **HR_ADMIN** | `CRUD (1111)` | `CRUD (1111)` | `CRUD (1111)` | `CRUD (1111)` | `CRUD (1111)` |
| **IT_ADMIN** | `CRUD (1111)` | `CRUD (1111)` | `CRUD (1111)` | `CRUD (1111)` | `CRUD (1111)` |
| **DEPT_HEAD**| `Read (0100)` | `Read (0100)` | `None (0000)` | `Read (0100)` | `Read (0100)` |
| **MANAGER**  | `Read (0100)` | `Read (0100)` | `None (0000)` | `Read (0100)` | `Read (0100)` |
| **EMPLOYEE** | `Read (0100)` | `Read (0100)` | `None (0000)` | `Read (0100)` | `Read (0100)` |

---

### 3. Resource Data Scoping
Even if a role has `Read` permission on `employees`, the backend scopes the returned dataset according to who is calling:

* **HR_ADMIN / IT_ADMIN:**
  * **Scope:** Global. Can see all records across all departments.
* **DEPARTMENT HEAD (DEPT_HEAD):**
  * **Scope:** Departmental + Supervised. Can view all employees belonging to their department, plus employees in any departments they have been explicitly assigned to oversee in the `department_supervisors` table.
* **MANAGER:**
  * **Scope:** Reportees. Can view themselves and employees who report directly or indirectly to them.
* **EMPLOYEE:**
  * **Scope:** Self. Can only query and view their own employee record.
