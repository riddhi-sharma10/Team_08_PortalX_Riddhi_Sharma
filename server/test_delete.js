import pool from './db.js';

async function testDelete() {
    try {
        const id = 301; // Muskan's ID
        console.log(`Attempting to delete student ${id}...`);
        
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            console.log('Deleting from USER_ROLE...');
            await conn.query('DELETE FROM USER_ROLE WHERE entity_id = ? AND role = "student"', [id]);
            
            console.log('Deleting from STUDENT...');
            await conn.query('DELETE FROM STUDENT WHERE s_id = ?', [id]);
            
            await conn.commit();
            console.log('SUCCESS: Student deleted.');
        } catch (err) {
            await conn.rollback();
            console.error('FAILURE:', err.message);
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                console.log('Foreign key constraint violation detected.');
            }
        } finally {
            conn.release();
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testDelete();
