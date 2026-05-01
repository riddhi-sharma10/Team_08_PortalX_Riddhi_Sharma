import pool from './db.js';
async function test() {
    try {
        const [yearsRes] = await pool.query(`
            SELECT DISTINCT YEAR(applied_date) AS yr FROM APPLICATION WHERE applied_date IS NOT NULL
            UNION
            SELECT DISTINCT graduation_yr AS yr FROM STUDENT WHERE graduation_yr IS NOT NULL
            UNION
            SELECT DISTINCT academic_year AS yr FROM PLACEMENT_RECORD WHERE academic_year IS NOT NULL
            ORDER BY yr DESC
        `);
        console.log("Years:", yearsRes.map(r=>r.yr));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
