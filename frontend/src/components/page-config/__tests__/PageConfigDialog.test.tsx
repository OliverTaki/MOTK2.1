import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageConfigDialog } from '../PageConfigDialog';
import { EntityType, PageType } from '@shared/types';
import * as pageConfigService from '../../../services/pageConfigService';

// Mock the page config service
jest.mock('../../../services/pageConfigService', () => ({
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

// Mock the sub-components
jest.mock('../FieldsConfigPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="fields-config-panel">Fields Config Panel</div>
}));

jest.mock('../FiltersConfigPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="filters-config-panel">Filters Config Panel</div>
}));

jest.mock('../SortingConfigPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="sorting-config-panel">Sorting Config Panel</div>
}));

describe('PageConfigDialog', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockPageConfigs = [
    {
      page_id: 'page_001',
      name: 'Test Page 1',
      type: PageType.TABLE,
      config: {
        entity: EntityType.SHOT,
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
        entity: EntityType.ASSET,
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

  beforeEach(() => {
    jest.clearAllMocks();
    (pageConfigService.pageConfigService.getPageConfigsByEntity as jest.Mock).mockResolvedValue(mockPageConfigs);
    (pageConfigService.pageConfigService.getDefaultPageConfig as jest.Mock).mockReturnValue({
      entity: EntityType.SHOT,
      fields: ['shot_id', 'title', 'status'],
      fieldWidths: { shot_id: 100, title: 200, status: 120 },
      filters: {},
      sorting: { field: 'shot_id', direction: 'asc' }
    });
  });

  it('renders the dialog with correct title for new page', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PageConfigDialog
          open={true}
          onClose={() => {}}
          entityType={EntityType.SHOT}
          userId="user_001"
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Create New Page Configuration')).toBeInTheDocument();
    });
  });

  it('renders the dialog with correct title for editing page', async () => {
    (pageConfigService.pageConfigService.getPageConfig as jest.Mock).mockResolvedValue(mockPageConfigs[0]);

    render(
      <QueryClientProvider client={queryClient}>
        <PageConfigDialog
          open={true}
          onClose={() => {}}
          entityType={EntityType.SHOT}
          userId="user_001"
          initialPageId="page_001"
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Page Configuration')).toBeInTheDocument();
    });
  });

  it('shows all configuration tabs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PageConfigDialog
          open={true}
          onClose={() => {}}
          entityType={EntityType.SHOT}
          userId="user_001"
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Fields')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Sorting')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PageConfigDialog
          open={true}
          onClose={() => {}}
          entityType={EntityType.SHOT}
          userId="user_001"
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('fields-config-panel')).toBeInTheDocument();
    });

    // Click on Filters tab
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByTestId('filters-config-panel')).toBeInTheDocument();

    // Click on Sorting tab
    fireEvent.click(screen.getByText('Sorting'));
    expect(screen.getByTestId('sorting-config-panel')).toBeInTheDocument();

    // Back to Fields tab
    fireEvent.click(screen.getByText('Fields'));
    expect(screen.getByTestId('fields-config-panel')).toBeInTheDocument();
  });

  it('calls save function when Save button is clicked', async () => {
    (pageConfigService.pageConfigService.createPageConfig as jest.Mock).mockResolvedValue({
      page_id: 'new_page_id',
      name: 'New Test Page',
      type: PageType.TABLE,
      config: {
        entity: EntityType.SHOT,
        fields: ['shot_id', 'title'],
        fieldWidths: { shot_id: 100, title: 200 },
        filters: {},
        sorting: { field: 'shot_id', direction: 'asc' }
      },
      shared: false,
      created_by: 'user_001',
      created_date: new Date(),
      modified_date: new Date()
    });

    const onCloseMock = jest.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <PageConfigDialog
          open={true}
          onClose={onCloseMock}
          entityType={EntityType.SHOT}
          userId="user_001"
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Page Name')).toBeInTheDocument();
    });

    // Fill in the page name
    fireEvent.change(screen.getByLabelText('Page Name'), { target: { value: 'New Test Page' } });

    // Click save button
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(pageConfigService.pageConfigService.createPageConfig).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('loads saved page configurations', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PageConfigDialog
          open={true}
          onClose={() => {}}
          entityType={EntityType.SHOT}
          userId="user_001"
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Select a saved page')).toBeInTheDocument();
    });

    // Open the dropdown
    fireEvent.mouseDown(screen.getByLabelText('Load Saved Page'));
    
    await waitFor(() => {
      expect(screen.getByText('Test Page 1 (Shared)')).toBeInTheDocument();
      expect(screen.getByText('Test Page 2 (Private)')).toBeInTheDocument();
    });
  });

  it('toggles share status correctly', async () => {
    (pageConfigService.pageConfigService.getPageConfig as jest.Mock).mockResolvedValue(mockPageConfigs[0]);
    (pageConfigService.pageConfigService.sharePageConfig as jest.Mock).mockResolvedValue({
      ...mockPageConfigs[0],
      shared: false
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PageConfigDialog
          open={true}
          onClose={() => {}}
          entityType={EntityType.SHOT}
          userId="user_001"
          initialPageId="page_001"
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Share with team')).toBeChecked();
    });

    // Toggle share status
    fireEvent.click(screen.getByLabelText('Share with team'));

    await waitFor(() => {
      expect(pageConfigService.pageConfigService.sharePageConfig).toHaveBeenCalledWith('page_001', false);
    });
  });
});