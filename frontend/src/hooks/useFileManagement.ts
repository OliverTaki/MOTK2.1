import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileManagementService, FileUploadResult, BatchUploadResult } from '../services/FileManagementService';
import { EntityType, FileReference } from '@shared/types';

export interface UseFileManagementOptions {
  entityType: EntityType;
  entityId: string;
  fieldName?: string;
}

export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

/**
 * React hook for file management operations
 */
export function useFileManagement({ entityType, entityId, fieldName }: UseFileManagementOptions) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);

  // Query keys
  const entityFilesKey = ['entityFiles', entityType, entityId];
  const fieldFilesKey = ['fieldFiles', entityType, entityId, fieldName];
  const storageStatusKey = ['storageStatus'];
  const proxyQueueKey = ['proxyQueue'];

  // Get entity files
  const {
    data: entityFiles,
    isLoading: isLoadingEntityFiles,
    error: entityFilesError,
    refetch: refetchEntityFiles
  } = useQuery({
    queryKey: entityFilesKey,
    queryFn: () => fileManagementService.getEntityFiles(entityType, entityId),
    enabled: !fieldName // Only fetch when not filtering by field
  });

  // Get field-specific files
  const {
    data: fieldFiles,
    isLoading: isLoadingFieldFiles,
    error: fieldFilesError,
    refetch: refetchFieldFiles
  } = useQuery({
    queryKey: fieldFilesKey,
    queryFn: () => fileManagementService.listFiles(entityType, entityId, fieldName),
    enabled: !!fieldName // Only fetch when filtering by field
  });

  // Get storage status
  const {
    data: storageStatus,
    isLoading: isLoadingStorageStatus,
    error: storageStatusError
  } = useQuery({
    queryKey: storageStatusKey,
    queryFn: () => fileManagementService.getStorageStatus(),
    staleTime: 30000 // Cache for 30 seconds
  });

  // Get proxy queue status
  const {
    data: proxyQueueStatus,
    isLoading: isLoadingProxyQueue,
    error: proxyQueueError
  } = useQuery({
    queryKey: proxyQueueKey,
    queryFn: () => fileManagementService.getProxyQueueStatus(),
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 1000 // Consider stale after 1 second
  });

  // Upload single file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) => {
      return fileManagementService.uploadFile(entityType, entityId, file, fieldName, onProgress);
    },
    onSuccess: () => {
      // Invalidate and refetch file lists
      queryClient.invalidateQueries({ queryKey: entityFilesKey });
      queryClient.invalidateQueries({ queryKey: fieldFilesKey });
      queryClient.invalidateQueries({ queryKey: proxyQueueKey });
    }
  });

  // Upload multiple files mutation
  const uploadMultipleFilesMutation = useMutation({
    mutationFn: async ({ files, onProgress }: { files: File[]; onProgress?: (progress: number) => void }) => {
      return fileManagementService.uploadMultipleFiles(entityType, entityId, files, fieldName, onProgress);
    },
    onSuccess: () => {
      // Invalidate and refetch file lists
      queryClient.invalidateQueries({ queryKey: entityFilesKey });
      queryClient.invalidateQueries({ queryKey: fieldFilesKey });
      queryClient.invalidateQueries({ queryKey: proxyQueueKey });
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: (fileName: string) => {
      return fileManagementService.deleteFile(entityType, entityId, fileName, fieldName);
    },
    onSuccess: () => {
      // Invalidate and refetch file lists
      queryClient.invalidateQueries({ queryKey: entityFilesKey });
      queryClient.invalidateQueries({ queryKey: fieldFilesKey });
    }
  });

  // Generate proxy mutation
  const generateProxyMutation = useMutation({
    mutationFn: ({ fileName, options }: { fileName: string; options?: any }) => {
      return fileManagementService.generateProxy(entityType, entityId, fileName, options);
    },
    onSuccess: () => {
      // Invalidate proxy queue status
      queryClient.invalidateQueries({ queryKey: proxyQueueKey });
    }
  });

  // Archive entity mutation
  const archiveEntityMutation = useMutation({
    mutationFn: (metadata?: any) => {
      return fileManagementService.archiveEntity(entityType, entityId, metadata);
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: entityFilesKey });
      queryClient.invalidateQueries({ queryKey: fieldFilesKey });
    }
  });

  // Test storage connectivity mutation
  const testStorageMutation = useMutation({
    mutationFn: () => fileManagementService.testStorageConnectivity(),
    onSuccess: () => {
      // Invalidate storage status
      queryClient.invalidateQueries({ queryKey: storageStatusKey });
    }
  });

  // Upload files with progress tracking
  const uploadFiles = useCallback(async (files: File[]) => {
    const progressMap = new Map<string, FileUploadProgress>();
    
    // Initialize progress for each file
    files.forEach(file => {
      progressMap.set(file.name, {
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      });
    });
    
    setUploadProgress(Array.from(progressMap.values()));

    try {
      if (files.length === 1) {
        // Single file upload
        const result = await uploadFileMutation.mutateAsync({
          file: files[0],
          onProgress: (progress) => {
            const current = progressMap.get(files[0].name);
            if (current) {
              current.progress = progress;
              setUploadProgress(Array.from(progressMap.values()));
            }
          }
        });

        // Mark as completed
        const current = progressMap.get(files[0].name);
        if (current) {
          current.status = 'completed';
          current.progress = 100;
          setUploadProgress(Array.from(progressMap.values()));
        }

        return [result];
      } else {
        // Multiple file upload
        const result = await uploadMultipleFilesMutation.mutateAsync({
          files,
          onProgress: (progress) => {
            // For batch uploads, distribute progress across all files
            files.forEach(file => {
              const current = progressMap.get(file.name);
              if (current) {
                current.progress = progress;
              }
            });
            setUploadProgress(Array.from(progressMap.values()));
          }
        });

        // Mark successful uploads as completed
        result.uploaded.forEach(upload => {
          const fileName = upload.file.name;
          const current = progressMap.get(fileName);
          if (current) {
            current.status = 'completed';
            current.progress = 100;
          }
        });

        // Mark failed uploads as error
        result.errors?.forEach(error => {
          const current = progressMap.get(error.fileName);
          if (current) {
            current.status = 'error';
            current.error = error.error;
          }
        });

        setUploadProgress(Array.from(progressMap.values()));
        return result.uploaded;
      }
    } catch (error) {
      // Mark all files as error
      files.forEach(file => {
        const current = progressMap.get(file.name);
        if (current) {
          current.status = 'error';
          current.error = error instanceof Error ? error.message : 'Upload failed';
        }
      });
      setUploadProgress(Array.from(progressMap.values()));
      throw error;
    }
  }, [uploadFileMutation, uploadMultipleFilesMutation]);

  // Clear upload progress
  const clearUploadProgress = useCallback(() => {
    setUploadProgress([]);
  }, []);

  return {
    // Data
    entityFiles,
    fieldFiles,
    storageStatus,
    proxyQueueStatus,
    uploadProgress,

    // Loading states
    isLoadingEntityFiles,
    isLoadingFieldFiles,
    isLoadingStorageStatus,
    isLoadingProxyQueue,
    isUploading: uploadFileMutation.isPending || uploadMultipleFilesMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    isGeneratingProxy: generateProxyMutation.isPending,
    isArchiving: archiveEntityMutation.isPending,
    isTestingStorage: testStorageMutation.isPending,

    // Errors
    entityFilesError,
    fieldFilesError,
    storageStatusError,
    proxyQueueError,
    uploadError: uploadFileMutation.error || uploadMultipleFilesMutation.error,
    deleteError: deleteFileMutation.error,
    proxyError: generateProxyMutation.error,
    archiveError: archiveEntityMutation.error,
    storageTestError: testStorageMutation.error,

    // Actions
    uploadFiles,
    deleteFile: deleteFileMutation.mutate,
    generateProxy: generateProxyMutation.mutate,
    archiveEntity: archiveEntityMutation.mutate,
    testStorage: testStorageMutation.mutate,
    refetchEntityFiles,
    refetchFieldFiles,
    clearUploadProgress,

    // Utilities
    getFileUrl: (fileName: string, proxy = false) => 
      fileManagementService.getFileUrl(entityType, entityId, fileName, fieldName, proxy)
  };
}