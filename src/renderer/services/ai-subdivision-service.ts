/**
 * AI Subdivision Service
 * Business logic for AI-powered subdivision planning
 * Handles validation, plan comparison, and data transformation
 */

import type { SubdivisionPlan, Lot } from '../models/SubdivisionPlan';
import type { AISubdivisionPlan } from '../models/AISubdivisionPlan';

const MIN_LOT_SIZE_SQM = 90;
const MIN_LOT_SIZE_WARNING = 95; // Warn if close to minimum

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a generated subdivision plan against business rules
 */
export function validateSubdivisionPlan(
  plan: SubdivisionPlan,
  inputLandArea: number,
  inputSocialClubPercent: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Check for lots below 90 sqm minimum
  const invalidLots = plan.lotLayout.filter((lot) => lot.dimensions.areaSqm < MIN_LOT_SIZE_SQM);
  if (invalidLots.length > 0) {
    const lotNumbers = invalidLots.map((lot) => lot.lotNumber).join(', ');
    errors.push(`${invalidLots.length} lots below 90 sqm minimum: ${lotNumbers}`);
  }

  // Rule 2: Check for lots close to minimum (warning)
  const marginalLots = plan.lotLayout.filter(
    (lot) =>
      lot.dimensions.areaSqm >= MIN_LOT_SIZE_SQM && lot.dimensions.areaSqm < MIN_LOT_SIZE_WARNING
  );
  if (marginalLots.length > 0) {
    warnings.push(
      `${marginalLots.length} lots are close to minimum size (90-95 sqm). Consider slightly larger lots.`
    );
  }

  // Rule 3: Verify social club area matches requested percentage
  const socialClubArea = plan.amenityAreas
    .filter((amenity) => amenity.type === 'social-club')
    .reduce((sum, amenity) => sum + amenity.areaSqm, 0);

  const expectedSocialClubArea = inputLandArea * (inputSocialClubPercent / 100);
  const socialClubVariance =
    Math.abs(socialClubArea - expectedSocialClubArea) / expectedSocialClubArea;

  if (socialClubVariance > 0.15) {
    // Allow 15% tolerance
    errors.push(
      `Social club area (${socialClubArea.toFixed(0)} sqm) deviates significantly from requested ${inputSocialClubPercent}% (${expectedSocialClubArea.toFixed(0)} sqm)`
    );
  } else if (socialClubVariance > 0.05) {
    // Warn if deviation is 5-15%
    warnings.push(
      `Social club area (${socialClubArea.toFixed(0)} sqm) is slightly different from requested ${inputSocialClubPercent}% (${expectedSocialClubArea.toFixed(0)} sqm)`
    );
  }

  // Rule 4: Check road configuration
  if (plan.roadConfiguration.totalAreaSqm > inputLandArea * 0.25) {
    warnings.push(
      `Road area (${plan.roadConfiguration.totalAreaSqm.toFixed(0)} sqm) exceeds 25% of land. Consider optimizing road layout.`
    );
  }

  // Rule 5: Check land utilization
  if (plan.metrics.landUtilizationPercent < 70) {
    warnings.push(
      `Low land utilization (${plan.metrics.landUtilizationPercent.toFixed(1)}%). Consider increasing lot count or adjusting layout.`
    );
  }

  // Rule 6: Verify metrics consistency
  if (plan.metrics.totalLots !== plan.lotLayout.length) {
    errors.push(
      `Metric inconsistency: totalLots (${plan.metrics.totalLots}) does not match lotLayout length (${plan.lotLayout.length})`
    );
  }

  const actualViableLots = plan.lotLayout.filter(
    (lot) => lot.dimensions.areaSqm >= MIN_LOT_SIZE_SQM
  ).length;
  if (plan.metrics.viableLots !== actualViableLots) {
    errors.push(
      `Metric inconsistency: viableLots (${plan.metrics.viableLots}) does not match actual count (${actualViableLots})`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculates estimated revenue from a subdivision plan
 * (Placeholder - will integrate with financial analysis module)
 */
export function estimatePlanRevenue(plan: SubdivisionPlan, pricePerSqm: number): number {
  const totalSalableArea = plan.lotLayout
    .filter((lot) => lot.dimensions.areaSqm >= MIN_LOT_SIZE_SQM)
    .reduce((sum, lot) => sum + lot.dimensions.areaSqm, 0);

  return totalSalableArea * pricePerSqm;
}

/**
 * Compares two subdivision plans for user decision
 */
export interface PlanComparison {
  planA: AISubdivisionPlan;
  planB: AISubdivisionPlan;
  comparison: {
    lotCountDiff: number; // planB - planA
    utilizationDiff: number; // Percentage points
    averageLotSizeDiff: number; // sqm
    revenueEstimateDiff?: number; // If pricing is available
    recommendation?: 'planA' | 'planB' | 'similar';
  };
}

export function comparePlans(
  planA: AISubdivisionPlan,
  planB: AISubdivisionPlan,
  pricePerSqm?: number
): PlanComparison {
  const lotCountDiff = planB.plan.metrics.viableLots - planA.plan.metrics.viableLots;
  const utilizationDiff =
    planB.plan.metrics.landUtilizationPercent - planA.plan.metrics.landUtilizationPercent;
  const averageLotSizeDiff =
    planB.plan.metrics.averageLotSizeSqm - planA.plan.metrics.averageLotSizeSqm;

  let revenueEstimateDiff: number | undefined;
  if (pricePerSqm) {
    const revenueA = estimatePlanRevenue(planA.plan, pricePerSqm);
    const revenueB = estimatePlanRevenue(planB.plan, pricePerSqm);
    revenueEstimateDiff = revenueB - revenueA;
  }

  // Simple recommendation heuristic
  let recommendation: 'planA' | 'planB' | 'similar' = 'similar';
  if (Math.abs(lotCountDiff) <= 1 && Math.abs(utilizationDiff) <= 2) {
    recommendation = 'similar';
  } else if (lotCountDiff > 0 || (lotCountDiff === 0 && utilizationDiff > 0)) {
    recommendation = 'planB';
  } else {
    recommendation = 'planA';
  }

  return {
    planA,
    planB,
    comparison: {
      lotCountDiff,
      utilizationDiff,
      averageLotSizeDiff,
      revenueEstimateDiff,
      recommendation,
    },
  };
}

/**
 * Formats a subdivision plan for display
 */
export function formatPlanSummary(plan: AISubdivisionPlan): string {
  const { metrics } = plan.plan;
  return `${metrics.viableLots} viable lots • ${metrics.landUtilizationPercent.toFixed(1)}% utilization • Avg ${metrics.averageLotSizeSqm.toFixed(0)} sqm`;
}

/**
 * Gets status badge color for validation status
 */
export function getValidationBadgeColor(status: string): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'valid':
      return 'success';
    case 'warnings':
      return 'warning';
    case 'invalid':
      return 'error';
    default:
      return 'error';
  }
}

/**
 * Checks if a plan can be approved (must be valid)
 */
export function canApprovePlan(plan: AISubdivisionPlan): boolean {
  return (
    plan.generationStatus === 'completed' &&
    plan.validationStatus === 'valid' &&
    !plan.approvedByUser
  );
}

// ============================================================================
// PHASE 5: Multiple Plan Generation & Comparison
// ============================================================================

export interface MultiplePlansRequest {
  projectId: string;
  landParcelId: string;
  landWidth: number;
  landLength: number;
  landArea: number;
  socialClubPercent: number;
  planCount: number; // 3-5 variations
  variationParameters?: {
    lotAspectRatios?: number[]; // e.g., [0.8, 0.9, 1.0, 1.1, 1.2]
    roadLayouts?: ('grid' | 'perimeter' | 'central-spine' | 'loop')[];
    targetLotCounts?: number[]; // Optional guidance per variation
  };
}

export interface ComparisonMetrics {
  lotCount: number;
  viableLots: number;
  averageLotSizeSqm: number;
  landUtilizationPercent: number;
  roadAreaPercent: number;
  socialClubAreaSqm: number;
  estimatedRevenue?: number;
}

/**
 * Generates multiple subdivision plan variations for comparison
 * T115: Implement generateMultiplePlans function
 */
export async function generateMultiplePlans(
  request: MultiplePlansRequest
): Promise<AISubdivisionPlan[]> {
  const plans: AISubdivisionPlan[] = [];

  // T116: Batch generation logic with variation parameters
  const variations = generateVariationParameters(request);

  for (let i = 0; i < request.planCount; i++) {
    const variation = variations[i];

    // Call the AI service through IPC
    const plan = await window.electron.ipcRenderer.invoke('ai:generate-subdivision-plan', {
      projectId: request.projectId,
      landParcelId: request.landParcelId,
      landWidth: request.landWidth,
      landLength: request.landLength,
      landArea: request.landArea,
      socialClubPercent: request.socialClubPercent,
      targetLotCount: variation.targetLotCount,
      preferredRoadLayout: variation.roadLayout,
      preferredLotAspectRatio: variation.lotAspectRatio,
      variationIndex: i,
    });

    plans.push(plan);
  }

  return plans;
}

/**
 * Generates variation parameters for different plan options
 * Internal helper for batch generation
 */
function generateVariationParameters(request: MultiplePlansRequest): Array<{
  targetLotCount?: number;
  roadLayout: 'grid' | 'perimeter' | 'central-spine' | 'loop';
  lotAspectRatio: number;
}> {
  const variations: Array<{
    targetLotCount?: number;
    roadLayout: 'grid' | 'perimeter' | 'central-spine' | 'loop';
    lotAspectRatio: number;
  }> = [];

  const {
    lotAspectRatios = [0.85, 0.9, 1.0, 1.1, 1.15],
    roadLayouts = ['grid', 'perimeter', 'central-spine', 'loop', 'grid'],
    targetLotCounts = [],
  } = request.variationParameters || {};

  for (let i = 0; i < request.planCount; i++) {
    variations.push({
      targetLotCount: targetLotCounts[i],
      roadLayout: roadLayouts[i % roadLayouts.length],
      lotAspectRatio: lotAspectRatios[i % lotAspectRatios.length],
    });
  }

  return variations;
}

/**
 * T117: Calculate comparison metrics for plan evaluation
 */
export function calculateComparisonMetrics(
  plan: AISubdivisionPlan,
  inputLandArea: number,
  pricePerSqm?: number
): ComparisonMetrics {
  const { metrics, roadConfiguration, amenityAreas } = plan.plan;

  const socialClubArea = amenityAreas
    .filter((a) => a.type === 'social-club')
    .reduce((sum, a) => sum + a.areaSqm, 0);

  const roadAreaPercent = (roadConfiguration.totalAreaSqm / inputLandArea) * 100;

  return {
    lotCount: metrics.totalLots,
    viableLots: metrics.viableLots,
    averageLotSizeSqm: metrics.averageLotSizeSqm,
    landUtilizationPercent: metrics.landUtilizationPercent,
    roadAreaPercent,
    socialClubAreaSqm: socialClubArea,
    estimatedRevenue: pricePerSqm ? estimatePlanRevenue(plan.plan, pricePerSqm) : undefined,
  };
}

/**
 * T118: Activate a selected plan (mark as active, archive others)
 */
export interface ActivatePlanRequest {
  planId: string;
  projectId: string;
}

export async function activatePlan(request: ActivatePlanRequest): Promise<void> {
  // Call storage layer through IPC to activate plan
  await window.electron.ipcRenderer.invoke('ai:activate-plan', request);
}

/**
 * Compares multiple plans and ranks them
 */
export interface PlanRanking {
  planId: string;
  rank: number; // 1 = best, 2 = second best, etc.
  score: number; // Composite score for ranking
  metrics: ComparisonMetrics;
  highlights: string[]; // Key advantages of this plan
  concerns: string[]; // Potential issues
}

export function rankPlans(
  plans: AISubdivisionPlan[],
  inputLandArea: number,
  pricePerSqm?: number
): PlanRanking[] {
  const rankings: PlanRanking[] = plans.map((plan, index) => {
    const metrics = calculateComparisonMetrics(plan, inputLandArea, pricePerSqm);

    // Calculate composite score (weighted)
    const score =
      metrics.viableLots * 0.4 + // 40% weight on lot count
      metrics.landUtilizationPercent * 0.3 + // 30% weight on land efficiency
      (100 - metrics.roadAreaPercent) * 0.2 + // 20% weight on minimal road waste
      metrics.averageLotSizeSqm * 0.001; // 10% weight on lot size quality

    const highlights: string[] = [];
    const concerns: string[] = [];

    // Identify highlights
    if (metrics.viableLots >= Math.max(...plans.map((p) => p.plan.metrics.viableLots))) {
      highlights.push('Maximizes lot count');
    }
    if (metrics.landUtilizationPercent >= 85) {
      highlights.push('Excellent land efficiency');
    }
    if (metrics.roadAreaPercent < 15) {
      highlights.push('Minimal road footprint');
    }
    if (metrics.averageLotSizeSqm > 100) {
      highlights.push('Generous lot sizes');
    }

    // Identify concerns
    if (metrics.viableLots < Math.min(...plans.map((p) => p.plan.metrics.viableLots))) {
      concerns.push('Lower lot count than alternatives');
    }
    if (metrics.landUtilizationPercent < 70) {
      concerns.push('Low land utilization');
    }
    if (metrics.roadAreaPercent > 20) {
      concerns.push('High road area usage');
    }
    if (plan.validationStatus === 'warnings') {
      concerns.push('Has validation warnings');
    }

    return {
      planId: plan.id,
      rank: 0, // Will be set after sorting
      score,
      metrics,
      highlights,
      concerns,
    };
  });

  // Sort by score descending and assign ranks
  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });

  return rankings;
}
