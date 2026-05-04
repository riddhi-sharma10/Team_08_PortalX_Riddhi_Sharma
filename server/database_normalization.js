import pool from './db.js';

async function normalizeDatabase() {
    const conn = await pool.getConnection();
    try {
        console.log("Starting Database Normalization...");

        // 1. Drop entity_type from USER_ROLE
        try {
            await conn.query("ALTER TABLE USER_ROLE DROP COLUMN entity_type");
            console.log("✅ Dropped entity_type from USER_ROLE");
        } catch (e) {
            console.log("⚠️ Could not drop entity_type: " + e.message);
        }

        // 2. Drop resume_url from STUDENT
        try {
            await conn.query("ALTER TABLE STUDENT DROP COLUMN resume_url");
            console.log("✅ Dropped resume_url from STUDENT");
        } catch (e) {
            console.log("⚠️ Could not drop resume_url: " + e.message);
        }

        // 3. Drop stream from PLACEMENT_RECORD
        try {
            await conn.query("ALTER TABLE PLACEMENT_RECORD DROP COLUMN stream");
            console.log("✅ Dropped stream from PLACEMENT_RECORD");
        } catch (e) {
            console.log("⚠️ Could not drop stream: " + e.message);
        }

        // 4. Drop avg_package_offered from COMPANY
        try {
            await conn.query("ALTER TABLE COMPANY DROP COLUMN avg_package_offered");
            console.log("✅ Dropped avg_package_offered from COMPANY");
        } catch (e) {
            console.log("⚠️ Could not drop avg_package_offered: " + e.message);
        }

        // 5. Drop students_placed from COMPANY_VISIT_HISTORY
        try {
            await conn.query("ALTER TABLE COMPANY_VISIT_HISTORY DROP COLUMN students_placed");
            console.log("✅ Dropped students_placed from COMPANY_VISIT_HISTORY");
        } catch (e) {
            console.log("⚠️ Could not drop students_placed: " + e.message);
        }

        // 6. Create RESUME_ANALYSIS_KEYWORD table for future use
        try {
            await conn.query(`
                CREATE TABLE IF NOT EXISTS RESUME_ANALYSIS_KEYWORD (
                    keyword_id INT PRIMARY KEY AUTO_INCREMENT,
                    analysis_id INT NOT NULL,
                    keyword VARCHAR(100) NOT NULL,
                    status ENUM('found', 'missing') NOT NULL
                )
            `);
            console.log("✅ Created RESUME_ANALYSIS_KEYWORD table");
        } catch (e) {
            console.log("⚠️ Could not create RESUME_ANALYSIS_KEYWORD: " + e.message);
        }

        console.log("Database Normalization Complete.");
    } finally {
        conn.release();
        process.exit();
    }
}
normalizeDatabase();
