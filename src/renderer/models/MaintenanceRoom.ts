/**
 * MaintenanceRoom - Mandatory maintenance facility configuration
 * (100% required per updated spec FR-034)
 */

import { Position2D } from './SubdivisionScenario';

export interface MaintenanceRoom {
  // Identity
  id: string; // UUID v4
  scenarioId: string; // Foreign key to subdivision scenario

  // Dimensions
  width: number; // meters
  length: number; // meters
  area: number; // square meters (minimum 15 sqm placeholder)

  // Location Configuration
  location: 'in-social-club' | 'separate-area';
  position: Position2D; // Position on parcel

  // Equipment (optional - for financial planning)
  equipment?: {
    waterPumpSystem: boolean;
    electricalPanel: boolean;
    hvacSystem: boolean;
    storageRacks: boolean;
    toolStorage: boolean;
    poolEquipment: boolean; // If pool amenity selected
  };

  // Associated Costs (from financial analysis)
  constructionCost?: {
    amount: number;
    currency: 'DOP' | 'USD';
  };
  equipmentCost?: {
    amount: number;
    currency: 'DOP' | 'USD';
  };
}

/**
 * Maintenance room constants
 */
export const MAINTENANCE_ROOM_CONSTANTS = {
  MIN_AREA: 15, // sqm (placeholder - to be refined based on requirements)
  RECOMMENDED_AREA: 20, // sqm (for basic utilities)
  EXTENDED_AREA: 30, // sqm (if pool equipment needed)
  MIN_WIDTH: 3, // meters (for door access and movement)
  MIN_LENGTH: 5, // meters
} as const;

/**
 * Calculate recommended maintenance room size based on amenities
 */
export function calculateMaintenanceRoomArea(amenityTypes: string[]): number {
  const hasPool = amenityTypes.some((type) =>
    type.toLowerCase().includes('pool') || type.toLowerCase().includes('aquatic')
  );
  const hasHVAC = amenityTypes.some((type) =>
    type.toLowerCase().includes('climate') || type.toLowerCase().includes('hvac')
  );

  if (hasPool || amenityTypes.length > 10) {
    return MAINTENANCE_ROOM_CONSTANTS.EXTENDED_AREA;
  } else if (hasHVAC || amenityTypes.length > 5) {
    return MAINTENANCE_ROOM_CONSTANTS.RECOMMENDED_AREA;
  } else {
    return MAINTENANCE_ROOM_CONSTANTS.MIN_AREA;
  }
}

/**
 * Validate maintenance room configuration
 */
export function validateMaintenanceRoom(room: MaintenanceRoom): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum area
  if (room.area < MAINTENANCE_ROOM_CONSTANTS.MIN_AREA) {
    errors.push(
      `Maintenance room area must be at least ${MAINTENANCE_ROOM_CONSTANTS.MIN_AREA}sqm, got ${room.area}sqm`
    );
  }

  // Check minimum dimensions
  if (room.width < MAINTENANCE_ROOM_CONSTANTS.MIN_WIDTH) {
    errors.push(
      `Maintenance room width must be at least ${MAINTENANCE_ROOM_CONSTANTS.MIN_WIDTH}m for access, got ${room.width}m`
    );
  }

  if (room.length < MAINTENANCE_ROOM_CONSTANTS.MIN_LENGTH) {
    errors.push(
      `Maintenance room length must be at least ${MAINTENANCE_ROOM_CONSTANTS.MIN_LENGTH}m, got ${room.length}m`
    );
  }

  // Area consistency check
  const calculatedArea = room.width * room.length;
  const tolerance = 0.01;
  if (Math.abs(calculatedArea - room.area) > tolerance) {
    errors.push(
      `Maintenance room area mismatch: ${room.area}sqm specified but ${room.width}m × ${room.length}m = ${calculatedArea}sqm`
    );
  }

  // Warnings for suboptimal configuration
  if (room.area < MAINTENANCE_ROOM_CONSTANTS.RECOMMENDED_AREA) {
    warnings.push(
      `Maintenance room area is below recommended ${MAINTENANCE_ROOM_CONSTANTS.RECOMMENDED_AREA}sqm. May be insufficient for typical equipment.`
    );
  }

  if (room.location === 'in-social-club' && room.area > 25) {
    warnings.push(
      `Large maintenance room (${room.area}sqm) in social club may reduce usable amenity space. Consider separate location.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
