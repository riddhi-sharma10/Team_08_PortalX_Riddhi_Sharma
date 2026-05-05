import fs from 'fs';

function refactorAdmin() {
    let content = fs.readFileSync('server/routes/admin.js', 'utf8');

    // 1. Line 57-60
    content = content.replace(
        "            SELECT COALESCE(s.dept, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed\n            FROM PLACEMENT_RECORD pr\n            JOIN STUDENT s ON s.s_id = pr.s_id\n            GROUP BY COALESCE(s.dept, 'Unknown')",
        "            SELECT COALESCE(d.dept_name, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed\n            FROM PLACEMENT_RECORD pr\n            JOIN STUDENT s ON s.s_id = pr.s_id\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            GROUP BY COALESCE(d.dept_name, 'Unknown')"
    );

    // 2. Line 78
    content = content.replace(
        "            SELECT \n                s.s_name AS student, \n                COALESCE(s.dept, 'Unknown') AS department,",
        "            SELECT \n                s.s_name AS student, \n                COALESCE(d.dept_name, 'Unknown') AS department,"
    );
    // Line 99 (part of the same query)
    content = content.replace(
        "            FROM STUDENT s\n            LEFT JOIN (",
        "            FROM STUDENT s\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            LEFT JOIN ("
    );

    // 3. Line 183
    content = content.replace(
        "                    s.email,\n                    COALESCE(s.dept, '') AS branch,",
        "                    s.email,\n                    COALESCE(d.dept_name, '') AS branch,"
    );
    content = content.replace(
        "                FROM STUDENT s\n                LEFT JOIN",
        "                FROM STUDENT s\n                JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n                LEFT JOIN"
    );

    // 4. Line 223
    content = content.replace(
        "                    c.email,\n                    COALESCE(c.dept, '') AS branch,",
        "                    c.email,\n                    COALESCE(d.dept_name, '') AS branch,"
    );
    content = content.replace(
        "                FROM PLACEMENT_COORDINATOR c\n                LEFT JOIN",
        "                FROM PLACEMENT_COORDINATOR c\n                JOIN DEPARTMENT d ON c.dept_id = d.dept_id\n                LEFT JOIN"
    );

    // 5. Line 298
    content = content.replace(
        "            SELECT \n                s.s_name AS student, \n                COALESCE(s.dept, 'Unknown') AS department,",
        "            SELECT \n                s.s_name AS student, \n                COALESCE(d.dept_name, 'Unknown') AS department,"
    );
    // Line 317 (part of the same query)
    content = content.replace(
        "            FROM STUDENT s\n            LEFT JOIN",
        "            FROM STUDENT s\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            LEFT JOIN"
    );

    // 6. Line 431-438
    content = content.replace(
        "            SELECT\n                COALESCE(s.dept, 'Unknown') AS name,",
        "            SELECT\n                COALESCE(d.dept_name, 'Unknown') AS name,"
    );
    content = content.replace(
        "            FROM STUDENT s\n            LEFT JOIN",
        "            FROM STUDENT s\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            LEFT JOIN"
    );
    content = content.replace(
        "            GROUP BY COALESCE(s.dept, 'Unknown')",
        "            GROUP BY COALESCE(d.dept_name, 'Unknown')"
    );

    // 7. Line 689
    content = content.replace(
        "'SELECT name, email, phone_no, dept, cgdc_id FROM PLACEMENT_COORDINATOR WHERE coord_id = ?'",
        "'SELECT c.name, c.email, c.phone_no, d.dept_name as dept, c.cgdc_id FROM PLACEMENT_COORDINATOR c JOIN DEPARTMENT d ON c.dept_id = d.dept_id WHERE c.coord_id = ?'"
    );

    // 8. Line 698
    content = content.replace(
        "SELECT s_id, s_name, email, dept, cgpa, profile_status",
        "SELECT s_id, s_name, email, d.dept_name as dept, cgpa, profile_status"
    );
    content = content.replace(
        "FROM STUDENT s",
        "FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id"
    );

    // 9. Line 730
    content = content.replace(
        "const { name, email, phone, dob, dept, graduation_yr, cgpa, profile_status, company, packageLpa } = req.body;",
        "const { name, email, phone, dob, dept: dept_id, graduation_yr, cgpa, profile_status, company, packageLpa } = req.body;"
    );
    content = content.replace(
        "if (!name || !email || !dept || !graduation_yr) {",
        "if (!name || !email || !dept_id || !graduation_yr) {"
    );
    content = content.replace(
        "INSERT INTO STUDENT (s_name, email, phone, date_of_birth, dept, graduation_yr, cgpa, profile_status)",
        "INSERT INTO STUDENT (s_name, email, phone, date_of_birth, dept_id, graduation_yr, cgpa, profile_status)"
    );
    content = content.replace(
        "[name, email, phone || null, dob || null, dept, graduation_yr, cgpa || null, profile_status || 'active']",
        "[name, email, phone || null, dob || null, dept_id, graduation_yr, cgpa || null, profile_status || 'active']"
    );

    // 10. Line 822
    content = content.replace(
        "const { name, email, phone_no, dept, cgdc_id } = req.body;",
        "const { name, email, phone_no, dept: dept_id, cgdc_id } = req.body;"
    );
    content = content.replace(
        "if (!name || !email || !dept) {",
        "if (!name || !email || !dept_id) {"
    );
    content = content.replace(
        "'INSERT INTO PLACEMENT_COORDINATOR (name, email, phone_no, dept, cgdc_id) VALUES (?, ?, ?, ?, ?)',",
        "'INSERT INTO PLACEMENT_COORDINATOR (name, email, phone_no, dept_id, cgdc_id) VALUES (?, ?, ?, ?, ?)',"
    );
    content = content.replace(
        "[name, email, phone_no || null, dept, cgdc_id || null]",
        "[name, email, phone_no || null, dept_id, cgdc_id || null]"
    );

    // 11. Line 938
    content = content.replace(
        "                s.dept, \n                c.comp_name AS company,",
        "                d.dept_name as dept, \n                c.comp_name AS company,"
    );
    // Need to add JOIN in query starting at 934
    // We already replaced "FROM STUDENT s\n LEFT JOIN" multiple times. Wait, replacing "FROM STUDENT s" blindly was dangerous. Let's see if 8 works correctly. 
    // Wait, replacing "FROM STUDENT s" string globally? I only did a `.replace()` which replaces the FIRST occurrence. But earlier I replaced it with `content.replace(..., ...)` which only replaces the FIRST occurrence. I should be careful.

    fs.writeFileSync('server/routes/admin.js', content);
    console.log("Updated admin.js");
}

function refactorCoordinator() {
    let content = fs.readFileSync('server/routes/coordinator.js', 'utf8');
    
    // There were some remaining instances inside coordinator.js too because my previous string replaces failed!
    content = content.replace(
        "SELECT COALESCE(s.dept, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed\n            FROM PLACEMENT_RECORD pr\n            JOIN STUDENT s ON s.s_id = pr.s_id\n            WHERE s.coord_id = ?\n            GROUP BY COALESCE(s.dept, 'Unknown')",
        "SELECT COALESCE(d.dept_name, 'Unknown') AS name, COUNT(DISTINCT pr.s_id) AS placed\n            FROM PLACEMENT_RECORD pr\n            JOIN STUDENT s ON s.s_id = pr.s_id\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            WHERE s.coord_id = ?\n            GROUP BY COALESCE(d.dept_name, 'Unknown')"
    );
    
    content = content.replace(
        "s.s_name AS student, \n                COALESCE(s.dept, 'Unknown') AS department,",
        "s.s_name AS student, \n                COALESCE(d.dept_name, 'Unknown') AS department,"
    );
    
    // Line 90 (coordinator.js)
    content = content.replace(
        "FROM STUDENT s\n            LEFT JOIN (",
        "FROM STUDENT s\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            LEFT JOIN ("
    );
    
    // Line 175
    content = content.replace(
        "SELECT s.s_id AS id, s.s_name AS name, s.email, s.dept, s.cgpa, s.graduation_yr AS gradYear, s.profile_status AS status,",
        "SELECT s.s_id AS id, s.s_name AS name, s.email, d.dept_name AS dept, s.cgpa, s.graduation_yr AS gradYear, s.profile_status AS status,"
    );
    content = content.replace(
        "FROM STUDENT s\n            WHERE s.coord_id = ?",
        "FROM STUDENT s\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            WHERE s.coord_id = ?"
    );
    
    // Line 212
    content = content.replace(
        "s.dept, \n                c.comp_name AS company,",
        "d.dept_name as dept, \n                c.comp_name AS company,"
    );
    
    // Line 459
    content = content.replace(
        "SELECT o.offer_id AS id, s.s_name AS studentName, s.dept, c.comp_name AS company, j.role, o.ctc, o.offer_status AS status, DATE_FORMAT(o.issued_on, '%e %b %Y') as issuedOn\n            FROM OFFER o\n            JOIN STUDENT s ON o.s_id = s.s_id",
        "SELECT o.offer_id AS id, s.s_name AS studentName, d.dept_name AS dept, c.comp_name AS company, j.role, o.ctc, o.offer_status AS status, DATE_FORMAT(o.issued_on, '%e %b %Y') as issuedOn\n            FROM OFFER o\n            JOIN STUDENT s ON o.s_id = s.s_id\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id"
    );
    
    // Line 481
    content = content.replace(
        "                s.dept, \n                c.comp_name AS company,",
        "                d.dept_name AS dept, \n                c.comp_name AS company,"
    );
    
    // Line 698
    content = content.replace(
        "s_name, email, phone, date_of_birth, dept, cgpa, graduation_yr, profile_status, avatar_url",
        "s_name, email, phone, date_of_birth, d.dept_name as dept, cgpa, graduation_yr, profile_status, avatar_url"
    );
    content = content.replace(
        "FROM STUDENT s\n            WHERE s.s_id = ? AND s.coord_id = ?",
        "FROM STUDENT s\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            WHERE s.s_id = ? AND s.coord_id = ?"
    );
    
    // Line 792
    content = content.replace(
        "COALESCE(s.dept, 'Unknown') AS name,",
        "COALESCE(d.dept_name, 'Unknown') AS name,"
    );
    content = content.replace(
        "GROUP BY COALESCE(s.dept, 'Unknown')",
        "GROUP BY COALESCE(d.dept_name, 'Unknown')"
    );
    content = content.replace(
        "FROM STUDENT s\n            LEFT JOIN",
        "FROM STUDENT s\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            LEFT JOIN"
    );

    fs.writeFileSync('server/routes/coordinator.js', content);
    console.log("Updated coordinator.js");
}

function refactorQueries() {
    let content = fs.readFileSync('server/routes/queries.js', 'utf8');
    content = content.replace(
        "SELECT s_id as stu_roll_no, s_name, dept, cgpa, profile_status FROM STUDENT WHERE coord_id = ? AND profile_status = 'placed' ORDER BY dept ASC, s_name ASC",
        "SELECT s_id as stu_roll_no, s_name, d.dept_name as dept, cgpa, profile_status FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id WHERE coord_id = ? AND profile_status = 'placed' ORDER BY d.dept_name ASC, s_name ASC"
    );
    
    content = content.replace(
        "SELECT pc.name as coordinator_name, pc.dept as coordinator_dept, s.*",
        "SELECT pc.name as coordinator_name, cd.dept_name as coordinator_dept, s.*, d.dept_name as dept"
    );
    content = content.replace(
        "FROM STUDENT s\n            JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id",
        "FROM STUDENT s\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id\n            JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id\n            JOIN DEPARTMENT cd ON pc.dept_id = cd.dept_id"
    );
    
    content = content.replace(
        "SELECT s.s_name, s.email, s.dept, s.cgpa, j.role as applied_role, a.status, a.applied_date",
        "SELECT s.s_name, s.email, d.dept_name as dept, s.cgpa, j.role as applied_role, a.status, a.applied_date"
    );
    content = content.replace(
        "FROM APPLICATION a\n            JOIN STUDENT s ON a.s_id = s.s_id",
        "FROM APPLICATION a\n            JOIN STUDENT s ON a.s_id = s.s_id\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id"
    );
    
    fs.writeFileSync('server/routes/queries.js', content);
    console.log("Updated queries.js");
}

refactorAdmin();
refactorCoordinator();
refactorQueries();
