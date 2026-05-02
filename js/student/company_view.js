// js/student/company_view.js
import { api } from '../api.js';

function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

export async function render(container, app) {
    const companyKey = sessionStorage.getItem('selectedCompany') || '';

    // Show loading state
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:400px;">
            <div style="text-align:center;color:var(--text-muted);">
                <ion-icon name="sync-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px; animation:spin 1s linear infinite;"></ion-icon>
                <p>Syncing company data from database...</p>
            </div>
        </div>
    `;

    let company = null;

    try {
        if (companyKey) {
            // Find company by name or ID
            const allCompanies = await api.get('/companies');
            company = allCompanies.find(c => 
                (c.name || c.comp_name) === companyKey || String(c.id) === companyKey
            );
            
            if (company && company.id) {
                // Fetch detailed info including positions
                company = await api.get(`/companies/${company.id}`);
            }
        }
    } catch (err) {
        console.error('Failed to load company from API:', err);
    }

    if (!company) {
        container.innerHTML = `
            <div class="card" style="padding: 40px; text-align: center; margin: 24px;">
                <ion-icon name="alert-circle-outline" style="font-size: 3rem; color: #ef4444;"></ion-icon>
                <h2 style="margin-top: 16px;">Company Not Found</h2>
                <p style="color:var(--text-muted); margin-top: 8px;">The requested company details are not available in the database.</p>
                <button id="backBtnErr" class="btn-primary" style="margin-top: 24px;">Back to Dashboard</button>
            </div>
        `;
        const backBtnErr = container.querySelector('#backBtnErr');
        if (backBtnErr) backBtnErr.addEventListener('click', () => app.navigateTo('dashboard'));
        return;
    }

    // Normalize name
    company.name = company.name || company.comp_name || 'Unknown Company';

    container.innerHTML = `
        <div class="dashboard-shell" style="padding: 32px;">
            <!-- Header with Back Button -->
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 40px;">
                <button id="backBtn" class="btn-primary" style="background: white; color: var(--primary); border: 1px solid var(--border); padding: 10px 18px; border-radius: 10px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    <ion-icon name="arrow-back-outline"></ion-icon> Back
                </button>
                <div>
                    <h1 style="margin: 0; font-size: 2.2rem; color: var(--primary); font-weight: 800;">${company.name}</h1>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">Verified Placement Partner</p>
                </div>
            </div>

            <!-- Main Content Grid -->
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 32px;">
                <!-- Left Sidebar: Company Info -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <div class="card" style="padding: 32px; border-top: 5px solid var(--primary);">
                        <div style="text-align: center; margin-bottom: 28px;">
                            <div style="width: 80px; height: 80px; border-radius: 20px; background: #f0f7ff; color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 800; border: 1px solid var(--border); margin: 0 auto 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                                ${getInitials(company.name)}
                            </div>
                            <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">${company.name}</h2>
                            <span class="tag tag-info" style="font-size: 0.8rem; font-weight: 800; background: #e0f2fe; color: #0369a1; border: none; padding: 4px 16px;">${company.industry || 'Product'}</span>
                        </div>

                        <div style="display: grid; gap: 20px; border-top: 1px solid var(--border); padding-top: 24px;">
                            <div>
                                <label style="font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Website</label>
                                <a href="${company.website}" target="_blank" style="color: var(--primary); font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 6px;">
                                    ${company.website} <ion-icon name="open-outline"></ion-icon>
                                </a>
                            </div>
                            <div>
                                <label style="font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Category</label>
                                <span class="tag ${company.tier === 'Tier 1' ? 'tag-success' : 'tag-info'}" style="font-weight: 800;">${company.tier || 'Tier 2'}</span>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 32px;">
                            <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center;">
                                <p style="margin: 0; font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Open Jobs</p>
                                <p style="margin: 4px 0 0; font-size: 1.5rem; font-weight: 800; color: var(--primary);">${company.activeJobs || 0}</p>
                            </div>
                            <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center;">
                                <p style="margin: 0; font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Past Placed</p>
                                <p style="margin: 4px 0 0; font-size: 1.5rem; font-weight: 800; color: var(--success);">${company.placements || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Content: Open Jobs -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <div class="card" style="padding: 32px;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 24px;">Live Opportunities</h3>
                        
                        ${(company.positions && company.positions.length > 0) ? `
                            <div style="display: grid; gap: 16px;">
                                ${company.positions.map((pos, idx) => `
                                    <div style="padding: 18px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; border-left: 4px solid var(--primary); margin-bottom: 16px;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                                            <div style="flex: 1;">
                                                <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--primary); margin: 0 0 6px 0;">${pos.title}</h4>
                                                <p style="font-size: 0.85rem; color: #64748b; margin: 0; font-weight: 500;">Position ${idx + 1} of ${company.positions.length}</p>
                                            </div>
                                            <div style="background: #ffffff; color: var(--primary); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.05rem; flex-shrink: 0; border: 1px solid #bfdbfe;">${idx + 1}</div>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                                            <div style="padding: 14px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                                                <p style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 8px 0;">Salary Range</p>
                                                <p style="font-size: 1rem; font-weight: 700; color: #10b981; margin: 0;">${pos.salary ? `₹${pos.salary} LPA` : 'N/A'}</p>
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
                                        <div style="display: flex; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                                            <button id="view-job-${pos.id}" class="btn-primary" style="background: white; color: var(--primary); border: 1px solid var(--border); padding: 10px 20px; border-radius: 10px; font-weight: 800; font-size: 0.9rem;">Details</button>
                                            ${(pos.status || '').toLowerCase() === 'closed'
                                                ? `<button class="btn-primary" style="padding: 10px 24px; border-radius: 10px; font-weight: 800; font-size: 0.9rem; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; cursor: not-allowed;" disabled>Closed</button>`
                                                : `<button class="btn-primary" style="padding: 10px 24px; border-radius: 10px; font-weight: 800; font-size: 0.9rem;">Apply Now</button>`
                                            }
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div style="padding: 60px; text-align: center; background: #f8fafc; border: 2px dashed var(--border); border-radius: 16px;">
                                <ion-icon name="briefcase-outline" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 16px;"></ion-icon>
                                <h4 style="color: var(--text-muted);">No live positions found</h4>
                                <p style="color: var(--text-muted); font-size: 0.9rem;">Check back later or explore other companies.</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;

    const backBtn = container.querySelector('#backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Check if we should go to dashboard or opportunities
            const prev = sessionStorage.getItem('company_view_origin') || 'dashboard';
            app.navigateTo(prev);
        });
    }

    // Add job details listeners
    if (company.positions) {
        company.positions.forEach(pos => {
            const btn = document.getElementById(`view-job-${pos.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    sessionStorage.setItem('job_view_origin', 'company_view');
                    app.viewJob(pos.id);
                });
            }
        });
    }
}
