import { api } from "../api.js";

let analyticsData = null;
let _sseHandlerBound = false; // prevent duplicate SSE listeners on re-render
let _refreshTimer = null;     // background 30s refresh timer

const analyticsState = {
  selectedYear: 'all',
  charts: {
    salary: null,
    dept: null,
    trend: null,
    status: null,
    topCompanies: null
  },
};

// ─── Public API ─────────────────────────────────────────────────────────────

export async function render(container, app) {
  container.innerHTML = `
    <div class="admin-dashboard-shell" style="display:flex;align-items:center;justify-content:center;min-height:400px;">
      <div style="text-align:center;color:var(--text-muted);">
        <ion-icon name="hourglass-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px;"></ion-icon>
        <p>Loading analytics…</p>
      </div>
    </div>`;

  await fetchAnalytics();
  renderUi(container, app);
}

// Called by App.js on background refresh (tab-switch / 60-s tick)
export async function refresh() {
  if (!document.getElementById('kpi-placement-rate')) return;
  await fetchAnalytics();
  softRefreshCharts();
}

// ─── Data Layer ─────────────────────────────────────────────────────────────

async function fetchAnalytics() {
  try {
    analyticsData = await api.get(`/coordinator/analytics?year=${analyticsState.selectedYear}`);
  } catch (err) {
    console.error("[Analytics] Fetch failed:", err);
    analyticsData = {
      kpis: { placementRate: 0, avgLpa: 0, highestLpa: 0, applications: 0 },
      salaryDistribution: [0, 0, 0, 0],
      monthlyApplications: [],
      monthlyOffers: [],
      monthLabels: [],
      departments: [],
      insights: ["Analytics data could not be loaded. Ensure the server is running."],
      availableYears: [],
      appStatusDist: [],
      topCompanies: []
    };
  }

  // Always ensure year options include 2024–2026
  if (analyticsData?.availableYears) {
    [2026, 2025, 2024].forEach(y => {
      if (!analyticsData.availableYears.includes(y)) analyticsData.availableYears.push(y);
    });
    analyticsData.availableYears.sort((a, b) => b - a);
  }
}

// ─── UI Shell ───────────────────────────────────────────────────────────────

function renderUi(container, app) {
  const yearsOptions = ['all', ...(analyticsData.availableYears || [])].map(yr => {
    const label = yr === 'all' ? 'All Time' : yr;
    const selected = String(yr) === String(analyticsState.selectedYear) ? 'selected' : '';
    return `<option value="${yr}" ${selected}>${label}</option>`;
  }).join('');

  container.innerHTML = `
    <div class="admin-dashboard-shell">

      <!-- Header -->
      <div class="admin-dashboard-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p style="color:var(--text-muted);margin-top:2px;">
            Deep dive into placement data — powered by live MySQL database.
          </p>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="analytics-sync-indicator" title="Live sync active" style="display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;color:#10b981;font-weight:600;">
            <span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;animation:pulse-dot 1.5s infinite;"></span>
            Live
          </span>
          <label style="font-size:0.9rem;font-weight:500;color:#64748b;">Filter by Year:</label>
          <select id="analytics-year-filter" style="padding:6px 12px;border-radius:6px;border:1px solid #e2e8f0;font-size:0.95rem;font-family:inherit;font-weight:500;cursor:pointer;outline:none;background:#fff;">
            ${yearsOptions}
          </select>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="admin-stat-grid">
        <div class="card admin-stat-card">
          <div class="admin-stat-meta">
            <p>Placement Rate</p>
            <h2 id="kpi-placement-rate">—</h2>
          </div>
        </div>
        <div class="card admin-stat-card">
          <div class="admin-stat-meta">
            <p>Average Package</p>
            <h2 id="kpi-avg-lpa">—</h2>
          </div>
        </div>
        <div class="card admin-stat-card">
          <div class="admin-stat-meta">
            <p>Highest Package</p>
            <h2 id="kpi-highest-lpa">—</h2>
          </div>
        </div>
        <div class="card admin-stat-card">
          <div class="admin-stat-meta">
            <p>Total Applications</p>
            <h2 id="kpi-applications">—</h2>
          </div>
        </div>
      </div>

      <!-- Row 1: Trend + Insights -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-bottom:24px;">
        <div class="card">
          <h3 style="margin-bottom:14px;color:#0f2f61;">Applications vs Offers Trend</h3>
          <div id="trendChartContainer"><canvas id="trendChart" style="max-height:320px;"></canvas></div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:12px;color:#0f2f61;">Key Insights</h3>
          <ul id="analytics-insights" style="padding-left:18px;color:var(--text-muted);display:grid;gap:10px;"></ul>
        </div>
      </div>

      <!-- Row 2: Status + Top Companies -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
        <div class="card">
          <h3 style="margin-bottom:14px;color:#0f2f61;">Application Status</h3>
          <div id="statusChartContainer"><canvas id="statusChart" style="max-height:300px;"></canvas></div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:14px;color:#0f2f61;">Top Recruiting Companies</h3>
          <div id="topCompaniesContainer"><canvas id="topCompaniesChart" style="max-height:300px;"></canvas></div>
        </div>
      </div>

      <!-- Row 3: Salary + Dept Pie -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
        <div class="card">
          <h3 style="margin-bottom:14px;color:#0f2f61;">Salary Distribution</h3>
          <div id="salaryChartContainer"><canvas id="salaryChart" style="max-height:300px;"></canvas></div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:14px;color:#0f2f61;">Placement % by Department</h3>
          <div id="pieChartContainer"><canvas id="pieChart" style="max-height:300px;"></canvas></div>
        </div>
      </div>

    </div>

    <style>
      @keyframes pulse-dot {
        0%,100%{opacity:1;transform:scale(1);}
        50%{opacity:.4;transform:scale(1.4);}
      }
    </style>`;

  updateKpis();
  renderInsights(analyticsData.insights);
  renderAllCharts();
  bindYearFilter();
  startRealTimeSync();
  stampLastUpdated();
}

// ─── Year Filter ─────────────────────────────────────────────────────────────

function bindYearFilter() {
  const yearFilter = document.getElementById("analytics-year-filter");
  if (!yearFilter) return;
  yearFilter.addEventListener("change", async (e) => {
    analyticsState.selectedYear = e.target.value;
    await fetchAnalytics();
    softRefreshCharts();
    stampLastUpdated();
  });
}

// ─── Real-Time Sync ──────────────────────────────────────────────────────────

function startRealTimeSync() {
  // Guard: only register SSE listener once per session
  if (!_sseHandlerBound) {
    window.addEventListener('sse:analytics_update', handleRealtimeRefresh);
    window.addEventListener('sse:new_notification', handleRealtimeRefresh); // also refresh on any notification
    _sseHandlerBound = true;
    console.log('[Analytics] SSE real-time sync registered.');
  }

  // Background poll every 30 seconds as a safety net
  if (_refreshTimer) clearInterval(_refreshTimer);
  _refreshTimer = setInterval(async () => {
    if (!document.getElementById('kpi-placement-rate')) {
      // Page navigated away — clean up
      clearInterval(_refreshTimer);
      _refreshTimer = null;
      return;
    }
    console.log('[Analytics] 30s background refresh...');
    await fetchAnalytics();
    softRefreshCharts();
    stampLastUpdated();
  }, 30000);
}

async function handleRealtimeRefresh() {
  if (!document.getElementById('kpi-placement-rate')) return; // not on analytics page
  console.log('[Analytics] Real-time event received — refreshing...');
  await fetchAnalytics();
  softRefreshCharts();
  stampLastUpdated();
}

function stampLastUpdated() {
  const el = document.getElementById('analytics-last-updated');
  if (el) el.textContent = `(updated ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`;
}

// ─── KPI Update (no DOM re-render) ──────────────────────────────────────────

function updateKpis() {
  if (!analyticsData) return;
  const kpi = analyticsData.kpis || {};
  setText("kpi-placement-rate", `${Number(kpi.placementRate || 0).toFixed(1)}%`);
  setText("kpi-avg-lpa", `₹${Number(kpi.avgLpa || 0).toFixed(1)} LPA`);
  setText("kpi-highest-lpa", `₹${Number(kpi.highestLpa || 0).toFixed(1)} LPA`);
  setText("kpi-applications", formatNumber(kpi.applications || 0));
}

// ─── Soft Refresh (update without full DOM re-render) ────────────────────────

function softRefreshCharts() {
  if (!analyticsData) return;
  updateKpis();
  renderInsights(analyticsData.insights);

  // Recreate canvas elements so Chart.js doesn't complain about reuse
  resetContainer('salaryChartContainer', 'salaryChart', '300px');
  resetContainer('pieChartContainer', 'pieChart', '300px');
  resetContainer('trendChartContainer', 'trendChart', '320px');
  resetContainer('statusChartContainer', 'statusChart', '300px');
  resetContainer('topCompaniesContainer', 'topCompaniesChart', '300px');

  destroyCharts();
  renderAllCharts();
}

function resetContainer(containerId, canvasId, maxHeight) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<canvas id="${canvasId}" style="max-height:${maxHeight};"></canvas>`;
}

// ─── Insights ────────────────────────────────────────────────────────────────

function renderInsights(insights) {
  const list = document.getElementById("analytics-insights");
  if (!list) return;
  list.innerHTML = (insights || []).map(p => `<li>${p}</li>`).join("") ||
    '<li style="color:var(--text-muted)">No insights available yet.</li>';
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function renderAllCharts() {
  if (!analyticsData) return;
  renderSalaryChart(analyticsData);
  renderDeptChart(analyticsData);
  renderStatusChart(analyticsData);
  renderTopCompaniesChart(analyticsData);
  renderTrendChart(analyticsData);
}

function getEmptyState(msg = "No data available") {
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:200px;color:var(--text-muted);text-align:center;">
    <ion-icon name="document-text-outline" style="font-size:3rem;opacity:.5;margin-bottom:12px;"></ion-icon>
    <p style="font-size:.95rem;font-weight:500;">${msg}</p>
  </div>`;
}

function renderSalaryChart(data) {
  const container = document.getElementById("salaryChartContainer");
  if (!container) return;
  const dist = data.salaryDistribution || [];
  if (!dist.some(v => v > 0)) {
    container.innerHTML = getEmptyState('No salary data recorded yet');
    return;
  }
  const canvas = document.getElementById("salaryChart");
  if (!canvas) return;
  analyticsState.charts.salary = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["< 5 LPA", "5–10 LPA", "10–20 LPA", "> 20 LPA"],
      datasets: [{
        data: dist,
        backgroundColor: ["#7B8CA5", "#1B3A6B", "#F5A623", "#10b981"],
        borderColor: "#ffffff", borderWidth: 3, hoverOffset: 8
      }]
    },
    options: { cutout: "52%", responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

function renderDeptChart(data) {
  const container = document.getElementById("pieChartContainer");
  if (!container) return;
  const depts = (data.departments || []).filter(d => d.placedCount > 0);
  if (!depts.length) {
    container.innerHTML = getEmptyState('No department placements recorded yet');
    return;
  }
  const canvas = document.getElementById("pieChart");
  if (!canvas) return;
  const colors = ["#1B3A6B", "#355C91", "#7B8CA5", "#F5A623", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
  analyticsState.charts.dept = new Chart(canvas, {
    type: "pie",
    data: {
      labels: depts.map(d => d.name),
      datasets: [{
        data: depts.map(d => d.placedCount),
        backgroundColor: depts.map((_, i) => colors[i % colors.length]),
        borderColor: "#ffffff", borderWidth: 2, hoverOffset: 8
      }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

function renderStatusChart(data) {
  const container = document.getElementById("statusChartContainer");
  if (!container) return;
  const rows = data.appStatusDist || [];
  if (!rows.length) {
    container.innerHTML = getEmptyState('No applications submitted yet');
    return;
  }
  const canvas = document.getElementById("statusChart");
  if (!canvas) return;
  const labels = rows.map(d => d.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  const values = rows.map(d => d.count);
  const colorMap = { SELECTED: '#10b981', SHORTLISTED: '#3b82f6', REJECTED: '#ef4444' };
  const bgColors = labels.map(l => colorMap[l.toUpperCase().split(' ')[0]] || '#f59e0b');

  analyticsState.charts.status = new Chart(canvas, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: bgColors, borderColor: "#ffffff", borderWidth: 3, hoverOffset: 8 }] },
    options: { cutout: "60%", responsive: true, plugins: { legend: { position: "right" } } }
  });
}

function renderTopCompaniesChart(data) {
  const container = document.getElementById("topCompaniesContainer");
  if (!container) return;
  const companies = data.topCompanies || [];
  if (!companies.length) {
    container.innerHTML = getEmptyState('No placements recorded yet');
    return;
  }
  const canvas = document.getElementById("topCompaniesChart");
  if (!canvas) return;
  analyticsState.charts.topCompanies = new Chart(canvas, {
    type: "bar",
    data: {
      labels: companies.map(d => d.name),
      datasets: [{ label: "Placements", data: companies.map(d => d.count), backgroundColor: "#1B3A6B", borderRadius: 4 }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false } }
    }
  });
}

function renderTrendChart(data) {
  const container = document.getElementById("trendChartContainer");
  if (!container) return;
  const apps = data.monthlyApplications || [];
  const offers = data.monthlyOffers || [];
  const labels = data.monthLabels || [];

  if (!apps.some(v => v > 0) && !offers.some(v => v > 0)) {
    container.innerHTML = getEmptyState('No activity recorded yet for this period');
    return;
  }
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  const datasetDefaults = { fill: true, tension: 0.35, borderWidth: 3, pointRadius: 5, pointBorderColor: "#ffffff", pointBorderWidth: 2 };
  analyticsState.charts.trend = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { ...datasetDefaults, label: "Applications", data: apps, borderColor: "#1B3A6B", backgroundColor: "rgba(27,58,107,.08)", pointBackgroundColor: "#1B3A6B" },
        { ...datasetDefaults, label: "Offers / Placements", data: offers, borderColor: "#F5A623", backgroundColor: "rgba(245,166,35,.08)", pointBackgroundColor: "#F5A623" }
      ]
    },
    options: {
      responsive: true,
      interaction: { intersect: false, mode: "index" },
      scales: {
        y: { grid: { color: "#edf2f7" }, border: { display: false } },
        x: { grid: { display: false }, border: { display: false } }
      },
      plugins: { legend: { position: "top", align: "end" } }
    }
  });
}

function destroyCharts() {
  Object.values(analyticsState.charts).forEach(c => c?.destroy());
  analyticsState.charts.salary = null;
  analyticsState.charts.dept = null;
  analyticsState.charts.trend = null;
  analyticsState.charts.status = null;
  analyticsState.charts.topCompanies = null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}
