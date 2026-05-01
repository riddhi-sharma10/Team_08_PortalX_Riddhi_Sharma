import pool from './db.js';
pool.query("SELECT username, password_hash FROM USER_ROLE WHERE role='cgdc_admin'").then(([rows]) => {
    console.log(rows);
    process.exit(0);
});
