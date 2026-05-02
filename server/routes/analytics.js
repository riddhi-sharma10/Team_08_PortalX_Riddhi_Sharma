
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

export default router;
