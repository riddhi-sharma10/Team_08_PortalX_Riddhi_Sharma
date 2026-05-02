// js/student/job_view.js
import { api } from '../api.js';

export async function render(container, app) {
    const jobId = sessionStorage.getItem('selectedJobId');
    
    if (!jobId) {
        container.innerHTML = `
            <div class="card" style="padding: 40px; text-align: center; margin: 24px;">
                <ion-icon name="alert-circle-outline" style="font-size: 3rem; color: #ef4444;"></ion-icon>
                <h2 style="margin-top: 16px;">No Job Selected</h2>
                <button id="backBtnErr" class="btn-primary" style="margin-top: 24px;">Back to Opportunities</button>
            </div>
        `;
        document.getElementById('backBtnErr')?.addEventListener('click', () => app.navigateTo('opportunities'));
        return;
    }

    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:400px;">
            <div style="text-align:center;color:var(--text-muted);">
                <ion-icon name="sync-outline" style="font-size:2.5rem;display:block;margin:0 auto 12px; animation:spin 1s linear infinite;"></ion-icon>
                <p>Fetching full job details from database...</p>
            </div>
        </div>
    `;

    try {
        // Fetch detailed job info from the new specific endpoint
        const job = await api.get(`/jobs/info/${jobId}`);

        const deadline = job.app_deadline ? new Date(job.app_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

        container.innerHTML = `
            <div class="dashboard-shell" style="padding: 32px;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 32px;">
                    <button id="backBtn" class="btn-primary" style="background: white; color: var(--primary); border: 1px solid var(--border); padding: 10px 18px; border-radius: 10px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                        <ion-icon name="arrow-back-outline"></ion-icon> Back
                    </button>
                    <div>
                        <h1 style="margin: 0; font-size: 2rem; color: var(--primary); font-weight: 800;">${job.role}</h1>
                        <p style="color: var(--text-muted); font-size: 1rem; margin-top: 4px;">at <span style="color:var(--primary); font-weight:700;">${job.comp_name}</span></p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 32px;">
                    <!-- Left: Details -->
                    <div style="display: flex; flex-direction: column; gap: 24px;">
                        <!-- Job Description Box -->
                        <div class="card" style="padding: 32px;">
                            <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
                                <ion-icon name="document-text-outline" style="color: var(--primary);"></ion-icon> Job Description
                            </h3>
                            <div style="line-height: 1.8; color: #4b5563; font-size: 1.05rem; white-space: pre-wrap; margin-bottom: 32px;">
                                ${job.job_description || 'No detailed description available in the database for this role.'}
                            </div>

                            <!-- PDF Section -->
                            <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    <div style="width: 48px; height: 48px; background: #fee2e2; color: #dc2626; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                        <ion-icon name="document-outline"></ion-icon>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-weight: 700; color: var(--text-main);">Official Job Description PDF</p>
                                        <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">Uploaded by Placement Cell</p>
                                    </div>
                                </div>
                                <a href="${job.jd_pdf_url || '#'}" target="_blank" class="btn-primary" style="padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; text-decoration: none;">View Document</a>
                            </div>
                        </div>

                        <!-- Eligibility & Skills Box -->
                        <div class="card" style="padding: 32px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                                <div>
                                    <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                                        <ion-icon name="git-branch-outline" style="color: var(--primary);"></ion-icon> Eligible Branches
                                    </h3>
                                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                        ${(job.eligible_branches && job.eligible_branches.length > 0) 
                                            ? job.eligible_branches.map(branch => `
                                                <span style="background: #eff6ff; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; border: 1px solid #dbeafe;">${branch}</span>
                                            `).join('')
                                            : '<p style="color:var(--text-muted); font-size:0.9rem;">Open to all branches</p>'
                                        }
                                    </div>
                                </div>
                                <div>
                                    <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                                        <ion-icon name="construct-outline" style="color: var(--primary);"></ion-icon> Required Skills
                                    </h3>
                                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                        ${(job.skills && job.skills.length > 0)
                                            ? job.skills.map(skill => `
                                                <span style="background: #f0fdf4; color: #166534; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; border: 1px solid #dcfce7;">${skill}</span>
                                            `).join('')
                                            : '<p style="color:var(--text-muted); font-size:0.9rem;">Standard engineering skills</p>'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Info Panel -->
                    <div style="display: flex; flex-direction: column; gap: 24px;">
                        <div class="card" style="padding: 24px;">
                            <h4 style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">Role Information</h4>
                            
                            <div style="display: grid; gap: 20px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 40px; height: 40px; background: #ecfdf5; color: #059669; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                        <ion-icon name="cash-outline"></ion-icon>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">SALARY PACKAGE</p>
                                        <p style="margin: 0; font-weight: 800; color: var(--text-main);">₹${job.package} LPA</p>
                                    </div>
                                </div>

                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 40px; height: 40px; background: #fff7ed; color: #ea580c; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                        <ion-icon name="star-outline"></ion-icon>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">CGPA CUTOFF</p>
                                        <p style="margin: 0; font-weight: 800; color: var(--text-main);">${job.eligibility_cgpa} or higher</p>
                                    </div>
                                </div>

                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 40px; height: 40px; background: #fef2f2; color: #dc2626; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                        <ion-icon name="calendar-outline"></ion-icon>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">APPLICATION DEADLINE</p>
                                        <p style="margin: 0; font-weight: 800; color: var(--text-main);">${deadline}</p>
                                    </div>
                                </div>

                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 40px; height: 40px; background: #eff6ff; color: #2563eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                        <ion-icon name="briefcase-outline"></ion-icon>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">JOB TYPE</p>
                                        <p style="margin: 0; font-weight: 800; color: var(--text-main);">${job.job_type || 'Full-time'}</p>
                                    </div>
                                </div>
                            </div>

                            <button id="applyNowBtn" class="btn-primary" style="width: 100%; margin-top: 32px; padding: 16px; border-radius: 12px; font-weight: 800; font-size: 1rem; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);">
                                Apply for this Position
                            </button>
                        </div>

                        <div class="card" style="padding: 24px; background: #f8fafc; border: 1px solid var(--border);">
                            <h4 style="font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Company Info</h4>
                            <p style="margin: 0; font-weight: 700; color: var(--text-main); font-size: 1.1rem;">${job.comp_name}</p>
                            <span class="tag tag-info" style="margin-top: 8px;">${job.industry_type || 'Technology'}</span>
                            <button id="viewCompBtn" style="width: 100%; margin-top: 16px; background: none; border: 1px solid var(--border); color: var(--text-muted); padding: 8px; border-radius: 8px; font-weight: 700; cursor: pointer;">
                                View Company Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('backBtn')?.addEventListener('click', () => {
            const origin = sessionStorage.getItem('job_view_origin') || 'opportunities';
            app.navigateTo(origin);
        });

        document.getElementById('viewCompBtn')?.addEventListener('click', () => {
            app.viewCompany(job.comp_name);
        });

        document.getElementById('applyNowBtn')?.addEventListener('click', () => {
            alert('Application submitted successfully for ' + job.role);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:red;">Error: ${err.message}</div>`;
    }
}
