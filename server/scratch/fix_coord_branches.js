import pool from '../db.js';

async function fixBranches() {
    console.log('--- Starting Branch Name Harmonization ---');
    
    const updateQuery = `
        UPDATE PLACEMENT_COORDINATOR 
        SET dept = CASE 
            WHEN dept = 'Information Technology' THEN 'IT'
            WHEN dept = 'Civil Engineering' THEN 'Civil'
            WHEN dept = 'Electronics and Communication' THEN 'Electronics'
            WHEN dept = 'Mechanical Engineering' THEN 'Mechanical'
            ELSE dept 
        END
        WHERE dept IN (
            'Information Technology', 
            'Civil Engineering', 
            'Electronics and Communication', 
            'Mechanical Engineering'
        )
    `;

    try {
        const [result] = await pool.query(updateQuery);
        console.log(`✅ Success! Updated ${result.affectedRows} coordinator records.`);
        
        // Verify
        const [rows] = await pool.query('SELECT DISTINCT dept FROM PLACEMENT_COORDINATOR');
        console.log('Updated distinct departments:', rows.map(r => r.dept));
        
    } catch (err) {
        console.error('❌ Error updating branches:', err);
    } finally {
        process.exit();
    }
}

fixBranches();
