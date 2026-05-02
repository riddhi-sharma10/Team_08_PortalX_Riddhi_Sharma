import pool from './db.js';

(async () => {
    try {
        const [rows] = await pool.query('DESCRIBE STUDENT');
        console.log('STUDENT table schema:', rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
