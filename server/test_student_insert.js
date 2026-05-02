import pool from './db.js';

async function test() {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Test student insert
        const [result] = await conn.query(
            'INSERT INTO STUDENT (s_name, email, phone, date_of_birth, dept, graduation_yr, cgpa, profile_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['Test Student Debug', 'test_debug_abc@university.edu', '9050826857', '2006-05-18', 'Electronics', 2028, null, 'active']
        );
        const newStudentId = result.insertId;
        console.log('✅ STUDENT inserted, id:', newStudentId);

        // Test USER_ROLE insert with correct columns
        const username = 'test_debug_abc';
        await conn.query(
            'INSERT INTO USER_ROLE (username, password_hash, role, entity_id, entity_type) VALUES (?, ?, ?, ?, ?)',
            [username, 'student123', 'student', newStudentId, 'student']
        );
        console.log('✅ USER_ROLE inserted for student');

        // Rollback — this is just a test
        await conn.rollback();
        console.log('✅ Rolled back test data — no permanent changes made.');
        process.exit(0);
    } catch(e) {
        await conn.rollback();
        console.error('❌ Error:', e.message);
        console.error('   SQL State:', e.sqlState);
        process.exit(1);
    } finally {
        conn.release();
    }
}
test();
