import { api } from "../api.js";

export async function render(container, app) {
  container.innerHTML = loadingHTML("Dashboard");

  try {
    // Fetch both dashboard stats AND real profile in parallel
    // Profile gives us the TRUE name from PLACEMENT_COORDINATOR (not the stale localStorage name)
    const [stats, profile] = await Promise.all([
      api.get("/coordinator/dashboard"),
      api.get("/coordinator/profile"),
    ]);

    console.log("[dashboard] stats received:", stats);
    console.log("[dashboard] appStats:", stats.appStats);

    // Sync real name into app state so navbar also stays consistent
    if (profile.name) {
      app.state.user.name = profile.name;
      // Re-render navbar with the correct name
      if (app.Navbar) app.Navbar.render(app.state.user);
    }

    renderShell(container, profile.name, profile.department, stats);
  } catch (err) {
    console.error("[dashboard] fetch error:", err);
    container.innerHTML = errorHTML(err.message);
  }
}

function renderShell(container, coordName, dept, stats) {
  const firstName = (coordName || "Coordinator").split(" ")[0];

  container.innerHTML = `
        <div class="admin-dashboard-shell">
            <div class="admin-dashboard-header">
                <div>
                    <h1>Welcome, ${firstName}! 👋</h1>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">${dept} Placement Coordinator</p>
                </div>
            </div>

            <div class="admin-stat-grid">
                ${statCard("people-circle-outline", "Total Students", stats.totalStudents, "Assigned to you", false)}
                ${statCard("checkmark-done-circle-outline", "Placed", stats.totalPlaced, stats.placementRate + "% rate", true)}
                ${statCard("pulse-outline", "Currently Active", stats.totalActive, "Seeking placement", false)}
                ${statCard("calendar-outline", "Upcoming Interviews", stats.upcomingInterviews, "Scheduled ahead", false)}
            </div>

            <!-- Placement Progress Bar -->
            <div class="card" style="margin-top:24px;padding:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <div>
                        <h3 style="margin:0;">Placement Progress</h3>
                        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px;">
                            ${stats.totalPlaced} of ${stats.totalStudents} students placed
                        </p>
                    </div>
                    <span class="tag tag-success" style="font-size:1rem;padding:8px 20px;">
                        ${stats.placementRate}%
                    </span>
                </div>
                <div style="background:#f1f5f9;border-radius:12px;overflow:hidden;height:18px;">
                    <div style="width:${Math.min(Number(stats.placementRate), 100)}%;background:linear-gradient(90deg,#0f2f61,#3b6cc7);height:100%;border-radius:12px;transition:width 1.2s ease;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:0.78rem;color:var(--text-muted);font-weight:600;">
                    <span>0%</span><span>50%</span><span>100%</span>
                </div>
            </div>

            <!-- Analytics Charts Row -->
            <div class="admin-grid-two" style="margin-top:24px;">
                <div class="card" style="padding:24px;">
                    <div class="admin-card-head">
                        <h3>Placement Distribution</h3>
                    </div>
                    <div style="position:relative; height:240px; width:100%; display:flex; justify-content:center; margin-top:20px;">
                        <canvas id="coordPlacementChart"></canvas>
                    </div>
                </div>

                <div class="card" style="padding:24px;">
                    <div class="admin-card-head">
                        <h3>Top Application Destinations</h3>
                    </div>
                    <div id="appStatsContainer" style="position:relative; height:240px; width:100%; margin-top:20px;">
                        <canvas id="coordAppChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Quick Summary Row -->
            <div class="admin-grid-two" style="margin-top:24px;">
                <div class="card" style="padding:24px;">
                    <div class="admin-card-head">
                        <h3>Coordinator Info</h3>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:14px;margin-top:16px;">
                        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                            <span style="color:var(--text-muted);font-size:0.85rem;font-weight:600;">Full Name</span>
                            <span style="font-weight:700;">${coordName}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                            <span style="color:var(--text-muted);font-size:0.85rem;font-weight:600;">Department</span>
                            <span style="font-weight:700;">${dept}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:10px 0;">
                            <span style="color:var(--text-muted);font-size:0.85rem;font-weight:600;">Students Managed</span>
                            <span class="tag tag-info">${stats.totalStudents}</span>
                        </div>
                    </div>
                </div>
                <div class="card" style="padding:24px;">
                    <div class="admin-card-head">
                        <h3>Quick Stats</h3>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:14px;margin-top:16px;">
                        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                            <span style="color:var(--text-muted);font-size:0.85rem;font-weight:600;">Total Applications</span>
                            <span class="tag tag-warning">${stats.totalApplications}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                            <span style="color:var(--text-muted);font-size:0.85rem;font-weight:600;">Placed Students</span>
                            <span class="tag tag-success">${stats.totalPlaced}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:10px 0;">
                            <span style="color:var(--text-muted);font-size:0.85rem;font-weight:600;">Upcoming Interviews</span>
                            <span class="tag tag-info">${stats.upcomingInterviews}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  setTimeout(() => initCharts(stats), 200);
}

function initCharts(stats) {
  console.log("[initCharts] initializing with:", stats.appStats);
  if (!window.Chart) {
    console.warn("Chart.js not loaded!");
    return;
  }

  // Register Datalabels global plugin
  if (window.ChartDataLabels) {
    Chart.register(window.ChartDataLabels);
  }

  // Global Theme Settings
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = "#64748b";

  // 1. Placement Distribution Pie Chart
  const placementCtx = document.getElementById("coordPlacementChart");
  if (placementCtx) {
    const unplaced = Math.max(0, stats.totalStudents - stats.totalPlaced);

    new Chart(placementCtx, {
      type: "doughnut",
      data: {
        labels: [
          `Placed Students: ${stats.totalPlaced}`,
          `Currently Pending: ${unplaced}`,
        ],
        datasets: [
          {
            data: [stats.totalPlaced, unplaced],
            backgroundColor: ["#10b981", "#cbd5e1"],
            borderColor: "#ffffff",
            borderWidth: 4,
            hoverBorderWidth: 4,
            hoverOffset: 6,
            hoverBackgroundColor: ["#059669", "#94a3b8"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        layout: { padding: { top: 10, bottom: 10 } },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              boxWidth: 10,
              padding: 24,
              font: { weight: "700", size: 13 },
            },
          },
          datalabels: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#0f2f61",
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            titleFont: { size: 13, weight: "700" },
            bodyFont: { size: 14 },
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
          },
        },
      },
    });
  }

  // 2. Application Destinations Bar Chart
  const appCtx = document.getElementById("coordAppChart");
  if (appCtx && stats.appStats && stats.appStats.length > 0) {
    const labels = stats.appStats.map((s) => s.company);
    const data = stats.appStats.map((s) => s.count);

    // Create dynamic gradient with multiple colors
    const ctx2d = appCtx.getContext("2d");

    // Color palette: Dark Blue → Golden Yellow → Green
    const colors = [
      "#1B3A6B",
      "#2c5282",
      "#F5A623",
      "#D4A620",
      "#10b981",
      "#059669",
    ];
    const colorDataset = data.map((_, index) => {
      return colors[index % colors.length];
    });

    new Chart(appCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Active Applications",
            data: data,
            backgroundColor: colorDataset,
            hoverBackgroundColor: colorDataset.map((color) => {
              // Lighten on hover
              if (color === "#1B3A6B") return "#0f2f61";
              if (color === "#2c5282") return "#1B3A6B";
              if (color === "#F5A623") return "#e09612";
              if (color === "#D4A620") return "#c09316";
              if (color === "#10b981") return "#059669";
              if (color === "#059669") return "#047857";
              return color;
            }),
            borderRadius: 8,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 50 } },
        plugins: {
          legend: { display: false },
          datalabels: {
            color: "#1e293b",
            anchor: "end",
            align: "end",
            offset: 8,
            font: { weight: "800", size: 14, family: "Inter" },
            formatter: (value) => (value > 0 ? value : ""),
            display: function (context) {
              return context.dataset.data[context.dataIndex] > 0;
            },
          },
          tooltip: {
            backgroundColor: "#1B3A6B",
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            titleFont: { size: 13, weight: "700" },
            bodyFont: { size: 14 },
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            callbacks: {
              label: function (context) {
                return " Applications: " + context.parsed.y;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { display: true, color: "#f1f5f9", drawBorder: false },
            ticks: {
              stepSize: 1,
              padding: 10,
              font: { weight: "600", color: "#64748b" },
            },
            border: { display: false },
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: {
              padding: 10,
              font: { weight: "600", color: "#1e293b" },
              maxRotation: 45,
              minRotation: 0,
            },
            border: { display: false },
          },
        },
      },
    });
  } else if (appCtx) {
    appCtx.parentElement.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.9rem;font-weight:600;">No application data available yet.</div>';
  }
}

function statCard(icon, label, value, sub, highlight) {
  return `
        <div class="card admin-stat-card ${highlight ? "admin-stat-card-highlight" : ""}">
            <div class="admin-stat-top">
                <div class="admin-stat-icon">
                    <ion-icon name="${icon}"></ion-icon>
                </div>
            </div>
            <div class="admin-stat-meta">
                <p>${label}</p>
                <h2>${value ?? 0}</h2>
            </div>
            <p style="color:var(--text-muted);font-size:0.8rem;margin-top:6px;">${sub}</p>
        </div>
    `;
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
