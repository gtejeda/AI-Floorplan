/**
 * Retry Handler - Exponential Backoff with Jitter
 *
 * Provides retry logic for failed API calls with exponential backoff
 * and random jitter to prevent thundering herd problem.
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: (string | number)[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,       // 1 second
  maxDelayMs: 10000,       // 10 seconds max
  retryableErrors: [
    429,    // Rate limit
    500,    // Server error
    503,    // Service unavailable
    'ETIMEDOUT',
    'ECONNRESET'
  ]
};

export interface AIError {
  code: string | number;
  message: string;
  retryable: boolean;
  userMessage: string;
}

/**
 * Parses API errors into standardized AIError format
 */
export function parseAIError(error: any): AIError {
  // Gemini/OpenAI API error format
  if (error.response?.status) {
    const status = error.response.status;
    const apiMessage = error.response.data?.error?.message || 'Unknown error';

    switch (status) {
      case 429:
        return {
          code: 429,
          message: apiMessage,
          retryable: true,
          userMessage: 'Too many requests. Please wait a moment and try again.'
        };

      case 401:
        return {
          code: 401,
          message: apiMessage,
          retryable: false,
          userMessage: 'API authentication failed. Please check your API key in settings.'
        };

      case 400:
        return {
          code: 400,
          message: apiMessage,
          retryable: false,
          userMessage: 'Invalid request. Please adjust your input parameters and try again.'
        };

      case 500:
      case 503:
        return {
          code: status,
          message: apiMessage,
          retryable: true,
          userMessage: 'AI service temporarily unavailable. Retrying automatically...'
        };

      default:
        return {
          code: status,
          message: apiMessage,
          retryable: false,
          userMessage: `AI service error (${status}). Please try again later.`
        };
    }
  }

  // Network/timeout errors
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return {
      code: 'ETIMEDOUT',
      message: error.message,
      retryable: true,
      userMessage: 'Request timed out. The AI service may be slow. Retrying...'
    };
  }

  if (error.code === 'ENOTFOUND' || error.message?.includes('network')) {
    return {
      code: 'ENOTFOUND',
      message: error.message,
      retryable: false,
      userMessage: 'Network connection failed. Please check your internet connection.'
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN',
    message: error.message || String(error),
    retryable: false,
    userMessage: 'Unexpected error occurred. Please try again or contact support.'
  };
}

/**
 * Sleeps for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes operation with retry logic
 *
 * @param operation - Async function to execute
 * @param config - Retry configuration
 * @param onRetry - Optional callback for retry events
 * @returns Result of successful operation
 * @throws Error if all retries exhausted
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: AIError) => void
): Promise<T> {
  let lastError: AIError | null = null;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (rawError: any) {
      const error = parseAIError(rawError);
      lastError = error;

      // Check if error is retryable
      const isRetryable = error.retryable &&
        config.retryableErrors.includes(error.code);

      // Last attempt or non-retryable error
      if (attempt > config.maxRetries || !isRetryable) {
        throw new Error(error.userMessage);
      }

      // Calculate backoff with exponential growth + jitter
      const exponentialDelay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1),
        config.maxDelayMs
      );

      // Add random jitter (±25% of delay)
      const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
      const delayMs = Math.max(0, exponentialDelay + jitter);

      console.warn(
        `Attempt ${attempt} failed: ${error.message}. ` +
        `Retrying in ${Math.round(delayMs)}ms...`
      );

      onRetry?.(attempt, error);

      await sleep(delayMs);
    }
  }

  throw new Error(lastError?.userMessage || 'Operation failed after retries');
}

/**
 * User-friendly error messages for common error codes
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // API-specific
  '429': 'You\'ve made too many AI requests. Please wait 1 minute and try again.',
  '401': 'Your AI API key is invalid or missing. Please add a valid key in Settings > AI Configuration.',
  '400': 'The request couldn\'t be processed. Please check your land dimensions and try again.',
  '500': 'The AI service encountered an error. We\'ll retry automatically.',
  '503': 'The AI service is temporarily down. We\'ll retry automatically.',

  // Network
  'ETIMEDOUT': 'The AI request timed out. This may happen with complex calculations. Retrying...',
  'ENOTFOUND': 'Cannot reach the AI service. Please check your internet connection.',

  // Validation
  'INVALID_PLAN': 'The AI generated an invalid plan. Trying again with adjusted parameters...',
  'NO_VIABLE_LOTS': 'Your land is too small for micro-villas (minimum 1000 sqm recommended).',

  // Fallback
  'UNKNOWN': 'An unexpected error occurred. Please try again or contact support if the issue persists.'
};

/**
 * Gets user-friendly error message for error code
 */
export function getUserMessage(errorCode: string | number): string {
  return ERROR_MESSAGES[String(errorCode)] || ERROR_MESSAGES.UNKNOWN;
}
