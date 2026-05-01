import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'cgdc_admin') {
        return res.status(403).json({ message: 'Admin access only' });
    }
    next();
}

router.use(requireAuth, requireAdmin);

router.get('/dashboard', async (req, res) => {
    try {
        const [students] = await pool.query('SELECT COUNT(*) AS count FROM STUDENT');
        const [companies] = await pool.query('SELECT COUNT(*) AS count FROM COMPANY');
        const [applications] = await pool.query('SELECT COUNT(*) AS count FROM APPLICATION');
        const [verified] = await pool.query("SELECT COUNT(*) AS count FROM STUDENT WHERE profile_status IN ('active')");
        const [interviews] = await pool.query("SELECT COUNT(*) AS count FROM APPLICATION WHERE status IN ('under_review', 'shortlisted')");
        const [offers] = await pool.query("SELECT COUNT(DISTINCT s_id) AS count FROM APPLICATION WHERE status IN ('selected')");
        const [totalJobOffers] = await pool.query("SELECT COUNT(*) AS count FROM APPLICATION WHERE status IN ('selected')");

        const [trend] = await pool.query(`
            SELECT DATE_FORMAT(applied_date, '%b') AS label,
                   MONTH(applied_date) AS monthIndex,
                   SUM(CASE WHEN status IN ('selected') THEN 1 ELSE 0 END) AS placements
            FROM APPLICATION
            WHERE applied_date IS NOT NULL
            GROUP BY MONTH(applied_date), DATE_FORMAT(applied_date, '%b')
            ORDER BY monthIndex
            LIMIT 6
        `);

        const [tiers] = await pool.query(`
            SELECT COALESCE(tier, 'Unknown') AS label, COUNT(*) AS value
            FROM COMPANY
            GROUP BY COALESCE(tier, 'Unknown')
            ORDER BY value DESC
        `);

        const [departments] = await pool.query(`
            SELECT COALESCE(s.dept, 'Unknown') AS name, COUNT(DISTINCT a.s_id) AS placed
            FROM APPLICATION a
            JOIN STUDENT s ON s.s_id = a.s_id
            WHERE a.status IN ('selected')
            GROUP BY COALESCE(s.dept, 'Unknown')
            ORDER BY placed DESC
        `);

        const [topCompanies] = await pool.query(`
            SELECT c.comp_name AS name, COALESCE(c.industry_type, 'N/A') AS industry,
                   SUM(CASE WHEN a.status IN ('selected') THEN 1 ELSE 0 END) AS offers
            FROM COMPANY c
            LEFT JOIN JOB_PROFILE j ON j.comp_id = c.comp_id
            LEFT JOIN APPLICATION a ON a.job_id = j.job_id
            GROUP BY c.comp_id, c.comp_name, c.industry_type
            ORDER BY offers DESC, c.comp_name ASC
            LIMIT 5
        `);

        const [records] = await pool.query(`
            SELECT s.s_name AS student,
                   COALESCE(s.dept, 'Unknown') AS department,
                   COALESCE(c.comp_name, '-') AS company,
                   COALESCE(j.package, 0) AS packageLpa,
                   a.status
            FROM APPLICATION a
            JOIN STUDENT s ON s.s_id = a.s_id
            LEFT JOIN JOB_PROFILE j ON j.job_id = a.job_id
            LEFT JOIN COMPANY c ON c.comp_id = j.comp_id
            ORDER BY a.applied_date DESC
            LIMIT 50
        `);

        const totalStudents = Number(students[0]?.count || 0);
        const totalPlaced = Number(offers[0]?.count || 0);
        const totalRawOffers = Number(totalJobOffers[0]?.count || 0);
        
        let placementPct = 0;
        if (totalStudents > 0) {
            placementPct = Math.min(100, (totalPlaced / totalStudents) * 100);
        }

        res.json({
            stats: [
                { label: 'Total Students', value: totalStudents, icon: 'people-outline', note: '', noteType: 'neutral' },
                { label: 'Companies', value: Number(companies[0]?.count || 0), icon: 'business-outline', note: '', noteType: 'active' },
                { label: 'Profiles Verified', value: Number(verified[0]?.count || 0), icon: 'id-card-outline', note: '', noteType: 'neutral' },
                { label: 'Applications', value: Number(applications[0]?.count || 0), icon: 'send-outline', note: '', noteType: 'neutral' },
                { label: 'Interviews', value: Number(interviews[0]?.count || 0), icon: 'calendar-clear-outline', note: '', noteType: 'neutral' },
                { label: 'Total Offers', value: totalRawOffers, icon: 'checkmark-done-outline', note: '', noteType: 'neutral' },
                { label: 'Placements', value: totalPlaced, icon: 'briefcase-outline', note: 'Unique students', noteType: 'active' },
                { label: 'Placement %', value: `${placementPct.toFixed(1)}%`, icon: 'newspaper-outline', note: '', noteType: 'highlight' }
            ],
            trend: {
                labels: trend.map((row) => row.label),
                placements: trend.map((row) => Number(row.placements || 0))
            },
            tiers: tiers.map((row, index) => ({
                label: row.label,
                value: Number(row.value || 0),
                color: ['#0f2f61', '#4a6296', '#f2cf9e', '#7c8fa5'][index % 4]
            })),
            departments,
            topCompanies: topCompanies.map((row) => ({ name: row.name, industry: row.industry, offers: Number(row.offers || 0) })),
            records: records.map((row) => ({
                initials: String(row.student || '').split(' ').slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase(),
                student: row.student,
                department: row.department,
                company: row.company,
                packageLpa: Number(row.packageLpa || 0),
                status: normalizeStatus(row.status)
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching admin dashboard data' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const { role = 'Student', query = '', status = 'all', branch = 'all' } = req.query;
        const roleMap = { Student: 'student', Coordinator: 'coordinator', Admin: 'cgdc_admin' };
        const dbRole = roleMap[role] || 'student';

        const [rows] = await pool.query(`
            SELECT
                u.user_id AS id,
                COALESCE(s.s_name, c.name, a.name, u.username) AS name,
                u.username,
                COALESCE(s.email, c.email, a.email, CONCAT(u.username, '@university.edu')) AS email,
                CASE WHEN u.role = 'student' THEN COALESCE(s.dept, '') 
                     WHEN u.role = 'coordinator' THEN COALESCE(c.dept, '') 
                     ELSE '' END AS branch,
                CASE WHEN u.role = 'student' THEN CONCAT('ST-', LPAD(COALESCE(s.s_id, u.entity_id, 0), 4, '0')) 
                     WHEN u.role = 'coordinator' THEN CONCAT('CD-', LPAD(COALESCE(c.coord_id, u.entity_id, 0), 3, '0'))
                     ELSE COALESCE(CAST(u.entity_id AS CHAR), '') END AS entityId,
                CASE WHEN u.role = 'student' THEN COALESCE(s.profile_status, 'Active') ELSE 'Active' END AS status,
                CASE WHEN u.role = 'student' THEN 'Standard' ELSE 'Elevated' END AS permission,
                u.role,
                0 AS lastLoginDays
            FROM USER_ROLE u
            LEFT JOIN STUDENT s ON u.role = 'student' AND s.s_id = u.entity_id
            LEFT JOIN PLACEMENT_COORDINATOR c ON u.role = 'coordinator' AND c.coord_id = u.entity_id
            LEFT JOIN CGDC_ADMIN a ON u.role IN ('admin','cgdc_admin') AND a.cgdc_id = u.entity_id
            WHERE u.role = ?
        `, [dbRole]);

        const filtered = rows.filter((row) => {
            const haystack = [row.name, row.username, row.email, row.entityId, row.role, row.branch].join(' ').toLowerCase();
            const q = String(query).toLowerCase();
            return (!q || haystack.includes(q)) && (status === 'all' || row.status === status) && (branch === 'all' || row.branch === branch);
        }).map((row) => ({
            ...row,
            role: capitalize(row.role)
        }));

        res.json(filtered);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching admin users' });
    }
});

router.get('/companies', async (req, res) => {
    try {
        const { tier = 'all', status = 'all', query = '' } = req.query;
        const [rows] = await pool.query(`
            SELECT c.comp_id AS id, c.comp_name AS name, COALESCE(c.industry_type,'N/A') AS industry, COALESCE(c.tier,'Unknown') AS tier, 'active' AS status, COUNT(DISTINCT j.job_id) AS activeJobs, COALESCE(SUM(CASE WHEN a.status IN ('selected') THEN 1 ELSE 0 END), 0) AS placements, COUNT(DISTINCT j.job_id) AS positionsCount
            FROM COMPANY c
            LEFT JOIN JOB_PROFILE j ON j.comp_id = c.comp_id
            LEFT JOIN APPLICATION a ON a.job_id = j.job_id
            GROUP BY c.comp_id, c.comp_name, c.industry_type, c.tier, 'active'
            ORDER BY c.comp_id ASC
        `);

        const q = String(query).toLowerCase();
        res.json(rows.filter((row) => (!q || [row.name, row.industry, row.tier, row.status].join(' ').toLowerCase().includes(q)) && (tier === 'all' || row.tier === tier) && (status === 'all' || row.status === status)));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching admin companies' });
    }
});

router.get('/records', async (req, res) => {
    try {
        const { status = 'all', department = 'all', query = '', year = 'all' } = req.query;
        
        let sql = `
            SELECT a.app_id AS id, s.s_name AS student, COALESCE(s.dept, 'Unknown') AS department, 
                   COALESCE(c.comp_name, '-') AS company, COALESCE(j.package, 0) AS packageLpa, 
                   COALESCE(a.status, 'Applied') AS status, YEAR(a.applied_date) AS appliedYear
            FROM APPLICATION a
            JOIN STUDENT s ON s.s_id = a.s_id
            LEFT JOIN JOB_PROFILE j ON j.job_id = a.job_id
            LEFT JOIN COMPANY c ON c.comp_id = j.comp_id
        `;
        const params = [];
        if (year !== 'all') {
            sql += ` WHERE YEAR(a.applied_date) = ? `;
            params.push(Number(year));
        }
        sql += ` ORDER BY a.applied_date DESC `;

        const [rows] = await pool.query(sql, params);

        const q = String(query).toLowerCase();
        const filtered = rows.filter((row) => (!q || [row.student, row.department, row.company, row.status].join(' ').toLowerCase().includes(q)) && (status === 'all' || normalizeStatus(row.status) === status) && (department === 'all' || row.department === department)).map((row) => ({ ...row, initials: String(row.student || '').split(' ').slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase(), packageLpa: Number(row.packageLpa || 0), status: normalizeStatus(row.status) }));

        // Fetch available years
        const [yearsRes] = await pool.query(`
            SELECT DISTINCT YEAR(applied_date) AS yr FROM APPLICATION WHERE applied_date IS NOT NULL
            UNION
            SELECT DISTINCT graduation_yr AS yr FROM STUDENT WHERE graduation_yr IS NOT NULL
            ORDER BY yr DESC
        `);
        const availableYears = yearsRes.map((r) => r.yr);

        res.json({ rows: filtered, availableYears });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching admin records' });
    }
});

router.get('/analytics', async (req, res) => {
    try {
        const { year = '2026' } = req.query;
        console.log(`>>> ANALYTICS API HIT [YEAR: ${year}]`);
        
        let appAnd = '';
        let studentWhere = '';
        let appFilterOnlyWhere = '';
        const appParams = [];
        
        if (year !== 'all') {
            appAnd = 'AND YEAR(a.applied_date) = ?';
            studentWhere = 'WHERE s.graduation_yr = ?';
            appFilterOnlyWhere = 'WHERE YEAR(applied_date) = ?';
            appParams.push(Number(year));
        }

        // KPIs
        const [students] = await pool.query(`SELECT COUNT(*) AS count FROM STUDENT s ${studentWhere}`, appParams);
        const [applications] = await pool.query(`SELECT COUNT(*) AS count FROM APPLICATION ${appFilterOnlyWhere}`, appParams);
        const [placed] = await pool.query(`SELECT COUNT(DISTINCT s_id) AS count FROM APPLICATION a WHERE a.status IN ('selected') ${appAnd}`, appParams);
        const [maxPkg] = await pool.query(`SELECT MAX(j.package) AS val FROM APPLICATION a JOIN JOB_PROFILE j ON j.job_id = a.job_id WHERE a.status IN ('selected') ${appAnd}`, appParams);
        const [avgPkg] = await pool.query(`SELECT AVG(j.package) AS val FROM APPLICATION a JOIN JOB_PROFILE j ON j.job_id = a.job_id WHERE a.status IN ('selected') ${appAnd}`, appParams);

        const totalStudents = Number(students[0]?.count || 0);
        const totalPlaced = Number(placed[0]?.count || 0);
        const placementRate = totalStudents ? ((totalPlaced / totalStudents) * 100) : 0;

        // Salary distribution buckets (overall for selected year)
        const [salaryBuckets] = await pool.query(`
            SELECT
                SUM(CASE WHEN j.package < 5 THEN 1 ELSE 0 END) AS below5,
                SUM(CASE WHEN j.package >= 5 AND j.package < 10 THEN 1 ELSE 0 END) AS range5to10,
                SUM(CASE WHEN j.package >= 10 AND j.package < 20 THEN 1 ELSE 0 END) AS range10to20,
                SUM(CASE WHEN j.package >= 20 THEN 1 ELSE 0 END) AS above20
            FROM APPLICATION a
            JOIN JOB_PROFILE j ON j.job_id = a.job_id
            WHERE a.status IN ('selected') ${appAnd}
        `, appParams);

        // Salary distribution BY BRANCH
        const [salaryByBranch] = await pool.query(`
            SELECT
                COALESCE(s.dept, 'Unknown') AS dept,
                SUM(CASE WHEN j.package < 5 THEN 1 ELSE 0 END) AS below5,
                SUM(CASE WHEN j.package >= 5 AND j.package < 10 THEN 1 ELSE 0 END) AS range5to10,
                SUM(CASE WHEN j.package >= 10 AND j.package < 20 THEN 1 ELSE 0 END) AS range10to20,
                SUM(CASE WHEN j.package >= 20 THEN 1 ELSE 0 END) AS above20
            FROM APPLICATION a
            JOIN JOB_PROFILE j ON j.job_id = a.job_id
            JOIN STUDENT s ON s.s_id = a.s_id
            WHERE a.status IN ('selected') ${appAnd}
            GROUP BY COALESCE(s.dept, 'Unknown')
            ORDER BY dept
        `, appParams);

        // Department placement percentages
        const [deptStats] = await pool.query(`
            SELECT
                COALESCE(s.dept, 'Unknown') AS name,
                COUNT(DISTINCT s.s_id) AS totalStudents,
                COUNT(DISTINCT CASE WHEN a.status IN ('selected') THEN a.s_id END) AS placedCount,
                AVG(CASE WHEN a.status IN ('selected') THEN j.package ELSE NULL END) AS avgLpa
            FROM STUDENT s
            LEFT JOIN APPLICATION a ON a.s_id = s.s_id ${appAnd}
            LEFT JOIN JOB_PROFILE j ON j.job_id = a.job_id
            ${studentWhere}
            GROUP BY COALESCE(s.dept, 'Unknown')
            ORDER BY placedCount DESC
        `, year !== 'all' ? [appParams[0], appParams[0]] : []);

        // Monthly application and offer trends
        const [monthlyTrend] = await pool.query(`
            SELECT
                DATE_FORMAT(applied_date, '%b') AS label,
                MONTH(applied_date) AS monthIdx,
                COUNT(*) AS applications,
                SUM(CASE WHEN status IN ('selected') THEN 1 ELSE 0 END) AS offers
            FROM APPLICATION
            WHERE applied_date IS NOT NULL ${year !== 'all' ? 'AND YEAR(applied_date) = ?' : ''}
            GROUP BY MONTH(applied_date), DATE_FORMAT(applied_date, '%b')
            ORDER BY monthIdx
        `, appParams);

        const availableYears = [2024, 2025, 2026];

        const b = salaryBuckets[0] || {};
        const salaryDistribution = [
            Number(b.below5 || 0),
            Number(b.range5to10 || 0),
            Number(b.range10to20 || 0),
            Number(b.above20 || 0)
        ];

        const departments = deptStats.map((d) => {
            const total = Number(d.totalStudents || 1);
            const placedN = Number(d.placedCount || 0);
            return {
                name: d.name,
                placementPct: Math.round((placedN / total) * 100),
                avgLpa: Number(Number(d.avgLpa || 0).toFixed(1)),
                totalStudents: total,
                placedCount: placedN
            };
        });

        // Salary by branch formatted
        const salaryByBranchFormatted = salaryByBranch.map((r) => ({
            dept: r.dept,
            below5: Number(r.below5 || 0),
            range5to10: Number(r.range5to10 || 0),
            range10to20: Number(r.range10to20 || 0),
            above20: Number(r.above20 || 0)
        }));

        // Build insights from real data
        const topDept = departments[0];
        const insights = [];
        if (topDept && topDept.placementPct > 0) insights.push(`${topDept.name} leads with ${topDept.placementPct}% placement rate and ₹${topDept.avgLpa} LPA avg package.`);
        insights.push(`Overall placement rate is ${placementRate.toFixed(1)}% across ${totalStudents} students.`);
        if (salaryDistribution[3] > 0) insights.push(`${salaryDistribution[3]} offers are in the high-package bracket (> ₹20 LPA).`);
        insights.push(`Total ${Number(applications[0]?.count || 0).toLocaleString('en-IN')} applications processed this cycle.`);

        res.json({
            kpis: {
                placementRate: Number(placementRate.toFixed(1)),
                avgLpa: Number(Number(avgPkg[0]?.val || 0).toFixed(1)),
                highestLpa: Number(Number(maxPkg[0]?.val || 0).toFixed(1)),
                applications: Number(applications[0]?.count || 0),
                totalStudents,
                totalPlaced
            },
            salaryDistribution,
            salaryByBranch: salaryByBranchFormatted,
            monthlyApplications: monthlyTrend.map((r) => Number(r.applications)),
            monthlyOffers: monthlyTrend.map((r) => Number(r.offers)),
            monthLabels: monthlyTrend.map((r) => r.label),
            departments,
            insights,
            availableYears
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching admin analytics' });
    }
});

router.get('/company/:id', async (req, res) => {
    try {
        const compId = req.params.id;
        const [companies] = await pool.query(`
            SELECT c.comp_id AS id, c.comp_name AS name, COALESCE(c.industry_type,'N/A') AS industry,
                   COALESCE(c.tier,'Unknown') AS tier, 'active' AS status,
                   c.website
            FROM COMPANY c WHERE c.comp_id = ?
        `, [compId]);

        if (!companies.length) return res.status(404).json({ message: 'Company not found' });
        const company = companies[0];

        const [jobs] = await pool.query(`
            SELECT j.job_id, j.role AS title, j.package,
                   COALESCE(j.job_description,'') AS description
            FROM JOB_PROFILE j WHERE j.comp_id = ?
        `, [compId]);

        const [placementCount] = await pool.query(`
            SELECT COUNT(*) AS count FROM APPLICATION a
            JOIN JOB_PROFILE j ON j.job_id = a.job_id
            WHERE j.comp_id = ? AND a.status IN ('selected')
        `, [compId]);

        res.json({
            ...company,
            activeJobs: jobs.length,
            placements: Number(placementCount[0]?.count || 0),
            positions: jobs.map((j) => ({
                title: j.title || 'N/A',
                salary: j.package ? `${j.package} LPA` : 'N/A',
                skills: j.job_description || 'N/A'
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching company details' });
    }
});

function normalizeStatus(status) { const value = String(status || '').toLowerCase(); if (['selected', 'placed', 'accepted'].includes(value)) return 'placed'; if (['under_review', 'shortlisted'].includes(value)) return 'in-progress'; if (value === 'rejected') return 'rejected'; return 'in-progress'; }
function capitalize(text) { return String(text || '').charAt(0).toUpperCase() + String(text || '').slice(1); }

export default router;