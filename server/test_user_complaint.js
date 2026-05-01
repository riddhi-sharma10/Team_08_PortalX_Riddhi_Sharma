import { default as pool } from './db.js';

async function test() {
    try {
        console.log("---- Testing Year 2025 ----");
        
        // 1. Total records in APPLICATION for 2025
        const [appCount] = await pool.query(`SELECT COUNT(*) as c FROM APPLICATION WHERE YEAR(applied_date) = 2025 AND status NOT IN ('selected', 'placed', 'accepted')`);
        console.log("Applications for 2025 (in progress/rejected):", appCount[0].c);
        
        // 2. Total records in PLACEMENT_RECORD for 2025
        const [prCount] = await pool.query(`SELECT COUNT(*) as c FROM PLACEMENT_RECORD WHERE academic_year = 2025`);
        console.log("Placement Records for 2025:", prCount[0].c);

        console.log("Total for combined table:", Number(appCount[0].c) + Number(prCount[0].c));

        // 3. True Total Placements for 2025
        const [truePlacements] = await pool.query(`SELECT COUNT(DISTINCT s_id) as c FROM PLACEMENT_RECORD WHERE academic_year = 2025`);
        console.log("True Unique Students Placed in 2025:", truePlacements[0].c);

        // 4. True Average Package for 2025
        const [trueAvg] = await pool.query(`SELECT AVG(salary_offered) as c FROM PLACEMENT_RECORD WHERE academic_year = 2025`);
        console.log("True Average Package for 2025:", Number(trueAvg[0].c).toFixed(1));

        // 5. True Highest Package for 2025
        const [trueHighest] = await pool.query(`SELECT MAX(salary_offered) as c FROM PLACEMENT_RECORD WHERE academic_year = 2025`);
        console.log("True Highest Package for 2025:", Number(trueHighest[0].c).toFixed(1));
        
        // Let's also test the exact query from /records
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
        const [rows] = await pool.query(sql + ' WHERE appliedYear = 2025 ');
        console.log("Combined Rows for 2025:", rows.length);
        
        const placedRows = rows.filter(r => r.status === 'placed');
        console.log("Placed rows in combined:", placedRows.length);
        
        const avgPkg = rows.length ? (rows.reduce((s, r) => s + Number(r.packageLpa), 0) / rows.length).toFixed(1) : 0;
        console.log("Combined Average Package:", avgPkg);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
