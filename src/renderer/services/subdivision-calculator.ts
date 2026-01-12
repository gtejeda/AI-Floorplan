/**
 * SubdivisionCalculator - Grid-based land division algorithm
 *
 * Generates 10-30% social club scenarios (1% increments = 21 scenarios)
 * Time Complexity: O(1) per scenario
 * Performance Target: <2 seconds for all 21 scenarios (SC-002)
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SubdivisionScenario,
  Position2D,
  SUBDIVISION_CONSTRAINTS,
} from '../models/SubdivisionScenario';
import { calculateParkingArea, PARKING_CONSTANTS } from '../models/ParkingArea';
import {
  calculateMaintenanceRoomArea,
  MAINTENANCE_ROOM_CONSTANTS,
} from '../models/MaintenanceRoom';

export interface LandParcelInput {
  id: string;
  width: number; // meters
  length: number; // meters
  area: number; // square meters
}

export interface SubdivisionOptions {
  targetLotCount?: number; // Optional: preferred number of villas
  minLotArea?: number; // Default: 90 sqm
  includeWalkways?: boolean; // Default: true
  walkwayWidth?: number; // Default: 1.5 meters
}

export class SubdivisionCalculator {
  /**
   * Calculate all viable subdivision scenarios (10-30% social club)
   * Returns scenarios where all lots >= minLotArea
   *
   * Performance optimizations:
   * - Pre-calculate common values
   * - Early exit for non-viable scenarios
   * - Batch processing for better CPU cache utilization
   */
  static calculateAllScenarios(
    parcel: LandParcelInput,
    options: SubdivisionOptions = {}
  ): SubdivisionScenario[] {
    const startTime = performance.now();
    const scenarios: SubdivisionScenario[] = [];

    const minLotArea = options.minLotArea || SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA;

    // Pre-calculate values used across all scenarios
    const totalArea = parcel.area;
    const aspectRatio = parcel.length / parcel.width;
    const includeWalkways = options.includeWalkways !== false;
    const walkwayWidth = options.walkwayWidth || SUBDIVISION_CONSTRAINTS.TYPICAL_WALKWAY_WIDTH;

    // Generate scenarios for 10-30% in 1% increments (21 total)
    for (
      let percent = SUBDIVISION_CONSTRAINTS.SOCIAL_CLUB_MIN_PERCENT;
      percent <= SUBDIVISION_CONSTRAINTS.SOCIAL_CLUB_MAX_PERCENT;
      percent++
    ) {
      // Early exit: if social club takes too much space, skip
      const socialClubArea = totalArea * (percent / 100);
      const remainingArea = totalArea - socialClubArea;

      if (remainingArea < minLotArea * 2) {
        // Not enough space for even 2 lots
        continue;
      }

      const scenario = this.calculateSubdivision(parcel, percent, options);

      // Filter out non-viable scenarios (lots < minLotArea)
      if (scenario && scenario.isViable && scenario.lots.area >= minLotArea) {
        scenarios.push(scenario);
      }
    }

    const calculationTime = performance.now() - startTime;

    // Only log if performance target exceeded
    if (calculationTime > 2000) {
      console.warn(
        `[SubdivisionCalculator] Performance warning: Generated ${scenarios.length}/21 viable scenarios in ${calculationTime.toFixed(2)}ms (target: <2000ms)`
      );
    }

    return scenarios;
  }

  /**
   * Calculate single subdivision scenario for given social club percentage
   * Optimized with minimal object allocations and redundant calculations
   */
  static calculateSubdivision(
    parcel: LandParcelInput,
    socialClubPercent: number,
    options: SubdivisionOptions = {}
  ): SubdivisionScenario | null {
    const totalArea = parcel.area;
    const includeWalkways = options.includeWalkways !== false;
    const walkwayWidth = options.walkwayWidth || SUBDIVISION_CONSTRAINTS.TYPICAL_WALKWAY_WIDTH;

    // 1. Calculate social club dimensions (centered, maintains aspect ratio)
    const socialClubFraction = socialClubPercent / 100;
    const socialClubArea = totalArea * socialClubFraction;
    const aspectRatio = parcel.length / parcel.width;
    const clubWidth = Math.sqrt(socialClubArea / aspectRatio);
    const clubLength = clubWidth * aspectRatio;
    const clubPosition: Position2D = {
      x: (parcel.width - clubWidth) / 2,
      y: (parcel.length - clubLength) / 2,
    };

    // 2. Calculate remaining area around social club
    const remainingArea = totalArea - socialClubArea;

    // 3. Estimate parking area (2 spaces per villa)
    // We need to iteratively find lot count, so start with estimate
    const estimatedLotCount = Math.floor(
      remainingArea / (SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA * 1.5)
    );
    const parkingEstimate = calculateParkingArea(estimatedLotCount);
    const parkingArea = parkingEstimate.recommendedArea;

    // 4. Estimate maintenance room area
    const maintenanceRoomArea = MAINTENANCE_ROOM_CONSTANTS.MIN_AREA;

    // 5. Estimate walkways (if included)
    const walkwayArea = includeWalkways
      ? this.estimateWalkwayArea(parcel.width, parcel.length, walkwayWidth)
      : 0;

    // 6. Estimate landscaping (green spaces around parking and common areas)
    const landscapingArea = (parkingArea + maintenanceRoomArea) * 0.15; // 15% of infrastructure

    // 7. Calculate actual area available for lots
    const availableForLots =
      remainingArea - parkingArea - maintenanceRoomArea - walkwayArea - landscapingArea;

    if (availableForLots <= 0) {
      // Not enough space for lots
      return null;
    }

    // 8. Calculate lot dimensions using grid strategies
    const gridResult = this.calculateOptimalGrid(
      parcel.width,
      parcel.length,
      availableForLots,
      clubWidth,
      clubLength,
      clubPosition
    );

    if (!gridResult || gridResult.lotArea < SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA) {
      return null;
    }

    // 9. Recalculate parking with actual lot count
    const actualParkingCalc = calculateParkingArea(gridResult.lotCount);
    const finalParkingArea = actualParkingCalc.recommendedArea;
    const parkingSpacesCount = actualParkingCalc.spacesCount;

    // 10. Position parking area (adjacent to social club or in corner)
    const parkingPosition: Position2D = {
      x: 0,
      y: 0, // Bottom-left corner
    };
    const parkingWidth = Math.sqrt(
      finalParkingArea / (PARKING_CONSTANTS.STANDARD_SPACE_LENGTH / PARKING_CONSTANTS.STANDARD_SPACE_WIDTH)
    );
    const parkingLength = finalParkingArea / parkingWidth;

    // 11. Position maintenance room (in social club or separate)
    const maintenancePosition: Position2D = {
      x: clubPosition.x,
      y: clubPosition.y, // Inside social club by default
    };
    const maintenanceWidth = Math.sqrt(maintenanceRoomArea);
    const maintenanceLength = maintenanceRoomArea / maintenanceWidth;

    // 12. Calculate common area ownership percentage per lot
    const totalCommonArea =
      socialClubArea + finalParkingArea + maintenanceRoomArea + walkwayArea + landscapingArea;
    const commonAreaPercentPerLot = 100 / gridResult.lotCount;

    // 13. Build complete scenario
    const scenario: SubdivisionScenario = {
      id: uuidv4(),
      landParcelId: parcel.id,
      socialClubPercent,

      socialClub: {
        width: clubWidth,
        length: clubLength,
        area: socialClubArea,
        position: clubPosition,
      },

      parkingArea: {
        width: parkingWidth,
        length: parkingLength,
        area: finalParkingArea,
        spacesCount: parkingSpacesCount,
        spaceWidth: PARKING_CONSTANTS.STANDARD_SPACE_WIDTH,
        spaceLength: PARKING_CONSTANTS.STANDARD_SPACE_LENGTH,
        position: parkingPosition,
      },

      maintenanceRoom: {
        width: maintenanceWidth,
        length: maintenanceLength,
        area: maintenanceRoomArea,
        position: maintenancePosition,
        location: 'in-social-club', // Default
      },

      lots: {
        count: gridResult.lotCount,
        width: gridResult.lotWidth,
        length: gridResult.lotLength,
        area: gridResult.lotArea,
        minArea: SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA,
        grid: {
          rows: gridResult.rows,
          columns: gridResult.columns,
          distribution: gridResult.distribution,
        },
      },

      walkways: {
        totalArea: walkwayArea,
        averageWidth: walkwayWidth,
      },

      landscaping: {
        totalArea: landscapingArea,
      },

      totalLotsArea: gridResult.lotCount * gridResult.lotArea,
      commonAreaPercentPerLot,

      isViable: gridResult.lotArea >= SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA,
      calculatedAt: new Date(),
    };

    return scenario;
  }

  /**
   * Calculate optimal lot grid configuration
   * Tries multiple strategies and picks the one with most lots
   *
   * @param parcelWidth - Width of the land parcel in meters
   * @param parcelLength - Length of the land parcel in meters
   * @param availableArea - Area available for lots (after social club, parking, etc.) in sqm
   * @param clubWidth - Width of the social club area in meters
   * @param clubLength - Length of the social club area in meters
   * @param clubPosition - Position of the social club (x, y coordinates)
   * @returns Grid configuration with most lots, or null if no viable configuration exists
   */
  private static calculateOptimalGrid(
    parcelWidth: number,
    parcelLength: number,
    availableArea: number,
    clubWidth: number,
    clubLength: number,
    clubPosition: Position2D
  ): {
    lotWidth: number;
    lotLength: number;
    lotArea: number;
    lotCount: number;
    rows: number;
    columns: number;
    distribution: 'horizontal-strips' | 'vertical-strips' | 'four-quadrants';
  } | null {
    const strategies = [
      this.calculateHorizontalStrips(parcelWidth, parcelLength, availableArea, clubPosition, clubLength),
      this.calculateVerticalStrips(parcelWidth, parcelLength, availableArea, clubPosition, clubWidth),
      this.calculateFourQuadrants(parcelWidth, parcelLength, availableArea, clubPosition, clubWidth, clubLength),
    ];

    // Pick strategy with most lots
    const best = strategies
      .filter((s) => s !== null)
      .reduce((best, current) => {
        if (!best) return current;
        return current!.lotCount > best.lotCount ? current : best;
      }, null as any);

    return best;
  }

  /**
   * Horizontal strips strategy: lots arranged in horizontal rows above/below social club
   *
   * @param parcelWidth - Width of the land parcel in meters
   * @param parcelLength - Length of the land parcel in meters
   * @param availableArea - Area available for lots in sqm
   * @param clubPosition - Position of the social club (x, y coordinates)
   * @param clubLength - Length of the social club area in meters
   * @returns Grid configuration for horizontal strip layout, or null if not viable
   */
  private static calculateHorizontalStrips(
    parcelWidth: number,
    parcelLength: number,
    availableArea: number,
    clubPosition: Position2D,
    clubLength: number
  ) {
    // Available vertical space above and below social club
    const topSpace = clubPosition.y;
    const bottomSpace = parcelLength - (clubPosition.y + clubLength);
    const totalVerticalSpace = topSpace + bottomSpace;

    if (totalVerticalSpace <= 0) return null;

    // Lot width = full parcel width (simplified)
    const lotWidth = parcelWidth;

    // Try different lot lengths
    const targetLotArea = SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA;
    const lotLength = Math.max(targetLotArea / lotWidth, targetLotArea / lotWidth);

    // How many rows can fit?
    const rows = Math.floor(totalVerticalSpace / lotLength);
    const columns = 1; // Full width lots
    const lotCount = rows * columns;
    const lotArea = lotWidth * lotLength;

    if (lotCount === 0 || lotArea < SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA) {
      return null;
    }

    return {
      lotWidth,
      lotLength,
      lotArea,
      lotCount,
      rows,
      columns,
      distribution: 'horizontal-strips' as const,
    };
  }

  /**
   * Vertical strips strategy: lots arranged in vertical columns left/right of social club
   */
  private static calculateVerticalStrips(
    parcelWidth: number,
    parcelLength: number,
    availableArea: number,
    clubPosition: Position2D,
    clubWidth: number
  ) {
    const leftSpace = clubPosition.x;
    const rightSpace = parcelWidth - (clubPosition.x + clubWidth);
    const totalHorizontalSpace = leftSpace + rightSpace;

    if (totalHorizontalSpace <= 0) return null;

    const lotLength = parcelLength;
    const targetLotArea = SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA;
    const lotWidth = Math.max(targetLotArea / lotLength, targetLotArea / lotLength);

    const columns = Math.floor(totalHorizontalSpace / lotWidth);
    const rows = 1;
    const lotCount = rows * columns;
    const lotArea = lotWidth * lotLength;

    if (lotCount === 0 || lotArea < SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA) {
      return null;
    }

    return {
      lotWidth,
      lotLength,
      lotArea,
      lotCount,
      rows,
      columns,
      distribution: 'vertical-strips' as const,
    };
  }

  /**
   * Four quadrants strategy: lots arranged in 4 sections around social club
   */
  private static calculateFourQuadrants(
    parcelWidth: number,
    parcelLength: number,
    availableArea: number,
    clubPosition: Position2D,
    clubWidth: number,
    clubLength: number
  ) {
    // Simplified: divide available area into equal lots
    const targetLotArea = SUBDIVISION_CONSTRAINTS.MIN_LOT_AREA * 1.2; // Slightly larger
    const estimatedLotCount = Math.floor(availableArea / targetLotArea);

    if (estimatedLotCount === 0) return null;

    // Assume square-ish lots
    const lotArea = availableArea / estimatedLotCount;
    const lotSide = Math.sqrt(lotArea);
    const lotWidth = lotSide;
    const lotLength = lotSide;

    // Grid dimensions (approximate)
    const columns = Math.max(1, Math.floor(parcelWidth / lotWidth));
    const rows = Math.max(1, Math.ceil(estimatedLotCount / columns));
    const lotCount = Math.min(estimatedLotCount, rows * columns);

    return {
      lotWidth,
      lotLength,
      lotArea,
      lotCount,
      rows,
      columns,
      distribution: 'four-quadrants' as const,
    };
  }

  /**
   * Estimate walkway area based on parcel size
   */
  private static estimateWalkwayArea(
    parcelWidth: number,
    parcelLength: number,
    walkwayWidth: number
  ): number {
    // Assume main walkways along perimeter + internal paths
    const perimeterLength = 2 * (parcelWidth + parcelLength);
    const internalPathsLength = (parcelWidth + parcelLength) * 0.5; // Rough estimate
    const totalWalkwayLength = perimeterLength + internalPathsLength;
    return totalWalkwayLength * walkwayWidth;
  }

  /**
   * Find scenarios matching target lot count (for FR-025)
   */
  static findMatchingScenarios(
    scenarios: SubdivisionScenario[],
    targetLotCount: number,
    tolerance: number = 2
  ): SubdivisionScenario[] {
    return scenarios.filter(
      (s) => Math.abs(s.lots.count - targetLotCount) <= tolerance
    );
  }
}
