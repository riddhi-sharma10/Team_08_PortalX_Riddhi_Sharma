
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkViews() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 13553,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        console.log('--- Verifying Views in Database ---');
        const [rows] = await conn.query("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
        
        const viewNames = rows.map(r => Object.values(r)[0]);
        const premiumViews = [
            'vw_placement_master_audit',
            'vw_student_readiness',
            'vw_company_recruitment_trends'
        ];

        premiumViews.forEach(v => {
            if (viewNames.includes(v)) {
                console.log(`✅ SYNCED: ${v}`);
            } else {
                console.log(`❌ MISSING: ${v}`);
            }
        });

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

checkViews();
