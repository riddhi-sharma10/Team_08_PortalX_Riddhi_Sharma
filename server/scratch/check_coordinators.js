import pool from '../db.js';
const [rows] = await pool.query('SELECT name, dept FROM PLACEMENT_COORDINATOR');
console.log(JSON.stringify(rows, null, 2));
process.exit();
