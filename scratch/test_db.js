import pool from '../server/db.js';

async function test() {
    try {
        const [students] = await pool.query('SELECT COUNT(*) AS count FROM STUDENT');
        const [companies] = await pool.query('SELECT COUNT(*) AS count FROM COMPANY');
        const [applications] = await pool.query('SELECT COUNT(*) AS count FROM APPLICATION');
        const [verified] = await pool.query("SELECT COUNT(*) AS count FROM STUDENT WHERE profile_status IN ('active')");
        const [interviews] = await pool.query("SELECT COUNT(*) AS count FROM APPLICATION WHERE status IN ('under_review', 'shortlisted')");
        const [offers] = await pool.query("SELECT COUNT(DISTINCT s_id) AS count FROM APPLICATION WHERE status IN ('selected')");
        const [totalJobOffers] = await pool.query("SELECT COUNT(*) AS count FROM APPLICATION WHERE status IN ('selected')");

        const [trend] = await pool.query(`
            SELECT DATE_FORMAT(applied_date, '%b') AS label,
                   MONTH(applied_date) AS monthIndex,
                   SUM(CASE WHEN status IN ('selected') THEN 1 ELSE 0 END) AS placements
            FROM APPLICATION
            WHERE applied_date IS NOT NULL
            GROUP BY MONTH(applied_date), DATE_FORMAT(applied_date, '%b')
            ORDER BY monthIndex
            LIMIT 6
        `);

        const [tiers] = await pool.query(`
            SELECT COALESCE(tier, 'Unknown') AS label, COUNT(*) AS value
            FROM COMPANY
            GROUP BY COALESCE(tier, 'Unknown')
            ORDER BY value DESC
        `);

        const [departments] = await pool.query(`
            SELECT COALESCE(s.dept, 'Unknown') AS name, COUNT(DISTINCT a.s_id) AS placed
            FROM APPLICATION a
            JOIN STUDENT s ON s.s_id = a.s_id
            WHERE a.status IN ('selected')
            GROUP BY COALESCE(s.dept, 'Unknown')
            ORDER BY placed DESC
            LIMIT 3
        `);

        const [topCompanies] = await pool.query(`
            SELECT c.comp_name AS name, COALESCE(c.industry_type, 'N/A') AS industry,
                   SUM(CASE WHEN a.status IN ('selected') THEN 1 ELSE 0 END) AS offers
            FROM COMPANY c
            LEFT JOIN JOB_PROFILE j ON j.comp_id = c.comp_id
            LEFT JOIN APPLICATION a ON a.job_id = j.job_id
            GROUP BY c.comp_id, c.comp_name, c.industry_type
            ORDER BY offers DESC, c.comp_name ASC
            LIMIT 5
        `);

        const [records] = await pool.query(`
            SELECT s.s_name AS student,
                   COALESCE(s.dept, 'Unknown') AS department,
                   COALESCE(c.comp_name, '-') AS company,
                   COALESCE(j.package, 0) AS packageLpa,
                   a.status
            FROM APPLICATION a
            JOIN STUDENT s ON s.s_id = a.s_id
            LEFT JOIN JOB_PROFILE j ON j.job_id = a.job_id
            LEFT JOIN COMPANY c ON c.comp_id = j.comp_id
            ORDER BY a.applied_date DESC
            LIMIT 50
        `);

        console.log("All queries executed successfully.");
        process.exit(0);
    } catch(e) {
        console.error('Error:', e);
        process.exit(1);
    }
}
test();
