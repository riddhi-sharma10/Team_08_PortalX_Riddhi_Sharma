// js/admin/users.js
import { api } from '../api.js';

let users = [];

const state = {
    currentPage: 1,
    perPage: 10,
    filters: getDefaultFilters()
};

export async function render(container, app) {
    resetUsersState();

    // Show loading state
    container.innerHTML = `
        <div class="admin-users-shell" style="display:flex;align-items:center;justify-content:center;min-height:400px;">
            <div style="text-align:center;color:var(--text-muted);">
                <ion-icon name="hourglass-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px;"></ion-icon>
                <p>Loading user directory...</p>
            </div>
        </div>
    `;

    // Fetch all roles in parallel
    try {
        const [studentRows, coordRows, adminRows] = await Promise.all([
            api.get('/admin/users?role=Student'),
            api.get('/admin/users?role=Coordinator'),
            api.get('/admin/users?role=Admin')
        ]);
        users = [...(studentRows || []), ...(coordRows || []), ...(adminRows || [])];
    } catch (err) {
        console.error('Failed to load users from API:', err);
        users = [];
    }

    container.innerHTML = `
        <div class="admin-users-shell">
            <div class="admin-users-topline">
                <h2>The Placement Cell</h2>
            </div>

            <div class="admin-users-tabs" role="tablist" aria-label="User directory views">
                <button class="admin-users-tab active" data-view="Student" type="button">Student</button>
                <button class="admin-users-tab" data-view="Coordinator" type="button">Coordinator</button>
                <button class="admin-users-tab" data-view="Admin" type="button">Admin</button>
            </div>

            <div class="admin-users-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h1>User Directory</h1>
                <button id="user-add-student-btn" class="btn-primary" type="button" style="padding: 10px 20px; border-radius: 6px; font-weight: 600;">
                    <ion-icon name="add-outline"></ion-icon> Add Student
                </button>
            </div>

            <div class="admin-users-kpis">
                <div class="card admin-users-kpi-card">
                    <div class="admin-users-kpi-top">
                        <ion-icon name="people-outline"></ion-icon>
                        <span class="admin-kpi-up">+12%</span>
                    </div>
                    <p>Total Users</p>
                    <h3 id="kpi-total-users">0</h3>
                </div>
                <div class="card admin-users-kpi-card">
                    <div class="admin-users-kpi-top">
                        <ion-icon name="school-outline"></ion-icon>
                        <span class="admin-kpi-up">+8%</span>
                    </div>
                    <p>Students</p>
                    <h3 id="kpi-students">0</h3>
                </div>
                <div class="card admin-users-kpi-card">
                    <div class="admin-users-kpi-top">
                        <ion-icon name="star-outline"></ion-icon>
                    </div>
                    <p>Coordinators</p>
                    <h3 id="kpi-coordinators">0</h3>
                </div>
                <div class="card admin-users-kpi-card">
                    <div class="admin-users-kpi-top">
                        <ion-icon name="shield-checkmark-outline"></ion-icon>
                    </div>
                    <p>Admins</p>
                    <h3 id="kpi-core-team">0</h3>
                </div>
            </div>

            <div class="card admin-users-directory-card">
                <div class="admin-users-filter-row">
                    <div class="admin-users-search-wrap">
                        <ion-icon name="search-outline"></ion-icon>
                        <input id="user-search" type="text" placeholder="Search by name, ID, username, or email...">
                    </div>

                    <div class="admin-filter-wrap">
                        <button id="user-filter-btn" class="btn-primary admin-filter-btn" type="button">
                            <ion-icon name="funnel-outline"></ion-icon>
                            Filters
                        </button>
                        <div id="user-filter-panel" class="admin-filter-panel hidden">
                            <div class="admin-filter-title">Apply Filters</div>
                            <div class="admin-filter-grid">
                                <label>
                                    <span>Status</span>
                                    <select id="user-status-filter" aria-label="Filter by status">
                                        <option value="all">All</option>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Suspended">Suspended</option>
                                    </select>
                                </label>
                                <label>
                                    <span>Branch</span>
                                    <select id="user-branch-filter" aria-label="Filter by branch">
                                        <option value="all">All</option>
                                        <option value="CSE">CSE</option>
                                        <option value="ECE">ECE</option>
                                        <option value="ME">ME</option>
                                    </select>
                                </label>
                                <label>
                                    <span>Permission</span>
                                    <select id="user-permission-filter" aria-label="Filter by permission level">
                                        <option value="all">All</option>
                                        <option value="Standard">Standard</option>
                                        <option value="Elevated">Elevated</option>
                                        <option value="Restricted">Restricted</option>
                                    </select>
                                </label>
                                <label>
                                    <span>Activity</span>
                                    <select id="user-activity-filter" aria-label="Filter by activity">
                                        <option value="all">All</option>
                                        <option value="0-7">Last 7 days</option>
                                        <option value="8-30">Last 8-30 days</option>
                                        <option value="31+">31+ days inactive</option>
                                    </select>
                                </label>
                            </div>
                            <div class="admin-filter-actions">
                                <button id="user-reset-filters" class="admin-user-action" type="button">Reset</button>
                                <button id="user-apply-filters" class="btn-primary" type="button">Apply</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="data-table-container">
                    <table>
                        <thead id="user-directory-head">
                            ${renderTableHead()}
                        </thead>
                        <tbody id="user-directory-body"></tbody>
                    </table>
                </div>

                <div class="admin-users-footer">
                    <p id="user-results-summary"></p>
                    <div id="user-pagination" class="admin-users-pagination"></div>
                </div>
            </div>
        </div>

        <!-- Add Student Modal -->
        <div id="addStudentModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(6px);">
            <div style="background: white; border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,0.22); width: 100%; max-width: 700px; max-height: 92vh; overflow-y: auto; border: 1px solid #dbe4f0;">
                <div style="padding: 24px 28px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; background: linear-gradient(180deg, #ffffff, #f8fbff); position: sticky; top: 0; z-index: 1;">
                    <div>
                        <p style="margin: 0 0 6px 0; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">New Record</p>
                        <h2 style="font-size: 1.65rem; color: var(--primary); margin: 0;">Add New Student</h2>
                    </div>
                    <button id="closeStudentModalBtn" type="button" style="background: #eff6ff; border: 1px solid #bfdbfe; font-size: 1.35rem; color: var(--primary); cursor: pointer; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700;">×</button>
                </div>

                <form id="studentForm" style="display: grid; gap: 18px; padding: 24px 28px 28px;">
                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;">
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Student Name *</label>
                            <input type="text" id="studentName" required style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Email Address *</label>
                            <input type="email" id="studentEmail" required style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Phone Number</label>
                            <input type="text" id="studentPhone" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Date of Birth</label>
                            <input type="date" id="studentDob" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Department *</label>
                            <select id="studentDept" required style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                                <option value="">Select Department</option>
                                <option value="Computer Science">Computer Science</option>
                                <option value="IT">IT</option>
                                <option value="Electronics">Electronics</option>
                                <option value="Mechanical">Mechanical</option>
                                <option value="Civil">Civil</option>
                            </select>
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Graduation Year *</label>
                            <input type="number" id="studentGradYear" required min="2000" max="2100" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">CGPA</label>
                            <input type="number" id="studentCgpa" step="0.01" min="0" max="10" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Profile Status</label>
                            <select id="studentProfileStatus" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                                <option value="active">Active</option>
                                <option value="not_eligible">Not Eligible</option>
                                <option value="opted_out">Opted Out</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" id="cancelStudentBtn" style="flex: 1; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: white; color: var(--text-main); font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" id="submitStudentBtn" style="flex: 1; padding: 12px 16px; border: none; border-radius: 8px; background: var(--primary); color: white; font-weight: 600; cursor: pointer;">Add Student</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    hydrateKpis();
    bindEvents();
    bindStudentModalEvents(container, app);
    configureFiltersForRole();
    renderTable();
}

function hydrateKpis() {
    const total = users.length;
    const students = users.filter((u) => String(u.role).toLowerCase() === 'student').length;
    const coordinators = users.filter((u) => String(u.role).toLowerCase() === 'coordinator').length;
    const admins = users.filter((u) => String(u.role).toLowerCase() === 'cgdc_admin' || String(u.role).toLowerCase() === 'admin').length;

    setText('kpi-total-users', formatNumber(total));
    setText('kpi-students', formatNumber(students));
    setText('kpi-coordinators', formatNumber(coordinators));
    setText('kpi-core-team', formatNumber(admins));
}

function bindEvents() {
    document.querySelectorAll('.admin-users-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-users-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            state.filters.viewRole = tab.dataset.view;

            resetFiltersForRoleSwitch();
            configureFiltersForRole();
            state.currentPage = 1;
            renderTable();
        });
    });

    document.getElementById('user-search')?.addEventListener('input', (e) => {
        state.filters.query = e.target.value.trim().toLowerCase();
        state.currentPage = 1;
        renderTable();
    });

    const filterBtn = document.getElementById('user-filter-btn');
    const filterPanel = document.getElementById('user-filter-panel');
    const applyBtn = document.getElementById('user-apply-filters');

    filterBtn?.addEventListener('click', () => {
        syncFilterPanelInputsFromState();
        filterPanel?.classList.toggle('hidden');
    });

    applyBtn?.addEventListener('click', () => {
        state.filters.status = getSelectValue('user-status-filter');
        state.filters.branch = getSelectValue('user-branch-filter');
        state.filters.permission = getSelectValue('user-permission-filter');
        state.filters.activity = getSelectValue('user-activity-filter');
        state.currentPage = 1;
        filterPanel?.classList.add('hidden');
        renderTable();
    });

    document.getElementById('user-reset-filters')?.addEventListener('click', () => {
        resetFiltersForRoleSwitch();
        state.currentPage = 1;

        configureFiltersForRole();
        syncFilterPanelInputsFromState();
        renderTable();
    });

    document.addEventListener('click', (event) => {
        if (!filterPanel || !filterBtn) return;
        const target = event.target;
        if (target instanceof Node && !filterPanel.contains(target) && !filterBtn.contains(target)) {
            filterPanel.classList.add('hidden');
        }
    });

}

function bindStudentModalEvents(container, app) {
    const modal = document.getElementById('addStudentModal');
    const openBtn = document.getElementById('user-add-student-btn');
    const closeBtn = document.getElementById('closeStudentModalBtn');
    const cancelBtn = document.getElementById('cancelStudentBtn');
    const form = document.getElementById('studentForm');

    function openModal() {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            if (form) form.reset();
        }
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitStudentBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            const payload = {
                name: document.getElementById('studentName').value.trim(),
                email: document.getElementById('studentEmail').value.trim(),
                phone: document.getElementById('studentPhone').value.trim(),
                dob: document.getElementById('studentDob').value || null,
                dept: document.getElementById('studentDept').value,
                graduation_yr: document.getElementById('studentGradYear').value,
                cgpa: document.getElementById('studentCgpa').value || null,
                profile_status: document.getElementById('studentProfileStatus').value
            };

            try {
                await api.post('/admin/student', payload);
                alert('Student added successfully!');
                closeModal();
                // Re-render user directory to show the new student
                render(container, app);
            } catch (err) {
                console.error(err);
                alert('Error adding student: ' + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Add Student';
                }
            }
        });
    }
}

function renderTable() {
    const filtered = users.filter(matchesFilters);
    const pages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    if (state.currentPage > pages) state.currentPage = pages;

    const start = (state.currentPage - 1) * state.perPage;
    const end = start + state.perPage;
    const pageRows = filtered.slice(start, end);

    const tbody = document.getElementById('user-directory-body');
    const thead = document.getElementById('user-directory-head');
    if (!tbody) return;

    if (thead) {
        thead.innerHTML = renderTableHead();
    }

    const includeBranch = state.filters.viewRole === 'Student' || state.filters.viewRole === 'Coordinator';
    const noDataColspan = includeBranch ? 6 : 5;

    tbody.innerHTML = pageRows.length
        ? pageRows.map((user, idx) => renderRow(user, start + idx + 1)).join('')
        : `<tr><td colspan="${noDataColspan}" style="text-align:center;color:var(--text-muted);">No users match the selected filters.</td></tr>`;

    renderPagination(filtered.length, pages);
    renderSummary(filtered.length, start, pageRows.length);
}

function matchesFilters(user) {
    const queryMatch = !state.filters.query || [
        user.name,
        user.username,
        user.email,
        user.entityId,
        user.branch,
        user.role,
        user.status,
        user.permission
    ].some((field) => String(field).toLowerCase().includes(state.filters.query));

    const normalizedViewRole = state.filters.viewRole.toLowerCase() === 'admin' ? 'cgdc_admin' : state.filters.viewRole.toLowerCase();
    const roleMatch = String(user.role).toLowerCase() === normalizedViewRole;
    const statusMatch = state.filters.status === 'all' || String(user.status).toLowerCase() === String(state.filters.status).toLowerCase();
    const branchMatch = state.filters.branch === 'all' || String(user.branch).toLowerCase() === String(state.filters.branch).toLowerCase();
    const permissionMatch = state.filters.permission === 'all' || String(user.permission).toLowerCase() === String(state.filters.permission).toLowerCase();

    const activityMatch = (() => {
        if (state.filters.activity === 'all') return true;
        if (state.filters.activity === '0-7') return user.lastLoginDays >= 0 && user.lastLoginDays <= 7;
        if (state.filters.activity === '8-30') return user.lastLoginDays >= 8 && user.lastLoginDays <= 30;
        if (state.filters.activity === '31+') return user.lastLoginDays >= 31;
        return true;
    })();

    return queryMatch && roleMatch && statusMatch && branchMatch && permissionMatch && activityMatch;
}

function renderRow(user, serial) {
    const includeBranch = state.filters.viewRole === 'Student' || state.filters.viewRole === 'Coordinator';

    return `
        <tr>
            <td>${String(serial).padStart(2, '0')}</td>
            <td>
                <div class="admin-user-name-cell">
                    <span class="admin-user-avatar">${getInitials(user.name)}</span>
                    <div>
                        <strong>${user.name}</strong>
                        <p>${user.email}</p>
                    </div>
                </div>
            </td>
            <td><span class="tag ${getRoleTag(user.role)}">${user.role.toUpperCase()}</span></td>
            ${includeBranch ? `<td>${user.branch || '-'}</td>` : ''}
            <td>${user.entityId}</td>
            <td><span class="tag ${getStatusTag(user.status)}">${user.status.toUpperCase()}</span></td>
        </tr>
    `;
}

function renderTableHead() {
    const includeBranch = state.filters.viewRole === 'Student' || state.filters.viewRole === 'Coordinator';

    return `
        <tr>
            <th>#</th>
            <th>Username</th>
            <th>Role</th>
            ${includeBranch ? '<th>Branch</th>' : ''}
            <th>Entity ID</th>
            <th>Status</th>
        </tr>
    `;
}

function renderPagination(total, pages) {
    const pagination = document.getElementById('user-pagination');
    if (!pagination) return;

    if (total === 0) {
        pagination.innerHTML = '';
        return;
    }

    const pageButtons = getPageList(state.currentPage, pages);
    pagination.innerHTML = `
        <button class="admin-page-btn" data-page="prev" ${state.currentPage === 1 ? 'disabled' : ''}>
            <ion-icon name="chevron-back-outline"></ion-icon>
        </button>
        ${pageButtons.map((item) => {
            if (item === '...') return `<span class="admin-page-ellipsis">...</span>`;
            return `<button class="admin-page-btn ${item === state.currentPage ? 'active' : ''}" data-page="${item}">${item}</button>`;
        }).join('')}
        <button class="admin-page-btn" data-page="next" ${state.currentPage === pages ? 'disabled' : ''}>
            <ion-icon name="chevron-forward-outline"></ion-icon>
        </button>
    `;

    pagination.querySelectorAll('.admin-page-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page === 'prev' && state.currentPage > 1) state.currentPage -= 1;
            else if (page === 'next' && state.currentPage < pages) state.currentPage += 1;
            else if (!Number.isNaN(Number(page))) state.currentPage = Number(page);
            renderTable();
        });
    });
}

function renderSummary(filteredCount, start, pageRowsCount) {
    const summary = document.getElementById('user-results-summary');
    if (!summary) return;

    if (filteredCount === 0) {
        summary.textContent = 'Showing 0 results';
        return;
    }

    const from = start + 1;
    const to = start + pageRowsCount;
    summary.textContent = `Showing ${from} to ${to} of ${formatNumber(filteredCount)} results`;
}

function getInitials(name) {
    return name.split(' ').slice(0, 2).map((chunk) => chunk.charAt(0)).join('').toUpperCase();
}

function getRoleTag(role) {
    if (role === 'Admin') return 'tag-info';
    if (role === 'Coordinator') return 'tag-warning';
    return 'tag-success';
}

function getStatusTag(status) {
    if (status === 'Active') return 'tag-success';
    if (status === 'Pending') return 'tag-warning';
    if (status === 'Suspended') return 'tag-danger';
    return 'tag-info';
}

function getPageList(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = [1];
    if (current > 4) pages.push('...');

    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i += 1) {
        pages.push(i);
    }

    if (current < total - 3) pages.push('...');
    pages.push(total);
    return pages;
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-IN').format(value);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function syncFilterPanelInputsFromState() {
    const status = document.getElementById('user-status-filter');
    const branch = document.getElementById('user-branch-filter');
    const permission = document.getElementById('user-permission-filter');
    const activity = document.getElementById('user-activity-filter');

    if (status) status.value = state.filters.status;
    if (branch) branch.value = state.filters.branch;
    if (permission) permission.value = state.filters.permission;
    if (activity) activity.value = state.filters.activity;
}

function getSelectValue(id) {
    const select = document.getElementById(id);
    return select ? select.value : 'all';
}

function configureFiltersForRole() {
    const role = state.filters.viewRole;
    const branchSelect = document.getElementById('user-branch-filter');
    const permissionSelect = document.getElementById('user-permission-filter');

    if (!branchSelect || !permissionSelect) return;

    const branchField = branchSelect.closest('label');
    const permissionField = permissionSelect.closest('label');

    if (role === 'Admin') {
        if (branchField) branchField.style.display = 'none';
        if (permissionField) permissionField.style.display = 'block';
        setSelectOptions('user-status-filter', ['all', 'Active', 'Inactive']);
        setSelectOptions('user-permission-filter', ['all', 'Elevated']);
        state.filters.branch = 'all';
    } else if (role === 'Coordinator') {
        if (branchField) branchField.style.display = 'block';
        if (permissionField) permissionField.style.display = 'none';
        setSelectOptions('user-status-filter', ['all', 'Active', 'Inactive']);
        state.filters.permission = 'all';
    } else {
        if (branchField) branchField.style.display = 'block';
        if (permissionField) permissionField.style.display = 'none';
        setSelectOptions('user-status-filter', ['all', 'Active', 'Inactive', 'Pending', 'Suspended']);
        state.filters.permission = 'all';
    }
}

function setSelectOptions(selectId, values) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const previous = select.value;
    select.innerHTML = values.map((value) => {
        const label = value === 'all' ? 'All' : value;
        return `<option value="${value}">${label}</option>`;
    }).join('');

    if (values.includes(previous)) select.value = previous;
}

function resetFiltersForRoleSwitch() {
    state.filters.query = '';
    state.filters.status = 'all';
    state.filters.branch = 'all';
    state.filters.permission = 'all';
    state.filters.activity = 'all';
    state.currentPage = 1;

    const search = document.getElementById('user-search');
    if (search) search.value = '';
}

function getDefaultFilters() {
    return {
        query: '',
        status: 'all',
        branch: 'all',
        permission: 'all',
        activity: 'all',
        viewRole: 'Student'
    };
}

function resetUsersState() {
    state.currentPage = 1;
    state.filters = getDefaultFilters();
}
