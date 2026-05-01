import pool from '../db.js';

async function testAllYears() {
    for (const year of [2024, 2025, 2026, 'all']) {
        console.log(`\n===== YEAR: ${year} =====`);
        
        const yearFilter = year === 'all' ? '' : `AND YEAR(a.applied_date) = ${year}`;
        const studFilter = year === 'all' ? '' : `WHERE s.graduation_yr = ${year}`;
        
        const [deptStats] = await pool.query(`
            SELECT
                COALESCE(s.dept, 'Unknown') AS name,
                COUNT(DISTINCT s.s_id) AS totalStudents,
                COUNT(DISTINCT CASE WHEN a.status IN ('selected') THEN a.s_id END) AS placedCount,
                AVG(CASE WHEN a.status IN ('selected') THEN j.package ELSE NULL END) AS avgLpa
            FROM STUDENT s
            LEFT JOIN APPLICATION a ON a.s_id = s.s_id ${yearFilter}
            LEFT JOIN JOB_PROFILE j ON j.job_id = a.job_id
            ${studFilter}
            GROUP BY COALESCE(s.dept, 'Unknown')
            ORDER BY placedCount DESC
        `);
        for (const d of deptStats) {
            const pct = Math.round((Number(d.placedCount) / Number(d.totalStudents)) * 100);
            console.log(`  ${d.name}: ${d.placedCount}/${d.totalStudents} = ${pct}%, avg=${Number(d.avgLpa||0).toFixed(1)} LPA`);
        }

        const [salary] = await pool.query(`
            SELECT
                COALESCE(s.dept, 'Unknown') AS dept,
                SUM(CASE WHEN j.package < 5 THEN 1 ELSE 0 END) AS below5,
                SUM(CASE WHEN j.package >= 5 AND j.package < 10 THEN 1 ELSE 0 END) AS range5to10,
                SUM(CASE WHEN j.package >= 10 AND j.package < 20 THEN 1 ELSE 0 END) AS range10to20,
                SUM(CASE WHEN j.package >= 20 THEN 1 ELSE 0 END) AS above20
            FROM APPLICATION a
            JOIN JOB_PROFILE j ON j.job_id = a.job_id
            JOIN STUDENT s ON s.s_id = a.s_id
            WHERE a.status IN ('selected') ${yearFilter}
            GROUP BY COALESCE(s.dept, 'Unknown')
        `);
        if (salary.length) {
            console.log('  Salary by branch:');
            for (const r of salary) {
                console.log(`    ${r.dept}: <5=${r.below5}, 5-10=${r.range5to10}, 10-20=${r.range10to20}, >20=${r.above20}`);
            }
        } else {
            console.log('  No salary data');
        }
    }
    process.exit(0);
}
testAllYears();
