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

**7 Key Graphs:**

| Graph                      | Shows                                              | Insight                           |
| -------------------------- | -------------------------------------------------- | --------------------------------- |
| **Salary Distribution**    | < 5, 5-10, 10-20, > 20 LPA buckets                 | Average salary trends             |
| **Dept Placement %**       | Each dept's % of placements                        | CSE leads 84%, Civil 51%          |
| **Status Distribution**    | Applied/Under Review/Shortlisted/Selected/Rejected | Pipeline health                   |
| **Top Companies**          | Which companies hire most                          | Microsoft, Google, Amazon leaders |
| **Placement Trend**        | Monthly placements (6 months)                      | Hiring seasonality                |
| **Company Tier**           | Tier 1/2/3/4 distribution                          | Placement quality mix             |
| **Applications vs Offers** | Monthly apps & offers                              | Conversion rate (20% avg)         |

---

## 9️⃣ KEY INSIGHTS (AUTO-GENERATED)

**Example Insights Displayed:**

```
1. "Placement Rate ↑12% vs last month (from 76% → 88%)"
2. "CSE leads with 85% placement rate"
3. "Average package: ₹16.3 LPA"
4. "Highest package: ₹28.5 LPA (Google)"
5. "Microsoft hired 8 students (highest single company)"
6. "June had 45 applications but only 5 offers (11% conversion)"
7. "ECE department needs support (58% vs college avg 72%)"
```

**Backend Calculation:**

```javascript
// Real-time insights on SSE update
const insights = [
  `Placement Rate ↑${currentRate - prevRate}%`,
  `${topDept.name} leads with ${topDept.rate}%`,
  `Average package: ₹${avgSalary.toFixed(1)} LPA`,
  `Highest package: ₹${maxSalary} LPA (${topCompany.name})`,
  `${topCompany.name} hired ${topCompany.count} students`,
];
```

---

## ✅ VIVA CHECKLIST

- [ ] Real-time SSE mechanism (push) + 30s poll (fallback)
- [ ] Client-side filtering with 3 filters (status, branch, year)
- [ ] Progress bar: formula, CSS animation, shimmer effect
- [ ] Application status flow: coordinator → DB → trigger → SSE → student
- [ ] Student details: SQL JOINs with 5 tables
- [ ] Verified vs Pending: PLACEMENT_RECORD.status field
- [ ] Soft refresh: canvas recreation (~500ms total)
- [ ] 7 graphs with SQL sources
- [ ] Key insights auto-generated from analytics
- [ ] Database triggers for audit logging

---

## QUICK REFERENCE

**Key Files:**

```
js/coordinator/dashboard.js     → UI + filters + progress bar
js/coordinator/analytics.js     → Charts + real-time
server/routes/coordinator.js    → APIs + data queries
server/sse.js                   → Real-time broadcast
server/setup_triggers.js        → Database triggers
```

**Architects Elements:**

- **SSE Format:** `event: type\ndata: JSON\n\n`
- **Fallback Poll:** 30 seconds
- **Canvas Re-render:** ~300ms
- **Progress Bar Animation:** 1.5s cubic-bezier
- **Filter Response:** Instant (client-side)
- **KPI Update:** ~500ms (fetch + render)

Done! 🚀 **Condensed from 1194 lines to ~400 lines** - perfect for viva reference!
