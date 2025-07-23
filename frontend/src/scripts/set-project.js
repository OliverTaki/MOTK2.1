/**
 * Script to manually set the project in localStorage
 * 
 * Usage:
 * 1. Open the browser console on the frontend
 * 2. Copy and paste this script
 * 3. Run setProject('Oliver05') or whatever project ID you want to set
 */

function setProject(projectId) {
  try {
    localStorage.setItem('selectedProjectId', projectId);
    localStorage.setItem('lastProjectSelection', new Date().toISOString());
    console.log(`✅ Project set to '${projectId}' in localStorage`);
    console.log('🔄 Refresh the page to load the project');
  } catch (error) {
    console.error('❌ Error setting project:', error);
  }
}

// Example usage:
// setProject('Oliver05');