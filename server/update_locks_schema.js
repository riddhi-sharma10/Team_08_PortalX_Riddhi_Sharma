
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function update() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        console.log('--- Applying Schema Updates for Criterion 13 (Locks) ---');

        // 1. Add vacancies to JOB_PROFILE
        try {
            await conn.query('ALTER TABLE JOB_PROFILE ADD COLUMN vacancies INT DEFAULT 10');
            console.log('✓ Added vacancies to JOB_PROFILE');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') console.log('! vacancies already exists');
            else throw e;
        }

        // 2. Add room_no to INTERVIEW
        try {
            await conn.query('ALTER TABLE INTERVIEW ADD COLUMN room_no VARCHAR(50) DEFAULT "Room-A"');
            console.log('✓ Added room_no to INTERVIEW');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') console.log('! room_no already exists');
            else throw e;
        }

        console.log('--- Done ---');
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

update();
