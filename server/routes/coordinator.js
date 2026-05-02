
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
        const [offers] = await pool.query(`SELECT COUNT(DISTINCT o.s_id) AS placed FROM OFFER o INNER JOIN STUDENT s ON o.s_id = s.s_id WHERE s.coord_id = ? AND LOWER(o.offer_status) = 'accepted'`, [id]);
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

        console.log(`[Coordinator API] ID ${id}: Found ${students[0]?.total} students and ${rows.length} chart rows.`);

        const tStudents = Number(students[0]?.total || 0);
        const tPlaced = Number(offers[0]?.placed || 0);
        const placementRate = tStudents > 0 ? ((tPlaced / tStudents) * 100).toFixed(1) : '0.0';

        res.json({
            totalStudents: tStudents,
            totalPlaced: tPlaced,
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
            SELECT s.s_id AS id, s.s_name AS name, s.email, s.dept, s.cgpa, s.profile_status AS status,
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

// Update Application Status
router.patch('/applications/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        const coordId = req.user.entityId;

        // Verify the student belongs to this coordinator
        const [app] = await pool.query(`
            SELECT a.app_id 
            FROM APPLICATION a
            JOIN STUDENT s ON a.s_id = s.s_id
            WHERE a.app_id = ? AND s.coord_id = ?
        `, [id, coordId]);

        if (app.length === 0) {
            return res.status(403).json({ message: 'Unauthorized to update this application' });
        }

        await pool.query('UPDATE APPLICATION SET status = ? WHERE app_id = ?', [status, id]);
        res.json({ message: 'Status updated successfully' });
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
            SELECT i.interview_id AS id, s.s_name AS studentName, c.comp_name AS company, j.role, i.interview_mode AS mode, DATE_FORMAT(i.interview_date,'%e %b %Y') as date, i.interview_result as result
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

// --- 5. Offers ---
router.get('/offers', async (req, res) => {
    try {
        const id = req.user.entityId || 0;
        const [rows] = await pool.query(`
            SELECT o.offer_id AS id, s.s_name AS studentName, c.comp_name AS company, j.role, o.ctc, o.offer_status AS status, DATE_FORMAT(o.issued_on, '%e %b %Y') as issuedOn
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
            SELECT s.s_name AS studentName, s.dept, c.comp_name AS company, j.role, o.ctc, pr.record_id
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
            company: r.company,
            role: r.role,
            ctc: Number(r.ctc || 0),
            verified: !!r.recordId
        })));
    } catch (err) {
        res.status(500).json({ message: 'Error loading placements' });
    }
});

// --- 7. Profile ---
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
