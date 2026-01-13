import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component for graceful error handling in React
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log error to main process for debugging
    if (window.electronAPI?.logError) {
      window.electronAPI.logError({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            padding: '2rem',
            maxWidth: '800px',
            margin: '0 auto',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              background: '#fee',
              border: '2px solid #d00',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h1 style={{ color: '#d00', marginTop: 0 }}>Something went wrong</h1>
            <p style={{ marginBottom: '1rem' }}>
              The application encountered an unexpected error. You can try to continue or reload the
              page.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.5rem 1rem',
                  marginRight: '0.5rem',
                  background: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Reload Application
              </button>
            </div>

            {this.state.error && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    background: '#fff',
                    borderRadius: '4px',
                    overflow: 'auto',
                  }}
                >
                  <p style={{ fontWeight: 'bold', color: '#d00' }}>{this.state.error.message}</p>
                  <pre
                    style={{
                      fontSize: '0.85rem',
                      overflow: 'auto',
                      background: '#f5f5f5',
                      padding: '0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <p style={{ fontWeight: 'bold', marginTop: '1rem' }}>Component Stack:</p>
                      <pre
                        style={{
                          fontSize: '0.85rem',
                          overflow: 'auto',
                          background: '#f5f5f5',
                          padding: '0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
