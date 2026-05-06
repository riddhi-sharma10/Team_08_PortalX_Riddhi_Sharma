# Graph & Chart Creation in Our Project

## Complete Implementation Guide - How Charts Are Generated and Displayed

---

## QUICK ANSWER

**Library Used:** **Chart.js** (NOT imported via npm, but via CDN)

**Location:** `index.html` line 15

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

**Implementation File:** `js/coordinator/analytics.js` (500+ lines)

---

## 1. CHART.JS LIBRARY - What It Is

### What is Chart.js?

Chart.js is a popular JavaScript library for creating **beautiful, responsive charts** without any coding complexity.

**Why we use it:**

- ✓ Easy to use
- ✓ Works in all browsers
- ✓ Responsive (scales to screen size)
- ✓ No npm dependency needed (CDN-based)
- ✓ Free and open-source

### Installation Method: CDN (Not npm)

**In `index.html`:**

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- ... other head content ... -->

    <!-- Chart.js & Plugins -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```

**Why CDN instead of npm?**

- Faster loading (don't need npm install)
- Works immediately (no build process)
- One-liner setup
- No conflicts with other dependencies

---

## 2. HOW CHARTS ARE CREATED IN OUR PROJECT

### Basic Chart Creation Pattern

**File:** `js/coordinator/analytics.js`

```javascript
// Step 1: Get the canvas element
const canvas = document.getElementById("salaryChart");

// Step 2: Create Chart object
const chart = new Chart(canvas, {
  type: "doughnut", // Chart type
  data: {
    labels: ["< 5 LPA", "5–10 LPA", "10–20 LPA", "> 20 LPA"],
    datasets: [
      {
        data: [15, 45, 120, 60], // Values
        backgroundColor: ["#7B8CA5", "#1B3A6B", "#F5A623", "#10b981"], // Colors
        borderColor: "#ffffff",
        borderWidth: 3,
      },
    ],
  },
  options: {
    cutout: "52%", // Makes it doughnut (not pie)
    responsive: true, // Scales to container
    plugins: {
      legend: { position: "bottom" },
    },
  },
});
```

---

## 3. ALL CHARTS IN OUR PROJECT

### Chart 1: Salary Distribution (Doughnut Chart)

**Purpose:** Show breakdown of salary ranges

**Location:** `js/coordinator/analytics.js` lines 302-320

```javascript
function renderSalaryChart(data) {
  const canvas = document.getElementById("salaryChart");

  analyticsState.charts.salary = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["< 5 LPA", "5–10 LPA", "10–20 LPA", "> 20 LPA"],
      datasets: [
        {
          data: data.salaryDistribution, // [15, 45, 120, 60]
          backgroundColor: ["#7B8CA5", "#1B3A6B", "#F5A623", "#10b981"],
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 8, // Enlarge on hover
        },
      ],
    },
    options: {
      cutout: "52%", // Hollow center
      responsive: true,
      plugins: { legend: { position: "bottom" } },
    },
  });
}
```

**Visual Result:**

```
         < 5 LPA (15)
            ╱────╲
         ╱─        ─╲
        │   [52%   │  5-10 LPA (45)
        │    hole] │
         ╲─        ─╱
            ╲────╱
      > 20 LPA    10-20 LPA
```

---

### Chart 2: Department Placement % (Pie Chart)

**Purpose:** Show which department has highest placements

**Location:** `js/coordinator/analytics.js` lines 322-343

```javascript
function renderDeptChart(data) {
  const canvas = document.getElementById("pieChart");

  analyticsState.charts.dept = new Chart(canvas, {
    type: "pie",
    data: {
      labels: data.departments.map((d) => d.name), // IT, Mechanical, Civil
      datasets: [
        {
          data: data.departments.map((d) => d.placedCount), // [50, 25, 15]
          backgroundColor: ["#1B3A6B", "#355C91", "#7B8CA5"],
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
    },
  });
}
```

**Visual Result:**

```
        ┌─────────────┐
        │   IT (50)   │
        │  ╱────────╲ │
        │ ╱          ╲│
        ││  Mechanical   │
        ││    (25)      │
        │ ╲   Civil     ╱
        │  ╲   (15)   ╱
        └─────────────┘
```

---

### Chart 3: Application Status (Doughnut Chart)

**Purpose:** Show how many applications are Selected, Shortlisted, Rejected

**Location:** `js/coordinator/analytics.js` lines 345-368

```javascript
function renderStatusChart(data) {
  const canvas = document.getElementById("statusChart");
  const rows = data.appStatusDist; // [{status: 'selected', count: 50}, ...]

  analyticsState.charts.status = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: rows.map((d) => d.status.replace(/_/g, " ")), // Selected, Shortlisted, etc
      datasets: [
        {
          data: rows.map((d) => d.count), // [50, 25, 10]
          backgroundColor: ["#10b981", "#3b82f6", "#ef4444"], // Green, Blue, Red
          borderColor: "#ffffff",
          borderWidth: 3,
        },
      ],
    },
    options: {
      cutout: "60%",
      responsive: true,
      plugins: { legend: { position: "right" } },
    },
  });
}
```

**Color Mapping:**

- ✓ Selected = Green (#10b981)
- ⊘ Shortlisted = Blue (#3b82f6)
- ✗ Rejected = Red (#ef4444)

---

### Chart 4: Top Companies (Bar Chart)

**Purpose:** Show which companies hired the most students

**Location:** `js/coordinator/analytics.js` lines 370-388

```javascript
function renderTopCompaniesChart(data) {
  const canvas = document.getElementById("topCompaniesChart");

  analyticsState.charts.topCompanies = new Chart(canvas, {
    type: "bar",
    data: {
      labels: data.topCompanies.map((d) => d.name), // Google, Amazon, Microsoft
      datasets: [
        {
          label: "Placements",
          data: data.topCompanies.map((d) => d.count), // [50, 45, 40]
          backgroundColor: "#1B3A6B",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { grid: { display: false } },
      },
      plugins: { legend: { display: false } },
    },
  });
}
```

**Visual Result:**

```
Placements
    50 ┤
       │  ┌─────┐
    45 ├  │     │  ┌─────┐
       │  │     │  │     │  ┌─────┐
    40 ├  │     │  │     │  │     │
       │  │     │  │     │  │     │
       └──┴─────┴──┴─────┴──┴─────┴──
         Google Amazon Microsoft
```

---

### Chart 5: Trend Chart (Line Graph)

**Purpose:** Show applications and offers over time (monthly)

**Location:** `js/coordinator/analytics.js` lines 390-425

```javascript
function renderTrendChart(data) {
  const canvas = document.getElementById("trendChart");

  analyticsState.charts.trend = new Chart(canvas, {
    type: "line",
    data: {
      labels: data.monthLabels, // ["Jan", "Feb", "Mar", ...]
      datasets: [
        {
          label: "Applications",
          data: data.monthlyApplications, // [50, 60, 75, ...]
          borderColor: "#1B3A6B",
          backgroundColor: "rgba(27,58,107,.08)",
          fill: true,
          tension: 0.35, // Smooth curve
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: "#1B3A6B",
        },
        {
          label: "Offers / Placements",
          data: data.monthlyOffers, // [30, 35, 45, ...]
          borderColor: "#F5A623",
          backgroundColor: "rgba(245,166,35,.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: "#F5A623",
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { intersect: false, mode: "index" },
      scales: {
        y: { grid: { color: "#edf2f7" } },
        x: { grid: { display: false } },
      },
      plugins: { legend: { position: "top", align: "end" } },
    },
  });
}
```

**Visual Result:**

```
Count
    │
 75 │         Applications
    │        ╱╲      ╱╲
 60 │       ╱  ╲    ╱  ╲
    │      ╱    ╲  ╱    ╲
 45 │     ╱      ╲╱      ╲
    │    ╱       Offers
 30 │   ╱╲      ╱╲      ╱╲
    │  ╱  ╲    ╱  ╲    ╱  ╲
    └─────────────────────────
     Jan Feb Mar Apr May Jun
```

---

## 4. COMPLETE DATA FLOW

### How Data Flows from Database to Chart

```
┌─────────────────────────────────────────────────┐
│ 1. BACKEND: MySQL Database                      │
│   SELECT COUNT(*) FROM PLACEMENT_RECORD         │
│   WHERE salary BETWEEN 5 AND 10;                │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 2. NODE.JS API (server/routes/analytics.js)     │
│   Returns JSON: {                               │
│     salaryDistribution: [15, 45, 120, 60],      │
│     departments: [{name: 'IT', placedCount: 50}│
│   }                                              │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 3. FRONTEND API CALL (js/coordinator/analytics)│
│   await api.get('/coordinator/analytics')       │
│   Response: analyticsData = {...}               │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 4. CHART RENDERING                              │
│   new Chart(canvas, {                           │
│     data: analyticsData.salaryDistribution,     │
│   })                                             │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ 5. BROWSER DISPLAY                              │
│   Beautiful doughnut chart on screen!           │
└─────────────────────────────────────────────────┘
```

---

## 5. REAL-TIME CHART UPDATES (SSE Integration)

### How Charts Update Without Page Refresh

**File:** `js/coordinator/analytics.js` lines 196-220

```javascript
function startRealTimeSync() {
  // When server sends real-time notification
  window.addEventListener("sse:analytics_update", async () => {
    console.log("Real-time update received");

    // Fetch fresh data from server
    await fetchAnalytics();

    // Soft refresh - delete old canvas and redraw
    softRefreshCharts();
  });

  // Also background poll every 30 seconds as safety net
  setInterval(async () => {
    await fetchAnalytics();
    softRefreshCharts();
  }, 30000);
}
```

### Soft Refresh Process

```javascript
function softRefreshCharts() {
  // Step 1: Reset canvas elements (remove old charts)
  resetContainer("salaryChartContainer", "salaryChart", "300px");
  resetContainer("pieChartContainer", "pieChart", "300px");
  // ... other containers

  // Step 2: Destroy old Chart.js instances
  destroyCharts();

  // Step 3: Render new charts with fresh data
  renderAllCharts();
}

function resetContainer(containerId, canvasId, maxHeight) {
  const el = document.getElementById(containerId);
  if (el) {
    // Create brand new canvas element
    el.innerHTML = `<canvas id="${canvasId}" style="max-height:${maxHeight};"></canvas>`;
  }
}

function destroyCharts() {
  // Destroy all Chart.js instances
  Object.values(analyticsState.charts).forEach((chart) => {
    if (chart) chart.destroy(); // Clean up memory
  });
}
```

---

## 6. CHART CONFIGURATION OPTIONS

### Common Options Across All Charts

```javascript
{
    type: "doughnut",  // or "pie", "bar", "line", "area"
    data: {
        labels: ["Label1", "Label2", ...],  // X-axis labels
        datasets: [{
            data: [10, 20, 30],  // Values
            backgroundColor: ["#color1", "#color2"],  // Fill colors
            borderColor: "#fff",  // Outline
            borderWidth: 2
        }]
    },
    options: {
        responsive: true,      // Scale to container
        interaction: {
            intersect: false,  // Don't require hovering exactly on point
            mode: "index"
        },
        scales: {
            y: { beginAtZero: true },  // Start Y-axis at 0
            x: { grid: { display: false } }
        },
        plugins: {
            legend: {
                position: "bottom",  // Legend location
                display: true
            }
        }
    }
}
```

---

## 7. COLOR SCHEME USED

### Coordinator Dashboard Colors

```javascript
// Blue theme
"#1B3A6B"; // Dark blue (primary)
"#355C91"; // Medium blue
"#7B8CA5"; // Light blue

// Accent colors
"#F5A623"; // Orange (salary/offers)
"#10b981"; // Green (success/selected)
"#ef4444"; // Red (rejected/alert)
"#3b82f6"; // Blue (shortlisted)
```

---

## 8. HTML STRUCTURE

**File:** `index.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Load Chart.js from CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="coordinator.css" />
  </head>
  <body>
    <!-- Container for salary chart -->
    <div id="salaryChartContainer">
      <canvas id="salaryChart"></canvas>
    </div>

    <!-- Container for pie chart -->
    <div id="pieChartContainer">
      <canvas id="pieChart"></canvas>
    </div>

    <!-- Container for bar chart -->
    <div id="topCompaniesContainer">
      <canvas id="topCompaniesChart"></canvas>
    </div>

    <!-- Container for line chart -->
    <div id="trendChartContainer">
      <canvas id="trendChart"></canvas>
    </div>

    <script src="js/coordinator/analytics.js"></script>
  </body>
</html>
```

---

## 9. CHART TYPES SUPPORTED

| Type         | Usage                       | Example                               |
| ------------ | --------------------------- | ------------------------------------- |
| **doughnut** | Proportions, percentages    | Salary distribution, status breakdown |
| **pie**      | Part-to-whole relationships | Department placements                 |
| **bar**      | Comparisons                 | Top companies                         |
| **line**     | Trends over time            | Monthly applications/offers           |
| **area**     | Cumulative change           | (Not used in current project)         |

---

## 10. ERROR HANDLING

### What Happens if No Data?

**File:** `js/coordinator/analytics.js` lines 296-300

```javascript
function getEmptyState(msg = "No data available") {
    return `
        <div style="display:flex;flex-direction:column;align-items:center;...">
            <ion-icon name="document-text-outline"></ion-icon>
            <p>${msg}</p>
        </div>
    `;
}

function renderSalaryChart(data) {
    const dist = data.salaryDistribution || [];

    // If all values are 0, show empty state instead of blank chart
    if (!dist.some(v => v > 0)) {
        container.innerHTML = getEmptyState('No salary data recorded yet');
        return;
    }

    // Otherwise render chart normally
    const canvas = document.getElementById("salaryChart");
    new Chart(canvas, {...});
}
```

---

## SUMMARY

| Aspect           | Details                               |
| ---------------- | ------------------------------------- |
| **Library**      | Chart.js                              |
| **Installation** | CDN (not npm)                         |
| **CDN URL**      | https://cdn.jsdelivr.net/npm/chart.js |
| **File**         | js/coordinator/analytics.js           |
| **Charts**       | 5 types (doughnut, pie, bar, line)    |
| **Real-Time**    | SSE + 30s polling                     |
| **Colors**       | Blue theme with accents               |
| **Responsive**   | Yes (automatic scaling)               |
| **Empty States** | Handled with custom message           |

---

## CODE SNIPPET TO COPY

Quick reference to create your own chart:

```javascript
// 1. Get canvas element
const canvas = document.getElementById("myChart");

// 2. Create chart
const myChart = new Chart(canvas, {
  type: "bar", // Change to "line", "pie", "doughnut" as needed
  data: {
    labels: ["Option A", "Option B", "Option C"],
    datasets: [
      {
        label: "Count",
        data: [12, 19, 3],
        backgroundColor: ["#1B3A6B", "#F5A623", "#10b981"],
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: "top" },
    },
  },
});
```

---

**End of Document**
