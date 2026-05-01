import { default as pool } from './db.js';
import fs from 'fs';
import path from 'path';

async function generateSQL() {
    try {
        console.log("Generating SQL file for 2024 and 2025 placements...");

        // First, let's clean up the random placement records we just added 
        await pool.query(`DELETE FROM PLACEMENT_RECORD WHERE academic_year IN (2024, 2025)`);
        await pool.query(`UPDATE APPLICATION SET status = 'under_review' WHERE status = 'selected'`);

        const years = [
            { year: 2024, count: 120 },
            { year: 2025, count: 140 }
        ];

        let sqlContent = `-- SQL Mock Data for Placements (2024 and 2025)\n`;
        sqlContent += `-- Generated for Student Placement Cell DBMS\n\n`;
        sqlContent += `USE cgdc_placement;\n\n`;

        for (const { year, count } of years) {
            sqlContent += `-- Updating existing applications to Placed for ${year}\n`;
            
            const [apps] = await pool.query(`
                SELECT a.app_id, a.s_id, a.job_id, s.dept, j.comp_id, j.package
                FROM APPLICATION a
                JOIN STUDENT s ON s.s_id = a.s_id
                JOIN JOB_PROFILE j ON j.job_id = a.job_id
                WHERE s.graduation_yr = ? AND a.status NOT IN ('selected', 'placed', 'accepted', 'rejected')
                ORDER BY RAND()
                LIMIT ?
            `, [year, count]);

            let synced = 0;
            for (const app of apps) {
                // 1. Write the SQL update for the application
                sqlContent += `UPDATE APPLICATION SET status = 'selected' WHERE app_id = ${app.app_id};\n`;

                // 2. Write the insert for PLACEMENT_RECORD
                const basePackage = Number(app.package) || 5.0;
                const finalSalary = Math.max(3.0, basePackage + (Math.random() * 2 - 1)).toFixed(2);
                
                const start = new Date(`${year}-01-01`).getTime();
                const end = new Date(`${year}-05-30`).getTime();
                const randomTime = new Date(start + Math.random() * (end - start));
                const dateStr = randomTime.toISOString().slice(0, 19).replace('T', ' ');

                const stream = app.dept ? app.dept.replace(/'/g, "''") : 'Unknown';
                sqlContent += `INSERT INTO PLACEMENT_RECORD (s_id, comp_id, job_id, academic_year, salary_offered, stream, status, recorded_on) VALUES (${app.s_id}, ${app.comp_id}, ${app.job_id}, ${year}, ${finalSalary}, '${stream}', 'confirmed', '${dateStr}');\n`;

                // Run it live
                await pool.query(`UPDATE APPLICATION SET status = 'selected' WHERE app_id = ?`, [app.app_id]);
                await pool.query(`
                    INSERT INTO PLACEMENT_RECORD 
                    (s_id, comp_id, job_id, academic_year, salary_offered, stream, status, recorded_on)
                    VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)
                `, [app.s_id, app.comp_id, app.job_id, year, finalSalary, app.dept || 'Unknown', dateStr]);

                synced++;
            }
            sqlContent += `\n`;
            console.log(`Successfully generated and inserted ${synced} records for ${year}.`);
        }

        const sqlFilePath = path.join(process.cwd(), '..', 'mock_placements_2024_2025.sql');
        fs.writeFileSync(sqlFilePath, sqlContent);
        
        console.log(`\nSuccess! SQL file saved to: ${sqlFilePath}`);
        process.exit(0);
    } catch (err) {
        console.error("Failed to generate:", err);
        process.exit(1);
    }
}

generateSQL();
