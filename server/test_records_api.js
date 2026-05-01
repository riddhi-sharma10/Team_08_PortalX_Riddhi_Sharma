import express from 'express';
import adminRouter from './routes/admin.js';

async function test() {
    // Just mock req, res
    const req = { query: { year: '2026' }, user: { role: 'admin' } };
    const res = {
        json: (data) => console.log("Rows length:", data.rows.length, "Available years:", data.availableYears),
        status: (code) => ({ json: (err) => console.error("Error", code, err) })
    };
    
    // We can't easily run the express router directly without a real request,
    // so let's just copy the exact logic from records endpoint:
    const { default: pool } = await import('./db.js');
    
    try {
        const { status = 'all', department = 'all', query = '', year = 'all' } = req.query;
        let sql = `
            SELECT * FROM (
                SELECT a.app_id AS id, s.s_name AS student, COALESCE(s.dept, 'Unknown') AS department, 
                       COALESCE(c.comp_name, '-') AS company, COALESCE(j.package, 0) AS packageLpa, 
                       COALESCE(a.status, 'Applied') AS status, YEAR(a.applied_date) AS appliedYear
                FROM APPLICATION a
                JOIN STUDENT s ON s.s_id = a.s_id
                LEFT JOIN JOB_PROFILE j ON j.job_id = a.job_id
                LEFT JOIN COMPANY c ON c.comp_id = j.comp_id
                WHERE a.status NOT IN ('selected', 'placed', 'accepted')
                UNION ALL
                SELECT pr.record_id AS id, s.s_name AS student, COALESCE(s.dept, 'Unknown') AS department,
                       c.comp_name AS company, pr.salary_offered AS packageLpa,
                       'placed' AS status, pr.academic_year AS appliedYear
                FROM PLACEMENT_RECORD pr
                JOIN STUDENT s ON s.s_id = pr.s_id
                JOIN COMPANY c ON c.comp_id = pr.comp_id
            ) as combined
        `;
        const params = [];
        if (year !== 'all') {
            sql += ` WHERE appliedYear = ? `;
            params.push(Number(year));
        }
        sql += ` ORDER BY appliedYear DESC, id DESC `;

        const [rows] = await pool.query(sql, params);

        const q = String(query).toLowerCase();
        function normalizeStatus(status) { const value = String(status || '').toLowerCase(); if (['selected', 'placed', 'accepted'].includes(value)) return 'placed'; if (['under_review', 'shortlisted'].includes(value)) return 'in-progress'; if (value === 'rejected') return 'rejected'; return 'in-progress'; }
        const filtered = rows.filter((row) => (!q || [row.student, row.department, row.company, row.status].join(' ').toLowerCase().includes(q)) && (status === 'all' || normalizeStatus(row.status) === status) && (department === 'all' || row.department === department)).map((row) => ({ ...row, initials: String(row.student || '').split(' ').slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase(), packageLpa: Number(row.packageLpa || 0), status: normalizeStatus(row.status) }));

        const [yearsRes] = await pool.query(`
            SELECT DISTINCT YEAR(applied_date) AS yr FROM APPLICATION WHERE applied_date IS NOT NULL
            UNION
            SELECT DISTINCT graduation_yr AS yr FROM STUDENT WHERE graduation_yr IS NOT NULL
            UNION
            SELECT DISTINCT academic_year AS yr FROM PLACEMENT_RECORD WHERE academic_year IS NOT NULL
            ORDER BY yr DESC
        `);
        const availableYears = yearsRes.map((r) => r.yr);

        res.json({ rows: filtered, availableYears });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
test();
