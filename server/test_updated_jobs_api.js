import pool from './db.js';

const conn = await pool.getConnection();

console.log('\n📊 Testing Updated Jobs API\n');

// Test 1: Get all jobs
const [allJobs] = await conn.query(`
    SELECT 
        j.job_id, 
        j.comp_id,
        j.role, 
        j.job_type,
        j.package, 
        j.eligibility_cgpa,
        j.status,
        c.comp_name
    FROM JOB_PROFILE j
    JOIN COMPANY c ON j.comp_id = c.comp_id
    ORDER BY j.job_id DESC
    LIMIT 15
`);

console.log('Test 1: All Jobs (showing first 15)\n');
allJobs.forEach(j => {
    const status = (j.status || '').toLowerCase() === 'closed' ? '❌ CLOSED' : '✅ OPEN';
    console.log(`  • Job ${j.job_id}: ${j.role.padEnd(30)} | ${j.comp_name.padEnd(20)} | ${status}`);
});

// Test 2: Get company 1 jobs
console.log('\n\nTest 2: All Jobs for Company 1 (Google)\n');
const [comp1Jobs] = await conn.query(`
    SELECT 
        j.job_id, 
        j.role, 
        j.status,
        j.package
    FROM JOB_PROFILE j
    WHERE j.comp_id = 1
    ORDER BY j.job_id
`);

console.log(`Total: ${comp1Jobs.length} jobs\n`);
comp1Jobs.forEach(j => {
    const status = (j.status || '').toLowerCase() === 'closed' ? '❌ CLOSED' : '✅ OPEN';
    console.log(`  ${j.job_id}. ${j.role.padEnd(25)} | ₹${j.package} | ${status}`);
});

// Test 3: Count status breakdown
const [statusCount] = await conn.query(`
    SELECT 
        status,
        COUNT(*) as count
    FROM JOB_PROFILE
    GROUP BY status
`);

console.log('\n\nTest 3: Status Breakdown (All Jobs)\n');
statusCount.forEach(s => {
    console.log(`  • ${s.status}: ${s.count} jobs`);
});

conn.release();
await pool.end();

console.log('\n✅ API tests complete!\n');
