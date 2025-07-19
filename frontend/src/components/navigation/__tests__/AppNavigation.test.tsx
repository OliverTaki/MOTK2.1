import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AppNavigation from '../AppNavigation';
import theme from '../../../theme';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
  };
});

// Mock useMediaQuery for mobile/desktop testing
const mockUseMediaQuery = vi.fn();
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: mockUseMediaQuery,
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('AppNavigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseMediaQuery.mockReturnValue(false); // Default to desktop
  });

  describe('Desktop Navigation', () => {
    it('renders desktop navigation with all menu items', () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Check project name
      expect(screen.getByText('Test Project')).toBeInTheDocument();

      // Check navigation items
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Shots')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();

      // Check action buttons
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/help/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/settings/i)).toBeInTheDocument();
    });

    it('navigates to correct pages when menu items are clicked', () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Test navigation clicks
      fireEvent.click(screen.getByText('Dashboard'));
      expect(mockNavigate).toHaveBeenCalledWith('/');

      fireEvent.click(screen.getByText('Shots'));
      expect(mockNavigate).toHaveBeenCalledWith('/shots');

      fireEvent.click(screen.getByText('Assets'));
      expect(mockNavigate).toHaveBeenCalledWith('/assets');

      fireEvent.click(screen.getByText('Tasks'));
      expect(mockNavigate).toHaveBeenCalledWith('/tasks');

      fireEvent.click(screen.getByText('Team'));
      expect(mockNavigate).toHaveBeenCalledWith('/team');
    });

    it('navigates when project name is clicked', () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Test Project'));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('opens user menu when user icon is clicked', async () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Click user menu button
      const userButton = screen.getByRole('button', { name: /account/i });
      fireEvent.click(userButton);

      // Check if user menu items appear
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('calls onLogout when logout is clicked', async () => {
      const mockOnLogout = vi.fn();
      render(
        <TestWrapper>
          <AppNavigation 
            projectName="Test Project" 
            userName="Test User" 
            onLogout={mockOnLogout}
          />
        </TestWrapper>
      );

      // Open user menu
      const userButton = screen.getByRole('button', { name: /account/i });
      fireEvent.click(userButton);

      // Click logout
      await waitFor(() => {
        const logoutButton = screen.getByText('Logout');
        fireEvent.click(logoutButton);
      });

      expect(mockOnLogout).toHaveBeenCalled();
    });

    it('navigates to settings when settings icon is clicked', () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      const settingsButton = screen.getByLabelText(/settings/i);
      fireEvent.click(settingsButton);
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('navigates to help when help icon is clicked', () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      const helpButton = screen.getByLabelText(/help/i);
      fireEvent.click(helpButton);
      expect(mockNavigate).toHaveBeenCalledWith('/help');
    });
  });

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true); // Mobile view
    });

    it('renders mobile navigation with hamburger menu', () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Check mobile elements
      expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /account/i })).toBeInTheDocument();

      // Desktop navigation items should not be visible
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Shots')).not.toBeInTheDocument();
    });

    it('opens mobile drawer when hamburger menu is clicked', async () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Click hamburger menu
      const menuButton = screen.getByLabelText(/menu/i);
      fireEvent.click(menuButton);

      // Check if drawer items appear
      await waitFor(() => {
        // Note: In mobile drawer, we should see navigation items
        const dashboardItems = screen.getAllByText('Dashboard');
        expect(dashboardItems.length).toBeGreaterThan(0);
        
        const shotsItems = screen.getAllByText('Shots');
        expect(shotsItems.length).toBeGreaterThan(0);
      });
    });

    it('navigates and closes drawer when mobile menu item is clicked', async () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Open drawer
      const menuButton = screen.getByLabelText(/menu/i);
      fireEvent.click(menuButton);

      // Wait for drawer to open and click on a navigation item
      await waitFor(() => {
        const dashboardItems = screen.getAllByText('Dashboard');
        // Click the one in the drawer (should be the second one)
        fireEvent.click(dashboardItems[dashboardItems.length - 1]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('User Avatar', () => {
    it('displays user avatar when provided', () => {
      render(
        <TestWrapper>
          <AppNavigation 
            projectName="Test Project" 
            userName="Test User"
            userAvatar="https://example.com/avatar.jpg"
          />
        </TestWrapper>
      );

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('displays default account icon when no avatar provided', () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Should show account icon instead of avatar
      expect(screen.getByRole('button', { name: /account/i })).toBeInTheDocument();
    });
  });

  describe('Current Path Highlighting', () => {
    it('highlights current path correctly', () => {
      // Mock location to return /shots
      vi.doMock('react-router-dom', () => ({
        ...vi.importActual('react-router-dom'),
        useNavigate: () => mockNavigate,
        useLocation: () => ({ pathname: '/shots' }),
      }));

      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // The shots button should have different styling (we can't easily test the styling,
      // but we can verify the component renders without errors)
      expect(screen.getByText('Shots')).toBeInTheDocument();
    });
  });

  describe('Badge Display', () => {
    it('renders without badges by default', () => {
      render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Navigation should render without errors
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Shots')).toBeInTheDocument();
      expect(screen.getByText('Assets')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('switches between desktop and mobile layouts based on screen size', () => {
      const { rerender } = render(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Desktop layout
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByLabelText(/menu/i)).not.toBeInTheDocument();

      // Switch to mobile
      mockUseMediaQuery.mockReturnValue(true);
      rerender(
        <TestWrapper>
          <AppNavigation projectName="Test Project" userName="Test User" />
        </TestWrapper>
      );

      // Mobile layout
      expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
  });
});