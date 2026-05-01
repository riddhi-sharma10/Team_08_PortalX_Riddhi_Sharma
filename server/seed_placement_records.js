import pool from './db.js';

/**
 * Seed Script: Add Placement Records for 2024 & 2026
 * This script creates realistic placement data for demonstration and testing
 */

async function seedPlacementRecords() {
    const conn = await pool.getConnection();
    
    try {
        console.log('🚀 Starting Placement Record Seeding for 2024, 2025 & 2026...\n');

        // First, get all students and companies
        const [students] = await conn.query('SELECT s_id, dept FROM STUDENT LIMIT 50');
        const [companies] = await conn.query('SELECT comp_id, comp_name FROM COMPANY LIMIT 20');
        const [jobs] = await conn.query('SELECT job_id, role, package FROM JOB_PROFILE LIMIT 30');

        if (students.length === 0 || companies.length === 0 || jobs.length === 0) {
            console.log('❌ Not enough data in STUDENT, COMPANY, or JOB_PROFILE tables.');
            console.log(`   Found: ${students.length} students, ${companies.length} companies, ${jobs.length} jobs`);
            return;
        }

        // Clear existing placement records (optional - comment out if you want to keep old data)
        console.log('🗑️  Clearing existing placement records...');
        await conn.query('DELETE FROM PLACEMENT_RECORD');

        // Sample data for 2024
        const placementRecords2024 = [];
        for (let i = 0; i < Math.min(17, students.length); i++) {
            const student = students[i];
            const company = companies[i % companies.length];
            const job = jobs[i % jobs.length];

            // Randomize salary between package and package + 20%
            const baseSalary = parseFloat(job.package);
            const salary = (baseSalary + (Math.random() * baseSalary * 0.2)).toFixed(2);

            placementRecords2024.push({
                s_id: student.s_id,
                comp_id: company.comp_id,
                job_id: job.job_id,
                academic_year: 2024,
                salary_offered: parseFloat(salary),
                stream: student.dept,
                status: 'confirmed'
            });
        }

        // Sample data for 2025
        const placementRecords2025 = [];
        for (let i = 17; i < Math.min(34, students.length); i++) {
            const student = students[i];
            const company = companies[(i + 2) % companies.length];
            const job = jobs[(i + 1) % jobs.length];

            const baseSalary = parseFloat(job.package);
            const salary = (baseSalary + (Math.random() * baseSalary * 0.22)).toFixed(2);

            placementRecords2025.push({
                s_id: student.s_id,
                comp_id: company.comp_id,
                job_id: job.job_id,
                academic_year: 2025,
                salary_offered: parseFloat(salary),
                stream: student.dept,
                status: 'confirmed'
            });
        }

        // Sample data for 2026
        const placementRecords2026 = [];
        for (let i = 34; i < students.length; i++) {
            const student = students[i];
            const company = companies[(i + 5) % companies.length];
            const job = jobs[(i + 3) % jobs.length];

            const baseSalary = parseFloat(job.package);
            const salary = (baseSalary + (Math.random() * baseSalary * 0.25)).toFixed(2);

            placementRecords2026.push({
                s_id: student.s_id,
                comp_id: company.comp_id,
                job_id: job.job_id,
                academic_year: 2026,
                salary_offered: parseFloat(salary),
                stream: student.dept,
                status: 'confirmed'
            });
        }

        const allRecords = [...placementRecords2024, ...placementRecords2025, ...placementRecords2026];

        // Insert records
        console.log(`\n📝 Inserting ${allRecords.length} placement records...\n`);

        for (const record of allRecords) {
            try {
                const query = `
                    INSERT INTO PLACEMENT_RECORD 
                    (s_id, comp_id, job_id, academic_year, salary_offered, stream, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                
                await conn.query(query, [
                    record.s_id,
                    record.comp_id,
                    record.job_id,
                    record.academic_year,
                    record.salary_offered,
                    record.stream,
                    record.status
                ]);

                const year = record.academic_year;
                const studentId = record.s_id;
                const companyId = record.comp_id;
                process.stdout.write(`✅ [${year}] Student ${studentId} → Company ${companyId} | ₹${record.salary_offered} LPA\r`);
            } catch (insertErr) {
                console.error(`\n❌ Error inserting record for student ${record.s_id}:`, insertErr.message);
            }
        }

        // Verify insertion
        const [count2024] = await conn.query(
            'SELECT COUNT(*) as count FROM PLACEMENT_RECORD WHERE academic_year = 2024'
        );
        const [count2025] = await conn.query(
            'SELECT COUNT(*) as count FROM PLACEMENT_RECORD WHERE academic_year = 2025'
        );
        const [count2026] = await conn.query(
            'SELECT COUNT(*) as count FROM PLACEMENT_RECORD WHERE academic_year = 2026'
        );

        console.log(`\n\n✅ PLACEMENT RECORDS SEEDING COMPLETE!\n`);
        console.log(`📊 Summary:`);
        console.log(`   • 2024 Records: ${count2024[0].count} placements`);
        console.log(`   • 2025 Records: ${count2025[0].count} placements`);
        console.log(`   • 2026 Records: ${count2026[0].count} placements`);
        console.log(`   • Total: ${count2024[0].count + count2025[0].count + count2026[0].count} placements\n`);

        // Show sample data
        const [sample] = await conn.query(`
            SELECT 
                pr.record_id,
                s.s_name,
                c.comp_name,
                j.role,
                pr.salary_offered,
                pr.academic_year,
                pr.recorded_on
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON pr.s_id = s.s_id
            JOIN COMPANY c ON pr.comp_id = c.comp_id
            JOIN JOB_PROFILE j ON pr.job_id = j.job_id
            ORDER BY pr.academic_year DESC, pr.recorded_on DESC
            LIMIT 10
        `);

        console.log(`📋 Sample Records (Latest 10):\n`);
        console.log('┌─────┬──────────────────┬────────────────────┬────────────┬──────────┬────┬────────────────┐');
        console.log('│ ID  │ Student          │ Company            │ Role       │ Salary   │ Yr │ Recorded On    │');
        console.log('├─────┼──────────────────┼────────────────────┼────────────┼──────────┼────┼────────────────┤');
        
        for (const row of sample) {
            const id = String(row.record_id).padEnd(4);
            const student = (row.s_name || '').substring(0, 15).padEnd(16);
            const company = (row.comp_name || '').substring(0, 18).padEnd(18);
            const role = (row.role || '').substring(0, 10).padEnd(10);
            const salary = `₹${row.salary_offered}`.padEnd(8);
            const year = String(row.academic_year).padEnd(4);
            const date = (row.recorded_on || '').toString().substring(0, 14).padEnd(14);
            
            console.log(`│ ${id} │ ${student} │ ${company} │ ${role} │ ${salary} │ ${year} │ ${date} │`);
        }
        
        console.log('└─────┴──────────────────┴────────────────────┴────────────┴──────────┴────┴────────────────┘\n');

        console.log(`🎉 Data successfully seeded to PLACEMENT_RECORD table!\n`);

    } catch (err) {
        console.error('❌ FATAL ERROR:', err.message);
        console.error(err.stack);
    } finally {
        conn.release();
        await pool.end();
        process.exit(0);
    }
}

// Run the seed script
seedPlacementRecords();
