import pool from './db.js';
async function test() {
    try {
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
        sql += ` ORDER BY appliedYear DESC, id DESC `;
        const [rows] = await pool.query(sql);
        console.log("Success! Rows:", rows.length);
    } catch (e) {
        console.error("SQL Error:", e.message);
    } finally {
        process.exit();
    }
}
test();
