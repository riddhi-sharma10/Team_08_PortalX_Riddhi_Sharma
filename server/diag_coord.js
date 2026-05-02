import pool from './db.js';

const [users] = await pool.query("SELECT user_id, username, role, entity_id FROM USER_ROLE WHERE role = 'coordinator'");
console.log('=== COORDINATOR USER_ROLE ===');
users.forEach(u => console.log(`  user_id=${u.user_id} | username=${u.username} | entity_id=${u.entity_id}`));

for (const u of users) {
    const cid = u.entity_id;
    const [s] = await pool.query('SELECT COUNT(*) as cnt FROM STUDENT WHERE coord_id = ?', [cid]);
    const [p] = await pool.query(
        "SELECT COUNT(DISTINCT o.s_id) as placed FROM OFFER o INNER JOIN STUDENT s ON o.s_id=s.s_id WHERE s.coord_id=? AND LOWER(o.offer_status)='accepted'",
        [cid]
    );
    console.log(`  coord_id=${cid} (${u.username}) => students=${s[0].cnt}, placed=${p[0].placed}`);
}

pool.end();
