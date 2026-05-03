// js/common/messages.js
import { api } from '../api.js';

let state = {
    myId: null,
    myRole: null,
    myName: null,
    activeUserId: null,
    activeUserRole: null,
    activeUserName: null,
    conversations: [],
    messages: [],
    pollInterval: null
};

export async function render(container, app) {
    state.myId = app.state.user.email || app.state.user.username || app.state.user.id;
    state.myRole = app.state.role;
    state.myName = app.state.user.name;
    
    const target = sessionStorage.getItem('chat_target');
    if (target) {
        const parsed = JSON.parse(target);
        state.activeUserId = parsed.id;
        state.activeUserRole = parsed.role;
        state.activeUserName = parsed.name || parsed.id;
        sessionStorage.removeItem('chat_target');
    }

    renderShell(container);
    injectStyles();
    await loadData();
    startPolling();
    
    // Listen for SSE real-time events
    state.onNewMessage = async (e) => {
        console.log('[Chat] Real-time message received', e.detail);
        await loadData();
        populateConversations();
        if (state.activeUserId === e.detail.sender_id || state.activeUserId === e.detail.receiver_id) {
            await loadMessages();
            renderChatWindow();
            scrollToBottom();
        }
    };
    window.addEventListener('sse:new_message', state.onNewMessage);
    
    populateConversations();
    if (state.activeUserId) {
        await loadMessages();
        renderChatWindow();
    }
}

function renderShell(container) {
    container.innerHTML = `
        <div class="chat-portal-shell" id="chat-shell">
            <!-- Left Sidebar -->
            <div class="chat-sidebar" id="chat-sidebar">
                <div style="padding: 24px; border-bottom: 1px solid var(--border); background: white;">
                    <h1 style="margin: 0; font-size: 1.5rem; color: var(--primary);">Messages</h1>
                    <p style="margin: 4px 0 0; color: var(--text-muted); font-size: 0.85rem;">Connect with your campus network</p>
                </div>
                <div id="conversation-list" style="flex: 1; overflow-y: auto; padding: 12px;">
                    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <ion-icon name="chatbubbles-outline" style="font-size: 2rem; opacity: 0.3;"></ion-icon>
                        <p style="margin-top: 12px; font-size: 0.9rem;">No active conversations yet.</p>
                    </div>
                </div>
            </div>

            <!-- Right Chat Window -->
            <div class="chat-main" id="chat-window-container">
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); text-align: center; padding: 40px;">
                    <div>
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2.5rem; color: #94a3b8;">
                            <ion-icon name="paper-plane-outline"></ion-icon>
                        </div>
                        <h2 style="color: var(--primary); font-size: 1.4rem; margin-bottom: 8px;">Your Messages</h2>
                        <p>Select a contact from the list or view a profile to start a conversation.</p>
                    </div>
                </div>
            </div>
        </div>
        <input type="file" id="chat-file-input" style="display: none;" multiple>
    `;
}

function injectStyles() {
    if (document.getElementById('chat-responsive-styles')) return;
    const style = document.createElement('style');
    style.id = 'chat-responsive-styles';
    style.innerHTML = `
        .chat-portal-shell {
            display: grid;
            grid-template-columns: 350px 1fr;
            height: calc(100vh - 145px); /* Adjusted to fit exactly within page padding */
            background: var(--white);
            border-radius: 24px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-md);
            overflow: hidden;
            animation: fadeIn 0.4s ease;
        }
        .chat-sidebar {
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            background: #fcfcfd;
            transition: all 0.3s ease;
            min-height: 0;
        }
        .chat-main {
            display: flex;
            flex-direction: column;
            background: white;
            transition: all 0.3s ease;
            overflow: hidden;
            min-height: 0;
        }
        @media (max-width: 900px) {
            .chat-portal-shell {
                grid-template-columns: 1fr;
                border-radius: 0;
                height: calc(100vh - 105px); /* Adjusted for mobile padding */
            }
            .chat-sidebar {
                display: flex;
            }
            .chat-main {
                display: none;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 100;
            }
            .chat-portal-shell.chat-active .chat-sidebar {
                display: none;
            }
            .chat-portal-shell.chat-active .chat-main {
                display: flex;
            }
        }
    `;
    document.head.appendChild(style);
}

async function loadData() {
    try {
        state.conversations = await api.get(`/chat/conversations?userId=${state.myId}`);
    } catch (err) {
        console.error('Error loading conversations:', err);
    }
}

function populateConversations() {
    const list = document.getElementById('conversation-list');
    if (!list) return;

    let convs = [...state.conversations];
    
    if (state.activeUserId && !convs.find(c => c.other_user === state.activeUserId)) {
        convs.unshift({
            other_user: state.activeUserId,
            other_role: state.activeUserRole,
            other_name: state.activeUserName || state.activeUserId,
            last_msg: new Date().toISOString(),
            unread_count: 0
        });
    }

    if (convs.length === 0) return;

    list.innerHTML = convs.map(conv => {
        // Prefer resolved name; if it looks like an email, use the part before '@'
        const rawName = conv.other_name || conv.other_user;
        const displayName = rawName.includes('@') ? rawName.split('@')[0] : rawName;
        const initials = displayName.charAt(0).toUpperCase();
        const unread = conv.unread_count > 0 ? `<span class="badge" style="position:static; margin-left:8px; display:inline-flex;">${conv.unread_count}</span>` : '';
        
        return `
            <div class="conv-item ${state.activeUserId === conv.other_user ? 'active' : ''}" 
                 data-id="${conv.other_user}" 
                 data-role="${conv.other_role}"
                 data-name="${displayName}"
                 style="display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 16px; cursor: pointer; transition: all 0.2s; margin-bottom: 4px; border: 1px solid ${state.activeUserId === conv.other_user ? 'var(--primary-light)' : 'transparent'}; background: ${state.activeUserId === conv.other_user ? '#eff6ff' : 'transparent'};">
                <div style="width: 48px; height: 48px; border-radius: 14px; background: #f1f5f9; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.05); flex-shrink:0;">
                    ${initials}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <strong style="font-size: 0.95rem; color: var(--primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</strong>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">${formatTime(conv.last_msg)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: capitalize;">${conv.other_role}</div>
                        ${unread}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.conv-item').forEach(item => {
        item.addEventListener('click', async () => {
            state.activeUserId = item.dataset.id;
            state.activeUserRole = item.dataset.role;
            state.activeUserName = item.dataset.name;
            
            // Add active class for mobile
            document.getElementById('chat-shell')?.classList.add('chat-active');
            
            populateConversations();
            await loadMessages();
            renderChatWindow();
            // Trigger navbar update to clear badges
            if (window.App && window.App.Navbar) window.App.Navbar.updateBadges();
        });
    });
}

async function loadMessages() {
    if (!state.activeUserId) return;
    try {
        state.messages = await api.get(`/chat/messages?myId=${state.myId}&otherId=${state.activeUserId}`);
    } catch (err) {
        console.error('Error loading messages:', err);
    }
}

function renderChatWindow() {
    const container = document.getElementById('chat-window-container');
    if (!container) return;

    const rawName = state.activeUserName || state.activeUserId || 'User';
    const displayName = rawName.includes('@') ? rawName.split('@')[0] : rawName;

    container.innerHTML = `
        <!-- Chat Header -->
        <div style="padding: 16px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: white; z-index: 10;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <button id="chat-back-btn" style="display: none; background: none; border: none; font-size: 1.5rem; color: var(--primary); cursor: pointer; padding: 0; margin-right: 8px;">
                    <ion-icon name="arrow-back-outline"></ion-icon>
                </button>
                <div style="width: 44px; height: 44px; border-radius: 12px; background: #eff6ff; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size:1.1rem;">
                    ${displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 1.05rem; color: var(--primary);">${displayName}</h3>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #10b981; font-weight:600;">
                        <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span>
                        Online
                    </div>
                </div>
            </div>
            <style>
                @media (max-width: 900px) {
                    #chat-back-btn { display: block !important; }
                }
            </style>
        </div>

        <!-- Messages Area -->
        <div id="messages-display" style="flex: 1; min-height: 0; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: #f8fafc;">
            ${state.messages.map(msg => renderMessageItem(msg)).join('')}
            <div id="messages-bottom"></div>
        </div>

        <!-- Input Area -->
        <div style="padding: 20px 24px; background: white; border-top: 1px solid var(--border);">
            <form id="chat-form" style="display: flex; gap: 12px; align-items: center; background: #f1f5f9; padding: 8px 12px; border-radius: 16px; border: 1px solid var(--border);">
                <button type="button" id="chat-attach-btn" style="background: none; border: none; font-size: 1.6rem; color: #64748b; cursor: pointer; display: flex; align-items: center; transition: color 0.2s;">
                    <ion-icon name="add-circle-outline"></ion-icon>
                </button>
                <input type="text" id="msg-input" placeholder="Type a message..." style="flex: 1; background: none; border: none; outline: none; padding: 8px; font-size: 0.95rem; color: var(--text-main);" autocomplete="off">
                <button type="submit" style="width: 42px; height: 42px; border-radius: 12px; background: var(--primary); color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                    <ion-icon name="send" style="transform: rotate(-45deg); margin-left: 4px; font-size:1.2rem;"></ion-icon>
                </button>
            </form>
        </div>
    `;
    // Back button for mobile
    const backBtn = document.getElementById('chat-back-btn');
    if (backBtn) {
        backBtn.onclick = () => {
            document.getElementById('chat-shell')?.classList.remove('chat-active');
        };
    }

    // Wire up events
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('msg-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        await sendMessage(text);
    });

    // Attachment Logic
    const attachBtn = document.getElementById('chat-attach-btn');
    const fileInput = document.getElementById('chat-file-input');
    attachBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.onchange = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            // Functional: Send a message indicating attachment (in real app, upload then send link)
            Array.from(files).forEach(file => {
                const type = file.type.startsWith('image/') ? 'photo' : 'document';
                sendMessage(`📎 Attached ${type}: ${file.name}`);
            });
            fileInput.value = ''; // Reset
        }
    };

    scrollToBottom();
}

function renderMessageItem(msg) {
    const isMine = msg.sender_id === state.myId;
    return `
        <div style="display: flex; flex-direction: column; align-items: ${isMine ? 'flex-end' : 'flex-start'};">
            <div style="max-width: 75%; padding: 12px 18px; border-radius: ${isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px'}; background: ${isMine ? 'var(--primary)' : 'white'}; color: ${isMine ? 'white' : 'var(--text-main)'}; box-shadow: 0 2px 5px rgba(0,0,0,0.06); border: ${isMine ? 'none' : '1px solid var(--border)'}; font-size: 0.98rem; line-height: 1.5;">
                ${msg.message_text}
            </div>
            <span style="font-size: 0.68rem; color: #94a3b8; margin-top: 5px; padding: 0 6px;">${formatTimeShort(msg.created_at)}</span>
        </div>
    `;
}

async function sendMessage(text) {
    try {
        await api.post('/chat/send', {
            sender_id: state.myId,
            sender_role: state.myRole,
            sender_name: state.myName, // Added real name for notifications
            receiver_id: state.activeUserId,
            receiver_role: state.activeUserRole,
            message_text: text
        });
        await loadMessages();
        renderChatWindow();
    } catch (err) {
        console.error('Error sending message:', err);
    }
}

function startPolling() {
    if (state.pollInterval) clearInterval(state.pollInterval);
    state.pollInterval = setInterval(async () => {
        const oldConvCount = state.conversations.length;
        const oldMsgCount = state.messages.length;

        await loadData();
        if (state.activeUserId) await loadMessages();

        // Check if unread counts changed in any conversation
        const unreadChanged = JSON.stringify(state.conversations.map(c => c.unread_count)) !== sessionStorage.getItem('last_unread_counts');
        sessionStorage.setItem('last_unread_counts', JSON.stringify(state.conversations.map(c => c.unread_count)));

        if (state.conversations.length !== oldConvCount || unreadChanged) populateConversations();
        if (state.messages.length !== oldMsgCount) {
            renderChatWindow();
            scrollToBottom();
        }
    }, 3000);
}

export function cleanup() {
    if (state.pollInterval) clearInterval(state.pollInterval);
    if (state.onNewMessage) window.removeEventListener('sse:new_message', state.onNewMessage);
}

function scrollToBottom() {
    const display = document.getElementById('messages-display');
    if (display) display.scrollTop = display.scrollHeight;
}

function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    // Use local time comparison
    if (date.toLocaleDateString() === now.toLocaleDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTimeShort(dateStr) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
