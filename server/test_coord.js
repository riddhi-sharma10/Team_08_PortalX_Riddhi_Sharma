import pool from './db.js';

async function test() {
    try {
        const [tables] = await pool.query("SHOW TABLES");
        console.log("Tables:", tables);
        
        let coordTable = null;
        for (const t of tables) {
            const name = Object.values(t)[0].toUpperCase();
            if (name.includes('COORD')) coordTable = Object.values(t)[0];
        }

        if (coordTable) {
            const [desc] = await pool.query(`DESCRIBE ${coordTable}`);
            console.log("Desc:", desc);
        } else {
            console.log("Coordinator table not found");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
