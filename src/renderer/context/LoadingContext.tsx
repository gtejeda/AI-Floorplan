import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner/LoadingSpinner';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

/**
 * Global loading state provider
 * Manages app-wide loading indicators for IPC operations
 */
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const setLoading = (loading: boolean, message: string = 'Loading...') => {
    setIsLoading(loading);
    setLoadingMessage(message);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, setLoading }}>
      {children}
      {isLoading && <LoadingSpinner size="large" message={loadingMessage} overlay={true} />}
    </LoadingContext.Provider>
  );
};

/**
 * Hook to access loading state
 * @example
 * const { setLoading } = useLoading();
 * setLoading(true, 'Calculating subdivisions...');
 * await window.electronAPI.calculateSubdivisions(parcelId);
 * setLoading(false);
 */
export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

export default LoadingProvider;
