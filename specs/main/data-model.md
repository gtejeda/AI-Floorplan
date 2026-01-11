# Data Model: Micro Villas Investment Platform

**Phase 1 Output** | **Date**: 2026-01-10 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Overview

This document defines all data entities, their TypeScript interfaces, validation rules, and relationships. The data model is designed for:
- **Offline-first architecture** (Constitution Principle II)
- **Data integrity** (Constitution Principle V - 100% fidelity across sessions/exports)
- **AI-ready structure** (Constitution Principle III - JSON export for AI consumption)
- **Financial accuracy** (Constitution Principle I - transparent calculations)

**Storage Strategy**:
- **SQLite** (via `better-sqlite3`): Project data, scenarios, financial analyses
- **File system**: Exported JSON + images
- **electron-store**: Application settings (amenities catalog, provinces list)

---

## Entity Relationship Diagram

```
Project (1)
├── LandParcel (1)
│   └── landmarks (N)
├── SubdivisionScenario (N) - up to 21 scenarios
│   ├── SocialClub (1)
│   └── MicroVillaLot (N)
├── SocialClub (1) - from selected scenario
│   └── Amenity (N)
├── FinancialAnalysis (1)
│   ├── CostBreakdown (1)
│   └── PricingScenario (N)
└── ProjectImage (N)
    └── LotImage (N) - associated with specific lots
```

---

## Core Entities

### 1. Project

**Purpose**: Root container for complete investment package

**TypeScript Interface**:

```typescript
interface Project {
  // Identity
  id: string; // UUID v4
  name: string;
  created: Date; // ISO 8601
  modified: Date; // ISO 8601
  version: string; // Data schema version (e.g., "1.0.0")

  // Data
  landParcel: LandParcel;
  subdivisionScenarios: SubdivisionScenario[]; // All calculated scenarios (up to 21)
  selectedScenarioId: string | null; // ID of active scenario
  socialClubDesign: SocialClubDesign | null; // Only if scenario selected
  financialAnalysis: FinancialAnalysis | null; // Only if costs entered
  images: ProjectImage[]; // Land parcel and lot images

  // Metadata
  status: 'draft' | 'in_progress' | 'finalized';
  notes?: string;
}
```

**Validation Rules**:
- `id`: Must be valid UUID v4
- `name`: Required, 1-200 characters
- `created` ≤ `modified`
- `subdivisionScenarios.length` ≤ 21
- If `selectedScenarioId` not null, must exist in `subdivisionScenarios`
- `version`: Semantic version format (MAJOR.MINOR.PATCH)

**SQLite Schema**:

```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created TEXT NOT NULL, -- ISO 8601
    modified TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    land_parcel_id TEXT NOT NULL,
    selected_scenario_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    FOREIGN KEY (land_parcel_id) REFERENCES land_parcels(id),
    FOREIGN KEY (selected_scenario_id) REFERENCES subdivision_scenarios(id)
);

CREATE INDEX idx_projects_modified ON projects(modified DESC);
CREATE INDEX idx_projects_status ON projects(status);
```

---

### 2. LandParcel

**Purpose**: Investment property with physical dimensions and location

**TypeScript Interface**:

```typescript
interface LandParcel {
  // Identity
  id: string; // UUID v4
  projectId: string; // Foreign key

  // Dimensions (stored in canonical unit: meters)
  width: number; // meters (internal storage)
  length: number; // meters (internal storage)
  area: number; // square meters (calculated: width × length)

  // Location
  province: DominicanRepublicProvince; // Enum
  landmarks: Landmark[]; // Nearby points of interest

  // Characteristics
  isUrbanized: boolean;

  // Financial
  acquisitionCost: Money;

  // Preferences
  displayUnit: 'sqm' | 'sqft'; // User's preferred display unit
}

type DominicanRepublicProvince =
  | 'Azua'
  | 'Baoruco'
  | 'Barahona'
  | 'Dajabón'
  | 'Distrito Nacional'
  | 'Duarte'
  | 'Elías Piña'
  | 'El Seibo'
  | 'Espaillat'
  | 'Hato Mayor'
  | 'Hermanas Mirabal'
  | 'Independencia'
  | 'La Altagracia'
  | 'La Romana'
  | 'La Vega'
  | 'María Trinidad Sánchez'
  | 'Monseñor Nouel'
  | 'Monte Cristi'
  | 'Monte Plata'
  | 'Pedernales'
  | 'Peravia'
  | 'Puerto Plata'
  | 'Samaná'
  | 'San Cristóbal'
  | 'San José de Ocoa'
  | 'San Juan'
  | 'San Pedro de Macorís'
  | 'Sánchez Ramírez'
  | 'Santiago'
  | 'Santiago Rodríguez'
  | 'Santo Domingo'
  | 'Valverde';

interface Landmark {
  type: 'beach' | 'airport' | 'tourist_attraction' | 'infrastructure' | 'other';
  name: string;
  distance?: number; // kilometers (optional)
  description?: string;
}

interface Money {
  amount: number; // Stored with full precision (not rounded)
  currency: 'DOP' | 'USD';
}
```

**Validation Rules**:
- `width`, `length`: Must be > 0
- `area`: Auto-calculated, must match `width × length` (precision: 2 decimals)
- `province`: Must be valid Dominican Republic province
- `acquisitionCost.amount`: Must be ≥ 0
- `acquisitionCost.currency`: Only 'DOP' or 'USD' allowed
- `landmarks`: Each must have valid `type` and non-empty `name`

**SQLite Schema**:

```sql
CREATE TABLE land_parcels (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    width_meters REAL NOT NULL CHECK(width_meters > 0),
    length_meters REAL NOT NULL CHECK(length_meters > 0),
    area_sqm REAL NOT NULL CHECK(area_sqm > 0),
    province TEXT NOT NULL,
    is_urbanized INTEGER NOT NULL DEFAULT 0, -- Boolean: 0/1
    acquisition_cost_amount REAL NOT NULL CHECK(acquisition_cost_amount >= 0),
    acquisition_cost_currency TEXT NOT NULL CHECK(acquisition_cost_currency IN ('DOP', 'USD')),
    display_unit TEXT NOT NULL DEFAULT 'sqm' CHECK(display_unit IN ('sqm', 'sqft')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE landmarks (
    id TEXT PRIMARY KEY,
    land_parcel_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('beach', 'airport', 'tourist_attraction', 'infrastructure', 'other')),
    name TEXT NOT NULL,
    distance_km REAL, -- Optional
    description TEXT, -- Optional
    FOREIGN KEY (land_parcel_id) REFERENCES land_parcels(id) ON DELETE CASCADE
);

CREATE INDEX idx_landmarks_parcel ON landmarks(land_parcel_id);
```

**Unit Conversion Utility**:

```typescript
const CONVERSION_FACTORS = {
  SQM_TO_SQFT: 10.763910417, // Exact
  SQFT_TO_SQM: 0.09290304,   // Exact
};

class LandParcelModel {
  private _widthMeters: number;
  private _lengthMeters: number;

  // Setters accept any unit, convert to meters
  setDimensions(width: number, length: number, unit: 'sqm' | 'sqft' = 'sqm') {
    if (unit === 'sqft') {
      this._widthMeters = Math.sqrt(width * length * CONVERSION_FACTORS.SQFT_TO_SQM);
      this._lengthMeters = Math.sqrt(width * length * CONVERSION_FACTORS.SQFT_TO_SQM);
    } else {
      this._widthMeters = width;
      this._lengthMeters = length;
    }
  }

  // Getters convert on demand
  getDimensions(unit: 'sqm' | 'sqft' = 'sqm', precision: number = 2) {
    const width = this._widthMeters;
    const length = this._lengthMeters;
    const area = width * length;

    if (unit === 'sqft') {
      return {
        width: Number((width * CONVERSION_FACTORS.SQM_TO_SQFT).toFixed(precision)),
        length: Number((length * CONVERSION_FACTORS.SQM_TO_SQFT).toFixed(precision)),
        area: Number((area * CONVERSION_FACTORS.SQM_TO_SQFT).toFixed(precision))
      };
    }

    return {
      width: Number(width.toFixed(precision)),
      length: Number(length.toFixed(precision)),
      area: Number(area.toFixed(precision))
    };
  }
}
```

---

### 3. SubdivisionScenario

**Purpose**: One possible way to divide land (10-30% social club in 1% increments)

**TypeScript Interface**:

```typescript
interface SubdivisionScenario {
  // Identity
  id: string; // UUID v4
  landParcelId: string; // Foreign key

  // Configuration
  socialClubPercent: number; // 10-30 (integer)

  // Social Club Dimensions
  socialClub: {
    width: number; // meters
    length: number; // meters
    area: number; // square meters
    position: Position2D; // Centered position
  };

  // Lot Configuration
  lots: {
    count: number; // Total number of Micro Villa lots
    width: number; // meters (uniform lot width)
    length: number; // meters (uniform lot length)
    area: number; // square meters per lot
    minArea: number; // Enforced minimum (90 sqm)
    grid: {
      rows: number; // Grid dimensions
      columns: number;
      distribution: 'horizontal-strips' | 'vertical-strips' | 'four-quadrants';
    };
  };

  // Calculated Values
  totalLotsArea: number; // square meters
  commonAreaPercentPerLot: number; // percentage (proportional ownership)

  // Metadata
  isViable: boolean; // false if any lot < 90 sqm
  calculatedAt: Date;
}

interface Position2D {
  x: number; // meters from origin
  y: number; // meters from origin
}
```

**Validation Rules**:
- `socialClubPercent`: Integer 10-30 inclusive
- `socialClub.area`: Must equal `socialClubPercent`% of land parcel area (±0.01 tolerance)
- `lots.area`: Must be ≥ 90 sqm (FR-017)
- `lots.count`: Must be > 0 if `isViable === true`
- `totalLotsArea + socialClub.area`: Must equal land parcel area (±0.01 tolerance)
- `commonAreaPercentPerLot × lots.count`: Must equal 100% (±0.01 tolerance)

**SQLite Schema**:

```sql
CREATE TABLE subdivision_scenarios (
    id TEXT PRIMARY KEY,
    land_parcel_id TEXT NOT NULL,
    social_club_percent INTEGER NOT NULL CHECK(social_club_percent BETWEEN 10 AND 30),
    social_club_width REAL NOT NULL,
    social_club_length REAL NOT NULL,
    social_club_area REAL NOT NULL,
    social_club_pos_x REAL NOT NULL,
    social_club_pos_y REAL NOT NULL,
    lot_count INTEGER NOT NULL CHECK(lot_count >= 0),
    lot_width REAL NOT NULL,
    lot_length REAL NOT NULL,
    lot_area REAL NOT NULL,
    lot_min_area REAL NOT NULL DEFAULT 90.0,
    grid_rows INTEGER NOT NULL,
    grid_columns INTEGER NOT NULL,
    grid_distribution TEXT NOT NULL,
    total_lots_area REAL NOT NULL,
    common_area_percent_per_lot REAL NOT NULL,
    is_viable INTEGER NOT NULL, -- Boolean: 0/1
    calculated_at TEXT NOT NULL, -- ISO 8601
    FOREIGN KEY (land_parcel_id) REFERENCES land_parcels(id) ON DELETE CASCADE,
    UNIQUE(land_parcel_id, social_club_percent) -- One scenario per percentage
);

CREATE INDEX idx_scenarios_parcel ON subdivision_scenarios(land_parcel_id);
CREATE INDEX idx_scenarios_viable ON subdivision_scenarios(land_parcel_id, is_viable);
```

---

### 4. MicroVillaLot

**Purpose**: Individual subdivided unit (generated from selected scenario)

**TypeScript Interface**:

```typescript
interface MicroVillaLot {
  // Identity
  id: string; // UUID v4
  scenarioId: string; // Foreign key
  lotNumber: number; // Sequential 1 to N

  // Dimensions (inherited from scenario)
  width: number; // meters
  length: number; // meters
  area: number; // square meters

  // Position in grid
  position: Position2D;
  gridPosition: {
    row: number; // 0-indexed
    column: number; // 0-indexed
  };

  // Ownership
  commonAreaPercentage: number; // from scenario (proportional)

  // Storage Configuration
  hasIndividualStorage: boolean; // true if patio storage, false if centralized

  // Associated Images
  imageIds: string[]; // References to ProjectImage entities
}
```

**Validation Rules**:
- `lotNumber`: Must be 1 to `scenario.lots.count`
- `area`: Must equal `scenario.lots.area` (±0.01 tolerance)
- `commonAreaPercentage`: Must equal `scenario.commonAreaPercentPerLot` (±0.01 tolerance)
- `gridPosition.row`: Must be 0 to `scenario.lots.grid.rows - 1`
- `gridPosition.column`: Must be 0 to `scenario.lots.grid.columns - 1`

**SQLite Schema**:

```sql
CREATE TABLE micro_villa_lots (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    lot_number INTEGER NOT NULL CHECK(lot_number > 0),
    width REAL NOT NULL,
    length REAL NOT NULL,
    area REAL NOT NULL,
    pos_x REAL NOT NULL,
    pos_y REAL NOT NULL,
    grid_row INTEGER NOT NULL,
    grid_column INTEGER NOT NULL,
    common_area_percentage REAL NOT NULL,
    has_individual_storage INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (scenario_id) REFERENCES subdivision_scenarios(id) ON DELETE CASCADE,
    UNIQUE(scenario_id, lot_number)
);

CREATE INDEX idx_lots_scenario ON micro_villa_lots(scenario_id);
```

---

### 5. SocialClubDesign

**Purpose**: Amenities selection and configuration for centralized social area

**TypeScript Interface**:

```typescript
interface SocialClubDesign {
  // Identity
  id: string; // UUID v4
  projectId: string; // Foreign key
  scenarioId: string; // Based on selected scenario

  // Amenities
  selectedAmenities: SelectedAmenity[];

  // Storage Configuration
  storageType: 'centralized' | 'individual-patios';
  dedicatedStorageArea?: number; // square meters (if centralized)

  // Calculated Values
  totalCost: Money;
  totalArea: number; // square meters (from scenario)
}

interface SelectedAmenity {
  amenityId: string; // Reference to Amenity catalog
  category: AmenityCategory;
  name: string;
  quantity: number; // e.g., 2 pools, 5 BBQ grills
  unitCost: Money; // Cost per unit
  totalCost: Money; // quantity × unitCost
  spaceRequirement?: number; // square meters (optional)
}

type AmenityCategory =
  | 'aquatic' // Pools, jacuzzis
  | 'dining' // BBQ areas, outdoor kitchens, dining pavilions
  | 'recreation' // Lounges, game areas, sports courts
  | 'furniture' // Pool chairs, umbrellas, tables
  | 'landscaping' // Gardens, pathways
  | 'utilities' // Bathrooms, changing rooms
  | 'storage'; // Storage facilities
```

**Validation Rules**:
- `selectedAmenities`: Each must reference valid amenity from catalog
- `totalCost`: Must equal sum of `selectedAmenities[].totalCost`
- `storageType`: If 'centralized', `dedicatedStorageArea` must be > 0
- `quantity`: Must be > 0 for each amenity
- `unitCost`, `totalCost`: Currency must be consistent (all DOP or all USD)

**SQLite Schema**:

```sql
CREATE TABLE social_club_designs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    storage_type TEXT NOT NULL CHECK(storage_type IN ('centralized', 'individual-patios')),
    dedicated_storage_area REAL, -- Optional
    total_cost_amount REAL NOT NULL,
    total_cost_currency TEXT NOT NULL,
    total_area REAL NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (scenario_id) REFERENCES subdivision_scenarios(id)
);

CREATE TABLE selected_amenities (
    id TEXT PRIMARY KEY,
    social_club_design_id TEXT NOT NULL,
    amenity_id TEXT NOT NULL, -- Reference to amenities catalog
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_cost_amount REAL NOT NULL,
    unit_cost_currency TEXT NOT NULL,
    total_cost_amount REAL NOT NULL,
    total_cost_currency TEXT NOT NULL,
    space_requirement REAL, -- Optional
    FOREIGN KEY (social_club_design_id) REFERENCES social_club_designs(id) ON DELETE CASCADE
);

CREATE INDEX idx_selected_amenities_design ON selected_amenities(social_club_design_id);
```

---

### 6. Amenity (Catalog)

**Purpose**: Default amenities catalog with recommended costs

**TypeScript Interface**:

```typescript
interface Amenity {
  // Identity
  id: string; // UUID v4
  category: AmenityCategory;
  name: string;

  // Details
  description: string;
  defaultCost: Money; // Recommended cost in USD
  spaceRequirement?: number; // square meters (optional)

  // Metadata
  isPopular: boolean; // Featured amenities
  tags: string[]; // For search/filtering
}
```

**Validation Rules**:
- `name`: Required, unique within category
- `defaultCost.currency`: Must be 'USD' (recommended costs)
- `defaultCost.amount`: Must be > 0

**SQLite Schema** (Application Settings - electron-store):

```json
{
  "amenitiesCatalog": [
    {
      "id": "amenity-pool-olympic",
      "category": "aquatic",
      "name": "Olympic Pool",
      "description": "25m x 12m Olympic-sized swimming pool",
      "defaultCost": { "amount": 50000, "currency": "USD" },
      "spaceRequirement": 300,
      "isPopular": true,
      "tags": ["swimming", "pool", "sports"]
    },
    {
      "id": "amenity-bbq-grill",
      "category": "dining",
      "name": "BBQ Grill Station",
      "description": "Commercial-grade outdoor BBQ grill with prep area",
      "defaultCost": { "amount": 3000, "currency": "USD" },
      "spaceRequirement": 10,
      "isPopular": true,
      "tags": ["cooking", "dining", "outdoor"]
    }
    // ... more amenities
  ]
}
```

---

### 7. FinancialAnalysis

**Purpose**: Investment calculations with multiple profit margin scenarios

**TypeScript Interface**:

```typescript
interface FinancialAnalysis {
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

interface CostBreakdown {
  landAcquisition: Money; // From LandParcel
  amenities: Money; // Sum from SocialClubDesign
  legal: LegalCosts;
  other: OtherCost[];
}

interface LegalCosts {
  notaryFees: Money;
  permits: Money;
  registrations: Money;
  total: Money; // Auto-calculated
}

interface OtherCost {
  id: string;
  label: string; // User-defined (e.g., "Infrastructure", "Utilities", "Marketing")
  amount: Money;
  description?: string;
}

interface PricingScenario {
  id: string;
  profitMarginPercent: number; // e.g., 15, 20, 25, 30
  lotSalePrice: Money; // baseLotCost × (1 + profitMargin)
  totalRevenue: Money; // lotSalePrice × lot count
  expectedProfit: Money; // totalRevenue - totalProjectCost
  roi: number; // (expectedProfit / totalProjectCost) × 100
}

interface ExchangeRate {
  from: 'DOP' | 'USD';
  to: 'DOP' | 'USD';
  rate: number; // DOP per USD (e.g., 58.50)
  effectiveDate: Date;
}
```

**Validation Rules**:
- `totalProjectCost`: Must equal sum of `costs` breakdown (±0.01 tolerance)
- `baseLotCost`: Must equal `(totalProjectCost - amenities cost) / lot count` (±0.01 tolerance)
- `pricingScenarios`: Each must have unique `profitMarginPercent`
- `lotSalePrice`: Must equal `baseLotCost × (1 + profitMarginPercent / 100)` (±0.01 tolerance)
- `totalRevenue`: Must equal `lotSalePrice × lot count` (±0.01 tolerance)
- `expectedProfit`: Must equal `totalRevenue - totalProjectCost` (±0.01 tolerance)
- `roi`: Must equal `(expectedProfit / totalProjectCost) × 100` (±0.01 tolerance)
- All `Money` fields: Must have consistent currency within analysis

**SQLite Schema**:

```sql
CREATE TABLE financial_analyses (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    land_acquisition_amount REAL NOT NULL,
    land_acquisition_currency TEXT NOT NULL,
    amenities_amount REAL NOT NULL,
    amenities_currency TEXT NOT NULL,
    legal_notary_amount REAL NOT NULL,
    legal_notary_currency TEXT NOT NULL,
    legal_permits_amount REAL NOT NULL,
    legal_permits_currency TEXT NOT NULL,
    legal_registrations_amount REAL NOT NULL,
    legal_registrations_currency TEXT NOT NULL,
    total_project_cost_amount REAL NOT NULL,
    total_project_cost_currency TEXT NOT NULL,
    cost_per_sqm_amount REAL NOT NULL,
    cost_per_sqm_currency TEXT NOT NULL,
    base_lot_cost_amount REAL NOT NULL,
    base_lot_cost_currency TEXT NOT NULL,
    monthly_maintenance_amount REAL,
    monthly_maintenance_currency TEXT,
    monthly_maintenance_per_owner_amount REAL,
    monthly_maintenance_per_owner_currency TEXT,
    exchange_rate_from TEXT,
    exchange_rate_to TEXT,
    exchange_rate_value REAL,
    exchange_rate_date TEXT,
    calculated_at TEXT NOT NULL,
    last_modified TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE other_costs (
    id TEXT PRIMARY KEY,
    financial_analysis_id TEXT NOT NULL,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (financial_analysis_id) REFERENCES financial_analyses(id) ON DELETE CASCADE
);

CREATE TABLE pricing_scenarios (
    id TEXT PRIMARY KEY,
    financial_analysis_id TEXT NOT NULL,
    profit_margin_percent REAL NOT NULL CHECK(profit_margin_percent > 0),
    lot_sale_price_amount REAL NOT NULL,
    lot_sale_price_currency TEXT NOT NULL,
    total_revenue_amount REAL NOT NULL,
    total_revenue_currency TEXT NOT NULL,
    expected_profit_amount REAL NOT NULL,
    expected_profit_currency TEXT NOT NULL,
    roi REAL NOT NULL,
    FOREIGN KEY (financial_analysis_id) REFERENCES financial_analyses(id) ON DELETE CASCADE,
    UNIQUE(financial_analysis_id, profit_margin_percent)
);

CREATE INDEX idx_pricing_scenarios_analysis ON pricing_scenarios(financial_analysis_id);
```

---

### 8. ProjectImage

**Purpose**: Images associated with land parcel and individual lots

**TypeScript Interface**:

```typescript
interface ProjectImage {
  // Identity
  id: string; // UUID v4
  projectId: string; // Foreign key

  // Association
  associatedWith: 'land-parcel' | 'lot';
  lotId?: string; // If associated with specific lot

  // File Information
  filename: string; // Original filename
  format: 'jpeg' | 'png' | 'webp';
  size: number; // bytes
  width: number; // pixels
  height: number; // pixels

  // Storage
  localPath: string; // Absolute path on user's file system
  thumbnailPath?: string; // Optional thumbnail (for UI performance)

  // Metadata
  uploadedAt: Date;
  caption?: string; // Optional user description
}
```

**Validation Rules**:
- `format`: Only 'jpeg', 'png', 'webp' allowed (FR-054)
- `size`: Maximum 10 MB (FR-055)
- If `associatedWith === 'lot'`, `lotId` must be valid reference
- `localPath`: Must be accessible file system path

**SQLite Schema**:

```sql
CREATE TABLE project_images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    associated_with TEXT NOT NULL CHECK(associated_with IN ('land-parcel', 'lot')),
    lot_id TEXT, -- Foreign key (optional)
    filename TEXT NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('jpeg', 'png', 'webp')),
    size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
    width_pixels INTEGER NOT NULL CHECK(width_pixels > 0),
    height_pixels INTEGER NOT NULL CHECK(height_pixels > 0),
    local_path TEXT NOT NULL,
    thumbnail_path TEXT,
    uploaded_at TEXT NOT NULL,
    caption TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES micro_villa_lots(id) ON DELETE SET NULL
);

CREATE INDEX idx_images_project ON project_images(project_id);
CREATE INDEX idx_images_lot ON project_images(lot_id);
```

---

## Data Integrity Rules

### Cross-Entity Validation

1. **Project → Subdivision Scenarios**:
   - All scenarios must reference same `landParcelId`
   - No duplicate `socialClubPercent` values
   - All viable scenarios must have ≥ 1 lot with area ≥ 90 sqm

2. **Project → Financial Analysis**:
   - `landAcquisition` cost must match `LandParcel.acquisitionCost`
   - `amenities` cost must match `SocialClubDesign.totalCost`
   - Currency consistency across all cost items

3. **Subdivision Scenario → Micro Villa Lots**:
   - Lot count must match `scenario.lots.count`
   - All lots must fit within parcel dimensions
   - No overlapping lot positions

4. **Social Club Design → Selected Amenities**:
   - All amenities must exist in catalog
   - Total cost calculation must be accurate
   - Storage type must be consistent with lot configuration

### Data Versioning

**Schema Version Evolution**:

```typescript
interface DataMigration {
  fromVersion: string; // e.g., "1.0.0"
  toVersion: string;   // e.g., "1.1.0"
  migrate: (data: any) => any; // Migration function
  description: string; // Change description
}

const migrations: DataMigration[] = [
  {
    fromVersion: "1.0.0",
    toVersion: "1.1.0",
    migrate: (data) => {
      // Example: Add new field to existing projects
      data.projects.forEach(p => {
        if (!p.status) p.status = 'draft';
      });
      return data;
    },
    description: "Added project status field"
  }
];
```

---

## Export/Import Format

### JSON Export Structure (FR-057)

```json
{
  "schemaVersion": "1.0.0",
  "exportDate": "2026-01-10T15:30:00Z",
  "project": {
    "id": "uuid-here",
    "name": "Villa Paradise Investment",
    "landParcel": { ... },
    "subdivisionScenarios": [ ... ],
    "selectedScenarioId": "uuid-here",
    "socialClubDesign": { ... },
    "financialAnalysis": { ... },
    "images": [
      {
        "id": "img-uuid",
        "filename": "land-aerial.jpg",
        "relativePathInExport": "images/land-aerial.jpg"
      }
    ]
  },
  "metadata": {
    "exportedBy": "MicroVillas Platform v1.0.0",
    "checksum": "sha256-hash-here"
  }
}
```

**Export Directory Structure**:
```
exported-project/
├── project.json          # Complete data
├── images/
│   ├── land-aerial.jpg
│   ├── lot-01.jpg
│   └── lot-02.jpg
└── README.txt            # Human-readable summary
```

---

## Validation Library (Zod)

**Example Schema Definitions**:

```typescript
import { z } from 'zod';

const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.enum(['DOP', 'USD'])
});

const Position2DSchema = z.object({
  x: z.number(),
  y: z.number()
});

const LandParcelSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  width: z.number().positive(),
  length: z.number().positive(),
  area: z.number().positive(),
  province: z.enum([/* all provinces */]),
  landmarks: z.array(z.object({
    type: z.enum(['beach', 'airport', 'tourist_attraction', 'infrastructure', 'other']),
    name: z.string().min(1).max(200),
    distance: z.number().positive().optional(),
    description: z.string().optional()
  })),
  isUrbanized: z.boolean(),
  acquisitionCost: MoneySchema,
  displayUnit: z.enum(['sqm', 'sqft'])
});

const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  created: z.date(),
  modified: z.date(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semantic version
  landParcel: LandParcelSchema,
  subdivisionScenarios: z.array(SubdivisionScenarioSchema).max(21),
  selectedScenarioId: z.string().uuid().nullable(),
  socialClubDesign: SocialClubDesignSchema.nullable(),
  financialAnalysis: FinancialAnalysisSchema.nullable(),
  images: z.array(ProjectImageSchema),
  status: z.enum(['draft', 'in_progress', 'finalized']),
  notes: z.string().optional()
}).refine(data => data.created <= data.modified, {
  message: "Created date must be before or equal to modified date"
});
```

---

## Summary

**Total Entities**: 8 core + 2 supporting (Landmark, Money)

**Storage Distribution**:
- SQLite: 8 tables (projects, land_parcels, subdivision_scenarios, micro_villa_lots, social_club_designs, selected_amenities, financial_analyses, project_images) + 3 junction tables
- electron-store: Amenities catalog, Dominican Republic provinces
- File system: Project export JSON + images

**Data Integrity**:
- ✅ Foreign key constraints
- ✅ Check constraints for valid ranges
- ✅ Unique constraints for business rules
- ✅ Cascade delete for dependent entities
- ✅ Zod validation for import/export

**Next Phase**: Generate IPC contracts for main/renderer communication
