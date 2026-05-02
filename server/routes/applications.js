// server/routes/applications.js — UPDATED FOR REMOTE SCHEMA
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        // Use the view for full details (Company names, Roles, etc.)
        let query = 'SELECT * FROM vw_application_full_details';
        let params = [];

        if (req.user.role === 'student') {
            // We need to filter by student name if using the view, 
            // OR join with the base table to filter by s_id.
            // Joining with base table APPLICATION is safer for filtering by ID.
            query = `
                SELECT v.* 
                FROM vw_application_full_details v
                JOIN APPLICATION a ON v.app_id = a.app_id
                WHERE a.s_id = ?
            `;
            params.push(req.user.entityId);
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching applications' });
    }
});

// POST /api/applications - Submit a new application
router.post('/', requireAuth, async (req, res) => {
    try {
        const { job_id } = req.body;
        const student_id = req.user.entityId;

        if (!job_id) return res.status(400).json({ message: 'Job ID is required' });

        // Check if already applied
        const [existing] = await pool.query(
            'SELECT app_id FROM APPLICATION WHERE s_id = ? AND job_id = ?',
            [student_id, job_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'You have already applied for this position.' });
        }

        // Insert new application
        await pool.query(
            "INSERT INTO APPLICATION (s_id, job_id, applied_date, status) VALUES (?, ?, CURDATE(), 'under_review')",
            [student_id, job_id]
        );

        res.json({ message: 'application submitted' });
    } catch (err) {
        console.error('SUBMIT_ERROR:', err);
        res.status(500).json({ message: 'Error submitting application: ' + err.message });
    }
});

export default router;
