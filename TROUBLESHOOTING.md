# MOTK System Troubleshooting Guide

## 🚨 Current Issues You're Seeing

### 1. React Router Warnings (Non-Critical)
```
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7
```

**What it means:** These are just warnings about future React Router changes.
**Impact:** None - system works fine
**Fix:** We can suppress these warnings

### 2. API 500 Errors (Critical)
```
GET http://localhost:3000/api/projects/demo-project/status 500 (Internal Server Error)
GET http://localhost:3000/api/projects/demo-project 500 (Internal Server Error)
GET http://localhost:3000/api/entities/task 500 (Internal Server Error)
GET http://localhost:3000/api/entities/shot 500 (Internal Server Error)
```

**What it means:** The backend API is not responding properly
**Impact:** Frontend can't load data
**Fix:** Need to check backend setup and routes

## 🔧 Quick Fixes

### Step 1: Check if Backend is Running

Open a new terminal and run:
```bash
# Check if API server is running
curl http://localhost:3001/health

# If not running, start it:
cd api
npm run dev
```

### Step 2: Check API Routes

The frontend is calling `/api/projects/` but we need to verify these routes exist:
```bash
# Check what routes are available
curl http://localhost:3001/api/
```

### Step 3: Fix React Router Warnings

Add this to your frontend router configuration to suppress warnings.

## 🛠️ Detailed Troubleshooting

### Backend Issues

**Problem:** API returning 500 errors
**Likely Causes:**
1. Backend server not running
2. Missing environment variables
3. Google Sheets/Drive not configured
4. Missing API routes

**Solutions:**

1. **Start Backend Server:**
```bash
cd api
npm install
npm run dev
```

2. **Check Environment Variables:**
```bash
# Create .env file in api/ directory
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_PROJECT_ID=your_project_id
JWT_SECRET=your_jwt_secret
```

3. **Check Google API Setup:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Enable Google Sheets API
- Enable Google Drive API
- Create OAuth 2.0 credentials
- Create Service Account for file access

### Frontend Issues

**Problem:** Frontend making requests to wrong URLs
**Solution:** Check if frontend is proxying correctly to backend

**Vite Config Check:**
```typescript
// frontend/vite.config.ts should have:
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

### Missing Routes

Based on the errors, we need these routes:
- `/api/projects/:projectId`
- `/api/projects/:projectId/status`
- `/api/entities/task`
- `/api/entities/shot`

## 🚀 Step-by-Step Recovery

### 1. Verify System Requirements
```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Check if ports are available
netstat -an | grep 3000
netstat -an | grep 3001
```

### 2. Clean Installation
```bash
# Root directory
npm install

# API directory
cd api
npm install
cd ..

# Frontend directory
cd frontend
npm install
cd ..
```

### 3. Start Services in Order
```bash
# Terminal 1: Start API server
cd api
npm run dev

# Terminal 2: Start frontend (after API is running)
cd frontend
npm run dev
```

### 4. Verify Services
```bash
# Check API health
curl http://localhost:3001/health

# Check frontend
curl http://localhost:3000
```

## 🔍 Debugging Commands

### Check API Status
```bash
# Health check
curl http://localhost:3001/health

# Check available routes
curl http://localhost:3001/api/

# Check authentication config
curl http://localhost:3001/api/auth/config
```

### Check Logs
```bash
# API logs (in api terminal)
# Look for error messages

# Frontend logs (in browser console)
# Check Network tab for failed requests
```

### Environment Check
```bash
# Check environment variables
cd api
node -e "console.log(process.env.NODE_ENV)"
node -e "console.log(process.env.GOOGLE_CLIENT_ID ? 'Google Client ID set' : 'Missing Google Client ID')"
```

## 🎯 Most Common Issues & Solutions

### Issue 1: "Cannot GET /api/..."
**Cause:** Backend not running or wrong port
**Solution:**
```bash
cd api
npm run dev
# Should see: "MOTK API server running on port 3001"
```

### Issue 2: "CORS Error"
**Cause:** Frontend and backend on different domains
**Solution:** Check vite.config.ts proxy settings

### Issue 3: "Google API Error"
**Cause:** Missing or invalid Google credentials
**Solution:**
1. Check Google Cloud Console setup
2. Verify environment variables
3. Test with simple API call

### Issue 4: "JWT Error"
**Cause:** Missing JWT secret or invalid token
**Solution:**
```bash
# Set JWT secret
export JWT_SECRET="your-secret-key-here"
```

### Issue 5: "File Upload Error"
**Cause:** Missing Google Drive permissions
**Solution:**
1. Check service account setup
2. Verify folder permissions
3. Test with simple file operation

## 🔧 Quick Development Setup

If you want to get running quickly without full Google integration:

### 1. Mock Mode Setup
```bash
# In api/.env
NODE_ENV=development
MOCK_MODE=true
JWT_SECRET=development-secret
```

### 2. Start with Basic Features
```bash
# Start API in mock mode
cd api
npm run dev

# Start frontend
cd frontend
npm run dev
```

### 3. Test Basic Functionality
- Go to http://localhost:3000
- Check if UI loads
- Test navigation
- Check browser console for errors

## 📞 Getting Help

### Self-Diagnosis Checklist
- [ ] Node.js 18+ installed
- [ ] Both servers running (3000 & 3001)
- [ ] No port conflicts
- [ ] Environment variables set
- [ ] Google APIs enabled
- [ ] Browser console clear of errors

### Information to Gather
When asking for help, include:
1. **Error messages** (full text)
2. **Browser console logs**
3. **API server logs**
4. **Environment setup** (OS, Node version)
5. **Steps to reproduce**

### Common Solutions
1. **Restart everything** - Often fixes temporary issues
2. **Clear browser cache** - Fixes frontend caching issues
3. **Check network connectivity** - Ensure internet access
4. **Verify Google API quotas** - Check if limits exceeded

## 🎉 Success Indicators

You'll know it's working when:
- ✅ API health check returns 200
- ✅ Frontend loads without console errors
- ✅ Can navigate between pages
- ✅ API calls return data (not 500 errors)
- ✅ Authentication flow works

## 🚀 Next Steps After Fixing

Once the system is running:
1. Follow the [QUICK_START.md](./QUICK_START.md) guide
2. Set up your first project
3. Configure Google integration
4. Add team members
5. Start managing your projects!

Remember: The system is designed to be robust, but initial setup requires getting all the pieces connected properly. Once it's running, it should be smooth sailing! 🎬