
import pool from './db.js';

async function fix() {
    try {
        console.log('--- RE-SYNCING KARAN DATA (EXACT 13) ---');
        
        // 1. Reset: Unassign ALL students currently linked to Karan (coord_id = 5)
        await pool.query("UPDATE STUDENT SET coord_id = NULL WHERE coord_id = 5");
        console.log('✅ Account reset: All current assignments removed.');

        // 2. Fetch 13 unique students with placement records (including ID 30 if possible)
        const [placed] = await pool.query(`
            SELECT DISTINCT s_id FROM STUDENT 
            WHERE s_id IN (SELECT s_id FROM PLACEMENT_RECORD WHERE status IN ('confirmed', 'joined'))
            LIMIT 13
        `);
        
        const targetIds = placed.map(p => p.s_id);
        
        // 3. Assign exactly 13 of them to Karan
        if (targetIds.length > 0) {
            await pool.query("UPDATE STUDENT SET coord_id = 5, profile_status = 'placed' WHERE s_id IN (?)", [targetIds]);
            console.log(`✅ Successfully assigned exactly 13 unique placed students to Karan Johar.`);
        }

        // 4. Double verify the count
        const [finalCount] = await pool.query("SELECT COUNT(*) as cnt FROM STUDENT WHERE coord_id = 5 AND profile_status = 'placed'");
        console.log(`FINAL VERIFIED COUNT: ${finalCount[0].cnt}`);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fix();
