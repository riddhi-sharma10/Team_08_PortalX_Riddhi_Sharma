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
            { id: 'queries',      label: 'Queries',      icon: 'code-working-outline' },
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
            app.logout();
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
