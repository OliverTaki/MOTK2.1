# MOTK System Setup Guide

## 🚀 Quick Setup (5 Minutes)

### Option 1: Automated Setup (Recommended)
```bash
# Run the automated setup script
node start-dev.js
```

This script will:
- ✅ Check system requirements
- ✅ Install dependencies
- ✅ Create environment files
- ✅ Start both servers
- ✅ Open your browser

### Option 2: Manual Setup
If you prefer to set up manually, follow the steps below.

## 📋 Prerequisites

### System Requirements
- **Node.js 18+** (check with `node --version`)
- **npm 9+** (check with `npm --version`)
- **Google Account** (for authentication and storage)
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)

### Install Node.js (if needed)
```bash
# Check current version
node --version

# If you need to install/upgrade:
# Visit https://nodejs.org/ and download the latest LTS version
# Or use a version manager like nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

## 🔧 Manual Installation Steps

### Step 1: Install Dependencies
```bash
# Install root dependencies
npm install

# Install API dependencies
cd api
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Environment Configuration

Create `api/.env` file:
```bash
# Copy the example or create new
cp api/.env.example api/.env

# Or create manually:
cat > api/.env << 'EOF'
# MOTK Development Environment
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
EOF
```

### Step 3: Google Cloud Setup

#### 3.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project"
3. Enter project name (e.g., "MOTK Production")
4. Click "Create"

#### 3.2 Enable Required APIs
```bash
# In Google Cloud Console, enable these APIs:
# - Google Sheets API
# - Google Drive API
# - Google OAuth2 API
```

Or use the links:
- [Enable Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
- [Enable Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)

#### 3.3 Create OAuth 2.0 Credentials
1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback` (for production)
5. Copy Client ID and Client Secret to your `.env` file

#### 3.4 Create Service Account
1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Enter name: "MOTK Service Account"
4. Click "Create and Continue"
5. Add roles:
   - "Editor" (for Sheets access)
   - "Storage Admin" (for Drive access)
6. Click "Done"
7. Click on the service account
8. Go to "Keys" tab
9. Click "Add Key" → "Create New Key" → "JSON"
10. Download the JSON file
11. Extract values for your `.env` file:
    - `project_id` → `GOOGLE_PROJECT_ID`
    - `private_key_id` → `GOOGLE_PRIVATE_KEY_ID`
    - `private_key` → `GOOGLE_PRIVATE_KEY`
    - `client_email` → `GOOGLE_CLIENT_EMAIL`

### Step 4: Google Drive Setup

#### 4.1 Create Project Folders
1. Go to [Google Drive](https://drive.google.com/)
2. Create two folders:
   - "MOTK_ORIGINALS"
   - "MOTK_PROXIES"
3. Share both folders with your service account email
4. Get folder IDs from URLs and update `.env`:
   - `ORIGINALS_ROOT_URL=https://drive.google.com/drive/folders/FOLDER_ID`
   - `PROXIES_ROOT_URL=https://drive.google.com/drive/folders/FOLDER_ID`

### Step 5: Start the Servers

#### Option A: Start Both Together
```bash
# Start both frontend and backend
npm run dev
```

#### Option B: Start Separately
```bash
# Terminal 1: Start backend
cd api
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Step 6: Verify Installation

#### Check Backend
```bash
# Health check
curl http://localhost:3001/health

# Should return:
# {"status":"healthy","message":"MOTK API is running",...}
```

#### Check Frontend
1. Open http://localhost:3000
2. Should see MOTK interface
3. Check browser console for errors

#### Check Authentication
```bash
# Check auth config
curl http://localhost:3001/api/auth/config

# Should return Google client configuration
```

## 🎯 Development Mode vs Production

### Development Mode (Default)
- Uses `NODE_ENV=development`
- Detailed error messages
- Hot reloading enabled
- Mock data available
- Relaxed security settings

### Production Mode
- Set `NODE_ENV=production`
- Minified assets
- Error messages hidden
- Enhanced security
- Performance optimizations

## 🔍 Troubleshooting Common Issues

### Issue: "Cannot GET /api/..."
**Cause:** Backend not running
**Solution:**
```bash
cd api
npm run dev
# Should see: "MOTK API server running on port 3001"
```

### Issue: "CORS Error"
**Cause:** Frontend/backend port mismatch
**Solution:** Check `frontend/vite.config.ts` proxy settings

### Issue: "Google API Error"
**Cause:** Invalid credentials or missing APIs
**Solution:**
1. Verify Google Cloud setup
2. Check `.env` file values
3. Ensure APIs are enabled

### Issue: "JWT Error"
**Cause:** Missing or invalid JWT secret
**Solution:**
```bash
# In api/.env, set a secure secret:
JWT_SECRET=your-very-secure-secret-key-here
```

### Issue: React Router Warnings
**Cause:** Future compatibility warnings
**Solution:** These are just warnings and don't affect functionality

### Issue: Port Already in Use
**Solution:**
```bash
# Kill processes on ports 3000/3001
npx kill-port 3000
npx kill-port 3001

# Or use different ports in configuration
```

## 🚀 Quick Development Workflow

### Daily Startup
```bash
# Option 1: Automated
node start-dev.js

# Option 2: Manual
npm run dev
```

### Making Changes
1. **Frontend changes**: Auto-reload in browser
2. **Backend changes**: Server restarts automatically
3. **Environment changes**: Restart servers manually

### Testing
```bash
# Run all tests
npm test

# Run specific tests
cd api && npm test
cd frontend && npm test
```

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ `curl http://localhost:3001/health` returns 200
- ✅ Frontend loads at http://localhost:3000
- ✅ No console errors in browser
- ✅ Can sign in with Google
- ✅ API calls return data (not 500 errors)

## 📚 Next Steps

Once everything is running:
1. 📖 Read the [QUICK_START.md](./QUICK_START.md) guide
2. 🎬 Create your first project
3. 📁 Upload some files
4. 👥 Add team members
5. 📊 Track your progress

## 🆘 Getting Help

### Self-Help Resources
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [USER_GUIDE.md](./USER_GUIDE.md) - Complete documentation
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - Technical details

### Debug Information to Collect
When asking for help, include:
1. **Error messages** (full text)
2. **Console logs** (browser and terminal)
3. **Environment info** (OS, Node version)
4. **Steps to reproduce**

### Quick Debug Commands
```bash
# System info
node --version
npm --version
curl http://localhost:3001/health

# Check processes
ps aux | grep node
netstat -an | grep 300

# Check environment
cd api && node -e "console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing')"
```

## 🔒 Security Notes

### Development Security
- Default JWT secret is for development only
- Google credentials should be kept secure
- Don't commit `.env` files to version control

### Production Security
- Use strong JWT secrets
- Enable HTTPS
- Rotate credentials regularly
- Monitor access logs

---

**You're all set!** 🎉 The MOTK system should now be running and ready for your animation/video production management needs.