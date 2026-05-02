import pool from './db.js';

async function test() {
    try {
        const dbRole = 'student';
        const sql = `
                SELECT
                    COALESCE(u.user_id, s.s_id) AS id,
                    COALESCE(s.s_name, u.username) AS name,
                    u.username,
                    COALESCE(s.email, CONCAT(u.username, '@university.edu')) AS email,
                    COALESCE(s.dept, '') AS branch,
                    CONCAT('ST-', LPAD(s.s_id, 4, '0')) AS entityId,
                    s.s_id AS entityIdRaw,
                    CASE 
                         WHEN s.profile_status = 'opted_out' THEN 'opted_out'
                         WHEN s.profile_status = 'not_eligible' THEN 'not_eligible'
                         WHEN best_pr.record_id IS NOT NULL THEN 'placed'
                         WHEN latest_app.status IN ('under_review', 'shortlisted', 'applied') THEN 'active'
                         WHEN latest_app.status = 'rejected' THEN 'rejected'
                         ELSE 'active'
                    END AS status,
                    'Standard' AS permission,
                    'student' AS role,
                    0 AS lastLoginDays
                FROM STUDENT s
                LEFT JOIN USER_ROLE u ON u.entity_id = s.s_id AND u.role = 'student'
                LEFT JOIN (
                    SELECT pr1.* 
                    FROM PLACEMENT_RECORD pr1
                    JOIN (
                        SELECT s_id, MAX(record_id) as max_id 
                        FROM PLACEMENT_RECORD GROUP BY s_id
                    ) pr2 ON pr1.s_id = pr2.s_id AND pr1.record_id = pr2.max_id
                ) best_pr ON s.s_id = best_pr.s_id
                LEFT JOIN (
                    SELECT a1.* 
                    FROM APPLICATION a1
                    JOIN (
                        SELECT s_id, MAX(app_id) as max_id 
                        FROM APPLICATION GROUP BY s_id
                    ) a2 ON a1.s_id = a2.s_id AND a1.app_id = a2.max_id
                ) latest_app ON s.s_id = latest_app.s_id AND best_pr.record_id IS NULL
            `;
        
        const [rows] = await pool.query(sql);
        console.log('Total students returned by query:', rows.length);
        const muskan = rows.find(r => String(r.name).toLowerCase().includes('muskan'));
        console.log('Muskan found:', muskan ? 'YES' : 'NO');
        if (muskan) console.log('Muskan details:', JSON.stringify(muskan, null, 2));

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
test();
