# UI Wireframes & Component Specification
## Employee Management System (EMS)

### 1. Conceptual Wireframes (Mockups)

#### 1.1 Dashboard (Overview)
* **Goal:** High-level overview cards, statistics, and system health status.

```text
+-------------------------------------------------------------+
| [EMS Logo]   Employees   Projects   Organization   [Admin v]|
+-------------------------------------------------------------+
| Dashboard                                                   |
|                                                             |
| +-----------+  +-----------+  +-----------+  +-----------+  |
| | Employees |  | Projects  |  | Depts     |  | Accounts  |  |
| |    124    |  |     12    |  |     6     |  |    110    |  |
| +-----------+  +-----------+  +-----------+  +-----------+  |
|                                                             |
| Recent Activity                      System Health          |
| +----------------------------------+ +--------------------+ |
| | - John Doe added to Project X    | | DB: Connected      | |
| | - Permissions updated for MGR    | | Auth: Active       | |
| | - New Dept: "Data Science"       | | Version: 3.0.0     | |
| +----------------------------------+ +--------------------+ |
+-------------------------------------------------------------+
```

#### 1.2 Employee Profile (Detailed View)
* **Goal:** Manage individual employee parameters, skills checklist, reporting line assignments, and supervisor scopes.

```text
+-------------------------------------------------------------+
| < Back to Directory          [Save Changes]  [Delete Emp!]  |
+-------------------------------------------------------------+
| [Profile Pic]  John Doe (IM-2026-0001)                      |
|                Role: DEPT_HEAD | Dept: ENGINEERING          |
+-------------------------------------------------------------+
| [ Basic Info ] [ Skills ] [ Reporting ] [ Account ]         |
| +---------------------------------------------------------+ |
| | Full Name: [ John Doe             ]                     | |
| | Department: [ Engineering       v ]                     | |
| | Role:       [ DEPT_HEAD         v ]                     | |
| | Manager: [ Jane Smith (IM-2026-0005) ] [ Change ]       | |
| +---------------------------------------------------------+ |
|                                                             |
| Supervised Departments (Cross-Department Scope):            |
| [x] Engineering   [ ] HR   [x] Sales   [ ] Marketing        |
|                                                             |
| Skills: [ Python x ] [ SQL x ] [ React x ] [+ Add Skill]    |
|                                                             |
| Direct Reports:                                             |
| - Alice W. (Dev)                                            |
| - Bob K. (Dev)                                              |
+-------------------------------------------------------------+
```

---

### 2. Page & Component Specification

#### 2.1 Login Screen (`/login`)
A dedicated layout for credentials submission.
* **UI Components:**
  * **Username Field:** Sanitized string.
  * **Password Field:** Masked string (minimum 6 characters).
  * **Login Button:** Triggers `POST /auth/login`. On success, tokens are cached in `sessionStorage`.

#### 2.2 Employee Directory (`/employees`)
Tabular search interface to browse company personnel.
* **UI Components:**
  * **DirectoryTable:** Column layout showing Employee ID, Name, Department, Role, and Manager.
  * **Filters:** real-time text input search by Name + dropdown filter by Department.
  * **SkillsSearchWidget:** Combines department filter and skill text input to call `/employees/department/{dept}/skill/{skill}`.
  * **AddEmployeeModal:** Form inputs to create profiles.

#### 2.3 Organization & Management Page (`/organization`)
Combined view to maintain structural departments and roles definitions.
* **UI Components:**
  * **DepartmentCardList:** Displays lists of departments with add/delete capability.
  * **RolesCardList:** Lists system and custom roles with add/delete options.

#### 2.4 Permissions matrix Settings Panel (`/permissions`)
Interactive access configuration grid (accessible only to `IT_ADMIN` / `HR_ADMIN`).
* **UI Components:**
  * **PermissionsTable:** Role rows and resource columns with checkboxes to toggle `Create`, `Read`, `Update`, and `Delete` permissions dynamically in real-time.
