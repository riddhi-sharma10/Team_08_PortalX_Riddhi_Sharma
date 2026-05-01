import jwt from 'jsonwebtoken';

async function testLive() {
    try {
        const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'mysecretkey123', { expiresIn: '1h' });
        
        console.log("Fetching year=2025...");
        const res = await fetch('http://localhost:3001/api/admin/records?year=2025', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        console.log("Status code:", res.status);
        console.log("Rows returned:", data?.rows?.length);
        
        const placed = (data?.rows || []).filter(r => String(r.status).toLowerCase() === 'placed');
        console.log("Placed returned:", placed.length);

        console.log("\nFetching year=all...");
        const resAll = await fetch('http://localhost:3001/api/admin/records?year=all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataAll = await resAll.json();
        console.log("All rows returned:", dataAll?.rows?.length);
        const placedAll = (dataAll?.rows || []).filter(r => String(r.status).toLowerCase() === 'placed');
        console.log("All Placed returned:", placedAll.length);
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
testLive();
