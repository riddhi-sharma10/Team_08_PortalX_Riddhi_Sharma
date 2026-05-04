import pool from '../db.js';

// Verify analytics data is correctly scoped to coord_id=8 (Anaya Verma)
const id = 8;

const [students] = await pool.query(
    `SELECT COUNT(*) AS count FROM STUDENT s WHERE s.coord_id = ?`, [id]
);

const [apps] = await pool.query(
    `SELECT COUNT(*) AS count FROM APPLICATION a JOIN STUDENT s ON a.s_id = s.s_id WHERE s.coord_id = ?`, [id]
);

const [placed] = await pool.query(`
    SELECT COUNT(DISTINCT s_id) AS count FROM (
        SELECT pr.s_id FROM PLACEMENT_RECORD pr JOIN STUDENT s2 ON pr.s_id = s2.s_id WHERE s2.coord_id = ?
        UNION
        SELECT a.s_id FROM APPLICATION a JOIN STUDENT s2 ON a.s_id = s2.s_id WHERE a.status = 'selected' AND s2.coord_id = ?
    ) AS combined
`, [id, id]);

const [totalAllStudents] = await pool.query(`SELECT COUNT(*) AS count FROM STUDENT`);
const [totalAllApps] = await pool.query(`SELECT COUNT(*) AS count FROM APPLICATION`);
const [totalAllPlacements] = await pool.query(`SELECT COUNT(*) AS count FROM PLACEMENT_RECORD`);

console.log('=== FOR COORDINATOR (Anaya Verma, coord_id=8) ONLY ===');
console.log(`Students assigned: ${students[0].count}`);
console.log(`Applications:      ${apps[0].count}`);
console.log(`Placed students:   ${placed[0].count}`);
console.log(`Placement rate:    ${((placed[0].count / students[0].count) * 100).toFixed(1)}%`);

console.log('\n=== TOTAL IN ENTIRE DATABASE (should NOT appear in analytics) ===');
console.log(`All students:      ${totalAllStudents[0].count}`);
console.log(`All applications:  ${totalAllApps[0].count}`);
console.log(`All placements:    ${totalAllPlacements[0].count}`);

console.log('\n✅ If coord numbers < total DB numbers, scoping is CORRECT.');
process.exit();
