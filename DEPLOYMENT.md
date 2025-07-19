# MOTK System Deployment Guide

This guide covers deploying the MOTK system to various free hosting platforms.

## Supported Platforms

- **Vercel** - Frontend and API deployment
- **Railway** - Full-stack deployment with database
- **Render** - Full-stack deployment with Redis
- **Heroku** - Traditional PaaS deployment

## Prerequisites

### Required Environment Variables

Set these environment variables in your deployment platform:

#### Authentication (Required)
```bash
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback
JWT_SECRET=your_secure_jwt_secret_key
```

#### Google Service Account (Required for Storage)
```bash
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_PRIVATE_KEY_ID=your_service_account_key_id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_CLIENT_ID=your_service_account_client_id
```

#### Storage Configuration
```bash
ORIGINALS_ROOT_URL=https://drive.google.com/drive/folders/your_originals_folder_id
PROXIES_ROOT_URL=https://drive.google.com/drive/folders/your_proxies_folder_id
```

#### Optional
```bash
JWT_EXPIRES_IN=24h
REDIS_URL=redis://your-redis-url (for session storage)
```

## Platform-Specific Deployment

### 1. Vercel Deployment

Vercel is ideal for serverless deployment with automatic scaling.

#### Setup Steps:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   # Development deployment
   npm run deploy:vercel

   # Production deployment
   npm run deploy:vercel:prod
   ```

4. **Configure Environment Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all required environment variables
   - Redeploy after adding variables

#### Vercel Configuration (`vercel.json`):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/server.ts",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/server.ts" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ]
}
```

### 2. Railway Deployment

Railway provides a simple deployment experience with built-in databases.

#### Setup Steps:

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Project**:
   ```bash
   railway init
   ```

4. **Deploy**:
   ```bash
   npm run deploy:railway
   ```

5. **Add Redis Database** (Optional):
   ```bash
   railway add redis
   ```

#### Railway Configuration (`railway.json`):
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build:api && npm run build:frontend"
  },
  "deploy": {
    "startCommand": "npm run start:api",
    "healthcheckPath": "/api/health"
  }
}
```

### 3. Render Deployment

Render offers free static sites and web services with PostgreSQL/Redis.

#### Setup Steps:

1. **Connect GitHub Repository**:
   - Go to Render Dashboard
   - Connect your GitHub repository

2. **Create Web Service**:
   - Build Command: `npm install && npm run build:api`
   - Start Command: `npm run start:api`
   - Environment: Node

3. **Create Static Site** (for frontend):
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`

4. **Add Redis Database**:
   - Create Redis instance in Render
   - Copy connection URL to `REDIS_URL` environment variable

#### Render Configuration (`render.yaml`):
```yaml
services:
  - type: web
    name: motk-api
    env: node
    buildCommand: npm install && npm run build:api
    startCommand: npm run start:api
    
  - type: web
    name: motk-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: ./frontend/dist
```

### 4. Heroku Deployment

Traditional PaaS platform with add-ons for databases.

#### Setup Steps:

1. **Install Heroku CLI**:
   - Download from: https://devcenter.heroku.com/articles/heroku-cli

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

3. **Create App**:
   ```bash
   heroku create your-app-name
   ```

4. **Add Redis Add-on**:
   ```bash
   heroku addons:create heroku-redis:hobby-dev
   ```

5. **Deploy**:
   ```bash
   npm run deploy:heroku
   ```

#### Heroku Configuration (`Procfile`):
```
web: npm run start:api
```

## Automated Deployment

Use the deployment script for automated deployment:

```bash
# Deploy to Vercel (production)
node scripts/deploy.js vercel production

# Deploy to Railway (staging)
node scripts/deploy.js railway staging

# Deploy to Render
node scripts/deploy.js render production

# Deploy to Heroku
node scripts/deploy.js heroku production
```

## Environment-Specific Configuration

The system automatically detects the deployment platform and adjusts configuration:

### Local Development
```bash
NODE_ENV=development
PORT=3001
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Production Deployment
```bash
NODE_ENV=production
PORT=$PORT (set by platform)
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback
```

## Google OAuth Setup

### 1. Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API and Google Drive API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

### 2. Create Service Account (for Google Drive)

1. Go to "Credentials" → "Create Credentials" → "Service Account"
2. Download the JSON key file
3. Extract the following values for environment variables:
   - `project_id` → `GOOGLE_PROJECT_ID`
   - `private_key_id` → `GOOGLE_PRIVATE_KEY_ID`
   - `private_key` → `GOOGLE_PRIVATE_KEY`
   - `client_email` → `GOOGLE_CLIENT_EMAIL`
   - `client_id` → `GOOGLE_SERVICE_CLIENT_ID`

## Storage Setup

### Google Drive Folders

1. Create two folders in Google Drive:
   - "MOTK_ORIGINALS" for original files
   - "MOTK_PROXIES" for proxy files

2. Share folders with the service account email

3. Get folder IDs from URLs and set:
   - `ORIGINALS_ROOT_URL=https://drive.google.com/drive/folders/FOLDER_ID`
   - `PROXIES_ROOT_URL=https://drive.google.com/drive/folders/FOLDER_ID`

## Health Checks

All deployments include health check endpoints:

- **API Health**: `GET /api/health`
- **Auth Health**: `GET /api/auth/health`
- **Storage Health**: `GET /api/files/storage/status`

## Monitoring and Logging

### Built-in Monitoring

- Request logging with timestamps
- Error tracking with stack traces
- Performance metrics for API endpoints
- Authentication event logging

### Platform-Specific Monitoring

- **Vercel**: Built-in analytics and function logs
- **Railway**: Application metrics and logs
- **Render**: Service metrics and log streaming
- **Heroku**: Add-ons for monitoring (Papertrail, New Relic)

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**:
   - Check platform dashboard for missing variables
   - Verify Google OAuth and Service Account setup

2. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check build logs for specific errors

3. **Authentication Issues**:
   - Verify Google OAuth redirect URIs
   - Check JWT secret configuration
   - Validate service account permissions

4. **Storage Issues**:
   - Verify Google Drive folder permissions
   - Check service account has access to folders
   - Validate folder URLs and IDs

### Debug Commands

```bash
# Check environment configuration
curl https://your-domain.com/api/auth/health

# Test storage connectivity
curl -X POST https://your-domain.com/api/files/storage/test

# Validate authentication
curl https://your-domain.com/api/auth/config
```

## Security Considerations

### Production Security Checklist

- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS for all endpoints
- [ ] Set secure redirect URIs (HTTPS only)
- [ ] Rotate service account keys regularly
- [ ] Monitor authentication logs
- [ ] Set up rate limiting
- [ ] Use environment variables for all secrets
- [ ] Enable CORS with specific origins

### Environment Variable Security

- Never commit secrets to version control
- Use platform-specific secret management
- Rotate keys and tokens regularly
- Monitor for exposed credentials

## Cost Optimization

### Free Tier Limits

- **Vercel**: 100GB bandwidth, 1000 serverless function invocations
- **Railway**: 500 hours/month, 1GB RAM, 1GB storage
- **Render**: 750 hours/month, 512MB RAM
- **Heroku**: 1000 dyno hours/month, 10k rows PostgreSQL

### Optimization Tips

- Use efficient caching strategies
- Optimize bundle sizes
- Implement request batching
- Use CDN for static assets
- Monitor usage metrics

## Backup and Recovery

### Data Backup

- Google Sheets data is automatically backed up by Google
- Export project configurations regularly
- Backup environment variable configurations
- Document deployment procedures

### Disaster Recovery

- Keep deployment scripts in version control
- Document all external dependencies
- Maintain staging environments
- Test recovery procedures regularly

## Support and Maintenance

### Regular Maintenance Tasks

- Update dependencies monthly
- Monitor security advisories
- Review and rotate secrets quarterly
- Update documentation as needed
- Monitor performance metrics

### Getting Help

- Check platform-specific documentation
- Review application logs
- Use health check endpoints for diagnostics
- Monitor authentication and storage status