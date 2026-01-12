/**
 * Amenity.ts - Amenity catalog interface and types
 * Defines amenities available for social club design
 */

import { Money } from './Money';

/**
 * Categories for organizing amenities in the catalog
 */
export type AmenityCategory =
  | 'aquatic'       // Pools, jacuzzis
  | 'dining'        // BBQ areas, outdoor kitchens, dining pavilions
  | 'recreation'    // Lounges, game areas, sports courts
  | 'furniture'     // Pool chairs, umbrellas, tables
  | 'landscaping'   // Gardens, pathways
  | 'utilities'     // Bathrooms, changing rooms
  | 'storage';      // Storage facilities

/**
 * Amenity from the catalog with default costs
 */
export interface Amenity {
  // Identity
  id: string;              // UUID v4
  category: AmenityCategory;
  name: string;

  // Details
  description: string;
  defaultCost: Money;      // Recommended cost in USD
  spaceRequirement?: number; // square meters (optional)

  // Metadata
  isPopular: boolean;      // Featured amenities
  tags: string[];          // For search/filtering
}

/**
 * Selected amenity in a social club design
 */
export interface SelectedAmenity {
  amenityId: string;       // Reference to Amenity catalog
  category: AmenityCategory;
  name: string;
  quantity: number;        // e.g., 2 pools, 5 BBQ grills
  unitCost: Money;         // Cost per unit
  totalCost: Money;        // quantity × unitCost
  spaceRequirement?: number; // square meters (optional)
}
