// js/api.js

// Using absolute path so it works with Live Server (127.0.0.1:5500) directly without Vite proxy
const BASE_URL = 'http://localhost:3001/api';

// Core fetch function — automatically adds the login token
async function request(path, options = {}) {
    const token = localStorage.getItem('placement_token');

    const response = await fetch(BASE_URL + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            // Attach token if we have one
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    // If server says "not logged in" → force logout
    if (response.status === 401) {
        localStorage.removeItem('placement_token');
        localStorage.removeItem('placement_user');
        window.location.reload();
        return;
    }

    // Capture response as text first to handle non-JSON better
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error('SERVER RESPONDED WITH NON-JSON:', text);
        throw new Error('Server returned an invalid response (Possibly HTML).');
    }

    if (!response.ok) {
        throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
}

// Export simple methods for all pages to use
export const api = {
    get: (path) => {
        // Add a timestamp cache-buster to ensure fresh data
        const sep = path.includes('?') ? '&' : '?';
        return request(`${path}${sep}_t=${Date.now()}`);
    },
    post: (path, body) => request(path, {
        method: 'POST',
        body: JSON.stringify(body)
    }),
    put: (path, body) => request(path, {
        method: 'PUT',
        body: JSON.stringify(body)
    }),
    patch: (path, body) => request(path, {
        method: 'PATCH',
        body: JSON.stringify(body)
    }),
    delete: (path) => request(path, { method: 'DELETE' }),

    // For multipart/form-data uploads (e.g. PDF resume)
    // Do NOT set Content-Type here — browser sets it automatically with the correct boundary
    postForm: async (path, formData) => {
        const token = localStorage.getItem('placement_token');
        const response = await fetch(BASE_URL + path, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData,
        });
        if (response.status === 401) {
            localStorage.removeItem('placement_token');
            localStorage.removeItem('placement_user');
            window.location.reload();
            return;
        }
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('Server returned an invalid response.'); }
        if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
        return data;
    },

    // Establish Server-Sent Events (SSE) connection for Real-Time Sync
    initSSE: (userId) => {
        if (window._sseStream) {
            window._sseStream.close();
        }
        
        const stream = new EventSource(`${BASE_URL}/stream?userId=${encodeURIComponent(userId)}`);
        
        stream.addEventListener('new_message', (e) => {
            console.log('[SSE] New Message received:', e.data);
            window.dispatchEvent(new CustomEvent('sse:new_message', { detail: JSON.parse(e.data) }));
            if (window.App && window.App.Navbar) window.App.Navbar.updateBadges();
        });

        stream.addEventListener('new_notification', (e) => {
            console.log('[SSE] New Notification received:', e.data);
            window.dispatchEvent(new CustomEvent('sse:new_notification', { detail: JSON.parse(e.data) }));
            if (window.App && window.App.Navbar) window.App.Navbar.updateBadges();
        });

        stream.addEventListener('analytics_update', (e) => {
            console.log('[SSE] Analytics update received:', e.data);
            window.dispatchEvent(new CustomEvent('sse:analytics_update', { detail: JSON.parse(e.data) }));
        });

        stream.onerror = (err) => {
            console.error('[SSE] Connection Error', err);
        };

        window._sseStream = stream;
        return stream;
    }
};
