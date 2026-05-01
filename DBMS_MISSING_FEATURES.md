# DBMS Missing Features – Implementation Plan
### Student Placement Cell | May 2026 Evaluation

> **Scope:** Only website backend (Node.js routes). DB already has 44 Views, 44 Stored Procedures,
> rich Indexes. This file tracks what is **NOT yet wired to the website**.

---

## Status Overview

| Concept | In DB? | Used by Website? | Priority |
|:---|:---:|:---:|:---:|
| JOINs (INNER, LEFT) | ✅ | ✅ | Done |
| GROUP BY | ✅ | ✅ | Done |
| Scalar Functions (`DATE_FORMAT`, `CONCAT`) | ✅ | ✅ | Done |
| Aggregate Functions (`COUNT`, `AVG`, `MAX`) | ✅ | ✅ | Done |
| Views (3 of 44 used) | ✅ | ⚠️ Partial | Medium |
| Stored Procedures (3 of 44 used) | ✅ | ⚠️ Partial | Medium |
| Indexes (rich - all tables) | ✅ | ✅ (implicit) | Done |
| **HAVING clause** | ❌ Missing | ❌ | **HIGH** |
| **Transactions + COMMIT/ROLLBACK** | SP exists | ❌ Not called | **HIGH** |
| **Locking Protocols** | ❌ Missing | ❌ | **HIGH** |
| **Triggers** | ❌ Zero in DB | ❌ | **HIGH** |
| Subqueries | ✅ | ✅ (coordinator) | Done |

---

## Feature 1 — HAVING Clause (Rubric Criterion 8)

**File:** `server/routes/analytics.js`

**What to add:** A new API endpoint `/api/analytics/dept-filter` that uses `GROUP BY + HAVING`
to return only departments that meet a minimum placement threshold.

```js
// GET /api/analytics/dept-filter?min_placed=2
router.get('/dept-filter', requireAuth, async (req, res) => {
    const minPlaced = parseInt(req.query.min_placed) || 1;
    try {
        const [rows] = await pool.query(`
            SELECT
                s.dept                            AS department,
                COUNT(DISTINCT a.s_id)            AS placed_students,
                ROUND(AVG(j.package), 2)          AS avg_package_lpa,
                MAX(j.package)                    AS highest_package_lpa,
                MIN(j.package)                    AS lowest_package_lpa
            FROM APPLICATION a
            JOIN STUDENT s      ON a.s_id   = s.s_id
            JOIN JOB_PROFILE j  ON a.job_id = j.job_id
            WHERE a.status = 'selected'
            GROUP BY s.dept
            HAVING COUNT(DISTINCT a.s_id) >= ?
            ORDER BY placed_students DESC
        `, [minPlaced]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
```

**Viva explanation:**
> *"WHERE filters individual rows before grouping. HAVING filters the groups after aggregation.
> Here, we only show departments that have placed at least N students — impossible with WHERE alone."*

---

## Feature 2 — Transactions with COMMIT / ROLLBACK (Rubric Criterion 13)

**File:** `server/routes/coordinator.js`

**What to add:** Wire the existing `sp_accept_offer` stored procedure to a new route.
This SP already contains `START TRANSACTION / COMMIT / ROLLBACK` internally.
Additionally, add a raw transaction route to demonstrate explicit control.

### Option A — Call the existing SP (quick win)

```js
// POST /api/coordinator/offers/:id/accept
router.post('/offers/:id/accept', async (req, res) => {
    try {
        // sp_accept_offer internally runs:
        //   START TRANSACTION
        //   UPDATE OFFER SET offer_status = 'accepted'
        //   UPDATE STUDENT SET profile_status = 'placed'
        //   INSERT INTO PLACEMENT_RECORD (...)
        //   COMMIT  (or ROLLBACK on error)
        const [result] = await pool.query('CALL sp_accept_offer(?)', [req.params.id]);
        res.json({ success: true, message: 'Offer accepted. Placement record created.', data: result[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/coordinator/offers/:id/reject
router.post('/offers/:id/reject', async (req, res) => {
    try {
        const [result] = await pool.query('CALL sp_reject_offer(?)', [req.params.id]);
        res.json({ success: true, message: 'Offer rejected.', data: result[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
```

### Option B — Explicit raw transaction (for demo / viva clarity)

```js
// POST /api/coordinator/offers/:id/accept-raw
router.post('/offers/:id/accept-raw', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction(); // START TRANSACTION

        // Step 1: Lock the offer row (Locking Protocol – see Feature 4)
        const [offer] = await conn.query(
            'SELECT * FROM OFFER WHERE offer_id = ? FOR UPDATE',
            [req.params.id]
        );
        if (!offer.length) throw new Error('Offer not found');
        if (offer[0].offer_status !== 'pending') throw new Error('Offer already processed');

        // Step 2: Mark offer as accepted
        await conn.query(
            'UPDATE OFFER SET offer_status = ? WHERE offer_id = ?',
            ['accepted', req.params.id]
        );

        // Step 3: Update student status
        await conn.query(
            "UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = ?",
            [offer[0].s_id]
        );

        // Step 4: Create placement record
        await conn.query(`
            INSERT INTO PLACEMENT_RECORD (s_id, comp_id, job_id, academic_year, salary_offered, stream, status)
            SELECT o.s_id, j.comp_id, o.job_id, YEAR(CURDATE()), o.ctc, s.dept, 'confirmed'
            FROM OFFER o
            JOIN JOB_PROFILE j ON o.job_id = j.job_id
            JOIN STUDENT s     ON o.s_id   = s.s_id
            WHERE o.offer_id = ?
        `, [req.params.id]);

        await conn.commit(); // ✅ ALL 4 STEPS SUCCEEDED → Commit
        res.json({ success: true, message: 'Transaction committed. Offer accepted & placement recorded.' });

    } catch (err) {
        await conn.rollback(); // ❌ ANY STEP FAILED → Rollback everything
        res.status(500).json({ success: false, message: `Transaction rolled back: ${err.message}` });
    } finally {
        conn.release();
    }
});
```

**Viva explanation:**
> *"This is ACID in action. All 4 SQL statements are wrapped in a single transaction.
> If step 3 fails (student not found), the ROLLBACK undoes steps 1 and 2 as well —
> the offer is NOT marked accepted. This ensures data consistency."*

---

## Feature 3 — Locking Protocols (Concurrency Control)

**File:** `server/routes/coordinator.js` *(integrated into the transaction above)*

MySQL supports two locking modes for SELECT:

### Exclusive Lock — `SELECT ... FOR UPDATE`
Prevents any other transaction from reading OR writing the locked row until COMMIT.

```sql
-- Used BEFORE modifying an offer (prevents double-accept race condition)
SELECT * FROM OFFER WHERE offer_id = 5 FOR UPDATE;
```

**Use case in project:** When two coordinators try to accept the same offer simultaneously,
the `FOR UPDATE` lock ensures only one transaction proceeds. The second one waits or fails.

### Shared Lock — `SELECT ... LOCK IN SHARE MODE`
Allows other transactions to READ but not WRITE the locked rows.

```sql
-- Used when reading student data for a report (safe read, no modification)
SELECT s_id, s_name, cgpa FROM STUDENT WHERE coord_id = 1 LOCK IN SHARE MODE;
```

### Add a dedicated locking demo route

**File:** `server/routes/analytics.js`

```js
// GET /api/analytics/offer-safe-read/:offerId
// Demonstrates shared lock for safe concurrent reads
router.get('/offer-safe-read/:offerId', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Shared lock: others can read, nobody can modify during our read
        const [rows] = await conn.query(
            'SELECT * FROM OFFER WHERE offer_id = ? LOCK IN SHARE MODE',
            [req.params.offerId]
        );

        await conn.commit();
        res.json({ lock_type: 'SHARED', data: rows[0] || null });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
});
```

**Viva explanation:**
> *"Locking protocols handle concurrency — what happens when two users act on the same data
> simultaneously. FOR UPDATE is an exclusive lock used before write operations.
> LOCK IN SHARE MODE is a shared lock used for safe reads inside a transaction."*

---

## Feature 4 — Triggers (Rubric Bonus + Criterion 3)

**Triggers must be created directly in MySQL (Aiven). Add these via MySQL Workbench or a migration script.**

### Trigger 1: Auto-update student status after offer accepted

```sql
DELIMITER $$
CREATE TRIGGER trg_after_offer_accepted
AFTER UPDATE ON OFFER
FOR EACH ROW
BEGIN
    -- When offer_status changes TO 'accepted', mark student as placed
    IF NEW.offer_status = 'accepted' AND OLD.offer_status != 'accepted' THEN
        UPDATE STUDENT
        SET profile_status = 'placed'
        WHERE s_id = NEW.s_id;
    END IF;
END$$
DELIMITER ;
```

### Trigger 2: Log application count consistency check after new application

```sql
DELIMITER $$
CREATE TRIGGER trg_after_application_insert
AFTER INSERT ON APPLICATION
FOR EACH ROW
BEGIN
    -- Automatically update ATS score to 0 if NULL on insert
    IF NEW.ats_score IS NULL THEN
        UPDATE APPLICATION
        SET ats_score = 0.00
        WHERE app_id = NEW.app_id;
    END IF;
END$$
DELIMITER ;
```

**Viva explanation:**
> *"A trigger is a stored program that fires automatically when a specific DB event occurs —
> here an AFTER UPDATE on OFFER. When any transaction marks an offer as accepted,
> the trigger automatically keeps STUDENT.profile_status in sync without the application
> layer needing to know about it. This enforces business rules at the database level."*

**Add to a migration file:** `server/add_triggers.js`

```js
import pool from './db.js';

const triggers = [
    `CREATE TRIGGER trg_after_offer_accepted
     AFTER UPDATE ON OFFER FOR EACH ROW
     BEGIN
         IF NEW.offer_status = 'accepted' AND OLD.offer_status != 'accepted' THEN
             UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = NEW.s_id;
         END IF;
     END`,
    `CREATE TRIGGER trg_after_application_insert
     AFTER INSERT ON APPLICATION FOR EACH ROW
     BEGIN
         IF NEW.ats_score IS NULL THEN
             UPDATE APPLICATION SET ats_score = 0.00 WHERE app_id = NEW.app_id;
         END IF;
     END`
];

const conn = await pool.getConnection();
for (const sql of triggers) {
    try {
        await conn.query(`DROP TRIGGER IF EXISTS ${sql.match(/TRIGGER (\w+)/)[1]}`);
        await conn.query(sql);
        console.log('✅ Created:', sql.match(/TRIGGER (\w+)/)[1]);
    } catch (e) {
        console.error('❌', e.message);
    }
}
conn.release();
await pool.end();
```

---

## Feature 5 — Use More Views in Routes (Rubric Criterion 11)

Your DB has **44 views**. Website uses only **3**. Swap raw SQL in existing routes for views.

### In `server/routes/admin.js` — Top Companies

```js
// Replace the raw JOIN query for top companies with:
const [topCompanies] = await pool.query(`
    SELECT * FROM vw_top_hiring_companies LIMIT 5
`);
```

### In `server/routes/coordinator.js` — Shortlisted candidates

```js
// New endpoint using view
router.get('/shortlisted', async (req, res) => {
    const id = req.user.entityId;
    const [rows] = await pool.query(`
        SELECT v.* FROM vw_shortlisted_candidates v
        JOIN STUDENT s ON v.s_id = s.s_id
        WHERE s.coord_id = ?
    `, [id]);
    res.json(rows);
});
```

### Other Views to Wire Up

| View Name | Where to Use |
|:---|:---|
| `vw_top_hiring_companies` | Admin dashboard top companies |
| `vw_shortlisted_candidates` | Coordinator shortlist tab |
| `vw_placement_rate_per_dept` | Analytics page department chart |
| `vw_avg_salary_per_dept` | Analytics salary section |
| `vw_open_jobs` | Student jobs listing page |
| `vw_offers_accepted` | Admin placement records |
| `vw_resume_ats_details` | Student resume page |

---

## Feature 6 — Call More Stored Procedures (Rubric Criterion 12)

Your DB has **44 SPs**. Website calls only **3**. Route additions needed:

### In `server/routes/admin.js`

```js
// Replace raw SQL in /dashboard top companies with SP
const [topHiring] = await pool.query('CALL sp_get_top_hiring_companies(5)');

// Replace raw SQL in /analytics with SP
const [deptStats] = await pool.query('CALL sp_get_dept_placement_stats()');
const [avgSalary] = await pool.query('CALL sp_get_avg_salary_per_dept()');
const [appDist]   = await pool.query('CALL sp_get_app_status_distribution()');
```

### In `server/routes/coordinator.js`

```js
// Replace raw queries with procedure calls
const [upcoming] = await pool.query('CALL sp_get_upcoming_interviews(?)', [id]);
const [stuInts]  = await pool.query('CALL sp_get_student_interviews(?)', [studentId]);
const [stuOffers]= await pool.query('CALL sp_get_student_offers(?)', [studentId]);
```

### New `server/routes/procedures.js` endpoints to expose

```js
// These SPs exist in DB but have NO route at all:
router.post('/schedule-interview', requireAuth, async (req, res) => {
    const { student_id, job_id, panel, date, mode } = req.body;
    const [r] = await pool.query('CALL sp_schedule_interview(?,?,?,?,?)',
        [student_id, job_id, panel, date, mode]);
    res.json({ success: true, data: r[0] });
});

router.post('/update-app-status', requireAuth, async (req, res) => {
    const { app_id, status } = req.body;
    const [r] = await pool.query('CALL sp_update_app_status(?,?)', [app_id, status]);
    res.json({ success: true, data: r[0] });
});

router.get('/company-hiring-stats/:comp_id', requireAuth, async (req, res) => {
    const [r] = await pool.query('CALL sp_get_company_hiring_stats(?)', [req.params.comp_id]);
    res.json({ data: r[0] });
});
```

---

## Implementation Priority Order

| # | Feature | Est. Time | Marks Impact |
|:---:|:---|:---:|:---|
| 1 | **Transaction + ROLLBACK route** (Feature 2B) | 20 min | Criterion 13 — very visible in demo |
| 2 | **HAVING clause route** (Feature 1) | 10 min | Criterion 8 — easy win |
| 3 | **Triggers in DB** (Feature 4) | 20 min | Criterion 3 bonus + viva point |
| 4 | **Locking demo route** (Feature 3) | 15 min | Shows concurrency awareness |
| 5 | **Swap 3-4 routes to use Views** (Feature 5) | 20 min | Criterion 11 — show views in action |
| 6 | **Add 4-5 more SP call routes** (Feature 6) | 20 min | Criterion 12 — show SPs used |

---

## Viva One-Liners for New Concepts

| Concept | Say This |
|:---|:---|
| HAVING | *"WHERE filters rows; HAVING filters groups after GROUP BY aggregates them"* |
| FOR UPDATE | *"Exclusive lock — prevents other transactions from reading or writing until we COMMIT"* |
| LOCK IN SHARE MODE | *"Shared lock — others can read but nobody can write until we COMMIT"* |
| Trigger | *"Auto-fires on a DB event; we use AFTER UPDATE on OFFER to auto-sync student status"* |
| ROLLBACK | *"Undoes all statements in the transaction if any single step fails — keeps DB consistent"* |
| View | *"Virtual table storing a SELECT query; we use `vw_shortlisted_candidates` to abstract a 4-table JOIN"* |

---

## Feature 7 — ATS Score Calculator (Major USP)

> **What is ATS?** Applicant Tracking System score = how well a student's resume keywords
> match the job's required skills. Your DB already has `RESUME_PARSED_KEYWORD` and
> `JOB_REQUIRED_SKILL` tables — perfect for this.

### How the Calculation Works (Pure SQL)

```sql
-- ATS Score = (matching keywords / total job required skills) * 100
SELECT
    a.app_id,
    a.s_id,
    a.job_id,
    COUNT(DISTINCT rpk.keyword)                          AS matched_keywords,
    (SELECT COUNT(*) FROM JOB_REQUIRED_SKILL WHERE job_id = a.job_id) AS total_required,
    ROUND(
        (COUNT(DISTINCT rpk.keyword) /
         NULLIF((SELECT COUNT(*) FROM JOB_REQUIRED_SKILL WHERE job_id = a.job_id), 0)
        ) * 100, 2
    )                                                    AS ats_score
FROM APPLICATION a
JOIN RESUME r            ON r.s_id = a.s_id AND r.is_active = 1
JOIN RESUME_PARSED_KEYWORD rpk ON rpk.resume_id = r.resume_id
JOIN JOB_REQUIRED_SKILL jrs    ON jrs.skill_name = rpk.keyword
                               AND jrs.job_id = a.job_id
WHERE a.app_id = ?
GROUP BY a.app_id, a.s_id, a.job_id;
```

### Backend Route — `server/routes/applications.js`

```js
// POST /api/applications/:appId/calculate-ats
// Calculates ATS score for one application and saves it to DB
router.post('/:appId/calculate-ats', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction(); // wrap in transaction — ACID!

        // Step 1: Calculate score via SQL (keyword match)
        const [scoreRows] = await conn.query(`
            SELECT
                ROUND(
                    (COUNT(DISTINCT rpk.keyword) /
                     NULLIF((SELECT COUNT(*) FROM JOB_REQUIRED_SKILL WHERE job_id = a.job_id), 0)
                    ) * 100, 2
                ) AS ats_score
            FROM APPLICATION a
            JOIN RESUME r                  ON r.s_id = a.s_id AND r.is_active = 1
            JOIN RESUME_PARSED_KEYWORD rpk ON rpk.resume_id = r.resume_id
            JOIN JOB_REQUIRED_SKILL jrs    ON jrs.skill_name = rpk.keyword
                                           AND jrs.job_id = a.job_id
            WHERE a.app_id = ?
            GROUP BY a.app_id
        `, [req.params.appId]);

        const score = scoreRows[0]?.ats_score ?? 0;

        // Step 2: Save score back to APPLICATION table
        await conn.query(
            'UPDATE APPLICATION SET ats_score = ? WHERE app_id = ?',
            [score, req.params.appId]
        );

        // Step 3: Also update the RESUME's ATS score (uses existing SP)
        // CALL sp_update_ats_score(resume_id, score)
        const [appData] = await conn.query(
            'SELECT resume_id FROM APPLICATION WHERE app_id = ?',
            [req.params.appId]
        );
        if (appData[0]?.resume_id) {
            await conn.query('CALL sp_update_ats_score(?, ?)',
                [appData[0].resume_id, score]);
        }

        await conn.commit();
        res.json({ success: true, ats_score: score, message: `ATS Score: ${score}%` });

    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
});

// POST /api/applications/recalculate-all-ats
// Batch recalculate ATS for ALL pending applications (admin only)
router.post('/recalculate-all-ats', requireAuth, async (req, res) => {
    try {
        const [apps] = await pool.query(
            "SELECT app_id FROM APPLICATION WHERE status IN ('applied','under_review','shortlisted')"
        );
        let updated = 0;
        for (const app of apps) {
            await pool.query(`
                UPDATE APPLICATION a
                SET a.ats_score = (
                    SELECT ROUND(
                        COUNT(DISTINCT rpk.keyword) /
                        NULLIF((SELECT COUNT(*) FROM JOB_REQUIRED_SKILL WHERE job_id = a.job_id), 0)
                        * 100, 2)
                    FROM RESUME r
                    JOIN RESUME_PARSED_KEYWORD rpk ON rpk.resume_id = r.resume_id
                    JOIN JOB_REQUIRED_SKILL jrs    ON jrs.skill_name = rpk.keyword
                                                   AND jrs.job_id = a.job_id
                    WHERE r.s_id = a.s_id AND r.is_active = 1
                )
                WHERE a.app_id = ?
            `, [app.app_id]);
            updated++;
        }
        res.json({ success: true, updated_count: updated });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
```

**Viva explanation:**
> *"Our ATS calculator is fully SQL-driven. It JOINs RESUME_PARSED_KEYWORD with
> JOB_REQUIRED_SKILL to count keyword matches, divides by total required skills,
> and returns a percentage score. This is wrapped in a transaction so the score
> is either saved completely or not at all — no partial updates."*

---

## Feature 8 — Dashboard Write Operations (Save to DB)

> **Answer: YES — absolutely possible and easy.** Your DB already has stored procedures
> for every insert/update operation. They just need API routes and frontend forms.

### 8.1 Add Student from Admin Dashboard

**Route:** `server/routes/admin.js`

```js
// POST /api/admin/students/add
router.post('/students/add', async (req, res) => {
    const { name, email, phone, dob, dept, cgpa, grad_yr, coord_id } = req.body;
    try {
        // Uses existing sp_insert_student — saves directly to STUDENT table
        await pool.query('CALL sp_insert_student(?,?,?,?,?,?,?,?,?)',
            [name, email, phone, dob, dept, cgpa, grad_yr, coord_id, null]);
        res.json({ success: true, message: `Student ${name} added to database.` });
    } catch (err) {
        // If email already exists, MySQL throws ER_DUP_ENTRY
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email already registered.' });
        }
        res.status(500).json({ message: err.message });
    }
});
```

### 8.2 Add Company from Admin Dashboard

```js
// POST /api/admin/companies/add
router.post('/companies/add', async (req, res) => {
    const { name, industry, location, email, phone, tier } = req.body;
    try {
        await pool.query('CALL sp_insert_company(?,?,?,?,?,?)',
            [name, industry, location, email, phone, tier]);
        res.json({ success: true, message: `Company ${name} added.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
```

### 8.3 Update Student from Admin Dashboard

```js
// PUT /api/admin/students/:id
router.put('/students/:id', async (req, res) => {
    const { name, phone, cgpa, status } = req.body;
    try {
        await pool.query('CALL sp_update_student(?,?,?,?,?)',
            [req.params.id, name, phone, cgpa, status]);
        res.json({ success: true, message: 'Student record updated.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
```

### 8.4 Schedule Interview from Coordinator Dashboard

```js
// POST /api/coordinator/interviews/schedule
router.post('/interviews/schedule', async (req, res) => {
    const { student_id, job_id, panel, date, mode } = req.body;
    try {
        await pool.query('CALL sp_schedule_interview(?,?,?,?,?)',
            [student_id, job_id, panel, date, mode]);
        res.json({ success: true, message: 'Interview scheduled.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
```

### 8.5 Create Offer Letter from Coordinator Dashboard

```js
// POST /api/coordinator/offers/create
router.post('/offers/create', async (req, res) => {
    const { student_id, job_id, ctc, joining_date } = req.body;
    try {
        await pool.query('CALL sp_create_offer(?,?,?,?)',
            [student_id, job_id, ctc, joining_date]);
        res.json({ success: true, message: 'Offer created and saved to DB.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
```

### 8.6 Add Job Profile from Admin / Coordinator Dashboard

```js
// POST /api/admin/jobs/add
router.post('/jobs/add', async (req, res) => {
    const { comp_id, role, type, package: pkg, min_cgpa, branches, deadline } = req.body;
    try {
        await pool.query('CALL sp_insert_job(?,?,?,?,?,?,?)',
            [comp_id, role, type, pkg, min_cgpa, branches, deadline]);
        res.json({ success: true, message: `Job role "${role}" added.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
```

**Viva explanation for all of 8:**
> *"Every write operation on our dashboard — adding students, scheduling interviews,
> creating offers — calls a dedicated stored procedure. This keeps business logic
> in the DB layer, not scattered across JS code. If the procedure fails
> (e.g., duplicate email, invalid FK), the error propagates up and the UI shows
> a meaningful message. The data is immediately persisted to Aiven MySQL."*

---

## Feature 9 — Website USP Enhancements (Beyond CRUD)

### 9.1 Smart Eligibility Checker (SP already exists!)

When a student views a job listing, auto-call `sp_CheckEligibility` and show a badge:

```js
// GET /api/jobs/:jobId/eligibility  (student role only)
router.get('/:jobId/eligibility', requireAuth, async (req, res) => {
    const studentId = req.user.entityId;
    const [result] = await pool.query('CALL sp_CheckEligibility(?, ?)',
        [studentId, req.params.jobId]);
    res.json(result[0][0]); 
    // Returns: { result: "ELIGIBLE" | "NOT ELIGIBLE", student_cgpa, required_cgpa }
});
```

**UI shows:** 🟢 You are eligible / 🔴 CGPA requirement not met

### 9.2 Placement Leaderboard by Department

```js
// GET /api/analytics/leaderboard
router.get('/leaderboard', requireAuth, async (req, res) => {
    const [rows] = await pool.query(`
        SELECT * FROM vw_placement_rate_per_dept
        ORDER BY placement_rate DESC
    `);
    res.json(rows);
});
```

### 9.3 Top ATS Resumes (for coordinators to shortlist)

```js
// GET /api/coordinator/top-ats?job_id=5
router.get('/top-ats', requireAuth, async (req, res) => {
    const { job_id } = req.query;
    const [rows] = await pool.query(`
        SELECT s.s_name, s.dept, a.ats_score, a.status
        FROM APPLICATION a
        JOIN STUDENT s ON a.s_id = s.s_id
        WHERE a.job_id = ?
        ORDER BY a.ats_score DESC
        LIMIT 10
    `, [job_id]);
    res.json(rows);
});
```

### 9.4 Student Job-Match Feed (based on dept + CGPA)

```js
// GET /api/student/matched-jobs
// Returns only jobs the logged-in student is eligible for
router.get('/matched-jobs', requireAuth, async (req, res) => {
    const studentId = req.user.entityId;
    const [rows] = await pool.query(`
        SELECT j.job_id, c.comp_name, j.role, j.package, j.app_deadline,
               j.eligibility_cgpa, j.job_type
        FROM JOB_PROFILE j
        JOIN COMPANY c ON j.comp_id = c.comp_id
        WHERE j.status = 'open'
          AND j.eligibility_cgpa <= (SELECT cgpa FROM STUDENT WHERE s_id = ?)
          AND (j.eligible_branch IS NULL OR j.eligible_branch LIKE
               CONCAT('%', (SELECT dept FROM STUDENT WHERE s_id = ?), '%'))
        ORDER BY j.package DESC
    `, [studentId, studentId]);
    res.json(rows);
});
```

### 9.5 Delete Operations (Complete CRUD)

```js
// DELETE /api/admin/students/:id — uses existing sp_delete_student
router.delete('/students/:id', async (req, res) => {
    await pool.query('CALL sp_delete_student(?)', [req.params.id]);
    res.json({ success: true });
});

// DELETE /api/admin/companies/:id — uses existing sp_delete_company
router.delete('/companies/:id', async (req, res) => {
    await pool.query('CALL sp_delete_company(?)', [req.params.id]);
    res.json({ success: true });
});
```

---

## Revised Full Priority Table

| # | Feature | Time | Rubric | Status |
|:---:|:---|:---:|:---|:---:|
| 1 | HAVING clause route | 10 min | Criterion 8 | ❌ Todo |
| 2 | Transaction + ROLLBACK (accept offer) | 20 min | Criterion 13 | ❌ Todo |
| 3 | Locking protocols demo | 15 min | Criterion 13 bonus | ❌ Todo |
| 4 | Triggers in Aiven DB | 20 min | Criterion 3 bonus | ❌ Todo |
| 5 | Use 4+ more views in routes | 20 min | Criterion 11 | ❌ Todo |
| 6 | Wire 5+ more stored proc routes | 20 min | Criterion 12 | ❌ Todo |
| **7** | **ATS Score Calculator** | **30 min** | **USP + Criterion 10** | **❌ Todo** |
| **8** | **Dashboard Write Ops (Add/Update/Delete)** | **40 min** | **USP + Criterion 4** | **❌ Todo** |
| **9** | **Smart job matching + eligibility checker** | **20 min** | **USP + Criterion 9** | **❌ Todo** |

---

*Last updated: May 2026 | placement_cell_db on Aiven MySQL*
