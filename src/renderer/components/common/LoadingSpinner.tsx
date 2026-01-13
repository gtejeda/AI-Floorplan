import React from 'react';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  submessage?: string;
  variant?: 'default' | 'primary' | 'secondary';
  fullscreen?: boolean;
}

/**
 * Reusable Loading Spinner component for AI operations
 * Displays a spinning animation with optional message
 */
export function LoadingSpinner({
  size = 'medium',
  message,
  submessage,
  variant = 'default',
  fullscreen = false,
}: LoadingSpinnerProps): JSX.Element {
  const spinnerContent = (
    <div className={`loading-spinner loading-spinner--${size} loading-spinner--${variant}`}>
      <div className="loading-spinner__animation">
        <svg className="loading-spinner__svg" viewBox="0 0 50 50">
          <circle
            className="loading-spinner__circle"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="4"
          />
        </svg>
      </div>

      {message && (
        <div className="loading-spinner__content">
          <p className="loading-spinner__message">{message}</p>
          {submessage && <p className="loading-spinner__submessage">{submessage}</p>}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return <div className="loading-spinner__fullscreen">{spinnerContent}</div>;
  }

  return spinnerContent;
}

/**
 * Loading spinner with dots animation for text
 */
export function LoadingDots({ message = 'Loading' }: { message?: string }): JSX.Element {
  return (
    <div className="loading-dots">
      <span className="loading-dots__message">{message}</span>
      <span className="loading-dots__animation">
        <span className="loading-dots__dot">.</span>
        <span className="loading-dots__dot">.</span>
        <span className="loading-dots__dot">.</span>
      </span>
    </div>
  );
}

/**
 * Inline loading indicator
 */
export function InlineLoader({ size = 'small' }: { size?: 'small' | 'medium' }): JSX.Element {
  return (
    <span className={`inline-loader inline-loader--${size}`}>
      <span className="inline-loader__dot"></span>
      <span className="inline-loader__dot"></span>
      <span className="inline-loader__dot"></span>
    </span>
  );
}
