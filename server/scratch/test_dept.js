import pool from '../db.js';

async function testDeptStats() {
    const [rows] = await pool.query(`
        SELECT
            COALESCE(s.dept, 'Unknown') AS name,
            COUNT(DISTINCT s.s_id) AS totalStudents,
            COUNT(DISTINCT CASE WHEN a.status IN ('selected') THEN a.s_id END) AS placedCount
        FROM STUDENT s
        LEFT JOIN APPLICATION a ON a.s_id = s.s_id
        LEFT JOIN JOB_PROFILE j ON j.job_id = a.job_id
        GROUP BY COALESCE(s.dept, 'Unknown')
        ORDER BY placedCount DESC
    `);
    
    for (const d of rows) {
        const pct = Math.round((Number(d.placedCount) / Number(d.totalStudents)) * 100);
        console.log(`${d.name}: ${d.placedCount}/${d.totalStudents} students placed = ${pct}%`);
    }
    process.exit(0);
}

testDeptStats();
