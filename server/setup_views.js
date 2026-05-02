
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function setupViews() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 13553,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false },
            multipleStatements: true 
        });

        console.log('--- Creating Premium Database Views ---');

        // 1. Placement Master Audit View
        console.log('1. Creating vw_placement_master_audit...');
        await conn.query(`
            CREATE OR REPLACE VIEW vw_placement_master_audit AS
            SELECT 
                pr.record_id,
                s.s_name AS student_name,
                s.dept AS student_dept,
                c.comp_name AS company_name,
                pr.salary_offered AS package,
                pc.name AS coordinator_name,
                pr.academic_year,
                pr.recorded_on
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON pr.s_id = s.s_id
            JOIN COMPANY c ON pr.comp_id = c.comp_id
            LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id;
        `);

        // 2. Student Readiness View (Using Subquery)
        console.log('2. Creating vw_student_readiness...');
        await conn.query(`
            CREATE OR REPLACE VIEW vw_student_readiness AS
            SELECT 
                s.s_id,
                s.s_name,
                s.dept,
                s.cgpa,
                (SELECT COUNT(*) FROM APPLICATION a WHERE a.s_id = s.s_id) AS total_applications,
                CASE 
                    WHEN s.cgpa >= 6.0 AND (SELECT COUNT(*) FROM APPLICATION a WHERE a.s_id = s.s_id) = 0 THEN 'Ready but No Apps'
                    WHEN s.cgpa < 6.0 THEN 'Below Eligibility'
                    ELSE 'Active'
                END AS readiness_status
            FROM STUDENT s
            WHERE s.profile_status = 'active';
        `);

        // 3. Company Recruitment Trends View
        console.log('3. Creating vw_company_recruitment_trends...');
        await conn.query(`
            CREATE OR REPLACE VIEW vw_company_recruitment_trends AS
            SELECT 
                c.comp_name,
                vh.academic_year,
                vh.students_placed,
                vh.avg_salary,
                (SELECT AVG(students_placed) FROM COMPANY_VISIT_HISTORY vh2 WHERE vh2.comp_id = c.comp_id) AS historical_avg_hires
            FROM COMPANY c
            JOIN COMPANY_VISIT_HISTORY vh ON c.comp_id = vh.comp_id;
        `);

        console.log('--- All Premium Views Created Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('View creation failed:', err);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

setupViews();
