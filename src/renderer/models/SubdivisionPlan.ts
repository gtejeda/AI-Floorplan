/**
 * SubdivisionPlan - AI-generated subdivision layout structure
 * Represents a complete subdivision design with lots, roads, and amenities
 */

export interface SubdivisionPlan {
  lotLayout: Lot[];
  roadConfiguration: RoadConfiguration;
  amenityAreas: AmenityArea[];
  metrics: SubdivisionMetrics;
}

export interface Lot {
  lotNumber: number;
  dimensions: {
    widthMeters: number;
    lengthMeters: number;
    areaSqm: number;
  };
  position: {
    x: number; // Meters from origin (top-left)
    y: number; // Meters from origin
  };
}

export interface RoadConfiguration {
  widthMeters: number; // Typically 6-8 meters
  totalAreaSqm: number; // Total road coverage
  layout: 'grid' | 'perimeter' | 'central-spine' | 'loop';
}

export interface AmenityArea {
  type: 'social-club' | 'parking' | 'green-space' | 'maintenance';
  areaSqm: number;
  position: {
    x: number;
    y: number;
  };
  description?: string;
}

export interface SubdivisionMetrics {
  totalLots: number; // Total lots generated
  viableLots: number; // Lots >= 90 sqm
  invalidLots: number[]; // Lot numbers below minimum
  averageLotSizeSqm: number; // Mean lot size
  landUtilizationPercent: number; // Efficiency metric (0-100)
}
