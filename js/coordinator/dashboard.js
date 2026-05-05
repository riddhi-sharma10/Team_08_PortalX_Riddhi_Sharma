import { api } from "../api.js";

let data = {
  stats: [],
  trend: { labels: [], placements: [] },
  tiers: [],
  departments: [],
  topCompanies: [],
  records: [],
  placementRate: "0.0",
  totalStudents: 0,
  totalPlaced: 0
};

let statusFilter = "all";
let branchFilter = "all";
let yearFilter = "all";
let recordsPage = 1;
const RECORDS_PER_PAGE = 15;

export async function render(container, app) {
  container.innerHTML = loadingHTML("Dashboard");

  try {
    const [liveStats, profile] = await Promise.all([
      api.get("/coordinator/dashboard"),
      api.get("/coordinator/profile"),
    ]);

    data = {
      stats: liveStats.stats || [],
      trend: liveStats.trend || { labels: [], placements: [] },
      tiers: liveStats.tiers || [],
      departments: liveStats.departments || [],
      topCompanies: liveStats.topCompanies || [],
      records: liveStats.records || [],
      placementRate: liveStats.placementRate || "0.0",
      totalStudents: liveStats.totalStudents || 0,
      totalPlaced: liveStats.totalPlaced || 0
    };

    if (profile.name) {
      app.state.user.name = profile.name;
      if (app.Navbar) app.Navbar.render(app.state.user);
    }

    renderShell(container, profile.name, profile.department);
    populateRecordsTable();
    drawCharts();
    wireEvents(app);
  } catch (err) {
    console.error("[dashboard] fetch error:", err);
    container.innerHTML = errorHTML(err.message);
  }
}

function renderShell(container, coordName, dept) {
  const firstName = (coordName || "Coordinator").split(" ")[0];
  const tierTotal = data.tiers.reduce((s, t) => s + Number(t.value), 0);

  container.innerHTML = `
        <style>
            @keyframes shimmer {
                0% { transform: translateX(-100%) skewX(-20deg); }
                100% { transform: translateX(200%) skewX(-20deg); }
            }
        </style>
        <div class="admin-dashboard-shell">
            <div style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <h1 style="font-size: 2.2rem; color: var(--primary); font-weight: 800; letter-spacing: -0.5px;">Welcome, ${firstName}! 👋</h1>
                    <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 4px;">${dept} Placement Coordinator</p>
                </div>
                <div class="tag tag-info" style="padding: 12px 24px; font-size: 1rem; border-radius: 12px; font-weight:800; border: 1px solid #e2e8f0; display:flex; align-items:center; gap:8px;">
                    <ion-icon name="shield-checkmark" style="font-size:1.4rem; color:var(--primary);"></ion-icon>
                    <span style="color:var(--primary);">COORDINATOR</span>
                </div>
            </div>

            <div class="admin-stat-grid">
                ${data.stats.map(statCardHTML).join("")}
            </div>

            <!-- Placement Progress Bar -->
            <div class="card" style="margin-top:24px;padding:32px;border:none;box-shadow:0 12px 30px rgba(0,0,0,0.04);background: linear-gradient(to right, #ffffff, #f8fafc);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <div>
                        <h3 style="margin:0;font-size:1.4rem;display:flex;align-items:center;gap:8px;">
                            <ion-icon name="rocket-outline" style="color:#0f2f61;"></ion-icon>
                            Placement Progress
                        </h3>
                        <p style="color:var(--text-muted);font-size:0.95rem;margin-top:6px;font-weight:500;">
                            ${data.totalPlaced} out of ${data.totalStudents} students placed
                        </p>
                    </div>
                    <span class="tag tag-success" style="font-size:1.2rem;padding:10px 24px;font-weight:800;border-radius:12px;box-shadow:0 4px 12px rgba(16, 185, 129, 0.2);">
                        ${data.placementRate}%
                    </span>
                </div>
                <div style="background:#e2e8f0;border-radius:20px;overflow:hidden;height:24px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="width:${Math.min(Number(data.placementRate), 100)}%;background:linear-gradient(90deg, #1B3A6B, #3b82f6);height:100%;border-radius:20px;transition:width 1.5s cubic-bezier(0.4, 0, 0.2, 1);position:relative;overflow:hidden;">
                        <!-- animated shine -->
                        <div style="position:absolute;top:0;left:0;height:100%;width:100%;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);transform:skewX(-20deg);animation:shimmer 3s infinite;"></div>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:0.85rem;color:var(--text-muted);font-weight:700;">
                    <span>0%</span><span style="color:#3b82f6;">50%</span><span>100%</span>
                </div>
            </div>

            <!-- Charts Row: Trend + Tier Donut -->
            <div class="admin-grid-two" style="margin-top:24px;">
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
                        <span>Students placed under your coordination by department</span>
                    </div>
                    <div class="admin-dept-list">
                        ${deptRowsHTML()}
                    </div>
                </div>

                <div class="card">
                    <div class="admin-card-head admin-card-head-inline">
                        <div>
                            <h3>Top Hiring Companies</h3>
                            <span>By offers rolled out to your students</span>
                        </div>
                        <button id="dash-view-all-cos" class="admin-link-btn" type="button">View All</button>
                    </div>
                    <div class="admin-company-list">
                        ${data.topCompanies.map(companyItemHTML).join("")}
                    </div>
                </div>
            </div>

            <!-- Recent Records Table -->
            <div class="card" style="margin-top:24px;">
                <div class="admin-card-head admin-card-head-inline">
                    <div>
                        <h3>My Students' Records</h3>
                        <span id="dash-records-subtitle">All ${fmt(data.totalStudents)} assigned students</span>
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

function statCardHTML(s) {
  const val = typeof s.value === "number" ? fmt(s.value) : s.value;
  
  let iconBg = '#f1f5f9';
  let iconColor = '#0f2f61';
  if (s.icon === 'checkmark-done-outline') { iconBg = '#dcfce7'; iconColor = '#10b981'; } 
  if (s.icon === 'pulse-outline') { iconBg = '#fef3c7'; iconColor = '#f59e0b'; } 
  if (s.icon === 'people-outline') { iconBg = '#e0e7ff'; iconColor = '#4f46e5'; } 
  if (s.icon === 'calendar-outline') { iconBg = '#fae8ff'; iconColor = '#d946ef'; } 

  const noteClass = s.noteType === "highlight" ? "admin-note-highlight" : s.noteType === "active" ? "admin-note-active" : "admin-note-neutral";
        
  return `
        <div class="card admin-stat-card" style="border:none;box-shadow:0 10px 25px rgba(0,0,0,0.03);transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-5px)';this.style.boxShadow='0 15px 35px rgba(0,0,0,0.06)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 10px 25px rgba(0,0,0,0.03)'">
            <div class="admin-stat-top">
                <div style="width:48px;height:48px;border-radius:12px;background:${iconBg};color:${iconColor};display:flex;align-items:center;justify-content:center;font-size:1.5rem;box-shadow:0 4px 10px ${iconBg};">
                    <ion-icon name="${s.icon}"></ion-icon>
                </div>
                ${s.note ? `<span class="${noteClass}" style="font-weight:700;">${s.note}</span>` : ""}
            </div>
            <div class="admin-stat-meta" style="margin-top:20px;">
                <p style="font-size:0.9rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">${s.label}</p>
                <h2 style="font-size:2rem;font-weight:800;color:var(--primary);margin-top:4px;">${val}</h2>
            </div>
        </div>
    `;
}

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
        <tr class="details-btn" data-sid="${r.id}" style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td>
                <div class="admin-student-cell" style="pointer-events:none;">
                    <span class="admin-student-initials">${r.initials}</span>
                    <span style="font-weight:600; color:var(--primary);">${r.student}</span>
                </div>
            </td>
            <td style="pointer-events:none;">${r.department}</td>
            <td style="pointer-events:none;">
                ${noPlacementStatus(r.status) ? '-' : `
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:#e2e8f0;border-radius:4px;font-size:0.7rem;font-weight:700;color:#475569;">${r.company.charAt(0).toUpperCase()}</span>
                    <span>${r.company}</span>
                </div>
                `}
            </td>
            <td style="pointer-events:none;">${noPlacementStatus(r.status) || r.packageLpa === 0 ? '-' : `₹ ${Number(r.packageLpa).toFixed(1)} LPA`}</td>
            <td style="pointer-events:none;"><span class="tag ${statusTag(r.status)}" style="font-weight:700; padding:6px 12px;">${statusLabel(r.status)}</span></td>
        </tr>
    `,
    )
    .join("");

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
  
  attachDetailsEvents(tbody);
}

function drawCharts() {
  const trendEl = document.getElementById("dash-trend-chart");
  if (trendEl && data.trend.labels.length) {
    if (window.ChartDataLabels) {
        Chart.register(window.ChartDataLabels);
    }
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#64748b";

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

function wireEvents(app) {
  const filterBtn   = document.getElementById("dash-filter-btn");
  const filterPanel = document.getElementById("dash-filter-panel");
  const statusSel   = document.getElementById("dash-filter-status");
  const branchSel   = document.getElementById("dash-filter-branch");
  const yearSel     = document.getElementById("dash-filter-year");
  const applyBtn    = document.getElementById("dash-apply-filter");
  const resetBtn    = document.getElementById("dash-reset-filter");
  const viewAllBtn  = document.getElementById("dash-view-all-cos");

  const branches = [...new Set(data.records.map(r => r.department).filter(Boolean))].sort();
  if (branchSel) {
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b; opt.textContent = b;
      branchSel.appendChild(opt);
    });
  }

  const years = [...new Set(data.records.map(r => r.graduation_yr).filter(Boolean))].sort((a,b) => b - a);
  if (yearSel) {
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      yearSel.appendChild(opt);
    });
  }

  filterBtn?.addEventListener("click", () => {
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

function noPlacementStatus(s) {
  return s === "opted_out" || s === "not_eligible" || s === "active";
}

function loadingHTML(p) {
  return `<div style="display:flex;align-items:center;justify-content:center;height:400px;flex-direction:column;gap:12px;color:var(--text-muted);">
        <ion-icon name="sync-outline" style="font-size:2.5rem;animation:spin 1s linear infinite;"></ion-icon>
        <p>Loading ${p}...</p></div>`;
}
function errorHTML(msg) {
  return `<div style="padding:40px;text-align:center;">
        <ion-icon name="alert-circle-outline" style="font-size:3rem;color:#ef4444;"></ion-icon>
        <h2 style="margin-top:16px;">Failed to load</h2>
        <p style="color:var(--text-muted);margin-top:8px;">${msg}</p>
        <button onclick="window.location.reload()" class="btn-primary" style="margin-top:24px;">Retry</button>
    </div>`;
}

function attachDetailsEvents(container) {
    container.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sid = btn.getAttribute('data-sid');
            showStudentModal(sid);
        });
    });
}

async function showStudentModal(sid) {
    let modal = document.getElementById('student-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'student-detail-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div style="background:white;width:600px;border-radius:16px;padding:32px;position:relative;box-shadow:0 20px 50px rgba(0,0,0,0.2);">
            <div style="text-align:center;padding:20px;">
                <ion-icon name="sync-outline" style="font-size:2rem;animation:spin 1s linear infinite;"></ion-icon>
                <p>Fetching Student Profile...</p>
            </div>
        </div>
    `;

    try {
        const s = await api.get(`/coordinator/students/${sid}`);
        const avatar = (s.name || 'U S').split(' ').filter(p => p.length > 0).slice(0, 2).map(n => n[0]).join('').toUpperCase();
        
        modal.innerHTML = `
            <style>
                @keyframes slideUpModal {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
            <div style="background:white;width:650px;border-radius:20px;overflow:hidden;position:relative;box-shadow:0 25px 70px rgba(0,0,0,0.3);animation: slideUpModal 0.3s ease-out;">
                <button id="close-modal" style="position:absolute;right:20px;top:20px;background:white;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:10;">
                    <ion-icon name="close-outline" style="font-size:1.5rem;"></ion-icon>
                </button>

                <div style="background:var(--primary);padding:40px;text-align:center;color:white;">
                    <div style="width:100px;height:100px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:800;border:4px solid rgba(255,255,255,0.3);">
                        ${avatar}
                    </div>
                    <h2 style="margin:0;font-size:1.8rem;letter-spacing:-0.5px;">${s.name}</h2>
                    <p style="margin:8px 0 0;opacity:0.8;font-weight:500;">STU-${String(s.id).padStart(4,'0')} | ${s.dept}</p>
                </div>

                <div style="padding:32px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                    <div>
                        <label style="font-size:0.7rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:6px;">Contact Info</label>
                        <div style="display:flex;flex-direction:column;gap:12px;">
                            <div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;">
                                <ion-icon name="mail-outline" style="color:var(--primary);"></ion-icon>
                                <span>${s.email}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;">
                                <ion-icon name="call-outline" style="color:var(--primary);"></ion-icon>
                                <span>${s.phone}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style="font-size:0.7rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:6px;">Academic Stats</label>
                        <div style="display:flex;flex-direction:column;gap:12px;">
                            <div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;">
                                <ion-icon name="star-outline" style="color:var(--warning);"></ion-icon>
                                <span>CGPA: <b>${s.cgpa}</b></span>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;">
                                <ion-icon name="calendar-outline" style="color:var(--primary);"></ion-icon>
                                <span>Graduating ${s.gradYear}</span>
                            </div>
                        </div>
                    </div>

                    <div style="grid-column:1/-1;border-top:1px solid #f1f5f9;padding-top:24px;">
                        <label style="font-size:0.7rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:12px;">Placement Information</label>
                        <div style="display:flex;gap:16px;">
                            <div style="flex:1;background:#f8fafc;padding:16px;border-radius:12px;">
                                <span style="display:block;font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Profile Status</span>
                                <span class="tag ${s.status==='placed'?'tag-success':s.status==='opted_out'?'tag-muted':'tag-info'}" style="font-weight:800;text-transform:uppercase;">${(s.status||'').replace('_',' ')}</span>
                            </div>
                            <div style="flex:1;background:#f8fafc;padding:16px;border-radius:12px;">
                                <span style="display:block;font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Applications</span>
                                <span style="font-weight:800;font-size:1.1rem;color:var(--primary);">${s.totalApps || 0} submitted</span>
                            </div>
                        </div>
                    </div>

                    <div style="grid-column:1/-1;margin-top:8px;">
                        <a href="${s.resumeUrl || '#'}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;background:var(--primary);color:white;text-decoration:none;border-radius:12px;font-weight:700;transition:opacity 0.2s;">
                            <ion-icon name="document-text-outline" style="font-size:1.2rem;"></ion-icon>
                            View Student Resume
                        </a>
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('#close-modal').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    } catch (err) {
        modal.innerHTML = `<div style="background:white;padding:32px;border-radius:16px;text-align:center;">
            <p style="color:red;">Error: ${err.message}</p>
            <button onclick="document.getElementById('student-detail-modal').style.display='none'" class="btn-primary" style="margin-top:16px;">Close</button>
        </div>`;
    }
}

