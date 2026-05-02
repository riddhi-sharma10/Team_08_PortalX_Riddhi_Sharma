// server/routes/companies.js — UPDATED FOR REMOTE SCHEMA
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                comp_id as id, 
                comp_name as name, 
                industry_type as industry, 
                tier, 
                website, 
                'active' as status 
            FROM COMPANY
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching companies' });
    }
});

router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch company core info
        const [companies] = await pool.query(`
            SELECT 
                comp_id as id, 
                comp_name as name, 
                industry_type as industry, 
                tier, 
                website,
                'active' as status
            FROM COMPANY 
            WHERE comp_id = ?
        `, [id]);

        if (companies.length === 0) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const company = companies[0];

        // Fetch associated open jobs (be case insensitive with status)
        const [jobs] = await pool.query(`
            SELECT 
                j.job_id as id, 
                j.role as title, 
                j.package as salary, 
                j.eligibility_cgpa as cgpa,
                (SELECT GROUP_CONCAT(skill_name SEPARATOR ', ') FROM JOB_REQUIRED_SKILL WHERE job_id = j.job_id) as skills,
                j.status
            FROM JOB_PROFILE j
            WHERE j.comp_id = ?
        `, [id]);

        company.positions = jobs;
        
        // Fetch real placement count from history
        const [placements] = await pool.query(`
            SELECT COUNT(*) as total 
            FROM PLACEMENT_RECORD 
            WHERE comp_id = ?
        `, [id]);

        company.activeJobs = jobs.length;
        company.placements = placements[0].total || 0;

        res.json(company);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching company details' });
    }
});

export default router;
