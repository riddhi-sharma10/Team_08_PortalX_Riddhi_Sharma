import { api } from '../api.js';

export async function render(container, app) {
    const studentId = sessionStorage.getItem('selectedStudentId');
    
    if (!studentId) {
        container.innerHTML = `
            <div class="card" style="padding: 40px; text-align: center; margin: 24px;">
                <ion-icon name="alert-circle-outline" style="font-size: 3rem; color: #ef4444;"></ion-icon>
                <h2 style="margin-top: 16px;">No Student Selected</h2>
                <button id="backBtnErr" class="btn-primary" style="margin-top: 24px;">Back to My Students</button>
            </div>
        `;
        document.getElementById('backBtnErr')?.addEventListener('click', () => app.navigateTo('students'));
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
        const data = await api.get(`/coordinator/student/${studentId}/profile`);
        const { profile, applications } = data;
        renderProfile(container, app, profile, applications);
    } catch (err) {
        container.innerHTML = `
            <div class="card" style="padding: 40px; text-align: center; margin: 24px;">
                <ion-icon name="alert-circle-outline" style="font-size: 3rem; color: #ef4444;"></ion-icon>
                <h2 style="margin-top: 16px;">Sync Failed</h2>
                <p style="color:var(--text-muted); margin-top: 8px;">${err.message}</p>
                <button id="backBtnErr" class="btn-primary" style="margin-top: 24px;">Back to My Students</button>
            </div>
        `;
        document.getElementById('backBtnErr')?.addEventListener('click', () => app.navigateTo('students'));
    }
}

function renderProfile(container, app, s, applications) {
    const profImage = s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.s_id || 'student'}`;
    const displayId = `STU-${String(s.s_id || 1).padStart(4, '0')}`;
    
    const stats = {
        total: applications.length,
        shortlisted: applications.filter(a => a.status === 'shortlisted').length,
        selected: applications.filter(a => a.status === 'selected').length
    };

    const rawStatus = String(s.profile_status || 'active').toUpperCase();
    const statusColor = rawStatus === 'PLACED' ? '#10b981' : '#3b82f6';

    container.innerHTML = `
        <div class="dashboard-shell" style="padding: 32px; background: #f8fafc; min-height: 100vh;">
            
            <!-- HEADER BANNER (COORDINATOR SHADE MATCH) -->
            <div style="background: #1B3A6B; border-radius: 24px; padding: 32px; color: white; display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; box-shadow: 0 10px 30px rgba(27, 58, 107, 0.15);">
                <div style="display: flex; align-items: center; gap: 24px;">
                    <div style="position: relative;">
                        <div style="width: 110px; height: 110px; border-radius: 20px; background: white; padding: 4px;">
                            <img src="${profImage}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 16px; object-fit: cover;">
                        </div>
                        <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 100px; font-size: 0.65rem; font-weight: 800; border: 2px solid #1B3A6B; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                            <ion-icon name="checkmark-circle" style="font-size: 0.8rem;"></ion-icon>
                            MY STUDENT
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                            <h1 style="margin: 0; font-size: 2.2rem; font-weight: 800;">${s.s_name}</h1>
                            <span style="background: rgba(255,255,255,0.1); padding: 2px 10px; border-radius: 100px; font-size: 0.7rem; font-weight: 700; border: 1px solid rgba(255,255,255,0.2);">STUDENT</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px; opacity: 0.9;">
                            <span style="font-size: 0.95rem; font-weight: 600;">${s.dept}</span>
                            <span style="width: 4px; height: 4px; background: #f59e0b; border-radius: 50%;"></span>
                            <span style="font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                                <ion-icon name="id-card-outline"></ion-icon> ${displayId}
                            </span>
                        </div>
                        <div style="margin-top: 16px; display: flex; align-items: center; gap: 12px;">
                            <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                                <ion-icon name="mail-outline"></ion-icon> ${s.email}
                            </div>
                            <div style="background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 12px; font-size: 0.85rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                <ion-icon name="ribbon-outline"></ion-icon> ${rawStatus}
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 24px;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button id="connectBtn" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 100px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); transition: all 0.2s;">
                            <ion-icon name="chatbubbles-outline"></ion-icon> Connect with ${s.s_name.split(' ')[0]}
                        </button>
                    </div>

                    <div style="display: flex; background: rgba(255,255,255,0.05); padding: 20px 32px; border-radius: 20px; gap: 40px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 800; color: #7dd3fc;">${stats.total}</div>
                            <div style="font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">APPLIED</div>
                        </div>
                        <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 800; color: #4ade80;">${stats.shortlisted}</div>
                            <div style="font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">SHORTLISTED</div>
                        </div>
                        <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 800; color: #fbbf24;">${s.cgpa}</div>
                            <div style="font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">CGPA</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1.2fr; gap: 32px; margin-bottom: 32px;">
                
                <!-- Profile Details Card -->
                <div class="card" style="padding: 32px; border-radius: 24px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
                        <div style="width: 40px; height: 40px; background: #eff6ff; color: #3b82f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                            <ion-icon name="person-circle-outline"></ion-icon>
                        </div>
                        <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Academic Profile</h2>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                        ${renderDetailField('person-outline', 'Full Name', s.s_name)}
                        ${renderDetailField('school-outline', 'Graduation Year', s.graduation_yr)}
                        ${renderDetailField('mail-outline', 'Institutional Email', s.email)}
                        ${renderDetailField('business-outline', 'Department', s.dept)}
                        ${renderDetailField('analytics-outline', 'Current CGPA', s.cgpa)}
                        ${renderDetailField('call-outline', 'Contact Phone', s.phone || 'Not Provided')}
                    </div>

                    <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #f1f5f9;">
                    </div>
                </div>

                <!-- Account Attributes Card -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <div class="card" style="padding: 32px; border-radius: 24px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                            <div style="width: 40px; height: 40px; background: #fef3c7; color: #d97706; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                <ion-icon name="ribbon-outline"></ion-icon>
                            </div>
                            <h2 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a;">Placement Status</h2>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div style="padding: 16px; background: #fafafa; border: 1px solid #f1f5f9; border-radius: 16px;">
                                <div style="font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Current Eligibility</div>
                                <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #1e293b;">
                                    <ion-icon name="checkmark-done-outline" style="color: #3b82f6;"></ion-icon> Fully Eligible
                                </div>
                            </div>
                            <div style="padding: 16px; background: #fafafa; border: 1px solid #f1f5f9; border-radius: 16px;">
                                <div style="font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Mentor Assignment</div>
                                <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #1e293b;">
                                    <ion-icon name="person-outline" style="color: #10b981;"></ion-icon> ${s.coordinator_name || 'Pending'}
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 32px;">
                            <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 12px;">ACTIVITY SNAPSHOT</div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.9rem;">
                                <span style="color: #64748b;">Job Applications</span>
                                <strong style="color: #0f172a;">${stats.total}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.9rem;">
                                <span style="color: #64748b;">Shortlisted Offers</span>
                                <strong style="color: #10b981;">${stats.shortlisted}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- APPLICATION TIMELINE -->
            <div class="card" style="padding: 32px; border-radius: 24px;">
                <h3 style="font-weight: 800; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
                    <ion-icon name="list-outline" style="color: #3b82f6;"></ion-icon>
                    Application Timeline
                </h3>
                <div style="display: grid; gap: 16px;">
                    ${applications.length > 0 
                        ? applications.map(app => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; background: white; transition: all 0.2s;" class="hover-card">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    <div style="width: 52px; height: 52px; border-radius: 12px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.4rem;">
                                        ${app.comp_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 style="margin: 0; font-weight: 700; color: #1e293b; font-size: 1.1rem;">${app.comp_name}</h4>
                                        <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b; font-weight: 500;">${app.role}</p>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <span class="tag ${getStatusClass(app.status)}" style="text-transform: uppercase; font-size: 0.7rem; font-weight: 800; padding: 6px 12px; border-radius: 8px;">${app.status.replace('_', ' ')}</span>
                                    <p style="margin: 10px 0 0; font-size: 0.75rem; color: #94a3b8; font-weight: 600;">Applied ${new Date(app.applied_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        `).join('')
                        : `<div style="text-align:center; padding: 60px; color: #94a3b8;">
                            <ion-icon name="folder-open-outline" style="font-size: 3rem; opacity: 0.3;"></ion-icon>
                            <p style="margin-top: 12px;">No placement activity recorded yet.</p>
                           </div>`
                    }
                </div>
            </div>

        </div>
    `;

    // Bind events
    document.getElementById('connectBtn')?.addEventListener('click', () => {
        sessionStorage.setItem('chat_target', JSON.stringify({ id: s.email, role: 'student', name: s.s_name }));
        app.navigateTo('messages');
    });
}

function renderDetailField(icon, label, value) {
    return `
        <div>
            <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">${label}</div>
            <div style="display: flex; align-items: center; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 14px;">
                <ion-icon name="${icon}" style="color: #94a3b8; font-size: 1.1rem;"></ion-icon>
                <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">${value}</div>
            </div>
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
