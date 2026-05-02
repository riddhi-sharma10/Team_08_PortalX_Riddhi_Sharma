// js/admin/student_profile.js
import { api } from '../api.js';

export async function render(container, app) {
    const studentId = sessionStorage.getItem('selectedStudentId');
    
    if (!studentId) {
        container.innerHTML = `
            <div class="card" style="padding: 40px; text-align: center; margin: 24px;">
                <ion-icon name="alert-circle-outline" style="font-size: 3rem; color: #ef4444;"></ion-icon>
                <h2 style="margin-top: 16px;">No Student Selected</h2>
                <button id="backBtnErr" class="btn-primary" style="margin-top: 24px;">Back to Directory</button>
            </div>
        `;
        document.getElementById('backBtnErr')?.addEventListener('click', () => app.navigateTo('users'));
        return;
    }

    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:400px;">
            <div style="text-align:center;color:var(--text-muted);">
                <ion-icon name="sync-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px; animation:spin 1s linear infinite;"></ion-icon>
                <p>Syncing student data from master database...</p>
            </div>
        </div>
    `;

    try {
        const data = await api.get(`/admin/student/${studentId}/profile`);
        const { profile, applications } = data;
        renderProfile(container, app, profile, applications);
    } catch (err) {
        container.innerHTML = `
            <div class="card" style="padding: 40px; text-align: center; margin: 24px;">
                <ion-icon name="alert-circle-outline" style="font-size: 3rem; color: #ef4444;"></ion-icon>
                <h2 style="margin-top: 16px;">Sync Failed</h2>
                <p style="color:var(--text-muted); margin-top: 8px;">${err.message}</p>
                <button id="backBtnErr" class="btn-primary" style="margin-top: 24px;">Back to User Directory</button>
            </div>
        `;
        document.getElementById('backBtnErr')?.addEventListener('click', () => app.navigateTo('users'));
    }
}

function renderProfile(container, app, profile, applications) {
    const s = profile;
    const profImage = s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.s_id || 'student'}`;
    const displayId = `STU-${String(s.s_id || 1).padStart(4, '0')}`;
    
    const stats = {
        total: applications.length,
        underReview: applications.filter(a => a.status === 'under_review' || a.status === 'applied').length,
        shortlisted: applications.filter(a => a.status === 'shortlisted').length,
        selected: applications.filter(a => a.status === 'selected').length,
        rejected: applications.filter(a => a.status === 'rejected').length
    };

    // Map all known profile_status DB values to display config
    const STATUS_MAP = {
        placed:       { label: 'Placed',       color: '#34d399', icon: 'ribbon-outline' },
        active:       { label: 'Active',        color: '#93c5fd', icon: 'checkmark-circle-outline' },
        not_eligible: { label: 'Not Eligible',  color: '#f87171', icon: 'close-circle-outline' },
        opted_out:    { label: 'Opted Out',     color: '#94a3b8', icon: 'exit-outline' },
    };
    const rawStatus = String(s.profile_status || 'active').toLowerCase();
    const statusCfg = STATUS_MAP[rawStatus] || { label: rawStatus.replace(/_/g, ' '), color: '#fcd34d', icon: 'time-outline' };

    container.innerHTML = `
        <div class="dashboard-shell" style="padding: 24px;">
            <!-- Header Banner (Unified Design from Student Dashboard) -->
            <div class="profile-header-banner" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px; border-radius: 24px; color: white; display: flex; align-items: center; gap: 32px; margin-bottom: 32px; box-shadow: 0 20px 40px rgba(37, 99, 235, 0.15); position: relative; overflow: hidden;">
                <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
                
                <div style="position: relative;">
                    <img src="${profImage}" alt="Avatar" style="width: 120px; height: 120px; border-radius: 20px; border: 4px solid rgba(255,255,255,0.2); object-fit: cover; background: white;">
                    <div style="position: absolute; bottom: -5px; right: -5px; background: #22c55e; width: 28px; height: 28px; border-radius: 50%; border: 4px solid #1e3a8a; display:flex; align-items:center; justify-content:center;">
                        <ion-icon name="checkmark-sharp" style="color:white; font-size:1rem;"></ion-icon>
                    </div>
                </div>

                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <h1 style="margin: 0; font-size: 2.5rem; font-weight: 800; text-transform: capitalize;">${s.s_name}</h1>
                        <span style="background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 100px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.2);">STUDENT</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 20px; opacity: 0.8; font-weight: 500;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <ion-icon name="business-outline"></ion-icon> ${s.dept}
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <ion-icon name="id-card-outline"></ion-icon> ${displayId}
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <ion-icon name="mail-outline"></ion-icon> ${s.email}
                        </div>
                    </div>
                </div>

                <div style="text-align: right; display: flex; flex-direction: column; gap: 12px;">
                    <button id="backBtn" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 12px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(10px); transition: all 0.2s;">
                        <ion-icon name="arrow-back-outline"></ion-icon> Return to List
                    </button>
                    <div style="background: ${statusCfg.color}; color: #064e3b; padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <ion-icon name="${statusCfg.icon}"></ion-icon>
                        ${statusCfg.label.toUpperCase()}
                    </div>
                </div>
            </div>

            <!-- Stats Grid (Applications Breakdown) -->
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; margin-bottom: 32px;">
                ${renderStatCard('Briefcase', 'Applied', stats.total, 'primary')}
                ${renderStatCard('Search', 'Under Review', stats.underReview, 'warning')}
                ${renderStatCard('List', 'Shortlisted', stats.shortlisted, 'info')}
                ${renderStatCard('Checkmark-Circle', 'Selected', stats.selected, 'success')}
                ${renderStatCard('Close-Circle', 'Rejected', stats.rejected, 'danger')}
            </div>

            <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 32px;">
                <!-- Application Activity Feed -->
                <div class="card" style="padding: 24px;">
                    <h3 style="font-weight: 800; color: var(--text-main); margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
                        <ion-icon name="list-outline" style="color: var(--primary);"></ion-icon>
                        Application Timeline
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        ${applications.length > 0 
                            ? applications.map(app => `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border-radius: 14px; border: 1px solid var(--border); background: white; transition: all 0.2s;" class="hover-card">
                                    <div style="display: flex; align-items: center; gap: 16px;">
                                        <div style="width: 52px; height: 52px; border-radius: 12px; background: #f0f7ff; color: var(--primary); border: 1px solid #e0effe; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.4rem;">
                                            ${app.comp_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 style="margin: 0; font-weight: 700; color: var(--text-main); font-size: 1.1rem;">${app.comp_name}</h4>
                                            <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${app.role}</p>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <span class="tag ${getStatusClass(app.status)}" style="text-transform: uppercase; font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 6px;">${app.status.replace('_', ' ')}</span>
                                        <p style="margin: 8px 0 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Applied ${new Date(app.applied_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            `).join('')
                            : `<div style="text-align:center; padding: 60px; color: var(--text-muted);">
                                <ion-icon name="folder-open-outline" style="font-size: 3rem; opacity: 0.3;"></ion-icon>
                                <p style="margin-top: 12px;">No placement activity recorded yet.</p>
                               </div>`
                        }
                    </div>
                </div>

                <!-- Profile Sidebar Info -->
                <div style="display: flex; flex-direction: column; gap: 32px;">
                    <!-- Academic Performance -->
                    <div class="card" style="padding: 24px; border-top: 4px solid var(--primary);">
                        <h4 style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;">Academic Record</h4>
                        
                        <div style="background: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <span style="font-weight: 600; color: var(--text-muted);">Current CGPA</span>
                                <span style="font-size: 2rem; font-weight: 800; color: var(--primary);">${Number(s.cgpa || 0).toFixed(2)}</span>
                            </div>
                            <div style="height: 8px; background: #e2e8f0; border-radius: 10px; overflow: hidden;">
                                <div style="height: 100%; background: var(--primary); width: ${Math.min(100, (Number(s.cgpa || 0) / 10) * 100)}%; border-radius: 10px;"></div>
                            </div>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 10px; text-align: center; font-weight: 600;">Verified Institutional Data</p>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 16px;">
                             <div style="display: flex; justify-content: space-between; padding: 12px; border-radius: 10px; background: #f1f5f9;">
                                <span style="color: #64748b; font-weight: 600;">Department</span>
                                <span style="font-weight: 700; color: #0f172a;">${s.dept}</span>
                             </div>
                             <div style="display: flex; justify-content: space-between; padding: 12px; border-radius: 10px; background: #f1f5f9;">
                                <span style="color: #64748b; font-weight: 600;">Graduation Year</span>
                                <span style="font-weight: 700; color: #0f172a;">${s.graduation_yr}</span>
                             </div>
                             <div style="display: flex; justify-content: space-between; padding: 12px; border-radius: 10px; background: #f1f5f9;">
                                <span style="color: #64748b; font-weight: 600;">Phone</span>
                                <span style="font-weight: 700; color: #0f172a;">${s.phone || 'N/A'}</span>
                             </div>
                        </div>

                        <div style="margin-top: 24px;">
                            <a href="${s.resume_url || '#'}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 10px; background: #0f172a; color: white; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 700; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                <ion-icon name="document-text-outline" style="font-size: 1.2rem;"></ion-icon>
                                Open Official Resume
                            </a>
                        </div>
                    </div>

                    <!-- Mentorship Status -->
                    <div class="card" style="padding: 24px; background: #f0f9ff; border: 1px solid #bae6fd;">
                         <h4 style="font-size: 0.8rem; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">Guidance Support</h4>
                         <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="width: 48px; height: 48px; border-radius: 50%; background: #0ea5e9; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; border: 3px solid white; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);">
                                ${s.coordinator_name ? s.coordinator_name.charAt(0) : '?'}
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #0c4a6e; font-size: 1.05rem;">${s.coordinator_name || 'Coordinator Pending'}</div>
                                <div style="font-size: 0.85rem; color: #0369a1; font-weight: 500;">${s.coordinator_email || 'Awaiting assignment'}</div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('backBtn')?.addEventListener('click', () => {
        app.navigateTo('users');
    });
}

function renderStatCard(icon, label, value, type) {
    const classes = {
        primary: 'border-left: 4px solid #2563eb; background: #eff6ff;',
        success: 'border-left: 4px solid #16a34a; background: #f0fdf4;',
        danger:  'border-left: 4px solid #dc2626; background: #fef2f2;',
        info:    'border-left: 4px solid #0891b2; background: #f0f9ff;',
        warning: 'border-left: 4px solid #d97706; background: #fffbeb;'
    };
    
    return `
        <div class="card" style="padding: 20px; ${classes[type]} display: flex; flex-direction: column; gap: 8px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
                <ion-icon name="${icon}-outline" style="font-size: 1.25rem; color: #94a3b8;"></ion-icon>
            </div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #0f172a;">${value}</div>
        </div>
    `;
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
