import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePageConfig } from '../usePageConfig';
import { ENTITY_KIND, PageType } from '@shared/types';
import * as pageConfigService from '../../services/pageConfigService';
import React from 'react';

// Mock the page config service
jest.mock('../../services/pageConfigService', () => ({
  pageConfigService: {
    getAllPageConfigs: jest.fn(),
    getPageConfigsByEntity: jest.fn(),
    getPageConfig: jest.fn(),
    createPageConfig: jest.fn(),
    updatePageConfig: jest.fn(),
    deletePageConfig: jest.fn(),
    sharePageConfig: jest.fn(),
    getDefaultPageConfig: jest.fn()
  }
}));

describe('usePageConfig', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockPageConfigs = [
    {
      page_id: 'page_001',
      name: 'Test Page 1',
      type: PageType.TABLE,
      config: {
        entity: ENTITY_KIND.SHOT,
        fields: ['shot_id', 'title'],
        fieldWidths: { shot_id: 100, title: 200 },
        filters: {},
        sorting: { field: 'shot_id', direction: 'asc' }
      },
      shared: true,
      created_by: 'user_001',
      created_date: new Date('2023-01-01'),
      modified_date: new Date('2023-01-01')
    },
    {
      page_id: 'page_002',
      name: 'Test Page 2',
      type: PageType.OVERVIEW,
      config: {
        entity: ENTITY_KIND.ASSET,
        fields: ['asset_id', 'name'],
        fieldWidths: { asset_id: 100, name: 200 },
        filters: {},
        sorting: { field: 'name', direction: 'asc' }
      },
      shared: false,
      created_by: 'user_001',
      created_date: new Date('2023-01-02'),
      modified_date: new Date('2023-01-02')
    }
  ];

  const defaultConfig = {
    entity: ENTITY_KIND.SHOT,
    fields: ['shot_id', 'title', 'status'],
    fieldWidths: { shot_id: 100, title: 200, status: 120 },
    filters: {},
    sorting: { field: 'shot_id', direction: 'asc' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    (pageConfigService.pageConfigService.getPageConfigsByEntity as jest.Mock).mockResolvedValue(mockPageConfigs);
    (pageConfigService.pageConfigService.getAllPageConfigs as jest.Mock).mockResolvedValue(mockPageConfigs);
    (pageConfigService.pageConfigService.getDefaultPageConfig as jest.Mock).mockReturnValue(defaultConfig);
  });

  it('loads page configurations for an entity type', async () => {
    const { result, waitFor } = renderHook(() => usePageConfig(ENTITY_KIND.SHOT), { wrapper });

    await waitFor(() => {
      expect(result.current.pageConfigs).toEqual(mockPageConfigs);
    });

    expect(pageConfigService.pageConfigService.getPageConfigsByEntity).toHaveBeenCalledWith(ENTITY_KIND.SHOT);
  });

  it('loads a specific page configuration by ID', async () => {
    (pageConfigService.pageConfigService.getPageConfig as jest.Mock).mockResolvedValue(mockPageConfigs[0]);

    const { result, waitFor } = renderHook(() => usePageConfig(EntityTypes.SHOT, 'page_001'), { wrapper });

    await waitFor(() => {
      expect(result.current.currentConfig).toEqual(mockPageConfigs[0].config);
    });

    expect(pageConfigService.pageConfigService.getPageConfig).toHaveBeenCalledWith('page_001');
  });

  it('loads default configuration when no pageId is provided', async () => {
    const { result, waitFor } = renderHook(() => usePageConfig(EntityTypes.SHOT), { wrapper });

    await waitFor(() => {
      expect(result.current.currentConfig).toEqual(defaultConfig);
    });

    expect(pageConfigService.pageConfigService.getDefaultPageConfig).toHaveBeenCalledWith(EntityTypes.SHOT);
  });

  it('updates current configuration', async () => {
    const { result } = renderHook(() => usePageConfig(EntityTypes.SHOT), { wrapper });

    // Wait for default config to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Update the configuration
    act(() => {
      result.current.updateCurrentConfig({
        fields: ['shot_id', 'title', 'status', 'priority'],
        fieldWidths: { shot_id: 120, title: 250, status: 150, priority: 100 }
      });
    });

    expect(result.current.currentConfig).toEqual({
      entity: EntityTypes.SHOT,
      fields: ['shot_id', 'title', 'status', 'priority'],
      fieldWidths: { shot_id: 120, title: 250, status: 150, priority: 100 },
      filters: {},
      sorting: { field: 'shot_id', direction: 'asc' }
    });
    expect(result.current.isConfigModified).toBe(true);
  });

  it('saves a new page configuration', async () => {
    const newPageConfig = {
      page_id: 'new_page_id',
      name: 'New Test Page',
      type: PageType.TABLE,
      config: defaultConfig,
      shared: false,
      created_by: 'user_001',
      created_date: new Date(),
      modified_date: new Date()
    };

    (pageConfigService.pageConfigService.createPageConfig as jest.Mock).mockResolvedValue(newPageConfig);

    const { result } = renderHook(() => usePageConfig(EntityTypes.SHOT), { wrapper });

    // Wait for default config to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Save the configuration
    await act(async () => {
      result.current.savePageConfig('New Test Page', PageType.TABLE, false, 'user_001');
    });

    expect(pageConfigService.pageConfigService.createPageConfig).toHaveBeenCalledWith({
      name: 'New Test Page',
      type: PageType.TABLE,
      config: defaultConfig,
      shared: false,
      created_by: 'user_001'
    });

    expect(result.current.currentPageId).toBe('new_page_id');
    expect(result.current.isConfigModified).toBe(false);
  });

  it('updates an existing page configuration', async () => {
    const updatedPageConfig = {
      ...mockPageConfigs[0],
      name: 'Updated Test Page',
      config: {
        ...mockPageConfigs[0].config,
        fields: ['shot_id', 'title', 'status', 'priority']
      },
      modified_date: new Date()
    };

    (pageConfigService.pageConfigService.getPageConfig as jest.Mock).mockResolvedValue(mockPageConfigs[0]);
    (pageConfigService.pageConfigService.updatePageConfig as jest.Mock).mockResolvedValue(updatedPageConfig);

    const { result } = renderHook(() => usePageConfig(EntityTypes.SHOT, 'page_001'), { wrapper });

    // Wait for page config to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Update the configuration
    act(() => {
      result.current.updateCurrentConfig({
        fields: ['shot_id', 'title', 'status', 'priority']
      });
    });

    // Save the updated configuration
    await act(async () => {
      result.current.savePageConfig('Updated Test Page', PageType.TABLE, true, 'user_001');
    });

    expect(pageConfigService.pageConfigService.updatePageConfig).toHaveBeenCalledWith('page_001', {
      name: 'Updated Test Page',
      type: PageType.TABLE,
      config: {
        ...mockPageConfigs[0].config,
        fields: ['shot_id', 'title', 'status', 'priority']
      },
      shared: true,
      modified_date: expect.any(Date)
    });

    expect(result.current.isConfigModified).toBe(false);
  });

  it('deletes a page configuration', async () => {
    (pageConfigService.pageConfigService.getPageConfig as jest.Mock).mockResolvedValue(mockPageConfigs[0]);
    (pageConfigService.pageConfigService.deletePageConfig as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePageConfig(EntityTypes.SHOT, 'page_001'), { wrapper });

    // Wait for page config to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Delete the configuration
    await act(async () => {
      result.current.deletePageConfig();
    });

    expect(pageConfigService.pageConfigService.deletePageConfig).toHaveBeenCalledWith('page_001');
    expect(result.current.currentPageId).toBeUndefined();
    expect(result.current.currentConfig).toBeNull();
  });

  it('shares a page configuration', async () => {
    const sharedPageConfig = {
      ...mockPageConfigs[0],
      shared: true,
      modified_date: new Date()
    };

    (pageConfigService.pageConfigService.getPageConfig as jest.Mock).mockResolvedValue(mockPageConfigs[0]);
    (pageConfigService.pageConfigService.sharePageConfig as jest.Mock).mockResolvedValue(sharedPageConfig);

    const { result } = renderHook(() => usePageConfig(EntityTypes.SHOT, 'page_001'), { wrapper });

    // Wait for page config to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Share the configuration
    await act(async () => {
      result.current.sharePageConfig(true);
    });

    expect(pageConfigService.pageConfigService.sharePageConfig).toHaveBeenCalledWith('page_001', true);
  });

  it('resets to default configuration', async () => {
    (pageConfigService.pageConfigService.getPageConfig as jest.Mock).mockResolvedValue(mockPageConfigs[0]);

    const { result } = renderHook(() => usePageConfig(EntityTypes.SHOT, 'page_001'), { wrapper });

    // Wait for page config to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Reset to default
    act(() => {
      result.current.resetToDefault();
    });

    expect(result.current.currentConfig).toEqual(defaultConfig);
    expect(result.current.isConfigModified).toBe(true);
  });
});