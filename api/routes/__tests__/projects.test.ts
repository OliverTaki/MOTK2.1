import request from 'supertest';
import express from 'express';

// Mock the services before importing the router
const mockSheetsClient = {
  validateConnection: jest.fn(),
  sheetExists: jest.fn(),
  getSheetData: jest.fn(),
  batchUpdate: jest.fn(),
  getSpreadsheetInfo: jest.fn(),
  getRowCount: jest.fn()
};

const mockInitService = {
  validateProjectConfig: jest.fn(),
  initSheets: jest.fn(),
  initSheetsWithTemplate: jest.fn(),
  getProjectTemplates: jest.fn()
};

jest.mock('../../services/sheets/SheetsApiClient', () => {
  return {
    SheetsApiClient: jest.fn().mockImplementation(() => mockSheetsClient)
  };
});

jest.mock('../../services/sheets/SheetInitializationService', () => {
  return {
    SheetInitializationService: jest.fn().mockImplementation(() => mockInitService)
  };
});

// Now import the router after mocking
import projectsRouter from '../projects';

describe('Projects API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create Express app with projects router
    app = express();
    app.use(express.json());
    app.use('/api/projects', projectsRouter);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('POST /init', () => {
    it('should initialize project successfully', async () => {
      const mockProjectMeta = {
        project_id: 'test-project',
        sheets_created: ['Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users', 'Pages', 'Fields', 'project_meta', 'Logs'],
        storage_configured: true,
        created_at: new Date()
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockInitService.validateProjectConfig.mockReturnValue({ valid: true, errors: [] });
      mockInitService.initSheets.mockResolvedValue(mockProjectMeta);

      const projectData = {
        project_id: 'test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/folders/originals',
        proxies_root_url: 'https://drive.google.com/folders/proxies'
      };

      const response = await request(app)
        .post('/api/projects/init')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project_id).toBe(mockProjectMeta.project_id);
      expect(response.body.data.sheets_created).toEqual(mockProjectMeta.sheets_created);
      expect(response.body.data.storage_configured).toBe(mockProjectMeta.storage_configured);
      expect(response.body.message).toBe("Project 'test-project' initialized successfully with 9 sheets");

      expect(mockSheetsClient.validateConnection).toHaveBeenCalled();
      expect(mockInitService.validateProjectConfig).toHaveBeenCalled();
      expect(mockInitService.initSheets).toHaveBeenCalled();
    });

    it('should initialize project with template', async () => {
      const mockProjectMeta = {
        project_id: 'test-project',
        sheets_created: ['Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users', 'Pages', 'Fields', 'project_meta', 'Logs'],
        storage_configured: true,
        created_at: new Date()
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockInitService.validateProjectConfig.mockReturnValue({ valid: true, errors: [] });
      mockInitService.initSheetsWithTemplate.mockResolvedValue(mockProjectMeta);

      const projectData = {
        project_id: 'test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/folders/originals',
        proxies_root_url: 'https://drive.google.com/folders/proxies',
        template: 'animation_series'
      };

      const response = await request(app)
        .post('/api/projects/init')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project_id).toBe(mockProjectMeta.project_id);
      expect(response.body.data.sheets_created).toEqual(mockProjectMeta.sheets_created);
      expect(response.body.data.storage_configured).toBe(mockProjectMeta.storage_configured);
      expect(response.body.message).toBe("Project 'test-project' initialized successfully with 9 sheets");

      expect(mockInitService.initSheetsWithTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'test-project',
          storage_provider: 'gdrive'
        }),
        'animation_series'
      );
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/projects/init')
        .send({
          project_id: 'test-project'
          // Missing other required fields
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'storage_provider must be either "gdrive" or "box"'
      });
    });

    it('should return 400 for invalid storage provider', async () => {
      const response = await request(app)
        .post('/api/projects/init')
        .send({
          project_id: 'test-project',
          storage_provider: 'invalid',
          originals_root_url: 'https://example.com',
          proxies_root_url: 'https://example.com'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'storage_provider must be either "gdrive" or "box"'
      });
    });

    it('should return 503 when connection fails', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(false);

      const projectData = {
        project_id: 'test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/folders/originals',
        proxies_root_url: 'https://drive.google.com/folders/proxies'
      };

      const response = await request(app)
        .post('/api/projects/init')
        .send(projectData)
        .expect(503);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to connect to Google Sheets API'
      });
    });

    it('should return 400 for invalid project configuration', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockInitService.validateProjectConfig.mockReturnValue({
        valid: false,
        errors: ['Project ID is required', 'Invalid storage provider']
      });

      const projectData = {
        project_id: 'test-project',
        storage_provider: 'gdrive',
        originals_root_url: 'https://drive.google.com/folders/originals',
        proxies_root_url: 'https://drive.google.com/folders/proxies'
      };

      const response = await request(app)
        .post('/api/projects/init')
        .send(projectData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid project configuration',
        message: 'Project ID is required, Invalid storage provider'
      });
    });
  });

  describe('GET /:projectId', () => {
    it('should get project configuration successfully', async () => {
      const mockMetaData = {
        values: [
          ['project_id', 'storage_provider', 'originals_root_url', 'proxies_root_url', 'created_at'],
          ['test-project', 'gdrive', 'https://drive.google.com/folders/originals', 'https://drive.google.com/folders/proxies', '2024-01-01T00:00:00.000Z']
        ],
        range: 'project_meta!A1:E2',
        majorDimension: 'ROWS' as const
      };

      const mockSpreadsheetInfo = {
        title: 'Test Project Spreadsheet',
        sheetCount: 9,
        sheets: ['Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users', 'Pages', 'Fields', 'project_meta', 'Logs']
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.getSheetData.mockResolvedValue(mockMetaData);
      mockSheetsClient.getSpreadsheetInfo.mockResolvedValue(mockSpreadsheetInfo);

      const response = await request(app)
        .get('/api/projects/test-project')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project_id).toBe('test-project');
      expect(response.body.data.storage_provider).toBe('gdrive');
      expect(response.body.data.spreadsheet_title).toBe('Test Project Spreadsheet');
      expect(response.body.message).toBe("Retrieved configuration for project 'test-project'");
    });

    it('should return 404 when project not found', async () => {
      const mockMetaData = {
        values: [
          ['project_id', 'storage_provider', 'originals_root_url', 'proxies_root_url', 'created_at']
        ],
        range: 'project_meta!A1:E1',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.getSheetData.mockResolvedValue(mockMetaData);

      const response = await request(app)
        .get('/api/projects/nonexistent-project')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: "Project 'nonexistent-project' not found"
      });
    });

    it('should return 404 when project_meta sheet does not exist', async () => {
      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/projects/test-project')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: "Project 'test-project' not found"
      });
    });
  });

  describe('PUT /:projectId', () => {
    it('should update project configuration successfully', async () => {
      const mockMetaData = {
        values: [
          ['project_id', 'storage_provider', 'originals_root_url', 'proxies_root_url', 'created_at'],
          ['test-project', 'gdrive', 'https://drive.google.com/folders/originals', 'https://drive.google.com/folders/proxies', '2024-01-01T00:00:00.000Z']
        ],
        range: 'project_meta!A1:E2',
        majorDimension: 'ROWS' as const
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.sheetExists.mockResolvedValue(true);
      mockSheetsClient.getSheetData.mockResolvedValue(mockMetaData);
      mockInitService.validateProjectConfig.mockReturnValue({ valid: true, errors: [] });
      mockSheetsClient.batchUpdate.mockResolvedValue({ success: true, results: [], totalUpdated: 1, conflicts: [] });

      const updateData = {
        storage_provider: 'box',
        originals_root_url: 'https://box.com/folders/new-originals'
      };

      const response = await request(app)
        .put('/api/projects/test-project')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.storage_provider).toBe('box');
      expect(response.body.data.originals_root_url).toBe('https://box.com/folders/new-originals');
      expect(response.body.message).toBe("Project 'test-project' configuration updated successfully");

      expect(mockSheetsClient.batchUpdate).toHaveBeenCalledWith({
        updates: expect.arrayContaining([
          expect.objectContaining({
            sheetName: 'project_meta',
            entityId: 'test-project',
            fieldId: 'storage_provider',
            newValue: 'box'
          }),
          expect.objectContaining({
            sheetName: 'project_meta',
            entityId: 'test-project',
            fieldId: 'originals_root_url',
            newValue: 'https://box.com/folders/new-originals'
          })
        ])
      });
    });
  });

  describe('GET /templates/list', () => {
    it('should return available project templates', async () => {
      const mockTemplates = {
        'animation_series': { storage_provider: 'gdrive' },
        'short_film': { storage_provider: 'gdrive' },
        'commercial': { storage_provider: 'box' }
      };

      mockInitService.getProjectTemplates.mockReturnValue(mockTemplates);

      const response = await request(app)
        .get('/api/projects/templates/list')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTemplates,
        message: 'Retrieved available project templates'
      });

      expect(mockInitService.getProjectTemplates).toHaveBeenCalled();
    });
  });

  describe('GET /:projectId/status', () => {
    it('should return project status successfully', async () => {
      const mockSpreadsheetInfo = {
        title: 'Test Project',
        sheetCount: 9,
        sheets: ['Shots', 'Assets', 'Tasks', 'ProjectMembers', 'Users', 'Pages', 'Fields', 'project_meta', 'Logs']
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.getSpreadsheetInfo.mockResolvedValue(mockSpreadsheetInfo);
      mockSheetsClient.getRowCount.mockImplementation((sheetName: string) => {
        const counts: { [key: string]: number } = { 'Shots': 5, 'Assets': 3, 'Tasks': 8 };
        return Promise.resolve(counts[sheetName] || 1);
      });

      const response = await request(app)
        .get('/api/projects/test-project/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project_id).toBe('test-project');
      expect(response.body.data.sheets_configured).toBe(true);
      expect(response.body.data.total_sheets).toBe(9);
      expect(response.body.data.missing_sheets).toEqual([]);
      expect(response.body.data.api_connection).toBe(true);
      expect(response.body.message).toBe("Retrieved status for project 'test-project'");
    });

    it('should detect missing sheets', async () => {
      const mockSpreadsheetInfo = {
        title: 'Incomplete Project',
        sheetCount: 5,
        sheets: ['Shots', 'Assets', 'Tasks', 'Users', 'Logs']
      };

      mockSheetsClient.validateConnection.mockResolvedValue(true);
      mockSheetsClient.getSpreadsheetInfo.mockResolvedValue(mockSpreadsheetInfo);
      mockSheetsClient.getRowCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/projects/test-project/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sheets_configured).toBe(false);
      expect(response.body.data.missing_sheets).toEqual(['ProjectMembers', 'Pages', 'Fields', 'project_meta']);
    });
  });
});