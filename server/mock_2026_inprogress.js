import { default as pool } from './db.js';

async function generate2026() {
    try {
        console.log("Adding 'In Progress' and 'Rejected' records for 2026...");

        // Find 80 students who DO NOT have a placement record
        const [rows] = await pool.query(`
            SELECT s_id FROM STUDENT 
            WHERE s_id NOT IN (SELECT s_id FROM PLACEMENT_RECORD)
            LIMIT 80
        `);

        if (rows.length === 0) {
            console.log("No available students to migrate to 2026.");
            process.exit(0);
        }

        const studentIds = rows.map(r => r.s_id);

        // Update these students to graduation_yr = 2026 and ensure they are 'active'
        await pool.query(`
            UPDATE STUDENT 
            SET graduation_yr = 2026, profile_status = 'active'
            WHERE s_id IN (?)
        `, [studentIds]);

        // Update all their applications to be applied in 2026
        // Let's randomize the month between Jan and May 2026
        for (const s_id of studentIds) {
            const start = new Date('2026-01-01').getTime();
            const end = new Date('2026-05-01').getTime();
            const randomTime = new Date(start + Math.random() * (end - start));
            const dateStr = randomTime.toISOString().slice(0, 10);
            
            await pool.query(`
                UPDATE APPLICATION 
                SET applied_date = ?
                WHERE s_id = ?
            `, [dateStr, s_id]);
        }

        console.log(`Successfully migrated ${studentIds.length} unplaced students to 2026!`);
        console.log("They now have 'In Progress' and 'Rejected' applications for 2026.");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
generate2026();
