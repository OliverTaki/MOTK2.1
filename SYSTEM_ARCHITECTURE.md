# MOTK System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOTK SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   FRONTEND      │    │    BACKEND      │    │   STORAGE   │  │
│  │                 │    │                 │    │             │  │
│  │ • React App     │◄──►│ • Node.js API   │◄──►│ • G.Sheets  │  │
│  │ • Material-UI   │    │ • Express.js    │    │ • G.Drive   │  │
│  │ • React Query   │    │ • TypeScript    │    │ • OAuth     │  │
│  │ • Lazy Loading  │    │ • JWT Auth      │    │ • FFmpeg    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Architecture

### Frontend Layer (React Application)

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   COMPONENTS    │  │    SERVICES     │  │     HOOKS       │  │
│  │                 │  │                 │  │                 │  │
│  │ • EntityTable   │  │ • FileService   │  │ • useFileManage │  │
│  │ • FileUpload    │  │ • AuthService   │  │ • useEntities   │  │
│  │ • Dashboard     │  │ • ApiClient     │  │ • useAuth       │  │
│  │ • FileManager   │  │ • CacheService  │  │ • useQuery      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    STATE MANAGEMENT                        │  │
│  │                                                             │  │
│  │ • React Query (Server State)                               │  │
│  │ • React Context (Global State)                             │  │
│  │ • Local State (Component State)                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Layer (Node.js API)

```
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   MIDDLEWARE    │  │     ROUTES      │  │    SERVICES     │  │
│  │                 │  │                 │  │                 │  │
│  │ • Authentication│  │ • /api/auth     │  │ • AuthService   │  │
│  │ • Rate Limiting │  │ • /api/entities │  │ • FileService   │  │
│  │ • Performance   │  │ • /api/files    │  │ • SheetsService │  │
│  │ • Security      │  │ • /api/monitor  │  │ • StorageService│  │
│  │ • Caching       │  │ • /api/sheets   │  │ • ProxyService  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   CORE SERVICES                             │  │
│  │                                                             │  │
│  │ • Entity Manager (CRUD operations)                         │  │
│  │ • File Integration Service (Upload/Download)               │  │
│  │ • Performance Monitor (Metrics/Health)                     │  │
│  │ • Cache Service (Response caching)                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Layer (Google Cloud)

```
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  GOOGLE SHEETS  │  │  GOOGLE DRIVE   │  │   PROCESSING    │  │
│  │                 │  │                 │  │                 │  │
│  │ • Project Data  │  │ • ORIGINALS/    │  │ • FFmpeg        │  │
│  │ • Entity Tables │  │   - shot_001/   │  │ • Proxy Gen     │  │
│  │ • Task Lists    │  │   - asset_001/  │  │ • Queue Mgmt    │  │
│  │ • Member Lists  │  │ • PROXIES/      │  │ • Status Track  │  │
│  │ • Auto Backup   │  │   - proxies.mp4 │  │ • Progress Mon  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   AUTHENTICATION                            │  │
│  │                                                             │  │
│  │ • Google OAuth 2.0 (User Authentication)                   │  │
│  │ • Service Account (API Access)                             │  │
│  │ • JWT Tokens (Session Management)                          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### User Authentication Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │    │Frontend │    │Backend  │    │ Google  │    │ Storage │
│         │    │         │    │         │    │ OAuth   │    │         │
└────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
     │              │              │              │              │
     │ 1. Login     │              │              │              │
     ├─────────────►│              │              │              │
     │              │ 2. Auth URL  │              │              │
     │              ├─────────────►│              │              │
     │              │              │ 3. OAuth     │              │
     │              │              ├─────────────►│              │
     │              │              │ 4. Code      │              │
     │              │              │◄─────────────┤              │
     │              │ 5. JWT Token │              │              │
     │              │◄─────────────┤              │              │
     │ 6. Dashboard │              │              │              │
     │◄─────────────┤              │              │              │
     │              │              │              │ 7. User Data │
     │              │              │              │◄─────────────┤
```

### File Upload Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │    │Frontend │    │Backend  │    │ G.Drive │    │ FFmpeg  │
│         │    │         │    │         │    │         │    │         │
└────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
     │              │              │              │              │
     │ 1. Select    │              │              │              │
     │    Files     │              │              │              │
     ├─────────────►│              │              │              │
     │              │ 2. Upload    │              │              │
     │              │    Request   │              │              │
     │              ├─────────────►│              │              │
     │              │              │ 3. Store     │              │
     │              │              │    Original  │              │
     │              │              ├─────────────►│              │
     │              │              │              │ 4. Generate  │
     │              │              │              │    Proxy     │
     │              │              ├──────────────┼─────────────►│
     │              │ 5. Progress  │              │              │
     │              │    Updates   │              │              │
     │              │◄─────────────┤              │              │
     │ 6. Complete  │              │              │              │
     │◄─────────────┤              │              │              │
```

### Entity Management Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │    │Frontend │    │Backend  │    │G.Sheets │
│         │    │         │    │         │    │         │
└────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
     │              │              │              │
     │ 1. Create    │              │              │
     │    Entity    │              │              │
     ├─────────────►│              │              │
     │              │ 2. Validate  │              │
     │              │    & Save    │              │
     │              ├─────────────►│              │
     │              │              │ 3. Update    │
     │              │              │    Sheet     │
     │              │              ├─────────────►│
     │              │              │ 4. Confirm   │
     │              │              │◄─────────────┤
     │              │ 5. Success   │              │
     │              │◄─────────────┤              │
     │ 6. Updated   │              │              │
     │    UI        │              │              │
     │◄─────────────┤              │              │
```

## Component Relationships

### Frontend Component Hierarchy

```
App
├── Router
│   ├── Dashboard
│   │   ├── ProjectOverview
│   │   ├── RecentActivity
│   │   └── TaskSummary
│   ├── Entities
│   │   ├── EntityTable
│   │   │   ├── ShotTable
│   │   │   ├── AssetTable
│   │   │   └── TaskTable
│   │   └── EntityForm
│   ├── Files
│   │   ├── FileManagementDemo
│   │   ├── FileUpload
│   │   ├── ThumbnailGrid
│   │   ├── FileList
│   │   └── VersionsDisplay
│   └── Settings
│       ├── UserProfile
│       ├── ProjectSettings
│       └── SystemStatus
└── AuthProvider
    ├── LoginPage
    └── AuthCallback
```

### Backend Service Dependencies

```
Express App
├── Middleware Stack
│   ├── Security (Helmet, CORS)
│   ├── Authentication (JWT)
│   ├── Rate Limiting
│   ├── Performance Monitoring
│   └── Caching
├── Route Handlers
│   ├── Auth Routes
│   ├── Entity Routes
│   ├── File Routes
│   ├── Monitoring Routes
│   └── Sheet Routes
└── Core Services
    ├── AuthenticationService
    ├── EntityManager
    ├── FileManagementIntegrationService
    ├── StorageManager
    ├── ProxyGenerationService
    ├── PerformanceMonitor
    └── CacheService
```

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   TRANSPORT     │  │  APPLICATION    │  │     DATA        │  │
│  │                 │  │                 │  │                 │  │
│  │ • HTTPS/TLS     │  │ • JWT Tokens    │  │ • Google OAuth  │  │
│  │ • Secure Headers│  │ • Rate Limiting │  │ • Service Acct  │  │
│  │ • CORS Policy   │  │ • Input Valid   │  │ • Folder Perms  │  │
│  │ • CSP Headers   │  │ • Auth Middleware│  │ • Audit Logs   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Protection Flow

```
User Request → HTTPS → Rate Limit → Auth Check → Input Validation → 
Business Logic → Google API → Encrypted Storage → Audit Log
```

## Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      CACHING LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   BROWSER       │  │    SERVER       │  │    STORAGE      │  │
│  │                 │  │                 │  │                 │  │
│  │ • HTTP Cache    │  │ • Memory Cache  │  │ • Google Cache  │  │
│  │ • Service Worker│  │ • Response Cache│  │ • CDN Cache     │  │
│  │ • Local Storage │  │ • Query Cache   │  │ • File Cache    │  │
│  │ • Session Cache │  │ • Redis (opt)   │  │ • API Cache     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING STACK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   METRICS       │  │     LOGS        │  │    HEALTH       │  │
│  │                 │  │                 │  │                 │  │
│  │ • Response Time │  │ • Request Logs  │  │ • System Status │  │
│  │ • Memory Usage  │  │ • Error Logs    │  │ • API Health    │  │
│  │ • Error Rates   │  │ • Auth Events   │  │ • Storage Check │  │
│  │ • Cache Stats   │  │ • File Ops      │  │ • Queue Status  │  │
│  │ • Queue Length  │  │ • Performance   │  │ • Uptime Mon    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Multi-Platform Support

```
┌─────────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT OPTIONS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    VERCEL       │  │    RAILWAY      │  │     RENDER      │  │
│  │                 │  │                 │  │                 │  │
│  │ • Serverless    │  │ • Full Stack    │  │ • Web Service   │  │
│  │ • Auto Scale    │  │ • Database      │  │ • Static Site   │  │
│  │ • Edge Network  │  │ • Redis Cache   │  │ • Redis Add-on  │  │
│  │ • Git Deploy    │  │ • Git Deploy    │  │ • Git Deploy    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │     HEROKU      │  │     LOCAL       │  │    DOCKER       │  │
│  │                 │  │                 │  │                 │  │
│  │ • Dyno System   │  │ • Development   │  │ • Containerized │  │
│  │ • Add-ons       │  │ • Testing       │  │ • Orchestration │  │
│  │ • Buildpacks    │  │ • Debugging     │  │ • Scaling       │  │
│  │ • Git Deploy    │  │ • Hot Reload    │  │ • Multi-env     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack Details

### Frontend Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18+ | UI Library |
| Language | TypeScript | Type Safety |
| UI Library | Material-UI v5 | Component Library |
| State Management | React Query | Server State |
| Routing | React Router | Navigation |
| Build Tool | Vite | Fast Development |
| HTTP Client | Axios | API Communication |
| Form Handling | React Hook Form | Form Management |

### Backend Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 18+ | JavaScript Runtime |
| Framework | Express.js | Web Framework |
| Language | TypeScript | Type Safety |
| Authentication | JWT + Google OAuth | Security |
| File Processing | FFmpeg | Video Processing |
| API Documentation | Swagger | API Docs |
| Testing | Jest + Supertest | Unit/Integration Tests |
| Monitoring | Custom Service | Performance Tracking |

### Storage & External Services

| Component | Technology | Purpose |
|-----------|------------|---------|
| Data Storage | Google Sheets API | Structured Data |
| File Storage | Google Drive API | File Management |
| Authentication | Google OAuth 2.0 | User Authentication |
| Video Processing | FFmpeg | Proxy Generation |
| Caching | In-Memory + Redis | Performance |
| Monitoring | Custom + Prometheus | Observability |

This architecture provides a scalable, secure, and maintainable foundation for the MOTK production management system, with clear separation of concerns and modern development practices.