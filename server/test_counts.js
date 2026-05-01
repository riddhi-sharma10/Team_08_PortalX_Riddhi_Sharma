import { default as pool } from './db.js';
async function run() {
    const [rows] = await pool.query('SELECT COUNT(*) as c FROM APPLICATION'); 
    console.log('Total Applications:', rows[0].c); 
    const [placed] = await pool.query('SELECT COUNT(*) as c FROM APPLICATION WHERE status="selected"'); 
    console.log('Placed Applications:', placed[0].c);
    process.exit(0);
}
run();
