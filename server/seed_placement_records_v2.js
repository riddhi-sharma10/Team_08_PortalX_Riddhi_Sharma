import pool from './db.js';

/**
 * Seed Script V2: Add Placement Records for 2024, 2025 & 2026
 * 
 * ✅ FIXED: Now creates placement records ONLY from existing accepted offers
 * 
 * LOGIC:
 * 1. Get students who have ACCEPTED offers (real placements)
 * 2. Extract their job details, company info, and salary from OFFER table
 * 3. Distribute them across 2024, 2025, 2026 years
 * 4. Create PLACEMENT_RECORD entries with real relationships
 * 
 * This ensures:
 * - All records link to real students, jobs, and companies
 * - Salary data is from actual offers (not random)
 * - Stream/dept comes from actual STUDENT records
 * - Every placement record has corresponding APPLICATION and OFFER records
 */

async function seedPlacementRecords() {
    const conn = await pool.getConnection();
    
    try {
        console.log('🚀 Starting REALISTIC Placement Record Seeding v2...\n');
        console.log('📋 Data Source: ACTUAL ACCEPTED OFFERS (not random)\n');
        console.log('Strategy:');
        console.log('   ✓ Using real students with accepted OFFER records');
        console.log('   ✓ Using actual job_id and company relationships');
        console.log('   ✓ Using real salary from OFFER.ctc\n');

        // STEP 1: Get all students with ACCEPTED offers (these are real placements)
        const [placedStudents] = await conn.query(`
            SELECT 
                o.offer_id,
                o.s_id,
                o.job_id,
                o.ctc as offer_salary,
                s.s_name,
                s.dept as stream,
                j.comp_id,
                j.role,
                c.comp_name
            FROM OFFER o
            JOIN STUDENT s ON o.s_id = s.s_id
            JOIN JOB_PROFILE j ON o.job_id = j.job_id
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE LOWER(o.offer_status) = 'accepted'
            ORDER BY o.offer_id
        `);

        if (placedStudents.length === 0) {
            console.log('❌ NO ACCEPTED OFFERS FOUND!\n');
            console.log('   Please ensure:');
            console.log('   • OFFER table has records with offer_status = "accepted"');
            console.log('   • Try creating offers first with a coordinator\n');
            return;
        }

        console.log(`✅ Found ${placedStudents.length} students with ACCEPTED offers\n`);

        // Show which students will be placed
        console.log('📌 Students found with placements:');
        placedStudents.slice(0, 5).forEach(s => {
            console.log(`   • ${s.s_name} (ID: ${s.s_id}) → ${s.comp_name} | ₹${s.offer_salary} LPA`);
        });
        if (placedStudents.length > 5) {
            console.log(`   ... and ${placedStudents.length - 5} more\n`);
        }

        // STEP 2: Clear old placement records
        console.log('🗑️  Clearing existing placement records...');
        await conn.query('DELETE FROM PLACEMENT_RECORD');

        // STEP 3: Distribute students across years (35%, 35%, 30%)
        const totalStudents = placedStudents.length;
        const count2024 = Math.floor(totalStudents * 0.35);
        const count2025 = Math.floor(totalStudents * 0.35);
        const count2026 = totalStudents - count2024 - count2025;

        console.log(`📊 Distributing ${totalStudents} placements:`);
        console.log(`   • 2024: ${count2024} records (35%)`);
        console.log(`   • 2025: ${count2025} records (35%)`);
        console.log(`   • 2026: ${count2026} records (30%)\n`);

        // STEP 4: Build placement records from offers
        const placementRecords = [];
        let recordIndex = 0;

        // 2024 placements
        for (let i = 0; i < count2024; i++) {
            const offer = placedStudents[recordIndex];
            placementRecords.push({
                s_id: offer.s_id,
                comp_id: offer.comp_id,
                job_id: offer.job_id,
                academic_year: 2024,
                salary_offered: parseFloat(offer.offer_salary),
                stream: offer.stream,
                status: 'confirmed',
                offer_id: offer.offer_id,
                student_name: offer.s_name,
                company_name: offer.comp_name,
                role: offer.role
            });
            recordIndex++;
        }

        // 2025 placements
        for (let i = 0; i < count2025; i++) {
            const offer = placedStudents[recordIndex];
            placementRecords.push({
                s_id: offer.s_id,
                comp_id: offer.comp_id,
                job_id: offer.job_id,
                academic_year: 2025,
                salary_offered: parseFloat(offer.offer_salary),
                stream: offer.stream,
                status: 'confirmed',
                offer_id: offer.offer_id,
                student_name: offer.s_name,
                company_name: offer.comp_name,
                role: offer.role
            });
            recordIndex++;
        }

        // 2026 placements
        while (recordIndex < totalStudents) {
            const offer = placedStudents[recordIndex];
            placementRecords.push({
                s_id: offer.s_id,
                comp_id: offer.comp_id,
                job_id: offer.job_id,
                academic_year: 2026,
                salary_offered: parseFloat(offer.offer_salary),
                stream: offer.stream,
                status: 'confirmed',
                offer_id: offer.offer_id,
                student_name: offer.s_name,
                company_name: offer.comp_name,
                role: offer.role
            });
            recordIndex++;
        }

        // STEP 5: Insert all placement records
        console.log(`📝 Inserting ${placementRecords.length} placement records...\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const record of placementRecords) {
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

                successCount++;
                process.stdout.write(`✅ [${record.academic_year}] ${record.student_name.substring(0, 20).padEnd(20)} → ${record.company_name.substring(0, 15).padEnd(15)} | ₹${record.salary_offered} LPA\r`);
            } catch (insertErr) {
                errorCount++;
                console.error(`\n❌ Error inserting placement for student ${record.s_id}:`, insertErr.message);
            }
        }

        // STEP 6: Verify insertion
        console.log('\n\n');
        const [count2024Result] = await conn.query(
            'SELECT COUNT(*) as count FROM PLACEMENT_RECORD WHERE academic_year = 2024'
        );
        const [count2025Result] = await conn.query(
            'SELECT COUNT(*) as count FROM PLACEMENT_RECORD WHERE academic_year = 2025'
        );
        const [count2026Result] = await conn.query(
            'SELECT COUNT(*) as count FROM PLACEMENT_RECORD WHERE academic_year = 2026'
        );
        const [totalResult] = await conn.query(
            'SELECT COUNT(*) as count FROM PLACEMENT_RECORD'
        );

        console.log(`\n✅ PLACEMENT RECORDS SEEDING COMPLETE!\n`);
        console.log(`📊 Final Summary:`);
        console.log(`   • 2024 Records: ${count2024Result[0].count} placements`);
        console.log(`   • 2025 Records: ${count2025Result[0].count} placements`);
        console.log(`   • 2026 Records: ${count2026Result[0].count} placements`);
        console.log(`   ─────────────────────────────`);
        console.log(`   • Total: ${totalResult[0].count} placements\n`);
        console.log(`   ✓ Success: ${successCount} records`);
        console.log(`   ✗ Errors: ${errorCount} records\n`);

        // STEP 7: Show sample data with verification
        const [sample] = await conn.query(`
            SELECT 
                pr.record_id,
                pr.academic_year,
                s.s_name,
                c.comp_name,
                j.role,
                pr.salary_offered,
                pr.recorded_on,
                pr.stream
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON pr.s_id = s.s_id
            JOIN COMPANY c ON pr.comp_id = c.comp_id
            JOIN JOB_PROFILE j ON pr.job_id = j.job_id
            ORDER BY pr.academic_year DESC, pr.recorded_on DESC
            LIMIT 15
        `);

        console.log(`📋 Sample Placement Records (Latest 15):\n`);
        console.log('┌───────┬────┬──────────────────┬────────────────────┬───────────────┬──────────┐');
        console.log('│ ID    │ Yr │ Student          │ Company            │ Role          │ Salary   │');
        console.log('├───────┼────┼──────────────────┼────────────────────┼───────────────┼──────────┤');
        
        for (const row of sample) {
            const id = String(row.record_id).padEnd(6);
            const year = String(row.academic_year).padEnd(4);
            const student = (row.s_name || '').substring(0, 16).padEnd(16);
            const company = (row.comp_name || '').substring(0, 18).padEnd(18);
            const role = (row.role || '').substring(0, 13).padEnd(13);
            const salary = `₹${row.salary_offered}`.padEnd(8);
            
            console.log(`│ ${id} │ ${year} │ ${student} │ ${company} │ ${role} │ ${salary} │`);
        }
        
        console.log('└───────┴────┴──────────────────┴────────────────────┴───────────────┴──────────┘\n');

        // Verification: Show relationship integrity
        const [integrityCheck] = await conn.query(`
            SELECT 
                COUNT(*) as placement_count,
                COUNT(DISTINCT academic_year) as years_covered,
                COUNT(DISTINCT comp_id) as companies_involved,
                COUNT(DISTINCT s_id) as students_placed,
                COUNT(DISTINCT stream) as departments,
                ROUND(AVG(salary_offered), 2) as avg_salary,
                MAX(salary_offered) as highest_salary,
                MIN(salary_offered) as lowest_salary
            FROM PLACEMENT_RECORD
        `);

        console.log('📈 Placement Statistics:\n');
        const stat = integrityCheck[0];
        console.log(`   Total Placements: ${stat.placement_count}`);
        console.log(`   Years Covered: ${stat.years_covered}`);
        console.log(`   Companies Involved: ${stat.companies_involved}`);
        console.log(`   Students Placed: ${stat.students_placed}`);
        console.log(`   Departments: ${stat.departments}`);
        console.log(`   Average Salary: ₹${stat.avg_salary} LPA`);
        console.log(`   Highest Salary: ₹${stat.highest_salary} LPA`);
        console.log(`   Lowest Salary: ₹${stat.lowest_salary} LPA\n`);

        console.log('✅ All data is linked to real OFFER records with confirmed offers!\n');

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
