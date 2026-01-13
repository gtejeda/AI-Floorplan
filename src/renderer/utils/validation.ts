/**
 * Input Validation Utilities for Renderer Process
 * Client-side validation before sending to main process
 */

import { z } from 'zod';

/**
 * Validate email format (for future use)
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: any): number | null {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    return null;
  }
  return num;
}

/**
 * Validate non-negative number
 */
export function validateNonNegativeNumber(value: any): number | null {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    return null;
  }
  return num;
}

/**
 * Validate number in range
 */
export function validateNumberInRange(
  value: any,
  min: number,
  max: number
): { valid: boolean; value: number | null; error?: string } {
  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, value: null, error: 'Must be a valid number' };
  }

  if (num < min) {
    return { valid: false, value: null, error: `Must be at least ${min}` };
  }

  if (num > max) {
    return { valid: false, value: null, error: `Must be at most ${max}` };
  }

  return { valid: true, value: num };
}

/**
 * Sanitize text input
 */
export function sanitizeText(text: string, maxLength: number = 200): string {
  if (typeof text !== 'string') {
    return '';
  }

  // Remove control characters
  let sanitized = text.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Zod schemas for form validation
 */

export const LandParcelSchema = z.object({
  width: z.number().positive('Width must be positive').finite(),
  length: z.number().positive('Length must be positive').finite(),
  province: z.string().min(1, 'Province is required'),
  isUrbanized: z.boolean(),
  acquisitionCost: z.object({
    amount: z.number().nonnegative('Cost cannot be negative').finite(),
    currency: z.enum(['DOP', 'USD']),
  }),
  displayUnit: z.enum(['sqm', 'sqft']),
  landmarks: z
    .array(
      z.object({
        type: z.enum(['beach', 'airport', 'tourist_attraction', 'infrastructure', 'other']),
        name: z.string().min(1, 'Landmark name is required'),
        distance: z.number().positive().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export const MoneySchema = z.object({
  amount: z.number().nonnegative('Amount cannot be negative').finite(),
  currency: z.enum(['DOP', 'USD']),
});

export const FinancialInputSchema = z.object({
  legalCosts: z.object({
    notary: MoneySchema,
    permits: MoneySchema,
    registrations: MoneySchema,
  }),
  otherCosts: z.array(
    z.object({
      label: z.string().min(1, 'Label is required').max(100),
      amount: MoneySchema,
      description: z.string().max(500).optional(),
    })
  ),
  monthlyMaintenanceCost: MoneySchema.optional(),
  exchangeRate: z
    .object({
      from: z.enum(['DOP', 'USD']),
      to: z.enum(['DOP', 'USD']),
      rate: z.number().positive('Exchange rate must be positive').finite(),
      effectiveDate: z.date(),
    })
    .optional(),
  targetProfitMargins: z.array(z.number().positive().max(100)),
});

/**
 * Validate form with Zod schema
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: 'Validation failed' } };
  }
}

/**
 * Display validation errors
 */
export function formatValidationErrors(errors: Record<string, string>): string {
  return Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('\n');
}

/**
 * Check if value is empty (null, undefined, empty string, etc.)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
}

/**
 * Debounce function for input validation
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default {
  validateEmail,
  validatePositiveNumber,
  validateNonNegativeNumber,
  validateNumberInRange,
  sanitizeText,
  validateForm,
  formatValidationErrors,
  isEmpty,
  debounce,
  LandParcelSchema,
  MoneySchema,
  FinancialInputSchema,
};
