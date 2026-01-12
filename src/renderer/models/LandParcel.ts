/**
 * LandParcel Model
 * Represents investment property with physical dimensions and location
 * Based on data-model.md specification
 */

import { z } from 'zod';
import { Money, MoneySchema } from './Money';
import { DominicanRepublicProvince, ProvinceSchema } from './Province';
import { Landmark, LandmarkSchema } from './Landmark';

/**
 * LandParcel interface
 */
export interface LandParcel {
  // Identity
  id: string; // UUID v4
  projectId: string; // Foreign key

  // Dimensions (stored in canonical unit: meters)
  width: number; // meters (internal storage)
  length: number; // meters (internal storage)
  area: number; // square meters (calculated: width × length)

  // Location
  province: DominicanRepublicProvince;
  landmarks: Landmark[];

  // Characteristics
  isUrbanized: boolean;

  // Financial
  acquisitionCost: Money;

  // Preferences
  displayUnit: 'sqm' | 'sqft'; // User's preferred display unit
}

/**
 * Input for creating or updating a land parcel
 */
export interface LandParcelInput {
  projectId: string;
  width: number;
  length: number;
  province: DominicanRepublicProvince;
  landmarks?: Landmark[];
  isUrbanized: boolean;
  acquisitionCost: Money;
  displayUnit?: 'sqm' | 'sqft';
}

/**
 * Zod validation schema for LandParcel
 */
export const LandParcelSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  projectId: z.string().uuid('Invalid project UUID'),
  width: z.number().positive('Width must be greater than 0'),
  length: z.number().positive('Length must be greater than 0'),
  area: z.number().positive('Area must be greater than 0'),
  province: ProvinceSchema,
  landmarks: z.array(LandmarkSchema).default([]),
  isUrbanized: z.boolean(),
  acquisitionCost: MoneySchema,
  displayUnit: z.enum(['sqm', 'sqft']).default('sqm')
}).refine(
  (data) => Math.abs(data.area - (data.width * data.length)) <= 0.01,
  { message: 'Area must match width × length (within 0.01 tolerance)' }
);

/**
 * Zod validation schema for LandParcelInput
 */
export const LandParcelInputSchema = z.object({
  projectId: z.string().uuid('Invalid project UUID'),
  width: z.number().positive('Width must be greater than 0'),
  length: z.number().positive('Length must be greater than 0'),
  province: ProvinceSchema,
  landmarks: z.array(LandmarkSchema).optional().default([]),
  isUrbanized: z.boolean(),
  acquisitionCost: MoneySchema,
  displayUnit: z.enum(['sqm', 'sqft']).optional().default('sqm')
});

/**
 * Validate LandParcel object
 */
export function validateLandParcel(landParcel: unknown): LandParcel {
  return LandParcelSchema.parse(landParcel);
}

/**
 * Validate LandParcelInput object
 */
export function validateLandParcelInput(input: unknown): LandParcelInput {
  return LandParcelInputSchema.parse(input);
}

/**
 * Create LandParcel from input with generated ID and calculated area
 */
export function createLandParcel(input: LandParcelInput, id?: string): LandParcel {
  const validatedInput = validateLandParcelInput(input);

  return {
    id: id || crypto.randomUUID(),
    projectId: validatedInput.projectId,
    width: validatedInput.width,
    length: validatedInput.length,
    area: Number((validatedInput.width * validatedInput.length).toFixed(2)),
    province: validatedInput.province,
    landmarks: validatedInput.landmarks || [],
    isUrbanized: validatedInput.isUrbanized,
    acquisitionCost: validatedInput.acquisitionCost,
    displayUnit: validatedInput.displayUnit || 'sqm'
  };
}
