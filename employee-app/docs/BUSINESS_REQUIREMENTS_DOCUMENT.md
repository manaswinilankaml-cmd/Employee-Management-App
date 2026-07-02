# Business Requirements Document (BRD)
## Employee Management System (EMS)

### 1. Document Overview
This document outlines the business requirements for the Employee Management System (EMS). It details the business objectives, core problems to be solved, stakeholder profiles, and high-level requirements.

---

### 2. Business Objectives & Goals
The primary objective of the EMS is to provide a secure, centralized, and role-scoped administrative application to manage the company's organizational structure, employee details, project memberships, and login credentials.

* **Centralize Operations:** Replace fragmented spreadsheets with a single relational database for employees, departments, and projects.
* **Granular Security:** Implement a strict, dynamic Role-Based Access Control (RBAC) system where resource actions (Create, Read, Update, Delete) are governed by permissions defined in the database.
* **Scoped Visibility:** Restrict data visibility based on organizational hierarchy (e.g., department heads can only manage their departments; managers can only see direct reportees).
* **Supervision Flexibility:** Enable cross-department supervision (e.g., CEO, CTO) allowing leaders to oversee employees in departments other than their own without violating default boundary rules.
* **Auditability:** Provide administrative dashboards to manage application access, reset passwords, and correct username typos.

---

### 3. Stakeholder Profiles
* **HR Admin:** Global business administrator. Requires complete CRUD capabilities across all system modules (Employees, Departments, Roles, Permissions).
* **IT Admin:** Technical system administrator. Manages user accounts, provisioning, database-driven permissions, and system configurations.
* **Department Head (DEPT_HEAD):** Intermediate supervisor. Manages employees, project assignments, and reporting lines within their department. Can also be assigned to supervise other departments.
* **Manager:** Team leader. Views and manages reporting lines for direct reportees.
* **Employee:** Individual contributor. Views their own profile, skills list, and assigned projects.

---

### 4. High-Level Business Requirements (HLR)
1. **Organizational Structure Management:** The system must support departments (e.g. Engineering, Sales, HR) and cross-department supervisory mappings.
2. **Employee Directory:** Maintain comprehensive employee profiles including employee ID, department, manager, and skills.
3. **Role & Permission Management:** IT Admins must be able to customize roles and toggle CRUD permissions dynamically for each system resource.
4. **Account & Credential Administration:** Secure account creation, status toggling (deactivation), username modification, and password resets.
5. **Project Collaboration Scoping:** Group employees into projects and restrict access to project details based on membership or supervision rights.
