import pool from './db.js';

async function describeTable() {
    try {
        const [rows] = await pool.query('DESCRIBE PLACEMENT_RECORD');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
describeTable();
