#!/usr/bin/env node

/**
 * Development startup script for MOTK system
 * This script helps you get both frontend and backend running with proper checks
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting MOTK Development Environment...\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if Node.js version is compatible
function checkNodeVersion() {
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    log('❌ Node.js version 18 or higher is required', 'red');
    log(`   Current version: ${version}`, 'yellow');
    log('   Please upgrade Node.js: https://nodejs.org/', 'cyan');
    process.exit(1);
  }
  
  log(`✅ Node.js version: ${version}`, 'green');
}

// Check if required directories exist
function checkDirectories() {
  const requiredDirs = ['api', 'frontend', 'shared'];
  const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));
  
  if (missingDirs.length > 0) {
    log('❌ Missing required directories:', 'red');
    missingDirs.forEach(dir => log(`   - ${dir}`, 'yellow'));
    process.exit(1);
  }
  
  log('✅ All required directories present', 'green');
}

// Check if package.json files exist
function checkPackageFiles() {
  const packageFiles = [
    'package.json',
    'api/package.json',
    'frontend/package.json'
  ];
  
  const missingFiles = packageFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    log('❌ Missing package.json files:', 'red');
    missingFiles.forEach(file => log(`   - ${file}`, 'yellow'));
    process.exit(1);
  }
  
  log('✅ All package.json files present', 'green');
}

// Check if ports are available
function checkPorts() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    // Check port 3000 (frontend)
    exec('netstat -an | grep :3000', (error, stdout) => {
      if (stdout && stdout.includes('LISTEN')) {
        log('⚠️  Port 3000 is already in use', 'yellow');
        log('   Frontend might already be running or another service is using this port', 'yellow');
      }
      
      // Check port 3001 (backend)
      exec('netstat -an | grep :3001', (error, stdout) => {
        if (stdout && stdout.includes('LISTEN')) {
          log('⚠️  Port 3001 is already in use', 'yellow');
          log('   Backend might already be running or another service is using this port', 'yellow');
        }
        
        resolve();
      });
    });
  });
}

// Install dependencies if needed
function installDependencies() {
  return new Promise((resolve, reject) => {
    log('📦 Checking dependencies...', 'blue');
    
    // Check if node_modules exist
    const needsInstall = [
      { dir: '.', name: 'root' },
      { dir: 'api', name: 'API' },
      { dir: 'frontend', name: 'frontend' }
    ].filter(item => !fs.existsSync(path.join(item.dir, 'node_modules')));
    
    if (needsInstall.length === 0) {
      log('✅ All dependencies already installed', 'green');
      resolve();
      return;
    }
    
    log(`📦 Installing dependencies for: ${needsInstall.map(item => item.name).join(', ')}`, 'yellow');
    
    // Install root dependencies first
    if (needsInstall.some(item => item.dir === '.')) {
      log('   Installing root dependencies...', 'cyan');
      const rootInstall = spawn('npm', ['install'], { stdio: 'inherit' });
      
      rootInstall.on('close', (code) => {
        if (code !== 0) {
          log('❌ Failed to install root dependencies', 'red');
          reject(new Error('Root dependency installation failed'));
          return;
        }
        
        // Install API dependencies
        if (needsInstall.some(item => item.dir === 'api')) {
          log('   Installing API dependencies...', 'cyan');
          const apiInstall = spawn('npm', ['install'], { cwd: 'api', stdio: 'inherit' });
          
          apiInstall.on('close', (code) => {
            if (code !== 0) {
              log('❌ Failed to install API dependencies', 'red');
              reject(new Error('API dependency installation failed'));
              return;
            }
            
            // Install frontend dependencies
            if (needsInstall.some(item => item.dir === 'frontend')) {
              log('   Installing frontend dependencies...', 'cyan');
              const frontendInstall = spawn('npm', ['install'], { cwd: 'frontend', stdio: 'inherit' });
              
              frontendInstall.on('close', (code) => {
                if (code !== 0) {
                  log('❌ Failed to install frontend dependencies', 'red');
                  reject(new Error('Frontend dependency installation failed'));
                  return;
                }
                
                log('✅ All dependencies installed successfully', 'green');
                resolve();
              });
            } else {
              log('✅ All dependencies installed successfully', 'green');
              resolve();
            }
          });
        } else if (needsInstall.some(item => item.dir === 'frontend')) {
          // Only frontend needs installation
          log('   Installing frontend dependencies...', 'cyan');
          const frontendInstall = spawn('npm', ['install'], { cwd: 'frontend', stdio: 'inherit' });
          
          frontendInstall.on('close', (code) => {
            if (code !== 0) {
              log('❌ Failed to install frontend dependencies', 'red');
              reject(new Error('Frontend dependency installation failed'));
              return;
            }
            
            log('✅ All dependencies installed successfully', 'green');
            resolve();
          });
        } else {
          log('✅ All dependencies installed successfully', 'green');
          resolve();
        }
      });
    } else {
      // Skip root, install others
      resolve();
    }
  });
}

// Check environment configuration
function checkEnvironment() {
  log('🔧 Checking environment configuration...', 'blue');
  
  const envFile = path.join('api', '.env');
  const envExampleFile = path.join('api', '.env.example');
  
  if (!fs.existsSync(envFile)) {
    log('⚠️  No .env file found in api directory', 'yellow');
    
    if (fs.existsSync(envExampleFile)) {
      log('   Found .env.example file - you can copy it to .env and configure', 'cyan');
    } else {
      log('   Creating basic .env file...', 'cyan');
      const basicEnv = `# MOTK Development Environment
NODE_ENV=development
PORT=3001
JWT_SECRET=development-secret-change-in-production

# Google OAuth (required for authentication)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Google Service Account (required for Sheets/Drive access)
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY="your_private_key_here"
GOOGLE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com

# Storage Configuration
ORIGINALS_ROOT_URL=https://drive.google.com/drive/folders/your_originals_folder_id
PROXIES_ROOT_URL=https://drive.google.com/drive/folders/your_proxies_folder_id

# Optional
REDIS_URL=redis://localhost:6379
`;
      
      fs.writeFileSync(envFile, basicEnv);
      log('   Created basic .env file - please configure with your Google credentials', 'green');
    }
    
    log('', 'reset');
    log('🔑 IMPORTANT: Configure your Google credentials in api/.env', 'yellow');
    log('   1. Go to https://console.cloud.google.com/', 'cyan');
    log('   2. Create OAuth 2.0 credentials for authentication', 'cyan');
    log('   3. Create Service Account for Sheets/Drive access', 'cyan');
    log('   4. Update the .env file with your credentials', 'cyan');
    log('', 'reset');
  } else {
    log('✅ Environment file found', 'green');
  }
}

// Start the backend server
function startBackend() {
  return new Promise((resolve) => {
    log('🔧 Starting backend server...', 'blue');
    
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: 'api',
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let backendReady = false;
    
    backend.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`[API] ${output}`);
      
      if (output.includes('running on port') || output.includes('server started')) {
        if (!backendReady) {
          backendReady = true;
          log('✅ Backend server started successfully', 'green');
          resolve(backend);
        }
      }
    });
    
    backend.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(`[API ERROR] ${output}`);
    });
    
    backend.on('close', (code) => {
      log(`❌ Backend server exited with code ${code}`, 'red');
    });
    
    // Give it some time to start
    setTimeout(() => {
      if (!backendReady) {
        log('⚠️  Backend server taking longer than expected to start', 'yellow');
        resolve(backend);
      }
    }, 10000);
  });
}

// Start the frontend server
function startFrontend() {
  return new Promise((resolve) => {
    log('🎨 Starting frontend server...', 'blue');
    
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: 'frontend',
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let frontendReady = false;
    
    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`[FRONTEND] ${output}`);
      
      if (output.includes('Local:') || output.includes('localhost:3000')) {
        if (!frontendReady) {
          frontendReady = true;
          log('✅ Frontend server started successfully', 'green');
          log('🌐 Open http://localhost:3000 in your browser', 'cyan');
          resolve(frontend);
        }
      }
    });
    
    frontend.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(`[FRONTEND ERROR] ${output}`);
    });
    
    frontend.on('close', (code) => {
      log(`❌ Frontend server exited with code ${code}`, 'red');
    });
    
    // Give it some time to start
    setTimeout(() => {
      if (!frontendReady) {
        log('⚠️  Frontend server taking longer than expected to start', 'yellow');
        resolve(frontend);
      }
    }, 15000);
  });
}

// Main startup sequence
async function main() {
  try {
    // Pre-flight checks
    checkNodeVersion();
    checkDirectories();
    checkPackageFiles();
    await checkPorts();
    
    // Install dependencies
    await installDependencies();
    
    // Check environment
    checkEnvironment();
    
    log('', 'reset');
    log('🚀 Starting development servers...', 'magenta');
    log('', 'reset');
    
    // Start backend first
    const backendProcess = await startBackend();
    
    // Wait a bit for backend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start frontend
    const frontendProcess = await startFrontend();
    
    log('', 'reset');
    log('🎉 MOTK Development Environment is ready!', 'green');
    log('', 'reset');
    log('📍 URLs:', 'cyan');
    log('   Frontend: http://localhost:3000', 'cyan');
    log('   Backend:  http://localhost:3001', 'cyan');
    log('   API Docs: http://localhost:3001/api-docs', 'cyan');
    log('   Health:   http://localhost:3001/health', 'cyan');
    log('', 'reset');
    log('🔧 Next Steps:', 'yellow');
    log('   1. Configure Google credentials in api/.env', 'yellow');
    log('   2. Open http://localhost:3000 in your browser', 'yellow');
    log('   3. Follow the Quick Start guide', 'yellow');
    log('', 'reset');
    log('Press Ctrl+C to stop both servers', 'magenta');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('', 'reset');
      log('🛑 Shutting down servers...', 'yellow');
      
      if (backendProcess) {
        backendProcess.kill('SIGTERM');
      }
      
      if (frontendProcess) {
        frontendProcess.kill('SIGTERM');
      }
      
      setTimeout(() => {
        log('👋 Goodbye!', 'green');
        process.exit(0);
      }, 1000);
    });
    
  } catch (error) {
    log('', 'reset');
    log('❌ Failed to start development environment:', 'red');
    log(`   ${error.message}`, 'yellow');
    log('', 'reset');
    log('🔧 Troubleshooting:', 'cyan');
    log('   1. Check that Node.js 18+ is installed', 'cyan');
    log('   2. Make sure ports 3000 and 3001 are available', 'cyan');
    log('   3. Run "npm install" in root, api, and frontend directories', 'cyan');
    log('   4. Check the TROUBLESHOOTING.md guide', 'cyan');
    process.exit(1);
  }
}

// Run the startup sequence
main();