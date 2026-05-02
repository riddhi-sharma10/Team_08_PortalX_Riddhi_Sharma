async function testAnalytics() {
    try {
        const response = await fetch('http://localhost:3001/api/admin/analytics');
        const data = await response.json();
        console.log("Analytics data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}
testAnalytics();
