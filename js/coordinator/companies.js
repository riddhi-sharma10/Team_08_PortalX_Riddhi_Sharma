import { api } from "../api.js";

let allCompanies = [];
let searchQuery = "";
let tierFilter = "all";

export async function render(container, app) {
  container.innerHTML = loadingHTML();

  try {
    const companies = await api.get("/companies");
    // Enrich with offer counts from dashboard topCompanies data if available
    allCompanies = (companies || []).map((c) => ({
      id: c.id,
      name: c.name || "Unknown",
      industry: c.industry || "General",
      tier: c.tier || "Unknown",
      website: c.website || null,
      status: c.status || "active",
    }));

    renderShell(container, app);
    wireEvents(container, app);
  } catch (err) {
    console.error("[companies] fetch error:", err);
    container.innerHTML = errorHTML(err.message);
  }
}

function renderShell(container, app) {
  container.innerHTML = `
    <div class="admin-dashboard-shell">
      <!-- Header -->
      <div style="margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;">
        <div>
          <h1 style="font-size:2rem;color:var(--primary);font-weight:800;letter-spacing:-0.5px;display:flex;align-items:center;gap:10px;">
            <ion-icon name="business-outline" style="font-size:1.8rem;color:var(--primary);"></ion-icon>
            All Hiring Companies
          </h1>
          <p style="color:var(--text-muted);font-size:1rem;margin-top:4px;">
            Browse all companies that hire from your placement cell
          </p>
        </div>
        <button id="back-to-dashboard" class="btn-primary" style="display:flex;align-items:center;gap:8px;padding:10px 20px;font-size:0.9rem;">
          <ion-icon name="arrow-back-outline"></ion-icon>
          Back to Dashboard
        </button>
      </div>

      <!-- Search + Filter Bar -->
      <div class="card" style="padding:20px;margin-bottom:24px;border:none;box-shadow:0 4px 16px rgba(0,0,0,0.05);">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <div style="flex:1;min-width:220px;position:relative;">
            <ion-icon name="search-outline" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:1.1rem;pointer-events:none;"></ion-icon>
            <input
              id="co-search"
              type="text"
              placeholder="Search company or industry…"
              style="width:100%;padding:10px 14px 10px 40px;border:1.5px solid var(--border);border-radius:10px;font-size:0.95rem;font-family:inherit;outline:none;transition:border-color 0.2s;box-sizing:border-box;"
              onfocus="this.style.borderColor='var(--primary)'"
              onblur="this.style.borderColor='var(--border)'"
            />
          </div>
          <select id="co-tier-filter" style="padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:0.95rem;font-family:inherit;outline:none;cursor:pointer;color:var(--text-main);background:white;">
            <option value="all">All Tiers</option>
            <option value="Tier 1">Tier 1</option>
            <option value="Tier 2">Tier 2</option>
            <option value="Tier 3">Tier 3</option>
            <option value="Startup">Startup</option>
            <option value="Unknown">Unknown</option>
          </select>
          <span id="co-count-badge" style="background:var(--bg-secondary);color:var(--text-muted);padding:8px 16px;border-radius:10px;font-size:0.85rem;font-weight:700;white-space:nowrap;"></span>
        </div>
      </div>

      <!-- Summary Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px;" id="co-summary-cards"></div>

      <!-- Companies Grid -->
      <div id="co-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;"></div>

      <!-- Empty State -->
      <div id="co-empty" style="display:none;text-align:center;padding:60px 20px;">
        <ion-icon name="business-outline" style="font-size:3.5rem;color:#cbd5e1;"></ion-icon>
        <p style="color:var(--text-muted);font-size:1.1rem;margin-top:12px;font-weight:500;">No companies match your search.</p>
      </div>
    </div>
  `;

  renderSummaryCards();
  renderGrid();
}

function renderSummaryCards() {
  const cards = document.getElementById("co-summary-cards");
  if (!cards) return;

  const total = allCompanies.length;
  const tier1 = allCompanies.filter((c) => c.tier === "Tier 1").length;
  const tier2 = allCompanies.filter((c) => c.tier === "Tier 2").length;
  const tier3 = allCompanies.filter((c) => c.tier === "Tier 3").length;
  const startup = allCompanies.filter((c) => c.tier === "Startup").length;

  const summaryData = [
    { label: "Total Companies", value: total, icon: "business-outline", color: "#1B3A6B", bg: "#e0e7ff" },
    { label: "Tier 1", value: tier1, icon: "star-outline", color: "#10b981", bg: "#dcfce7" },
    { label: "Tier 2", value: tier2, icon: "star-half-outline", color: "#3b82f6", bg: "#dbeafe" },
    { label: "Tier 3", value: tier3, icon: "ellipse-outline", color: "#f59e0b", bg: "#fef3c7" },
    { label: "Startup", value: startup, icon: "rocket-outline", color: "#8b5cf6", bg: "#ede9fe" },
  ];

  cards.innerHTML = summaryData
    .map(
      (s) => `
    <div class="card" style="padding:20px;border:none;box-shadow:0 4px 16px rgba(0,0,0,0.04);display:flex;align-items:center;gap:14px;">
      <div style="width:44px;height:44px;border-radius:12px;background:${s.bg};display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:${s.color};flex-shrink:0;">
        <ion-icon name="${s.icon}"></ion-icon>
      </div>
      <div>
        <p style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:0;">${s.label}</p>
        <h3 style="font-size:1.6rem;font-weight:800;color:${s.color};margin:2px 0 0;">${s.value}</h3>
      </div>
    </div>
  `
    )
    .join("");
}

function renderGrid() {
  const grid = document.getElementById("co-grid");
  const emptyEl = document.getElementById("co-empty");
  const countBadge = document.getElementById("co-count-badge");
  if (!grid) return;

  const filtered = allCompanies.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q);
    const matchTier = tierFilter === "all" || c.tier === tierFilter;
    return matchSearch && matchTier;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${allCompanies.length} companies`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  grid.innerHTML = filtered.map(companyCardHTML).join("");
}

function companyCardHTML(c) {
  const tierConfig = {
    "Tier 1": { color: "#10b981", bg: "#dcfce7", label: "Tier 1" },
    "Tier 2": { color: "#3b82f6", bg: "#dbeafe", label: "Tier 2" },
    "Tier 3": { color: "#f59e0b", bg: "#fef3c7", label: "Tier 3" },
    "Startup": { color: "#8b5cf6", bg: "#ede9fe", label: "Startup" },
    Unknown: { color: "#94a3b8", bg: "#f1f5f9", label: "Unknown" },
  };
  const tier = tierConfig[c.tier] || tierConfig["Unknown"];

  const avatarColors = [
    "#1B3A6B","#0f766e","#7c3aed","#b45309","#be185d","#0369a1"
  ];
  const avatarColor = avatarColors[c.name.charCodeAt(0) % avatarColors.length];

  return `
    <div class="card" style="padding:0;border:none;box-shadow:0 6px 20px rgba(0,0,0,0.05);overflow:hidden;transition:transform 0.2s,box-shadow 0.2s;cursor:default;"
      onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 16px 36px rgba(0,0,0,0.1)'"
      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.05)'"
    >
      <!-- Card Top -->
      <div style="background:linear-gradient(135deg,${avatarColor}18,${avatarColor}08);padding:20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:16px;">
        <div style="width:52px;height:52px;border-radius:14px;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;color:white;flex-shrink:0;box-shadow:0 4px 12px ${avatarColor}44;">
          ${c.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0;">
          <h4 style="margin:0;font-size:1rem;font-weight:800;color:var(--primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</h4>
          <p style="margin:4px 0 0;font-size:0.82rem;color:var(--text-muted);font-weight:500;">${c.industry}</p>
        </div>
        <span style="background:${tier.bg};color:${tier.color};padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:800;white-space:nowrap;flex-shrink:0;">
          ${tier.label}
        </span>
      </div>

      <!-- Card Body -->
      <div style="padding:16px 20px;">
        ${
          c.website
            ? `<a href="${c.website}" target="_blank" rel="noopener noreferrer"
                style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--primary);text-decoration:none;font-weight:600;background:var(--bg-secondary);padding:6px 12px;border-radius:8px;transition:background 0.2s;"
                onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='var(--bg-secondary)'"
              >
                <ion-icon name="globe-outline" style="font-size:0.9rem;"></ion-icon>
                Visit Website
              </a>`
            : `<span style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--text-muted);font-weight:500;">
                <ion-icon name="globe-outline" style="font-size:0.9rem;"></ion-icon>
                No website listed
              </span>`
        }
      </div>
    </div>
  `;
}

function wireEvents(container, app) {
  const searchInput = document.getElementById("co-search");
  const tierSel = document.getElementById("co-tier-filter");
  const backBtn = document.getElementById("back-to-dashboard");

  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderGrid();
  });

  tierSel?.addEventListener("change", (e) => {
    tierFilter = e.target.value;
    renderGrid();
  });

  backBtn?.addEventListener("click", () => app.navigateTo("dashboard"));
}

function loadingHTML() {
  return `<div style="display:flex;align-items:center;justify-content:center;height:400px;flex-direction:column;gap:12px;color:var(--text-muted);">
    <ion-icon name="sync-outline" style="font-size:2.5rem;animation:spin 1s linear infinite;"></ion-icon>
    <p>Loading Companies...</p>
  </div>`;
}

function errorHTML(msg) {
  return `<div style="padding:40px;text-align:center;">
    <ion-icon name="alert-circle-outline" style="font-size:3rem;color:#ef4444;"></ion-icon>
    <h2 style="margin-top:16px;">Failed to load</h2>
    <p style="color:var(--text-muted);margin-top:8px;">${msg}</p>
    <button onclick="window.location.reload()" class="btn-primary" style="margin-top:24px;">Retry</button>
  </div>`;
}
