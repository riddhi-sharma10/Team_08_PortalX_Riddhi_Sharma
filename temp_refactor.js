import fs from 'fs';
import path from 'path';

function replaceInFile(filepath, replacements) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    if (content !== original) {
        fs.writeFileSync(filepath, content);
        console.log(`Updated ${path.basename(filepath)}`);
    }
}

// 1. coordinator.js
const coordReplacements = [
    [
        `            SELECT COALESCE(s.dept, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON s.s_id = pr.s_id
            WHERE s.coord_id = ?
            GROUP BY COALESCE(s.dept, 'Unknown')`,
        `            SELECT COALESCE(d.dept_name, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed
            FROM PLACEMENT_RECORD pr
            JOIN STUDENT s ON s.s_id = pr.s_id
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            WHERE s.coord_id = ?
            GROUP BY COALESCE(d.dept_name, 'Unknown')`
    ],
    [
        `                COALESCE(s.dept, 'Unknown') AS department,`,
        `                COALESCE(d.dept_name, 'Unknown') AS department,`
    ],
    [
        `            FROM STUDENT s
            LEFT JOIN (`,
        `            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            LEFT JOIN (`
    ],
    [
        `            SELECT s.s_id AS id, s.s_name AS name, s.email, s.dept, s.cgpa, s.graduation_yr AS gradYear, s.profile_status AS status,`,
        `            SELECT s.s_id AS id, s.s_name AS name, s.email, d.dept_name AS dept, s.cgpa, s.graduation_yr AS gradYear, s.profile_status AS status,`
    ],
    [
        `            FROM STUDENT s
            WHERE s.coord_id = ?`,
        `            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            WHERE s.coord_id = ?`
    ],
    [
        `            SELECT s_name, email, phone, date_of_birth, dept, cgpa, graduation_yr, profile_status, avatar_url
            FROM STUDENT s
            WHERE s.s_id = ? AND s.coord_id = ?`,
        `            SELECT s_name, email, phone, date_of_birth, d.dept_name as dept, cgpa, graduation_yr, profile_status, avatar_url
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            WHERE s.s_id = ? AND s.coord_id = ?`
    ],
    [
        `                        \`SELECT s.s_name, s.dept, j.role, c.comp_name
                         FROM STUDENT s\``,
        `                        \`SELECT s.s_name, d.dept_name as dept, j.role, c.comp_name
                         FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id\``
    ],
    [
        `            SELECT o.offer_id AS id, s.s_name AS studentName, s.dept, c.comp_name AS company, j.role, o.ctc, o.offer_status AS status, DATE_FORMAT(o.issued_on, '%e %b %Y') as issuedOn
            FROM OFFER o
            JOIN STUDENT s ON o.s_id = s.s_id`,
        `            SELECT o.offer_id AS id, s.s_name AS studentName, d.dept_name AS dept, c.comp_name AS company, j.role, o.ctc, o.offer_status AS status, DATE_FORMAT(o.issued_on, '%e %b %Y') as issuedOn
            FROM OFFER o
            JOIN STUDENT s ON o.s_id = s.s_id
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id`
    ],
    [
        `            'SELECT name, email, phone_no, dept, avatar_url FROM PLACEMENT_COORDINATOR WHERE coord_id = ?',`,
        `            'SELECT c.name, c.email, c.phone_no, d.dept_name as dept, c.avatar_url FROM PLACEMENT_COORDINATOR c JOIN DEPARTMENT d ON c.dept_id = d.dept_id WHERE coord_id = ?',`
    ],
    [
        `                COALESCE(s.dept, 'Unknown') AS name,`,
        `                COALESCE(d.dept_name, 'Unknown') AS name,`
    ],
    [
        `            FROM STUDENT s
            WHERE s.coord_id = ? AND s.profile_status IN ('active', 'placed')
            GROUP BY COALESCE(s.dept, 'Unknown')`,
        `            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id
            WHERE s.coord_id = ? AND s.profile_status IN ('active', 'placed')
            GROUP BY COALESCE(d.dept_name, 'Unknown')`
    ]
];

// admin.js replacements
const adminReplacements = [
    [
        `        const [rows] = await pool.query('SELECT coord_id as id, name, email, phone_no as phone, dept FROM PLACEMENT_COORDINATOR');`,
        `        const [rows] = await pool.query('SELECT coord_id as id, name, email, phone_no as phone, d.dept_name as dept FROM PLACEMENT_COORDINATOR c JOIN DEPARTMENT d ON c.dept_id = d.dept_id');`
    ],
    [
        `        // Build insert queries based on role
        if (role === 'Student') {
            const { name, email, phone, dob, dept, graduation_yr, cgpa, profile_status, company, packageLpa } = req.body;`,
        `        // Build insert queries based on role
        if (role === 'Student') {
            const { name, email, phone, dob, dept: dept_id, graduation_yr, cgpa, profile_status, company, packageLpa } = req.body;`
    ],
    [
        `                await conn.query(\`
                    INSERT INTO STUDENT (s_name, email, phone, date_of_birth, dept, graduation_yr, cgpa, profile_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`,
                    [name, email, phone || null, dob || null, dept, graduation_yr, cgpa || null, profile_status || 'active']
                );`,
        `                await conn.query(\`
                    INSERT INTO STUDENT (s_name, email, phone, date_of_birth, dept_id, graduation_yr, cgpa, profile_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`,
                    [name, email, phone || null, dob || null, dept_id, graduation_yr, cgpa || null, profile_status || 'active']
                );`
    ],
    [
        `        } else if (role === 'Coordinator') {
            const { name, email, phone_no, dept, cgdc_id } = req.body;`,
        `        } else if (role === 'Coordinator') {
            const { name, email, phone_no, dept: dept_id, cgdc_id } = req.body;`
    ],
    [
        `                const [res] = await conn.query(
                    'INSERT INTO PLACEMENT_COORDINATOR (name, email, phone_no, dept, cgdc_id) VALUES (?, ?, ?, ?, ?)',
                    [name, email, phone_no || null, dept, cgdc_id || null]
                );`,
        `                const [res] = await conn.query(
                    'INSERT INTO PLACEMENT_COORDINATOR (name, email, phone_no, dept_id, cgdc_id) VALUES (?, ?, ?, ?, ?)',
                    [name, email, phone_no || null, dept_id, cgdc_id || null]
                );`
    ],
    [
        `            SELECT c.coord_id as id, c.name, c.email, c.phone_no as phone, c.dept, c.cgdc_id, ca.name as reporting_admin
            FROM PLACEMENT_COORDINATOR c
            LEFT JOIN CGDC_ADMIN ca ON c.cgdc_id = ca.cgdc_id`,
        `            SELECT c.coord_id as id, c.name, c.email, c.phone_no as phone, d.dept_name as dept, c.cgdc_id, ca.name as reporting_admin
            FROM PLACEMENT_COORDINATOR c
            JOIN DEPARTMENT d ON c.dept_id = d.dept_id
            LEFT JOIN CGDC_ADMIN ca ON c.cgdc_id = ca.cgdc_id`
    ],
    [
        `            SELECT s_id as id, s_name as name, email, phone, date_of_birth, dept, cgpa, graduation_yr, profile_status, coord_id, avatar_url
            FROM STUDENT`,
        `            SELECT s_id as id, s_name as name, email, phone, date_of_birth, d.dept_name as dept, cgpa, graduation_yr, profile_status, coord_id, avatar_url
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id`
    ],
    [
        `            SELECT s_id as id, s_name as name, email, dept as branch, 'Student' as role, profile_status as status, NULL as permission, 'STU-' as entityId
            FROM STUDENT`,
        `            SELECT s_id as id, s_name as name, email, d.dept_name as branch, 'Student' as role, profile_status as status, NULL as permission, 'STU-' as entityId
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.dept_id = d.dept_id`
    ],
    [
        `            SELECT coord_id as id, name, email, dept as branch, 'Coordinator' as role, 'active' as status, NULL as permission, 'CRD-' as entityId
            FROM PLACEMENT_COORDINATOR`,
        `            SELECT coord_id as id, name, email, d.dept_name as branch, 'Coordinator' as role, 'active' as status, NULL as permission, 'CRD-' as entityId
            FROM PLACEMENT_COORDINATOR c
            JOIN DEPARTMENT d ON c.dept_id = d.dept_id`
    ]
];

// applications.js
const appReplacements = [
    [
        `        const [studentDetails] = await conn.query("SELECT dept, graduation_yr FROM STUDENT WHERE s_id = ?", [student_id]);
        const dept = studentDetails[0]?.dept || 'Unknown';`,
        `        const [studentDetails] = await conn.query("SELECT d.dept_name as dept, s.graduation_yr FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id WHERE s.s_id = ?", [student_id]);
        const dept = studentDetails[0]?.dept || 'Unknown';`
    ],
    [
        `                \`SELECT s.s_name, s.dept, j.role, c.comp_name, j.package
                 FROM STUDENT s`,
        `                \`SELECT s.s_name, d.dept_name as dept, j.role, c.comp_name, j.package
                 FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id`
    ]
];


replaceInFile('./server/routes/coordinator.js', coordReplacements);
replaceInFile('./server/routes/admin.js', adminReplacements);
replaceInFile('./server/routes/applications.js', appReplacements);
