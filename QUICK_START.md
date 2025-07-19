# MOTK Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Access the System
1. Open your web browser
2. Go to your MOTK system URL
3. Click **"Sign in with Google"**
4. Allow permissions when prompted

### Step 2: Create Your First Project
1. Click **Settings** in the navigation
2. Click **"New Project"**
3. Fill in:
   - Project Name: "My First Project"
   - Description: Brief project description
   - Start Date: Today's date
4. Click **"Create"**

### Step 3: Add Your First Shot
1. Click **Entities** → **Shots**
2. Click **"Add Shot"**
3. Fill in:
   - Shot ID: `SH010`
   - Name: "Opening Scene"
   - Status: "Not Started"
   - Assigned To: Your name
4. Click **"Save"**

### Step 4: Upload Your First File
1. Click **Files** in the navigation
2. Select your shot (`SH010`)
3. Choose **"Thumbnails"** tab
4. Drag and drop an image or video file
5. Watch it upload automatically!

### Step 5: Create a Task
1. Click **Entities** → **Tasks**
2. Click **"Add Task"**
3. Fill in:
   - Task Name: "Animate SH010"
   - Assigned To: Your name
   - Priority: "Medium"
   - Status: "In Progress"
   - Related Shot: "SH010"
4. Click **"Save"**

## 🎯 What You Just Did

✅ **Authenticated** with Google OAuth  
✅ **Created** a project structure  
✅ **Added** your first shot entity  
✅ **Uploaded** a file with automatic organization  
✅ **Created** a task for tracking work  

## 🔄 Daily Workflow

### Morning Routine (2 minutes)
1. Open MOTK dashboard
2. Check assigned tasks
3. Review project status
4. Update task progress

### During Work (ongoing)
1. Upload work files as you create them
2. Update task status (In Progress → Complete)
3. Add notes or comments
4. Upload new versions of files

### End of Day (1 minute)
1. Update all task statuses
2. Upload final work files
3. Check tomorrow's assignments

## 📁 File Organization Made Simple

**Where Your Files Go:**
```
Your Google Drive
├── MOTK_ORIGINALS/
│   └── SH010/
│       ├── thumbnails/     ← Preview images/videos
│       ├── file_list/      ← General project files
│       └── versions/       ← Work file versions
└── MOTK_PROXIES/
    └── SH010_proxy.mp4     ← Auto-generated web previews
```

**File Types Explained:**
- **Thumbnails**: Images, preview videos, concept art
- **File List**: Documents, references, any project files
- **Versions**: Maya files, Photoshop files, work files with versions

## 🎬 Video Files = Automatic Magic

When you upload video files:
1. **Original** saved to Google Drive
2. **Proxy** automatically generated (1080p, web-friendly)
3. **Progress** tracked in real-time
4. **Preview** available immediately after processing

## 👥 Team Collaboration

### Add Team Members
1. **Entities** → **Members** → **"Add Member"**
2. Fill in name, email, role
3. They can now be assigned to tasks and shots

### Assign Work
1. Edit any shot or task
2. Change **"Assigned To"** field
3. Team member sees it on their dashboard

### Track Progress
1. Dashboard shows overall project status
2. Filter by person, status, or date
3. Export reports for stakeholders

## 🔧 Pro Tips

### Naming Conventions
```
Shots:  SH010, SH020, SH030
Assets: CHAR_hero, PROP_sword, ENV_forest  
Tasks:  anim_SH010, comp_SH020
Files:  SH010_v001.mov, hero_model_v003.ma
```

### Keyboard Shortcuts
- `Ctrl/Cmd + S` - Save
- `Ctrl/Cmd + F` - Search
- `Tab` - Navigate fields
- `Esc` - Close dialogs

### Mobile Usage
- Full functionality on phone/tablet
- Upload files from mobile camera
- Update task status on the go
- Check project status anywhere

## 🚨 Troubleshooting

### Can't Sign In?
- Check if pop-ups are blocked
- Try incognito/private browsing mode
- Ensure stable internet connection

### Files Won't Upload?
- Check file size (max 100MB)
- Verify internet connection
- Try refreshing the page

### Missing Data?
- Refresh the browser page
- Check Google Sheets permissions
- Don't edit Google Sheets directly

### System Slow?
- Clear browser cache
- Close unused browser tabs
- Check internet speed

## 📊 Understanding Your Data

### Where Everything Lives
- **Project Data**: Google Sheets (automatic backup)
- **Files**: Google Drive (your storage quota)
- **User Sessions**: Secure JWT tokens
- **System Logs**: Server monitoring

### Your Data Rights
- ✅ You own all your data
- ✅ Export anytime
- ✅ Delete anytime  
- ✅ Full access control
- ✅ No vendor lock-in

## 🎯 Next Steps

### Week 1: Basic Usage
- [ ] Create all your shots
- [ ] Add team members
- [ ] Upload reference materials
- [ ] Set up initial tasks

### Week 2: Advanced Features
- [ ] Bulk upload files
- [ ] Use search and filters
- [ ] Set up project templates
- [ ] Monitor system performance

### Month 1: Optimization
- [ ] Establish team workflows
- [ ] Create naming conventions
- [ ] Set up regular backups
- [ ] Train team members

## 📞 Need Help?

### Self-Service
1. Check **System Health**: `/api/monitoring/health`
2. Read **User Guide**: Full documentation
3. Try **Browser Refresh**: Fixes 80% of issues

### Get Support
1. Note any error messages
2. Document steps to reproduce
3. Check system status page
4. Contact your administrator

## 🎉 You're Ready!

You now have everything you need to start managing your animation/video projects with MOTK. The system grows with you - start simple and add complexity as needed.

**Remember:**
- 🔄 Regular updates keep projects on track
- 📁 Consistent file organization saves time
- 👥 Team collaboration improves with clear workflows
- 📊 Data-driven decisions lead to better outcomes

**Happy creating!** 🎬✨

---

*Need the full documentation? Check out [USER_GUIDE.md](./USER_GUIDE.md) for complete details.*