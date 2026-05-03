const fs = require('fs');
const file = 'server/routes/coordinator.js';
let content = fs.readFileSync(file, 'utf8');

const anchor1 = `const [monthlyTrend] = await pool.query(monthlyTrendQuery, year !== 'all' ? [id, Number(year), id, Number(year)] : [id, id]);`;
const replacement1 = `const [monthlyTrend] = await pool.query(monthlyTrendQuery, year !== 'all' ? [id, Number(year), id, Number(year)] : [id, id]);

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
`;

const anchor2 = `monthLabels: monthlyTrend.map(m => m.label),
            monthlyApplications: monthlyTrend.map(m => m.applications),
            monthlyOffers: monthlyTrend.map(m => m.offers),
            insights: [`;
const replacement2 = `monthLabels: monthlyTrend.map(m => m.label),
            monthlyApplications: monthlyTrend.map(m => m.applications),
            monthlyOffers: monthlyTrend.map(m => m.offers),
            appStatusDist: appStatusRows.map(r => ({ status: r.status, count: r.count })),
            topCompanies: topCompanyRows.map(r => ({ name: r.name, count: r.count })),
            insights: [`;

content = content.replace(anchor1, replacement1);
content = content.replace(anchor2, replacement2);
fs.writeFileSync(file, content);
console.log('Successfully updated backend coordinator analytics.');
