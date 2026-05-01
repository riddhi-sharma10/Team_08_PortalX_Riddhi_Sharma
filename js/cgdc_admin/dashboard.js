// js/cgdc_admin/dashboard.js
// Rebuilt from scratch — 100% synced to GET /admin/dashboard API
import { api } from "../api.js";

/*──────────────────────────────────────────────
  STATE — mirrors the exact shape returned by
  server/routes/admin.js → router.get('/dashboard')
──────────────────────────────────────────────*/
let data = {
  stats: [],
  trend: { labels: [], placements: [] },
  tiers: [],
  departments: [],
  topCompanies: [],
  records: [],
};

let statusFilter = "all";

/*──────────────────────────────────────────────
  ENTRY POINT
──────────────────────────────────────────────*/
export async function render(container, app) {
  // Loading state
  container.innerHTML = `
        <div class="admin-dashboard-shell" style="display:flex;align-items:center;justify-content:center;min-height:400px;">
            <div style="text-align:center;color:var(--text-muted);">
                <ion-icon name="hourglass-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px;"></ion-icon>
                <p>Loading dashboard data from database…</p>
            </div>
        </div>
    `;

  // Fetch live data from MySQL via the backend API
  try {
    const live = await api.get("/admin/dashboard");
    data = {
      stats: live.stats || [],
      trend: live.trend || { labels: [], placements: [] },
      tiers: live.tiers || [],
      departments: live.departments || [],
      topCompanies: live.topCompanies || [],
      records: live.records || [],
    };
  } catch (err) {
    console.error("Dashboard fetch failed:", err);
    container.innerHTML = `
            <div style="padding:40px;text-align:center;color:var(--text-muted);">
                <h2>Failed to load Dashboard</h2>
                <p>Restart the backend server (<code>Ctrl+C</code> → <code>npm start</code>) to apply fixes.</p>
                <p style="margin-top:10px;font-size:0.85rem;"><code>${err.message}</code></p>
            </div>
        `;
    return;
  }

  // Build the page
  try {
    renderShell(container);
    populateRecordsTable();
    drawCharts();
    wireEvents(app);
  } catch (renderErr) {
    console.error("Dashboard render crash:", renderErr);
    container.innerHTML = `<div style="color:red;padding:2rem;"><h1>Render Error</h1><pre>${renderErr.stack}</pre></div>`;
  }
}

/*──────────────────────────────────────────────
  SHELL — static HTML skeleton
  Every piece of data comes from the `data`
  object populated above from the API
──────────────────────────────────────────────*/
function renderShell(container) {
  const tierTotal = data.tiers.reduce((s, t) => s + Number(t.value), 0);

  container.innerHTML = `
        <div class="admin-dashboard-shell">

            <!-- Header -->
            <div class="admin-dashboard-header">
                <div>
                    <h1>Placement Overview</h1>
                    <p>Real-time statistics synced from the placement database</p>
                </div>
            </div>

            <!-- KPI Stat Cards -->
            <div class="admin-stat-grid">
                ${data.stats.map(statCardHTML).join("")}
            </div>

            <!-- Charts Row: Trend + Tier Donut -->
            <div class="admin-grid-two">
                <div class="card">
                    <div class="admin-card-head">
                        <h3>Placement Trend</h3>
                        <span>Monthly placements (${data.trend.labels.join(", ") || "no data"})</span>
                    </div>
                    <canvas id="dash-trend-chart" class="admin-chart"></canvas>
                </div>

                <div class="card">
                    <div class="admin-card-head">
                        <h3>Company Tiers</h3>
                        <span>${fmt(tierTotal)} total companies</span>
                    </div>
                    <div class="admin-tier-chart-wrap">
                        <canvas id="dash-tier-chart" class="admin-chart admin-chart-sm"></canvas>
                        <div class="admin-tier-center">
                            <strong>${fmt(tierTotal)}</strong>
                            <span>Total</span>
                        </div>
                    </div>
                    <div class="admin-tier-list">
                        ${data.tiers
                          .map((t) => {
                            return `
                                <div class="admin-tier-item">
                                    <span><i style="background:${t.color}"></i>${t.label}</span>
                                    <strong>${t.value}</strong>
                                </div>
                            `;
                          })
                          .join("")}
                    </div>
                </div>
            </div>

            <!-- Department + Top Companies -->
            <div class="admin-grid-two admin-grid-balance">
                <div class="card">
                    <div class="admin-card-head">
                        <h3>Department Placements</h3>
                        <span>Unique students placed by department</span>
                    </div>
                    <div class="admin-dept-list">
                        ${deptRowsHTML()}
                    </div>
                </div>

                <div class="card">
                    <div class="admin-card-head admin-card-head-inline">
                        <div>
                            <h3>Top 5 Hiring Companies</h3>
                            <span>By offers rolled out this cycle</span>
                        </div>
                        <button id="dash-view-all-cos" class="admin-link-btn" type="button">View All</button>
                    </div>
                    <div class="admin-company-list">
                        ${data.topCompanies.map(companyItemHTML).join("")}
                    </div>
                </div>
            </div>

            <!-- Recent Records Table -->
            <div class="card">
                <div class="admin-card-head admin-card-head-inline">
                    <div>
                        <h3>Recent Placement Records</h3>
                        <span>Latest 50 outcomes from the APPLICATION table</span>
                    </div>
                    <div class="admin-table-actions">
                        <div class="admin-filter-wrap">
                            <button id="dash-filter-btn" class="admin-user-action" type="button">
                                <ion-icon name="funnel-outline"></ion-icon> Filter
                            </button>
                            <div id="dash-filter-panel" class="admin-filter-panel hidden" style="width:210px;">
                                <div class="admin-filter-title">Record Status</div>
                                <div class="admin-filter-grid">
                                    <label>
                                        <span>Status</span>
                                        <select id="dash-filter-select">
                                            <option value="all">All</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="placed">Placed</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="admin-filter-actions">
                                    <button id="dash-apply-filter" class="btn-primary" type="button">Apply</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="data-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Department</th>
                                <th>Company</th>
                                <th>Package (LPA)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="dash-records-body"></tbody>
                    </table>
                </div>
            </div>

        </div>
    `;
}

/*──────────────────────────────────────────────
  STAT CARD
  Maps exactly to the stat objects built in
  admin.js lines 89-98
──────────────────────────────────────────────*/
function statCardHTML(s) {
  const val = typeof s.value === "number" ? fmt(s.value) : s.value;
  const noteClass =
    s.noteType === "highlight"
      ? "admin-note-highlight"
      : s.noteType === "active"
        ? "admin-note-active"
        : "admin-note-neutral";
  return `
        <div class="card admin-stat-card ${s.noteType === "highlight" ? "admin-stat-card-highlight" : ""}">
            <div class="admin-stat-top">
                <div class="admin-stat-icon">
                    <ion-icon name="${s.icon}"></ion-icon>
                </div>
                ${s.note ? `<span class="${noteClass}">${s.note}</span>` : ""}
            </div>
            <div class="admin-stat-meta">
                <p>${s.label}</p>
                <h2>${val}</h2>
            </div>
        </div>
    `;
}

/*──────────────────────────────────────────────
  DEPARTMENT ROWS
  Maps to: { name, placed }
──────────────────────────────────────────────*/
function deptRowsHTML() {
  if (!data.departments.length)
    return '<p style="color:var(--text-muted);font-size:0.85rem;">No placement data yet.</p>';
  const max = Math.max(...data.departments.map((d) => Number(d.placed || 0)));
  return data.departments
    .map((d) => {
      const placed = Number(d.placed || 0);
      const pct = max > 0 ? Math.round((placed / max) * 100) : 0;
      return `
            <div class="admin-dept-row">
                <div class="admin-dept-top">
                    <strong>${d.name}</strong>
                    <span>${fmt(placed)}</span>
                </div>
                <div class="admin-dept-track">
                    <div style="width:${pct}%"></div>
                </div>
            </div>
        `;
    })
    .join("");
}

/*──────────────────────────────────────────────
  TOP COMPANY ITEM
  Maps to: { name, industry, offers }
──────────────────────────────────────────────*/
function companyItemHTML(c) {
  const name = c.name || "Unknown";
  return `
        <div class="admin-company-item">
            <div class="admin-company-avatar">${name.charAt(0).toUpperCase()}</div>
            <div>
                <strong>${name}</strong>
                <p>${c.industry || "General"}</p>
            </div>
            <div class="admin-company-offers">
                <strong>${Number(c.offers || 0)}</strong>
                <span>offers</span>
            </div>
        </div>
    `;
}

/*──────────────────────────────────────────────
  RECORDS TABLE
  Maps to: { initials, student, department,
             company, packageLpa, status }

  status comes back normalised from the backend
  as: 'placed' | 'in-progress' | 'rejected'
──────────────────────────────────────────────*/
function populateRecordsTable() {
  const tbody = document.getElementById("dash-records-body");
  if (!tbody) return;

  const rows =
    statusFilter === "all"
      ? data.records
      : data.records.filter((r) => r.status === statusFilter);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No records match the selected filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `
        <tr>
            <td>
                <div class="admin-student-cell">
                    <span class="admin-student-initials">${r.initials}</span>
                    <span>${r.student}</span>
                </div>
            </td>
            <td>${r.department}</td>
            <td>${r.company}</td>
            <td>${Number(r.packageLpa).toFixed(1)}</td>
            <td><span class="tag ${statusTag(r.status)}">${statusLabel(r.status)}</span></td>
        </tr>
    `,
    )
    .join("");
}

/*──────────────────────────────────────────────
  CHARTS — Chart.js (loaded from CDN in HTML)
  Trend: bar chart   → data.trend.labels / placements
  Tier:  doughnut    → data.tiers.label / value / color
──────────────────────────────────────────────*/
function drawCharts() {
  // Bar chart — Placement Trend
  const trendEl = document.getElementById("dash-trend-chart");
  if (trendEl && data.trend.labels.length) {
    new Chart(trendEl, {
      type: "bar",
      data: {
        labels: data.trend.labels,
        datasets: [
          {
            label: "Placements",
            data: data.trend.placements,
            backgroundColor: [
              "#7B8CA5",
              "#A0B0C4",
              "#1B3A6B",
              "#2c5282",
              "#F5A623",
              "#10b981",
            ],
            borderRadius: 8,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
            borderWidth: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        layout: { padding: { top: 10 } },
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "end",
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { weight: "600", size: 12 },
              color: "#1e293b",
            },
          },
          datalabels: {
            color: "#1e293b",
            anchor: "end",
            align: "end",
            offset: 8,
            font: { weight: "800", size: 12 },
            formatter: (value) => (value > 0 ? value : ""),
            display: function (context) {
              return context.dataset.data[context.dataIndex] > 0;
            },
          },
          tooltip: {
            backgroundColor: "#0f2f61",
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 13, weight: "700" },
            bodyFont: { size: 13 },
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
          },
        },
        scales: {
          y: {
            grid: { color: "#eef2f7", drawBorder: false },
            beginAtZero: true,
            ticks: { color: "#64748b", font: { weight: "500" } },
            border: { display: false },
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: "#64748b", font: { weight: "500" } },
            border: { display: false },
          },
        },
      },
    });
  }

  // Doughnut — Company Tiers
  const tierEl = document.getElementById("dash-tier-chart");
  if (tierEl && data.tiers.length) {
    new Chart(tierEl, {
      type: "doughnut",
      data: {
        labels: data.tiers.map((t) => t.label),
        datasets: [
          {
            data: data.tiers.map((t) => t.value),
            backgroundColor: data.tiers.map((t) => t.color),
            borderColor: "#ffffff",
            borderWidth: 2,
            hoverBorderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0f2f61",
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 13, weight: "700" },
            bodyFont: { size: 13 },
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
          },
        },
      },
    });
  }
}

/*──────────────────────────────────────────────
  EVENT WIRING
──────────────────────────────────────────────*/
function wireEvents(app) {
  const filterBtn = document.getElementById("dash-filter-btn");
  const filterPanel = document.getElementById("dash-filter-panel");
  const filterSel = document.getElementById("dash-filter-select");
  const applyBtn = document.getElementById("dash-apply-filter");
  const viewAllBtn = document.getElementById("dash-view-all-cos");

  filterBtn?.addEventListener("click", () => {
    if (filterSel) filterSel.value = statusFilter;
    filterPanel?.classList.toggle("hidden");
  });

  applyBtn?.addEventListener("click", () => {
    statusFilter = filterSel?.value || "all";
    filterPanel?.classList.add("hidden");
    populateRecordsTable();
  });

  document.addEventListener("click", (e) => {
    if (!filterPanel || !filterBtn) return;
    if (
      e.target instanceof Node &&
      !filterPanel.contains(e.target) &&
      !filterBtn.contains(e.target)
    ) {
      filterPanel.classList.add("hidden");
    }
  });

  viewAllBtn?.addEventListener("click", () => app.navigateTo("companies"));
}

/*──────────────────────────────────────────────
  HELPERS
──────────────────────────────────────────────*/
function fmt(n) {
  return new Intl.NumberFormat("en-IN").format(n);
}

function statusTag(s) {
  if (s === "placed") return "tag-success";
  if (s === "in-progress") return "tag-warning";
  if (s === "rejected") return "tag-danger";
  if (s === "opted_out") return "tag-info";
  if (s === "not_eligible") return "tag-danger";
  return "tag-info";
}

function statusLabel(s) {
  if (s === "in-progress") return "IN PROGRESS";
  if (s === "opted_out") return "OPTED OUT";
  if (s === "not_eligible") return "NOT ELIGIBLE";
  return String(s).toUpperCase();
}
