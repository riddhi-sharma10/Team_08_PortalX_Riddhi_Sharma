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
        this.setupTabSync();
    },

    setupTabSync() {
        // Re-fetch data on tab switch back
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && this.state.user) {
                console.log('[TabSync] Tab visible — refreshing data');
                this.navigateTo(this.state.currentPage);
            }
        };

        // Re-fetch on window focus (e.g., coming back from another app)
        const handleFocus = () => {
            if (this.state.user) {
                console.log('[TabSync] Window focused — refreshing data');
                this.navigateTo(this.state.currentPage);
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleFocus);

        // Also auto-refresh every 30 seconds while tab is open
        setInterval(() => {
            if (!document.hidden && this.state.user) {
                console.log('[AutoRefresh] 30s tick — refreshing data');
                this.navigateTo(this.state.currentPage);
            }
        }, 30000);
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
        });

        window.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                resizer.classList.remove('resizing');
                document.body.style.userSelect = 'auto';
                
                // Trigger window resize ONLY once after resizing is finished
                window.dispatchEvent(new Event('resize'));
            }
        });
    },

    checkAuth() {
        const savedUser = localStorage.getItem('placement_user');
        const token = localStorage.getItem('placement_token');
        if (savedUser && token) {
            this.state.user = JSON.parse(savedUser);
            this.state.role = this.state.user.role;
            const savedPage = sessionStorage.getItem('current_page');
            if (savedPage) this.state.currentPage = savedPage;
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
        
        // Load saved page or default to dashboard
        const savedPage = sessionStorage.getItem('current_page');
        this.navigateTo(savedPage || 'dashboard');
    },

    async navigateTo(pageId) {
        this.state.currentPage = pageId;
        sessionStorage.setItem('current_page', pageId);
        const pageContent = document.getElementById('page-content');
        const roleFolder = this.state.role === 'admin' ? 'cgdc_admin' : this.state.role;
        
        // Show a subtle sync indicator
        if (pageContent.innerHTML !== '') {
            pageContent.style.opacity = '0.6';
            pageContent.style.transition = 'opacity 0.2s';
        }

        const resetScroll = () => {
            if (pageContent) {
                pageContent.scrollTop = 0;
                pageContent.style.opacity = '1';
            }
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

    viewJob(jobId) {
        // Store the selected job in session storage
        sessionStorage.setItem('selectedJobId', jobId);
        // Navigate to job view
        this.navigateTo('job_view');
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
