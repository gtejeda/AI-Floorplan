/**
 * Landmark Interface
 * Represents nearby points of interest for land parcels
 * Based on data-model.md specification
 */

import { z } from 'zod';

/**
 * Landmark types
 */
export type LandmarkType = 
  | 'beach' 
  | 'airport' 
  | 'tourist_attraction' 
  | 'infrastructure' 
  | 'other';

/**
 * Landmark interface
 */
export interface Landmark {
  type: LandmarkType;
  name: string;
  distance?: number;
  description?: string;
}

/**
 * Zod validation schema for Landmark
 */
export const LandmarkSchema = z.object({
  type: z.enum(['beach', 'airport', 'tourist_attraction', 'infrastructure', 'other']),
  name: z.string().min(1),
  distance: z.number().positive().optional(),
  description: z.string().optional()
});

/**
 * Validate Landmark object
 */
export function validateLandmark(landmark: unknown): Landmark {
  return LandmarkSchema.parse(landmark);
}

/**
 * Create Landmark with validation
 */
export function createLandmark(
  type: LandmarkType,
  name: string,
  distance?: number,
  description?: string
): Landmark {
  return validateLandmark({ type, name, distance, description });
}

/**
 * Landmark type display names
 */
export const LANDMARK_TYPE_LABELS: Record<LandmarkType, string> = {
  beach: 'Beach',
  airport: 'Airport',
  tourist_attraction: 'Tourist Attraction',
  infrastructure: 'Infrastructure',
  other: 'Other'
};
