import pool from './db.js';

const conn = await pool.getConnection();

// Check company 1 jobs
const [jobs] = await conn.query(`
  SELECT job_id, role, status, comp_id FROM JOB_PROFILE WHERE comp_id = 1 ORDER BY job_id
`);

console.log('\n📊 Jobs for Company ID 1:\n');
jobs.forEach((j, i) => {
  console.log(`${i+1}. Job ID: ${j.job_id.toString().padEnd(4)} | Role: ${j.role.substring(0, 30).padEnd(30)} | Status: ${j.status}`);
});

console.log(`\n📋 Total: ${jobs.length} jobs for company 1\n`);

// Check which are open vs closed
const [stats] = await conn.query(`
  SELECT status, COUNT(*) as count FROM JOB_PROFILE WHERE comp_id = 1 GROUP BY status
`);

console.log('📈 Status breakdown:');
stats.forEach(s => console.log(`   • ${s.status}: ${s.count} jobs`));

conn.release();
await pool.end();
