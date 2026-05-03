export const Sidebar = {
    render(role, app) {
        const sidebar = document.getElementById('sidebar');
        
        const menuItems = [
            { id: 'dashboard',    label: 'Dashboard',    icon: 'grid-outline' },
            { id: 'students',     label: 'My Students',  icon: 'people-circle-outline' },
            { id: 'applications', label: 'Applications', icon: 'document-text-outline' },
            { id: 'interviews',   label: 'Interviews',   icon: 'calendar-outline' },
            { id: 'offers',       label: 'Offers',       icon: 'cash-outline' },
            { id: 'placements',   label: 'Placements',   icon: 'trophy-outline' },
            { id: 'queries',      label: 'Queries Explorer', icon: 'code-working-outline' },
        ];

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div>
                    <div class="brand">PORTALX</div>
                    <div class="brand-subtext">COORDINATOR VIEW</div>
                </div>
            </div>
            <div class="sidebar-nav">
                <div class="nav-group">
                    <div class="nav-label">Main Menu</div>
                    ${menuItems.map(item => `
                        <div class="nav-item" data-page="${item.id}">
                            <ion-icon name="${item.icon}"></ion-icon>
                            <span>${item.label}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="nav-group">
                    <div class="nav-label">System</div>
                    <div class="nav-item" data-page="settings">
                        <ion-icon name="settings-outline"></ion-icon>
                        <span>Settings</span>
                    </div>
                </div>
            </div>
            <div class="sidebar-footer">
                <div class="nav-item" id="logout-btn" style="color: #fda4af;">
                    <ion-icon name="log-out-outline"></ion-icon>
                    <span>Logout</span>
                </div>
            </div>
        `;

        sidebar.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', () => {
                app.navigateTo(item.dataset.page);
            });
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            const modalHtml = `
                <div id="logout-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;">
                    <div style="background: var(--white); padding: 32px; border-radius: 20px; box-shadow: var(--shadow-lg); max-width: 400px; width: 90%; text-align: center; transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 1px solid var(--border);">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: #fee2e2; color: var(--danger); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px auto;">
                            <ion-icon name="log-out-outline"></ion-icon>
                        </div>
                        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; color: var(--primary); margin-bottom: 12px; font-weight: 700;">Confirm Logout</h2>
                        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 28px; line-height: 1.5;">Are you sure you want to end your current session?</p>
                        <div style="display: flex; gap: 16px; justify-content: center;">
                            <button id="logout-cancel-btn" style="flex: 1; padding: 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-light); color: var(--text-main); font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.2s;">No</button>
                            <button id="logout-confirm-btn" style="flex: 1; padding: 14px; border-radius: 12px; border: none; background: var(--danger); color: var(--white); font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">Yes</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('logout-modal');
            
            // Add hover effects dynamically
            const cancelBtn = document.getElementById('logout-cancel-btn');
            const confirmBtn = document.getElementById('logout-confirm-btn');
            cancelBtn.onmouseover = () => cancelBtn.style.background = '#e2e8f0';
            cancelBtn.onmouseout = () => cancelBtn.style.background = 'var(--bg-light)';
            confirmBtn.onmouseover = () => confirmBtn.style.background = '#dc2626';
            confirmBtn.onmouseout = () => confirmBtn.style.background = 'var(--danger)';

            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modal.children[0].style.transform = 'scale(1)';
            });

            const removeModal = () => {
                modal.style.opacity = '0';
                modal.children[0].style.transform = 'scale(0.95)';
                setTimeout(() => modal.remove(), 300);
            };

            cancelBtn.addEventListener('click', removeModal);
            confirmBtn.addEventListener('click', () => {
                removeModal();
                app.logout();
            });
        });
    },

    updateActive(pageId) {
        const items = document.querySelectorAll('.nav-item');
        items.forEach(item => {
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
};
