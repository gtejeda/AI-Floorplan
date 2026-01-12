/**
 * MicroVillaLot - Individual subdivided unit (generated from selected scenario)
 */

import { Position2D } from './SubdivisionScenario';

export interface MicroVillaLot {
  // Identity
  id: string; // UUID v4
  scenarioId: string; // Foreign key
  lotNumber: number; // Sequential 1 to N

  // Dimensions (inherited from scenario)
  width: number; // meters
  length: number; // meters
  area: number; // square meters

  // Position in grid
  position: Position2D;
  gridPosition: {
    row: number; // 0-indexed
    column: number; // 0-indexed
  };

  // Ownership
  commonAreaPercentage: number; // from scenario (proportional)

  // Storage Configuration
  hasIndividualStorage: boolean; // true if patio storage, false if centralized

  // Associated Images
  imageIds: string[]; // References to ProjectImage entities
}

/**
 * Validation helper
 */
export function validateMicroVillaLot(lot: MicroVillaLot, scenarioLotArea: number): boolean {
  const tolerance = 0.01;

  // Area must match scenario's lot area
  if (Math.abs(lot.area - scenarioLotArea) > tolerance) {
    return false;
  }

  // Lot number must be positive
  if (lot.lotNumber <= 0) {
    return false;
  }

  // Grid positions must be non-negative
  if (lot.gridPosition.row < 0 || lot.gridPosition.column < 0) {
    return false;
  }

  // Common area percentage must be between 0 and 100
  if (lot.commonAreaPercentage < 0 || lot.commonAreaPercentage > 100) {
    return false;
  }

  return true;
}
