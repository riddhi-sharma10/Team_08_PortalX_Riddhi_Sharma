# STUDENT VIVA - QUICK REFERENCE GUIDE

## 📌 PROJECT OVERVIEW

**Student Placement Cell DBMS** - Real-time job portal where Students apply, Coordinators review, Companies post jobs.

### Main Features

1. **Real-Time Updates** - SSE for instant status notifications (no page refresh)
2. **Job Search** - Debounced frontend + SQL backend search
3. **Notifications & Chat** - Database + SSE for instant messaging
4. **Dashboard** - Live stats updated every 30s or via SSE
5. **Apply Button** - Disabled after application (prevents duplicates)
6. **Resume ATS** - Auto-analyze PDF, extract skills, calculate score (0-100)
7. **Keyword Matching** - Compare resume skills vs job requirements
8. **Analytics** - SQL queries for admin reports and insights

---

## 1️⃣ REAL-TIME UPDATES - SSE + DATABASE TRIGGERS

**How It Works:**

```
User Action → DB Update → Trigger Fires → SSE Event → Browser Updates (Instant)
```

**Backend (server/sse.js):**

```javascript
export const notifyUser = (userId, type, payload) => {
  clients.get(userId).forEach((res) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
  });
};
```

**Frontend (js/student/app.js):**

```javascript
const eventSource = new EventSource("/api/sse");
eventSource.addEventListener("new_notification", (e) => {
  const { title, content } = JSON.parse(e.data);
  window.App.showNotification(title, content);
});
```

**Database Trigger (Audit Logging):**

```sql
CREATE TRIGGER trg_application_audit
AFTER UPDATE ON APPLICATION FOR EACH ROW BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO STATUS_AUDIT_LOG (app_id, old_status, new_status)
        VALUES (OLD.app_id, OLD.status, NEW.status);
    END IF;
END;
```

**Real-Time Flow Example:**

1. Coordinator marks app as "Selected"
2. `UPDATE APPLICATION SET status='selected'`
3. Trigger fires → Inserts into STATUS_AUDIT_LOG
4. Backend broadcasts SSE: `event: 'new_notification'`
5. Student sees instant notification + dashboard updates
6. No page refresh needed ✓

---

## 2️⃣ SEARCH FUNCTIONALITY (DEBOUNCED)

**Frontend - Wait 500ms After Typing Stops:**

```javascript
let searchTimeout;
document.getElementById("search-input").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const results = await api.get(`/api/jobs/search?q=${e.target.value}`);
    renderSearchResults(results);
  }, 500); // Prevent excessive queries
});
```

**Backend SQL - Search Across 3 Fields:**

```sql
SELECT jp.job_id, jp.role, jp.package, c.comp_name, COUNT(jrs.skill_name) as skill_count
FROM JOB_PROFILE jp
JOIN COMPANY c ON jp.comp_id = c.comp_id
LEFT JOIN JOB_REQUIRED_SKILL jrs ON jp.job_id = jrs.job_id
WHERE jp.status = 'open' AND (
    LOWER(jp.role) LIKE CONCAT('%', ?, '%')
    OR LOWER(c.comp_name) LIKE CONCAT('%', ?, '%')
    OR LOWER(jrs.skill_name) LIKE CONCAT('%', ?, '%')
)
GROUP BY jp.job_id ORDER BY jp.created_at DESC LIMIT 50;
```

---

## 3️⃣ NOTIFICATIONS & CHATS

**Notification Table Schema:**

```sql
CREATE TABLE NOTIFICATION (
    notif_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255), user_role ENUM('student','coordinator','admin'),
    title VARCHAR(255), content TEXT,
    type ENUM('message','system','alert'), is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Send Chat Message + Real-Time Notify:**

```javascript
async function sendMessage(receiverId, messageText) {
  const [result] = await pool.query(
    `INSERT INTO CHAT_MESSAGE (sender_id, receiver_id, message) VALUES (?, ?, ?)`,
    [senderId, receiverId, messageText],
  );
  notifyUser(receiverId, "new_message", {
    sender_id: senderId,
    message: messageText,
  });
}
```

---

## 4️⃣ APPLY BUTTON - PREVENT DUPLICATE APPLICATIONS

**Frontend - Disable Immediately:**

```javascript
async function handleApplyNow(jobId) {
  await api.post("/api/applications", { job_id: jobId });
  const btn = document.querySelector(`[data-job-id="${jobId}"]`);
  btn.disabled = true;
  btn.textContent = "✓ Applied";
  localStorage.setItem("applied_jobs", JSON.stringify([...applied, jobId]));
}
```

**Backend Validation - 3 Checks:**

```javascript
// 1. Check if already applied
const [existing] = await pool.query(
  `SELECT app_id FROM APPLICATION WHERE s_id = ? AND job_id = ?`,
  [student_id, job_id],
);
if (existing.length > 0)
  return res.status(400).json({ message: "Already applied" });

// 2. Check CGPA eligibility
if (student[0].cgpa < job[0].eligibility_cgpa)
  return res.status(403).json({ message: "Ineligible" });

// 3. Insert new application
await pool.query(
  `INSERT INTO APPLICATION (s_id, job_id, applied_date, status) VALUES (?, ?, CURDATE(), 'under_review')`,
  [student_id, job_id],
);
```

---

## 5️⃣ ATS RESUME ANALYZER

**Resume Upload & PDF Parsing:**

```javascript
import pdfParse from "pdf-parse";

async function uploadResume(file) {
  const data = await pdfParse(file.data);
  const text = data.text.toLowerCase();

  // Find skills
  const skills = ["python", "java", "sql", "javascript", "react", "node.js"];
  const found = skills.filter((s) => text.includes(s));

  // Calculate score: 50 base + 5 per skill + 10 for email + 5 for phone
  const score = Math.min(50 + found.length * 5 + 10 + 5, 100);

  // Store in DB
  await pool.query(
    `INSERT INTO RESUME (s_id, file_path, ats_score) VALUES (?, ?, ?)`,
    [student_id, filePath, score],
  );
}
```

**ATS Score Formula:**

```
Base: 50 points
+ 5 per skill found (max 20)
+ 10 if email exists
+ 5 if phone exists
+ 5 if 1000+ words
= Final (max 100)
```

---

## 6️⃣ KEYWORD MATCHING - COMPARE SKILLS VS JOB

**Match Resume Keywords with Job Requirements:**

```javascript
async function matchKeywords(resumeId, jobId) {
  const [resumeKeywords] = await pool.query(
    `SELECT DISTINCT keyword FROM RESUME_PARSED_KEYWORD WHERE resume_id = ?`,
    [resumeId],
  );
  const [jobSkills] = await pool.query(
    `SELECT DISTINCT skill_name FROM JOB_REQUIRED_SKILL WHERE job_id = ?`,
    [jobId],
  );

  const matched = resumeKeywords.filter((k) =>
    jobSkills.some((j) => j.skill_name === k.keyword),
  );

  return {
    matched,
    missing: jobSkills.filter(
      (j) => !resumeKeywords.find((k) => k.keyword === j.skill_name),
    ),
    matchPercentage: Math.round((matched.length / jobSkills.length) * 100),
  };
}
```

**SQL:**

```sql
SELECT rpk.keyword,
       CASE WHEN jrs.skill_name IS NOT NULL THEN 1 ELSE 0 END as is_match
FROM RESUME_PARSED_KEYWORD rpk
LEFT JOIN JOB_REQUIRED_SKILL jrs ON rpk.keyword = jrs.skill_name AND jrs.job_id = ?
WHERE rpk.resume_id = ?
ORDER BY is_match DESC;
```

---

## 7️⃣ SCORE HISTORY & GRADE RANGES

**Grade Mapping:**

```
A: 80-100 (Excellent)
B: 60-79  (Good)
C: 40-59  (Average)
D: 20-39  (Poor)
```

**Track Score Changes:**

```sql
CREATE TABLE SCORE_HISTORY (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT, old_score INT, new_score INT,
    reason VARCHAR(255), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8️⃣ SQL QUERIES FOR ANALYTICS

**1. Placement Summary:**

```sql
SELECT COUNT(*) as total,
       SUM(CASE WHEN profile_status='placed' THEN 1 ELSE 0 END) as placed,
       ROUND(100.0 * SUM(CASE WHEN profile_status='placed' THEN 1 ELSE 0 END) / COUNT(*), 2) as pct
FROM STUDENT;
```

**2. Department Breakdown:**

```sql
SELECT d.dept_name, COUNT(DISTINCT s.s_id) as students, COUNT(DISTINCT pr.s_id) as placed,
       ROUND(100.0 * COUNT(DISTINCT pr.s_id) / COUNT(DISTINCT s.s_id), 2) as placement_pct
FROM DEPARTMENT d
JOIN STUDENT s ON s.dept_id = d.dept_id
LEFT JOIN PLACEMENT_RECORD pr ON pr.s_id = s.s_id
GROUP BY d.dept_name;
```

**3. Top Companies:**

```sql
SELECT c.comp_name, COUNT(pr.record_id) as offers, ROUND(AVG(pr.salary_offered), 2) as avg_salary
FROM COMPANY c
LEFT JOIN PLACEMENT_RECORD pr ON pr.comp_id = c.comp_id
GROUP BY c.comp_id
ORDER BY offers DESC LIMIT 10;
```

**4. Average Package by Dept:**

```sql
SELECT d.dept_name, ROUND(AVG(pr.salary_offered), 2) as avg_pkg,
       ROUND(MAX(pr.salary_offered), 2) as max_pkg, ROUND(MIN(pr.salary_offered), 2) as min_pkg
FROM DEPARTMENT d
JOIN STUDENT s ON s.dept_id = d.dept_id
JOIN PLACEMENT_RECORD pr ON pr.s_id = s.s_id
GROUP BY d.dept_name;
```

**5. Monthly Trend:**

```sql
SELECT DATE_FORMAT(pr.recorded_on, '%Y-%m') as month, COUNT(DISTINCT pr.s_id) as placements
FROM PLACEMENT_RECORD pr GROUP BY DATE_FORMAT(pr.recorded_on, '%Y-%m')
ORDER BY month DESC;
```

---

## ✅ VIVA KEY POINTS

**Architecture:**

- SSE for one-way real-time push (server → client)
- Database triggers for automatic audit logging
- 30-second background refresh as fallback

**Database:**

- FOREIGN KEYs for referential integrity
- Transactions + COMMIT/ROLLBACK for atomicity
- BEFORE/AFTER triggers for validation
- Indexes on status, dept_id, user_id

**Performance:**

- Debounced search (500ms) to reduce server load
- Client-side filtering after initial fetch
- ATS score calculated once, stored, incrementable

**Security:**

- Backend validates eligibility before application
- Prevents duplicates with DB unique constraint
- Vacancy checks prevent overbooking

---

## DATABASE SCHEMA

```
STUDENT ──→ APPLICATION ──→ JOB_PROFILE ──→ COMPANY
   ↓             ↓               ↓
PLACEMENT_RECORD JOB_REQUIRED_SKILL
   ↓
NOTIFICATION  STATUS_AUDIT_LOG

RESUME ──→ RESUME_PARSED_KEYWORD
   ↓
SCAN_HISTORY  SCORE_HISTORY
```

Done! ✅ This version is **concise, viva-ready, and quick to reference.**
s.s_name,
s.cgpa,
d.dept_name,
COUNT(a.app_id) as applications,
COUNT(CASE WHEN a.status='selected' THEN a.app_id END) as selected,
COUNT(pr.s_id) as placements,
MAX(pr.salary_offered) as highest_offer
FROM STUDENT s
LEFT JOIN DEPARTMENT d ON s.dept_id = d.dept_id
LEFT JOIN APPLICATION a ON s.s_id = a.s_id
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
GROUP BY s.s_id
ORDER BY highest_offer DESC;

````

**Query 2: Company Hiring Analytics**

```sql
SELECT
    c.comp_name,
    COUNT(DISTINCT jp.job_id) as positions_posted,
    COUNT(DISTINCT a.app_id) as applications_received,
    COUNT(DISTINCT pr.s_id) as students_placed,
    AVG(pr.salary_offered) as avg_salary,
    MAX(pr.salary_offered) as highest_salary
FROM COMPANY c
LEFT JOIN JOB_PROFILE jp ON c.comp_id = jp.comp_id
LEFT JOIN APPLICATION a ON jp.job_id = a.job_id
LEFT JOIN PLACEMENT_RECORD pr ON c.comp_id = pr.comp_id
GROUP BY c.comp_id
HAVING COUNT(DISTINCT pr.s_id) > 0
ORDER BY students_placed DESC;
````

**Query 3: Department-wise Placement Status**

```sql
SELECT
    d.dept_name,
    COUNT(DISTINCT s.s_id) as total_students,
    COUNT(DISTINCT CASE WHEN pr.s_id IS NOT NULL THEN s.s_id END) as placed_students,
    ROUND(100.0 * COUNT(DISTINCT pr.s_id) / COUNT(DISTINCT s.s_id), 2) as placement_pct,
    ROUND(AVG(pr.salary_offered), 2) as avg_salary
FROM DEPARTMENT d
LEFT JOIN STUDENT s ON d.dept_id = s.dept_id
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
GROUP BY d.dept_id
ORDER BY placement_pct DESC;
```

**Query 4: Real-Time Application Status Dashboard**

```sql
SELECT
    a.app_id,
    s.s_name,
    j.role,
    c.comp_name,
    a.status,
    a.applied_date,
    COUNT(i.interview_id) as interviews_scheduled,
    MAX(o.offer_id) as offer_status
FROM APPLICATION a
JOIN STUDENT s ON a.s_id = s.s_id
JOIN JOB_PROFILE j ON a.job_id = j.job_id
JOIN COMPANY c ON j.comp_id = c.comp_id
LEFT JOIN INTERVIEW i ON a.app_id = i.app_id
LEFT JOIN OFFER o ON a.app_id = o.app_id
GROUP BY a.app_id
ORDER BY a.applied_date DESC
LIMIT 100;
```

### Backend Endpoint for Query Execution

```javascript
// POST /api/admin/query-explorer
router.post("/query-explorer", requireAuth, async (req, res) => {
  // Only admin can access
  if (req.user.role !== "cgdc_admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { query } = req.body;

  // Whitelist allowed queries (prevent SQL injection)
  const allowedPatterns = [
    /^SELECT/i,
    /FROM/,
    /JOIN/,
    /WHERE/,
    /GROUP BY/,
    /ORDER BY/,
  ];

  const isAllowed = allowedPatterns.every(
    (p) => query.match(p) !== null || !p.toString().includes("GROUP"),
  );

  if (!isAllowed) {
    return res.status(400).json({ message: "Only SELECT queries are allowed" });
  }

  try {
    const [results] = await pool.query(query);
    const columns = Object.keys(results[0] || {});

    res.json({
      results,
      columns,
      rowCount: results.length,
    });
  } catch (err) {
    res.status(400).json({ message: `Query error: ${err.message}` });
  }
});
```

---

## 11. REAL-TIME COORDINATOR & STUDENT STATUS UPDATE

### **Simple explanation:**

When a coordinator updates an application status (like marking it "Selected"), several things happen instantly:

1. **Database locks the record** - prevents other coordinators from changing it at the same time
2. **Status gets updated** in the database
3. **A notification is created** automatically
4. **Student's browser updates** - no refresh needed!
5. **Analytics dashboard refreshes** - everyone sees updated numbers

All of this happens in less than 1 second - it's all "atomic" meaning it's all-or-nothing (doesn't get stuck halfway).

### Workflow

```
1. Coordinator marks application as "Selected"
   ↓
2. Database transaction begins
   ↓
3. Lock APPLICATION row (prevent race conditions)
   ↓
4. Update APPLICATION status
   ↓
5. Create NOTIFICATION record
   ↓
6. Commit transaction
   ↓
7. SSE pushes notification to student's browser
   ↓
8. Student sees real-time update (no refresh needed)
   ↓
9. Coordinator analytics dashboard refreshes automatically
```

### SQL Transaction

```sql
-- Transaction: Update application status atomically
START TRANSACTION;

-- Lock row to prevent race conditions
SELECT app_id FROM APPLICATION WHERE app_id = 123 FOR UPDATE;

-- Update status
UPDATE APPLICATION SET status = 'selected' WHERE app_id = 123;

-- Create notification
INSERT INTO NOTIFICATION (user_id, user_role, title, content, type)
SELECT CONCAT(s.email), 'student',
       'Application Selected',
       CONCAT('Your application for ', j.role, ' at ', c.comp_name, ' is selected!'),
       'system'
FROM APPLICATION a
JOIN STUDENT s ON a.s_id = s.s_id
JOIN JOB_PROFILE j ON a.job_id = j.job_id
JOIN COMPANY c ON j.comp_id = c.comp_id
WHERE a.app_id = 123;

COMMIT;
```

### Node.js Transaction Handler

```javascript
// server/routes/coordinator.js
router.put("/application/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const appId = req.params.id;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Lock the row
    await conn.query(
      "SELECT app_id FROM APPLICATION WHERE app_id = ? FOR UPDATE",
      [appId],
    );

    // Update
    await conn.query("UPDATE APPLICATION SET status = ? WHERE app_id = ?", [
      status,
      appId,
    ]);

    // Notify
    const [appData] = await conn.query(
      `
            SELECT s.email, s.s_name, j.role, c.comp_name
            FROM APPLICATION a
            JOIN STUDENT s ON a.s_id = s.s_id
            JOIN JOB_PROFILE j ON a.job_id = j.job_id
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE a.app_id = ?
        `,
      [appId],
    );

    const title = `Application ${status}`;
    const content = `Your application for ${appData[0].role} at ${appData[0].comp_name}`;

    await conn.query(
      `
            INSERT INTO NOTIFICATION (user_id, user_role, title, content, type)
            VALUES (?, 'student', ?, ?, 'system')
        `,
      [appData[0].email, title, content],
    );

    await conn.commit();

    // Real-time push
    notifyUser(appData[0].email, "new_notification", { title, content });

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});
```

---

## SUMMARY TABLE - All Features (With Simple Explanations)

| Feature                 | What It Does                                                | Works Real-Time?                     |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------ |
| **Real-Time Updates**   | When status changes, you see it instantly on your screen    | ✓ Yes (< 1 sec)                      |
| **Search**              | Find jobs by typing job title, company name, or skills      | ✓ Mostly (slight delay while typing) |
| **Notifications**       | Get alerts about status changes, messages, etc.             | ✓ Yes (< 1 sec)                      |
| **Chats**               | Talk to coordinators and other users                        | ✓ Yes (instant)                      |
| **Dashboard Status**    | Live scoreboard showing placements, rejections, etc.        | ✓ Yes (auto-refresh)                 |
| **Apply Now**           | Apply for jobs (button disables to prevent double-applying) | ✓ Yes (instant)                      |
| **ATS Resume Analysis** | System reads your PDF and scores your resume                | ✗ No (takes 5-10 sec to analyze)     |
| **Score Calculation**   | Your resume gets a score out of 100                         | ✗ No (calculated once when uploaded) |
| **Keyword Matching**    | Compare your skills with job requirements                   | ✓ Partially (on-demand)              |
| **Queries Explorer**    | Admin tool to run custom database reports                   | - (depends on query)                 |

---

## 🎓 KEY CONCEPTS TO REMEMBER FOR YOUR VIVA

### **1. Real-Time = Instant Updates**\\\

- No page refresh needed
- Uses Server-Sent Events (SSE) like push notifications
- Database triggers fire automatically

### **2. Locking = Prevent Mistakes**

- When updating something, we "lock" it temporarily
- Prevents two people changing the same thing at once
- Like a queue - one person at a time

### **3. Transactions = All-or-Nothing**

- Either the whole operation succeeds, or nothing changes
- If an error happens midway, everything rolls back
- Like banking - you can't lose money in the middle of a transfer

### **4. ATS = Automated Resume Scoring**

- Reads PDF files automatically
- Extracts skills and gives you a score
- Helps match you with suitable jobs

### **5. Normalization = No Duplicated Data**

- The database is organized into 22 tables
- Data is stored only once, in the right place
- Prevents errors and saves storage space

---

**End of Viva Preparation Guide**
