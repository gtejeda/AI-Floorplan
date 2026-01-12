/**
 * Crypto Utilities - API Key Encryption/Decryption
 *
 * Uses Electron's safeStorage API for secure API key storage.
 * Falls back to base64 encoding if safeStorage is unavailable.
 */

import { safeStorage } from 'electron';

/**
 * Encrypts a string using Electron's safeStorage
 * Falls back to base64 if safeStorage unavailable
 *
 * @param plainText - Text to encrypt (e.g., API key)
 * @returns Base64-encoded encrypted string
 */
export function encryptString(plainText: string): string {
  if (!plainText) {
    return '';
  }

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(plainText);
      return encrypted.toString('base64');
    } else {
      // Fallback: Simple base64 encoding (NOT secure, just obfuscation)
      console.warn('Electron safeStorage not available. Using base64 obfuscation (NOT SECURE).');
      return Buffer.from(plainText).toString('base64');
    }
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt API key');
  }
}

/**
 * Decrypts a string encrypted with encryptString
 *
 * @param encryptedBase64 - Base64-encoded encrypted string
 * @returns Decrypted plain text
 */
export function decryptString(encryptedBase64: string): string {
  if (!encryptedBase64) {
    return '';
  }

  try {
    const buffer = Buffer.from(encryptedBase64, 'base64');

    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buffer);
    } else {
      // Fallback: Base64 decode (matches encryptString fallback)
      return buffer.toString('utf-8');
    }
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt API key');
  }
}

/**
 * Validates if a string appears to be an encrypted value
 * (Basic check: is it valid base64?)
 *
 * @param value - String to validate
 * @returns true if appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    // Check if it's valid base64
    const decoded = Buffer.from(value, 'base64').toString('base64');
    return decoded === value;
  } catch {
    return false;
  }
}

/**
 * Masks an API key for display purposes
 * Shows first 4 and last 4 characters, masks the middle
 *
 * @param apiKey - API key to mask
 * @returns Masked API key (e.g., "sk-1234...5678")
 */
export function maskAPIKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '****';
  }

  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  return `${start}...${end}`;
}

/**
 * Validates API key format (basic check)
 * Different services have different formats
 *
 * @param apiKey - API key to validate
 * @param service - Service name ('gemini' or 'openai')
 * @returns true if format appears valid
 */
export function validateAPIKeyFormat(apiKey: string, service: 'gemini' | 'openai'): boolean {
  if (!apiKey) {
    return false;
  }

  switch (service) {
    case 'gemini':
      // Gemini API keys typically start with "AIza" and are 39 characters
      return apiKey.startsWith('AIza') && apiKey.length === 39;

    case 'openai':
      // OpenAI API keys start with "sk-" and are around 48-51 characters
      return apiKey.startsWith('sk-') && apiKey.length >= 48;

    default:
      // Generic validation: at least 20 characters
      return apiKey.length >= 20;
  }
}

/**
 * Gets encryption status information
 * Useful for displaying in settings UI
 */
export function getEncryptionStatus(): {
  available: boolean;
  method: 'safeStorage' | 'base64-fallback' | 'none';
} {
  try {
    const available = safeStorage.isEncryptionAvailable();
    return {
      available,
      method: available ? 'safeStorage' : 'base64-fallback'
    };
  } catch {
    return {
      available: false,
      method: 'none'
    };
  }
}
