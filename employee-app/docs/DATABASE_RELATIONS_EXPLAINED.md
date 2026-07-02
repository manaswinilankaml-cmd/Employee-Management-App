# Toyland Database: How Things Talk to Each Other

Welcome to **Toyland**! To help you understand how our database works, we will pretend the database is a big playroom full of toys, boxes, name tags, and games. 

Here is how all the tables in our playroom connect to each other.

---

## 1. The Playroom Hierarchy Tree

This tree shows how every concept in our playroom connects. A parent element sets rules or groups the child elements underneath it:

```text
OUR PLAYROOM SYSTEM
├── [Role] (Job Tags)
│    ├── Labels -> [Employee] (One Job Tag can be worn by many Toy Figures)
│    └── Key to login -> [Account] (One Job Tag lets many Accounts log in)
├── [Department] (Toy Boxes)
│    ├── Groups -> [Employee] (One Toy Box holds many Toy Figures)
│    └── Supervised by -> [DepartmentSupervisor] (A Toy Box can have many Supervisors)
└── [Employee] (Toy Figures)
     ├── Controls -> [Account] (Each Toy has exactly one Remote Control)
     ├── Knows -> [EmployeeSkill] (Each Toy knows a list of special tricks)
     ├── Reports to -> [Employee] (A Toy Leader can have a line of reports behind them)
     ├── Supervision Scope -> [DepartmentSupervisor] (Assigns which Toy Boxes a Toy supervises)
     └── Plays -> [ProjectMember] (Game Matcher)
          └── Joins to -> [Project] (Playground Games)

```

---

## 2. The Three Types of Relationships

In our playroom, we have three different ways of connecting our toys.

### A. One-to-Many (One Box has Many Toys)
*   **The Analogy:** Think of a **Department** as a big **Toy Box** (like "Engineering" or "Sales"), and **Employees** as **Toy Figures**.
*   One Toy Box can hold lots of different Toy Figures inside it.
*   But a single Toy Figure can only be in **one** Toy Box at a time.
*   **How the database sees it:** 
    ```text
    [Engineering Box]
    ├── Toy: Anjan
    ├── Toy: Trisha
    └── Toy: Arnav
    ```

### B. One-to-One (One Toy has One Remote Control)
*   **The Analogy:** An **Employee** is a **Toy Figure**, and an **Account** is a **Remote Control** used to make it move (log in).
*   Each Toy Figure has **exactly one** Remote Control.
*   Each Remote Control works with **exactly one** Toy Figure.
*   You cannot use one Remote to control two different toys at the same time, and a toy cannot have two remotes.
*   **How the database sees it:**
    ```text
    Toy Figure (Employee) <-----> Remote Control (Account)
       [Anjan]           <----->       [Account: Anjan]
    ```

### C. Many-to-Many (Kids Playing Games)
*   **The Analogy:** **Employees** are **Toy Figures**, and **Projects** are **Playground Games** (like "Hide and Seek" or "Tag").
*   One Toy Figure can play **many** different Games during recess.
*   One Game can have **many** different Toy Figures playing it together.
*   To keep track of who is playing what, we use a **Sign-Up Sheet** (this is our join table: **ProjectMember**).
*   **How the database sees it:**
    ```text
    Playground Game (Project: Build Castle)
    ├── Sign-Up Sheet (ProjectMember) -> Toy: Trisha
    ├── Sign-Up Sheet (ProjectMember) -> Toy: Arjun
    └── Sign-Up Sheet (ProjectMember) -> Toy: Arnav
    ```

### D. Many-to-One / Many-to-Many (Supervising Toy Boxes)
*   **The Analogy:** Some toys are **Super-Toys** (like the **CEO** or **CTO**). They do not just live in one single Toy Box. Instead, they are assigned to **Supervise** multiple Toy Boxes (departments).
*   For example, the **CEO** and **CTO** can both supervise the **Engineering Box**.
*   This means:
    *   One department can have **many** different supervisors (e.g. both CEO and CTO supervise Engineering).
    *   One supervisor can oversee **many** different departments (e.g. CEO supervises Engineering, HR, and Sales).
*   To keep track of which Super-Toy supervises which Box, we use a **Supervision List** (this is our table: **DepartmentSupervisor**).
*   When assigning a manager to a Toy Figure:
    *   We check if the manager lives in the **same** Toy Box. If yes, it is allowed!
    *   If they live in a different box, we check the **Supervision List**. If the manager is on the supervision list for that box (like the CEO or CTO), it is allowed!
*   **How the database sees it:**
    ```text
    CEO (Employee)
    ├── Supervision List (DepartmentSupervisor) -> Engineering Box
    ├── Supervision List (DepartmentSupervisor) -> HR Box
    └── Supervision List (DepartmentSupervisor) -> Sales Box
    ```

---


## 3. The Self-Referential Tree (The Toy Leader Line)

*   **The Analogy:** Think of a train line of **Toy Figures**. 
*   An **Employee** can have a manager (`manager_id`).
*   One **Leader Toy** (Manager) can pull a line of **Report Toys** behind them.
*   But each **Report Toy** is pulled by **only one** Leader Toy in front of them.
*   If we delete the Leader Toy from the line, the toys behind it do not break—they just stand still and have no leader (their `manager_id` becomes `NULL`).

```text
Leader: Anjan (DEPARTMENT HEAD)
 └── Pulls: Trisha (MANAGER)
      ├── Pulls: Arjun (SOFTWARE ENGINEER)
      ├── Pulls: Madhu (SOFTWARE ENGINEER)
      └── Pulls: Arnav (SOFTWARE ENGINEER)
```

---

## 4. Summary Table of Connections

| What connects to what? | Relationship Type | Playroom Analogy |
| :--- | :--- | :--- |
| **Department to Employee** | One-to-Many | One Toy Box holds many Toy Figures. |
| **Role to Employee** | One-to-Many | One Job Tag is worn by many Toy Figures. |
| **Employee to Account** | One-to-One | One Toy Figure has exactly one Remote Control. |
| **Employee to Employee** | Self-Referential One-to-Many | One Leader Toy pulls a line of Report Toys. |
| **Employee to Project** | Many-to-Many | Many Toy Figures play many Playground Games. |
| **Employee to Skill** | One-to-Many | One Toy Figure knows a list of tricks. |
| **Employee to Department (Supervisor)** | Many-to-Many / Many-to-One | One Super-Toy supervises many Toy Boxes; One Toy Box can have many supervisors. |

