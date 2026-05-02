
import { api } from '../api.js';

let studentProfile = null;

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
        studentProfile = await api.get('/students/profile');
        renderShell(container, app);
    } catch (err) {
        container.innerHTML = `<div style="padding:40px;text-align:center;color:red;">Error: ${err.message}</div>`;
    }
}

function renderShell(container, app) {
    const s = studentProfile;
    const profImage = s.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.s_id || 'student'}`;
    const displayId = `STU-${String(s.s_id || 1).padStart(4, '0')}`;

    // Map all known profile_status DB values to display config
    const STATUS_MAP = {
        placed:       { label: 'Placed',       color: '#34d399', icon: 'ribbon-outline' },
        active:       { label: 'Active',        color: '#93c5fd', icon: 'checkmark-circle-outline' },
        not_eligible: { label: 'Not Eligible',  color: '#f87171', icon: 'close-circle-outline' },
        opted_out:    { label: 'Opted Out',     color: '#94a3b8', icon: 'exit-outline' },
    };
    const rawStatus = String(s.profile_status || 'active').toLowerCase();
    const statusCfg = STATUS_MAP[rawStatus] || { label: rawStatus.replace(/_/g, ' '), color: '#fcd34d', icon: 'time-outline' };
    const statusColor = statusCfg.color;
    const statusLabel = statusCfg.label;
    const statusIcon  = statusCfg.icon;

    const cgpaColor = Number(s.cgpa) >= 8 ? '#34d399' : Number(s.cgpa) >= 6 ? '#93c5fd' : '#fcd34d';

    container.innerHTML = `
        <div class="profile-header-banner">
            <div class="profile-avatar-wrapper" style="position: relative; display: inline-block;">
                <img src="${profImage}" alt="Avatar" id="stu-avatar-img" style="object-fit: cover;">
                <input type="file" id="stu-avatar-input" accept="image/*" style="display: none;">
                <button id="change-photo-btn" style="position: absolute; bottom: 5px; right: 5px; background: var(--primary); color: white; border: 2px solid white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: transform 0.2s;">
                    <ion-icon name="camera" style="font-size: 1.2rem;"></ion-icon>
                </button>
                <div class="profile-verify-badge" style="background: #f0fdf4; color: #166534; border-color: #86efac;">
                    <ion-icon name="school"></ion-icon>
                    STUDENT
                </div>
            </div>

            <div class="profile-info-main">
                <div style="display:flex; align-items:center; gap:16px; margin-bottom:10px;">
                    <h1 style="text-transform: capitalize; margin: 0; font-size: 2.4rem;">${s.s_name}</h1>
                </div>

                <div class="profile-info-meta" style="gap: 14px; font-size: 1rem; font-weight: 500; opacity: 0.95; margin-bottom: 16px;">
                    <span>${s.dept || 'Department'}</span>
                    <span class="dot"></span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <ion-icon name="id-card-outline" style="font-size:1.1rem; opacity:0.8;"></ion-icon>
                        <span>${displayId}</span>
                    </div>
                </div>

                <div class="profile-meta-box">
                    <ion-icon name="mail-outline" style="font-size: 1.1rem;"></ion-icon>
                    <span>${s.email || 'No email'}</span>
                    <span style="opacity: 0.5; margin: 0 4px;">|</span>
                    <ion-icon name="calendar-outline" style="font-size: 1.1rem;"></ion-icon>
                    <span style="font-weight: 600; letter-spacing: 0.5px;">Batch of ${s.graduation_yr || '—'}</span>
                </div>
            </div>

            <div class="profile-stats-box">
                <div style="text-align: center;">
                    <div style="font-size: 1.6rem; font-weight: 700; color: #93c5fd; line-height: 1;">${Number(s.cgpa || 0).toFixed(2)}</div>
                    <div style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 8px;">CGPA</div>
                </div>
                <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                <div style="text-align: center;">
                    <div style="font-size: 1.6rem; font-weight: 700; color: #34d399; line-height: 1;">${s.graduation_yr || '—'}</div>
                    <div style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 8px;">Grad Year</div>
                </div>
                <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                <div style="text-align: center;">
                    <div style="font-size: 1.1rem; font-weight: 700; color: ${statusColor}; line-height: 1; text-transform: capitalize; letter-spacing: 0.3px;">${statusLabel}</div>
                    <div style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 8px;">Status</div>
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
                        <!-- Full Name -->
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">FULL NAME</label>
                            </div>
                            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
                                <ion-icon name="person" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                <span style="font-weight: 600;">${s.s_name}</span>
                            </div>
                        </div>

                        <!-- Phone -->
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">PHONE NUMBER</label>
                            </div>
                            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
                                <ion-icon name="call" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                <span style="font-weight: 600;">${s.phone || '—'}</span>
                            </div>
                        </div>

                        <!-- Email -->
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">INSTITUTIONAL EMAIL</label>
                            </div>
                            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                <ion-icon name="mail" style="color: #64748b; font-size: 1.1rem; flex-shrink: 0;"></ion-icon>
                                <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.email || '—'}</span>
                            </div>
                        </div>

                        <!-- Department -->
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">DEPARTMENT</label>
                            </div>
                            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                <ion-icon name="business" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                <span style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.dept || '—'}</span>
                            </div>
                        </div>

                        <!-- CGPA -->
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">CURRENT CGPA</label>
                            </div>
                            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                <ion-icon name="star" style="color: ${cgpaColor}; font-size: 1.1rem;"></ion-icon>
                                <span style="font-weight: 700; font-size: 1.1rem; color: ${cgpaColor};">${Number(s.cgpa || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <!-- Graduation Year -->
                        <div class="form-group">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <label style="margin-bottom: 0px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted);">GRADUATION YEAR</label>
                            </div>
                            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; opacity: 0.8;">
                                <ion-icon name="calendar" style="color: #64748b; font-size: 1.1rem;"></ion-icon>
                                <span style="font-weight: 600; font-size: 0.9rem;">${s.graduation_yr || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Resume Card -->
                <div class="card">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                        <ion-icon name="document-text" style="font-size: 1.8rem; color: var(--primary);"></ion-icon>
                        <h3 style="font-size: 1.3rem; margin: 0;">Official Resume</h3>
                    </div>
                    <div style="background: #f8fafc; padding: 24px; border-radius: 12px; border: 2px dashed var(--border); text-align: center;">
                        <p style="color: var(--text-muted); margin-bottom: 16px; font-size: 0.9rem;">Your verified placement resume on record</p>
                        <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
                            <a href="${s.resume_url || '#'}" target="_blank" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; text-decoration: none; border-radius: 12px; width: fit-content;">
                                <ion-icon name="document-text-outline"></ion-icon>
                                View Verified Resume
                            </a>
                            <button id="update-resume-btn" style="background: white; color: var(--primary); border: 1px solid var(--primary); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                                <ion-icon name="cloud-upload-outline"></ion-icon> Update Resume Link
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column -->
            <div style="display: flex; flex-direction: column; gap: 32px;">
                <!-- Account Attributes -->
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
                            <span style="font-weight: 700; color: var(--text-main);">Student</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">PLACEMENT STATUS</span>
                        </div>
                        <div style="background: #f8fafc; padding: 12px 16px; border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; gap: 12px;">
                            <ion-icon name="${statusIcon}" style="color: ${statusColor}; font-size: 1.2rem;"></ion-icon>
                            <span style="font-weight: 700; color: var(--text-main); text-transform: capitalize;">${statusLabel}</span>
                        </div>
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">ACADEMIC SCORE</span>
                        </div>
                        <div style="background: #f8fafc; padding: 12px 16px; border: 1px solid var(--border); border-radius: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 700; color: ${cgpaColor}; font-size: 1.1rem;">${Number(s.cgpa || 0).toFixed(2)} / 10</span>
                            </div>
                            <div style="background: #e2e8f0; border-radius: 100px; height: 6px; overflow: hidden;">
                                <div style="height: 100%; border-radius: 100px; background: ${cgpaColor}; width: ${Math.min(100, (Number(s.cgpa || 0) / 10) * 100)}%; transition: width 0.6s ease;"></div>
                            </div>
                        </div>
                    </div>

                    ${rawStatus === 'active' ? `
                        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border);">
                            <h4 style="color: #ef4444; font-size: 0.9rem; font-weight: 800; margin-bottom: 8px;">DANGER ZONE</h4>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">Opt out from the official placement process. This action is permanent.</p>
                            <button id="opt-out-btn" style="width: 100%; padding: 12px; background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; border-radius: 10px; font-weight: 800; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;">
                                <ion-icon name="exit-outline" style="font-size: 1.2rem;"></ion-icon>
                                Opt Out of Placements
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    const optOutBtn = document.getElementById('opt-out-btn');
    if (optOutBtn) {
        optOutBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you absolutely sure you want to opt out? You will no longer be able to apply for any job opportunities through this portal.');
            if (confirmed) {
                try {
                    optOutBtn.disabled = true;
                    optOutBtn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> Processing...';
                    
                    const res = await api.post('/students/opt-out');
                    alert(res.message);
                    
                    // Refresh profile
                    studentProfile = await api.get('/students/profile');
                    renderShell(container, app);
                } catch (err) {
                    alert(err.message);
                    optOutBtn.disabled = false;
                    optOutBtn.innerHTML = '<ion-icon name="exit-outline"></ion-icon> Opt Out of Placements';
                }
            }
        });
    }

    const updateBtn = document.getElementById('update-resume-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            const newUrl = prompt('Enter the link to your updated resume (e.g., Google Drive or LinkedIn link):', studentProfile.resume_url || '');
            if (newUrl && newUrl !== studentProfile.resume_url) {
                try {
                    updateBtn.disabled = true;
                    updateBtn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> Updating...';
                    
                    await api.put('/students/profile', { 
                        resume_url: newUrl,
                        phone: studentProfile.phone,
                        avatar_url: studentProfile.avatar_url
                    });
                    
                    alert('Resume updated successfully!');
                    // Refresh profile data
                    studentProfile = await api.get('/students/profile');
                    renderShell(container, app);
                } catch (err) {
                    alert('Update failed: ' + err.message);
                    updateBtn.innerHTML = '<ion-icon name="cloud-upload-outline"></ion-icon> Update Resume Link';
                    updateBtn.disabled = false;
                }
            }
        });
    }

    const changePhotoBtn = document.getElementById('change-photo-btn');
    const avatarInput = document.getElementById('stu-avatar-input');

    if (changePhotoBtn && avatarInput) {
        changePhotoBtn.addEventListener('click', () => avatarInput.click());

        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Basic validation
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert('Image size should be less than 2MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64String = event.target.result;
                
                try {
                    changePhotoBtn.disabled = true;
                    changePhotoBtn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon>';

                    await api.put('/students/profile', {
                        resume_url: studentProfile.resume_url,
                        phone: studentProfile.phone,
                        avatar_url: base64String
                    });

                    // Update UI and local storage
                    studentProfile.avatar_url = base64String;
                    const img = document.getElementById('stu-avatar-img');
                    if (img) img.src = base64String;

                    const savedUser = JSON.parse(localStorage.getItem('placement_user') || '{}');
                    savedUser.avatar_url = base64String;
                    localStorage.setItem('placement_user', JSON.stringify(savedUser));
                    app.state.user = savedUser;

                    // Sync Navbar avatar only (no full re-render)
                    if (app.Navbar) app.Navbar.updateAvatar(base64String);
                    
                    alert('Profile photo uploaded and updated successfully!');
                } catch (err) {
                    alert('Failed to upload photo: ' + err.message);
                } finally {
                    changePhotoBtn.disabled = false;
                    changePhotoBtn.innerHTML = '<ion-icon name="camera" style="font-size: 1.2rem;"></ion-icon>';
                }
            };
            reader.readAsDataURL(file);
        });
    }
}
