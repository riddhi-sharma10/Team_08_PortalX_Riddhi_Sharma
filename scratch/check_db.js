
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function check() {
    try {
        console.log('Connecting to:', process.env.DB_HOST);
        const pool = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });
        
        const [rows] = await pool.query('SELECT role, status FROM JOB_PROFILE LIMIT 20');
        console.log('DATA_START');
        console.log(JSON.stringify(rows, null, 2));
        console.log('DATA_END');
        
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}

check();
