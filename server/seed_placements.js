import { default as pool } from './db.js';

async function seedPlacements() {
    try {
        console.log("Seeding placement records for 2024 and 2025...");

        // Get all companies & jobs to pick from
        const [jobs] = await pool.query('SELECT job_id, comp_id, package, role FROM JOB_PROFILE');
        if (jobs.length === 0) throw new Error("No jobs found");

        // We want to seed about 150 records for 2024, and 180 for 2025
        const years = [
            { year: 2024, count: 150 },
            { year: 2025, count: 180 }
        ];

        for (const { year, count } of years) {
            // Pick random students who don't already have a placement record for this year
            const [students] = await pool.query(`
                SELECT s.s_id, s.dept 
                FROM STUDENT s
                WHERE s.s_id NOT IN (SELECT s_id FROM PLACEMENT_RECORD)
                ORDER BY RAND()
                LIMIT ?
            `, [count]);

            let inserted = 0;
            for (const student of students) {
                // Update their graduation year to match
                await pool.query('UPDATE STUDENT SET graduation_yr = ? WHERE s_id = ?', [year, student.s_id]);

                // Pick a random job
                const job = jobs[Math.floor(Math.random() * jobs.length)];
                
                // Add some random variation to the salary
                const basePackage = Number(job.package) || 5.0;
                const finalSalary = (basePackage + (Math.random() * 2 - 1)).toFixed(2); // +/- 1 LPA
                
                // Random date between Jan 1 and May 30 of that year
                const start = new Date(`${year}-01-01`).getTime();
                const end = new Date(`${year}-05-30`).getTime();
                const randomTime = new Date(start + Math.random() * (end - start));
                const dateStr = randomTime.toISOString().slice(0, 19).replace('T', ' ');

                await pool.query(`
                    INSERT INTO PLACEMENT_RECORD 
                    (s_id, comp_id, job_id, academic_year, salary_offered, stream, status, recorded_on)
                    VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)
                `, [
                    student.s_id, 
                    job.comp_id, 
                    job.job_id, 
                    year, 
                    Math.max(3.0, finalSalary), // min 3 LPA
                    student.dept || 'Unknown',
                    dateStr
                ]);

                inserted++;
            }
            console.log(`Successfully inserted ${inserted} placement records for ${year}.`);
        }

        console.log("Seeding complete!");

    } catch (err) {
        console.error("Failed to seed:", err);
    } finally {
        process.exit();
    }
}

seedPlacements();
