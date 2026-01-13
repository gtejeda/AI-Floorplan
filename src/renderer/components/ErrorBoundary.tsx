import React, { Component, ErrorInfo, ReactNode } from 'react';
import { parseAIError, getErrorSeverity, ErrorSeverity } from '../utils/error-messages';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  scope?: string; // e.g., "AI Features", "Subdivision Planning"
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component for AI Features
 * Catches and displays errors gracefully without crashing the entire app
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    console.error(
      `[ErrorBoundary${this.props.scope ? ` - ${this.props.scope}` : ''}]`,
      error,
      errorInfo
    );

    this.setState({
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      const errorDetails = parseAIError(this.state.error);
      const severity = getErrorSeverity(this.state.error);

      return (
        <div className="error-boundary">
          <div className={`error-boundary__content error-boundary__content--${severity}`}>
            <div className="error-boundary__icon">
              {severity === ErrorSeverity.CRITICAL && '🚨'}
              {severity === ErrorSeverity.ERROR && '❌'}
              {severity === ErrorSeverity.WARNING && '⚠️'}
              {severity === ErrorSeverity.INFO && 'ℹ️'}
            </div>

            <div className="error-boundary__message">
              <h3 className="error-boundary__title">
                {this.props.scope ? `${this.props.scope} Error` : 'Something went wrong'}
              </h3>

              <p className="error-boundary__description">{errorDetails.userMessage}</p>

              {errorDetails.suggestedAction && (
                <p className="error-boundary__action">
                  <strong>Suggested action:</strong> {errorDetails.suggestedAction}
                </p>
              )}

              <div className="error-boundary__actions">
                <button
                  className="error-boundary__button error-boundary__button--primary"
                  onClick={this.handleReset}
                >
                  Try Again
                </button>

                {process.env.NODE_ENV === 'development' && (
                  <button
                    className="error-boundary__button error-boundary__button--secondary"
                    onClick={() => {
                      console.log('Error details:', this.state.error);
                      console.log('Error info:', this.state.errorInfo);
                    }}
                  >
                    View Details
                  </button>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="error-boundary__details">
                  <summary>Technical Details (Development Only)</summary>
                  <pre className="error-boundary__stack">{this.state.error.stack}</pre>
                  <pre className="error-boundary__component-stack">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    scope?: string;
    fallback?: (error: Error, reset: () => void) => ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }
): React.FC<P> {
  return (props: P) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );
}

/**
 * Hook to use error boundary functionality
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}
