import { vi, describe, it, expect, beforeEach } from 'vitest';
import { apiRequest } from '../../api/client';
import {
  initializeProject,
  getProject,
  updateProject,
  getProjectTemplates,
  getProjectStatus,
  validateProjectConfig,
  ProjectInitializationRequest
} from '../projectService';

// Mock the API client
vi.mock('../../api/client');
const mockApiRequest = apiRequest as any;

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeProject', () => {
    const mockProjectData: ProjectInitializationRequest = {
      project_id: 'test-project',
      storage_provider: 'gdrive',
      originals_root_url: 'https://drive.google.com/drive/folders/originals',
      proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
      template: 'animation'
    };

    it('should call API with correct parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          project_id: 'test-project',
          storage_provider: 'gdrive' as const,
          originals_root_url: 'https://drive.google.com/drive/folders/originals',
          proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
          created_at: new Date(),
          spreadsheet_title: 'test-project',
          sheets_created: ['Shots', 'Assets', 'Tasks'],
          total_sheets: 9
        }
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await initializeProject(mockProjectData);

      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/projects/init', mockProjectData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const mockError = {
        success: false,
        error: 'Failed to initialize project',
        message: 'Google Sheets API connection failed'
      };

      mockApiRequest.mockResolvedValue(mockError);

      const result = await initializeProject(mockProjectData);

      expect(result).toEqual(mockError);
    });
  });

  describe('getProject', () => {
    it('should fetch project by ID', async () => {
      const mockResponse = {
        success: true,
        data: {
          project_id: 'test-project',
          storage_provider: 'gdrive' as const,
          originals_root_url: 'https://drive.google.com/drive/folders/originals',
          proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
          created_at: new Date(),
          spreadsheet_title: 'test-project',
          total_sheets: 9,
          available_sheets: ['Shots', 'Assets', 'Tasks']
        }
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await getProject('test-project');

      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/projects/test-project');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateProject', () => {
    it('should update project configuration', async () => {
      const updates = {
        storage_provider: 'box' as const,
        originals_root_url: 'https://company.box.com/folder/originals'
      };

      const mockResponse = {
        success: true,
        data: {
          project_id: 'test-project',
          storage_provider: 'box' as const,
          originals_root_url: 'https://company.box.com/folder/originals',
          proxies_root_url: 'https://drive.google.com/drive/folders/proxies',
          created_at: new Date()
        }
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await updateProject('test-project', updates);

      expect(mockApiRequest).toHaveBeenCalledWith('PUT', '/projects/test-project', updates);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getProjectTemplates', () => {
    it('should fetch available templates', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'animation',
            name: 'Animation Project',
            description: 'Template for animation projects',
            category: 'production'
          },
          {
            id: 'live-action',
            name: 'Live Action Project',
            description: 'Template for live action projects',
            category: 'production'
          }
        ]
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await getProjectTemplates();

      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/projects/templates/list');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getProjectStatus', () => {
    it('should fetch project status', async () => {
      const mockResponse = {
        success: true,
        data: {
          project_id: 'test-project',
          spreadsheet_title: 'test-project',
          sheets_configured: true,
          total_sheets: 9,
          required_sheets: 9,
          missing_sheets: [],
          sheet_statistics: {
            'Shots': 5,
            'Assets': 3,
            'Tasks': 8
          },
          api_connection: true
        }
      };

      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await getProjectStatus('test-project');

      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/projects/test-project/status');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateProjectConfig', () => {
    it('should validate valid configuration', () => {
      const validConfig: ProjectInitializationRequest = {
        project_id: 'valid-project-123',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies'
      };

      const result = validateProjectConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty project ID', () => {
      const invalidConfig: ProjectInitializationRequest = {
        project_id: '',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies'
      };

      const result = validateProjectConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project ID is required');
    });

    it('should reject project ID with invalid characters', () => {
      const invalidConfig: ProjectInitializationRequest = {
        project_id: 'invalid project!',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies'
      };

      const result = validateProjectConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project ID can only contain letters, numbers, underscores, and hyphens');
    });

    it('should reject project ID that is too short', () => {
      const invalidConfig: ProjectInitializationRequest = {
        project_id: 'ab',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies'
      };

      const result = validateProjectConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project ID must be at least 3 characters long');
    });

    it('should reject project ID that is too long', () => {
      const invalidConfig: ProjectInitializationRequest = {
        project_id: 'a'.repeat(51),
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/drive/folders/originals',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies'
      };

      const result = validateProjectConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project ID must be less than 50 characters');
    });

    it('should reject invalid storage provider', () => {
      const invalidConfig = {
        project_id: 'valid-project',
        storage_provider: 'invalid' as any,
        originals_root_url: 'https://drive.google.com/drive/folders/originals',
        proxies_root_url: 'https://drive.google.com/drive/folders/proxies'
      };

      const result = validateProjectConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Storage provider must be either "gdrive" or "box"');
    });

    it('should reject empty URLs', () => {
      const invalidConfig: ProjectInitializationRequest = {
        project_id: 'valid-project',
        storage_provider: 'gdrive',
        originals_root_url: '',
        proxies_root_url: ''
      };

      const result = validateProjectConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Originals root URL is required');
      expect(result.errors).toContain('Proxies root URL is required');
    });

    it('should collect multiple validation errors', () => {
      const invalidConfig: ProjectInitializationRequest = {
        project_id: 'ab',
        storage_provider: 'invalid' as any,
        originals_root_url: '',
        proxies_root_url: ''
      };

      const result = validateProjectConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain('Project ID must be at least 3 characters long');
      expect(result.errors).toContain('Storage provider must be either "gdrive" or "box"');
      expect(result.errors).toContain('Originals root URL is required');
      expect(result.errors).toContain('Proxies root URL is required');
    });
  });
});