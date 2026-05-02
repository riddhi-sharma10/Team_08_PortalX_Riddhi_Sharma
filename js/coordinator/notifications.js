// js/coordinator/notifications.js
import { api } from '../api.js';

export async function render(container) {
    container.innerHTML = `
        <div class="admin-dashboard-shell" style="gap:24px;">
            <div class="admin-dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1>Notifications</h1>
                    <p>Updates on your assigned students, applications, and placements.</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="mark-all-read" class="btn-outline" style="padding: 8px 16px; font-size: 0.9rem;">
                        Mark all as read
                    </button>
                    <button id="clear-all-notifs" style="padding: 8px 16px; font-size: 0.9rem; background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 8px; font-weight: 700; cursor: pointer; display:flex; align-items:center; gap:6px; transition: all 0.2s;">
                        <ion-icon name="trash-outline"></ion-icon> Clear All
                    </button>
                </div>
            </div>

            <div id="notifications-list" class="card" style="padding:10px 0; min-height: 200px;">
                <div style="display:flex; align-items:center; justify-content:center; padding:40px; color:#64748b;">
                    <ion-icon name="hourglass-outline" style="font-size:2rem; margin-right:12px;"></ion-icon>
                    <span>Loading notifications...</span>
                </div>
            </div>
        </div>
    `;

    await loadNotifications();
    
    document.getElementById('mark-all-read')?.addEventListener('click', async () => {
        try {
            await api.post('/notifications/read-all');
            await loadNotifications();
            if (window.App && window.App.Navbar) window.App.Navbar.updateBadges();
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    });

    document.getElementById('clear-all-notifs')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to permanently delete all notifications?')) return;
        try {
            await api.delete('/notifications/clear-all');
            await loadNotifications();
            if (window.App && window.App.Navbar) window.App.Navbar.updateBadges();
        } catch (err) {
            console.error('Failed to clear notifications:', err);
        }
    });
}

async function loadNotifications() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    try {
        const notifs = await api.get('/notifications');
        
        if (notifs.length === 0) {
            list.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; color:#64748b; text-align:center;">
                    <ion-icon name="notifications-off-outline" style="font-size:3rem; margin-bottom:16px; opacity:0.3;"></ion-icon>
                    <p style="margin:0; font-weight:600;">No notifications yet</p>
                    <p style="margin:4px 0 0; font-size:0.9rem;">Stay tuned for updates on your assigned pool.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = notifs.map((n, idx) => {
            const config = getNotifConfig(n);
            return renderNotificationItem(
                n.notif_id,
                n.title, 
                n.content, 
                formatTime(n.created_at), 
                config.icon, 
                config.color, 
                n.is_read,
                idx === notifs.length - 1,
                n.type
            );
        }).join('');

        // Mark as read on click
        list.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                // Don't trigger on chat button click
                if (e.target.closest('.notif-chat-btn')) return;

                const id = item.dataset.id;
                const isRead = item.dataset.read === '1';
                if (!isRead) {
                    try {
                        await api.post(`/notifications/read/${id}`);
                        item.style.opacity = '0.6';
                        item.dataset.read = '1';
                        item.querySelector('.unread-dot')?.remove();
                        if (window.App && window.App.Navbar) window.App.Navbar.updateBadges();
                    } catch (e) {}
                }
            });
        });

        // Chat button click — navigate to messages
        list.querySelectorAll('.notif-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.App && window.App.navigateTo) {
                    window.App.navigateTo('messages');
                }
            });
        });

    } catch (err) {
        console.error('Failed to load notifications:', err);
        list.innerHTML = `<div style="padding:40px; text-align:center; color:red;">Error loading notifications.</div>`;
    }
}

function getNotifConfig(notif) {
    switch (notif.type) {
        case 'message': return { icon: 'chatbubble-ellipses', color: '#10b981' };
        case 'alert': return { icon: 'warning', color: '#ef4444' };
        default: return { icon: 'notifications', color: '#3b82f6' };
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function renderNotificationItem(id, title, text, time, icon, color, isRead, isLast, type) {
    const chatBtn = `
        <button class="notif-chat-btn" title="Open Chat" style="background:none; border:1px solid #e2e8f0; border-radius:8px; padding:4px 10px; cursor:pointer; display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#3b82f6; font-weight:700; transition:all 0.2s; margin-top:8px;">
            <ion-icon name="chatbubble-outline" style="font-size:0.95rem;"></ion-icon> Reply
        </button>`;
    return `
        <div class="notif-item" 
             data-id="${id}" 
             data-read="${isRead ? '1' : '0'}"
             style="display:flex; gap:16px; padding:20px 24px; border-bottom:${isLast ? 'none' : '1px solid #e2e8f0'}; align-items:flex-start; cursor:pointer; transition:all 0.2s; position:relative; ${isRead ? 'opacity:0.6;' : ''}">
            
            ${!isRead ? '<div class="unread-dot" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); width:6px; height:6px; background:#3b82f6; border-radius:50%;"></div>' : ''}
            
            <div style="width:48px; height:48px; border-radius:12px; background:${color}22; color:${color}; display:flex; align-items:center; justify-content:center; font-size:1.25rem; flex:0 0 auto;">
                <ion-icon name="${icon}"></ion-icon>
            </div>
            <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="margin:0; font-size:1.05rem; color:#0f1f46; font-weight:800;">${title}</h4>
                    <span style="color:#64748b; font-size:0.85rem;">${time}</span>
                </div>
                <p style="margin:4px 0 0; color:#50627f; font-size:0.98rem; line-height:1.5;">${text}</p>
                ${chatBtn}
            </div>
        </div>
    `;
}
