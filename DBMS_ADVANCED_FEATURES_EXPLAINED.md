git # DBMS Advanced Features - Complete Implementation Guide

## Database Triggers, Locks, Transactions, Indexing, Views, Stored Procedures & Real-Time Features

---

## TABLE OF CONTENTS

1. Database Triggers
2. Locking Mechanisms (SELECT...FOR UPDATE)
3. Transactions (ACID Compliance)
4. Indexing Strategy
5. Database Views
6. Stored Procedures
7. Functions
8. ATS Package Details
9. Redis Usage
10. Dynamic Table Storage for Chats
11. Why Page Doesn't Refresh (Real-Time Technology)

---

## 1. DATABASE TRIGGERS - How They Work in Our Project

### What is a Trigger?

A **trigger** is an automatic program that runs when a specific event happens in the database (INSERT, UPDATE, DELETE).

**Think of it like:** An alarm that rings automatically when a rule is violated.

### Our Project's 7 Triggers

#### **Trigger 1: Auto-Update Eligibility (BEFORE UPDATE on STUDENT)**

**Location:** `server/setup_triggers.js` (lines 52-62)

**When it fires:** Before a student's CGPA is updated
**What it does:** If CGPA drops below 6.0, automatically marks student as "not_eligible"

```sql
CREATE TRIGGER trg_update_eligibility
BEFORE UPDATE ON STUDENT
FOR EACH ROW
BEGIN
    IF NEW.cgpa < 6.0 AND OLD.cgpa >= 6.0 THEN
        SET NEW.profile_status = 'not_eligible';
    END IF;
END
```

**Example:**

```
Coordinator updates: UPDATE STUDENT SET cgpa = 5.5 WHERE s_id = 10
    ↓
Trigger fires BEFORE update
    ↓
Trigger checks: 5.5 < 6.0? YES
    ↓
Trigger sets: profile_status = 'not_eligible'
    ↓
Row updated with new status included
```

**Why we need it:** Ensures ineligible students are automatically blocked from placement process

---

#### **Trigger 2: Application Status Audit Log (AFTER UPDATE on APPLICATION)**

**Location:** `server/setup_triggers.js` (lines 64-72)

**When it fires:** After application status changes
**What it does:** Creates an audit log entry showing old status → new status

```sql
CREATE TRIGGER trg_application_audit
AFTER UPDATE ON APPLICATION
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO STATUS_AUDIT_LOG (app_id, old_status, new_status)
        VALUES (OLD.app_id, OLD.status, NEW.status);
    END IF;
END
```

**Database Table for Audit:**

```sql
CREATE TABLE STATUS_AUDIT_LOG (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    app_id INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Example Audit Trail:**

```
app_id=100:
  Row 1: 'applied' → 'under_review' (timestamp: 2026-05-01 10:00)
  Row 2: 'under_review' → 'shortlisted' (timestamp: 2026-05-02 14:30)
  Row 3: 'shortlisted' → 'selected' (timestamp: 2026-05-03 09:15)
```

**Why we need it:** Complete audit trail for compliance and troubleshooting

---

#### **Trigger 3: Prevent Duplicate Placement (BEFORE INSERT on PLACEMENT_RECORD)**

**Location:** `server/setup_triggers.js` (lines 74-89)

**When it fires:** Before inserting a new placement record
**What it does:** Checks if student already has a placement, prevents duplicate

```sql
CREATE TRIGGER trg_prevent_duplicate_placement
BEFORE INSERT ON PLACEMENT_RECORD
FOR EACH ROW
BEGIN
    DECLARE placed_count INT;
    SELECT COUNT(*) INTO placed_count FROM PLACEMENT_RECORD
    WHERE s_id = NEW.s_id AND (status = 'confirmed' OR status = 'placed');
    IF placed_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Student is already placed in another company.';
    END IF;
END
```

**Why we need it:** Enforces "One Student One Job" policy - prevents data corruption

---

#### **Trigger 4: Vacancy Auto-Sync (AFTER UPDATE on OFFER)**

**Location:** `server/setup_triggers.js` (lines 91-100)

**When it fires:** After offer status changes to 'accepted'
**What it does:** Automatically decrements vacancy count in JOB_PROFILE

```sql
CREATE TRIGGER trg_vacancy_sync
AFTER UPDATE ON OFFER
FOR EACH ROW
BEGIN
    IF NEW.offer_status = 'accepted' AND OLD.offer_status <> 'accepted' THEN
        UPDATE JOB_PROFILE SET vacancies = vacancies - 1
        WHERE job_id = NEW.job_id;
    END IF;
END
```

**Example:**

```
Job has 5 vacancies
Student accepts offer
    ↓
Trigger fires
    ↓
Vacancies updated: 5 → 4 (automatic)
```

**Why we need it:** Keeps vacancy count accurate without relying on application code

---

#### **Trigger 5: Auto-Assign Coordinator (BEFORE INSERT on STUDENT)**

**Location:** `server/setup_triggers.js` (lines 102-125)

**When it fires:** When a new student is created
**What it does:** Automatically assigns coordinator based on student's department

```sql
CREATE TRIGGER trg_auto_assign_coordinator
BEFORE INSERT ON STUDENT
FOR EACH ROW
BEGIN
    IF NEW.coord_id IS NULL THEN
        SET NEW.coord_id = (
            SELECT coord_id FROM PLACEMENT_COORDINATOR
            WHERE dept = CASE
                WHEN NEW.dept IN ('IT', 'Information Technology')
                    THEN 'Information Technology'
                WHEN NEW.dept IN ('Mechanical', 'Mechanical Engineering')
                    THEN 'Mechanical Engineering'
                -- ... more departments
                ELSE 'Computer Science'
            END
            LIMIT 1
        );
    END IF;
END
```

**Why we need it:** Automatically routes students to their department's coordinator

---

#### **Trigger 6 & 7: Coordinator Sync on Department Change**

**Location:** `server/setup_triggers.js` (lines 127-150)

**When it fires:** When student's department is updated
**What it does:** Re-assigns coordinator to match new department

**Why we need it:** Keeps coordinator assignment current if department changes

---

### How Triggers Are Implemented in Our Project

**Setup File:** `server/setup_triggers.js`

```javascript
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function setupTriggers() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      multipleStatements: true, // Allow multiple SQL statements
    });

    console.log("Setting up Database Triggers...");

    // Drop existing triggers
    const triggers = [
      "trg_update_eligibility",
      "trg_application_audit",
      // ... more triggers
    ];
    for (const t of triggers) {
      await conn.query(`DROP TRIGGER IF EXISTS ${t}`);
    }

    // Create triggers
    await conn.query(`
            CREATE TRIGGER trg_update_eligibility
            BEFORE UPDATE ON STUDENT
            FOR EACH ROW
            BEGIN
                IF NEW.cgpa < 6.0 AND OLD.cgpa >= 6.0 THEN
                    SET NEW.profile_status = 'not_eligible';
                END IF;
            END
        `);

    console.log("All Triggers Created Successfully");
    process.exit(0);
  } catch (err) {
    console.error("Trigger setup failed:", err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

setupTriggers();
```

**How to Run:**

```bash
node server/setup_triggers.js
```

---

## 2. LOCKING MECHANISMS - SELECT...FOR UPDATE

### What is a Lock?

A **lock** prevents multiple people from changing the same data at the same time.

**Think of it like:** Locking a door so only one person can enter at a time.

### The Problem (Race Condition)

**Scenario:** Job has 1 vacancy, two students try to accept offer simultaneously

```
Student A checks vacancies: 1 available ✓
Student B checks vacancies: 1 available ✓
Student A claims vacancy: OK, hired!
Student B claims vacancy: OK, hired! ← WRONG! Both got hired!
```

**Result:** Data corruption - job assigned to 2 students

### The Solution: SELECT...FOR UPDATE

**In our project:** `server/routes/coordinator.js` (lines 250-340)

```javascript
router.put("/application/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const appId = req.params.id;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // LOCK THE ROW - No one else can access until we release
    await conn.query(
      "SELECT app_id FROM APPLICATION WHERE app_id = ? FOR UPDATE",
      [appId],
    );

    // Now we're safe to update
    await conn.query("UPDATE APPLICATION SET status = ? WHERE app_id = ?", [
      status,
      appId,
    ]);

    // Create notification
    await conn.query(
      `INSERT INTO NOTIFICATION (user_id, user_role, title, content, type) 
             VALUES (?, 'student', ?, ?, ?)`,
      [d.stu_email, title, content, "system"],
    );

    await conn.commit();

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release(); // LOCK IS RELEASED HERE
  }
});
```

### How It Works Step-by-Step

```
1. BEGIN TRANSACTION
   └─ Opens a transaction

2. SELECT app_id FROM APPLICATION WHERE app_id = 100 FOR UPDATE
   └─ LOCKS row with app_id=100
   └─ Other transactions must WAIT if they try to access this row

3. UPDATE APPLICATION SET status = 'selected' WHERE app_id = 100
   └─ Safe to update - we have exclusive lock

4. INSERT INTO NOTIFICATION ...
   └─ Related operation

5. COMMIT
   └─ Releases lock
   └─ Other transactions can now access the row
```

### SQL Syntax Examples

**Example 1: Lock single row**

```sql
BEGIN TRANSACTION;
SELECT s_id FROM STUDENT WHERE s_id = 5 FOR UPDATE;
UPDATE STUDENT SET cgpa = 7.5 WHERE s_id = 5;
COMMIT;
```

**Example 2: Lock multiple rows**

```sql
BEGIN TRANSACTION;
SELECT s_id FROM STUDENT WHERE dept = 'IT' FOR UPDATE;
UPDATE STUDENT SET profile_status = 'active' WHERE dept = 'IT';
COMMIT;
```

### Types of Locks in MySQL

| Lock Type      | SQL                         | Effect                       |
| -------------- | --------------------------- | ---------------------------- |
| Shared Lock    | SELECT...LOCK IN SHARE MODE | Multiple readers, no writers |
| Exclusive Lock | SELECT...FOR UPDATE         | Only one writer, no readers  |
| Row Lock       | Applied to single row       | Locks only that row          |
| Table Lock     | LOCK TABLE tablename WRITE  | Locks entire table           |

---

## 3. TRANSACTIONS - ACID Compliance

### What is a Transaction?

A **transaction** is a group of SQL operations that must ALL succeed or ALL fail together.

**Think of it like:** A bank transfer - money must leave one account AND appear in another. Not halfway.

### ACID Properties

#### **A = Atomicity (All or Nothing)**

**Bad scenario without atomicity:**

```
Step 1: Deduct $100 from Account A ✓ (DONE)
Step 2: Server crashes
Step 3: Add $100 to Account B ✗ (NEVER HAPPENS)
Result: $100 disappears! Data corruption!
```

**Good scenario with atomicity:**

```
BEGIN TRANSACTION
  Step 1: Deduct $100 from Account A
  Step 2: Add $100 to Account B
COMMIT (All or nothing decision)

If any step fails → ROLLBACK (undo everything)
Result: Either both succeed, or both don't happen
```

#### **C = Consistency (Valid State)**

All database rules are enforced:

- Foreign keys must reference existing records
- Constraints (NOT NULL, UNIQUE) are checked
- Triggers fire to maintain derived data

#### **I = Isolation (Independence)**

Multiple transactions don't interfere:

```
Transaction A: UPDATE STUDENT SET cgpa = 7.5 WHERE s_id = 1
Transaction B: UPDATE STUDENT SET cgpa = 8.0 WHERE s_id = 1

MySQL ensures: One completes before the other starts
Result: No race condition
```

#### **D = Durability (Permanent)**

Once committed, data survives even if server crashes:

- MySQL writes to disk before confirming commit
- Even power failure won't lose committed data

### Our Project's Transaction Implementation

**File:** `server/routes/coordinator.js`

**Real Example: Update Application Status**

```javascript
async function updateApplicationStatus(req, res) {
  const { appId, status } = req.body;
  const conn = await pool.getConnection();

  try {
    // START TRANSACTION
    await conn.beginTransaction();
    console.log("✓ Transaction started");

    // STEP 1: Lock the application row
    const [appLock] = await conn.query(
      "SELECT app_id FROM APPLICATION WHERE app_id = ? FOR UPDATE",
      [appId],
    );
    console.log("✓ Row locked");

    // STEP 2: Update application status
    await conn.query("UPDATE APPLICATION SET status = ? WHERE app_id = ?", [
      status,
      appId,
    ]);
    console.log("✓ Status updated");

    // STEP 3: Get student details
    const [appDetails] = await conn.query(
      `SELECT s.email, s.s_name, j.role, c.comp_name
             FROM APPLICATION a
             JOIN STUDENT s ON a.s_id = s.s_id
             JOIN JOB_PROFILE j ON a.job_id = j.job_id
             JOIN COMPANY c ON j.comp_id = c.comp_id
             WHERE a.app_id = ?`,
      [appId],
    );

    // STEP 4: Create notification record
    await conn.query(
      `INSERT INTO NOTIFICATION (user_id, user_role, title, content, type) 
             VALUES (?, 'student', ?, ?, ?)`,
      [
        appDetails[0].email,
        `Application ${status}`,
        `Your app for ${appDetails[0].role} is ${status}`,
        "system",
      ],
    );
    console.log("✓ Notification created");

    // COMMIT TRANSACTION - All changes permanent
    await conn.commit();
    console.log("✓ Transaction committed");

    // Send real-time notification to student's browser
    notifyUser(appDetails[0].email, "new_notification", {
      title: `Application ${status}`,
      content: `Your app for ${appDetails[0].role} is ${status}`,
    });

    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    // ANY ERROR → ROLLBACK (undo everything)
    await conn.rollback();
    console.error("✗ Transaction rolled back:", err.message);

    res.status(500).json({ message: "Failed to update status" });
  } finally {
    conn.release();
  }
}
```

### Transaction Flow Diagram

```
┌─ START TRANSACTION
│
├─ STEP 1: Lock row (FOR UPDATE)
│         If lock fails → ROLLBACK
│
├─ STEP 2: Update status
│         If query fails → ROLLBACK
│
├─ STEP 3: Get details
│         If query fails → ROLLBACK
│
├─ STEP 4: Insert notification
│         If insert fails → ROLLBACK
│
├─ All steps successful?
│   YES → COMMIT ✓ (All changes permanent)
│   NO  → ROLLBACK (Undo all changes)
│
└─ RELEASE lock and connection
```

---

## 4. INDEXING STRATEGY

### What is an Index?

An **index** is like a book's table of contents - it helps find data faster without reading every page.

**Think of it like:** Instead of reading all 1000 pages to find chapter 5, just look at contents.

### Types of Indexes in Our Project

#### **1. PRIMARY KEY Index**

```sql
CREATE TABLE STUDENT (
    s_id INT PRIMARY KEY AUTO_INCREMENT,
    s_name VARCHAR(100) NOT NULL,
    cgpa DECIMAL(3,2),
    -- ...
);
```

**What it does:**

- Unique identifier for each student
- Fastest lookup by s_id
- Used in all JOINs and WHERE clauses

**Example queries:**

```sql
SELECT * FROM STUDENT WHERE s_id = 5;  -- INSTANT (uses index)
```

---

#### **2. FOREIGN KEY Index**

```sql
CREATE TABLE APPLICATION (
    app_id INT PRIMARY KEY AUTO_INCREMENT,
    s_id INT,
    job_id INT,
    -- ...
    FOREIGN KEY (s_id) REFERENCES STUDENT(s_id),
    FOREIGN KEY (job_id) REFERENCES JOB_PROFILE(job_id)
);
```

**What it does:**

- Links related tables
- Enforces referential integrity
- Automatically indexed for fast JOINs

**Example queries:**

```sql
SELECT a.app_id, s.s_name, j.role
FROM APPLICATION a
JOIN STUDENT s ON a.s_id = s.s_id     -- Uses FK index
JOIN JOB_PROFILE j ON a.job_id = j.job_id;
```

---

#### **3. SEARCH Indexes (Column-specific)**

```sql
CREATE TABLE STUDENT (
    -- ...
    s_id INT PRIMARY KEY,
    s_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    cgpa DECIMAL(3,2),

    INDEX idx_search_name (s_name),     -- Search by name
    INDEX idx_search_email (email),     -- Search by email
    INDEX idx_search_cgpa (cgpa)        -- Filter by CGPA
);
```

**Used for:**

- Fast LIKE searches: `SELECT * FROM STUDENT WHERE s_name LIKE 'Raj%'`
- Fast filtering: `SELECT * FROM STUDENT WHERE cgpa >= 7.0`
- Coordinator searches

---

#### **4. COMPOSITE Index (Multiple Columns)**

```sql
CREATE TABLE APPLICATION (
    -- ...
    s_id INT,
    job_id INT,
    created_at TIMESTAMP,

    INDEX idx_student_job (s_id, job_id)  -- Combined index
);
```

**Used for:**

- Prevent duplicate applications
- Fast lookup by student + job combo

**Example query:**

```sql
SELECT * FROM APPLICATION
WHERE s_id = 10 AND job_id = 5;  -- Uses composite index
```

---

#### **5. FULLTEXT Index (Text Search)**

```sql
CREATE TABLE JOB_PROFILE (
    -- ...
    role VARCHAR(100),
    description TEXT,

    FULLTEXT INDEX idx_search_job (role, description)
);
```

**Used for:**

- Advanced job search
- Keyword matching for ATS

**Example query:**

```sql
SELECT * FROM JOB_PROFILE
WHERE MATCH(role, description) AGAINST('Python' IN BOOLEAN MODE);
```

---

### Index Performance Impact

| Operation                            | Without Index     | With Index   |
| ------------------------------------ | ----------------- | ------------ |
| Find by ID: `WHERE s_id = 5`         | 1000ms (scan all) | 1ms (direct) |
| Find by name: `WHERE s_name = 'Raj'` | 1000ms (scan all) | 50ms (index) |
| Count students: `COUNT(*)`           | 1000ms            | 50ms         |
| Sort by CGPA: `ORDER BY cgpa`        | 2000ms            | 100ms        |

---

## 5. DATABASE VIEWS

### What is a View?

A **view** is a saved SQL query that looks like a table, but doesn't store data.

**Think of it like:** A saved Google search - it shows fresh results every time

### Our Project's Views

#### **View 1: Placement Summary**

```sql
CREATE VIEW vw_placement_summary AS
SELECT
    s.dept,
    COUNT(DISTINCT s.s_id) as total_students,
    COUNT(DISTINCT pr.record_id) as placed_students,
    ROUND(COUNT(DISTINCT pr.record_id) * 100.0 /
          COUNT(DISTINCT s.s_id), 2) as placement_percentage,
    ROUND(AVG(pr.salary_offered), 2) as avg_salary,
    MAX(pr.salary_offered) as highest_package
FROM STUDENT s
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
GROUP BY s.dept;
```

**Usage:**

```sql
SELECT * FROM vw_placement_summary WHERE placement_percentage >= 80;
```

**Benefits:**

- No need to write complex JOIN every time
- Self-documenting
- Hides implementation complexity

---

#### **View 2: Active Applications Dashboard**

```sql
CREATE VIEW vw_active_applications AS
SELECT
    a.app_id,
    s.s_name,
    j.role,
    c.comp_name,
    a.status,
    a.applied_date,
    COUNT(i.interview_id) as interviews_scheduled
FROM APPLICATION a
JOIN STUDENT s ON a.s_id = s.s_id
JOIN JOB_PROFILE j ON a.job_id = j.job_id
JOIN COMPANY c ON j.comp_id = c.comp_id
LEFT JOIN INTERVIEW i ON a.app_id = i.app_id
WHERE a.status NOT IN ('rejected', 'selected')
GROUP BY a.app_id;
```

---

#### **View 3: Company Statistics**

```sql
CREATE VIEW vw_company_stats AS
SELECT
    c.comp_name,
    COUNT(DISTINCT jp.job_id) as positions_posted,
    COUNT(DISTINCT a.app_id) as applications_received,
    COUNT(DISTINCT pr.s_id) as students_placed,
    ROUND(AVG(pr.salary_offered), 2) as avg_salary
FROM COMPANY c
LEFT JOIN JOB_PROFILE jp ON c.comp_id = jp.comp_id
LEFT JOIN APPLICATION a ON jp.job_id = a.job_id
LEFT JOIN PLACEMENT_RECORD pr ON c.comp_id = pr.comp_id
GROUP BY c.comp_id;
```

---

### How Views Are Used in Backend

**File:** `server/routes/analytics.js`

```javascript
router.get("/placement-summary", requireAuth, async (req, res) => {
  try {
    // Query the view instead of writing complex JOIN
    const [stats] = await pool.query("SELECT * FROM vw_placement_summary");

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/company-stats", requireAuth, async (req, res) => {
  try {
    const [stats] = await pool.query(
      "SELECT * FROM vw_company_stats ORDER BY students_placed DESC",
    );

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

---

## 6. STORED PROCEDURES

### What is a Stored Procedure?

A **stored procedure** is pre-compiled SQL code stored in the database.

**Think of it like:** A function in the database that you can call from your code

### Stored Procedure Example: Accept Offer (Atomic Operation)

```sql
CREATE PROCEDURE sp_accept_offer(
    IN p_offer_id INT,
    IN p_student_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_success = FALSE;
        SET p_message = 'Procedure failed';
        ROLLBACK;
    END;

    START TRANSACTION;

    -- Step 1: Check if offer is valid
    IF NOT EXISTS (SELECT 1 FROM OFFER WHERE offer_id = p_offer_id) THEN
        SET p_success = FALSE;
        SET p_message = 'Offer not found';
        ROLLBACK;
        LEAVE;
    END IF;

    -- Step 2: Update offer status
    UPDATE OFFER SET offer_status = 'accepted' WHERE offer_id = p_offer_id;

    -- Step 3: Create placement record
    INSERT INTO PLACEMENT_RECORD (s_id, comp_id, offer_id, salary_offered, placed_date)
    SELECT s_id, comp_id, p_offer_id, salary_offered, NOW()
    FROM OFFER WHERE offer_id = p_offer_id;

    -- Step 4: Update student profile
    UPDATE STUDENT SET profile_status = 'placed'
    WHERE s_id = p_student_id;

    COMMIT;

    SET p_success = TRUE;
    SET p_message = 'Offer accepted successfully';
END
```

### How to Call from Node.js

```javascript
async function acceptOffer(offerId, studentId) {
  try {
    const [result] = await pool.query(
      "CALL sp_accept_offer(?, ?, @success, @message)",
      [offerId, studentId],
    );

    const [output] = await pool.query(
      "SELECT @success as success, @message as message",
    );

    if (output[0].success) {
      console.log("✓ Offer accepted");
      return { success: true };
    } else {
      console.error("✗", output[0].message);
      return { success: false, message: output[0].message };
    }
  } catch (err) {
    console.error("Procedure error:", err);
    return { success: false };
  }
}
```

---

## 7. FUNCTIONS

### What is a Function?

A **function** performs a calculation and returns a single value.

**Think of it like:** JavaScript function but in the database

### Example Function: Calculate ATS Score

```sql
CREATE FUNCTION fn_calculate_ats_score(
    p_resume_id INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_base_score INT;
    DECLARE v_skill_count INT;
    DECLARE v_final_score INT;

    -- Get count of extracted skills
    SELECT COUNT(*) INTO v_skill_count
    FROM RESUME_PARSED_KEYWORD
    WHERE resume_id = p_resume_id;

    -- Base score + skill bonus
    SET v_base_score = 50;
    SET v_final_score = v_base_score + (v_skill_count * 5);

    -- Cap at 100
    IF v_final_score > 100 THEN
        SET v_final_score = 100;
    END IF;

    RETURN v_final_score;
END
```

### How to Use

```sql
-- Direct query
SELECT fn_calculate_ats_score(5) as score;

-- In INSERT
INSERT INTO RESUME (s_id, ats_score)
VALUES (10, fn_calculate_ats_score(5));
```

---

## 8. ATS PACKAGE - What's Used

### Packages Used for ATS Feature

#### **1. pdf-parse (Main Package)**

**Installation:**

```bash
npm install pdf-parse
```

**What it does:** Extracts text from PDF files

**Code Example:**

```javascript
import pdfParse from "pdf-parse";

async function parsePdf(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);

    return {
      text: data.text, // Extracted text
      pages: data.numpages, // Number of pages
      metadata: data.info, // PDF metadata
    };
  } catch (err) {
    console.error("PDF parsing failed:", err);
  }
}
```

---

#### **2. multer (File Upload)**

**Installation:**

```bash
npm install multer
```

**What it does:** Handles file uploads from frontend

**Setup:**

```javascript
import multer from "multer";

const upload = multer({
  dest: "uploads/resumes/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed"));
    }
  },
});

router.post("/upload", upload.single("resume"), async (req, res) => {
  // req.file contains the uploaded file
  const pdfBuffer = require("fs").readFileSync(req.file.path);
  const text = await pdfParse(pdfBuffer);
  // ... process text
});
```

---

#### **3. keyword-extractor (Skill Extraction)**

**Installation:**

```bash
npm install keyword-extractor
```

**What it does:** Extracts keywords/skills from text

**Code Example:**

```javascript
import keywordExtractor from "keyword-extractor";

const resumeText = "I have experience with Python, JavaScript, React...";

const keywords = keywordExtractor.extract(resumeText, {
  language: "english",
  remove_digits: true,
  return_changed_case: false,
  remove_duplicates: true,
});

console.log(keywords);
// Output: ['python', 'javascript', 'react', ...]
```

---

### ATS Scoring Algorithm in Our Project

**File:** `server/routes/resume.js`

```javascript
function calculateAtsScore(resumeData) {
  let score = 50; // Base score

  const skillsList = [
    "python",
    "java",
    "javascript",
    "sql",
    "react",
    "nodejs",
    "aws",
    "docker",
    "git",
    "mongodb",
    "express",
    "rest",
    "api",
    "html",
    "css",
    "database",
  ];

  // Convert resume text to lowercase
  const text = resumeData.toLowerCase();

  // Count found skills
  let skillsFound = 0;
  skillsList.forEach((skill) => {
    if (text.includes(skill)) {
      skillsFound++;
    }
  });

  // Scoring formula
  score += skillsFound * 5; // +5 per skill
  if (text.includes("@")) score += 10; // +10 for email
  if (/\b\d{10}\b/.test(text)) score += 5; // +5 for phone
  if (text.split(" ").length > 1000) score += 5; // +5 for length

  return Math.min(score, 100); // Cap at 100
}
```

---

## 9. REDIS - Is It Used?

### Answer: **NO, Redis is NOT used in this project**

**Why?**

- Project uses MySQL for data persistence
- Real-time updates via SSE (Server-Sent Events), not Redis pub/sub
- Notifications stored in database, not cached in Redis
- Chat messages stored in CHAT_MESSAGE table, not Redis

**What would Redis be used for if we added it?**

- Session caching (faster login)
- Real-time leaderboards
- Temporary data (OTPs, password reset tokens)
- Message queuing for delayed notifications

---

## 10. DYNAMIC TABLE STORAGE FOR CHATS

### How Chat Messages Are Stored

**Not Dynamic - Structured Table:**

```sql
CREATE TABLE CHAT_MESSAGE (
    msg_id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id VARCHAR(255) NOT NULL,        -- Email of sender
    receiver_id VARCHAR(255) NOT NULL,      -- Email of receiver
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT 0,
    message_type ENUM('text', 'file', 'image'),
    file_path VARCHAR(255),                 -- If file/image

    INDEX idx_conversation (sender_id, receiver_id),
    INDEX idx_read_status (is_read)
);
```

### How Messages Are Queried

**File:** `js/common/messages.js`

```javascript
// Fetch conversation between two people
async function getConversation(otherUserId) {
  try {
    const response = await api.get(`/api/messages/${otherUserId}`);
    return response.data; // Array of messages
  } catch (err) {
    console.error("Failed to load messages");
  }
}

// Backend endpoint
router.get("/messages/:otherUserId", requireAuth, async (req, res) => {
  const userId = req.user.email;
  const { otherUserId } = req.params;

  try {
    const [messages] = await pool.query(
      `
            SELECT msg_id, sender_id, message, sent_at, is_read, message_type
            FROM CHAT_MESSAGE
            WHERE (
                (sender_id = ? AND receiver_id = ?) OR
                (sender_id = ? AND receiver_id = ?)
            )
            ORDER BY sent_at ASC
            LIMIT 100
        `,
      [userId, otherUserId, otherUserId, userId],
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

### Real-Time Message Delivery

**File:** `server/routes/messages.js`

```javascript
router.post("/send", requireAuth, async (req, res) => {
  const { receiverId, message } = req.body;
  const senderId = req.user.email;

  try {
    // Store in database
    const [result] = await pool.query(
      `
            INSERT INTO CHAT_MESSAGE (sender_id, receiver_id, message, message_type)
            VALUES (?, ?, ?, 'text')
        `,
      [senderId, receiverId, message],
    );

    // Push real-time notification to receiver
    notifyUser(receiverId, "new_message", {
      sender: senderId,
      message: message,
      timestamp: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

---

## 11. WHY PAGE DOESN'T REFRESH (Real-Time Technology)

### The Problem

**Without real-time:**

```
Student receives notification
    ↓
But browser shows old data
    ↓
Student has to manually refresh (F5)
    ↓
Now they see the update
```

**User experience:** Feels broken! Updates are slow!

### The Solution: Server-Sent Events (SSE)

SSE is a technology where **server pushes messages to the browser**.

**Think of it like:** TV broadcast - server broadcasts, you receive

### How It Works Step-by-Step

#### **Step 1: Browser Opens SSE Connection**

**Frontend Code:** `js/app.js`

```javascript
// Open persistent connection to server
const eventSource = new EventSource("/api/sse");

// Listen for different event types
eventSource.addEventListener("new_notification", (e) => {
  const notification = JSON.parse(e.data);
  console.log("Received notification:", notification);

  // Update UI instantly - NO PAGE REFRESH
  window.App.showNotification(notification.title);
  updateNotificationBadge();
});

eventSource.addEventListener("new_message", (e) => {
  const message = JSON.parse(e.data);
  console.log("Received message:", message);

  // Update chat window instantly
  appendMessageToChat(message);
});

eventSource.addEventListener("analytics_update", (e) => {
  console.log("Received analytics update");

  // Refresh dashboard without page reload
  window.App.Coordinator.softRefreshCharts();
});
```

#### **Step 2: Server Maintains Client List**

**Backend:** `server/sse.js`

```javascript
// Keep track of all connected users
const clients = new Map(); // userId -> Set of Response objects

export const addClient = (userId, res) => {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(res);

  // Remove client when connection closes
  res.on("close", () => {
    clients.get(userId).delete(res);
  });
};

export const notifyUser = (userId, type, payload) => {
  const userClients = clients.get(userId);

  if (userClients) {
    // Send to all open connections for this user
    userClients.forEach((res) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
    });
  }
};
```

#### **Step 3: Something Changes in Database**

**Example:** Coordinator marks application as "Selected"

```javascript
// Coordinator updates application
router.put("/application/:id/status", async (req, res) => {
  const { status } = req.body;

  // Update database
  await conn.query("UPDATE APPLICATION SET status = ? WHERE app_id = ?", [
    status,
    appId,
  ]);

  // Get student email
  const [student] = await conn.query(
    "SELECT email FROM STUDENT WHERE s_id = ?",
    [studentId],
  );

  // PUSH notification to student's browser in REAL-TIME
  notifyUser(student[0].email, "new_notification", {
    title: "Application Selected!",
    content: "Your application has been selected",
  });
});
```

#### **Step 4: Browser Receives Message Instantly**

SSE message arrives at browser:

```
event: new_notification
data: {"title":"Application Selected!","content":"Your application has been selected"}
```

Browser's event listener fires:

```javascript
// This function runs INSTANTLY
eventSource.addEventListener("new_notification", (e) => {
  const { title, content } = JSON.parse(e.data);
  showNotification(title); // Display on screen
  updateBadge(); // Update badge count
  // NO PAGE REFRESH - just DOM update
});
```

### Complete Real-Time Flow Diagram

```
BROWSER SIDE:
  User Screen
    ↓
  addEventListener('new_notification')
    ↓
  connection = new EventSource('/api/sse')
    ↑
    │ (persistent HTTP connection stays open)
    │
DATABASE SIDE:
  Coordinator updates APPLICATION table
    ↓
  Trigger fires (if exists)
    ↓
  Application code detects change
    ↓
  Calls: notifyUser(studentEmail, 'new_notification', {title, content})
    ↓
SERVER SIDE (sse.js):
  clients.get(studentEmail).forEach(res => {
    res.write(`event: new_notification\ndata: {...}\n\n`)
  })
    ↓
  SSE Message sent to browser
    ↓
BROWSER RECEIVES:
  Event listener fires
    ↓
  DOM updated instantly
    ↓
  User sees new notification WITHOUT REFRESH ✓
```

### Why This is Better Than Page Refresh

| Feature             | Page Refresh         | SSE Real-Time           |
| ------------------- | -------------------- | ----------------------- |
| **Speed**           | 2-3 seconds          | < 100ms                 |
| **User Experience** | Disruptive           | Smooth                  |
| **Data Loss**       | Might lose form data | No impact               |
| **Network Usage**   | Heavy (full page)    | Lightweight (just data) |
| **Server Load**     | High                 | Low                     |

### Real-Time Updates in Our Project

**1. Notifications Real-Time**

```javascript
// When coordinator marks app as selected
notifyUser(studentEmail, "new_notification", {
  title: "Application Selected",
  content: "Your application has been selected",
});

// Student sees it instantly without refresh
```

**2. Dashboard Real-Time**

```javascript
// When a placement happens
notifyUser(coordinatorEmail, "analytics_update", {
  placed: 10,
  rejected: 2,
});

// Coordinator's dashboard refreshes automatically
```

**3. Chat Real-Time**

```javascript
// When message is sent
notifyUser(receiverEmail, "new_message", {
  sender: senderEmail,
  message: "Hi, are you available?",
});

// Receiver sees message appear instantly in chat window
```

---

## SUMMARY COMPARISON TABLE

| Feature               | Type                | Implementation                             | Real-Time                      |
| --------------------- | ------------------- | ------------------------------------------ | ------------------------------ |
| **Triggers**          | Database            | 7 automatic SQL triggers in MySQL          | Yes (automatic)                |
| **Locking**           | Concurrency Control | SELECT...FOR UPDATE in transactions        | Yes (prevents race conditions) |
| **Transactions**      | Data Integrity      | BEGIN/COMMIT/ROLLBACK pattern              | Yes (atomic operations)        |
| **Indexing**          | Performance         | PRIMARY, FOREIGN, SEARCH, FULLTEXT indexes | Yes (instant lookup)           |
| **Views**             | Query Abstraction   | Saved SQL queries (vw\_\*)                 | No (static queries)            |
| **Procedures**        | Business Logic      | sp_accept_offer, sp_generate_report        | Yes (if called)                |
| **Functions**         | Calculations        | fn_calculate_ats_score                     | No (static calc)               |
| **ATS**               | Resume Analysis     | pdf-parse + keyword extraction             | No (batch processing)          |
| **Redis**             | Caching             | NOT USED                                   | N/A                            |
| **Chat Storage**      | Data Persistence    | CHAT_MESSAGE table (structured)            | Yes (via SSE)                  |
| **Real-Time Updates** | User Experience     | Server-Sent Events (SSE)                   | Yes (< 100ms)                  |

---

## QUICK REFERENCE

### Run Setup

```bash
# Create all triggers
node server/setup_triggers.js

# Start server
npm start
```

### Database Connection

```javascript
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  // Your operations
  await conn.commit();
} catch (err) {
  await conn.rollback();
} finally {
  conn.release();
}
```

### Send Real-Time Notification

```javascript
import { notifyUser } from "./sse.js";

notifyUser(userEmail, "event_type", {
  data: "payload",
});
```

### Query a View

```javascript
const [results] = await pool.query("SELECT * FROM vw_placement_summary");
```

---

**End of Document**
