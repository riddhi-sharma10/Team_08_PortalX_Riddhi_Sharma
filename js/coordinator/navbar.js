// js/coordinator/navbar.js
import { api } from '../api.js';

export const Navbar = {
    render(user, app) {
        const navbar = document.getElementById('top-navbar');
        if (!navbar) return;

        this._app = app;
        this.user = user;
        const cleanName = user.name || 'Coordinator';

        navbar.innerHTML = `
            <ion-icon name="menu-outline" class="mobile-menu-btn" id="mobile-menu-toggle"></ion-icon>
            <div class="search-bar">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" placeholder="Search for jobs, companies or students...">
            </div>
            <div class="nav-actions">
                <div class="icon-btn" id="nav-notifications" style="cursor: pointer;">
                    <ion-icon name="notifications-outline"></ion-icon>
                    <span class="badge" style="display: none;">0</span>
                </div>
                <div class="icon-btn" id="nav-messages" style="cursor: pointer;">
                    <ion-icon name="chatbubble-ellipses-outline"></ion-icon>
                    <span class="badge" style="display: none;">0</span>
                </div>
                <div class="user-profile-sm" id="nav-profile-link" style="cursor: pointer; transition: opacity 0.2s;">
                    <div class="user-info-text" style="text-align: right;">
                        <span class="name" style="text-transform: capitalize; font-weight: 700; color: var(--primary);">${cleanName}</span>
                        <span class="role" style="font-weight: 600; font-size: 0.7rem; opacity: 0.6;">COORDINATOR</span>
                    </div>
                    <img id="nav-avatar-img" src="${user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.entityId || 'coordinator'}`}" alt="Avatar" class="avatar" style="border: 2px solid var(--border); width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
                </div>
            </div>
        `;

        // Notification Click
        document.getElementById('nav-notifications')?.addEventListener('click', () => {
            (app || window.App).navigateTo('notifications');
        });

        // Messages Click
        document.getElementById('nav-messages')?.addEventListener('click', () => {
            (app || window.App).navigateTo('messages');
        });

        // Profile Click
        document.getElementById('nav-profile-link')?.addEventListener('click', () => {
            const appRef = this._app || window.App;
            if (appRef?.navigateTo) {
                appRef.navigateTo('profile');
                if (appRef.Sidebar?.updateActive) appRef.Sidebar.updateActive('profile');
            }
        });

        // Add hover effect
        const profileLink = document.getElementById('nav-profile-link');
        if (profileLink) {
            profileLink.addEventListener('mouseenter', () => profileLink.style.opacity = '0.7');
            profileLink.addEventListener('mouseleave', () => profileLink.style.opacity = '1');
        }

        // Start Real-time polling
        this.startPolling();
    },

    async updateBadges() {
        try {
            // Fetch unread notifications and conversations
            const [notifs, conversations] = await Promise.all([
                api.get('/notifications'),
                api.get(`/chat/conversations?userId=${(this.user || window.App.state.user).email || (this.user || window.App.state.user).id}`)
            ]);

            const notifBadge = document.querySelector('#nav-notifications .badge');
            const msgBadge = document.querySelector('#nav-messages .badge');

            if (notifBadge) {
                const unreadNotifs = notifs.filter(n => !n.is_read).length;
                notifBadge.textContent = unreadNotifs;
                notifBadge.style.display = unreadNotifs > 0 ? 'flex' : 'none';
            }

            if (msgBadge) {
                const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
                msgBadge.textContent = totalUnread;
                msgBadge.style.display = totalUnread > 0 ? 'flex' : 'none';
            }
        } catch (err) {
            console.error('Badge update error:', err);
        }
    },

    startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.updateBadges();
        this.pollInterval = setInterval(() => this.updateBadges(), 10000);
    },

    // Instantly sync navbar avatar without full re-render
    updateAvatar(url) {
        if (!url) return;
        this.user.avatar_url = url;
        const img = document.getElementById('nav-avatar-img');
        if (img) img.src = url;
    }
};
