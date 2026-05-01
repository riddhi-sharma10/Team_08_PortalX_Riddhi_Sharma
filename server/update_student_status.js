import { default as pool } from './db.js';
import fs from 'fs';
import path from 'path';

async function updateStudentStatus() {
    try {
        console.log("Updating STUDENT.profile_status to 'placed' for all placed students...");

        // Find all unique students who have a confirmed placement record
        const [rows] = await pool.query(`
            SELECT DISTINCT s_id 
            FROM PLACEMENT_RECORD 
            WHERE status = 'confirmed'
        `);

        console.log(`Found ${rows.length} placed students.`);

        let updated = 0;
        for (const row of rows) {
            await pool.query(`
                UPDATE STUDENT 
                SET profile_status = 'placed' 
                WHERE s_id = ? AND profile_status != 'placed'
            `, [row.s_id]);
            updated++;
        }

        console.log(`Successfully updated profile_status for ${updated} students!`);

        // Also, let's append this query to the SQL file so they have it
        const sqlFilePath = path.join(process.cwd(), '..', 'mock_placements_2024_2025.sql');
        let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        sqlContent += `\n-- Update the student table profile_status to placed for all inserted students\n`;
        sqlContent += `UPDATE STUDENT s\n`;
        sqlContent += `JOIN PLACEMENT_RECORD pr ON s.s_id = pr.s_id\n`;
        sqlContent += `SET s.profile_status = 'placed'\n`;
        sqlContent += `WHERE pr.status = 'confirmed';\n`;

        fs.writeFileSync(sqlFilePath, sqlContent);
        
        console.log("SQL file updated with STUDENT profile_status updates!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateStudentStatus();
