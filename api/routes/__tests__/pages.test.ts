import request from 'supertest';
import app from '../../server';
import { SheetsApiClient } from '../../services/sheets/SheetsApiClient';
import { PageType, ENTITY_KIND } from '../../../shared/types';

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test_user_id', email: 'test@example.com' };
    next();
  }
}));

// Mock the SheetsApiClient
jest.mock('../../services/sheets/SheetsApiClient');

describe('Pages API Routes', () => {
  const mockSheetsClient = SheetsApiClient as jest.MockedClass<typeof SheetsApiClient>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSheetsClient.prototype.getSheetData = jest.fn();
    mockSheetsClient.prototype.appendRows = jest.fn();
    mockSheetsClient.prototype.updateRow = jest.fn();
    mockSheetsClient.prototype.deleteRow = jest.fn();
  });

  const mockPagesData = {
    values: [
      ['page_id', 'name', 'type', 'config', 'shared', 'created_by', 'created_date', 'modified_date'],
      [
        'page_001',
        'Test Page 1',
        'table',
        JSON.stringify({
          entity: 'shot',
          fields: ['shot_id', 'title'],
          fieldWidths: { shot_id: 100, title: 200 },
          filters: {},
          sorting: { field: 'shot_id', direction: 'asc' }
        }),
        'true',
        'user_001',
        '2023-01-01T00:00:00.000Z',
        '2023-01-01T00:00:00.000Z'
      ],
      [
        'page_002',
        'Test Page 2',
        'overview',
        JSON.stringify({
          entity: 'asset',
          fields: ['asset_id', 'name'],
          fieldWidths: { asset_id: 100, name: 200 },
          filters: {},
          sorting: { field: 'name', direction: 'asc' }
        }),
        'false',
        'user_001',
        '2023-01-02T00:00:00.000Z',
        '2023-01-02T00:00:00.000Z'
      ]
    ]
  };

  describe('GET /api/pages', () => {
    it('should return all page configurations', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);

      const response = await request(app).get('/api/pages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].page_id).toBe('page_001');
      expect(response.body.data[1].page_id).toBe('page_002');
      expect(mockSheetsClient.prototype.getSheetData).toHaveBeenCalledWith('Pages');
    });

    it('should filter page configurations by entity type', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);

      const response = await request(app).get('/api/pages?entity=shot');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].page_id).toBe('page_001');
      expect(response.body.data[0].config.entity).toBe('shot');
      expect(mockSheetsClient.prototype.getSheetData).toHaveBeenCalledWith('Pages');
    });

    it('should handle empty pages data', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue({
        values: [['page_id', 'name', 'type', 'config', 'shared', 'created_by', 'created_date', 'modified_date']]
      });

      const response = await request(app).get('/api/pages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/pages/:pageId', () => {
    it('should return a specific page configuration', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);

      const response = await request(app).get('/api/pages/page_001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.page_id).toBe('page_001');
      expect(response.body.data.name).toBe('Test Page 1');
      expect(response.body.data.type).toBe('table');
      expect(response.body.data.config.entity).toBe('shot');
      expect(mockSheetsClient.prototype.getSheetData).toHaveBeenCalledWith('Pages');
    });

    it('should return 404 if page not found', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);

      const response = await request(app).get('/api/pages/nonexistent_page');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Page configuration not found');
    });
  });

  describe('POST /api/pages', () => {
    it('should create a new page configuration', async () => {
      mockSheetsClient.prototype.appendRows.mockResolvedValue({});
      
      const newPage = {
        name: 'New Test Page',
        type: PageType.TABLE,
        config: {
          entity: ENTITY_KIND.SHOT,
          fields: ['shot_id', 'title', 'status'],
          fieldWidths: { shot_id: 100, title: 200, status: 120 },
          filters: {},
          sorting: { field: 'shot_id', direction: 'asc' }
        },
        shared: true,
        created_by: 'user_001'
      };

      const response = await request(app)
        .post('/api/pages')
        .send(newPage);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Test Page');
      expect(response.body.data.type).toBe(PageType.TABLE);
      expect(response.body.data.config).toEqual(newPage.config);
      expect(response.body.data.shared).toBe(true);
      expect(response.body.data.created_by).toBe('user_001');
      expect(mockSheetsClient.prototype.appendRows).toHaveBeenCalledWith('Pages', expect.any(Array));
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/pages')
        .send({
          name: 'New Test Page',
          // Missing type, config, created_by
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('PUT /api/pages/:pageId', () => {
    it('should update an existing page configuration', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);
      mockSheetsClient.prototype.updateRow.mockResolvedValue({});
      
      const updates = {
        name: 'Updated Test Page',
        config: {
          entity: ENTITY_KIND.SHOT,
          fields: ['shot_id', 'title', 'status', 'priority'],
          fieldWidths: { shot_id: 100, title: 200, status: 120, priority: 80 },
          filters: {},
          sorting: { field: 'priority', direction: 'desc' }
        }
      };

      const response = await request(app)
        .put('/api/pages/page_001')
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test Page');
      expect(response.body.data.config.fields).toContain('priority');
      expect(response.body.data.config.sorting.field).toBe('priority');
      expect(mockSheetsClient.prototype.updateRow).toHaveBeenCalledWith('Pages', 2, expect.any(Array));
    });

    it('should return 404 if page not found', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);
      
      const response = await request(app)
        .put('/api/pages/nonexistent_page')
        .send({ name: 'Updated Test Page' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Page configuration not found');
    });
  });

  describe('DELETE /api/pages/:pageId', () => {
    it('should delete a page configuration', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);
      mockSheetsClient.prototype.deleteRow.mockResolvedValue({});
      
      const response = await request(app).delete('/api/pages/page_001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSheetsClient.prototype.deleteRow).toHaveBeenCalledWith('Pages', 2);
    });

    it('should return 404 if page not found', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);
      
      const response = await request(app).delete('/api/pages/nonexistent_page');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Page configuration not found');
    });
  });

  describe('PUT /api/pages/:pageId/share', () => {
    it('should update sharing status of a page configuration', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);
      mockSheetsClient.prototype.updateRow.mockResolvedValue({});
      
      const response = await request(app)
        .put('/api/pages/page_001/share')
        .send({ shared: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shared).toBe(false);
      expect(mockSheetsClient.prototype.updateRow).toHaveBeenCalledWith('Pages', 2, expect.any(Array));
    });

    it('should return 400 if shared parameter is missing', async () => {
      const response = await request(app)
        .put('/api/pages/page_001/share')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing shared parameter');
    });

    it('should return 404 if page not found', async () => {
      mockSheetsClient.prototype.getSheetData.mockResolvedValue(mockPagesData);
      
      const response = await request(app)
        .put('/api/pages/nonexistent_page/share')
        .send({ shared: true });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Page configuration not found');
    });
  });
});