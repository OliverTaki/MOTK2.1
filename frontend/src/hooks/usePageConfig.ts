import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageConfig, PageConfigData, EntityType, PageType } from '@shared/types';
import pageConfigService from '../services/pageConfigService';

/**
 * Custom hook for managing page configurations
 */
export function usePageConfig(entityType?: EntityType, pageId?: string) {
  const queryClient = useQueryClient();
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(pageId);
  const [currentConfig, setCurrentConfig] = useState<PageConfigData | null>(null);
  const [isConfigModified, setIsConfigModified] = useState(false);

  // Fetch all page configurations for the entity type
  const {
    data: pageConfigs,
    isLoading: isLoadingConfigs,
    error: configsError
  } = useQuery({
    queryKey: ['pageConfigs', entityType],
    queryFn: () => entityType ? pageConfigService.getPageConfigsByEntity(entityType) : pageConfigService.getAllPageConfigs(),
    enabled: !!entityType || pageId === undefined
  });

  // Fetch specific page configuration if pageId is provided
  const {
    data: specificPageConfig,
    isLoading: isLoadingSpecificConfig,
    error: specificConfigError
  } = useQuery({
    queryKey: ['pageConfig', currentPageId],
    queryFn: () => pageConfigService.getPageConfig(currentPageId!),
    enabled: !!currentPageId
  });

  // Create page configuration mutation
  const createPageMutation = useMutation({
    mutationFn: (newPageConfig: Omit<PageConfig, 'page_id' | 'created_date' | 'modified_date'>) => 
      pageConfigService.createPageConfig(newPageConfig),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pageConfigs'] });
      setCurrentPageId(data.page_id);
      setCurrentConfig(data.config);
      setIsConfigModified(false);
    }
  });

  // Update page configuration mutation
  const updatePageMutation = useMutation({
    mutationFn: ({ pageId, updates }: { pageId: string, updates: Partial<PageConfig> }) => 
      pageConfigService.updatePageConfig(pageId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pageConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['pageConfig', data.page_id] });
      setCurrentConfig(data.config);
      setIsConfigModified(false);
    }
  });

  // Delete page configuration mutation
  const deletePageMutation = useMutation({
    mutationFn: (pageId: string) => pageConfigService.deletePageConfig(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageConfigs'] });
      setCurrentPageId(undefined);
      setCurrentConfig(null);
    }
  });

  // Share page configuration mutation
  const sharePageMutation = useMutation({
    mutationFn: ({ pageId, shared }: { pageId: string, shared: boolean }) => 
      pageConfigService.sharePageConfig(pageId, shared),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pageConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['pageConfig', data.page_id] });
    }
  });

  // Load default configuration if entityType changes and no pageId is set
  useEffect(() => {
    if (entityType && !currentPageId && !currentConfig) {
      const defaultConfig = pageConfigService.getDefaultPageConfig(entityType);
      setCurrentConfig(defaultConfig);
    }
  }, [entityType, currentPageId, currentConfig]);

  // Update current config when specific page config is loaded
  useEffect(() => {
    if (specificPageConfig) {
      setCurrentConfig(specificPageConfig.config);
    }
  }, [specificPageConfig]);

  // Select a page configuration
  const selectPageConfig = useCallback((pageId: string) => {
    setCurrentPageId(pageId);
    setIsConfigModified(false);
  }, []);

  // Update current configuration (without saving)
  const updateCurrentConfig = useCallback((updates: Partial<PageConfigData>) => {
    setCurrentConfig(prev => {
      if (!prev) return updates as PageConfigData;
      return { ...prev, ...updates };
    });
    setIsConfigModified(true);
  }, []);

  // Save current configuration
  const savePageConfig = useCallback((name: string, type: PageType, shared: boolean, userId: string) => {
    if (!currentConfig) return;

    if (currentPageId) {
      // Update existing config
      updatePageMutation.mutate({
        pageId: currentPageId,
        updates: {
          name,
          type,
          config: currentConfig,
          shared,
          modified_date: new Date()
        }
      });
    } else {
      // Create new config
      createPageMutation.mutate({
        name,
        type,
        config: currentConfig,
        shared,
        created_by: userId
      });
    }
  }, [currentPageId, currentConfig, createPageMutation, updatePageMutation]);

  // Delete current configuration
  const deletePageConfig = useCallback(() => {
    if (currentPageId) {
      deletePageMutation.mutate(currentPageId);
    }
  }, [currentPageId, deletePageMutation]);

  // Share/unshare configuration
  const sharePageConfig = useCallback((shared: boolean) => {
    if (currentPageId) {
      sharePageMutation.mutate({ pageId: currentPageId, shared });
    }
  }, [currentPageId, sharePageMutation]);

  // Reset to default configuration
  const resetToDefault = useCallback(() => {
    if (entityType) {
      const defaultConfig = pageConfigService.getDefaultPageConfig(entityType);
      setCurrentConfig(defaultConfig);
      setIsConfigModified(true);
    }
  }, [entityType]);

  return {
    pageConfigs,
    currentPageId,
    currentConfig,
    isConfigModified,
    isLoading: isLoadingConfigs || isLoadingSpecificConfig,
    error: configsError || specificConfigError,
    selectPageConfig,
    updateCurrentConfig,
    savePageConfig,
    deletePageConfig,
    sharePageConfig,
    resetToDefault,
    isCreating: createPageMutation.isPending,
    isUpdating: updatePageMutation.isPending,
    isDeleting: deletePageMutation.isPending,
    isSharing: sharePageMutation.isPending
  };
}

export default usePageConfig;