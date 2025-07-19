import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';
import NotificationProgress from './NotificationProgress';

export interface Notification {
  id: string;
  message: string;
  type: AlertColor;
  autoHideDuration?: number;
  progress?: number;
  showProgress?: boolean;
  action?: ReactNode;
}

interface NotificationContextType {
  // Notification actions
  showNotification: (message: string, type?: AlertColor, options?: Partial<Notification>) => string;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  dismissNotification: (id: string) => void;
  showSuccessNotification: (message: string, options?: Partial<Notification>) => string;
  showErrorNotification: (message: string, options?: Partial<Notification>) => string;
  showInfoNotification: (message: string, options?: Partial<Notification>) => string;
  showWarningNotification: (message: string, options?: Partial<Notification>) => string;
  showProgressNotification: (message: string, options?: Partial<Notification>) => string;
  updateProgressNotification: (id: string, progress: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

type TransitionProps = Omit<SlideProps, 'direction'>;

function SlideTransition(props: TransitionProps) {
  return <Slide {...props} direction="up" />;
}

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children,
  maxNotifications = 5
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((
    message: string, 
    type: AlertColor = 'info',
    options?: Partial<Notification>
  ): string => {
    const id = options?.id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification: Notification = {
      id,
      message,
      type,
      autoHideDuration: 6000,
      ...options
    };
    
    setNotifications(prev => {
      // Remove oldest notifications if we exceed the maximum
      const updatedNotifications = [...prev];
      if (updatedNotifications.length >= maxNotifications) {
        updatedNotifications.shift();
      }
      return [...updatedNotifications, notification];
    });
    
    return id;
  }, [maxNotifications]);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, ...updates } 
          : notification
      )
    );
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showSuccessNotification = useCallback((
    message: string,
    options?: Partial<Notification>
  ): string => {
    return showNotification(message, 'success', options);
  }, [showNotification]);

  const showErrorNotification = useCallback((
    message: string,
    options?: Partial<Notification>
  ): string => {
    return showNotification(message, 'error', options);
  }, [showNotification]);

  const showInfoNotification = useCallback((
    message: string,
    options?: Partial<Notification>
  ): string => {
    return showNotification(message, 'info', options);
  }, [showNotification]);

  const showWarningNotification = useCallback((
    message: string,
    options?: Partial<Notification>
  ): string => {
    return showNotification(message, 'warning', options);
  }, [showNotification]);

  const showProgressNotification = useCallback((
    message: string,
    options?: Partial<Notification>
  ): string => {
    return showNotification(message, 'info', {
      showProgress: true,
      progress: 0,
      autoHideDuration: null, // Don't auto-hide progress notifications
      ...options
    });
  }, [showNotification]);

  const updateProgressNotification = useCallback((id: string, progress: number) => {
    updateNotification(id, { 
      progress: Math.min(100, Math.max(0, progress)),
      // Auto-dismiss when complete
      autoHideDuration: progress >= 100 ? 2000 : null
    });
  }, [updateNotification]);

  const handleClose = useCallback((id: string) => {
    dismissNotification(id);
  }, [dismissNotification]);

  const value = {
    showNotification,
    updateNotification,
    dismissNotification,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showWarningNotification,
    showProgressNotification,
    updateProgressNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.autoHideDuration}
          onClose={() => handleClose(notification.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ mb: notifications.indexOf(notification) * 8 }}
        >
          <Alert 
            onClose={() => handleClose(notification.id)} 
            severity={notification.type}
            variant="filled"
            sx={{ width: '100%' }}
            action={notification.action}
          >
            {notification.message}
            {notification.showProgress && (
              <NotificationProgress 
                value={notification.progress || 0} 
                color={notification.type}
              />
            )}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;