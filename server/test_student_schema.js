import pool from './db.js';

async function test() {
    try {
        const [desc] = await pool.query('DESCRIBE STUDENT');
        console.log('STUDENT columns:');
        desc.forEach(c => console.log(`  ${c.Field} | ${c.Type} | Null:${c.Null} | Key:${c.Key} | Default:${c.Default}`));

        const [urDesc] = await pool.query('DESCRIBE USER_ROLE');
        console.log('\nUSER_ROLE columns:');
        urDesc.forEach(c => console.log(`  ${c.Field} | ${c.Type} | Null:${c.Null} | Key:${c.Key} | Default:${c.Default}`));

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
test();
