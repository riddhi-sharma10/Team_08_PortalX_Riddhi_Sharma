import pool from './server/db.js';

async function checkSchema() {
    try {
        const [studentSchema] = await pool.query("SHOW CREATE TABLE STUDENT");
        console.log("STUDENT SCHEMA:", studentSchema[0]['Create Table']);
        
        const [coordSchema] = await pool.query("SHOW CREATE TABLE PLACEMENT_COORDINATOR");
        console.log("COORD SCHEMA:", coordSchema[0]['Create Table']);
        
        try {
            const [deptSchema] = await pool.query("SHOW CREATE TABLE DEPARTMENT");
            console.log("DEPARTMENT SCHEMA:", deptSchema[0]['Create Table']);
            
            const [depts] = await pool.query("SELECT * FROM DEPARTMENT");
            console.log("CURRENT DEPARTMENTS:", depts);
        } catch(e) {
            console.log("DEPARTMENT table doesn't exist or error:", e.message);
        }
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
checkSchema();
