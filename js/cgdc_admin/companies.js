// js/admin/companies.js
import { api } from '../api.js';

let companiesData = [];

function getTierBadgeClass(tier) {
    switch (tier) {
        case 'Tier 1': return 'tag-tier1';
        case 'Tier 2': return 'tag-tier2';
        case 'Startup': return 'tag-startup';
        default: return 'tag-info';
    }
}

function getStatusBadgeClass(status) {
    return status === 'active' ? 'tag-success' : 'tag-muted';
}

function openAddCompanyModal(container) {
    const modal = document.getElementById('addCompanyModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAddCompanyModal(container) {
    const modal = document.getElementById('addCompanyModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Reset form
    const form = document.getElementById('companyForm');
    if (form) form.reset();
}

async function handleAddCompany(container, currentFilter, app) {
    const form = document.getElementById('companyForm');

    const newCompany = {
        name: document.getElementById('companyName').value.trim(),
        industry: document.getElementById('industry').value.trim(),
        tier: document.getElementById('tier').value,
        location: document.getElementById('location').value.trim(),
        website: document.getElementById('website').value.trim(),
        contactPerson: document.getElementById('contactPerson').value.trim(),
        contactEmail: document.getElementById('contactEmail').value.trim(),
        contactPhone: document.getElementById('contactPhone').value.trim(),
        description: document.getElementById('description').value.trim(),
        establishedYear: document.getElementById('establishedYear').value.trim(),
        activeJobs: parseInt(document.getElementById('activeJobs').value) || 0,
        placements: parseInt(document.getElementById('placements').value) || 0,
        status: document.getElementById('status').value,
        positions: [],
        positionsCount: 0
    };

    // Validation
    if (!newCompany.name || !newCompany.industry || !newCompany.tier) {
        alert('Please fill in all required fields: Company Name, Industry, and Tier.');
        return;
    }

    const emailVal = newCompany.contactEmail;
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (emailVal && !emailRegex.test(emailVal)) {
        alert('Please enter a valid Contact Email address (e.g., hr@company.com).');
        return;
    }

    const phoneVal = newCompany.contactPhone;
    const phoneRegex = /^[0-9]{10}$/;
    if (phoneVal && !phoneRegex.test(phoneVal)) {
        alert('Contact Phone must be exactly 10 digits (numbers only).');
        return;
    }

    if (newCompany.activeJobs < 0 || newCompany.placements < 0) {
        alert('Jobs and placements must be positive numbers.');
        return;
    }

    // Collect positions
    const positionItems = document.querySelectorAll('.position-item');
    positionItems.forEach(item => {
        const title = item.querySelector('.position-title').value.trim();
        const salary = item.querySelector('.position-salary').value.trim();
        const skills = item.querySelector('.position-skills').value.trim();

        if (title || salary || skills) {
            newCompany.positions.push({ title, salary, skills });
        }
    });

    // Call API to save to database
    try {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        await api.post('/admin/companies', newCompany);
        closeAddCompanyModal(container);
        render(container, app); // Refresh list
    } catch (err) {
        console.error('Failed to add company:', err);
        alert('Failed to add company: ' + err.message);
    } finally {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Company';
        }
    }
}

function addPositionField(container) {
    const positionHTML = `
        <div class="position-item" style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; background: #f8fafc;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: 600; font-size: 0.85rem; color: var(--primary);">Position Details</span>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem;">
                    <ion-icon name="close-circle-outline"></ion-icon>
                </button>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; font-weight: 600; color: var(--text-main); font-size: 0.85rem; margin-bottom: 4px;">Role Title *</label>
                <input type="text" class="position-title" placeholder="e.g., Software Engineer" style="width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 0.9rem; outline: none;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="display: grid; gap: 6px;">
                    <label style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">Salary Range</label>
                    <input type="text" class="position-salary" placeholder="e.g., 8-12 LPA" style="border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 0.9rem; outline: none;">
                </div>
                <div style="display: grid; gap: 6px;">
                    <label style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">Required Skills</label>
                    <input type="text" class="position-skills" placeholder="e.g., Java, SQL" style="border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 0.9rem; outline: none;">
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', positionHTML);
}

export async function render(container, app) {
    let currentFilter = 'all';

    // Show loading state
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:400px;">
            <div style="text-align:center;color:var(--text-muted);">
                <ion-icon name="hourglass-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px;"></ion-icon>
                <p>Loading companies...</p>
            </div>
        </div>
    `;

    // Fetch companies from the API
    try {
        const rows = await api.get('/admin/companies');
        companiesData = (rows || []).map(row => ({
            ...row,
            name: row.comp_name || row.name || 'Unknown',
            activeJobs: Number(row.activeJobs || 0),
            placements: Number(row.placements || 0),
            positionsCount: Number(row.positionsCount || 0),
            positions: row.positions || []
        })).sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    } catch (err) {
        console.error('Failed to load companies from API:', err);
        companiesData = [];
    }

    let filteredData = [...companiesData];

    const applyFilter = (filterType) => {
        if (filterType === 'all') {
            filteredData = [...companiesData];
        } else if (filterType === 'tier1') {
            filteredData = companiesData.filter(c => c.tier === 'Tier 1');
        } else if (filterType === 'tier2') {
            filteredData = companiesData.filter(c => c.tier === 'Tier 2');
        } else if (filterType === 'tier3') {
            filteredData = companiesData.filter(c => c.tier === 'Tier 3');
        } else if (filterType === 'startup') {
            filteredData = companiesData.filter(c => c.tier === 'Startup');
        }

        const tableBody = document.getElementById('companiesTableBody');
        if (tableBody) {
            tableBody.innerHTML = renderTable();
            wireViewButtons();
        }

        const counterDiv = document.getElementById('companiesCounter');
        if (counterDiv) {
            counterDiv.textContent = `Showing ${filteredData.length} of ${companiesData.length} companies`;
        }

        // Update active class
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.filter === filterType);
        });
    };

    const renderTable = () => {
        let tableHTML = '';
        filteredData.forEach(company => {
            tableHTML += `
                <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;">
                    <td style="padding: 14px 16px; font-weight: 700; color: #94a3b8; font-size: 0.85rem;">#${company.id || '-'}</td>
                    <td style="padding: 14px 16px; font-weight: 600; color: var(--primary);">${company.name}</td>
                    <td style="padding: 14px 16px; color: var(--text-secondary);">${company.industry}</td>
                    <td style="padding: 14px 16px;"><span class="tag ${getTierBadgeClass(company.tier)}">${company.tier}</span></td>
                    <td style="padding: 14px 16px; color: var(--text-secondary);">
                        <span style="font-weight: 600; color: var(--success);">${company.activeJobs}</span>
                    </td>
                    <td style="padding: 14px 16px; color: var(--text-secondary);">
                        <span style="font-weight: 600;">${company.placements}</span>
                    </td>
                    <td style="padding: 14px 16px;">
                        <span style="display: inline-block; background: #e8f0ff; color: #1e40af; padding: 4px 10px; border-radius: 5px; font-size: 0.8rem; font-weight: 600;">${company.positionsCount || (company.positions || []).length} Positions</span>
                    </td>
                    <td style="padding: 14px 16px;">
                        <span class="tag ${getStatusBadgeClass(company.status)}">${company.status === 'active' ? '● Active' : '● Inactive'}</span>
                    </td>
                    <td style="padding: 14px 16px; text-align: right;">
                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                            <button class="btn-primary view-company-btn" data-company-id="${company.id}" style="padding: 6px 14px; font-size: 0.85rem; border-radius: 4px;">View</button>
                            <button class="delete-company-btn" data-company-id="${company.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem; padding: 4px;">
                                <ion-icon name="trash-outline"></ion-icon>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        return tableHTML;
    };

    const renderFilters = () => {
        return `
            <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All (${companiesData.length})</button>
                <button class="filter-btn ${currentFilter === 'tier1' ? 'active' : ''}" data-filter="tier1">Tier 1 (${companiesData.filter(c => c.tier === 'Tier 1').length})</button>
                <button class="filter-btn ${currentFilter === 'tier2' ? 'active' : ''}" data-filter="tier2">Tier 2 (${companiesData.filter(c => c.tier === 'Tier 2').length})</button>
                <button class="filter-btn ${currentFilter === 'tier3' ? 'active' : ''}" data-filter="tier3">Tier 3 (${companiesData.filter(c => c.tier === 'Tier 3').length})</button>
                <button class="filter-btn ${currentFilter === 'startup' ? 'active' : ''}" data-filter="startup">Startup (${companiesData.filter(c => c.tier === 'Startup').length})</button>
            </div>
        `;
    };

    container.innerHTML = `
        <div class="dashboard-header" style="margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1 style="font-size: 2rem; color: var(--primary); margin: 0 0 6px 0;">Registered Companies</h1>
                <p style="color: var(--text-muted); margin: 0;">Manage ${companiesData.length} partner companies and recruitment partnerships.</p>
            </div>
            <button class="btn-primary" id="addCompanyBtn" style="padding: 10px 20px; border-radius: 6px; font-weight: 600;">+ Add Company</button>
        </div>

        <div class="card" style="border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            <div style="padding: 20px;">
                <div class="companies-filters" id="filterContainer">
                    ${renderFilters()}
                </div>
                <div id="companiesCounter" style="font-size: 0.85rem; color: var(--text-muted);">
                    Showing ${companiesData.length} of ${companiesData.length} companies
                </div>
            </div>

            <div class="data-table-container" style="border-top: 1px solid var(--border);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--border);">
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">ID</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Company Name</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Industry</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Tier</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Active Jobs</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Placements</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Positions</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Status</th>
                            <th style="padding: 12px 16px; text-align: right; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="companiesTableBody">
                        ${renderTable()}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add Company Modal -->
        <div id="addCompanyModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px);">
            <div style="background: white; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10;">
                    <h2 style="font-size: 1.25rem; color: var(--primary); margin: 0;">Add New Partner Company</h2>
                    <button id="closeModalBtn" style="background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer;">×</button>
                </div>

                <form id="companyForm" style="padding: 20px; display: grid; gap: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Company Name *</label>
                            <input type="text" id="companyName" required style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                        </div>
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Industry *</label>
                            <input type="text" id="industry" required placeholder="e.g. Technology, Finance" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Tier *</label>
                            <select id="tier" required style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                                <option value="Tier 1">Tier 1</option>
                                <option value="Tier 2">Tier 2</option>
                                <option value="Tier 3">Tier 3</option>
                                <option value="Startup">Startup</option>
                            </select>
                        </div>
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Location</label>
                            <input type="text" id="location" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Website</label>
                            <input type="url" id="website" placeholder="https://..." style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                        </div>
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Established Year</label>
                            <input type="number" id="establishedYear" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                        </div>
                    </div>

                    <div style="border-top: 1px solid var(--border); padding-top: 15px; margin-top: 5px;">
                        <h3 style="font-size: 1rem; color: var(--primary); margin: 0 0 15px 0;">Contact Details</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Contact Person</label>
                                <input type="text" id="contactPerson" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                            </div>
                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Contact Email</label>
                                <input type="email" id="contactEmail" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Contact Phone</label>
                            <input type="text" id="contactPhone" maxlength="10" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                        </div>
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Status</label>
                            <select id="status" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Active Jobs</label>
                            <input type="number" id="activeJobs" value="0" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                        </div>
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Placements</label>
                            <input type="number" id="placements" value="0" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none;">
                        </div>
                    </div>

                    <div style="display: grid; gap: 6px;">
                        <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Description</label>
                        <textarea id="description" rows="3" style="border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.95rem; outline: none; resize: vertical;"></textarea>
                    </div>

                    <div style="border-top: 1px solid var(--border); padding-top: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h3 style="font-size: 1rem; color: var(--primary); margin: 0;">Open Positions</h3>
                            <button type="button" id="addPositionBtn" style="background: #eff6ff; color: var(--primary); border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; cursor: pointer; font-weight: 600;">+ Add Position</button>
                        </div>
                        <div id="positionsList"></div>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px; padding-top: 20px; border-top: 1px solid var(--border); position: sticky; bottom: 0; background: white; z-index: 10;">
                        <button type="button" id="cancelBtn" style="padding: 10px 20px; border-radius: 6px; border: 1px solid var(--border); background: white; cursor: pointer; font-weight: 600;">Cancel</button>
                        <button type="button" id="submitBtn" class="btn-primary" style="padding: 10px 25px; border-radius: 6px; border: none; font-weight: 600;">Save Company</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Apply initial filter
    applyFilter(currentFilter);

    // Event listeners
    const addBtn = document.getElementById('addCompanyBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const addPosBtn = document.getElementById('addPositionBtn');

    if (addBtn) addBtn.addEventListener('click', () => openAddCompanyModal(container));
    if (closeBtn) closeBtn.addEventListener('click', () => closeAddCompanyModal(container));
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeAddCompanyModal(container));
    if (addPosBtn) addPosBtn.addEventListener('click', () => addPositionField(document.getElementById('positionsList')));
    
    if (submitBtn) submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleAddCompany(container, currentFilter, app);
    });

    // Filter functionality
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.dataset.filter;
            currentFilter = filterType;
            applyFilter(filterType);
        });
    });

    // View company detail buttons (delegated)
    function wireViewButtons() {
        container.querySelectorAll('.view-company-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const compId = btn.dataset.companyId;
                if (compId) {
                    sessionStorage.setItem('selectedCompany', compId);
                    app.navigateTo('company_view');
                }
            });
        });

        container.querySelectorAll('.delete-company-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const compId = btn.dataset.companyId;
                if (compId && confirm('Are you sure you want to delete this company? This will also remove associated jobs and placements. This action cannot be undone.')) {
                    try {
                        await api.delete(`/admin/company/${compId}`);
                        // Re-render
                        render(container, app);
                    } catch (err) {
                        console.error('Failed to delete company', err);
                        alert('Failed to delete company.');
                    }
                }
            });
        });
    }

    wireViewButtons();
}
