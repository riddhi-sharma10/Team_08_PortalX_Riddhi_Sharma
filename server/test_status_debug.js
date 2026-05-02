import pool from './db.js';

const [rows] = await pool.query(`
    SELECT 
        s.s_name AS student,
        s.profile_status AS raw_profile_status,
        CASE 
            WHEN s.profile_status = 'opted_out' THEN 'opted_out'
            WHEN s.profile_status = 'not_eligible' THEN 'not_eligible'
            WHEN best_pr.record_id IS NOT NULL THEN 'placed'
            WHEN latest_app.status IN ('under_review', 'shortlisted', 'applied') THEN 'in-progress'
            WHEN latest_app.status = 'rejected' THEN 'rejected'
            ELSE 'active'
        END AS computed_status
    FROM STUDENT s
    LEFT JOIN (
        SELECT pr1.* FROM PLACEMENT_RECORD pr1
        JOIN (SELECT s_id, MAX(record_id) as max_id FROM PLACEMENT_RECORD GROUP BY s_id) pr2
        ON pr1.s_id = pr2.s_id AND pr1.record_id = pr2.max_id
    ) best_pr ON s.s_id = best_pr.s_id
    LEFT JOIN (
        SELECT a1.* FROM APPLICATION a1
        JOIN (SELECT s_id, MAX(app_id) as max_id FROM APPLICATION GROUP BY s_id) a2
        ON a1.s_id = a2.s_id AND a1.app_id = a2.max_id
    ) latest_app ON s.s_id = latest_app.s_id AND best_pr.record_id IS NULL
    LIMIT 30
`);

console.log('\n=== STATUS BREAKDOWN ===');
const statusCounts = {};
rows.forEach(r => {
    statusCounts[r.computed_status] = (statusCounts[r.computed_status] || 0) + 1;
});
console.log('Counts:', statusCounts);

console.log('\n=== OPTED OUT SAMPLES ===');
const optedOut = rows.filter(r => r.raw_profile_status === 'opted_out');
console.log(`Found ${optedOut.length} opted_out students (in first 30)`);
optedOut.slice(0, 5).forEach(r => {
    console.log(`  ${r.student} → raw: ${r.raw_profile_status} | computed: ${r.computed_status}`);
});

process.exit(0);
