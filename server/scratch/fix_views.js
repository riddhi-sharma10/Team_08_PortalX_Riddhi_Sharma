
import pool from '../db.js';

async function fixViews() {
    console.log('--- FIXING VIEWS ---');
    try {
        await pool.query(`
            CREATE OR REPLACE VIEW vw_active_users AS 
            SELECT user_id, username, password_hash, role, entity_id, entity_type, is_active, last_login, created_at 
            FROM USER_ROLE 
            WHERE is_active = 1
        `);
        console.log('✅ Recreated vw_active_users');
        
        // Fix any other known broken views
        await pool.query(`
            CREATE OR REPLACE VIEW vw_students_missed_interviews AS 
            SELECT s.s_name, c.comp_name, i.interview_date, i.interview_time
            FROM INTERVIEW i 
            JOIN STUDENT s ON i.s_id = s.s_id 
            JOIN JOB_PROFILE jp ON i.job_id = jp.job_id 
            JOIN COMPANY c ON jp.comp_id = c.comp_id 
            WHERE i.interview_status = 'no_show'
        `);
        console.log('✅ Recreated vw_students_missed_interviews');
        
    } catch (err) {
        console.error('❌ Failed to fix views:', err.message);
    }
    process.exit(0);
}

fixViews();
