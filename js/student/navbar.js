// js/common/navbar.js

export const Navbar = {
    render(user) {
        const navbar = document.getElementById('top-navbar');
        // Double check name and remove potential "User " prefix from old sessions
        const cleanName = user.name.replace(/^User\s+/i, '');
        
        navbar.innerHTML = `
            <div class="search-bar">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" placeholder="Search for jobs, companies or students...">
            </div>
            <div class="nav-actions">
                <div class="icon-btn" id="nav-notifications" style="cursor: pointer;">
                    <ion-icon name="notifications-outline"></ion-icon>
                    <span class="badge">3</span>
                </div>
                <div class="icon-btn" id="nav-messages" style="cursor: pointer;">
                    <ion-icon name="chatbubble-ellipses-outline"></ion-icon>
                    <span class="badge">1</span>
                </div>
                <div class="user-profile-sm" id="nav-profile-link" style="cursor: pointer; transition: opacity 0.2s;">
                    <div class="user-info-text" style="text-align: right;">
                        <span class="name" style="text-transform: capitalize; font-weight: 700; color: var(--primary);">${cleanName}</span>
                        <span class="role" style="font-weight: 600; font-size: 0.7rem; opacity: 0.6;">${user.role.toUpperCase()}</span>
                    </div>
                    <img src="${user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`}" alt="Avatar" class="avatar" style="border: 2px solid var(--border); width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
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

        // Search Input
        const searchInput = navbar.querySelector('.search-bar input');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    window.App.handleGlobalSearch(query);
                }
            }
        });

        // Add hover effect
        const profileLink = document.getElementById('nav-profile-link');
        profileLink.addEventListener('mouseenter', () => profileLink.style.opacity = '0.7');
        profileLink.addEventListener('mouseleave', () => profileLink.style.opacity = '1');
    }
};
