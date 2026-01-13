import React from 'react';
import './ProgressBar.css';

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  striped?: boolean;
}

/**
 * Progress Bar component with percentage display
 * Shows progress for AI generation operations
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  variant = 'default',
  size = 'medium',
  animated = false,
  striped = false,
}: ProgressBarProps): JSX.Element {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const isIndeterminate = value < 0;

  return (
    <div className={`progress-bar progress-bar--${size}`}>
      {label && (
        <div className="progress-bar__header">
          <span className="progress-bar__label">{label}</span>
          {showPercentage && !isIndeterminate && (
            <span className="progress-bar__percentage">{Math.round(percentage)}%</span>
          )}
        </div>
      )}

      <div
        className={`progress-bar__track progress-bar__track--${variant}`}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={`progress-bar__fill ${animated ? 'progress-bar__fill--animated' : ''} ${
            striped ? 'progress-bar__fill--striped' : ''
          } ${isIndeterminate ? 'progress-bar__fill--indeterminate' : ''}`}
          style={{
            width: isIndeterminate ? '100%' : `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress indicator
 */
export interface CircularProgressProps {
  value: number; // 0-100
  size?: number; // in pixels
  strokeWidth?: number;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function CircularProgress({
  value,
  size = 60,
  strokeWidth = 4,
  label,
  variant = 'default',
}: CircularProgressProps): JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    default: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="circular-progress__svg">
        {/* Background circle */}
        <circle
          className="circular-progress__background"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <circle
          className="circular-progress__circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke={colorMap[variant]}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div className="circular-progress__content">
        {label ? (
          <span className="circular-progress__label">{label}</span>
        ) : (
          <span className="circular-progress__percentage">{Math.round(percentage)}%</span>
        )}
      </div>
    </div>
  );
}

/**
 * Multi-step progress indicator
 */
export interface Step {
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export interface StepProgressProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
}

export function StepProgress({
  steps,
  orientation = 'horizontal',
}: StepProgressProps): JSX.Element {
  return (
    <div className={`step-progress step-progress--${orientation}`}>
      {steps.map((step, index) => (
        <div key={index} className={`step-progress__step step-progress__step--${step.status}`}>
          <div className="step-progress__indicator">
            {step.status === 'completed' && <span className="step-progress__icon">✓</span>}
            {step.status === 'error' && <span className="step-progress__icon">✕</span>}
            {step.status === 'active' && (
              <span className="step-progress__spinner">
                <span className="step-progress__dot"></span>
              </span>
            )}
            {step.status === 'pending' && (
              <span className="step-progress__number">{index + 1}</span>
            )}
          </div>

          <div className="step-progress__label">{step.label}</div>

          {index < steps.length - 1 && <div className="step-progress__connector" />}
        </div>
      ))}
    </div>
  );
}
