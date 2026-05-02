
import { api } from '../api.js';

let allJobs = [];
let filteredJobs = [];
let searchQuery = '';

export async function render(container, app) {
    container.innerHTML = `<div style="padding: 24px;"><h2>Loading career opportunities...</h2></div>`;

    try {
        allJobs = await api.get('/jobs');
        
        // Check for pending search from global search bar
        const pendingSearch = sessionStorage.getItem('pendingSearch');
        if (pendingSearch) {
            searchQuery = pendingSearch;
            sessionStorage.removeItem('pendingSearch');
        }

        filteredJobs = searchQuery 
            ? allJobs.filter(j => 
                j.role.toLowerCase().includes(searchQuery.toLowerCase()) || 
                j.comp_name.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : [...allJobs];
            
        renderPage(container);
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding:24px; color:#ef4444;">Database Sync Error: ${err.message}</div>`;
    }
}

function renderPage(container) {
    container.innerHTML = `
        <div class="dashboard-header" style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1 style="font-size: 2rem; color: var(--primary);">Job Opportunities</h1>
                <p style="color: var(--text-muted);">Explore open positions tailored for your profile.</p>
            </div>
            <div style="background: white; padding: 10px 20px; border-radius: 12px; border: 1px solid var(--border); display: flex; align-items: center; gap: 12px; width: 300px;">
                <ion-icon name="search-outline" style="color: var(--text-muted);"></ion-icon>
                <input type="text" id="job-search" placeholder="Search role or company..." style="border: none; outline: none; width: 100%; font-size: 0.9rem;" value="${searchQuery}">
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
            ${filteredJobs.length > 0 ? filteredJobs.map(job => `
                <div class="card hover-card" style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="width: 54px; height: 54px; border-radius: 12px; background: #f8fafc; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.4rem; border: 1px solid var(--border);">
                            ${(job.comp_name || 'C').charAt(0)}
                        </div>
                        <div>
                            <h4 style="margin: 0; font-weight: 800; color: var(--text-main); font-size: 1.1rem;">${job.role}</h4>
                            <p style="margin: 2px 0 0; color: var(--primary); font-weight: 700;">${job.comp_name || 'Unknown Company'}</p>
                        </div>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <span class="tag tag-info" style="font-size: 0.7rem; font-weight: 800;">FULL TIME</span>
                        <span class="tag tag-success" style="font-size: 0.7rem; font-weight: 800;">₹${job.package} LPA</span>
                        <span class="tag tag-warning" style="font-size: 0.7rem; font-weight: 800;">CGPA: ${job.eligibility_cgpa}</span>
                    </div>

                    <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Closing Soon</span>
                        <button class="btn-primary" style="padding: 8px 16px; font-size: 0.8rem; border-radius: 8px;">Apply Now</button>
                    </div>
                </div>
            `).join('') : `
                <div style="grid-column: 1/-1; padding: 80px; text-align: center; color: var(--text-muted);">
                    <ion-icon name="search-outline" style="font-size: 3rem; margin-bottom: 16px;"></ion-icon>
                    <h3>No matching jobs found</h3>
                    <p>Try a different keyword or check back later.</p>
                </div>
            `}
        </div>
    `;

    const searchInput = document.getElementById('job-search');
    if (searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(searchQuery.length, searchQuery.length);
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            filteredJobs = allJobs.filter(j => 
                j.role.toLowerCase().includes(searchQuery.toLowerCase()) || 
                j.comp_name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            renderPage(container);
        });
    }
}
export function search(query) {
    searchQuery = query;
    const searchInput = document.getElementById('job-search');
    if (searchInput) {
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input'));
    }
}
