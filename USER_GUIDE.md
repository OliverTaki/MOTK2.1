# MOTK System User Guide

## What is MOTK?

MOTK (Motion Toolkit) is a production management system designed for animation and video workflows. It helps teams organize projects, manage assets, track tasks, and handle file storage - all integrated with Google Sheets as your data backbone.

## How It Works

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   MOTK Server   │    │  Google Cloud   │
│                 │    │                 │    │                 │
│ • File Upload   │◄──►│ • File Storage  │◄──►│ • Google Sheets │
│ • Entity Mgmt   │    │ • Proxy Gen     │    │ • Google Drive  │
│ • Task Tracking │    │ • Authentication│    │ • OAuth         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Key Components:**
- **Frontend**: React web application for user interaction
- **Backend**: Node.js API server handling business logic
- **Storage**: Google Sheets for data, Google Drive for files
- **Processing**: FFmpeg for video proxy generation

## Getting Started

### 1. Initial Setup

**Prerequisites:**
- Google account
- Web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

**First Time Access:**
1. Navigate to your MOTK system URL
2. Click "Sign in with Google"
3. Authorize MOTK to access your Google account
4. You'll be redirected to the main dashboard

### 2. Understanding the Interface

**Main Navigation:**
- **Dashboard**: Overview of your projects and recent activity
- **Entities**: Manage shots, assets, tasks, and team members
- **Files**: Upload and manage project files
- **Settings**: Configure your preferences and project settings

**Entity Types:**
- **Shots**: Individual scenes or sequences in your project
- **Assets**: Characters, props, environments, and other reusable elements
- **Tasks**: Work items assigned to team members
- **Members**: Team members and their roles
- **Users**: System users and permissions

## Core Features

### 1. Project Management

**Creating a New Project:**
1. Go to Settings → Projects
2. Click "New Project"
3. Fill in project details:
   - Project name
   - Description
   - Start/end dates
   - Team members
4. Click "Create Project"

**Project Structure:**
```
Project
├── Shots (sequences, scenes)
├── Assets (characters, props, environments)
├── Tasks (work assignments)
└── Files (media, documents, references)
```

### 2. Entity Management

**Creating Entities:**

**For Shots:**
1. Navigate to Entities → Shots
2. Click "Add Shot"
3. Fill in details:
   - Shot ID (e.g., "SH010")
   - Shot name
   - Description
   - Status (Not Started, In Progress, Complete)
   - Assigned artist
   - Due date
4. Click "Save"

**For Assets:**
1. Navigate to Entities → Assets
2. Click "Add Asset"
3. Fill in details:
   - Asset ID (e.g., "CHAR_001")
   - Asset name
   - Type (Character, Prop, Environment)
   - Status
   - Assigned artist
4. Click "Save"

**Editing Entities:**
1. Click on any entity in the table
2. Edit the fields directly in the table
3. Changes are automatically saved to Google Sheets

### 3. File Management

**Uploading Files:**

1. Navigate to Files section
2. Select the entity (shot, asset, etc.)
3. Choose file type:
   - **Thumbnails**: Images and preview videos
   - **File List**: General project files
   - **Versions**: Different versions of work files

4. Drag and drop files or click "Browse"
5. Files are automatically uploaded to Google Drive
6. Video files are queued for proxy generation

**File Organization:**
```
Google Drive Structure:
├── ORIGINALS/
│   ├── shot_001/
│   │   ├── thumbnails/
│   │   ├── file_list/
│   │   └── versions/
│   └── asset_char_001/
│       ├── thumbnails/
│       └── file_list/
└── PROXIES/
    ├── shot_001_proxy.mp4
    └── asset_char_001_proxy.mp4
```

**Proxy Generation:**
- Video files automatically generate web-friendly proxies
- Proxies are 1080p, 1 Mbps for fast streaming
- Monitor progress in the Files section
- Original files remain untouched

### 4. Task Management

**Creating Tasks:**
1. Navigate to Entities → Tasks
2. Click "Add Task"
3. Fill in details:
   - Task name
   - Description
   - Assigned to
   - Priority (Low, Medium, High)
   - Status (Not Started, In Progress, Complete)
   - Due date
   - Related shot/asset
4. Click "Save"

**Task Workflow:**
1. **Not Started** → Task is created but not begun
2. **In Progress** → Work is actively happening
3. **Complete** → Task is finished and approved

### 5. Team Collaboration

**Adding Team Members:**
1. Navigate to Entities → Members
2. Click "Add Member"
3. Fill in details:
   - Name
   - Email
   - Role (Artist, Director, Producer, etc.)
   - Department
   - Status (Active, Inactive)
4. Click "Save"

**Assigning Work:**
- Assign shots to artists
- Assign tasks to team members
- Track progress and deadlines
- Monitor workload distribution

## Advanced Features

### 1. Batch Operations

**Bulk Upload:**
1. Select multiple files in file manager
2. Choose destination entity and field type
3. Upload processes all files simultaneously
4. Monitor progress for each file

**Batch Entity Creation:**
1. Use CSV import feature
2. Prepare CSV with entity data
3. Import creates multiple entities at once

### 2. Search and Filtering

**Entity Search:**
- Use search bar to find specific entities
- Filter by status, assigned artist, date range
- Sort by any column
- Export filtered results

**File Search:**
- Search files by name or type
- Filter by entity or field type
- View file history and versions

### 3. Status Monitoring

**System Health:**
- Monitor system performance
- Check storage connectivity
- View proxy generation queue
- Track error rates

**Project Progress:**
- Dashboard shows overall project status
- Track completion percentages
- Monitor deadlines and milestones
- Generate progress reports

## Best Practices

### 1. File Organization

**Naming Conventions:**
```
Shots: SH010, SH020, SH030
Assets: CHAR_hero, PROP_sword, ENV_forest
Tasks: anim_SH010, comp_SH020, model_CHAR_hero
Files: SH010_v001.mov, CHAR_hero_model_v003.ma
```

**File Types:**
- **Thumbnails**: JPG, PNG, MP4 (preview videos)
- **File List**: Any project files (documents, references)
- **Versions**: Work files with version numbers

### 2. Workflow Management

**Daily Workflow:**
1. Check dashboard for assigned tasks
2. Update task status as work progresses
3. Upload work-in-progress files
4. Review and approve completed work
5. Update project status

**Weekly Reviews:**
1. Review project progress
2. Update deadlines and priorities
3. Reassign tasks if needed
4. Archive completed work

### 3. Data Management

**Regular Backups:**
- Google Sheets automatically backs up data
- Export important data periodically
- Keep local copies of critical files

**Version Control:**
- Use version numbers in file names
- Keep previous versions for reference
- Document major changes

## Troubleshooting

### Common Issues

**Authentication Problems:**
- **Issue**: Can't sign in with Google
- **Solution**: Check if pop-ups are blocked, try incognito mode
- **Prevention**: Ensure stable internet connection

**File Upload Issues:**
- **Issue**: Files won't upload
- **Solution**: Check file size (max 100MB), verify internet connection
- **Prevention**: Use supported file formats, stable connection

**Slow Performance:**
- **Issue**: System is slow to respond
- **Solution**: Clear browser cache, check internet speed
- **Prevention**: Close unused browser tabs, use modern browser

**Missing Data:**
- **Issue**: Entities or files not showing
- **Solution**: Refresh page, check Google Sheets permissions
- **Prevention**: Don't edit Google Sheets directly

### Getting Help

**Self-Help:**
1. Check this user guide
2. Look at system status page
3. Try refreshing the browser
4. Clear browser cache and cookies

**Contact Support:**
1. Check system health at `/api/monitoring/health`
2. Note any error messages
3. Document steps to reproduce issue
4. Contact system administrator

## Tips and Tricks

### 1. Keyboard Shortcuts

**General:**
- `Ctrl/Cmd + S`: Save current form
- `Ctrl/Cmd + F`: Search/filter
- `Esc`: Close dialogs
- `Tab`: Navigate between fields

### 2. Efficiency Tips

**File Management:**
- Use drag-and-drop for faster uploads
- Upload multiple files at once
- Use descriptive file names
- Organize files by entity type

**Entity Management:**
- Use bulk operations for similar entities
- Set up templates for common entity types
- Use consistent naming conventions
- Regular status updates

### 3. Mobile Usage

**Mobile Browser:**
- Full functionality available on mobile
- Touch-friendly interface
- Responsive design adapts to screen size
- Upload files from mobile device

## System Limits

### Free Tier Limitations

**Google APIs:**
- 100 requests per 100 seconds per user
- 15GB Google Drive storage per account
- Standard Google Sheets limits apply

**File Uploads:**
- Maximum 100MB per file
- 10 concurrent uploads
- Video proxy generation: 2 concurrent jobs

**Performance:**
- 50-100 concurrent users
- Response times under 500ms
- 99.9% uptime target

### Scaling Options

**When You Need More:**
- Upgrade Google Workspace plan
- Implement Redis caching
- Use CDN for file delivery
- Consider dedicated hosting

## Security and Privacy

### Data Protection

**Your Data:**
- Stored in your Google account
- Encrypted in transit and at rest
- Access controlled by Google permissions
- Regular security updates

**File Security:**
- Files stored in your Google Drive
- Access controlled by folder permissions
- Audit logs for all file operations
- Secure file upload validation

### Privacy Policy

**Data Collection:**
- Only collects data necessary for functionality
- No personal data sold or shared
- Google OAuth for secure authentication
- Minimal data retention

**User Rights:**
- Full control over your data
- Can export or delete data anytime
- Transparent about data usage
- Compliant with privacy regulations

## Conclusion

MOTK provides a comprehensive solution for managing animation and video production workflows. By integrating with Google's ecosystem, it offers familiar tools with powerful project management capabilities.

**Key Benefits:**
- ✅ Centralized project management
- ✅ Automated file organization
- ✅ Real-time collaboration
- ✅ Integrated with Google Workspace
- ✅ Scalable and secure
- ✅ No complex setup required

**Getting the Most Out of MOTK:**
1. Establish clear naming conventions
2. Train your team on best practices
3. Regular data maintenance
4. Monitor system performance
5. Stay updated with new features

For additional support, documentation, or feature requests, contact your system administrator or check the project repository for updates.

---

*This guide covers MOTK System v1.0. Features and interface may vary based on your deployment configuration.*