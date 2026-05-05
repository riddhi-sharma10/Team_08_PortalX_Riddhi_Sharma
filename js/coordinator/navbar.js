// js/coordinator/navbar.js
import { api } from '../api.js';

// ─── Search State ─────────────────────────────────────────────────────────────
let _searchDebounceTimer = null;
let _searchDropdown = null;

// ─── Main Render ─────────────────────────────────────────────────────────────
export const Navbar = {
    render(user, app) {
        const navbar = document.getElementById('top-navbar');
        if (!navbar) return;

        this._app = app;
        this.user = user;
        const cleanName = user.name || 'Coordinator';

        navbar.innerHTML = `
            <ion-icon name="menu-outline" class="mobile-menu-btn" id="mobile-menu-toggle"></ion-icon>
            <div class="search-bar" id="global-search-bar" style="position:relative;">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" id="global-search-input" placeholder="Search students, companies, jobs..." autocomplete="off">
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
                        <span class="role" style="font-weight: 600; font-size: 0.7rem; opacity: 0.6;">COORDINATOR</span>
                    </div>
                    <img id="nav-avatar-img" src="${user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.entityId || 'coordinator'}`}" alt="Avatar" class="avatar" style="border: 2px solid var(--border); width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
                </div>
            </div>
        `;

        this._bindSearchEvents();
        this._bindNavEvents(app);

        // Clear search when URL changes (covers back/forward and hash routing)
        window.addEventListener('popstate', () => this.resetSearch());
        window.addEventListener('hashchange', () => this.resetSearch());
        
        // Listen for a custom navigation event if the app emits one
        window.addEventListener('app:navigated', () => this.resetSearch());

        // Real-time badge sync
        window.addEventListener('sse:new_notification', () => this.updateBadges());
        window.addEventListener('sse:new_message', () => this.updateBadges());
        this.updateBadges();
    },

    // ─── Search Logic ──────────────────────────────────────────────────────────
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

            // Show loading state immediately
            this._showDropdown(`
                <div style="padding:20px;text-align:center;color:#94a3b8;">
                    <ion-icon name="sync-outline" style="font-size:1.5rem;animation:spin 1s linear infinite;display:block;margin:0 auto 8px;"></ion-icon>
                    Searching…
                </div>`);

            // Debounce by 300ms
            _searchDebounceTimer = setTimeout(() => this._runSearch(q), 300);
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#global-search-bar')) {
                this._hideDropdown();
            }
        });

        // Keyboard: Escape closes
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this._hideDropdown();
                input.blur();
            }
        });
    },

    async _runSearch(query) {
        const q = query.toLowerCase();
        const tokens = q.split(/\s+/).filter(t => t.length > 0);
        const appRef = this._app || window.App;

        // Simple fuzzy match helper (Levenshtein distance <= 1 for short tokens, <= 2 for long)
        const isFuzzyMatch = (target, query) => {
            if (!target) return false;
            target = target.toLowerCase();
            // 1. Direct contains (fastest)
            if (target.includes(query)) return true;
            
            // 2. Token-based word match
            const words = target.split(/\s+/);
            if (words.some(w => w.includes(query))) return true;

            // 3. Levenshtein Distance for small typos (only for tokens > 3 chars)
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
            // Fetch all data sources in parallel
            const [students, applications, interviews, placements] = await Promise.allSettled([
                api.get('/coordinator/students'),
                api.get('/coordinator/applications'),
                api.get('/coordinator/interviews'),
                api.get('/coordinator/placements'),
            ]);

            const safeData = (result) => result.status === 'fulfilled' ? result.value : [];

            const stuResults = safeData(students).filter(s =>
                smartMatch(s, ['name', 'email', 'rollNo', 'department'])
            ).slice(0, 5);

            const appResults = safeData(applications).filter(a =>
                smartMatch(a, ['studentName', 'company', 'role'])
            ).slice(0, 5);

            const intResults = safeData(interviews).filter(i =>
                smartMatch(i, ['studentName', 'company', 'role'])
            ).slice(0, 3);

            const plcResults = safeData(placements).filter(p =>
                smartMatch(p, ['studentName', 'company', 'department', 'role'])
            ).slice(0, 3);

            const total = stuResults.length + appResults.length + intResults.length + plcResults.length;

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

            const statusColor = {
                placed: '#10b981', active: '#3b82f6', not_eligible: '#ef4444', opted_out: '#94a3b8',
                selected: '#10b981', shortlisted: '#3b82f6', rejected: '#ef4444', under_review: '#f59e0b',
                passed: '#10b981', failed: '#ef4444', pending: '#f59e0b'
            };

            let html = '';

            // ── Students section ──
            if (stuResults.length) {
                html += sectionHeader('people-outline', 'My Students', stuResults.length);
                stuResults.forEach(s => {
                    html += resultRow(
                        'students',
                        s.id,
                        s.avatar || initials(s.name),
                        highlight(s.name),
                        `${s.department} · CGPA ${s.cgpa} · ${highlight(s.email)}`,
                        s.status,
                        statusColor[s.status] || '#64748b',
                        'student-profile-btn',
                        () => {
                            sessionStorage.setItem('selectedStudentId', s.id);
                            sessionStorage.setItem('profileOrigin', 'students');
                            appRef.navigateTo('student_profile');
                            this._hideDropdown();
                        }
                    );
                });
            }

            // ── Applications section ──
            if (appResults.length) {
                html += sectionHeader('document-text-outline', 'Applications', appResults.length);
                appResults.forEach(a => {
                    html += resultRow(
                        'applications',
                        a.id,
                        companyInitials(a.company),
                        highlight(a.studentName),
                        `${highlight(a.company)} · ${highlight(a.role)} · ₹${Number(a.packageLpa || 0).toFixed(1)} LPA`,
                        a.status,
                        statusColor[a.status] || '#64748b',
                        'app-result-btn',
                        () => {
                            appRef.navigateTo('applications');
                            this._hideDropdown();
                        }
                    );
                });
            }

            // ── Interviews section ──
            if (intResults.length) {
                html += sectionHeader('calendar-outline', 'Interviews', intResults.length);
                intResults.forEach(i => {
                    html += resultRow(
                        'interviews',
                        i.id,
                        companyInitials(i.company),
                        highlight(i.studentName),
                        `${highlight(i.company)} · ${highlight(i.role)} · ${i.date || ''}`,
                        i.result,
                        statusColor[i.result] || '#64748b',
                        'int-result-btn',
                        () => {
                            appRef.navigateTo('interviews');
                            this._hideDropdown();
                        }
                    );
                });
            }

            // ── Placements section ──
            if (plcResults.length) {
                html += sectionHeader('checkmark-done-outline', 'Placements', plcResults.length);
                plcResults.forEach(p => {
                    html += resultRow(
                        'placements',
                        null,
                        companyInitials(p.company),
                        highlight(p.studentName),
                        `${highlight(p.company)} · ${p.role || 'General'} · ₹${Number(p.ctc || 0).toFixed(1)} LPA`,
                        'placed',
                        '#10b981',
                        'plc-result-btn',
                        () => {
                            appRef.navigateTo('placements');
                            this._hideDropdown();
                        }
                    );
                });
            }

            // Footer
            html += `<div style="padding:10px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:.78rem;color:#94a3b8;text-align:center;">
                ${total} result${total !== 1 ? 's' : ''} for "<b>${query}</b>"
            </div>`;

            this._showDropdown(html);

            // Wire click events after DOM insert
            _searchDropdown.querySelectorAll('[data-nav-action]').forEach(el => {
                el.addEventListener('click', () => el._navAction && el._navAction());
            });

            // Store nav actions (can't serialize functions in HTML)
            const allActions = [
                ...stuResults.map((s, i) => ({ el: _searchDropdown.querySelectorAll('[data-nav-action="students"]')[i], fn: () => { sessionStorage.setItem('selectedStudentId', s.id); sessionStorage.setItem('profileOrigin', 'students'); appRef.navigateTo('student_profile'); this._hideDropdown(); } })),
                ...appResults.map((_, i) => ({ el: _searchDropdown.querySelectorAll('[data-nav-action="applications"]')[i], fn: () => { appRef.navigateTo('applications'); this._hideDropdown(); } })),
                ...intResults.map((_, i) => ({ el: _searchDropdown.querySelectorAll('[data-nav-action="interviews"]')[i], fn: () => { appRef.navigateTo('interviews'); this._hideDropdown(); } })),
                ...plcResults.map((_, i) => ({ el: _searchDropdown.querySelectorAll('[data-nav-action="placements"]')[i], fn: () => { appRef.navigateTo('placements'); this._hideDropdown(); } })),
            ];

            allActions.forEach(({ el, fn }) => {
                if (el) { el._navAction = fn; el.addEventListener('click', fn); }
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

    _hideDropdown() {
        if (_searchDropdown) _searchDropdown.style.display = 'none';
    },

    // ─── Nav Buttons ─────────────────────────────────────────────────────────
    _bindNavEvents(app) {
        const resetAndNavigate = (page) => {
            this.resetSearch();
            (app || window.App).navigateTo(page);
        };

        document.getElementById('nav-notifications')?.addEventListener('click', () => resetAndNavigate('notifications'));
        document.getElementById('nav-messages')?.addEventListener('click', () => resetAndNavigate('messages'));

        const profileLink = document.getElementById('nav-profile-link');
        profileLink?.addEventListener('click', () => {
            const appRef = this._app || window.App;
            if (appRef?.navigateTo) {
                this.resetSearch();
                appRef.navigateTo('profile');
                if (appRef.Sidebar?.updateActive) appRef.Sidebar.updateActive('profile');
            }
        });
        profileLink?.addEventListener('mouseenter', () => profileLink.style.opacity = '0.7');
        profileLink?.addEventListener('mouseleave', () => profileLink.style.opacity = '1');
    },

    // ─── Badges ──────────────────────────────────────────────────────────────
    async updateBadges() {
        try {
            const token = localStorage.getItem('placement_token');
            if (!token) return;

            const [notifs, conversations] = await Promise.all([
                api.get('/notifications'),
                api.get(`/chat/conversations?userId=${(this.user || window.App.state.user).email || (this.user || window.App.state.user).id}`)
            ]);

            const notifBadge = document.querySelector('#nav-notifications .badge');
            const msgBadge = document.querySelector('#nav-messages .badge');

            if (notifBadge) {
                const count = notifs.filter(n => !n.is_read).length;
                notifBadge.textContent = count;
                notifBadge.style.display = count > 0 ? 'flex' : 'none';
            }

            if (msgBadge) {
                const count = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
                msgBadge.textContent = count;
                msgBadge.style.display = count > 0 ? 'flex' : 'none';
            }
        } catch (err) {
            console.error('Badge update error:', err);
        }
    },

    updateAvatar(url) {
        if (!url) return;
        this.user.avatar_url = url;
        const img = document.getElementById('nav-avatar-img');
        if (img) img.src = url;
    },

    // ─── Reset Search ────────────────────────────────────────────────────────
    resetSearch() {
        const input = document.getElementById('global-search-input');
        if (input) {
            input.value = '';
        }
        this._hideDropdown();
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

function resultRow(navPage, id, avatarText, title, subtitle, statusLabel, statusColor, btnClass, action) {
    return `
        <div class="${btnClass}" data-nav-action="${navPage}" style="
            display:flex;align-items:center;gap:12px;padding:12px 16px;
            cursor:pointer;transition:background .15s;border-bottom:1px solid #f8fafc;
        " onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
            <div style="
                width:36px;height:36px;border-radius:9px;background:var(--primary, #1B3A6B);
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
