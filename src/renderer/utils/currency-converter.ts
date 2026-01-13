/**
 * Currency Conversion Utilities
 * Handles DOP <-> USD conversion with exchange rates
 */

import { Money, Currency } from '../models/Money';

/**
 * Exchange rate interface
 */
export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  effectiveDate: Date;
}

/**
 * Default exchange rate (DOP per USD)
 */
export const DEFAULT_EXCHANGE_RATE = 58.5;

/**
 * Precision for currency calculations
 */
export const CURRENCY_PRECISION = 2;

/**
 * Convert money from one currency to another
 */
export function convertMoney(
  money: Money,
  targetCurrency: Currency,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): Money {
  if (money.currency === targetCurrency) {
    return money;
  }

  let convertedAmount: number;

  if (money.currency === 'USD' && targetCurrency === 'DOP') {
    convertedAmount = money.amount * exchangeRate;
  } else if (money.currency === 'DOP' && targetCurrency === 'USD') {
    convertedAmount = money.amount / exchangeRate;
  } else {
    throw new Error('Unsupported currency conversion');
  }

  return {
    amount: Number(convertedAmount.toFixed(CURRENCY_PRECISION)),
    currency: targetCurrency,
  };
}

/**
 * Convert USD to DOP
 */
export function usdToDop(amountUsd: number, rate: number = DEFAULT_EXCHANGE_RATE): number {
  return Number((amountUsd * rate).toFixed(CURRENCY_PRECISION));
}

/**
 * Convert DOP to USD
 */
export function dopToUsd(amountDop: number, rate: number = DEFAULT_EXCHANGE_RATE): number {
  return Number((amountDop / rate).toFixed(CURRENCY_PRECISION));
}

/**
 * Create exchange rate object
 */
export function createExchangeRate(
  from: Currency,
  to: Currency,
  rate: number,
  effectiveDate: Date = new Date()
): ExchangeRate {
  if (rate <= 0) {
    throw new Error('Exchange rate must be positive');
  }

  return { from, to, rate, effectiveDate };
}

/**
 * Get inverse exchange rate
 */
export function getInverseRate(exchangeRate: ExchangeRate): ExchangeRate {
  return {
    from: exchangeRate.to,
    to: exchangeRate.from,
    rate: 1 / exchangeRate.rate,
    effectiveDate: exchangeRate.effectiveDate,
  };
}

/**
 * Validate exchange rate
 */
export function validateExchangeRate(rate: number): boolean {
  return rate > 0 && Number.isFinite(rate);
}
