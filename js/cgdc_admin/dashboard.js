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
let branchFilter = "all";
let yearFilter = "all";
let recordsPage = 1;
const RECORDS_PER_PAGE = 15;

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
                        <h3>Student Placement Records</h3>
                        <span id="dash-records-subtitle">All ${fmt(data.stats[0]?.value || 0)} students synced from MySQL</span>
                    </div>
                    <div class="admin-table-actions">
                        <div class="admin-filter-wrap">
                            <button id="dash-filter-btn" class="admin-user-action" type="button">
                                <ion-icon name="funnel-outline"></ion-icon> Filter
                            </button>
                            <div id="dash-filter-panel" class="admin-filter-panel hidden" style="width:260px;">
                                <div class="admin-filter-title">Filter Records</div>
                                <div class="admin-filter-grid">
                                    <label>
                                        <span>Status</span>
                                        <select id="dash-filter-status">
                                            <option value="all">All Status</option>
                                            <option value="placed">Placed</option>
                                            <option value="active">Active</option>
                                            <option value="opted_out">Opted Out</option>
                                            <option value="not_eligible">Not Eligible</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Branch / Dept</span>
                                        <select id="dash-filter-branch">
                                            <option value="all">All Branches</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Graduation Year</span>
                                        <select id="dash-filter-year">
                                            <option value="all">All Years</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="admin-filter-actions">
                                    <button id="dash-reset-filter" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;background:white;font-weight:600;cursor:pointer;font-size:0.85rem;">Reset</button>
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
                <!-- Records count + pagination -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--bg-secondary);border-top:1px solid var(--border);font-size:0.85rem;color:var(--text-muted);">
                    <span id="dash-records-summary"></span>
                    <div id="dash-records-pagination" style="display:flex;gap:6px;"></div>
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
  const summary = document.getElementById("dash-records-summary");
  const paginationEl = document.getElementById("dash-records-pagination");
  if (!tbody) return;

  const filtered = data.records.filter((r) => {
    const statusOk = statusFilter === "all" || r.status === statusFilter;
    const branchOk = branchFilter === "all" || r.department === branchFilter;
    const yearOk   = yearFilter === "all" || String(r.graduation_yr) === String(yearFilter);
    return statusOk && branchOk && yearOk;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / RECORDS_PER_PAGE));
  if (recordsPage > totalPages) recordsPage = totalPages;

  const start = (recordsPage - 1) * RECORDS_PER_PAGE;
  const pageRows = filtered.slice(start, start + RECORDS_PER_PAGE);

  // Summary
  if (summary) {
    summary.textContent = filtered.length === 0
      ? "No records match"
      : `Showing ${start + 1}–${start + pageRows.length} of ${filtered.length} students`;
  }

  if (!pageRows.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No records match the selected filter.</td></tr>`;
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  tbody.innerHTML = pageRows
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
            <td>${noPlacementStatus(r.status) ? '-' : r.company}</td>
            <td>${noPlacementStatus(r.status) || r.packageLpa === 0 ? '-' : Number(r.packageLpa).toFixed(1)}</td>
            <td><span class="tag ${statusTag(r.status)}">${statusLabel(r.status)}</span></td>
        </tr>
    `,
    )
    .join("");

  // Pagination
  if (paginationEl) {
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
    } else {
      const btnStyle = (active) =>
        `style="padding:4px 10px;border-radius:5px;border:1px solid var(--border);background:${active ? 'var(--primary)' : 'white'};color:${active ? 'white' : 'var(--text-main)'};font-weight:600;cursor:pointer;font-size:0.82rem;"`;

      const pages = [];
      pages.push(`<button data-rpage="prev" ${recordsPage === 1 ? 'disabled' : ''} ${btnStyle(false)}>‹</button>`);
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - recordsPage) <= 1) {
          pages.push(`<button data-rpage="${i}" ${btnStyle(i === recordsPage)}>${i}</button>`);
        } else if (Math.abs(i - recordsPage) === 2) {
          pages.push(`<span style="padding:0 4px;">…</span>`);
        }
      }
      pages.push(`<button data-rpage="next" ${recordsPage === totalPages ? 'disabled' : ''} ${btnStyle(false)}>›</button>`);
      paginationEl.innerHTML = pages.join('');

      paginationEl.querySelectorAll('button[data-rpage]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.dataset.rpage;
          if (p === 'prev' && recordsPage > 1) recordsPage--;
          else if (p === 'next' && recordsPage < totalPages) recordsPage++;
          else if (!isNaN(Number(p))) recordsPage = Number(p);
          populateRecordsTable();
        });
      });
    }
  }
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
  const filterBtn   = document.getElementById("dash-filter-btn");
  const filterPanel = document.getElementById("dash-filter-panel");
  const statusSel   = document.getElementById("dash-filter-status");
  const branchSel   = document.getElementById("dash-filter-branch");
  const yearSel     = document.getElementById("dash-filter-year");
  const applyBtn    = document.getElementById("dash-apply-filter");
  const resetBtn    = document.getElementById("dash-reset-filter");
  const viewAllBtn  = document.getElementById("dash-view-all-cos");

  // Populate dynamic Branch options from data
  const branches = [...new Set(data.records.map(r => r.department).filter(Boolean))].sort();
  if (branchSel) {
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b; opt.textContent = b;
      branchSel.appendChild(opt);
    });
  }

  // Populate dynamic Year options from data
  const years = [...new Set(data.records.map(r => r.graduation_yr).filter(Boolean))].sort((a,b) => b - a);
  if (yearSel) {
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      yearSel.appendChild(opt);
    });
  }

  filterBtn?.addEventListener("click", () => {
    // Sync selects to current state
    if (statusSel) statusSel.value = statusFilter;
    if (branchSel) branchSel.value = branchFilter;
    if (yearSel)   yearSel.value   = yearFilter;
    filterPanel?.classList.toggle("hidden");
  });

  applyBtn?.addEventListener("click", () => {
    statusFilter = statusSel?.value || "all";
    branchFilter = branchSel?.value || "all";
    yearFilter   = yearSel?.value   || "all";
    recordsPage  = 1;
    filterPanel?.classList.add("hidden");
    populateRecordsTable();
  });

  resetBtn?.addEventListener("click", () => {
    statusFilter = "all";
    branchFilter = "all";
    yearFilter   = "all";
    recordsPage  = 1;
    if (statusSel) statusSel.value = "all";
    if (branchSel) branchSel.value = "all";
    if (yearSel)   yearSel.value   = "all";
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
  if (s === "active") return "tag-info";
  if (s === "rejected") return "tag-danger";
  if (s === "opted_out") return "tag-muted";
  if (s === "not_eligible") return "tag-danger";
  return "tag-info";
}

function statusLabel(s) {
  if (s === "active") return "ACTIVE";
  if (s === "opted_out") return "OPTED OUT";
  if (s === "not_eligible") return "NOT ELIGIBLE";
  return String(s).toUpperCase();
}

// Returns true for statuses that have no associated company/package data
function noPlacementStatus(s) {
  return s === "opted_out" || s === "not_eligible" || s === "active";
}
