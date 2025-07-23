/**
 * Script to fix HTML entities in sort parameters
 */

const fs = require('fs');
const path = require('path');

const entitiesPath = path.join(__dirname, '../routes/entities.ts');

// Read the file
let content = fs.readFileSync(entitiesPath, 'utf8');

// Replace the sort parameter parsing to handle HTML entities
content = content.replace(
  /const decodedSort = decodeURIComponent\(sort\);\s*const sortParams = JSON\.parse\(decodedSort\);/g,
  `// Decode URL-encoded JSON and handle HTML entities
        let decodedSort = decodeURIComponent(sort);
        decodedSort = decodedSort.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const sortParams = JSON.parse(decodedSort);`
);

// Write back to file
fs.writeFileSync(entitiesPath, content, 'utf8');

console.log('✅ Fixed HTML entities in sort parameters');