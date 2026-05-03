import pool from '../db.js';

async function run() {
    const userId = 'coord8_anaya@university.edu';
    try {
        const [rows] = await pool.query(`
            SELECT 
                convs.other_user,
                convs.other_role,
                MAX(convs.created_at) as last_msg,
                (SELECT COUNT(*) FROM CHAT_MESSAGE 
                 WHERE sender_id = convs.other_user AND receiver_id = ? AND is_read = FALSE) as unread_count,
                MAX(COALESCE(s.s_name, pc.name, adm.name, convs.other_user)) as other_name
            FROM (
                SELECT 
                    CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_user,
                    CASE WHEN sender_id = ? THEN receiver_role ELSE sender_role END AS other_role,
                    created_at
                FROM CHAT_MESSAGE
                WHERE sender_id = ? OR receiver_id = ?
            ) as convs
            LEFT JOIN STUDENT s ON s.email COLLATE utf8mb4_unicode_ci = convs.other_user COLLATE utf8mb4_unicode_ci OR CAST(s.s_id AS CHAR) COLLATE utf8mb4_unicode_ci = convs.other_user COLLATE utf8mb4_unicode_ci
            LEFT JOIN PLACEMENT_COORDINATOR pc ON pc.email COLLATE utf8mb4_unicode_ci = convs.other_user COLLATE utf8mb4_unicode_ci OR CAST(pc.coord_id AS CHAR) COLLATE utf8mb4_unicode_ci = convs.other_user COLLATE utf8mb4_unicode_ci
            LEFT JOIN CGDC_ADMIN adm ON adm.email COLLATE utf8mb4_unicode_ci = convs.other_user COLLATE utf8mb4_unicode_ci OR CAST(adm.cgdc_id AS CHAR) COLLATE utf8mb4_unicode_ci = convs.other_user COLLATE utf8mb4_unicode_ci
            GROUP BY convs.other_user, convs.other_role
            ORDER BY last_msg DESC
        `, [userId, userId, userId, userId, userId]);
        console.log(rows);
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
run();
