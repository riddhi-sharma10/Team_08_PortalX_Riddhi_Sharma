import { api } from '../api.js';

export async function render(container, app) {
    container.innerHTML = `
        <div style="padding: 24px;">
            <h2>Loading your application history...</h2>
        </div>
    `;

    try {
        const [applications, profile] = await Promise.all([
            api.get('/applications'),
            api.get('/students/profile')
        ]);
        renderApplications(container, applications, profile, app);
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding:24px; color:#ef4444;">Database Sync Error: ${err.message}</div>`;
    }
}

function renderApplications(container, data, profile, mainApp) {
    const isPlaced = profile.status === 'placed';

    container.innerHTML = `
        <div class="dashboard-header" style="margin-bottom: 32px;">
            <h1 style="font-size: 2rem; color: var(--primary); font-weight: 800;">Application History</h1>
            <p style="color: var(--text-muted);">Track your progress across all recruitment cycles.</p>
        </div>

        <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border);">
            <div class="data-table-container">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid var(--border);">
                            <th style="padding: 16px; text-align: left; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Company & Role</th>
                            <th style="padding: 16px; text-align: left; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Applied on</th>
                            <th style="padding: 16px; text-align: left; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Status</th>
                            <th style="padding: 16px; text-align: center; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">ATS Score</th>
                            <th style="padding: 16px; text-align: center; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.length > 0 ? data.map(app => {
                            const isSelected = app.status === 'selected';
                            const hasAcceptedThis = isSelected && isPlaced; // Simplification: if placed and selected, assume this is it?
                            // Better: check if this specific application is the accepted one.
                            // For now, if student is placed, they can't accept more.
                            
                            return `
                                <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" class="hover-row">
                                    <td style="padding: 16px;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="width: 40px; height: 40px; border-radius: 8px; background: #eff6ff; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem;">
                                                ${app.comp_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style="font-weight: 700; color: var(--text-main);">${app.comp_name}</div>
                                                <div style="font-size: 0.8rem; color: var(--text-muted);">${app.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="padding: 16px; color: #64748b; font-weight: 500;">
                                        ${new Date(app.applied_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style="padding: 16px;">
                                        <span class="tag ${getStatusClass(app.status)}" style="font-weight: 800; font-size: 0.7rem; text-transform: uppercase;">
                                            ${app.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td style="padding: 16px; text-align: center;">
                                        <div style="font-weight: 800; color: ${app.ats_score > 80 ? 'var(--success)' : '#64748b'};">${app.ats_score || '--'}</div>
                                    </td>
                                    <td style="padding: 16px; text-align: center;">
                                        ${isSelected 
                                            ? (isPlaced 
                                                ? `<button class="btn-primary" style="padding: 8px 20px; font-size: 0.75rem; border-radius: 8px; background: var(--success); cursor: default; border: none;">Accepted</button>`
                                                : `<button class="accept-btn btn-primary" data-job="${app.job_id}" data-comp="${app.comp_name}" style="padding: 8px 20px; font-size: 0.75rem; border-radius: 8px; background: #2563eb;">Accept</button>`
                                            )
                                            : `<button class="btn-primary" style="padding: 8px 20px; font-size: 0.75rem; border-radius: 8px; background: #e2e8f0; color: #94a3b8; cursor: not-allowed; border: 1px solid #cbd5e1;" disabled>Accept</button>`
                                        }
                                    </td>
                                </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="5" style="padding: 48px; text-align: center; color: var(--text-muted);">
                                    <ion-icon name="folder-open-outline" style="font-size: 2rem; margin-bottom: 12px;"></ion-icon>
                                    <p>No applications found in the database.</p>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Handle Accept Click
    container.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (isPlaced) {
                alert('you can only select one');
                return;
            }

            const jobId = btn.getAttribute('data-job');
            const comp = btn.getAttribute('data-comp');
            
            if (confirm(`Are you sure you want to accept the offer from ${comp}? This will mark you as PLACED and you won't be able to apply for other jobs.`)) {
                btn.disabled = true;
                btn.innerText = 'Processing...';
                try {
                    const res = await api.post('/applications/accept', { job_id: jobId });
                    alert(res.message);
                    // Reload the view
                    render(container, mainApp);
                } catch (err) {
                    alert(err.message);
                    btn.disabled = false;
                    btn.innerText = 'Accept';
                }
            }
        });
    });
}

function getStatusClass(status) {
    const map = {
        'selected': 'tag-success',
        'shortlisted': 'tag-info',
        'rejected': 'tag-danger',
        'applied': 'tag-warning',
        'under_review': 'tag-info'
    };
    return map[status] || 'tag-muted';
}
