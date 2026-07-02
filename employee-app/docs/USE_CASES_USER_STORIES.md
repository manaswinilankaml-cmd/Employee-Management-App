# Use Cases & User Stories
## Employee Management System (EMS)

### 1. User Stories
The system satisfies the following user stories mapped by role:

#### 1.1 HR Admin (Global Operations)
* **Story:** As an HR Admin, I want to onboard new employees, assign their departments, and manage their system roles, so that our employee directory remains up-to-date.
* **Story:** As an HR Admin, I want to toggle a login account's active status, so that I can immediately block access for offboarded or deactivated personnel.

#### 1.2 IT Admin (Technical Controls)
* **Story:** As an IT Admin, I want to edit/reset usernames and passwords for user accounts, so that I can resolve typos and lockout issues.
* **Story:** As an IT Admin, I want to toggle CRUD permissions dynamically for custom roles, so that I can configure application privileges without code modifications.

#### 1.3 Department Head (DEPT_HEAD)
* **Story:** As a Department Head, I want to view all employees, projects, and reporting structures within my department, so that I can monitor team allocations.
* **Story:** As a Department Head, I want to assign direct managers to reportees in my department (including cross-department managers who supervise my department), so that I can maintain proper hierarchy.

#### 1.4 Manager (Team Leadership)
* **Story:** As a Manager, I want to view the list of my direct reportees and their skills, so that I can coordinate tasks effectively.

#### 1.5 Employee (Self-Service)
* **Story:** As an Employee, I want to view my profile details, manage my skills list, and view which projects I am assigned to, so that I have visibility into my status.

---

### 2. Core Use Cases

#### Use Case 1: Assign Department Supervisor (Cross-Department Scope)
* **Actor:** HR Admin / IT Admin
* **Pre-conditions:** The target employee and department must exist in the database.
* **Flow:**
  1. Admin opens the Employee's Profile page.
  2. Under the "Supervised Departments" section, the Admin checks the boxes for the departments the employee is allowed to supervise (e.g. CEO supervising Engineering, Sales, HR).
  3. Admin clicks "Save Profile".
  4. Frontend sends `POST` requests to `/departments/{dept_id}/supervisors/{emp_id}` for new scope assignments.
  5. The backend inserts records into the `department_supervisors` table.

#### Use Case 2: Assign Cross-Department Manager
* **Actor:** Department Head (DEPT_HEAD) / HR Admin
* **Pre-conditions:** The employee and manager exist. The manager must either belong to the employee's department OR be registered as a supervisor for the employee's department.
* **Flow:**
  1. DEPT_HEAD opens an employee profile belonging to their department.
  2. DEPT_HEAD selects a manager from the manager dropdown (the dropdown includes supervisors of this department).
  3. Backend verifies that the proposed manager has a department supervisor mapping (via `department_supervisors` table) or is in the same department.
  4. Backend verifies that circular reporting does not occur.
  5. The reporting connection is updated.

#### Use Case 3: Correct Typo in Account Username
* **Actor:** IT Admin / HR Admin
* **Pre-conditions:** The user account exists.
* **Flow:**
  1. Admin opens the employee's profile and clicks "Reset Pass".
  2. Form displays an editable "Username" field pre-populated with the current username.
  3. Admin corrects the typo in the username field.
  4. Admin submits the form.
  5. Backend validates that the new username is unique, and updates the `accounts` table.
