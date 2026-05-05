import fs from 'fs';

function applyRegex(file) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace COALESCE(s.dept, ...) with d.dept_name
    content = content.replace(/COALESCE\(s\.dept,/g, "COALESCE(d.dept_name,");
    
    // For admin.js & coordinator.js: Add JOIN DEPARTMENT d ON s.dept_id = d.dept_id
    // to queries that use s.dept/d.dept_name but lack the JOIN.
    // Let's do some specific replaces instead of complex regexes.

    // admin.js specific:
    if (file.includes('admin.js')) {
        content = content.replace(/FROM STUDENT s(?!.*JOIN DEPARTMENT)/g, "FROM STUDENT s\n            JOIN DEPARTMENT d ON s.dept_id = d.dept_id");
        content = content.replace(/SELECT s\.s_name AS student, /g, "SELECT s.s_name AS student, ");
        
        // Fix inserts
        content = content.replace(/INSERT INTO STUDENT \([^)]+dept[^)]*\)/, "INSERT INTO STUDENT (s_name, email, phone, date_of_birth, dept_id, graduation_yr, cgpa, profile_status)");
        content = content.replace(/req\.body;\n(.*)if \(\!name \|\| \!email \|\| \!dept(.*?)\)/s, "req.body;\n$1if (!name || !email || !dept$2)");
        content = content.replace(/INSERT INTO PLACEMENT_COORDINATOR \([^)]+dept[^)]*\)/, "INSERT INTO PLACEMENT_COORDINATOR (name, email, phone_no, dept_id, cgdc_id)");
    }
    
    // Just manual replacements for the remaining exact strings found by grep:
    
    fs.writeFileSync(file, content);
}
// I will just use sed or proper JS replacements.
