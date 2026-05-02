import pool from './db.js';

async function testAnalytics() {
    try {
        const [students] = await pool.query(`SELECT COUNT(*) AS count FROM STUDENT s`);
        const [applications] = await pool.query(`SELECT COUNT(*) AS count FROM APPLICATION`);
        const [placed] = await pool.query(`SELECT COUNT(DISTINCT s_id) AS count FROM PLACEMENT_RECORD`);
        const [maxPkg] = await pool.query(`SELECT MAX(salary_offered) AS val FROM PLACEMENT_RECORD`);
        const [avgPkg] = await pool.query(`SELECT AVG(salary_offered) AS val FROM PLACEMENT_RECORD`);

        console.log({
            students: students[0].count,
            applications: applications[0].count,
            placed: placed[0].count,
            maxPkg: maxPkg[0].val,
            avgPkg: avgPkg[0].val
        });
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
    }
}
testAnalytics();
