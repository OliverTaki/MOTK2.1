/**
 * Script to fix sheetsClient references in pages.ts
 */

const fs = require('fs');
const path = require('path');

const pagesPath = path.join(__dirname, '../routes/pages.ts');

// Read the file
let content = fs.readFileSync(pagesPath, 'utf8');

// Replace all sheetsClient. with getSheetsClient().
content = content.replace(/sheetsClient\./g, 'getSheetsClient().');

// Write back to file
fs.writeFileSync(pagesPath, content, 'utf8');

console.log('✅ Fixed all sheetsClient references in pages.ts');