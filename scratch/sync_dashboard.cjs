const fs = require('fs');
const path = 'server/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Update Offers KPI
const oldOffers = 'const [offers] = await pool.query("SELECT COUNT(DISTINCT s_id) AS count FROM PLACEMENT_RECORD");';
const newOffers = `const [offers] = await pool.query(\`
            SELECT COUNT(DISTINCT s_id) AS count FROM (
                SELECT s_id FROM PLACEMENT_RECORD
                UNION
                SELECT s_id FROM APPLICATION WHERE status = 'selected'
            ) as combined_placed
        \`);`;
content = content.replace(oldOffers, newOffers);

// 2. Update Total Job Offers KPI
const oldTotalOffers = "const [totalJobOffers] = await pool.query(\"SELECT COUNT(*) AS count FROM PLACEMENT_RECORD\");";
const newTotalOffers = `const [totalJobOffers] = await pool.query(\`
            SELECT COUNT(*) AS count FROM (
                SELECT record_id FROM PLACEMENT_RECORD
                UNION ALL
                SELECT app_id FROM APPLICATION WHERE status = 'selected'
            ) as combined_offers
        \`);`;
content = content.replace(oldTotalOffers, newTotalOffers);

// 3. Update Trend query
const oldTrend = `        const [trend] = await pool.query(\`
            SELECT DATE_FORMAT(recorded_on, '%b') AS label,
                   MONTH(recorded_on) AS monthIndex,
                   COUNT(*) AS placements
            FROM PLACEMENT_RECORD
            WHERE recorded_on IS NOT NULL
            GROUP BY MONTH(recorded_on), DATE_FORMAT(recorded_on, '%b')
            ORDER BY monthIndex
            LIMIT 6
        \`);`;
const newTrend = `        const [trend] = await pool.query(\`
            SELECT label, monthIndex, SUM(placements) as placements FROM (
                SELECT DATE_FORMAT(recorded_on, '%b') AS label, MONTH(recorded_on) AS monthIndex, COUNT(*) AS placements
                FROM PLACEMENT_RECORD WHERE recorded_on IS NOT NULL
                GROUP BY label, monthIndex
                UNION ALL
                SELECT DATE_FORMAT(applied_date, '%b') AS label, MONTH(applied_date) AS monthIndex, COUNT(*) AS placements
                FROM APPLICATION WHERE status = 'selected' AND applied_date IS NOT NULL
                GROUP BY label, monthIndex
            ) as combined_trend
            GROUP BY label, monthIndex
            ORDER BY monthIndex
            LIMIT 6
        \`);`;
content = content.replace(oldTrend, newTrend);

// 4. Update Department query
const oldDept = `        const [departments] = await pool.query(\`
            SELECT COALESCE(s.dept, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON s.s_id = pr.s_id
            GROUP BY COALESCE(s.dept, 'Unknown')
            ORDER BY placed DESC
            LIMIT 3
        \`);`;
const newDept = `        const [departments] = await pool.query(\`
            SELECT name, SUM(placed) as placed FROM (
                SELECT COALESCE(s.dept, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed
                FROM PLACEMENT_RECORD pr JOIN STUDENT s ON s.s_id = pr.s_id
                GROUP BY name
                UNION ALL
                SELECT COALESCE(s.dept, 'Unknown') AS name, COUNT(DISTINCT a.s_id) AS placed
                FROM APPLICATION a JOIN STUDENT s ON s.s_id = a.s_id WHERE a.status = 'selected'
                GROUP BY name
            ) as combined_dept
            GROUP BY name
            ORDER BY placed DESC
            LIMIT 3
        \`);`;
content = content.replace(oldDept, newDept);

fs.writeFileSync(path, content);
console.log('Dashboard KPIs fully synced with real-time selected status');
