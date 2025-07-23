/**
 * Script to fix sheetsClient references in projects.ts
 */

const fs = require('fs');
const path = require('path');

const projectsPath = path.join(__dirname, '../routes/projects.ts');

// Read the file
let content = fs.readFileSync(projectsPath, 'utf8');

// Replace all sheetsClient. with getSheetsClient().
content = content.replace(/sheetsClient\./g, 'getSheetsClient().');

// Write back to file
fs.writeFileSync(projectsPath, content, 'utf8');

console.log('✅ Fixed all sheetsClient references in projects.ts');