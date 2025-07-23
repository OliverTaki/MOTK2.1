/**
 * Script to fix URL-encoded sort parameters in entities.ts
 */

const fs = require('fs');
const path = require('path');

const entitiesPath = path.join(__dirname, '../routes/entities.ts');

// Read the file
let content = fs.readFileSync(entitiesPath, 'utf8');

// Replace the sort parameter parsing
content = content.replace(
  /const sortParams = JSON\.parse\(sort\);/g,
  'const decodedSort = decodeURIComponent(sort);\n        const sortParams = JSON.parse(decodedSort);'
);

// Write back to file
fs.writeFileSync(entitiesPath, content, 'utf8');

console.log('✅ Fixed URL-encoded sort parameters in entities.ts');