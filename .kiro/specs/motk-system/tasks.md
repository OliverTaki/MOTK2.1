# Implementation Plan

- [x] 1. Set up project foundation and core infrastructure
  - Initialize Node.js/Express backend with TypeScript configuration
  - Set up React frontend with TypeScript and Material-UI
  - Configure build tools, linting, and development environment
  - Create basic project structure with src/, api/, and shared/ directories
  - _Requirements: 8.1, 8.5_

- [x] 2. Implement Google Sheets integration layer

- [x] 2.1 Create Google Sheets API client wrapper
  - Write SheetsApiClient class with authentication and basic CRUD operations
  - Implement connection management and error handling for Google Sheets API
  - Create unit tests for API client methods
  - _Requirements: 1.1, 1.2, 8.1, 8.2_

- [x] 2.2 Build sheet initialization service
  - Implement initSheets() function to create standardized project templates
  - Write logic to generate all 9 required sheets with proper column schemas
  - Create sample data insertion for each sheet type
  - Write tests for template generation with various project configurations
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2.3 Implement cell update operations with conflict detection
  - Create updateCell() function with originalValue/newValue comparison
  - Build conflict detection logic and 409 error response handling
  - Implement force update capability for conflict resolution
  - Write unit tests for conflict scenarios and edge cases
  - _Requirements: 2.1, 2.2, 2.3, 8.2, 8.4_

- [x] 2.4 Connect sheets API routes to services
  - Implement actual Google Sheets operations in sheets routes
  - Add proper error handling and validation middleware
  - Connect SheetsApiClient to route handlers
  - Write integration tests for sheets endpoints
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 3. Build storage management system

- [x] 3.1 Create storage provider abstraction layer
  - Implement StorageProvider interface with Google Drive and Box adapters
  - Write folder creation logic for ORIGINALS and PROXIES directory structures
  - Create URL generation methods for both storage providers
  - Write unit tests for storage operations with mocked APIs
  - _Requirements: 3.1, 3.3, 8.1_

- [x] 3.2 Implement file upload and management
  - Build file upload endpoints with Multer middleware
  - Create entity folder management (create, delete, move to archive)
  - Implement file metadata tracking and URL generation
  - Write integration tests for complete upload workflows
  - _Requirements: 3.1, 3.2, 7.1, 7.2, 7.5_

- [x] 3.3 Build proxy generation service
  - Integrate FFmpeg for video proxy generation (1080p, 1 Mbps)
  - Implement proxy naming convention and flat storage structure
  - Create background job processing for proxy generation
  - Write tests for video processing with sample media files
  - _Requirements: 3.2, 3.3, 7.4_

- [x] 4. Implement entity management system

- [x] 4.1 Create entity data models and validation
  - Define TypeScript interfaces for Shot, Asset, Task, ProjectMember, User entities
  - Implement data validation functions for each entity type
  - Create field type validation according to MOTK field specifications
  - Write unit tests for all entity models and validation rules
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.2 Build entity CRUD operations service layer
  - Implement EntityManager class with create, read, update, delete operations
  - Create foreign key relationship management for linked entities
  - Build entity querying and filtering capabilities
  - Write integration tests for entity operations with Google Sheets backend
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.3 Connect entity API routes to services
  - Implement actual entity operations in entity routes
  - Add proper error handling and validation middleware
  - Connect EntityManager to route handlers
  - Write integration tests for entity endpoints
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.4 Connect projects API routes to services
  - Implement actual project initialization in projects routes
  - Connect SheetInitializationService to project creation endpoint
  - Add project configuration validation and error handling
  - Write integration tests for project endpoints
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5. Develop authentication and authorization system

- [x] 5.1 Implement Google OAuth integration
  - Set up Google OAuth 2.0 flow for user authentication
  - Create JWT token generation and validation middleware
  - Implement session management with Redis
  - Write authentication tests with mock Google OAuth responses
  - _Requirements: 5.1, 5.3, 8.3_

- [x] 5.2 Build permission management system
  - Implement role-based access control for edit/view/admin permissions
  - Create middleware for endpoint authorization based on user roles
  - Build user and project member management functionality
  - Write authorization tests for different permission levels
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 6. Create frontend data management layer

- [x] 6.1 Build React Query integration for data fetching
  - Set up React Query client with caching and background refetch
  - Create custom hooks for sheets data (useSheetsData, useEntityData)
  - Implement optimistic updates for cell editing operations
  - Write tests for data fetching hooks and cache management
  - _Requirements: 2.1, 2.2, 8.1_

- [x] 6.2 Implement conflict resolution UI components
  - Create ConflictDialog component with three resolution options
  - Build conflict detection logic in cell update handlers
  - Implement retry logic with exponential backoff for network errors
  - Write component tests for conflict resolution scenarios
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 7. Build core UI components

- [x] 7.1 Create entity table components
  - Implement ShotTable, AssetTable, TaskTable components using MUI DataGrid
  - Build processRowUpdate handlers for optimistic cell editing
  - Create custom cell renderers for different field types
  - Write component tests for table interactions and data display
  - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2_

- [x] 7.2 Implement file management UI components
  - Create FileUpload component with drag-and-drop support
  - Build ThumbnailGrid component for thumbnails field type
  - Implement FileList component with sorting and filtering
  - Create VersionsDisplay component for latest file preview
  - Write tests for file upload and display components
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 7.3 Build page configuration and layout system
  - Create PageConfigDialog for customizing table views
  - Implement field visibility, ordering, and width controls
  - Build filter and sort configuration UI components
  - Create page sharing functionality for team collaboration
  - Write tests for page configuration persistence and loading
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Implement project initialization workflow

- [x] 8.1 Create project setup wizard
  - Build multi-step project creation form with storage provider selection
  - Implement project configuration validation and submission
  - Create progress indicators for sheet initialization process
  - Write integration tests for complete project setup workflow
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 8.2 Build project dashboard and navigation
  - Create main dashboard with project overview and recent activity
  - Implement navigation between different entity views and pages
  - Build project settings management interface
  - Write tests for navigation and dashboard functionality
  - _Requirements: 6.1, 6.2_

- [x] 9. Add error handling and user feedback systems

- [x] 9.1 Implement comprehensive error handling
  - Create error boundary components for React error catching
  - Build centralized error logging and reporting system
  - Implement user-friendly error messages and recovery suggestions
  - Write tests for error scenarios and recovery workflows
  - _Requirements: 2.5, 8.3, 8.4_

- [x] 9.2 Create notification and feedback system
  - Implement toast notifications for operation status updates
  - Build progress indicators for long-running operations (file uploads, proxy generation)
  - Create loading states and skeleton components for better UX
  - Write tests for notification display and timing
  - _Requirements: 2.5, 7.4_

- [x] 10. Finalize API endpoints and middleware

- [x] 10.1 Complete RESTful API documentation
  - Document all authentication, data, file, and entity management endpoints
  - Create API validation middleware for external integrations
  - Create API documentation with OpenAPI/Swagger
  - Write comprehensive API integration tests
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10.2 Add API security and rate limiting
  - Implement rate limiting middleware to prevent abuse
  - Add request sanitization and validation
  - Create API key management for external integrations
  - Write security tests for common attack vectors
  - _Requirements: 8.1, 8.3_

- [x] 11. Complete system integration and testing






- [x] 11.1 Enhance end-to-end integration tests





  - Expand existing integration tests to cover complete user workflows
  - Add tests for project creation, entity management, file upload, and collaboration features
  - Implement automated testing with realistic data volumes and concurrent user scenarios
  - Add performance benchmarking for API endpoints and database operations
  - _Requirements: All requirements integration_

- [x] 11.2 Fix EntityType naming inconsistency and complete entity tables



  - Standardize EntityType/EntityTypes naming to use clear ENTITY_KIND constant
  - Update all imports across the codebase to use ENTITY_KIND.SHOT, ENTITY_KIND.ASSET, etc.
  - Verify AssetTable and TaskTable components are working correctly (already implemented!)
  - Test entity-specific cell renderers and validation for all entity types
  - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2_

- [x] 11.3 Complete file management integration


  - Connect file upload components to storage providers
  - Implement actual file upload/download functionality with progress tracking
  - Add proxy generation triggers and status monitoring
  - Test file operations with different storage providers (Google Drive, Box)
  - _Requirements: 3.1, 3.2, 3.3, 7.1, 7.2, 7.5_

- [x] 11.4 Finalize authentication and deployment


  - Complete Google OAuth integration with real credentials
  - Implement production-ready session management and security
  - Create deployment configurations for free hosting platforms
  - Add environment-specific configuration management
  - _Requirements: 5.1, 5.3, 8.3, 8.5_

- [x] 11.5 Optimize performance and add monitoring


  - Implement code splitting and lazy loading for frontend components
  - Add API response caching and query optimization
  - Create monitoring and logging for production deployment
  - Write deployment documentation and system requirements
  - _Requirements: System performance and scalability_