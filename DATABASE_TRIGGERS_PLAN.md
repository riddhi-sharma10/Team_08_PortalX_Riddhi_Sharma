# ⚡ Database Triggers Implementation Plan (Criterion 14)

Triggers are essential for automating business logic and maintaining data integrity directly within the database. This document outlines the proposed triggers to satisfy **Criterion 14**.

---

## 1. Automatic Eligibility Manager
*   **Table:** `STUDENT`
*   **Event:** `AFTER UPDATE` (on `cgpa` column)
*   **Logic:** If a student's CGPA is updated and falls below **6.0**, automatically set their `profile_status` to `'not_eligible'`.
*   **Why:** Ensures that students who do not meet the minimum college criteria are automatically removed from the placement pool without manual intervention.

## 2. Application Status Audit Log
*   **Table:** `APPLICATION`
*   **Event:** `AFTER UPDATE` (on `status` column)
*   **Logic:** Every time an application status changes (e.g., from 'Under Review' to 'Selected'), insert a row into a new `STATUS_AUDIT_LOG` table with the old status, new status, student ID, and timestamp.
*   **Why:** Provides a clear history of a student's recruitment journey. This is vital for resolving disputes or tracking coordinator efficiency.

## 3. Placement Conflict Prevention
*   **Table:** `PLACEMENT_RECORD`
*   **Event:** `BEFORE INSERT`
*   **Logic:** Check if the student already has a confirmed placement record. If they do, raise a `SIGNAL SQLSTATE` error to prevent the insert.
*   **Why:** A "failsafe" to ensure that a student cannot be accidentally placed in two companies simultaneously (adhering to "One Student One Job" policies).

## 4. Vacancy Auto-Sync (Fallback)
*   **Table:** `OFFER`
*   **Event:** `AFTER UPDATE` (when `offer_status` becomes 'accepted')
*   **Logic:** Automatically decrement the `vacancies` count in the `JOB_PROFILE` table.
*   **Why:** While we have this logic in our Node.js code, a trigger acts as a database-level guarantee. Even if someone updates the database manually, the vacancy count will stay accurate.

---

## 🛠️ Implementation Steps
1.  **Create Audit Table**: We need a simple table to store logs.
2.  **Define SQL Triggers**: Write the `CREATE TRIGGER` blocks for each scenario.
3.  **Test Scenarios**: Manually trigger each event to ensure the automation fires correctly.

---

## 🧪 How to Check if a Trigger exists?
You can run this command in your SQL client to see all active triggers:
```sql
SHOW TRIGGERS;
```
