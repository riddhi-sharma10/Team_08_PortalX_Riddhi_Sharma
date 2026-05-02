// js/app.js - Main Application Orchestrator

import { initLogin } from './auth/login.js';

const App = {
    state: {
        user: null,
        role: null, // 'student', 'coordinator', 'admin'
        currentPage: 'dashboard'
    },

    init() {
        console.log("Placement Portal Initialized");
        this.setupResizer();
        this.checkAuth();
    },

    setupResizer() {
        const sidebar = document.getElementById('sidebar');
        const resizer = document.getElementById('sidebar-resizer');
        const STORAGE_KEY = 'sidebar_width';

        // Load saved width
        const savedWidth = localStorage.getItem(STORAGE_KEY);
        if (savedWidth) {
            sidebar.style.width = savedWidth + 'px';
            document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
        }

        if (!resizer || !sidebar) return;

        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            resizer.classList.add('resizing');
            // Prevent text selection during drag
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            let newWidth = e.clientX;
            // Constrain width
            if (newWidth < 180) newWidth = 180;
            if (newWidth > 500) newWidth = 500;

            sidebar.style.width = newWidth + 'px';
            document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
            localStorage.setItem(STORAGE_KEY, newWidth);

            // Trigger window resize to force responsive elements (like Charts) to update
            window.dispatchEvent(new Event('resize'));
        });

        window.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                resizer.classList.remove('resizing');
                document.body.style.userSelect = 'auto';
            }
        });
    },

    checkAuth() {
        const savedUser = localStorage.getItem('placement_user');
        const token = localStorage.getItem('placement_token');
        if (savedUser && token) {
            this.state.user = JSON.parse(savedUser);
            this.state.role = this.state.user.role;
            this.showPortal();
        } else {
            this.showLogin();
        }
    },

    showLogin() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('portal-container').classList.add('hidden');
        initLogin(this);
    },

    async showPortal() {
        document.getElementById('portal-container').classList.remove('hidden');
        document.getElementById('auth-container').classList.add('hidden');
        const roleFolder = this.state.role === 'admin' ? 'cgdc_admin' : this.state.role;
        
        // Dynamic Role-based UI components
        const sidebarModule = await import(/* @vite-ignore */ `./${roleFolder}/sidebar.js`);
        const navbarModule = await import(/* @vite-ignore */ `./${roleFolder}/navbar.js`);
        
        this.Sidebar = sidebarModule.Sidebar;
        this.Navbar = navbarModule.Navbar;

        // Initialize Core UI
        this.Sidebar.render(this.state.role, this);
        this.Navbar.render(this.state.user);
        
        // Load default page
        this.navigateTo('dashboard');
    },

    async navigateTo(pageId) {
        this.state.currentPage = pageId;
        const pageContent = document.getElementById('page-content');
        const roleFolder = this.state.role === 'admin' ? 'cgdc_admin' : this.state.role;
        const resetScroll = () => {
            if (pageContent) pageContent.scrollTop = 0;
            window.scrollTo(0, 0);
        };

        resetScroll();
        
        // Update Sidebar active state
        if (this.Sidebar) this.Sidebar.updateActive(pageId);

        // Dynamic Module Loading based on role
        try {
            const modulePath = `./${roleFolder}/${pageId}.js`;
            const module = await import(/* @vite-ignore */ modulePath);
            
            if (module && module.render) {
                this.currentModule = module;
                pageContent.innerHTML = '';
                module.render(pageContent, this);
                resetScroll();
            } else {
                pageContent.innerHTML = `<h1>Page not found: ${pageId}</h1>`;
                resetScroll();
            }
        } catch (error) {
            console.error("Navigation error:", error);
            pageContent.innerHTML = `
                <div class="card">
                    <h2>Error loading page</h2>
                    <p>The module for <b>${pageId}</b> could not be loaded.</p>
                </div>
            `;
            resetScroll();
        }
    },

    logout() {
        localStorage.removeItem('placement_user');
        localStorage.removeItem('placement_token');
        this.state.user = null;
        this.state.role = null;
        window.location.reload();
    },

    viewCompany(companyName) {
        // Store the selected company in session storage
        sessionStorage.setItem('selectedCompany', companyName);
        // Navigate to company view
        this.navigateTo('company_view');
    },

    handleGlobalSearch(query) {
        console.log("Global search for:", query);
        
        // If the current page module has a 'search' method, use it
        if (this.currentModule && this.currentModule.search) {
            this.currentModule.search(query);
            return;
        }

        // Otherwise, redirect to Opportunities (or Companies for Admin) and search there
        const searchPage = (this.state.role === 'admin') ? 'companies' : 'opportunities';
        
        // We can pass the search query via session storage or URL (if we had a router)
        sessionStorage.setItem('pendingSearch', query);
        this.navigateTo(searchPage);
    }
};

window.App = App;
App.init();

export default App;
