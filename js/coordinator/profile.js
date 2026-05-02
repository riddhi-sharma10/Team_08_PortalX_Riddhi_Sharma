import { api } from '../api.js';

let coordProfile = null;

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
        coordProfile = await api.get('/coordinator/profile');
        renderShell(container, app);
    } catch (err) {
        container.innerHTML = `<div style="padding:40px;text-align:center;color:red;">Error: ${err.message}</div>`;
    }
}

function renderShell(container, app) {
    const profImage = coordProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.state.user.entityId || 'coordinator'}`;
    const displayId = `COORD-${String(app.state.user.entityId || 1).padStart(3, '0')}`;
    
    // Use server-computed placement rate directly (avoids stale/missing field issues)
    const rate = coordProfile.placementRate ?? (
        coordProfile.studentsManaged > 0
            ? Math.round((coordProfile.studentsPlaced / coordProfile.studentsManaged) * 100)
            : 0
    );

    const renderSelf = () => {
        container.innerHTML = `
            <div class="profile-header-banner">
                <div class="profile-avatar-wrapper" style="position: relative; display: inline-block;">
                    <img src="${profImage}" alt="Avatar" id="coord-avatar-img" style="object-fit: cover;">
                    <input type="file" id="coord-avatar-input" accept="image/*" style="display: none;">
                    <button id="change-photo-btn" style="position: absolute; bottom: 5px; right: 5px; background: var(--primary); color: white; border: 2px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: transform 0.2s;">
                        <ion-icon name="camera" style="font-size: 1.2rem;"></ion-icon>
                    </button>
                    <div class="profile-verify-badge" style="background: #e0f2fe; color: #0369a1; border-color: #38bdf8;">
                        <ion-icon name="shield-checkmark"></ion-icon>
                        COORD VERIFIED
                    </div>
                </div>
                
                <div class="profile-info-main">
                    <div style="display:flex; align-items:center; gap:16px; margin-bottom:10px;">
                        <h1 style="text-transform: capitalize; margin: 0; font-size: 2.4rem;">${coordProfile.name}</h1>
                    </div>

                    <div class="profile-info-meta" style="gap: 14px; font-size: 1rem; font-weight: 500; opacity: 0.95; margin-bottom: 16px;">
                        <span>Placement Coordinator</span>
                        <span class="dot"></span>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <ion-icon name="id-card-outline" style="font-size:1.1rem; opacity:0.8;"></ion-icon>
                            <span>${displayId}</span>
                        </div>
                    </div>
                    
                    <div class="profile-meta-box">
                        <ion-icon name="business-outline" style="font-size: 1.1rem;"></ion-icon>
                        <span style="font-weight: 600; letter-spacing: 0.5px;">${coordProfile.department}</span>
                        <span style="opacity: 0.5; margin: 0 4px;">|</span>
                        <ion-icon name="mail-outline" style="font-size: 1.1rem;"></ion-icon>
                        <span>${coordProfile.email || 'No email'}</span>
                    </div>
                </div>

                <div class="profile-stats-box">
                    <div style="text-align: center;">
                        <div style="font-size: 1.6rem; font-weight: 700; color: #93c5fd; line-height: 1;">${coordProfile.studentsManaged || 0}</div>
                        <div style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 8px;">Students</div>
                    </div>
                    <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.6rem; font-weight: 700; color: #34d399; line-height: 1;">${coordProfile.studentsPlaced || 0}</div>
                        <div style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 8px;">Placed</div>
                    </div>
                    <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.6rem; font-weight: 700; color: #fcd34d; line-height: 1;">${rate}%</div>
                        <div style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 8px;">Rate</div>
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
                            <!-- Name: Editable -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">FULL NAME</label>
                                    <ion-icon name="create-outline" style="cursor: pointer; color: var(--primary);" id="edit-name"></ion-icon>
                                </div>
                                <div id="name-container" style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
                                    <ion-icon name="person" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                    <span style="font-weight: 600;">${coordProfile.name}</span>
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
                                    <span style="font-weight: 600;">${coordProfile.phone || '—'}</span>
                                </div>
                            </div>
                            
                            <!-- Email: Read Only -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">INSTITUTIONAL EMAIL</label>
                                </div>
                                <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                    <ion-icon name="mail" style="color: #64748b; font-size: 1.1rem; flex-shrink: 0;"></ion-icon>
                                    <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${coordProfile.email || '—'}</span>
                                </div>
                            </div>

                            <!-- Department: Read Only -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">DEPARTMENT</label>
                                </div>
                                <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                    <ion-icon name="business" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                    <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${coordProfile.department || '—'}</span>
                                </div>
                            </div>
                            
                            <!-- Designation: Read Only -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">DESIGNATION</label>
                                </div>
                                <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                    <ion-icon name="briefcase" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                    <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${coordProfile.designation || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Professional Bio -->
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <ion-icon name="document-text" style="font-size: 1.8rem; color: var(--primary);"></ion-icon>
                                <h3 style="font-size: 1.3rem; margin: 0;">Professional Bio</h3>
                            </div>
                            <ion-icon name="create-outline" style="cursor: pointer; color: var(--primary); font-size: 1.2rem;" id="edit-bio"></ion-icon>
                        </div>
                        <div id="bio-container" style="background: #f1f5f9; padding: 24px; border-radius: 12px; line-height: 1.6; color: #334155; font-size: 0.95rem;">
                            ${coordProfile.bio || 'Responsible for managing student placement activities, coordinating with companies, and guiding students through the recruitment process.'}
                        </div>
                    </div>
                </div>

                <!-- Right Column -->
                <div>
                    <!-- Attributes -->
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
                                <span style="font-weight: 700; color: var(--text-main);">Placement Coordinator</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupHandlers();
    };

    const setupHandlers = () => {
        setupInlineEdit('edit-phone', 'phone-container', 'phone', 'call');
        setupInlineEdit('edit-name', 'name-container', 'name', 'person');

        // Bio edit
        const bioIcon = document.getElementById('edit-bio');
        const bioContainer = document.getElementById('bio-container');
        if (bioIcon && bioContainer) {
            bioIcon.addEventListener('click', () => {
                if (bioIcon.style.display === 'none') return;
                bioIcon.style.display = 'none';

                const ta = document.createElement('textarea');
                ta.value = coordProfile.bio;
                ta.style.cssText = 'width:100%; padding:12px; border:1px solid var(--primary); border-radius:12px; font-family:inherit; font-size:0.95rem; min-height:120px; outline:none; resize:vertical; margin-bottom:12px;';
                bioContainer.innerHTML = '';
                bioContainer.appendChild(ta);

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
                bioContainer.appendChild(btnRow);

                const resetView = () => {
                    bioIcon.style.display = 'block';
                    bioContainer.innerHTML = coordProfile.bio;
                };

                cancelBtn.onclick = () => resetView();
                saveBtn.onclick = () => {
                    coordProfile.bio = ta.value;
                    localStorage.setItem(`coord_bio_${app.state.user.entityId || 1}`, ta.value);
                    resetView();
                };
            });
        }

        // Photo upload
        const changePhotoBtn = document.getElementById('change-photo-btn');
        const avatarInput = document.getElementById('coord-avatar-input');
        if (changePhotoBtn && avatarInput) {
            changePhotoBtn.addEventListener('click', () => avatarInput.click());
            avatarInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
                if (file.size > 2 * 1024 * 1024) { alert('Image size should be less than 2MB.'); return; }

                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64String = event.target.result;
                    try {
                        changePhotoBtn.disabled = true;
                        changePhotoBtn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon>';
                        await api.put('/coordinator/profile', { avatar_url: base64String });

                        coordProfile.avatar_url = base64String;
                        const avatarImg = document.getElementById('coord-avatar-img');
                        if (avatarImg) avatarImg.src = base64String;

                        const savedUser = JSON.parse(localStorage.getItem('placement_user') || '{}');
                        savedUser.avatar_url = base64String;
                        localStorage.setItem('placement_user', JSON.stringify(savedUser));
                        app.state.user = savedUser;
                        if (app.Navbar) app.Navbar.updateAvatar(base64String);
                        
                        alert('Profile photo updated successfully!');
                    } catch (err) {
                        alert('Failed to upload photo: ' + err.message);
                    } finally {
                        const btn = document.getElementById('change-photo-btn');
                        if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<ion-icon name="camera" style="font-size: 1.2rem;"></ion-icon>';
                        }
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const setupInlineEdit = (iconId, containerId, field, iconName) => {
        const icon = document.getElementById(iconId);
        const container = document.getElementById(containerId);
        if (!icon || !container) return;

        icon.addEventListener('click', () => {
            if (icon.style.display === 'none') return;
            icon.style.display = 'none';

            const inputHtml = `<input id="input-${field}" type="text" style="flex: 1; padding: 8px 12px; border: 1px solid var(--primary); border-radius: 8px; font-weight: 600; font-family: inherit; font-size: 0.95rem; outline: none;" value="${coordProfile[field] || ''}">`;

            const wrapper = document.createElement('div');
            wrapper.style.width = '100%';
            wrapper.innerHTML = `<div style="display:flex; align-items:center; gap:12px;">${inputHtml}</div>`;

            container.innerHTML = '';
            container.appendChild(wrapper);

            const btnRow = document.createElement('div');
            btnRow.style.display = 'flex';
            btnRow.style.gap = '8px';
            btnRow.style.marginTop = '12px';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn-primary';
            saveBtn.innerText = 'Save';
            saveBtn.style.padding = '8px 24px';
            saveBtn.style.fontSize = '0.85rem';

            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = 'Cancel';
            cancelBtn.style.padding = '8px 24px';
            cancelBtn.style.fontSize = '0.85rem';
            cancelBtn.style.background = '#e2e8f0';
            cancelBtn.style.color = '#334155';
            cancelBtn.style.border = 'none';
            cancelBtn.style.borderRadius = '10px';
            cancelBtn.style.fontWeight = '600';
            cancelBtn.style.cursor = 'pointer';

            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(saveBtn);
            container.appendChild(btnRow);

            const resetView = () => {
                icon.style.display = 'block';
                container.innerHTML = `
                    <ion-icon name="${iconName}" style="color: #64748b; font-size: 1.1rem; flex-shrink: 0;"></ion-icon>
                    <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${coordProfile[field] || '—'}</span>
                `;
            };

            cancelBtn.onclick = () => resetView();

            saveBtn.onclick = async () => {
                const val = document.getElementById(`input-${field}`).value;
                coordProfile[field] = val;
                
                try {
                    saveBtn.innerText = '...';
                    await api.put('/coordinator/profile', { [field]: val });
                    
                    if(field === 'name') {
                        app.state.user.name = val;
                        renderSelf();
                        if(app.Navbar) app.Navbar.render(app.state.user, app);
                    } else {
                        resetView();
                    }
                } catch(e) {
                    alert('Failed to save: ' + e.message);
                    resetView();
                }
            };
        });
    };

    renderSelf();
}
