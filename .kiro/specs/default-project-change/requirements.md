# Requirements Document

## Introduction

This feature aims to change the default project in the frontend from "demo-project" to the user's actual Google Sheets project. Currently, the system is using a hardcoded "demo-project" as the default project, which requires users to manually switch to their actual project every time they use the application. This feature will improve user experience by automatically loading the correct project.

## Requirements

### Requirement 1

**User Story:** As a user, I want the system to automatically load my Google Sheets project instead of "demo-project" by default, so that I don't have to manually switch projects every time I use the application.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL attempt to load the user's Google Sheets project instead of "demo-project".
2. WHEN a user's project is successfully loaded THEN the system SHALL display the user's project information in the UI.
3. IF the user's project cannot be loaded THEN the system SHALL display an appropriate error message and provide options to retry or create a new project.
4. WHEN the user selects a project THEN the system SHALL persist this selection for future sessions.
5. IF multiple projects are available THEN the system SHALL load the most recently used project.

### Requirement 2

**User Story:** As a user, I want to be able to easily switch between projects if I have multiple projects, so that I can work with different data sets as needed.

#### Acceptance Criteria

1. WHEN multiple projects are available THEN the system SHALL provide a clear UI element to switch between projects.
2. WHEN the user switches to a different project THEN the system SHALL persist this selection for future sessions.
3. WHEN the user switches projects THEN the system SHALL update all relevant UI components to reflect the selected project's data.