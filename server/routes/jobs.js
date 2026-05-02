// server/routes/jobs.js
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/jobs - Get all job profiles with company details
router.get('/', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                j.*,
                c.comp_name,
                c.tier,
                c.industry_type,
                (SELECT COUNT(*) FROM APPLICATION WHERE s_id = ? AND job_id = j.job_id) as has_applied
            FROM JOB_PROFILE j
            JOIN COMPANY c ON j.comp_id = c.comp_id
            ORDER BY j.job_id DESC
        `, [req.user.entityId]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching jobs:', err);
        res.status(500).json({ message: 'Error fetching jobs', error: err.message });
    }
});

// GET /api/jobs/company/:compId - Get jobs for specific company
router.get('/company/:compId', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                j.job_id, 
                j.role, 
                j.package, 
                j.eligibility_cgpa,
                j.status,
                j.job_type,
                j.app_deadline,
                c.comp_name
            FROM JOB_PROFILE j
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE j.comp_id = ?
            ORDER BY j.job_id
        `, [req.params.compId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching company jobs' });
    }
});

// GET /api/jobs/open - Get only open jobs
router.get('/open', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                j.job_id, 
                j.role, 
                j.package, 
                j.eligibility_cgpa,
                j.status,
                c.comp_name
            FROM JOB_PROFILE j
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE LOWER(j.status) = 'open'
            ORDER BY j.job_id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching open jobs' });
    }
});

// GET /api/jobs/info/:id - Get full details including branches and skills
router.get('/info/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const [jobs] = await pool.query(`
            SELECT j.*, c.comp_name, c.industry_type, c.tier,
            (SELECT COUNT(*) FROM APPLICATION WHERE s_id = ? AND job_id = j.job_id) as has_applied
            FROM JOB_PROFILE j
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE j.job_id = ?
        `, [req.user.entityId, id]);

        if (jobs.length === 0) return res.status(404).json({ message: 'Job not found' });
        const job = jobs[0];

        // Fetch eligible branches
        const [branches] = await pool.query('SELECT branch_name FROM JOB_ELIGIBILITY_BRANCH WHERE job_id = ?', [id]);
        job.eligible_branches = branches.map(b => b.branch_name);

        // Fetch required skills
        const [skills] = await pool.query('SELECT skill_name FROM JOB_REQUIRED_SKILL WHERE job_id = ?', [id]);
        job.skills = skills.map(s => s.skill_name);

        res.json(job);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching job details' });
    }
});

export default router;
