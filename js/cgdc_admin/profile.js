// js/cgdc_admin/profile.js

import { api } from '../api.js';

let adminProfile = null;

// localStorage helpers for editable fields
const STORAGE_KEY_PREFIX = 'admin_profile_';

function loadOverrides(username) {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + username) || '{}'); }
    catch { return {}; }
}

function saveOverrides(username, data) {
    localStorage.setItem(STORAGE_KEY_PREFIX + username, JSON.stringify(data));
}

export async function render(container, app) {
    container.innerHTML = `
        <div class="admin-dashboard-shell" style="display:flex;align-items:center;justify-content:center;min-height:400px;">
            <div style="text-align:center;color:var(--text-muted);">
                <ion-icon name="sync-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px; animation:spin 1s linear infinite;"></ion-icon>
                <p>Loading Profile...</p>
            </div>
        </div>
    `;

    try {
        const dbProfile = await api.get('/admin/profile');
        const username = app?.state?.user?.username || 'admin';
        const overrides = loadOverrides(username);

        // Merge DB data with any user-saved local overrides for editable fields
        adminProfile = {
            ...dbProfile,
            phone: overrides.phone || '+91 98765 43210',
            officeLocation: overrides.officeLocation || 'Admin Block, 2nd Floor',
            bio: overrides.bio || 'Responsible for managing placement operations, employer relations, and institutional recruitment workflows.',
            // DB fields take precedence for name/email/designation/department
            name: overrides.name || dbProfile.name,
        };

        renderShell(container, app);
    } catch (err) {
        container.innerHTML = `<div style="padding:40px;text-align:center;color:red;">Error: ${err.message}</div>`;
    }
}

function renderShell(container, app) {
    const p = adminProfile;
    const username = app?.state?.user?.username || 'admin';
    const profImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    const displayId = `ADM-${String(app?.state?.user?.entityId || 1).padStart(3, '0')}`;

    const renderSelf = () => {
        container.innerHTML = `
            <div class="profile-header-banner">
                <div class="profile-avatar-wrapper" style="position: relative; display: inline-block;">
                    <img src="${profImage}" alt="Avatar" id="admin-avatar-img">
                    <div class="profile-verify-badge" style="background: #e0f2fe; color: #0369a1; border-color: #38bdf8;">
                        <ion-icon name="shield-checkmark"></ion-icon>
                        ADMIN VERIFIED
                    </div>
                </div>

                <div class="profile-info-main">
                    <div style="display:flex; align-items:center; gap:16px; margin-bottom:10px;">
                        <h1 style="text-transform: capitalize; margin: 0; font-size: 2.4rem;">${p.name}</h1>
                    </div>

                    <div class="profile-info-meta" style="gap: 14px; font-size: 1rem; font-weight: 500; opacity: 0.95; margin-bottom: 16px;">
                        <span>${p.designation}</span>
                        <span class="dot"></span>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <ion-icon name="id-card-outline" style="font-size:1.1rem; opacity:0.8;"></ion-icon>
                            <span>${displayId}</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 12px; font-size: 0.85rem; opacity: 0.9; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 20px; width: fit-content; border: 1px solid rgba(255,255,255,0.15);">
                        <ion-icon name="business-outline" style="font-size: 1.1rem;"></ion-icon>
                        <span style="font-weight: 600; letter-spacing: 0.5px;">${p.department}</span>
                        <span style="opacity: 0.5; margin: 0 4px;">|</span>
                        <ion-icon name="mail-outline" style="font-size: 1.1rem;"></ion-icon>
                        <span>${p.email || 'No email'}</span>
                    </div>
                </div>

                <div style="margin-left: auto; display: flex; gap: 24px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 20px 28px; border-radius: 20px; backdrop-filter: blur(10px);">
                    <div style="text-align: center;">
                        <div style="font-size: 1.6rem; font-weight: 700; color: #93c5fd; line-height: 1;">${p.totalCoordinators}</div>
                        <div style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 8px;">Coordinators</div>
                    </div>
                    <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.6rem; font-weight: 700; color: #34d399; line-height: 1;">${p.totalCompanies}</div>
                        <div style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 8px;">Companies</div>
                    </div>
                    <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.6rem; font-weight: 700; color: #fcd34d; line-height: 1;">${p.totalStudents}</div>
                        <div style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 8px;">Students</div>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 32px;">
                <!-- Left Column -->
                <div style="display: flex; flex-direction: column; gap: 32px;">
                    <!-- Profile Details -->
                    <div class="card">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
                            <ion-icon name="person-circle" style="font-size: 1.8rem; color: var(--primary);"></ion-icon>
                            <h3 style="font-size: 1.3rem;">Profile Details</h3>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
                            <!-- Full Name: Editable -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">FULL NAME</label>
                                    <ion-icon name="create-outline" style="cursor: pointer; color: var(--primary);" id="edit-name"></ion-icon>
                                </div>
                                <div id="name-container" style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
                                    <ion-icon name="person" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                    <span style="font-weight: 600;">${p.name}</span>
                                </div>
                            </div>

                            <!-- Phone: Editable -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">PHONE NUMBER</label>
                                    <ion-icon name="create-outline" style="cursor: pointer; color: var(--primary);" id="edit-phone"></ion-icon>
                                </div>
                                <div id="phone-container" style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
                                    <ion-icon name="call" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                    <span style="font-weight: 600;">${p.phone}</span>
                                </div>
                            </div>

                            <!-- Email: Read Only -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">INSTITUTIONAL EMAIL</label>
                                </div>
                                <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                    <ion-icon name="mail" style="color: #64748b; font-size: 1.1rem; flex-shrink: 0;"></ion-icon>
                                    <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.email || '—'}</span>
                                </div>
                            </div>

                            <!-- Department: Read Only -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">DEPARTMENT</label>
                                </div>
                                <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                    <ion-icon name="business" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                    <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.department || '—'}</span>
                                </div>
                            </div>

                            <!-- Designation: Read Only -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">DESIGNATION</label>
                                </div>
                                <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                    <ion-icon name="briefcase" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                    <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.designation || '—'}</span>
                                </div>
                            </div>

                            <!-- Office Location: Editable -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">OFFICE LOCATION</label>
                                    <ion-icon name="create-outline" style="cursor: pointer; color: var(--primary);" id="edit-office"></ion-icon>
                                </div>
                                <div id="office-container" style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
                                    <ion-icon name="location" style="color: #64748b; font-size: 1.1rem; flex-shrink: 0;"></ion-icon>
                                    <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.officeLocation}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Administrative Bio -->
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <ion-icon name="document-text" style="font-size: 1.8rem; color: var(--primary);"></ion-icon>
                                <h3 style="font-size: 1.3rem; margin: 0;">Administrative Bio</h3>
                            </div>
                            <ion-icon name="create-outline" style="cursor: pointer; color: var(--primary); font-size: 1.2rem;" id="edit-bio"></ion-icon>
                        </div>
                        <div id="bio-container" style="background: #f1f5f9; padding: 24px; border-radius: 12px; line-height: 1.6; color: #334155; font-size: 0.95rem;">
                            ${p.bio}
                        </div>
                    </div>
                </div>

                <!-- Right Column -->
                <div style="display: flex; flex-direction: column; gap: 32px;">
                    <div class="card" style="padding: 32px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                            <ion-icon name="shield" style="font-size: 1.8rem; color: var(--primary);"></ion-icon>
                            <h3 style="font-size: 1.3rem; margin: 0;">Account Attributes</h3>
                        </div>

                        <div style="margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">ROLE CLEARANCE</span>
                            </div>
                            <div style="background: #f8fafc; padding: 12px 16px; border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; gap: 12px;">
                                <ion-icon name="key" style="color: var(--primary); font-size: 1.2rem;"></ion-icon>
                                <span style="font-weight: 700; color: var(--text-main);">Global Admin</span>
                            </div>
                        </div>

                        <div style="margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">PLATFORM SCOPE</span>
                            </div>
                            <div style="background: #f8fafc; padding: 12px 16px; border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; gap: 12px;">
                                <ion-icon name="globe-outline" style="color: var(--primary); font-size: 1.2rem;"></ion-icon>
                                <span style="font-weight: 700; color: var(--text-main);">Full Access</span>
                            </div>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">SYSTEM OVERVIEW</span>
                            </div>
                            <div style="background: #f8fafc; padding: 16px; border: 1px solid var(--border); border-radius: 10px; display: flex; flex-direction: column; gap: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 0.8rem; color: var(--text-muted);">Coordinators</span>
                                    <span style="font-weight: 700; color: #93c5fd;">${p.totalCoordinators}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 0.8rem; color: var(--text-muted);">Companies</span>
                                    <span style="font-weight: 700; color: #34d399;">${p.totalCompanies}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 0.8rem; color: var(--text-muted);">Students</span>
                                    <span style="font-weight: 700; color: #fcd34d;">${p.totalStudents}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupHandlers(username, app, renderSelf);
    };

    renderSelf();
}

function setupHandlers(username, app, renderSelf) {
    setupInlineEdit('edit-name', 'name-container', 'name', 'person', username, app, renderSelf);
    setupInlineEdit('edit-phone', 'phone-container', 'phone', 'call', username, app, renderSelf);
    setupInlineEdit('edit-office', 'office-container', 'officeLocation', 'location', username, app, renderSelf);
    setupBioEdit('edit-bio', 'bio-container', username);
}

function setupInlineEdit(iconId, containerId, field, iconName, username, app, renderSelf) {
    const icon = document.getElementById(iconId);
    const container = document.getElementById(containerId);
    if (!icon || !container) return;

    icon.addEventListener('click', () => {
        if (icon.style.display === 'none') return;
        icon.style.display = 'none';

        const inputHtml = `<input id="input-${field}" type="text" style="flex: 1; padding: 8px 12px; border: 1px solid var(--primary); border-radius: 8px; font-weight: 600; font-family: inherit; font-size: 0.95rem; outline: none;" value="${adminProfile[field] || ''}">`;
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.innerHTML = `<div style="display:flex; align-items:center; gap:12px;">${inputHtml}</div>`;
        container.innerHTML = '';
        container.appendChild(wrapper);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:8px; margin-top:12px;';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.innerText = 'Save';
        saveBtn.style.cssText = 'padding:8px 24px; font-size:0.85rem;';

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancel';
        cancelBtn.style.cssText = 'padding:8px 24px; font-size:0.85rem; background:#e2e8f0; color:#334155; border:none; border-radius:10px; font-weight:600; cursor:pointer;';

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(saveBtn);
        container.appendChild(btnRow);

        const resetView = () => {
            icon.style.display = 'block';
            container.innerHTML = `
                <ion-icon name="${iconName}" style="color: #64748b; font-size: 1.1rem; flex-shrink: 0;"></ion-icon>
                <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${adminProfile[field] || '—'}</span>
            `;
        };

        cancelBtn.onclick = () => resetView();

        saveBtn.onclick = () => {
            const val = document.getElementById(`input-${field}`)?.value || '';
            adminProfile[field] = val;
            const overrides = loadOverrides(username);
            overrides[field] = val;
            saveOverrides(username, overrides);

            if (field === 'name' && app?.state?.user) {
                app.state.user.name = val;
                if (app.Navbar) app.Navbar.render(app.state.user, app);
                renderSelf();
            } else {
                resetView();
            }
        };
    });
}

function setupBioEdit(iconId, containerId, username) {
    const icon = document.getElementById(iconId);
    const container = document.getElementById(containerId);
    if (!icon || !container) return;

    icon.addEventListener('click', () => {
        if (icon.style.display === 'none') return;
        icon.style.display = 'none';

        const ta = document.createElement('textarea');
        ta.id = 'input-bio';
        ta.value = adminProfile.bio;
        ta.style.cssText = 'width:100%; padding:12px; border:1px solid var(--primary); border-radius:12px; font-family:inherit; font-size:0.95rem; min-height:120px; outline:none; resize:vertical; margin-bottom:12px;';
        container.innerHTML = '';
        container.appendChild(ta);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:8px;';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.innerText = 'Save';
        saveBtn.style.cssText = 'padding:8px 24px; font-size:0.85rem;';

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancel';
        cancelBtn.style.cssText = 'padding:8px 24px; font-size:0.85rem; background:#e2e8f0; color:#334155; border:none; border-radius:10px; font-weight:600; cursor:pointer;';

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(saveBtn);
        container.appendChild(btnRow);

        const resetView = () => {
            icon.style.display = 'block';
            container.innerHTML = adminProfile.bio;
        };

        cancelBtn.onclick = () => resetView();
        saveBtn.onclick = () => {
            const val = document.getElementById('input-bio')?.value || '';
            adminProfile.bio = val;
            const overrides = loadOverrides(username);
            overrides.bio = val;
            saveOverrides(username, overrides);
            resetView();
        };
    });
}
