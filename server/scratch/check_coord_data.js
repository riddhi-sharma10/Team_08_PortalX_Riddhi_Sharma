import pool from '../db.js';
const [rows] = await pool.query("SELECT coord_id FROM PLACEMENT_COORDINATOR WHERE name = 'Anaya Verma'");
console.log(rows);
const id = rows[0].coord_id;
const [students] = await pool.query("SELECT graduation_yr, COUNT(*) FROM STUDENT WHERE coord_id = ? GROUP BY graduation_yr", [id]);
console.log('Students by year for coord', id, ':', students);
process.exit();
