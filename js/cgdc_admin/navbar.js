// js/cgdc_admin/navbar.js
import { api } from '../api.js';

export const Navbar = {
    render(user) {
        const navbar = document.getElementById('top-navbar');
        this.user = user;
        this.app = window.App;
        // Double check name and remove potential "User " prefix from old sessions
        const cleanName = user.name.replace(/^User\s+/i, '');

        navbar.innerHTML = `
            <ion-icon name="menu-outline" class="mobile-menu-btn" id="mobile-menu-toggle"></ion-icon>
            <div class="search-bar">
                <ion-icon name="search-outline"></ion-icon>
                <input id="global-search-input" type="text" placeholder="Search for jobs, companies or students...">
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
                        <span class="role" style="font-weight: 600; font-size: 0.7rem; opacity: 0.6;">${user.role.toUpperCase()}</span>
                    </div>
                    <img id="nav-avatar-img" src="${user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`}" alt="Avatar" class="avatar" style="border: 2px solid var(--border); width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
                </div>
            </div>
        `;

        // Notification Click
        document.getElementById('nav-notifications').addEventListener('click', () => {
            window.App.navigateTo('notifications');
        });

        // Messages Click
        document.getElementById('nav-messages').addEventListener('click', () => {
            window.App.navigateTo('messages');
        });

        // Profile Click
        document.getElementById('nav-profile-link').addEventListener('click', () => {
            window.App.navigateTo('profile');
        });

        // Add hover effect
        const profileLink = document.getElementById('nav-profile-link');
        profileLink.addEventListener('mouseleave', () => profileLink.style.opacity = '1');

        // Global Search
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                window.App.handleGlobalSearch(e.target.value);
            });
        }

        // Start Real-time polling for notifications
        this.startPolling();
    },

    async updateBadges() {
        try {
            // Fetch unread notifications and conversations
            const [notifs, conversations] = await Promise.all([
                api.get('/notifications'),
                api.get(`/chat/conversations?userId=${this.user.email || this.user.id}`)
            ]);

            const notifBadge = document.querySelector('#nav-notifications .badge');
            const msgBadge = document.querySelector('#nav-messages .badge');

            if (notifBadge) {
                const unreadNotifs = notifs.filter(n => !n.is_read).length;
                notifBadge.textContent = unreadNotifs;
                notifBadge.style.display = unreadNotifs > 0 ? 'flex' : 'none';
            }

            if (msgBadge) {
                // Approximate unread messages from conversations
                // In a real app, we'd have a specific unread count from backend
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
        this.updateBadges(); // Initial check
        this.pollInterval = setInterval(() => this.updateBadges(), 10000); // Check every 10s
    },

    // Instantly sync the navbar avatar without a full re-render
    updateAvatar(url) {
        if (!url) return;
        this.user.avatar_url = url;
        const img = document.getElementById('nav-avatar-img');
        if (img) img.src = url;
    }
};
