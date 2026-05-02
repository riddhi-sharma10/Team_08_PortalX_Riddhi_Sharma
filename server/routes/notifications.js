import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications
// Fetches notifications for the logged-in user
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.email || req.user.id;
        let role = req.user.role;
        
        // Normalize role for DB enum
        if (role === 'cgdc_admin') role = 'admin';

        console.log(`[Notifications] Fetching for ${userId} (${role})`);

        const [rows] = await pool.query(`
            SELECT * FROM NOTIFICATION 
            WHERE user_id = ? AND user_role = ?
            ORDER BY created_at DESC 
            LIMIT 50
        `, [userId, role]);

        res.json(rows);
    } catch (err) {
        console.error('[Notifications] Fetch Error:', err);
        res.status(500).json({ message: 'Error fetching notifications', error: err.message });
    }
});

// POST /api/notifications/read/:id
// Mark a notification as read
router.post('/read/:id', requireAuth, async (req, res) => {
    try {
        const notifId = req.params.id;
        const userId = req.user.email || req.user.id;

        await pool.query(`
            UPDATE NOTIFICATION SET is_read = 1 
            WHERE notif_id = ? AND user_id = ?
        `, [notifId, userId]);

        res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] Mark Read Error:', err);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
});

// POST /api/notifications/read-all
// Mark all notifications as read for the user
router.post('/read-all', requireAuth, async (req, res) => {
    try {
        const userId = req.user.email || req.user.id;
        let role = req.user.role;
        if (role === 'cgdc_admin') role = 'admin';

        await pool.query(`
            UPDATE NOTIFICATION SET is_read = 1 
            WHERE user_id = ? AND user_role = ?
        `, [userId, role]);

        res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] Mark All Read Error:', err);
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
});

// DELETE /api/notifications/clear-all
// Permanently delete all notifications for the user
router.delete('/clear-all', requireAuth, async (req, res) => {
    try {
        const userId = req.user.email || req.user.id;
        let role = req.user.role;
        if (role === 'cgdc_admin') role = 'admin';

        await pool.query(
            'DELETE FROM NOTIFICATION WHERE user_id = ? AND user_role = ?',
            [userId, role]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] Clear All Error:', err);
        res.status(500).json({ message: 'Error clearing notifications' });
    }
});

export default router;
