/**
 * Error Handling Middleware
 * Catches and logs IPC errors
 */

import { ipcMain } from 'electron';
import { telemetry } from './telemetry';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(
  error: unknown,
  context?: Record<string, any>
): { success: false; error: string; code?: string } {
  if (error instanceof AppError) {
    console.error(`[${error.code}] ${error.message}`);

    // Report to telemetry if enabled
    telemetry.reportCrash(error, { ...context, code: error.code, statusCode: error.statusCode });

    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    console.error(`Error: ${error.message}`, error.stack);

    // Report to telemetry if enabled
    telemetry.reportCrash(error, context);

    return {
      success: false,
      error: error.message,
    };
  }

  console.error('Unknown error:', error);

  // Create error object for telemetry
  const unknownError = new Error('Unknown error occurred');
  telemetry.reportCrash(unknownError, { ...context, originalError: String(error) });

  return {
    success: false,
    error: 'An unknown error occurred',
  };
}

export function wrapHandler<T extends (...args: any[]) => Promise<any>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  }) as T;
}
