import React, { createContext, useContext, ReactNode } from 'react';
import { SnackbarProvider, useSnackbar, VariantType } from 'notistack';

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

const NotificationProviderContent: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();

  const showSuccess = (message: string) => {
    enqueueSnackbar(message, { variant: 'success' });
  };

  const showError = (message: string) => {
    enqueueSnackbar(message, { variant: 'error' });
  };

  const showWarning = (message: string) => {
    enqueueSnackbar(message, { variant: 'warning' });
  };

  const showInfo = (message: string) => {
    enqueueSnackbar(message, { variant: 'info' });
  };

  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  return (
    <SnackbarProvider
      maxSnack={5}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      autoHideDuration={6000}
      preventDuplicate
      classes={{
        containerRoot: 'snackbar-container-z-index-1500'
      }}
      style={{ zIndex: 1500 }}
    >
      <NotificationProviderContent>
        {children}
      </NotificationProviderContent>
    </SnackbarProvider>
  );
};

export default NotificationProvider;
