import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  overlay?: boolean;
}

/**
 * Loading spinner component for IPC operations
 * Shows visual feedback during async operations
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  overlay = false
}) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  };

  const spinner = (
    <div className={`loading-spinner ${sizeClasses[size]}`}>
      <div className="spinner-circle"></div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
