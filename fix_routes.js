import fs from 'fs';

const file = 'server/routes/coordinator.js';
let content = fs.readFileSync(file, 'utf8');

const prefix = "router.get('/analytics', async (req, res) => {";
const newAnalytics = `router.get('/analytics', async (req, res) => {
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

        const [students] = await pool.query(\`SELECT COUNT(*) AS count FROM STUDENT s WHERE s.coord_id = ? \${yearFilterStudent}\`, params);
        const [applications] = await pool.query(\`
            SELECT COUNT(*) AS count 
            FROM APPLICATION a 
            JOIN STUDENT s ON a.s_id = s.s_id 
            WHERE s.coord_id = ? \${yearFilterApp}
        \`, params);

        const prParams = year !== 'all' ? [id, Number(year), id, Number(year)] : [id, id];
        const [placed] = await pool.query(\`
            SELECT COUNT(DISTINCT s_id) AS count FROM (
                SELECT pr.s_id FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id WHERE s.coord_id = ? \${yearFilterPr}
                UNION
                SELECT a.s_id FROM APPLICATION a JOIN STUDENT s ON a.s_id = s.s_id WHERE a.status = 'selected' AND s.coord_id = ? \${year !== 'all' ? 'AND YEAR(a.applied_date) = ?' : ''}
            ) as combined_placed
        \`, prParams);

        const [maxPkg] = await pool.query(\`
            SELECT MAX(val) as val FROM (
                SELECT pr.salary_offered as val FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id WHERE s.coord_id = ? \${yearFilterPr}
                UNION
                SELECT j.package as val FROM APPLICATION a JOIN JOB_PROFILE j ON a.job_id = j.job_id JOIN STUDENT s ON a.s_id = s.s_id WHERE a.status = 'selected' AND s.coord_id = ? \${year !== 'all' ? 'AND YEAR(a.applied_date) = ?' : ''}
            ) as combined_pkg
        \`, prParams);

        const [avgPkg] = await pool.query(\`
            SELECT AVG(val) as val FROM (
                SELECT pr.salary_offered as val FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id WHERE s.coord_id = ? \${yearFilterPr}
                UNION
                SELECT j.package as val FROM APPLICATION a JOIN JOB_PROFILE j ON a.job_id = j.job_id JOIN STUDENT s ON a.s_id = s.s_id WHERE a.status = 'selected' AND s.coord_id = ? \${year !== 'all' ? 'AND YEAR(a.applied_date) = ?' : ''}
            ) as combined_pkg
        \`, prParams);

        const totalStudents = Number(students[0]?.count || 0);
        const totalPlaced = Number(placed[0]?.count || 0);
        const placementRate = totalStudents ? ((totalPlaced / totalStudents) * 100) : 0;

        const [salaryBuckets] = await pool.query(\`
            SELECT
                SUM(CASE WHEN pr.salary_offered < 5 THEN 1 ELSE 0 END) AS below5,
                SUM(CASE WHEN pr.salary_offered >= 5 AND pr.salary_offered < 10 THEN 1 ELSE 0 END) AS range5to10,
                SUM(CASE WHEN pr.salary_offered >= 10 AND pr.salary_offered < 20 THEN 1 ELSE 0 END) AS range10to20,
                SUM(CASE WHEN pr.salary_offered >= 20 THEN 1 ELSE 0 END) AS above20
            FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id
            WHERE s.coord_id = ? \${yearFilterPr}
        \`, params);

        const [deptStats] = await pool.query(\`
            SELECT
                COALESCE(s.dept, 'Unknown') AS name,
                COUNT(DISTINCT s.s_id) AS totalStudents,
                COUNT(DISTINCT pr.s_id) AS placedCount,
                AVG(pr.salary_offered) AS avgLpa
            FROM STUDENT s
            LEFT JOIN PLACEMENT_RECORD pr ON pr.s_id = s.s_id \${yearFilterPr.replace('WHERE', 'AND')}
            WHERE s.coord_id = ? \${yearFilterStudent}
            GROUP BY COALESCE(s.dept, 'Unknown')
            ORDER BY placedCount DESC
        \`, params);

        const monthlyTrendQuery = \`
            SELECT 
                COALESCE(app_months.monthIdx, offer_months.monthIdx) AS monthIdx,
                COALESCE(app_months.label, offer_months.label) AS label,
                COALESCE(app_months.applications, 0) AS applications,
                COALESCE(offer_months.offers, 0) AS offers
            FROM (
                SELECT MONTH(applied_date) AS monthIdx, DATE_FORMAT(applied_date, '%b') AS label, COUNT(*) AS applications
                FROM APPLICATION a JOIN STUDENT s ON a.s_id = s.s_id 
                WHERE s.coord_id = ? \${yearFilterApp}
                GROUP BY monthIdx, label
            ) app_months
            LEFT JOIN (
                SELECT MONTH(pr.recorded_on) AS monthIdx, DATE_FORMAT(pr.recorded_on, '%b') AS label, COUNT(*) AS offers
                FROM PLACEMENT_RECORD pr JOIN STUDENT s ON pr.s_id = s.s_id 
                WHERE s.coord_id = ? \${yearFilterPr.replace('academic_year = ?', 'YEAR(pr.recorded_on) = ?')} AND pr.recorded_on IS NOT NULL
                GROUP BY monthIdx, label
            ) offer_months ON app_months.monthIdx = offer_months.monthIdx
            ORDER BY monthIdx ASC
        \`;
        const [monthlyTrend] = await pool.query(monthlyTrendQuery, year !== 'all' ? [id, Number(year), id, Number(year)] : [id, id]);

        const [appStatusRows] = await pool.query(\`
            SELECT a.status, COUNT(*) as count 
            FROM APPLICATION a 
            JOIN STUDENT s ON a.s_id = s.s_id 
            WHERE s.coord_id = ? \${yearFilterApp}
            GROUP BY a.status
        \`, params);

        const [topCompanyRows] = await pool.query(\`
            SELECT c.comp_name as name, COUNT(pr.record_id) as count 
            FROM PLACEMENT_RECORD pr 
            JOIN COMPANY c ON pr.comp_id = c.comp_id 
            JOIN STUDENT s ON s.s_id = pr.s_id 
            WHERE s.coord_id = ? \${yearFilterPr}
            GROUP BY c.comp_id, c.comp_name 
            ORDER BY count DESC 
            LIMIT 5
        \`, params);

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
                \`\${totalPlaced} students out of \${totalStudents} assigned to you have secured placements.\`,
                \`Highest package secured is ₹\${Number(maxPkg[0]?.val || 0).toFixed(2)} LPA.\`
            ],
            availableYears: ['all', 2026, 2025, 2024]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error loading coordinator analytics' });
    }
});

export default router;
`;

const startIndex = content.indexOf(prefix);
if(startIndex > -1) {
    content = content.substring(0, startIndex) + newAnalytics;
    fs.writeFileSync(file, content);
    console.log('Successfully wrote exact backend analytics logic.');
} else {
    console.log('Could not find prefix.');
}
