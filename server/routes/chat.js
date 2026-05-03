import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/chat/messages?otherUser=[id]
router.get('/messages', async (req, res) => {
    try {
        const { myId, otherId } = req.query;
        if (!myId || !otherId) return res.status(400).json({ message: 'Missing user IDs' });

        const [rows] = await pool.query(`
            SELECT * FROM CHAT_MESSAGE 
            WHERE (sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at ASC
        `, [myId, otherId, otherId, myId]);

        // Mark as read
        await pool.query(`
            UPDATE CHAT_MESSAGE SET is_read = TRUE 
            WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE
        `, [otherId, myId]);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// POST /api/chat/send
router.post('/send', async (req, res) => {
    try {
        const { sender_id, sender_role, receiver_id, receiver_role, message_text } = req.body;
        console.log(`[Chat] Attempting to send from ${sender_id} (${sender_role}) to ${receiver_id} (${receiver_role})`);
        
        // Normalize role for DB enum
        const s_role = sender_role === 'cgdc_admin' ? 'admin' : sender_role;
        const r_role = receiver_role === 'cgdc_admin' ? 'admin' : receiver_role;

        const [result] = await pool.query(`
            INSERT INTO CHAT_MESSAGE (sender_id, sender_role, receiver_id, receiver_role, message_text)
            VALUES (?, ?, ?, ?, ?)
        `, [sender_id, s_role, receiver_id, r_role, message_text]);

        // Create notification for receiver with real name if available
        const senderName = req.body.sender_name || sender_id;
        await pool.query(`
            INSERT INTO NOTIFICATION (user_id, user_role, title, content, type)
            VALUES (?, ?, ?, ?, 'message')
        `, [receiver_id, r_role, 'New Message', `You have a new message from ${senderName}`]);

        // Trigger real-time push via SSE
        import('../sse.js').then(({ notifyUser }) => {
            notifyUser(receiver_id, 'new_message', { sender_id, message_text });
            notifyUser(receiver_id, 'new_notification', { title: 'New Message', content: `You have a new message from ${senderName}` });
        }).catch(err => console.error("SSE Error:", err));

        res.json({ success: true, msg_id: result.insertId });
    } catch (err) {
        console.error('[Chat] Send Error:', err);
        res.status(500).json({ message: 'Error sending message', error: err.message });
    }
});

// GET /api/chat/conversations?userId=[id]
router.get('/conversations', async (req, res) => {
    try {
        const { userId } = req.query;
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

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching conversations' });
    }
});

// GET /api/chat/notifications?userId=[id]
router.get('/notifications', async (req, res) => {
    try {
        const { userId } = req.query;
        const [rows] = await pool.query(`
            SELECT * FROM NOTIFICATION 
            WHERE user_id = ? AND is_read = FALSE
            ORDER BY created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// POST /api/chat/notifications/read
router.post('/notifications/read', async (req, res) => {
    try {
        const { userId } = req.body;
        await pool.query('UPDATE NOTIFICATION SET is_read = TRUE WHERE user_id = ?', [userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error marking notifications as read' });
    }
});

export default router;
