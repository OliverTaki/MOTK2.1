import { Request, Response, NextFunction } from 'express';
import { validateRequest, ValidationSchemas } from '../validation';
import Joi from 'joi';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('validateRequest', () => {
    it('should pass validation with valid data', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required()
      });

      mockRequest.body = {
        name: 'John Doe',
        age: 30
      };

      const middleware = validateRequest(schema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid data', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required()
      });

      mockRequest.body = {
        name: '', // Invalid: empty string
        age: 'not a number' // Invalid: not a number
      };

      const middleware = validateRequest(schema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String)
          })
        ])
      });
    });

    it('should validate query parameters', () => {
      const schema = Joi.object({
        limit: Joi.number().min(1).max(100),
        offset: Joi.number().min(0)
      });

      mockRequest.query = {
        limit: '50',
        offset: '10'
      };

      const middleware = validateRequest(schema, 'query');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate path parameters', () => {
      const schema = Joi.object({
        id: Joi.string().required()
      });

      mockRequest.params = {
        id: 'shot_123456'
      };

      const middleware = validateRequest(schema, 'params');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('ValidationSchemas', () => {
    describe('auth schemas', () => {
      it('should validate refresh token request', () => {
        const validData = { refreshToken: 'valid_token_123' };
        const { error } = ValidationSchemas.auth.refresh.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {};
        const { error: invalidError } = ValidationSchemas.auth.refresh.validate(invalidData);
        expect(invalidError).toBeDefined();
      });
    });

    describe('entity schemas', () => {
      it('should validate entity ID parameter', () => {
        const validData = { id: 'shot_123456' };
        const { error } = ValidationSchemas.entity.id.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {};
        const { error: invalidError } = ValidationSchemas.entity.id.validate(invalidData);
        expect(invalidError).toBeDefined();
      });

      it('should validate entity type parameter', () => {
        const validData = { type: 'shot' };
        const { error } = ValidationSchemas.entity.type.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = { type: 'invalid_type' };
        const { error: invalidError } = ValidationSchemas.entity.type.validate(invalidData);
        expect(invalidError).toBeDefined();
      });

      it('should validate shot creation data', () => {
        const validData = {
          title: 'Test Shot',
          status: 'not_started',
          priority: 5,
          due_date: '2025-12-31T23:59:59.000Z'
        };
        const { error } = ValidationSchemas.entity.create.shot.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          title: '', // Invalid: empty title
          status: 'invalid_status' // Invalid: not in enum
        };
        const { error: invalidError } = ValidationSchemas.entity.create.shot.validate(invalidData);
        expect(invalidError).toBeDefined();
      });

      it('should validate asset creation data', () => {
        const validData = {
          name: 'Test Asset',
          asset_type: 'character',
          status: 'in_progress',
          overlap_sensitive: true
        };
        const { error } = ValidationSchemas.entity.create.asset.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          name: '', // Invalid: empty name
          asset_type: 'invalid_type' // Invalid: not in enum
        };
        const { error: invalidError } = ValidationSchemas.entity.create.asset.validate(invalidData);
        expect(invalidError).toBeDefined();
      });

      it('should validate task creation data', () => {
        const validData = {
          name: 'Animation Task',
          status: 'not_started',
          assignee_id: 'usr_123456',
          start_date: '2025-01-01T00:00:00.000Z',
          end_date: '2025-01-31T23:59:59.000Z'
        };
        const { error } = ValidationSchemas.entity.create.task.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          name: '', // Invalid: empty name
          status: 'invalid_status' // Invalid: not in enum
        };
        const { error: invalidError } = ValidationSchemas.entity.create.task.validate(invalidData);
        expect(invalidError).toBeDefined();
      });
    });

    describe('sheet schemas', () => {
      it('should validate sheet name parameter', () => {
        const validData = { sheetName: 'Shots' };
        const { error } = ValidationSchemas.sheet.name.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = { sheetName: 'Invalid@Sheet#Name!' };
        const { error: invalidError } = ValidationSchemas.sheet.name.validate(invalidData);
        expect(invalidError).toBeDefined();
      });

      it('should validate sheet creation data', () => {
        const validData = {
          sheetName: 'CustomSheet',
          headers: ['id', 'name', 'status']
        };
        const { error } = ValidationSchemas.sheet.create.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          sheetName: 'Valid Sheet',
          headers: [] // Invalid: empty headers array
        };
        const { error: invalidError } = ValidationSchemas.sheet.create.validate(invalidData);
        expect(invalidError).toBeDefined();
      });

      it('should validate cell update data', () => {
        const validData = {
          entityId: 'shot_123456',
          fieldId: 'status',
          originalValue: 'not_started',
          newValue: 'in_progress',
          force: false
        };
        const { error } = ValidationSchemas.sheet.cellUpdate.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          entityId: '', // Invalid: empty entity ID
          fieldId: 'status'
          // Missing newValue
        };
        const { error: invalidError } = ValidationSchemas.sheet.cellUpdate.validate(invalidData);
        expect(invalidError).toBeDefined();
      });

      it('should validate batch update data', () => {
        const validData = {
          updates: [
            {
              entityId: 'shot_123456',
              fieldId: 'status',
              newValue: 'in_progress'
            },
            {
              entityId: 'shot_789012',
              fieldId: 'priority',
              newValue: 5
            }
          ]
        };
        const { error } = ValidationSchemas.sheet.batchUpdate.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          updates: [] // Invalid: empty updates array
        };
        const { error: invalidError } = ValidationSchemas.sheet.batchUpdate.validate(invalidData);
        expect(invalidError).toBeDefined();
      });
    });

    describe('file schemas', () => {
      it('should validate entity parameters for file operations', () => {
        const validData = {
          entityType: 'shot',
          entityId: 'shot_123456'
        };
        const { error } = ValidationSchemas.file.entityParams.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          entityType: 'invalid_type',
          entityId: ''
        };
        const { error: invalidError } = ValidationSchemas.file.entityParams.validate(invalidData);
        expect(invalidError).toBeDefined();
      });

      it('should validate file parameters', () => {
        const validData = {
          entityType: 'asset',
          entityId: 'asset_123456',
          fileName: 'character_model.fbx'
        };
        const { error } = ValidationSchemas.file.fileParams.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          entityType: 'invalid_type',
          entityId: '',
          fileName: ''
        };
        const { error: invalidError } = ValidationSchemas.file.fileParams.validate(invalidData);
        expect(invalidError).toBeDefined();
      });

      it('should validate field query parameters', () => {
        const validData = { fieldName: 'thumbnails' };
        const { error } = ValidationSchemas.file.fieldQuery.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = { fieldName: 'invalid_field' };
        const { error: invalidError } = ValidationSchemas.file.fieldQuery.validate(invalidData);
        expect(invalidError).toBeDefined();
      });
    });

    describe('project schemas', () => {
      it('should validate project creation data', () => {
        const validData = {
          project_id: 'proj_123456',
          storage_provider: 'gdrive',
          originals_root_url: 'https://drive.google.com/folders/originals',
          proxies_root_url: 'https://drive.google.com/folders/proxies'
        };
        const { error } = ValidationSchemas.project.create.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          project_id: '',
          storage_provider: 'invalid_provider',
          originals_root_url: 'not_a_url',
          proxies_root_url: 'not_a_url'
        };
        const { error: invalidError } = ValidationSchemas.project.create.validate(invalidData);
        expect(invalidError).toBeDefined();
      });
    });

    describe('page schemas', () => {
      it('should validate page creation data', () => {
        const validData = {
          name: 'Shot List',
          type: 'table',
          config: {
            entity: 'shot',
            fields: ['shot_id', 'title', 'status'],
            fieldWidths: { shot_id: 100, title: 200 },
            filters: { status: 'in_progress' },
            sorting: { field: 'due_date', direction: 'asc' }
          },
          shared: true
        };
        const { error } = ValidationSchemas.page.create.validate(validData);
        expect(error).toBeUndefined();

        const invalidData = {
          name: '',
          type: 'invalid_type',
          config: {} // Missing required config properties
        };
        const { error: invalidError } = ValidationSchemas.page.create.validate(invalidData);
        expect(invalidError).toBeDefined();
      });
    });
  });
});