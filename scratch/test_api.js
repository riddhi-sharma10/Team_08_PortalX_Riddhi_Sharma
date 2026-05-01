import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign(
    { id: 1, role: 'cgdc_admin', entityId: 1 },
    process.env.JWT_SECRET || 'secret', // I should check what secret it uses
    { expiresIn: '24h' }
);
console.log("Token:", token);

fetch("http://localhost:3001/api/admin/dashboard", {
    headers: {
        'Authorization': 'Bearer ' + token
    }
}).then(async res => {
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));
    const text = await res.text();
    console.log("Response:", text);
}).catch(console.error);
