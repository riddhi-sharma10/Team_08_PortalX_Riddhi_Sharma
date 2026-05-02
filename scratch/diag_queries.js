
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        console.log('--- DIAGNOSTIC REPORT ---');
        
        const [student] = await conn.query('SELECT s_id, s_name, cgpa FROM STUDENT LIMIT 5');
        console.log('Sample Students:', student);

        const [openJobs] = await conn.query("SELECT role, eligibility_cgpa, status FROM JOB_PROFILE WHERE status = 'open'");
        console.log('Open Jobs:', openJobs);

        await conn.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

check();
