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
    get: (path) => request(path),
    post: (path, body) => request(path, {
        method: 'POST',
        body: JSON.stringify(body)
    }),
    put: (path, body) => request(path, {
        method: 'PUT',
        body: JSON.stringify(body)
    }),
    delete: (path) => request(path, { method: 'DELETE' })
};
