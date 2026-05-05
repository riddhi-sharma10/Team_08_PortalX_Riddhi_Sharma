import pool from './server/db.js';

async function migrate() {
    console.log("Starting Department Database Migration...");
    const conn = await pool.getConnection();
    try {
        await conn.query("SET FOREIGN_KEY_CHECKS=0");

        // 1. Truncate and insert exactly 5 values into DEPARTMENT
        await conn.query("TRUNCATE TABLE DEPARTMENT");
        const depts = [
            [1, 'Computer Science'],
            [2, 'IT'],
            [3, 'Electronics'],
            [4, 'Mechanical'],
            [5, 'Civil']
        ];
        for (const [id, name] of depts) {
            await conn.query("INSERT INTO DEPARTMENT (dept_id, dept_name) VALUES (?, ?)", [id, name]);
        }
        console.log("✅ DEPARTMENT table populated");

        // 2. Add dept_id column to STUDENT and PLACEMENT_COORDINATOR
        await conn.query("ALTER TABLE STUDENT ADD COLUMN dept_id INT NULL AFTER dept");
        await conn.query("ALTER TABLE PLACEMENT_COORDINATOR ADD COLUMN dept_id INT NULL AFTER dept");
        console.log("✅ Added dept_id columns");

        // 3. Map old string values to the new IDs
        const updates = [
            { id: 1, names: ['Computer Science'] },
            { id: 2, names: ['IT'] },
            { id: 3, names: ['Electronics'] },
            { id: 4, names: ['Mechanical'] },
            { id: 5, names: ['Civil'] }
        ];

        for (const u of updates) {
            for (const name of u.names) {
                await conn.query("UPDATE STUDENT SET dept_id = ? WHERE dept = ?", [u.id, name]);
                await conn.query("UPDATE PLACEMENT_COORDINATOR SET dept_id = ? WHERE dept = ?", [u.id, name]);
            }
        }
        console.log("✅ Data mapped to dept_id");

        // Make sure no NULLs are left (default to 1 if unknown, shouldn't happen based on our checks)
        await conn.query("UPDATE STUDENT SET dept_id = 1 WHERE dept_id IS NULL");
        await conn.query("UPDATE PLACEMENT_COORDINATOR SET dept_id = 1 WHERE dept_id IS NULL");

        // 4. Modify column to NOT NULL and add foreign keys
        await conn.query("ALTER TABLE STUDENT MODIFY COLUMN dept_id INT NOT NULL");
        await conn.query("ALTER TABLE PLACEMENT_COORDINATOR MODIFY COLUMN dept_id INT NOT NULL");

        await conn.query("ALTER TABLE STUDENT ADD CONSTRAINT fk_student_dept FOREIGN KEY (dept_id) REFERENCES DEPARTMENT(dept_id) ON DELETE RESTRICT ON UPDATE CASCADE");
        await conn.query("ALTER TABLE PLACEMENT_COORDINATOR ADD CONSTRAINT fk_coord_dept FOREIGN KEY (dept_id) REFERENCES DEPARTMENT(dept_id) ON DELETE RESTRICT ON UPDATE CASCADE");
        console.log("✅ Constraints added");

        // 5. Update vw_student_details view so it still returns 'dept'
        await conn.query(`
            CREATE OR REPLACE VIEW vw_student_details AS
            SELECT 
                s.s_id, 
                s.s_name, 
                s.email, 
                d.dept_name AS dept, 
                s.cgpa, 
                s.graduation_yr, 
                s.profile_status, 
                pc.name AS coordinator_name, 
                cd.dept_name AS coordinator_dept,
                s.coord_id,
                s.dept_id
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id
            LEFT JOIN DEPARTMENT cd ON pc.dept_id = cd.dept_id
        `);
        console.log("✅ View vw_student_details updated");

        // 6. Finally drop the old 'dept' columns
        await conn.query("ALTER TABLE STUDENT DROP COLUMN dept");
        await conn.query("ALTER TABLE PLACEMENT_COORDINATOR DROP COLUMN dept");
        console.log("✅ Old dept string columns dropped");

        await conn.query("SET FOREIGN_KEY_CHECKS=1");
        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        await conn.query("SET FOREIGN_KEY_CHECKS=1");
        process.exit(1);
    } finally {
        conn.release();
    }
}
migrate();
