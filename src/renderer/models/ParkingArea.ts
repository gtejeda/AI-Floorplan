/**
 * ParkingArea - Centralized parking configuration
 * (ALWAYS 2 spaces per villa - 100% mandatory per FR-015)
 */

import { Position2D } from './SubdivisionScenario';

export interface ParkingArea {
  // Identity
  id: string; // UUID v4
  scenarioId: string; // Foreign key to subdivision scenario

  // Dimensions
  width: number; // meters
  length: number; // meters
  totalArea: number; // square meters

  // Configuration
  spacesCount: number; // ALWAYS 2 × lot count
  spaceWidth: number; // Standard 2.5 meters
  spaceLength: number; // Standard 5 meters
  spaceArea: number; // Per space (12.5 sqm typically)

  // Layout
  position: Position2D; // Location on parcel
  layout: 'single-row' | 'double-row' | 'grid'; // Parking arrangement

  // Associated Costs (from financial analysis)
  constructionCost?: {
    amount: number;
    currency: 'DOP' | 'USD';
  };
  landscapingCost?: {
    amount: number;
    currency: 'DOP' | 'USD';
  };
}

/**
 * Parking area constants (FR-015)
 */
export const PARKING_CONSTANTS = {
  SPACES_PER_VILLA: 2, // Mandatory requirement
  STANDARD_SPACE_WIDTH: 2.5, // meters
  STANDARD_SPACE_LENGTH: 5.0, // meters
  STANDARD_SPACE_AREA: 12.5, // sqm (2.5 × 5.0)
  AISLE_WIDTH_SINGLE: 3.0, // meters (one-way traffic)
  AISLE_WIDTH_DOUBLE: 6.0, // meters (two-way traffic)
} as const;

/**
 * Calculate parking area requirements
 */
export function calculateParkingArea(lotCount: number): {
  spacesCount: number;
  minimumArea: number;
  recommendedArea: number;
} {
  const spacesCount = lotCount * PARKING_CONSTANTS.SPACES_PER_VILLA;
  const spaceArea = spacesCount * PARKING_CONSTANTS.STANDARD_SPACE_AREA;

  // Minimum: just the spaces (unrealistic, no aisles)
  const minimumArea = spaceArea;

  // Recommended: spaces + 40% for aisles and maneuvering
  const recommendedArea = spaceArea * 1.4;

  return {
    spacesCount,
    minimumArea,
    recommendedArea,
  };
}

/**
 * Validate parking area configuration
 */
export function validateParkingArea(
  parking: ParkingArea,
  lotCount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check spaces count
  const expectedSpaces = lotCount * PARKING_CONSTANTS.SPACES_PER_VILLA;
  if (parking.spacesCount !== expectedSpaces) {
    errors.push(
      `Parking must have exactly ${expectedSpaces} spaces (2 per villa × ${lotCount} lots), got ${parking.spacesCount}`
    );
  }

  // Check space dimensions
  if (parking.spaceWidth < PARKING_CONSTANTS.STANDARD_SPACE_WIDTH) {
    errors.push(`Parking space width must be at least ${PARKING_CONSTANTS.STANDARD_SPACE_WIDTH}m`);
  }

  if (parking.spaceLength < PARKING_CONSTANTS.STANDARD_SPACE_LENGTH) {
    errors.push(
      `Parking space length must be at least ${PARKING_CONSTANTS.STANDARD_SPACE_LENGTH}m`
    );
  }

  // Check total area (must fit all spaces + aisles)
  const { minimumArea } = calculateParkingArea(lotCount);
  if (parking.totalArea < minimumArea) {
    errors.push(`Parking area too small: ${parking.totalArea}sqm < ${minimumArea}sqm minimum`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
