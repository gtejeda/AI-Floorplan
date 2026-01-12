/**
 * Unit Conversion Utilities
 * Exact conversion factors for square meters <-> square feet
 * Based on research.md - International Yard and Pound Agreement of 1959
 */

/**
 * Unit types
 */
export type AreaUnit = 'sqm' | 'sqft';

/**
 * Exact conversion factors
 */
export const CONVERSION_FACTORS = {
  SQM_TO_SQFT: 10.763910417,
  SQFT_TO_SQM: 0.09290304
} as const;

/**
 * Precision levels for different use cases
 */
export const PRECISION = {
  AREA: 2,
  DIMENSIONS: 2,
  LEGAL_DOCS: 4
} as const;

/**
 * Convert square meters to square feet
 */
export function sqmToSqft(sqm: number, precision: number = PRECISION.AREA): number {
  const sqft = sqm * CONVERSION_FACTORS.SQM_TO_SQFT;
  return Number(sqft.toFixed(precision));
}

/**
 * Convert square feet to square meters
 */
export function sqftToSqm(sqft: number, precision: number = PRECISION.AREA): number {
  const sqm = sqft * CONVERSION_FACTORS.SQFT_TO_SQM;
  return Number(sqm.toFixed(precision));
}

/**
 * Convert area between units
 */
export function convertArea(
  value: number,
  fromUnit: AreaUnit,
  toUnit: AreaUnit,
  precision: number = PRECISION.AREA
): number {
  if (fromUnit === toUnit) {
    return Number(value.toFixed(precision));
  }

  if (fromUnit === 'sqm' && toUnit === 'sqft') {
    return sqmToSqft(value, precision);
  }

  return sqftToSqm(value, precision);
}

/**
 * Format area with unit label
 */
export function formatArea(value: number, unit: AreaUnit, precision: number = PRECISION.AREA): string {
  const formattedValue = value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
  const unitLabel = unit === 'sqm' ? 'm²' : 'ft²';
  return `${formattedValue} ${unitLabel}`;
}

/**
 * Calculate area from width and length
 */
export function calculateArea(width: number, length: number, unit: AreaUnit = 'sqm'): number {
  return width * length;
}

/**
 * Convert dimensions (width, length) between units
 */
export interface Dimensions {
  width: number;
  length: number;
  area: number;
}

export function convertDimensions(
  dimensions: Dimensions,
  fromUnit: AreaUnit,
  toUnit: AreaUnit,
  precision: number = PRECISION.DIMENSIONS
): Dimensions {
  if (fromUnit === toUnit) {
    return {
      width: Number(dimensions.width.toFixed(precision)),
      length: Number(dimensions.length.toFixed(precision)),
      area: Number(dimensions.area.toFixed(precision))
    };
  }

  const factor = fromUnit === 'sqm' ? Math.sqrt(CONVERSION_FACTORS.SQM_TO_SQFT) : Math.sqrt(CONVERSION_FACTORS.SQFT_TO_SQM);
  
  return {
    width: Number((dimensions.width * factor).toFixed(precision)),
    length: Number((dimensions.length * factor).toFixed(precision)),
    area: convertArea(dimensions.area, fromUnit, toUnit, precision)
  };
}
