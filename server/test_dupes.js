import { default as pool } from './db.js';

async function test() {
    const sql = `
SELECT 
    s.s_id AS id, 
    s.s_name AS student 
FROM STUDENT s
LEFT JOIN (
    SELECT pr1.* 
    FROM PLACEMENT_RECORD pr1
    JOIN (
        SELECT s_id, MAX(record_id) as max_id 
        FROM PLACEMENT_RECORD GROUP BY s_id
    ) pr2 ON pr1.s_id = pr2.s_id AND pr1.record_id = pr2.max_id
) best_pr ON s.s_id = best_pr.s_id
LEFT JOIN COMPANY c ON best_pr.comp_id = c.comp_id
LEFT JOIN (
    SELECT a1.* 
    FROM APPLICATION a1
    JOIN (
        SELECT s_id, MAX(app_id) as max_id 
        FROM APPLICATION GROUP BY s_id
    ) a2 ON a1.s_id = a2.s_id AND a1.app_id = a2.max_id
) latest_app ON s.s_id = latest_app.s_id AND best_pr.record_id IS NULL
LEFT JOIN JOB_PROFILE aj ON latest_app.job_id = aj.job_id
LEFT JOIN COMPANY ac ON aj.comp_id = ac.comp_id
ORDER BY COALESCE(best_pr.academic_year, s.graduation_yr) DESC, s.s_id DESC
LIMIT 50
    `;
    const [rows] = await pool.query(sql);
    const counts = rows.reduce((acc, row) => { 
        acc[row.id] = (acc[row.id] || 0) + 1; 
        return acc; 
    }, {});
    const dupes = Object.entries(counts).filter(([id, c]) => c > 1);
    console.log('Total rows:', rows.length);
    console.log('Unique s_ids:', Object.keys(counts).length);
    console.log('Dupes:', dupes);
    process.exit(0);
}
test();
