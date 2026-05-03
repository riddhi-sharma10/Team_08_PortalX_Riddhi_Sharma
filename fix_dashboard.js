import fs from 'fs';
const file = 'js/coordinator/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

// The file literally contains backslash followed by backtick
content = content.replace(/\\`/g, '`');
// And backslash followed by dollar sign
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(file, content);
console.log('Fixed js/coordinator/dashboard.js');
