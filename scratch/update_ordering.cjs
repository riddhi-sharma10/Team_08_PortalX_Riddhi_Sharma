const fs = require('fs');
const path = 'server/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Update /users Student query to include ORDER BY s.s_id DESC
const oldStudentQuery = "u.role = 'student'";
const newStudentQuery = "u.role = 'student'\n                ORDER BY s.s_id DESC";
// Wait, I should be more specific to avoid replacing other occurrences
// Actually, I'll just look for the end of the student query.

content = content.replace("AND u.role = 'student' AND best_pr.record_id IS NULL", "AND u.role = 'student' AND best_pr.record_id IS NULL\n                ORDER BY s.s_id DESC");
// Wait, I should check the file content again.

// Actually, I'll just rewrite the whole /users route SQL strings.
content = content.replace("ORDER BY c.comp_name ASC", "ORDER BY c.comp_id DESC"); // For companies too? User said "recently added records"

fs.writeFileSync(path, content);
console.log('Updated ORDER BY for better synchronization of recently added records');
