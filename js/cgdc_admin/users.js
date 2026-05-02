// js/admin/users.js
import { api } from '../api.js';

let users = [];

const state = {
    currentPage: 1,
    perPage: 10,
    filters: getDefaultFilters(),
    pendingDelete: null
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
                <button id="user-add-btn" class="btn-primary" type="button" style="padding: 10px 20px; border-radius: 6px; font-weight: 600;">
                    <ion-icon name="add-outline"></ion-icon> <span id="user-add-btn-text">Add Student</span>
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
                                        <option value="active">Active</option>
                                        <option value="placed">Placed</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="opted_out">Opted Out</option>
                                        <option value="not_eligible">Not Eligible</option>
                                    </select>
                                </label>
                                <label>
                                    <span>Branch</span>
                                    <select id="user-branch-filter" aria-label="Filter by branch">
                                        <option value="all">All</option>
                                        <option value="Computer Science">Computer Science</option>
                                        <option value="IT">IT</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Mechanical">Mechanical</option>
                                        <option value="Civil">Civil</option>
                                    </select>
                                </label>
                                <label>
                                    <span>Permission</span>
                                    <select id="user-permission-filter" aria-label="Filter by permission level">
                                        <option value="all">All</option>
                                        <option value="Standard">Standard</option>
                                        <option value="Elevated">Elevated</option>
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
                            <input type="email" id="studentEmail" pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$" title="Please enter a valid email address" required style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Phone Number</label>
                            <input type="text" id="studentPhone" pattern="[0-9]{10}" maxlength="10" title="Phone number must be exactly 10 digits" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
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
                            <select id="studentGradYear" required style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                                <option value="">Select Year</option>
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">CGPA</label>
                            <input type="number" id="studentCgpa" step="0.01" min="0" max="10" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Profile Status *</label>
                            <select id="studentProfileStatus" required style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                                <option value="">Select Status</option>
                                <option value="active">Active</option>
                                <option value="placed">Placed</option>
                                <option value="not_eligible">Not Eligible</option>
                                <option value="opted_out">Opted Out</option>
                            </select>
                        </div>

                        <!-- Extra fields for Placed status -->
                        <div id="placedFields" style="display: none; grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 10px; padding: 15px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Company Name *</label>
                                <input type="text" id="studentCompany" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>
                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Package (LPA) *</label>
                                <input type="number" id="studentPackage" step="0.1" min="0" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" id="cancelStudentBtn" style="flex: 1; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: white; color: var(--text-main); font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" id="submitStudentBtn" style="flex: 1; padding: 12px 16px; border: none; border-radius: 8px; background: var(--primary); color: white; font-weight: 600; cursor: pointer;">Add Student</button>
                    </div>
                </form>
            </div>
        </div>
        <!-- Add Coordinator Modal -->
        <div id="addCoordModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(6px);">
            <div style="background: white; border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,0.22); width: 100%; max-width: 500px; max-height: 92vh; overflow-y: auto; border: 1px solid #dbe4f0;">
                <div style="padding: 24px 28px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; background: linear-gradient(180deg, #ffffff, #f8fbff); position: sticky; top: 0; z-index: 1;">
                    <div>
                        <p style="margin: 0 0 6px 0; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">New Record</p>
                        <h2 style="font-size: 1.65rem; color: var(--primary); margin: 0;">Add Coordinator</h2>
                    </div>
                    <button id="closeCoordModalBtn" type="button" style="background: #eff6ff; border: 1px solid #bfdbfe; font-size: 1.35rem; color: var(--primary); cursor: pointer; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700;">×</button>
                </div>

                <form id="coordForm" style="display: grid; gap: 18px; padding: 24px 28px 28px;">
                    <div style="display: grid; gap: 14px;">
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Name *</label>
                            <input type="text" id="coordName" required style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Email Address *</label>
                            <input type="email" id="coordEmail" pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$" title="Please enter a valid email address" required style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Phone Number</label>
                            <input type="text" id="coordPhone" pattern="[0-9]{10}" maxlength="10" title="Phone number must be exactly 10 digits" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>

                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Department *</label>
                            <select id="coordDept" required style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                                <option value="">Select Department</option>
                                <option value="Computer Science">Computer Science</option>
                                <option value="IT">IT</option>
                                <option value="Electronics">Electronics</option>
                                <option value="Mechanical">Mechanical</option>
                                <option value="Civil">Civil</option>
                            </select>
                        </div>
                        
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">CGDC ID (Optional)</label>
                            <input type="number" id="coordCgdcId" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" id="cancelCoordBtn" style="flex: 1; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: white; color: var(--text-main); font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" id="submitCoordBtn" style="flex: 1; padding: 12px 16px; border: none; border-radius: 8px; background: var(--primary); color: white; font-weight: 600; cursor: pointer;">Add Coordinator</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Custom Delete Confirm Modal -->
        <div id="deleteConfirmModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 2000; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(8px);">
            <div style="background: white; border-radius: 20px; box-shadow: 0 40px 100px rgba(0,0,0,0.25); width: 100%; max-width: 420px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="padding: 32px; text-align: center;">
                    <div style="width: 64px; height: 64px; background: #fff1f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #e11d48; font-size: 2rem;">
                        <ion-icon name="alert-circle-outline"></ion-icon>
                    </div>
                    <h2 style="font-size: 1.4rem; color: #0f172a; margin: 0 0 12px 0;">Delete User?</h2>
                    <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0;">Are you sure you want to delete this <span id="delete-modal-role">user</span>? This action is permanent and cannot be undone.</p>
                </div>
                <div style="padding: 20px 32px 32px; display: flex; flex-direction: column; gap: 12px;">
                    <button id="confirmDeleteBtn" style="width: 100%; padding: 14px; border: none; border-radius: 12px; background: #e11d48; color: white; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s;">Yes, Delete User</button>
                    <button id="cancelDeleteBtn" style="width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; color: #64748b; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s;">No, Take me back</button>
                </div>
            </div>
        </div>

        <!-- Custom Success Modal -->
        <div id="successModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 2000; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(8px);">
            <div style="background: white; border-radius: 20px; box-shadow: 0 40px 100px rgba(0,0,0,0.25); width: 100%; max-width: 400px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="padding: 32px; text-align: center;">
                    <div style="width: 64px; height: 64px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #16a34a; font-size: 2.5rem;">
                        <ion-icon name="checkmark-circle-outline"></ion-icon>
                    </div>
                    <h2 style="font-size: 1.4rem; color: #0f172a; margin: 0 0 12px 0;">Success!</h2>
                    <p id="success-modal-msg" style="color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0;">Operation completed successfully.</p>
                </div>
                <div style="padding: 0 32px 32px;">
                    <button id="closeSuccessBtn" style="width: 100%; padding: 14px; border: none; border-radius: 12px; background: var(--primary); color: white; font-weight: 600; font-size: 1rem; cursor: pointer;">Awesome</button>
                </div>
            </div>
        </div>
    `;

    hydrateKpis();
    bindEvents();
    bindModalEvents(container, app);

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

            updateAddButtonVisibility();
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

function updateAddButtonVisibility() {
    const addBtn = document.getElementById('user-add-btn');
    const addText = document.getElementById('user-add-btn-text');
    if (!addBtn || !addText) return;

    if (state.filters.viewRole === 'Admin') {
        addBtn.style.display = 'none';
    } else {
        addBtn.style.display = 'flex';
        addText.textContent = state.filters.viewRole === 'Student' ? 'Add Student' : 'Add Coordinator';
    }
}

function bindModalEvents(container, app) {
    const studentModal = document.getElementById('addStudentModal');
    const coordModal = document.getElementById('addCoordModal');
    const openBtn = document.getElementById('user-add-btn');
    
    function openModal() {
        const modal = state.filters.viewRole === 'Student' ? studentModal : coordModal;
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            if (state.filters.viewRole === 'Student') {
                const dobInput = document.getElementById('studentDob');
                if (dobInput) {
                    const today = new Date();
                    const maxDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
                    dobInput.max = maxDate.toISOString().split('T')[0];
                }
                
                // Reset placed fields
                const placedFields = document.getElementById('placedFields');
                if (placedFields) placedFields.style.display = 'none';
            }
        }
    }

    document.getElementById('studentProfileStatus')?.addEventListener('change', (e) => {
        const fields = document.getElementById('placedFields');
        if (fields) {
            fields.style.display = e.target.value === 'placed' ? 'grid' : 'none';
            const companyInput = document.getElementById('studentCompany');
            const packageInput = document.getElementById('studentPackage');
            if (companyInput) companyInput.required = e.target.value === 'placed';
            if (packageInput) packageInput.required = e.target.value === 'placed';
        }
    });

    function closeModal() {
        if (studentModal) studentModal.style.display = 'none';
        if (coordModal) coordModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        const studentForm = document.getElementById('studentForm');
        const coordForm = document.getElementById('coordForm');
        if (studentForm) studentForm.reset();
        if (coordForm) coordForm.reset();
    }

    if (openBtn) openBtn.addEventListener('click', openModal);

    ['closeStudentModalBtn', 'cancelStudentBtn', 'closeCoordModalBtn', 'cancelCoordBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', closeModal);
    });

    [studentModal, coordModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }
    });

    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name  = document.getElementById('studentName').value.trim();
            const email = document.getElementById('studentEmail').value.trim();
            const phone = document.getElementById('studentPhone').value.trim();
            const dob   = document.getElementById('studentDob').value || null;
            const dept  = document.getElementById('studentDept').value;
            const gradYear = document.getElementById('studentGradYear').value;
            const cgpa  = document.getElementById('studentCgpa').value || null;
            const profileStatus = document.getElementById('studentProfileStatus').value;
            const company = document.getElementById('studentCompany')?.value || null;
            const packageLpa = document.getElementById('studentPackage')?.value || null;

            // JS-side validation
            const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address (e.g., student@university.edu).');
                return;
            }

            if (phone && !/^[0-9]{10}$/.test(phone)) {
                alert('Phone number must be exactly 10 digits (numbers only, no spaces or dashes).');
                return;
            }

            if (dob) {
                const birthDate = new Date(dob);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear() -
                    ((today.getMonth() < birthDate.getMonth() || 
                      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) ? 1 : 0);
                if (age < 16) {
                    alert('Student must be at least 16 years old.');
                    return;
                }
            }

            const submitBtn = document.getElementById('submitStudentBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            const payload = { 
                name, email, phone, dob, dept, 
                graduation_yr: gradYear, cgpa, profile_status: profileStatus,
                company, packageLpa
            };

            try {
                await api.post('/admin/student', payload);
                closeModal();
                showSuccess('Student added successfully and database synced.');
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

    const coordForm = document.getElementById('coordForm');
    if (coordForm) {
        coordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name    = document.getElementById('coordName').value.trim();
            const email   = document.getElementById('coordEmail').value.trim();
            const phone   = document.getElementById('coordPhone').value.trim();
            const dept    = document.getElementById('coordDept').value;
            const cgdc_id = document.getElementById('coordCgdcId').value || null;

            // JS-side validation
            const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address (e.g., coord@university.edu).');
                return;
            }

            if (phone && !/^[0-9]{10}$/.test(phone)) {
                alert('Phone number must be exactly 10 digits (numbers only, no spaces or dashes).');
                return;
            }

            const submitBtn = document.getElementById('submitCoordBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            try {
                await api.post('/admin/coordinator', { name, email, phone_no: phone, dept, cgdc_id });
                closeModal();
                showSuccess('Coordinator added successfully.');
                render(container, app);
            } catch (err) {
                console.error(err);
                alert('Error adding coordinator: ' + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Add Coordinator';
                }
            }
        });
    }

    container.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.user-delete-btn');
        if (deleteBtn) {
            const role = deleteBtn.dataset.role;
            const id = deleteBtn.dataset.id;
            
            // Show custom modal
            state.pendingDelete = { id, role };
            const modal = document.getElementById('deleteConfirmModal');
            const roleSpan = document.getElementById('delete-modal-role');
            if (modal && roleSpan) {
                roleSpan.textContent = role;
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }
    });

    // Custom Modal Confirm/Cancel
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
        if (!state.pendingDelete) return;
        const { id, role } = state.pendingDelete;
        
        const btn = document.getElementById('confirmDeleteBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Deleting...';
        }

        try {
            await api.delete(`/admin/${role}/${id}`);
            closeDeleteModal();
            render(container, app);
        } catch (err) {
            console.error(err);
            alert(`Failed to delete ${role}`);
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Yes, Delete User';
            }
        }
    });

    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('deleteConfirmModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'deleteConfirmModal') closeDeleteModal();
    });

    // Success Modal Close
    document.getElementById('closeSuccessBtn')?.addEventListener('click', closeSuccessModal);
    document.getElementById('successModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'successModal') closeSuccessModal();
    });
}

function showSuccess(msg) {
    const modal = document.getElementById('successModal');
    const msgEl = document.getElementById('success-modal-msg');
    if (modal && msgEl) {
        msgEl.textContent = msg;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    state.pendingDelete = null;
    const btn = document.getElementById('confirmDeleteBtn');
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Yes, Delete User';
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
            <td><span class="tag ${getStatusTag(user.status)}">${formatStatusLabel(user.status)}</span></td>
            ${(user.role.toLowerCase() === 'student' || user.role.toLowerCase() === 'coordinator') ? 
                `<td style="text-align: right;">
                    <button class="user-delete-btn" data-role="${user.role.toLowerCase()}" data-id="${user.entityIdRaw}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem; padding: 4px;">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </td>` : '<td></td>'
            }
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
            <th style="text-align: right;">Actions</th>
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
    const s = String(status).toLowerCase();
    if (s === 'active' || s === 'placed') return 'tag-success';
    if (s === 'active' || s === 'pending') return 'tag-warning';
    if (s === 'rejected' || s === 'not_eligible' || s === 'suspended') return 'tag-danger';
    if (s === 'opted_out' || s === 'inactive') return 'tag-muted';
    return 'tag-info';
}

function formatStatusLabel(status) {
    const s = String(status).toLowerCase();
    if (s === 'active') return 'Active';
    if (s === 'not_eligible') return 'Not Eligible';
    if (s === 'opted_out') return 'Opted Out';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
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
        setSelectOptions('user-status-filter', ['all', 'active', 'inactive']);
        setSelectOptions('user-permission-filter', ['all', 'Elevated']);
        state.filters.branch = 'all';
    } else if (role === 'Coordinator') {
        if (branchField) branchField.style.display = 'block';
        if (permissionField) permissionField.style.display = 'none';
        setSelectOptions('user-status-filter', ['all', 'active', 'inactive']);
        state.filters.permission = 'all';
    } else {
        if (branchField) branchField.style.display = 'block';
        if (permissionField) permissionField.style.display = 'none';
        setSelectOptions('user-status-filter', [
            {value: 'all', label: 'All'},
            {value: 'active', label: 'Active'},
            {value: 'placed', label: 'Placed'},
            {value: 'rejected', label: 'Rejected'},
            {value: 'opted_out', label: 'Opted Out'},
            {value: 'not_eligible', label: 'Not Eligible'}
        ]);
        state.filters.permission = 'all';
    }
}

function setSelectOptions(selectId, values) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const previous = select.value;
    select.innerHTML = values.map((item) => {
        const value = typeof item === 'object' ? item.value : item;
        let label = typeof item === 'object' ? item.label : (value === 'all' ? 'All' : value);
        
        // Pretty labels for short branch names if desired, but keep value as DB name
        if (value === 'IT') label = 'Information Technology (IT)';
        if (value === 'Electronics') label = 'Electronics & Communication';
        
        return `<option value="${value}">${label}</option>`;
    }).join('');

    const valueExists = values.some(item => (typeof item === 'object' ? item.value : item) === previous);
    if (valueExists) select.value = previous;
    else select.value = 'all';
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
