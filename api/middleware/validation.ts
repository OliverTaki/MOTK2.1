import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Middleware factory for request validation using Joi schemas
 * @param schema Joi schema for validation
 * @param property Request property to validate ('body', 'query', 'params')
 */
export const validateRequest = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    
    if (!error) {
      next();
    } else {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors
      });
    }
  };
};

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  // Authentication schemas
  auth: {
    refresh: Joi.object({
      refreshToken: Joi.string().required()
    })
  },
  
  // Entity schemas
  entity: {
    id: Joi.object({
      id: Joi.string().required()
    }),
    type: Joi.object({
      type: Joi.string().valid('shot', 'asset', 'task', 'member', 'user').required()
    }),
    create: {
      shot: Joi.object({
        title: Joi.string().required(),
        episode: Joi.string().allow('', null),
        scene: Joi.string().allow('', null),
        status: Joi.string().valid(
          'not_started', 'in_progress', 'review', 'approved', 'completed'
        ).required(),
        priority: Joi.number().min(0).max(100).allow(null),
        due_date: Joi.date().iso().allow(null),
        timecode_fps: Joi.string().allow('', null),
        notes: Joi.string().allow('', null)
      }),
      asset: Joi.object({
        name: Joi.string().required(),
        asset_type: Joi.string().valid(
          'character', 'prop', 'environment', 'effect', 'other'
        ).required(),
        status: Joi.string().valid(
          'not_started', 'in_progress', 'review', 'approved', 'completed'
        ).allow(null),
        overlap_sensitive: Joi.boolean().allow(null),
        notes: Joi.string().allow('', null)
      }),
      task: Joi.object({
        name: Joi.string().required(),
        status: Joi.string().valid(
          'not_started', 'in_progress', 'blocked', 'review', 'completed'
        ).required(),
        assignee_id: Joi.string().allow('', null),
        start_date: Joi.date().iso().allow(null),
        end_date: Joi.date().iso().allow(null),
        shot_id: Joi.string().allow('', null),
        notes: Joi.string().allow('', null)
      })
    }
  },
  
  // Sheet schemas
  sheet: {
    name: Joi.object({
      sheetName: Joi.string().pattern(/^[a-zA-Z0-9_\s-]+$/).required()
    }),
    create: Joi.object({
      sheetName: Joi.string().pattern(/^[a-zA-Z0-9_\s-]+$/).required(),
      headers: Joi.array().items(Joi.string()).required()
    }),
    cellUpdate: Joi.object({
      entityId: Joi.string().required(),
      fieldId: Joi.string().required(),
      originalValue: Joi.any(),
      newValue: Joi.any().required(),
      force: Joi.boolean().default(false)
    }),
    batchUpdate: Joi.object({
      updates: Joi.array().items(
        Joi.object({
          entityId: Joi.string().required(),
          fieldId: Joi.string().required(),
          originalValue: Joi.any(),
          newValue: Joi.any().required(),
          force: Joi.boolean().default(false)
        })
      ).min(1).required()
    }),
    appendRows: Joi.object({
      values: Joi.array().items(Joi.array().items(Joi.any())).min(1).required()
    })
  },
  
  // File schemas
  file: {
    entityParams: Joi.object({
      entityType: Joi.string().valid('shot', 'asset', 'task', 'member', 'user').required(),
      entityId: Joi.string().required()
    }),
    fileParams: Joi.object({
      entityType: Joi.string().valid('shot', 'asset', 'task', 'member', 'user').required(),
      entityId: Joi.string().required(),
      fileName: Joi.string().required()
    }),
    fieldQuery: Joi.object({
      fieldName: Joi.string().valid('thumbnails', 'file_list', 'versions').allow(null)
    }),
    proxyQuery: Joi.object({
      proxy: Joi.boolean().default(false)
    }),
    archiveBody: Joi.object({
      metadata: Joi.object().allow(null)
    })
  },
  
  // Project schemas
  project: {
    create: Joi.object({
      project_id: Joi.string().required(),
      storage_provider: Joi.string().valid('gdrive', 'box').required(),
      originals_root_url: Joi.string().uri().required(),
      proxies_root_url: Joi.string().uri().required()
    })
  },
  
  // Page schemas
  page: {
    create: Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid(
        'table', 'overview', 'shot_detail', 'asset_detail', 'task_detail',
        'schedule', 'chat', 'forum', 'member_detail'
      ).required(),
      config: Joi.object({
        entity: Joi.string().valid('shot', 'asset', 'task', 'member', 'user'),
        fields: Joi.array().items(Joi.string()),
        fieldWidths: Joi.object(),
        filters: Joi.object(),
        sorting: Joi.object({
          field: Joi.string().required(),
          direction: Joi.string().valid('asc', 'desc').required()
        })
      }).required(),
      shared: Joi.boolean().default(false)
    })
  }
};