# 🛠️ Implementation Plan: Role-Based "Database Queries" Explorer

This plan outlines the addition of a "Queries" section in the sidebar for **Student**, **Coordinator**, and **Admin** dashboards. This section will serve as a live demonstration of various DBMS concepts (Tables, Views, Joins, Subqueries) while enforcing strict data privacy.

---

## 1. Core Objectives
-   **Transparency**: Allow users to explore the database structure relevant to them.
-   **Concept Proof**: Explicitly categorize queries into **Tables**, **Views**, **Joins**, and **Subqueries** to satisfy academic rubrics.
-   **Security**: Ensure students cannot see sensitive data (like other students' grades or admin credentials).

---

## 2. UI/UX Changes (Sidebar & Content)
-   **Sidebar**: Add a new navigation item `Queries` (using an icon like `code-working-outline`).
-   **Explorer Interface**:
    -   **Category Tabs**: [Tables] [Views] [Joins] [Subqueries]
    -   **Dropdown**: Select specific queries based on the active tab.
    -   **Display**: A dynamic, scrollable data table with auto-generated headers.

---

## 3. Role-Based Query Matrix

### 🎓 Student Dashboard
*Focus on transparency of company data and personal history.*
-   **Tables**: `COMPANY`, `COMPANY_VISIT_HISTORY`, `JOB_PROFILE`.
-   **Views**: `vw_job_eligibility` (Combined jobs + criteria).
-   **Joins**: "My Recruitment Journey" (JOIN `APPLICATION` ➔ `JOB_PROFILE` ➔ `INTERVIEW`).
-   **Subqueries**: "Top Paying Companies" (Subquery identifying companies with packages > Avg).

### 🤝 Coordinator Dashboard
*Focus on departmental management and recruitment tracking.*
-   **Tables**: `STUDENT` (Filtered by Dept), `APPLICATION`, `OFFER`.
-   **Views**: `vw_dept_analytics` (Placement stats for their specific department).
-   **Joins**: "Pending Interview Slots" (JOIN `INTERVIEW` ➔ `STUDENT` ➔ `ROOM`).
-   **Subqueries**: "High Potential Students" (Subquery finding students with 0 offers but > 8.5 CGPA).

### 🛡️ Admin Dashboard
*Unrestricted access to all data and system audit trails.*
-   **Tables**: `USER_ROLE`, `PLACEMENT_COORDINATOR`, `CGDC_ADMIN`.
-   **Views**: `vw_system_audit` (Combined history of all placements).
-   **Joins**: "Universal Placement Map" (JOIN `STUDENT` ➔ `COORD` ➔ `OFFER` ➔ `COMPANY`).
-   **Subqueries**: "Underutilized Coordinators" (Subquery finding coordinators with < 10 students).

---

## 4. Technical Architecture

### Backend: `server/routes/queries.js`
-   Create a unified endpoint `GET /api/queries/:category/:id`.
-   Implement a **Query Registry** (A JSON map) that stores the SQL strings.
-   The backend will dynamically inject the `req.user.entityId` or `req.user.dept` to ensure filtering.

### Frontend: `js/queries.js`
-   A central script to handle the rendering of the Query Explorer.
-   Reusable logic to convert JSON results into HTML tables.

---

## 5. Next Steps
1.  **Backend Registry**: Define the SQL for all ~15-20 specialized queries.
2.  **API Integration**: Create the router and link it to the Express app.
3.  **UI Components**: Update the three dashboard HTML files and create the JS explorer.
4.  **Security Audit**: Verify that a "Student" token cannot fetch "Admin" queries via manual API calls.

---

## 🧪 Verification
The explorer will include a "Show SQL" toggle so that teachers/reviewers can see exactly which Join or Subquery is being executed to produce the displayed data.
