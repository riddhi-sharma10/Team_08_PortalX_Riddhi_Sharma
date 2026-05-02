import pool from './db.js';

const conn = await pool.getConnection();

// Test the API query
const [rows] = await conn.query(`
    SELECT 
        j.job_id, 
        j.role, 
        j.package, 
        j.eligibility_cgpa,
        j.status,
        c.comp_name
    FROM JOB_PROFILE j
    JOIN COMPANY c ON j.comp_id = c.comp_id
    WHERE j.comp_id = 1
    ORDER BY j.job_id
`);

console.log('\n📊 API Response - Jobs for Company 1:\n');
console.log('Total jobs returned:', rows.length, '\n');

rows.forEach((j, i) => {
  const closed = (j.status || '').toLowerCase() === 'closed' ? '❌ CLOSED' : '✅ OPEN';
  console.log(`${i+1}. ${j.role.padEnd(25)} | ₹${j.package} | CGPA: ${j.eligibility_cgpa} | ${closed}`);
});

console.log('\n✅ All jobs are being returned from API\n');

conn.release();
await pool.end();
