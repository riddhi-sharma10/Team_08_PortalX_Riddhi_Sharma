import pool from '../db.js';

(async () => {
    try {
        const [rows] = await pool.query('SHOW CREATE TABLE NOTIFICATION');
        console.log(rows[0]['Create Table']);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
