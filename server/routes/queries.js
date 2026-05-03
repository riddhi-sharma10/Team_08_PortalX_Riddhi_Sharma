
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * QUERY REGISTRY
 * Each query has:
 * - id: unique identifier
 * - name: Display name for the UI
 * - category: table, view, join, subquery
 * - sql: The raw SQL (with ? placeholders for security)
 * - roles: array of roles allowed to run this
 * - description: For the UI
 */
const QUERY_REGISTRY = {
    // --- TABLES (Base Data) ---
    'tbl_companies': {
        name: 'Company Directory',
        category: 'table',
        sql: 'SELECT comp_name, industry_type, location, website FROM COMPANY ORDER BY comp_name',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Full list of registered companies and their domains.'
    },
    'tbl_students': {
        name: 'My Students',
        category: 'table',
        sql: "SELECT s_id as stu_roll_no, s_name, dept, cgpa, profile_status FROM STUDENT WHERE coord_id = ? AND profile_status = 'placed' ORDER BY dept ASC, s_name ASC",
        roles: ['coordinator'],
        description: 'List of placed students specifically assigned to your care.'
    },
    'tbl_roles': {
        name: 'System User Roles',
        category: 'table',
        sql: 'SELECT role_id, username, role, entity_id FROM USER_ROLE',
        roles: [],
        description: 'Master list of login accounts and their assigned system roles.'
    },
    'tbl_visit_history': {
        name: 'Company Visit History',
        category: 'table',
        sql: 'SELECT * FROM COMPANY_VISIT_HISTORY ORDER BY academic_year DESC',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Past recruitment data including students placed and salaries offered.'
    },
    'tbl_job_profiles': {
        name: 'Job Profiles (Full)',
        category: 'table',
        sql: 'SELECT * FROM JOB_PROFILE ORDER BY app_deadline DESC',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Detailed list of all job profiles posted by companies.'
    },
    'tbl_admin_students': {
        name: 'All Students (Master)',
        category: 'table',
        sql: `
            SELECT pc.name as coordinator_name, s.* 
            FROM STUDENT s
            LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id
            ORDER BY s.s_name ASC
        `,
        roles: ['admin'],
        description: 'Admin-only view of the full student database with assigned coordinator names.'
    },
    'tbl_admin_companies': {
        name: 'All Companies (Master)',
        category: 'table',
        sql: 'SELECT * FROM COMPANY ORDER BY comp_name ASC',
        roles: ['admin'],
        description: 'Admin-only view of the complete registered company list.'
    },
    'tbl_admin_cgdc': {
        name: 'CGDC Admin Directory',
        category: 'table',
        sql: 'SELECT * FROM CGDC_ADMIN',
        roles: ['admin'],
        description: 'Internal list of placement cell administrators.'
    },
    'tbl_admin_visit_history': {
        name: 'Master Visit History',
        category: 'table',
        sql: 'SELECT * FROM COMPANY_VISIT_HISTORY ORDER BY academic_year DESC',
        roles: [],
        description: 'Full historical visit records for administrative audit.'
    },
    'tbl_admin_placement_records': {
        name: 'All Placement Records',
        category: 'table',
        sql: 'SELECT * FROM PLACEMENT_RECORD ORDER BY academic_year DESC',
        roles: ['admin'],
        description: 'Complete log of every placement record in the system.'
    },
    'tbl_admin_coordinators': {
        name: 'Placement Coordinator Directory',
        category: 'table',
        sql: 'SELECT * FROM PLACEMENT_COORDINATOR ORDER BY name ASC',
        roles: ['admin'],
        description: 'Full master list of all active placement coordinators.'
    },

    // --- VIEWS (Simplified Abstractions) ---
    'vw_top_hiring': {
        name: 'Top Hiring Companies',
        category: 'view',
        sql: 'SELECT * FROM vw_top_hiring_companies',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Companies ranked by their recruitment volume in the current cycle.'
    },
    'vw_accurate_company_stats': {
        name: 'Accurate Company Stats',
        category: 'view',
        sql: 'SELECT * FROM vw_accurate_company_stats',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Verified real-time statistics for all participating companies.'
    },
    'vw_accurate_visit_history': {
        name: 'Accurate Visit History',
        category: 'view',
        sql: 'SELECT * FROM vw_accurate_visit_history',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Chronological recruitment history for past academic years.'
    },
    'vw_app_full_details': {
        name: 'Application Full Details',
        category: 'view',
        sql: `
            SELECT a.app_id, c.comp_name, j.role, a.applied_date, a.status, a.ats_score
            FROM APPLICATION a
            JOIN JOB_PROFILE j ON a.job_id = j.job_id
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE a.s_id = ?
        `,
        roles: ['student'],
        description: 'Master view of your applications including roles and current results.'
    },
    'vw_closed_jobs': {
        name: 'Closed Job Openings',
        category: 'view',
        sql: 'SELECT * FROM vw_closed_jobs',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Record of jobs that have finished their recruitment cycle.'
    },
    'vw_companies_by_tier': {
        name: 'Companies by Tier',
        category: 'view',
        sql: 'SELECT * FROM vw_companies_by_tier',
        roles: ['student', 'coordinator', 'admin'],
        description: 'List of all registered companies categorized by their institutional tier.'
    },
    'vw_company_placement_count': {
        name: 'Placement Count by Company',
        category: 'view',
        sql: 'SELECT * FROM vw_companies_placement_count',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Total student placements achieved per company.'
    },
    'vw_company_job_stats': {
        name: 'Company Job Stats',
        category: 'view',
        sql: 'SELECT * FROM vw_company_job_stats',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Job distribution and average package analysis per company.'
    },
    'vw_company_max_salary': {
        name: 'Maximum Salaries Offered',
        category: 'view',
        sql: 'SELECT * FROM vw_company_max_salary',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Highlights the highest salary packages offered by each firm.'
    },
    'vw_company_visit_trends': {
        name: 'Company Visit Trends',
        category: 'view',
        sql: 'SELECT * FROM vw_company_visit_trends',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Analyzes recruitment frequency and timing over several years.'
    },
    'vw_interviews_per_company': {
        name: 'Interviews per Company',
        category: 'view',
        sql: 'SELECT * FROM vw_interviews_per_company',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Analysis of interview volume and scheduling per firm.'
    },
    'vw_job_profile_details': {
        name: 'Job Profile Details (Extended)',
        category: 'view',
        sql: 'SELECT * FROM vw_job_profile_details',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Comprehensive data on all active and historical job profiles.'
    },
    'vw_jobs_by_eligibility': {
        name: 'Jobs by Eligibility',
        category: 'view',
        sql: 'SELECT * FROM vw_jobs_by_eligibility',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Categorizes job opportunities based on CGPA and branch requirements.'
    },
    'vw_jobs_by_type': {
        name: 'Jobs by Type',
        category: 'view',
        sql: 'SELECT * FROM vw_jobs_by_type',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Breakdown of roles into Full-Time, Internship, and Contract categories.'
    },
    'vw_max_salary_per_company': {
        name: 'Max Salary per Company',
        category: 'view',
        sql: 'SELECT * FROM vw_max_salary_per_company',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Comparison of the peak salary packages offered across all registered firms.'
    },
    'vw_open_jobs': {
        name: 'Open Job Openings',
        category: 'view',
        sql: 'SELECT * FROM vw_open_jobs',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Real-time list of all job profiles currently accepting applications.'
    },
    'vw_admin_ineligible': {
        name: 'Ineligible Students',
        category: 'view',
        sql: 'SELECT * FROM vw_students_not_eligible',
        roles: ['admin'],
        description: 'Students who do not meet the minimum criteria for current placement opportunities.'
    },
    'vw_admin_opted_out': {
        name: 'Opted Out Students',
        category: 'view',
        sql: 'SELECT * FROM vw_students_opted_out',
        roles: ['admin'],
        description: 'Students who have chosen not to participate in the placement process.'
    },
    'vw_admin_selected': {
        name: 'Selected Candidates',
        category: 'view',
        sql: 'SELECT * FROM vw_selected_candidates',
        roles: ['admin'],
        description: 'Master list of all students who have successfully secured job offers.'
    },
    'vw_admin_shortlisted': {
        name: 'Shortlisted Candidates',
        category: 'view',
        sql: 'SELECT * FROM vw_shortlisted_candidates',
        roles: ['admin'],
        description: 'Students who have passed initial screening and are in the interview pipeline.'
    },
    'vw_admin_app_stats': {
        name: 'Global Student App Stats',
        category: 'view',
        sql: 'SELECT * FROM vw_student_application_stats',
        roles: ['admin'],
        description: 'Comprehensive application metrics for the entire student population.'
    },
    'vw_admin_placement_status': {
        name: 'All Student Placement Status',
        category: 'view',
        sql: 'SELECT * FROM vw_student_placement_status',
        roles: ['admin'],
        description: 'Real-time tracking of placement eligibility and results across all departments.'
    },
    'vw_admin_skills': {
        name: 'Student Skills Summary',
        category: 'view',
        sql: 'SELECT * FROM vw_student_skills_summary',
        roles: ['admin'],
        description: 'Aggregated view of technical skills and certifications across the student body.'
    },
    'vw_admin_cgpa_range': {
        name: 'Students by CGPA Range',
        category: 'view',
        sql: 'SELECT * FROM vw_students_by_cgpa_range',
        roles: ['admin'],
        description: 'Statistical breakdown of academic performance across different CGPA brackets.'
    },
    'vw_admin_dept_stats': {
        name: 'Students by Department',
        category: 'view',
        sql: 'SELECT * FROM vw_students_by_dept',
        roles: ['admin'],
        description: 'Distribution of students across various academic branches.'
    },
    'vw_student_app_stats': {
        name: 'My Application Statistics',
        category: 'view',
        sql: 'SELECT * FROM vw_student_application_stats WHERE s_id = ?',
        roles: ['student'],
        description: 'Summary of your total applications and departmental records.'
    },
    'sub_premium_opps': {
        name: 'Premium Package Opportunities',
        category: 'subquery',
        sql: `
            SELECT comp_name, industry_type, avg_package_offered 
            FROM COMPANY 
            WHERE avg_package_offered > (SELECT AVG(avg_package_offered) FROM COMPANY)
            ORDER BY avg_package_offered DESC
        `,
        roles: ['student', 'coordinator', 'admin'],
        description: 'Companies offering packages significantly higher than the portal average.'
    },
    'sub_missed_jobs': {
        name: 'Missed Eligible Jobs',
        category: 'subquery',
        sql: `
            SELECT j.role, c.comp_name, j.package, j.app_deadline
            FROM JOB_PROFILE j
            JOIN COMPANY c ON j.comp_id = c.comp_id
            JOIN STUDENT s ON s.s_id = ?
            WHERE j.status = 'open'
            AND j.eligibility_cgpa <= s.cgpa
            AND j.job_id NOT IN (SELECT job_id FROM APPLICATION WHERE s_id = s.s_id)
        `,
        roles: ['student'],
        description: 'Active jobs you are qualified for but have not applied to yet.'
    },
    'sub_major_recruiters': {
        name: 'Active Major Recruiters',
        category: 'subquery',
        sql: `
            SELECT comp_name, industry_type, website
            FROM COMPANY
            WHERE comp_id IN (
                SELECT comp_id FROM JOB_PROFILE GROUP BY comp_id HAVING COUNT(*) > 1
            )
        `,
        roles: ['student', 'coordinator', 'admin'],
        description: 'Companies that have posted multiple different job profiles.'
    },
    'vw_placement_status': {
        name: 'My Placement Status',
        category: 'view',
        sql: 'SELECT * FROM vw_student_placement_status WHERE s_id = ?',
        roles: ['student'],
        description: 'Quick view of your current eligibility and placement results.'
    },
    'vw_audit_master': {
        name: 'Master Placement Audit',
        category: 'view',
        sql: 'SELECT * FROM vw_placement_master_audit',
        roles: ['admin'],
        description: 'Centralized view connecting students, companies, and coordinators for global oversight.'
    },
    'vw_admin_overall_summary': {
        name: 'Placement Overall Summary',
        category: 'view',
        sql: 'SELECT * FROM vw_placement_overall_summary',
        roles: ['admin'],
        description: 'High-level snapshot of total placements, offers, and recruitment metrics.'
    },
    'vw_admin_placement_rate': {
        name: 'Placement Rate per Dept',
        category: 'view',
        sql: 'SELECT * FROM vw_placement_rate_per_dept',
        roles: ['admin'],
        description: 'Percentage-based analysis of placement success across different branches.'
    },
    'vw_admin_placements_dept': {
        name: 'Placements by Department',
        category: 'view',
        sql: 'SELECT * FROM vw_placements_by_dept',
        roles: ['admin'],
        description: 'Detailed count of student placements categorized by their academic department.'
    },
    'vw_admin_placements_year': {
        name: 'Placements by Year',
        category: 'view',
        sql: 'SELECT * FROM vw_placements_by_year',
        roles: ['admin'],
        description: 'Historical trend analysis showing recruitment volume across different academic years.'
    },
    'vw_admin_placed_details': {
        name: 'Master Placed Students List',
        category: 'view',
        sql: 'SELECT * FROM vw_placed_students_details',
        roles: ['admin'],
        description: 'Detailed student-by-student view of every successful placement recorded.'
    },
    'vw_admin_app_full': {
        name: 'Master Application Log',
        category: 'view',
        sql: 'SELECT * FROM vw_application_full_details',
        roles: ['admin'],
        description: 'Full log of all student applications with status and company info.'
    },
    'vw_admin_apps_status': {
        name: 'Applications by Status',
        category: 'view',
        sql: 'SELECT * FROM vw_applications_by_status',
        roles: ['admin'],
        description: 'Global breakdown of applications into Accepted, Pending, and Rejected categories.'
    },
    'vw_admin_apps_company': {
        name: 'Applications per Company',
        category: 'view',
        sql: 'SELECT * FROM vw_applications_per_company',
        roles: ['admin'],
        description: 'Analyzes which companies are attracting the most interest from students.'
    },
    'vw_admin_apps_job': {
        name: 'Applications per Job',
        category: 'view',
        sql: 'SELECT * FROM vw_applications_per_job',
        roles: ['admin'],
        description: 'Detailed analysis of application volume for individual job profiles.'
    },
    'vw_admin_apps_student': {
        name: 'Applications per Student',
        category: 'view',
        sql: 'SELECT * FROM vw_applications_per_student',
        roles: ['admin'],
        description: 'Identifies student engagement levels based on total applications submitted.'
    },
    'vw_admin_avg_ats': {
        name: 'Average ATS by Dept',
        category: 'view',
        sql: 'SELECT * FROM vw_avg_ats_by_dept',
        roles: ['admin'],
        description: 'Measures departmental resume quality through aggregated ATS score benchmarks.'
    },
    'vw_admin_avg_salary_company': {
        name: 'Avg Salary per Company',
        category: 'view',
        sql: 'SELECT * FROM vw_avg_salary_per_company',
        roles: ['admin'],
        description: 'Benchmarks the compensation levels offered by different participating firms.'
    },
    'vw_admin_avg_salary_dept': {
        name: 'Avg Salary per Dept',
        category: 'view',
        sql: 'SELECT * FROM vw_avg_salary_per_dept',
        roles: ['admin'],
        description: 'Comparison of financial placement success across different academic branches.'
    },
    'vw_readiness': {
        name: 'Departmental Readiness Report',
        category: 'view',
        sql: "SELECT * FROM vw_student_readiness WHERE (coord_id = ? OR 'admin' = ?)",
        roles: ['coordinator'],
        description: 'Analyzes which students meet criteria but haven\'t secured a placement yet.'
    },

    // --- JOINS (Relational Connections) ---
    'join_my_journey': {
        name: 'My Application Journey',
        category: 'join',
        sql: `
            SELECT a.applied_date, c.comp_name, j.role, a.status 
            FROM APPLICATION a
            JOIN JOB_PROFILE j ON a.job_id = j.job_id
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE a.s_id = ?
        `,
        roles: ['student'],
        description: '3-Way Join tracking your personal progress across different company applications.'
    },
    'join_admin_student_master': {
        name: 'Master Student Directory (with Coordinators)',
        category: 'join',
        sql: `
            SELECT pc.name as coordinator_name, pc.dept as coordinator_dept, s.*
            FROM STUDENT s
            LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id
            ORDER BY s.s_name ASC
        `,
        roles: ['admin'],
        description: 'Global master view connecting every student with their assigned placement coordinator details.'
    },
    'vw_applicant_details': {
        name: 'Student Applicant Profiles',
        category: 'view',
        sql: `
            SELECT s.s_name, s.email, s.dept, s.cgpa, j.role as applied_role, a.status, a.applied_date
            FROM STUDENT s
            JOIN APPLICATION a ON s.s_id = a.s_id
            JOIN JOB_PROFILE j ON a.job_id = j.job_id
            WHERE j.comp_id = ?
            ORDER BY a.applied_date DESC
        `,
        roles: ['company'],
        description: 'Complete profiles of students who have applied to your active job openings.'
    },
    'vw_student_details': {
        name: 'Assigned Student Details',
        category: 'view',
        sql: "SELECT s_id, s_name, email, dept, cgpa, graduation_yr, profile_status, coordinator_name, coordinator_dept FROM vw_student_details WHERE coord_id = ?",
        roles: ['coordinator'],
        description: 'Comprehensive student details including their assigned coordinator info.'
    },
    'join_job_requirements': {
        name: 'Job Skills & Eligibility',
        category: 'join',
        sql: `
            SELECT j.role, c.comp_name, s.skill_name, b.branch_name
            FROM JOB_PROFILE j
            JOIN COMPANY c ON j.comp_id = c.comp_id
            LEFT JOIN JOB_REQUIRED_SKILL s ON j.job_id = s.job_id
            LEFT JOIN JOB_ELIGIBILITY_BRANCH b ON j.job_id = b.job_id
            WHERE j.status = 'open'
        `,
        roles: ['student', 'coordinator'],
        description: 'Complex Join connecting Job Profiles with their required skills and eligible branches.'
    },
    'join_interviews': {
        name: 'Scheduled Interviews (Detailed)',
        category: 'join',
        sql: `
            SELECT i.interview_date, i.interview_time, s.s_name, c.comp_name, i.panel_name, i.interview_mode
            FROM INTERVIEW i
            JOIN STUDENT s ON i.s_id = s.s_id
            JOIN COMPANY c ON i.job_id IN (SELECT job_id FROM JOB_PROFILE WHERE comp_id = c.comp_id)
            WHERE s.coord_id = ? OR 'admin' = ?
            ORDER BY i.interview_date ASC
        `,
        roles: ['coordinator', 'admin'],
        description: 'Multi-table Join connecting students, interviews, and company names for scheduling.'
    },
    'join_student_offers': {
        name: 'Departmental Offer List',
        category: 'join',
        sql: `
            SELECT s.s_name, c.comp_name, o.ctc, o.offer_status
            FROM STUDENT s
            JOIN OFFER o ON s.s_id = o.s_id
            JOIN COMPANY c ON o.job_id IN (SELECT job_id FROM JOB_PROFILE WHERE comp_id = c.comp_id)
            WHERE s.coord_id = ? OR 'admin' = ?
        `,
        roles: ['coordinator', 'admin'],
        description: 'Joins Student profiles with their issued offers and company data.'
    },

    // --- SUBQUERIES (Complex Logic) ---
    'sub_top_paying': {
        name: 'Elite Salary Packages (Nested)',
        category: 'subquery',
        sql: `
            SELECT comp_name, role, package 
            FROM JOB_PROFILE j
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE package > (SELECT AVG(package) FROM JOB_PROFILE)
            ORDER BY package DESC
        `,
        roles: ['student', 'coordinator', 'admin'],
        description: 'Uses a Nested Subquery to identify roles offering packages higher than the global average.'
    },
    'sub_active_depts': {
        name: 'Highest Placement Depts (IN Subquery)',
        category: 'subquery',
        sql: `
            SELECT dept, COUNT(*) as placed_count
            FROM STUDENT
            WHERE s_id IN (SELECT s_id FROM PLACEMENT_RECORD WHERE status = 'confirmed')
            GROUP BY dept
            ORDER BY placed_count DESC
        `,
        roles: ['admin'],
        description: 'Uses an IN subquery to find departments with confirmed placements.'
    },
    'sub_coord_student_counts': {
        name: 'Coordinator Workload Analysis',
        category: 'subquery',
        sql: `
            SELECT pc.name, pc.dept, 
                   (SELECT COUNT(*) FROM STUDENT WHERE coord_id = pc.coord_id) as assigned_student_count
            FROM PLACEMENT_COORDINATOR pc
            ORDER BY assigned_student_count DESC
        `,
        roles: ['admin'],
        description: 'Correlated subquery displaying each coordinator and their current total of assigned students.'
    }
};

// GET /api/queries/list - Get available queries for the current user's role
router.get('/list', requireAuth, (req, res) => {
    // Normalize role: treat 'cgdc_admin' as 'admin'
    const role = req.user.role === 'cgdc_admin' ? 'admin' : req.user.role;
    
    const available = Object.keys(QUERY_REGISTRY)
        .filter(key => QUERY_REGISTRY[key].roles.includes(role))
        .map(key => ({
            id: key,
            name: QUERY_REGISTRY[key].name,
            category: QUERY_REGISTRY[key].category,
            description: QUERY_REGISTRY[key].description,
            sql: QUERY_REGISTRY[key].sql
        }));
    res.json(available);
});

// POST /api/queries/run/:id - Execute a specific query
router.post('/run/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const queryInfo = QUERY_REGISTRY[id];
    
    // Normalize role: treat 'cgdc_admin' as 'admin'
    const role = req.user.role === 'cgdc_admin' ? 'admin' : req.user.role;

    if (!queryInfo || !queryInfo.roles.includes(role)) {
        return res.status(403).json({ message: 'Unauthorized query access.' });
    }

    try {
        let params = [];
        const placeholderCount = (queryInfo.sql.match(/\?/g) || []).length;
        
        if (placeholderCount > 0) {
            let contextValue = req.user.entityId || req.user.entity_id;
            
            // Admins get 'admin' string to bypass filters
            if (req.user.role === 'admin' || req.user.role === 'cgdc_admin') {
                contextValue = 'admin';
            }
            // Other roles (student, coordinator, company) use their own entityId directly

            params = Array(placeholderCount).fill(contextValue);
        }

        const [rows] = await pool.query(queryInfo.sql, params);
        res.json({
            sql: queryInfo.sql,
            data: rows
        });
    } catch (err) {
        console.error('Query execution error:', err);
        res.status(500).json({ message: 'Database error: ' + err.message });
    }
});

export default router;
