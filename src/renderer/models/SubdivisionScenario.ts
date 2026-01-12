/**
 * SubdivisionScenario - One possible way to divide land
 * (10-30% social club in 1% increments)
 */

export interface Position2D {
  x: number; // meters from origin
  y: number; // meters from origin
}

export interface SubdivisionScenario {
  // Identity
  id: string; // UUID v4
  landParcelId: string; // Foreign key

  // Configuration
  socialClubPercent: number; // 10-30 (integer)

  // Social Club Dimensions
  socialClub: {
    width: number; // meters
    length: number; // meters
    area: number; // square meters
    position: Position2D; // Centered position
  };

  // Parking Area (NEW - as per updated spec)
  parkingArea: {
    width: number; // meters
    length: number; // meters
    area: number; // square meters
    spacesCount: number; // 2 spaces per villa
    spaceWidth: number; // Standard parking space width (2.5m)
    spaceLength: number; // Standard parking space length (5m)
    position: Position2D;
  };

  // Maintenance Room (NEW - as per updated spec)
  maintenanceRoom: {
    width: number; // meters
    length: number; // meters
    area: number; // square meters (placeholder minimum 15 sqm)
    position: Position2D; // Can be in social club or separate
    location: 'in-social-club' | 'separate-area';
  };

  // Lot Configuration
  lots: {
    count: number; // Total number of Micro Villa lots
    width: number; // meters (uniform lot width)
    length: number; // meters (uniform lot length)
    area: number; // square meters per lot
    minArea: number; // Enforced minimum (90 sqm)
    grid: {
      rows: number; // Grid dimensions
      columns: number;
      distribution: 'horizontal-strips' | 'vertical-strips' | 'four-quadrants';
    };
  };

  // Walkways and Landscaping (NEW - as per updated spec)
  walkways: {
    totalArea: number; // square meters
    averageWidth: number; // meters (typical 1.5-2m)
  };

  landscaping: {
    totalArea: number; // square meters (gardens, green spaces)
  };

  // Calculated Values
  totalLotsArea: number; // square meters
  commonAreaPercentPerLot: number; // percentage (proportional ownership)
  // Common area includes: socialClub + parkingArea + maintenanceRoom + walkways + landscaping

  // Metadata
  isViable: boolean; // false if any lot < 90 sqm
  calculatedAt: Date;
}

/**
 * Validation constants
 */
export const SUBDIVISION_CONSTRAINTS = {
  MIN_LOT_AREA: 90, // sqm (FR-023)
  SOCIAL_CLUB_MIN_PERCENT: 10,
  SOCIAL_CLUB_MAX_PERCENT: 30,
  PARKING_SPACES_PER_VILLA: 2, // FR-015
  PARKING_SPACE_WIDTH: 2.5, // meters (standard)
  PARKING_SPACE_LENGTH: 5, // meters (standard)
  MIN_MAINTENANCE_ROOM_AREA: 15, // sqm (placeholder)
  TYPICAL_WALKWAY_WIDTH: 1.5, // meters
  TOLERANCE: 0.01, // for area calculations
} as const;
