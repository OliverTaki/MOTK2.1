import express from 'express';
import multer from 'multer';
import { fileUploadService } from '../services/files/FileUploadService';
import { fileManagementIntegrationService } from '../services/files/FileManagementIntegrationService';
import { storageManager } from '../services/storage/StorageManager';
import { EntityType, FieldType } from '../../shared/types';

const router = express.Router();

// Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Basic file validation
    if (!file.originalname || file.originalname.trim().length === 0) {
      cb(new Error('File name is required'));
      return;
    }
    
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.originalname)) {
      cb(new Error('File name contains invalid characters'));
      return;
    }
    
    cb(null, true);
  }
});

// Multer error handling middleware
const handleMulterError = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): express.Response | void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files'
      });
    }
  }
  
  if (err && err.message) {
    if (err.message.includes('invalid characters') || err.message.includes('File name')) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }
  
  return next();
};

// Upload file to entity folder
router.post(
  '/upload/:entityType/:entityId',
  upload.single('file'),
  handleMulterError,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { entityType, entityId } = req.params;
      const { fieldName } = req.query;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      // Validate entity type
      if (!['shot', 'asset', 'task', 'member', 'user'].includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type'
        });
      }

      // Validate field name if provided
      if (fieldName && !['thumbnails', 'file_list', 'versions'].includes(fieldName as string)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid field name'
        });
      }

      // Validate file upload
      fileUploadService.validateFileUpload(
        file.buffer,
        file.originalname,
        file.mimetype,
        fieldName as FieldType
      );

      // Upload the file with automatic proxy generation
      const result = await fileManagementIntegrationService.uploadFileWithProxyGeneration(
        entityType as EntityType,
        entityId,
        file.buffer,
        file.originalname,
        file.mimetype,
        fieldName as string,
        true // Generate proxy for video files
      );

      // Generate metadata for tracking
      const metadata = fileUploadService.generateFileMetadata(
        result.fileInfo,
        entityType as EntityType,
        entityId,
        fieldName as string
      );

      return res.status(201).json({
        success: true,
        data: {
          file: {
            ...result.fileInfo,
            createdAt: result.fileInfo.createdAt.toISOString(),
            modifiedAt: result.fileInfo.modifiedAt.toISOString()
          },
          metadata,
          proxyJobId: result.proxyJobId
        },
        message: result.proxyJobId ? 
          'File uploaded successfully, proxy generation queued' : 
          'File uploaded successfully'
      });
    } catch (error) {
      console.error('File upload error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed'
      });
    }
  }
);

// Upload multiple files to entity folder
router.post(
  '/upload-multiple/:entityType/:entityId',
  upload.array('files', 10),
  handleMulterError,
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { entityType, entityId } = req.params;
      const { fieldName } = req.query;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided'
        });
      }

      // Validate entity type
      if (!['shot', 'asset', 'task', 'member', 'user'].includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type'
        });
      }

      // Validate field name if provided
      if (fieldName && !['thumbnails', 'file_list', 'versions'].includes(fieldName as string)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid field name'
        });
      }

      // Prepare files for batch upload
      const filesToUpload = files.map(file => ({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype
      }));

      // Validate each file before upload
      for (const file of files) {
        fileUploadService.validateFileUpload(
          file.buffer,
          file.originalname,
          file.mimetype,
          fieldName as FieldType
        );
      }

      // Upload files with batch proxy generation
      const batchResult = await fileManagementIntegrationService.uploadMultipleFilesWithProxyGeneration(
        entityType as EntityType,
        entityId,
        filesToUpload,
        fieldName as string,
        true // Generate proxies for video files
      );

      // Format results
      const uploadResults = batchResult.uploadResults.map(result => {
        const metadata = fileUploadService.generateFileMetadata(
          result.fileInfo,
          entityType as EntityType,
          entityId,
          fieldName as string
        );

        return {
          file: {
            ...result.fileInfo,
            createdAt: result.fileInfo.createdAt.toISOString(),
            modifiedAt: result.fileInfo.modifiedAt.toISOString()
          },
          metadata,
          proxyJobId: result.proxyJobId
        };
      });

      const errors = batchResult.errors;

      return res.status(201).json({
        success: true,
        data: {
          uploaded: uploadResults,
          errors: errors.length > 0 ? errors : undefined
        },
        message: `${uploadResults.length} files uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
      });
    } catch (error) {
      console.error('Multiple file upload error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed'
      });
    }
  }
);

// Get file URL for access
router.get(
  '/url/:entityType/:entityId/:fileName',
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { entityType, entityId, fileName } = req.params;
      const { fieldName, proxy } = req.query;

      // Validate entity type
      if (!['shot', 'asset', 'task', 'member', 'user'].includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type'
        });
      }

      const fileUrl = fileUploadService.getFileUrl(
        entityType as EntityType,
        entityId,
        fileName,
        fieldName as string,
        proxy === 'true'
      );

      return res.json({
        success: true,
        data: {
          url: fileUrl,
          fileName,
          entityType,
          entityId,
          fieldName,
          isProxy: proxy === 'true'
        }
      });
    } catch (error) {
      console.error('Get file URL error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get file URL'
      });
    }
  }
);

// List files in entity folder
router.get(
  '/list/:entityType/:entityId',
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { entityType, entityId } = req.params;
      const { fieldName } = req.query;

      // Validate entity type
      if (!['shot', 'asset', 'task', 'member', 'user'].includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type'
        });
      }

      if (fieldName) {
        // List files for specific field
        const files = await fileUploadService.listFiles(
          entityType as EntityType,
          entityId,
          fieldName as string
        );

        return res.json({
          success: true,
          data: {
            files: files.map(file => ({
              ...file,
              createdAt: file.createdAt.toISOString(),
              modifiedAt: file.modifiedAt.toISOString()
            })),
            fieldName,
            count: files.length
          }
        });
      } else {
        // List all files organized by field type
        const entityFiles = await fileUploadService.getEntityFiles(
          entityType as EntityType,
          entityId
        );

        return res.json({
          success: true,
          data: {
            thumbnails: entityFiles.thumbnails.map(file => ({
              ...file,
              createdAt: file.createdAt.toISOString(),
              modifiedAt: file.modifiedAt.toISOString()
            })),
            file_list: entityFiles.file_list.map(file => ({
              ...file,
              createdAt: file.createdAt.toISOString(),
              modifiedAt: file.modifiedAt.toISOString()
            })),
            versions: entityFiles.versions.map(file => ({
              ...file,
              createdAt: file.createdAt.toISOString(),
              modifiedAt: file.modifiedAt.toISOString()
            })),
            totalCount: entityFiles.thumbnails.length + entityFiles.file_list.length + entityFiles.versions.length
          }
        });
      }
    } catch (error) {
      console.error('List files error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files'
      });
    }
  }
);

// Get file information
router.get(
  '/:entityType/:entityId/:fileName',
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { entityType, entityId, fileName } = req.params;
      const { fieldName } = req.query;

      // Validate entity type
      if (!['shot', 'asset', 'task', 'member', 'user'].includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type'
        });
      }

      const fileInfo = await fileUploadService.getFileInfo(
        entityType as EntityType,
        entityId,
        fileName,
        fieldName as string
      );

      return res.json({
        success: true,
        data: {
          ...fileInfo,
          createdAt: fileInfo.createdAt.toISOString(),
          modifiedAt: fileInfo.modifiedAt.toISOString()
        }
      });
    } catch (error) {
      console.error('Get file info error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get file info'
        });
      }
    }
  }
);

// Delete file
router.delete(
  '/:entityType/:entityId/:fileName',
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { entityType, entityId, fileName } = req.params;
      const { fieldName } = req.query;

      // Validate entity type
      if (!['shot', 'asset', 'task', 'member', 'user'].includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type'
        });
      }

      await fileUploadService.deleteFile(
        entityType as EntityType,
        entityId,
        fileName,
        fieldName as string
      );

      return res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Delete file error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete file'
        });
      }
    }
  }
);

// Archive entity folder (move to deleted)
router.post(
  '/archive/:entityType/:entityId',
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { entityType, entityId } = req.params;
      const { metadata } = req.body;

      // Validate entity type
      if (!['shot', 'asset', 'task', 'member', 'user'].includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type'
        });
      }

      await fileManagementIntegrationService.archiveEntityWithFiles(
        entityType as EntityType,
        entityId,
        metadata
      );

      return res.json({
        success: true,
        message: 'Entity folder and associated files archived successfully'
      });
    } catch (error) {
      console.error('Archive folder error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive entity folder'
      });
    }
  }
);

// Get storage status
router.get('/storage/status', async (req, res) => {
  try {
    const status = fileManagementIntegrationService.getStorageStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Get storage status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get storage status'
    });
  }
});

// Test storage connectivity
router.post('/storage/test', async (req, res) => {
  try {
    const testResult = await fileManagementIntegrationService.testStorageConnectivity();
    
    res.json({
      success: testResult.success,
      data: testResult,
      message: testResult.success ? 
        `Storage connectivity test passed for ${testResult.provider}` :
        `Storage connectivity test failed: ${testResult.error}`
    });

  } catch (error) {
    console.error('Test storage connectivity error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test storage connectivity'
    });
  }
});

// Generate proxy file
router.post(
  '/proxy/:entityType/:entityId/:fileName',
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { entityType, entityId, fileName } = req.params;
      const { take, version, immediate } = req.body;

      // Validate entity type
      if (!['shot', 'asset', 'task', 'member', 'user'].includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type'
        });
      }

      // Get original file info
      const fileInfo = await fileUploadService.getFileInfo(
        entityType as EntityType,
        entityId,
        fileName
      );

      // Check if file is a video
      if (!fileInfo.mimeType.startsWith('video/')) {
        return res.status(400).json({
          success: false,
          error: 'Proxy generation is only supported for video files'
        });
      }

      if (immediate) {
        // Generate proxy immediately (synchronous)
        const { proxyGenerationService } = await import('../services/proxy/ProxyGenerationService');
        
        const proxyInfo = await proxyGenerationService.generateProxyImmediate(
          entityType as EntityType,
          entityId,
          fileInfo,
          take,
          version
        );

        return res.json({
          success: true,
          data: proxyInfo,
          message: 'Proxy generated successfully'
        });
      } else {
        // Queue proxy generation (asynchronous)
        const { proxyGenerationService } = await import('../services/proxy/ProxyGenerationService');
        
        const jobId = await proxyGenerationService.queueProxyGeneration(
          entityType as EntityType,
          entityId,
          fileInfo,
          take,
          version
        );

        return res.json({
          success: true,
          data: {
            jobId,
            status: 'queued'
          },
          message: 'Proxy generation queued successfully'
        });
      }
    } catch (error) {
      console.error('Proxy generation error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Proxy generation failed'
      });
    }
  }
);

// Get proxy generation job status
router.get(
  '/proxy/status/:jobId',
  async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
    try {
      const { jobId } = req.params;
      
      const { proxyGenerationService } = await import('../services/proxy/ProxyGenerationService');
      const job = proxyGenerationService.getJobStatus(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      return res.json({
        success: true,
        data: {
          ...job,
          createdAt: job.createdAt.toISOString(),
          startedAt: job.startedAt?.toISOString(),
          completedAt: job.completedAt?.toISOString()
        }
      });
    } catch (error) {
      console.error('Get job status error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job status'
      });
    }
  }
);

// Get proxy generation queue status
router.get('/proxy/queue/status', async (req, res) => {
  try {
    const { proxyGenerationService } = await import('../services/proxy/ProxyGenerationService');
    const queueStatus = proxyGenerationService.getQueueStatus();

    res.json({
      success: true,
      data: queueStatus
    });

  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get queue status'
    });
  }
});

export default router;