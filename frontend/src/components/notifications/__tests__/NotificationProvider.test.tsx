import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider, useNotification } from '../NotificationProvider';

// Test component that uses the notification context
const TestComponent = () => {
  const { 
    showNotification, 
    showSuccessNotification, 
    showErrorNotification, 
    showInfoNotification,
    showWarningNotification,
    showProgressNotification,
    updateProgressNotification
  } = useNotification();
  
  const handleShowNotification = () => {
    showNotification('Test notification');
  };
  
  const handleShowSuccessNotification = () => {
    showSuccessNotification('Success notification');
  };
  
  const handleShowErrorNotification = () => {
    showErrorNotification('Error notification');
  };
  
  const handleShowInfoNotification = () => {
    showInfoNotification('Info notification');
  };
  
  const handleShowWarningNotification = () => {
    showWarningNotification('Warning notification');
  };
  
  const handleShowProgressNotification = () => {
    const id = showProgressNotification('Progress notification');
    
    // Simulate progress updates
    setTimeout(() => updateProgressNotification(id, 30), 100);
    setTimeout(() => updateProgressNotification(id, 60), 200);
    setTimeout(() => updateProgressNotification(id, 100), 300);
  };
  
  return (
    <div>
      <button onClick={handleShowNotification}>Show Notification</button>
      <button onClick={handleShowSuccessNotification}>Show Success</button>
      <button onClick={handleShowErrorNotification}>Show Error</button>
      <button onClick={handleShowInfoNotification}>Show Info</button>
      <button onClick={handleShowWarningNotification}>Show Warning</button>
      <button onClick={handleShowProgressNotification}>Show Progress</button>
    </div>
  );
};

describe('NotificationProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('provides notification context to children', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    expect(screen.getByText('Show Notification')).toBeInTheDocument();
  });

  it('shows a basic notification', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    await user.click(screen.getByText('Show Notification'));
    
    expect(screen.getByText('Test notification')).toBeInTheDocument();
    
    // Auto-hide after default duration
    jest.advanceTimersByTime(6000);
    
    await waitFor(() => {
      expect(screen.queryByText('Test notification')).not.toBeInTheDocument();
    });
  });

  it('shows different notification types', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    // Success notification
    await user.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success notification')).toBeInTheDocument();
    
    // Error notification
    await user.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error notification')).toBeInTheDocument();
    
    // Info notification
    await user.click(screen.getByText('Show Info'));
    expect(screen.getByText('Info notification')).toBeInTheDocument();
    
    // Warning notification
    await user.click(screen.getByText('Show Warning'));
    expect(screen.getByText('Warning notification')).toBeInTheDocument();
  });

  it('shows progress notification with updates', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    await user.click(screen.getByText('Show Progress'));
    
    expect(screen.getByText('Progress notification')).toBeInTheDocument();
    
    // Initial progress should be 0%
    expect(screen.getByText('0%')).toBeInTheDocument();
    
    // Update to 30%
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText('30%')).toBeInTheDocument();
    });
    
    // Update to 60%
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
    
    // Update to 100%
    jest.advanceTimersByTime(100);
    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
    
    // Auto-hide after completion
    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(screen.queryByText('Progress notification')).not.toBeInTheDocument();
    });
  });

  it('limits the number of notifications shown', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    const TestMultipleComponent = () => {
      const { showNotification } = useNotification();
      
      const handleShowMultiple = () => {
        for (let i = 1; i <= 6; i++) {
          showNotification(`Notification ${i}`);
        }
      };
      
      return (
        <button onClick={handleShowMultiple}>Show Multiple</button>
      );
    };
    
    render(
      <NotificationProvider maxNotifications={5}>
        <TestMultipleComponent />
      </NotificationProvider>
    );
    
    await user.click(screen.getByText('Show Multiple'));
    
    // Should show notifications 2-6, but not 1 (which was removed due to the limit)
    expect(screen.queryByText('Notification 1')).not.toBeInTheDocument();
    expect(screen.getByText('Notification 2')).toBeInTheDocument();
    expect(screen.getByText('Notification 3')).toBeInTheDocument();
    expect(screen.getByText('Notification 4')).toBeInTheDocument();
    expect(screen.getByText('Notification 5')).toBeInTheDocument();
    expect(screen.getByText('Notification 6')).toBeInTheDocument();
  });

  it('allows dismissing notifications manually', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    await user.click(screen.getByText('Show Notification'));
    
    expect(screen.getByText('Test notification')).toBeInTheDocument();
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Test notification')).not.toBeInTheDocument();
    });
  });
});