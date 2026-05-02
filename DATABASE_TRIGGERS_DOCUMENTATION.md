# ⚡ Database Triggers Documentation (Criterion 14)

This document details the implementation of **Active Database Triggers** in the Student Placement Cell Database Management System. Triggers automate business logic at the data layer, ensuring consistency even if the application code is bypassed.

---

## 1. Automatic Eligibility Manager (`trg_update_eligibility`)
*   **Table:** `STUDENT`
*   **Event:** `BEFORE UPDATE`
*   **Logic:** 
    ```sql
    IF NEW.cgpa < 6.0 AND OLD.cgpa >= 6.0 THEN
        SET NEW.profile_status = 'not_eligible';
    END IF;
    ```
*   **Need:** Automatically disqualifies students from the placement process if their academic performance falls below the minimum institutional requirement (6.0 CGPA).
*   **Verification:** Try updating a student's CGPA to `5.5` in the database; their status will immediately flip to `not_eligible`.

## 2. Application Status Audit Log (`trg_application_audit`)
*   **Table:** `APPLICATION`
*   **Event:** `AFTER UPDATE`
*   **Logic:**
    ```sql
    IF OLD.status <> NEW.status THEN
        INSERT INTO STATUS_AUDIT_LOG (app_id, old_status, new_status)
        VALUES (OLD.app_id, OLD.status, NEW.status);
    END IF;
    ```
*   **Need:** Maintains a permanent history of recruitment status changes. This allows admins to audit when and how a student moved from "Applied" to "Selected".
*   **Verification:** Check the `STATUS_AUDIT_LOG` table after any application status update.

## 3. Placement Conflict Prevention (`trg_prevent_duplicate_placement`)
*   **Table:** `PLACEMENT_RECORD`
*   **Event:** `BEFORE INSERT`
*   **Logic:**
    ```sql
    SELECT COUNT(*) INTO placed_count FROM PLACEMENT_RECORD 
    WHERE s_id = NEW.s_id AND (status = 'confirmed' OR status = 'placed');
    IF placed_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: Student is already placed in another company.';
    END IF;
    ```
*   **Need:** Enforces the "One Student One Job" policy. It prevents the system from accidentally recording multiple job acceptances for the same student.
*   **Verification:** Try inserting a second placement record for a student who is already placed. The database will return an error.

## 4. Vacancy Auto-Sync (`trg_vacancy_sync`)
*   **Table:** `OFFER`
*   **Event:** `AFTER UPDATE`
*   **Logic:**
    ```sql
    IF NEW.offer_status = 'accepted' AND OLD.offer_status <> 'accepted' THEN
        UPDATE JOB_PROFILE SET vacancies = vacancies - 1 WHERE job_id = NEW.job_id;
    END IF;
    ```
*   **Need:** Acts as a database-level guarantee for vacancy management. Even if an offer is accepted via a manual SQL query, the `JOB_PROFILE` vacancy count will stay accurate.
*   **Verification:** Check the `vacancies` count in `JOB_PROFILE` before and after marking an offer as 'accepted'.

---

## 🛠️ Audit Table Schema
The following table was created to support the auditing trigger:
```sql
CREATE TABLE STATUS_AUDIT_LOG (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    app_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧪 How to View Active Triggers
Run this command in your SQL client to see the technical details of these triggers:
```sql
SHOW TRIGGERS;
```
