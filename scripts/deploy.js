#!/usr/bin/env node

/**
 * Deployment script for MOTK system
 * Supports multiple free hosting platforms
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Supported platforms
const PLATFORMS = {
  vercel: 'Vercel',
  railway: 'Railway',
  render: 'Render',
  heroku: 'Heroku'
};

// Get command line arguments
const args = process.argv.slice(2);
const platform = args[0];
const environment = args[1] || 'production';

if (!platform || !PLATFORMS[platform]) {
  console.error('Usage: node scripts/deploy.js <platform> [environment]');
  console.error('Supported platforms:', Object.keys(PLATFORMS).join(', '));
  process.exit(1);
}

console.log(`🚀 Deploying MOTK system to ${PLATFORMS[platform]} (${environment})`);

/**
 * Check if required files exist
 */
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'api/server.ts',
    'frontend/package.json'
  ];

  const platformFiles = {
    vercel: ['vercel.json'],
    railway: ['railway.json'],
    render: ['render.yaml'],
    heroku: ['Procfile']
  };

  const allRequired = [...requiredFiles, ...(platformFiles[platform] || [])];
  
  for (const file of allRequired) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Required file missing: ${file}`);
      process.exit(1);
    }
  }
  
  console.log('✅ All required files present');
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_PROJECT_ID',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:');
    missingVars.forEach(varName => console.warn(`   - ${varName}`));
    console.warn('   Make sure to set these in your deployment platform');
  } else {
    console.log('✅ All required environment variables present');
  }
}

/**
 * Build the project
 */
function buildProject() {
  console.log('🔨 Building project...');
  
  try {
    // Install dependencies
    console.log('   Installing root dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    // Build API
    console.log('   Building API...');
    execSync('npm run build:api', { stdio: 'inherit' });
    
    // Install frontend dependencies
    console.log('   Installing frontend dependencies...');
    execSync('cd frontend && npm install', { stdio: 'inherit' });
    
    // Build frontend
    console.log('   Building frontend...');
    execSync('cd frontend && npm run build', { stdio: 'inherit' });
    
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Deploy to specific platform
 */
function deployToPlatform() {
  console.log(`🚀 Deploying to ${PLATFORMS[platform]}...`);
  
  try {
    switch (platform) {
      case 'vercel':
        deployToVercel();
        break;
      case 'railway':
        deployToRailway();
        break;
      case 'render':
        deployToRender();
        break;
      case 'heroku':
        deployToHeroku();
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

/**
 * Deploy to Vercel
 */
function deployToVercel() {
  // Check if Vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('Installing Vercel CLI...');
    execSync('npm install -g vercel', { stdio: 'inherit' });
  }
  
  // Deploy
  const deployCmd = environment === 'production' ? 'vercel --prod' : 'vercel';
  execSync(deployCmd, { stdio: 'inherit' });
  
  console.log('✅ Deployed to Vercel successfully');
}

/**
 * Deploy to Railway
 */
function deployToRailway() {
  // Check if Railway CLI is installed
  try {
    execSync('railway --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('Installing Railway CLI...');
    execSync('npm install -g @railway/cli', { stdio: 'inherit' });
  }
  
  // Deploy
  execSync(`railway up --environment ${environment}`, { stdio: 'inherit' });
  
  console.log('✅ Deployed to Railway successfully');
}

/**
 * Deploy to Render
 */
function deployToRender() {
  console.log('For Render deployment:');
  console.log('1. Connect your GitHub repository to Render');
  console.log('2. Use the render.yaml configuration file');
  console.log('3. Set environment variables in Render dashboard');
  console.log('4. Deploy will happen automatically on git push');
  
  // Create deployment info file
  const deployInfo = {
    platform: 'render',
    environment,
    timestamp: new Date().toISOString(),
    configFile: 'render.yaml'
  };
  
  fs.writeFileSync('deployment-info.json', JSON.stringify(deployInfo, null, 2));
  console.log('✅ Deployment info saved to deployment-info.json');
}

/**
 * Deploy to Heroku
 */
function deployToHeroku() {
  // Check if Heroku CLI is installed
  try {
    execSync('heroku --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('Heroku CLI not found. Please install it first.');
    console.error('Visit: https://devcenter.heroku.com/articles/heroku-cli');
    process.exit(1);
  }
  
  // Create Procfile if it doesn't exist
  if (!fs.existsSync('Procfile')) {
    fs.writeFileSync('Procfile', 'web: npm run start:api\n');
    console.log('Created Procfile');
  }
  
  // Deploy
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Deploy to Heroku" || true', { stdio: 'inherit' });
  execSync('git push heroku main', { stdio: 'inherit' });
  
  console.log('✅ Deployed to Heroku successfully');
}

/**
 * Post-deployment tasks
 */
function postDeployment() {
  console.log('🔧 Running post-deployment tasks...');
  
  // Create deployment summary
  const summary = {
    platform: PLATFORMS[platform],
    environment,
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    buildInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
  
  fs.writeFileSync('deployment-summary.json', JSON.stringify(summary, null, 2));
  
  console.log('✅ Post-deployment tasks completed');
  console.log('📄 Deployment summary saved to deployment-summary.json');
}

/**
 * Main deployment process
 */
function main() {
  try {
    checkRequiredFiles();
    checkEnvironmentVariables();
    buildProject();
    deployToPlatform();
    postDeployment();
    
    console.log('🎉 Deployment completed successfully!');
    console.log(`   Platform: ${PLATFORMS[platform]}`);
    console.log(`   Environment: ${environment}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
main();