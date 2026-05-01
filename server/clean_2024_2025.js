import { default as pool } from './db.js';

async function cleanData() {
    try {
        console.log("Cleaning up 'In Progress' applications for 2024 and 2025...");

        // Update all under_review, shortlisted, applied applications to rejected if graduation_yr is 2024 or 2025
        const [result] = await pool.query(`
            UPDATE APPLICATION a
            JOIN STUDENT s ON a.s_id = s.s_id
            SET a.status = 'rejected'
            WHERE s.graduation_yr IN (2024, 2025) 
            AND a.status IN ('applied', 'under_review', 'shortlisted')
        `);

        console.log(`Updated ${result.affectedRows} unresolved applications to 'rejected' for 2024/2025.`);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
cleanData();
