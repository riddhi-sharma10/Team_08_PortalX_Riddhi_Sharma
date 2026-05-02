import { api } from '../api.js';

export async function render(container, app) {
    container.innerHTML = loadingHTML('Interviews');
    try {
        const rows = await api.get('/coordinator/interviews');
        console.log('[interviews] count:', rows.length);
        renderShell(container, rows);
    } catch (err) {
        console.error('[interviews] error:', err);
        container.innerHTML = errorHTML(err.message);
    }
}

function renderShell(container, rows) {
    container.innerHTML = `
        <div class="admin-dashboard-shell">
            <div class="admin-dashboard-header">
                <div>
                    <h1>Interview Schedules</h1>
                    <p>${rows.length} interview${rows.length !== 1 ? 's' : ''} recorded</p>
                </div>
            </div>
            <div class="card">
                <div class="data-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Company & Role</th>
                                <th>Mode</th>
                                <th>Panel</th>
                                <th>Date & Time</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.length ? rows.map(r => `
                                <tr>
                                    <td><b>${r.studentName}</b></td>
                                    <td>
                                        <div style="font-weight: 700; color: var(--primary);">${r.company}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; margin-top: 2px;">${r.role}</div>
                                    </td>
                                    <td><span class="tag tag-info" style="text-transform: capitalize;">${r.mode}</span></td>
                                    <td style="color:var(--text-muted);font-size:0.85rem;">${r.panel || '—'}</td>
                                    <td>${r.date}<br><span style="font-size:0.75rem;color:var(--text-muted);">${r.time || 'TBA'}</span></td>
                                    <td><span class="tag ${resultTag(r.result)}">${r.result.toUpperCase()}</span></td>
                                </tr>
                            `).join('') : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No interviews found.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function resultTag(r) {
    if (r === 'pass')    return 'tag-success';
    if (r === 'fail')    return 'tag-danger';
    if (r === 'on_hold') return 'tag-warning';
    return 'tag-muted';
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
