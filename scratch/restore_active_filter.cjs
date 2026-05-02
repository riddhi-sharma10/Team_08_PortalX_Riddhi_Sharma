const fs = require('fs');
const path = 'server/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

// Restore the active-only filter
const target = 'LEFT JOIN PLACEMENT_COORDINATOR pc ON s.coord_id = pc.coord_id';
const replacement = target + "\n            WHERE LOWER(s.profile_status) = 'active'";
content = content.replace(target, replacement);

fs.writeFileSync(path, content);
console.log('Restored active-only filter for assignments');
