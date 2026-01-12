/**
 * Export.ts
 *
 * Data structures for project export operations.
 *
 * Related Tasks:
 * - T161: Create ExportResult TypeScript interface
 * - T162: Create project JSON export schema v1.0.0 with checksum validation
 */

/**
 * Result of a project export operation
 */
export interface ExportResult {
  success: boolean;
  exportPath: string;
  files: {
    projectJson: string;
    images: string[];
    aiPrompts?: string[];
  };
  metadata: {
    exportDate: Date;
    fileCount: number;
    totalSize: number; // bytes
    checksum: string; // SHA-256 hash of project.json
  };
  errors?: string[];
  warnings?: string[];
}

/**
 * Project JSON export schema (v1.0.0)
 * This is the root structure exported to project.json
 */
export interface ProjectExportSchema {
  schemaVersion: '1.0.0';
  exportDate: string; // ISO 8601
  project: {
    id: string;
    name: string;
    created: string; // ISO 8601
    modified: string; // ISO 8601
    status: 'draft' | 'in_progress' | 'finalized';
    notes?: string;
    targetDirectory?: string; // Path where project is exported

    // Land parcel data
    landParcel: {
      id: string;
      width: number; // meters
      length: number; // meters
      area: number; // square meters
      province: string;
      landmarks: Array<{
        type: 'beach' | 'airport' | 'tourist_attraction' | 'infrastructure' | 'other';
        name: string;
        distance?: number; // km
        description?: string;
      }>;
      isUrbanized: boolean;
      acquisitionCost: {
        amount: number;
        currency: 'DOP' | 'USD';
      };
      displayUnit: 'sqm' | 'sqft';
    };

    // All subdivision scenarios (up to 21)
    subdivisionScenarios: Array<{
      id: string;
      socialClubPercent: number; // 10-30
      socialClub: {
        width: number;
        length: number;
        area: number;
        position: { x: number; y: number };
      };
      parkingArea: {
        totalSpaces: number; // 2 per villa
        spacesPerVilla: number; // Always 2
        location: 'centralized' | 'distributed';
        estimatedArea: number; // sqm
      };
      maintenanceRoom: {
        area: number; // sqm
        location: 'social-club' | 'separate';
        position?: { x: number; y: number };
      };
      lots: {
        count: number;
        width: number;
        length: number;
        area: number;
        minArea: number; // 90 sqm
        grid: {
          rows: number;
          columns: number;
          distribution: 'horizontal-strips' | 'vertical-strips' | 'four-quadrants';
        };
      };
      totalLotsArea: number;
      commonAreaPercentPerLot: number;
      isViable: boolean;
      calculatedAt: string; // ISO 8601
    }>;

    selectedScenarioId?: string;

    // Social club design (if scenario selected)
    socialClubDesign?: {
      id: string;
      scenarioId: string;
      selectedAmenities: Array<{
        amenityId: string;
        category: string;
        name: string;
        quantity: number;
        unitCost: { amount: number; currency: 'DOP' | 'USD' };
        totalCost: { amount: number; currency: 'DOP' | 'USD' };
        spaceRequirement?: number;
      }>;
      storageType: 'centralized' | 'individual-patios';
      storageArea?: number; // sqm (if centralized)
      totalCost: { amount: number; currency: 'DOP' | 'USD' };
      totalArea: number;
    };

    // Financial analysis (if costs entered)
    financialAnalysis?: {
      id: string;
      costs: {
        landAcquisition: { amount: number; currency: 'DOP' | 'USD' };
        amenities: { amount: number; currency: 'DOP' | 'USD' };
        parkingArea: { amount: number; currency: 'DOP' | 'USD' };
        walkways: { amount: number; currency: 'DOP' | 'USD' };
        landscaping: { amount: number; currency: 'DOP' | 'USD' };
        maintenanceRoom: { amount: number; currency: 'DOP' | 'USD' };
        storage: { amount: number; currency: 'DOP' | 'USD' };
        legal: {
          notaryFees: { amount: number; currency: 'DOP' | 'USD' };
          permits: { amount: number; currency: 'DOP' | 'USD' };
          registrations: { amount: number; currency: 'DOP' | 'USD' };
          total: { amount: number; currency: 'DOP' | 'USD' };
        };
        other: Array<{
          id: string;
          label: string;
          amount: { amount: number; currency: 'DOP' | 'USD' };
          description?: string;
        }>;
      };
      totalProjectCost: { amount: number; currency: 'DOP' | 'USD' };
      costPerSqm: { amount: number; currency: 'DOP' | 'USD' };
      costPerSqmSharedAreas: { amount: number; currency: 'DOP' | 'USD' };
      baseLotCost: { amount: number; currency: 'DOP' | 'USD' };
      pricingScenarios: Array<{
        id: string;
        profitMarginPercent: number;
        lotSalePrice: { amount: number; currency: 'DOP' | 'USD' };
        totalRevenue: { amount: number; currency: 'DOP' | 'USD' };
        expectedProfit: { amount: number; currency: 'DOP' | 'USD' };
        roi: number;
      }>;
      monthlyMaintenanceCost?: { amount: number; currency: 'DOP' | 'USD' };
      monthlyMaintenancePerOwner?: { amount: number; currency: 'DOP' | 'USD' };
      exchangeRate?: {
        from: 'DOP' | 'USD';
        to: 'DOP' | 'USD';
        rate: number;
        effectiveDate: string; // ISO 8601
      };
      calculatedAt: string; // ISO 8601
      lastModified: string; // ISO 8601
    };

    // Images metadata (actual files in images/ subfolder)
    images: Array<{
      id: string;
      associatedWith: 'land-parcel' | 'lot';
      lotId?: string;
      filename: string;
      format: 'jpeg' | 'png' | 'webp';
      size: number; // bytes
      width: number; // pixels
      height: number; // pixels
      relativePathInExport: string; // e.g., "images/land-aerial.jpg"
      uploadedAt: string; // ISO 8601
      caption?: string;
    }>;
  };

  metadata: {
    exportedBy: string; // "MicroVillas Platform v1.0.0"
    checksum: string; // SHA-256 hash for data integrity
    fileCount: number; // Total files in export
    totalSize: number; // Total bytes
  };
}

/**
 * Directory structure validator for export operations
 */
export interface ExportDirectoryStructure {
  rootPath: string;
  projectJsonPath: string;
  imagesDir: string;
  aiPromptsDir?: string;
  isValid: boolean;
  writeable: boolean;
  errors?: string[];
}
