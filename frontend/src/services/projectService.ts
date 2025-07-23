import { apiRequest } from '../api/client';
import { ApiResponse, ProjectConfig } from '@shared/types';

export interface ProjectInitializationRequest {
  project_id: string;
  storage_provider: 'gdrive' | 'box';
  originals_root_url: string;
  proxies_root_url: string;
  template?: string;
}

export interface ProjectMeta {
  project_id: string;
  storage_provider: 'gdrive' | 'box';
  originals_root_url: string;
  proxies_root_url: string;
  created_at: Date;
  spreadsheet_title: string;
  sheets_created: string[];
  total_sheets: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface ProjectStatus {
  project_id: string;
  spreadsheet_title: string;
  sheets_configured: boolean;
  total_sheets: number;
  required_sheets: number;
  missing_sheets: string[];
  sheet_statistics: { [key: string]: number };
  api_connection: boolean;
}

/**
 * Initialize a new project with Google Sheets and storage configuration
 */
export const initializeProject = async (
  data: ProjectInitializationRequest
): Promise<ApiResponse<ProjectMeta>> => {
  return apiRequest<ProjectMeta>('POST', '/projects/init', data);
};

/**
 * Get project configuration by project ID
 */
export const getProject = async (
  projectId: string
): Promise<ApiResponse<ProjectConfig & { 
  spreadsheet_title: string; 
  total_sheets: number; 
  available_sheets: string[] 
}>> => {
  return apiRequest('GET', `/projects/${projectId}`);
};

/**
 * Update project configuration
 */
export const updateProject = async (
  projectId: string,
  updates: Partial<Pick<ProjectConfig, 'storage_provider' | 'originals_root_url' | 'proxies_root_url'>>
): Promise<ApiResponse<ProjectConfig>> => {
  return apiRequest<ProjectConfig>('PUT', `/projects/${projectId}`, updates);
};

/**
 * Get available project templates
 */
export const getProjectTemplates = async (): Promise<ApiResponse<ProjectTemplate[]>> => {
  return apiRequest<ProjectTemplate[]>('GET', '/projects/templates/list');
};

/**
 * Get all available projects
 */
export const getAllProjects = async (): Promise<ApiResponse<ProjectConfig[]>> => {
  return apiRequest<ProjectConfig[]>('GET', '/projects');
};

/**
 * Get project status and health check
 */
export const getProjectStatus = async (
  projectId: string
): Promise<ApiResponse<ProjectStatus>> => {
  return apiRequest<ProjectStatus>('GET', `/projects/${projectId}/status`);
};

/**
 * Validate project configuration before initialization
 */
export const validateProjectConfig = (config: ProjectInitializationRequest): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Validate project ID
  if (!config.project_id || config.project_id.trim() === '') {
    errors.push('Project ID is required');
  } else {
    const projectIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!projectIdRegex.test(config.project_id)) {
      errors.push('Project ID can only contain letters, numbers, underscores, and hyphens');
    }
    if (config.project_id.length < 3) {
      errors.push('Project ID must be at least 3 characters long');
    }
    if (config.project_id.length > 50) {
      errors.push('Project ID must be less than 50 characters');
    }
  }

  // Validate storage provider
  if (!config.storage_provider || !['gdrive', 'box'].includes(config.storage_provider)) {
    errors.push('Storage provider must be either "gdrive" or "box"');
  }

  // Validate URLs
  if (!config.originals_root_url || config.originals_root_url.trim() === '') {
    errors.push('Originals root URL is required');
  }

  if (!config.proxies_root_url || config.proxies_root_url.trim() === '') {
    errors.push('Proxies root URL is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};