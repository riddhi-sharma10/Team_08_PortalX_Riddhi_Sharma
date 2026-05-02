
import pool from './db.js';

async function check() {
    try {
        console.log('--- EXACT SQL TEST ---');
        
        const sid = 1; // Sai Ram
        const sql = `
            SELECT j.role, c.comp_name, j.package, j.app_deadline
            FROM JOB_PROFILE j
            JOIN COMPANY c ON j.comp_id = c.comp_id
            JOIN STUDENT s ON s.s_id = ?
            WHERE j.status = 'open'
            AND j.eligibility_cgpa <= s.cgpa
            AND j.job_id NOT IN (SELECT job_id FROM APPLICATION WHERE s_id = s.s_id)
            LIMIT 5
        `;

        console.log('Running SQL with ID:', sid);
        const [rows] = await pool.query(sql, [sid]);
        console.log('Rows Returned:', rows.length);
        console.log('Sample Data:', rows);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
