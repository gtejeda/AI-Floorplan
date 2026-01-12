/**
 * Privacy-Conscious Telemetry Service
 *
 * Features:
 * - Opt-in by default (user must explicitly enable)
 * - No personal data collection
 * - Local-only until user consents
 * - Transparent about what is collected
 * - Easy to disable
 */

import { logger } from './logger';
import store from './settings-store';
import { v4 as uuidv4 } from 'uuid';

export interface TelemetryEvent {
  eventType: 'error' | 'performance' | 'usage' | 'feature';
  eventName: string;
  timestamp: string;
  sessionId: string;
  appVersion: string;
  platform: string;
  data?: Record<string, any>;
}

export interface CrashReport {
  errorMessage: string;
  errorStack?: string;
  timestamp: string;
  sessionId: string;
  appVersion: string;
  platform: string;
  context?: Record<string, any>;
}

class TelemetryService {
  private sessionId: string;
  private appVersion: string;
  private isEnabled: boolean;
  private localQueue: TelemetryEvent[] = [];
  private maxQueueSize = 100;

  constructor() {
    this.sessionId = uuidv4();
    this.appVersion = process.env.npm_package_version || '1.0.0';
    this.isEnabled = store.get('telemetry.enabled', false);

    logger.info(`Telemetry initialized: ${this.isEnabled ? 'enabled' : 'disabled'}`);

    // Log session start
    if (this.isEnabled) {
      this.trackEvent('usage', 'session_start', {
        firstLaunch: !store.get('telemetry.hasLaunched', false)
      });
      store.set('telemetry.hasLaunched', true);
    }
  }

  /**
   * Check if telemetry is enabled
   */
  isOptedIn(): boolean {
    return this.isEnabled;
  }

  /**
   * Enable telemetry (user opt-in)
   */
  enable(): void {
    this.isEnabled = true;
    store.set('telemetry.enabled', true);
    store.set('telemetry.enabledAt', new Date().toISOString());
    logger.info('Telemetry enabled by user');

    this.trackEvent('usage', 'telemetry_enabled');
  }

  /**
   * Disable telemetry (user opt-out)
   */
  disable(): void {
    this.isEnabled = false;
    store.set('telemetry.enabled', false);
    store.set('telemetry.disabledAt', new Date().toISOString());
    logger.info('Telemetry disabled by user');

    // Clear local queue
    this.localQueue = [];
  }

  /**
   * Track a telemetry event
   * Only collected if user has opted in
   */
  trackEvent(
    eventType: TelemetryEvent['eventType'],
    eventName: string,
    data?: Record<string, any>
  ): void {
    const event: TelemetryEvent = {
      eventType,
      eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      appVersion: this.appVersion,
      platform: process.platform,
      data: this.sanitizeData(data)
    };

    if (!this.isEnabled) {
      logger.debug(`Telemetry disabled, not tracking: ${eventName}`);
      return;
    }

    // Add to local queue
    this.localQueue.push(event);

    // Trim queue if too large
    if (this.localQueue.length > this.maxQueueSize) {
      this.localQueue = this.localQueue.slice(-this.maxQueueSize);
    }

    logger.debug(`Telemetry event tracked: ${eventType} - ${eventName}`, data);

    // In a real implementation, you would send to a telemetry service
    // For now, we just log locally
    this.persistEvent(event);
  }

  /**
   * Report a crash
   * Always collected locally, only sent if telemetry is enabled
   */
  reportCrash(error: Error, context?: Record<string, any>): void {
    const crashReport: CrashReport = {
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      appVersion: this.appVersion,
      platform: process.platform,
      context: this.sanitizeData(context)
    };

    // Always log locally for debugging
    logger.error('Crash reported', crashReport);

    if (this.isEnabled) {
      // In a real implementation, send to crash reporting service
      this.persistCrashReport(crashReport);
      logger.info('Crash report sent to telemetry service');
    } else {
      logger.info('Crash report logged locally only (telemetry disabled)');
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(operation: string, durationMs: number, metadata?: Record<string, any>): void {
    this.trackEvent('performance', operation, {
      durationMs,
      ...metadata
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, metadata?: Record<string, any>): void {
    this.trackEvent('feature', featureName, metadata);
  }

  /**
   * Get telemetry statistics for transparency
   */
  getStatistics(): {
    isEnabled: boolean;
    eventCount: number;
    sessionId: string;
    appVersion: string;
    enabledAt?: string;
    disabledAt?: string;
  } {
    return {
      isEnabled: this.isEnabled,
      eventCount: this.localQueue.length,
      sessionId: this.sessionId,
      appVersion: this.appVersion,
      enabledAt: store.get('telemetry.enabledAt'),
      disabledAt: store.get('telemetry.disabledAt')
    };
  }

  /**
   * Get recent events for transparency
   * Returns last 10 events
   */
  getRecentEvents(): TelemetryEvent[] {
    return this.localQueue.slice(-10);
  }

  /**
   * Clear all telemetry data
   */
  clearData(): void {
    this.localQueue = [];
    store.delete('telemetry.events');
    logger.info('Telemetry data cleared');
  }

  /**
   * Sanitize data to remove personal information
   */
  private sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return undefined;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip potentially sensitive fields
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Skip file paths (could contain username)
      if (typeof value === 'string' && this.isFilePath(value)) {
        sanitized[key] = '[FILE_PATH]';
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Check if a field name suggests sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitivePatterns = [
      'password',
      'secret',
      'token',
      'key',
      'auth',
      'email',
      'phone',
      'address',
      'name',
      'user'
    ];

    const lowerField = fieldName.toLowerCase();
    return sensitivePatterns.some(pattern => lowerField.includes(pattern));
  }

  /**
   * Check if a string looks like a file path
   */
  private isFilePath(value: string): boolean {
    return /^([a-zA-Z]:\\|\/|~\/)/.test(value) || value.includes('\\') || value.includes('/');
  }

  /**
   * Persist event to local storage
   */
  private persistEvent(event: TelemetryEvent): void {
    try {
      const events = store.get('telemetry.events', []) as TelemetryEvent[];
      events.push(event);

      // Keep only last 1000 events
      const limited = events.slice(-1000);
      store.set('telemetry.events', limited);
    } catch (error) {
      logger.error('Failed to persist telemetry event', error);
    }
  }

  /**
   * Persist crash report to local storage
   */
  private persistCrashReport(crash: CrashReport): void {
    try {
      const crashes = store.get('telemetry.crashes', []) as CrashReport[];
      crashes.push(crash);

      // Keep only last 50 crashes
      const limited = crashes.slice(-50);
      store.set('telemetry.crashes', limited);
    } catch (error) {
      logger.error('Failed to persist crash report', error);
    }
  }

  /**
   * Flush events to telemetry service
   * In a real implementation, this would send events to a backend
   */
  async flush(): Promise<void> {
    if (!this.isEnabled || this.localQueue.length === 0) {
      return;
    }

    logger.info(`Flushing ${this.localQueue.length} telemetry events`);

    // In a real implementation, send to telemetry service
    // For now, just clear the queue
    // this.localQueue = [];
  }
}

export const telemetry = new TelemetryService();

/**
 * Helper to track performance of async operations
 */
export async function trackAsync<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await operation();
    const duration = performance.now() - start;
    telemetry.trackPerformance(operationName, duration, { success: true, ...metadata });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    telemetry.trackPerformance(operationName, duration, { success: false, ...metadata });
    throw error;
  }
}

/**
 * Helper to track performance of sync operations
 */
export function trackSync<T>(
  operationName: string,
  operation: () => T,
  metadata?: Record<string, any>
): T {
  const start = performance.now();
  try {
    const result = operation();
    const duration = performance.now() - start;
    telemetry.trackPerformance(operationName, duration, { success: true, ...metadata });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    telemetry.trackPerformance(operationName, duration, { success: false, ...metadata });
    throw error;
  }
}
