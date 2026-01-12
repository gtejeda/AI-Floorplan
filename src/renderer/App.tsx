/**
 * Main React App Component
 * Micro Villas Investment Platform
 */

import React from 'react';
import { RouterProvider } from './router';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { LoadingProvider } from './context/LoadingContext';
import { useKeyboardShortcuts, globalShortcuts } from './hooks/useKeyboardShortcuts';

const App: React.FC = () => {
  // Register global keyboard shortcuts
  useKeyboardShortcuts(globalShortcuts);

  return (
    <ErrorBoundary>
      <LoadingProvider>
        <div className="app">
          <RouterProvider />
        </div>
      </LoadingProvider>
    </ErrorBoundary>
  );
};

export default App;
