import { api } from '../api.js';

export async function render(container, app) {
    container.innerHTML = `<div style="padding:24px;"><h2>Fetching placement archives...</h2></div>`;

    try {
        const historyData = await api.get('/analytics/history');
        renderHistoryPage(container, historyData);
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding:24px; color:#ef4444;">Sync Error: ${err.message}</div>`;
    }
}

function renderHistoryPage(container, archiveData) {
    // Only keep specified years
    const years = ["2026", "2025", "2024"];
    const depts = [...new Set(archiveData.map(r => r.dept))].filter(Boolean).sort();

    let currentYear = "2024"; // Default to 2024 as requested
    let currentDept = "All Departments";

    const renderSelf = () => {
        const filteredRecords = archiveData.filter(record => {
            const matchYear = record.year === currentYear;
            const matchDept = currentDept === "All Departments" || record.dept === currentDept;
            return matchYear && matchDept;
        });

        container.innerHTML = `
            <div class="dashboard-header" style="margin-bottom: 32px;">
                <h1 style="font-size: 2rem; color: var(--primary);">Placement History</h1>
                <p style="color: var(--text-muted);">View companies and placement records from selected years.</p>
            </div>

            <div class="card" style="margin-bottom: 32px;">
                <div style="display: flex; gap: 16px; align-items: flex-end;">
                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                        <label>SELECT ACADEMIC YEAR</label>
                        <select id="year-select" style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
                            ${years.map(y => `<option value="${y}" ${currentYear === y ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                        <label>DEPARTMENT</label>
                        <select id="dept-select" style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
                            <option value="All Departments">All Departments</option>
                            ${depts.map(d => `<option value="${d}" ${currentDept === d ? 'selected' : ''}>${d}</option>`).join('')}
                        </select>
                    </div>
                    <button class="btn-primary" id="search-history-btn" style="min-width: 150px;">Search Records</button>
                </div>
            </div>

            <div class="card">
                <div class="data-table-container">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 1px solid var(--border);">
                                <th style="padding: 16px;">Year</th>
                                <th style="padding: 16px;">Dept</th>
                                <th style="padding: 16px;">Company</th>
                                <th style="padding: 16px;">Job Role</th>
                                <th style="padding: 16px;">Total Placed</th>
                                <th style="padding: 16px;">Highest Package</th>
                                <th style="padding: 16px;">Average Package</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredRecords.length > 0 
                                ? filteredRecords.map(record => `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 16px; font-weight: 600; color: var(--primary);">${record.year}</td>
                                        <td style="padding: 16px;"><span class="tag tag-info" style="font-size:0.75rem; white-space:nowrap;">${record.dept || 'N/A'}</span></td>
                                        <td style="padding: 16px;"><b>${record.comp_name}</b></td>
                                        <td style="padding: 16px; font-size:0.9rem; color:var(--text-muted);">${record.role || 'N/A'}</td>
                                        <td style="padding: 16px; text-align:center;"><span style="background:#f1f5f9; padding:4px 12px; border-radius:20px; font-weight:700;">${record.placed}</span></td>
                                        <td style="padding: 16px; color: var(--success); font-weight: 700;">${record.highest}</td>
                                        <td style="padding: 16px; font-weight: 600;">${record.average}</td>
                                    </tr>
                                `).join('')
                                : `<tr>
                                    <td colspan="7" style="text-align: center; padding: 60px 48px; color: var(--text-muted); line-height: 1.6;">
                                        ${currentYear === '2026' 
                                            ? `<div style="font-size: 1.1rem;"><b style="color: var(--primary);">Still in progress</b>, it will be updated once the placement will done for this year students.</div>`
                                            : 'No placement records found for this criteria.'
                                        }
                                    </td>
                                   </tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        setupHandlers();
    };

    const setupHandlers = () => {
        document.getElementById('search-history-btn').addEventListener('click', () => {
            currentYear = document.getElementById('year-select').value;
            currentDept = document.getElementById('dept-select').value;
            renderSelf();
        });
    };

    renderSelf();
}
