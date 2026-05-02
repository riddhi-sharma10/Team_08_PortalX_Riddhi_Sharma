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
    const years = ["2026", "2025", "2024"];
    let currentYear = "2024";

    const renderSelf = () => {
        const filteredRecords = archiveData.filter(record => record.year.toString() === currentYear);

        container.innerHTML = `
            <div class="dashboard-header" style="margin-bottom: 32px;">
                <h1 style="font-size: 2rem; color: var(--primary);">Placement History</h1>
                <p style="color: var(--text-muted);">View company visit records and statistics from selected years.</p>
            </div>

            <div class="card" style="margin-bottom: 32px;">
                <div style="display: flex; gap: 16px; align-items: flex-end;">
                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                        <label>SELECT ACADEMIC YEAR</label>
                        <select id="year-select" style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
                            ${years.map(y => `<option value="${y}" ${currentYear === y ? 'selected' : ''}>${y}</option>`).join('')}
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
                                <th style="padding: 16px;">Comp ID</th>
                                <th style="padding: 16px;">Company Name</th>
                                <th style="padding: 16px; text-align:center;">Total Placed</th>
                                <th style="padding: 16px;">Highest Package</th>
                                <th style="padding: 16px;">Average Package</th>
                                <th style="padding: 16px;">Lowest Package</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredRecords.length > 0 
                                ? filteredRecords.map(record => {
                                    const h = parseFloat(record.highest) || 0;
                                    const a = parseFloat(record.average) || 0;
                                    const l = parseFloat(record.lowest) || 0;
                                    return `
                                        <tr style="border-bottom: 1px solid var(--border);">
                                            <td style="padding: 16px; font-weight: 600; color: var(--primary);">${record.year}</td>
                                            <td style="padding: 16px; color: var(--text-muted); font-family: monospace;">#${String(record.comp_id || '').padStart(3, '0')}</td>
                                            <td style="padding: 16px;"><b>${record.comp_name}</b></td>
                                            <td style="padding: 16px; text-align:center;"><span style="background:#f1f5f9; padding:4px 12px; border-radius:20px; font-weight:700;">${record.placed || 0}</span></td>
                                            <td style="padding: 16px; color: var(--success); font-weight: 700;">${h > 0 ? `₹${h.toFixed(2)} LPA` : 'N/A'}</td>
                                            <td style="padding: 16px; font-weight: 600;">${a > 0 ? `₹${a.toFixed(2)} LPA` : 'N/A'}</td>
                                            <td style="padding: 16px; color: #64748b; font-weight: 600;">${l > 0 ? `₹${l.toFixed(2)} LPA` : 'N/A'}</td>
                                        </tr>
                                    `;
                                }).join('')
                                : `<tr>
                                    <td colspan="7" style="text-align: center; padding: 60px 48px; color: var(--text-muted); line-height: 1.6;">
                                        ${currentYear === '2026' 
                                            ? `<div style="font-size: 1.1rem;"><b style="color: var(--primary);">Still in progress</b>, it will be updated once the placement will done for this year students.</div>`
                                            : 'No placement records found for this year.'
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
            renderSelf();
        });
    };

    renderSelf();
}

