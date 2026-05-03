import pool from './server/db.js';

async function test() {
    try {
        console.log("Checking DB...");
        // Get the first coordinator ID to test
        const [coords] = await pool.query('SELECT coord_id FROM PLACEMENT_COORDINATOR LIMIT 1');
        const id = coords[0].coord_id;
        console.log("Testing for Coordinator ID:", id);

        const params = [id];

        const [appStatusRows] = await pool.query(`
            SELECT a.status, COUNT(*) as count 
            FROM APPLICATION a 
            JOIN STUDENT s ON a.s_id = s.s_id 
            WHERE s.coord_id = ?
            GROUP BY a.status
        `, params);
        console.log("App Status:", appStatusRows);

        const [topCompanyRows] = await pool.query(`
            SELECT c.comp_name as name, COUNT(pr.record_id) as count 
            FROM PLACEMENT_RECORD pr 
            JOIN COMPANY c ON pr.comp_id = c.comp_id 
            JOIN STUDENT s ON s.s_id = pr.s_id 
            WHERE s.coord_id = ?
            GROUP BY c.comp_id, c.comp_name 
            ORDER BY count DESC 
            LIMIT 5
        `, params);
        console.log("Top Companies:", topCompanyRows);

        // check trend
        const [monthlyTrend] = await pool.query(`
            SELECT MONTH(applied_date) AS monthIdx, DATE_FORMAT(applied_date, '%b') AS label, COUNT(*) AS applications
            FROM APPLICATION a JOIN STUDENT s ON a.s_id = s.s_id 
            WHERE s.coord_id = ?
            GROUP BY monthIdx, label
        `, params);
        console.log("Trend:", monthlyTrend);

        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

test();
