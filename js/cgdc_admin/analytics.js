// js/admin/analytics.js
import { api } from "../api.js";

let analyticsData = null;

const analyticsState = {
  selectedYear: 'all',
  charts: {
    salary: null,
    dept: null,
    trend: null,
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
    analyticsData = await api.get(`/admin/analytics?year=${analyticsState.selectedYear}`);
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
      availableYears: []
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

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
                <div class="card">
                    <h3 style="margin-bottom: 14px; color:#0f2f61;">Salary Distribution</h3>
                    <canvas id="salaryChart" style="max-height: 300px;"></canvas>
                </div>
                <div class="card">
                    <h3 style="margin-bottom: 14px; color:#0f2f61;">Placement % by Department</h3>
                    <canvas id="pieChart" style="max-height: 300px;"></canvas>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:24px;">
                <div class="card">
                    <h3 style="margin-bottom: 14px; color:#0f2f61;">Applications vs Offers Trend</h3>
                    <canvas id="trendChart" style="max-height: 320px;"></canvas>
                </div>
                <div class="card">
                    <h3 style="margin-bottom: 12px; color:#0f2f61;">Key Insights</h3>
                    <ul id="analytics-insights" style="padding-left: 18px; color: var(--text-muted); display:grid; gap:10px;"></ul>
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
          document.getElementById('salaryChart').parentElement.innerHTML = '<h3 style="margin-bottom: 14px; color:#0f2f61;">Salary Distribution</h3><canvas id="salaryChart" style="max-height: 300px;"></canvas>';
          document.getElementById('pieChart').parentElement.innerHTML = '<h3 style="margin-bottom: 14px; color:#0f2f61;">Placement % by Department</h3><canvas id="pieChart" style="max-height: 300px;"></canvas>';
          document.getElementById('trendChart').parentElement.innerHTML = '<h3 style="margin-bottom: 14px; color:#0f2f61;">Applications vs Offers Trend</h3><canvas id="trendChart" style="max-height: 320px;"></canvas>';
          
          await fetchAnalytics();
          updateAnalyticsView();
      });
  }
}

function updateAnalyticsView() {
  if (!analyticsData) return;

  setText(
    "kpi-placement-rate",
    `${analyticsData.kpis.placementRate.toFixed(1)}%`,
  );
  setText("kpi-avg-lpa", `₹${analyticsData.kpis.avgLpa.toFixed(1)} LPA`);
  setText(
    "kpi-highest-lpa",
    `₹${analyticsData.kpis.highestLpa.toFixed(1)} LPA`,
  );
  setText("kpi-applications", formatNumber(analyticsData.kpis.applications));

  renderInsights(analyticsData.insights);
  renderCharts(analyticsData);
}

function renderInsights(insights) {
  const list = document.getElementById("analytics-insights");
  if (!list) return;
  list.innerHTML = insights.map((point) => `<li>${point}</li>`).join("");
}

function renderCharts(data) {
  destroyCharts();

  const salaryCanvas = document.getElementById("salaryChart");
  if (salaryCanvas) {
    analyticsState.charts.salary = new Chart(salaryCanvas, {
      type: "doughnut",
      data: {
        labels: ["< 5 LPA", "5-10 LPA", "10-20 LPA", "> 20 LPA"],
        datasets: [
          {
            data: data.salaryDistribution,
            backgroundColor: ["#7B8CA5", "#1B3A6B", "#F5A623", "#10b981"],
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverBorderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        cutout: "52%",
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { weight: "600", size: 12 },
              color: "#1e293b",
            },
          },
          tooltip: {
            backgroundColor: "#1B3A6B",
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

  const deptCanvas = document.getElementById("pieChart");
  if (deptCanvas) {
    const deptLabels = data.departments.map((d) => d.name);
    const deptValues = data.departments.map((d) => d.placementPct);
    const deptColors = [
      "#1B3A6B", "#355C91", "#7B8CA5", "#F5A623", "#10b981", 
      "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"
    ];

    analyticsState.charts.dept = new Chart(deptCanvas, {
      type: "pie",
      data: {
        labels: deptLabels,
        datasets: [
          {
            data: deptValues,
            backgroundColor: deptLabels.map((_, i) => deptColors[i % deptColors.length]),
            borderColor: "#ffffff",
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { weight: "600", size: 12 },
              color: "#1e293b",
            },
          },
          tooltip: {
            backgroundColor: "#1B3A6B",
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

  const trendCanvas = document.getElementById("trendChart");
  if (trendCanvas && data.monthLabels && data.monthLabels.length > 0) {
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
            pointBorderWidth: 2,
            hoverPointRadius: 7,
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
            pointBorderWidth: 2,
            hoverPointRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { weight: "600", size: 12 },
              color: "#1e293b",
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
            grid: { color: "#edf2f7", drawBorder: false },
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
}

function destroyCharts() {
  Object.values(analyticsState.charts).forEach((chart) => chart?.destroy());
  analyticsState.charts.salary = null;
  analyticsState.charts.dept = null;
  analyticsState.charts.trend = null;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}
