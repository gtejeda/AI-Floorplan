/**
 * Security Utilities for Main Process
 * Input validation, path sanitization, and security hardening
 */

import path from 'path';
import { app } from 'electron';

/**
 * Sanitize file path to prevent directory traversal attacks
 * @param filePath User-provided file path
 * @param baseDir Base directory to restrict paths to (optional)
 * @returns Sanitized path or throws error if invalid
 */
export function sanitizePath(filePath: string, baseDir?: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }

  // Normalize the path
  const normalized = path.normalize(filePath);

  // Check for directory traversal attempts
  if (normalized.includes('..')) {
    throw new Error('Path traversal detected');
  }

  // Check for null bytes
  if (normalized.includes('\0')) {
    throw new Error('Invalid path: null byte detected');
  }

  // If base directory provided, ensure path is within it
  if (baseDir) {
    const resolvedPath = path.resolve(normalized);
    const resolvedBase = path.resolve(baseDir);

    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error('Path outside allowed directory');
    }
  }

  return normalized;
}

/**
 * Validate project name
 * @param name Project name from user
 * @returns Sanitized name or throws error
 */
export function validateProjectName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid project name');
  }

  // Remove leading/trailing whitespace
  const trimmed = name.trim();

  // Check length
  if (trimmed.length < 1 || trimmed.length > 200) {
    throw new Error('Project name must be between 1 and 200 characters');
  }

  // Remove dangerous characters
  const sanitized = trimmed.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');

  if (sanitized.length === 0) {
    throw new Error('Project name contains only invalid characters');
  }

  return sanitized;
}

/**
 * Validate numeric input
 * @param value Numeric value from user
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @param fieldName Name of the field for error messages
 */
export function validateNumber(
  value: any,
  min: number,
  max: number,
  fieldName: string = 'Value'
): number {
  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (num > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }

  return num;
}

/**
 * Validate UUID v4 format
 * @param uuid UUID string
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize filename for safe file system operations
 * @param filename User-provided filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename');
  }

  // Remove path separators and dangerous characters
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^\.+/, '').replace(/\.+$/, '').trim();

  // Ensure filename is not empty
  if (sanitized.length === 0) {
    sanitized = 'unnamed';
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 255 - ext.length) + ext;
  }

  // Check for reserved names on Windows
  const reservedNames = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ];

  const nameWithoutExt = path.basename(sanitized, path.extname(sanitized)).toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    sanitized = '_' + sanitized;
  }

  return sanitized;
}

/**
 * Get safe app data directory
 */
export function getAppDataPath(): string {
  return app.getPath('userData');
}

/**
 * Get safe exports directory
 */
export function getExportsPath(): string {
  const userDataPath = getAppDataPath();
  return path.join(userDataPath, 'exports');
}

/**
 * Get safe database path
 */
export function getDatabasePath(): string {
  const userDataPath = getAppDataPath();
  return path.join(userDataPath, 'microvillas.db');
}

/**
 * Validate currency code
 */
export function validateCurrency(currency: string): 'DOP' | 'USD' {
  if (currency !== 'DOP' && currency !== 'USD') {
    throw new Error('Invalid currency: must be DOP or USD');
  }
  return currency;
}

/**
 * Validate unit type
 */
export function validateUnit(unit: string): 'sqm' | 'sqft' {
  if (unit !== 'sqm' && unit !== 'sqft') {
    throw new Error('Invalid unit: must be sqm or sqft');
  }
  return unit;
}

/**
 * Validate Dominican Republic province
 */
export function validateProvince(province: string): string {
  const validProvinces = [
    'Azua',
    'Baoruco',
    'Barahona',
    'Dajabón',
    'Distrito Nacional',
    'Duarte',
    'Elías Piña',
    'El Seibo',
    'Espaillat',
    'Hato Mayor',
    'Hermanas Mirabal',
    'Independencia',
    'La Altagracia',
    'La Romana',
    'La Vega',
    'María Trinidad Sánchez',
    'Monseñor Nouel',
    'Monte Cristi',
    'Monte Plata',
    'Pedernales',
    'Peravia',
    'Puerto Plata',
    'Samaná',
    'San Cristóbal',
    'San José de Ocoa',
    'San Juan',
    'San Pedro de Macorís',
    'Sánchez Ramírez',
    'Santiago',
    'Santiago Rodríguez',
    'Santo Domingo',
    'Valverde',
  ];

  if (!validProvinces.includes(province)) {
    throw new Error(`Invalid province: ${province}`);
  }

  return province;
}

/**
 * Rate limiting for IPC calls (simple implementation)
 */
export class RateLimiter {
  private calls: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxCalls: number;

  constructor(windowMs: number = 1000, maxCalls: number = 10) {
    this.windowMs = windowMs;
    this.maxCalls = maxCalls;
  }

  /**
   * Check if call is allowed
   */
  check(key: string): boolean {
    const now = Date.now();
    const calls = this.calls.get(key) || [];

    // Remove old calls outside the window
    const recentCalls = calls.filter((time) => now - time < this.windowMs);

    if (recentCalls.length >= this.maxCalls) {
      return false;
    }

    // Add new call
    recentCalls.push(now);
    this.calls.set(key, recentCalls);

    return true;
  }

  /**
   * Clear rate limiting for a key
   */
  clear(key: string): void {
    this.calls.delete(key);
  }
}

export default {
  sanitizePath,
  validateProjectName,
  validateNumber,
  validateUUID,
  sanitizeFilename,
  getAppDataPath,
  getExportsPath,
  getDatabasePath,
  validateCurrency,
  validateUnit,
  validateProvince,
  RateLimiter,
};
