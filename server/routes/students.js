// server/routes/students.js — UPDATED FOR REMOTE SCHEMA
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all students
router.get('/', requireAuth, async (req, res) => {
    try {
        // Fetch from the STUDENT table
        const [rows] = await pool.query('SELECT s_id as id, s_name as name, email, phone, dept, cgpa, profile_status as status FROM STUDENT');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching students' });
    }
});

// Get profile for current logged in student
router.get('/profile', requireAuth, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });

    try {
        const [rows] = await pool.query('SELECT * FROM STUDENT WHERE s_id = ?', [req.user.entityId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Student not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// Update profile (Resume URL etc.)
router.put('/profile', requireAuth, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });

    const { resume_url, phone, avatar_url } = req.body;

    try {
        await pool.query(
            'UPDATE STUDENT SET resume_url = ?, phone = ?, avatar_url = ? WHERE s_id = ?',
            [resume_url, phone, avatar_url, req.user.entityId]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// Opt-out from placement process
router.post('/opt-out', requireAuth, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });

    try {
        const student_id = req.user.entityId;
        // Check current status
        const [student] = await pool.query('SELECT profile_status FROM STUDENT WHERE s_id = ?', [student_id]);
        
        if (student.length === 0) return res.status(404).json({ message: 'Student not found' });
        if (student[0].profile_status !== 'active') {
            return res.status(400).json({ message: 'Only active students can opt out.' });
        }

        await pool.query("UPDATE STUDENT SET profile_status = 'opted_out' WHERE s_id = ?", [student_id]);
        res.json({ message: 'You have successfully opted out of the placement process.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error opting out: ' + err.message });
    }
});

export default router;
