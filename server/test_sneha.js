import { default as pool } from './db.js';

async function test() {
    try {
        const [rows] = await pool.query(`
            SELECT s_name, comp_name 
            FROM APPLICATION a 
            JOIN STUDENT s ON s.s_id=a.s_id 
            JOIN JOB_PROFILE j ON j.job_id=a.job_id 
            JOIN COMPANY c ON c.comp_id=j.comp_id 
            WHERE s_name='Sneha Patil'
        `);
        console.log("Sneha Patil Applications:", rows);
        
        // Also check if they are in PLACEMENT_RECORD multiple times?
        const [pr] = await pool.query(`
            SELECT s_name, comp_name 
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON s.s_id=pr.s_id 
            JOIN COMPANY c ON c.comp_id=pr.comp_id 
            WHERE s_name='Sneha Patil'
        `);
        console.log("Sneha Patil Placements:", pr);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
