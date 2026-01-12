/**
 * AIDescriptionGenerator Service
 *
 * Generates AI-ready prompts and descriptions for:
 * - Claude Code: Subdivision optimization (JSON format)
 * - Google Nano Banana Pro: Image generation (text format)
 */

import type { Project } from '../models/Project';
import type { LandParcel } from '../models/LandParcel';
import type { SubdivisionScenario } from '../models/SubdivisionScenario';
import type { SocialClubDesign } from '../models/SocialClubDesign';
import type { FinancialAnalysis } from '../models/FinancialAnalysis';

/**
 * Claude Code subdivision optimization prompt (JSON format)
 */
export interface ClaudeCodePrompt {
  version: string;
  task: string;
  constraints: {
    landArea: {
      total: number;
      unit: string;
      width: number;
      length: number;
    };
    targetMicroVillas?: number;
    socialClub: {
      percentageRange: [number, number];
      currentSelection?: number;
      minimumArea: number;
    };
    parking: {
      spacesPerVilla: number;
      totalSpaces: number;
      type: string;
    };
    storage: {
      type: 'centralized' | 'individual-patios';
      location?: string;
    };
    maintenanceRoom: {
      required: boolean;
      minimumSize?: number;
      location?: string;
    };
    lots: {
      minimumArea: number;
      unit: string;
    };
  };
  currentConfiguration?: {
    lotCount: number;
    lotDimensions: {
      width: number;
      length: number;
      area: number;
    };
    socialClubDimensions: {
      width: number;
      length: number;
      area: number;
    };
  };
  financialContext?: {
    totalProjectCost: {
      amount: number;
      currency: string;
    };
    costPerSqm: {
      amount: number;
      currency: string;
    };
    targetProfitMargin?: number;
  };
  optimizationGoals: string[];
}

/**
 * Google Nano image generation prompts (text format)
 */
export interface GoogleNanoPrompts {
  version: string;
  prompts: Array<{
    id: string;
    type: 'land-parcel' | 'micro-villa-lot' | 'social-club' | 'parking-area' | 'overall-layout';
    title: string;
    description: string;
    technicalDetails: string[];
    visualElements: string[];
  }>;
}

export class AIDescriptionGenerator {
  /**
   * Generate Claude Code subdivision optimization prompt
   * Creates a JSON file with all constraints and current configuration
   */
  static generateClaudeCodePrompt(project: Project): ClaudeCodePrompt {
    const { landParcel, subdivisionScenarios, selectedScenarioId, socialClubDesign, financialAnalysis } = project;

    // Find selected scenario
    const selectedScenario = selectedScenarioId
      ? subdivisionScenarios.find(s => s.id === selectedScenarioId)
      : null;

    const prompt: ClaudeCodePrompt = {
      version: '1.0.0',
      task: 'Optimize Micro Villas subdivision layout for maximum profitability while maintaining quality standards',
      constraints: {
        landArea: {
          total: landParcel.area,
          unit: 'sqm',
          width: landParcel.width,
          length: landParcel.length,
        },
        targetMicroVillas: landParcel.targetMicroVillas,
        socialClub: {
          percentageRange: [10, 30],
          currentSelection: selectedScenario?.socialClubPercent,
          minimumArea: landParcel.area * 0.10, // 10% minimum
        },
        parking: {
          spacesPerVilla: 2,
          totalSpaces: selectedScenario ? selectedScenario.lots.count * 2 : 0,
          type: 'centralized',
        },
        storage: {
          type: socialClubDesign?.storageType || 'centralized',
          location: socialClubDesign?.storageType === 'centralized' ? 'social-club' : 'individual-patios',
        },
        maintenanceRoom: {
          required: true,
          minimumSize: socialClubDesign?.maintenanceRoom?.size,
          location: socialClubDesign?.maintenanceRoom?.location,
        },
        lots: {
          minimumArea: 90,
          unit: 'sqm',
        },
      },
      optimizationGoals: [
        'Maximize number of viable lots (≥90 sqm each)',
        'Balance social club size with lot count',
        'Ensure efficient parking layout (2 spaces per villa)',
        'Optimize walkway and circulation patterns',
        'Maintain aesthetically pleasing grid layout',
        landParcel.targetMicroVillas
          ? `Target approximately ${landParcel.targetMicroVillas} Micro-Villas`
          : 'Maximize lot count within constraints',
      ].filter(Boolean),
    };

    // Add current configuration if a scenario is selected
    if (selectedScenario) {
      prompt.currentConfiguration = {
        lotCount: selectedScenario.lots.count,
        lotDimensions: {
          width: selectedScenario.lots.width,
          length: selectedScenario.lots.length,
          area: selectedScenario.lots.area,
        },
        socialClubDimensions: {
          width: selectedScenario.socialClub.width,
          length: selectedScenario.socialClub.length,
          area: selectedScenario.socialClub.area,
        },
      };
    }

    // Add financial context if available
    if (financialAnalysis) {
      prompt.financialContext = {
        totalProjectCost: {
          amount: financialAnalysis.totalProjectCost.amount,
          currency: financialAnalysis.totalProjectCost.currency,
        },
        costPerSqm: {
          amount: financialAnalysis.costPerSqm.amount,
          currency: financialAnalysis.costPerSqm.currency,
        },
        targetProfitMargin: financialAnalysis.pricingScenarios?.[0]?.profitMarginPercent,
      };
    }

    return prompt;
  }

  /**
   * Generate Google Nano Banana Pro image prompts
   * Creates descriptive text for AI image generation
   */
  static generateGoogleNanoPrompts(project: Project): GoogleNanoPrompts {
    const { landParcel, subdivisionScenarios, selectedScenarioId, socialClubDesign } = project;

    const selectedScenario = selectedScenarioId
      ? subdivisionScenarios.find(s => s.id === selectedScenarioId)
      : null;

    if (!selectedScenario) {
      throw new Error('No subdivision scenario selected. Please select a scenario first.');
    }

    const prompts: GoogleNanoPrompts = {
      version: '1.0.0',
      prompts: [],
    };

    // 1. Overall Layout Prompt
    prompts.prompts.push({
      id: 'overall-layout',
      type: 'overall-layout',
      title: 'Micro Villas Community - Aerial View',
      description: `A modern Micro Villas residential community in ${landParcel.province}, Dominican Republic.
      The development features ${selectedScenario.lots.count} individual villa lots arranged in a ${selectedScenario.lots.grid.distribution} grid pattern,
      surrounding a centralized social club area. The property is ${landParcel.isUrbanized ? 'in an urbanized area' : 'in a developing area'}.`,
      technicalDetails: [
        `Total area: ${landParcel.area.toFixed(2)} square meters`,
        `Social club: ${selectedScenario.socialClub.area.toFixed(2)} sqm (${selectedScenario.socialClubPercent}% of total)`,
        `Individual lot size: ${selectedScenario.lots.area.toFixed(2)} sqm each`,
        `Grid layout: ${selectedScenario.lots.grid.rows} rows × ${selectedScenario.lots.grid.columns} columns`,
        `Centralized parking: ${selectedScenario.lots.count * 2} spaces`,
      ],
      visualElements: [
        'Aerial/bird\'s-eye view perspective',
        'Modern Caribbean residential architecture',
        'Lush tropical landscaping',
        'Clear lot boundaries and walkways',
        'Central social club with pool visible',
        'Organized parking area',
        'Well-maintained grounds',
      ],
    });

    // 2. Individual Micro Villa Lot Prompt
    prompts.prompts.push({
      id: 'micro-villa-lot',
      type: 'micro-villa-lot',
      title: 'Individual Micro Villa Lot',
      description: `A single Micro Villa lot within the community, measuring ${selectedScenario.lots.width.toFixed(1)}m × ${selectedScenario.lots.length.toFixed(1)}m
      (${selectedScenario.lots.area.toFixed(2)} square meters). The lot features ${socialClubDesign?.storageType === 'individual-patios' ? 'an individual patio storage unit' : 'access to centralized storage'}.`,
      technicalDetails: [
        `Lot dimensions: ${selectedScenario.lots.width.toFixed(2)}m × ${selectedScenario.lots.length.toFixed(2)}m`,
        `Total area: ${selectedScenario.lots.area.toFixed(2)} sqm`,
        `Common area ownership: ${selectedScenario.commonAreaPercentPerLot.toFixed(2)}%`,
        `Storage: ${socialClubDesign?.storageType || 'Not configured'}`,
        `Parking: 2 spaces in centralized area`,
      ],
      visualElements: [
        'Modern single-story villa design',
        'Small front garden/patio area',
        'Clear property boundaries',
        socialClubDesign?.storageType === 'individual-patios' ? 'Outdoor storage shed' : 'Clean lot perimeter',
        'Tropical landscaping elements',
        'Contemporary Dominican architectural style',
      ],
    });

    // 3. Social Club Prompt
    if (socialClubDesign && socialClubDesign.selectedAmenities.length > 0) {
      const amenitiesList = socialClubDesign.selectedAmenities
        .map(a => `${a.quantity}x ${a.name}`)
        .join(', ');

      prompts.prompts.push({
        id: 'social-club',
        type: 'social-club',
        title: 'Community Social Club & Amenities',
        description: `The centralized social club area occupying ${selectedScenario.socialClub.area.toFixed(2)} square meters
        (${selectedScenario.socialClubPercent}% of the community). Features include: ${amenitiesList}.
        ${socialClubDesign.storageType === 'centralized' ? `Includes dedicated storage area (${socialClubDesign.dedicatedStorageArea?.toFixed(2)} sqm).` : ''}
        ${socialClubDesign.maintenanceRoom ? `Maintenance room: ${socialClubDesign.maintenanceRoom.size.toFixed(2)} sqm (${socialClubDesign.maintenanceRoom.location}).` : ''}`,
        technicalDetails: [
          `Social club area: ${selectedScenario.socialClub.area.toFixed(2)} sqm`,
          `Dimensions: ${selectedScenario.socialClub.width.toFixed(2)}m × ${selectedScenario.socialClub.length.toFixed(2)}m`,
          `Total amenities: ${socialClubDesign.selectedAmenities.length}`,
          `Amenities by category: ${this.groupAmenitiesByCategory(socialClubDesign)}`,
          socialClubDesign.storageType === 'centralized'
            ? `Centralized storage: ${socialClubDesign.dedicatedStorageArea?.toFixed(2)} sqm`
            : 'Individual patio storage for each lot',
          socialClubDesign.maintenanceRoom
            ? `Maintenance room: ${socialClubDesign.maintenanceRoom.size.toFixed(2)} sqm`
            : 'Maintenance room not configured',
        ],
        visualElements: [
          'Modern tropical resort-style design',
          'Swimming pool with lounging area',
          'BBQ and outdoor dining pavilion',
          'Landscaped walkways and gardens',
          'Covered recreation areas',
          'Well-maintained facilities',
          'Inviting social gathering spaces',
        ],
      });
    }

    // 4. Parking Area Prompt
    const totalParkingSpaces = selectedScenario.lots.count * 2;
    prompts.prompts.push({
      id: 'parking-area',
      type: 'parking-area',
      title: 'Centralized Parking Area',
      description: `A well-organized centralized parking facility providing ${totalParkingSpaces} spaces
      (2 spaces per villa) for the ${selectedScenario.lots.count} Micro Villa lots. The parking area features
      clear demarcation, lighting, and landscaping integration.`,
      technicalDetails: [
        `Total spaces: ${totalParkingSpaces}`,
        `Spaces per villa: 2`,
        `Layout type: Centralized`,
        `Surface: Paved with proper drainage`,
        `Lighting: Yes (evening/night use)`,
      ],
      visualElements: [
        'Organized parking layout with clear markings',
        'Well-lit for nighttime use',
        'Paved surface with proper drainage',
        'Integrated landscaping (trees/shrubs between sections)',
        'Clear signage for lot assignments',
        'Pedestrian walkways to villa lots',
        'Modern and well-maintained appearance',
      ],
    });

    // 5. Land Parcel Context Prompt
    const landmarks = landParcel.landmarks.length > 0
      ? landParcel.landmarks.map(l => `${l.name} (${l.type}${l.distance ? `, ${l.distance.toFixed(1)}km away` : ''})`).join(', ')
      : 'No specific landmarks recorded';

    prompts.prompts.push({
      id: 'land-parcel',
      type: 'land-parcel',
      title: 'Land Parcel Location & Context',
      description: `The property is located in ${landParcel.province}, Dominican Republic.
      ${landParcel.isUrbanized ? 'The area is urbanized with existing infrastructure.' : 'The area is in a developing zone with growing infrastructure.'}
      Nearby landmarks: ${landmarks}.`,
      technicalDetails: [
        `Province: ${landParcel.province}`,
        `Total area: ${landParcel.area.toFixed(2)} sqm`,
        `Dimensions: ${landParcel.width.toFixed(2)}m × ${landParcel.length.toFixed(2)}m`,
        `Urbanization status: ${landParcel.isUrbanized ? 'Urbanized' : 'Developing'}`,
        `Nearby landmarks: ${landParcel.landmarks.length}`,
      ],
      visualElements: [
        `${landParcel.province} region characteristics`,
        'Dominican Republic tropical climate',
        'Caribbean architectural influences',
        landParcel.isUrbanized ? 'Urban/suburban setting' : 'Rural/developing area setting',
        'Natural landscape features',
        'Local vegetation and terrain',
      ],
    });

    return prompts;
  }

  /**
   * Helper: Group amenities by category for description
   */
  private static groupAmenitiesByCategory(socialClubDesign: SocialClubDesign): string {
    const categoryCount: Record<string, number> = {};

    socialClubDesign.selectedAmenities.forEach(amenity => {
      categoryCount[amenity.category] = (categoryCount[amenity.category] || 0) + amenity.quantity;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => `${category} (${count})`)
      .join(', ');
  }
}
