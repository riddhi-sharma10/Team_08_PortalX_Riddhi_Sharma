// js/admin/companies.js
import { api } from '../api.js';

let companiesData = [];

function getTierBadgeClass(tier) {
    switch(tier) {
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

function handleAddCompany(container, currentFilter) {
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
        alert('Please fill in all required fields');
        return;
    }

    if (newCompany.activeJobs < 0 || newCompany.placements < 0) {
        alert('Jobs and placements must be positive numbers');
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

    // Add to data array
    companiesData.push(newCompany);

    // Close modal
    closeAddCompanyModal(container);

    // Re-render
    render(container);
}

function addPositionField() {
    const container = document.getElementById('positionsContainer');
    const positionCount = container.querySelectorAll('.position-item').length;
    
    const positionHTML = `
        <div class="position-item" style="padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; position: relative; display: grid; gap: 12px;">
            <button type="button" class="remove-position-btn" onclick="this.parentElement.remove()" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
            
            <div style="display: grid; gap: 6px;">
                <label style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">Position Title</label>
                <input type="text" class="position-title" placeholder="e.g., Software Engineer" style="border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 0.9rem; outline: none;">
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
                        <button class="btn-primary view-company-btn" data-company-id="${company.id}" style="padding: 6px 14px; font-size: 0.85rem; border-radius: 4px;">View</button>
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
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Total Placements</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Positions</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Status</th>
                            <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.4px;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="companiesTableBody">
                        ${renderTable()}
                    </tbody>
                </table>
            </div>

            <div style="padding: 16px 20px; background: var(--bg-secondary); border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--text-muted);" id="companiesCounter">
                Showing ${filteredData.length} of ${companiesData.length} companies
            </div>
        </div>

        <!-- Add Company Modal -->
        <div id="addCompanyModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(6px);">
            <div style="background: white; border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,0.22); width: 100%; max-width: 860px; max-height: 92vh; overflow-y: auto; border: 1px solid #dbe4f0;">
                <div style="padding: 24px 28px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; background: linear-gradient(180deg, #ffffff, #f8fbff); position: sticky; top: 0; z-index: 1;">
                    <div>
                        <p style="margin: 0 0 6px 0; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">New Partner Record</p>
                        <h2 style="font-size: 1.65rem; color: var(--primary); margin: 0;">Add New Company</h2>
                        <p style="margin: 8px 0 0 0; color: var(--text-muted);">Capture full company profile, contact details, and multiple open positions.</p>
                    </div>
                    <button id="closeModalBtn" type="button" style="background: #eff6ff; border: 1px solid #bfdbfe; font-size: 1.35rem; color: var(--primary); cursor: pointer; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700;">×</button>
                </div>

                <form id="companyForm" style="display: grid; gap: 18px; padding: 24px 28px 28px;">
                    <div style="display: grid; gap: 12px;">
                        <h3 style="font-size: 1rem; color: #0f1f46; margin: 0;">Company Details</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;">
                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Company Name *</label>
                                <input type="text" id="companyName" placeholder="e.g., Google India" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>

                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Industry *</label>
                                <input type="text" id="industry" placeholder="e.g., Technology" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>

                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Tier *</label>
                                <select id="tier" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                                    <option value="">Select a tier</option>
                                    <option value="Tier 1">Tier 1</option>
                                    <option value="Tier 2">Tier 2</option>
                                    <option value="Startup">Startup</option>
                                </select>
                            </div>

                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Location</label>
                                <input type="text" id="location" placeholder="e.g., Bengaluru, India" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>

                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Website</label>
                                <input type="text" id="website" placeholder="e.g., https://company.com" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>

                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Established Year</label>
                                <input type="text" id="establishedYear" placeholder="e.g., 1998" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; gap: 12px;">
                        <h3 style="font-size: 1rem; color: #0f1f46; margin: 0;">Contact & Overview</h3>
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Company Description</label>
                            <textarea id="description" rows="3" placeholder="Short note about the company, hiring focus, or campus drive details" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none; resize: vertical;"></textarea>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px;">
                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Contact Person</label>
                                <input type="text" id="contactPerson" placeholder="e.g., HR Manager" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>
                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Contact Email</label>
                                <input type="email" id="contactEmail" placeholder="e.g., hr@company.com" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>
                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Contact Phone</label>
                                <input type="text" id="contactPhone" placeholder="e.g., +91 98765 43210" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Active Jobs</label>
                            <input type="number" id="activeJobs" placeholder="0" min="0" value="0" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>
                        <div style="display: grid; gap: 6px;">
                            <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Total Placements</label>
                            <input type="number" id="placements" placeholder="0" min="0" value="0" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                        </div>
                    </div>

                    <div style="display: grid; gap: 6px;">
                        <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Status</label>
                        <select id="status" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div style="display: grid; gap: 12px; padding-top: 12px; border-top: 2px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">Job Positions</label>
                            <button type="button" id="addPositionBtn" onclick="addPositionField()" style="background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 12px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;">+ Add Position</button>
                        </div>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin: -4px 0 0 0;">Add one or more positions with title, salary range, and required skills.</p>
                        <div id="positionsContainer" style="display: grid; gap: 12px;"></div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" id="cancelBtn" style="flex: 1; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: white; color: var(--text-main); font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancel</button>
                        <button type="button" id="submitBtn" style="flex: 1; padding: 12px 16px; border: none; border-radius: 8px; background: var(--primary); color: white; font-weight: 600; cursor: pointer; transition: all 0.2s;">Add Company</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Event listeners
    const addBtn = document.getElementById('addCompanyBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const filterBtns = document.querySelectorAll('.filter-btn');

    if (addBtn) addBtn.addEventListener('click', () => openAddCompanyModal(container));
    if (closeBtn) closeBtn.addEventListener('click', () => closeAddCompanyModal(container));
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeAddCompanyModal(container));
    if (submitBtn) submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleAddCompany(container, currentFilter);
    });

    // Close modal when clicking outside
    const modal = document.getElementById('addCompanyModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAddCompanyModal(container);
        });
    }

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
    }
    wireViewButtons();

    // Filter functionality
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.dataset.filter;
            currentFilter = filterType;
            
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
            
            // Update table
            const tableBody = document.getElementById('companiesTableBody');
            if (tableBody) {
                tableBody.innerHTML = renderTable();
                wireViewButtons();
            }
            
            // Update filter buttons
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update counter
            const counterDiv = document.getElementById('companiesCounter');
            if (counterDiv) {
                counterDiv.textContent = `Showing ${filteredData.length} of ${companiesData.length} companies`;
            }
        });
    });
}
