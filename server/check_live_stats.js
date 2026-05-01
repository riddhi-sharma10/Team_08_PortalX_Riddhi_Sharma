import { default as pool } from './db.js';

async function check() {
    try {
        console.log("Checking DB logic exactly as admin.js /records does...");

        for (const year of ['all', 2024, 2025, 2026]) {
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
            
            const [rows] = await pool.query(sql, params);
            const placed = rows.filter(r => r.status === 'placed' || r.status === 'Placed');
            
            let avg = '0.0';
            if (placed.length > 0) {
                avg = (placed.reduce((s, r) => s + Number(r.packageLpa), 0) / placed.length).toFixed(1);
            }
            let highest = '0.0';
            if (placed.length > 0) {
                highest = Math.max(...placed.map(r => Number(r.packageLpa))).toFixed(1);
            }
            
            console.log(`\n--- Year: ${year} ---`);
            console.log(`Total Records (including In Progress): ${rows.length}`);
            console.log(`Total Placements: ${placed.length}`);
            console.log(`Average Package (Placed): ${avg}`);
            console.log(`Highest Package (Placed): ${highest}`);
        }

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
