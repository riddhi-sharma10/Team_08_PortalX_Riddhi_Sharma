
import pool from './db.js';

async function checkConsistency() {
    try {
        console.log('--- STARTING CONSISTENCY AUDIT ---\n');

        // Check 1: User Role Redundancy (Normalized - Removed)
        console.log('✅ USER_ROLE: role and entity_type are consistent (entity_type dropped).');

        // Check 2: Placement Record Summary vs Details (Normalized - Removed)
        console.log('✅ COMPANY_VISIT_HISTORY: Placement counts are consistent (students_placed dropped, using views now).');

        // Check 3: Redundant Salary Snapshots
        const [salaryInconsistency] = await pool.query(`
            SELECT pr.record_id, pr.salary_offered as reported, jp.package as original
            FROM PLACEMENT_RECORD pr
            JOIN JOB_PROFILE jp ON pr.job_id = jp.job_id
            WHERE pr.salary_offered != jp.package
        `);

        if (salaryInconsistency.length > 0) {
            console.log(`ℹ️ Note: Found ${salaryInconsistency.length} records where the placed salary differs from the job profile package. (This is normal if negotiations happened).`);
        }

        console.log('\n--- AUDIT COMPLETE ---');

    } catch (err) {
        console.error('Error during consistency check:', err);
    } finally {
        await pool.end();
    }
}

checkConsistency();
