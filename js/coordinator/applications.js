import { api } from '../api.js';

let all = [], filtered = [], searchQ = '', statusF = 'all';

export async function render(container, app) {
    container.innerHTML = loadingHTML('Applications');
    try {
        all = await api.get('/coordinator/applications');
        filtered = [...all];
        renderShell(container);
    } catch (err) {
        console.error('[applications] error:', err);
        container.innerHTML = errorHTML(err.message);
    }
}

function renderShell(container) {
    const counts = {
        all: all.length,
        applied: all.filter(a => a.status === 'applied').length,
        shortlisted: all.filter(a => a.status === 'shortlisted').length,
        selected: all.filter(a => a.status === 'selected').length,
        rejected: all.filter(a => a.status === 'rejected').length,
        under_review: all.filter(a => a.status === 'under_review').length
    };

    container.innerHTML = `
        <div class="admin-dashboard-shell">
            <div class="admin-dashboard-header">
                <div>
                    <h1 style="font-size: 2rem; color: var(--primary); font-weight: 800;">Applications</h1>
                    <p style="color: var(--text-muted);">${all.length} total applications from your students</p>
                </div>
                <div style="display:flex;gap:10px;align-items:center;">
                    <div style="background: white; padding: 10px 20px; border-radius: 12px; border: 1px solid var(--border); display: flex; align-items: center; gap: 12px; width: 300px;">
                        <ion-icon name="search-outline" style="color: var(--text-muted);"></ion-icon>
                        <input id="app-search" type="text" placeholder="Search student or company..." value="${searchQ}" style="border: none; outline: none; width: 100%; font-size: 0.9rem;">
                    </div>
                    <div style="position:relative;">
                        <button id="app-filter-btn" class="btn-primary" style="background: white; color: var(--primary); border: 1px solid var(--border); padding: 10px 18px; border-radius: 10px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                            <ion-icon name="funnel-outline"></ion-icon> Filter
                        </button>
                        <div id="app-filter-panel" class="hidden" style="position:absolute;right:0;top:calc(100%+8px);z-index:200;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;width:220px;box-shadow:0 8px 24px rgba(0,0,0,0.1);">
                            <label style="font-size:0.75rem;font-weight:700;color:var(--text-muted);display:block;margin-bottom:8px;text-transform:uppercase;">Status Filter</label>
                            <select id="app-status-sel" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;outline:none;">
                                <option value="all"         ${statusF==='all'?'selected':''}>All Applications</option>
                                <option value="applied"     ${statusF==='applied'?'selected':''}>Applied</option>
                                <option value="under_review"${statusF==='under_review'?'selected':''}>Under Review</option>
                                <option value="shortlisted" ${statusF==='shortlisted'?'selected':''}>Shortlisted</option>
                                <option value="selected"    ${statusF==='selected'?'selected':''}>Selected</option>
                                <option value="rejected"    ${statusF==='rejected'?'selected':''}>Rejected</option>
                            </select>
                            <button id="app-apply-filter" class="btn-primary" style="width:100%;padding:10px;border-radius:8px;font-weight:700;">Apply Filters</button>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
                <span class="tag tag-warning" style="padding:8px 16px; font-weight:800; border-radius:8px;">UNDER REVIEW: ${counts.under_review}</span>
                <span class="tag tag-info"    style="padding:8px 16px; font-weight:800; border-radius:8px;">SHORTLISTED: ${counts.shortlisted}</span>
                <span class="tag tag-success" style="padding:8px 16px; font-weight:800; border-radius:8px;">SELECTED: ${counts.selected}</span>
                <span class="tag tag-danger"  style="padding:8px 16px; font-weight:800; border-radius:8px;">REJECTED: ${counts.rejected}</span>
            </div>

            <div class="card" style="padding:0; overflow:hidden;">
                <div class="data-table-container">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 2px solid var(--border);">
                                <th style="padding: 16px; text-align: left; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Student</th>
                                <th style="padding: 16px; text-align: left; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Dept</th>
                                <th style="padding: 16px; text-align: left; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Company & Role</th>
                                <th style="padding: 16px; text-align: center; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">ATS</th>
                                <th style="padding: 16px; text-align: center; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Status</th>
                                <th style="padding: 16px; text-align: center; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="app-tbody">${appRows()}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    wireEvents(container);
}

function appRows() {
    if (!filtered.length) return `<tr><td colspan="6" style="text-align:center;padding:60px;color:var(--text-muted);"><ion-icon name="document-text-outline" style="font-size:2rem;display:block;margin:0 auto 12px;"></ion-icon>No applications found matching your criteria.</td></tr>`;
    return filtered.map(a => `
        <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" class="hover-row">
            <td style="padding: 16px;">
                <div style="font-weight: 800; color: var(--text-main);">${a.studentName || '—'}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">#ID-${a.id}</div>
            </td>
            <td style="padding: 16px; color: var(--text-muted); font-weight: 600; font-size: 0.85rem;">${a.dept || '—'}</td>
            <td style="padding: 16px;">
                <div style="font-weight: 700; color: var(--primary);">${a.company || '—'}</div>
                <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 600;">${a.role || '—'}</div>
                <div style="font-size: 0.75rem; color: var(--success); font-weight: 800; margin-top:2px;">₹${a.packageLpa ? Number(a.packageLpa).toFixed(1) : '—'} LPA</div>
            </td>
            <td style="padding: 16px; text-align: center;">
                ${a.atsScore != null
                    ? `<span class="tag ${Number(a.atsScore) >= 70 ? 'tag-success' : Number(a.atsScore) >= 50 ? 'tag-warning' : 'tag-danger'}" style="font-weight:800;">${Number(a.atsScore).toFixed(0)}%</span>`
                    : '<span style="color:var(--text-muted);">—</span>'}
            </td>
            <td style="padding: 16px; text-align: center;">
                ${a.studentProfileStatus === 'opted_out'
                    ? `<span class="tag" style="background: #e2e8f0; color: #64748b; font-weight: 800; min-width: 150px; display: inline-block; padding: 6px 12px; border-radius: 8px;">OPTED OUT</span>`
                    : (a.studentProfileStatus === 'placed'
                        ? `<span class="tag tag-success" style="font-weight: 800; min-width: 150px; display: inline-block; padding: 6px 12px; border-radius: 8px; text-transform: uppercase;">Placed</span>`
                        : `<select class="status-updater" data-id="${a.id}" style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.8rem; font-weight: 700; color: var(--text-main); outline: none; cursor: pointer; background: #f8fafc; min-width: 150px;">
                            <option value="under_review" ${a.status === 'under_review' ? 'selected' : ''}>UNDER REVIEW</option>
                            <option value="shortlisted"  ${a.status === 'shortlisted' ? 'selected' : ''}>SHORTLISTED</option>
                            <option value="selected"     ${a.status === 'selected' ? 'selected' : ''}>SELECTED</option>
                            <option value="rejected"     ${a.status === 'rejected' ? 'selected' : ''}>REJECTED</option>
                        </select>`
                    )
                }
            </td>
            <td style="padding: 16px; text-align: center;">
                <button class="btn-primary details-btn" data-sid="${a.s_id || a.student_id || ''}" style="padding: 6px 14px; font-size: 0.75rem; border-radius: 6px; font-weight: 700;">Details</button>
            </td>
        </tr>
    `).join('');
}

function statusTag(s) {
    if (s === 'selected')    return 'tag-success';
    if (s === 'rejected')    return 'tag-danger';
    if (s === 'shortlisted' || s === 'under_review') return 'tag-info';
    return 'tag-warning';
}

function wireEvents(container) {
    const searchInp   = container.querySelector('#app-search');
    const filterBtn   = container.querySelector('#app-filter-btn');
    const filterPanel = container.querySelector('#app-filter-panel');
    const applyBtn    = container.querySelector('#app-apply-filter');

    searchInp?.addEventListener('input', e => {
        searchQ = e.target.value.toLowerCase();
        applyFilters();
        const tb = document.getElementById('app-tbody');
        if (tb) tb.innerHTML = appRows();
        attachStatusEvents(container);
        attachDetailsEvents(container);
    });

    filterBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        filterPanel?.classList.toggle('hidden');
    });

    applyBtn?.addEventListener('click', () => {
        statusF = container.querySelector('#app-status-sel')?.value || 'all';
        filterPanel?.classList.add('hidden');
        applyFilters();
        const tb = document.getElementById('app-tbody');
        if (tb) tb.innerHTML = appRows();
        attachStatusEvents(container);
        attachDetailsEvents(container);
    });

    document.addEventListener('click', e => {
        if (!filterPanel?.contains(e.target) && !filterBtn?.contains(e.target))
            filterPanel?.classList.add('hidden');
    });

    attachStatusEvents(container);
    attachDetailsEvents(container);
}

function attachDetailsEvents(container) {
    console.log('[Applications] Attaching details events to', container.querySelectorAll('.details-btn').length, 'buttons');
    container.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const sid = btn.getAttribute('data-sid');
            console.log('[Applications] Details clicked for Student ID:', sid);
            showStudentModal(sid);
        });
    });
}

async function showStudentModal(sid) {
    let modal = document.getElementById('student-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'student-detail-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div style="background:white;width:600px;border-radius:16px;padding:32px;position:relative;box-shadow:0 20px 50px rgba(0,0,0,0.2);">
            <div style="text-align:center;padding:20px;">
                <ion-icon name="sync-outline" style="font-size:2rem;animation:spin 1s linear infinite;"></ion-icon>
                <p>Fetching Student Profile...</p>
            </div>
        </div>
    `;

    try {
        const s = await api.get(`/coordinator/students/${sid}`);
        const avatar = (s.name || 'U S').split(' ').filter(p => p.length > 0).slice(0, 2).map(n => n[0]).join('').toUpperCase();
        
        modal.innerHTML = `
            <style>
                @keyframes slideUpModal {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
            <div style="background:white;width:650px;border-radius:20px;overflow:hidden;position:relative;box-shadow:0 25px 70px rgba(0,0,0,0.3);animation: slideUpModal 0.3s ease-out;">
                <button id="close-modal" style="position:absolute;right:20px;top:20px;background:white;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:10;">
                    <ion-icon name="close-outline" style="font-size:1.5rem;"></ion-icon>
                </button>

                <div style="background:var(--primary);padding:40px;text-align:center;color:white;">
                    <div style="width:100px;height:100px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:800;border:4px solid rgba(255,255,255,0.3);">
                        ${avatar}
                    </div>
                    <h2 style="margin:0;font-size:1.8rem;letter-spacing:-0.5px;">${s.name}</h2>
                    <p style="margin:8px 0 0;opacity:0.8;font-weight:500;">STU-${String(s.id).padStart(4,'0')} | ${s.dept}</p>
                </div>

                <div style="padding:32px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                    <div>
                        <label style="font-size:0.7rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:6px;">Contact Info</label>
                        <div style="display:flex;flex-direction:column;gap:12px;">
                            <div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;">
                                <ion-icon name="mail-outline" style="color:var(--primary);"></ion-icon>
                                <span>${s.email}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;">
                                <ion-icon name="call-outline" style="color:var(--primary);"></ion-icon>
                                <span>${s.phone}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style="font-size:0.7rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:6px;">Academic Stats</label>
                        <div style="display:flex;flex-direction:column;gap:12px;">
                            <div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;">
                                <ion-icon name="star-outline" style="color:var(--warning);"></ion-icon>
                                <span>CGPA: <b>${s.cgpa}</b></span>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;">
                                <ion-icon name="calendar-outline" style="color:var(--primary);"></ion-icon>
                                <span>Graduating ${s.gradYear}</span>
                            </div>
                        </div>
                    </div>

                    <div style="grid-column:1/-1;border-top:1px solid #f1f5f9;padding-top:24px;">
                        <label style="font-size:0.7rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:12px;">Placement Information</label>
                        <div style="display:flex;gap:16px;">
                            <div style="flex:1;background:#f8fafc;padding:16px;border-radius:12px;">
                                <span style="display:block;font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Profile Status</span>
                                <span class="tag ${s.status==='placed'?'tag-success':s.status==='opted_out'?'tag-muted':'tag-info'}" style="font-weight:800;text-transform:uppercase;">${s.status.replace('_',' ')}</span>
                            </div>
                            <div style="flex:1;background:#f8fafc;padding:16px;border-radius:12px;">
                                <span style="display:block;font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Applications</span>
                                <span style="font-weight:800;font-size:1.1rem;color:var(--primary);">${s.totalApps} submitted</span>
                            </div>
                        </div>
                    </div>

                    <div style="grid-column:1/-1;margin-top:8px;">
                        <a href="${s.resumeUrl || '#'}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;background:var(--primary);color:white;text-decoration:none;border-radius:12px;font-weight:700;transition:opacity 0.2s;">
                            <ion-icon name="document-text-outline" style="font-size:1.2rem;"></ion-icon>
                            View Student Resume
                        </a>
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('#close-modal').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    } catch (err) {
        modal.innerHTML = `<div style="background:white;padding:32px;border-radius:16px;text-align:center;">
            <p style="color:red;">Error: ${err.message}</p>
            <button onclick="document.getElementById('student-detail-modal').style.display='none'" class="btn-primary" style="margin-top:16px;">Close</button>
        </div>`;
    }
}

function attachStatusEvents(container) {
    container.querySelectorAll('.status-updater').forEach(select => {
        select.addEventListener('change', async (e) => {
            const appId = select.getAttribute('data-id');
            const newStatus = e.target.value;
            
            select.disabled = true;
            select.style.opacity = '0.5';

            try {
                await api.patch(`/coordinator/applications/${appId}/status`, { status: newStatus });
                console.log(`Status updated to ${newStatus} for app ${appId}`);
                const appIdx = all.findIndex(a => a.id == appId);
                if (appIdx !== -1) all[appIdx].status = newStatus;
            } catch (err) {
                alert('Error updating status: ' + err.message);
            } finally {
                select.disabled = false;
                select.style.opacity = '1';
            }
        });
    });
}

function applyFilters() {
    filtered = all.filter(a => {
        const sm = !searchQ ||
            (a.studentName || '').toLowerCase().includes(searchQ) ||
            (a.company || '').toLowerCase().includes(searchQ) ||
            (a.role || '').toLowerCase().includes(searchQ);
        const fm = statusF === 'all' || a.status === statusF;
        return sm && fm;
    });
}

function loadingHTML(p) {
    return `<div style="display:flex;align-items:center;justify-content:center;height:400px;flex-direction:column;gap:12px;color:var(--text-muted);">
        <ion-icon name="sync-outline" style="font-size:2.5rem;animation:spin 1s linear infinite;"></ion-icon>
        <p>Loading ${p}...</p></div>`;
}
function errorHTML(msg) {
    return `<div style="padding:40px;text-align:center;">
        <ion-icon name="alert-circle-outline" style="font-size:3rem;color:#ef4444;"></ion-icon>
        <h2 style="margin-top:16px;">Error loading applications</h2>
        <p style="color:var(--text-muted);margin-top:8px;">${msg}</p></div>`;
}
