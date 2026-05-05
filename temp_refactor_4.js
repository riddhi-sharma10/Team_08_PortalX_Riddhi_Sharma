import fs from 'fs';

function fixFile(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (let [regex, replace] of replacements) {
        content = content.replace(regex, replace);
    }
    fs.writeFileSync(file, content);
}

// Admin
fixFile('server/routes/admin.js', [
    [/COALESCE\(s\.dept/g, "COALESCE(d.dept_name"],
    [/COALESCE\(c\.dept/g, "COALESCE(d.dept_name"],
    [/s\.dept,/g, "d.dept_name AS dept,"],
    [/c\.dept,/g, "d.dept_name AS dept,"],
    [/FROM STUDENT s\s+GROUP BY/g, "FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id GROUP BY"],
    [/FROM STUDENT s\s+LEFT JOIN/g, "FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id LEFT JOIN"],
    [/FROM PLACEMENT_COORDINATOR c\s+LEFT JOIN/g, "FROM PLACEMENT_COORDINATOR c JOIN DEPARTMENT d ON c.dept_id = d.dept_id LEFT JOIN"],
]);

// Coordinator
fixFile('server/routes/coordinator.js', [
    [/COALESCE\(s\.dept/g, "COALESCE(d.dept_name"],
    [/COALESCE\(c\.dept/g, "COALESCE(d.dept_name"],
    [/s\.dept,/g, "d.dept_name AS dept,"],
    [/c\.dept,/g, "d.dept_name AS dept,"],
    [/department: c\.dept/g, "department: c.dept_name"], // Actually c.dept_name from the join
    [/dept: s\.dept/g, "dept: d.dept_name"],
    [/FROM STUDENT s\s+WHERE/g, "FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id WHERE"],
    [/FROM STUDENT s\s+LEFT JOIN/g, "FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id LEFT JOIN"],
    [/FROM PLACEMENT_RECORD pr\s+JOIN STUDENT s ON s\.s_id = pr\.s_id\s+GROUP BY/g, "FROM PLACEMENT_RECORD pr JOIN STUDENT s ON s.s_id = pr.s_id JOIN DEPARTMENT d ON s.dept_id = d.dept_id GROUP BY"],
    [/FROM PLACEMENT_RECORD pr\s+JOIN STUDENT s ON s\.s_id = pr\.s_id\s+WHERE/g, "FROM PLACEMENT_RECORD pr JOIN STUDENT s ON s.s_id = pr.s_id JOIN DEPARTMENT d ON s.dept_id = d.dept_id WHERE"],
    [/FROM OFFER o\s+JOIN STUDENT s ON o\.s_id = s\.s_id/g, "FROM OFFER o JOIN STUDENT s ON o.s_id = s.s_id JOIN DEPARTMENT d ON s.dept_id = d.dept_id"],
]);

// Applications
fixFile('server/routes/applications.js', [
    [/SELECT s\.s_name, s\.dept,/g, "SELECT s.s_name, d.dept_name AS dept,"],
    [/FROM STUDENT s\s+WHERE/g, "FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id WHERE"],
    [/FROM STUDENT s\s+JOIN JOB_PROFILE/g, "FROM STUDENT s JOIN DEPARTMENT d ON s.dept_id = d.dept_id JOIN JOB_PROFILE"]
]);

// Queries
fixFile('server/routes/queries.js', [
    [/pc\.dept/g, "cd.dept_name AS dept"],
]);
