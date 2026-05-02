import pool from '../db.js';

(async () => {
    try {
        const [rows] = await pool.query('SELECT * FROM CHAT_MESSAGE ORDER BY created_at DESC LIMIT 10');
        console.log('Recent Messages:', rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
