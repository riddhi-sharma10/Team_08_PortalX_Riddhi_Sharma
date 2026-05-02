import pool from './db.js';

async function testTrend() {
    try {
        const [monthlyTrend] = await pool.query(`
            SELECT 
                COALESCE(app_months.monthIdx, offer_months.monthIdx) AS monthIdx,
                COALESCE(app_months.label, offer_months.label) AS label,
                COALESCE(app_months.applications, 0) AS applications,
                COALESCE(offer_months.offers, 0) AS offers
            FROM (
                SELECT MONTH(applied_date) AS monthIdx, DATE_FORMAT(applied_date, '%b') AS label, COUNT(*) AS applications
                FROM APPLICATION
                WHERE applied_date IS NOT NULL 
                GROUP BY MONTH(applied_date), DATE_FORMAT(applied_date, '%b')
            ) app_months
            LEFT JOIN (
                SELECT MONTH(recorded_on) AS monthIdx, DATE_FORMAT(recorded_on, '%b') AS label, COUNT(*) AS offers
                FROM PLACEMENT_RECORD
                WHERE recorded_on IS NOT NULL 
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
                WHERE applied_date IS NOT NULL 
                GROUP BY MONTH(applied_date), DATE_FORMAT(applied_date, '%b')
            ) app_months
            RIGHT JOIN (
                SELECT MONTH(recorded_on) AS monthIdx, DATE_FORMAT(recorded_on, '%b') AS label, COUNT(*) AS offers
                FROM PLACEMENT_RECORD
                WHERE recorded_on IS NOT NULL 
                GROUP BY MONTH(recorded_on), DATE_FORMAT(recorded_on, '%b')
            ) offer_months ON app_months.monthIdx = offer_months.monthIdx
            ORDER BY monthIdx
        `);
        console.log("Monthly trend:", monthlyTrend);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testTrend();
