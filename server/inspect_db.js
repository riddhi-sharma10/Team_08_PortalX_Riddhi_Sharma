import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

async function inspect() {
    console.log('\n========== TABLES ==========');
    const [tables] = await pool.query(`SHOW FULL TABLES`);
    tables.forEach(t => console.log(JSON.stringify(t)));

    console.log('\n========== VIEWS ==========');
    const [views] = await pool.query(`SHOW FULL TABLES WHERE Table_type = 'VIEW'`);
    views.forEach(v => console.log(JSON.stringify(v)));

    console.log('\n========== STORED PROCEDURES ==========');
    const [procs] = await pool.query(`SHOW PROCEDURE STATUS WHERE Db = ?`, [process.env.DB_NAME]);
    procs.forEach(p => console.log(`  ${p.Name}`));

    console.log('\n========== TRIGGERS ==========');
    const [triggers] = await pool.query(`SHOW TRIGGERS`);
    triggers.forEach(t => console.log(`  ${t.Trigger} ON ${t.Table} (${t.Event} ${t.Timing})`));

    console.log('\n========== INDEXES (all tables) ==========');
    const tableList = tables.filter(t => Object.values(t)[1] === 'BASE TABLE').map(t => Object.values(t)[0]);
    for (const tbl of tableList) {
        const [idxs] = await pool.query(`SHOW INDEX FROM \`${tbl}\``);
        const nonPrimary = idxs.filter(i => i.Key_name !== 'PRIMARY');
        if (nonPrimary.length > 0) {
            console.log(`  ${tbl}: ${nonPrimary.map(i => i.Key_name + '(' + i.Column_name + ')').join(', ')}`);
        }
    }

    console.log('\n========== TABLE SCHEMAS ==========');
    for (const tbl of tableList) {
        const [cols] = await pool.query(`DESCRIBE \`${tbl}\``);
        console.log(`\n-- ${tbl} --`);
        cols.forEach(c => console.log(`  ${c.Field} | ${c.Type} | NULL:${c.Null} | Key:${c.Key} | Default:${c.Default}`));
    }

    console.log('\n========== ROW COUNTS ==========');
    for (const tbl of tableList) {
        const [cnt] = await pool.query(`SELECT COUNT(*) AS c FROM \`${tbl}\``);
        console.log(`  ${tbl}: ${cnt[0].c} rows`);
    }

    await pool.end();
    console.log('\n========== DONE ==========');
}

inspect().catch(e => { console.error(e.message); process.exit(1); });
