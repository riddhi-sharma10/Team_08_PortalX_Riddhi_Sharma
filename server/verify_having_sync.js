
import pool from './db.js';

async function verifyHavingSync() {
    console.log('🚀 Starting HAVING Clause Database Sync Verification...\n');

    const queries = [
        {
            name: 'Top Recruiters (HAVING hires >= 3)',
            sql: `
                SELECT c.comp_name, COUNT(pr.record_id) as hires 
                FROM COMPANY c 
                JOIN PLACEMENT_RECORD pr ON c.comp_id = pr.comp_id 
                GROUP BY c.comp_id, c.comp_name 
                HAVING hires >= 3`
        },
        {
            name: 'Elite Students (HAVING offers > 1)',
            sql: `
                SELECT s.s_name, COUNT(o.offer_id) as offers 
                FROM STUDENT s 
                JOIN OFFER o ON s.s_id = o.s_id 
                GROUP BY s.s_id, s.s_name 
                HAVING offers > 1`
        },
        {
            name: 'Active Applicants (HAVING apps >= 5)',
            sql: `
                SELECT s.s_name, COUNT(a.app_id) as apps 
                FROM STUDENT s 
                JOIN APPLICATION a ON s.s_id = a.s_id 
                GROUP BY s.s_id, s.s_name 
                HAVING apps >= 5`
        },
        {
            name: 'High Performance Depts (HAVING avg_cgpa >= 8.5)',
            sql: `
                SELECT dept, AVG(cgpa) as avg_cgpa 
                FROM STUDENT 
                GROUP BY dept 
                HAVING avg_cgpa >= 8.5`
        }
    ];

    for (const q of queries) {
        try {
            const [rows] = await pool.query(q.sql);
            console.log(`✅ ${q.name}: Found ${rows.length} records.`);
            if (rows.length > 0) console.table(rows.slice(0, 3));
        } catch (err) {
            console.error(`❌ ${q.name} Failed:`, err.message);
        }
    }

    console.log('\n✨ Database sync verification complete.');
    process.exit(0);
}

verifyHavingSync();
