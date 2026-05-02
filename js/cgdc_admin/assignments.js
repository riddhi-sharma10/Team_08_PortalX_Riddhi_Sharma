// js/cgdc_admin/assignments.js
import { api } from '../api.js';

let assignments = [];
let filteredAssignments = [];
let coordinators = [];
let activeCoordFilter = null;

export async function render(container, app) {
    container.innerHTML = `
        <div class="admin-assignments-shell" style="padding: 24px; display: grid; gap: 24px; height: 100%; overflow-y: auto; animation: fadeIn 0.4s ease;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                    <h1 style="font-size: 1.8rem; color: var(--primary); margin: 0;">Delegation Portal</h1>
                    <p style="color: var(--text-muted); margin: 4px 0 0 0;">Allocate students to placement coordinators for comprehensive guidance.</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <div class="stat-pill" style="background: var(--white); border: 1px solid var(--border); padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-sm);">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: #eef2ff; color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                            <ion-icon name="people-outline"></ion-icon>
                        </div>
                        <div>
                            <div id="unassigned-count-pill" style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">0</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Pending Students</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: start;">
                <div class="data-card" style="background: var(--white); border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow-sm); overflow: hidden;">
                    <div style="padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #fcfcfd;">
                        <h3 style="margin: 0; font-size: 1.1rem; color: var(--primary); display: flex; align-items: center; gap: 10px;">
                            <ion-icon name="list-outline"></ion-icon>
                            Active Student Queue
                        </h3>
                        <span id="assignment-count-text" style="font-size: 0.85rem; color: var(--text-muted); background: var(--bg-light); padding: 4px 12px; border-radius: 20px; font-weight: 500;">Showing 0 students</span>
                    </div>
                    
                    <div style="max-height: 600px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10; border-bottom: 1px solid var(--border);">
                                <tr>
                                    <th style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Student Details</th>
                                    <th style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Department</th>
                                    <th style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Applications</th>
                                    <th style="padding: 16px 20px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Assigned Coordinator</th>
                                </tr>
                            </thead>
                            <tbody id="assignments-table-body">
                                <tr>
                                    <td colspan="4" style="padding: 40px; text-align: center; color: var(--text-muted);">Loading students...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="coordinator-load-card" style="background: var(--white); border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow-sm); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="margin: 0; font-size: 1rem; color: var(--primary); display: flex; align-items: center; gap: 10px;">
                            <ion-icon name="stats-chart-outline"></ion-icon>
                            Coordinator Load
                        </h3>
                        <button id="clear-coord-filter" style="font-size: 0.75rem; background: none; border: none; color: var(--primary); cursor: pointer; font-weight: 700; display: none;">Clear</button>
                    </div>
                    <div id="coordinator-load-list" style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Load items populated dynamically -->
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        await loadData();
        renderUI();
    } catch (err) {
        console.error('Failed to initialize assignments:', err);
    }
}

async function loadData() {
    const [assignmentData, coordinatorData] = await Promise.all([
        api.get('/admin/assignments'),
        api.get('/admin/coordinators')
    ]);
    assignments = assignmentData;
    filteredAssignments = [...assignments];
    coordinators = coordinatorData;
}

function renderUI() {
    const tableBody = document.getElementById('assignments-table-body');
    const unassignedPill = document.getElementById('unassigned-count-pill');
    const countText = document.getElementById('assignment-count-text');

    if (!tableBody) return;

    const unassignedCount = filteredAssignments.filter(a => !a.coord_id).length;
    if (unassignedPill) unassignedPill.textContent = unassignedCount;
    if (countText) countText.textContent = `Showing ${filteredAssignments.length} students`;

    if (filteredAssignments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="padding: 40px; text-align: center; color: var(--text-muted);">No students found matching your search.</td></tr>`;
    } else {
        tableBody.innerHTML = filteredAssignments.map(student => renderStudentRow(student)).join('');

        tableBody.querySelectorAll('.coord-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const s_id = e.target.dataset.sid;
                const coord_id = e.target.value;
                await assignCoordinator(s_id, coord_id, e.target);
            });
        });
    }

    renderLoadList();
}

function renderLoadList() {
    const loadList = document.getElementById('coordinator-load-list');
    if (!loadList) return;

    const loadStats = coordinators.map(c => ({
        ...c,
        count: assignments.filter(a => a.coord_id === c.coord_id).length
    })).sort((a, b) => b.count - a.count);

    loadList.innerHTML = loadStats.map(c => `
        <div class="coord-load-item ${activeCoordFilter === c.coord_id ? 'active' : ''}" 
             data-cid="${c.coord_id}"
             style="background: ${activeCoordFilter === c.coord_id ? '#eff6ff' : '#f8fafc'}; padding: 12px; border-radius: 12px; border: 1px solid ${activeCoordFilter === c.coord_id ? '#3b82f6' : 'var(--border)'}; cursor: pointer; transition: all 0.2s; user-select: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; pointer-events: none;">
                <span style="font-size: 0.85rem; font-weight: 600; color: var(--primary);">${c.coord_name}</span>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">${c.count} students</span>
            </div>
            <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; pointer-events: none;">
                <div style="height: 100%; width: ${Math.min(100, (c.count / 20) * 100)}%; background: ${activeCoordFilter === c.coord_id ? '#3b82f6' : 'var(--primary)'}; transition: width 0.3s ease;"></div>
            </div>
        </div>
    `).join('');

    loadList.querySelectorAll('.coord-load-item').forEach(item => {
        item.addEventListener('click', () => {
            const cid = parseInt(item.dataset.cid);
            filterByCoordinator(cid);
        });
    });

    const clearBtn = document.getElementById('clear-coord-filter');
    if (clearBtn) {
        clearBtn.style.display = activeCoordFilter ? 'block' : 'none';
        clearBtn.onclick = () => filterByCoordinator(null);
    }
}

function filterByCoordinator(cid) {
    activeCoordFilter = cid;
    if (cid === null) {
        filteredAssignments = [...assignments];
    } else {
        filteredAssignments = assignments.filter(a => a.coord_id === cid);
    }
    updateTableOnly();
}

async function assignCoordinator(s_id, coord_id, element) {
    try {
        element.disabled = true;
        await api.post('/admin/assignments/assign', { s_id, coord_id });
        
        const sidStr = String(s_id);
        const student = assignments.find(a => String(a.s_id) === sidStr);
        if (student) {
            student.coord_id = coord_id ? parseInt(coord_id) : null;
        }
        
        updateTableOnly();
    } catch (err) {
        console.error('Error assigning coordinator:', err);
        element.disabled = false;
        alert('Failed to assign coordinator. Please try again.');
    }
}

function updateTableOnly() {
    const tableBody = document.getElementById('assignments-table-body');
    const unassignedPill = document.getElementById('unassigned-count-pill');
    const countText = document.getElementById('assignment-count-text');

    const unassignedCount = filteredAssignments.filter(a => !a.coord_id).length;
    if (unassignedPill) unassignedPill.textContent = unassignedCount;
    if (countText) countText.textContent = `Showing ${filteredAssignments.length} students`;

    if (tableBody) {
        if (filteredAssignments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="padding: 40px; text-align: center; color: var(--text-muted);">No students found matching your search.</td></tr>`;
        } else {
            tableBody.innerHTML = filteredAssignments.map(student => renderStudentRow(student)).join('');

            tableBody.querySelectorAll('.coord-select').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const s_id = e.target.dataset.sid;
                    const coord_id = e.target.value;
                    await assignCoordinator(s_id, coord_id, e.target);
                });
            });
        }
    }

    renderLoadList();
}

export function search(query) {
    const q = (query || '').toLowerCase().trim();
    filteredAssignments = assignments.filter(a => {
        const name = (a.s_name || '').toLowerCase();
        const id = String(a.s_id || '').toLowerCase();
        const dept = (a.dept || '').toLowerCase();
        return name.includes(q) || id.includes(q) || dept.includes(q);
    });
    updateTableOnly();
}

function renderStudentRow(student) {
    return `
        <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s; ${student.coord_id ? 'background: #fcfdfd;' : ''}">
            <td style="padding: 16px 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${student.coord_id ? '#ecfdf5' : '#f1f5f9'}; color: ${student.coord_id ? '#10b981' : 'var(--primary)'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">
                        ${(student.s_name || 'S').charAt(0)}
                    </div>
                    <div>
                        <div style="font-weight: 600; color: var(--primary);">${student.s_name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${student.s_id}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 16px 20px; color: var(--text-main); font-size: 0.9rem;">${student.dept}</td>
            <td style="padding: 16px 20px;">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; width: fit-content;">
                        ${student.app_count} Applications
                    </span>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        <span style="font-size: 0.7rem; color: ${student.coord_id ? '#10b981' : '#f59e0b'}; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
                            <ion-icon name="${student.coord_id ? 'checkmark-circle' : 'time-outline'}"></ion-icon>
                            ${student.coord_id ? 'Delegated' : 'Pending'}
                        </span>
                        <span class="tag ${student.profile_status === 'placed' ? 'tag-success' : student.profile_status === 'active' ? 'tag-info' : 'tag-muted'}" style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 800;">
                            ${String(student.profile_status || 'active').toUpperCase()}
                        </span>
                    </div>
                </div>
            </td>
            <td style="padding: 16px 20px;">
                <div style="position: relative; display: flex; align-items: center; gap: 8px;">
                    <select 
                        class="coord-select" 
                        data-sid="${student.s_id}"
                        style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid ${student.coord_id ? '#d1fae5' : 'var(--border)'}; background: ${student.coord_id ? '#f0fdf4' : 'var(--bg-light)'}; color: ${student.coord_id ? '#065f46' : 'var(--text-main)'}; font-size: 0.85rem; cursor: ${student.coord_id ? 'not-allowed' : 'pointer'}; outline: none; transition: all 0.2s; font-weight: ${student.coord_id ? '600' : '400'};"
                        ${student.coord_id ? 'disabled' : ''}
                    >
                        <option value="">Unassigned</option>
                        ${coordinators.map(c => `
                            <option value="${c.coord_id}" ${student.coord_id === c.coord_id ? 'selected' : ''}>
                                ${c.coord_name}
                            </option>
                        `).join('')}
                    </select>
                    ${student.coord_id ? '<ion-icon name="lock-closed" style="color: #10b981; font-size: 1.1rem;" title="Delegation Locked"></ion-icon>' : ''}
                </div>
            </td>
        </tr>
    `;
}