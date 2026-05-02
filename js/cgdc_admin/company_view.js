// js/admin/company_view.js
import { api } from '../api.js';

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

function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

export async function render(container, app) {
    const companyKey = sessionStorage.getItem('selectedCompany') || '';

    // Show loading state
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:400px;">
            <div style="text-align:center;color:var(--text-muted);">
                <ion-icon name="hourglass-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px;"></ion-icon>
                <p>Loading company details...</p>
            </div>
        </div>
    `;

    let company = null;

    // If companyKey is a number (ID), fetch by ID; otherwise fetch all and find by name
    try {
        const fetchWithTimeout = (promise) => Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out – restart your backend server')), 8000))
        ]);

        if (companyKey && !isNaN(Number(companyKey))) {
            company = await fetchWithTimeout(api.get(`/admin/company/${companyKey}`));
        } else {
            // Fetch all companies and find by name
            const allCompanies = await fetchWithTimeout(api.get('/admin/companies'));
            company = (allCompanies || []).find(c => (c.name || c.comp_name) === companyKey);
            
            // If found by name, fetch the detailed info with positions
            if (company && company.id) {
                company = await fetchWithTimeout(api.get(`/admin/company/${company.id}`));
            }
        }

        // Normalize name field (backend may return comp_name instead of name)
        if (company && !company.name && company.comp_name) {
            company.name = company.comp_name;
        }
    } catch (err) {
        console.error('Failed to load company from API:', err);
    }

    if (!company) {
        company = {
            name: companyKey || 'Unknown Company',
            industry: 'N/A',
            tier: 'Unknown',
            activeJobs: 0,
            placements: 0,
            status: 'inactive',
            positions: []
        };
    }

    // Final safety: ensure name always exists
    company.name = company.name || company.comp_name || 'Unknown Company';

    container.innerHTML = `
        <div style="padding: 24px 32px;">
            <!-- Header with Back Button -->
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 32px;">
                <button id="backBtn" style="background: linear-gradient(135deg, var(--primary), #0f2f61); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.3s;">← Back to Companies</button>
                <h1 style="margin: 0; font-size: 2rem; color: var(--primary);">${company.name}</h1>
            </div>

            <!-- Main Content Grid -->
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 32px;">
                <!-- Left Sidebar -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <div class="card" style="border-radius: 16px; padding: 28px; background: #ffffff; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 22px;">
                            <div style="width: 72px; height: 72px; border-radius: 18px; background: linear-gradient(135deg, #eff6ff, #dbeafe); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: 800; border: 1px solid #bfdbfe;">${getInitials(company.name)}</div>
                            <div>
                                <p style="margin: 0 0 6px 0; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.5px; color: #64748b; text-transform: uppercase;">Company</p>
                                <h2 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a;">${company.name}</h2>
                                <p style="margin: 6px 0 0 0; color: #475569; font-size: 0.95rem;">${company.industry}</p>
                            </div>
                        </div>

                        <div style="display: grid; gap: 16px;">
                            <div style="padding: 14px 0; border-top: 1px solid #e2e8f0;">
                                <p style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">Industry</p>
                                <p style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin: 0;">${company.industry}</p>
                            </div>
                            <div style="padding: 14px 0; border-top: 1px solid #e2e8f0;">
                                <p style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">Company Tier</p>
                                <div>${company.tier === 'Tier 1' ? `<span class="tag tag-tier1">Tier 1</span>` : company.tier === 'Tier 2' ? `<span class="tag tag-tier2">Tier 2</span>` : `<span class="tag tag-startup">${company.tier}</span>`}</div>
                            </div>
                            <div style="padding: 14px 0; border-top: 1px solid #e2e8f0;">
                                <p style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">Status</p>
                                <div>${company.status === 'active' ? `<span class="tag tag-success">Active Partner</span>` : `<span class="tag tag-muted">Inactive</span>`}</div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding-top: 8px;">
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                                    <p style="margin: 0 0 6px 0; font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Placements</p>
                                    <p style="margin: 0; font-size: 1.3rem; font-weight: 800; color: #0f172a;">${company.placements}</p>
                                </div>
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                                    <p style="margin: 0 0 6px 0; font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Jobs</p>
                                    <p style="margin: 0; font-size: 1.3rem; font-weight: 800; color: #0f172a;">${company.activeJobs}</p>
                                </div>
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                                    <p style="margin: 0 0 6px 0; font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Open</p>
                                    <p style="margin: 0; font-size: 1.3rem; font-weight: 800; color: #0f172a;">${(company.positions || []).length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Content -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <!-- Open Positions Section -->
                    <div class="card" style="border-radius: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); overflow: hidden; background: #ffffff; border: 1px solid #e2e8f0;">
                        <div style="background: #ffffff; padding: 22px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: #0f172a;">Open Positions</h3>
                            <span style="background: #eff6ff; color: var(--primary); padding: 8px 14px; border-radius: 999px; font-weight: 800; font-size: 0.95rem; border: 1px solid #bfdbfe;">${(company.positions || []).length}</span>
                        </div>
                        <div style="padding: 24px;">
                            ${(company.positions && company.positions.length > 0) ? `
                                <div style="display: grid; gap: 16px;">
                                    ${company.positions.map((pos, idx) => `
                                        <div style="padding: 18px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; border-left: 4px solid var(--primary);">
                                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                                                <div style="flex: 1;">
                                                    <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--primary); margin: 0 0 6px 0;">${pos.title}</h4>
                                                    <p style="font-size: 0.85rem; color: #64748b; margin: 0; font-weight: 500;">Position ${idx + 1} of ${company.positions.length}</p>
                                                </div>
                                                <div style="background: #ffffff; color: var(--primary); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.05rem; flex-shrink: 0; border: 1px solid #bfdbfe;">${idx + 1}</div>
                                            </div>
                                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                                <div style="padding: 14px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                                                    <p style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 8px 0;">Salary Range</p>
                                                    <p style="font-size: 1rem; font-weight: 700; color: #10b981; margin: 0;">${pos.salary}</p>
                                                </div>
                                                <div style="padding: 14px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                                                    <p style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 8px 0;">Required Skills</p>
                                                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                                        ${pos.skills && pos.skills !== 'N/A'
                                                            ? pos.skills.split(',').map(s => `<span style="background: #f0fdf4; color: #166534; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; border: 1px solid #dcfce7;">${s.trim()}</span>`).join('')
                                                            : '<p style="font-size: 0.85rem; font-weight: 600; color: #64748b; margin: 0;">N/A</p>'
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                            <div style="display: flex; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px;">
                                                <button id="view-job-${pos.job_id || pos.id}" class="view-job-btn" style="background: white; color: var(--primary); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;">View Full Details</button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 10px; border: 2px dashed #cbd5e1;">
                                    <p style="color: #64748b; font-size: 1.1rem; font-weight: 500; margin: 0;">No open positions at this moment</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const backBtn = container.querySelector('#backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            sessionStorage.removeItem('selectedCompany');
            app.navigateTo('companies');
        });
    }

    // Add job details listeners
    container.querySelectorAll('.view-job-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const jobId = btn.id.replace('view-job-', '');
            app.viewJob(jobId);
        });
    });
}
