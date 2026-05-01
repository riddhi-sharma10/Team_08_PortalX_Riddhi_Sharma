import { default as pool } from './db.js';

async function test() {
    try {
        const sql = `
SELECT 
    s.s_id AS id, 
    s.s_name AS student, 
    COALESCE(s.dept, 'Unknown') AS department,
    
    CASE 
        WHEN s.profile_status = 'opted_out' THEN '-'
        WHEN pr.comp_id IS NOT NULL THEN COALESCE(c.comp_name, '-')
        WHEN latest_app.job_id IS NOT NULL THEN COALESCE(ac.comp_name, '-')
        ELSE '-'
    END AS company,
    
    CASE 
        WHEN s.profile_status = 'opted_out' THEN 0
        WHEN pr.comp_id IS NOT NULL THEN pr.salary_offered
        WHEN latest_app.job_id IS NOT NULL THEN COALESCE(aj.package, 0)
        ELSE 0
    END AS packageLpa,
    
    CASE 
        WHEN s.profile_status = 'opted_out' THEN 'Opted Out'
        WHEN s.profile_status = 'not_eligible' THEN 'Not Eligible'
        WHEN pr.record_id IS NOT NULL THEN 'Placed'
        WHEN latest_app.status IN ('under_review', 'shortlisted') THEN 'In Progress'
        WHEN latest_app.status = 'rejected' THEN 'Rejected'
        WHEN latest_app.status = 'applied' THEN 'In Progress'
        ELSE 'Active'
    END AS status,
    
    s.graduation_yr AS appliedYear
FROM STUDENT s
LEFT JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id
LEFT JOIN COMPANY c ON pr.comp_id = c.comp_id
LEFT JOIN (
    SELECT a1.* 
    FROM APPLICATION a1
    JOIN (
        SELECT s_id, MAX(app_id) as max_id 
        FROM APPLICATION GROUP BY s_id
    ) a2 ON a1.s_id = a2.s_id AND a1.app_id = a2.max_id
) latest_app ON s.s_id = latest_app.s_id AND pr.record_id IS NULL
LEFT JOIN JOB_PROFILE aj ON latest_app.job_id = aj.job_id
LEFT JOIN COMPANY ac ON aj.comp_id = ac.comp_id
        `;
        const [rows] = await pool.query(sql);
        console.log("Total rows:", rows.length);
        console.log("Sample:", rows[0]);
        console.log("Statuses:", rows.reduce((acc, curr) => { acc[curr.status] = (acc[curr.status]||0)+1; return acc; }, {}));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
test();
