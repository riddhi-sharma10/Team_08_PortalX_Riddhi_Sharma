import { api } from "../api.js";

let analyticsData = null;

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

export async function render(container, app) {
  // Show loading state
  container.innerHTML = `
        <div class="admin-dashboard-shell" style="display:flex;align-items:center;justify-content:center;min-height:400px;">
            <div style="text-align:center;color:var(--text-muted);">
                <ion-icon name="hourglass-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px;"></ion-icon>
                <p>Loading analytics...</p>
            </div>
        </div>
    `;

  await fetchAnalytics();
  renderUi(container, app);
}

async function fetchAnalytics() {
  try {
    analyticsData = await api.get(`/coordinator/analytics?year=${analyticsState.selectedYear}`);
  } catch (err) {
    console.error("Failed to load analytics from API:", err);
    analyticsData = {
      kpis: { placementRate: 0, avgLpa: 0, highestLpa: 0, applications: 0 },
      salaryDistribution: [0, 0, 0, 0],
      departmentPlacement: [0, 0, 0],
      monthlyApplications: [],
      monthlyOffers: [],
      monthLabels: [],
      departments: [],
      insights: ["Analytics data could not be loaded."],
      availableYears: [],
      appStatusDist: [],
      topCompanies: []
    };
  }
  
  if (analyticsData && analyticsData.availableYears) {
      const requiredYears = [2026, 2025, 2024];
      requiredYears.forEach(y => {
          if (!analyticsData.availableYears.includes(y)) analyticsData.availableYears.push(y);
      });
      analyticsData.availableYears.sort((a, b) => b - a);
  }
}

function renderUi(container, app) {
  const yearsOptions = ['all', ...(analyticsData.availableYears || [])].map(yr => {
      const label = yr === 'all' ? 'All Time' : yr;
      const selected = String(yr) === String(analyticsState.selectedYear) ? 'selected' : '';
      return `<option value="${yr}" ${selected}>${label}</option>`;
  }).join('');

  container.innerHTML = `
        <div class="admin-dashboard-shell">
            <div class="admin-dashboard-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h1>Reports & Analytics</h1>
                    <p>Deep dive into placement data and performance metrics — powered by live database.</p>
                </div>
                <div>
                    <label style="font-size: 0.9rem; font-weight: 500; color: #64748b; margin-right: 8px;">Filter by Year:</label>
                    <select id="analytics-year-filter" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.95rem; font-family: inherit; font-weight: 500; cursor: pointer; outline: none; background: #fff;">
                        ${yearsOptions}
                    </select>
                </div>
            </div>

            <div class="admin-stat-grid">
                <div class="card admin-stat-card">
                    <div class="admin-stat-meta">
                        <p>Placement Rate</p>
                        <h2 id="kpi-placement-rate">0%</h2>
                    </div>
                </div>
                <div class="card admin-stat-card">
                    <div class="admin-stat-meta">
                        <p>Average Package</p>
                        <h2 id="kpi-avg-lpa">₹0 LPA</h2>
                    </div>
                </div>
                <div class="card admin-stat-card">
                    <div class="admin-stat-meta">
                        <p>Highest Package</p>
                        <h2 id="kpi-highest-lpa">₹0 LPA</h2>
                    </div>
                </div>
                <div class="card admin-stat-card">
                    <div class="admin-stat-meta">
                        <p>Total Applications</p>
                        <h2 id="kpi-applications">0</h2>
                    </div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:24px; margin-bottom: 24px;">
                <div class="card">
                    <h3 style="margin-bottom: 14px; color:#0f2f61;">Applications vs Offers Trend</h3>
                    <div id="trendChartContainer"><canvas id="trendChart" style="max-height: 320px;"></canvas></div>
                </div>
                <div class="card">
                    <h3 style="margin-bottom: 12px; color:#0f2f61;">Key Insights</h3>
                    <ul id="analytics-insights" style="padding-left: 18px; color: var(--text-muted); display:grid; gap:10px;"></ul>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom: 24px;">
                <div class="card">
                    <h3 style="margin-bottom: 14px; color:#0f2f61;">Application Status</h3>
                    <div id="statusChartContainer"><canvas id="statusChart" style="max-height: 300px;"></canvas></div>
                </div>
                <div class="card">
                    <h3 style="margin-bottom: 14px; color:#0f2f61;">Top Recruiting Companies</h3>
                    <div id="topCompaniesContainer"><canvas id="topCompaniesChart" style="max-height: 300px;"></canvas></div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom: 24px;">
                <div class="card">
                    <h3 style="margin-bottom: 14px; color:#0f2f61;">Salary Distribution</h3>
                    <div id="salaryChartContainer"><canvas id="salaryChart" style="max-height: 300px;"></canvas></div>
                </div>
                <div class="card">
                    <h3 style="margin-bottom: 14px; color:#0f2f61;">Placement % by Department</h3>
                    <div id="pieChartContainer"><canvas id="pieChart" style="max-height: 300px;"></canvas></div>
                </div>
            </div>

        </div>
    `;

  updateAnalyticsView();

  const yearFilter = document.getElementById("analytics-year-filter");
  if (yearFilter) {
      yearFilter.addEventListener("change", async (e) => {
          analyticsState.selectedYear = e.target.value;
          
          destroyCharts();
          document.getElementById('salaryChartContainer').innerHTML = '<canvas id="salaryChart" style="max-height: 300px;"></canvas>';
          document.getElementById('pieChartContainer').innerHTML = '<canvas id="pieChart" style="max-height: 300px;"></canvas>';
          document.getElementById('trendChartContainer').innerHTML = '<canvas id="trendChart" style="max-height: 320px;"></canvas>';
          document.getElementById('statusChartContainer').innerHTML = '<canvas id="statusChart" style="max-height: 300px;"></canvas>';
          document.getElementById('topCompaniesContainer').innerHTML = '<canvas id="topCompaniesChart" style="max-height: 300px;"></canvas>';
          
          await fetchAnalytics();
          updateAnalyticsView();
      });
  }
}

function updateAnalyticsView() {
  if (!analyticsData) return;

  setText("kpi-placement-rate", `${analyticsData.kpis.placementRate.toFixed(1)}%`);
  setText("kpi-avg-lpa", `₹${analyticsData.kpis.avgLpa.toFixed(1)} LPA`);
  setText("kpi-highest-lpa", `₹${analyticsData.kpis.highestLpa.toFixed(1)} LPA`);
  setText("kpi-applications", formatNumber(analyticsData.kpis.applications));

  renderInsights(analyticsData.insights);
  renderCharts(analyticsData);
}

function renderInsights(insights) {
  const list = document.getElementById("analytics-insights");
  if (!list) return;
  list.innerHTML = insights.map((point) => `<li>${point}</li>`).join("");
}

function getEmptyStateHtml(message = "No data available") {
    return `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:200px; color:var(--text-muted); text-align:center;">
        <ion-icon name="document-text-outline" style="font-size:3rem; opacity:0.5; margin-bottom:12px;"></ion-icon>
        <p style="font-size:0.95rem; font-weight:500;">${message}</p>
    </div>`;
}

function renderCharts(data) {
  destroyCharts();
  
  // Salary Chart
  const salaryContainer = document.getElementById("salaryChartContainer");
  if (salaryContainer) {
      if (!data.salaryDistribution || data.salaryDistribution.every(v => v === 0)) {
          salaryContainer.innerHTML = getEmptyStateHtml('No salary data recorded yet');
      } else {
          const salaryCanvas = document.getElementById("salaryChart");
          if (salaryCanvas) {
            analyticsState.charts.salary = new Chart(salaryCanvas, {
              type: "doughnut",
              data: {
                labels: ["< 5 LPA", "5-10 LPA", "10-20 LPA", "> 20 LPA"],
                datasets: [{
                    data: data.salaryDistribution,
                    backgroundColor: ["#7B8CA5", "#1B3A6B", "#F5A623", "#10b981"],
                    borderColor: "#ffffff",
                    borderWidth: 3,
                    hoverOffset: 8,
                }],
              },
              options: {
                cutout: "52%",
                responsive: true,
                plugins: { legend: { position: "bottom" } }
              },
            });
          }
      }
  }

  // Dept Chart
  const deptContainer = document.getElementById("pieChartContainer");
  if (deptContainer) {
      const deptLabels = data.departments.map((d) => d.name);
      const deptValues = data.departments.map((d) => d.placedCount);
      
      if (!deptValues || deptValues.every(v => v === 0)) {
          deptContainer.innerHTML = getEmptyStateHtml('No placements recorded yet');
      } else {
          const deptCanvas = document.getElementById("pieChart");
          if (deptCanvas) {
            const deptColors = ["#1B3A6B", "#355C91", "#7B8CA5", "#F5A623", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
            analyticsState.charts.dept = new Chart(deptCanvas, {
              type: "pie",
              data: {
                labels: deptLabels,
                datasets: [{
                    data: deptValues,
                    backgroundColor: deptLabels.map((_, i) => deptColors[i % deptColors.length]),
                    borderColor: "#ffffff",
                    borderWidth: 2,
                    hoverOffset: 8,
                }],
              },
              options: {
                responsive: true,
                plugins: { legend: { position: "bottom" } }
              },
            });
          }
      }
  }

  // Application Status Chart
  const statusContainer = document.getElementById("statusChartContainer");
  if (statusContainer) {
      if (!data.appStatusDist || data.appStatusDist.length === 0) {
          statusContainer.innerHTML = getEmptyStateHtml('No applications submitted yet');
      } else {
          const statusCanvas = document.getElementById("statusChart");
          if (statusCanvas) {
            const labels = data.appStatusDist.map(d => d.status.replace('_', ' ').toUpperCase());
            const values = data.appStatusDist.map(d => d.count);
            // Map colors to statuses
            const statusColors = labels.map(l => {
                if(l.includes('SELECTED')) return '#10b981';
                if(l.includes('SHORTLISTED')) return '#3b82f6';
                if(l.includes('REJECTED')) return '#ef4444';
                return '#f59e0b'; // Under review / default
            });

            analyticsState.charts.status = new Chart(statusCanvas, {
              type: "doughnut",
              data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: statusColors,
                    borderColor: "#ffffff",
                    borderWidth: 3,
                    hoverOffset: 8,
                }],
              },
              options: {
                cutout: "60%",
                responsive: true,
                plugins: { legend: { position: "right" } }
              },
            });
          }
      }
  }

  // Top Companies Chart
  const topCompContainer = document.getElementById("topCompaniesContainer");
  if (topCompContainer) {
      if (!data.topCompanies || data.topCompanies.length === 0) {
          topCompContainer.innerHTML = getEmptyStateHtml('No offers recorded yet');
      } else {
          const topCompCanvas = document.getElementById("topCompaniesChart");
          if (topCompCanvas) {
            const labels = data.topCompanies.map(d => d.name);
            const values = data.topCompanies.map(d => d.count);
            analyticsState.charts.topCompanies = new Chart(topCompCanvas, {
              type: "bar",
              data: {
                labels: labels,
                datasets: [{
                    label: "Offers Extended",
                    data: values,
                    backgroundColor: "#1B3A6B",
                    borderRadius: 4
                }],
              },
              options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
              },
            });
          }
      }
  }

  // Trend Chart
  const trendContainer = document.getElementById("trendChartContainer");
  if (trendContainer) {
      if (!data.monthlyApplications || data.monthlyApplications.every(v => v === 0) && data.monthlyOffers.every(v => v === 0)) {
          trendContainer.innerHTML = getEmptyStateHtml('No activity recorded yet');
      } else {
          const trendCanvas = document.getElementById("trendChart");
          if (trendCanvas) {
            analyticsState.charts.trend = new Chart(trendCanvas, {
              type: "line",
              data: {
                labels: data.monthLabels,
                datasets: [
                  {
                    label: "Applications",
                    data: data.monthlyApplications,
                    borderColor: "#1B3A6B",
                    backgroundColor: "rgba(27, 58, 107, 0.08)",
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: "#1B3A6B",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2
                  },
                  {
                    label: "Offers",
                    data: data.monthlyOffers,
                    borderColor: "#F5A623",
                    backgroundColor: "rgba(245, 166, 35, 0.08)",
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: "#F5A623",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2
                  },
                ],
              },
              options: {
                responsive: true,
                interaction: { intersect: false, mode: "index" },
                scales: {
                  y: { grid: { color: "#edf2f7" }, border: { display: false } },
                  x: { grid: { display: false }, border: { display: false } },
                },
                plugins: { legend: { position: "top", align: "end" } }
              },
            });
          }
      }
  }
}

function destroyCharts() {
  Object.values(analyticsState.charts).forEach((chart) => chart?.destroy());
  analyticsState.charts.salary = null;
  analyticsState.charts.dept = null;
  analyticsState.charts.trend = null;
  analyticsState.charts.status = null;
  analyticsState.charts.topCompanies = null;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}
