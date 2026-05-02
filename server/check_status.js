import pool from './db.js';

// 1. What distinct values exist in profile_status?
const [vals] = await pool.query(
    'SELECT profile_status, COUNT(*) AS cnt FROM STUDENT GROUP BY profile_status ORDER BY cnt DESC'
);
console.log('=== DISTINCT profile_status VALUES IN DB ===');
vals.forEach(r => console.log(`  "${r.profile_status}" → ${r.cnt} students`));

// 2. Also check the column definition to see if it's an ENUM
const [cols] = await pool.query(
    "SHOW COLUMNS FROM STUDENT LIKE 'profile_status'"
);
console.log('\n=== COLUMN DEFINITION ===');
console.log(cols[0]);

pool.end();
