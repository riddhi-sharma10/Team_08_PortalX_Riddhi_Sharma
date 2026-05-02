
// js/shared/queries_explorer.js

export const QueriesExplorer = {
    // Detect API Base based on environment (Vite vs Live Server)
    getApiBase() {
        if (window.location.port === '3001' || window.location.port === '5173') {
            return '/api'; // Vite Proxy or Production
        }
        return `${window.location.protocol}//${window.location.hostname}:3001/api`; // Live Server
    },

    async render(container, app) {
        const API_BASE = this.getApiBase();
        container.innerHTML = `
            <div class="analytics-header">
                <div class="analytics-title">
                    <div>
                        <h1>Advanced Query Laboratory</h1>
                        <p>Direct access to Tables, Views, Joins, and Subqueries for analytical insights.</p>
                    </div>
                </div>
            </div>

            <div class="card explorer-card">
                <div class="explorer-controls">
                    <div class="control-group">
                        <label>Category</label>
                        <select id="query-category">
                            <option value="table">Tables</option>
                            <option value="view">Views</option>
                            <option value="join">Joins</option>
                            <option value="subquery">Subqueries</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label>Specific Query</label>
                        <select id="query-selector">
                            <option value="">Select a category first...</option>
                        </select>
                    </div>
                    <div class="control-group action-group">
                        <button id="run-query-btn" class="btn-primary">
                            <ion-icon name="play-outline"></ion-icon>
                            <span>Run Query</span>
                        </button>
                    </div>
                </div>

                <div id="query-meta" class="hidden">
                    <div class="meta-desc"></div>
                    <div class="sql-box-container">
                        <div class="sql-header">
                            <span>SQL IMPLEMENTATION</span>
                            <button id="copy-sql-btn" title="Copy SQL">
                                <ion-icon name="copy-outline"></ion-icon>
                            </button>
                        </div>
                        <pre id="sql-display" class="sql-code"></pre>
                    </div>
                </div>
            </div>

            <div id="query-results" class="results-container">
                <div class="empty-state">
                    <ion-icon name="search-outline"></ion-icon>
                    <p>Select a query and click "Run Query" to see results.</p>
                </div>
            </div>
        `;

        this.setupEventListeners(container, app);
        this.loadQueryList();
    },

    async loadQueryList() {
        const API_BASE = this.getApiBase();
        try {
            const response = await fetch(`${API_BASE}/queries/list`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('placement_token')}` }
            });
            
            if (!response.ok) throw new Error('API Error: ' + response.status);
            
            const data = await response.json();
            if (Array.isArray(data)) {
                this.allQueries = data;
                this.updateSelector('table'); // Default to tables
            } else {
                throw new Error('Invalid query data received');
            }
        } catch (err) {
            console.error('Failed to load query list:', err);
            const selector = document.getElementById('query-selector');
            if (selector) selector.innerHTML = `<option value="">Error: ${err.message}</option>`;
        }
    },

    updateSelector(category) {
        const selector = document.getElementById('query-selector');
        if (!selector || !this.allQueries) return;

        const filtered = this.allQueries.filter(q => q.category === category);
        
        if (filtered.length === 0) {
            selector.innerHTML = `<option value="">No ${category}s available for your role</option>`;
        } else {
            selector.innerHTML = filtered.map(q => `
                <option value="${q.id}">${q.name}</option>
            `).join('');
        }
    },

    setupEventListeners(container, app) {
        const catSelect = document.getElementById('query-category');
        const runBtn = document.getElementById('run-query-btn');
        const querySelect = document.getElementById('query-selector');

        catSelect.addEventListener('change', (e) => {
            this.updateSelector(e.target.value);
        });

        runBtn.addEventListener('click', () => {
            const queryId = querySelect.value;
            if (queryId) this.runQuery(queryId);
        });

        // Copy SQL to Clipboard
        container.querySelector('#copy-sql-btn')?.addEventListener('click', async (e) => {
            const sqlText = container.querySelector('#sql-display').innerText;
            const icon = e.currentTarget.querySelector('ion-icon');
            
            try {
                await navigator.clipboard.writeText(sqlText);
                
                // Visual Feedback
                const originalName = icon.getAttribute('name');
                icon.setAttribute('name', 'checkmark-outline');
                icon.style.color = '#10b981'; // Green
                
                setTimeout(() => {
                    icon.setAttribute('name', originalName);
                    icon.style.color = '';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy!', err);
            }
        });
    },

    async runQuery(queryId) {
        const API_BASE = this.getApiBase();
        const resultsDiv = document.getElementById('query-results');
        const metaDiv = document.getElementById('query-meta');
        const runBtn = document.getElementById('run-query-btn');

        runBtn.disabled = true;
        runBtn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon><span>Running...</span>';
        
        try {
            // Update Meta immediately so SQL is visible even if fetch fails later
            const info = this.allQueries.find(q => q.id === queryId);
            if (info) {
                metaDiv.classList.remove('hidden');
                metaDiv.querySelector('.meta-desc').innerText = info.description;
                document.getElementById('sql-display').innerText = info.sql || 'SQL Implementation Hidden';
            }

            const response = await fetch(`${API_BASE}/queries/run/${queryId}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('placement_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message || 'Query failed');

            // Render Table
            if (!result.data || result.data.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="empty-state">
                        <ion-icon name="alert-circle-outline"></ion-icon>
                        <p>Query executed successfully but returned 0 rows.</p>
                    </div>
                `;
            } else {
                this.renderTable(resultsDiv, result.data);
            }
        } catch (err) {
            resultsDiv.innerHTML = `<div class="alert alert-danger" style="padding: 20px; background: #fee2e2; color: #b91c1c; border-radius: 12px; margin-top: 20px;">
                <h4 style="margin-bottom: 8px;">Database Error</h4>
                <p>${err.message}</p>
            </div>`;
        } finally {
            runBtn.disabled = false;
            runBtn.innerHTML = '<ion-icon name="play-outline"></ion-icon><span>Run Query</span>';
        }
    },

    renderTable(container, data) {
        const headers = Object.keys(data[0]);
        
        container.innerHTML = `
            <div class="table-card">
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(h => `<th>${h.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr>
                                    ${headers.map(h => {
                                        let val = row[h];
                                        const headerLower = h.toLowerCase();
                                        
                                        if (val === null) {
                                            // Show 0.00 for salary/package/count columns, otherwise show a dash
                                            if (headerLower.includes('salary') || headerLower.includes('package') || headerLower.includes('count') || headerLower.includes('placed')) {
                                                val = '0.00';
                                            } else {
                                                val = '<span class="null-val">—</span>';
                                            }
                                        } else if (headerLower.includes('date') && val) {
                                            val = new Date(val).toLocaleDateString();
                                        }
                                        
                                        return `<td>${val}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="table-footer">
                    Total Rows: ${data.length}
                </div>
            </div>
        `;
    }
};
