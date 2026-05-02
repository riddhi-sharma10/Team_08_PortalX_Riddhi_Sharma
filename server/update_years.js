
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, './.env') });

async function updateYearsSurgical() {
    let conn;
    try {
        console.log('Connecting to database...');
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false },
            connectTimeout: 60000
        });

        console.log('Disabling foreign key checks...');
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('Clearing the 2024-2026 range by moving everything to future years temporarily...');
        await conn.query('UPDATE COMPANY_VISIT_HISTORY SET academic_year = academic_year + 100');

        console.log('Fetching all companies...');
        const [companies] = await conn.query('SELECT comp_id FROM COMPANY');
        
        console.log(`Processing ${companies.length} companies...`);
        
        for (const comp of companies) {
            const cid = comp.comp_id;
            const [visits] = await conn.query('SELECT visit_id FROM COMPANY_VISIT_HISTORY WHERE comp_id = ?', [cid]);
            
            const targetYears = [2024, 2025, 2026].sort(() => 0.5 - Math.random());
            
            for (let i = 0; i < visits.length; i++) {
                const vid = visits[i].visit_id;
                if (i < 3) {
                    await conn.query('UPDATE COMPANY_VISIT_HISTORY SET academic_year = ? WHERE visit_id = ?', [targetYears[i], vid]);
                } else {
                    await conn.query('DELETE FROM VISIT_COVERED_STREAM WHERE visit_id = ?', [vid]);
                    await conn.query('DELETE FROM COMPANY_VISIT_HISTORY WHERE visit_id = ?', [vid]);
                }
            }
        }

        console.log('Updating PLACEMENT_RECORD to align with new years...');
        await conn.query("UPDATE PLACEMENT_RECORD SET academic_year = ELT(FLOOR(1 + RAND() * 3), 2024, 2025, 2026)");

        console.log('Re-enabling foreign key checks...');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Database update completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('ERROR during update:', e.message);
        try { await conn.query('SET FOREIGN_KEY_CHECKS = 1'); } catch(e2) {}
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

updateYearsSurgical();
