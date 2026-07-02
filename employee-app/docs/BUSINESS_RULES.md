# Business Rules Document
## Employee Management System (EMS)

### 1. Document Overview
This document specifies the validation constraints and business logic rules enforced by the EMS backend to maintain data consistency and secure organizational reporting boundaries.

---

### 2. Reporting & Manager Hierarchy Rules

#### BR-1: Circular Management Prevention
* **Description:** An employee cannot report to themselves, nor can they report to a subordinate (directly or indirectly).
* **Enforcement Point:** `PUT /employees/{employee_id}/manager`
* **Algorithm:** 
  1. Check if the proposed `manager_emp_id` is identical to the target `employee_id`. If yes, block.
  2. Starting from the proposed manager's record, traverse upward following the `manager_id` reference chains.
  3. If the target `employee_id` is encountered during this upward traversal, circular mapping is detected. Reject the transaction immediately.

#### BR-2: Manager Assignment Scope (Supervision Scope)
* **Description:** Employees can only report to a manager who belongs to the same department, **unless** the manager has been explicitly assigned supervisor permissions for that department.
* **Enforcement Point:** `PUT /employees/{employee_id}/manager`
* **Validation Logic:**
  1. Determine the employee's department `E_Dept`.
  2. If the manager's department `M_Dept` is equal to `E_Dept`, allow.
  3. If `M_Dept` is different, query the `department_supervisors` table for a record linking the manager's ID to the department ID of `E_Dept`.
  4. If a supervisor record exists, allow. Otherwise, reject with `400 Bad Request`.

---

### 3. Authentication & Account Administration

#### BR-3: Username Uniqueness
* **Description:** Usernames must be unique (case-insensitive) across all accounts in the database.
* **Enforcement Point:** `POST /auth/create-account/{employee_id}` and `PUT /auth/admin-reset-password/{account_id}`
* **Validation Logic:** Clear leading/trailing whitespace, convert username to lowercase, and check for existing records. If found, reject with `400 Bad Request`.

#### BR-4: Admin Reset Password & Username Edit
* **Description:** Administrators (HR/IT admins) can modify username credentials to fix typos alongside resetting passwords.
* **Enforcement Point:** `PUT /auth/admin-reset-password/{account_id}`
* **Validation Logic:**
  * Both fields (`new_password`, `new_username`) are optional, but at least one must be provided.
  * If a `new_username` is provided, it is checked for uniqueness.
  * If a `new_password` is provided, it must contain a minimum of 6 characters.

#### BR-5: Account Deactivation Safeguards
* **Description:** stand-alone system admin accounts (`HR_ADMIN` or `IT_ADMIN`) cannot be deactivated.
* **Enforcement Point:** `PUT /auth/toggle-account-status/{account_id}`
* **Validation Logic:** If the target account's role is `HR_ADMIN` or `IT_ADMIN`, reject status toggling to prevent admin lockout.
