// js/admin/records.js
import { api } from '../api.js';

let allRecords = [];
let availableYears = [];

const recordsState = {
    query: '',
    status: 'all',
    department: 'all',
    selectedYear: 'all'
};

export async function render(container, app) {
    await fetchRecords(container);
    renderPage(container, app);
}

async function fetchRecords(container) {
    if (container) {
        container.innerHTML = `
            <div class="admin-dashboard-shell" style="display:flex;align-items:center;justify-content:center;min-height:400px;">
                <div style="text-align:center;color:var(--text-muted);">
                    <ion-icon name="hourglass-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px;"></ion-icon>
                    <p>Loading placement records...</p>
                </div>
            </div>
        `;
    }

    try {
        const data = await api.get(`/admin/records?year=${recordsState.selectedYear}`);
        allRecords = (data?.rows || []).map(row => ({
            ...row,
            student: row.student || 'Unknown',
            department: row.department || 'Unknown',
            company: row.company || '-',
            packageLpa: Number(row.packageLpa || 0),
            status: formatStatusLabel(row.status),
            initials: row.initials || getInitials(row.student || 'U')
        }));
        availableYears = data?.availableYears || [];
    } catch (err) {
        console.error('Failed to load records from API:', err);
        allRecords = [];
        availableYears = [];
    }
    
    // Ensure 2024, 2025, 2026 are always available for the filter dropdown
    const requiredYears = [2026, 2025, 2024];
    requiredYears.forEach(y => {
        if (!availableYears.includes(y)) availableYears.push(y);
    });
    availableYears.sort((a, b) => b - a);
}

function renderPage(container, app) {
    const filteredRecords = getFilteredRecords(allRecords);
    const statusSummary = getStatusSummary(allRecords);
    const departmentOptions = Array.from(new Set(allRecords.map((record) => record.department)));
    const placedRecords = allRecords.filter(r => r.status === 'Placed');
    const placementRate = getPlacementRate(allRecords);
    const highestPackage = getHighestPackage(placedRecords);
    const topRecruiter = getTopRecruiter(allRecords);
    const totalPlaced = placedRecords.length;
    const totalOffers = allRecords.length;
    const uniqueCompanies = new Set(allRecords.map(r => r.company)).size;
    const avgPackage = placedRecords.length ? (placedRecords.reduce((s, r) => s + r.packageLpa, 0) / placedRecords.length).toFixed(1) : '0.0';

    const yearsOptions = ['all', ...availableYears].map(yr => {
        const label = yr === 'all' ? 'All Time' : yr;
        const selected = String(yr) === String(recordsState.selectedYear) ? 'selected' : '';
        return `<option value="${yr}" ${selected}>${label}</option>`;
    }).join('');

    container.innerHTML = `
        <div class="admin-dashboard-shell admin-records-shell">
            <div class="admin-dashboard-header admin-records-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h1>Placement Records</h1>
                </div>
                <div>
                    <label style="font-size: 0.9rem; font-weight: 500; color: #64748b; margin-right: 8px;">Filter by Year:</label>
                    <select id="records-year-filter" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.95rem; font-family: inherit; font-weight: 500; cursor: pointer; outline: none; background: #fff;">
                        ${yearsOptions}
                    </select>
                </div>
            </div>

            <div class="card admin-record-hero">
                <div class="admin-record-hero-top">
                    <div>
                        <p class="admin-record-label">Database Records</p>
                        <h2>All Placement Records</h2>
                        <p>${allRecords.length} total records loaded from the placement database.</p>
                    </div>
                </div>

                <div class="admin-record-stats">
                    <div class="admin-record-stat">
                        <span>Total Placements</span>
                        <strong>${formatNumber(totalPlaced)}</strong>
                    </div>
                    <div class="admin-record-stat">
                        <span>Total Records</span>
                        <strong>${formatNumber(totalOffers)}</strong>
                    </div>
                    <div class="admin-record-stat">
                        <span>Hiring Companies</span>
                        <strong>${formatNumber(uniqueCompanies)}</strong>
                    </div>
                    <div class="admin-record-stat admin-record-stat-accent">
                        <span>Average Package</span>
                        <strong>${avgPackage} LPA</strong>
                    </div>
                    <div class="admin-record-stat">
                        <span>Highest Package</span>
                        <strong>${highestPackage.toFixed(1)} LPA</strong>
                    </div>
                </div>
            </div>

            <div class="admin-grid-two admin-grid-balance">
                <div class="card admin-record-flow-card">
                    <div class="admin-card-head">
                        <h3>Placement Flow</h3>
                        <span>How the cycle moved across the year</span>
                    </div>
                    <div class="admin-record-flow">
                        <div class="admin-record-flow-step">
                            <span>1</span>
                            <div>
                                <strong>Registration</strong>
                                <p>Students complete profile and eligibility checks.</p>
                            </div>
                        </div>
                        <div class="admin-record-flow-step">
                            <span>2</span>
                            <div>
                                <strong>Shortlisting</strong>
                                <p>Companies review applications and shortlist candidates.</p>
                            </div>
                        </div>
                        <div class="admin-record-flow-step">
                            <span>3</span>
                            <div>
                                <strong>Interviews</strong>
                                <p>Technical and HR rounds are tracked through the cycle.</p>
                            </div>
                        </div>
                        <div class="admin-record-flow-step">
                            <span>4</span>
                            <div>
                                <strong>Final Outcome</strong>
                                <p>Placed, in-progress, or rejected status is updated.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card admin-record-summary-card">
                    <div class="admin-card-head">
                        <h3>Summary</h3>
                        <span>Quick snapshot of placement records</span>
                    </div>
                    <div class="admin-record-summary-list">
                        <div>
                            <span>Total Records</span>
                            <strong>${formatNumber(allRecords.length)}</strong>
                        </div>
                        <div>
                            <span>Placement ratio</span>
                            <strong>${placementRate}% placed</strong>
                        </div>
                        <div>
                            <span>Top recruiter</span>
                            <strong>${topRecruiter}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card admin-record-table-card">
                <div class="admin-card-head admin-card-head-inline">
                    <div>
                        <h3>Placement Records</h3>
                        <span>Live data from the database</span>
                    </div>
                    <span class="admin-record-pill">${formatNumber(filteredRecords.length)} / ${formatNumber(allRecords.length)} entries</span>
                </div>

                <div class="admin-record-controls">
                    <div class="admin-record-search">
                        <ion-icon name="search-outline"></ion-icon>
                        <input id="admin-record-search" type="text" placeholder="Search student, department, company..." value="${recordsState.query}">
                    </div>

                    <select id="admin-record-status-filter" aria-label="Filter by record status">
                        <option value="all" ${recordsState.status === 'all' ? 'selected' : ''}>All Status</option>
                        <option value="Placed" ${recordsState.status === 'Placed' ? 'selected' : ''}>Placed</option>
                        <option value="Active" ${recordsState.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Rejected" ${recordsState.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>

                    <select id="admin-record-dept-filter" aria-label="Filter by department">
                        <option value="all" ${recordsState.department === 'all' ? 'selected' : ''}>All Departments</option>
                        ${departmentOptions.map((department) => `<option value="${department}" ${recordsState.department === department ? 'selected' : ''}>${department}</option>`).join('')}
                    </select>
                </div>

                <div class="admin-record-status-row">
                    ${renderStatusChip('all', 'All', allRecords.length)}
                    ${renderStatusChip('Placed', 'Placed', statusSummary.Placed)}
                    ${renderStatusChip('Active', 'Active', statusSummary['Active'])}
                    ${renderStatusChip('Rejected', 'Rejected', statusSummary.Rejected)}
                </div>

                <div class="data-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Department</th>
                                <th>Company</th>
                                <th>Package (LPA)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredRecords.length ? filteredRecords.map((record) => `
                                    <tr>
                                        <td>
                                            <div class="admin-record-student">
                                                <div class="admin-record-avatar">${record.initials}</div>
                                                <strong>${record.student}</strong>
                                            </div>
                                        </td>
                                        <td>${record.department}</td>
                                        <td>${record.company}</td>
                                        <td>${record.packageLpa.toFixed(1)}</td>
                                        <td><span class="tag ${getStatusTag(record.status)}">${record.status}</span></td>
                                    </tr>
                                `).join('')
                                : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No records match your filters.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    bindInteractions(container, app);
}

function bindInteractions(container, app) {
    container.querySelector('#records-year-filter')?.addEventListener('change', async (event) => {
        recordsState.selectedYear = event.target.value;
        await fetchRecords(container);
        renderPage(container, app);
    });

    container.querySelector('#admin-record-search')?.addEventListener('input', (event) => {
        recordsState.query = event.target.value.trim();
        renderPage(container, app);
    });

    container.querySelector('#admin-record-status-filter')?.addEventListener('change', (event) => {
        recordsState.status = event.target.value;
        renderPage(container, app);
    });

    container.querySelector('#admin-record-dept-filter')?.addEventListener('change', (event) => {
        recordsState.department = event.target.value;
        renderPage(container, app);
    });

    container.querySelectorAll('.admin-record-chip').forEach((button) => {
        button.addEventListener('click', () => {
            recordsState.status = button.dataset.status;
            renderPage(container, app);
        });
    });
}

function getFilteredRecords(records) {
    const query = recordsState.query.toLowerCase();

    return records.filter((record) => {
        const queryMatch = !query || [
            record.student,
            record.department,
            record.company,
            record.status,
            record.packageLpa
        ].some((value) => String(value).toLowerCase().includes(query));

        const statusMatch = recordsState.status === 'all' || record.status === recordsState.status;
        const departmentMatch = recordsState.department === 'all' || record.department === recordsState.department;

        return queryMatch && statusMatch && departmentMatch;
    });
}

function getStatusSummary(records) {
    return records.reduce((acc, record) => {
        const key = record.status;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, { Placed: 0, 'Active': 0, Rejected: 0 });
}

function getPlacementRate(records) {
    if (!records.length) return '0.0';
    const placed = records.filter((record) => record.status === 'Placed').length;
    return ((placed / records.length) * 100).toFixed(1);
}

function getHighestPackage(records) {
    if (!records.length) return 0;
    return Math.max(...records.map((record) => record.packageLpa));
}

function getTopRecruiter(records) {
    if (!records.length) return '-';

    const counts = records.reduce((acc, record) => {
        acc[record.company] = (acc[record.company] || 0) + 1;
        return acc;
    }, {});

    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return `${top[0]} (${top[1]})`;
}

function renderStatusChip(status, label, count) {
    return `
        <button type="button" class="admin-record-chip ${recordsState.status === status ? 'active' : ''}" data-status="${status}">
            ${label}
            <span>${count}</span>
        </button>
    `;
}

function formatStatusLabel(status) {
    // The API normalizes statuses to placed/active/rejected
    if (status === 'placed') return 'Placed';
    if (status === 'active') return 'Active';
    if (status === 'rejected') return 'Rejected';
    return 'Active';
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-IN').format(value);
}

function getInitials(name) {
    return name.split(' ').slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function getStatusTag(status) {
    if (status === 'Placed') return 'tag-success';
    if (status === 'Active') return 'tag-warning';
    return 'tag-danger';
}
