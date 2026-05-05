import pool from './server/db.js';
async function test() {
    const [prSchema] = await pool.query("SHOW CREATE TABLE PLACEMENT_RECORD");
    console.log(prSchema[0]['Create Table']);
    process.exit(0);
}
test();
