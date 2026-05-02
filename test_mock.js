import pool from './server/db.js';
async function test() {
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM INTERVIEW i JOIN APPLICATION a ON a.s_id = i.s_id AND a.job_id = i.job_id WHERE a.app_status IN ('shortlisted', 'selected')");
  console.log(rows);
  const [rows2] = await pool.query("SELECT COUNT(*) as count FROM INTERVIEW i JOIN APPLICATION a ON a.s_id = i.s_id AND a.job_id = i.job_id");
  console.log('Total matches:', rows2);
  const [rows3] = await pool.query("SELECT COUNT(*) as count FROM INTERVIEW");
  console.log('Total interviews:', rows3);
  pool.end();
}
test();
