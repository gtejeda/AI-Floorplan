/**
 * StorageUnit.ts - Storage unit configuration
 * Defines storage options for Micro Villa lots
 */

/**
 * Storage configuration type
 * - centralized: Storage units located in the social club (shared)
 * - individual-patios: Storage units on each individual lot's patio
 */
export type StorageType = 'centralized' | 'individual-patios';

/**
 * Storage unit configuration interface
 */
export interface StorageUnit {
  type: StorageType;
  dedicatedStorageArea?: number; // square meters (if centralized)
  description?: string;           // Optional description
}
