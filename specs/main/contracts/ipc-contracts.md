# IPC Contracts: Main ↔ Renderer Communication

**Phase 1 Output** | **Date**: 2026-01-10 | **Data Model**: [../data-model.md](../data-model.md)

## Overview

This document defines the Inter-Process Communication (IPC) contracts between:
- **Main Process** (Electron): File system, SQLite database, native APIs
- **Renderer Process** (Browser): UI, business logic, subdivision calculations

**Security Model** (Constitution Principle II - Desktop First):
- Node.js integration disabled in renderer (`nodeIntegration: false`)
- Context isolation enabled (`contextIsolation: true`)
- Preload script bridges main ↔ renderer (`contextBridge.exposeInMainWorld`)

---

## IPC Architecture

```
┌───────────────────────────────────────────┐
│          Renderer Process (UI)            │
│  ┌─────────────────────────────────────┐ │
│  │   React/Vue Components              │ │
│  │   - LandConfig                      │ │
│  │   - SubdivisionPlanner              │ │
│  │   - Financial Analysis              │ │
│  └──────────┬──────────────────────────┘ │
│             │                             │
│       window.electronAPI                 │
│            (from preload)                 │
│             │                             │
└─────────────┼─────────────────────────────┘
              │ IPC (invoke/handle)
┌─────────────┼─────────────────────────────┐
│             ▼                             │
│        Main Process                       │
│  ┌─────────────────────────────────────┐ │
│  │   IPC Handlers                      │ │
│  │   - Database operations             │ │
│  │   - File system (export/import)     │ │
│  │   - Native dialogs                  │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │   SQLite Database                   │ │
│  │   File System                       │ │
│  │   Native APIs                       │ │
│  └─────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

---

## Preload Script Contract

**Location**: `src/preload/index.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Type-safe IPC channels
export type ElectronAPI = {
  // Project Management
  createProject: (data: CreateProjectInput) => Promise<Project>;
  loadProject: (projectId: string) => Promise<Project>;
  listProjects: () => Promise<ProjectSummary[]>;
  deleteProject: (projectId: string) => Promise<void>;
  updateProject: (projectId: string, data: Partial<Project>) => Promise<Project>;

  // Land Parcel
  saveLandParcel: (data: LandParcelInput) => Promise<LandParcel>;
  updateLandParcel: (id: string, data: Partial<LandParcelInput>) => Promise<LandParcel>;

  // Subdivision Scenarios
  calculateSubdivisions: (landParcelId: string) => Promise<SubdivisionScenario[]>;
  selectScenario: (scenarioId: string) => Promise<void>;

  // Social Club Design
  saveSocialClubDesign: (data: SocialClubDesignInput) => Promise<SocialClubDesign>;
  getAmenitiesCatalog: () => Promise<Amenity[]>;

  // Financial Analysis
  saveFinancialAnalysis: (data: FinancialAnalysisInput) => Promise<FinancialAnalysis>;
  recalculateFinancials: (projectId: string) => Promise<FinancialAnalysis>;

  // File Operations (Export/Import)
  selectExportDirectory: () => Promise<string | null>;
  exportProject: (projectId: string, targetDir: string) => Promise<ExportResult>;
  selectImportDirectory: () => Promise<string | null>;
  importProject: (sourceDir: string) => Promise<ImportResult>;

  // Image Management
  selectImages: (options: SelectImagesOptions) => Promise<string[]>;
  attachImagesToLand: (projectId: string, imagePaths: string[]) => Promise<ProjectImage[]>;
  attachImagesToLot: (lotId: string, imagePaths: string[]) => Promise<ProjectImage[]>;
  getImageThumbnail: (imageId: string) => Promise<string>; // Base64 data URL

  // AI Description Generation
  generateAIDescription: (projectId: string) => Promise<string>;

  // Utilities
  convertUnits: (value: number, from: Unit, to: Unit) => number;
  convertCurrency: (amount: Money, toGurrency: Currency, exchangeRate?: number) => Money;
};

contextBridge.exposeInMainWorld('electronAPI', {
  // Project Management
  createProject: (data) => ipcRenderer.invoke('project:create', data),
  loadProject: (projectId) => ipcRenderer.invoke('project:load', projectId),
  listProjects: () => ipcRenderer.invoke('project:list'),
  deleteProject: (projectId) => ipcRenderer.invoke('project:delete', projectId),
  updateProject: (projectId, data) => ipcRenderer.invoke('project:update', projectId, data),

  // Land Parcel
  saveLandParcel: (data) => ipcRenderer.invoke('land:save', data),
  updateLandParcel: (id, data) => ipcRenderer.invoke('land:update', id, data),

  // Subdivision Scenarios
  calculateSubdivisions: (landParcelId) => ipcRenderer.invoke('subdivision:calculate', landParcelId),
  selectScenario: (scenarioId) => ipcRenderer.invoke('subdivision:select', scenarioId),

  // Social Club Design
  saveSocialClubDesign: (data) => ipcRenderer.invoke('socialclub:save', data),
  getAmenitiesCatalog: () => ipcRenderer.invoke('amenities:catalog'),

  // Financial Analysis
  saveFinancialAnalysis: (data) => ipcRenderer.invoke('financial:save', data),
  recalculateFinancials: (projectId) => ipcRenderer.invoke('financial:recalculate', projectId),

  // File Operations
  selectExportDirectory: () => ipcRenderer.invoke('dialog:selectExportDir'),
  exportProject: (projectId, targetDir) => ipcRenderer.invoke('export:project', projectId, targetDir),
  selectImportDirectory: () => ipcRenderer.invoke('dialog:selectImportDir'),
  importProject: (sourceDir) => ipcRenderer.invoke('import:project', sourceDir),

  // Image Management
  selectImages: (options) => ipcRenderer.invoke('dialog:selectImages', options),
  attachImagesToLand: (projectId, imagePaths) => ipcRenderer.invoke('images:attachToLand', projectId, imagePaths),
  attachImagesToLot: (lotId, imagePaths) => ipcRenderer.invoke('images:attachToLot', lotId, imagePaths),
  getImageThumbnail: (imageId) => ipcRenderer.invoke('images:getThumbnail', imageId),

  // AI Description
  generateAIDescription: (projectId) => ipcRenderer.invoke('ai:generateDescription', projectId),

  // Utilities (synchronous, no IPC)
  convertUnits: (value, from, to) => {
    // Implemented in preload (no need for IPC)
    const CONVERSIONS = {
      'sqm-to-sqft': 10.763910417,
      'sqft-to-sqm': 0.09290304
    };
    return value * CONVERSIONS[`${from}-to-${to}`];
  },
  convertCurrency: (amount, toCurrency, rate) => {
    // Implemented in preload (no need for IPC)
    // ... conversion logic
  }
});

// Make TypeScript aware of window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

## Main Process IPC Handlers

**Location**: `src/main/ipc-handlers.ts`

```typescript
import { ipcMain, dialog } from 'electron';
import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

const db = new Database('microvillas.db');

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

ipcMain.handle('project:create', async (event, data: CreateProjectInput) => {
  const projectId = generateUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO projects (id, name, created, modified, status, version)
    VALUES (?, ?, ?, ?, 'draft', '1.0.0')
  `);

  stmt.run(projectId, data.name, now, now);

  return {
    id: projectId,
    name: data.name,
    created: now,
    modified: now,
    status: 'draft',
    version: '1.0.0'
  };
});

ipcMain.handle('project:load', async (event, projectId: string) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Load related entities
  const landParcel = db.prepare('SELECT * FROM land_parcels WHERE project_id = ?').get(projectId);
  const scenarios = db.prepare('SELECT * FROM subdivision_scenarios WHERE land_parcel_id = ?').all(landParcel.id);
  // ... load other entities

  return {
    ...project,
    landParcel,
    subdivisionScenarios: scenarios,
    // ... other entities
  };
});

ipcMain.handle('project:list', async (event) => {
  const projects = db.prepare('SELECT id, name, created, modified, status FROM projects ORDER BY modified DESC').all();
  return projects.map(p => ({
    id: p.id,
    name: p.name,
    created: p.created,
    modified: p.modified,
    status: p.status
  }));
});

ipcMain.handle('project:delete', async (event, projectId: string) => {
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  stmt.run(projectId);
  // CASCADE deletes handle related entities
});

ipcMain.handle('project:update', async (event, projectId: string, data: Partial<Project>) => {
  const now = new Date().toISOString();
  const updates = [];
  const values = [];

  if (data.name) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.status) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(data.notes);
  }

  updates.push('modified = ?');
  values.push(now);
  values.push(projectId);

  const stmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return ipcRenderer.invoke('project:load', projectId);
});

// ============================================================================
// LAND PARCEL
// ============================================================================

ipcMain.handle('land:save', async (event, data: LandParcelInput) => {
  const parcelId = generateUUID();
  const area = data.width * data.length;

  const stmt = db.prepare(`
    INSERT INTO land_parcels (
      id, project_id, width_meters, length_meters, area_sqm,
      province, is_urbanized, acquisition_cost_amount, acquisition_cost_currency, display_unit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    parcelId,
    data.projectId,
    data.width,
    data.length,
    area,
    data.province,
    data.isUrbanized ? 1 : 0,
    data.acquisitionCost.amount,
    data.acquisitionCost.currency,
    data.displayUnit
  );

  // Save landmarks
  if (data.landmarks && data.landmarks.length > 0) {
    const landmarkStmt = db.prepare(`
      INSERT INTO landmarks (id, land_parcel_id, type, name, distance_km, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const landmark of data.landmarks) {
      landmarkStmt.run(
        generateUUID(),
        parcelId,
        landmark.type,
        landmark.name,
        landmark.distance || null,
        landmark.description || null
      );
    }
  }

  // Trigger subdivision calculation automatically
  await ipcRenderer.invoke('subdivision:calculate', parcelId);

  return { id: parcelId, ...data, area };
});

// ============================================================================
// SUBDIVISION SCENARIOS
// ============================================================================

ipcMain.handle('subdivision:calculate', async (event, landParcelId: string) => {
  const landParcel = db.prepare('SELECT * FROM land_parcels WHERE id = ?').get(landParcelId);
  if (!landParcel) {
    throw new Error(`Land parcel ${landParcelId} not found`);
  }

  // Call subdivision calculator (imported from renderer/services)
  const SubdivisionCalculator = require('../renderer/services/subdivision-calculator');
  const calculator = new SubdivisionCalculator({ minLotSize: 90 });

  const scenarios = calculator.calculateAllScenarios(
    landParcel.width_meters,
    landParcel.length_meters
  );

  // Save scenarios to database
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO subdivision_scenarios (
      id, land_parcel_id, social_club_percent, social_club_width, social_club_length,
      social_club_area, social_club_pos_x, social_club_pos_y, lot_count, lot_width,
      lot_length, lot_area, lot_min_area, grid_rows, grid_columns, grid_distribution,
      total_lots_area, common_area_percent_per_lot, is_viable, calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const savedScenarios = scenarios.map(scenario => {
    const scenarioId = generateUUID();
    const now = new Date().toISOString();

    stmt.run(
      scenarioId,
      landParcelId,
      scenario.socialClubPercent,
      scenario.socialClub.width,
      scenario.socialClub.length,
      scenario.socialClub.area,
      scenario.socialClub.position.x,
      scenario.socialClub.position.y,
      scenario.lots.count,
      scenario.lots.width,
      scenario.lots.length,
      scenario.lots.area,
      90, // minArea
      scenario.lots.grid.rows,
      scenario.lots.grid.columns,
      scenario.lots.grid.distribution,
      scenario.totalLotsArea,
      scenario.commonAreaPercentPerLot,
      1, // is_viable (only viable scenarios saved)
      now
    );

    return { id: scenarioId, ...scenario };
  });

  return savedScenarios;
});

ipcMain.handle('subdivision:select', async (event, scenarioId: string) => {
  // Get project from scenario
  const scenario = db.prepare(`
    SELECT s.*, lp.project_id
    FROM subdivision_scenarios s
    JOIN land_parcels lp ON s.land_parcel_id = lp.id
    WHERE s.id = ?
  `).get(scenarioId);

  if (!scenario) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  // Update project's selected scenario
  const stmt = db.prepare('UPDATE projects SET selected_scenario_id = ?, modified = ? WHERE id = ?');
  stmt.run(scenarioId, new Date().toISOString(), scenario.project_id);
});

// ============================================================================
// FILE OPERATIONS (Export/Import)
// ============================================================================

ipcMain.handle('dialog:selectExportDir', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Export Directory'
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('export:project', async (event, projectId: string, targetDir: string) => {
  const project = await ipcRenderer.invoke('project:load', projectId);

  // Create export structure
  const exportData = {
    schemaVersion: '1.0.0',
    exportDate: new Date().toISOString(),
    project: project,
    metadata: {
      exportedBy: 'MicroVillas Platform v1.0.0',
      checksum: calculateChecksum(project)
    }
  };

  // Write JSON file
  const jsonPath = path.join(targetDir, `${sanitizeFilename(project.name)}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(exportData, null, 2));

  // Copy images
  const imagesDir = path.join(targetDir, 'images');
  await fs.mkdir(imagesDir, { recursive: true });

  for (const image of project.images) {
    const destPath = path.join(imagesDir, image.filename);
    await fs.copyFile(image.localPath, destPath);
  }

  // Write README
  const readmePath = path.join(targetDir, 'README.txt');
  const readmeContent = generateReadme(project);
  await fs.writeFile(readmePath, readmeContent);

  return {
    success: true,
    exportedTo: targetDir,
    filesCreated: [jsonPath, imagesDir, readmePath],
    imageCount: project.images.length
  };
});

ipcMain.handle('dialog:selectImportDir', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Project Directory to Import'
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('import:project', async (event, sourceDir: string) => {
  // Find JSON file
  const files = await fs.readdir(sourceDir);
  const jsonFile = files.find(f => f.endsWith('.json'));

  if (!jsonFile) {
    throw new Error('No project JSON file found in directory');
  }

  // Read and validate JSON
  const jsonPath = path.join(sourceDir, jsonFile);
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  const exportData = JSON.parse(jsonContent);

  // Validate schema version
  if (exportData.schemaVersion !== '1.0.0') {
    throw new Error(`Unsupported schema version: ${exportData.schemaVersion}`);
  }

  // Validate checksum
  const calculatedChecksum = calculateChecksum(exportData.project);
  if (calculatedChecksum !== exportData.metadata.checksum) {
    throw new Error('Checksum mismatch - file may be corrupted');
  }

  // Import project into database
  const projectId = await createProjectFromImport(exportData.project);

  // Copy images to local storage
  const imagesDir = path.join(sourceDir, 'images');
  if (await directoryExists(imagesDir)) {
    await importImages(projectId, imagesDir);
  }

  return {
    success: true,
    projectId,
    projectName: exportData.project.name,
    importedFrom: sourceDir
  };
});

// ============================================================================
// IMAGE MANAGEMENT
// ============================================================================

ipcMain.handle('dialog:selectImages', async (event, options: SelectImagesOptions) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
    ],
    title: options.title || 'Select Images'
  });

  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('images:attachToLand', async (event, projectId: string, imagePaths: string[]) => {
  const images: ProjectImage[] = [];

  for (const imagePath of imagePaths) {
    const imageId = generateUUID();
    const stats = await fs.stat(imagePath);
    const sizeBytes = stats.size;

    // Validate size (max 10 MB)
    if (sizeBytes > 10 * 1024 * 1024) {
      console.warn(`Image ${imagePath} exceeds 10MB, skipping`);
      continue;
    }

    // Get image dimensions (using sharp or similar library)
    const dimensions = await getImageDimensions(imagePath);

    const stmt = db.prepare(`
      INSERT INTO project_images (
        id, project_id, associated_with, filename, format,
        size_bytes, width_pixels, height_pixels, local_path, uploaded_at
      ) VALUES (?, ?, 'land-parcel', ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      imageId,
      projectId,
      path.basename(imagePath),
      path.extname(imagePath).slice(1), // Remove dot
      sizeBytes,
      dimensions.width,
      dimensions.height,
      imagePath,
      new Date().toISOString()
    );

    images.push({
      id: imageId,
      projectId,
      associatedWith: 'land-parcel',
      filename: path.basename(imagePath),
      format: path.extname(imagePath).slice(1) as any,
      size: sizeBytes,
      width: dimensions.width,
      height: dimensions.height,
      localPath: imagePath,
      uploadedAt: new Date()
    });
  }

  return images;
});

// ============================================================================
// AI DESCRIPTION GENERATION
// ============================================================================

ipcMain.handle('ai:generateDescription', async (event, projectId: string) => {
  const project = await ipcRenderer.invoke('project:load', projectId);

  // Generate comprehensive text description
  const description = `
# Micro Villas Investment Project: ${project.name}

## Location
Province: ${project.landParcel.province}, Dominican Republic
${project.landParcel.landmarks.map(l => `- ${l.name} (${l.type})`).join('\n')}

## Land Parcel
Total Area: ${project.landParcel.area} square meters
Dimensions: ${project.landParcel.width}m × ${project.landParcel.length}m
Urbanization Status: ${project.landParcel.isUrbanized ? 'Urbanized' : 'Non-urbanized'}

## Subdivision Configuration
Selected Scenario: ${project.selectedScenarioId ? 'Yes' : 'Not selected'}
Social Club Percentage: ${project.subdivisionScenarios.find(s => s.id === project.selectedScenarioId)?.socialClubPercent}%
Total Micro Villa Lots: ${project.subdivisionScenarios.find(s => s.id === project.selectedScenarioId)?.lots.count}

## Social Club Amenities
${project.socialClubDesign?.selectedAmenities.map(a => `- ${a.name} (${a.category}): ${a.quantity} units`).join('\n')}

## Lot Dimensions
Each lot: ${project.subdivisionScenarios.find(s => s.id === project.selectedScenarioId)?.lots.width}m × ${project.subdivisionScenarios.find(s => s.id === project.selectedScenarioId)?.lots.length}m
Lot area: ${project.subdivisionScenarios.find(s => s.id === project.selectedScenarioId)?.lots.area} sqm
Common area ownership: ${project.subdivisionScenarios.find(s => s.id === project.selectedScenarioId)?.commonAreaPercentPerLot}% per lot

## Financial Overview
Total Project Cost: ${project.financialAnalysis?.totalProjectCost.amount} ${project.financialAnalysis?.totalProjectCost.currency}
Cost per Square Meter: ${project.financialAnalysis?.costPerSqm.amount} ${project.financialAnalysis?.costPerSqm.currency}

This investment opportunity offers affordable vacation property ownership through innovative Micro Villas subdivision with centralized social club amenities providing immediate value from day one.
  `.trim();

  return description;
});
```

---

## TypeScript Type Definitions

**Input Types (Renderer → Main)**:

```typescript
interface CreateProjectInput {
  name: string;
}

interface LandParcelInput {
  projectId: string;
  width: number; // meters
  length: number; // meters
  province: string;
  landmarks?: Landmark[];
  isUrbanized: boolean;
  acquisitionCost: Money;
  displayUnit: 'sqm' | 'sqft';
}

interface SocialClubDesignInput {
  projectId: string;
  scenarioId: string;
  selectedAmenities: SelectedAmenityInput[];
  storageType: 'centralized' | 'individual-patios';
  dedicatedStorageArea?: number;
}

interface SelectedAmenityInput {
  amenityId: string;
  quantity: number;
  unitCost?: Money; // Override default cost
}

interface FinancialAnalysisInput {
  projectId: string;
  legalCosts: {
    notary: Money;
    permits: Money;
    registrations: Money;
  };
  otherCosts: OtherCostInput[];
  monthlyMaintenanceCost?: Money;
  exchangeRate?: ExchangeRate;
  targetProfitMargins: number[]; // e.g., [15, 20, 25, 30]
}

interface OtherCostInput {
  label: string;
  amount: Money;
  description?: string;
}

interface SelectImagesOptions {
  title?: string;
  multiSelect?: boolean;
}
```

**Output Types (Main → Renderer)**:

```typescript
interface ProjectSummary {
  id: string;
  name: string;
  created: string; // ISO 8601
  modified: string;
  status: 'draft' | 'in_progress' | 'finalized';
}

interface ExportResult {
  success: boolean;
  exportedTo: string;
  filesCreated: string[];
  imageCount: number;
}

interface ImportResult {
  success: boolean;
  projectId: string;
  projectName: string;
  importedFrom: string;
}
```

---

## Error Handling

**Standard Error Response**:

```typescript
interface IPCError {
  code: string;
  message: string;
  details?: any;
}

// Example error handling in renderer
try {
  const project = await window.electronAPI.loadProject(projectId);
} catch (error) {
  if (error.code === 'PROJECT_NOT_FOUND') {
    showNotification('Project not found', 'error');
  } else if (error.code === 'DATABASE_ERROR') {
    showNotification('Database error occurred', 'error');
  } else {
    showNotification(`Unexpected error: ${error.message}`, 'error');
  }
}
```

**Common Error Codes**:
- `PROJECT_NOT_FOUND`: Project ID does not exist
- `VALIDATION_ERROR`: Input validation failed
- `DATABASE_ERROR`: SQLite operation failed
- `FILE_NOT_FOUND`: File path does not exist
- `PERMISSION_DENIED`: File system permission error
- `IMPORT_INVALID_SCHEMA`: JSON schema version mismatch
- `IMPORT_CHECKSUM_MISMATCH`: Corrupted import data
- `IMAGE_TOO_LARGE`: Image exceeds 10 MB limit

---

## Performance Considerations

1. **Batch Operations**: Use transactions for multiple database writes
```typescript
ipcMain.handle('subdivision:calculate', async (event, landParcelId) => {
  const transaction = db.transaction((scenarios) => {
    for (const scenario of scenarios) {
      stmt.run(/* ... */);
    }
  });

  transaction(scenarios);
});
```

2. **Async File Operations**: Use `fs.promises` for non-blocking I/O
3. **Image Thumbnails**: Generate on demand, cache in memory
4. **Large Data Sets**: Stream instead of loading entire project at once

---

## Security Considerations

1. **Path Validation**: Sanitize all file paths to prevent traversal attacks
```typescript
function validatePath(userPath: string): boolean {
  const normalized = path.normalize(userPath);
  return !normalized.includes('..');
}
```

2. **SQL Injection Prevention**: Use prepared statements (already implemented)
3. **Input Validation**: Validate all renderer input using Zod schemas
4. **Context Isolation**: Enabled to prevent prototype pollution

---

## Next Steps

- Phase 2: Generate `quickstart.md` for development setup
- Phase 2: Update agent context with technology stack
- Phase 2: Re-evaluate Constitution Check with implementation details

**IPC Contracts Complete**: Main ↔ Renderer communication fully defined.
