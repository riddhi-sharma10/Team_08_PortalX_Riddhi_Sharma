# 🎯 COORDINATOR DASHBOARD - QUICK REFERENCE

## 📌 PROJECT OVERVIEW

**Coordinator Dashboard** - Real-time placement analytics with live charts, SSE updates, and background polling.

### 9 Core Questions Answered

| Question                    | Key Point                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| **Main Dashboard Charts**   | Placement Trend (bar), Company Tier (donut), Dept Placements (pie)                        |
| **Filter Working**          | Client-side filtering after server fetch, 3 filters (status, branch, year)                |
| **Progress Bar Real-Time**  | Formula: `(placed/total)*100`, animates 1.5s CSS transition with shimmer                  |
| **Status Changes**          | Coordinator update → DB → Trigger → SSE → Student sees instant update                     |
| **Student Details Source**  | SQL JOIN: STUDENT + DEPARTMENT + PLACEMENT_RECORD + COMPANY + APPLICATION                 |
| **Verified vs Pending**     | PLACEMENT_RECORD.status field: `confirmed`=verified, `pending`=pending                    |
| **Real-Time Graph Changes** | Soft refresh: canvas recreation + Chart.js re-render (~500ms)                             |
| **Graph Meanings**          | 7 graphs show: salary distribution, conversion rate, dept placement %, applications trend |
| **Key Insights**            | Auto-generated from analytics: placement %, avg salary, top companies, dept leaders       |

---

## 1️⃣ MAIN DASHBOARD - CHARTS & SSE REAL-TIME

**3 Key Charts:**

```
1. Placement Trend (Bar): Monthly placements (6 months)
2. Company Tier (Donut): Tier 1/2/3/4 company distribution
3. Dept Placements (Pie): Each dept's % of total placements
```

**Real-Time Flow:**

```
User Action → DB Update → Trigger → SSE event → Frontend updates (no refresh)
    ↓
Backend broadcasts: event 'sse:analytics_update'
Frontend listener: window.addEventListener("sse:analytics_update", refresh)
Fallback: 30-second background poll with setInterval
```

**Backend SSE Setup (server/sse.js):**

```javascript
const clients = new Map(); // userId → Set<Response>
export const notifyUser = (userId, type, payload) => {
  clients.get(userId).forEach((res) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
  });
};
```

**Frontend Listener (js/coordinator/dashboard.js):**

```javascript
window.addEventListener("sse:analytics_update", async () => {
  await fetchAnalytics(); // GET /coordinator/dashboard
  softRefreshCharts(); // Re-render only canvas, not full DOM
  updateKpis();
});
setInterval(() => softRefreshCharts(), 30000); // Fallback poll
```

---

## 2️⃣ FILTERING - HOW IT WORKS

**3 Filters Applied After Server Fetch:**

```javascript
// Load all records from server (200+ students)
const records = await api.get("/coordinator/dashboard");

// Apply filters CLIENT-SIDE (instant, no server call)
const filtered = records.filter(
  (r) =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (branchFilter === "all" || r.department === branchFilter) &&
    (yearFilter === "all" || r.graduation_yr === yearFilter),
);

// Pagination: 15 records per page
const pageRows = filtered.slice((page - 1) * 15, page * 15);
```

**Filter UI:**

```html
<select id="filter-status">
  <option value="all">All Status</option>
  <option value="placed">Placed</option>
  <option value="active">Active</option>
</select>

<select id="filter-branch">
  All Branches
</select>
<!-- Dynamically populated -->
<select id="filter-year">
  All Years
</select>
<!-- Dynamically populated -->
```

---

## 3️⃣ PROGRESS BAR - REAL-TIME ANIMATION

**Progress Bar Formula:**

```
percentage = (totalPlaced / totalStudents) * 100
Example: (42 / 150) * 100 = 28%
```

**Animation - CSS Transition:**

```css
width: 28%;
transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
background: linear-gradient(90deg, #1b3a6b, #3b82f6);
/* Shimmer effect overlays with skewX animation */
```

**Real-Time Update (js/coordinator/dashboard.js):**

```javascript
window.addEventListener("sse:analytics_update", async () => {
  const data = await api.get("/coordinator/dashboard");
  const percentage = (data.totalPlaced / data.totalStudents) * 100;

  // Smooth animation to new percentage (1.5s)
  progressDiv.style.width = `${percentage}%`;
  percentageText.textContent = `${percentage.toFixed(1)}%`;
});
```

**SQL Behind It:**

```sql
SELECT COUNT(*) as totalStudents
FROM STUDENT WHERE coord_id = ?;

SELECT COUNT(*) as totalPlaced
FROM STUDENT WHERE coord_id = ? AND profile_status = 'placed';
```

---

## 4️⃣ APPLICATION STATUS CHANGES

**Flow:**

```
Coordinator changes status (js/coordinator/applications.js)
    ↓
POST /coordinator/applications/{appId}/status {status: 'shortlisted'}
    ↓
Backend: UPDATE APPLICATION SET status='shortlisted'
    ↓
Trigger fires: trg_application_audit
    └─ INSERT into STATUS_AUDIT_LOG (audit trail)
    ↓
Server broadcasts: SSE to student "sse:status_changed"
    ↓
Student dashboard: Refreshes, updates stat cards & timeline
    └─ "Under Review: 3" → "Shortlisted: 4"
```

**Backend Code (server/routes/coordinator.js):**

```javascript
router.post("/applications/:appId/status", async (req, res) => {
  const { status } = req.body;

  // Update DB
  await pool.query("UPDATE APPLICATION SET status = ? WHERE app_id = ?", [
    status,
    appId,
  ]);

  // Trigger auto-fires: trg_application_audit
  // Notify student via SSE
  const [app] = await pool.query(
    "SELECT s_id FROM APPLICATION WHERE app_id = ?",
    [appId],
  );

  notifyUser(app[0].s_id, "sse:status_changed", {
    appId,
    status,
    message: `Status now ${status}`,
  });

  res.json({ message: "Updated" });
});
```

**Database Trigger (server/setup_triggers.js):**

```sql
CREATE TRIGGER trg_application_audit
AFTER UPDATE ON APPLICATION FOR EACH ROW BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO STATUS_AUDIT_LOG
        (app_id, old_status, new_status, changed_at)
        VALUES (OLD.app_id, OLD.status, NEW.status, NOW());
    END IF;
END;
```

**Student Dashboard Receives (js/student/dashboard.js):**

```javascript
window.addEventListener("sse:status_changed", async (e) => {
  const { status } = e.detail;
  const apps = await api.get("/applications");

  // Update stat cards
  stats.underReview = apps.filter((a) => a.status === "under_review").length;
  stats.shortlisted = apps.filter((a) => a.status === "shortlisted").length;

  updateStatCards(stats);
  renderRecentApplications(apps);
});
```

---

## 5️⃣ STUDENT DETAILS EXTRACTION

**Key SQL Query (server/routes/coordinator.js):**

```sql
SELECT s.s_name AS student, d.dept_name, c.comp_name,
       pr.salary_offered AS packageLpa, s.profile_status,
       s.graduation_yr
FROM STUDENT s
JOIN DEPARTMENT d ON s.dept_id = d.dept_id
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
LEFT JOIN COMPANY c ON pr.comp_id = c.comp_id
WHERE s.coord_id = ?
ORDER BY s.s_id DESC;
```

**Tables Used:**

- STUDENT: s_id, s_name, email, cgpa, graduation_yr, profile_status, coord_id
- DEPARTMENT: dept_name
- PLACEMENT_RECORD: salary_offered, recorded_on
- COMPANY: comp_name
- APPLICATION: status (for latest status)

---

## 6️⃣ VERIFIED vs PENDING PLACEMENTS

**PLACEMENT_RECORD Status Logic:**

```
pending   → Offer received, awaiting response
confirmed → Student accepted, placement locked
placed    → Official entry
rejected  → Declined/withdrawn

SQL Query:
SELECT pr.*, s.s_name, c.comp_name,
       CASE
           WHEN pr.status IN ('confirmed', 'placed') THEN 'VERIFIED'
           WHEN pr.status = 'pending' THEN 'PENDING'
       END AS verificationStatus
FROM PLACEMENT_RECORD pr
JOIN STUDENT s ON pr.s_id = s.s_id
JOIN COMPANY c ON pr.comp_id = c.comp_id
WHERE s.coord_id = ?;
```

**Real-Time Scenario:**

```
2:00 PM: Offer created → status='pending' → Shows in PENDING tab
2:15 PM: Student accepts → status='confirmed' → Moves to VERIFIED tab
         SSE: 'sse:placement_verified'
         VERIFIED (42) → VERIFIED (43)
         PENDING (5) → PENDING (4)
```

---

## 7️⃣ REAL-TIME GRAPH CHANGES

**Soft Refresh Mechanism (js/coordinator/analytics.js):**

```javascript
window.addEventListener("sse:analytics_update", async () => {
  const data = await api.get("/coordinator/analytics");
  softRefreshCharts(); // Canvas recreation + Chart.js re-render
});

// Soft refresh: recreate canvas, don't re-render DOM
function softRefreshCharts() {
  resetContainer("salaryChart", "300px");
  resetContainer("pieChart", "300px");
  renderAllCharts(); // Re-create all Chart.js instances
}
```

**Total Time:** ~500ms (200ms fetch + 300ms re-render)

---

## 8️⃣ GRAPH MEANINGS & INSIGHTS

```
Signifies:
  - Range of compensation packages
  - Entry-level vs premium packages
  - Average package trends

Example Output:
  < 5 LPA:    12 students (10%)  ← Entry level
  5-10 LPA:   28 students (23%)  ← Most common
  10-20 LPA:  30 students (24%)  ← Good packages
  > 20 LPA:   55 students (43%)  ← Premium packages

Key Insight:
  "43% of students got > 20 LPA packages.
   Average across all tiers: 16.2 LPA"

Use Case:
  - Marketing to students: "43% of our graduates earn > 20 LPA"
  - Benchmarking against other colleges
  - Understanding budget requirements for living costs
```

### **E. Placement % by Department (Pie/Bar Chart)**

```
Signifies:
  - Which departments have better placement records
  - Performance comparison across departments
  - Areas needing improvement

Example Output:
  CSE:        42 placed / 50 total = 84%
  ECE:        30 placed / 45 total = 67%
  Mechanical: 22 placed / 40 total = 55%
  Civil:      18 placed / 35 total = 51%

Key Insight:
  "CSE department leads with 84% placement rate,
   while Civil needs improvement at 51%"

Use Case:
  - Identify struggling departments
  - Allocate extra coordinator resources
  - Provide department-specific support
  - Marketing: "Our CSE program has 84% placement"
```

### **F. Top Recruiting Companies (Bar Chart)**

```
Signifies:
  - Which companies hire most from college
  - Industry relationships
  - Repeat hiring patterns

Example Output:
  Google:     12 offers
  Microsoft:  10 offers
  Amazon:     8 offers
  TCS:        7 offers
  Cognizant:  6 offers

Key Insight:
  "Google is our biggest recruiter with 12 offers.
   Top 5 companies account for 43 placements (34% of total)"

Use Case:
  - Strengthen relationship with top companies
  - Negotiate higher packages with repeat recruiters
  - Target students for companies they are likely to join
```

### **G. Application Status Distribution (Pie Chart)**

```
Signifies:
  - Current state of all applications in pipeline
  - Bottlenecks in recruitment process

Example Output:
  Applied:      20 applications (12%)
  Under Review: 45 applications (27%)
  Shortlisted:  35 applications (21%)
  Selected:     50 applications (30%)
  Rejected:     18 applications (10%)

Key Insight:
  "30% of applications resulted in selection.
   Most bottleneck: 27% stuck in 'Under Review' stage"

Use Case:
  - Identify slow review times (push companies)
  - Calculate conversion rates at each stage
  - Monitor pipeline health
```

---

## **9️⃣ KEY INSIGHTS - WHAT THE SYSTEM PROVIDES**

### **A. Automated Key Insights Feature**

**File:** `js/coordinator/analytics.js` (line ~130)

```javascript
// Backend generates insights
const insights = [
  "Your students' average package increased by 12% this month.",
  "CSE department leads with 84% placement rate.",
  "Google and Microsoft are your top recruiters (22 placements combined).",
  "50 applications are still pending review from companies.",
  "Peak hiring was in April with 25 placements.",
];

// Frontend displays
function renderInsights(insightsList) {
  const container = document.getElementById("analytics-insights");
  container.innerHTML = insightsList
    .map((insight) => `<li>${insight}</li>`)
    .join("");
}
```

### **B. Key Insight Examples & Business Value**

```
1. Trend Insights
   "Placement rate increased from 28% → 31% in past month"
   → Action: Celebrate progress, continue momentum

2. Department Insights
   "ECE department has 0 placements this quarter"
   → Action: Allocate extra coordinator support to ECE

3. Company Insights
   "Microsoft is hiring 3x more than average company"
   → Action: Schedule more mock interviews for MS prep

4. Package Insights
   "Average package: ₹16.2 LPA, highest: ₹28 LPA"
   → Action: Market as "average 16+ LPA" in prospectus

5. Pipeline Insights
   "45 applications stuck in 'Under Review' for >5 days"
   → Action: Follow up with companies on delays

6. Bottleneck Insights
   "Only 20% of applications convert to selection"
   → Action: Improve ATS scoring or interview prep
```

### **C. Real-Time Key Insights Update**

```
When a Student Gets Selected:
  ├─ PLACEMENT_RECORD created
  ├─ Server calculates new insights
  ├─ Broadcasts: 'sse:analytics_update'
  ├─ Frontend fetches /coordinator/analytics
  ├─ Gets updated insights array
  └─ UI updates insights panel

New Insights Appear:
  ├─ "Your students' average package: ₹16.3 LPA (was 16.2)"
  ├─ "Selected applications: 51 (was 50)"
  └─ "Placement rate: 31.8% (was 31.6%)"
```

---

## **🎬 COMPLETE REAL-TIME FLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────────┐
│                  COORDINATOR DASHBOARD ECOSYSTEM                 │
└─────────────────────────────────────────────────────────────────┘

EVENT: Student Accepts Offer from Microsoft
  ↓
DATABASE LAYER:
  ├─ UPDATE STUDENT SET profile_status = 'placed'
  ├─ UPDATE APPLICATION SET status = 'selected'
  ├─ INSERT PLACEMENT_RECORD (salary, company, date)
  └─ Trigger: trg_application_audit fires
      └─ INSERT STATUS_AUDIT_LOG
  ↓
SERVER LAYER:
  ├─ Validates all business rules
  ├─ Calculates new KPIs
  ├─ Emits SSE events:
  │   ├─ event: 'sse:analytics_update' → All coordinators
  │   ├─ event: 'sse:status_changed' → Student
  │   └─ event: 'sse:placement_verified' → Coordinator
  ↓
FRONTEND (COORDINATOR DASHBOARD):
  ├─ Receives 'sse:analytics_update' event
  ├─ Calls: GET /coordinator/dashboard
  ├─ Updates:
  │   ├─ KPI Card: "Total Placed: 42 → 43"
  │   ├─ Progress Bar: "28.0% → 28.7%" (smooth animation)
  │   ├─ Bar Chart: May placements increased
  │   ├─ Stats Table: New row appears with ✓ status
  │   ├─ Key Insights: "Average package ↑ to 16.3 LPA"
  │   └─ Timestamp: "(updated 3:05:47 PM)"
  ↓
COORDINATOR SEES:
  "Microsoft placement count increased!"
  Progress bar smoothly animates upward ✓
```

---

## **SUMMARY TABLE**

| Component         | Real-Time?     | Update Interval | Data Source  | Visual Effect    |
| ----------------- | -------------- | --------------- | ------------ | ---------------- |
| **Progress Bar**  | ✓ SSE          | 30s backup      | `/dashboard` | Smooth animation |
| **KPI Cards**     | ✓ SSE          | 30s backup      | `/dashboard` | Numbers update   |
| **Charts**        | ✓ SSE          | 30s backup      | `/analytics` | Canvas re-render |
| **Records Table** | ✓ Local filter | Immediate       | Frontend     | Table refresh    |
| **Status Badges** | ✓ SSE          | On change       | Database     | Tag color change |
| **Key Insights**  | ✓ SSE          | On change       | `/analytics` | List update      |
| **Filters**       | ✗ Local        | Immediate       | Frontend     | Table filter     |
| **Recent Apps**   | ✓ SSE          | 30s backup      | API          | Feed update      |

---

## **QUICK REFERENCE - KEY FILES**

```
Dashboard Implementation:
  ├─ js/coordinator/dashboard.js          (UI + filters + progress bar)
  ├─ js/coordinator/analytics.js          (Charts + real-time)
  ├─ server/routes/coordinator.js         (APIs + data queries)
  ├─ server/sse.js                        (Real-time event broadcast)
  └─ server/setup_triggers.js             (Database triggers)

Student Dashboard Integration:
  ├─ js/student/dashboard.js              (Receives status updates)
  └─ js/student/applications.js           (Shows application history)

Database Schema:
  ├─ STUDENT                              (Student records)
  ├─ APPLICATION                          (Job applications)
  ├─ PLACEMENT_RECORD                     (Final placements)
  ├─ OFFER                                (Offers)
  ├─ STATUS_AUDIT_LOG                     (Trigger audit trail)
  └─ COMPANY, JOB_PROFILE, DEPARTMENT    (Master data)
```

This architecture ensures **real-time synchronization**, **data consistency**, and **user experience** across all dashboards! 🚀
