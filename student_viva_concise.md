# STUDENT VIVA - QUICK REFERENCE GUIDE

## 📌 KEY FEATURES (2-Minute Overview)

| Feature               | What It Does                            | How                                   |
| --------------------- | --------------------------------------- | ------------------------------------- |
| **Real-Time Updates** | Status changes instant (no refresh)     | SSE + Database Triggers               |
| **Search Jobs**       | Find jobs by title/company/skills       | Debounced frontend + SQL search       |
| **Notifications**     | Get alerts on status changes            | SSE + NOTIFICATION table              |
| **Dashboard**         | Live stats (placed, active, rejected)   | 30s refresh + SSE                     |
| **Resume ATS**        | Auto-analyze resume, extract skills     | PDF parsing + skill extraction        |
| **Keyword Matching**  | Compare your skills vs job requirements | Resume keywords vs JOB_REQUIRED_SKILL |
| **Apply Button**      | Disable after application               | Prevent duplicates with DB check      |

---

## 1️⃣ REAL-TIME UPDATES

**How it works:**

```
User Action → DB Update → Trigger → SSE Event → Browser Updates (Instant) ✓
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

**Database Trigger:**

```sql
CREATE TRIGGER trg_application_audit
AFTER UPDATE ON APPLICATION
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO STATUS_AUDIT_LOG (app_id, old_status, new_status)
        VALUES (OLD.app_id, OLD.status, NEW.status);
    END IF;
END;
```

---

## 2️⃣ SEARCH FUNCTIONALITY

**Frontend (Debounced):**

```javascript
let searchTimeout;
document.getElementById("search-input").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const results = await api.get(`/api/jobs/search?q=${e.target.value}`);
    renderSearchResults(results);
  }, 500); // Wait 500ms after typing stops
});
```

**Backend SQL:**

```sql
SELECT jp.job_id, jp.role, jp.package, c.comp_name
FROM JOB_PROFILE jp
JOIN COMPANY c ON jp.comp_id = c.comp_id
WHERE jp.status = 'open' AND (
    LOWER(jp.role) LIKE CONCAT('%', ?, '%')
    OR LOWER(c.comp_name) LIKE CONCAT('%', ?, '%')
)
ORDER BY jp.created_at DESC LIMIT 50;
```

---

## 3️⃣ NOTIFICATIONS & CHATS

**Notification Table:**

```sql
CREATE TABLE NOTIFICATION (
    notif_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255),
    user_role ENUM('student', 'coordinator', 'admin'),
    title VARCHAR(255),
    content TEXT,
    type ENUM('message', 'system', 'alert'),
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Chat Message Sending:**

```javascript
async function sendMessage(receiverId, messageText) {
  const [result] = await pool.query(
    `INSERT INTO CHAT_MESSAGE (sender_id, receiver_id, message) VALUES (?, ?, ?)`,
    [senderId, receiverId, messageText],
  );

  // Notify receiver in real-time
  notifyUser(receiverId, "new_message", {
    sender_id: senderId,
    message: messageText,
  });
}
```

---

## 4️⃣ DASHBOARD STATUS CHANGES

**Real-Time Update Flow:**

```
Coordinator marks "Placed" → DB UPDATE → Trigger fires →
SSE broadcasts → Frontend refreshes dashboard stats instantly
```

**SQL for Dashboard:**

```sql
SELECT s.profile_status,
       COUNT(a.app_id) as total_applications,
       COUNT(CASE WHEN a.status='selected' THEN 1 END) as selected,
       MAX(pr.salary_offered) as highest_offer
FROM STUDENT s
LEFT JOIN APPLICATION a ON s.s_id = a.s_id
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
WHERE s.s_id = ?
GROUP BY s.s_id;
```

---

## 5️⃣ APPLY NOW - PREVENT DUPLICATES

**Frontend (Immediate Disable):**

```javascript
async function handleApplyNow(jobId) {
  await api.post("/api/applications", { job_id: jobId });
  const btn = document.querySelector(`[data-job-id="${jobId}"]`);
  btn.disabled = true;
  btn.textContent = "✓ Applied";
}
```

**Backend Validation:**

```javascript
// Check if already applied
const [existing] = await pool.query(
  `SELECT app_id FROM APPLICATION WHERE s_id = ? AND job_id = ?`,
  [student_id, job_id],
);

if (existing.length > 0) {
  return res.status(400).json({ message: "Already applied" });
}

// Also check eligibility
if (student[0].cgpa < job[0].eligibility_cgpa) {
  return res.status(403).json({ message: "Ineligible" });
}
```

---

## 6️⃣ ATS RESUME ANALYZER

**Resume Upload & Parsing:**

```javascript
async function handleResumeUpload(file) {
  const formData = new FormData();
  formData.append("resume", file);

  const { ats_score, keywords } = await fetch("/api/resume/upload", {
    method: "POST",
    body: formData,
  }).then((r) => r.json());

  document.getElementById("ats-score").textContent = `${ats_score}/100`;
}
```

**Backend PDF Processing:**

```javascript
import pdfParse from "pdf-parse";

const data = await pdfParse(file.data);
const text = data.text.toLowerCase();

// Extract skills
const skillsList = ["python", "java", "sql", "javascript", "react", "node.js"];
const foundSkills = skillsList.filter((skill) => text.includes(skill));

// Calculate score
const score = Math.min(50 + foundSkills.length * 5 + (hasEmail ? 10 : 0), 100);

// Store in DB
await pool.query(
  `INSERT INTO RESUME (s_id, file_path, ats_score) VALUES (?, ?, ?)`,
  [student_id, filePath, score],
);
```

**ATS Score Formula:**

```
Base: 50 points
+ 5 per skill found (max 20)
+ 10 if email found
+ 5 if phone found
+ 5 if 1000+ words
= Final score (max 100)
```

---

## 7️⃣ SCORE HISTORY & GRADES

**Grade Ranges:**

```
A: 80-100 (Excellent)
B: 60-79  (Good)
C: 40-59  (Average)
D: 20-39  (Poor)
```

**Store Score Changes:**

```sql
CREATE TABLE SCORE_HISTORY (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT,
    old_score INT,
    new_score INT,
    reason VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8️⃣ KEYWORD MATCHING

**Match Resume vs Job Requirements:**

```javascript
async function matchKeywords(resumeId, jobId) {
  // Get resume keywords
  const [resumeKeywords] = await pool.query(
    `SELECT DISTINCT keyword FROM RESUME_PARSED_KEYWORD WHERE resume_id = ?`,
    [resumeId],
  );

  // Get job requirements
  const [jobSkills] = await pool.query(
    `SELECT DISTINCT skill_name FROM JOB_REQUIRED_SKILL WHERE job_id = ?`,
    [jobId],
  );

  // Calculate match
  const matched = resumeKeywords.filter((k) =>
    jobSkills.some((j) => j.skill_name === k.keyword),
  );

  return {
    matched: matched,
    missing: jobSkills.filter(
      (j) => !resumeKeywords.some((k) => k.keyword === j.skill_name),
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
LEFT JOIN JOB_REQUIRED_SKILL jrs ON rpk.keyword = jrs.skill_name
    AND jrs.job_id = ?
WHERE rpk.resume_id = ?
ORDER BY is_match DESC;
```

---

## 9️⃣ QUERIES EXPLORER

**Admin can run custom SQL queries:**

```javascript
async function executeQuery(sqlQuery) {
  const response = await api.post("/api/admin/query-explorer", {
    query: sqlQuery,
  });
  displayQueryResults(response.results);
}
```

**Common Queries:**

```sql
-- 1. Placement Summary
SELECT COUNT(*) as total,
       SUM(CASE WHEN profile_status='placed' THEN 1 ELSE 0 END) as placed,
       ROUND(100.0 * SUM(CASE WHEN profile_status='placed' THEN 1 ELSE 0 END) / COUNT(*), 2) as placement_pct
FROM STUDENT;

-- 2. Department Breakdown
SELECT d.dept_name, COUNT(DISTINCT s.s_id) as students,
       COUNT(DISTINCT pr.s_id) as placed,
       ROUND(100.0 * COUNT(DISTINCT pr.s_id) / COUNT(DISTINCT s.s_id), 2) as pct
FROM DEPARTMENT d
JOIN STUDENT s ON s.dept_id = d.dept_id
LEFT JOIN PLACEMENT_RECORD pr ON pr.s_id = s.s_id
GROUP BY d.dept_name;

-- 3. Top Companies
SELECT c.comp_name, COUNT(pr.record_id) as offers,
       ROUND(AVG(pr.salary_offered), 2) as avg_salary
FROM COMPANY c
LEFT JOIN PLACEMENT_RECORD pr ON pr.comp_id = c.comp_id
GROUP BY c.comp_id, c.comp_name
ORDER BY offers DESC LIMIT 10;

-- 4. Average Package by Department
SELECT d.dept_name,
       ROUND(AVG(pr.salary_offered), 2) as avg_package,
       ROUND(MAX(pr.salary_offered), 2) as highest_package,
       ROUND(MIN(pr.salary_offered), 2) as lowest_package
FROM DEPARTMENT d
JOIN STUDENT s ON s.dept_id = d.dept_id
JOIN PLACEMENT_RECORD pr ON pr.s_id = s.s_id
GROUP BY d.dept_name;

-- 5. Monthly Placement Trend
SELECT DATE_FORMAT(pr.recorded_on, '%Y-%m') as month,
       COUNT(DISTINCT pr.s_id) as placements
FROM PLACEMENT_RECORD pr
GROUP BY DATE_FORMAT(pr.recorded_on, '%Y-%m')
ORDER BY month DESC;
```

---

## 🔑 KEY INSIGHTS - WHAT TO SAY IN VIVA

**Real-Time Architecture:**

- "We use SSE (Server-Sent Events) for one-way push notifications from server to client"
- "Database triggers automatically fire to create audit logs when statuses change"
- "30-second background refresh ensures consistency if SSE connection drops"

**Data Flow:**

- "When coordinator updates app status → DB trigger fires → SSE broadcasts → Student sees instant notification"

**Performance Optimization:**

- "Search uses debouncing (500ms) to avoid excessive queries while typing"
- "Client-side filtering reduces server load (all data fetched once, filtered locally)"
- "ATS score calculated on upload, stored in DB, can be incremented on resume updates"

**Database Design:**

- "Used FOREIGN KEYs to maintain referential integrity"
- "Transactions + COMMIT/ROLLBACK for data consistency"
- "BEFORE/AFTER triggers for validation and audit logging"
- "Indexes on frequently searched columns (status, dept_id, user_id)"

**Validation:**

- "Backend validates eligibility before allowing application"
- "Prevents duplicate applications with unique constraint on (student_id, job_id)"
- "Vacancy checks prevent overbooking of positions"

---

## 📊 TABLES USED

```
STUDENT ──→ APPLICATION ──→ JOB_PROFILE ──→ COMPANY
   ↓              ↓               ↓
PLACEMENT_RECORD  JOB_REQUIRED_SKILL   (Tier classification)
   ↓
NOTIFICATION     STATUS_AUDIT_LOG

RESUME ──→ RESUME_PARSED_KEYWORD
   ↓
SCAN_HISTORY     SCORE_HISTORY
```

---

## ✅ VIVA CHECKLIST

- [ ] Explain SSE + Database triggers for real-time
- [ ] Show SQL query with JOINs + GROUP BY
- [ ] Explain ATS score calculation formula
- [ ] Describe keyword matching algorithm
- [ ] Walk through complete application flow
- [ ] Mention transaction handling
- [ ] Talk about indexes & performance
- [ ] Explain ACID properties used

---

Done! This is now **concise, viva-ready, and quick to reference.** 🚀
