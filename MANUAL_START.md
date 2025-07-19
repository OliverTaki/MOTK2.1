# Manual Start Guide - MOTK System

## 🎯 Quick Manual Setup

Since the automated script has issues, here's how to start everything manually:

### Step 1: Install Dependencies

```bash
# In the root directory (MOTKsheets2.1)
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

### Step 2: Start Backend Server

Open **Terminal 1** and run:
```bash
cd api
npm run dev
```

You should see something like:
```
MOTK API server running on port 3001
API Documentation available at http://localhost:3001/api-docs
```

### Step 3: Start Frontend Server

Open **Terminal 2** and run:
```bash
cd frontend
npm run dev
```

You should see something like:
```
Local:   http://localhost:3000/
Network: http://192.168.x.x:3000/
```

### Step 4: Test the System

1. **Check Backend Health:**
   - Open browser to: http://localhost:3001/health
   - Should show: `{"status":"healthy","message":"MOTK API is running"}`

2. **Check Frontend:**
   - Open browser to: http://localhost:3000
   - Should load the MOTK interface

## 🔧 If You Get Errors

### Backend Errors (Terminal 1)

**Error: "Cannot find module"**
```bash
cd api
npm install
npm run dev
```

**Error: "Port 3001 already in use"**
```bash
# Kill the process using port 3001
npx kill-port 3001
# Then try again
npm run dev
```

**Error: "Google API errors"**
- This is normal for now - the system will work in mock mode
- You can configure Google APIs later

### Frontend Errors (Terminal 2)

**Error: "Cannot find module"**
```bash
cd frontend
npm install
npm run dev
```

**Error: "Port 3000 already in use"**
```bash
# Kill the process using port 3000
npx kill-port 3000
# Then try again
npm run dev
```

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Backend terminal shows "server running on port 3001"
- ✅ Frontend terminal shows "Local: http://localhost:3000"
- ✅ Browser shows MOTK interface at localhost:3000
- ✅ No red errors in browser console

## 🚀 What to Do Next

Once both servers are running:

1. **Open your browser** to http://localhost:3000
2. **Explore the interface** - you should see:
   - Dashboard
   - Entities section
   - Files section
   - Settings

3. **Check for errors** in browser console (F12)
4. **Try basic navigation** between pages

## 🔍 Common Issues

### Issue: "API calls returning 500 errors"
**Solution:** Make sure backend is running on port 3001

### Issue: "CORS errors"
**Solution:** Make sure both servers are running and frontend is on port 3000

### Issue: "React Router warnings"
**Solution:** These are just warnings, system works fine

### Issue: "Google authentication not working"
**Solution:** Normal for now - system runs in mock mode

## 📞 Need Help?

If you run into issues:

1. **Check both terminals** for error messages
2. **Check browser console** (F12) for frontend errors
3. **Try restarting** both servers
4. **Let me know** what specific errors you see

## 🎯 Quick Commands Reference

```bash
# Start backend (Terminal 1)
cd api && npm run dev

# Start frontend (Terminal 2)  
cd frontend && npm run dev

# Check backend health
curl http://localhost:3001/health

# Kill ports if needed
npx kill-port 3000
npx kill-port 3001
```

---

**Ready to start?** Open two terminals and run the commands above! 🚀