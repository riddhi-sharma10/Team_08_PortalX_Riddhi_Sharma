import { api } from '../api.js';

let availableRoles = [];
let roleDescriptions = {};

export async function render(container, app) {
    container.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:60vh;">
            <div style="text-align:center;">
                <ion-icon name="sync-outline" style="font-size:3rem; color:var(--primary); animation:spin 1s linear infinite;"></ion-icon>
                <p style="color:var(--text-muted); margin-top:16px;">Loading ATS Data...</p>
            </div>
        </div>`;

    try {
        try {
            const res = await api.get('/resumes/roles');
            if (res.roles) {
                availableRoles = res.roles;
                roleDescriptions = res.descriptions || {};
            } else if (Array.isArray(res)) {
                availableRoles = res;
            }
        } catch (_) {}

        if (availableRoles.length === 0) {
            availableRoles = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Data Analyst', 'DevOps Engineer'];
        }

        const resumes = await api.get('/resumes');
        renderATSPage(container, resumes);
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding:40px; text-align:center; margin:24px;">
            <ion-icon name="alert-circle-outline" style="font-size:3rem; color:var(--danger);"></ion-icon>
            <h2 style="margin-top:16px;">Failed to load ATS</h2>
            <p style="color:var(--text-muted);">${err.message}</p>
        </div>`;
    }
}

function renderATSPage(container, resumes) {
    const latest = resumes[0] || null;
    const best = resumes.length ? Math.max(...resumes.map(r => Number(r.score || 0))) : 0;
    const avg = resumes.length ? Math.round(resumes.reduce((s, r) => s + Number(r.score || 0), 0) / resumes.length) : 0;
    
    const roleOptions = availableRoles.map(r => `<option value="${r}">${r}</option>`).join('');

    container.innerHTML = `
        <div class="dashboard-shell">
            <!-- Header -->
            <div style="margin-bottom: 24px;">
                <h1 style="font-size: 2.2rem; color: var(--primary); font-weight: 800; letter-spacing: -0.5px;">Check Your ATS Score</h1>
                <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 4px;">Upload your resume to get instant AI-driven feedback against specific job roles.</p>
            </div>

            <!-- Stats -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px;">
                ${renderStatCard('document-text', 'Total Scans', resumes.length, 'primary')}
                ${renderStatCard('trophy', 'Best Score', best ? best + '%' : '—', 'success')}
                ${renderStatCard('analytics', 'Average Score', avg ? avg + '%' : '—', 'warning')}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 32px; margin-bottom: 32px; align-items: start;">
                
                <!-- Upload Column -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <div class="card" style="padding: 28px;">
                        <h3 style="margin-bottom: 20px; color: var(--text-main); font-size: 1.25rem;">New Analysis</h3>
                        
                        <!-- Dropzone -->
                        <div id="drop-zone" style="border: 2px dashed var(--border); border-radius: 16px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc; margin-bottom: 20px;">
                            <input type="file" id="resume-file-input" accept=".pdf" style="display:none;">
                            <ion-icon name="cloud-upload-outline" id="drop-icon" style="font-size: 3.5rem; color: var(--primary); margin-bottom: 12px;"></ion-icon>
                            <h4 id="drop-title" style="margin: 0 0 8px; font-weight: 700; color: var(--text-main);">Click or drag PDF here</h4>
                            <p id="drop-sub" style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">Max size: 5MB</p>
                        </div>

                        <!-- Form -->
                        <div style="margin-bottom: 16px;">
                            <label style="display:block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase;">Target Role</label>
                            <select id="job-role-select" style="width: 100%; padding: 12px 16px; border: 1px solid var(--border); border-radius: 10px; font-size: 1rem; background: #f8fafc; outline: none; cursor: pointer;">
                                <option value="" disabled selected>Select a job role...</option>
                                ${roleOptions}
                            </select>
                            <p id="role-desc" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; display: none;"></p>
                        </div>

                        <button id="analyze-btn" type="button" class="btn-primary" style="width: 100%; padding: 14px; font-size: 1.05rem; justify-content: center;">
                            <ion-icon name="analytics-outline" id="analyze-icon" style="font-size: 1.2rem;"></ion-icon>
                            <span id="analyze-text">Start Analysis</span>
                        </button>
                    </div>
                </div>

                <!-- Result Column -->
                <div id="result-container" style="display: flex; flex-direction: column;">
                    ${latest ? '' : `
                        <div class="card" style="padding: 40px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #f8fafc; border: 1px dashed var(--border);">
                            <ion-icon name="document-lock-outline" style="font-size: 4rem; color: var(--text-muted); opacity: 0.5; margin-bottom: 16px;"></ion-icon>
                            <h3 style="color: var(--text-main); margin-bottom: 8px;">No Recent Analysis</h3>
                            <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 250px;">Upload a resume to see your ATS score breakdown and detailed feedback.</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- History Table -->
            <div class="card" style="padding: 24px;">
                <h3 style="margin-bottom: 20px; color: var(--text-main); font-size: 1.25rem;">Scan History</h3>
                <div class="data-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>File Name</th>
                                <th>Target Role</th>
                                <th>Score</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="history-tbody">
                            ${buildHistoryRows(resumes)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    setupHandlers(container);
    
    if (latest && latest.id) {
        loadResultDetails(latest.id);
    }
}

function renderStatCard(icon, label, value, type) {
    const classes = {
        primary: 'color: var(--primary); background: #f0f7ff;',
        success: 'color: var(--success); background: #f0fdf4;',
        warning: 'color: var(--warning); background: #fffbeb;',
        danger: 'color: var(--danger); background: #fef2f2;'
    };
    
    return `
        <div class="card" style="padding: 24px; display: flex; align-items: center; gap: 20px;">
            <div style="width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; ${classes[type]}">
                <ion-icon name="${icon}"></ion-icon>
            </div>
            <div>
                <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${label}</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); line-height: 1;">${value}</div>
            </div>
        </div>
    `;
}

function buildHistoryRows(resumes) {
    if (!resumes || !resumes.length) {
        return `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">No records yet.</td></tr>`;
    }
    return resumes.map((r, idx) => {
        const sc = Number(r.score || 0);
        const prev = resumes[idx + 1] ? Number(resumes[idx + 1].score) : null;
        const delta = prev !== null ? sc - prev : null;
        const color = sc >= 85 ? 'var(--success)' : sc >= 60 ? 'var(--warning)' : 'var(--danger)';
        const dateStr = new Date(r.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
        
        return `
            <tr style="cursor: pointer;" onclick="window.__loadAtsResult(${r.id})">
                <td style="font-size:0.9rem; color:var(--text-muted);">${dateStr}</td>
                <td style="font-weight:600; font-size:0.9rem;">${r.filename || '—'}</td>
                <td style="font-size:0.9rem;">${r.role_targeted || '—'}</td>
                <td>
                    <span style="font-weight:800; color:${color}; font-size:1.05rem;">${sc}%</span>
                    ${delta !== null ? `<span style="font-size:0.7rem; color:${delta >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-left:6px;">${delta >= 0 ? '▲' : '▼'}${Math.abs(delta)}</span>` : ''}
                </td>
                <td>
                    <button onclick="event.stopPropagation(); window.__deleteAts(${r.id})" style="background:none; border:none; color:var(--danger); font-size:1.2rem; cursor:pointer; padding:6px; border-radius:6px; transition:0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadResultDetails(id) {
    const container = document.getElementById('result-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="card" style="padding: 40px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <ion-icon name="sync-outline" style="font-size: 3rem; color: var(--primary); animation: spin 1s linear infinite;"></ion-icon>
            <p style="color: var(--text-muted); margin-top: 16px;">Loading results...</p>
        </div>`;
        
    try {
        const res = await api.get(`/resumes/${id}`);
        renderResult(res);
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding: 24px; color: var(--danger);">${err.message}</div>`;
    }
}

function renderResult(result) {
    const container = document.getElementById('result-container');
    if (!container) return;

    const sc = Number(result.score || result.ats_score || 0);
    const color = sc >= 85 ? 'var(--success)' : sc >= 60 ? 'var(--warning)' : 'var(--danger)';
    const grade = result.grade || (sc >= 85 ? 'A' : sc >= 70 ? 'B' : sc >= 55 ? 'C' : sc >= 40 ? 'D' : 'F');
    const role = result.jobRole || result.role_targeted || 'Unknown Role';
    
    const strokeOffset = 263.8 * (1 - sc / 100);

    const breakdown = result.breakdown || { 
        keyword: result.keyword_score || Math.round(sc * 0.6), 
        section: result.section_score || Math.round(sc * 0.25), 
        format: result.format_score || Math.round(sc * 0.15) 
    };
    const maxK = 50, maxS = 25, maxF = 15;

    let keywordsHtml = '';
    const found = result.foundKeywords || result.keywords_found || [];
    const missing = result.missingKeywords || result.keywords_missing || [];
    const bonus = result.bonusKeywords || [];
    
    console.log('[ATS Debug] Rendering result:', { score: sc, found, missing });

    if (found.length || missing.length) {
        keywordsHtml = `
            <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border);">
                <h4 style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Keyword Match Details</h4>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--success); display: block; margin-bottom: 8px;">✓ FOUND (${found.length})</span>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${found.map(k => `<span class="tag tag-success" style="font-size: 0.75rem;">${k}</span>`).join('')}
                        </div>
                    </div>
                    ${missing.length ? `
                    <div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--danger); display: block; margin-bottom: 8px;">✗ MISSING (${missing.length})</span>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${missing.map(k => `<span class="tag tag-danger" style="font-size: 0.75rem;">${k}</span>`).join('')}
                        </div>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    let formatHtml = '';
    if (result.formatChecks && result.formatChecks.length) {
        formatHtml = `
            <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border);">
                <h4 style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Formatting & Quality</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    ${result.formatChecks.map(c => `
                        <div style="display: flex; align-items: flex-start; gap: 8px;">
                            <ion-icon name="${c.pass ? 'checkmark-circle' : 'close-circle'}" style="font-size: 1.2rem; color: ${c.pass ? 'var(--success)' : 'var(--danger)'}; flex-shrink: 0;"></ion-icon>
                            <span style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">${c.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    let sectionsHtml = '';
    if (result.sections && result.sections.length) {
        sectionsHtml = `
            <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border);">
                <h4 style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Detected Sections</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${result.sections.map(s => `
                        <span style="font-size: 0.75rem; padding: 6px 12px; border-radius: 8px; background: ${s.found ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${s.found ? '#bbf7d0' : '#fecaca'}; color: ${s.found ? 'var(--success)' : 'var(--danger)'}; display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
                            <ion-icon name="${s.found ? 'checkmark' : 'close'}" style="font-size: 1rem;"></ion-icon>
                            ${s.name.toUpperCase()}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="card" style="padding: 32px; max-height: 800px; overflow-y: auto; display: flex; flex-direction: column; box-shadow: var(--shadow-lg);">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                <div>
                    <h3 style="font-size: 1.4rem; color: var(--text-main); margin: 0 0 6px; font-weight: 800;">Analysis Results</h3>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0;">For <b style="color: var(--primary);">${role}</b></p>
                </div>
                <div style="width: 56px; height: 56px; border-radius: 14px; background: ${color}15; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; border: 2px solid ${color}30;">
                    ${grade}
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 32px; margin-bottom: 16px;">
                <!-- Score Circle -->
                <div style="position: relative; width: 130px; height: 130px; flex-shrink: 0;">
                    <svg viewBox="0 0 100 100" style="transform: rotate(-90deg); width: 100%; height: 100%;">
                        <circle cx="50" cy="50" r="42" fill="transparent" stroke="#f1f5f9" stroke-width="10"/>
                        <circle cx="50" cy="50" r="42" fill="transparent" stroke="${color}" stroke-width="10" stroke-dasharray="263.8" stroke-dashoffset="${strokeOffset}" stroke-linecap="round" style="transition: stroke-dashoffset 1s ease-out;"/>
                    </svg>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                        <span style="font-size: 2.2rem; font-weight: 900; color: ${color}; line-height: 1;">${sc}</span>
                        <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-muted); display: block; margin-top: 2px;">SCORE</span>
                    </div>
                </div>
                
                <!-- Breakdown -->
                <div style="flex: 1;">
                    <p style="font-size: 0.95rem; color: var(--text-main); line-height: 1.5; font-weight: 500; margin: 0 0 20px;">
                        ${result.recommendation || (sc >= 80 ? 'Excellent match! Apply with confidence.' : 'Needs improvement. Focus on missing keywords.')}
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        ${renderBar('Keywords Match', breakdown.keyword, maxK, 'var(--primary)')}
                        ${renderBar('Section Completeness', breakdown.section, maxS, 'var(--accent)')}
                        ${renderBar('Format & Quality', breakdown.format, maxF, 'var(--info, #0284c7)')}
                    </div>
                </div>
            </div>

            ${keywordsHtml}
            ${sectionsHtml}
            ${formatHtml}

        </div>
    `;
}

function renderBar(label, val, max, color) {
    const pct = Math.min(100, (val / max) * 100);
    return `
        <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">${label}</span>
                <span style="font-size: 0.75rem; font-weight: 800; color: var(--text-main);">${val}<span style="color:var(--text-muted);font-weight:600;">/${max} pts</span></span>
            </div>
            <div style="height: 8px; background: #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="height: 100%; background: ${color}; width: ${pct}%; border-radius: 8px; transition: width 1s ease;"></div>
            </div>
        </div>
    `;
}

let selectedFile = null;

function setupHandlers(container) {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('resume-file-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const roleSelect = document.getElementById('job-role-select');
    const roleDesc = document.getElementById('role-desc');

    // Reset state on new render
    selectedFile = null;

    window.__loadAtsResult = (id) => loadResultDetails(id);
    
    window.__deleteAts = async (id) => {
        if (!confirm('Delete this record?')) return;
        try {
            await api.delete(`/resumes/${id}`);
            const resumes = await api.get('/resumes');
            const tbody = document.getElementById('history-tbody');
            if (tbody) tbody.innerHTML = buildHistoryRows(resumes);
            
            if (resumes.length === 0) {
                const rc = document.getElementById('result-container');
                if (rc) rc.innerHTML = `
                    <div class="card" style="padding: 40px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #f8fafc; border: 1px dashed var(--border);">
                        <ion-icon name="document-lock-outline" style="font-size: 4rem; color: var(--text-muted); opacity: 0.5; margin-bottom: 16px;"></ion-icon>
                        <h3 style="color: var(--text-main); margin-bottom: 8px;">No Recent Analysis</h3>
                        <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 250px;">Upload a resume to see your ATS score breakdown and detailed feedback.</p>
                    </div>`;
            } else {
                loadResultDetails(resumes[0].id);
            }
        } catch(e) { alert('Error deleting: ' + e.message); }
    };

    if (roleSelect && roleDescriptions) {
        roleSelect.addEventListener('change', (e) => {
            const desc = roleDescriptions[e.target.value];
            if (desc && roleDesc) {
                roleDesc.textContent = desc;
                roleDesc.style.display = 'block';
            }
        });
    }

    if (dropZone && fileInput) {
        // Remove old listeners by replacing the element or just being careful
        // Since we re-render the whole innerHTML, old listeners on old elements are gone.
        
        dropZone.onclick = () => fileInput.click();
        
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent)';
            dropZone.style.background = '#fffbeb';
        };
        
        dropZone.ondragleave = () => {
            if (!selectedFile) {
                dropZone.style.borderColor = 'var(--border)';
                dropZone.style.background = '#f8fafc';
            } else {
                dropZone.style.borderColor = 'var(--success)';
                dropZone.style.background = '#f0fdf4';
            }
        };
        
        dropZone.ondrop = (e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        };
        
        fileInput.onchange = (e) => {
            if (e.target.files[0]) handleFile(e.target.files[0]);
        };

        function handleFile(file) {
            if (!file.name.toLowerCase().endsWith('.pdf')) { alert('Only PDFs allowed.'); return; }
            if (file.size > 5 * 1024 * 1024) { alert('Max 5MB.'); return; }
            selectedFile = file;
            
            const titleEl = document.getElementById('drop-title');
            const subEl = document.getElementById('drop-sub');
            const iconEl = document.getElementById('drop-icon');
            
            if (titleEl) titleEl.textContent = file.name;
            if (subEl) subEl.textContent = `${(file.size/1024).toFixed(1)} KB - Ready to analyze`;
            if (iconEl) iconEl.setAttribute('name', 'document-text');
            
            dropZone.style.borderColor = 'var(--success)';
            dropZone.style.background = '#f0fdf4';
        }
    }

    if (analyzeBtn) {
        analyzeBtn.onclick = async () => {
            if (!selectedFile) {
                alert('Please select a PDF resume file first.');
                return;
            }
            if (!roleSelect.value) {
                alert('Please select a Target Role for analysis.');
                return;
            }

            const btnText = document.getElementById('analyze-text');
            const btnIcon = document.getElementById('analyze-icon');
            
            analyzeBtn.disabled = true;
            if (btnText) btnText.textContent = 'Scanning...';
            if (btnIcon) {
                btnIcon.setAttribute('name', 'sync');
                btnIcon.style.animation = 'spin 1s linear infinite';
            }

            try {
                const fd = new FormData();
                fd.append('resume', selectedFile);
                fd.append('jobRole', roleSelect.value);

                const rc = document.getElementById('result-container');
                if (rc) rc.innerHTML = `
                    <div class="card" style="padding: 40px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                        <ion-icon name="sync-outline" style="font-size: 3rem; color: var(--primary); animation: spin 1s linear infinite;"></ion-icon>
                        <p style="color: var(--text-muted); margin-top: 16px;">Analyzing resume structure and keywords...</p>
                    </div>`;

                const result = await api.postForm('/resumes/analyze', fd);
                renderResult(result);

                const updated = await api.get('/resumes');
                const tbody = document.getElementById('history-tbody');
                if (tbody) tbody.innerHTML = buildHistoryRows(updated);
                
                // Reset upload area
                selectedFile = null;
                if (fileInput) fileInput.value = '';
                
                const titleEl = document.getElementById('drop-title');
                const subEl = document.getElementById('drop-sub');
                const iconEl = document.getElementById('drop-icon');
                
                if (titleEl) titleEl.textContent = 'Click or drag PDF here';
                if (subEl) subEl.textContent = 'Max size: 5MB';
                if (iconEl) iconEl.setAttribute('name', 'cloud-upload-outline');
                
                if (dropZone) {
                    dropZone.style.borderColor = 'var(--border)';
                    dropZone.style.background = '#f8fafc';
                }

            } catch (e) {
                console.error('ANALYSIS ERROR:', e);
                // If it's a fetch error but server finished, try to get the latest anyway
                const resumes = await api.get('/resumes');
                if (resumes && resumes.length > 0) {
                    loadResultDetails(resumes[0].id);
                } else {
                    alert('Analysis failed: ' + e.message);
                }
            } finally {
                analyzeBtn.disabled = false;
                if (btnText) btnText.textContent = 'Start Analysis';
                if (btnIcon) {
                    btnIcon.setAttribute('name', 'analytics-outline');
                    btnIcon.style.animation = '';
                }
            }
        };
    }
}
