import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

import App from '../App';
import theme from '../theme';
import { ENTITY_KIND } from '@shared/types';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock components that require complex setup
vi.mock('../components/file-management/FileUpload', () => ({
  default: ({ onUpload }: { onUpload: (files: File[]) => void }) => (
    <div data-testid="file-upload">
      <input
        type="file"
        data-testid="file-input"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onUpload(files);
        }}
      />
    </div>
  )
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Frontend End-to-End Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });

    // Setup default axios mocks
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  function setupDefaultMocks() {
    // Mock authentication check
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          data: {
            success: true,
            user: {
              user_id: 'test_user_001',
              email: 'test@example.com',
              name: 'Test User'
            }
          }
        });
      }

      // Mock sheets data
      if (url.includes('/sheets/')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              values: [
                ['shot_id', 'title', 'episode', 'scene', 'status', 'priority'],
                ['shot_001', 'Opening Scene', 'E01', 'S01', 'in_progress', '1'],
                ['shot_002', 'Action Sequence', 'E01', 'S02', 'completed', '2']
              ]
            }
          }
        });
      }

      // Mock entity lists
      if (url.includes('/entities/')) {
        const entityType = url.split('/entities/')[1];
        return Promise.resolve({
          data: {
            success: true,
            data: mockEntityData(entityType),
            total: 2,
            offset: 0,
            limit: 100
          }
        });
      }

      return Promise.reject(new Error('Unmocked GET request'));
    });

    // Mock POST requests
    mockedAxios.post.mockImplementation((url, data) => {
      if (url.includes('/entities/')) {
        return Promise.resolve({
          data: {
            success: true,
            data: { ...data, id: `${data.entityType}_${Date.now()}` }
          }
        });
      }

      if (url.includes('/sheets/') && url.includes('/cell')) {
        return Promise.resolve({
          data: {
            success: true,
            updatedRange: 'A1:B1',
            updatedRows: 1
          }
        });
      }

      return Promise.reject(new Error('Unmocked POST request'));
    });

    // Mock PUT requests
    mockedAxios.put.mockImplementation((url, data) => {
      if (url.includes('/entities/')) {
        return Promise.resolve({
          data: {
            success: true,
            data: { ...data }
          }
        });
      }

      if (url.includes('/sheets/') && url.includes('/cell')) {
        return Promise.resolve({
          data: {
            success: true,
            updatedRange: 'A1:B1',
            updatedRows: 1
          }
        });
      }

      return Promise.reject(new Error('Unmocked PUT request'));
    });

    // Mock DELETE requests
    mockedAxios.delete.mockImplementation((url) => {
      return Promise.resolve({
        data: {
          success: true
        }
      });
    });
  }

  function mockEntityData(entityType: string) {
    switch (entityType) {
      case ENTITY_KIND.SHOT:
        return [
          {
            shot_id: 'shot_001',
            title: 'Opening Scene',
            episode: 'E01',
            scene: 'S01',
            status: 'in_progress',
            priority: 1
          },
          {
            shot_id: 'shot_002',
            title: 'Action Sequence',
            episode: 'E01',
            scene: 'S02',
            status: 'completed',
            priority: 2
          }
        ];
      case ENTITY_KIND.ASSET:
        return [
          {
            asset_id: 'asset_001',
            name: 'Main Character',
            asset_type: 'character',
            status: 'approved'
          }
        ];
      case ENTITY_KIND.TASK:
        return [
          {
            task_id: 'task_001',
            name: 'Animation',
            status: 'assigned',
            assignee_id: 'member_001',
            shot_id: 'shot_001'
          }
        ];
      default:
        return [];
    }
  }

  describe('Complete User Workflows', () => {
    it('should complete a full project creation and entity management workflow', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText(/MOTK/i)).toBeInTheDocument();
      });

      // Navigate to shots view
      const shotsNavItem = screen.getByText(/shots/i);
      await user.click(shotsNavItem);

      // Wait for shots data to load
      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
        expect(screen.getByText('Action Sequence')).toBeInTheDocument();
      });

      // Create new shot
      const createButton = screen.getByText(/create shot/i);
      await user.click(createButton);

      // Fill out shot form
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'New Test Shot');

      const episodeInput = screen.getByLabelText(/episode/i);
      await user.type(episodeInput, 'E01');

      const sceneInput = screen.getByLabelText(/scene/i);
      await user.type(sceneInput, 'S03');

      // Submit form
      const submitButton = screen.getByText(/save/i);
      await user.click(submitButton);

      // Verify shot was created
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/entities/shot'),
          expect.objectContaining({
            title: 'New Test Shot',
            episode: 'E01',
            scene: 'S03'
          })
        );
      });
    });

    it('should handle real-time collaborative editing with conflict resolution', async () => {
      const user = userEvent.setup();

      // Mock conflict scenario
      mockedAxios.put.mockImplementationOnce(() => 
        Promise.resolve({
          data: {
            success: false,
            conflict: true,
            currentValue: 'Modified by another user'
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to shots and wait for data
      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      });

      // Edit a cell
      const titleCell = screen.getByText('Opening Scene');
      await user.dblClick(titleCell);

      // Modify the value
      const editInput = screen.getByDisplayValue('Opening Scene');
      await user.clear(editInput);
      await user.type(editInput, 'Modified Opening Scene');

      // Save changes (will trigger conflict)
      await user.keyboard('{Enter}');

      // Verify conflict dialog appears
      await waitFor(() => {
        expect(screen.getByText(/conflict detected/i)).toBeInTheDocument();
        expect(screen.getByText('Modified by another user')).toBeInTheDocument();
      });

      // Choose to overwrite
      const overwriteButton = screen.getByText(/overwrite/i);
      
      // Mock successful force update
      mockedAxios.put.mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            success: true,
            updatedRange: 'B2',
            updatedRows: 1
          }
        })
      );

      await user.click(overwriteButton);

      // Verify force update was called
      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith(
          expect.stringContaining('/sheets/'),
          expect.objectContaining({
            force: true
          })
        );
      });
    });

    it('should complete file upload and management workflow', async () => {
      const user = userEvent.setup();

      // Mock file upload response
      mockedAxios.post.mockImplementation((url) => {
        if (url.includes('/files/upload/')) {
          return Promise.resolve({
            data: {
              success: true,
              file: {
                id: 'file_001',
                name: 'test-image.jpg',
                size: 1024,
                url: 'https://example.com/file_001'
              }
            }
          });
        }
        return Promise.reject(new Error('Unmocked POST'));
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to shots
      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      });

      // Open file management for a shot
      const fileManagementButton = screen.getByTestId('file-management-shot_001');
      await user.click(fileManagementButton);

      // Upload a file
      const fileUpload = screen.getByTestId('file-upload');
      expect(fileUpload).toBeInTheDocument();

      const fileInput = screen.getByTestId('file-input');
      const testFile = new File(['test content'], 'test-image.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, testFile);

      // Verify file upload was initiated
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/files/upload/shot/shot_001'),
          expect.any(FormData)
        );
      });
    });

    it('should handle entity linking and relationship management', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to tasks view
      const tasksNavItem = screen.getByText(/tasks/i);
      await user.click(tasksNavItem);

      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Animation')).toBeInTheDocument();
      });

      // Create new task
      const createTaskButton = screen.getByText(/create task/i);
      await user.click(createTaskButton);

      // Fill task form
      const taskNameInput = screen.getByLabelText(/name/i);
      await user.type(taskNameInput, 'New Animation Task');

      // Link to shot
      const shotLinkSelect = screen.getByLabelText(/shot/i);
      await user.click(shotLinkSelect);
      
      const shotOption = screen.getByText('Opening Scene');
      await user.click(shotOption);

      // Submit task
      const submitButton = screen.getByText(/save/i);
      await user.click(submitButton);

      // Verify task creation with shot link
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/entities/task'),
          expect.objectContaining({
            name: 'New Animation Task',
            shot_id: 'shot_001'
          })
        );
      });
    });
  });

  describe('Performance and User Experience', () => {
    it('should load and render large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        shot_id: `shot_${i.toString().padStart(4, '0')}`,
        title: `Test Shot ${i}`,
        episode: `E${Math.floor(i / 100) + 1}`,
        scene: `S${(i % 100) + 1}`,
        status: i % 2 === 0 ? 'in_progress' : 'completed',
        priority: (i % 5) + 1
      }));

      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/entities/shot')) {
          return Promise.resolve({
            data: {
              success: true,
              data: largeDataset.slice(0, 100), // Paginated
              total: 1000,
              offset: 0,
              limit: 100
            }
          });
        }
        return Promise.reject(new Error('Unmocked GET'));
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test Shot 0')).toBeInTheDocument();
      }, { timeout: 5000 });

      const loadTime = performance.now() - startTime;

      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);

      // Verify pagination info is displayed
      expect(screen.getByText(/1000 total/i)).toBeInTheDocument();
    });

    it('should handle optimistic updates and rollback on errors', async () => {
      const user = userEvent.setup();

      // Mock initial success then failure
      let callCount = 0;
      mockedAxios.put.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call succeeds (optimistic update)
          return Promise.resolve({
            data: {
              success: true,
              updatedRange: 'B2',
              updatedRows: 1
            }
          });
        } else {
          // Subsequent calls fail
          return Promise.reject(new Error('Network error'));
        }
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      });

      // Edit cell
      const titleCell = screen.getByText('Opening Scene');
      await user.dblClick(titleCell);

      const editInput = screen.getByDisplayValue('Opening Scene');
      await user.clear(editInput);
      await user.type(editInput, 'Failed Update');
      await user.keyboard('{Enter}');

      // Should show optimistic update initially
      expect(screen.getByText('Failed Update')).toBeInTheDocument();

      // Then rollback on error
      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
        expect(screen.queryByText('Failed Update')).not.toBeInTheDocument();
      });

      // Error message should be displayed
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should provide responsive design for different screen sizes', async () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      window.dispatchEvent(new Event('resize'));

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/MOTK/i)).toBeInTheDocument();
      });

      // Mobile navigation should be collapsed
      const mobileMenuButton = screen.getByLabelText(/menu/i);
      expect(mobileMenuButton).toBeInTheDocument();

      // Test tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 768,
      });
      window.dispatchEvent(new Event('resize'));

      // Should adapt to tablet layout
      await waitFor(() => {
        // Verify responsive behavior
        const container = screen.getByTestId('main-container');
        expect(container).toHaveStyle({ maxWidth: expect.any(String) });
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });

      // Should provide retry option
      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeInTheDocument();

      // Mock successful retry
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockEntityData(ENTITY_KIND.SHOT)
        }
      });

      await userEvent.click(retryButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      });
    });

    it('should handle authentication errors and redirect to login', async () => {
      // Mock 401 error
      mockedAxios.get.mockRejectedValue({
        response: { status: 401 }
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText(/login/i)).toBeInTheDocument();
      });
    });

    it('should handle validation errors in forms', async () => {
      const user = userEvent.setup();

      // Mock validation error
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            success: false,
            error: 'Validation failed: title is required'
          }
        }
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      });

      // Try to create shot without required fields
      const createButton = screen.getByText(/create shot/i);
      await user.click(createButton);

      const submitButton = screen.getByText(/save/i);
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and Usability', () => {
    it('should be keyboard navigable', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      });

      // Test tab navigation
      const firstFocusableElement = screen.getByRole('button', { name: /create/i });
      firstFocusableElement.focus();

      // Should be able to navigate with keyboard
      await userEvent.keyboard('{Tab}');
      
      const nextElement = document.activeElement;
      expect(nextElement).not.toBe(firstFocusableElement);
    });

    it('should have proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      });

      // Check for proper ARIA attributes
      const dataGrid = screen.getByRole('grid');
      expect(dataGrid).toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should support screen readers', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Opening Scene')).toBeInTheDocument();
      });

      // Check for screen reader friendly content
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // Check for proper table structure
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);
    });
  });
});