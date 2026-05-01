
import pool from '../db.js';

async function updateDB() {
    console.log('--- UPDATING DB FOR TEST ---');
    try {
        await pool.query("UPDATE COMPANY SET comp_name = CONCAT('REFRESHED - ', comp_name) WHERE comp_id = 162");
        console.log('✅ Updated company 162');
    } catch (err) {
        console.error('❌ Failed:', err.message);
    }
    process.exit(0);
}

updateDB();
