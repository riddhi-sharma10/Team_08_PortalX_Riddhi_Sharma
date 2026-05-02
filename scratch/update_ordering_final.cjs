const fs = require('fs');
const path = 'server/routes/admin.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Update /users Student query
content = content.replace(
    "AND best_pr.record_id IS NULL\n            `;", 
    "AND best_pr.record_id IS NULL\n                ORDER BY s.s_id DESC\n            `;"
);

// 2. Update /users Coordinator query
content = content.replace(
    "u.role = 'coordinator'\n            `;", 
    "u.role = 'coordinator'\n                ORDER BY c.coord_id DESC\n            `;"
);

// 3. Update /users Admin query
content = content.replace(
    "WHERE u.role IN ('admin', 'cgdc_admin')\n            `;", 
    "WHERE u.role IN ('admin', 'cgdc_admin')\n                ORDER BY u.user_id DESC\n            `;"
);

// 4. Update /companies query
content = content.replace("ORDER BY c.comp_name ASC", "ORDER BY c.comp_id DESC");

fs.writeFileSync(path, content);
console.log('Successfully updated all list ordering to show recently added records at the top');
