import { default as pool } from './db.js';

async function syncApplications() {
    try {
        console.log("Syncing existing applications to PLACEMENT_RECORD...");

        // First, let's clean up the random placement records we just added 
        // that don't correspond to real applications, to avoid duplicates
        await pool.query(`DELETE FROM PLACEMENT_RECORD WHERE academic_year IN (2024, 2025)`);

        const years = [
            { year: 2024, count: 120 },
            { year: 2025, count: 140 }
        ];

        for (const { year, count } of years) {
            // Find existing 'In Progress' applications for students graduating in this year
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
                // 1. Update application status
                await pool.query(`UPDATE APPLICATION SET status = 'selected' WHERE app_id = ?`, [app.app_id]);

                // 2. Insert into PLACEMENT_RECORD
                const basePackage = Number(app.package) || 5.0;
                const finalSalary = Math.max(3.0, basePackage + (Math.random() * 2 - 1)).toFixed(2);
                
                const start = new Date(`${year}-01-01`).getTime();
                const end = new Date(`${year}-05-30`).getTime();
                const randomTime = new Date(start + Math.random() * (end - start));
                const dateStr = randomTime.toISOString().slice(0, 19).replace('T', ' ');

                await pool.query(`
                    INSERT INTO PLACEMENT_RECORD 
                    (s_id, comp_id, job_id, academic_year, salary_offered, stream, status, recorded_on)
                    VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)
                `, [app.s_id, app.comp_id, app.job_id, year, finalSalary, app.dept || 'Unknown', dateStr]);

                synced++;
            }
            console.log(`Successfully synced ${synced} applications to Placed for ${year}.`);
        }

        console.log("Done syncing applications!");
        process.exit(0);

    } catch (err) {
        console.error("Failed to sync:", err);
        process.exit(1);
    }
}

syncApplications();
