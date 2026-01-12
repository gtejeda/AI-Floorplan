/**
 * SocialClubDesign.ts - Social club amenities and configuration
 * Defines the design of the centralized social area with amenities
 */

import { z } from 'zod';
import { Money, MoneySchema } from './Money';
import { SelectedAmenity } from './Amenity';
import { StorageType } from './StorageUnit';

/**
 * Social club design with amenities selection and configuration
 */
export interface SocialClubDesign {
  // Identity
  id: string;              // UUID v4
  projectId: string;       // Foreign key
  scenarioId: string;      // Based on selected scenario

  // Amenities
  selectedAmenities: SelectedAmenity[];

  // Storage Configuration
  storageType: StorageType;
  dedicatedStorageArea?: number; // square meters (if centralized)

  // Maintenance Room Configuration
  maintenanceRoomSize: number;   // square meters
  maintenanceRoomLocation: 'in-social-club' | 'separate';

  // Calculated Values
  totalCost: Money;
  totalArea: number;       // square meters (from scenario)
}

/**
 * Input type for creating/updating social club design
 */
export interface SocialClubDesignInput {
  projectId: string;
  scenarioId: string;
  selectedAmenities: SelectedAmenity[];
  storageType: StorageType;
  dedicatedStorageArea?: number;
  maintenanceRoomSize: number;
  maintenanceRoomLocation: 'in-social-club' | 'separate';
}

/**
 * Zod validation schema for SelectedAmenity
 */
export const SelectedAmenitySchema = z.object({
  amenityId: z.string().uuid(),
  category: z.enum(['aquatic', 'dining', 'recreation', 'furniture', 'landscaping', 'utilities', 'storage']),
  name: z.string().min(1).max(200),
  quantity: z.number().int().positive(),
  unitCost: MoneySchema,
  totalCost: MoneySchema,
  spaceRequirement: z.number().positive().optional()
});

/**
 * Zod validation schema for SocialClubDesignInput
 */
export const SocialClubDesignInputSchema = z.object({
  projectId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  selectedAmenities: z.array(SelectedAmenitySchema),
  storageType: z.enum(['centralized', 'individual-patios']),
  dedicatedStorageArea: z.number().positive().optional(),
  maintenanceRoomSize: z.number().positive(),
  maintenanceRoomLocation: z.enum(['in-social-club', 'separate'])
}).refine(
  (data) => {
    // If storage type is centralized, dedicatedStorageArea must be provided and > 0
    if (data.storageType === 'centralized') {
      return data.dedicatedStorageArea !== undefined && data.dedicatedStorageArea > 0;
    }
    return true;
  },
  {
    message: 'Dedicated storage area must be specified and > 0 when storage type is centralized',
    path: ['dedicatedStorageArea']
  }
);
