const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await pool.query(
      `CREATE OR REPLACE VIEW vw_student_readiness AS SELECT s.s_id, s.s_name, d.dept_name AS dept, s.cgpa, s.coord_id, (SELECT COUNT(*) FROM APPLICATION a WHERE a.s_id = s.s_id) AS total_applications, (CASE WHEN (s.cgpa >= 6.0 AND (SELECT COUNT(*) FROM APPLICATION a WHERE a.s_id = s.s_id) = 0) THEN 'Ready but No Apps' WHEN (s.cgpa < 6.0) THEN 'Below Eligibility' ELSE 'Active' END) AS readiness_status FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id WHERE s.profile_status = 'active';`,
    );
    console.log("View updated successfully");
  } catch (e) {
    console.error(e);
  }
  pool.end();
}
run();
