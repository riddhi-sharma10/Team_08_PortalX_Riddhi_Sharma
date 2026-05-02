// server/routes/auth.js — UPDATED WITH HASHING SUPPORT
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// Demo credentials (fallback when DB is unavailable)
const DEMO_USERS = {
    'student_1': { password: 'student@2024', role: 'student', name: 'John Doe', id: 1, entityId: 1 },
    'coordinator_1': { password: 'coord@2024', role: 'coordinator', name: 'Dr. Smith', id: 2, entityId: 1 },
    'admin_1': { password: 'admin@2024', role: 'cgdc_admin', name: 'Admin Panel', id: 3, entityId: 1 }
};

router.post('/login', async (req, res) => {
    const { username, password } = req.body; 
    console.log(`Login attempt for: ${username}`);

    try {
        // Try database first
        let user = null;
        try {
            const [users] = await pool.query(
                'SELECT * FROM USER_ROLE WHERE username = ?', 
                [username]
            );
            if (users.length > 0) user = users[0];
        } catch (dbErr) {
            console.log(`Database unavailable, trying demo: ${dbErr.message}`);
        }

        // Fallback to demo if DB fails
        if (!user && DEMO_USERS[username]) {
            const demoUser = DEMO_USERS[username];
            if (demoUser.password === password) {
                const token = jwt.sign(
                    { id: demoUser.id, role: demoUser.role, entityId: demoUser.entityId },
                    process.env.JWT_SECRET || 'fallback_key',
                    { expiresIn: '24h' }
                );
                console.log(`✅ Demo login: ${username}`);
                return res.json({
                    token,
                    user: { id: demoUser.id, name: demoUser.name, role: demoUser.role, entityId: demoUser.entityId }
                });
            }
        }

        if (!user) {
            console.log(`User not found: ${username}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
        
        console.log(`DB Hash: ${user.password_hash}`);
        console.log(`In Hash: ${hashedInput}`);
        if (user.password_hash !== hashedInput && user.password_hash !== password) {
             // Fallback to literal comparison just in case some are plain text
             return res.status(401).json({ message: 'Invalid credentials' });
        }
        let displayName = user.username;
        try {
            if (user.role === 'student' && user.entity_id) {
                const [details] = await pool.query('SELECT s_name, avatar_url FROM STUDENT WHERE s_id = ?', [user.entity_id]);
                if (details.length > 0) {
                    displayName = details[0].s_name;
                    user.avatar_url = details[0].avatar_url;
                }
            } else if (user.role === 'coordinator' && user.entity_id) {
                const [details] = await pool.query('SELECT name, avatar_url FROM PLACEMENT_COORDINATOR WHERE coord_id = ?', [user.entity_id]);
                if (details.length > 0) {
                    displayName = details[0].name;
                    user.avatar_url = details[0].avatar_url;
                }
            } else if (user.role === 'admin' && user.entity_id) {
                const [details] = await pool.query('SELECT name, avatar_url FROM CGDC_ADMIN WHERE cgdc_id = ?', [user.entity_id]);
                if (details.length > 0) {
                    displayName = details[0].name;
                    user.avatar_url = details[0].avatar_url;
                }
            }
        } catch (e) {}
        const token = jwt.sign(
            { id: user.user_id, role: user.role, entityId: user.entity_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.user_id,
                name: displayName,
                role: user.role,
                entityId: user.entity_id,
                avatar_url: user.avatar_url
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

export default router;
