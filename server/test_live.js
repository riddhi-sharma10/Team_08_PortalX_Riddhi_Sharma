import jwt from 'jsonwebtoken';

async function testLive() {
    try {
        const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'mysecretkey123', { expiresIn: '1h' });
        
        console.log("Fetching year=2026...");
        const res = await fetch('http://localhost:3001/api/admin/records?year=2026', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        console.log("Status code:", res.status);
        console.log("Rows returned:", data?.rows?.length);
        if (data?.rows?.length > 0) {
            console.log("Sample row:", data.rows[0]);
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
testLive();
