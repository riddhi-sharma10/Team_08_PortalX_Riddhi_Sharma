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
        const [students] = await pool.query("SELECT COUNT(*) AS count FROM STUDENT");
        const [companies] = await pool.query('SELECT COUNT(*) AS count FROM COMPANY');
        const [applications] = await pool.query('SELECT COUNT(*) AS count FROM APPLICATION');
        const [verified] = await pool.query("SELECT COUNT(*) AS count FROM STUDENT WHERE profile_status NOT IN ('opted_out', 'not_eligible')");
        const [interviews] = await pool.query("SELECT COUNT(*) AS count FROM APPLICATION WHERE status IN ('under_review', 'shortlisted', 'applied')");
        const [offers] = await pool.query(`
            SELECT COUNT(DISTINCT s_id) AS count FROM (
                SELECT s_id FROM PLACEMENT_RECORD
                UNION
                SELECT s_id FROM APPLICATION WHERE status = 'selected'
            ) as combined_placed
        `);
        const [totalJobOffers] = await pool.query(`
            SELECT COUNT(*) AS count FROM (
                SELECT record_id FROM PLACEMENT_RECORD
                UNION ALL
                SELECT app_id FROM APPLICATION WHERE status = 'selected'
            ) as combined_offers
        `);

        const [trend] = await pool.query(`
            SELECT DATE_FORMAT(recorded_on, '%b') AS label,
                   MONTH(recorded_on) AS monthIndex,
                   COUNT(*) AS placements
            FROM PLACEMENT_RECORD
            WHERE recorded_on IS NOT NULL
            GROUP BY MONTH(recorded_on), DATE_FORMAT(recorded_on, '%b')
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
            SELECT COALESCE(d.dept_name, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON s.s_id = pr.s_id
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            GROUP BY COALESCE(d.dept_name, 'Unknown')
            ORDER BY placed DESC
            LIMIT 5
        `);

        const [topCompanies] = await pool.query(`
            SELECT c.comp_name AS name, COALESCE(c.industry_type, 'N/A') AS industry,
                   COUNT(pr.record_id) AS offers
            FROM COMPANY c
            LEFT JOIN PLACEMENT_RECORD pr ON pr.comp_id = c.comp_id
            GROUP BY c.comp_id, c.comp_name, c.industry_type
            ORDER BY offers DESC, c.comp_name ASC
            LIMIT 5
        `);

        const [records] = await pool.query(`
            SELECT 
                s.s_name AS student, 
                COALESCE(d.dept_name, 'Unknown') AS department,
                CASE 
                    WHEN s.profile_status IN ('opted_out', 'not_eligible') THEN '-'
                    WHEN best_pr.comp_id IS NOT NULL THEN COALESCE(c.comp_name, '-')
                    ELSE '-'
                END AS company,
                CASE 
                    WHEN s.profile_status IN ('opted_out', 'not_eligible') THEN 0
                    WHEN best_pr.comp_id IS NOT NULL THEN best_pr.salary_offered
                    WHEN latest_app.status = 'selected' THEN COALESCE(aj.package, 0)
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
                s.graduation_yr AS graduation_yr
            FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id
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
            ORDER BY COALESCE(best_pr.academic_year, s.graduation_yr) DESC, s.s_id DESC
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
                graduation_yr: row.graduation_yr ? Number(row.graduation_yr) : null,
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

        let sql = '';
        if (dbRole === 'student') {
            sql = `
                SELECT
                    COALESCE(u.user_id, s.s_id) AS id,
                    COALESCE(s.s_name, u.username) AS name,
                    u.username,
                    COALESCE(s.email, CONCAT(u.username, '@university.edu')) AS email,
                    COALESCE(d.dept_name, '') AS branch,
                    CONCAT('ST-', LPAD(s.s_id, 4, '0')) AS entityId,
                    s.s_id AS entityIdRaw,
                    CASE 
                         WHEN s.profile_status = 'opted_out' THEN 'opted_out'
                         WHEN s.profile_status = 'not_eligible' THEN 'not_eligible'
                         WHEN s.profile_status = 'placed' OR best_pr.record_id IS NOT NULL THEN 'placed'
                         WHEN latest_app.status = 'selected' THEN 'placed'
                         WHEN s.profile_status = 'active' THEN 'active'
                         ELSE 'active'
                    END AS status,
                    'Standard' AS permission,
                    'student' AS role,
                    0 AS lastLoginDays
                FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id LEFT JOIN USER_ROLE u ON u.entity_id = s.s_id AND u.role = 'student'
                LEFT JOIN (
                    SELECT pr1.* 
                    FROM PLACEMENT_RECORD pr1
                    JOIN (
                        SELECT s_id, MAX(record_id) as max_id 
                        FROM PLACEMENT_RECORD GROUP BY s_id
                    ) pr2 ON pr1.s_id = pr2.s_id AND pr1.record_id = pr2.max_id
                ) best_pr ON s.s_id = best_pr.s_id
                LEFT JOIN (
                    SELECT a1.* 
                    FROM APPLICATION a1
                    JOIN (
                        SELECT s_id, MAX(app_id) as max_id 
                        FROM APPLICATION GROUP BY s_id
                    ) a2 ON a1.s_id = a2.s_id AND a1.app_id = a2.max_id
                ) latest_app ON s.s_id = latest_app.s_id AND best_pr.record_id IS NULL
            `;
        } else if (dbRole === 'coordinator') {
            sql = `
                SELECT
                    COALESCE(u.user_id, c.coord_id) AS id,
                    COALESCE(c.name, u.username) AS name,
                    u.username,
                    COALESCE(c.email, CONCAT(u.username, '@university.edu')) AS email,
                    COALESCE(d.dept_name, '') AS branch,
                    CONCAT('CD-', LPAD(c.coord_id, 3, '0')) AS entityId,
                    c.coord_id AS entityIdRaw,
                    'active' AS status,
                    'Elevated' AS permission,
                    'coordinator' AS role,
                    0 AS lastLoginDays
                FROM PLACEMENT_COORDINATOR c JOIN DEPARTMENT d ON c.dept_id = d.dept_id LEFT JOIN USER_ROLE u ON u.entity_id = c.coord_id AND u.role = 'coordinator'
            `;
        } else {
            sql = `
                SELECT
                    u.user_id AS id,
                    COALESCE(a.name, u.username) AS name,
                    u.username,
                    COALESCE(a.email, CONCAT(u.username, '@university.edu')) AS email,
                    '' AS branch,
                    CAST(u.entity_id AS CHAR) AS entityId,
                    u.entity_id AS entityIdRaw,
                    'active' AS status,
                    'Elevated' AS permission,
                    u.role,
                    0 AS lastLoginDays
                FROM USER_ROLE u
                LEFT JOIN CGDC_ADMIN a ON u.role IN ('admin','cgdc_admin') AND a.cgdc_id = u.entity_id
                WHERE u.role IN ('admin', 'cgdc_admin')
            `;
        }

        const [rows] = await pool.query(sql);

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
            ORDER BY c.comp_id DESC
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
            SELECT 
                s.s_id AS id, 
                s.s_name AS student, 
                COALESCE(d.dept_name, 'Unknown') AS department,
                CASE 
                    WHEN s.profile_status IN ('opted_out', 'not_eligible') THEN '-'
                    WHEN best_pr.comp_id IS NOT NULL THEN COALESCE(c.comp_name, '-')
                    WHEN latest_app.status = 'selected' THEN COALESCE(ac.comp_name, '-')
                    ELSE '-'
                END AS company,
                CASE 
                    WHEN s.profile_status IN ('opted_out', 'not_eligible') THEN 0
                    WHEN best_pr.comp_id IS NOT NULL THEN best_pr.salary_offered
                    WHEN latest_app.status = 'selected' THEN COALESCE(aj.package, 0)
                    ELSE 0
                END AS packageLpa,
                CASE 
                    WHEN s.profile_status = 'opted_out' THEN 'Opted Out'
                    WHEN s.profile_status = 'not_eligible' THEN 'Not Eligible'
                    WHEN best_pr.record_id IS NOT NULL THEN 'Placed'
                    WHEN latest_app.status = 'selected' THEN 'Placed'
                    ELSE 'Active'
                END AS status,
                s.graduation_yr AS appliedYear
            FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id LEFT JOIN (
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
        `;
        const params = [];
        if (year !== 'all') {
            sql += ` WHERE s.graduation_yr = ? `;
            params.push(Number(year));
        }
        sql += ` ORDER BY s.graduation_yr DESC, id DESC `;

        const [rows] = await pool.query(sql, params);

        const q = String(query).toLowerCase();

        // Fetch available years
        const [yearsRes] = await pool.query(`
            SELECT DISTINCT YEAR(applied_date) AS yr FROM APPLICATION WHERE applied_date IS NOT NULL
            UNION
            SELECT DISTINCT graduation_yr AS yr FROM STUDENT WHERE graduation_yr IS NOT NULL
            UNION
            SELECT DISTINCT academic_year AS yr FROM PLACEMENT_RECORD WHERE academic_year IS NOT NULL
            ORDER BY yr DESC
        `);
        const availableYears = yearsRes.map((r) => r.yr);

        res.json({ rows: rows.filter((row) => (!q || [row.student, row.department, row.company, row.status].join(' ').toLowerCase().includes(q)) && (status === 'all' || normalizeStatus(row.status) === status) && (department === 'all' || row.department === department)).map((row) => ({ ...row, initials: String(row.student || '').split(' ').slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase(), packageLpa: Number(row.packageLpa || 0), status: normalizeStatus(row.status) })), availableYears });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching admin records' });
    }
});

router.get('/analytics', async (req, res) => {
    try {
        const { year = 'all' } = req.query;
        const appParams = [];
        let studentWhere = '';
        let appFilterOnlyWhere = '';
        let prAnd = '';

        if (year !== 'all') {
            studentWhere = 'WHERE s.graduation_yr = ?';
            appFilterOnlyWhere = 'WHERE YEAR(applied_date) = ?';
            prAnd = 'WHERE academic_year = ?';
            appParams.push(Number(year));
        }

        // KPIs
        const studentFilter = studentWhere ? studentWhere : "";
        const [students] = await pool.query(`SELECT COUNT(*) AS count FROM STUDENT s ${studentFilter}`, appParams);
        const [applications] = await pool.query(`SELECT COUNT(*) AS count FROM APPLICATION ${appFilterOnlyWhere}`, appParams);
        // Total Placed = Unique students in PLACEMENT_RECORD OR with 'selected' applications
        const [placed] = await pool.query(`
            SELECT COUNT(DISTINCT s_id) AS count FROM (
                SELECT s_id FROM PLACEMENT_RECORD ${prAnd}
                UNION
                SELECT s_id FROM APPLICATION WHERE status = 'selected' ${year !== 'all' ? 'AND YEAR(applied_date) = ?' : ''}
            ) as combined_placed
        `, year !== 'all' ? [appParams[0], appParams[0]] : []);

        const [maxPkg] = await pool.query(`
            SELECT MAX(val) as val FROM (
                SELECT salary_offered as val FROM PLACEMENT_RECORD ${prAnd}
                UNION
                SELECT j.package as val FROM APPLICATION a JOIN JOB_PROFILE j ON a.job_id = j.job_id WHERE a.status = 'selected' ${year !== 'all' ? 'AND YEAR(a.applied_date) = ?' : ''}
            ) as combined_pkg
        `, year !== 'all' ? [appParams[0], appParams[0]] : []);

        const [avgPkg] = await pool.query(`
            SELECT AVG(val) as val FROM (
                SELECT salary_offered as val FROM PLACEMENT_RECORD ${prAnd}
                UNION
                SELECT j.package as val FROM APPLICATION a JOIN JOB_PROFILE j ON a.job_id = j.job_id WHERE a.status = 'selected' ${year !== 'all' ? 'AND YEAR(a.applied_date) = ?' : ''}
            ) as combined_pkg
        `, year !== 'all' ? [appParams[0], appParams[0]] : []);

        const totalStudents = Number(students[0]?.count || 0);
        const totalPlaced = Number(placed[0]?.count || 0);
        const placementRate = totalStudents ? ((totalPlaced / totalStudents) * 100) : 0;

        // Salary distribution buckets
        const [salaryBuckets] = await pool.query(`
            SELECT
                SUM(CASE WHEN salary_offered < 5 THEN 1 ELSE 0 END) AS below5,
                SUM(CASE WHEN salary_offered >= 5 AND salary_offered < 10 THEN 1 ELSE 0 END) AS range5to10,
                SUM(CASE WHEN salary_offered >= 10 AND salary_offered < 20 THEN 1 ELSE 0 END) AS range10to20,
                SUM(CASE WHEN salary_offered >= 20 THEN 1 ELSE 0 END) AS above20
            FROM PLACEMENT_RECORD
            ${prAnd}
        `, appParams);

        // Department placement percentages
        const [deptStats] = await pool.query(`
            SELECT
                COALESCE(d.dept_name, 'Unknown') AS name,
                COUNT(DISTINCT s.s_id) AS totalStudents,
                COUNT(DISTINCT pr.s_id) AS placedCount,
                AVG(pr.salary_offered) AS avgLpa
            FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id LEFT JOIN PLACEMENT_RECORD pr ON pr.s_id = s.s_id ${prAnd.replace('WHERE', 'AND pr.')}
            ${studentWhere}
            GROUP BY COALESCE(d.dept_name, 'Unknown')
            ORDER BY placedCount DESC
        `, year !== 'all' ? [appParams[0], appParams[0]] : []);

        // Monthly application and offer trends
        const [monthlyTrend] = await pool.query(`
            SELECT 
                COALESCE(app_months.monthIdx, offer_months.monthIdx) AS monthIdx,
                COALESCE(app_months.label, offer_months.label) AS label,
                COALESCE(app_months.applications, 0) AS applications,
                COALESCE(offer_months.offers, 0) AS offers
            FROM (
                SELECT MONTH(applied_date) AS monthIdx, DATE_FORMAT(applied_date, '%b') AS label, COUNT(*) AS applications
                FROM APPLICATION
                WHERE applied_date IS NOT NULL ${year !== 'all' ? 'AND YEAR(applied_date) = ?' : ''}
                GROUP BY MONTH(applied_date), DATE_FORMAT(applied_date, '%b')
            ) app_months
            LEFT JOIN (
                SELECT MONTH(recorded_on) AS monthIdx, DATE_FORMAT(recorded_on, '%b') AS label, COUNT(*) AS offers
                FROM PLACEMENT_RECORD
                WHERE recorded_on IS NOT NULL ${year !== 'all' ? 'AND academic_year = ?' : ''}
                GROUP BY MONTH(recorded_on), DATE_FORMAT(recorded_on, '%b')
            ) offer_months ON app_months.monthIdx = offer_months.monthIdx
            UNION
            SELECT 
                COALESCE(app_months.monthIdx, offer_months.monthIdx) AS monthIdx,
                COALESCE(app_months.label, offer_months.label) AS label,
                COALESCE(app_months.applications, 0) AS applications,
                COALESCE(offer_months.offers, 0) AS offers
            FROM (
                SELECT MONTH(applied_date) AS monthIdx, DATE_FORMAT(applied_date, '%b') AS label, COUNT(*) AS applications
                FROM APPLICATION
                WHERE applied_date IS NOT NULL ${year !== 'all' ? 'AND YEAR(applied_date) = ?' : ''}
                GROUP BY MONTH(applied_date), DATE_FORMAT(applied_date, '%b')
            ) app_months
            RIGHT JOIN (
                SELECT MONTH(recorded_on) AS monthIdx, DATE_FORMAT(recorded_on, '%b') AS label, COUNT(*) AS offers
                FROM PLACEMENT_RECORD
                WHERE recorded_on IS NOT NULL ${year !== 'all' ? 'AND academic_year = ?' : ''}
                GROUP BY MONTH(recorded_on), DATE_FORMAT(recorded_on, '%b')
            ) offer_months ON app_months.monthIdx = offer_months.monthIdx
            ORDER BY monthIdx
        `, year !== 'all' ? [appParams[0], appParams[0], appParams[0], appParams[0]] : []);

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
                medianAts: 0
            };
        });

        const departmentPlacement = departments.slice(0, 3).map((d) => d.placementPct);

        // Build insights from real data
        const topDept = departments[0];
        const insights = [];
        if (topDept) insights.push(`${topDept.name} leads with ${topDept.placementPct}% placement rate and ₹${topDept.avgLpa} LPA avg package.`);
        insights.push(`Overall placement rate is ${placementRate.toFixed(1)}% across ${totalStudents} students.`);
        if (salaryDistribution[3] > 0) insights.push(`${salaryDistribution[3]} offers are in the high-package bracket (> ₹20 LPA).`);
        insights.push(`Total ${Number(applications[0]?.count || 0).toLocaleString('en-IN')} applications processed this cycle.`);

        // Fetch available years
        const [yearsRes] = await pool.query(`
            SELECT DISTINCT YEAR(applied_date) AS yr FROM APPLICATION WHERE applied_date IS NOT NULL
            UNION
            SELECT DISTINCT graduation_yr AS yr FROM STUDENT WHERE graduation_yr IS NOT NULL
            UNION
            SELECT DISTINCT academic_year AS yr FROM PLACEMENT_RECORD WHERE academic_year IS NOT NULL
            ORDER BY yr DESC
        `);
        const availableYears = yearsRes.map((r) => r.yr);

        res.json({
            kpis: {
                placementRate: Number(placementRate.toFixed(1)),
                avgLpa: Number(Number(avgPkg[0]?.val || 0).toFixed(1)),
                highestLpa: Number(Number(maxPkg[0]?.val || 0).toFixed(1)),
                applications: Number(applications[0]?.count || 0)
            },
            salaryDistribution,
            departmentPlacement,
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

// --- Admin Profile ---
router.get('/profile', async (req, res) => {
    try {
        const id = req.user.entityId || 0;
        const [admins] = await pool.query(
            'SELECT name, email, avatar_url FROM CGDC_ADMIN WHERE cgdc_id = ?',
            [id]
        );
        const a = admins[0] || { name: req.user.username, email: 'admin@university.edu', avatar_url: null };

        const [coordRow] = await pool.query('SELECT COUNT(*) AS cnt FROM PLACEMENT_COORDINATOR');
        const [compRow] = await pool.query('SELECT COUNT(*) AS cnt FROM COMPANY');
        const [studRow] = await pool.query('SELECT COUNT(*) AS cnt FROM STUDENT');

        res.json({
            name: a.name,
            email: a.email,
            avatar_url: a.avatar_url,
            designation: 'Placement Cell Administrator',
            department: 'Training & Placement Office',
            totalCoordinators: Number(coordRow[0]?.cnt || 0),
            totalCompanies: Number(compRow[0]?.cnt || 0),
            totalStudents: Number(studRow[0]?.cnt || 0),
        });
    } catch (err) {
        console.error('Admin Profile Error:', err);
        res.status(500).json({ message: 'Error loading admin profile' });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const id = req.user.entityId;
        const { name, email, avatar_url } = req.body;
        
        let updates = [];
        let params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }

        if (updates.length === 0) {
            return res.json({ success: true, message: 'No changes provided' });
        }

        params.push(id);
        const sql = `UPDATE CGDC_ADMIN SET ${updates.join(', ')} WHERE cgdc_id = ?`;
        await pool.query(sql, params);

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Admin Profile Update Error:', err);
        res.status(500).json({ 
            message: 'Error updating admin profile',
            details: err.code === 'ER_BAD_NULL_ERROR' ? 'Required fields cannot be empty' : err.message
        });
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
                   (SELECT GROUP_CONCAT(skill_name SEPARATOR ', ') FROM JOB_REQUIRED_SKILL WHERE job_id = j.job_id) AS description
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
                id: j.job_id,
                title: j.title || 'N/A',
                salary: j.package ? `${j.package} LPA` : 'N/A',
                skills: j.description || 'N/A'
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching company details' });
    }
});

// --- Student Profile for Admin ---
router.get('/student/:id/profile', async (req, res) => {
    try {
        const studentId = req.params.id;
        
        // Fetch student profile details
        const [studentRows] = await pool.query(`
            SELECT s.*, d.dept_name AS dept, pc.name as coordinator_name, pc.email as coordinator_email 
            FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id
            WHERE s.s_id = ?
        `, [studentId]);

        if (studentRows.length === 0) return res.status(404).json({ message: 'Student not found' });
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
        console.error('Admin Student Profile Error:', err);
        res.status(500).json({ message: 'Error fetching student profile' });
    }
});

// --- Coordinator Profile for Admin ---
router.get('/coordinator/:id/profile', async (req, res) => {
    try {
        const coordId = req.params.id;
        
        // Fetch coordinator profile details
        const [coordRows] = await pool.query(
            'SELECT c.name, c.email, c.phone_no, d.dept_name as dept, c.cgdc_id FROM PLACEMENT_COORDINATOR c JOIN DEPARTMENT d ON c.dept_id = d.dept_id WHERE c.coord_id = ?',
            [coordId]
        );

        if (coordRows.length === 0) return res.status(404).json({ message: 'Coordinator not found' });
        const coordinator = coordRows[0];

        // Fetch students assigned to this coordinator
        const [students] = await pool.query(`
            SELECT s.s_id, s.s_name, s.email, d.dept_name as dept, s.cgpa, s.profile_status
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            WHERE s.coord_id = ?
            ORDER BY s.s_name ASC
        `, [coordId]);

        // Calculate stats
        const totalStudents = students.length;
        const placedStudents = students.filter(s => String(s.profile_status).toLowerCase() === 'placed').length;
        const placementRate = totalStudents > 0 ? ((placedStudents / totalStudents) * 100).toFixed(1) : '0.0';

        res.json({
            profile: coordinator,
            students: students,
            stats: {
                totalStudents,
                placedStudents,
                placementRate
            }
        });
    } catch (err) {
        console.error('Admin Coordinator Profile Error:', err);
        res.status(500).json({ message: 'Error fetching coordinator profile' });
    }
});



router.post('/student', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { name, email, phone, dob, dept: dept_id, graduation_yr, cgpa, profile_status, company, packageLpa } = req.body;

        if (!name || !email || !dept_id || !graduation_yr) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const [result] = await conn.query(`
            INSERT INTO STUDENT (s_name, email, phone, date_of_birth, dept_id, graduation_yr, cgpa, profile_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            email,
            phone || null,
            dob || null,
            dept_id,
            Number(graduation_yr),
            cgpa ? Number(cgpa) : null,
            profile_status || 'active'
        ]);

        const newStudentId = result.insertId;

        // Create a user account for the student
        const username = email.split('@')[0];
        await conn.query(
            'INSERT INTO USER_ROLE (username, password_hash, role, entity_id) VALUES (?, ?, ?, ?)',
            [username, 'student123', 'student', newStudentId]
        );

        // Handle Placement if status is 'placed'
        if (profile_status === 'placed' && company) {
            // Find or create company
            const [companies] = await conn.query('SELECT comp_id FROM COMPANY WHERE comp_name = ?', [company]);
            let compId;
            if (companies.length > 0) {
                compId = companies[0].comp_id;
            } else {
                const [newComp] = await conn.query('INSERT INTO COMPANY (comp_name, tier) VALUES (?, ?)', [company, 'Tier-3']);
                compId = newComp.insertId;
            }

            // Create Placement Record
            await conn.query(`
                INSERT INTO PLACEMENT_RECORD (s_id, comp_id, academic_year, salary_offered, status)
                VALUES (?, ?, ?, ?, 'confirmed')
            `, [newStudentId, compId, Number(graduation_yr), parseFloat(packageLpa) || 0]);
        }

        await conn.commit();
        res.status(201).json({ message: 'Student created successfully', studentId: newStudentId });
    } catch (err) {
        await conn.rollback();
        console.error('Error adding student:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Failed to add student' });
    } finally {
        conn.release();
    }
});

// DELETE /admin/student/:id
router.delete('/student/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;

        // Delete all linked data first to avoid FK constraints
        await conn.query('DELETE FROM APPLICATION WHERE s_id = ?', [id]);
        await conn.query('DELETE FROM PLACEMENT_RECORD WHERE s_id = ?', [id]);
        await conn.query('DELETE FROM RESUME WHERE s_id = ?', [id]);
        await conn.query('DELETE FROM USER_ROLE WHERE entity_id = ? AND role = ?', [id, 'student']);
        await conn.query('DELETE FROM STUDENT WHERE s_id = ?', [id]);

        await conn.commit();
        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        await conn.rollback();
        console.error('Error deleting student:', err);
        res.status(500).json({ message: 'Failed to delete student' });
    } finally {
        conn.release();
    }
});

// POST /admin/coordinator
router.post('/coordinator', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { name, email, phone_no, dept: dept_id, cgdc_id } = req.body;

        if (!name || !email || !dept_id) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const [result] = await conn.query(
            'INSERT INTO PLACEMENT_COORDINATOR (name, email, phone_no, dept_id, cgdc_id) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone_no || null, dept_id, cgdc_id || null]
        );
        const newId = result.insertId;

        const username = email.split('@')[0];
        await conn.query(
            'INSERT INTO USER_ROLE (username, password_hash, role, entity_id, entity_type) VALUES (?, ?, ?, ?, ?)',
            [username, 'coord123', 'coordinator', newId, 'coordinator']
        );

        await conn.commit();
        res.status(201).json({ message: 'Coordinator added successfully', id: newId });
    } catch (err) {
        await conn.rollback();
        console.error('Error adding coordinator:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Failed to add coordinator' });
    } finally {
        conn.release();
    }
});

// DELETE /admin/coordinator/:id
router.delete('/coordinator/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        await conn.query('DELETE FROM USER_ROLE WHERE entity_id = ? AND role = ?', [id, 'coordinator']);
        await conn.query('DELETE FROM PLACEMENT_COORDINATOR WHERE coord_id = ?', [id]);
        await conn.commit();
        res.json({ message: 'Coordinator deleted successfully' });
    } catch (err) {
        await conn.rollback();
        console.error('Error deleting coordinator:', err);
        res.status(500).json({ message: 'Failed to delete coordinator' });
    } finally {
        conn.release();
    }
});

// POST /admin/company
router.post('/company', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { name, industry, tier, location, website, contactPerson, contactEmail, contactPhone, description, establishedYear, activeJobs, placements, status, positions } = req.body;

        if (!name || !industry || !tier) {
            return res.status(400).json({ message: 'Missing required company fields' });
        }

        const [result] = await conn.query(
            'INSERT INTO COMPANY (comp_name, industry_type, location, contact_email, contact_phone, tier, website) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, industry, location || null, contactEmail || null, contactPhone || null, tier, website || null]
        );
        const compId = result.insertId;

        if (positions && positions.length > 0) {
            for (const pos of positions) {
                try {
                    // Parse salary: accept '8-12 LPA' or plain number
                    const salaryStr = String(pos.salary || '0').replace(/[^0-9.]/g, '');
                    const salaryNum = parseFloat(salaryStr) || null;

                    await conn.query(
                        'INSERT INTO JOB_PROFILE (comp_id, role, job_type, package) VALUES (?, ?, ?, ?)',
                        [compId, pos.title || 'Unknown', 'Full Time', salaryNum]
                    );
                } catch (e) {
                    console.error('Failed to add job profile entry:', e.message);
                    // Non-fatal — continue with other positions
                }
            }
        }

        await conn.commit();
        res.status(201).json({ message: 'Company added successfully', id: compId });
    } catch (err) {
        await conn.rollback();
        console.error('Error adding company:', err);
        res.status(500).json({ message: 'Failed to add company' });
    } finally {
        conn.release();
    }
});

// DELETE /admin/company/:id
router.delete('/company/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM COMPANY WHERE comp_id = ?', [id]);
        res.json({ message: 'Company deleted successfully' });
    } catch (err) {
        console.error('Error deleting company:', err);
        res.status(500).json({ message: 'Failed to delete company' });
    }
});

// GET /admin/assignments - Get unique active students for assignment
router.get('/assignments', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                s.s_id, 
                s.s_name, 
                d.dept_name AS dept, 
                s.email,
                s.coord_id,
                pc.name AS coordinator_name,
                (SELECT COUNT(*) FROM APPLICATION a WHERE a.s_id = s.s_id) as app_count,
                s.created_at
            FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id
            WHERE LOWER(s.profile_status) = 'active'
            
            ORDER BY s.created_at DESC, s.s_id DESC
        `);
        console.log(`[Admin] Assignments found: ${rows.length} active students.`);
        res.json(rows);
    } catch (err) {
        console.error('[Admin] Assignments Error:', err);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

// GET /admin/coordinators - Get all coordinators for the dropdown
router.get('/coordinators', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT coord_id, name as coord_name FROM PLACEMENT_COORDINATOR ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching coordinators:', err);
        res.status(500).json({ message: 'Failed to fetch coordinators' });
    }
});

// POST /admin/assignments/assign - Assign a coordinator to a student
router.post('/assignments/assign', async (req, res) => {
    try {
        const { s_id, coord_id } = req.body;
        if (!s_id) return res.status(400).json({ message: 'Student ID is required' });

        await pool.query('UPDATE STUDENT SET coord_id = ? WHERE s_id = ?', [coord_id || null, s_id]);
        res.json({ message: 'Coordinator assigned successfully' });
    } catch (err) {
        console.error('Error assigning coordinator:', err);
        res.status(500).json({ message: 'Failed to assign coordinator' });
    }
});

// POST /admin/coordinator-swap - Bulk re-assign students to a new coordinator
router.post('/coordinator-swap', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { studentIds, newCoordId } = req.body; // array of IDs
        if (!studentIds || !studentIds.length || !newCoordId) {
            return res.status(400).json({ message: 'Missing students or coordinator ID' });
        }

        await conn.beginTransaction();

        // CRITERION 13: BULK LOCK (Shared/Exclusive Lock)
        // Lock all selected students to prevent anyone from editing them during the swap
        // Using FOR UPDATE to ensure exclusive access
        const [lockedStudents] = await conn.query(
            'SELECT s_id FROM STUDENT WHERE s_id IN (?) FOR UPDATE',
            [studentIds]
        );

        if (lockedStudents.length !== studentIds.length) {
            await conn.rollback();
            return res.status(404).json({ message: 'Some students were not found' });
        }

        // Perform the swap
        await conn.query(
            'UPDATE STUDENT SET coord_id = ? WHERE s_id IN (?)',
            [newCoordId, studentIds]
        );

        await conn.commit();
        res.json({ message: `Successfully re-assigned ${studentIds.length} students.` });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Bulk Swap Error:', err);
        res.status(500).json({ message: 'Failed to perform bulk swap: ' + err.message });
    } finally {
        if (conn) conn.release();
    }
});

function normalizeStatus(s) {
    if (!s) return 'active';
    const low = s.toLowerCase();
    if (low.includes('place')) return 'placed';
    if (low.includes('opt')) return 'opted_out';
    if (low.includes('not')) return 'not_eligible';
    return 'active';
}

function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// DELETE /admin/company/:id (Transaction)
router.delete('/company/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        await conn.beginTransaction();

        // CRITERION 12: ATOMIC CLEANUP
        // 1. Delete all applications for this company's jobs
        await conn.query(`
            DELETE FROM APPLICATION 
            WHERE job_id IN (SELECT job_id FROM JOB_PROFILE WHERE comp_id = ?)
        `, [id]);

        // 2. Delete all job profiles for this company
        await conn.query('DELETE FROM JOB_PROFILE WHERE comp_id = ?', [id]);

        // 3. Delete the company itself
        const [result] = await conn.query('DELETE FROM COMPANY WHERE comp_id = ?', [id]);

        if (result.affectedRows === 0) {
            throw new Error('Company not found');
        }

        await conn.commit();
        res.json({ message: 'Company and all associated jobs/applications deleted successfully.' });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Company Delete Error:', err);
        res.status(500).json({ message: err.message });
    } finally {
        if (conn) conn.release();
    }
});

// Catch-all 404 for admin routes to prevent HTML responses
router.use((req, res) => {
    res.status(404).json({ message: `Admin route not found: ${req.method} ${req.originalUrl}` });
});

export default router;