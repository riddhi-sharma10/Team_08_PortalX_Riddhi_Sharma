// server/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) }); // load server/.env first (Aiven) if present
dotenv.config({ path: '../.env' }); // fallback to root .env if present

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 30, // Increased for stability
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: {
        rejectUnauthorized: false
    },
    timezone: 'Z'
});

// Test the connection when server starts
pool.getConnection()
    .then(conn => {
        console.log('✅ MySQL connected successfully with SSL!');
        conn.release(); // return it to the pool
    })
    .catch(err => {
        console.error('❌ MySQL connection failed:', err.message);
    });

export default pool;
