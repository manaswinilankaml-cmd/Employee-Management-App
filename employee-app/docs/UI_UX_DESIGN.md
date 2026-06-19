# UI/UX Design & Component Specification

## 1. Page Inventory
The following HTML pages are required to support the full backend feature set:

| Page | Route (Proposed) | Description |
| :--- | :--- | :--- |
| **Login** | `/login` | Secure entry with JWT acquisition. |
| **Dashboard** | `/dashboard` | Hub for stats and system health. |
| **Employee Directory** | `/employees` | Searchable list of all staff. |
| **Employee Profile** | `/employees/{id}` | Detailed data, skills, and reporting view. |
| **Projects** | `/projects` | Project tracking and team assignments. |
| **Org Management** | `/organization` | Combined view for Departments and Roles. |
| **RBAC Settings** | `/settings/permissions`| Admin-only matrix for access control. |

---

## 2. Component Breakdown

### Global Components
- `GlobalNav`: Sidebar or Topbar with role-based navigation item visibility.
- `LoadingSpinner`: Global state indicator for asynchronous API calls.
- `NotificationToast`: Dynamic feedback popup showing Success, Error, Warning, or Info messages for CRUD operations.

---

## 3. Page-Specific Component Specifications & Backend Integration

### 3.1 Login Page (`/login`)
A dedicated screen for user authentication and session initialization.

#### Required UI Components
- **LoginCard:** Centered container.
- **LoginForm:**
  - **Username Field:** Text input mapping to backend validation rules (must be non-empty).
  - **Password Field:** Masked text input (must be at least 6 characters).
  - **Submit Button:** Submits credentials.

#### Backend Integration & API Details
- **Endpoint:** `POST /auth/login` (defined in [auth_routes.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/auth_routes.py#L121))
  - **Request Body:** `{ "username": "<username>", "password": "<password>" }`
  - **Successful Response (200 OK):** Returns `{ "message": "Login successful!", "token": "<JWT_token>", "role": "<role_name>" }`.
- **Session Management:** The client application must store the returned `<JWT_token>` (e.g., in `localStorage` or `sessionStorage`) and attach it as a `Bearer <token>` under the `Authorization` header of all subsequent API requests.
- **Validations & Error Handling:**
  - **HTTP 401 Unauthorized:** Invalid password or username. Display `"Invalid username or password"`.
  - **HTTP 403 Forbidden:** Display `"Account is deactivated. Contact admin."` (for accounts with `is_active = False` in the `accounts` table).

---

### 3.2 Dashboard Page (`/dashboard`)
An executive command center presenting metrics and navigation hubs tailored to user roles.

#### Required UI Components
- **StatsGrid:** Card layout displaying four system counters:
  - **Total Employees Card:** Shows the count of employees visible within the user's scope.
  - **Active Projects Card:** Counts active project records.
  - **Departments Card:** Counts total company departments.
  - **Custom Roles Card:** Counts system-defined and custom roles.
- **LoggedUserCard:** Displays the authenticated user's profile details and role designation.
- **QuickActionsPanel:** Fast-action links determined by permissions (e.g., "Add Employee" or "Configure RBAC").

#### Backend Integration & API Details
All metrics must be loaded asynchronously using the stored JWT token:
- **Employee Counts:** Derived from the size of the array returned by `GET /employees` (automatically scoped by role in [employees.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/employees.py#L107)).
- **Project Counts:** Derived from `GET /projects` (scoped by role in [projects.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/projects.py#L224)).
- **Departments & Roles Counts:** Pulled from `GET /departments` and `GET /roles`.
- **Role-Based Visibility Scoping:** 
  - Admin users will see overall system counts.
  - Standard `EMPLOYEE` roles will see their own scoped counts (e.g., Total Employees card displays `1`).
  - Cards for unauthorized endpoints must be hidden on the dashboard (e.g., standard employees cannot retrieve role list counts).

---

### 3.3 Employee Directory Page (`/employees`)
A comprehensive view for searching, filtering, and managing company personnel.

#### Required UI Components
- **DirectoryTable:** Tabular view of staff records.
  - **Columns:** Employee ID (`emp_id`), Name (`name`), Department (`department`), Role (`role`), and Manager.
  - **Actions Column:** "View Profile" link (redirects to `/employees/{emp_id}`) and conditional "Delete" button.
- **Search&FilterBar:**
  - **Text Search:** Real-time client-side text filtering by name.
  - **Department Selector:** Dropdown to filter table records by department.
- **SkillSearchWidget:**
  - **Form:** Dropdown for **Department** + text input for **Skill**.
  - **Submit Button:** Fetches department staff with the specified skill.
- **AddEmployeeModal:**
  - Form fields: Name Input (text) and Department selector (dropdown).
  - **Add Button:** Triggers creation on submit.

#### Backend Integration & API Details
- **Fetch Records:** `GET /employees` (Scoped data filtering based on JWT role, see [employees.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/employees.py#L107)).
- **Create Record:** `POST /createemployee?name=<name>&department=<department>` (requires `employees:create` permission, see [employees.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/employees.py#L41)).
- **Skill Search:** `GET /employees/department/{department}/skill/{skill}` (returns matching list, see [employees.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/employees.py#L659)).
- **Delete Employee:** `DELETE /employees/{employee_id}` (requires `employees:delete` permission, see [employees.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/employees.py#L727)).

#### UI Validation & Behavior
- **Modal Input Guard:** Department dropdown must be populated from `GET /departments` to prevent invalid department submission errors (which return `400 Bad Request` from the backend).
- **Conditional CRUD Controls:** "Add Employee" button and "Delete" icons must be hidden or disabled if the user's role does not possess `create` or `delete` permissions on the `employees` resource.

---

### 3.4 Employee Profile Page (`/employees/{id}`)
A comprehensive interface for reviewing and managing individual employee data.

#### Required UI Components
- **BasicInfoForm:** 
  - Text input for Name, department selector dropdown, and read-only Employee ID display.
  - **Save Button:** Submits info modifications.
- **ReportingHierarchyPanel:**
  - **Manager Selector:** Combobox/dropdown to select a manager from other employees.
  - **Remove Manager Button:** Clears manager assignment.
  - **Reports List:** Sub-table displaying direct reportees (if this employee is a manager).
- **SkillsTagCloud:**
  - Cloud layout showing active skills as clickable tag blocks with deletion "x" marks.
  - Text input + **Add Skill Button** to input and commit new skill badges.
- **AccountStatusCard (Admin-only / Authorized roles):**
  - **If No Account Exists:** Form displaying Username Input, Password Input, Role Selector Dropdown, and a **Create Account** button.
  - **If Account Exists:** Displays Username, Account Role, Status (Active/Deactivated), and a toggle button to **Deactivate Account** / **Reactivate Account**.

#### Backend Integration & API Details
- **Read Profile:** `GET /employees/{employee_id}` (Path param uses `emp_id`, see [employees.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/employees.py#L173)).
- **Update Basic Info:**
  - Name: `PUT /employees/{employee_id}/update-name?new_name=<new_name>`
  - Department: `PUT /employees/{employee_id}/assign-department/{department}`
  - Role: `PUT /employees/{employee_id}/update-role?new_role=<new_role>`
- **Manage Hierarchy:**
  - Assign: `PUT /employees/{employee_id}/manager?manager_emp_id=<manager_emp_id>`
  - Remove: `PUT /employees/{employee_id}/remove-manager`
  - List Reportees: `GET /employees/{manager_emp_id}/reportees`
- **Manage Skills:**
  - Add: `PUT /employees/{employee_id}/skills` (Body: `list[str]` of skill names)
  - Remove: `DELETE /employees/{employee_id}/skills/{skill_name}`
- **Account Actions (Syncing with `accounts` Table):**
  - Create: `POST /auth/create-account/{employee_id}` (Body: `{username, password, role}`)
  - Deactivate: `PUT /auth/deactivate/{account_id}` (set `is_active = False`)
  - Reactivate: `PUT /auth/reactivate/{account_id}` (set `is_active = True`)

#### UI Validation & Behavior
- **Circular Management Loop Guard:** If the manager assignment API fails with a `400 Bad Request` check (e.g. assigning a subordinate as manager), the UI must display a red error toast detailing the loop (see [employees.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/employees.py#L452)).
- **Privilege Escalation Block:** Custom role updates to administrative settings (e.g. `HR_ADMIN`, `IT_ADMIN`) are restricted to admins; options must be hidden for standard roles.
- **Immutable Admin Accounts:** Account deactivation/reactivation toggles must be disabled/hidden for admin accounts (see [auth_routes.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/auth_routes.py#L183)).

---

### 3.5 Projects Page (`/projects`)
Tracking dashboard for business initiatives and project team mappings.

#### Required UI Components
- **ProjectCreationForm:** 
  - Text input for unique Project Name + **Create Project Button** (requires `projects:create` permission).
- **ProjectsTable:**
  - **Columns:** Project Name, Active Team Members Count, Actions.
  - **Actions Column:** "View Team" details button, and a conditional "Delete Project" button.
- **ProjectTeamPanel (Modal/Drawer):**
  - Displays list of assigned employees for the selected project (Name, Department).
  - **Assign Member Form:** Dropdown selector of all employees + **Add Member** button.
  - **Remove Member:** Action button on member row to remove them from the project team.

#### Backend Integration & API Details
- **List Projects:** `GET /projects` (Scoped by JWT role, see [projects.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/projects.py#L224)).
- **Create Project:** `POST /projects?name=<name>` (requires `projects:create` permission).
- **Delete Project:** `DELETE /projects/{project_id}` (requires `projects:delete` permission).
- **Get Members:** `GET /projects/{project_id}/members` (returns `{project, members: [{id, emp_id, name, department}]}`).
- **Assign Member:** `PUT /projects/{project_id}/assign/{employee_id}` (requires `projects:update` permission).
- **Remove Member:** `DELETE /projects/{project_id}/remove/{employee_id}` (requires `projects:delete` permission).

#### UI Validation & Behavior
- **Unique Constraint Check:** The UI must display validation warnings (e.g., `"A project with this name already exists"`) if creation fails on DB unique constraint checks (see [projects.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/projects.py#L43)).
- **Non-assigned Member Dropdown:** The assign member selector should filter out employees who are already assigned to the project.

---

### 3.6 Org Management Page (`/organization`)
An admin panel for configuring organizational structures (Departments and Roles).

#### Required UI Components
- **DepartmentManagementPanel (Left Side):**
  - **Create Dept Form:** Department Name Input field + **Add Department** button.
  - **Department Table:** List of departments with inline renaming text fields and deletion buttons.
- **RoleManagementPanel (Right Side):**
  - **Create Role Form:** Role Name Input field + **Add Role** button (triggers automatic read-only permission seeding).
  - **Role Table:** List of roles with system role indicators, rename fields, and deletion buttons.

#### Backend Integration & API Details
- **Department Actions:**
  - Create: `POST /departments?name=<name>`
  - Read: `GET /departments` (returns `[{id, name}]`)
  - Update: `PUT /departments/{department_id}?new_name=<new_name>` (CASCADE: updates all employees in the department, see [departments.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/departments.py#L136))
  - Delete: `DELETE /departments/{department_id}`
- **Role Actions:**
  - Create: `POST /roles?name=<name>` (auto-seeds `role_permissions` with default `read` permissions)
  - Read: `GET /roles` (returns `[{id, name, is_system_role}]`)
  - Update: `PUT /roles/{role_id}?new_name=<new_name>` (CASCADE: updates employees, accounts, and permissions using the role)
  - Delete: `DELETE /roles/{role_id}`

#### UI Validation & Behavior
- **Deletion Dependency Checks:**
  - **Departments:** Cannot delete a department if employees are still assigned to it. If `DELETE` returns `400 Bad Request`, show: `"Cannot delete: X employee(s) are in department. Reassign them first."` (see [departments.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/departments.py#L110)).
  - **Roles:** Cannot delete roles if employees or accounts use them. If `DELETE` returns `400 Bad Request`, show: `"Cannot delete: X employee(s) and Y account(s) use role. Reassign them first."` (see [roles.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/roles.py#L141)).
- **System Role Protection:** Rename and Delete controls must be hidden or disabled for system-defined roles where `is_system_role == True` (e.g. `HR_ADMIN`, `IT_ADMIN`).

---

### 3.7 RBAC Settings Page (`/settings/permissions`)
A security configuration grid mapping CRUD permissions dynamically across resources.

#### Required UI Components
- **PermissionMatrixTable:**
  - **Grid Matrix:** Rows list roles; Columns list resources (`employees`, `projects`, `accounts`, `departments`, `roles`).
  - **Cell Actions:** Toggle checkboxes for **Create**, **Read**, **Update**, and **Delete**.
- **AdminWarning:** Alert card stating that admin privileges are immutable.

#### Backend Integration & API Details
- **Fetch Permission Grid:** `GET /permissions` (returns flat array of role mappings sorted by role, then resource, see [permissions.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/permissions.py#L30)).
- **Modify Cell Toggles:** `PUT /permissions/{role_name}/{resource}` (Queries: `can_create=<bool>`, `can_read=<bool>`, `can_update=<bool>`, `can_delete=<bool>`, see [permissions.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/permissions.py#L119)).

#### UI Validation & Behavior
- **Role Restriction:** Access to this page is restricted by backend guards to `HR_ADMIN` and `IT_ADMIN`. Unauthorized roles must be blocked or redirected to `/dashboard` immediately.
- **Immutable Admin Permissions:** Row toggles for administrative accounts must be read-only or hidden (backend blocks modifications to admin permissions, see [permissions.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/permissions.py#L146)).
- **Immediate Feedback Loop:** Checkbox/switch status changes must trigger the PUT request instantly. Show a loading overlay or grayed state on the modified row until the server commits changes.

---

## 4. Visual & Theme Standards (Premium Light Mode & 4K Optimization)
To deliver a premium, high-fidelity visual experience that looks razor-sharp on modern 4K/high-DPI monitors and runs consistently across macOS, Windows, and Linux, the styling architecture follows these standards:

### 4.1 Theme & Color Palette (Light Mode)
*   **Main Workspace Canvas:** Dynamic soft-gradient backgrounds using HSL colors rather than flat, stark white to reduce eye strain:
    *   `background: linear-gradient(135deg, hsl(210, 40%, 98%) 0%, hsl(220, 30%, 95%) 100%);`
*   **Frosted Glassmorphism Surfaces:** Clean macOS-style frosted panels for containers and cards, providing a modern depth perspective:
    *   `background: rgba(255, 255, 255, 0.75);`
    *   `backdrop-filter: blur(12px) saturate(180%);`
    *   `border: 1px solid rgba(255, 255, 255, 0.5);`
    *   `box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);`
*   **State Feedback Colors:**
    *   **Green (Success / Granted):** Soft, highly legible emerald `hsl(142, 60%, 45%)`.
    *   **Red (Error / Denied / Action):** High-contrast crimson `hsl(346, 75%, 50%)`.
    *   **Amber (Warning / Pending / Sync):** Warm, visible tangerine `hsl(38, 90%, 50%)`.
*   **Text Hierarchy:**
    *   Primary Text (Titles & Headings): Deep slate `hsl(224, 60%, 15%)`.
    *   Secondary Text (Labels & Muted Fields): Muted steel `hsl(220, 15%, 45%)`.

### 4.2 4K Resolution & Vector Optimization
*   **Font Smoothing & Anti-Aliasing:** Forced sub-pixel rendering parameters for ultra-sharp typography on 4K/Retina displays:
    *   `-webkit-font-smoothing: antialiased;`
    *   `-moz-osx-font-smoothing: grayscale;`
    *   `text-rendering: optimizeLegibility;`
*   **Premium Gamut Gradients:** Wide-gamut, non-banding dual-color gradients for primary highlights, buttons, and navigation nodes:
    *   `gradient-accent: linear-gradient(135deg, hsl(245, 80%, 60%) 0%, hsl(265, 75%, 55%) 100%);` (Smooth deep indigo to violet).
*   **Pixel-Perfect Vector Graphics:** All icons, indicators, and toggles must be configured as inline vector SVGs, avoiding standard image scaling blur at higher system resolutions.

### 4.3 Cross-Platform Layout Standards (macOS / Windows)
*   **Flexible Typography Stack:** Premium typography utilizing Google Fonts paired with local operating system high-DPI defaults (San Francisco on macOS, Segoe UI on Windows):
    *   `font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;`
*   **Relative Scaling Units:** Avoid hardcoded pixel sizing (`px`). All margins, paddings, borders, and text sizes must be written in relative `rem` or `em` units to ensure uniform layout scaling under diverse OS-level DPI scaling settings (e.g., Windows 125%–200% zoom factors).

---


## 5. Dynamic Role-Based UI/UX Mappings
To satisfy the Role-Based Access Control (RBAC) architecture, the frontend UI must dynamically tailor views, navigation options, data scopes, and interaction capabilities based on the authenticated user's assigned role.

| Role | Accessible Views | Navigation Menu Items | Data & Directory Scoping | Form Actions & Mutation Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **HR_ADMIN** / **IT_ADMIN** | All pages | Login, Dashboard, Directory, Projects, Org Management, RBAC Matrix | **Global:** Can view all departments, all roles, and all employees. | Full Create, Read, Update, and Delete (CRUD) access across all models. Account creation, activation, and deactivation. |
| **DEPT_HEAD** | Login, Dashboard, Directory, Profile, Projects, Org Management | Dashboard, Directory, Projects, Org Management | **Department-Scoped:** Directory is restricted to employees belonging to their department. | CRUD on employees, projects, and departments within their department (subject to permissions in DB). Cannot modify the RBAC matrix or create admin accounts. |
| **MANAGER** | Login, Dashboard, Directory, Profile, Projects | Dashboard, Directory, Projects | **Reportee-Scoped:** Directory displays only their direct reports and themselves. | Read-only access to employee profiles. Can view, add, or delete skills for direct reports only. Cannot manage departments, roles, or create/delete projects. |
| **EMPLOYEE** | Login, Dashboard, Profile, Projects | Dashboard, My Profile, My Projects | **Self-Scoped:** Profile view is restricted to their own record. Project view is restricted to projects they are members of. | Read-only profile details. Can manage their own skills list (add/remove) if allowed. Hides all employee creation, project creation, and organizational settings. |

