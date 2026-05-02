import pool from './db.js';

async function test() {
    try {
        const [depts] = await pool.query('SELECT DISTINCT dept FROM STUDENT');
        console.log('Distinct Departments in STUDENT table:', depts.map(d => d.dept));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
test();
