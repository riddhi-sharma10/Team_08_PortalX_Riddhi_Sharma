
import pool from './db.js';

async function createAccuracyViews() {
    try {
        console.log('Creating Consistency Views...');

        // 1. Precise Company Stats
        await pool.query(`
            CREATE OR REPLACE VIEW vw_accurate_company_stats AS
            SELECT 
                c.comp_id,
                c.comp_name,
                c.tier,
                COUNT(pr.record_id) as total_students_hired,
                AVG(pr.salary_offered) as actual_avg_package
            FROM COMPANY c
            LEFT JOIN PLACEMENT_RECORD pr ON c.comp_id = pr.comp_id AND pr.status IN ('confirmed', 'joined')
            GROUP BY c.comp_id, c.comp_name, c.tier
        `);
        console.log('Created: vw_accurate_company_stats');

        // 2. Precise Visit History
        await pool.query(`
            CREATE OR REPLACE VIEW vw_accurate_visit_history AS
            SELECT 
                cvh.visit_id,
                cvh.comp_id,
                c.comp_name,
                cvh.academic_year,
                COUNT(pr.record_id) as actual_students_placed,
                MAX(pr.salary_offered) as actual_highest_salary,
                MIN(pr.salary_offered) as actual_lowest_salary,
                AVG(pr.salary_offered) as actual_avg_salary
            FROM COMPANY_VISIT_HISTORY cvh
            JOIN COMPANY c ON cvh.comp_id = c.comp_id
            LEFT JOIN PLACEMENT_RECORD pr ON cvh.comp_id = pr.comp_id AND cvh.academic_year = pr.academic_year
            GROUP BY cvh.visit_id, cvh.comp_id, c.comp_name, cvh.academic_year
        `);
        console.log('Created: vw_accurate_visit_history');

        // 3. Normalized User Roles
        await pool.query(`
            CREATE OR REPLACE VIEW vw_consolidated_user_roles AS
            SELECT 
                user_id,
                username,
                role,
                entity_id,
                is_active,
                last_login
            FROM USER_ROLE
        `);
        // 4. Detailed Student Profiles with Coordinator Info
        await pool.query(`
            CREATE OR REPLACE VIEW vw_student_details AS
            SELECT 
                s.s_id, 
                s.s_name, 
                s.email, 
                d.dept_name AS dept, 
                s.cgpa, 
                s.graduation_yr, 
                s.profile_status, 
                pc.name AS coordinator_name, 
                cd.dept_name AS coordinator_dept,
                s.coord_id,
                s.dept_id
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id
            LEFT JOIN DEPARTMENT cd ON pc.dept_id = cd.dept_id
        `);
        console.log('Created: vw_student_details');

        console.log('\nAll Consistency Views created successfully.');

    } catch (err) {
        console.error('Error creating views:', err);
    } finally {
        await pool.end();
    }
}

createAccuracyViews();
