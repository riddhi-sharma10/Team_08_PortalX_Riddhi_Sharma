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
                SELECT v.*, a.job_id, o.offer_status
                FROM vw_application_full_details v
                JOIN APPLICATION a ON v.app_id = a.app_id
                LEFT JOIN OFFER o ON a.s_id = o.s_id AND a.job_id = o.job_id
                WHERE a.s_id = ?
            `;
            params.push(req.user.entityId);
        } else {
            query = `
                SELECT v.*, a.job_id, o.offer_status
                FROM vw_application_full_details v
                JOIN APPLICATION a ON v.app_id = a.app_id
                LEFT JOIN OFFER o ON a.s_id = o.s_id AND a.job_id = o.job_id
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

        // CRITERION 13: ELIGIBILITY LOCK
        // Lock the JOB_PROFILE row to ensure no one is changing criteria while we apply
        const [job] = await pool.query('SELECT eligibility_cgpa FROM JOB_PROFILE WHERE job_id = ? FOR UPDATE', [job_id]);
        if (job.length === 0) return res.status(404).json({ message: 'Job not found' });

        // Get student CGPA
        const [studentData] = await pool.query('SELECT cgpa FROM STUDENT WHERE s_id = ?', [student_id]);
        const studentCGPA = Number(studentData[0]?.cgpa || 0);
        const requiredCGPA = Number(job[0].eligibility_cgpa || 0);

        if (studentCGPA < requiredCGPA) {
            return res.status(403).json({ message: `Your CGPA (${studentCGPA}) does not meet the criteria (${requiredCGPA}).` });
        }

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

        // 2. CRITERION 13: VACANCY LOCK
        // Lock the JOB_PROFILE row to prevent over-acceptance (FOR UPDATE)
        const [job] = await conn.query(
            "SELECT package, vacancies FROM JOB_PROFILE WHERE job_id = ? FOR UPDATE", 
            [job_id]
        );
        
        if (job.length === 0) throw new Error('Job not found');
        const vacancies = Number(job[0].vacancies || 0);
        
        if (vacancies <= 0) {
            throw new Error('This role has reached its vacancy limit. No more offers can be accepted.');
        }

        // Decrement vacancies
        await conn.query("UPDATE JOB_PROFILE SET vacancies = vacancies - 1 WHERE job_id = ?", [job_id]);

        const [existingOffer] = await conn.query(
            "SELECT * FROM OFFER WHERE s_id = ? AND job_id = ?",
            [student_id, job_id]
        );

        if (existingOffer.length > 0) {
            await conn.query(
                "UPDATE OFFER SET offer_status = 'accepted' WHERE s_id = ? AND job_id = ?",
                [student_id, job_id]
            );
        } else {
            const ctc = job[0].package || 0;
            await conn.query(
                "INSERT INTO OFFER (s_id, job_id, offer_status, ctc, issued_on) VALUES (?, ?, 'accepted', ?, CURDATE())",
                [student_id, job_id, ctc]
            );
        }

        // 3. Update APPLICATION status to selected
        await conn.query(
            "UPDATE APPLICATION SET status = 'selected' WHERE s_id = ? AND job_id = ?",
            [student_id, job_id]
        );

        // 4. Mark student as PLACED
        await conn.query(
            "UPDATE STUDENT SET profile_status = 'placed' WHERE s_id = ?",
            [student_id]
        );

        // 5. Create a PLACEMENT_RECORD for Admin sync
        // Get details for the record
        const [studentDetails] = await conn.query("SELECT dept, graduation_yr FROM STUDENT WHERE s_id = ?", [student_id]);
        const [jobDetails] = await conn.query("SELECT comp_id, package FROM JOB_PROFILE WHERE job_id = ?", [job_id]);
        
        const dept = studentDetails[0]?.dept || 'Unknown';
        const gradYear = studentDetails[0]?.graduation_yr || new Date().getFullYear();
        const compId = jobDetails[0]?.comp_id;
        const salary = jobDetails[0]?.package || 0;

        if (compId) {
            await conn.query(`
                INSERT INTO PLACEMENT_RECORD (s_id, comp_id, academic_year, salary_offered, stream, status, recorded_on)
                VALUES (?, ?, ?, ?, ?, 'confirmed', CURDATE())
            `, [student_id, compId, gradYear, salary, dept]);
        }

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
