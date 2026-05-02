import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const token = jwt.sign(
    { id: 1, role: 'cgdc_admin', entityId: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

async function test() {
    try {
        const res = await axios.get('http://localhost:3001/api/admin/profile', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('STATUS:', res.status);
        console.log('DATA:', res.data);
    } catch (err) {
        console.log('ERROR STATUS:', err.response?.status);
        console.log('ERROR DATA:', err.response?.data);
        console.log('ERROR MESSAGE:', err.message);
    }
}

test();
