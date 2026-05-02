import pool from './db.js';

async function test() {
    try {
        const [students] = await pool.query('SELECT COUNT(*) AS count FROM STUDENT');
        const [userRoles] = await pool.query("SELECT COUNT(*) AS count FROM USER_ROLE WHERE role = 'student'");
        const [admins] = await pool.query("SELECT COUNT(*) AS count FROM USER_ROLE WHERE role IN ('admin', 'cgdc_admin')");
        const [coords] = await pool.query("SELECT COUNT(*) AS count FROM USER_ROLE WHERE role = 'coordinator'");

        console.log('STUDENT table count:', students[0].count);
        console.log('USER_ROLE (student) count:', userRoles[0].count);
        console.log('USER_ROLE (admin) count:', admins[0].count);
        console.log('USER_ROLE (coordinator) count:', coords[0].count);

        const [sampleUsers] = await pool.query("SELECT * FROM USER_ROLE WHERE role = 'student' LIMIT 5");
        console.log('\nSample USER_ROLE rows:', JSON.stringify(sampleUsers, null, 2));

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
test();
