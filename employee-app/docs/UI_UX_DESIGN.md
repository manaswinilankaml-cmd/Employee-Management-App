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

## 2. Component Breakdown

### Global Components
- `GlobalNav`: Sidebar or Topbar with role-based visibility.
- `LoadingSpinner`: Global state for async API calls.
- `NotificationToast`: Success/Error feedback for CRUD operations.

### Page-Specific Components
#### Employee Profile
- `BasicInfoForm`: Edits Name and Department.
- `SkillsTagCloud`: Interactive list for adding/removing skills.
- `ReportingTree`: Visual list of direct reports.
- `AccountStatusCard`: Shows login activity and role.

#### RBAC Settings
- `PermissionMatrix`: Grid of toggle switches (Role vs Resource).
- `RoleManager`: Simple list for adding/deleting custom roles.

## 3. Visual Standards
- **Theme:** Dark Surface (Slate/Zinc) with high-contrast accent colors (Blue/Amber).
- **Feedback:** 
    - Green: Success / Granted.
    - Red: Error / Denied / Delete.
    - Amber: Warning / Pending / Updates.
- **Responsiveness:** Tailwind-based grid system to support Desktop and Tablet views.
