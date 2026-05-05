# STUDENT VIVA PREPARATION GUIDE

## Student Placement Cell DBMS - Feature Implementation & SQL Queries

---

## 📚 SIMPLE OVERVIEW (Non-Technical Summary)

This document explains how our Student Placement System works. Here are the main features in **simple English**:

### **What is this project?**

A website where:

- **Students** can apply for jobs, upload resumes, and see their application status
- **Coordinators** can review student profiles and update application status
- **Companies** can post job openings

### **Main Features Explained Simply**

1. **Real-Time Updates**
   - When a coordinator marks your application as "Selected", you see it instantly without refreshing the page
   - It's like when you get a WhatsApp notification instantly

2. **Search Jobs**
   - Students can search for jobs by job title, company name, or required skills
   - Works like Google search - you type and get results

3. **Notifications & Chats**
   - You get notifications about application status changes
   - Can chat with coordinators for questions

4. **Dashboard Status**
   - A real-time dashboard showing how many students are placed, rejected, etc.
   - Updates automatically without clicking refresh

5. **Apply Now Button**
   - Once you apply for a job, the button becomes disabled
   - You can't apply twice for the same job

6. **Resume ATS (Automated Analysis)**
   - When you upload your resume, the system reads it automatically
   - It extracts your skills (Python, Java, etc.) from the PDF
   - Gives you a score out of 100

7. **Keyword Matching**
   - Compares your resume skills with what the job needs
   - Shows "You have 80% of required skills"

8. **Analytics & Reports**
   - Admins can see statistics like:
     - How many students got placed
     - Average salary offered
     - Which company hired the most

---

## 1. REAL-TIME UPDATES - How It Works

### **What this means in simple words:**

Imagine you apply for a job. The coordinator immediately marks your application as "Selected". Instead of you having to refresh the page to see the update, your browser instantly shows "Selected" on your screen. That's real-time!

### **How does this happen technically?**

The server sends a message to your browser using something called SSE (Server-Sent Events). It's like a one-way WhatsApp notification - the server sends updates to your phone whenever something changes.

### **The Flow:**

1. You do something (like applying for a job)
2. Database is updated
3. A trigger (automatic rule) fires in the database
4. SSE sends a notification to your browser
5. Your screen updates instantly

### Architecture

**SSE (Server-Sent Events) + Event Emitters + Database Triggers**

```
User Action → Database Change → Trigger Fires →
SSE Notification → Client Event → DOM Update (Real-time)
```

### Backend Implementation (server/sse.js)

```javascript
// SSE Client Management
const clients = new Map(); // userId -> Set of Response objects

export const addClient = (userId, res) => {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
  res.on("close", () => {
    clients.get(userId).delete(res);
  });
};

export const notifyUser = (userId, type, payload) => {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.forEach((res) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
    });
  }
};
```

### Real-Time Application Status Change Example

```javascript
// server/routes/coordinator.js - When coordinator updates application status

const statusMap = {
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  selected: "Selected",
};

await conn.query("UPDATE APPLICATION SET status = ? WHERE app_id = ?", [
  status,
  id,
]);

// IMMEDIATELY notify student via SSE
const [details] = await conn.query(
  `SELECT s.email AS stu_email, s.s_name, j.role, c.comp_name
     FROM APPLICATION a
     JOIN STUDENT s ON a.s_id = s.s_id
     JOIN JOB_PROFILE j ON a.job_id = j.job_id
     JOIN COMPANY c ON j.comp_id = c.comp_id
     WHERE a.app_id = ?`,
  [id],
);

const title = `Application ${statusMap[status]}`;
const content = `Your application for ${d.role} at ${d.comp_name} has been ${status}.`;

// 1. Insert into NOTIFICATION table (persistent)
await conn.query(
  `INSERT INTO NOTIFICATION (user_id, user_role, title, content, type) 
     VALUES (?, 'student', ?, ?, ?)`,
  [d.stu_email, title, content, "system"],
);

// 2. Push real-time via SSE
notifyUser(d.stu_email, "new_notification", { title, content });
```

### Frontend Listening (js/student/app.js)

```javascript
// Listen for SSE events
const eventSource = new EventSource("/api/sse");

eventSource.addEventListener("new_notification", (e) => {
  const { title, content } = JSON.parse(e.data);
  console.log("Received:", title, content);
  // Update DOM - notification badge, show toast, etc.
  window.App.showNotification(title, content);
});

eventSource.addEventListener("analytics_update", () => {
  // Refresh dashboard charts immediately
  window.App.Coordinator.refreshAnalytics();
});
```

### Real-Time Coordinator Dashboard Update (js/coordinator/analytics.js)

```javascript
function startRealTimeSync() {
  // SSE listener
  window.addEventListener("sse:analytics_update", async () => {
    await fetchAnalytics();
    softRefreshCharts(); // Redraw without full page reload
    stampLastUpdated();
  });

  // Safety net: background poll every 30 seconds
  setInterval(async () => {
    await fetchAnalytics();
    softRefreshCharts();
  }, 30000);
}
```

### SQL Query Behind Real-Time Analytics Update

```sql
-- Coordinator Dashboard - Real-time statistics
SELECT
    COUNT(DISTINCT s.s_id) as total_students,
    COUNT(DISTINCT CASE WHEN a.status='selected' THEN a.app_id END) as selected,
    COUNT(DISTINCT pr.s_id) as placed,
    ROUND(100.0 * COUNT(DISTINCT pr.s_id) /
          COUNT(DISTINCT s.s_id), 2) as placement_pct,
    AVG(pr.salary_offered) as avg_salary
FROM STUDENT s
LEFT JOIN APPLICATION a ON s.s_id = a.s_id
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
WHERE s.coord_id = ?
GROUP BY s.coord_id;
```

---

## 2. SEARCH FUNCTIONALITY - Frontend & Backend

### **Simple explanation:**

When you type in the search box to find a job, there are two parts that work together:

- **Frontend (Your browser):** Waits for you to stop typing, then sends your search
- **Backend (Server):** Searches the database and returns matching jobs

This is efficient - if we searched after every letter you typed, it would be slow!

### Frontend Search (js/student/jobs.js)

```javascript
// Client-side search with debouncing
let searchTimeout;
document.getElementById("search-input").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();

  searchTimeout = setTimeout(async () => {
    if (query.length < 2) {
      renderAllJobs();
      return;
    }

    try {
      const results = await api.get(`/api/jobs/search?q=${query}`);
      renderSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
    }
  }, 500); // Wait 500ms after user stops typing
});
```

### Backend Search Implementation (server/routes/jobs.js)

```javascript
// GET /api/jobs/search?q=query
router.get("/search", requireAuth, async (req, res) => {
  try {
    const query = req.body.q || "";

    // Search by role, company, skills
    const [results] = await pool.query(
      `
            SELECT jp.job_id, jp.role, jp.package, c.comp_name, 
                   COUNT(jrs.skill_name) as skill_count
            FROM JOB_PROFILE jp
            JOIN COMPANY c ON jp.comp_id = c.comp_id
            LEFT JOIN JOB_REQUIRED_SKILL jrs ON jp.job_id = jrs.job_id
            WHERE jp.status = 'open'
            AND (
                LOWER(jp.role) LIKE CONCAT('%', ?, '%')
                OR LOWER(c.comp_name) LIKE CONCAT('%', ?, '%')
                OR LOWER(jrs.skill_name) LIKE CONCAT('%', ?, '%')
            )
            GROUP BY jp.job_id
            ORDER BY jp.created_at DESC
            LIMIT 50
        `,
      [query, query, query],
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Search error" });
  }
});
```

### Advanced Search with Filters

```javascript
// Filter by CGPA, package, department eligibility
router.get("/advanced-search", async (req, res) => {
  const { minCgpa, maxPackage, department } = req.query;

  let sql = `
        SELECT DISTINCT jp.job_id, jp.role, jp.package, c.comp_name
        FROM JOB_PROFILE jp
        JOIN COMPANY c ON jp.comp_id = c.comp_id
        WHERE jp.status = 'open'
    `;

  const params = [];

  if (minCgpa) {
    sql += ` AND jp.eligibility_cgpa <= ?`;
    params.push(minCgpa);
  }

  if (maxPackage) {
    sql += ` AND jp.package <= ?`;
    params.push(maxPackage);
  }

  if (department) {
    sql += ` AND jp.job_id IN (
            SELECT jeb.job_id FROM JOB_ELIGIBILITY_BRANCH jeb 
            WHERE jeb.branch_name = ?
        )`;
    params.push(department);
  }

  const [results] = await pool.query(sql, params);
  res.json(results);
});
```

---

## 3. NOTIFICATIONS & CHATS

### **Simple explanation:**

When something important happens (like your application status changes), you get a notification. You can also chat with coordinators to ask questions. The system keeps these messages stored in a database so you can see them later.

### Notification Table Structure

```sql
CREATE TABLE NOTIFICATION (
    notif_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255),          -- Email of student/coordinator/admin
    user_role ENUM('student', 'coordinator', 'admin'),
    title VARCHAR(255),
    content TEXT,
    type ENUM('message', 'system', 'alert'),
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id, user_role),
    INDEX idx_read (is_read)
);
```

### Notification Types Example

```javascript
// TYPE 1: Application Status Change
const notif1 = {
  title: "Application Shortlisted",
  content: "Your application for SDE at Microsoft has been shortlisted",
  type: "system",
};

// TYPE 2: Interview Scheduled
const notif2 = {
  title: "Interview Scheduled",
  content: "Interview on May 10, 2026 at 10:00 AM - Google Meet",
  type: "alert",
};

// TYPE 3: Offer Received
const notif3 = {
  title: "Offer Received",
  content: "Congratulations! Amazon has sent you an offer.",
  type: "system",
};
```

### Fetching Unread Notifications (server/routes/notifications.js)

```javascript
router.get("/", requireAuth, async (req, res) => {
  const userId = req.user.email;
  const role = req.user.role;

  const [notifs] = await pool.query(
    `
        SELECT * FROM NOTIFICATION 
        WHERE user_id = ? AND user_role = ?
        ORDER BY created_at DESC 
        LIMIT 50
    `,
    [userId, role === "cgdc_admin" ? "admin" : role],
  );

  res.json(notifs);
});

// Mark as read
router.post("/read/:id", requireAuth, async (req, res) => {
  await pool.query(`UPDATE NOTIFICATION SET is_read = 1 WHERE notif_id = ?`, [
    req.params.id,
  ]);
  res.json({ success: true });
});
```

### Real-Time Chat Implementation

```javascript
// js/common/messages.js - Chat Interface

// CHAT_MESSAGE table structure
CREATE TABLE CHAT_MESSAGE (
    msg_id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id VARCHAR(255),      -- Email
    receiver_id VARCHAR(255),    -- Email
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT 0,
    INDEX idx_conversation (sender_id, receiver_id)
);

// Send message and trigger real-time update
async function sendMessage(receiverId, messageText) {
    const [result] = await pool.query(`
        INSERT INTO CHAT_MESSAGE (sender_id, receiver_id, message)
        VALUES (?, ?, ?)
    `, [senderId, receiverId, messageText]);

    // Notify receiver in real-time
    notifyUser(receiverId, 'new_message', {
        sender_id: senderId,
        message: messageText
    });
}

// Frontend: Listen for messages
window.addEventListener('sse:new_message', async (e) => {
    const { sender_id, message } = e.detail;
    // Refresh chat window if active
    if (currentChat === sender_id) {
        await loadMessages();
        scrollToBottom();
    }
});
```

---

## 4. DASHBOARD STATUS CHANGING - Real-Time Update

### **Simple explanation:**

The dashboard is like a scoreboard that shows live statistics. When a coordinator marks a student as "Placed", all students and coordinators see the numbers update instantly - no page refresh needed!

### Dashboard Workflow

```
Coordinator marks Student as "Placed"
    ↓
Database: UPDATE STUDENT SET profile_status='placed'
    ↓
Trigger: Auto-create NOTIFICATION
    ↓
SSE: Push notification to coordinator & student
    ↓
Student Dashboard: Instantly shows "Placed" status (no refresh)
    ↓
Analytics Dashboard: Placement count updates in real-time
```

### SQL Query to Fetch Dashboard Status

```sql
-- Student Dashboard Status
SELECT
    s.s_id, s.s_name, s.profile_status,
    COUNT(a.app_id) as total_applications,
    COUNT(CASE WHEN a.status='selected' THEN a.app_id END) as selected,
    COUNT(pr.s_id) as placements,
    MAX(pr.salary_offered) as highest_offer
FROM STUDENT s
LEFT JOIN APPLICATION a ON s.s_id = a.s_id
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
WHERE s.s_id = ?
GROUP BY s.s_id;
```

### Backend Endpoint - Update Student Status

```javascript
// POST /api/student/update-status
router.post("/update-status", requireAuth, async (req, res) => {
  const { studentId, newStatus } = req.body;
  // newStatus: 'active', 'placed', 'opted_out', 'not_eligible'

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock student row (prevent race conditions)
    await conn.query("SELECT s_id FROM STUDENT WHERE s_id = ? FOR UPDATE", [
      studentId,
    ]);

    // Update
    await conn.query("UPDATE STUDENT SET profile_status = ? WHERE s_id = ?", [
      newStatus,
      studentId,
    ]);

    // Auto-create notification
    await conn.query(
      `
            INSERT INTO NOTIFICATION (user_id, user_role, title, content, type)
            SELECT email, 'student', 
                   CONCAT('Status: ', ?),
                   CONCAT('Your profile status updated to ', ?),
                   'system'
            FROM STUDENT WHERE s_id = ?
        `,
      [newStatus, newStatus, studentId],
    );

    await conn.commit();

    // Push real-time notification
    const [student] = await pool.query(
      "SELECT email FROM STUDENT WHERE s_id = ?",
      [studentId],
    );
    notifyUser(student[0].email, "status_update", {
      newStatus,
      timestamp: new Date(),
    });

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

## 5. APPLY NOW - Disable After Application

### **Simple explanation:**

To prevent students from applying twice for the same job:

1. When you click "Apply Now", the button immediately becomes gray and disabled
2. The system remembers this (stores it in your browser)
3. If the server finds you already applied, it sends an error
4. This prevents duplicate applications in the database

### Feature Implementation

```javascript
// js/student/jobs.js
async function handleApplyNow(jobId) {
  try {
    await api.post("/api/applications", { job_id: jobId });

    // Disable button immediately
    const btn = document.querySelector(`[data-job-id="${jobId}"]`);
    btn.disabled = true;
    btn.textContent = "✓ Applied";
    btn.style.opacity = "0.6";
    btn.style.cursor = "not-allowed";

    // Store in localStorage to persist across sessions
    const applied = JSON.parse(localStorage.getItem("applied_jobs") || "[]");
    applied.push(jobId);
    localStorage.setItem("applied_jobs", JSON.stringify(applied));

    // Show notification
    showNotification("Application submitted successfully!");
  } catch (err) {
    alert("Already applied to this job");
  }
}

// On page load - disable previously applied jobs
function loadAppliedJobs() {
  const applied = JSON.parse(localStorage.getItem("applied_jobs") || "[]");
  applied.forEach((jobId) => {
    const btn = document.querySelector(`[data-job-id="${jobId}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = "✓ Applied";
      btn.style.opacity = "0.6";
    }
  });
}

// On init
document.addEventListener("DOMContentLoaded", loadAppliedJobs);
```

### Backend Validation - Prevent Duplicate Applications

```javascript
// server/routes/applications.js
router.post("/", requireAuth, async (req, res) => {
  const { job_id } = req.body;
  const student_id = req.user.entityId;

  // Check if already applied
  const [existing] = await pool.query(
    `
        SELECT app_id FROM APPLICATION 
        WHERE s_id = ? AND job_id = ?
    `,
    [student_id, job_id],
  );

  if (existing.length > 0) {
    return res.status(400).json({
      message: "You have already applied to this job",
    });
  }

  // Check eligibility
  const [student] = await pool.query(
    "SELECT cgpa FROM STUDENT WHERE s_id = ?",
    [student_id],
  );

  const [job] = await pool.query(
    "SELECT eligibility_cgpa FROM JOB_PROFILE WHERE job_id = ?",
    [job_id],
  );

  if (student[0].cgpa < job[0].eligibility_cgpa) {
    return res.status(403).json({
      message: "You do not meet the eligibility criteria",
    });
  }

  // Proceed with application
  await pool.query(
    `
        INSERT INTO APPLICATION (s_id, job_id, applied_date, status)
        VALUES (?, ?, CURDATE(), 'under_review')
    `,
    [student_id, job_id],
  );

  res.json({ message: "Application submitted" });
});
```

---

## 6. ATS FEATURE INTEGRATION

### **Simple explanation:**

ATS = "Automated Tracking System" - it's like a robot that reads your PDF resume automatically!

**What it does:**

1. You upload a PDF file of your resume
2. The system extracts the text from the PDF
3. It looks for technical skills like "Python", "Java", "React", etc.
4. It counts what skills you have
5. It gives you a score (out of 100) based on how good your resume is

### ATS Resume Upload & Parsing

```javascript
// js/student/profile.js
async function handleResumeUpload(file) {
  const formData = new FormData();
  formData.append("resume", file);

  try {
    const response = await fetch("/api/resume/upload", {
      method: "POST",
      body: formData,
    });

    const { resume_id, ats_score, keywords } = await response.json();

    // Display ATS score
    document.getElementById("ats-score").textContent = `${ats_score}/100`;

    // Display extracted keywords
    const keywordEl = document.getElementById("keywords");
    keywordEl.innerHTML = keywords
      .map((k) => `<span class="keyword-badge">${k}</span>`)
      .join("");

    showNotification("Resume uploaded and analyzed!");
  } catch (err) {
    alert("Resume upload failed");
  }
}
```

### Backend Resume Processing

```javascript
// server/routes/resume.js
import pdfParse from "pdf-parse";
import FormData from "form-data";
import fs from "fs";

router.post("/upload", requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const file = req.files.resume;
    const student_id = req.user.entityId;

    // 1. Parse PDF
    const data = await pdfParse(file.data);
    const text = data.text.toLowerCase();

    // 2. Extract keywords from technical skills list
    const skillsList = [
      "python",
      "java",
      "sql",
      "javascript",
      "react",
      "node.js",
      "aws",
      "docker",
      "git",
    ];
    const foundSkills = skillsList.filter((skill) => text.includes(skill));

    // 3. Calculate ATS score
    const score = calculateAtsScore({
      text,
      skills: foundSkills,
      hasContact: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(
        text,
      ),
      hasPhone: /\b\d{10}\b/.test(text),
    });

    // 4. Store in database
    await conn.beginTransaction();

    const [resumeResult] = await conn.query(
      `
            INSERT INTO RESUME (s_id, file_path, ats_score, uploaded_at)
            VALUES (?, ?, ?, NOW())
        `,
      [student_id, `/uploads/${file.name}`, score],
    );

    const resume_id = resumeResult.insertId;

    // 5. Store extracted keywords
    for (const skill of foundSkills) {
      await conn.query(
        `
                INSERT INTO RESUME_PARSED_KEYWORD 
                (resume_id, keyword, frequency)
                VALUES (?, ?, 1)
                ON DUPLICATE KEY UPDATE frequency = frequency + 1
            `,
        [resume_id, skill],
      );
    }

    // 6. Store in scan history
    await conn.query(
      `
            INSERT INTO SCAN_HISTORY (student_id, resume_id, scan_date, score)
            VALUES (?, ?, NOW(), ?)
        `,
      [student_id, resume_id, score],
    );

    await conn.commit();

    res.json({
      resume_id,
      ats_score: score,
      keywords: foundSkills,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Resume processing failed" });
  } finally {
    conn.release();
  }
});

function calculateAtsScore(resumeData) {
  let score = 50; // Base score

  // Skills: +5 per unique skill (max 20)
  score += Math.min(resumeData.skills.length * 5, 20);

  // Contact info: +10
  if (resumeData.hasContact) score += 10;
  if (resumeData.hasPhone) score += 5;

  // Length: +5 if more than 1000 words
  if (resumeData.text.split(" ").length > 1000) score += 5;

  return Math.min(score, 100);
}
```

### PDF Parsing Implementation

```javascript
// Extract text from PDF
async function parsePdf(pdfBuffer) {
  const pdf = await pdfParse(pdfBuffer);
  return {
    text: pdf.text,
    pages: pdf.numpages,
    metadata: pdf.info,
  };
}

// Extract structured data
function extractResumeData(text) {
  const sections = {
    contact: extractContact(text),
    education: extractEducation(text),
    experience: extractExperience(text),
    skills: extractSkills(text),
  };
  return sections;
}

function extractContact(text) {
  const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  const phoneMatch = text.match(
    /\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
  );
  return {
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
  };
}

function extractSkills(text) {
  const skillKeywords = [
    "python",
    "java",
    "c++",
    "javascript",
    "sql",
    "react",
    "node",
    "aws",
    "docker",
    "git",
  ];
  return skillKeywords.filter((skill) => text.includes(skill));
}
```

### Scan History Storage

```sql
-- Where scan history is stored
CREATE TABLE SCAN_HISTORY (
    scan_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    resume_id INT,
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INT,
    analysis TEXT,
    FOREIGN KEY (student_id) REFERENCES STUDENT(s_id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES RESUME(resume_id) ON DELETE CASCADE,
    INDEX idx_student (student_id)
);

-- Query: Get student's scan history
SELECT s.scan_date, s.score, COUNT(rpk.keyword_id) as keyword_count
FROM SCAN_HISTORY s
LEFT JOIN RESUME_PARSED_KEYWORD rpk ON s.resume_id = rpk.resume_id
WHERE s.student_id = ?
ORDER BY s.scan_date DESC;
```

---

## 7. ATS SCORE CALCULATION & INCREMENT

### **Simple explanation:**

Your ATS score is calculated like this:

- **Start with 50 points** (baseline)
- **+5 points for each skill** we find (Python, Java, etc.)
- **+10 points if you have email** in resume
- **+5 points if you have phone** number in resume
- **+5 points if resume has 1000+ words** (more content = better)
- Maximum score = 100 points

If you update your resume with more skills, your score can increase.

### Score Increment Logic

```javascript
// backend/ats-engine.js
function calculateAtsScore(resumeData) {
  let score = 0;

  const rules = {
    // Contact section
    email: { exists: 10, missing: 0 },
    phone: { exists: 10, missing: 0 },
    linkedIn: { exists: 5, missing: 0 },

    // Content quality
    words: {
      500: 5, // +5 for 500+ words
      1000: 10, // +10 for 1000+ words
      2000: 15, // +15 for 2000+ words
    },

    // Sections present
    summary: 5,
    experience: 15,
    education: 10,
    skills: 15,

    // Keyword matching
    technicalSkills: 5 * foundSkillsCount, // +5 per skill
    keywords: 2 * relevantKeywordsCount, // +2 per keyword
  };

  // Calculate score
  score += resumeData.hasEmail ? rules.email.exists : 0;
  score += resumeData.hasPhone ? rules.phone.exists : 0;
  score += resumeData.hasExperience ? rules.experience : 0;
  score += resumeData.hasEducation ? rules.education : 0;
  score += resumeData.hasSkills ? rules.skills : 0;
  score += resumeData.technicalSkills * 5;

  return Math.min(Math.max(score, 0), 100);
}

// Score is stored and can be incremented
// Score Increment Example: Student updates resume with more skills
async function updateAtsScore(resumeId, newSkills) {
  const [resume] = await pool.query(
    "SELECT ats_score FROM RESUME WHERE resume_id = ?",
    [resumeId],
  );

  const oldScore = resume[0].ats_score;
  const increment = newSkills.length * 5;
  const newScore = Math.min(oldScore + increment, 100);

  await pool.query("UPDATE RESUME SET ats_score = ? WHERE resume_id = ?", [
    newScore,
    resumeId,
  ]);

  // Log the change
  await pool.query(
    `
        INSERT INTO SCORE_HISTORY (resume_id, old_score, new_score, reason)
        VALUES (?, ?, ?, 'Added new skills')
    `,
    [resumeId, oldScore, newScore],
  );
}
```

### Where Score Is Recorded

```sql
-- RESUME table stores ATS score
CREATE TABLE RESUME (
    resume_id INT PRIMARY KEY AUTO_INCREMENT,
    s_id INT NOT NULL,
    file_path VARCHAR(255),
    ats_score INT DEFAULT 0,       -- ← Stores ATS score here
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (s_id) REFERENCES STUDENT(s_id) ON DELETE CASCADE,
    INDEX idx_score (ats_score)
);

-- SCORE_HISTORY tracks score changes over time
CREATE TABLE SCORE_HISTORY (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    resume_id INT,
    old_score INT,
    new_score INT,
    reason VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES RESUME(resume_id)
);

-- Query: Track score progression
SELECT old_score, new_score, reason, updated_at
FROM SCORE_HISTORY
WHERE resume_id = ?
ORDER BY updated_at DESC;
```

---

## 8. ANALYSIS GRADE RANGE STORAGE

### **Simple explanation:**

Your ATS score is converted into grades, similar to your college grades:

- **Grade A (80-100):** Excellent resume - you have most required skills
- **Grade B (60-79):** Good resume - you're competitive for most jobs
- **Grade C (40-59):** Average resume - you might need more skills
- **Grade D (20-39):** Below average - focus on adding more skills

The system stores these grades so you can see your progress over time.

### Grade Range System

```sql
-- ANALYSIS table stores grade breakdowns
CREATE TABLE ANALYSIS (
    analysis_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    resume_id INT,
    grade_a_range INT,          -- Score 80-100
    grade_b_range INT,          -- Score 60-79
    grade_c_range INT,          -- Score 40-59
    grade_d_range INT,          -- Score 20-39
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES STUDENT(s_id),
    FOREIGN KEY (resume_id) REFERENCES RESUME(resume_id)
);

-- Query: Get analysis grades
SELECT
    grade_a_range, grade_b_range, grade_c_range, grade_d_range
FROM ANALYSIS
WHERE student_id = ?
ORDER BY analysis_date DESC LIMIT 1;
```

### Grade Calculation

```javascript
function generateAnalysisReport(score) {
  return {
    score: score,
    grade: getGrade(score),
    ranges: {
      excellent: { range: "80-100", count: score >= 80 ? 1 : 0 },
      good: { range: "60-79", count: score >= 60 && score < 80 ? 1 : 0 },
      average: { range: "40-59", count: score >= 40 && score < 60 ? 1 : 0 },
      poor: { range: "20-39", count: score >= 20 && score < 40 ? 1 : 0 },
    },
  };
}

function getGrade(score) {
  if (score >= 80) return "A - Excellent";
  if (score >= 60) return "B - Good";
  if (score >= 40) return "C - Average";
  if (score >= 20) return "D - Poor";
  return "F - Needs Improvement";
}
```

---

## 9. KEYWORDS MATCHING

### **Simple explanation:**

When you want to apply for a job, the system compares:

- **Your skills** (from your resume)
- **Required skills** (what the job needs)

Then it shows you:

- ✅ Which skills you have that match
- ❌ Which skills you're missing
- Percentage match (e.g., "You have 75% of required skills")

This helps you decide if you should apply for the job.

### Keyword Extraction & Matching

```javascript
// Extract keywords from resume and compare with job requirements

async function matchKeywords(resumeId, jobId) {
    const conn = await pool.getConnection();

    // Get resume keywords
    const [resumeKeywords] = await conn.query(`
        SELECT DISTINCT keyword FROM RESUME_PARSED_KEYWORD
        WHERE resume_id = ?
    `, [resumeId]);

    // Get job required skills
    const [jobSkills] = await conn.query(`
        SELECT DISTINCT skill_name FROM JOB_REQUIRED_SKILL
        WHERE job_id = ?
    `, [jobId]);

    // Calculate match percentage
    const resumeKeywordSet = new Set(
        resumeKeywords.map(r => r.keyword.toLowerCase())
    );

    const jobSkillSet = new Set(
        jobSkills.map(j => j.skill_name.toLowerCase())
    );

    // Find matching keywords
    const matchedKeywords = [...resumeKeywordSet].filter(k => jobSkillSet.has(k));

    const matchPercentage = (matchedKeywords.length / jobSkillSet.size) * 100;

    return {
        matched: matchedKeywords,
        missing: [...jobSkillSet].filter(s => !resumeKeywordSet.has(s)),
        matchPercentage: Math.round(matchPercentage)
    };
}

// SQL: Find matching keywords
SELECT
    rpk.keyword,
    CASE WHEN jrs.skill_name IS NOT NULL THEN 1 ELSE 0 END as is_match
FROM RESUME_PARSED_KEYWORD rpk
LEFT JOIN JOB_REQUIRED_SKILL jrs ON rpk.keyword = jrs.skill_name
    AND jrs.job_id = ?
WHERE rpk.resume_id = ?
ORDER BY is_match DESC;
```

### Skill Matching Dashboard

```javascript
// Display skill match to student
async function displayJobMatch(jobId) {
  const match = await api.post("/api/resume/match-job", {
    jobId,
    resumeId: currentResumeId,
  });

  const matchedEl = document.getElementById("matched-skills");
  const missingEl = document.getElementById("missing-skills");

  matchedEl.innerHTML = match.matched
    .map((k) => `<span class="match-badge">${k}</span>`)
    .join("");

  missingEl.innerHTML = match.missing
    .map((k) => `<span class="missing-badge">${k}</span>`)
    .join("");

  document.getElementById("match-percentage").textContent =
    `${match.matchPercentage}% Match`;
}
```

---

## 10. QUERIES EXPLORER - SQL COMMANDS & RESULTS

### **Simple explanation:**

Queries Explorer is a tool for admins to run custom SQL commands and see the results in a table. Think of it like writing questions about the database:

- "Show me all students who got placed"
- "How many applications did company X receive?"
- "What's the average salary offered?"

The system displays the results in an easy-to-read table.

### Implementation

```javascript
// js/admin/queries-explorer.js
// Admin feature to run custom SQL queries and see results

async function executeQuery(sqlQuery) {
  try {
    const response = await api.post("/api/admin/query-explorer", {
      query: sqlQuery,
    });

    displayQueryResults(response.results, response.columns);
  } catch (err) {
    showError("Query execution failed: " + err.message);
  }
}

function displayQueryResults(results, columns) {
  // Create dynamic table
  let html = '<table class="results-table"><thead><tr>';

  columns.forEach((col) => {
    html += `<th>${col}</th>`;
  });
  html += "</tr></thead><tbody>";

  results.forEach((row) => {
    html += "<tr>";
    columns.forEach((col) => {
      html += `<td>${row[col]}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";

  document.getElementById("query-results").innerHTML = html;
}
```

### Common Queries Available in Explorer

**Query 1: Student Placement Summary**

```sql
SELECT
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
```

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
```

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

### **1. Real-Time = Instant Updates**

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
