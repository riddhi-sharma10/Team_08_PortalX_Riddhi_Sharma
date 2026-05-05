// js/cgdc_admin/navbar.js
import { api } from '../api.js';

// ─── Search State ─────────────────────────────────────────────────────────────
let _searchDebounceTimer = null;
let _searchDropdown = null;

export const Navbar = {
    render(user) {
        const navbar = document.getElementById('top-navbar');
        this.user = user;
        this.app = window.App;
        // Double check name and remove potential "User " prefix from old sessions
        const cleanName = user.name.replace(/^User\s+/i, '');

        navbar.innerHTML = `
            <ion-icon name="menu-outline" class="mobile-menu-btn" id="mobile-menu-toggle"></ion-icon>
            <div class="search-bar" id="global-search-bar" style="position:relative;">
                <ion-icon name="search-outline"></ion-icon>
                <input id="global-search-input" type="text" placeholder="Search for students, companies, coordinators..." autocomplete="off">
                <div id="search-dropdown" style="
                    display:none;
                    position:absolute;
                    top:calc(100% + 8px);
                    left:0;
                    width:100%;
                    min-width:420px;
                    background:white;
                    border-radius:14px;
                    box-shadow:0 12px 40px rgba(0,0,0,0.18);
                    border:1px solid #e2e8f0;
                    z-index:9999;
                    overflow:hidden;
                    max-height:480px;
                    overflow-y:auto;
                "></div>
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

        this._bindNavEvents();
        this._bindSearchEvents();

        // Start Real-time polling for notifications
        this.startPolling();
    },

    _bindNavEvents() {
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
    },

    _bindSearchEvents() {
        const input = document.getElementById('global-search-input');
        _searchDropdown = document.getElementById('search-dropdown');

        if (!input || !_searchDropdown) return;

        input.addEventListener('input', (e) => {
            const q = e.target.value.trim();
            clearTimeout(_searchDebounceTimer);

            if (q.length < 2) {
                this._hideDropdown();
                return;
            }

            this._showDropdown(`
                <div style="padding:20px;text-align:center;color:#94a3b8;">
                    <ion-icon name="sync-outline" style="font-size:1.5rem;animation:spin 1s linear infinite;display:block;margin:0 auto 8px;"></ion-icon>
                    Searching…
                </div>`);

            _searchDebounceTimer = setTimeout(() => this._runSearch(q), 300);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#global-search-bar')) {
                this._hideDropdown(false);
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this._hideDropdown(true);
                input.blur();
            }
        });
    },

    async _runSearch(query) {
        const q = query.toLowerCase();
        const tokens = q.split(/\s+/).filter(t => t.length > 0);
        const appRef = window.App;

        const isFuzzyMatch = (target, query) => {
            if (!target) return false;
            target = String(target).toLowerCase();
            if (target.includes(query)) return true;
            const words = target.split(/\s+/);
            if (words.some(w => w.includes(query))) return true;
            if (query.length > 3) {
                return words.some(w => {
                    if (Math.abs(w.length - query.length) > 2) return false;
                    return levenshteinDistance(w, query) <= (query.length > 6 ? 2 : 1);
                });
            }
            return false;
        };

        const smartMatch = (obj, fields) => {
            return tokens.every(token => 
                fields.some(field => isFuzzyMatch(obj[field], token))
            );
        };

        try {
            // Fetch students, companies, and coordinators
            const [students, companies, coordinators] = await Promise.allSettled([
                api.get('/admin/users?role=Student'),
                api.get('/admin/companies'),
                api.get('/admin/users?role=Coordinator')
            ]);

            const safeData = (result) => result.status === 'fulfilled' ? result.value : [];

            const stuResults = safeData(students).filter(s =>
                smartMatch(s, ['name', 'email', 'entityId', 'branch'])
            ).slice(0, 5);

            const compResults = safeData(companies).filter(c =>
                smartMatch(c, ['name', 'industry', 'tier'])
            ).slice(0, 5);

            const coordResults = safeData(coordinators).filter(c =>
                smartMatch(c, ['name', 'email', 'entityId', 'branch'])
            ).slice(0, 3);

            const total = stuResults.length + compResults.length + coordResults.length;

            if (total === 0) {
                this._showDropdown(`
                    <div style="padding:32px;text-align:center;color:#94a3b8;">
                        <ion-icon name="search-outline" style="font-size:2rem;display:block;margin:0 auto 10px;opacity:.5;"></ion-icon>
                        <p style="font-weight:600;">No results for "<b>${query}</b>"</p>
                        <p style="font-size:.8rem;margin-top:4px;">Try searching by name, company, or department</p>
                    </div>`);
                return;
            }

            const highlight = (text) => {
                if (!text) return '—';
                const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                return String(text).replace(regex, '<mark style="background:#fef9c3;border-radius:2px;padding:0 2px;">$1</mark>');
            };

            let html = '';

            // ── Students section ──
            if (stuResults.length) {
                html += sectionHeader('people-outline', 'Students', stuResults.length);
                stuResults.forEach(s => {
                    html += resultRow(
                        'cgdc_admin',
                        s.entityIdRaw,
                        initials(s.name),
                        highlight(s.name),
                        `${s.branch} · ${s.entityId} · ${highlight(s.email)}`,
                        s.status,
                        s.status === 'placed' ? '#10b981' : '#3b82f6',
                        () => {
                            sessionStorage.setItem('selectedStudentId', s.entityIdRaw);
                            appRef.navigateTo('student_profile');
                            this._hideDropdown(true);
                        }
                    );
                });
            }

            // ── Companies section ──
            if (compResults.length) {
                html += sectionHeader('business-outline', 'Companies', compResults.length);
                compResults.forEach(c => {
                    html += resultRow(
                        'cgdc_admin',
                        c.id,
                        companyInitials(c.name),
                        highlight(c.name),
                        `${highlight(c.industry)} · ${c.tier} · ${c.placements} placements`,
                        c.status,
                        '#10b981',
                        () => {
                            appRef.viewCompany(c.name);
                            this._hideDropdown(true);
                        }
                    );
                });
            }

            // ── Coordinators section ──
            if (coordResults.length) {
                html += sectionHeader('shield-checkmark-outline', 'Coordinators', coordResults.length);
                coordResults.forEach(c => {
                    html += resultRow(
                        'cgdc_admin',
                        c.entityIdRaw,
                        initials(c.name),
                        highlight(c.name),
                        `${c.branch} · ${c.entityId} · ${highlight(c.email)}`,
                        'active',
                        '#6366f1',
                        () => {
                            // Coordinator profile view if needed
                            this._hideDropdown(true);
                        }
                    );
                });
            }

            html += `<div style="padding:10px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:.78rem;color:#94a3b8;text-align:center;">
                ${total} result${total !== 1 ? 's' : ''} for "<b>${query}</b>"
            </div>`;

            this._showDropdown(html);

            // Wire actions
            const allItems = [...stuResults, ...compResults, ...coordResults];
            _searchDropdown.querySelectorAll('.search-result-row').forEach((el, idx) => {
                const item = allItems[idx];
                let action = () => {};
                
                if (idx < stuResults.length) {
                    const s = stuResults[idx];
                    action = () => { sessionStorage.setItem('selectedStudentId', s.entityIdRaw); appRef.navigateTo('student_profile'); this._hideDropdown(true); };
                } else if (idx < stuResults.length + compResults.length) {
                    const c = compResults[idx - stuResults.length];
                    action = () => { appRef.viewCompany(c.name); this._hideDropdown(true); };
                } else {
                    action = () => { this._hideDropdown(true); };
                }
                
                el.addEventListener('click', action);
            });

        } catch (err) {
            console.error('[Search] Error:', err);
            this._showDropdown(`<div style="padding:20px;text-align:center;color:#ef4444;">Search failed: ${err.message}</div>`);
        }
    },

    _showDropdown(html) {
        if (!_searchDropdown) return;
        _searchDropdown.innerHTML = html;
        _searchDropdown.style.display = 'block';
    },

    _hideDropdown(clearInput = false) {
        if (_searchDropdown) _searchDropdown.style.display = 'none';
        if (clearInput) {
            const input = document.getElementById('global-search-input');
            if (input) input.value = '';
        }
    },

    async updateBadges() {
        try {
            const [notifs, conversations] = await Promise.all([
                api.get('/notifications'),
                api.get(`/chat/conversations?userId=${this.user.email || this.user.id}`)
            ]);

            const notifBadge = document.querySelector('#nav-notifications .badge');
            const msgBadge = document.querySelector('#nav-messages .badge');

            if (notifBadge) {
                const unreadNotifs = (notifs || []).filter(n => !n.is_read).length;
                notifBadge.textContent = unreadNotifs;
                notifBadge.style.display = unreadNotifs > 0 ? 'flex' : 'none';
            }

            if (msgBadge) {
                const totalUnread = (conversations || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
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

    updateAvatar(url) {
        if (!url) return;
        this.user.avatar_url = url;
        const img = document.getElementById('nav-avatar-img');
        if (img) img.src = url;
    }
};

// ─── Helper Renderers ────────────────────────────────────────────────────────
function sectionHeader(icon, label, count) {
    return `
        <div style="padding:10px 16px 6px;background:#f8fafc;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;">
            <ion-icon name="${icon}" style="color:#64748b;font-size:1rem;"></ion-icon>
            <span style="font-size:.72rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">${label}</span>
            <span style="margin-left:auto;font-size:.72rem;background:#e2e8f0;color:#64748b;padding:2px 8px;border-radius:99px;font-weight:700;">${count}</span>
        </div>`;
}

function resultRow(role, id, avatarText, title, subtitle, statusLabel, statusColor, action) {
    return `
        <div class="search-result-row" style="
            display:flex;align-items:center;gap:12px;padding:12px 16px;
            cursor:pointer;transition:background .15s;border-bottom:1px solid #f8fafc;
        " onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
            <div style="
                width:36px;height:36px;border-radius:9px;background:var(--primary);
                color:white;display:flex;align-items:center;justify-content:center;
                font-size:.7rem;font-weight:800;flex-shrink:0;letter-spacing:-.5px;
            ">${avatarText}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.9rem;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
                <div style="font-size:.75rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${subtitle}</div>
            </div>
            ${statusLabel ? `<span style="
                font-size:.68rem;font-weight:800;padding:3px 9px;border-radius:99px;
                background:${statusColor}18;color:${statusColor};text-transform:uppercase;
                white-space:nowrap;flex-shrink:0;
            ">${(statusLabel || '').replace(/_/g, ' ')}</span>` : ''}
            <ion-icon name="arrow-forward-outline" style="color:#cbd5e1;font-size:.9rem;flex-shrink:0;"></ion-icon>
        </div>`;
}

function initials(name) {
    return (name || 'U S').split(' ').filter(p => p.length > 0).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '??';
}

function companyInitials(name) {
    return (name || 'CO').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function levenshteinDistance(s, t) {
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const arr = [];
    for (let i = 0; i <= t.length; i++) {
        arr[i] = [i];
        for (let j = 1; j <= s.length; j++) {
            arr[i][j] = i === 0 ? j : Math.min(
                arr[i - 1][j] + 1,
                arr[i][j - 1] + 1,
                arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
            );
        }
    }
    return arr[t.length][s.length];
}

