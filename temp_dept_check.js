import pool from './server/db.js';

async function checkDepts() {
    try {
        const [studentDepts] = await pool.query("SELECT DISTINCT dept FROM STUDENT");
        console.log("STUDENT DEPTS:", studentDepts);
        
        const [coordDepts] = await pool.query("SELECT DISTINCT dept FROM PLACEMENT_COORDINATOR");
        console.log("COORD DEPTS:", coordDepts);
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
checkDepts();
