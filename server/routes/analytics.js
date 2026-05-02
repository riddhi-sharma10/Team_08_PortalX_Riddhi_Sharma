
// server/routes/analytics.js — UPDATED FOR REMOTE SCHEMA
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 1. Get Summary Stats (using views if possible)
router.get('/summary', requireAuth, async (req, res) => {
    try {
        const [overall] = await pool.query('SELECT * FROM vw_placement_overall_summary');
        const [companies] = await pool.query('SELECT COUNT(*) as count FROM COMPANY');
        const [apps] = await pool.query('SELECT COUNT(*) as count FROM APPLICATION');

        const stats = {
            totalStudents: overall[0]?.total_students || 0,
            totalPlaced: overall[0]?.total_placed_students || 0,
            placementRate: overall[0] ? ((overall[0].total_placed_students / overall[0].total_students) * 100).toFixed(1) : 0,
            totalCompanies: companies[0].count,
            totalApplications: apps[0].count
        };

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching summary analytics' });
    }
});

// 2. Get Student Application Stats
router.get('/students-with-applications', requireAuth, async (req, res) => {
    try {
        // Fetch from the pre-built view on your server
        const [rows] = await pool.query('SELECT s_id as id, s_name as student_name, dept, total_applications FROM vw_student_application_stats');
        
        // Add additional info from BASE tables
        const [placements] = await pool.query('SELECT s_id FROM OFFER WHERE status = "Accepted"');
        const placedIds = new Set(placements.map(p => p.s_id));

        const enriched = rows.map(r => ({
            ...r,
            roll_no: `ROLL-${r.id}`, 
            total_applications: r.total_applications,
            selected_count: placedIds.has(r.id) ? 1 : 0,
            cgpa: '--'
        }));

        res.json({ rows: enriched });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching student application statistics' });
    }
});

// 3. Get Full Placement History (for Student History page)
router.get('/history', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                vh.academic_year AS year,
                vh.comp_id AS comp_id,
                c.comp_name AS comp_name,
                vh.students_placed AS placed,
                vh.highest_salary AS highest,
                vh.avg_salary AS average,
                vh.lowest_salary AS lowest
            FROM COMPANY_VISIT_HISTORY vh
            JOIN COMPANY c ON vh.comp_id = c.comp_id
            ORDER BY vh.academic_year DESC, c.comp_name ASC
        `);
        
        res.json(rows);
    } catch (err) {
        console.error('History Sync Error:', err);
        res.status(500).json({ message: 'Error fetching placement history' });
    }
});

// 4. Advanced Analytics - Using HAVING Clause
// 4a. Top Recruiters (Companies with hires >= threshold)
router.get('/top-recruiters', requireAuth, async (req, res) => {
    try {
        const minHires = req.query.min || 3;
        const [rows] = await pool.query(`
            SELECT 
                c.comp_name AS company, 
                COUNT(pr.record_id) AS hire_count, 
                ROUND(AVG(pr.salary_offered), 2) AS avg_package
            FROM COMPANY c
            JOIN PLACEMENT_RECORD pr ON c.comp_id = pr.comp_id
            GROUP BY c.comp_id, c.comp_name
            HAVING hire_count >= ?
            ORDER BY hire_count DESC
        `, [Number(minHires)]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching top recruiters' });
    }
});

// 4b. Active Applicants (Students with applications >= threshold)
router.get('/active-applicants', requireAuth, async (req, res) => {
    try {
        const minApps = req.query.min || 5;
        const [rows] = await pool.query(`
            SELECT 
                s.s_name AS name, 
                s.dept, 
                COUNT(a.app_id) AS app_count
            FROM STUDENT s
            JOIN APPLICATION a ON s.s_id = a.s_id
            GROUP BY s.s_id, s.s_name, s.dept
            HAVING app_count >= ?
            ORDER BY app_count DESC
        `, [Number(minApps)]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching active applicants' });
    }
});

// 4c. High Performance Depts (Depts with average CGPA >= threshold)
router.get('/department-performance', requireAuth, async (req, res) => {
    try {
        const minCgpa = req.query.min || 8.0;
        const [rows] = await pool.query(`
            SELECT 
                dept, 
                COUNT(s_id) AS student_count, 
                ROUND(AVG(cgpa), 2) AS avg_dept_cgpa
            FROM STUDENT
            GROUP BY dept
            HAVING avg_dept_cgpa >= ?
            ORDER BY avg_dept_cgpa DESC
        `, [Number(minCgpa)]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching dept performance' });
    }
});

// 4d. Elite Students (Students with multiple offers > 1)
router.get('/elite-students', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                s.s_name AS name, 
                s.dept, 
                COUNT(o.offer_id) AS offer_count
            FROM STUDENT s
            JOIN OFFER o ON s.s_id = o.s_id
            GROUP BY s.s_id, s.s_name, s.dept
            HAVING offer_count > 1
            ORDER BY offer_count DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching elite students' });
    }
});

// 4e. Underperforming Sectors (Industry types with AVG package < threshold)
router.get('/underperforming-sectors', requireAuth, async (req, res) => {
    try {
        const threshold = req.query.threshold || 5.0; // Default 5 LPA
        const [rows] = await pool.query(`
            SELECT 
                c.industry_type AS sector, 
                COUNT(pr.record_id) AS placement_count, 
                ROUND(AVG(pr.salary_offered), 2) AS avg_package
            FROM COMPANY c
            JOIN PLACEMENT_RECORD pr ON c.comp_id = pr.comp_id
            GROUP BY c.industry_type
            HAVING avg_package < ?
            ORDER BY avg_package ASC
        `, [Number(threshold)]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching sector performance' });
    }
});

// 4f. Coordinator Workload (Coordinators with student count > threshold)
router.get('/coordinator-workload', requireAuth, async (req, res) => {
    try {
        const threshold = req.query.max || 50; 
        const [rows] = await pool.query(`
            SELECT 
                pc.name AS coordinator, 
                pc.dept, 
                COUNT(s.s_id) AS student_count
            FROM PLACEMENT_COORDINATOR pc
            JOIN STUDENT s ON pc.coord_id = s.coord_id
            GROUP BY pc.coord_id, pc.name, pc.dept
            HAVING student_count > ?
            ORDER BY student_count DESC
        `, [Number(threshold)]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching coordinator workload' });
    }
});

export default router;
