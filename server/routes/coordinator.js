
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

        const [trend] = await pool.query(`
            SELECT DATE_FORMAT(pr.recorded_on, '%b') AS label,
                   MONTH(pr.recorded_on) AS monthIndex,
                   COUNT(*) AS placements
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON s.s_id = pr.s_id
            WHERE pr.recorded_on IS NOT NULL AND s.coord_id = ?
            GROUP BY MONTH(pr.recorded_on), DATE_FORMAT(pr.recorded_on, '%b')
            ORDER BY monthIndex
            LIMIT 6
        `, [id]);

        // Top Companies for this coordinator
        const [topCompanies] = await pool.query(`
            SELECT c.comp_name AS name, COALESCE(c.industry_type, 'N/A') AS industry,
                   COUNT(pr.record_id) AS offers
            FROM COMPANY c
            LEFT JOIN PLACEMENT_RECORD pr ON pr.comp_id = c.comp_id
            JOIN STUDENT s ON s.s_id = pr.s_id
            WHERE s.coord_id = ?
            GROUP BY c.comp_id, c.comp_name, c.industry_type
            ORDER BY offers DESC, c.comp_name ASC
            LIMIT 5
        `, [id]);

        // Department Placement Progress (for this coordinator, though usually one dept, but good to show)
        const [departments] = await pool.query(`
            SELECT COALESCE(s.dept, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON s.s_id = pr.s_id
            WHERE s.coord_id = ?
            GROUP BY COALESCE(s.dept, 'Unknown')
            ORDER BY placed DESC
            LIMIT 3
        `, [id]);

        // Recent Records
        const [records] = await pool.query(`
            SELECT 
                s.s_name AS student, 
                COALESCE(s.dept, 'Unknown') AS department,
                CASE 
                    WHEN s.profile_status IN ('opted_out', 'not_eligible') THEN '-'
                    WHEN best_pr.comp_id IS NOT NULL THEN COALESCE(c.comp_name, '-')
                    ELSE '-'
                END AS company,
                CASE 
                    WHEN s.profile_status IN ('opted_out', 'not_eligible') THEN 0
                    WHEN best_pr.comp_id IS NOT NULL THEN best_pr.salary_offered
                    WHEN latest_app.status = 'selected' THEN COALESCE(aj.package, 0)
                    ELSE 0
                END AS packageLpa,
                CASE 
                    WHEN s.profile_status = 'opted_out' THEN 'opted_out'
                    WHEN s.profile_status = 'not_eligible' THEN 'not_eligible'
                    WHEN best_pr.record_id IS NOT NULL THEN 'placed'
                    WHEN latest_app.status = 'selected' THEN 'placed'
                    ELSE 'active'
                END AS status,
                s.graduation_yr AS graduation_yr,
                s.s_id
            FROM STUDENT s
            LEFT JOIN (
                SELECT pr1.* 
                FROM PLACEMENT_RECORD pr1
                JOIN (
                    SELECT s_id, MAX(record_id) as max_id 
                    FROM PLACEMENT_RECORD GROUP BY s_id
                ) pr2 ON pr1.s_id = pr2.s_id AND pr1.record_id = pr2.max_id
            ) best_pr ON s.s_id = best_pr.s_id
            LEFT JOIN COMPANY c ON best_pr.comp_id = c.comp_id
            LEFT JOIN (
                SELECT a1.* 
                FROM APPLICATION a1
                JOIN (
                    SELECT s_id, MAX(app_id) as max_id 
                    FROM APPLICATION GROUP BY s_id
                ) a2 ON a1.s_id = a2.s_id AND a1.app_id = a2.max_id
            ) latest_app ON s.s_id = latest_app.s_id AND best_pr.record_id IS NULL
            LEFT JOIN JOB_PROFILE aj ON latest_app.job_id = aj.job_id
            LEFT JOIN COMPANY ac ON aj.comp_id = ac.comp_id
            WHERE s.coord_id = ?
            ORDER BY COALESCE(best_pr.academic_year, s.graduation_yr) DESC, s.s_id DESC
        `, [id]);

        const tStudents = Number(students[0]?.total || 0);
        const tPlaced = Number(placedCount[0]?.total || 0);
        const tOptedOut = Number(optedOutCount[0]?.total || 0);
        const tActive = Math.max(0, tStudents - tPlaced - tOptedOut);

        const placementRate = tStudents > 0 ? ((tPlaced / tStudents) * 100).toFixed(1) : '0.0';

        // Tiers for charts (for companies where this coord's students applied)
        const [tiers] = await pool.query(`
            SELECT COALESCE(c.tier, 'Unknown') AS label, COUNT(DISTINCT c.comp_id) AS value
            FROM APPLICATION a
            JOIN STUDENT s ON a.s_id = s.s_id
            JOIN JOB_PROFILE j ON a.job_id = j.job_id
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE s.coord_id = ?
            GROUP BY COALESCE(c.tier, 'Unknown')
            ORDER BY value DESC
        `, [id]);

        const tierColors = {
            'Tier-1': '#10b981',
            'Tier-2': '#3b82f6',
            'Tier-3': '#f59e0b',
            'Unknown': '#94a3b8'
        };

        const recordsData = records.map(r => ({
            initials: (r.student || 'U S').split(' ').filter(p => p.length > 0).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '??',
            student: r.student,
            department: r.department,
            company: r.company,
            packageLpa: r.packageLpa,
            status: r.status,
            graduation_yr: r.graduation_yr,
            id: r.s_id
        }));

        res.json({
            stats: [
                { label: 'Total Students', value: tStudents, icon: 'people-outline', note: 'Assigned to you', noteType: 'neutral' },
                { label: 'Placed', value: tPlaced, icon: 'checkmark-done-outline', note: `${placementRate}% rate`, noteType: 'highlight' },
                { label: 'Active', value: tActive, icon: 'pulse-outline', note: 'Seeking placement', noteType: 'active' },
                { label: 'Upcoming Ints', value: Number(ints[0]?.total || 0), icon: 'calendar-outline', note: 'Scheduled', noteType: 'neutral' }
            ],
            totalApplications: Number(apps[0]?.total || 0),
            trend: {
                labels: trend.map(t => t.label),
                placements: trend.map(t => t.placements)
            },
            tiers: tiers.map(t => ({
                label: t.label,
                value: t.value,
                color: tierColors[t.label] || tierColors['Unknown']
            })),
            departments: departments,
            topCompanies: topCompanies,
            records: recordsData,
            placementRate,
            totalStudents: tStudents,
            totalPlaced: tPlaced
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
                a.s_id,
                a.job_id,
                s.s_name AS studentName, 
                s.email AS studentEmail,
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

            // --- REAL-TIME NOTIFICATION: Notify student about status change ---
            try {
                const [details] = await conn.query(
                    `SELECT s.email AS stu_email, s.s_name, j.role, c.comp_name
                     FROM APPLICATION a
                     JOIN STUDENT s ON a.s_id = s.s_id
                     JOIN JOB_PROFILE j ON a.job_id = j.job_id
                     JOIN COMPANY c ON j.comp_id = c.comp_id
                     WHERE a.app_id = ?`, [id]
                );
                if (details.length > 0) {
                    const d = details[0];
                    const statusMap = { shortlisted: 'Shortlisted', rejected: 'Rejected', selected: 'Selected', under_review: 'Under Review' };
                    const label = statusMap[status] || status;
                    const title = `Application ${label}`;
                    const content = `Your application for ${d.role} at ${d.comp_name} has been ${label.toLowerCase()}.`;
                    
                    await conn.query(
                        `INSERT INTO NOTIFICATION (user_id, user_role, title, content, type) VALUES (?, 'student', ?, ?, ?)`,
                        [d.stu_email, title, content, status === 'rejected' ? 'alert' : 'system']
                    );

                    // Push Real-time
                    import('../sse.js').then(({ notifyUser }) => {
                        notifyUser(d.stu_email, 'new_notification', { title, content });
                    }).catch(err => console.error("SSE Error:", err));
                }
            } catch (nErr) {
                console.warn('[Notif] Failed to notify student on status change:', nErr.message);
            }

            // --- NOTIFY ADMIN: Key status changes (rejected/selected/shortlisted) ---
            try {
                if (['rejected', 'selected', 'shortlisted'].includes(status)) {
                    const [info] = await conn.query(
                        `SELECT s.s_name, s.dept, j.role, c.comp_name
                         FROM APPLICATION a
                         JOIN STUDENT s ON a.s_id = s.s_id
                         JOIN JOB_PROFILE j ON a.job_id = j.job_id
                         JOIN COMPANY c ON j.comp_id = c.comp_id
                         WHERE a.app_id = ?`, [id]
                    );
                    if (info.length > 0) {
                        const d = info[0];
                        const statusMap = { shortlisted: 'Shortlisted', rejected: 'Rejected', selected: 'Selected' };
                        const label = statusMap[status];
                        const title = `Student ${label}`;
                        const content = `${d.s_name} (${d.dept}) — ${d.role} at ${d.comp_name} has been ${label.toLowerCase()}.`;

                        const [admins] = await conn.query('SELECT email FROM CGDC_ADMIN');
                        for (const admin of admins) {
                            await conn.query(
                                `INSERT INTO NOTIFICATION (user_id, user_role, title, content, type) VALUES (?, 'admin', ?, ?, ?)`,
                                [admin.email, title, content, status === 'rejected' ? 'alert' : 'system']
                            );
                            
                            // Push Real-time
                            import('../sse.js').then(({ notifyUser }) => {
                                notifyUser(admin.email, 'new_notification', { title, content });
                            }).catch(err => console.error("SSE Error:", err));
                        }
                    }
                }
            } catch (nErr) {
                console.warn('[Notif] Failed to notify admin on status change:', nErr.message);
            }

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

        // --- REAL-TIME NOTIFICATION: Notify student about scheduled interview ---
        try {
            const [interviewDetails] = await pool.query(
                `SELECT s.email AS stu_email, s.s_name, j.role, c.comp_name
                 FROM STUDENT s
                 JOIN JOB_PROFILE j ON j.job_id = ?
                 JOIN COMPANY c ON c.comp_id = j.comp_id
                 WHERE s.s_id = ?`, [job_id, s_id]
            );
            if (interviewDetails.length > 0) {
                const d = interviewDetails[0];
                const dateStr = new Date(interview_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const timeStr = interview_time || 'TBD';
                await pool.query(
                    `INSERT INTO NOTIFICATION (user_id, user_role, title, content, type) VALUES (?, 'student', ?, ?, 'system')`,
                    [d.stu_email, 'Interview Scheduled',
                     `Your interview for ${d.role} at ${d.comp_name} is on ${dateStr} at ${timeStr} (${mode || 'online'}).`]
                );
            }
        } catch (nErr) {
            console.warn('[Notif] Failed to notify student on interview:', nErr.message);
        }

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
            SELECT 
                s.s_name AS studentName, 
                s.dept, 
                s.cgpa, 
                COALESCE(c_pr.comp_name, c_app.comp_name) AS company, 
                COALESCE(j_app.role, 'General') AS role, 
                COALESCE(pr.salary_offered, j_app.package, 0) AS ctc, 
                pr.record_id AS recordId
            FROM STUDENT s
            LEFT JOIN (
                SELECT pr1.* FROM PLACEMENT_RECORD pr1
                JOIN (SELECT s_id, MAX(record_id) as max_id FROM PLACEMENT_RECORD GROUP BY s_id) pr2 
                  ON pr1.s_id = pr2.s_id AND pr1.record_id = pr2.max_id
            ) pr ON s.s_id = pr.s_id
            LEFT JOIN COMPANY c_pr ON pr.comp_id = c_pr.comp_id
            LEFT JOIN (
                SELECT a1.* FROM APPLICATION a1
                JOIN (SELECT s_id, MAX(app_id) as max_id FROM APPLICATION WHERE status = 'selected' GROUP BY s_id) a2
                  ON a1.s_id = a2.s_id AND a1.app_id = a2.max_id
            ) app ON s.s_id = app.s_id
            LEFT JOIN JOB_PROFILE j_app ON app.job_id = j_app.job_id
            LEFT JOIN COMPANY c_app ON j_app.comp_id = c_app.comp_id
            WHERE s.coord_id = ? AND (pr.record_id IS NOT NULL OR app.app_id IS NOT NULL)
            ORDER BY ctc DESC
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
            'SELECT name, email, phone_no, dept, avatar_url FROM PLACEMENT_COORDINATOR WHERE coord_id = ?',
            [id]
        );
        const c = coords[0] || { name: req.user.username, email: 'Not linked', dept: 'General', avatar_url: null };

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
            avatar_url: c.avatar_url,
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

router.put('/profile', async (req, res) => {
    try {
        const id = req.user.entityId;
        const { name, email, phone, avatar_url } = req.body;
        
        let updates = [];
        let params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (phone !== undefined) { updates.push('phone_no = ?'); params.push(phone); }
        if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }

        if (updates.length === 0) {
            return res.json({ success: true, message: 'No changes provided' });
        }

        params.push(id);
        const sql = `UPDATE PLACEMENT_COORDINATOR SET ${updates.join(', ')} WHERE coord_id = ?`;
        await pool.query(sql, params);

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Coordinator Profile Update Error:', err);
        res.status(500).json({ message: 'Error updating coordinator profile', details: err.message });
    }
});

// --- 9. Student Profile for Coordinator ---
router.get('/student/:id/profile', async (req, res) => {
    try {
        const studentId = req.params.id;
        const coordId = req.user.entityId;
        
        // Fetch student profile details but ensure s/he belongs to this coord
        const [studentRows] = await pool.query(`
            SELECT s.*, pc.name as coordinator_name, pc.email as coordinator_email 
            FROM STUDENT s
            LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id
            WHERE s.s_id = ? AND s.coord_id = ?
        `, [studentId, coordId]);

        if (studentRows.length === 0) return res.status(404).json({ message: 'Student not found or not assigned to you' });
        const student = studentRows[0];

        // Fetch applications for this student
        const [applications] = await pool.query(`
            SELECT a.*, j.role, c.comp_name, c.industry_type
            FROM APPLICATION a
            JOIN JOB_PROFILE j ON a.job_id = j.job_id
            JOIN COMPANY c ON j.comp_id = c.comp_id
            WHERE a.s_id = ?
            ORDER BY a.applied_date DESC
        `, [studentId]);

        res.json({
            profile: student,
            applications: applications
        });
    } catch (err) {
        console.error('Coordinator Student Profile Error:', err);
        res.status(500).json({ message: 'Error fetching student profile' });
    }
});

// --- 10. Student Detail (Basic Info for Modal) ---
router.get('/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const coordId = req.user.entityId;

        const [rows] = await pool.query(`
            SELECT s.*, 
            (SELECT COUNT(*) FROM APPLICATION WHERE s_id = s.s_id) as totalApps
            FROM STUDENT s
            WHERE s.s_id = ? AND s.coord_id = ?
        `, [studentId, coordId]);

        if (rows.length === 0) return res.status(404).json({ message: 'Student not found' });
        const s = rows[0];

        res.json({
            id: s.s_id,
            name: s.s_name,
            dept: s.dept,
            email: s.email,
            phone: s.phone_no || 'Not Provided',
            cgpa: Number(s.cgpa || 0).toFixed(2),
            gradYear: s.graduation_yr || 'TBD',
            status: s.profile_status || 'active',
            totalApps: s.totalApps || 0,
            resumeUrl: s.resume_url
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching student details' });
    }
});

// --- 11. Coordinator Analytics ---
router.get('/analytics', async (req, res) => {
    try {
        const id = req.user.entityId || 0;
        const { year = 'all' } = req.query;
        
        let yearFilterStudent = '';
        let yearFilterApp = '';
        let yearFilterPr = '';
        const params = [id];
        
        if (year !== 'all') {
            yearFilterStudent = ' AND s.graduation_yr = ?';
            yearFilterApp = ' AND YEAR(applied_date) = ?';
            yearFilterPr = ' AND academic_year = ?';
            params.push(Number(year));
        }

        const [students] = await pool.query(`SELECT COUNT(*) AS count FROM STUDENT s WHERE s.coord_id = ? ${yearFilterStudent}`, params);
        const [applications] = await pool.query(`
            SELECT COUNT(*) AS count 
            FROM APPLICATION a 
            JOIN STUDENT s ON a.s_id = s.s_id 
            WHERE s.coord_id = ? ${yearFilterApp}
        `, params);

        const prParams = year !== 'all' ? [id, Number(year), id, Number(year)] : [id, id];
        const [placed] = await pool.query(`
            SELECT COUNT(DISTINCT s_id) AS count FROM (
                SELECT pr.s_id FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id WHERE s.coord_id = ? ${yearFilterPr}
                UNION
                SELECT a.s_id FROM APPLICATION a JOIN STUDENT s ON a.s_id = s.s_id WHERE a.status = 'selected' AND s.coord_id = ? ${year !== 'all' ? 'AND YEAR(a.applied_date) = ?' : ''}
            ) as combined_placed
        `, prParams);

        const [maxPkg] = await pool.query(`
            SELECT MAX(val) as val FROM (
                SELECT pr.salary_offered as val FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id WHERE s.coord_id = ? ${yearFilterPr}
                UNION
                SELECT j.package as val FROM APPLICATION a JOIN JOB_PROFILE j ON a.job_id = j.job_id JOIN STUDENT s ON a.s_id = s.s_id WHERE a.status = 'selected' AND s.coord_id = ? ${year !== 'all' ? 'AND YEAR(a.applied_date) = ?' : ''}
            ) as combined_pkg
        `, prParams);

        const [avgPkg] = await pool.query(`
            SELECT AVG(val) as val FROM (
                SELECT pr.salary_offered as val FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id WHERE s.coord_id = ? ${yearFilterPr}
                UNION
                SELECT j.package as val FROM APPLICATION a JOIN JOB_PROFILE j ON a.job_id = j.job_id JOIN STUDENT s ON a.s_id = s.s_id WHERE a.status = 'selected' AND s.coord_id = ? ${year !== 'all' ? 'AND YEAR(a.applied_date) = ?' : ''}
            ) as combined_pkg
        `, prParams);

        const totalStudents = Number(students[0]?.count || 0);
        const totalPlaced = Number(placed[0]?.count || 0);
        const placementRate = totalStudents ? ((totalPlaced / totalStudents) * 100) : 0;

        const [salaryBuckets] = await pool.query(`
            SELECT
                SUM(CASE WHEN pr.salary_offered < 5 THEN 1 ELSE 0 END) AS below5,
                SUM(CASE WHEN pr.salary_offered >= 5 AND pr.salary_offered < 10 THEN 1 ELSE 0 END) AS range5to10,
                SUM(CASE WHEN pr.salary_offered >= 10 AND pr.salary_offered < 20 THEN 1 ELSE 0 END) AS range10to20,
                SUM(CASE WHEN pr.salary_offered >= 20 THEN 1 ELSE 0 END) AS above20
            FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id
            WHERE s.coord_id = ? ${yearFilterPr}
        `, params);

        const [deptStats] = await pool.query(`
            SELECT
                COALESCE(s.dept, 'Unknown') AS name,
                COUNT(DISTINCT s.s_id) AS totalStudents,
                COUNT(DISTINCT pr.s_id) AS placedCount,
                AVG(pr.salary_offered) AS avgLpa
            FROM STUDENT s
            LEFT JOIN PLACEMENT_RECORD pr ON pr.s_id = s.s_id ${yearFilterPr.replace('WHERE', 'AND')}
            WHERE s.coord_id = ? ${yearFilterStudent}
            GROUP BY COALESCE(s.dept, 'Unknown')
            ORDER BY placedCount DESC
        `, params);

        const monthlyTrendQuery = `
            SELECT 
                COALESCE(app_months.monthIdx, offer_months.monthIdx) AS monthIdx,
                COALESCE(app_months.label, offer_months.label) AS label,
                COALESCE(app_months.applications, 0) AS applications,
                COALESCE(offer_months.offers, 0) AS offers
            FROM (
                SELECT MONTH(applied_date) AS monthIdx, DATE_FORMAT(applied_date, '%b') AS label, COUNT(*) AS applications
                FROM APPLICATION a JOIN STUDENT s ON a.s_id = s.s_id 
                WHERE s.coord_id = ? ${yearFilterApp}
                GROUP BY monthIdx, label
            ) app_months
            LEFT JOIN (
                SELECT MONTH(pr.recorded_on) AS monthIdx, DATE_FORMAT(pr.recorded_on, '%b') AS label, COUNT(*) AS offers
                FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id 
                WHERE s.coord_id = ? ${yearFilterPr.replace('academic_year = ?', 'YEAR(pr.recorded_on) = ?')} AND pr.recorded_on IS NOT NULL
                GROUP BY monthIdx, label
            ) offer_months ON app_months.monthIdx = offer_months.monthIdx
            ORDER BY monthIdx ASC
        `;
        const [monthlyTrend] = await pool.query(monthlyTrendQuery, year !== 'all' ? [id, Number(year), id, Number(year)] : [id, id]);

        const [appStatusRows] = await pool.query(`
            SELECT a.status, COUNT(*) as count 
            FROM APPLICATION a 
            JOIN STUDENT s ON a.s_id = s.s_id 
            WHERE s.coord_id = ? ${yearFilterApp}
            GROUP BY a.status
        `, params);

        const [topCompanyRows] = await pool.query(`
            SELECT c.comp_name as name, COUNT(pr.record_id) as count 
            FROM PLACEMENT_RECORD pr 
            JOIN COMPANY c ON pr.comp_id = c.comp_id 
            JOIN STUDENT s ON s.s_id = pr.s_id 
            WHERE s.coord_id = ? ${yearFilterPr}
            GROUP BY c.comp_id, c.comp_name 
            ORDER BY count DESC 
            LIMIT 5
        `, params);

        const sb = salaryBuckets[0] || {};
        const dist = [
            Number(sb.below5 || 0),
            Number(sb.range5to10 || 0),
            Number(sb.range10to20 || 0),
            Number(sb.above20 || 0)
        ];

        const dStats = deptStats.map(d => ({
            name: d.name,
            totalStudents: d.totalStudents,
            placedCount: d.placedCount,
            placementPct: d.totalStudents ? ((d.placedCount / d.totalStudents) * 100).toFixed(1) : 0,
            avgLpa: Number(d.avgLpa || 0)
        }));

        res.json({
            kpis: {
                placementRate: placementRate,
                avgLpa: Number(avgPkg[0]?.val || 0),
                highestLpa: Number(maxPkg[0]?.val || 0),
                applications: Number(applications[0]?.count || 0)
            },
            salaryDistribution: dist,
            departments: dStats,
            monthLabels: monthlyTrend.map(m => m.label),
            monthlyApplications: monthlyTrend.map(m => m.applications),
            monthlyOffers: monthlyTrend.map(m => m.offers),
            appStatusDist: appStatusRows.map(r => ({ status: r.status, count: r.count })),
            topCompanies: topCompanyRows.map(r => ({ name: r.name, count: r.count })),
            insights: [
                `${totalPlaced} students out of ${totalStudents} assigned to you have secured placements.`,
                `Highest package secured is ₹${Number(maxPkg[0]?.val || 0).toFixed(2)} LPA.`
            ],
            availableYears: ['all', 2026, 2025, 2024]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error loading coordinator analytics' });
    }
});

export default router;
