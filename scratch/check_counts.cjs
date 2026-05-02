const mysql = require('mysql2/promise');
(async () => {
    try {
        const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'placement_db' });
        const [rows] = await pool.query('SELECT profile_status, COUNT(*) as count FROM STUDENT GROUP BY profile_status');
        console.log('Status counts:', rows);
        const [total] = await pool.query('SELECT COUNT(*) as count FROM STUDENT');
        console.log('Total students:', total[0].count);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
