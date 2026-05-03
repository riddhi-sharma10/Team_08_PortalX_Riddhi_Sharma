import { api } from '../api.js';

let allStudents = [];
let filtered = [];
let statusFilter = 'all';
let searchQuery = '';

export async function render(container, app) {
    container.innerHTML = loadingHTML('Students');

    try {
        allStudents = await api.get('/coordinator/students');
        console.log('[students] count:', allStudents.length);
        filtered = [...allStudents];
        renderShell(container, app);
    } catch (err) {
        console.error('[students] error:', err);
        container.innerHTML = errorHTML(err.message);
    }
}

function renderShell(container, app) {
    container.innerHTML = `
        <div class="admin-dashboard-shell">
            <div class="admin-dashboard-header">
                <div>
                    <h1>My Students</h1>
                    <p>${allStudents.length} student${allStudents.length !== 1 ? 's' : ''} assigned to you</p>
                </div>
                <div style="display:flex;gap:12px;align-items:center;">
                    <input type="text" id="stu-search" placeholder="Search by name or roll..." 
                           value="${searchQuery}"
                           style="padding:9px 16px;border:1px solid #e2e8f0;border-radius:8px;width:260px;font-size:0.9rem;outline:none;">
                    <div style="position:relative;">
                        <button id="filter-btn" class="admin-user-action" type="button">
                            <ion-icon name="funnel-outline"></ion-icon> Filter
                        </button>
                        <div id="filter-panel" class="admin-filter-panel hidden" 
                             style="position:absolute;right:0;top:calc(100% + 8px);z-index:200;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;width:200px;box-shadow:0 8px 24px rgba(0,0,0,0.1);">
                            <label style="font-size:0.75rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:8px;">STATUS</label>
                            <select id="status-select" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:12px;font-size:0.9rem;">
                                <option value="all"    ${statusFilter==='all'    ?'selected':''}>All</option>
                                <option value="active" ${statusFilter==='active' ?'selected':''}>Active</option>
                                <option value="placed" ${statusFilter==='placed' ?'selected':''}>Placed</option>
                                <option value="not_eligible" ${statusFilter==='not_eligible'?'selected':''}>Not Eligible</option>
                                <option value="opted_out"    ${statusFilter==='opted_out'   ?'selected':''}>Opted Out</option>
                            </select>
                            <button id="apply-filter" class="btn-primary" style="width:100%;padding:8px;border-radius:6px;">Apply</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="data-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Roll No</th>
                                <th>Department</th>
                                <th>CGPA</th>
                                <th>Grad Year</th>
                                <th>Status</th>
                                <th style="text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="stu-tbody">
                            ${tableRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    wireEvents(container, app);
}

function tableRows() {
    if (!filtered.length) {
        return `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No students found.</td></tr>`;
    }
    return filtered.map(s => `
        <tr>
            <td>
                <div class="admin-student-cell">
                    <span class="admin-student-initials">${s.avatar}</span>
                    <div>
                        <div style="font-weight:600;">${s.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">${s.email}</div>
                    </div>
                </div>
            </td>
            <td>${s.rollNo}</td>
            <td>${s.department}</td>
            <td><b>${s.cgpa}</b></td>
            <td>${s.gradYear}</td>
            <td><span class="tag ${statusTag(s.status)}">${s.status.replace('_',' ').toUpperCase()}</span></td>
            <td style="text-align:right;">
                <button class="student-profile-btn" data-id="${s.id}" style="background:transparent;border:none;color:var(--primary);font-weight:600;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:4px;margin-left:auto;">
                    View Profile <ion-icon name="arrow-forward-outline"></ion-icon>
                </button>
            </td>
        </tr>
    `).join('');
}

function wireEvents(container, app) {
    const searchInp  = container.querySelector('#stu-search');
    const filterBtn  = container.querySelector('#filter-btn');
    const filterPanel= container.querySelector('#filter-panel');
    const applyBtn   = container.querySelector('#apply-filter');

    searchInp?.addEventListener('input', e => {
        searchQuery = e.target.value.toLowerCase();
        applyFilters();
        const tbody = document.getElementById('stu-tbody');
        if (tbody) tbody.innerHTML = tableRows();
    });

    filterBtn?.addEventListener('click', () => filterPanel?.classList.toggle('hidden'));

    applyBtn?.addEventListener('click', () => {
        statusFilter = container.querySelector('#status-select')?.value || 'all';
        filterPanel?.classList.add('hidden');
        applyFilters();
        const tbody = document.getElementById('stu-tbody');
        if (tbody) tbody.innerHTML = tableRows();
    });

    document.addEventListener('click', e => {
        if (!filterPanel?.contains(e.target) && !filterBtn?.contains(e.target)) {
            filterPanel?.classList.add('hidden');
        }
    }, { once: false });

    // Handle View Profile Clicks
    container.addEventListener('click', e => {
        const btn = e.target.closest('.student-profile-btn');
        if (btn) {
            const studentId = btn.dataset.id;
            sessionStorage.setItem('selectedStudentId', studentId);
            sessionStorage.setItem('profileOrigin', 'students');
            app.navigateTo('student_profile');
        }
    });
}

function applyFilters() {
    filtered = allStudents.filter(s => {
        const sm = !searchQuery || s.name.toLowerCase().includes(searchQuery) || s.rollNo.toLowerCase().includes(searchQuery);
        const fm = statusFilter === 'all' || s.status === statusFilter;
        return sm && fm;
    });
}

function statusTag(s) {
    if (s === 'placed')        return 'tag-success';
    if (s === 'not_eligible')  return 'tag-danger';
    if (s === 'opted_out')     return 'tag-muted';
    return 'tag-info';
}

function loadingHTML(p) {
    return `<div style="display:flex;align-items:center;justify-content:center;height:400px;flex-direction:column;gap:12px;color:var(--text-muted);">
        <ion-icon name="sync-outline" style="font-size:2.5rem;animation:spin 1s linear infinite;"></ion-icon>
        <p>Loading ${p}...</p></div>`;
}
function errorHTML(msg) {
    return `<div style="padding:40px;text-align:center;">
        <ion-icon name="alert-circle-outline" style="font-size:3rem;color:#ef4444;"></ion-icon>
        <h2 style="margin-top:16px;">Error</h2>
        <p style="color:var(--text-muted);margin-top:8px;">${msg}</p></div>`;
}
