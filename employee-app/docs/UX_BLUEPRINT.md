# UX Design Blueprint

This document provides the visual and functional logic required for the UX/UI team to build the interface. It bridges the backend architecture with user-centric design.

## 1. Conceptual Wireframes (Mockups)

### A. Dashboard (Overview)
**Goal:** High-level status for Admins/Managers.
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

### B. Employee Profile (Detailed View)
**Goal:** Manage individual employee data and reporting.
```text
+-------------------------------------------------------------+
| < Back to Directory          [Save Changes]  [Delete Emp!]  |
+-------------------------------------------------------------+
| [Profile Pic]  John Doe (IM-2026-0001)                      |
|                Role: MANAGER | Dept: ENGINEERING            |
+-------------------------------------------------------------+
| [ Basic Info ] [ Skills ] [ Reporting ] [ Account ]         |
| +---------------------------------------------------------+ |
| | Full Name: [ John Doe             ]                     | |
| | Department: [ Engineering       v ]                     | |
| | Manager: [ Jane Smith (IM-2026-0005) ] [ Change ]       | |
| +---------------------------------------------------------+ |
|                                                             |
| Skills: [ Python x ] [ SQL x ] [ React x ] [+ Add Skill]    |
|                                                             |
| Direct Reports:                                             |
| - Alice W. (Dev)                                            |
| - Bob K. (Dev)                                              |
+-------------------------------------------------------------+
```

---

## 2. User Flows (API Sequences)

### Flow 1: Secure Onboarding (New Employee + Account)
1.  **HR Admin** fills `POST /createemployee` (Name, Dept).
2.  **System** returns `emp_id` (e.g., IM-2026-0045).
3.  **HR Admin** clicks "Create Account" on Profile page.
4.  **UI** opens modal: `username`, `password`, `role`.
5.  **Submit** triggers `POST /auth/create-account/{id}`.
6.  **Success** -> Account is active.

### Flow 2: Dynamic Project Assignment
1.  **Manager** views Project X via `GET /projects/{id}/members`.
2.  **Manager** clicks "Add Member".
3.  **UI** shows searchable `EmployeeTable` (populated by `GET /employees`).
4.  **Selection** triggers `PUT /projects/{id}/assign/{emp_id}`.
5.  **UI** refreshes member list automatically.

---

## 3. Field Mapping & Interaction Details

### Form: Create/Update Employee
| Field Name | UI Type | Backend Field | Validation Logic |
| :--- | :--- | :--- | :--- |
| Full Name | Text Input | `Employee.name` | Required, min 2 chars. |
| Department | Select Dropdown | `Employee.department` | Must exist in `GET /departments`. |
| Role | Select Dropdown | `Employee.role` | Must exist in `GET /roles`. Admin check required. |
| Manager | Autocomplete | `Employee.manager_id` | Prevent circular refs (handled by Backend). |

### Component: Permission Matrix (RBAC)
- **Source:** `GET /permissions`
- **Render:** Loop through `roles`. For each role, loop through `resources`.
- **Logic:** 
    - If `role == "HR_ADMIN"`, disable all toggles (Admins are hardcoded full-access).
    - If `resource == "roles"` and `action == "delete"`, show warning for system roles.
- **Save:** Each toggle change triggers an immediate `PUT /permissions/{role}/{resource}?can_x=true/false`.

---

## 4. Design-to-Dev Handoff Checklist
- [ ] **Auth State:** Ensure `Authorization: Bearer <token>` is present in all requests.
- [ ] **Data Scoping:** UI must handle cases where `GET /employees` returns only 1 row (Employee role) vs 100 rows (Admin role).
- [ ] **Empty States:** Provide visual placeholders for "No Reportees Found" or "No Projects Assigned".
- [ ] **Error Toasts:** Specifically map `403 Forbidden` to a "You do not have permission for this action" alert.
