# Object-Oriented Programming (OOP) Concepts
## Employee Management System (EMS)

### 1. Inheritance
* **File:** [db_models.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/db_models.py)
* **Description:** All database entity models (`Employee`, `Account`, `Department`, `Role`, `Project`, `ProjectMember`, `EmployeeSkill`, `RolePermission`, and `DepartmentSupervisor`) inherit from SQLAlchemy's declarative base class `Base`.
* **Example:**
  ```python
  class Employee(Base):
      __tablename__ = "employees"
      # Inherits ORM metadata and mapping attributes from Base
  ```

---

### 2. Encapsulation
* **File:** [db_models.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/db_models.py)
* **Description:** Column mapping properties (attributes like `id`, `name`, `emp_id`, `password_hash`) and relationships (methods/properties like `manager`, `account`, `department_supervisions`) are encapsulated within individual class definitions.
* **Example:**
  ```python
  class Employee(Base):
      id = Column(Integer, primary_key=True)
      name = Column(String, nullable=False)
      account = relationship("Account", back_populates="employee", uselist=False)
  ```

---

### 3. Abstraction
* **File:** [database.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/database.py)
* **Description:** Abstracts connection parameters, engine pooling configurations, and session transactions behind the `SessionLocal` factory and the `get_db()` dependency wrapper. The rest of the application interacts with a database session interface without knowing connection specifics.
* **File:** [db_models.py](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/db_models.py)
* **Description:** Abstracts raw SQL logic (e.g. database cursors, `SELECT`, `UPDATE`, `INSERT` strings) through the SQLAlchemy ORM model layer.

---

### 4. Classes & Instantiation (Objects)
* **Files:** All files in the [routes/](file:///D:/Emp_App_Repo/Employee-Management-App/employee-app/routes/) directory.
* **Description:** In CRUD route operations, entity models are instantiated as Python class objects to modify database state dynamically.
* **Example:**
  ```python
  new_supervisor = DepartmentSupervisor(department_id=dept_id, employee_id=emp_id)
  db.add(new_supervisor)
  ```
