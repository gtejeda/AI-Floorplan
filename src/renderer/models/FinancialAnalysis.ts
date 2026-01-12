import { z } from 'zod';
import { Money } from './Money';

// ============================================================================
// Financial Analysis Interfaces (Per data-model.md)
// ============================================================================

/**
 * Main financial analysis entity
 * Purpose: Investment calculations with multiple profit margin scenarios
 */
export interface FinancialAnalysis {
  // Identity
  id: string; // UUID v4
  projectId: string; // Foreign key

  // Cost Breakdown
  costs: CostBreakdown;

  // Derived Calculations
  totalProjectCost: Money; // Sum of all costs
  costPerSqm: Money; // totalProjectCost / land parcel area
  baseLotCost: Money; // (totalProjectCost - social club cost) / lot count

  // Pricing Scenarios
  pricingScenarios: PricingScenario[]; // Multiple profit margin options

  // Maintenance
  monthlyMaintenanceCost?: Money; // Total social club maintenance
  monthlyMaintenancePerOwner?: Money; // Per lot (proportional to common area %)

  // Currency Conversion
  exchangeRate?: ExchangeRate; // Optional DOP/USD conversion

  // Metadata
  calculatedAt: Date;
  lastModified: Date;
}

/**
 * Detailed cost breakdown structure
 */
export interface CostBreakdown {
  landAcquisition: Money; // From LandParcel
  amenities: Money; // Sum from SocialClubDesign
  parkingArea: Money; // Construction and landscaping for parking (NEW - FR-041)
  walkways: Money; // Walkway construction cost (NEW - FR-043)
  landscaping: Money; // Landscaping cost (NEW - FR-043)
  maintenanceRoom: Money; // Maintenance room construction (NEW - FR-045)
  storage: Money; // Storage units cost (NEW - FR-047, FR-048)
  legal: LegalCosts;
  other: OtherCost[];
}

/**
 * Legal costs breakdown
 */
export interface LegalCosts {
  notaryFees: Money;
  permits: Money;
  registrations: Money;
  total: Money; // Auto-calculated
}

/**
 * User-defined additional costs
 */
export interface OtherCost {
  id: string;
  label: string; // User-defined (e.g., "Infrastructure", "Utilities", "Marketing")
  amount: Money;
  description?: string;
}

/**
 * Pricing scenario with profit margin
 */
export interface PricingScenario {
  id: string;
  profitMarginPercent: number; // e.g., 15, 20, 25, 30
  lotSalePrice: Money; // baseLotCost × (1 + profitMargin)
  totalRevenue: Money; // lotSalePrice × lot count
  expectedProfit: Money; // totalRevenue - totalProjectCost
  roi: number; // (expectedProfit / totalProjectCost) × 100
}

/**
 * Exchange rate for currency conversion
 */
export interface ExchangeRate {
  from: 'DOP' | 'USD';
  to: 'DOP' | 'USD';
  rate: number; // DOP per USD (e.g., 58.50)
  effectiveDate: Date;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

/**
 * Money schema (reuse from Money.ts)
 */
const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.enum(['DOP', 'USD'])
});

/**
 * Other cost validation
 */
const OtherCostSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200),
  amount: MoneySchema,
  description: z.string().optional()
});

/**
 * Legal costs validation
 */
const LegalCostsSchema = z.object({
  notaryFees: MoneySchema,
  permits: MoneySchema,
  registrations: MoneySchema,
  total: MoneySchema
}).refine(
  (data) => {
    // Validate total equals sum of components (±0.01 tolerance)
    const sum = data.notaryFees.amount + data.permits.amount + data.registrations.amount;
    return Math.abs(data.total.amount - sum) <= 0.01;
  },
  { message: 'Legal costs total must equal sum of notary + permits + registrations' }
);

/**
 * Cost breakdown validation
 */
const CostBreakdownSchema = z.object({
  landAcquisition: MoneySchema,
  amenities: MoneySchema,
  parkingArea: MoneySchema,
  walkways: MoneySchema,
  landscaping: MoneySchema,
  maintenanceRoom: MoneySchema,
  storage: MoneySchema,
  legal: LegalCostsSchema,
  other: z.array(OtherCostSchema)
});

/**
 * Pricing scenario validation
 */
const PricingScenarioSchema = z.object({
  id: z.string().uuid(),
  profitMarginPercent: z.number().positive(),
  lotSalePrice: MoneySchema,
  totalRevenue: MoneySchema,
  expectedProfit: MoneySchema,
  roi: z.number()
});

/**
 * Exchange rate validation
 */
const ExchangeRateSchema = z.object({
  from: z.enum(['DOP', 'USD']),
  to: z.enum(['DOP', 'USD']),
  rate: z.number().positive(),
  effectiveDate: z.date()
});

/**
 * Complete financial analysis validation
 */
export const FinancialAnalysisSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  costs: CostBreakdownSchema,
  totalProjectCost: MoneySchema,
  costPerSqm: MoneySchema,
  baseLotCost: MoneySchema,
  pricingScenarios: z.array(PricingScenarioSchema),
  monthlyMaintenanceCost: MoneySchema.optional(),
  monthlyMaintenancePerOwner: MoneySchema.optional(),
  exchangeRate: ExchangeRateSchema.optional(),
  calculatedAt: z.date(),
  lastModified: z.date()
}).refine(
  (data) => data.calculatedAt <= data.lastModified,
  { message: 'Calculated date must be before or equal to last modified date' }
);

/**
 * Input schema for creating/updating financial analysis
 */
export const FinancialAnalysisInputSchema = z.object({
  projectId: z.string().uuid(),
  costs: CostBreakdownSchema,
  profitMargins: z.array(z.number().positive()).min(1).max(10), // Multiple profit margin options
  monthlyMaintenanceCost: MoneySchema.optional(),
  exchangeRate: ExchangeRateSchema.optional()
});

/**
 * Type for financial analysis input
 */
export type FinancialAnalysisInput = z.infer<typeof FinancialAnalysisInputSchema>;

// ============================================================================
// Helper Types for UI Components
// ============================================================================

/**
 * Financial summary for display
 */
export interface FinancialSummary {
  totalProjectCost: Money;
  costPerSqm: Money;
  baseLotCost: Money;
  recommendedScenario: PricingScenario; // Scenario with best ROI
}

/**
 * Cost allocation breakdown for transparency
 */
export interface CostAllocation {
  lotNumber: number;
  lotArea: number; // sqm
  proportionalLandCost: Money;
  proportionalSharedCosts: Money; // Parking, walkways, landscaping, maintenance
  storageCost: Money; // If individual patio storage
  totalBaseCost: Money;
}
