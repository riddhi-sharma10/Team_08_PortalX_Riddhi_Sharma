
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
        name: 'Student Profiles (Basic)',
        category: 'table',
        sql: 'SELECT s_id, s_name, dept, cgpa, profile_status FROM STUDENT WHERE dept = ? OR "admin" = ?',
        roles: ['coordinator', 'admin'],
        description: 'Profile overview for students in your department.'
    },
    'tbl_roles': {
        name: 'System User Roles',
        category: 'table',
        sql: 'SELECT role_id, username, role, entity_id FROM USER_ROLE',
        roles: ['admin'],
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

    // --- VIEWS (Simplified Abstractions) ---
    'vw_top_hiring': {
        name: 'Top Hiring Companies',
        category: 'view',
        sql: 'SELECT * FROM vw_top_hiring_companies',
        roles: ['student', 'coordinator', 'admin'],
        description: 'Companies ranked by their recruitment volume in the current cycle.'
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
    'vw_readiness': {
        name: 'Departmental Readiness Report',
        category: 'view',
        sql: 'SELECT * FROM vw_student_readiness WHERE (dept = ? OR "admin" = ?)',
        roles: ['coordinator', 'admin'],
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
    'join_pending_interviews': {
        name: 'Scheduled Interviews (Detailed)',
        category: 'join',
        sql: `
            SELECT i.interview_date, i.interview_time, s.s_name, c.comp_name, i.room_no
            FROM INTERVIEW i
            JOIN STUDENT s ON i.s_id = s.s_id
            JOIN COMPANY c ON i.job_id IN (SELECT job_id FROM JOB_PROFILE WHERE comp_id = c.comp_id)
            WHERE s.dept = ? OR "admin" = ?
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
            WHERE s.dept = ? OR "admin" = ?
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
    'sub_unassigned_students': {
        name: 'Students without Applications (NOT EXISTS)',
        category: 'subquery',
        sql: `
            SELECT s_id, s_name, dept, cgpa 
            FROM STUDENT s
            WHERE NOT EXISTS (SELECT 1 FROM APPLICATION a WHERE a.s_id = s.s_id)
            AND (dept = ? OR "admin" = ?)
        `,
        roles: ['coordinator', 'admin'],
        description: 'Uses a Correlated Subquery (NOT EXISTS) to find students who haven\'t applied for any jobs yet.'
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
        // Context Injection based on role
        if (queryInfo.sql.includes('?')) {
            if (role === 'student') {
                params = [req.user.entityId];
            } else if (role === 'coordinator') {
                // If query has two ?, use dept and role
                if ((queryInfo.sql.match(/\?/g) || []).length >= 2) {
                    // Try to get dept from request or user object
                    params = [req.user.dept || 'CS', role]; 
                } else {
                    params = [req.user.dept || 'CS'];
                }
            } else if (role === 'admin') {
                params = ['admin', 'admin'];
            }
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
