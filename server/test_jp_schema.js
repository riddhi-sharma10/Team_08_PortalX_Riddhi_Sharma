import pool from './db.js';

async function test() {
    try {
        // Check JOB_PROFILE schema
        const [jpDesc] = await pool.query('DESCRIBE JOB_PROFILE');
        console.log('JOB_PROFILE columns:');
        jpDesc.forEach(c => console.log(`  ${c.Field} | ${c.Type} | Null:${c.Null} | Key:${c.Key} | Default:${c.Default} | Extra:${c.Extra}`));

        process.exit(0);
    } catch(e) {
        console.error(e.message);
        process.exit(1);
    }
}
test();
