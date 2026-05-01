# 📊 Database Implementation Changes Required

> **Scope:** Complete database modifications needed to achieve rubric criteria and implement missing features
> 
> **Database:** MySQL (Aiven)  
> **Backend:** Node.js + Express  
> **Evaluation Date:** May 2026

---

## 🎯 Quick Summary Table

| Priority | Feature | Rubric Criterion | Database Objects | Backend Routes | Time |
|----------|---------|------------------|------------------|-----------------|------|
| 🔴 HIGH | HAVING Clause | 8 | VIEW + Query | 1 new endpoint | 10 min |
| 🔴 HIGH | Transactions + ROLLBACK | 13 | Existing SPs | 2-3 new routes | 20 min |
| 🔴 HIGH | Locking Protocols | Concurrency | Query syntax | 2 new routes | 15 min |
| 🔴 HIGH | Triggers | 3 (Bonus) | 2 new triggers | - | 20 min |
| 🟡 MEDIUM | Use More Views | 11 | 7+ existing views | Modify 5-6 routes | 20 min |
| 🟡 MEDIUM | Call More SPs | 12 | 41 existing SPs | Add 5-10 routes | 20 min |
| 🟢 LOW | ATS Scoring | USP | 1 new table | 3 new endpoints | 2-3 days |

---

## 🔴 FEATURE 1: HAVING Clause (Rubric Criterion 8)

### What is HAVING?
- **WHERE** filters individual rows BEFORE grouping
- **HAVING** filters groups AFTER aggregation
- Example: Show departments with ≥ 2 placed students

### SQL Query

```sql
SELECT
    s.dept AS department,
    COUNT(DISTINCT a.s_id) AS placed_students,
    ROUND(AVG(j.package), 2) AS avg_package_lpa,
    MAX(j.package) AS highest_package_lpa,
    MIN(j.package) AS lowest_package_lpa
FROM APPLICATION a
JOIN STUDENT s ON a.s_id = s.s_id
JOIN JOB_PROFILE j ON a.job_id = j.job_id
WHERE a.status = 'selected'
GROUP BY s.dept
HAVING COUNT(DISTINCT a.s_id) >= 2
ORDER BY placed_students DESC;
```

### Backend Implementation

**File:** `server/routes/analytics.js`

```javascript
// GET /api/analytics/dept-filter?min_placed=2
router.get('/dept-filter', requireAuth, async (req, res) => {
    const minPlaced = parseInt(req.query.min_placed) || 1;
    try {
        const [rows] = await pool.query(`
            SELECT
                s.dept AS department,
                COUNT(DISTINCT a.s_id) AS placed_students,
                ROUND(AVG(j.package), 2) AS avg_package_lpa,
                MAX(j.package) AS highest_package_lpa,
                MIN(j.package) AS lowest_package_lpa
            FROM APPLICATION a
            JOIN STUDENT s ON a.s_id = s.s_id
            JOIN JOB_PROFILE j ON a.job_id = j.job_id
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

### Viva Explanation
> *"WHERE filters individual rows before grouping. HAVING filters the groups after aggregation. Here, we only show departments that have placed at least N students — impossible with WHERE alone."*

---

## 🔴 FEATURE 2: Transactions with COMMIT / ROLLBACK (Rubric Criterion 13)

### Database Objects (Already Exist)

| Stored Procedure | Purpose |
|---|---|
| `sp_accept_offer` | Atomically: accept offer → update student status → create placement record |
| `sp_reject_offer` | Atomically: reject offer → send notification |

### Backend Implementation — Option A: Call Existing SPs (Quick Win)

**File:** `server/routes/coordinator.js`

```javascript
// POST /api/coordinator/offers/:id/accept
// Calls existing sp_accept_offer (already has START TRANSACTION inside)
router.post('/offers/:id/accept', requireAuth, async (req, res) => {
    try {
        // sp_accept_offer internally runs:
        //   START TRANSACTION
        //   UPDATE OFFER SET offer_status = 'accepted'
        //   UPDATE STUDENT SET profile_status = 'placed'
        //   INSERT INTO PLACEMENT_RECORD (...)
        //   COMMIT (or ROLLBACK on error)
        const [result] = await pool.query('CALL sp_accept_offer(?)', [req.params.id]);
        res.json({ 
            success: true, 
            message: 'Offer accepted. Placement record created.', 
            data: result[0] 
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: `Transaction failed: ${err.message}` 
        });
    }
});

// POST /api/coordinator/offers/:id/reject
router.post('/offers/:id/reject', requireAuth, async (req, res) => {
    try {
        const [result] = await pool.query('CALL sp_reject_offer(?)', [req.params.id]);
        res.json({ 
            success: true, 
            message: 'Offer rejected.', 
            data: result[0] 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
```

### Backend Implementation — Option B: Explicit Raw Transaction (For Viva Clarity)

```javascript
// POST /api/coordinator/offers/:id/accept-raw
// Demonstrates explicit COMMIT/ROLLBACK for viva explanation
router.post('/offers/:id/accept-raw', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction(); // START TRANSACTION

        // Step 1: Lock offer row (exclusive lock)
        const [offer] = await conn.query(
            'SELECT * FROM OFFER WHERE offer_id = ? FOR UPDATE',
            [req.params.id]
        );
        if (!offer.length) throw new Error('Offer not found');
        if (offer[0].offer_status !== 'pending') 
            throw new Error('Offer already processed');

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
            INSERT INTO PLACEMENT_RECORD 
            (s_id, comp_id, job_id, academic_year, salary_offered, stream, status)
            SELECT o.s_id, j.comp_id, o.job_id, YEAR(CURDATE()), o.ctc, s.dept, 'confirmed'
            FROM OFFER o
            JOIN JOB_PROFILE j ON o.job_id = j.job_id
            JOIN STUDENT s ON o.s_id = s.s_id
            WHERE o.offer_id = ?
        `, [req.params.id]);

        await conn.commit(); // ✅ ALL STEPS SUCCEEDED → COMMIT
        res.json({ 
            success: true, 
            message: 'Transaction committed. Offer accepted & placement recorded.' 
        });

    } catch (err) {
        await conn.rollback(); // ❌ ANY STEP FAILED → ROLLBACK all
        res.status(500).json({ 
            success: false, 
            message: `Transaction rolled back: ${err.message}` 
        });
    } finally {
        conn.release();
    }
});
```

### Viva Explanation
> *"This is ACID in action. All 4 SQL statements (UPDATE offer → UPDATE student → INSERT placement → LOG) are wrapped in a single transaction. If step 3 fails (student not found), the ROLLBACK undoes steps 1 and 2 as well — the offer is NOT marked accepted. This ensures data consistency."*

---

## 🔴 FEATURE 3: Locking Protocols (Concurrency Control)

### What are Locking Protocols?
MySQL supports two types of row-level locks within transactions:

| Lock Type | Syntax | Use Case | Effect |
|-----------|--------|----------|--------|
| **Exclusive Lock** | `SELECT ... FOR UPDATE` | Before WRITE operations | Prevents others from reading OR writing |
| **Shared Lock** | `SELECT ... LOCK IN SHARE MODE` | Safe concurrent READS | Allows others to read, nobody can write |

### Use Cases in Your System

**Exclusive Lock — Prevent Double-Accept Race Condition**
```sql
-- When two coordinators try to accept the same offer simultaneously
SELECT * FROM OFFER WHERE offer_id = 5 FOR UPDATE;
-- Only one transaction gets the lock; the other waits or fails
```

**Shared Lock — Safe Concurrent Reports**
```sql
-- When generating a report, prevent data changes mid-read
SELECT s_id, s_name, cgpa FROM STUDENT 
WHERE coord_id = 1 LOCK IN SHARE MODE;
```

### Backend Implementation

**File:** `server/routes/analytics.js`

```javascript
// GET /api/analytics/offer-safe-read/:offerId
// Demonstrates shared lock for safe concurrent reads
router.get('/offer-safe-read/:offerId', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Shared lock: others can read, nobody can modify during our read
        const [rows] = await conn.query(
            `SELECT * FROM OFFER 
             WHERE offer_id = ? LOCK IN SHARE MODE`,
            [req.params.offerId]
        );

        // Do other reads here safely
        if (rows.length) {
            const [student] = await conn.query(
                'SELECT s_id, s_name FROM STUDENT WHERE s_id = ?',
                [rows[0].s_id]
            );
            rows[0].student = student[0];
        }

        await conn.commit();
        res.json({ 
            lock_type: 'SHARED', 
            data: rows[0] || null,
            message: 'Safe read completed - others cannot modify this data until transaction ends'
        });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
});

// GET /api/analytics/check-concurrent/:offerId
// Shows what happens with exclusive lock (simulates race condition)
router.get('/check-concurrent/:offerId', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Exclusive lock: others cannot even read until we're done
        const [rows] = await conn.query(
            `SELECT * FROM OFFER 
             WHERE offer_id = ? FOR UPDATE`,
            [req.params.offerId]
        );

        // Simulate some processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        await conn.commit();
        res.json({ 
            lock_type: 'EXCLUSIVE', 
            data: rows[0],
            message: 'Data locked exclusively - other transactions would have waited'
        });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
});
```

### Viva Explanation
> *"Locking protocols handle concurrency — what happens when two users act on the same data simultaneously. FOR UPDATE is an exclusive lock used before write operations to prevent double-accept. LOCK IN SHARE MODE is a shared lock used for safe reads when we don't want the data to change mid-read."*

---

## 🔴 FEATURE 4: Triggers (Database-Level Automation)

### What are Triggers?
Stored programs that fire automatically when a DB event occurs (INSERT, UPDATE, DELETE).

### Triggers to Create (In MySQL directly via Aiven)

#### Trigger 1: Auto-update student status after offer accepted

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

#### Trigger 2: Set ATS score default on application insert

```sql
DELIMITER $$
CREATE TRIGGER trg_after_application_insert
AFTER INSERT ON APPLICATION
FOR EACH ROW
BEGIN
    -- Automatically set ATS score to 0 if NULL on insert
    IF NEW.ats_score IS NULL THEN
        UPDATE APPLICATION
        SET ats_score = 0.00
        WHERE app_id = NEW.app_id;
    END IF;
END$$
DELIMITER ;
```

#### Trigger 3: Log offer state changes (Optional — for audit trail)

```sql
DELIMITER $$
CREATE TRIGGER trg_log_offer_change
AFTER UPDATE ON OFFER
FOR EACH ROW
BEGIN
    INSERT INTO OFFER_HISTORY (offer_id, old_status, new_status, changed_at)
    VALUES (NEW.offer_id, OLD.offer_status, NEW.offer_status, NOW());
END$$
DELIMITER ;
```

### How to Add Triggers to MySQL

**Option A: Via MySQL Workbench (Interactive)**
1. Open MySQL Workbench → Connect to Aiven
2. Right-click on `OFFER` table → Triggers
3. Paste trigger SQL above
4. Click Execute

**Option B: Via Node.js Migration Script**

**File:** `server/add_triggers.js` (Create this new file)

```javascript
import pool from './db.js';

const triggers = [
    {
        name: 'trg_after_offer_accepted',
        sql: `CREATE TRIGGER trg_after_offer_accepted
              AFTER UPDATE ON OFFER FOR EACH ROW
              BEGIN
                  IF NEW.offer_status = 'accepted' AND OLD.offer_status != 'accepted' THEN
                      UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = NEW.s_id;
                  END IF;
              END`
    },
    {
        name: 'trg_after_application_insert',
        sql: `CREATE TRIGGER trg_after_application_insert
              AFTER INSERT ON APPLICATION FOR EACH ROW
              BEGIN
                  IF NEW.ats_score IS NULL THEN
                      UPDATE APPLICATION SET ats_score = 0.00 WHERE app_id = NEW.app_id;
                  END IF;
              END`
    },
    {
        name: 'trg_log_offer_change',
        sql: `CREATE TRIGGER trg_log_offer_change
              AFTER UPDATE ON OFFER FOR EACH ROW
              BEGIN
                  INSERT INTO OFFER_HISTORY (offer_id, old_status, new_status, changed_at)
                  VALUES (NEW.offer_id, OLD.offer_status, NEW.offer_status, NOW());
              END`
    }
];

async function addTriggers() {
    const conn = await pool.getConnection();
    try {
        for (const trigger of triggers) {
            try {
                // Drop if exists
                await conn.query(`DROP TRIGGER IF EXISTS ${trigger.name}`);
                console.log(`✅ Dropped old trigger: ${trigger.name}`);

                // Create new
                await conn.query(trigger.sql);
                console.log(`✅ Created trigger: ${trigger.name}`);
            } catch (e) {
                console.error(`❌ Error with ${trigger.name}:`, e.message);
            }
        }
    } finally {
        conn.release();
        await pool.end();
        process.exit(0);
    }
}

addTriggers();
```

**Run it:**
```bash
cd server
node add_triggers.js
```

### Additional Table for Trigger Logging (Optional)

```sql
CREATE TABLE IF NOT EXISTS OFFER_HISTORY (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    offer_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (offer_id) REFERENCES OFFER(offer_id)
);
```

### Viva Explanation
> *"A trigger is a stored program that fires automatically when a specific DB event occurs — here an AFTER UPDATE on OFFER. When any transaction marks an offer as accepted, the trigger automatically keeps STUDENT.profile_status in sync without the application layer needing to know about it. This enforces business rules at the database level."*

---

## 🟡 FEATURE 5: Use More Views (44 exist, only 3 used) — Rubric Criterion 11

### Existing Views in Database

| View Name | Purpose | Returns |
|-----------|---------|---------|
| `vw_top_hiring_companies` | Top 5 companies by placement count | company_id, company_name, placement_count |
| `vw_shortlisted_candidates` | All shortlisted students with their applications | s_id, s_name, email, applications_count |
| `vw_placement_rate_per_dept` | Placement % by department | dept, total_students, placed_students, placement_rate |
| `vw_avg_salary_per_dept` | Average package by department | dept, avg_package, max_package, min_package |
| `vw_open_jobs` | Currently open job listings | job_id, job_title, company_name, applications_received |
| `vw_offers_accepted` | Accepted offers with student/company details | offer_id, s_name, company_name, ctc, offer_date |
| `vw_resume_ats_details` | Resume parsed keywords + ATS scores | resume_id, s_name, keywords_found, ats_score |

### Implementation Strategy

**Instead of raw SQL:**
```javascript
// ❌ OLD WAY
const [companies] = await pool.query(`
    SELECT c.comp_id, c.company_name, COUNT(*) as placements
    FROM PLACEMENT_RECORD p
    JOIN COMPANY c ON p.comp_id = c.comp_id
    GROUP BY c.comp_id
    ORDER BY placements DESC
    LIMIT 5
`);
```

**Use views:**
```javascript
// ✅ NEW WAY
const [companies] = await pool.query(`SELECT * FROM vw_top_hiring_companies`);
```

### Where to Replace (Backend Routes)

#### **File: `server/routes/admin.js`**

```javascript
// 1. Top Companies Card (Dashboard)
router.get('/dashboard', requireAuth, async (req, res) => {
    // OLD: Raw JOIN query
    // NEW: Use view
    const [topCompanies] = await pool.query(
        'SELECT * FROM vw_top_hiring_companies LIMIT 5'
    );
    // ... rest of dashboard data
});

// 2. Department Stats (Analytics)
router.get('/analytics/dept-stats', requireAuth, async (req, res) => {
    const [deptStats] = await pool.query(
        'SELECT * FROM vw_placement_rate_per_dept'
    );
    res.json(deptStats);
});

// 3. Salary Analytics
router.get('/analytics/salary', requireAuth, async (req, res) => {
    const [salaryStat] = await pool.query(
        'SELECT * FROM vw_avg_salary_per_dept'
    );
    res.json(salaryStat);
});
```

#### **File: `server/routes/coordinator.js`**

```javascript
// Shortlisted candidates list
router.get('/shortlisted', requireAuth, async (req, res) => {
    const coordId = req.user.entityId;
    const [shortlisted] = await pool.query(`
        SELECT v.* FROM vw_shortlisted_candidates v
        JOIN STUDENT s ON v.s_id = s.s_id
        WHERE s.coord_id = ?
    `, [coordId]);
    res.json(shortlisted);
});
```

#### **File: `server/routes/students.js`**

```javascript
// Open jobs for students
router.get('/opportunities', requireAuth, async (req, res) => {
    const [openJobs] = await pool.query(
        'SELECT * FROM vw_open_jobs ORDER BY job_id DESC'
    );
    res.json(openJobs);
});
```

---

## 🟡 FEATURE 6: Call More Stored Procedures (44 exist, only 3 used) — Rubric Criterion 12

### Existing Stored Procedures Reference

| Procedure Name | Parameters | Returns | Purpose |
|---|---|---|---|
| `sp_get_top_hiring_companies` | limit | company_name, placement_count | Top hiring companies |
| `sp_get_dept_placement_stats` | none | dept, placed, rate | Department statistics |
| `sp_get_avg_salary_per_dept` | none | dept, avg_salary | Salary by department |
| `sp_get_app_status_distribution` | none | status, count | Application status counts |
| `sp_get_upcoming_interviews` | coordinator_id | date, student_name, company | Upcoming interviews |
| `sp_schedule_interview` | student_id, job_id, panel, date, mode | success | Schedule new interview |
| `sp_update_app_status` | app_id, status | success | Update application status |
| `sp_get_company_hiring_stats` | company_id | hired, pending, rejected | Company statistics |

### New Routes to Add

#### **File: `server/routes/admin.js` — Add SP calls**

```javascript
// GET /api/admin/sp-top-companies?limit=5
router.get('/sp-top-companies', requireAuth, async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    try {
        const [result] = await pool.query(
            'CALL sp_get_top_hiring_companies(?)',
            [limit]
        );
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/sp-dept-stats
router.get('/sp-dept-stats', requireAuth, async (req, res) => {
    try {
        const [result] = await pool.query('CALL sp_get_dept_placement_stats()');
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/sp-salary-stats
router.get('/sp-salary-stats', requireAuth, async (req, res) => {
    try {
        const [result] = await pool.query('CALL sp_get_avg_salary_per_dept()');
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/sp-app-distribution
router.get('/sp-app-distribution', requireAuth, async (req, res) => {
    try {
        const [result] = await pool.query('CALL sp_get_app_status_distribution()');
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
```

#### **File: `server/routes/coordinator.js` — Add SP calls**

```javascript
// GET /api/coordinator/sp-upcoming-interviews
router.get('/sp-upcoming-interviews', requireAuth, async (req, res) => {
    const coordId = req.user.entityId;
    try {
        const [result] = await pool.query(
            'CALL sp_get_upcoming_interviews(?)',
            [coordId]
        );
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/coordinator/sp-schedule-interview
router.post('/sp-schedule-interview', requireAuth, async (req, res) => {
    const { student_id, job_id, panel, interview_date, mode } = req.body;
    try {
        const [result] = await pool.query(
            'CALL sp_schedule_interview(?, ?, ?, ?, ?)',
            [student_id, job_id, panel, interview_date, mode]
        );
        res.json({ success: true, data: result[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/coordinator/sp-update-app-status/:appId
router.put('/sp-update-app-status/:appId', requireAuth, async (req, res) => {
    const { status } = req.body;
    try {
        const [result] = await pool.query(
            'CALL sp_update_app_status(?, ?)',
            [req.params.appId, status]
        );
        res.json({ success: true, data: result[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
```

#### **File: `server/routes/companies.js` — Add SP calls**

```javascript
// GET /api/companies/:compId/sp-hiring-stats
router.get('/:compId/sp-hiring-stats', requireAuth, async (req, res) => {
    try {
        const [result] = await pool.query(
            'CALL sp_get_company_hiring_stats(?)',
            [req.params.compId]
        );
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
```

---

## 🟢 FEATURE 7: ATS Score Calculator (Major USP)

### Database Table to Create

```sql
CREATE TABLE IF NOT EXISTS RESUME_ANALYSIS (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    job_id INT,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    ats_score INT,
    keywords_found JSON,
    keywords_missing JSON,
    role_targeted VARCHAR(255),
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version_label VARCHAR(255),
    FOREIGN KEY (student_id) REFERENCES STUDENT(s_id),
    FOREIGN KEY (job_id) REFERENCES JOB_PROFILE(job_id)
);
```

### Backend Implementation (Comprehensive)

See **ATS_IMPLEMENTATION_PLAN.md** for full details. Key files to create:

- `server/utils/atsScoring.js` — Algorithm
- `server/routes/ats.js` — API endpoints  
- Update `server/index.js` to register ATS router
- Update `js/api.js` with ATS endpoint wrappers
- Update `js/student/ats.js` frontend to use real API

### Key API Endpoints

```javascript
POST /api/ats/analyze           // Upload PDF and get score
GET  /api/ats/history           // Get student's analysis history
GET  /api/ats/:analysisId       // Get detailed analysis
```

---

## 📋 Implementation Checklist

### Phase 1: HIGH Priority (1.5 hours total)

- [ ] **HAVING Clause**
  - [ ] Add endpoint to `server/routes/analytics.js`
  - [ ] Test with `GET /api/analytics/dept-filter?min_placed=2`

- [ ] **Transactions**
  - [ ] Add offer accept/reject routes to `server/routes/coordinator.js`
  - [ ] Test both Option A (SP call) and Option B (raw transaction)

- [ ] **Locking**
  - [ ] Add safe-read route to `server/routes/analytics.js`
  - [ ] Test concurrent access simulation

- [ ] **Triggers**
  - [ ] Create `server/add_triggers.js` migration script
  - [ ] Run: `node add_triggers.js`
  - [ ] Verify in MySQL: `SHOW TRIGGERS;`

### Phase 2: MEDIUM Priority (1 hour total)

- [ ] **Views**
  - [ ] Replace 5 raw SQL queries with view calls in:
    - [ ] `server/routes/admin.js` (2-3 views)
    - [ ] `server/routes/coordinator.js` (1-2 views)
    - [ ] `server/routes/students.js` (1 view)

- [ ] **Stored Procedures**
  - [ ] Add 5-8 new SP call routes to:
    - [ ] `server/routes/admin.js` (4 routes)
    - [ ] `server/routes/coordinator.js` (3 routes)
    - [ ] `server/routes/companies.js` (1 route)

### Phase 3: LOW Priority (2-3 days)

- [ ] **ATS Implementation** (See ATS_IMPLEMENTATION_PLAN.md)
  - [ ] Create `RESUME_ANALYSIS` table in MySQL
  - [ ] Build `server/utils/atsScoring.js` algorithm
  - [ ] Create `server/routes/ats.js` with 3 endpoints
  - [ ] Wire frontend to backend
  - [ ] Test PDF upload and scoring

---

## 🧪 Testing Procedures

### Test HAVING Clause
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/analytics/dept-filter?min_placed=2"
# Should return departments with ≥2 placed students
```

### Test Transactions
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/coordinator/offers/1/accept"
# Should atomically: update offer → student → create placement
```

### Test Locking
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/analytics/offer-safe-read/1"
# Should return locked data without interference
```

### Test Triggers
```sql
-- In MySQL after running add_triggers.js
SHOW TRIGGERS;
-- Should show trg_after_offer_accepted, trg_after_application_insert, etc.

-- Verify trigger works:
UPDATE OFFER SET offer_status = 'accepted' WHERE offer_id = 1;
SELECT profile_status FROM STUDENT WHERE s_id = (
    SELECT s_id FROM OFFER WHERE offer_id = 1
);
-- Should show 'placed' due to trigger
```

### Test Views
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/admin/dashboard"
# Now uses vw_top_hiring_companies view
```

### Test Stored Procedures
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/admin/sp-dept-stats"
# Should call sp_get_dept_placement_stats()
```

---

## 📊 Rubric Mapping

| Database Feature | Rubric Criterion | Implementation File | Status |
|---|---|---|---|
| HAVING | 8 | `server/routes/analytics.js` | ⬜ TODO |
| Transactions | 13 | `server/routes/coordinator.js` | ⬜ TODO |
| Locking | Concurrency | `server/routes/analytics.js` | ⬜ TODO |
| Triggers | 3 (Bonus) | MySQL (via `add_triggers.js`) | ⬜ TODO |
| Views | 11 | Multiple routes | ⬜ TODO |
| Stored Procedures | 12 | Multiple routes | ⬜ TODO |

---

## 📝 Quick Reference SQL

### HAVING Syntax
```sql
SELECT column, aggregate_function(column)
FROM table
WHERE condition
GROUP BY column
HAVING aggregate_function(column) operator value
ORDER BY column;
```

### Transaction Syntax
```sql
START TRANSACTION;
    UPDATE table1 SET col = val;
    INSERT INTO table2 VALUES (...);
    DELETE FROM table3 WHERE ...;
COMMIT;  -- or ROLLBACK if any error
```

### Locking Syntax
```sql
-- Exclusive (for updates)
SELECT * FROM table WHERE id = 1 FOR UPDATE;

-- Shared (for safe reads)
SELECT * FROM table WHERE id = 1 LOCK IN SHARE MODE;
```

### Trigger Syntax
```sql
DELIMITER $$
CREATE TRIGGER trigger_name
AFTER UPDATE ON table_name
FOR EACH ROW
BEGIN
    IF NEW.column = 'value' THEN
        UPDATE other_table SET col = val;
    END IF;
END$$
DELIMITER ;
```

---

## 🔗 Related Documents

- **ATS_IMPLEMENTATION_PLAN.md** — Detailed ATS feature guide
- **DBMS_MISSING_FEATURES.md** — Original requirement tracking
- **DATABASE_DOCUMENTATION.md** — Schema reference

---

## 📞 Support Notes

### Common Errors & Solutions

| Error | Cause | Solution |
|---|---|---|
| `1064 Syntax error` | Missing DELIMITER | Add `DELIMITER $$` before trigger |
| `Subquery returns >1 row` | HAVING aggregation issue | Check GROUP BY clause |
| `Lock wait timeout` | Deadlock situation | Increase `innodb_lock_wait_timeout` |
| `View not found` | Wrong view name | Check `SHOW VIEWS;` in MySQL |
| `Procedure not found` | SP not created | Verify SP exists in database |

---

**Last Updated:** May 2, 2026  
**Status:** Ready for Implementation  
**Estimated Completion:** 3-4 days (all phases)
