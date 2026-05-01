import { default as pool } from './db.js';

async function test() {
    const sql = `
SELECT CASE 
    WHEN s.profile_status = 'opted_out' THEN 'Opted Out' 
    WHEN s.profile_status = 'not_eligible' THEN 'Not Eligible' 
    WHEN best_pr.record_id IS NOT NULL THEN 'Placed' 
    WHEN latest_app.status IN ('under_review', 'shortlisted', 'applied') THEN 'In Progress' 
    WHEN latest_app.status = 'rejected' THEN 'Rejected' 
    ELSE 'Active' 
END AS status 
FROM STUDENT s 
LEFT JOIN ( 
    SELECT pr1.* 
    FROM PLACEMENT_RECORD pr1 
    JOIN ( SELECT s_id, MAX(record_id) as max_id FROM PLACEMENT_RECORD GROUP BY s_id ) pr2 ON pr1.s_id = pr2.s_id AND pr1.record_id = pr2.max_id 
) best_pr ON s.s_id = best_pr.s_id 
LEFT JOIN ( 
    SELECT a1.* 
    FROM APPLICATION a1 
    JOIN ( SELECT s_id, MAX(app_id) as max_id FROM APPLICATION GROUP BY s_id ) a2 ON a1.s_id = a2.s_id AND a1.app_id = a2.max_id 
) latest_app ON s.s_id = latest_app.s_id AND best_pr.record_id IS NULL`;
    const [rows] = await pool.query(sql);
    const c = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status]||0)+1; return acc; }, {});
    console.log(c);
    process.exit(0);
}
test();
