# Comprehensive ER Diagram Relationship & Dependency Guide
**Database:** Student Placement Cell DBMS (22 Tables)

This document provides a highly detailed mapping of how every table connects to others in your database. It defines the exact **Relationship Name**, **Cardinality**, and **Participation Constraints (Total vs. Partial Dependency)**.

---

## 1. Visual Key for draw.io

Before drawing, understand how to represent constraints:

*   **Cardinality (Ratio):**
    *   `1` — Drawn as a line ending in **1** (or a single stroke).
    *   `N` / `M` — Drawn as a line ending in **N** (or crow's foot).
*   **Participation (Dependency):**
    *   **Total Participation (Double Line `==`):** The entity *must* exist in the relationship. Used when a Foreign Key is `NOT NULL`.
    *   **Partial Participation (Single Line `--`):** The entity *may or may not* exist in the relationship. Used when a Foreign Key can be `NULL`, or for the "parent" in a 1:N relationship.
*   **Relationship Shape:**
    *   **Regular Relationship:** Single Diamond `< >`
    *   **Identifying Relationship:** Double Diamond `<< >>` (Used *only* for Weak Entities).

---

## 2. Entity-by-Entity Relationship Breakdown

### 1. STUDENT
*   **To PLACEMENT_COORDINATOR**
    *   **Relationship Name:** `< assigned to >`
    *   **Cardinality:** N : 1 (Many Students to 1 Coordinator)
    *   **Dependency:**
        *   `STUDENT`: **Partial** (Single Line) — `coord_id` can technically be NULL initially.
        *   `PLACEMENT_COORDINATOR`: **Partial** (Single Line) — A coordinator might have 0 students.
*   **To DEPARTMENT**
    *   **Relationship Name:** `< belongs to dept >`
    *   **Cardinality:** N : 1 (Many Students to 1 Department)
    *   **Dependency:**
        *   `STUDENT`: **Total** (Double Line) — `dept` is NOT NULL. A student must have a department.
        *   `DEPARTMENT`: **Partial** (Single Line) — A department might temporarily have 0 students.
*   **To USER_ROLE**
    *   **Relationship Name:** `< authenticates via >`
    *   **Cardinality:** 1 : 1
    *   **Dependency:**
        *   `STUDENT`: **Total** (Double Line) — Every student needs a login.
        *   `USER_ROLE`: **Partial** (Single Line) — Not all user roles are students (some are admins).

### 2. PLACEMENT_COORDINATOR
*   **To CGDC_ADMIN**
    *   **Relationship Name:** `< supervised by >`
    *   **Cardinality:** N : 1 (Many Coordinators to 1 Admin)
    *   **Dependency:**
        *   `PLACEMENT_COORDINATOR`: **Partial** (Single Line) — `cgdc_id` allows NULL.
        *   `CGDC_ADMIN`: **Partial** (Single Line).
*   **To DEPARTMENT**
    *   **Relationship Name:** `< manages dept >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `PLACEMENT_COORDINATOR`: **Total** (Double Line) — `dept` is NOT NULL.
        *   `DEPARTMENT`: **Partial** (Single Line).
*   **To USER_ROLE**
    *   **Relationship Name:** `< authenticates via >`
    *   **Cardinality:** 1 : 1
    *   **Dependency:**
        *   `PLACEMENT_COORDINATOR`: **Total** (Double Line).
        *   `USER_ROLE`: **Partial** (Single Line).

### 3. CGDC_ADMIN
*   **To USER_ROLE**
    *   **Relationship Name:** `< authenticates via >`
    *   **Cardinality:** 1 : 1
    *   **Dependency:**
        *   `CGDC_ADMIN`: **Total** (Double Line).
        *   `USER_ROLE`: **Partial** (Single Line).

### 4. USER_ROLE
*(Central Authentication Table — See Tables 1, 2, 3 for incoming connections).*

### 5. COMPANY
*   **To JOB_PROFILE**
    *   **Relationship Name:** `< posts >`
    *   **Cardinality:** 1 : N (1 Company posts Many Jobs)
    *   **Dependency:**
        *   `COMPANY`: **Partial** (Single Line) — A company might not have posted a job yet.
        *   `JOB_PROFILE`: **Total** (Double Line) — `comp_id` is NOT NULL. A job *must* belong to a company.
*   **To COMPANY_VISIT_HISTORY**
    *   **Relationship Name:** `< conducts visit >`
    *   **Cardinality:** 1 : N
    *   **Dependency:**
        *   `COMPANY`: **Partial** (Single Line).
        *   `COMPANY_VISIT_HISTORY`: **Total** (Double Line) — A visit *must* belong to a company.

### 6. JOB_PROFILE
*   **To APPLICATION**
    *   **Relationship Name:** `< receives >`
    *   **Cardinality:** 1 : N (1 Job receives Many Applications)
    *   **Dependency:**
        *   `JOB_PROFILE`: **Partial** (Single Line).
        *   `APPLICATION`: **Total** (Double Line) — `job_id` is NOT NULL.
*   **To INTERVIEW**
    *   **Relationship Name:** `< schedules >`
    *   **Cardinality:** 1 : N
    *   **Dependency:**
        *   `JOB_PROFILE`: **Partial** (Single Line).
        *   `INTERVIEW`: **Total** (Double Line) — `job_id` is NOT NULL.
*   **To OFFER**
    *   **Relationship Name:** `< leads to offer >`
    *   **Cardinality:** 1 : N
    *   **Dependency:**
        *   `JOB_PROFILE`: **Partial** (Single Line).
        *   `OFFER`: **Total** (Double Line) — `job_id` is NOT NULL.

### 7. APPLICATION
*   **To STUDENT**
    *   **Relationship Name:** `< submits >`
    *   **Cardinality:** N : 1 (Many Applications by 1 Student)
    *   **Dependency:**
        *   `APPLICATION`: **Total** (Double Line) — `s_id` is NOT NULL.
        *   `STUDENT`: **Partial** (Single Line) — A student might not apply for any job.
*   **To RESUME**
    *   **Relationship Name:** `< includes >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `APPLICATION`: **Partial** (Single Line) — `resume_id` allows NULL.
        *   `RESUME`: **Partial** (Single Line).
*   **To PLACEMENT_COORDINATOR**
    *   **Relationship Name:** `< managed by >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `APPLICATION`: **Partial** (Single Line) — `assigned_coord_id` allows NULL.
        *   `PLACEMENT_COORDINATOR`: **Partial** (Single Line).

### 8. INTERVIEW
*   **To STUDENT**
    *   **Relationship Name:** `< appears for >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `INTERVIEW`: **Total** (Double Line) — `s_id` is NOT NULL.
        *   `STUDENT`: **Partial** (Single Line).

### 9. OFFER
*   **To STUDENT**
    *   **Relationship Name:** `< receives offer >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `OFFER`: **Total** (Double Line) — `s_id` is NOT NULL.
        *   `STUDENT`: **Partial** (Single Line).

### 10. PLACEMENT_RECORD
*   **To STUDENT**
    *   **Relationship Name:** `< secures >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `PLACEMENT_RECORD`: **Total** (Double Line) — `s_id` is NOT NULL.
        *   `STUDENT`: **Partial** (Single Line).
*   **To COMPANY**
    *   **Relationship Name:** `< confirms >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `PLACEMENT_RECORD`: **Total** (Double Line) — `comp_id` is NOT NULL.
        *   `COMPANY`: **Partial** (Single Line).
*   **To JOB_PROFILE**
    *   **Relationship Name:** `< results from >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `PLACEMENT_RECORD`: **Partial** (Single Line) — `job_id` allows NULL (for off-campus placements).
        *   `JOB_PROFILE`: **Partial** (Single Line).

### 11. RESUME
*   **To STUDENT**
    *   **Relationship Name:** `< uploads >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `RESUME`: **Total** (Double Line) — `s_id` is NOT NULL.
        *   `STUDENT`: **Partial** (Single Line).

### 12. STUDENT_SKILL (Strong Entity)
*   **To STUDENT**
    *   **Relationship Name:** `< possesses skill >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `STUDENT_SKILL`: **Total** (Double Line) — `s_id` is NOT NULL.
        *   `STUDENT`: **Partial** (Single Line).

### 13. COMPANY_VISIT_HISTORY
*(Mapped in Table 5)*

### 14. DEPARTMENT
*(Lookup table mapped in Tables 1 and 2)*

### 15. NOTIFICATION
*   **To USER_ROLE**
    *   **Relationship Name:** `< notified via >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `NOTIFICATION`: **Total** (Double Line) — `user_id` is NOT NULL.
        *   `USER_ROLE`: **Partial** (Single Line).

### 16. CHAT_MESSAGE
*   **To USER_ROLE (Sender)**
    *   **Relationship Name:** `< sends >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `CHAT_MESSAGE`: **Total** (Double Line) — `sender_id` is NOT NULL.
        *   `USER_ROLE`: **Partial** (Single Line).
*   **To USER_ROLE (Receiver)**
    *   **Relationship Name:** `< receives >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `CHAT_MESSAGE`: **Total** (Double Line) — `receiver_id` is NOT NULL.
        *   `USER_ROLE`: **Partial** (Single Line).

### 17. STATUS_AUDIT_LOG
*   **To APPLICATION**
    *   **Relationship Name:** `< logs changes of >`
    *   **Cardinality:** N : 1
    *   **Dependency:**
        *   `STATUS_AUDIT_LOG`: **Total** (Double Line) — `app_id` is NOT NULL.
        *   `APPLICATION`: **Partial** (Single Line).

---

## 3. Weak Entities (The Final 5 Tables)

*Weak entities cannot exist without their owner. In draw.io, draw them with a **[Double Rectangle]** and use a **< Double Diamond >** for the relationship.*

### 18. JOB_REQUIRED_SKILL (Weak)
*   **Owner Entity:** JOB_PROFILE
*   **Relationship Name:** `<< requires skill >>`
*   **Cardinality:** N : 1
*   **Dependency:** `JOB_REQUIRED_SKILL` (Total `==`) | `JOB_PROFILE` (Partial `--`)

### 19. JOB_ELIGIBILITY_BRANCH (Weak)
*   **Owner Entity:** JOB_PROFILE
*   **Relationship Name:** `<< eligible for branch >>`
*   **Cardinality:** N : 1
*   **Dependency:** `JOB_ELIGIBILITY_BRANCH` (Total `==`) | `JOB_PROFILE` (Partial `--`)

### 20. RESUME_PARSED_KEYWORD (Weak)
*   **Owner Entity:** RESUME
*   **Relationship Name:** `<< parsed from >>`
*   **Cardinality:** N : 1
*   **Dependency:** `RESUME_PARSED_KEYWORD` (Total `==`) | `RESUME` (Partial `--`)

### 21. RESUME_ANALYSIS_KEYWORD (Weak)
*   **Owner Entity:** RESUME
*   **Relationship Name:** `<< analyzed from >>`
*   **Cardinality:** N : 1
*   **Dependency:** `RESUME_ANALYSIS_KEYWORD` (Total `==`) | `RESUME` (Partial `--`)

### 22. VISIT_COVERED_STREAM (Weak)
*   **Owner Entity:** COMPANY_VISIT_HISTORY
*   **Relationship Name:** `<< covers stream >>`
*   **Cardinality:** N : 1
*   **Dependency:** `VISIT_COVERED_STREAM` (Total `==`) | `COMPANY_VISIT_HISTORY` (Partial `--`)

---

## Summary of Total vs Partial Dependency Logic:
1. If the entity has a Foreign Key that is `NOT NULL`, it has **Total Dependency (Double Line `==`)** on the parent table because it cannot exist without it. (e.g., `OFFER` must have `s_id`).
2. If the entity has a Foreign Key that allows `NULL` (e.g., `coord_id` on STUDENT), it has **Partial Dependency (Single Line `--`)**.
3. Parent tables (like `COMPANY` or `STUDENT`) almost always have **Partial Dependency (Single Line `--`)** to their child tables, because a parent can exist without any children (a student can exist without an offer).
