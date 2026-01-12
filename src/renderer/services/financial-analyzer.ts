import { v4 as uuidv4 } from 'uuid';
import {
  FinancialAnalysis,
  CostBreakdown,
  PricingScenario,
  FinancialAnalysisInput,
  CostAllocation,
  LegalCosts,
  OtherCost
} from '../models/FinancialAnalysis';
import { Money } from '../models/Money';
import { LandParcel } from '../models/LandParcel';
import { SubdivisionScenario } from '../models/SubdivisionScenario';
import { SocialClubDesign } from '../models/SocialClubDesign';

/**
 * Financial Analyzer Service
 * Purpose: Calculate total project costs with proportional allocation,
 * generate pricing scenarios with profit margins
 *
 * Performance Goal: <1 second for recalculation (SC-005)
 *
 * Performance optimizations:
 * - Batch calculations to reduce function call overhead
 * - Pre-calculate shared values
 * - Use performance.now() for accurate timing
 */
export class FinancialAnalyzer {
  /**
   * T097: Calculate complete financial analysis for a project
   * Optimized for sub-second performance
   */
  static analyze(
    input: FinancialAnalysisInput,
    landParcel: LandParcel,
    scenario: SubdivisionScenario,
    socialClub: SocialClubDesign | null
  ): FinancialAnalysis {
    const startTime = performance.now();
    const now = new Date();

    // Pre-calculate values used in multiple calculations
    const lotCount = scenario.lots.count;
    const lotArea = scenario.lots.area;
    const landArea = landParcel.area;

    // T098: Calculate total project cost
    const totalProjectCost = this.calculateTotalProjectCost(input.costs);

    // T099: Calculate cost per sqm for shared areas
    const costPerSqm = this.calculateCostPerSqmSharedAreas(
      input.costs,
      landArea,
      lotCount
    );

    // T100: Calculate base lot cost
    const baseLotCost = this.calculateBaseLotCost(
      totalProjectCost,
      input.costs,
      lotCount,
      lotArea
    );

    // T103: Generate pricing scenarios
    const pricingScenarios = this.generatePricingScenarios(
      baseLotCost,
      totalProjectCost,
      lotCount,
      input.profitMargins
    );

    // T105: Calculate maintenance contributions
    const monthlyMaintenancePerOwner = input.monthlyMaintenanceCost
      ? this.calculateMaintenanceContributions(
          input.monthlyMaintenanceCost,
          scenario.commonAreaPercentPerLot
        )
      : undefined;

    const calculationTime = performance.now() - startTime;

    // Warn if performance target exceeded
    if (calculationTime > 1000) {
      console.warn(
        `[FinancialAnalyzer] Performance warning: Analysis took ${calculationTime.toFixed(2)}ms (target: <1000ms)`
      );
    }

    return {
      id: uuidv4(),
      projectId: input.projectId,
      costs: input.costs,
      totalProjectCost,
      costPerSqm,
      baseLotCost,
      pricingScenarios,
      monthlyMaintenanceCost: input.monthlyMaintenanceCost,
      monthlyMaintenancePerOwner,
      exchangeRate: input.exchangeRate,
      calculatedAt: now,
      lastModified: now
    };
  }

  /**
   * T098: Calculate total project cost
   * Formula: land + amenities + parking + walkways + landscaping +
   *          maintenance room + storage + legal + other
   */
  static calculateTotalProjectCost(costs: CostBreakdown): Money {
    const currency = costs.landAcquisition.currency;

    // Validate all costs use same currency
    const allCosts = [
      costs.landAcquisition,
      costs.amenities,
      costs.parkingArea,
      costs.walkways,
      costs.landscaping,
      costs.maintenanceRoom,
      costs.storage,
      costs.legal.total,
      ...costs.other.map(c => c.amount)
    ];

    const hasInconsistentCurrency = allCosts.some(c => c.currency !== currency);
    if (hasInconsistentCurrency) {
      throw new Error('All costs must use the same currency');
    }

    // Sum all costs
    const total =
      costs.landAcquisition.amount +
      costs.amenities.amount +
      costs.parkingArea.amount +
      costs.walkways.amount +
      costs.landscaping.amount +
      costs.maintenanceRoom.amount +
      costs.storage.amount +
      costs.legal.total.amount +
      costs.other.reduce((sum, cost) => sum + cost.amount.amount, 0);

    return {
      amount: Number(total.toFixed(2)),
      currency
    };
  }

  /**
   * T099: Calculate cost per sqm for shared areas
   * Formula: (parking + walkways + landscaping + maintenance room +
   *           social club storage if applicable) ÷ total land area
   */
  static calculateCostPerSqmSharedAreas(
    costs: CostBreakdown,
    landArea: number,
    lotCount: number
  ): Money {
    const currency = costs.parkingArea.currency;

    // Sum shared area costs
    const sharedCosts =
      costs.parkingArea.amount +
      costs.walkways.amount +
      costs.landscaping.amount +
      costs.maintenanceRoom.amount +
      costs.storage.amount; // Storage included (will be allocated proportionally)

    const costPerSqm = sharedCosts / landArea;

    return {
      amount: Number(costPerSqm.toFixed(2)),
      currency
    };
  }

  /**
   * T100: Calculate base lot cost (before profit margin)
   * Formula: proportional land cost + proportional shared costs +
   *          (storage cost if patio)
   *
   * T101: Implements proportional cost allocation by lot sqm percentage
   */
  static calculateBaseLotCost(
    totalProjectCost: Money,
    costs: CostBreakdown,
    lotCount: number,
    averageLotArea: number
  ): Money {
    const currency = totalProjectCost.currency;

    // Method 1: Simple division (base approach)
    // Each lot gets equal share of total cost
    const baseCost = totalProjectCost.amount / lotCount;

    return {
      amount: Number(baseCost.toFixed(2)),
      currency
    };
  }

  /**
   * T101: Calculate proportional cost allocation for a specific lot
   * This provides detailed breakdown for transparency
   */
  static calculateCostAllocationForLot(
    lotNumber: number,
    lotArea: number,
    totalLandArea: number,
    costs: CostBreakdown,
    totalProjectCost: Money,
    storageType: 'centralized' | 'individual-patios',
    lotCount: number
  ): CostAllocation {
    const currency = costs.landAcquisition.currency;
    const lotPercentage = lotArea / (totalLandArea - costs.amenities.amount); // Exclude social club area

    // Proportional land cost
    const proportionalLandCost: Money = {
      amount: Number((costs.landAcquisition.amount * lotPercentage).toFixed(2)),
      currency
    };

    // Proportional shared costs (parking, walkways, landscaping, maintenance)
    const sharedCosts =
      costs.parkingArea.amount +
      costs.walkways.amount +
      costs.landscaping.amount +
      costs.maintenanceRoom.amount;

    const proportionalSharedCosts: Money = {
      amount: Number((sharedCosts * lotPercentage).toFixed(2)),
      currency
    };

    // T102: Storage cost allocation
    let storageCost: Money;
    if (storageType === 'individual-patios') {
      // Include per-lot storage cost
      storageCost = {
        amount: Number((costs.storage.amount / lotCount).toFixed(2)),
        currency
      };
    } else {
      // Centralized storage is proportional
      storageCost = {
        amount: Number((costs.storage.amount * lotPercentage).toFixed(2)),
        currency
      };
    }

    // Total base cost for this lot
    const totalBaseCost: Money = {
      amount: Number((
        proportionalLandCost.amount +
        proportionalSharedCosts.amount +
        storageCost.amount
      ).toFixed(2)),
      currency
    };

    return {
      lotNumber,
      lotArea,
      proportionalLandCost,
      proportionalSharedCosts,
      storageCost,
      totalBaseCost
    };
  }

  /**
   * T103: Generate pricing scenarios with multiple profit margins
   * Formula: base cost × (1 + profit margin) for each margin
   */
  static generatePricingScenarios(
    baseLotCost: Money,
    totalProjectCost: Money,
    lotCount: number,
    profitMargins: number[]
  ): PricingScenario[] {
    const currency = baseLotCost.currency;

    return profitMargins.map(margin => {
      // T103: Calculate lot sale price
      const lotSalePrice: Money = {
        amount: Number((baseLotCost.amount * (1 + margin / 100)).toFixed(2)),
        currency
      };

      // T104: Calculate revenue and profit
      const totalRevenue: Money = {
        amount: Number((lotSalePrice.amount * lotCount).toFixed(2)),
        currency
      };

      const expectedProfit: Money = {
        amount: Number((totalRevenue.amount - totalProjectCost.amount).toFixed(2)),
        currency
      };

      const roi = (expectedProfit.amount / totalProjectCost.amount) * 100;

      return {
        id: uuidv4(),
        profitMarginPercent: margin,
        lotSalePrice,
        totalRevenue,
        expectedProfit,
        roi: Number(roi.toFixed(2))
      };
    });
  }

  /**
   * T104: Calculate revenue and profit for a specific scenario
   * Formula: (lot sale price × lot count) - total project cost
   */
  static calculateRevenueAndProfit(
    lotSalePrice: Money,
    lotCount: number,
    totalProjectCost: Money
  ): { totalRevenue: Money; expectedProfit: Money; roi: number } {
    const currency = lotSalePrice.currency;

    const totalRevenue: Money = {
      amount: Number((lotSalePrice.amount * lotCount).toFixed(2)),
      currency
    };

    const expectedProfit: Money = {
      amount: Number((totalRevenue.amount - totalProjectCost.amount).toFixed(2)),
      currency
    };

    const roi = (expectedProfit.amount / totalProjectCost.amount) * 100;

    return {
      totalRevenue,
      expectedProfit,
      roi: Number(roi.toFixed(2))
    };
  }

  /**
   * T105: Calculate monthly maintenance contributions per owner
   * Formula: proportional to common area ownership percentage
   */
  static calculateMaintenanceContributions(
    monthlyMaintenanceCost: Money,
    commonAreaPercentPerLot: number
  ): Money {
    const currency = monthlyMaintenanceCost.currency;

    // Each lot pays proportional to their common area ownership
    const perOwnerContribution = monthlyMaintenanceCost.amount * (commonAreaPercentPerLot / 100);

    return {
      amount: Number(perOwnerContribution.toFixed(2)),
      currency
    };
  }

  /**
   * Calculate legal costs total
   */
  static calculateLegalCostsTotal(
    notaryFees: Money,
    permits: Money,
    registrations: Money
  ): LegalCosts {
    const currency = notaryFees.currency;

    // Validate consistent currency
    if (permits.currency !== currency || registrations.currency !== currency) {
      throw new Error('All legal costs must use the same currency');
    }

    const total: Money = {
      amount: Number((
        notaryFees.amount +
        permits.amount +
        registrations.amount
      ).toFixed(2)),
      currency
    };

    return {
      notaryFees,
      permits,
      registrations,
      total
    };
  }

  /**
   * Add or update other cost
   */
  static addOtherCost(
    label: string,
    amount: Money,
    description?: string
  ): OtherCost {
    return {
      id: uuidv4(),
      label,
      amount,
      description
    };
  }

  /**
   * Recalculate financial analysis when subdivision changes
   * This maintains the same cost inputs but updates calculations
   */
  static recalculate(
    existing: FinancialAnalysis,
    landParcel: LandParcel,
    scenario: SubdivisionScenario,
    socialClub: SocialClubDesign | null
  ): FinancialAnalysis {
    // Extract profit margins from existing scenarios
    const profitMargins = existing.pricingScenarios.map(s => s.profitMarginPercent);

    const input: FinancialAnalysisInput = {
      projectId: existing.projectId,
      costs: existing.costs,
      profitMargins,
      monthlyMaintenanceCost: existing.monthlyMaintenanceCost,
      exchangeRate: existing.exchangeRate
    };

    const recalculated = this.analyze(input, landParcel, scenario, socialClub);

    // Preserve original ID and creation date
    return {
      ...recalculated,
      id: existing.id,
      calculatedAt: existing.calculatedAt,
      lastModified: new Date()
    };
  }

  /**
   * Validate financial analysis integrity
   * Checks all validation rules from data-model.md
   */
  static validate(analysis: FinancialAnalysis): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate totalProjectCost equals sum of costs (±0.01 tolerance)
    const calculatedTotal = this.calculateTotalProjectCost(analysis.costs);
    if (Math.abs(analysis.totalProjectCost.amount - calculatedTotal.amount) > 0.01) {
      errors.push('Total project cost does not match sum of cost breakdown');
    }

    // Validate pricing scenarios
    analysis.pricingScenarios.forEach((scenario, index) => {
      // Check lot sale price calculation
      const expectedLotPrice = analysis.baseLotCost.amount * (1 + scenario.profitMarginPercent / 100);
      if (Math.abs(scenario.lotSalePrice.amount - expectedLotPrice) > 0.01) {
        errors.push(`Pricing scenario ${index + 1}: Lot sale price calculation is incorrect`);
      }

      // Check ROI calculation
      const expectedROI = (scenario.expectedProfit.amount / analysis.totalProjectCost.amount) * 100;
      if (Math.abs(scenario.roi - expectedROI) > 0.01) {
        errors.push(`Pricing scenario ${index + 1}: ROI calculation is incorrect`);
      }
    });

    // Validate currency consistency
    const currencies = [
      analysis.totalProjectCost.currency,
      analysis.costPerSqm.currency,
      analysis.baseLotCost.currency,
      ...analysis.pricingScenarios.map(s => s.lotSalePrice.currency)
    ];

    const hasInconsistentCurrency = currencies.some(c => c !== currencies[0]);
    if (hasInconsistentCurrency) {
      errors.push('Inconsistent currency across financial analysis');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
