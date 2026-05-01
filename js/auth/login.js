// js/auth/login.js

export function initLogin(app) {
    // Clear previously saved demo passwords
    localStorage.removeItem('portal_passwords');

    const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001/api`;

    const container = document.getElementById('auth-container');
    container.innerHTML = `
        <div class="login-card">
            <div class="login-header">
                <ion-icon name="school" style="font-size: 3rem; color: var(--primary);"></ion-icon>
                <h1 style="margin-top: 10px; font-size: 2.2rem; line-height: 1;">PORTALX</h1>
                <p style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">Academic Prestige</p>
                <p style="color: var(--text-muted); margin-top: 20px; font-size: 0.9rem;">Career Success & Institutional Excellence</p>
            </div>

            <div class="role-selector">
                <div class="role-option active" data-role="student">Student</div>
                <div class="role-option" data-role="coordinator">Coordinator</div>
                <div class="role-option" data-role="admin">Admin</div>
            </div>

            <form id="login-form">
                <div class="form-group">
                    <label>INSTITUTIONAL ID</label>
                    <div class="input-with-icon">
                        <ion-icon name="person-outline"></ion-icon>
                        <input type="text" id="username" placeholder="Enter your ID" required>
                    </div>
                </div>

                <div class="form-group">
                    <label>PASSWORD</label>
                    <div class="input-with-icon">
                        <ion-icon name="lock-closed-outline"></ion-icon>
                        <input type="password" id="password" placeholder="••••••••" required>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0 20px;">
                    <label style="display: flex; align-items: center; font-size: 0.8rem; cursor: pointer;">
                        <input type="checkbox" style="margin-right: 8px;"> Remember me
                    </label>
                    <a href="#" style="font-size: 0.8rem; color: var(--primary); font-weight: 600; text-decoration: none;">Forgot Password?</a>
                </div>

                <button type="submit" class="btn-primary login-btn">
                    Login to Portal <ion-icon name="arrow-forward-outline"></ion-icon>
                </button>
            </form>

            <div style="margin-top: 32px; padding: 16px; background: #fff7ed; border-radius: 12px; display: flex; gap: 12px;">
                <ion-icon name="information-circle" style="color: #c2410c; font-size: 1.2rem;"></ion-icon>
                <p style="font-size: 0.75rem; color: #9a3412; line-height: 1.4;">
                    <strong>SYSTEM INTELLIGENCE:</strong> Roles are automatically detected. Use any credentials for this demo.
                </p>
            </div>
        </div>
    `;

    // Role Selection Logic
    let selectedRole = 'student';
    const roleOptions = container.querySelectorAll('.role-option');
    roleOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            roleOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedRole = opt.dataset.role;
        });
    });

    // Form Submission
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Connecting... <ion-icon name="sync-outline" class="spin"></ion-icon>';
        btn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role: selectedRole })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Login failed');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }

            // Save token and user to localStorage
            localStorage.setItem('placement_token', data.token);
            localStorage.setItem('placement_user', JSON.stringify(data.user));

            app.checkAuth(); // takes you to the portal

        } catch (err) {
            console.error("Login error:", err);
            alert('Could not connect to server. Is your backend running?');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

        
        