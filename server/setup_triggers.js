
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function setupTriggers() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 13553,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false },
            multipleStatements: true 
        });

        console.log('--- Setting up Database Triggers (Criterion 14) ---');

        // 1. Create Audit Table
        console.log('1. Creating STATUS_AUDIT_LOG table...');
        await conn.query(`
            CREATE TABLE IF NOT EXISTS STATUS_AUDIT_LOG (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                app_id INT,
                old_status VARCHAR(50),
                new_status VARCHAR(50),
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Drop existing triggers if they exist to avoid errors
        const triggers = [
            'trg_update_eligibility',
            'trg_application_audit',
            'trg_prevent_duplicate_placement',
            'trg_vacancy_sync'
        ];
        for (const t of triggers) {
            await conn.query(`DROP TRIGGER IF EXISTS ${t}`);
        }

        // 3. Trigger: Automatic Eligibility Manager
        console.log('2. Creating Eligibility Manager Trigger...');
        await conn.query(`
            CREATE TRIGGER trg_update_eligibility
            BEFORE UPDATE ON STUDENT
            FOR EACH ROW
            BEGIN
                IF NEW.cgpa < 6.0 AND OLD.cgpa >= 6.0 THEN
                    SET NEW.profile_status = 'not_eligible';
                END IF;
            END
        `);

        // 4. Trigger: Application Status Audit Log
        console.log('3. Creating Application Audit Trigger...');
        await conn.query(`
            CREATE TRIGGER trg_application_audit
            AFTER UPDATE ON APPLICATION
            FOR EACH ROW
            BEGIN
                IF OLD.status <> NEW.status THEN
                    INSERT INTO STATUS_AUDIT_LOG (app_id, old_status, new_status)
                    VALUES (OLD.app_id, OLD.status, NEW.status);
                END IF;
            END
        `);

        // 5. Trigger: Placement Conflict Prevention
        console.log('4. Creating Placement Conflict Trigger...');
        await conn.query(`
            CREATE TRIGGER trg_prevent_duplicate_placement
            BEFORE INSERT ON PLACEMENT_RECORD
            FOR EACH ROW
            BEGIN
                DECLARE placed_count INT;
                SELECT COUNT(*) INTO placed_count FROM PLACEMENT_RECORD WHERE s_id = NEW.s_id AND (status = 'confirmed' OR status = 'placed');
                IF placed_count > 0 THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: Student is already placed in another company.';
                END IF;
            END
        `);

        // 6. Trigger: Vacancy Auto-Sync
        console.log('5. Creating Vacancy Auto-Sync Trigger...');
        await conn.query(`
            CREATE TRIGGER trg_vacancy_sync
            AFTER UPDATE ON OFFER
            FOR EACH ROW
            BEGIN
                IF NEW.offer_status = 'accepted' AND OLD.offer_status <> 'accepted' THEN
                    UPDATE JOB_PROFILE SET vacancies = vacancies - 1 WHERE job_id = NEW.job_id;
                END IF;
            END
        `);

        console.log('--- All Triggers Successfully Implemented ---');
        process.exit(0);
    } catch (err) {
        console.error('Trigger setup failed:', err);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

setupTriggers();
