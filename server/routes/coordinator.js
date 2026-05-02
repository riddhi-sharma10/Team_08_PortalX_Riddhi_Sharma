
import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

function requireCoordinator(req, res, next) {
    if (req.user?.role !== 'coordinator') {
        return res.status(403).json({ message: 'Coordinator access only' });
    }
    next();
}
router.use(requireCoordinator);

// --- 1. Dashboard Stats ---
router.get('/dashboard', async (req, res) => {
    try {
        const id = req.user.entityId || 0;
        console.log(`[Coordinator API] Fetching dashboard for ID: ${id}`);

        const [students] = await pool.query('SELECT COUNT(*) AS total FROM STUDENT WHERE coord_id = ?', [id]);
        const [placedCount] = await pool.query("SELECT COUNT(*) AS total FROM STUDENT WHERE coord_id = ? AND profile_status = 'placed'", [id]);
        const [optedOutCount] = await pool.query("SELECT COUNT(*) AS total FROM STUDENT WHERE coord_id = ? AND profile_status = 'opted_out'", [id]);
        const [apps] = await pool.query(`SELECT COUNT(*) AS total FROM APPLICATION a INNER JOIN STUDENT s ON a.s_id = s.s_id WHERE s.coord_id = ?`, [id]);
        const [ints] = await pool.query(`SELECT COUNT(*) AS total FROM INTERVIEW i INNER JOIN STUDENT s ON i.s_id = s.s_id WHERE s.coord_id = ? AND i.interview_date >= CURDATE()`, [id]);

        // Chart Query
        const [rows] = await pool.query(`
            SELECT c.comp_name AS company, COUNT(*) AS count
            FROM APPLICATION a
            JOIN STUDENT s ON a.s_id = s.s_id
            JOIN JOB_PROFILE j ON a.job_id = j.job_id
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE s.coord_id = ?
            GROUP BY c.comp_id, c.comp_name
            ORDER BY count DESC
            LIMIT 5
        `, [id]);

        const tStudents = Number(students[0]?.total || 0);
        const tPlaced = Number(placedCount[0]?.total || 0);
        const tOptedOut = Number(optedOutCount[0]?.total || 0);
        const tActive = Math.max(0, tStudents - tPlaced - tOptedOut);

        const placementRate = tStudents > 0 ? ((tPlaced / tStudents) * 100).toFixed(1) : '0.0';

        res.json({
            totalStudents: tStudents,
            totalPlaced: tPlaced,
            totalOptedOut: tOptedOut,
            totalActive: tActive,
            placementRate,
            totalApplications: Number(apps[0]?.total || 0),
            upcomingInterviews: Number(ints[0]?.total || 0),
            appStats: rows.map(r => ({
                company: r.company || 'Unknown',
                count: Number(r.count || 0)
            }))
        });
    } catch (err) {
        console.error('Coordinator Dashboard Error:', err);
        res.status(500).json({ message: 'Error loading dashboard data' });
    }
});

// --- 2. My Students ---
router.get('/students', async (req, res) => {
    try {
        const id = req.user.entityId || 0;
        const [rows] = await pool.query(`
            SELECT s.s_id AS id, s.s_name AS name, s.email, s.dept, s.cgpa, s.graduation_yr AS gradYear, s.profile_status AS status,
            (SELECT COUNT(*) FROM APPLICATION WHERE s_id = s.s_id) AS appCount,
            (SELECT COUNT(*) FROM OFFER WHERE s_id = s.s_id) AS offerCount
            FROM STUDENT s
            WHERE s.coord_id = ?
            ORDER BY s.s_name ASC
        `, [id]);

        res.json(rows.map(r => ({
            id: r.id,
            name: r.name || 'Unknown',
            email: r.email,
            rollNo: `STU-${String(r.id).padStart(4, '0')}`,
            cgpa: Number(r.cgpa || 0).toFixed(2),
            gradYear: r.gradYear || '—',
            status: r.status || 'active',
            department: r.dept,
            appCount: Number(r.appCount || 0),
            offerCount: Number(r.offerCount || 0),
            avatar: (r.name || 'U S').split(' ').filter(p => p.length > 0).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '??'
        })));
    } catch (err) {
        res.status(500).json({ message: 'Error loading student list' });
    }
});

// --- 3. Applications ---
router.get('/applications', async (req, res) => {
    try {
        const id = req.user.entityId || 0;
        const [rows] = await pool.query(`
            SELECT 
                a.app_id AS id, 
                s.s_name AS studentName, 
                s.dept, 
                s.profile_status AS studentProfileStatus,
                c.comp_name AS company, 
                j.role, 
                j.package AS packageLpa, 
                a.status, 
                a.ats_score AS atsScore
            FROM APPLICATION a
            INNER JOIN STUDENT s ON a.s_id = s.s_id
            INNER JOIN JOB_PROFILE j ON a.job_id = j.job_id
            INNER JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE s.coord_id = ?
            ORDER BY a.applied_date DESC
        `, [id]);

        res.json(rows.map(r => ({
            ...r,
            packageLpa: Number(r.packageLpa || 0),
            atsScore: Number(r.atsScore || 0),
            status: String(r.status || 'under_review').toLowerCase()
        })));
    } catch (err) {
        res.status(500).json({ message: 'Error loading applications' });
    }
});

router.patch('/applications/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        const coordId = req.user.entityId;

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // Verify the student belongs to this coordinator
            const [app] = await conn.query(`
                SELECT a.app_id, a.s_id 
                FROM APPLICATION a
                JOIN STUDENT s ON a.s_id = s.s_id
                WHERE a.app_id = ? AND s.coord_id = ?
            `, [id, coordId]);

            if (app.length === 0) {
                await conn.rollback();
                return res.status(403).json({ message: 'Unauthorized to update this application' });
            }

            // CRITERION 13: STATUS CONFLICT LOCK
            // Lock the student row to prevent "Opt Out" race conditions
            await conn.query('SELECT s_id FROM STUDENT WHERE s_id = ? FOR UPDATE', [app[0].s_id]);

            await conn.query('UPDATE APPLICATION SET status = ? WHERE app_id = ?', [status, id]);

            await conn.commit();
            res.json({ message: 'Status updated successfully' });
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating status' });
    }
});

// --- 4. Interviews ---
router.get('/interviews', async (req, res) => {
    try {
        const id = req.user.entityId || 0;
        const [rows] = await pool.query(`
            SELECT i.interview_id AS id, s.s_name AS studentName, c.comp_name AS company, j.role, i.interview_mode AS mode, i.panel_name AS panel, DATE_FORMAT(i.interview_date,'%e %b %Y') as date, TIME_FORMAT(i.interview_time, '%h:%i %p') as time, i.interview_result as result
            FROM INTERVIEW i
            INNER JOIN STUDENT s ON i.s_id = s.s_id
            INNER JOIN JOB_PROFILE j ON i.job_id = j.job_id
            INNER JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE s.coord_id = ?
            ORDER BY i.interview_date DESC
        `, [id]);

        res.json(rows.map(r => ({ ...r, id: Number(r.id), result: String(r.result || 'pending').toLowerCase() })));
    } catch (err) {
        res.status(500).json({ message: 'Error loading interviews' });
    }
});

// Schedule new interview
router.post('/interviews', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { s_id, job_id, interview_date, interview_time, mode, panel, room_no } = req.body;
        const coordId = req.user.entityId;

        await conn.beginTransaction();

        // 1. Verify student belongs to coord
        const [student] = await conn.query('SELECT s_id FROM STUDENT WHERE s_id = ? AND coord_id = ?', [s_id, coordId]);
        if (student.length === 0) {
            await conn.rollback();
            return res.status(403).json({ message: 'Unauthorized: Student not assigned to you' });
        }

        // 2. CRITERION 13: SLOT LOCK (Double-booking prevention)
        // Lock the specific slot/room for this date/time to prevent two coordinators from stealing it
        const room = room_no || 'Room-A';
        const [conflicts] = await conn.query(`
            SELECT interview_id FROM INTERVIEW 
            WHERE interview_date = ? AND interview_time = ? AND room_no = ? 
            FOR UPDATE
        `, [interview_date, interview_time, room]);

        if (conflicts.length > 0) {
            await conn.rollback();
            return res.status(409).json({ message: `Slot Conflict: ${room} is already booked for this time.` });
        }

        await conn.query(`
            INSERT INTO INTERVIEW (s_id, job_id, panel_name, interview_date, interview_time, interview_mode, room_no, interview_result)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [s_id, job_id, panel || 'General Panel', interview_date, interview_time || null, mode || 'online', room]);

        await conn.commit();
        res.json({ message: 'Interview scheduled successfully' });
    } catch (err) {
        await conn.rollback();
        console.error('Error scheduling interview:', err);
        res.status(500).json({ message: 'Failed to schedule interview' });
    } finally {
        conn.release();
    }
});

// --- 5. Offers ---
router.get('/offers', async (req, res) => {
    try {
        const id = req.user.entityId || 0;
        const [rows] = await pool.query(`
            SELECT o.offer_id AS id, s.s_name AS studentName, s.dept, c.comp_name AS company, j.role, o.ctc, o.offer_status AS status, DATE_FORMAT(o.issued_on, '%e %b %Y') as issuedOn
            FROM OFFER o
            INNER JOIN STUDENT s ON o.s_id = s.s_id
            INNER JOIN JOB_PROFILE j ON o.job_id = j.job_id
            INNER JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE s.coord_id = ?
            ORDER BY o.issued_on DESC
        `, [id]);

        res.json(rows.map(r => ({ ...r, id: Number(r.id), ctc: Number(r.ctc || 0), status: String(r.status || 'pending').toLowerCase() })));
    } catch (err) {
        res.status(500).json({ message: 'Error loading offers' });
    }
});

// --- 6. Placements ---
router.get('/placements', async (req, res) => {
    try {
        const id = req.user.entityId || 0;
        const [rows] = await pool.query(`
            SELECT s.s_name AS studentName, s.dept, s.cgpa, c.comp_name AS company, j.role, o.ctc, pr.record_id AS recordId
            FROM OFFER o
            INNER JOIN STUDENT s ON o.s_id = s.s_id
            INNER JOIN JOB_PROFILE j ON o.job_id = j.job_id
            INNER JOIN COMPANY c ON j.comp_id = c.comp_id
            LEFT JOIN PLACEMENT_RECORD pr ON pr.s_id = s.s_id AND pr.job_id = o.job_id
            WHERE s.coord_id = ? AND LOWER(o.offer_status) = 'accepted'
            ORDER BY o.ctc DESC
        `, [id]);

        res.json(rows.map(r => ({
            initials: (r.studentName || 'U S').split(' ').filter(p => p.length > 0).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '??',
            studentName: r.studentName,
            department: r.dept,
            cgpa: r.cgpa,
            company: r.company,
            role: r.role,
            ctc: Number(r.ctc || 0),
            verified: !!r.recordId
        })));
    } catch (err) {
        res.status(500).json({ message: 'Error loading placements' });
    }
});

// --- 7. Create Job Profile with Details (Transaction) ---
router.post('/jobs', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { comp_id, role, package: pkg, eligibility_cgpa, job_type, app_deadline, skills, branches } = req.body;
        
        if (!comp_id || !role || !pkg) {
            return res.status(400).json({ message: 'Missing core job details' });
        }

        await conn.beginTransaction();

        // 1. Insert Job Profile
        const [jobRes] = await conn.query(`
            INSERT INTO JOB_PROFILE (comp_id, role, package, eligibility_cgpa, status, job_type, app_deadline)
            VALUES (?, ?, ?, ?, 'open', ?, ?)
        `, [comp_id, role, pkg, eligibility_cgpa || 0, job_type || 'full_time', app_deadline || null]);

        const jobId = jobRes.insertId;

        // 2. CRITERION 12: MULTI-TABLE INSERT
        // Insert Required Skills (Bulk)
        if (skills && skills.length) {
            const skillRows = skills.map(s => [jobId, s]);
            await conn.query('INSERT INTO JOB_REQUIRED_SKILL (job_id, skill_name) VALUES ?', [skillRows]);
        }

        // 3. Insert Eligible Branches (Bulk)
        if (branches && branches.length) {
            const branchRows = branches.map(b => [jobId, b]);
            await conn.query('INSERT INTO JOB_ELIGIBILITY_BRANCH (job_id, branch_name) VALUES ?', [branchRows]);
        }

        await conn.commit();
        res.status(201).json({ message: 'Job profile and requirements posted successfully.', jobId });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Job Post Error:', err);
        res.status(500).json({ message: 'Failed to post job: ' + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// --- 8. Profile ---
router.get('/profile', async (req, res) => {
    try {
        const id = req.user.entityId || 0;

        // Basic coordinator info
        const [coords] = await pool.query(
            'SELECT name, email, phone_no, dept FROM PLACEMENT_COORDINATOR WHERE coord_id = ?',
            [id]
        );
        const c = coords[0] || { name: req.user.username, email: 'Not linked', dept: 'General' };

        // Total students assigned to this coordinator
        const [studentsRow] = await pool.query(
            'SELECT COUNT(*) AS total FROM STUDENT WHERE coord_id = ?',
            [id]
        );
        const studentsManaged = Number(studentsRow[0]?.total || 0);

        // Students placed = distinct students with at least one accepted offer
        const [placedRow] = await pool.query(
            `SELECT COUNT(DISTINCT o.s_id) AS placed
             FROM OFFER o
             INNER JOIN STUDENT s ON o.s_id = s.s_id
             WHERE s.coord_id = ? AND LOWER(o.offer_status) = 'accepted'`,
            [id]
        );
        const studentsPlaced = Number(placedRow[0]?.placed || 0);

        const placementRate = studentsManaged > 0
            ? Math.round((studentsPlaced / studentsManaged) * 100)
            : 0;

        res.json({
            name: c.name,
            email: c.email,
            phone: c.phone_no || 'Not set',
            department: c.dept,
            designation: 'Placement Coordinator',
            studentsManaged,
            studentsPlaced,
            placementRate
        });
    } catch (err) {
        console.error('Coordinator Profile Error:', err);
        res.status(500).json({ message: 'Error loading profile' });
    }
});

export default router;
