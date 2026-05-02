# 🔒 Database Concurrency & Locking (Criterion 13)

This document outlines the implementation of **Pessimistic Locking** (`SELECT ... FOR UPDATE`) in the Student Placement Cell Database Management System to prevent race conditions and ensure data integrity during high-concurrency operations.

---

## 1. Job Vacancy Quota (Anti-Racing)
**Scenario:** A company has a limited number of vacancies (e.g., 5). Multiple students receive offers and "race" to click **Accept**.
- **File:** `server/routes/applications.js`
- **Endpoint:** `POST /api/applications/accept`
- **Locking Logic:**
  ```sql
  SELECT vacancies FROM JOB_PROFILE WHERE job_id = ? FOR UPDATE;
  ```
- **Why:** Without this lock, two students could read `vacancies = 1` at the exact same time, both click accept, and the system would incorrectly allow 6 people for 5 spots. The `FOR UPDATE` lock forces the second student to wait until the first student's transaction is committed and the vacancy count is decremented.

## 2. Interview Slot Protection (Double-Booking Prevention)
**Scenario:** Multiple coordinators are scheduling interviews for different students/companies at the same time.
- **File:** `server/routes/coordinator.js`
- **Endpoint:** `POST /api/coordinator/interviews`
- **Locking Logic:**
  ```sql
  SELECT interview_id FROM INTERVIEW 
  WHERE interview_date = ? AND interview_time = ? AND room_no = ? 
  FOR UPDATE;
  ```
- **Why:** This prevents "Slot Stealing." If Coordinator A is halfway through booking "Room 101" for 10:00 AM, the database locks that specific slot. If Coordinator B tries to book the same room/time, the query will return the locked row (if it exists) or block until Coordinator A finishes, preventing double-bookings.

## 3. Status Conflict Resolution (Student vs. Coordinator)
**Scenario:** A student decides to **Opt Out** of placements at the exact same moment a coordinator is marking them as **Selected** (Placed).
- **File:** `server/routes/students.js` & `server/routes/coordinator.js`
- **Endpoints:** `POST /api/students/opt-out` and `PATCH /api/coordinator/applications/:id/status`
- **Locking Logic:**
  ```sql
  SELECT profile_status FROM STUDENT WHERE s_id = ? FOR UPDATE;
  ```
- **Why:** If both updates happened simultaneously without locks, the final state of the student could be inconsistent (e.g., marked as Placed in the Placement record but Opted Out in the Student record). The lock ensures the student profile is updated atomically.

## 4. Criteria Integrity (Eligibility Race Condition)
**Scenario:** An Admin is raising a Job's CGPA criteria (e.g., from 7.0 to 8.0) while a student with 7.5 CGPA is clicking **Apply**.
- **File:** `server/routes/applications.js`
- **Endpoint:** `POST /api/applications` (Submission)
- **Locking Logic:**
  ```sql
  SELECT eligibility_cgpa FROM JOB_PROFILE WHERE job_id = ? FOR UPDATE;
  ```
- **Why:** This forces the application process to wait if the job criteria are currently being modified. The student is then verified against the *final* committed criteria, preventing "illegal" applications from slipping through during an update window.

## 5. Admin Bulk Operations (Consistency Lock)
**Scenario:** An Admin is re-assigning 100 students from one coordinator to another in a single bulk operation.
- **File:** `server/routes/admin.js`
- **Endpoint:** `POST /admin/coordinator-swap`
- **Locking Logic:**
  ```sql
  SELECT s_id FROM STUDENT WHERE s_id IN (?) FOR UPDATE;
  ```
- **Why:** This is a **Bulk Shared Lock**. It ensures that no individual student profiles can be modified (by the students themselves or by their coordinators) while the Admin is moving them. This prevents "partial transfers" where some data is updated while other data is being moved.

---

## 🛠️ Implementation Details
- **Transaction Wrapper:** Every locked query is wrapped in an `await conn.beginTransaction()` and `await conn.commit()` block.
- **Automatic Rollback:** If a lock is acquired but a subsequent check fails (e.g., `vacancies <= 0`), `await conn.rollback()` is called to release all locks immediately.
- **Connection Release:** Always handled in a `finally` block to ensure the database pool is never exhausted.

---

## 🧪 How to Verify Locks Manually
To prove the locks are working, you can simulate a race condition using two separate SQL tabs (sessions) in MySQL Workbench.

### Step 1: Acquire Lock in Tab A (Session 1)
```sql
START TRANSACTION;
-- Lock student #1
SELECT * FROM STUDENT WHERE s_id = 1 FOR UPDATE;
-- (Keep this tab open without committing)
```

### Step 2: Attempt Update in Tab B (Session 2)
```sql
START TRANSACTION;
-- This update will HANG/WAIT because Tab A holds the lock
UPDATE STUDENT SET profile_status = 'opted_out' WHERE s_id = 1;
```

### Step 3: Observe and Release
1. Notice that **Tab B** does not complete; it is waiting for the lock.
2. Go back to **Tab A** and run `COMMIT;`.
3. Observe that **Tab B** immediately completes its update.

### Useful Monitoring Queries
```sql
-- See which query is blocking which
SELECT * FROM sys.innodb_lock_waits;

-- Check active locks
SELECT * FROM performance_schema.data_locks;
```
- **Timeout Safety:** All connections are released back to the pool in a `finally` block to prevent database hang-ups.
