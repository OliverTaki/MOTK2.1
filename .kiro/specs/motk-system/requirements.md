# Requirements Document

## Introduction

MOTK (Motion Toolkit) is a comprehensive project management system designed specifically for animation and video production workflows. The system integrates with Google Sheets as a backend data store and provides file storage management through Google Drive or Box. It features real-time collaborative editing with conflict resolution, template-based project initialization, and specialized UI components for managing shots, assets, tasks, and team members in production environments.

## Requirements

### Requirement 1

**User Story:** As a production manager, I want to create new animation projects with standardized sheet structures, so that all projects follow consistent data organization and workflows.

#### Acceptance Criteria

1. WHEN a user creates a new project THEN the system SHALL generate 9 standardized Google Sheets tabs (Shots, Assets, Tasks, ProjectMembers, Users, Pages, Fields, project_meta, Logs)
2. WHEN sheets are initialized THEN each sheet SHALL contain predefined columns with correct data types and sample data
3. WHEN project creation completes THEN the system SHALL configure storage roots for both originals and proxies based on user's provider choice
4. IF the user selects Google Drive as storage provider THEN the system SHALL create folder structures under the specified Drive location
5. IF the user selects Box as storage provider THEN the system SHALL create folder structures under the specified Box location

### Requirement 2

**User Story:** As a team member, I want to edit production data in real-time with other collaborators, so that we can work efficiently without data conflicts.

#### Acceptance Criteria

1. WHEN a user begins editing a cell THEN the system SHALL store the original value for conflict detection
2. WHEN a user saves changes THEN the system SHALL perform optimistic UI updates immediately
3. WHEN a save operation detects a conflict THEN the system SHALL present a dialog with three options: Overwrite, Edit again, or Keep server value
4. WHEN multiple users edit different cells simultaneously THEN the system SHALL allow concurrent edits without blocking
5. WHEN network errors occur THEN the system SHALL retry up to 3 times with exponential backoff before showing error message

### Requirement 3

**User Story:** As a content creator, I want to manage original files and review proxies efficiently, so that I can organize assets while maintaining fast preview capabilities.

#### Acceptance Criteria

1. WHEN an entity (shot/asset/task) is created THEN the system SHALL automatically create corresponding folder structure in ORIGINALS storage
2. WHEN files are uploaded to entity folders THEN original filenames SHALL remain unchanged for fidelity
3. WHEN proxy files are generated THEN they SHALL be stored flat in PROXIES folder with naming convention `<id>[_take][_vNN]_proxy.<ext>`
4. WHEN entities are deleted THEN the system SHALL move folders to deleted/ archive with info.txt metadata
5. WHEN users access originals THEN the system SHALL construct URLs using originals_root_url + entity path

### Requirement 4

**User Story:** As a production coordinator, I want to track shots, assets, and tasks with specialized data fields, so that I can manage complex production workflows effectively.

#### Acceptance Criteria

1. WHEN managing shots THEN the system SHALL support fields including episode, scene, title, status, priority, due_date, timecode_fps, and file management fields
2. WHEN managing assets THEN the system SHALL support fields including name, asset_type, status, overlap_sensitive flag, and file management fields
3. WHEN managing tasks THEN the system SHALL support fields including name, status, assignee_id, start_date, end_date, shot_id linkage
4. WHEN field types are defined THEN the system SHALL enforce data validation according to field type (text, select, number, date, checkbox, url, thumbnails, file_list, versions, links)
5. WHEN foreign key relationships exist THEN the system SHALL maintain referential integrity between linked entities

### Requirement 5

**User Story:** As a project administrator, I want to manage team members and their permissions, so that I can control access and track responsibilities.

#### Acceptance Criteria

1. WHEN adding team members THEN the system SHALL link them to Google User accounts via email
2. WHEN assigning roles THEN the system SHALL support department categorization (ANIMATION, PRODUCTION, CAMERA, EDIT, etc.)
3. WHEN setting permissions THEN the system SHALL enforce permission levels (edit, view, admin)
4. WHEN members are assigned to tasks THEN the system SHALL maintain foreign key relationships
5. WHEN displaying member information THEN the system SHALL show role, department, and contact details

### Requirement 6

**User Story:** As a user, I want to customize page layouts and views, so that I can optimize my workflow for different tasks and preferences.

#### Acceptance Criteria

1. WHEN creating custom pages THEN the system SHALL support multiple page types (table, overview, shot_detail, asset_detail, task_detail, schedule, chat, forum, member_detail)
2. WHEN configuring table views THEN users SHALL be able to set field widths, field order, visible fields, filters, and sorting
3. WHEN saving page configurations THEN the system SHALL store settings as JSON in the Pages sheet
4. WHEN sharing pages THEN users SHALL be able to mark pages as shared or personal
5. WHEN loading saved pages THEN the system SHALL restore all layout and filter settings

### Requirement 7

**User Story:** As a system user, I want reliable file upload and preview capabilities, so that I can efficiently manage media assets in my projects.

#### Acceptance Criteria

1. WHEN uploading files to thumbnails fields THEN the system SHALL display grid preview of files in the entity folder
2. WHEN uploading files to file_list fields THEN the system SHALL show table list with size/date sorting and filtering
3. WHEN uploading to versions fields THEN the system SHALL store files in field-named sub-folders and show latest version
4. WHEN generating proxies THEN the system SHALL encode to approximately 1080p resolution at 1 Mbps bitrate
5. WHEN accessing uploaded files THEN the system SHALL construct proper URLs based on storage provider configuration

### Requirement 8

**User Story:** As a developer integrating with MOTK, I want a consistent API interface, so that I can build additional tools and integrations reliably.

#### Acceptance Criteria

1. WHEN making API calls THEN the system SHALL provide RESTful endpoints for all CRUD operations
2. WHEN updating cells THEN the API SHALL accept originalValue, newValue, and force parameters for conflict handling
3. WHEN authentication fails THEN the API SHALL return 401 status and redirect to login
4. WHEN conflicts occur THEN the API SHALL return 409 status with current server value
5. WHEN operations succeed THEN the API SHALL return appropriate 2xx status codes with response data