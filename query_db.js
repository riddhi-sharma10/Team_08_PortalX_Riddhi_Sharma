import pool from './server/db.js';
async function run() {
  const [coords] = await pool.query('SELECT coord_id, name FROM PLACEMENT_COORDINATOR WHERE name LIKE "%Vivaan%";');
  if (coords.length > 0) {
      const coordId = coords[0].coord_id;
      const [prs] = await pool.query('SELECT pr.record_id, s.s_name, pr.comp_id, pr.job_id, pr.salary_offered FROM PLACEMENT_RECORD pr INNER JOIN STUDENT s ON pr.s_id = s.s_id WHERE s.coord_id = ?;', [coordId]);
      console.log('placement records for Vivaan:', prs);
  }
  process.exit(0);
}
run();
