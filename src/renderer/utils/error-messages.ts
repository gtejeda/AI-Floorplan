/**
 * Standardized error messages for AI operations
 * Maps technical error codes to user-friendly messages with actionable guidance
 */

export interface AIErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  actionable: boolean;
  suggestedAction?: string;
  retryable: boolean;
}

/**
 * HTTP status code error messages
 */
const HTTP_ERROR_MESSAGES: Record<number, Omit<AIErrorDetails, 'code' | 'message'>> = {
  400: {
    userMessage:
      'The request could not be processed. Please check your land dimensions and try again.',
    actionable: true,
    suggestedAction:
      'Verify that your land parcel dimensions are valid and within acceptable ranges.',
    retryable: false,
  },
  401: {
    userMessage: 'Your AI API key is invalid or missing.',
    actionable: true,
    suggestedAction: 'Please add a valid API key in Settings > AI Configuration.',
    retryable: false,
  },
  403: {
    userMessage: 'Access to the AI service was denied.',
    actionable: true,
    suggestedAction: 'Please check your API key permissions or contact support.',
    retryable: false,
  },
  429: {
    userMessage: 'Too many AI requests. Please wait a moment and try again.',
    actionable: true,
    suggestedAction: 'Wait 1 minute before making additional requests.',
    retryable: true,
  },
  500: {
    userMessage: 'The AI service encountered an internal error.',
    actionable: false,
    suggestedAction: "We'll retry automatically. If the issue persists, please try again later.",
    retryable: true,
  },
  503: {
    userMessage: 'The AI service is temporarily unavailable.',
    actionable: false,
    suggestedAction: "We'll retry automatically. The service should be back soon.",
    retryable: true,
  },
};

/**
 * Network and timeout error messages
 */
const NETWORK_ERROR_MESSAGES: Record<string, Omit<AIErrorDetails, 'code' | 'message'>> = {
  ETIMEDOUT: {
    userMessage: 'The AI request timed out.',
    actionable: false,
    suggestedAction: "This may happen with complex calculations. We'll retry automatically.",
    retryable: true,
  },
  ENOTFOUND: {
    userMessage: 'Cannot reach the AI service.',
    actionable: true,
    suggestedAction: 'Please check your internet connection and try again.',
    retryable: false,
  },
  ECONNREFUSED: {
    userMessage: 'Connection to the AI service was refused.',
    actionable: true,
    suggestedAction: 'Please check your internet connection or firewall settings.',
    retryable: false,
  },
  ECONNRESET: {
    userMessage: 'Connection to the AI service was lost.',
    actionable: false,
    suggestedAction: "We'll retry automatically.",
    retryable: true,
  },
};

/**
 * AI-specific validation error messages
 */
const AI_VALIDATION_ERRORS: Record<string, Omit<AIErrorDetails, 'code' | 'message'>> = {
  INVALID_PLAN: {
    userMessage: 'The AI generated an invalid subdivision plan.',
    actionable: false,
    suggestedAction: 'Trying again with adjusted parameters...',
    retryable: true,
  },
  NO_VIABLE_LOTS: {
    userMessage: 'Your land is too small for viable micro-villas.',
    actionable: true,
    suggestedAction: 'Minimum 1000 sqm recommended for subdivision planning.',
    retryable: false,
  },
  LOTS_BELOW_MINIMUM: {
    userMessage: 'Some lots are below the 90 sqm minimum requirement.',
    actionable: false,
    suggestedAction: 'Regenerating plan with stricter constraints...',
    retryable: true,
  },
  AREA_MISMATCH: {
    userMessage: 'The planned area exceeds available land.',
    actionable: false,
    suggestedAction: 'Regenerating plan with corrected calculations...',
    retryable: true,
  },
  OVERLAPPING_LOTS: {
    userMessage: 'Some lots overlap in the generated plan.',
    actionable: false,
    suggestedAction: 'Regenerating plan with proper spacing...',
    retryable: true,
  },
};

/**
 * Generic error messages
 */
const GENERIC_ERRORS: Record<string, Omit<AIErrorDetails, 'code' | 'message'>> = {
  UNKNOWN: {
    userMessage: 'An unexpected error occurred.',
    actionable: true,
    suggestedAction: 'Please try again or contact support if the issue persists.',
    retryable: false,
  },
  GENERATION_FAILED: {
    userMessage: 'Failed to generate subdivision plan.',
    actionable: true,
    suggestedAction: 'Please check your inputs and try again.',
    retryable: true,
  },
  IMAGE_GENERATION_FAILED: {
    userMessage: 'Failed to generate project visualization.',
    actionable: true,
    suggestedAction: 'Please try again or adjust your plan parameters.',
    retryable: true,
  },
  SAVE_FAILED: {
    userMessage: 'Failed to save the generated plan.',
    actionable: true,
    suggestedAction: 'Please check your storage space and try again.',
    retryable: true,
  },
};

/**
 * Parse error and return standardized error details
 */
export function parseAIError(error: any): AIErrorDetails {
  // Extract error code and message
  const errorCode = error.code || error.status || error.response?.status;
  const errorMessage = error.message || error.response?.data?.error?.message || 'Unknown error';

  // HTTP status code errors
  if (typeof errorCode === 'number' && HTTP_ERROR_MESSAGES[errorCode]) {
    return {
      code: errorCode.toString(),
      message: errorMessage,
      ...HTTP_ERROR_MESSAGES[errorCode],
    };
  }

  // Network errors
  if (typeof errorCode === 'string' && NETWORK_ERROR_MESSAGES[errorCode]) {
    return {
      code: errorCode,
      message: errorMessage,
      ...NETWORK_ERROR_MESSAGES[errorCode],
    };
  }

  // AI validation errors
  if (typeof errorCode === 'string' && AI_VALIDATION_ERRORS[errorCode]) {
    return {
      code: errorCode,
      message: errorMessage,
      ...AI_VALIDATION_ERRORS[errorCode],
    };
  }

  // Generic errors
  if (typeof errorCode === 'string' && GENERIC_ERRORS[errorCode]) {
    return {
      code: errorCode,
      message: errorMessage,
      ...GENERIC_ERRORS[errorCode],
    };
  }

  // Fallback for unknown errors
  return {
    code: errorCode?.toString() || 'UNKNOWN',
    message: errorMessage,
    ...GENERIC_ERRORS.UNKNOWN,
  };
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: any): string {
  const details = parseAIError(error);
  return details.userMessage;
}

/**
 * Get suggested action for error
 */
export function getSuggestedAction(error: any): string | undefined {
  const details = parseAIError(error);
  return details.suggestedAction;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const details = parseAIError(error);
  return details.retryable;
}

/**
 * Format error for display with action
 */
export function formatErrorWithAction(error: any): { message: string; action?: string } {
  const details = parseAIError(error);
  return {
    message: details.userMessage,
    action: details.suggestedAction,
  };
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Determine error severity
 */
export function getErrorSeverity(error: any): ErrorSeverity {
  const details = parseAIError(error);

  // Critical errors (auth, network)
  if (details.code === '401' || details.code === '403' || details.code === 'ENOTFOUND') {
    return ErrorSeverity.CRITICAL;
  }

  // Errors that block progress
  if (!details.retryable) {
    return ErrorSeverity.ERROR;
  }

  // Warnings (retryable errors)
  if (details.retryable) {
    return ErrorSeverity.WARNING;
  }

  return ErrorSeverity.INFO;
}
