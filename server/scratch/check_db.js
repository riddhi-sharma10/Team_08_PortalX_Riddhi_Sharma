import pool from '../db.js';

async function check() {

    const [rows] = await pool.query("DESCRIBE CHAT_MESSAGE");
    console.log('SCHEMA:', rows);

    await pool.end();
}

check();
