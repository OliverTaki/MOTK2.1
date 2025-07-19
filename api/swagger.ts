import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'MOTK API Documentation',
    version: '1.0.0',
    description: 'API documentation for the Motion Toolkit (MOTK) system',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'MOTK Support',
      url: 'https://motk.example.com',
      email: 'support@motk.example.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for external integrations',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Error message',
          },
          message: {
            type: 'string',
            example: 'Detailed error message',
          },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Validation error',
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'name',
                },
                message: {
                  type: 'string',
                  example: 'Field is required',
                },
              },
            },
          },
        },
      },
      ConflictError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Conflict detected',
          },
          message: {
            type: 'string',
            example: 'Cell value has been modified by another user',
          },
          data: {
            type: 'object',
            properties: {
              currentValue: {
                type: 'string',
                example: 'Current value',
              },
              originalValue: {
                type: 'string',
                example: 'Original value',
              },
              newValue: {
                type: 'string',
                example: 'New value',
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            example: 'usr_123456',
          },
          email: {
            type: 'string',
            example: 'user@example.com',
          },
          name: {
            type: 'string',
            example: 'John Doe',
          },
          google_id: {
            type: 'string',
            example: '123456789',
          },
          avatar_url: {
            type: 'string',
            example: 'https://example.com/avatar.jpg',
          },
          created_date: {
            type: 'string',
            format: 'date-time',
          },
          last_login: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Shot: {
        type: 'object',
        properties: {
          shot_id: {
            type: 'string',
            example: 'shot_123456',
          },
          episode: {
            type: 'string',
            example: 'EP01',
          },
          scene: {
            type: 'string',
            example: 'SC05',
          },
          title: {
            type: 'string',
            example: 'Character enters room',
          },
          status: {
            type: 'string',
            enum: ['not_started', 'in_progress', 'review', 'approved', 'completed'],
            example: 'in_progress',
          },
          priority: {
            type: 'number',
            example: 5,
          },
          due_date: {
            type: 'string',
            format: 'date-time',
          },
          timecode_fps: {
            type: 'string',
            example: '00:01:25:12@24',
          },
          folder_label: {
            type: 'string',
            example: 'EP01_SC05_ENTER',
          },
          folder_url: {
            type: 'string',
            example: 'https://drive.google.com/folders/abc123',
          },
          notes: {
            type: 'string',
            example: 'Character should look tired',
          },
        },
      },
      Asset: {
        type: 'object',
        properties: {
          asset_id: {
            type: 'string',
            example: 'asset_123456',
          },
          name: {
            type: 'string',
            example: 'Main Character',
          },
          asset_type: {
            type: 'string',
            enum: ['character', 'prop', 'environment', 'effect', 'other'],
            example: 'character',
          },
          status: {
            type: 'string',
            enum: ['not_started', 'in_progress', 'review', 'approved', 'completed'],
            example: 'in_progress',
          },
          overlap_sensitive: {
            type: 'boolean',
            example: true,
          },
          folder_label: {
            type: 'string',
            example: 'CHAR_MAIN',
          },
          folder_url: {
            type: 'string',
            example: 'https://drive.google.com/folders/def456',
          },
          notes: {
            type: 'string',
            example: 'Blue shirt version',
          },
        },
      },
      Task: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            example: 'task_123456',
          },
          name: {
            type: 'string',
            example: 'Animation',
          },
          status: {
            type: 'string',
            enum: ['not_started', 'in_progress', 'blocked', 'review', 'completed'],
            example: 'in_progress',
          },
          assignee_id: {
            type: 'string',
            example: 'usr_123456',
          },
          start_date: {
            type: 'string',
            format: 'date-time',
          },
          end_date: {
            type: 'string',
            format: 'date-time',
          },
          shot_id: {
            type: 'string',
            example: 'shot_123456',
          },
          folder_label: {
            type: 'string',
            example: 'EP01_SC05_ANIM',
          },
          folder_url: {
            type: 'string',
            example: 'https://drive.google.com/folders/ghi789',
          },
          notes: {
            type: 'string',
            example: 'Focus on smooth transitions',
          },
        },
      },
      ProjectMember: {
        type: 'object',
        properties: {
          member_id: {
            type: 'string',
            example: 'member_123456',
          },
          user_id: {
            type: 'string',
            example: 'usr_123456',
          },
          role: {
            type: 'string',
            example: 'Animator',
          },
          department: {
            type: 'string',
            example: 'ANIMATION',
          },
          permissions: {
            type: 'string',
            enum: ['edit', 'view', 'admin'],
            example: 'edit',
          },
          joined_date: {
            type: 'string',
            format: 'date-time',
          },
          active: {
            type: 'boolean',
            example: true,
          },
        },
      },
      FileInfo: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'file_123456',
          },
          name: {
            type: 'string',
            example: 'animation.mp4',
          },
          size: {
            type: 'number',
            example: 1048576,
          },
          mimeType: {
            type: 'string',
            example: 'video/mp4',
          },
          path: {
            type: 'string',
            example: 'shots/shot_123456/animation.mp4',
          },
          url: {
            type: 'string',
            example: 'https://drive.google.com/file/abc123',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          modifiedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      SheetData: {
        type: 'object',
        properties: {
          headers: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['id', 'name', 'status'],
          },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
              example: {
                id: 'row_1',
                name: 'Example',
                status: 'active',
              },
            },
          },
          rowCount: {
            type: 'number',
            example: 10,
          },
        },
      },
      ProjectConfig: {
        type: 'object',
        properties: {
          project_id: {
            type: 'string',
            example: 'proj_123456',
          },
          storage_provider: {
            type: 'string',
            enum: ['gdrive', 'box'],
            example: 'gdrive',
          },
          originals_root_url: {
            type: 'string',
            example: 'https://drive.google.com/folders/originals',
          },
          proxies_root_url: {
            type: 'string',
            example: 'https://drive.google.com/folders/proxies',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      PageConfig: {
        type: 'object',
        properties: {
          page_id: {
            type: 'string',
            example: 'page_123456',
          },
          name: {
            type: 'string',
            example: 'Shot List',
          },
          type: {
            type: 'string',
            enum: [
              'table',
              'overview',
              'shot_detail',
              'asset_detail',
              'task_detail',
              'schedule',
              'chat',
              'forum',
              'member_detail',
            ],
            example: 'table',
          },
          config: {
            type: 'object',
            properties: {
              entity: {
                type: 'string',
                enum: ['shot', 'asset', 'task', 'member', 'user'],
                example: 'shot',
              },
              fields: {
                type: 'array',
                items: {
                  type: 'string',
                },
                example: ['shot_id', 'title', 'status'],
              },
              fieldWidths: {
                type: 'object',
                additionalProperties: {
                  type: 'number',
                },
                example: {
                  shot_id: 100,
                  title: 200,
                  status: 150,
                },
              },
              filters: {
                type: 'object',
                additionalProperties: true,
                example: {
                  status: 'in_progress',
                },
              },
              sorting: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'due_date',
                  },
                  direction: {
                    type: 'string',
                    enum: ['asc', 'desc'],
                    example: 'asc',
                  },
                },
              },
            },
          },
          shared: {
            type: 'boolean',
            example: true,
          },
          created_by: {
            type: 'string',
            example: 'usr_123456',
          },
          created_date: {
            type: 'string',
            format: 'date-time',
          },
          modified_date: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication information is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'User does not have permission to access the resource',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      ValidationError: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError',
            },
          },
        },
      },
      ConflictError: {
        description: 'Conflict detected during update operation',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ConflictError',
            },
          },
        },
      },
      NotFoundError: {
        description: 'The requested resource was not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Authentication and authorization endpoints',
    },
    {
      name: 'API Keys',
      description: 'API key management for external integrations',
    },
    {
      name: 'Sheets',
      description: 'Google Sheets data operations',
    },
    {
      name: 'Files',
      description: 'File upload and management',
    },
    {
      name: 'Entities',
      description: 'Entity management (shots, assets, tasks, etc.)',
    },
    {
      name: 'Projects',
      description: 'Project initialization and management',
    },
    {
      name: 'Pages',
      description: 'Page configuration and layout management',
    },
    {
      name: 'Members',
      description: 'Project member management',
    },
    {
      name: 'Logs',
      description: 'System logs and activity tracking',
    },
  ],
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  // Path to the API docs
  apis: ['./api/routes/*.ts', './api/swagger-docs/*.yaml'],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(options);

/**
 * Configure Swagger UI
 * @param app Express application
 */
export const setupSwagger = (app: Express) => {
  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('Swagger UI available at /api-docs');
};