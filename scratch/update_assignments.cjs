const fs = require('fs');
const path = 'server/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("WHERE LOWER(s.profile_status) = 'active'", "WHERE LOWER(s.profile_status) IN ('active', 'placed')");
fs.writeFileSync(path, content);
console.log('Update successful');
