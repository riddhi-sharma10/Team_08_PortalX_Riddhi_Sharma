// js/admin/companies.js
import { api } from '../api.js';

let companiesData = [];
const state = {
    pendingDelete: null
};

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
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset form
    const form = document.getElementById('companyForm');
    if (form) form.reset();
}

function showSuccess(msg) {
    const modal = document.getElementById('successModal');
    const msgEl = document.getElementById('success-modal-msg');
    if (modal && msgEl) {
        msgEl.textContent = msg;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    state.pendingDelete = null;
    
    const btn = document.getElementById('confirmDeleteBtn');
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Yes, Delete Company';
    }
}

async function handleAddCompany(container, currentFilter, app) {
    const newCompany = {
        name: document.getElementById('companyName').value.trim(),
        industry: document.getElementById('industry').value.trim(),
        tier: document.getElementById('tier').value,
        location: document.getElementById('location').value.trim(),
        website: document.getElementById('website').value.trim(),
        jobRole: document.getElementById('jobRole').value.trim(),
        avgPackage: parseFloat(document.getElementById('avgPackage').value) || 0,
        contactEmail: document.getElementById('contactEmail').value.trim(),
        contactPhone: document.getElementById('contactPhone').value.trim(),
        positions: []
    };

    // Validation
    if (!newCompany.name || !newCompany.industry || !newCompany.tier) {
        alert('Please fill in all required fields: Company Name, Industry, and Tier.');
        return;
    }

    // Collect positions
    const positionItems = document.querySelectorAll('.position-item');
    positionItems.forEach(item => {
        const title = item.querySelector('.position-title').value.trim();
        const type = item.querySelector('.position-type').value;
        const salary = item.querySelector('.position-salary').value.trim();
        const cgpa = item.querySelector('.position-cgpa').value.trim();
        const branch = item.querySelector('.position-branch').value.trim();
        const skills = item.querySelector('.position-skills').value.trim();
        
        if (title) {
            newCompany.positions.push({ title, type, salary, cgpa, branch, skills });
        }
    });

    try {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        await api.post('/admin/company', newCompany);
        closeAddCompanyModal(container);
        showSuccess('Company added successfully with ' + newCompany.positions.length + ' positions synced.');
        render(container, app);
    } catch (err) {
        console.error('Failed to add company:', err);
        alert('Error adding company: ' + err.message);
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Company';
        }
    }
}


function addPositionField() {
    const container = document.getElementById('positionsContainer');
    const positionCount = container.querySelectorAll('.position-item').length;
    
    const positionHTML = `
        <div class="position-item" style="padding: 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; position: relative; display: grid; gap: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <button type="button" class="remove-position-btn" style="position: absolute; top: 12px; right: 12px; background: #fee2e2; border: 1px solid #fecaca; color: #ef4444; cursor: pointer; font-size: 1.1rem; padding: 0; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;">×</button>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
                <div style="display: grid; gap: 6px;">
                    <label style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">Position Role/Title *</label>
                    <input type="text" class="position-title" required placeholder="e.g., Software Engineer" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.9rem; outline: none;">
                </div>
                <div style="display: grid; gap: 6px;">
                    <label style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">Job Type</label>
                    <select class="position-type" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.9rem; outline: none;">
                        <option value="Full Time">Full Time</option>
                        <option value="Internship">Internship</option>
                        <option value="Contract">Contract</option>
                    </select>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <div style="display: grid; gap: 6px;">
                    <label style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">Package (LPA)</label>
                    <input type="number" step="0.1" class="position-salary" placeholder="e.g., 12.5" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.9rem; outline: none;">
                </div>
                <div style="display: grid; gap: 6px;">
                    <label style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">Min CGPA</label>
                    <input type="number" step="0.01" min="0" max="10" class="position-cgpa" placeholder="7.0" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.9rem; outline: none;">
                </div>
                <div style="display: grid; gap: 6px;">
                    <label style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">Eligible Branch</label>
                    <input type="text" class="position-branch" placeholder="CSE, IT, ECE" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.9rem; outline: none;">
                </div>
            </div>

            <div style="display: grid; gap: 6px;">
                <label style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">Required Skills</label>
                <input type="text" class="position-skills" placeholder="e.g., React, Node.js, SQL" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.9rem; outline: none;">
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', positionHTML);
    
    // Wire up remove button
    const lastItem = container.lastElementChild;
    lastItem.querySelector('.remove-position-btn').addEventListener('click', () => lastItem.remove());
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
                                <input type="text" id="website" placeholder="e.g., www.company.com" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>

                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Main Job Role</label>
                                <input type="text" id="jobRole" placeholder="e.g., Backend Developer" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>

                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Avg Package (LPA)</label>
                                <input type="number" step="0.1" id="avgPackage" placeholder="e.g., 9.5" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
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
                                <input type="email" id="contactEmail" pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$" title="Please enter a valid email address" placeholder="e.g., hr@company.com" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
                            </div>
                            <div style="display: grid; gap: 6px;">
                                <label style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Contact Phone</label>
                                <input type="text" id="contactPhone" pattern="[0-9]{10}" maxlength="10" title="Phone number must be exactly 10 digits" placeholder="e.g., 9876543210" style="border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; outline: none;">
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
                            <button type="button" id="addPositionBtn" style="background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 12px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;">+ Add Position</button>
                        </div>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin: -4px 0 0 0; line-height: 1.4;">Add positions here. The <b>Active Jobs</b> count in the table is automatically calculated based on how many positions you add below.</p>
                        <div id="positionsContainer" style="display: grid; gap: 12px;"></div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" id="cancelBtn" style="flex: 1; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: white; color: var(--text-main); font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancel</button>
                        <button type="button" id="submitBtn" style="flex: 1; padding: 12px 16px; border: none; border-radius: 8px; background: var(--primary); color: white; font-weight: 600; cursor: pointer; transition: all 0.2s;">Add Company</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Custom Delete Confirm Modal -->
        <div id="deleteConfirmModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 2000; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(8px);">
            <div style="background: white; border-radius: 20px; box-shadow: 0 40px 100px rgba(0,0,0,0.25); width: 100%; max-width: 420px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="padding: 32px; text-align: center;">
                    <div style="width: 64px; height: 64px; background: #fff1f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #e11d48; font-size: 2rem;">
                        <ion-icon name="alert-circle-outline"></ion-icon>
                    </div>
                    <h2 style="font-size: 1.4rem; color: #0f172a; margin: 0 0 12px 0;">Delete Company?</h2>
                    <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0;">Are you sure you want to delete this company? This will also remove associated job postings and student applications. This action cannot be undone.</p>
                </div>
                <div style="padding: 20px 32px 32px; display: flex; flex-direction: column; gap: 12px;">
                    <button id="confirmDeleteBtn" style="width: 100%; padding: 14px; border: none; border-radius: 12px; background: #e11d48; color: white; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s;">Yes, Delete Company</button>
                    <button id="cancelDeleteBtn" style="width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; color: #64748b; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s;">No, Take me back</button>
                </div>
            </div>
        </div>

        <!-- Custom Success Modal -->
        <div id="successModal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 2000; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(8px);">
            <div style="background: white; border-radius: 20px; box-shadow: 0 40px 100px rgba(0,0,0,0.25); width: 100%; max-width: 400px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="padding: 32px; text-align: center;">
                    <div style="width: 64px; height: 64px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #16a34a; font-size: 2.5rem;">
                        <ion-icon name="checkmark-circle-outline"></ion-icon>
                    </div>
                    <h2 style="font-size: 1.4rem; color: #0f172a; margin: 0 0 12px 0;">Success!</h2>
                    <p id="success-modal-msg" style="color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0;">Operation completed successfully.</p>
                </div>
                <div style="padding: 0 32px 32px;">
                    <button id="closeSuccessBtn" style="width: 100%; padding: 14px; border: none; border-radius: 12px; background: var(--primary); color: white; font-weight: 600; font-size: 1rem; cursor: pointer;">Awesome</button>
                </div>
            </div>
        </div>
    `;

    // Event listeners
    const addBtn = document.getElementById('addCompanyBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const addPosBtn = document.getElementById('addPositionBtn');
    const filterBtns = document.querySelectorAll('.filter-btn');

    if (addBtn) addBtn.addEventListener('click', () => openAddCompanyModal(container));
    if (closeBtn) closeBtn.addEventListener('click', () => closeAddCompanyModal(container));
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeAddCompanyModal(container));
    if (addPosBtn) addPosBtn.addEventListener('click', addPositionField);
    if (submitBtn) submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleAddCompany(container, currentFilter, app);
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

        container.querySelectorAll('.delete-company-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const compId = btn.dataset.companyId;
                if (compId) {
                    state.pendingDelete = compId;
                    const modal = document.getElementById('deleteConfirmModal');
                    if (modal) {
                        modal.style.display = 'flex';
                        document.body.style.overflow = 'hidden';
                    }
                }
            });
        });
    }
    wireViewButtons();

    // Modal Action Bindings
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
        if (!state.pendingDelete) return;
        const compId = state.pendingDelete;
        
        const btn = document.getElementById('confirmDeleteBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Deleting...';
        }

        try {
            await api.delete(`/admin/company/${compId}`);
            closeDeleteModal();
            render(container, app);
        } catch (err) {
            console.error('Failed to delete company', err);
            alert('Failed to delete company.');
            closeDeleteModal();
        }
    });

    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('closeSuccessBtn')?.addEventListener('click', closeSuccessModal);

    // Close modals when clicking outside
    [document.getElementById('deleteConfirmModal'), document.getElementById('successModal')].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modal.id === 'deleteConfirmModal') closeDeleteModal();
                    else closeSuccessModal();
                }
            });
        }
    });

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
