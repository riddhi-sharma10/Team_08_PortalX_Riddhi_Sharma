// server/routes/students.js — UPDATED FOR REMOTE SCHEMA
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all students
router.get('/', requireAuth, async (req, res) => {
    try {
        // Fetch from the STUDENT table and join with DEPARTMENT
        const [rows] = await pool.query('SELECT s.s_id as id, s.s_name as name, s.email, s.phone, d.dept_name as dept, s.cgpa, s.profile_status as status FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id');
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
        const [rows] = await pool.query(`
            SELECT s.*, d.dept_name as dept, pc.name as coordinator_name, pc.email as coordinator_email, r.file_url as resume_url
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id
            LEFT JOIN RESUME r ON s.s_id = r.s_id
            WHERE s.s_id = ?
        `, [req.user.entityId]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'Student not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// Update profile (Resume URL etc.)
router.put('/profile', requireAuth, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });

    const { phone, avatar_url } = req.body;
    let updates = [];
    let params = [];

    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }

    if (updates.length === 0) return res.json({ message: 'No changes provided' });

    params.push(req.user.entityId);
    try {
        const sql = `UPDATE STUDENT SET ${updates.join(', ')} WHERE s_id = ?`;
        await pool.query(sql, params);
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating profile', details: err.message });
    }
});

// Opt-out from placement process
router.post('/opt-out', requireAuth, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });

    const conn = await pool.getConnection();
    try {
        const student_id = req.user.entityId;
        await conn.beginTransaction();

        // CRITERION 13: STATUS CONFLICT LOCK
        // Lock the student row to prevent simultaneous updates from coordinators
        const [student] = await conn.query('SELECT profile_status FROM STUDENT WHERE s_id = ? FOR UPDATE', [student_id]);
        
        if (student.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: 'Student not found' });
        }
        
        if (student[0].profile_status !== 'active') {
            await conn.rollback();
            return res.status(400).json({ message: 'Only active students can opt out.' });
        }

        await conn.query("UPDATE STUDENT SET profile_status = 'opted_out' WHERE s_id = ?", [student_id]);
        await conn.commit();

        // --- NOTIFY ADMIN: Student opted out ---
        try {
            const [stuInfo] = await pool.query(
                'SELECT s.s_name, d.dept_name as dept, s.email FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id WHERE s.s_id = ?', [student_id]
            );
            if (stuInfo.length > 0) {
                const s = stuInfo[0];
                const [admins] = await pool.query('SELECT email FROM CGDC_ADMIN');
                for (const admin of admins) {
                    await pool.query(
                        `INSERT INTO NOTIFICATION (user_id, user_role, title, content, type) VALUES (?, 'admin', ?, ?, 'alert')`,
                        [admin.email, 'Student Opted Out',
                         `${s.s_name} (${s.dept}) has opted out of the placement process.`]
                    );
                }
            }
        } catch (nErr) {
            console.warn('[Notif] Failed to notify admin on opt-out:', nErr.message);
        }

        res.json({ message: 'You have successfully opted out of the placement process.' });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ message: 'Error opting out: ' + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// Get upcoming interviews
router.get('/interviews/upcoming', requireAuth, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });

    try {
        const student_id = req.user.entityId;
        
        // Check student status
        const [sRow] = await pool.query('SELECT profile_status FROM STUDENT WHERE s_id = ?', [student_id]);
        const isPlaced = sRow[0]?.profile_status === 'placed';

        let query = '';
        if (isPlaced) {
            // If placed, show previous interviews
            query = `
                SELECT i.interview_id as id, c.comp_name as company, j.role, DATE_FORMAT(i.interview_date, '%e %b %Y') as date, TIME_FORMAT(i.interview_time, '%h:%i %p') as time, i.interview_mode as mode, i.panel_name as panel
                FROM INTERVIEW i
                JOIN JOB_PROFILE j ON i.job_id = j.job_id
                JOIN COMPANY c ON j.comp_id = c.comp_id
                WHERE i.s_id = ?
                ORDER BY i.interview_date DESC, i.interview_time DESC
                LIMIT 15
            `;
        } else {
            // If active, show upcoming interviews for shortlisted/selected applications
            query = `
                SELECT i.interview_id as id, c.comp_name as company, j.role, DATE_FORMAT(i.interview_date, '%e %b %Y') as date, TIME_FORMAT(i.interview_time, '%h:%i %p') as time, i.interview_mode as mode, i.panel_name as panel
                FROM INTERVIEW i
                JOIN JOB_PROFILE j ON i.job_id = j.job_id
                JOIN COMPANY c ON j.comp_id = c.comp_id
                JOIN APPLICATION a ON a.s_id = i.s_id AND a.job_id = i.job_id
                WHERE i.s_id = ? AND i.interview_date >= CURDATE()
                AND a.status IN ('shortlisted', 'selected')
                ORDER BY i.interview_date ASC, i.interview_time ASC
            `;
        }

        const [rows] = await pool.query(query, [student_id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching upcoming interviews' });
    }
});

export default router;
