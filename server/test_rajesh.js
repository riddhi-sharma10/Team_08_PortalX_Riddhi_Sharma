import { default as pool } from './db.js';

async function test() {
    const [rows] = await pool.query("SELECT s_id, s_name, dept FROM STUDENT WHERE s_name = 'Rajesh Jain'");
    console.log(rows);
    process.exit(0);
}
test();
