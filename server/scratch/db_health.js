
import pool from '../db.js';

async function checkHealth() {
    console.log('--- DATABASE HEALTH CHECK ---');
    try {
        const [views] = await pool.query("SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = 'placement_cell_db'");
        for (let v of views) {
            const name = v.TABLE_NAME;
            try {
                await pool.query(`SELECT 1 FROM ${name} LIMIT 1`);
            } catch (err) {
                console.log(`❌ VIEW BROKEN: ${name} - ${err.message}`);
                
                if (err.message.includes('references invalid table(s) or column(s)')) {
                   // Try to see what's missing
                   try {
                       const [create] = await pool.query(`SHOW CREATE VIEW ${name}`);
                       console.log(`   DEFN: ${create[0]['Create View']}`);
                   } catch (e2) {}
                }
            }
        }
    } catch (err) {
        console.error('Master query failed:', err.message);
    }
    process.exit(0);
}

checkHealth();
