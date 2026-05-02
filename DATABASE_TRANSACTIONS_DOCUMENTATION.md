# 🔄 Database Transactions Documentation (Criterion 12)

This document details the implementation of **ACID Transactions** in the Student Placement Cell Database Management System. Transactions ensure that complex operations involving multiple steps or multiple tables are executed as a single "atomic" unit—either everything succeeds, or nothing is changed.

---

## 1. Offer Acceptance & Placement
**Route:** `POST /api/applications/accept`
**Need:** When a student accepts an offer, the system must perform 5 distinct actions. If any one of them fails, the data becomes inconsistent.
**Transactional Steps:**
1.  Verify student status (not already placed).
2.  Check and decrement job vacancies.
3.  Update/Insert the `OFFER` record.
4.  Set `APPLICATION` status to 'selected'.
5.  Mark `STUDENT` profile as 'placed'.
6.  Create a formal `PLACEMENT_RECORD`.
**Rationale:** Guarantees that a student is only marked as "Placed" if their offer, application, and placement records are all successfully synchronized.

## 2. New User Provisioning
**Route:** `POST /admin/student` & `POST /admin/coordinator`
**Need:** Adding a new person requires creating a row in the profile table AND a corresponding login in the `USER_ROLE` table.
**Transactional Steps:**
1.  Insert into the profile table (`STUDENT` or `PLACEMENT_COORDINATOR`).
2.  Retrieve the auto-generated ID.
3.  Insert into the `USER_ROLE` table with the correct `entity_id`.
**Rationale:** Prevents "Orphaned Profiles" (a student record that exists but has no way to log in).

## 3. Bulk Coordinator Re-assignment
**Route:** `POST /admin/coordinator-swap`
**Need:** An Admin moving a large group of students from one coordinator to another must ensure the move is completed for EVERY student in the batch.
**Transactional Steps:**
1.  Lock all selected student records (`FOR UPDATE`).
2.  Update the `coord_id` for all student IDs in the set.
**Rationale:** Prevents "Partial Transfers" where only half the class is moved due to a server failure.

## 4. Secure User Deletion
**Route:** `DELETE /admin/student/:id`
**Need:** Deleting a student must wipe their entire presence to maintain security and avoid foreign key errors.
**Transactional Steps:**
1.  Delete linked `APPLICATION` records.
2.  Delete linked `PLACEMENT_RECORD` entries.
3.  Delete `USER_ROLE` login credentials.
4.  Delete `STUDENT` profile record.
**Rationale:** Guarantees that a deleted user cannot log in and that no "Ghost Data" remains.

## 5. Interview Scheduling & Shortlisting
**Route:** `POST /api/coordinator/interviews`
**Need:** Scheduling an interview is the trigger for shortlisting a student.
**Transactional Steps:**
1.  Verify student-coordinator assignment.
2.  Check for room/panel conflicts (Locking).
3.  Insert the `INTERVIEW` record.
4.  Update the `APPLICATION` status to 'shortlisted'.
**Rationale:** Ensures application status always stays in sync with scheduled interviews.

## 6. Atomic Job Posting
**Route:** `POST /api/coordinator/jobs`
**Need:** A job listing is incomplete without its eligibility criteria and required skills.
**Transactional Steps:**
1.  Insert the main `JOB_PROFILE` record.
2.  Insert multiple rows into `JOB_REQUIRED_SKILL`.
3.  Insert multiple rows into `JOB_ELIGIBILITY_BRANCH`.
**Rationale:** Prevents "Broken Listings" with zero skills or eligibility branches.

## 7. Company Deletion & Cleanup
**Route:** `DELETE /api/admin/company/:id`
**Need:** Deleting a company requires a cleanup of dependent jobs and applications.
**Transactional Steps:**
1.  Delete all `APPLICATION` records linked to the company's jobs.
2.  Delete all `JOB_PROFILE` records.
3.  Delete the `COMPANY` record.
**Rationale:** Prevents "Ghost Jobs" belonging to a company that no longer exists.

## 8. Application Withdrawal
**Route:** `POST /api/applications/withdraw`
**Need:** Withdrawing should also clean up any upcoming interviews for that job.
**Transactional Steps:**
1.  Verify withdrawal eligibility.
2.  Update `APPLICATION` status to 'withdrawn'.
3.  Delete upcoming `INTERVIEW` records for that job.
**Rationale:** Prevents coordinators from showing up to interviews for withdrawn applications.

---

## 🛠️ Implementation Details (Node.js)
We use the `mysql2/promise` pool to manage transactions:
```javascript
const conn = await pool.getConnection();
try {
    await conn.beginTransaction(); // Start Transaction
    
    // ... Multiple await conn.query() calls ...
    
    await conn.commit(); // Save all changes
} catch (err) {
    await conn.rollback(); // Undo all changes if ANY step fails
    throw err;
} finally {
    conn.release(); // Return connection to pool
}
```

---

## 🧪 Manual Verification Method
To check transactions manually in MySQL, you can use the `ROLLBACK` command:

1.  Open a SQL console and run:
    ```sql
    START TRANSACTION;
    UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = 1;
    INSERT INTO PLACEMENT_RECORD (s_id, comp_id, salary_offered) VALUES (1, 5, 12);
    SELECT profile_status FROM STUDENT WHERE s_id = 1; 
    ```
2.  Run:
    ```sql
    ROLLBACK;
    ```
3.  Verify the status:
    ```sql
    SELECT profile_status FROM STUDENT WHERE s_id = 1;
    ```
**Result:** The status reverts to original, proving the atomic "All-or-Nothing" behavior.
