// js/admin/coordinator_profile.js
import { api } from '../api.js';

export async function render(container, app) {
    const coordId = sessionStorage.getItem('selectedCoordId');
    
    if (!coordId) {
        container.innerHTML = `
            <div class="card" style="padding: 40px; text-align: center; margin: 24px;">
                <ion-icon name="alert-circle-outline" style="font-size: 3rem; color: #ef4444;"></ion-icon>
                <h2 style="margin-top: 16px;">No Coordinator Selected</h2>
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
                <p>Syncing coordinator data from master database...</p>
            </div>
        </div>
    `;

    try {
        const data = await api.get(`/admin/coordinator/${coordId}/profile`);
        renderProfile(container, app, data);
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

function renderProfile(container, app, data) {
    const { profile: c, stats, students } = data;
    const profImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name || 'coord'}`;
    const displayId = `COORD-${String(sessionStorage.getItem('selectedCoordId') || 1).padStart(3, '0')}`;
    
    container.innerHTML = `
        <div class="dashboard-shell" style="padding: 32px; background: #f8fafc; min-height: 100vh;">
            
            <!-- HEADER BANNER (ADMIN BLUE SHADE MATCH) -->
            <div style="background: #1B3A6B; border-radius: 24px; padding: 32px; color: white; display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; box-shadow: 0 10px 30px rgba(27, 58, 107, 0.15);">
                <div style="display: flex; align-items: center; gap: 24px;">
                    <div style="position: relative;">
                        <div style="width: 110px; height: 110px; border-radius: 20px; background: white; padding: 4px;">
                            <img src="${profImage}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 16px; object-fit: cover;">
                        </div>
                        <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 100px; font-size: 0.65rem; font-weight: 800; border: 2px solid #1B3A6B; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                            <ion-icon name="shield-checkmark" style="font-size: 0.8rem;"></ion-icon>
                            COORD VERIFIED
                        </div>
                    </div>
                    <div>
                        <h1 style="margin: 0; font-size: 2.2rem; font-weight: 800;">${c.name}</h1>
                        <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px; opacity: 0.9;">
                            <span style="font-size: 0.95rem; font-weight: 600;">Placement Coordinator</span>
                            <span style="width: 4px; height: 4px; background: #f59e0b; border-radius: 50%;"></span>
                            <span style="font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                                <ion-icon name="id-card-outline"></ion-icon> ${displayId}
                            </span>
                        </div>
                        <div style="margin-top: 16px; display: flex; align-items: center; gap: 12px;">
                            <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                                <ion-icon name="business-outline"></ion-icon> ${c.dept}
                            </div>
                            <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                                <ion-icon name="mail-outline"></ion-icon> ${c.email}
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 24px;">
                    <button id="backBtnHeader" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 100px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; transition: all 0.2s; backdrop-filter: blur(4px);">
                        <ion-icon name="arrow-back-outline"></ion-icon> Return to List
                    </button>
                    <button id="connectBtn" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 100px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); transition: all 0.2s;">
                        <ion-icon name="chatbubbles-outline"></ion-icon> Connect with ${c.name.split(' ')[0]}
                    </button>
                    
                    <div style="display: flex; background: rgba(255,255,255,0.05); padding: 20px 32px; border-radius: 20px; gap: 40px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 800; color: #7dd3fc;">${stats.totalStudents}</div>
                            <div style="font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">STUDENTS</div>
                        </div>
                        <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 800; color: #4ade80;">${stats.placedStudents}</div>
                            <div style="font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">PLACED</div>
                        </div>
                        <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 800; color: #fbbf24;">${stats.placementRate}%</div>
                            <div style="font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">SUCCESS</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TWO-COLUMN CONTENT AREA -->
            <div style="display: grid; grid-template-columns: 2fr 1.2fr; gap: 32px; margin-bottom: 32px;">
                
                <!-- Profile Details Card -->
                <div class="card" style="padding: 32px; border-radius: 24px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
                        <div style="width: 40px; height: 40px; background: #eff6ff; color: #3b82f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                            <ion-icon name="person-circle-outline"></ion-icon>
                        </div>
                        <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Profile Details</h2>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                        ${renderDetailField('person-outline', 'Full Name', c.name)}
                        ${renderDetailField('call-outline', 'Phone Number', c.phone_no || 'Not Provided')}
                        ${renderDetailField('mail-outline', 'Institutional Email', c.email)}
                        ${renderDetailField('business-outline', 'Department', c.dept)}
                        ${renderDetailField('briefcase-outline', 'Designation', 'Placement Coordinator')}
                        ${renderDetailField('location-outline', 'Office Location', 'Department Office, Room 102')}
                    </div>

                    <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #f1f5f9;">
                    </div>
                </div>

                <!-- Account Attributes Card -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <div class="card" style="padding: 32px; border-radius: 24px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                            <div style="width: 40px; height: 40px; background: #fef3c7; color: #d97706; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                <ion-icon name="shield-outline"></ion-icon>
                            </div>
                            <h2 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a;">Account Attributes</h2>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div style="padding: 16px; background: #fafafa; border: 1px solid #f1f5f9; border-radius: 16px;">
                                <div style="font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Role Clearance</div>
                                <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #1e293b;">
                                    <ion-icon name="key-outline" style="color: #3b82f6;"></ion-icon> Department Admin
                                </div>
                            </div>
                            <div style="padding: 16px; background: #fafafa; border: 1px solid #f1f5f9; border-radius: 16px;">
                                <div style="font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Platform Scope</div>
                                <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #1e293b;">
                                    <ion-icon name="globe-outline" style="color: #10b981;"></ion-icon> Managed Students Only
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 32px;">
                            <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 12px;">SYSTEM OVERVIEW</div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.9rem;">
                                <span style="color: #64748b;">Assigned Students</span>
                                <strong style="color: #0f172a;">${stats.totalStudents}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.9rem;">
                                <span style="color: #64748b;">Active Placements</span>
                                <strong style="color: #10b981;">${stats.placedStudents}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MANAGED STUDENTS TABLE (Important for Coordinators) -->
            <div class="card" style="padding: 24px; border-radius: 24px;">
                <h3 style="font-weight: 800; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
                    <ion-icon name="people-outline" style="color: #3b82f6;"></ion-icon>
                    Assigned Students Registry
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #f1f5f9;">
                                <th style="padding: 12px 16px; text-align: left; font-size: 0.7rem; color: #64748b; text-transform: uppercase;">Student</th>
                                <th style="padding: 12px 16px; text-align: left; font-size: 0.7rem; color: #64748b; text-transform: uppercase;">Dept</th>
                                <th style="padding: 12px 16px; text-align: left; font-size: 0.7rem; color: #64748b; text-transform: uppercase;">Status</th>
                                <th style="padding: 12px 16px; text-align: right; font-size: 0.7rem; color: #64748b; text-transform: uppercase;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${students.map(s => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 16px;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="width: 36px; height: 36px; border-radius: 10px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; font-weight: 800;">
                                                ${s.s_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style="font-weight: 700; color: #1e293b;">${s.s_name}</div>
                                                <div style="font-size: 0.7rem; color: #64748b;">${s.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="padding: 16px; font-weight: 600; color: #475569;">${s.dept}</td>
                                    <td style="padding: 16px;">
                                        <span class="tag ${getStudentStatusClass(s.profile_status)}" style="font-size: 0.65rem; font-weight: 800;">${s.profile_status.toUpperCase()}</span>
                                    </td>
                                    <td style="padding: 16px; text-align: right;">
                                        <button class="view-student-btn" data-id="${s.s_id}" style="background: white; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer;">View Profile</button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${students.length === 0 ? `<tr><td colspan="4" style="padding: 40px; text-align: center; color: #94a3b8;">No students assigned yet.</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    `;

    // Bind events
    const goBack = () => app.navigateTo('users');
    document.getElementById('backBtnHeader')?.addEventListener('click', goBack);
    
    document.getElementById('connectBtn')?.addEventListener('click', () => {
        sessionStorage.setItem('chat_target', JSON.stringify({ id: c.email, role: 'coordinator', name: c.name }));
        app.navigateTo('messages');
    });
    
    container.querySelectorAll('.view-student-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sid = btn.dataset.id;
            sessionStorage.setItem('selectedStudentId', sid);
            sessionStorage.setItem('studentProfileOrigin', 'coordinator_profile'); // Set origin
            app.navigateTo('student_profile');
        });
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

function getStudentStatusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'placed') return 'tag-success';
    if (s === 'not_eligible') return 'tag-danger';
    if (s === 'opted_out') return 'tag-muted';
    return 'tag-info';
}
