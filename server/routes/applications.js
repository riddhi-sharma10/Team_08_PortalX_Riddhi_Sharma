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
                SELECT v.*, a.job_id 
                FROM vw_application_full_details v
                JOIN APPLICATION a ON v.app_id = a.app_id
                WHERE a.s_id = ?
            `;
            params.push(req.user.entityId);
        } else {
            query = `
                SELECT v.*, a.job_id 
                FROM vw_application_full_details v
                JOIN APPLICATION a ON v.app_id = a.app_id
            `;
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

        // Check student status - only active students can apply
        const [student] = await pool.query('SELECT profile_status FROM STUDENT WHERE s_id = ?', [student_id]);
        if (student.length > 0 && (student[0].profile_status === 'placed' || student[0].profile_status === 'opted_out')) {
            const reason = student[0].profile_status === 'placed' ? 'placed' : 'opted out';
            return res.status(403).json({ message: `You are already ${reason} and cannot apply for more jobs.` });
        }

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

// POST /api/applications/accept - Accept an offer
router.post('/accept', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { job_id } = req.body;
        const student_id = req.user.entityId;

        await conn.beginTransaction();

        // 1. Check if already placed
        const [student] = await conn.query('SELECT profile_status FROM STUDENT WHERE s_id = ?', [student_id]);
        if (student.length > 0 && student[0].profile_status === 'placed') {
            throw new Error('You have already accepted an offer.');
        }

        // 2. Update OFFER table
        const [offerUpdate] = await conn.query(
            "UPDATE OFFER SET offer_status = 'accepted' WHERE s_id = ? AND job_id = ?",
            [student_id, job_id]
        );

        if (offerUpdate.affectedRows === 0) {
            // If no record in OFFER table, maybe create one? 
            // Usually, there should be an offer record if status is 'selected'.
            // But let's be safe and just update APPLICATION status too.
        }

        // 3. Update APPLICATION status to selected (just in case it wasn't)
        await conn.query(
            "UPDATE APPLICATION SET status = 'selected' WHERE s_id = ? AND job_id = ?",
            [student_id, job_id]
        );

        // 4. Mark student as PLACED
        await conn.query(
            "UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = ?",
            [student_id]
        );

        await conn.commit();
        res.json({ message: 'Offer accepted successfully! You are now marked as PLACED.' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message || 'Error accepting offer' });
    } finally {
        conn.release();
    }
});

export default router;
