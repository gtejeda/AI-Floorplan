/**
 * Money Interface
 * Represents monetary values with currency support (DOP/USD)
 * Based on data-model.md specification
 */

import { z } from 'zod';

/**
 * Supported currencies
 */
export type Currency = 'DOP' | 'USD';

/**
 * Money interface for all financial values
 */
export interface Money {
  amount: number; // Stored with full precision (not rounded)
  currency: Currency;
}

/**
 * Zod validation schema for Money
 */
export const MoneySchema = z.object({
  amount: z.number().nonnegative('Amount must be non-negative'),
  currency: z.enum(['DOP', 'USD'], {
    errorMap: () => ({ message: 'Currency must be DOP or USD' }),
  }),
});

/**
 * Validate Money object
 */
export function validateMoney(money: unknown): Money {
  return MoneySchema.parse(money);
}

/**
 * Create Money object with validation
 */
export function createMoney(amount: number, currency: Currency): Money {
  return validateMoney({ amount, currency });
}

/**
 * Format Money for display
 */
export function formatMoney(money: Money, precision: number = 2): string {
  const symbol = money.currency === 'USD' ? '$' : 'RD$';
  const formattedAmount = money.amount.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${symbol}${formattedAmount}`;
}

/**
 * Add two Money values (must have same currency)
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error('Cannot add money with different currencies');
  }
  return {
    amount: a.amount + b.amount,
    currency: a.currency,
  };
}

/**
 * Subtract two Money values (must have same currency)
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error('Cannot subtract money with different currencies');
  }
  return {
    amount: a.amount - b.amount,
    currency: a.currency,
  };
}

/**
 * Multiply Money by a scalar
 */
export function multiplyMoney(money: Money, multiplier: number): Money {
  return {
    amount: money.amount * multiplier,
    currency: money.currency,
  };
}

/**
 * Divide Money by a scalar
 */
export function divideMoney(money: Money, divisor: number): Money {
  if (divisor === 0) {
    throw new Error('Cannot divide by zero');
  }
  return {
    amount: money.amount / divisor,
    currency: money.currency,
  };
}

/**
 * Check if two Money values are equal (within tolerance)
 */
export function isMoneyEqual(a: Money, b: Money, tolerance: number = 0.01): boolean {
  return a.currency === b.currency && Math.abs(a.amount - b.amount) <= tolerance;
}
