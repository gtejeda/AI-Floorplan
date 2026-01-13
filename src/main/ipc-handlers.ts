/**
 * IPC Handlers
 * Registers all IPC communication handlers between main and renderer processes
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getDatabase } from './storage';
import { logger } from './logger';
import { validateIPCRequest } from '../shared/ai-contracts';

// Import types
import type {
  GenerateSubdivisionPlanRequest,
  GenerateSitePlanImageRequest,
  ApprovePlanRequest,
  RejectPlanRequest,
  GetGenerationHistoryRequest,
  GetArchivedPlansRequest,
  SwitchToArchivedPlanRequest,
  GetSessionCostRequest,
  GetAISettingsRequest,
  UpdateAISettingsRequest,
  SetAPIKeyRequest,
  TestAPIKeyRequest,
} from '../shared/ai-contracts';

// Import Zod schemas (runtime values)
import {
  GenerateSubdivisionPlanRequestSchema,
  GenerateSitePlanImageRequestSchema,
  ApprovePlanRequestSchema,
  RejectPlanRequestSchema,
  GetGenerationHistoryRequestSchema,
  GetArchivedPlansRequestSchema,
  SwitchToArchivedPlanRequestSchema,
  GetSessionCostRequestSchema,
  GetAISettingsRequestSchema,
  UpdateAISettingsRequestSchema,
  SetAPIKeyRequestSchema,
  TestAPIKeyRequestSchema,
} from '../shared/ai-contracts';

// Global flag to track if handlers have been registered (for hot reload)
declare global {
  var __IPC_HANDLERS_REGISTERED__: boolean | undefined;
}

/**
 * Remove all existing IPC handlers to prevent "second handler" errors during hot reload
 */
function removeAllHandlers() {
  const channels = [
    'project:create',
    'project:list',
    'project:get',
    'project:update',
    'project:delete',
    'land:save',
    'land:get',
    'land:getByProject',
    'subdivision:calculate',
    'subdivision:save',
    'subdivision:getByProject',
    'subdivision:selectScenario',
    'social-club:save',
    'social-club:get',
    'social-club:getByProject',
    'financial:save',
    'financial:get',
    'financial:getByProject',
    'ai-prompt:generate',
    'ai-prompt:save',
    'ai-prompt:getByProject',
    'file:saveImage',
    'file:getImagePath',
    'export:project',
    'import:project',
    'telemetry:isEnabled',
    'telemetry:enable',
    'telemetry:disable',
    'telemetry:getStatistics',
    'telemetry:getRecentEvents',
    'telemetry:clearData',
    'telemetry:trackEvent',
    // AI subdivision planning channels
    'ai:generate-subdivision-plan',
    'ai:generate-site-plan-image',
    'ai:preview-image-prompt',
    'ai:approve-plan',
    'ai:reject-plan',
    'ai:get-generation-history',
    'ai:get-archived-plans',
    'ai:switch-to-archived-plan',
    'ai:get-session-cost',
    'ai:get-settings',
    'ai:update-settings',
    'ai:set-api-key',
    'ai:test-api-key',
    // AI image generation channels (Phase 4)
    'ai:get-image-generation-status',
    'ai:get-project-visualizations',
    'ai:save-image-to-project',
    'ai:approve-visualization',
    'ai:load-image-as-data-url',
  ];

  channels.forEach((channel) => {
    try {
      ipcMain.removeHandler(channel);
    } catch (error) {
      // Ignore errors if handler doesn't exist
    }
  });
}

// Remove any existing handlers first (for hot reload in development)
if (global.__IPC_HANDLERS_REGISTERED__) {
  console.log('[IPC] Removing existing handlers for hot reload...');
  removeAllHandlers();
}

global.__IPC_HANDLERS_REGISTERED__ = true;

/**
 * Register all IPC handlers
 */

// Project operations
ipcMain.handle('project:create', async (event, input: { name: string; notes?: string }) => {
  console.log('IPC: project:create called with input:', input);

  try {
    const db = getDatabase();
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO projects (id, name, created, modified, version, land_parcel_id, selected_scenario_id, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(projectId, input.name, now, now, '1.0.0', null, null, 'draft', input.notes || null);

    return {
      id: projectId,
      name: input.name,
      created: now,
      modified: now,
      version: '1.0.0',
      landParcelId: null,
      selectedScenarioId: null,
      status: 'draft',
      notes: input.notes,
    };
  } catch (error: any) {
    console.error('Error creating project:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  }
});

ipcMain.handle('project:load', async (event, id: string) => {
  console.log('[IPC] project:load called with id:', id);

  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, name, created, modified, version, land_parcel_id, selected_scenario_id, status, notes
      FROM projects
      WHERE id = ?
    `);

    const project = stmt.get(id) as any;

    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }

    const result = {
      id: project.id,
      name: project.name,
      created: project.created,
      modified: project.modified,
      version: project.version,
      landParcelId: project.land_parcel_id,
      selectedScenarioId: project.selected_scenario_id,
      status: project.status,
      notes: project.notes,
    };

    console.log('[IPC] Loaded project:', result);
    return result;
  } catch (error: any) {
    console.error('[IPC] Error loading project:', error);
    throw new Error(`Failed to load project: ${error.message}`);
  }
});

ipcMain.handle('project:list', async () => {
  console.log('IPC: project:list called');

  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, name, created, modified, version, status, notes
      FROM projects
      ORDER BY modified DESC
    `);

    const projects = stmt.all() as any[];

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      created: project.created,
      modified: project.modified,
      version: project.version,
      status: project.status,
      notes: project.notes,
    }));
  } catch (error: any) {
    console.error('Error listing projects:', error);
    throw new Error(`Failed to list projects: ${error.message}`);
  }
});

// Land parcel operations
ipcMain.handle('land:save', async (event, data: any) => {
  console.log('IPC: land:save called with data:', data);

  try {
    const db = getDatabase();
    const landParcelId = crypto.randomUUID();
    const area = Number((data.width * data.length).toFixed(2));

    // Begin transaction
    db.prepare('BEGIN').run();

    try {
      // Insert land parcel
      const stmt = db.prepare(`
        INSERT INTO land_parcels (
          id, project_id, width_meters, length_meters, area_sqm,
          province, is_urbanized, acquisition_cost_amount, acquisition_cost_currency, display_unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        landParcelId,
        data.projectId,
        data.width,
        data.length,
        area,
        data.province,
        data.isUrbanized ? 1 : 0,
        data.acquisitionCost.amount,
        data.acquisitionCost.currency,
        data.displayUnit || 'sqm'
      );

      // Insert landmarks if provided
      if (data.landmarks && data.landmarks.length > 0) {
        const landmarkStmt = db.prepare(`
          INSERT INTO landmarks (id, land_parcel_id, type, name, distance_km, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const landmark of data.landmarks) {
          landmarkStmt.run(
            crypto.randomUUID(),
            landParcelId,
            landmark.type,
            landmark.name,
            landmark.distance || null,
            landmark.description || null
          );
        }
      }

      // Update project to link land parcel
      const updateProjectStmt = db.prepare(`
        UPDATE projects
        SET land_parcel_id = ?, modified = ?
        WHERE id = ?
      `);

      const updateResult = updateProjectStmt.run(
        landParcelId,
        new Date().toISOString(),
        data.projectId
      );
      console.log('[IPC] Updated project with land parcel ID. Changes:', updateResult.changes);

      // Commit transaction
      db.prepare('COMMIT').run();

      return {
        id: landParcelId,
        projectId: data.projectId,
        width: data.width,
        length: data.length,
        area: area,
        province: data.province,
        landmarks: data.landmarks || [],
        isUrbanized: data.isUrbanized,
        acquisitionCost: data.acquisitionCost,
        displayUnit: data.displayUnit || 'sqm',
      };
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error: any) {
    console.error('Error saving land parcel:', error);
    throw new Error(`Failed to save land parcel: ${error.message}`);
  }
});

ipcMain.handle('land:update', async (event, id: string, data: any) => {
  console.log('IPC: land:update called with id:', id, 'data:', data);

  try {
    const db = getDatabase();
    const area = Number((data.width * data.length).toFixed(2));

    // Begin transaction
    db.prepare('BEGIN').run();

    try {
      // Update land parcel
      const stmt = db.prepare(`
        UPDATE land_parcels
        SET width_meters = ?, length_meters = ?, area_sqm = ?,
            province = ?, is_urbanized = ?, acquisition_cost_amount = ?,
            acquisition_cost_currency = ?, display_unit = ?
        WHERE id = ?
      `);

      const result = stmt.run(
        data.width,
        data.length,
        area,
        data.province,
        data.isUrbanized ? 1 : 0,
        data.acquisitionCost.amount,
        data.acquisitionCost.currency,
        data.displayUnit || 'sqm',
        id
      );

      if (result.changes === 0) {
        throw new Error(`Land parcel with id ${id} not found`);
      }

      // Delete existing landmarks
      db.prepare('DELETE FROM landmarks WHERE land_parcel_id = ?').run(id);

      // Insert new landmarks if provided
      if (data.landmarks && data.landmarks.length > 0) {
        const landmarkStmt = db.prepare(`
          INSERT INTO landmarks (id, land_parcel_id, type, name, distance_km, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const landmark of data.landmarks) {
          landmarkStmt.run(
            crypto.randomUUID(),
            id,
            landmark.type,
            landmark.name,
            landmark.distance || null,
            landmark.description || null
          );
        }
      }

      // Update project modified timestamp
      const projectIdStmt = db.prepare('SELECT project_id FROM land_parcels WHERE id = ?');
      const projectRow = projectIdStmt.get(id) as any;

      if (projectRow) {
        db.prepare('UPDATE projects SET modified = ? WHERE id = ?').run(
          new Date().toISOString(),
          projectRow.project_id
        );
      }

      // Commit transaction
      db.prepare('COMMIT').run();

      return {
        id: id,
        projectId: projectRow?.project_id,
        width: data.width,
        length: data.length,
        area: area,
        province: data.province,
        landmarks: data.landmarks || [],
        isUrbanized: data.isUrbanized,
        acquisitionCost: data.acquisitionCost,
        displayUnit: data.displayUnit || 'sqm',
      };
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error: any) {
    console.error('Error updating land parcel:', error);
    throw new Error(`Failed to update land parcel: ${error.message}`);
  }
});

ipcMain.handle('land:load', async (event, id: string) => {
  console.log('[IPC] land:load called with id:', id);

  try {
    const db = getDatabase();

    // Load land parcel
    const landStmt = db.prepare(`
      SELECT id, project_id, width_meters, length_meters, area_sqm,
             province, is_urbanized, acquisition_cost_amount,
             acquisition_cost_currency, display_unit, target_microvillas_count
      FROM land_parcels
      WHERE id = ?
    `);

    const landParcel = landStmt.get(id) as any;

    if (!landParcel) {
      console.log('[IPC] Land parcel not found for id:', id);
      throw new Error(`Land parcel with id ${id} not found`);
    }

    console.log('[IPC] Found land parcel in database:', landParcel);

    // Load landmarks for this land parcel
    const landmarksStmt = db.prepare(`
      SELECT id, type, name, distance_km, description
      FROM landmarks
      WHERE land_parcel_id = ?
    `);

    const landmarks = landmarksStmt.all(id) as any[];
    console.log('[IPC] Found', landmarks.length, 'landmarks');

    const result = {
      id: landParcel.id,
      projectId: landParcel.project_id,
      width: landParcel.width_meters,
      length: landParcel.length_meters,
      area: landParcel.area_sqm,
      province: landParcel.province,
      isUrbanized: landParcel.is_urbanized === 1,
      acquisitionCost: {
        amount: landParcel.acquisition_cost_amount,
        currency: landParcel.acquisition_cost_currency,
      },
      displayUnit: landParcel.display_unit || 'sqm',
      targetMicrovillasCount: landParcel.target_microvillas_count,
      landmarks: landmarks.map((lm) => ({
        type: lm.type,
        name: lm.name,
        distance: lm.distance_km,
        description: lm.description,
      })),
    };

    console.log('[IPC] Returning land parcel:', result);
    return result;
  } catch (error: any) {
    console.error('[IPC] Error loading land parcel:', error);
    throw new Error(`Failed to load land parcel: ${error.message}`);
  }
});

// Subdivision operations
ipcMain.handle('subdivision:calculate', async (event, landParcelId: string, options?: any) => {
  console.log('IPC: subdivision:calculate called for land parcel:', landParcelId);

  try {
    const db = getDatabase();

    // 1. Get land parcel data
    const parcelStmt = db.prepare(`
      SELECT id, project_id, width_meters, length_meters, area_sqm
      FROM land_parcels
      WHERE id = ?
    `);
    const parcel = parcelStmt.get(landParcelId) as any;

    if (!parcel) {
      throw new Error(`Land parcel with id ${landParcelId} not found`);
    }

    // 2. Import SubdivisionCalculator (dynamic import for main process)
    // Note: In Electron main process, we need to use the bundled renderer code
    // For now, we'll implement the calculation logic directly here
    // TODO: Refactor to shared service in Phase 4 polish

    const scenarios = calculateSubdivisionScenarios(
      {
        id: parcel.id,
        width: parcel.width_meters,
        length: parcel.length_meters,
        area: parcel.area_sqm,
      },
      options || {}
    );

    // 3. Begin transaction
    db.prepare('BEGIN').run();

    try {
      // 4. Delete existing scenarios for this land parcel
      db.prepare('DELETE FROM subdivision_scenarios WHERE land_parcel_id = ?').run(landParcelId);

      // 5. Insert new scenarios
      const insertStmt = db.prepare(`
        INSERT INTO subdivision_scenarios (
          id, land_parcel_id, social_club_percent,
          social_club_width, social_club_length, social_club_area,
          social_club_pos_x, social_club_pos_y,
          lot_count, lot_width, lot_length, lot_area, lot_min_area,
          grid_rows, grid_columns, grid_distribution,
          total_lots_area, common_area_percent_per_lot,
          is_viable, calculated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const scenario of scenarios) {
        insertStmt.run(
          scenario.id,
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
          scenario.lots.minArea,
          scenario.lots.grid.rows,
          scenario.lots.grid.columns,
          scenario.lots.grid.distribution,
          scenario.totalLotsArea,
          scenario.commonAreaPercentPerLot,
          scenario.isViable ? 1 : 0,
          scenario.calculatedAt.toISOString()
        );
      }

      // 6. Update project modified timestamp
      const projectId = parcel.project_id;
      db.prepare('UPDATE projects SET modified = ? WHERE id = ?').run(
        new Date().toISOString(),
        projectId
      );

      db.prepare('COMMIT').run();

      console.log(`[IPC] Generated ${scenarios.length} subdivision scenarios`);

      return scenarios.map((s) => ({
        id: s.id,
        socialClubPercent: s.socialClubPercent,
        lotCount: s.lots.count,
        lotArea: s.lots.area,
        isViable: s.isViable,
      }));
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error: any) {
    console.error('Error calculating subdivisions:', error);
    throw new Error(`Failed to calculate subdivisions: ${error.message}`);
  }
});

ipcMain.handle('subdivision:select', async (event, projectId: string, scenarioId: string) => {
  console.log('IPC: subdivision:select called with scenarioId:', scenarioId);

  try {
    const db = getDatabase();

    // Verify scenario exists
    const scenarioStmt = db.prepare('SELECT id FROM subdivision_scenarios WHERE id = ?');
    const scenario = scenarioStmt.get(scenarioId);

    if (!scenario) {
      throw new Error(`Subdivision scenario with id ${scenarioId} not found`);
    }

    // Update project's selected scenario
    const updateStmt = db.prepare(`
      UPDATE projects
      SET selected_scenario_id = ?, modified = ?
      WHERE id = ?
    `);

    const result = updateStmt.run(scenarioId, new Date().toISOString(), projectId);

    if (result.changes === 0) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    console.log(`[IPC] Selected scenario ${scenarioId} for project ${projectId}`);

    return { success: true, scenarioId };
  } catch (error: any) {
    console.error('Error selecting subdivision scenario:', error);
    throw new Error(`Failed to select scenario: ${error.message}`);
  }
});

// Helper function: Subdivision calculation logic (simplified version for main process)
function calculateSubdivisionScenarios(parcel: any, options: any) {
  const scenarios = [];
  const MIN_LOT_AREA = 90;

  for (let percent = 10; percent <= 30; percent++) {
    const socialClubArea = parcel.area * (percent / 100);
    const aspectRatio = parcel.length / parcel.width;
    const clubWidth = Math.sqrt(socialClubArea / aspectRatio);
    const clubLength = clubWidth * aspectRatio;

    const remainingArea = parcel.area - socialClubArea;
    const estimatedLotCount = Math.floor(remainingArea / (MIN_LOT_AREA * 1.5));

    if (estimatedLotCount === 0) continue;

    const lotArea = remainingArea / estimatedLotCount;

    if (lotArea < MIN_LOT_AREA) continue;

    const lotWidth = Math.sqrt(lotArea);
    const lotLength = lotArea / lotWidth;

    scenarios.push({
      id: crypto.randomUUID(),
      socialClubPercent: percent,
      socialClub: {
        width: clubWidth,
        length: clubLength,
        area: socialClubArea,
        position: {
          x: (parcel.width - clubWidth) / 2,
          y: (parcel.length - clubLength) / 2,
        },
      },
      lots: {
        count: estimatedLotCount,
        width: lotWidth,
        length: lotLength,
        area: lotArea,
        minArea: MIN_LOT_AREA,
        grid: {
          rows: Math.ceil(Math.sqrt(estimatedLotCount)),
          columns: Math.ceil(Math.sqrt(estimatedLotCount)),
          distribution: 'four-quadrants',
        },
      },
      totalLotsArea: estimatedLotCount * lotArea,
      commonAreaPercentPerLot: 100 / estimatedLotCount,
      isViable: lotArea >= MIN_LOT_AREA,
      calculatedAt: new Date(),
    });
  }

  return scenarios;
}

// Amenities catalog
ipcMain.handle('amenities:catalog', async () => {
  console.log('IPC: amenities:catalog called');

  try {
    const fs = require('fs');
    const path = require('path');

    // Read amenities catalog from public/assets directory
    const catalogPath = path.join(__dirname, '../../public/assets/amenities-catalog.json');
    const catalogData = fs.readFileSync(catalogPath, 'utf-8');
    const catalog = JSON.parse(catalogData);

    return catalog.amenities;
  } catch (error: any) {
    console.error('Error loading amenities catalog:', error);
    throw new Error(`Failed to load amenities catalog: ${error.message}`);
  }
});

// Social club operations
ipcMain.handle('socialclub:save', async (event, data: any) => {
  console.log('IPC: socialclub:save called with data:', data);

  try {
    const db = getDatabase();
    const socialClubId = crypto.randomUUID();

    // Calculate total cost from selected amenities
    let totalCostAmount = 0;
    const totalCostCurrency =
      data.selectedAmenities.length > 0 ? data.selectedAmenities[0].totalCost.currency : 'USD';

    for (const amenity of data.selectedAmenities) {
      totalCostAmount += amenity.totalCost.amount;
    }

    // Provide default values for optional fields
    const maintenanceRoomLocation = data.maintenanceRoomLocation || 'in-social-club';

    // Get social club area from either traditional scenario or AI subdivision plan
    let socialClubArea: number;

    // First, try traditional subdivision scenarios
    const scenarioStmt = db.prepare(`
      SELECT social_club_area FROM subdivision_scenarios WHERE id = ?
    `);
    const scenario = scenarioStmt.get(data.scenarioId) as any;

    if (scenario) {
      // Traditional subdivision scenario
      socialClubArea = scenario.social_club_area;
      console.log(
        '[socialclub:save] Using traditional scenario, social club area:',
        socialClubArea
      );
    } else {
      // Not a traditional scenario - check if it's an AI subdivision plan
      const aiPlanStmt = db.prepare(`
        SELECT plan_json FROM ai_subdivision_plans WHERE id = ?
      `);
      const aiPlan = aiPlanStmt.get(data.scenarioId) as any;

      if (!aiPlan) {
        throw new Error(`Scenario/Plan with id ${data.scenarioId} not found`);
      }

      // Extract social club area from AI plan JSON
      const planData = JSON.parse(aiPlan.plan_json);
      const socialClubAmenity = planData.amenityAreas?.find(
        (area: any) => area.type === 'social-club'
      );

      if (!socialClubAmenity) {
        throw new Error('Social club area not found in AI subdivision plan');
      }

      socialClubArea = socialClubAmenity.areaSqm;
      console.log('[socialclub:save] Using AI subdivision plan, social club area:', socialClubArea);
    }

    // Begin transaction
    db.prepare('BEGIN').run();

    try {
      // Check if social club design already exists for this project
      const existingStmt = db.prepare(`
        SELECT id FROM social_club_designs WHERE project_id = ?
      `);
      const existing = existingStmt.get(data.projectId) as any;

      if (existing) {
        // Update existing social club design
        const updateStmt = db.prepare(`
          UPDATE social_club_designs
          SET scenario_id = ?, storage_type = ?, dedicated_storage_area = ?,
              maintenance_room_size = ?, maintenance_room_location = ?,
              total_cost_amount = ?, total_cost_currency = ?, total_area = ?
          WHERE id = ?
        `);

        updateStmt.run(
          data.scenarioId,
          data.storageType,
          data.dedicatedStorageArea || null,
          data.maintenanceRoomSize,
          maintenanceRoomLocation,
          totalCostAmount,
          totalCostCurrency,
          socialClubArea,
          existing.id
        );

        // Delete old amenities
        const deleteAmenitiesStmt = db.prepare(`
          DELETE FROM selected_amenities WHERE social_club_design_id = ?
        `);
        deleteAmenitiesStmt.run(existing.id);

        // Insert new amenities
        const amenityStmt = db.prepare(`
          INSERT INTO selected_amenities (
            id, social_club_design_id, amenity_id, category, name, quantity,
            unit_cost_amount, unit_cost_currency, total_cost_amount, total_cost_currency, space_requirement
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const amenity of data.selectedAmenities) {
          amenityStmt.run(
            crypto.randomUUID(),
            existing.id,
            amenity.id,
            amenity.category,
            amenity.name,
            amenity.quantity,
            amenity.unitCost.amount,
            amenity.unitCost.currency,
            amenity.totalCost.amount,
            amenity.totalCost.currency,
            amenity.spaceRequirement || null
          );
        }

        db.prepare('COMMIT').run();

        return {
          id: existing.id,
          projectId: data.projectId,
          scenarioId: data.scenarioId,
          selectedAmenities: data.selectedAmenities,
          storageType: data.storageType,
          dedicatedStorageArea: data.dedicatedStorageArea,
          maintenanceRoomSize: data.maintenanceRoomSize,
          maintenanceRoomLocation: maintenanceRoomLocation,
          totalCost: { amount: totalCostAmount, currency: totalCostCurrency },
          totalArea: socialClubArea,
        };
      } else {
        // Insert new social club design
        const insertStmt = db.prepare(`
          INSERT INTO social_club_designs (
            id, project_id, scenario_id, storage_type, dedicated_storage_area,
            maintenance_room_size, maintenance_room_location,
            total_cost_amount, total_cost_currency, total_area
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
          socialClubId,
          data.projectId,
          data.scenarioId,
          data.storageType,
          data.dedicatedStorageArea || null,
          data.maintenanceRoomSize,
          maintenanceRoomLocation,
          totalCostAmount,
          totalCostCurrency,
          socialClubArea
        );

        // Insert amenities
        const amenityStmt = db.prepare(`
          INSERT INTO selected_amenities (
            id, social_club_design_id, amenity_id, category, name, quantity,
            unit_cost_amount, unit_cost_currency, total_cost_amount, total_cost_currency, space_requirement
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const amenity of data.selectedAmenities) {
          amenityStmt.run(
            crypto.randomUUID(),
            socialClubId,
            amenity.id,
            amenity.category,
            amenity.name,
            amenity.quantity,
            amenity.unitCost.amount,
            amenity.unitCost.currency,
            amenity.totalCost.amount,
            amenity.totalCost.currency,
            amenity.spaceRequirement || null
          );
        }

        // Update project to set modified timestamp
        const updateProjectStmt = db.prepare(`
          UPDATE projects SET modified = ? WHERE id = ?
        `);
        updateProjectStmt.run(new Date().toISOString(), data.projectId);

        db.prepare('COMMIT').run();

        return {
          id: socialClubId,
          projectId: data.projectId,
          scenarioId: data.scenarioId,
          selectedAmenities: data.selectedAmenities,
          storageType: data.storageType,
          dedicatedStorageArea: data.dedicatedStorageArea,
          maintenanceRoomSize: data.maintenanceRoomSize,
          maintenanceRoomLocation: maintenanceRoomLocation,
          totalCost: { amount: totalCostAmount, currency: totalCostCurrency },
          totalArea: socialClubArea,
        };
      }
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error: any) {
    console.error('Error saving social club design:', error);
    throw new Error(`Failed to save social club design: ${error.message}`);
  }
});

// Load social club design
ipcMain.handle('socialclub:load', async (event, projectId: string) => {
  console.log('IPC: socialclub:load called for project:', projectId);

  try {
    const db = getDatabase();

    // Get the social club design
    const designStmt = db.prepare(`
      SELECT * FROM social_club_designs WHERE project_id = ?
    `);
    const design = designStmt.get(projectId) as any;

    if (!design) {
      return { found: false };
    }

    // Get the selected amenities
    const amenitiesStmt = db.prepare(`
      SELECT * FROM selected_amenities WHERE social_club_design_id = ?
    `);
    const amenities = amenitiesStmt.all(design.id) as any[];

    // Get the generated images from social_club_images table
    const imagesStmt = db.prepare(`
      SELECT image_path, prompt FROM social_club_images
      WHERE project_id = ? AND scenario_id = ?
      ORDER BY generated_at DESC
    `);
    const images = imagesStmt.all(projectId, design.scenario_id) as any[];

    return {
      found: true,
      design: {
        id: design.id,
        projectId: design.project_id,
        scenarioId: design.scenario_id,
        storageType: design.storage_type,
        dedicatedStorageArea: design.dedicated_storage_area,
        maintenanceRoomSize: design.maintenance_room_size,
        maintenanceRoomLocation: design.maintenance_room_location,
        totalCost: {
          amount: design.total_cost_amount,
          currency: design.total_cost_currency,
        },
        totalArea: design.total_area,
      },
      amenities: amenities.map((a) => ({
        id: a.amenity_id,
        name: a.name,
        category: a.category,
        quantity: a.quantity,
        unitCost: {
          amount: a.unit_cost_amount,
          currency: a.unit_cost_currency,
        },
        totalCost: {
          amount: a.total_cost_amount,
          currency: a.total_cost_currency,
        },
        spaceRequirement: a.space_requirement,
      })),
      generatedImages: images.map((img) => img.image_path),
      designPrompt: images.length > 0 ? images[0].prompt : '',
    };
  } catch (error: any) {
    console.error('Error loading social club design:', error);
    throw new Error(`Failed to load social club design: ${error.message}`);
  }
});

// AI integration
ipcMain.handle(
  'ai:generateSubdivisionPrompt',
  async (event, projectId: string, targetDirectory: string) => {
    console.log('IPC: ai:generateSubdivisionPrompt called for project:', projectId);

    try {
      const fs = require('fs');
      const path = require('path');
      const db = getDatabase();

      // 1. Load complete project data
      const projectData = await loadCompleteProject(db, projectId);

      if (!projectData) {
        throw new Error(`Project with id ${projectId} not found`);
      }

      // 2. Validate project has required data
      if (!projectData.landParcel) {
        throw new Error('Project must have land parcel configured');
      }

      if (!projectData.subdivisionScenarios || projectData.subdivisionScenarios.length === 0) {
        throw new Error('Project must have at least one subdivision scenario');
      }

      // 3. Generate Claude Code prompt using AIDescriptionGenerator logic
      const prompt = generateClaudeCodePromptData(projectData);

      // 4. Ensure target directory exists
      if (!fs.existsSync(targetDirectory)) {
        fs.mkdirSync(targetDirectory, { recursive: true });
      }

      // 5. Write ai-subdivision-prompt.json to target directory
      const promptPath = path.join(targetDirectory, 'ai-subdivision-prompt.json');
      fs.writeFileSync(promptPath, JSON.stringify(prompt, null, 2), 'utf-8');

      // 6. Update project target_directory if not already set
      db.prepare('UPDATE projects SET target_directory = ?, modified = ? WHERE id = ?').run(
        targetDirectory,
        new Date().toISOString(),
        projectId
      );

      console.log(`[IPC] Generated AI subdivision prompt at: ${promptPath}`);

      return {
        success: true,
        filePath: promptPath,
        fileName: 'ai-subdivision-prompt.json',
      };
    } catch (error: any) {
      console.error('Error generating AI subdivision prompt:', error);
      throw new Error(`Failed to generate AI subdivision prompt: ${error.message}`);
    }
  }
);

ipcMain.handle(
  'ai:generateImagePrompts',
  async (event, projectId: string, targetDirectory: string) => {
    console.log('IPC: ai:generateImagePrompts called for project:', projectId);

    try {
      const fs = require('fs');
      const path = require('path');
      const db = getDatabase();

      // 1. Load complete project data
      const projectData = await loadCompleteProject(db, projectId);

      if (!projectData) {
        throw new Error(`Project with id ${projectId} not found`);
      }

      // 2. Validate project has required data
      if (!projectData.landParcel) {
        throw new Error('Project must have land parcel configured');
      }

      if (!projectData.selectedScenarioId) {
        throw new Error('Project must have a selected subdivision scenario');
      }

      // 3. Generate Google Nano prompts using AIDescriptionGenerator logic
      const prompts = generateGoogleNanoPromptsData(projectData);

      // 4. Ensure target directory exists
      if (!fs.existsSync(targetDirectory)) {
        fs.mkdirSync(targetDirectory, { recursive: true });
      }

      // 5. Convert prompts to text format
      const promptText = formatPromptsAsText(prompts);

      // 6. Write ai-image-prompts.txt to target directory
      const promptPath = path.join(targetDirectory, 'ai-image-prompts.txt');
      fs.writeFileSync(promptPath, promptText, 'utf-8');

      // 7. Update project target_directory if not already set
      db.prepare('UPDATE projects SET target_directory = ?, modified = ? WHERE id = ?').run(
        targetDirectory,
        new Date().toISOString(),
        projectId
      );

      console.log(`[IPC] Generated AI image prompts at: ${promptPath}`);

      return {
        success: true,
        filePath: promptPath,
        fileName: 'ai-image-prompts.txt',
      };
    } catch (error: any) {
      console.error('Error generating AI image prompts:', error);
      throw new Error(`Failed to generate AI image prompts: ${error.message}`);
    }
  }
);

ipcMain.handle('ai:importOptimizedSubdivision', async (event, filePath: string) => {
  console.log('IPC: ai:importOptimizedSubdivision called for file:', filePath);

  try {
    const fs = require('fs');
    const db = getDatabase();

    // 1. Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const optimizedData = JSON.parse(fileContent);

    // 2. Validate the imported data structure
    if (!optimizedData.projectId) {
      throw new Error('Invalid import file: missing projectId');
    }

    if (!optimizedData.subdivisionScenario) {
      throw new Error('Invalid import file: missing subdivisionScenario');
    }

    const projectId = optimizedData.projectId;
    const scenario = optimizedData.subdivisionScenario;

    // 3. Verify project exists
    const project = db
      .prepare('SELECT id, land_parcel_id FROM projects WHERE id = ?')
      .get(projectId) as any;

    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    // 4. Create new subdivision scenario from optimized data
    const scenarioId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare('BEGIN').run();

    try {
      const stmt = db.prepare(`
        INSERT INTO subdivision_scenarios (
          id, land_parcel_id, social_club_percent,
          social_club_width, social_club_length, social_club_area,
          social_club_pos_x, social_club_pos_y,
          lot_count, lot_width, lot_length, lot_area, lot_min_area,
          grid_rows, grid_columns, grid_distribution,
          total_lots_area, common_area_percent_per_lot,
          parking_spaces, is_viable, calculated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        scenarioId,
        project.land_parcel_id,
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
        scenario.lots.minArea || 90,
        scenario.lots.grid.rows,
        scenario.lots.grid.columns,
        scenario.lots.grid.distribution,
        scenario.totalLotsArea,
        scenario.commonAreaPercentPerLot,
        scenario.lots.count * 2, // 2 parking spaces per villa
        1, // is_viable = true (assumed optimized is viable)
        now
      );

      // 5. Update project to select this new scenario
      db.prepare('UPDATE projects SET selected_scenario_id = ?, modified = ? WHERE id = ?').run(
        scenarioId,
        now,
        projectId
      );

      db.prepare('COMMIT').run();

      console.log(`[IPC] Imported optimized subdivision scenario: ${scenarioId}`);

      return {
        success: true,
        scenarioId,
        message: 'Optimized subdivision imported successfully',
      };
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error: any) {
    console.error('Error importing optimized subdivision:', error);
    throw new Error(`Failed to import optimized subdivision: ${error.message}`);
  }
});

// Financial analysis operations
ipcMain.handle('financial:save', async (event, data: any) => {
  console.log('IPC: financial:save called with data:', data);

  try {
    const db = getDatabase();
    const financialId = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    // Check if financial analysis exists
    const existing = db
      .prepare('SELECT id FROM financial_analyses WHERE project_id = ?')
      .get(data.projectId);

    if (existing) {
      // Update existing financial analysis
      const stmt = db.prepare(`
        UPDATE financial_analyses
        SET land_acquisition_amount = ?,
            land_acquisition_currency = ?,
            amenities_amount = ?,
            amenities_currency = ?,
            parking_area_cost_amount = ?,
            parking_area_cost_currency = ?,
            walkways_cost_amount = ?,
            walkways_cost_currency = ?,
            landscaping_cost_amount = ?,
            landscaping_cost_currency = ?,
            maintenance_room_cost_amount = ?,
            maintenance_room_cost_currency = ?,
            storage_cost_amount = ?,
            storage_cost_currency = ?,
            legal_notary_amount = ?,
            legal_notary_currency = ?,
            legal_permits_amount = ?,
            legal_permits_currency = ?,
            legal_registrations_amount = ?,
            legal_registrations_currency = ?,
            total_project_cost_amount = ?,
            total_project_cost_currency = ?,
            cost_per_sqm_amount = ?,
            cost_per_sqm_currency = ?,
            base_lot_cost_amount = ?,
            base_lot_cost_currency = ?,
            monthly_maintenance_amount = ?,
            monthly_maintenance_currency = ?,
            monthly_maintenance_per_owner_amount = ?,
            monthly_maintenance_per_owner_currency = ?,
            exchange_rate_from = ?,
            exchange_rate_to = ?,
            exchange_rate_value = ?,
            exchange_rate_date = ?,
            last_modified = ?
        WHERE project_id = ?
      `);

      stmt.run(
        data.costs.landAcquisition.amount,
        data.costs.landAcquisition.currency,
        data.costs.amenities.amount,
        data.costs.amenities.currency,
        data.costs.parkingArea.amount,
        data.costs.parkingArea.currency,
        data.costs.walkways.amount,
        data.costs.walkways.currency,
        data.costs.landscaping.amount,
        data.costs.landscaping.currency,
        data.costs.maintenanceRoom.amount,
        data.costs.maintenanceRoom.currency,
        data.costs.storage.amount,
        data.costs.storage.currency,
        data.costs.legal.notaryFees.amount,
        data.costs.legal.notaryFees.currency,
        data.costs.legal.permits.amount,
        data.costs.legal.permits.currency,
        data.costs.legal.registrations.amount,
        data.costs.legal.registrations.currency,
        data.totalProjectCost.amount,
        data.totalProjectCost.currency,
        data.costPerSqm.amount,
        data.costPerSqm.currency,
        data.baseLotCost.amount,
        data.baseLotCost.currency,
        data.monthlyMaintenanceCost?.amount || null,
        data.monthlyMaintenanceCost?.currency || null,
        data.monthlyMaintenancePerOwner?.amount || null,
        data.monthlyMaintenancePerOwner?.currency || null,
        data.exchangeRate?.from || null,
        data.exchangeRate?.to || null,
        data.exchangeRate?.rate || null,
        data.exchangeRate?.effectiveDate || null,
        now,
        data.projectId
      );
    } else {
      // Insert new financial analysis
      const stmt = db.prepare(`
        INSERT INTO financial_analyses (
          id, project_id,
          land_acquisition_amount, land_acquisition_currency,
          amenities_amount, amenities_currency,
          parking_area_cost_amount, parking_area_cost_currency,
          walkways_cost_amount, walkways_cost_currency,
          landscaping_cost_amount, landscaping_cost_currency,
          maintenance_room_cost_amount, maintenance_room_cost_currency,
          storage_cost_amount, storage_cost_currency,
          legal_notary_amount, legal_notary_currency,
          legal_permits_amount, legal_permits_currency,
          legal_registrations_amount, legal_registrations_currency,
          total_project_cost_amount, total_project_cost_currency,
          cost_per_sqm_amount, cost_per_sqm_currency,
          base_lot_cost_amount, base_lot_cost_currency,
          monthly_maintenance_amount, monthly_maintenance_currency,
          monthly_maintenance_per_owner_amount, monthly_maintenance_per_owner_currency,
          exchange_rate_from, exchange_rate_to, exchange_rate_value, exchange_rate_date,
          calculated_at, last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        financialId,
        data.projectId,
        data.costs.landAcquisition.amount,
        data.costs.landAcquisition.currency,
        data.costs.amenities.amount,
        data.costs.amenities.currency,
        data.costs.parkingArea.amount,
        data.costs.parkingArea.currency,
        data.costs.walkways.amount,
        data.costs.walkways.currency,
        data.costs.landscaping.amount,
        data.costs.landscaping.currency,
        data.costs.maintenanceRoom.amount,
        data.costs.maintenanceRoom.currency,
        data.costs.storage.amount,
        data.costs.storage.currency,
        data.costs.legal.notaryFees.amount,
        data.costs.legal.notaryFees.currency,
        data.costs.legal.permits.amount,
        data.costs.legal.permits.currency,
        data.costs.legal.registrations.amount,
        data.costs.legal.registrations.currency,
        data.totalProjectCost.amount,
        data.totalProjectCost.currency,
        data.costPerSqm.amount,
        data.costPerSqm.currency,
        data.baseLotCost.amount,
        data.baseLotCost.currency,
        data.monthlyMaintenanceCost?.amount || null,
        data.monthlyMaintenanceCost?.currency || null,
        data.monthlyMaintenancePerOwner?.amount || null,
        data.monthlyMaintenancePerOwner?.currency || null,
        data.exchangeRate?.from || null,
        data.exchangeRate?.to || null,
        data.exchangeRate?.rate || null,
        data.exchangeRate?.effectiveDate || null,
        now,
        now
      );
    }

    // Delete existing other costs and pricing scenarios
    db.prepare('DELETE FROM other_costs WHERE financial_analysis_id = ?').run(
      existing ? existing.id : financialId
    );
    db.prepare('DELETE FROM pricing_scenarios WHERE financial_analysis_id = ?').run(
      existing ? existing.id : financialId
    );

    // Insert other costs
    if (data.costs.other && data.costs.other.length > 0) {
      const otherCostStmt = db.prepare(`
        INSERT INTO other_costs (id, financial_analysis_id, label, amount, currency, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const cost of data.costs.other) {
        otherCostStmt.run(
          cost.id || crypto.randomUUID(),
          existing ? existing.id : financialId,
          cost.label,
          cost.amount.amount,
          cost.amount.currency,
          cost.description || null
        );
      }
    }

    // Insert pricing scenarios
    if (data.pricingScenarios && data.pricingScenarios.length > 0) {
      const scenarioStmt = db.prepare(`
        INSERT INTO pricing_scenarios (
          id, financial_analysis_id, profit_margin_percent,
          lot_sale_price_amount, lot_sale_price_currency,
          total_revenue_amount, total_revenue_currency,
          expected_profit_amount, expected_profit_currency,
          roi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const scenario of data.pricingScenarios) {
        scenarioStmt.run(
          scenario.id || crypto.randomUUID(),
          existing ? existing.id : financialId,
          scenario.profitMarginPercent,
          scenario.lotSalePrice.amount,
          scenario.lotSalePrice.currency,
          scenario.totalRevenue.amount,
          scenario.totalRevenue.currency,
          scenario.expectedProfit.amount,
          scenario.expectedProfit.currency,
          scenario.roi
        );
      }
    }

    return { success: true, id: existing ? existing.id : financialId };
  } catch (error: any) {
    console.error('Error saving financial analysis:', error);
    throw new Error(`Failed to save financial analysis: ${error.message}`);
  }
});

ipcMain.handle('financial:recalculate', async (event, projectId: string) => {
  console.log('IPC: financial:recalculate called for project:', projectId);

  try {
    // This handler will be called when subdivision changes
    // It should trigger recalculation in the renderer process
    // The actual recalculation is done in the renderer using FinancialAnalyzer.recalculate()
    return { success: true, message: 'Recalculation triggered' };
  } catch (error: any) {
    console.error('Error triggering financial recalculation:', error);
    throw new Error(`Failed to recalculate financials: ${error.message}`);
  }
});

ipcMain.handle('financial:load', async (event, projectId: string) => {
  console.log('IPC: financial:load called for project:', projectId);

  try {
    const db = getDatabase();

    // Load financial analysis
    const financial = db
      .prepare(
        `
      SELECT * FROM financial_analyses WHERE project_id = ?
    `
      )
      .get(projectId) as any;

    if (!financial) {
      return null;
    }

    // Load other costs
    const otherCosts = db
      .prepare(
        `
      SELECT * FROM other_costs WHERE financial_analysis_id = ?
    `
      )
      .all(financial.id) as any[];

    // Load pricing scenarios
    const pricingScenarios = db
      .prepare(
        `
      SELECT * FROM pricing_scenarios WHERE financial_analysis_id = ?
    `
      )
      .all(financial.id) as any[];

    // Transform to match interface
    return {
      id: financial.id,
      projectId: financial.project_id,
      costs: {
        landAcquisition: {
          amount: financial.land_acquisition_amount,
          currency: financial.land_acquisition_currency,
        },
        amenities: {
          amount: financial.amenities_amount,
          currency: financial.amenities_currency,
        },
        parkingArea: {
          amount: financial.parking_area_cost_amount,
          currency: financial.parking_area_cost_currency,
        },
        walkways: {
          amount: financial.walkways_cost_amount,
          currency: financial.walkways_cost_currency,
        },
        landscaping: {
          amount: financial.landscaping_cost_amount,
          currency: financial.landscaping_cost_currency,
        },
        maintenanceRoom: {
          amount: financial.maintenance_room_cost_amount,
          currency: financial.maintenance_room_cost_currency,
        },
        storage: {
          amount: financial.storage_cost_amount,
          currency: financial.storage_cost_currency,
        },
        legal: {
          notaryFees: {
            amount: financial.legal_notary_amount,
            currency: financial.legal_notary_currency,
          },
          permits: {
            amount: financial.legal_permits_amount,
            currency: financial.legal_permits_currency,
          },
          registrations: {
            amount: financial.legal_registrations_amount,
            currency: financial.legal_registrations_currency,
          },
          total: {
            amount:
              financial.legal_notary_amount +
              financial.legal_permits_amount +
              financial.legal_registrations_amount,
            currency: financial.legal_notary_currency,
          },
        },
        other: otherCosts.map((cost) => ({
          id: cost.id,
          label: cost.label,
          amount: {
            amount: cost.amount,
            currency: cost.currency,
          },
          description: cost.description,
        })),
      },
      totalProjectCost: {
        amount: financial.total_project_cost_amount,
        currency: financial.total_project_cost_currency,
      },
      costPerSqm: {
        amount: financial.cost_per_sqm_amount,
        currency: financial.cost_per_sqm_currency,
      },
      baseLotCost: {
        amount: financial.base_lot_cost_amount,
        currency: financial.base_lot_cost_currency,
      },
      pricingScenarios: pricingScenarios.map((scenario) => ({
        id: scenario.id,
        profitMarginPercent: scenario.profit_margin_percent,
        lotSalePrice: {
          amount: scenario.lot_sale_price_amount,
          currency: scenario.lot_sale_price_currency,
        },
        totalRevenue: {
          amount: scenario.total_revenue_amount,
          currency: scenario.total_revenue_currency,
        },
        expectedProfit: {
          amount: scenario.expected_profit_amount,
          currency: scenario.expected_profit_currency,
        },
        roi: scenario.roi,
      })),
      monthlyMaintenanceCost: financial.monthly_maintenance_amount
        ? {
            amount: financial.monthly_maintenance_amount,
            currency: financial.monthly_maintenance_currency,
          }
        : undefined,
      monthlyMaintenancePerOwner: financial.monthly_maintenance_per_owner_amount
        ? {
            amount: financial.monthly_maintenance_per_owner_amount,
            currency: financial.monthly_maintenance_per_owner_currency,
          }
        : undefined,
      exchangeRate: financial.exchange_rate_from
        ? {
            from: financial.exchange_rate_from,
            to: financial.exchange_rate_to,
            rate: financial.exchange_rate_value,
            effectiveDate: financial.exchange_rate_date,
          }
        : undefined,
      calculatedAt: new Date(financial.calculated_at),
      lastModified: new Date(financial.last_modified),
    };
  } catch (error: any) {
    console.error('Error loading financial analysis:', error);
    throw new Error(`Failed to load financial analysis: ${error.message}`);
  }
});

// ============================================================================
// Helper functions for AI integration
// ============================================================================

async function loadCompleteProject(db: any, projectId: string) {
  // Load project
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;

  if (!project) {
    return null;
  }

  // Load land parcel
  let landParcel = null;
  if (project.land_parcel_id) {
    const parcel = db
      .prepare('SELECT * FROM land_parcels WHERE id = ?')
      .get(project.land_parcel_id) as any;
    if (parcel) {
      // Load landmarks
      const landmarks = db
        .prepare('SELECT * FROM landmarks WHERE land_parcel_id = ?')
        .all(project.land_parcel_id) as any[];

      landParcel = {
        id: parcel.id,
        projectId: parcel.project_id,
        width: parcel.width_meters,
        length: parcel.length_meters,
        area: parcel.area_sqm,
        province: parcel.province,
        isUrbanized: parcel.is_urbanized === 1,
        acquisitionCost: {
          amount: parcel.acquisition_cost_amount,
          currency: parcel.acquisition_cost_currency,
        },
        displayUnit: parcel.display_unit,
        targetMicroVillas: parcel.target_microvillas_count,
        landmarks: landmarks.map((l: any) => ({
          type: l.type,
          name: l.name,
          distance: l.distance_km,
          description: l.description,
        })),
      };
    }
  }

  // Load subdivision scenarios
  const scenarios = db
    .prepare('SELECT * FROM subdivision_scenarios WHERE land_parcel_id = ?')
    .all(project.land_parcel_id) as any[];
  const subdivisionScenarios = scenarios.map((s: any) => ({
    id: s.id,
    socialClubPercent: s.social_club_percent,
    socialClub: {
      width: s.social_club_width,
      length: s.social_club_length,
      area: s.social_club_area,
      position: { x: s.social_club_pos_x, y: s.social_club_pos_y },
    },
    lots: {
      count: s.lot_count,
      width: s.lot_width,
      length: s.lot_length,
      area: s.lot_area,
      minArea: s.lot_min_area,
      grid: {
        rows: s.grid_rows,
        columns: s.grid_columns,
        distribution: s.grid_distribution,
      },
    },
    totalLotsArea: s.total_lots_area,
    commonAreaPercentPerLot: s.common_area_percent_per_lot,
    parkingSpaces: s.parking_spaces,
    isViable: s.is_viable === 1,
  }));

  // Load social club design
  let socialClubDesign = null;
  if (project.selected_scenario_id) {
    const design = db
      .prepare('SELECT * FROM social_club_designs WHERE project_id = ?')
      .get(projectId) as any;
    if (design) {
      const amenities = db
        .prepare('SELECT * FROM selected_amenities WHERE social_club_design_id = ?')
        .all(design.id) as any[];

      socialClubDesign = {
        id: design.id,
        projectId: design.project_id,
        scenarioId: design.scenario_id,
        storageType: design.storage_type,
        dedicatedStorageArea: design.dedicated_storage_area,
        maintenanceRoom: design.maintenance_room_size
          ? {
              size: design.maintenance_room_size,
              location: design.maintenance_room_location,
            }
          : undefined,
        selectedAmenities: amenities.map((a: any) => ({
          amenityId: a.amenity_id,
          category: a.category,
          name: a.name,
          quantity: a.quantity,
          unitCost: { amount: a.unit_cost_amount, currency: a.unit_cost_currency },
          totalCost: { amount: a.total_cost_amount, currency: a.total_cost_currency },
          spaceRequirement: a.space_requirement,
        })),
        totalCost: { amount: design.total_cost_amount, currency: design.total_cost_currency },
        totalArea: design.total_area,
      };
    }
  }

  // Load financial analysis
  let financialAnalysis = null;
  const financial = db
    .prepare('SELECT * FROM financial_analyses WHERE project_id = ?')
    .get(projectId) as any;
  if (financial) {
    const pricingScenarios = db
      .prepare('SELECT * FROM pricing_scenarios WHERE financial_analysis_id = ?')
      .all(financial.id) as any[];

    financialAnalysis = {
      id: financial.id,
      totalProjectCost: {
        amount: financial.total_project_cost_amount,
        currency: financial.total_project_cost_currency,
      },
      costPerSqm: {
        amount: financial.cost_per_sqm_amount,
        currency: financial.cost_per_sqm_currency,
      },
      pricingScenarios: pricingScenarios.map((ps: any) => ({
        profitMarginPercent: ps.profit_margin_percent,
      })),
    };
  }

  return {
    id: project.id,
    name: project.name,
    landParcel,
    subdivisionScenarios,
    selectedScenarioId: project.selected_scenario_id,
    socialClubDesign,
    financialAnalysis,
    targetDirectory: project.target_directory,
  };
}

function generateClaudeCodePromptData(projectData: any) {
  const {
    landParcel,
    subdivisionScenarios,
    selectedScenarioId,
    socialClubDesign,
    financialAnalysis,
  } = projectData;

  const selectedScenario = selectedScenarioId
    ? subdivisionScenarios.find((s: any) => s.id === selectedScenarioId)
    : null;

  const prompt: any = {
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
        minimumArea: landParcel.area * 0.1,
      },
      parking: {
        spacesPerVilla: 2,
        totalSpaces: selectedScenario ? selectedScenario.lots.count * 2 : 0,
        type: 'centralized',
      },
      storage: {
        type: socialClubDesign?.storageType || 'centralized',
        location:
          socialClubDesign?.storageType === 'centralized' ? 'social-club' : 'individual-patios',
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

  if (financialAnalysis) {
    prompt.financialContext = {
      totalProjectCost: financialAnalysis.totalProjectCost,
      costPerSqm: financialAnalysis.costPerSqm,
      targetProfitMargin: financialAnalysis.pricingScenarios?.[0]?.profitMarginPercent,
    };
  }

  return prompt;
}

function generateGoogleNanoPromptsData(projectData: any) {
  const { landParcel, subdivisionScenarios, selectedScenarioId, socialClubDesign } = projectData;

  const selectedScenario = selectedScenarioId
    ? subdivisionScenarios.find((s: any) => s.id === selectedScenarioId)
    : null;

  if (!selectedScenario) {
    throw new Error('No subdivision scenario selected');
  }

  const prompts: any = {
    version: '1.0.0',
    prompts: [],
  };

  // Overall layout prompt
  prompts.prompts.push({
    id: 'overall-layout',
    type: 'overall-layout',
    title: 'Micro Villas Community - Aerial View',
    description: `A modern Micro Villas residential community in ${landParcel.province}, Dominican Republic. The development features ${selectedScenario.lots.count} individual villa lots arranged in a ${selectedScenario.lots.grid.distribution} grid pattern, surrounding a centralized social club area. The property is ${landParcel.isUrbanized ? 'in an urbanized area' : 'in a developing area'}.`,
    technicalDetails: [
      `Total area: ${landParcel.area.toFixed(2)} square meters`,
      `Social club: ${selectedScenario.socialClub.area.toFixed(2)} sqm (${selectedScenario.socialClubPercent}% of total)`,
      `Individual lot size: ${selectedScenario.lots.area.toFixed(2)} sqm each`,
      `Grid layout: ${selectedScenario.lots.grid.rows} rows × ${selectedScenario.lots.grid.columns} columns`,
      `Centralized parking: ${selectedScenario.lots.count * 2} spaces`,
    ],
    visualElements: [
      "Aerial/bird's-eye view perspective",
      'Modern Caribbean residential architecture',
      'Lush tropical landscaping',
      'Clear lot boundaries and walkways',
      'Central social club with pool visible',
      'Organized parking area',
      'Well-maintained grounds',
    ],
  });

  // Individual lot prompt
  prompts.prompts.push({
    id: 'micro-villa-lot',
    type: 'micro-villa-lot',
    title: 'Individual Micro Villa Lot',
    description: `A single Micro Villa lot within the community, measuring ${selectedScenario.lots.width.toFixed(1)}m × ${selectedScenario.lots.length.toFixed(1)}m (${selectedScenario.lots.area.toFixed(2)} square meters). The lot features ${socialClubDesign?.storageType === 'individual-patios' ? 'an individual patio storage unit' : 'access to centralized storage'}.`,
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
      socialClubDesign?.storageType === 'individual-patios'
        ? 'Outdoor storage shed'
        : 'Clean lot perimeter',
      'Tropical landscaping elements',
      'Contemporary Dominican architectural style',
    ],
  });

  // Social club prompt (if amenities configured)
  if (socialClubDesign && socialClubDesign.selectedAmenities.length > 0) {
    const amenitiesList = socialClubDesign.selectedAmenities
      .map((a: any) => `${a.quantity}x ${a.name}`)
      .join(', ');

    prompts.prompts.push({
      id: 'social-club',
      type: 'social-club',
      title: 'Community Social Club & Amenities',
      description: `The centralized social club area occupying ${selectedScenario.socialClub.area.toFixed(2)} square meters (${selectedScenario.socialClubPercent}% of the community). Features include: ${amenitiesList}.`,
      technicalDetails: [
        `Social club area: ${selectedScenario.socialClub.area.toFixed(2)} sqm`,
        `Dimensions: ${selectedScenario.socialClub.width.toFixed(2)}m × ${selectedScenario.socialClub.length.toFixed(2)}m`,
        `Total amenities: ${socialClubDesign.selectedAmenities.length}`,
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

  // Parking area prompt
  prompts.prompts.push({
    id: 'parking-area',
    type: 'parking-area',
    title: 'Centralized Parking Area',
    description: `A well-organized centralized parking facility providing ${selectedScenario.lots.count * 2} spaces (2 spaces per villa) for the ${selectedScenario.lots.count} Micro Villa lots. The parking area features clear demarcation, lighting, and landscaping integration.`,
    technicalDetails: [
      `Total spaces: ${selectedScenario.lots.count * 2}`,
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

  // Land parcel context prompt
  const landmarks =
    landParcel.landmarks && landParcel.landmarks.length > 0
      ? landParcel.landmarks
          .map(
            (l: any) =>
              `${l.name} (${l.type}${l.distance ? `, ${l.distance.toFixed(1)}km away` : ''})`
          )
          .join(', ')
      : 'No specific landmarks recorded';

  prompts.prompts.push({
    id: 'land-parcel',
    type: 'land-parcel',
    title: 'Land Parcel Location & Context',
    description: `The property is located in ${landParcel.province}, Dominican Republic. ${landParcel.isUrbanized ? 'The area is urbanized with existing infrastructure.' : 'The area is in a developing zone with growing infrastructure.'} Nearby landmarks: ${landmarks}.`,
    technicalDetails: [
      `Province: ${landParcel.province}`,
      `Total area: ${landParcel.area.toFixed(2)} sqm`,
      `Dimensions: ${landParcel.width.toFixed(2)}m × ${landParcel.length.toFixed(2)}m`,
      `Urbanization status: ${landParcel.isUrbanized ? 'Urbanized' : 'Developing'}`,
      `Nearby landmarks: ${landParcel.landmarks?.length || 0}`,
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

function formatPromptsAsText(prompts: any): string {
  let text = `AI Image Generation Prompts for Google Nano Banana Pro\n`;
  text += `Version: ${prompts.version}\n`;
  text += `Generated: ${new Date().toISOString()}\n`;
  text += `\n${'='.repeat(80)}\n\n`;

  for (const prompt of prompts.prompts) {
    text += `### ${prompt.title} ###\n\n`;
    text += `Type: ${prompt.type}\n`;
    text += `ID: ${prompt.id}\n\n`;
    text += `Description:\n${prompt.description}\n\n`;

    text += `Technical Details:\n`;
    for (const detail of prompt.technicalDetails) {
      text += `  - ${detail}\n`;
    }
    text += `\n`;

    text += `Visual Elements:\n`;
    for (const element of prompt.visualElements) {
      text += `  - ${element}\n`;
    }

    text += `\n${'='.repeat(80)}\n\n`;
  }

  return text;
}

// Image operations (T145-T149)
ipcMain.handle('dialog:selectImages', async (event) => {
  console.log('IPC: dialog:selectImages called');

  try {
    const result = await dialog.showOpenDialog({
      title: 'Select Images',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    });

    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  } catch (error: any) {
    console.error('Error selecting images:', error);
    throw new Error(`Failed to select images: ${error.message}`);
  }
});

ipcMain.handle(
  'images:attachToLand',
  async (
    event,
    data: {
      projectId: string;
      filePaths: string[];
      captions?: string[];
    }
  ) => {
    console.log('IPC: images:attachToLand called with data:', data);

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const sharp = await import('sharp');
      const db = getDatabase();

      // Create images directory for this project
      const projectImagesDir = path.join(process.cwd(), 'project-data', 'images', data.projectId);
      await fs.mkdir(projectImagesDir, { recursive: true });

      const results = [];

      for (let i = 0; i < data.filePaths.length; i++) {
        const filePath = data.filePaths[i];
        const caption = data.captions?.[i];

        // Validate file size (10 MB max - FR-077)
        const stats = await fs.stat(filePath);
        if (stats.size > 10 * 1024 * 1024) {
          results.push({
            success: false,
            error: `File ${path.basename(filePath)} exceeds 10 MB limit`,
            filePath,
          });
          continue;
        }

        // Get image metadata
        const imageBuffer = await fs.readFile(filePath);
        const metadata = await sharp(imageBuffer).metadata();

        // Validate format (FR-076)
        const allowedFormats = ['jpeg', 'png', 'webp'];
        if (!metadata.format || !allowedFormats.includes(metadata.format)) {
          results.push({
            success: false,
            error: `Unsupported format: ${metadata.format}`,
            filePath,
          });
          continue;
        }

        // Generate unique filename
        const imageId = crypto.randomUUID();
        const ext = path.extname(filePath);
        const filename = path.basename(filePath);
        const newFilename = `${imageId}${ext}`;
        const newPath = path.join(projectImagesDir, newFilename);

        // Copy file to project directory
        await fs.copyFile(filePath, newPath);

        // Generate thumbnail (200x200 max - FR-074)
        const thumbnailFilename = `${imageId}_thumb${ext}`;
        const thumbnailPath = path.join(projectImagesDir, thumbnailFilename);
        await sharp(imageBuffer).resize(200, 200, { fit: 'inside' }).toFile(thumbnailPath);

        // Insert into database
        const stmt = db.prepare(`
        INSERT INTO project_images (
          id, project_id, associated_with, lot_id, filename, format,
          size_bytes, width_pixels, height_pixels, local_path,
          thumbnail_path, uploaded_at, caption
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

        stmt.run(
          imageId,
          data.projectId,
          'land-parcel',
          null,
          filename,
          metadata.format,
          stats.size,
          metadata.width || 0,
          metadata.height || 0,
          newPath,
          thumbnailPath,
          new Date().toISOString(),
          caption || null
        );

        results.push({
          success: true,
          imageId,
          filePath,
          image: {
            id: imageId,
            projectId: data.projectId,
            associatedWith: 'land-parcel',
            filename,
            format: metadata.format,
            size: stats.size,
            width: metadata.width || 0,
            height: metadata.height || 0,
            localPath: newPath,
            thumbnailPath,
            uploadedAt: new Date().toISOString(),
            caption,
          },
        });
      }

      return {
        success: results.every((r) => r.success),
        results,
      };
    } catch (error: any) {
      console.error('Error attaching images to land:', error);
      throw new Error(`Failed to attach images: ${error.message}`);
    }
  }
);

ipcMain.handle(
  'images:attachToLot',
  async (
    event,
    data: {
      projectId: string;
      lotId: string;
      filePaths: string[];
      captions?: string[];
    }
  ) => {
    console.log('IPC: images:attachToLot called with data:', data);

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const sharp = await import('sharp');
      const db = getDatabase();

      // Create images directory for this project
      const projectImagesDir = path.join(process.cwd(), 'project-data', 'images', data.projectId);
      await fs.mkdir(projectImagesDir, { recursive: true });

      const results = [];

      for (let i = 0; i < data.filePaths.length; i++) {
        const filePath = data.filePaths[i];
        const caption = data.captions?.[i];

        // Validate file size (10 MB max - FR-077)
        const stats = await fs.stat(filePath);
        if (stats.size > 10 * 1024 * 1024) {
          results.push({
            success: false,
            error: `File ${path.basename(filePath)} exceeds 10 MB limit`,
            filePath,
          });
          continue;
        }

        // Get image metadata
        const imageBuffer = await fs.readFile(filePath);
        const metadata = await sharp(imageBuffer).metadata();

        // Validate format (FR-076)
        const allowedFormats = ['jpeg', 'png', 'webp'];
        if (!metadata.format || !allowedFormats.includes(metadata.format)) {
          results.push({
            success: false,
            error: `Unsupported format: ${metadata.format}`,
            filePath,
          });
          continue;
        }

        // Generate unique filename
        const imageId = crypto.randomUUID();
        const ext = path.extname(filePath);
        const filename = path.basename(filePath);
        const newFilename = `${imageId}${ext}`;
        const newPath = path.join(projectImagesDir, newFilename);

        // Copy file to project directory
        await fs.copyFile(filePath, newPath);

        // Generate thumbnail (200x200 max - FR-074)
        const thumbnailFilename = `${imageId}_thumb${ext}`;
        const thumbnailPath = path.join(projectImagesDir, thumbnailFilename);
        await sharp(imageBuffer).resize(200, 200, { fit: 'inside' }).toFile(thumbnailPath);

        // Insert into database
        const stmt = db.prepare(`
        INSERT INTO project_images (
          id, project_id, associated_with, lot_id, filename, format,
          size_bytes, width_pixels, height_pixels, local_path,
          thumbnail_path, uploaded_at, caption
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

        stmt.run(
          imageId,
          data.projectId,
          'lot',
          data.lotId,
          filename,
          metadata.format,
          stats.size,
          metadata.width || 0,
          metadata.height || 0,
          newPath,
          thumbnailPath,
          new Date().toISOString(),
          caption || null
        );

        results.push({
          success: true,
          imageId,
          filePath,
          image: {
            id: imageId,
            projectId: data.projectId,
            associatedWith: 'lot',
            lotId: data.lotId,
            filename,
            format: metadata.format,
            size: stats.size,
            width: metadata.width || 0,
            height: metadata.height || 0,
            localPath: newPath,
            thumbnailPath,
            uploadedAt: new Date().toISOString(),
            caption,
          },
        });
      }

      return {
        success: results.every((r) => r.success),
        results,
      };
    } catch (error: any) {
      console.error('Error attaching images to lot:', error);
      throw new Error(`Failed to attach images: ${error.message}`);
    }
  }
);

ipcMain.handle('images:getThumbnail', async (event, imageId: string) => {
  console.log('IPC: images:getThumbnail called with imageId:', imageId);

  try {
    const fs = await import('fs/promises');
    const db = getDatabase();

    // Get image from database
    const stmt = db.prepare(`
      SELECT thumbnail_path FROM project_images WHERE id = ?
    `);
    const image = stmt.get(imageId) as any;

    if (!image || !image.thumbnail_path) {
      throw new Error(`Thumbnail not found for image ${imageId}`);
    }

    // Read thumbnail file and convert to Base64 data URL
    const thumbnailBuffer = await fs.readFile(image.thumbnail_path);
    const base64 = thumbnailBuffer.toString('base64');
    const ext = image.thumbnail_path.split('.').pop()?.toLowerCase();

    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';

    const dataUrl = `data:${mimeType};base64,${base64}`;

    return {
      success: true,
      dataUrl,
    };
  } catch (error: any) {
    console.error('Error getting thumbnail:', error);
    throw new Error(`Failed to get thumbnail: ${error.message}`);
  }
});

ipcMain.handle(
  'images:importAIGenerated',
  async (
    event,
    data: {
      projectId: string;
      targetDirectory: string;
    }
  ) => {
    console.log('IPC: images:importAIGenerated called with data:', data);

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const sharp = await import('sharp');
      const db = getDatabase();

      // Check if target directory exists
      const imagesDir = path.join(data.targetDirectory, 'images');
      try {
        await fs.access(imagesDir);
      } catch {
        return {
          success: true,
          importedCount: 0,
          skippedCount: 0,
          message: 'No AI-generated images found (images/ directory does not exist)',
        };
      }

      // List all image files in the directory
      const files = await fs.readdir(imagesDir);
      const imageFiles = files.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      });

      const results = [];
      let importedCount = 0;
      let skippedCount = 0;

      // Create project images directory
      const projectImagesDir = path.join(process.cwd(), 'project-data', 'images', data.projectId);
      await fs.mkdir(projectImagesDir, { recursive: true });

      for (const file of imageFiles) {
        const filePath = path.join(imagesDir, file);

        try {
          // Validate file size (10 MB max - FR-077)
          const stats = await fs.stat(filePath);
          if (stats.size > 10 * 1024 * 1024) {
            skippedCount++;
            results.push({
              success: false,
              error: `File ${file} exceeds 10 MB limit`,
              filePath,
            });
            continue;
          }

          // Get image metadata
          const imageBuffer = await fs.readFile(filePath);
          const metadata = await sharp(imageBuffer).metadata();

          // Validate format (FR-076)
          const allowedFormats = ['jpeg', 'png', 'webp'];
          if (!metadata.format || !allowedFormats.includes(metadata.format)) {
            skippedCount++;
            results.push({
              success: false,
              error: `Unsupported format: ${metadata.format}`,
              filePath,
            });
            continue;
          }

          // Generate unique filename
          const imageId = crypto.randomUUID();
          const ext = path.extname(file);
          const newFilename = `${imageId}${ext}`;
          const newPath = path.join(projectImagesDir, newFilename);

          // Copy file to project directory
          await fs.copyFile(filePath, newPath);

          // Generate thumbnail (200x200 max - FR-074)
          const thumbnailFilename = `${imageId}_thumb${ext}`;
          const thumbnailPath = path.join(projectImagesDir, thumbnailFilename);
          await sharp(imageBuffer).resize(200, 200, { fit: 'inside' }).toFile(thumbnailPath);

          // Determine association based on filename pattern
          // Files starting with "lot-" are associated with lots
          // Others are associated with land parcel
          let associatedWith = 'land-parcel';
          let lotId = null;

          const lotMatch = file.match(/^lot-(\d+)/i);
          if (lotMatch) {
            associatedWith = 'lot';
            // We'd need to look up the lot by number - for now, just mark as land-parcel
            // TODO: Enhance this to properly associate with lots by number
          }

          // Insert into database
          const stmt = db.prepare(`
          INSERT INTO project_images (
            id, project_id, associated_with, lot_id, filename, format,
            size_bytes, width_pixels, height_pixels, local_path,
            thumbnail_path, uploaded_at, caption
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

          stmt.run(
            imageId,
            data.projectId,
            associatedWith,
            lotId,
            file,
            metadata.format,
            stats.size,
            metadata.width || 0,
            metadata.height || 0,
            newPath,
            thumbnailPath,
            new Date().toISOString(),
            'AI-generated image'
          );

          importedCount++;
          results.push({
            success: true,
            imageId,
            filePath,
          });
        } catch (error: any) {
          skippedCount++;
          results.push({
            success: false,
            error: error.message,
            filePath,
          });
        }
      }

      return {
        success: true,
        importedCount,
        skippedCount,
        totalFiles: imageFiles.length,
        results,
      };
    } catch (error: any) {
      console.error('Error importing AI-generated images:', error);
      throw new Error(`Failed to import AI-generated images: ${error.message}`);
    }
  }
);

ipcMain.handle('images:getByProject', async (event, projectId: string) => {
  console.log('IPC: images:getByProject called with projectId:', projectId);

  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, project_id, associated_with, lot_id, filename, format,
             size_bytes, width_pixels, height_pixels, local_path,
             thumbnail_path, uploaded_at, caption
      FROM project_images
      WHERE project_id = ?
      ORDER BY uploaded_at DESC
    `);

    const images = stmt.all(projectId) as any[];

    return images.map((img: any) => ({
      id: img.id,
      projectId: img.project_id,
      associatedWith: img.associated_with,
      lotId: img.lot_id,
      filename: img.filename,
      format: img.format,
      size: img.size_bytes,
      width: img.width_pixels,
      height: img.height_pixels,
      localPath: img.local_path,
      thumbnailPath: img.thumbnail_path,
      uploadedAt: img.uploaded_at,
      caption: img.caption,
    }));
  } catch (error: any) {
    console.error('Error getting images by project:', error);
    throw new Error(`Failed to get images: ${error.message}`);
  }
});

// ============================================================================
// Export/Import Operations (Phase 9 - User Story 7)
// ============================================================================

/**
 * T163: Select directory for project export
 * Opens native directory picker dialog
 */
ipcMain.handle('dialog:selectExportDir', async () => {
  console.log('IPC: dialog:selectExportDir called');

  try {
    const result = await dialog.showOpenDialog({
      title: 'Select Export Directory',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Select Export Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, path: null, canceled: true };
    }

    const selectedPath = result.filePaths[0];
    console.log('Export directory selected:', selectedPath);

    return {
      success: true,
      path: selectedPath,
      canceled: false,
    };
  } catch (error: any) {
    console.error('Error selecting export directory:', error);
    throw new Error(`Failed to select export directory: ${error.message}`);
  }
});

/**
 * T164-T171: Export complete project to disk
 * Creates directory structure:
 * - project.json (all data)
 * - images/ (all uploaded and AI-generated images)
 * - ai-prompts/ (if AI prompts exist)
 */
ipcMain.handle(
  'export:project',
  async (event, input: { projectId: string; targetDirectory: string }) => {
    console.log('IPC: export:project called with:', input);

    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');

    try {
      const db = getDatabase();
      const { projectId, targetDirectory } = input;

      // T168: Validate export directory writability
      try {
        fs.accessSync(targetDirectory, fs.constants.W_OK);
      } catch {
        throw new Error('Export directory is not writeable. Please select a different location.');
      }

      // Create export directory structure
      const exportPath = path.join(targetDirectory, `microvillas-export-${Date.now()}`);
      const imagesDir = path.join(exportPath, 'images');
      const aiPromptsDir = path.join(exportPath, 'ai-prompts');

      fs.mkdirSync(exportPath, { recursive: true });
      fs.mkdirSync(imagesDir, { recursive: true });

      // T165: Load complete project data for export
      const project = await loadCompleteProjectData(db, projectId);

      // T166: Copy images to images/ subfolder
      const exportedImages: string[] = [];
      if (project.images && project.images.length > 0) {
        for (const image of project.images) {
          const sourcePath = image.localPath;
          const destPath = path.join(imagesDir, image.filename);

          try {
            if (fs.existsSync(sourcePath)) {
              fs.copyFileSync(sourcePath, destPath);
              exportedImages.push(destPath);
              console.log(`Copied image: ${image.filename}`);
            } else {
              console.warn(`Image file not found: ${sourcePath}`);
            }
          } catch (copyError: any) {
            console.error(`Failed to copy image ${image.filename}:`, copyError.message);
          }
        }
      }

      // T167: Copy AI prompts if they exist
      const aiPromptFiles: string[] = [];
      const aiSubdivisionPromptPath = path.join(targetDirectory, 'ai-subdivision-prompt.json');
      const aiImagePromptsPath = path.join(targetDirectory, 'ai-image-prompts.txt');

      if (fs.existsSync(aiSubdivisionPromptPath) || fs.existsSync(aiImagePromptsPath)) {
        fs.mkdirSync(aiPromptsDir, { recursive: true });

        if (fs.existsSync(aiSubdivisionPromptPath)) {
          const destPath = path.join(aiPromptsDir, 'ai-subdivision-prompt.json');
          fs.copyFileSync(aiSubdivisionPromptPath, destPath);
          aiPromptFiles.push(destPath);
        }

        if (fs.existsSync(aiImagePromptsPath)) {
          const destPath = path.join(aiPromptsDir, 'ai-image-prompts.txt');
          fs.copyFileSync(aiImagePromptsPath, destPath);
          aiPromptFiles.push(destPath);
        }
      }

      // Build export schema
      const exportSchema = buildExportSchema(project);

      // T169: Generate checksum for project.json
      const projectJsonString = JSON.stringify(exportSchema, null, 2);
      const checksum = crypto.createHash('sha256').update(projectJsonString).digest('hex');

      // Add checksum to metadata
      exportSchema.metadata.checksum = checksum;
      exportSchema.metadata.fileCount = 1 + exportedImages.length + aiPromptFiles.length;

      // Calculate total size
      let totalSize = Buffer.byteLength(projectJsonString, 'utf8');
      exportedImages.forEach((imgPath) => {
        try {
          totalSize += fs.statSync(imgPath).size;
        } catch {}
      });
      aiPromptFiles.forEach((promptPath) => {
        try {
          totalSize += fs.statSync(promptPath).size;
        } catch {}
      });
      exportSchema.metadata.totalSize = totalSize;

      // Write project.json
      const projectJsonPath = path.join(exportPath, 'project.json');
      fs.writeFileSync(projectJsonPath, JSON.stringify(exportSchema, null, 2), 'utf8');

      // Write README.txt
      const readme = generateExportReadme(project, exportSchema);
      fs.writeFileSync(path.join(exportPath, 'README.txt'), readme, 'utf8');

      // T170: Store project target directory path in database
      db.prepare(
        `
      UPDATE projects
      SET target_directory = ?, modified = ?
      WHERE id = ?
    `
      ).run(exportPath, new Date().toISOString(), projectId);

      // T207: Add to recent projects list
      const { addRecentProject } = await import('./settings-store');
      addRecentProject(exportPath);

      // T171: Return success result with file paths
      return {
        success: true,
        exportPath,
        files: {
          projectJson: projectJsonPath,
          images: exportedImages,
          aiPrompts: aiPromptFiles.length > 0 ? aiPromptFiles : undefined,
        },
        metadata: {
          exportDate: new Date(),
          fileCount: exportSchema.metadata.fileCount,
          totalSize: exportSchema.metadata.totalSize,
          checksum,
        },
      };
    } catch (error: any) {
      console.error('Error exporting project:', error);
      return {
        success: false,
        exportPath: '',
        files: { projectJson: '', images: [] },
        metadata: { exportDate: new Date(), fileCount: 0, totalSize: 0, checksum: '' },
        errors: [error.message],
      };
    }
  }
);

/**
 * Helper: Load complete project data including all related entities
 */
function loadCompleteProjectData(db: any, projectId: string) {
  // Load project
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Load land parcel
  const landParcel = db.prepare('SELECT * FROM land_parcels WHERE project_id = ?').get(projectId);

  // Load landmarks
  const landmarks = landParcel
    ? db.prepare('SELECT * FROM landmarks WHERE land_parcel_id = ?').all(landParcel.id)
    : [];

  // Load subdivision scenarios
  const scenarios = landParcel
    ? db.prepare('SELECT * FROM subdivision_scenarios WHERE land_parcel_id = ?').all(landParcel.id)
    : [];

  // Load social club design
  const socialClubDesign = db
    .prepare('SELECT * FROM social_club_designs WHERE project_id = ?')
    .get(projectId);
  const selectedAmenities = socialClubDesign
    ? db
        .prepare('SELECT * FROM selected_amenities WHERE social_club_design_id = ?')
        .all(socialClubDesign.id)
    : [];

  // Load financial analysis
  const financialAnalysis = db
    .prepare('SELECT * FROM financial_analyses WHERE project_id = ?')
    .get(projectId);
  const pricingScenarios = financialAnalysis
    ? db
        .prepare('SELECT * FROM pricing_scenarios WHERE financial_analysis_id = ?')
        .all(financialAnalysis.id)
    : [];
  const otherCosts = financialAnalysis
    ? db
        .prepare('SELECT * FROM other_costs WHERE financial_analysis_id = ?')
        .all(financialAnalysis.id)
    : [];

  // Load images
  const images = db.prepare('SELECT * FROM project_images WHERE project_id = ?').all(projectId);

  return {
    project,
    landParcel,
    landmarks,
    scenarios,
    socialClubDesign,
    selectedAmenities,
    financialAnalysis,
    pricingScenarios,
    otherCosts,
    images,
  };
}

/**
 * Helper: Build export schema from database entities
 */
function buildExportSchema(data: any): any {
  const {
    project,
    landParcel,
    landmarks,
    scenarios,
    socialClubDesign,
    selectedAmenities,
    financialAnalysis,
    pricingScenarios,
    otherCosts,
    images,
  } = data;

  return {
    schemaVersion: '1.0.0',
    exportDate: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      created: project.created,
      modified: project.modified,
      status: project.status,
      notes: project.notes,
      targetDirectory: project.target_directory,

      landParcel: landParcel
        ? {
            id: landParcel.id,
            width: landParcel.width_meters,
            length: landParcel.length_meters,
            area: landParcel.area_sqm,
            province: landParcel.province,
            landmarks: landmarks.map((l: any) => ({
              type: l.type,
              name: l.name,
              distance: l.distance_km,
              description: l.description,
            })),
            isUrbanized: Boolean(landParcel.is_urbanized),
            acquisitionCost: {
              amount: landParcel.acquisition_cost_amount,
              currency: landParcel.acquisition_cost_currency,
            },
            displayUnit: landParcel.display_unit,
          }
        : null,

      subdivisionScenarios: scenarios.map((s: any) => ({
        id: s.id,
        socialClubPercent: s.social_club_percent,
        socialClub: {
          width: s.social_club_width,
          length: s.social_club_length,
          area: s.social_club_area,
          position: { x: s.social_club_pos_x, y: s.social_club_pos_y },
        },
        parkingArea: {
          totalSpaces: s.lot_count * 2,
          spacesPerVilla: 2,
          location: 'centralized',
          estimatedArea: s.lot_count * 2 * 12.5,
        },
        maintenanceRoom: {
          area: s.maintenance_room_area || 0,
          location: s.maintenance_room_location || 'social-club',
          position: s.maintenance_room_pos_x
            ? { x: s.maintenance_room_pos_x, y: s.maintenance_room_pos_y }
            : undefined,
        },
        lots: {
          count: s.lot_count,
          width: s.lot_width,
          length: s.lot_length,
          area: s.lot_area,
          minArea: s.lot_min_area,
          grid: {
            rows: s.grid_rows,
            columns: s.grid_columns,
            distribution: s.grid_distribution,
          },
        },
        totalLotsArea: s.total_lots_area,
        commonAreaPercentPerLot: s.common_area_percent_per_lot,
        isViable: Boolean(s.is_viable),
        calculatedAt: s.calculated_at,
      })),

      selectedScenarioId: project.selected_scenario_id,

      socialClubDesign: socialClubDesign
        ? {
            id: socialClubDesign.id,
            scenarioId: socialClubDesign.scenario_id,
            selectedAmenities: selectedAmenities.map((a: any) => ({
              amenityId: a.amenity_id,
              category: a.category,
              name: a.name,
              quantity: a.quantity,
              unitCost: { amount: a.unit_cost_amount, currency: a.unit_cost_currency },
              totalCost: { amount: a.total_cost_amount, currency: a.total_cost_currency },
              spaceRequirement: a.space_requirement,
            })),
            storageType: socialClubDesign.storage_type,
            storageArea: socialClubDesign.dedicated_storage_area,
            totalCost: {
              amount: socialClubDesign.total_cost_amount,
              currency: socialClubDesign.total_cost_currency,
            },
            totalArea: socialClubDesign.total_area,
          }
        : undefined,

      financialAnalysis: financialAnalysis
        ? {
            id: financialAnalysis.id,
            costs: {
              landAcquisition: {
                amount: financialAnalysis.land_acquisition_amount,
                currency: financialAnalysis.land_acquisition_currency,
              },
              amenities: {
                amount: financialAnalysis.amenities_amount,
                currency: financialAnalysis.amenities_currency,
              },
              parkingArea: {
                amount: financialAnalysis.parking_area_amount || 0,
                currency: financialAnalysis.parking_area_currency || 'USD',
              },
              walkways: {
                amount: financialAnalysis.walkways_amount || 0,
                currency: financialAnalysis.walkways_currency || 'USD',
              },
              landscaping: {
                amount: financialAnalysis.landscaping_amount || 0,
                currency: financialAnalysis.landscaping_currency || 'USD',
              },
              maintenanceRoom: {
                amount: financialAnalysis.maintenance_room_amount || 0,
                currency: financialAnalysis.maintenance_room_currency || 'USD',
              },
              storage: {
                amount: financialAnalysis.storage_amount || 0,
                currency: financialAnalysis.storage_currency || 'USD',
              },
              legal: {
                notaryFees: {
                  amount: financialAnalysis.legal_notary_amount,
                  currency: financialAnalysis.legal_notary_currency,
                },
                permits: {
                  amount: financialAnalysis.legal_permits_amount,
                  currency: financialAnalysis.legal_permits_currency,
                },
                registrations: {
                  amount: financialAnalysis.legal_registrations_amount,
                  currency: financialAnalysis.legal_registrations_currency,
                },
                total: {
                  amount:
                    financialAnalysis.legal_notary_amount +
                    financialAnalysis.legal_permits_amount +
                    financialAnalysis.legal_registrations_amount,
                  currency: financialAnalysis.legal_notary_currency,
                },
              },
              other: otherCosts.map((c: any) => ({
                id: c.id,
                label: c.label,
                amount: { amount: c.amount, currency: c.currency },
                description: c.description,
              })),
            },
            totalProjectCost: {
              amount: financialAnalysis.total_project_cost_amount,
              currency: financialAnalysis.total_project_cost_currency,
            },
            costPerSqm: {
              amount: financialAnalysis.cost_per_sqm_amount,
              currency: financialAnalysis.cost_per_sqm_currency,
            },
            costPerSqmSharedAreas: {
              amount: financialAnalysis.cost_per_sqm_shared_areas_amount || 0,
              currency: financialAnalysis.cost_per_sqm_shared_areas_currency || 'USD',
            },
            baseLotCost: {
              amount: financialAnalysis.base_lot_cost_amount,
              currency: financialAnalysis.base_lot_cost_currency,
            },
            pricingScenarios: pricingScenarios.map((p: any) => ({
              id: p.id,
              profitMarginPercent: p.profit_margin_percent,
              lotSalePrice: {
                amount: p.lot_sale_price_amount,
                currency: p.lot_sale_price_currency,
              },
              totalRevenue: { amount: p.total_revenue_amount, currency: p.total_revenue_currency },
              expectedProfit: {
                amount: p.expected_profit_amount,
                currency: p.expected_profit_currency,
              },
              roi: p.roi,
            })),
            monthlyMaintenanceCost: financialAnalysis.monthly_maintenance_amount
              ? {
                  amount: financialAnalysis.monthly_maintenance_amount,
                  currency: financialAnalysis.monthly_maintenance_currency,
                }
              : undefined,
            monthlyMaintenancePerOwner: financialAnalysis.monthly_maintenance_per_owner_amount
              ? {
                  amount: financialAnalysis.monthly_maintenance_per_owner_amount,
                  currency: financialAnalysis.monthly_maintenance_per_owner_currency,
                }
              : undefined,
            exchangeRate: financialAnalysis.exchange_rate_from
              ? {
                  from: financialAnalysis.exchange_rate_from,
                  to: financialAnalysis.exchange_rate_to,
                  rate: financialAnalysis.exchange_rate_value,
                  effectiveDate: financialAnalysis.exchange_rate_date,
                }
              : undefined,
            calculatedAt: financialAnalysis.calculated_at,
            lastModified: financialAnalysis.last_modified,
          }
        : undefined,

      images: images.map((img: any) => ({
        id: img.id,
        associatedWith: img.associated_with,
        lotId: img.lot_id,
        filename: img.filename,
        format: img.format,
        size: img.size_bytes,
        width: img.width_pixels,
        height: img.height_pixels,
        relativePathInExport: `images/${img.filename}`,
        uploadedAt: img.uploaded_at,
        caption: img.caption,
      })),
    },
    metadata: {
      exportedBy: 'MicroVillas Platform v1.0.0',
      checksum: '', // Will be filled after JSON generation
      fileCount: 0, // Will be filled after counting files
      totalSize: 0, // Will be filled after calculating
    },
  };
}

/**
 * Helper: Generate human-readable README for export
 */
function generateExportReadme(data: any, schema: any): string {
  const { project, landParcel, scenarios } = data;

  return `Micro Villas Investment Platform - Project Export
================================================================================

Project: ${project.name}
Exported: ${new Date().toLocaleString()}
Schema Version: 1.0.0

CONTENTS:
---------
- project.json: Complete project data (land, subdivision, amenities, financials)
- images/: All uploaded and AI-generated images
- ai-prompts/: AI integration prompts (if generated)
- README.txt: This file

PROJECT SUMMARY:
----------------
Land Parcel: ${landParcel ? `${landParcel.width_meters}m × ${landParcel.length_meters}m (${landParcel.area_sqm} sqm)` : 'Not configured'}
Location: ${landParcel ? landParcel.province : 'Not specified'}
Subdivision Scenarios: ${scenarios.length} scenarios calculated
Selected Scenario: ${project.selected_scenario_id ? 'Yes' : 'No'}

DATA INTEGRITY:
---------------
Checksum (SHA-256): ${schema.metadata.checksum}
Total Files: ${schema.metadata.fileCount}
Total Size: ${(schema.metadata.totalSize / 1024 / 1024).toFixed(2)} MB

USAGE:
------
1. To import this project, use the "Import Project" feature in the application
2. Select this directory when prompted
3. All data and images will be restored with 100% fidelity

For questions or support, visit: https://github.com/microvillas

Generated by MicroVillas Platform v1.0.0
`;
}

// ============================================================================
// IMPORT OPERATIONS
// ============================================================================

/**
 * Select import directory using native dialog
 * Per FR-085
 */
ipcMain.handle('dialog:selectImportDir', async (event) => {
  console.log('IPC: dialog:selectImportDir called');

  try {
    const result = await dialog.showOpenDialog({
      title: 'Select Project Directory to Import',
      properties: ['openDirectory'],
      message: 'Choose the directory containing the exported project',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, path: null, message: 'Import canceled' };
    }

    const importPath = result.filePaths[0];
    console.log('Import directory selected:', importPath);

    return {
      success: true,
      path: importPath,
      message: 'Directory selected successfully',
    };
  } catch (error: any) {
    console.error('Error selecting import directory:', error);
    return {
      success: false,
      path: null,
      message: `Failed to select directory: ${error.message}`,
    };
  }
});

/**
 * Import project from directory
 * Per FR-086, FR-087, FR-088, FR-089, FR-090, FR-091, FR-092, FR-093, FR-094
 */
ipcMain.handle('import:project', async (event, importPath: string, options: any = {}) => {
  console.log('IPC: import:project called with path:', importPath);
  const startTime = Date.now();

  try {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');

    // Default options
    const {
      enablePartialRecovery = true,
      validateChecksum = true,
      importImages = true,
      overwriteExisting = false,
    } = options;

    const errors: any[] = [];
    const warnings: any[] = [];
    const missingImages: string[] = [];
    const missingAIPrompts: string[] = [];

    // Step 1: Validate directory structure (T183)
    const projectJsonPath = path.join(importPath, 'project.json');
    const imagesDir = path.join(importPath, 'images');
    const aiPromptsDir = path.join(importPath, 'ai-prompts');

    if (!fs.existsSync(projectJsonPath)) {
      throw new Error('project.json not found in selected directory');
    }

    const structureValid = fs.existsSync(projectJsonPath);
    const imagesDirExists = fs.existsSync(imagesDir);
    const aiPromptsDirExists = fs.existsSync(aiPromptsDir);

    // Step 2: Load and parse project.json (T184)
    const projectJsonContent = fs.readFileSync(projectJsonPath, 'utf-8');
    let exportData: any;

    try {
      exportData = JSON.parse(projectJsonContent);
    } catch (parseError: any) {
      throw new Error(`Invalid JSON format: ${parseError.message}`);
    }

    // Step 3: Validate checksum (T185)
    let checksumValid = true;
    if (validateChecksum && exportData.metadata && exportData.metadata.checksum) {
      const { metadata, ...dataWithoutMetadata } = exportData;
      const calculatedChecksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(dataWithoutMetadata, null, 0))
        .digest('hex');

      checksumValid = calculatedChecksum === metadata.checksum;

      if (!checksumValid) {
        warnings.push({
          field: 'checksum',
          message: 'Checksum mismatch - data may have been modified',
          suggestion: 'Verify file integrity before proceeding',
        });
      }
    }

    // Step 4: Validate schema and detect corrupted fields (T188)
    const projectData = exportData.project;
    const validationErrors: any[] = [];
    let schemaValid = true;

    // Basic schema validation
    if (!projectData) {
      throw new Error('Project data not found in export file');
    }

    // Validate required fields
    const requiredFields = ['id', 'name', 'created', 'modified', 'version'];
    for (const field of requiredFields) {
      if (!projectData[field]) {
        validationErrors.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: 'critical',
        });
        schemaValid = false;
      }
    }

    // Step 5: Partial recovery if enabled (T189)
    let recoveredData = projectData;
    let skippedFields: string[] = [];

    if (!schemaValid && enablePartialRecovery) {
      // Attempt to recover valid fields
      const validatedProject: any = {};

      // Copy valid basic fields
      if (projectData.id) validatedProject.id = projectData.id;
      if (projectData.name) validatedProject.name = projectData.name;
      if (projectData.created) validatedProject.created = projectData.created;
      if (projectData.modified) validatedProject.modified = projectData.modified;
      if (projectData.version) validatedProject.version = projectData.version;
      if (projectData.status) validatedProject.status = projectData.status;

      // Try to recover optional complex fields
      if (projectData.landParcel) {
        try {
          validatedProject.landParcel = projectData.landParcel;
        } catch {
          skippedFields.push('landParcel');
          warnings.push({
            field: 'landParcel',
            message: 'Land parcel data is corrupted and will be skipped',
            suggestion: 'Reconfigure land parameters after import',
          });
        }
      }

      if (projectData.subdivisionScenarios) {
        try {
          validatedProject.subdivisionScenarios = projectData.subdivisionScenarios;
        } catch {
          skippedFields.push('subdivisionScenarios');
          warnings.push({
            field: 'subdivisionScenarios',
            message: 'Subdivision scenarios are corrupted and will be skipped',
            suggestion: 'Recalculate subdivision scenarios after import',
          });
        }
      }

      recoveredData = validatedProject;

      warnings.push({
        field: 'recovery',
        message: `Partial recovery enabled: ${skippedFields.length} fields skipped`,
        suggestion: 'Review and reconfigure skipped sections',
      });
    } else if (!schemaValid) {
      throw new Error(
        'Project data validation failed. Enable partial recovery to import valid fields.'
      );
    }

    // Step 6: Scan and validate images directory (T186)
    let imagesValid = true;
    const importedImages: any[] = [];

    if (importImages && imagesDirExists && recoveredData.images) {
      for (const imageRef of recoveredData.images) {
        const imagePath = path.join(imagesDir, imageRef.filename);

        if (fs.existsSync(imagePath)) {
          importedImages.push({
            ...imageRef,
            localPath: imagePath,
          });
        } else {
          missingImages.push(imageRef.filename);
          warnings.push({
            field: `images.${imageRef.filename}`,
            message: `Image file not found: ${imageRef.filename}`,
            suggestion: 'Image will be marked as missing in the project',
          });
        }
      }

      if (missingImages.length > 0) {
        imagesValid = false;
      }
    }

    // Step 7: Check for AI prompts
    if (aiPromptsDirExists) {
      const subdivisionPromptPath = path.join(aiPromptsDir, 'ai-subdivision-prompt.json');
      const imagePromptsPath = path.join(aiPromptsDir, 'ai-image-prompts.txt');

      if (!fs.existsSync(subdivisionPromptPath)) {
        missingAIPrompts.push('ai-subdivision-prompt.json');
      }
      if (!fs.existsSync(imagePromptsPath)) {
        missingAIPrompts.push('ai-image-prompts.txt');
      }
    }

    // Step 8: Restore project state to database (T187)
    const db = getDatabase();
    const importedProjectId = crypto.randomUUID();

    db.prepare('BEGIN').run();

    try {
      // Import project
      const projectStmt = db.prepare(`
        INSERT INTO projects (id, name, created, modified, version, land_parcel_id, selected_scenario_id, status, notes, target_directory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      projectStmt.run(
        importedProjectId,
        recoveredData.name,
        recoveredData.created,
        recoveredData.modified,
        recoveredData.version || '1.0.0',
        null, // Will be set after importing land parcel
        recoveredData.selectedScenarioId || null,
        recoveredData.status || 'draft',
        recoveredData.notes || null,
        importPath // Store import path as target directory
      );

      // Import land parcel if present
      let landParcelId = null;
      if (recoveredData.landParcel) {
        landParcelId = crypto.randomUUID();
        const landStmt = db.prepare(`
          INSERT INTO land_parcels (
            id, project_id, width_meters, length_meters, area_sqm, province,
            is_urbanized, acquisition_cost_amount, acquisition_cost_currency, display_unit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const lp = recoveredData.landParcel;
        landStmt.run(
          landParcelId,
          importedProjectId,
          lp.width,
          lp.length,
          lp.area,
          lp.province,
          lp.isUrbanized ? 1 : 0,
          lp.acquisitionCost.amount,
          lp.acquisitionCost.currency,
          lp.displayUnit || 'sqm'
        );

        // Update project with land parcel reference
        db.prepare('UPDATE projects SET land_parcel_id = ? WHERE id = ?').run(
          landParcelId,
          importedProjectId
        );

        // Import landmarks if present
        if (lp.landmarks && Array.isArray(lp.landmarks)) {
          const landmarkStmt = db.prepare(`
            INSERT INTO landmarks (id, land_parcel_id, type, name, distance_km, description)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          for (const landmark of lp.landmarks) {
            landmarkStmt.run(
              crypto.randomUUID(),
              landParcelId,
              landmark.type,
              landmark.name,
              landmark.distance || null,
              landmark.description || null
            );
          }
        }
      }

      // Import subdivision scenarios if present
      if (recoveredData.subdivisionScenarios && Array.isArray(recoveredData.subdivisionScenarios)) {
        const scenarioStmt = db.prepare(`
          INSERT INTO subdivision_scenarios (
            id, land_parcel_id, social_club_percent,
            social_club_width, social_club_length, social_club_area,
            social_club_pos_x, social_club_pos_y,
            lot_count, lot_width, lot_length, lot_area, lot_min_area,
            grid_rows, grid_columns, grid_distribution,
            total_lots_area, common_area_percent_per_lot,
            is_viable, calculated_at,
            parking_total_spaces, parking_area_sqm, parking_pos_x, parking_pos_y,
            parking_width, parking_length,
            maintenance_room_area_sqm, maintenance_room_location,
            maintenance_room_pos_x, maintenance_room_pos_y,
            storage_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const scenario of recoveredData.subdivisionScenarios) {
          const sc = scenario.socialClub;
          const lots = scenario.lots;
          const parking = scenario.parkingArea;
          const maintenance = scenario.maintenanceRoom;

          scenarioStmt.run(
            scenario.id,
            landParcelId,
            scenario.socialClubPercent,
            sc.width,
            sc.length,
            sc.area,
            sc.position.x,
            sc.position.y,
            lots.count,
            lots.width,
            lots.length,
            lots.area,
            lots.minArea,
            lots.grid.rows,
            lots.grid.columns,
            lots.grid.distribution,
            scenario.totalLotsArea,
            scenario.commonAreaPercentPerLot,
            scenario.isViable ? 1 : 0,
            scenario.calculatedAt,
            parking.totalSpaces,
            parking.area,
            parking.position.x,
            parking.position.y,
            parking.width,
            parking.length,
            maintenance.area,
            maintenance.location,
            maintenance.position.x,
            maintenance.position.y,
            scenario.storageType
          );
        }
      }

      // Import social club design if present
      if (recoveredData.socialClubDesign) {
        const socialClubId = crypto.randomUUID();
        const scd = recoveredData.socialClubDesign;

        const socialClubStmt = db.prepare(`
          INSERT INTO social_club_designs (
            id, project_id, scenario_id, storage_type,
            dedicated_storage_area, total_cost_amount, total_cost_currency, total_area
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        socialClubStmt.run(
          socialClubId,
          importedProjectId,
          scd.scenarioId,
          scd.storageType,
          scd.dedicatedStorageArea || null,
          scd.totalCost.amount,
          scd.totalCost.currency,
          scd.totalArea
        );

        // Import selected amenities
        if (scd.selectedAmenities && Array.isArray(scd.selectedAmenities)) {
          const amenityStmt = db.prepare(`
            INSERT INTO selected_amenities (
              id, social_club_design_id, amenity_id, category, name,
              quantity, unit_cost_amount, unit_cost_currency,
              total_cost_amount, total_cost_currency, space_requirement
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const amenity of scd.selectedAmenities) {
            amenityStmt.run(
              crypto.randomUUID(),
              socialClubId,
              amenity.amenityId,
              amenity.category,
              amenity.name,
              amenity.quantity,
              amenity.unitCost.amount,
              amenity.unitCost.currency,
              amenity.totalCost.amount,
              amenity.totalCost.currency,
              amenity.spaceRequirement || null
            );
          }
        }
      }

      // Import financial analysis if present
      if (recoveredData.financialAnalysis) {
        const financialId = crypto.randomUUID();
        const fa = recoveredData.financialAnalysis;

        const financialStmt = db.prepare(`
          INSERT INTO financial_analyses (
            id, project_id,
            land_acquisition_amount, land_acquisition_currency,
            amenities_amount, amenities_currency,
            parking_cost_amount, parking_cost_currency,
            walkways_cost_amount, walkways_cost_currency,
            landscaping_cost_amount, landscaping_cost_currency,
            maintenance_room_cost_amount, maintenance_room_cost_currency,
            storage_cost_amount, storage_cost_currency,
            legal_notary_amount, legal_notary_currency,
            legal_permits_amount, legal_permits_currency,
            legal_registrations_amount, legal_registrations_currency,
            total_project_cost_amount, total_project_cost_currency,
            cost_per_sqm_shared_amount, cost_per_sqm_shared_currency,
            base_lot_cost_amount, base_lot_cost_currency,
            monthly_maintenance_amount, monthly_maintenance_currency,
            monthly_maintenance_per_owner_amount, monthly_maintenance_per_owner_currency,
            exchange_rate_from, exchange_rate_to, exchange_rate_value, exchange_rate_date,
            calculated_at, last_modified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const costs = fa.costs;
        const legal = costs.legal;

        financialStmt.run(
          financialId,
          importedProjectId,
          costs.landAcquisition.amount,
          costs.landAcquisition.currency,
          costs.amenities.amount,
          costs.amenities.currency,
          costs.parking.amount,
          costs.parking.currency,
          costs.walkways.amount,
          costs.walkways.currency,
          costs.landscaping.amount,
          costs.landscaping.currency,
          costs.maintenanceRoom.amount,
          costs.maintenanceRoom.currency,
          costs.storage.amount,
          costs.storage.currency,
          legal.notaryFees.amount,
          legal.notaryFees.currency,
          legal.permits.amount,
          legal.permits.currency,
          legal.registrations.amount,
          legal.registrations.currency,
          fa.totalProjectCost.amount,
          fa.totalProjectCost.currency,
          fa.costPerSqmSharedAreas.amount,
          fa.costPerSqmSharedAreas.currency,
          fa.baseLotCost.amount,
          fa.baseLotCost.currency,
          fa.monthlyMaintenanceCost?.amount || null,
          fa.monthlyMaintenanceCost?.currency || null,
          fa.monthlyMaintenancePerOwner?.amount || null,
          fa.monthlyMaintenancePerOwner?.currency || null,
          fa.exchangeRate?.from || null,
          fa.exchangeRate?.to || null,
          fa.exchangeRate?.rate || null,
          fa.exchangeRate?.effectiveDate || null,
          fa.calculatedAt,
          fa.lastModified
        );

        // Import other costs
        if (costs.other && Array.isArray(costs.other)) {
          const otherCostStmt = db.prepare(`
            INSERT INTO other_costs (id, financial_analysis_id, label, amount, currency, description)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          for (const otherCost of costs.other) {
            otherCostStmt.run(
              crypto.randomUUID(),
              financialId,
              otherCost.label,
              otherCost.amount.amount,
              otherCost.amount.currency,
              otherCost.description || null
            );
          }
        }

        // Import pricing scenarios
        if (fa.pricingScenarios && Array.isArray(fa.pricingScenarios)) {
          const pricingStmt = db.prepare(`
            INSERT INTO pricing_scenarios (
              id, financial_analysis_id, profit_margin_percent,
              lot_sale_price_amount, lot_sale_price_currency,
              total_revenue_amount, total_revenue_currency,
              expected_profit_amount, expected_profit_currency, roi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const pricing of fa.pricingScenarios) {
            pricingStmt.run(
              crypto.randomUUID(),
              financialId,
              pricing.profitMarginPercent,
              pricing.lotSalePrice.amount,
              pricing.lotSalePrice.currency,
              pricing.totalRevenue.amount,
              pricing.totalRevenue.currency,
              pricing.expectedProfit.amount,
              pricing.expectedProfit.currency,
              pricing.roi
            );
          }
        }
      }

      // Import images (T186, T190)
      if (importImages && importedImages.length > 0) {
        const imageStmt = db.prepare(`
          INSERT INTO project_images (
            id, project_id, associated_with, lot_id, filename, format,
            size_bytes, width_pixels, height_pixels, local_path,
            thumbnail_path, uploaded_at, caption
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const image of importedImages) {
          // Copy image to application storage
          const appImagesDir = path.join(
            require('electron').app.getPath('userData'),
            'images',
            importedProjectId
          );
          if (!fs.existsSync(appImagesDir)) {
            fs.mkdirSync(appImagesDir, { recursive: true });
          }

          const destPath = path.join(appImagesDir, image.filename);
          fs.copyFileSync(image.localPath, destPath);

          imageStmt.run(
            image.id,
            importedProjectId,
            image.associatedWith,
            image.lotId || null,
            image.filename,
            image.format,
            image.size,
            image.width,
            image.height,
            destPath,
            null, // thumbnail will be generated on demand
            image.uploadedAt,
            image.caption || null
          );
        }
      }

      db.prepare('COMMIT').run();

      const duration = Date.now() - startTime;

      // T207: Add to recent projects list
      const { addRecentProject } = await import('./settings-store');
      addRecentProject(importPath);

      // Generate success result
      return {
        success: true,
        message: 'Project imported successfully',
        importedProjectId,
        importedAt: new Date().toISOString(),
        validation: {
          structureValid,
          checksumValid,
          schemaValid,
          imagesValid,
        },
        errors: validationErrors,
        warnings,
        partialRecovery:
          skippedFields.length > 0
            ? {
                enabled: enablePartialRecovery,
                skippedFields,
                recoveredData,
              }
            : undefined,
        missingImages,
        missingAIPrompts,
        duration,
      };
    } catch (dbError: any) {
      db.prepare('ROLLBACK').run();
      throw new Error(`Database error during import: ${dbError.message}`);
    }
  } catch (error: any) {
    console.error('Error importing project:', error);
    const duration = Date.now() - startTime;

    return {
      success: false,
      message: `Import failed: ${error.message}`,
      importedProjectId: undefined,
      importedAt: new Date().toISOString(),
      validation: {
        structureValid: false,
        checksumValid: false,
        schemaValid: false,
        imagesValid: false,
      },
      errors: [
        {
          field: 'import',
          message: error.message,
          severity: 'critical',
        },
      ],
      warnings: [],
      missingImages: [],
      missingAIPrompts: [],
      duration,
    };
  }
});

// Recent Projects operations
ipcMain.handle('recent-projects:get', async () => {
  console.log('IPC: recent-projects:get called');
  const { getRecentProjects } = await import('./settings-store');
  return getRecentProjects();
});

ipcMain.handle('recent-projects:add', async (event, projectPath: string) => {
  console.log('IPC: recent-projects:add called with path:', projectPath);
  const { addRecentProject } = await import('./settings-store');
  const { refreshApplicationMenu } = await import('./menu');
  const { BrowserWindow } = await import('electron');

  addRecentProject(projectPath);

  // Refresh menu to show updated recent projects
  const mainWindow = BrowserWindow.getFocusedWindow();
  if (mainWindow) {
    refreshApplicationMenu(mainWindow);
  }

  return { success: true };
});

ipcMain.handle('recent-projects:clear', async () => {
  console.log('IPC: recent-projects:clear called');
  const { clearRecentProjects } = await import('./settings-store');
  const { refreshApplicationMenu } = await import('./menu');
  const { BrowserWindow } = await import('electron');

  clearRecentProjects();

  // Refresh menu to remove recent projects
  const mainWindow = BrowserWindow.getFocusedWindow();
  if (mainWindow) {
    refreshApplicationMenu(mainWindow);
  }

  return { success: true };
});

ipcMain.handle('recent-projects:remove', async (event, projectPath: string) => {
  console.log('IPC: recent-projects:remove called with path:', projectPath);
  const { removeRecentProject } = await import('./settings-store');
  const { refreshApplicationMenu } = await import('./menu');
  const { BrowserWindow } = await import('electron');

  removeRecentProject(projectPath);

  // Refresh menu
  const mainWindow = BrowserWindow.getFocusedWindow();
  if (mainWindow) {
    refreshApplicationMenu(mainWindow);
  }

  return { success: true };
});

// Telemetry operations
ipcMain.handle('telemetry:isEnabled', async () => {
  console.log('IPC: telemetry:isEnabled called');
  const { telemetry } = await import('./telemetry');
  return { enabled: telemetry.isOptedIn() };
});

ipcMain.handle('telemetry:enable', async () => {
  console.log('IPC: telemetry:enable called');
  const { telemetry } = await import('./telemetry');
  telemetry.enable();
  return { success: true };
});

ipcMain.handle('telemetry:disable', async () => {
  console.log('IPC: telemetry:disable called');
  const { telemetry } = await import('./telemetry');
  telemetry.disable();
  return { success: true };
});

ipcMain.handle('telemetry:getStatistics', async () => {
  console.log('IPC: telemetry:getStatistics called');
  const { telemetry } = await import('./telemetry');
  return telemetry.getStatistics();
});

ipcMain.handle('telemetry:getRecentEvents', async () => {
  console.log('IPC: telemetry:getRecentEvents called');
  const { telemetry } = await import('./telemetry');
  return telemetry.getRecentEvents();
});

ipcMain.handle('telemetry:clearData', async () => {
  console.log('IPC: telemetry:clearData called');
  const { telemetry } = await import('./telemetry');
  telemetry.clearData();
  return { success: true };
});

ipcMain.handle(
  'telemetry:trackEvent',
  async (event, eventType: string, eventName: string, data?: Record<string, any>) => {
    console.log('IPC: telemetry:trackEvent called', { eventType, eventName });
    const { telemetry } = await import('./telemetry');
    telemetry.trackEvent(eventType as any, eventName, data);
    return { success: true };
  }
);

// ============================================================================
// AI SUBDIVISION PLANNING HANDLERS
// ============================================================================

/**
 * Generate AI subdivision plan
 * Channel: 'ai:generate-subdivision-plan'
 */
ipcMain.handle(
  'ai:generate-subdivision-plan',
  async (event, request: GenerateSubdivisionPlanRequest) => {
    console.log('[IPC] ai:generate-subdivision-plan called', {
      projectId: request.projectId,
      count: request.count,
    });

    try {
      // Validate request
      const validatedRequest = validateIPCRequest(request, GenerateSubdivisionPlanRequestSchema);
      const count = validatedRequest.count || 1;

      // Import AI services dynamically
      const { generateSubdivisionPlan } = await import('./ai-services/gemini-client');
      const { createAISubdivisionPlan } = await import('./storage');

      // Define variation strategies for multiple plans
      const strategies = [
        { focus: 'maximize-lots', description: 'Maximize number of lots' },
        { focus: 'larger-lots', description: 'Create larger lot sizes' },
        { focus: 'varied-amenities', description: 'Vary amenity allocation' },
        { focus: 'different-layout', description: 'Alternative road layout' },
        { focus: 'balanced', description: 'Balanced approach' },
      ];

      const plans = [];

      // Generate multiple plans with varied prompts
      for (let i = 0; i < count; i++) {
        try {
          const strategy = strategies[i % strategies.length];
          const startTime = Date.now();

          // Send progress event for plan generation start
          event.sender.send('ai:generation-progress', {
            planIndex: i + 1,
            totalPlans: count,
            status: 'generating',
            message: `Connecting to AI service for plan ${i + 1}/${count}... (first request may take 10-30 seconds)`,
            strategy: strategy.focus,
          });

          // Wait a moment for UI to update
          await new Promise((resolve) => setTimeout(resolve, 100));

          const result = await generateSubdivisionPlan(
            {
              landWidth: validatedRequest.landWidth,
              landLength: validatedRequest.landLength,
              landArea: validatedRequest.landArea,
              socialClubPercent: validatedRequest.socialClubPercent,
              targetLotCount: validatedRequest.targetLotCount,
              province: validatedRequest.province,
              strategy: strategy.focus, // Pass strategy to prompt builder
            },
            // Progress callback for streaming updates
            (chunk: string, accumulated: string) => {
              event.sender.send('ai:streaming-progress', {
                planIndex: i + 1,
                totalPlans: count,
                chunkLength: chunk.length,
                accumulatedLength: accumulated.length,
                message: `Streaming plan ${i + 1}/${count}... (${accumulated.length} characters received)`,
              });
            }
          );

          // Validate the generated plan (basic validation)
          const isValid = result.plan.metrics.viableLots > 0;
          const validationStatus = isValid ? 'valid' : 'invalid';
          const validationErrors = isValid
            ? []
            : ['No viable lots generated (all below 90 sqm minimum)'];

          // Save to database
          const planId = await createAISubdivisionPlan({
            projectId: validatedRequest.projectId,
            landParcelId: validatedRequest.landParcelId,
            inputLandWidth: validatedRequest.landWidth,
            inputLandLength: validatedRequest.landLength,
            inputLandArea: validatedRequest.landArea,
            inputSocialClubPercent: validatedRequest.socialClubPercent,
            inputTargetLotCount: validatedRequest.targetLotCount,
            planJson: JSON.stringify(result.plan),
            validationStatus,
            validationErrors:
              validationErrors.length > 0 ? JSON.stringify(validationErrors) : undefined,
            aiModel: 'gemini-2.5-flash',
            promptTokens: Math.floor(result.tokensUsed * 0.7),
            completionTokens: Math.floor(result.tokensUsed * 0.3),
            totalTokens: result.tokensUsed,
            generationTimeMs: result.generationTimeMs,
          });

          plans.push({
            planId,
            status: 'completed' as const,
            plan: result.plan,
            validationStatus,
            validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
            tokensUsed: result.tokensUsed,
            generationTimeMs: result.generationTimeMs,
          });

          // Send completion event
          event.sender.send('ai:generation-progress', {
            planIndex: i + 1,
            totalPlans: count,
            status: 'completed',
            message: `Plan ${i + 1}/${count} completed successfully (${result.plan.metrics.viableLots} viable lots)`,
            planId,
            generationTimeMs: result.generationTimeMs,
          });
        } catch (error: any) {
          console.error(`[IPC] Error generating plan ${i + 1}/${count}:`, error);
          const planId = crypto.randomUUID();
          plans.push({
            planId,
            status: 'failed' as const,
            errorMessage: error.message || 'Failed to generate subdivision plan',
          });

          // Send failure event
          event.sender.send('ai:generation-progress', {
            planIndex: i + 1,
            totalPlans: count,
            status: 'failed',
            message: `Plan ${i + 1}/${count} failed: ${error.message}`,
            errorMessage: error.message,
          });
        }
      }

      // Return response with backward compatibility
      const firstPlan = plans[0];
      return {
        plans, // Array of all generated plans
        // Backward compatibility fields (first plan)
        planId: firstPlan?.planId,
        status: firstPlan?.status,
        plan: firstPlan?.plan,
        validationStatus: firstPlan?.validationStatus,
        validationErrors: firstPlan?.validationErrors,
        tokensUsed: firstPlan?.tokensUsed,
        generationTimeMs: firstPlan?.generationTimeMs,
      };
    } catch (error: any) {
      console.error('[IPC] Error generating subdivision plan:', error);

      // Create failed request record
      const planId = crypto.randomUUID();
      return {
        plans: [
          {
            planId,
            status: 'failed' as const,
            errorMessage: error.message || 'Failed to generate subdivision plan',
          },
        ],
        planId,
        status: 'failed' as const,
        errorMessage: error.message || 'Failed to generate subdivision plan',
      };
    }
  }
);

/**
 * Generate site plan image
 * Channel: 'ai:generate-site-plan-image'
 */
ipcMain.handle(
  'ai:generate-site-plan-image',
  async (event, request: GenerateSitePlanImageRequest) => {
    console.log('[IPC] ai:generate-site-plan-image called', {
      projectId: request.projectId,
      subdivisionPlanId: request.subdivisionPlanId,
      viewType: request.viewType,
    });

    try {
      // Validate request
      const validatedRequest = validateIPCRequest(request, GenerateSitePlanImageRequestSchema);

      // Import services
      const { generateProjectImage } = await import('./ai-services/image-client');
      const {
        getAISubdivisionPlanById,
        createProjectVisualization,
        getProjectVisualizationsByPlanId,
      } = await import('./storage');

      // Get the approved subdivision plan
      console.log('[IPC] Fetching subdivision plan:', validatedRequest.subdivisionPlanId);
      const plan = await getAISubdivisionPlanById(validatedRequest.subdivisionPlanId);

      console.log('[IPC] Plan retrieved:', {
        found: !!plan,
        approvedByUser: plan?.approvedByUser,
        approved_by_user_raw: plan?.approved_by_user,
      });

      if (!plan) {
        throw new Error('Subdivision plan not found');
      }

      if (!plan.approvedByUser) {
        throw new Error(
          `Subdivision plan must be approved before generating images. Current approval status: ${plan.approved_by_user} (type: ${typeof plan.approved_by_user})`
        );
      }

      // Fetch reference images based on view type
      let referenceImagePath: string | undefined;
      const existingVisualizations = await getProjectVisualizationsByPlanId(
        validatedRequest.subdivisionPlanId
      );

      if (validatedRequest.viewType === 'aerial') {
        // Aerial view uses site plan as reference for layout positioning
        console.log('[IPC] Fetching site plan visualization for aerial reference...');
        const sitePlanVisualization = existingVisualizations.find((v) => v.viewType === 'site-plan');

        if (!sitePlanVisualization || !sitePlanVisualization.localPath) {
          throw new Error(
            'Site plan image must be generated first before creating aerial view. Please generate the site plan view first.'
          );
        }

        referenceImagePath = sitePlanVisualization.localPath;
        console.log('[IPC] Using site plan as reference for aerial view:', referenceImagePath);
      } else if (validatedRequest.viewType === 'context') {
        // Context view uses aerial view as reference for 3D spatial layout
        console.log('[IPC] Fetching aerial visualization for context reference...');
        const aerialVisualization = existingVisualizations.find((v) => v.viewType === 'aerial');

        if (!aerialVisualization || !aerialVisualization.localPath) {
          throw new Error(
            'Aerial view image must be generated first before creating context view. Please generate the aerial view first.'
          );
        }

        referenceImagePath = aerialVisualization.localPath;
        console.log('[IPC] Using aerial view as reference for context view:', referenceImagePath);
      }

      // Parse the subdivision plan from database (use plan_json, not planJson)
      const subdivisionPlan = JSON.parse(plan.plan_json);
      console.log('[IPC] Parsed subdivision plan:', {
        totalLots: subdivisionPlan.metrics.totalLots,
        viableLots: subdivisionPlan.metrics.viableLots,
      });

      // Determine output directory (project-specific)
      const outputDir = `D:\\fast2ai\\AI-Floorplan\\project-data\\${validatedRequest.projectId}\\images\\ai-generated`;

      // Smart resolution selection based on land aspect ratio (for site-plan view)
      let defaultResolution: '1024x1024' | '1792x1024' | '1024x1792';
      if (validatedRequest.viewType === 'site-plan') {
        const aspectRatio = plan.input_land_length / plan.input_land_width;
        if (aspectRatio > 1.3) {
          // Tall plot (length > width by 30%+) - use portrait orientation
          defaultResolution = '1024x1792';
          console.log(
            `[IPC] Auto-selecting portrait resolution (1024x1792) for tall plot aspect ratio: ${aspectRatio.toFixed(2)}:1`
          );
        } else if (aspectRatio < 0.77) {
          // Wide plot (width > length by 30%+) - use landscape orientation
          defaultResolution = '1792x1024';
          console.log(
            `[IPC] Auto-selecting landscape resolution (1792x1024) for wide plot aspect ratio: 1:${(1 / aspectRatio).toFixed(2)}`
          );
        } else {
          // Nearly square plot
          defaultResolution = '1024x1024';
          console.log(
            `[IPC] Auto-selecting square resolution (1024x1024) for near-square plot aspect ratio: ${aspectRatio.toFixed(2)}:1`
          );
        }
      } else {
        // Aerial and context views default to square
        defaultResolution = '1024x1024';
      }

      // Generate image (use snake_case field names from database)
      const result = await generateProjectImage(
        {
          projectName: validatedRequest.projectId,
          subdivisionPlan,
          viewType: validatedRequest.viewType,
          resolution: validatedRequest.resolution || defaultResolution,
          customPromptAdditions: validatedRequest.customPromptAdditions,
          fullCustomPrompt: validatedRequest.fullCustomPrompt,
          landDimensions: {
            width: plan.input_land_width,
            length: plan.input_land_length,
          },
          province: 'Dominican Republic',
          nearbyLandmarks: [],
          referenceImagePath, // Pass the site plan image path for aerial/context views
        },
        outputDir
      );

      // Save to database
      const visualizationId = await createProjectVisualization({
        projectId: validatedRequest.projectId,
        aiSubdivisionPlanId: validatedRequest.subdivisionPlanId,
        viewType: validatedRequest.viewType,
        filename: result.filename,
        format: result.format,
        sizeBytes: require('fs').statSync(result.localPath).size,
        widthPixels: result.widthPixels,
        heightPixels: result.heightPixels,
        localPath: result.localPath,
        aiModel: result.aiModel,
        promptText: result.promptText,
      });

      return {
        visualizationId,
        status: 'completed' as const,
        localPath: result.localPath,
        filename: result.filename,
        format: result.format,
        widthPixels: result.widthPixels,
        heightPixels: result.heightPixels,
        generationTimeMs: result.generationTimeMs,
      };
    } catch (error: any) {
      console.error('[IPC] Error generating image:', error);

      const visualizationId = crypto.randomUUID();
      return {
        visualizationId,
        status: 'failed' as const,
        errorMessage: error.message || 'Failed to generate image',
      };
    }
  }
);

/**
 * Preview image generation prompt
 * Channel: 'ai:preview-image-prompt'
 */
ipcMain.handle('ai:preview-image-prompt', async (event, request: GenerateSitePlanImageRequest) => {
  console.log('[IPC] ai:preview-image-prompt called', {
    subdivisionPlanId: request.subdivisionPlanId,
    viewType: request.viewType,
  });

  try {
    const { buildImagePrompt } = await import('./ai-services/image-client');
    const { getAISubdivisionPlanById } = await import('./storage');

    // Get the approved subdivision plan
    const plan = await getAISubdivisionPlanById(request.subdivisionPlanId);

    if (!plan) {
      throw new Error('Subdivision plan not found');
    }

    // Parse the subdivision plan
    const subdivisionPlan = JSON.parse(plan.plan_json);

    // Smart resolution selection based on land aspect ratio (for site-plan view)
    let defaultResolution: '1024x1024' | '1792x1024' | '1024x1792';
    if (request.viewType === 'site-plan') {
      const aspectRatio = plan.input_land_length / plan.input_land_width;
      if (aspectRatio > 1.3) {
        defaultResolution = '1024x1792'; // Portrait
      } else if (aspectRatio < 0.77) {
        defaultResolution = '1792x1024'; // Landscape
      } else {
        defaultResolution = '1024x1024'; // Square
      }
    } else {
      defaultResolution = '1024x1024';
    }

    // Build the prompt (use snake_case field names from database)
    const prompt = buildImagePrompt({
      projectName: request.projectId,
      subdivisionPlan,
      viewType: request.viewType,
      resolution: request.resolution || defaultResolution,
      customPromptAdditions: request.customPromptAdditions,
      landDimensions: {
        width: plan.input_land_width,
        length: plan.input_land_length,
      },
      province: 'Dominican Republic',
      nearbyLandmarks: [],
    });

    return {
      prompt,
      viewType: request.viewType,
    };
  } catch (error: any) {
    console.error('[IPC] Error previewing prompt:', error);
    throw new Error(`Failed to preview prompt: ${error.message}`);
  }
});

/**
 * Preview subdivision plan prompt
 * Channel: 'ai:preview-subdivision-prompt'
 */
ipcMain.handle(
  'ai:preview-subdivision-prompt',
  async (event, request: { landWidth: number; landLength: number; landArea: number; socialClubPercent: number; targetLotCount?: number; province?: string; strategy?: string }) => {
    console.log('[IPC] ai:preview-subdivision-prompt called', {
      landWidth: request.landWidth,
      landLength: request.landLength,
      landArea: request.landArea,
    });

    try {
      const { buildSubdivisionPrompt } = await import('./ai-services/gemini-client');

      // Build the prompt
      const prompt = buildSubdivisionPrompt({
        landWidth: request.landWidth,
        landLength: request.landLength,
        landArea: request.landArea,
        socialClubPercent: request.socialClubPercent,
        targetLotCount: request.targetLotCount,
        province: request.province,
        strategy: request.strategy || 'balanced',
      });

      return {
        prompt,
      };
    } catch (error: any) {
      console.error('[IPC] Error previewing subdivision prompt:', error);
      throw new Error(`Failed to preview subdivision prompt: ${error.message}`);
    }
  }
);

/**
 * Approve subdivision plan
 * Channel: 'ai:approve-plan'
 */
ipcMain.handle('ai:approve-plan', async (event, request: ApprovePlanRequest) => {
  console.log('[IPC] ai:approve-plan called', { planId: request.planId });

  try {
    const validatedRequest = validateIPCRequest(request, ApprovePlanRequestSchema);
    const { approveAISubdivisionPlan } = await import('./storage');

    await approveAISubdivisionPlan(validatedRequest.planId);
    const approvedAt = new Date().toISOString();

    return {
      success: true,
      planId: validatedRequest.planId,
      approvedAt,
    };
  } catch (error: any) {
    console.error('[IPC] Error approving plan:', error);
    return {
      success: false,
      planId: request.planId,
      errorMessage: error.message || 'Failed to approve plan',
    };
  }
});

/**
 * Reject subdivision plan
 * Channel: 'ai:reject-plan'
 */
ipcMain.handle('ai:reject-plan', async (event, request: RejectPlanRequest) => {
  console.log('[IPC] ai:reject-plan called', { planId: request.planId });

  try {
    const validatedRequest = validateIPCRequest(request, RejectPlanRequestSchema);
    const { rejectAISubdivisionPlan } = await import('./storage');

    await rejectAISubdivisionPlan(validatedRequest.planId, validatedRequest.reason);

    return {
      success: true,
      planId: validatedRequest.planId,
    };
  } catch (error: any) {
    console.error('[IPC] Error rejecting plan:', error);
    return {
      success: false,
      planId: request.planId,
      errorMessage: error.message || 'Failed to reject plan',
    };
  }
});

/**
 * Get generation history
 * Channel: 'ai:get-generation-history'
 */
ipcMain.handle('ai:get-generation-history', async (event, request: GetGenerationHistoryRequest) => {
  console.log('[IPC] ai:get-generation-history called', { projectId: request.projectId });

  try {
    const validatedRequest = validateIPCRequest(request, GetGenerationHistoryRequestSchema);
    const { getAISubdivisionPlansByProject } = await import('./storage');

    const plans = await getAISubdivisionPlansByProject(
      validatedRequest.projectId,
      validatedRequest.limit,
      validatedRequest.offset,
      validatedRequest.includeRejected
    );

    return {
      plans: plans.map((plan) => {
        const planData = JSON.parse(plan.plan_json);
        return {
          id: plan.id,
          generatedAt: plan.generated_at,
          generationStatus: plan.generation_status,
          validationStatus: plan.validation_status,
          approvedByUser: plan.approvedByUser, // Already converted to boolean in storage.ts
          viableLots: planData.metrics.viableLots,
          totalLots: planData.metrics.totalLots,
          landUtilizationPercent: planData.metrics.landUtilizationPercent,
        };
      }),
      total: plans.length,
    };
  } catch (error: any) {
    console.error('[IPC] Error getting generation history:', error);
    return {
      plans: [],
      total: 0,
    };
  }
});

/**
 * Get archived subdivision plans
 * Channel: 'ai:get-archived-plans'
 */
ipcMain.handle('ai:get-archived-plans', async (event, request: GetArchivedPlansRequest) => {
  console.log('[IPC] ai:get-archived-plans called', { projectId: request.projectId });

  try {
    const validatedRequest = validateIPCRequest(request, GetArchivedPlansRequestSchema);
    const { getArchivedPlans } = await import('./storage');

    const plans = await getArchivedPlans(validatedRequest.projectId);

    return {
      plans: plans.map((plan) => {
        const planData = JSON.parse(plan.plan_json);
        return {
          id: plan.id,
          generatedAt: plan.generated_at,
          generationStatus: plan.generation_status,
          validationStatus: plan.validation_status,
          approvedByUser: plan.approvedByUser, // Already converted to boolean in storage.ts
          viableLots: planData.metrics.viableLots,
          totalLots: planData.metrics.totalLots,
          landUtilizationPercent: planData.metrics.landUtilizationPercent,
        };
      }),
      total: plans.length,
    };
  } catch (error: any) {
    console.error('[IPC] Error getting archived plans:', error);
    return {
      plans: [],
      total: 0,
    };
  }
});

/**
 * Switch to an archived plan (activate it)
 * Channel: 'ai:switch-to-archived-plan'
 */
ipcMain.handle(
  'ai:switch-to-archived-plan',
  async (event, request: SwitchToArchivedPlanRequest) => {
    console.log('[IPC] ai:switch-to-archived-plan called', {
      planId: request.planId,
      projectId: request.projectId,
    });

    try {
      const validatedRequest = validateIPCRequest(request, SwitchToArchivedPlanRequestSchema);
      const { switchToArchivedPlan } = await import('./storage');

      await switchToArchivedPlan(validatedRequest.planId, validatedRequest.projectId);

      return {
        success: true,
        planId: validatedRequest.planId,
        activatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[IPC] Error switching to archived plan:', error);
      return {
        success: false,
        planId: request.planId,
        activatedAt: new Date().toISOString(),
        errorMessage: error.message || 'Failed to switch to archived plan',
      };
    }
  }
);

/**
 * Get session cost
 * Channel: 'ai:get-session-cost'
 */
ipcMain.handle('ai:get-session-cost', async (event, request: GetSessionCostRequest) => {
  console.log('[IPC] ai:get-session-cost called', { projectId: request.projectId });

  try {
    const validatedRequest = validateIPCRequest(request, GetSessionCostRequestSchema);
    const { getSessionCost } = await import('./storage');

    const cost = await getSessionCost(validatedRequest.projectId);

    return cost;
  } catch (error: any) {
    console.error('[IPC] Error getting session cost:', error);
    return {
      sessionStartDate: new Date().toISOString(),
      geminiCalls: 0,
      imageCalls: 0,
      totalTokensUsed: 0,
      estimatedCostUsd: 0,
    };
  }
});

/**
 * Get AI settings
 * Channel: 'ai:get-settings'
 */
ipcMain.handle('ai:get-settings', async (event, request: GetAISettingsRequest) => {
  console.log('[IPC] ai:get-settings called', { projectId: request.projectId });

  try {
    const validatedRequest = validateIPCRequest(request, GetAISettingsRequestSchema);
    const { getAISettings } = await import('./storage');

    const settings = await getAISettings(validatedRequest.projectId);

    return { settings };
  } catch (error: any) {
    console.error('[IPC] Error getting AI settings:', error);
    throw error;
  }
});

/**
 * Update AI settings
 * Channel: 'ai:update-settings'
 */
ipcMain.handle('ai:update-settings', async (event, request: UpdateAISettingsRequest) => {
  console.log('[IPC] ai:update-settings called', { projectId: request.projectId });

  try {
    const validatedRequest = validateIPCRequest(request, UpdateAISettingsRequestSchema);
    const { updateAISettings } = await import('./storage');

    const settings = await updateAISettings(validatedRequest.projectId, validatedRequest.settings);

    return {
      success: true,
      settings,
    };
  } catch (error: any) {
    console.error('[IPC] Error updating AI settings:', error);
    return {
      success: false,
      errorMessage: error.message || 'Failed to update settings',
    };
  }
});

/**
 * Set API key
 * Channel: 'ai:set-api-key'
 */
ipcMain.handle('ai:set-api-key', async (event, request: SetAPIKeyRequest) => {
  console.log('[IPC] ai:set-api-key called', { service: request.service });

  try {
    const validatedRequest = validateIPCRequest(request, SetAPIKeyRequestSchema);
    const { encryptString } = await import('./utils/crypto');

    // Encrypt the API key
    const encryptedKey = encryptString(validatedRequest.apiKey);

    // Store in AI settings
    const { updateAISettings } = await import('./storage');
    const field =
      validatedRequest.service === 'gemini' ? 'geminiApiKeyEncrypted' : 'imageApiKeyEncrypted';

    await updateAISettings(undefined, { [field]: encryptedKey });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('[IPC] Error setting API key:', error);
    return {
      success: false,
      errorMessage: error.message || 'Failed to set API key',
    };
  }
});

/**
 * Test API key
 * Channel: 'ai:test-api-key'
 */
ipcMain.handle('ai:test-api-key', async (event, request: TestAPIKeyRequest) => {
  console.log('[IPC] ai:test-api-key called', { service: request.service });

  try {
    const validatedRequest = validateIPCRequest(request, TestAPIKeyRequestSchema);

    if (validatedRequest.service === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return { valid: false, errorMessage: 'API key not configured' };
      }

      // Test with a simple request
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      await model.generateContent('Test');

      return { valid: true };
    } else {
      // Test image API key
      const apiKey = process.env.OPENAI_API_KEY || process.env.IMAGE_API_KEY;

      if (!apiKey) {
        return { valid: false, errorMessage: 'API key not configured' };
      }

      // Simple validation - just check if it's formatted correctly
      const isValid = apiKey.startsWith('sk-') && apiKey.length >= 48;

      return {
        valid: isValid,
        errorMessage: isValid ? undefined : 'Invalid API key format',
      };
    }
  } catch (error: any) {
    console.error('[IPC] Error testing API key:', error);
    return {
      valid: false,
      errorMessage: error.message || 'API key test failed',
    };
  }
});

/**
 * Get image generation status
 * Channel: 'ai:get-image-generation-status'
 */
ipcMain.handle('ai:get-image-generation-status', async (event, generationResult: any) => {
  console.log('[IPC] ai:get-image-generation-status called', { generationResult });

  try {
    // The generationResult is actually the full response from ai:generate-site-plan-image
    // It contains: { visualizationId, status, localPath, filename, format, widthPixels, heightPixels, generationTimeMs }

    // If it's already completed (synchronous generation), return the result immediately
    if (generationResult.status === 'completed' && generationResult.localPath) {
      return {
        visualizationId: generationResult.visualizationId,
        status: 'completed',
        progress: 100,
        localPath: generationResult.localPath,
        filename: generationResult.filename,
        format: generationResult.format,
        widthPixels: generationResult.widthPixels,
        heightPixels: generationResult.heightPixels,
        generationTimeMs: generationResult.generationTimeMs,
      };
    }

    // If generation failed
    if (generationResult.status === 'failed') {
      return {
        visualizationId: generationResult.visualizationId,
        status: 'failed',
        error: {
          code: 'GENERATION_FAILED',
          message: generationResult.errorMessage || 'Image generation failed',
        },
      };
    }

    // Default case - return as-is
    return generationResult;
  } catch (error: any) {
    console.error('[IPC] Error getting image generation status:', error);
    return {
      status: 'failed',
      error: {
        code: 'UNKNOWN',
        message: error.message || 'Failed to get generation status',
      },
    };
  }
});

/**
 * Get project visualizations by plan ID
 * Channel: 'ai:get-project-visualizations'
 */
ipcMain.handle('ai:get-project-visualizations', async (event, planId: string) => {
  console.log('[IPC] ai:get-project-visualizations called', { planId });

  try {
    const db = getDatabase();
    const fs = require('fs');

    // Get ALL visualizations for the plan (supporting carousel with multiple versions)
    const visualizations = db
      .prepare(
        `
      SELECT *
      FROM project_visualizations
      WHERE ai_subdivision_plan_id = ?
      ORDER BY view_type ASC, generated_at DESC
    `
      )
      .all(planId);

    console.log(
      `[IPC] Found ${visualizations?.length || 0} visualizations for plan ${planId}`
    );

    // Transform snake_case database fields to camelCase for TypeScript
    // Also filter out visualizations with missing files
    const transformedVisualizations = (visualizations || [])
      .map((viz: any) => ({
        id: viz.id,
        projectId: viz.project_id,
        aiSubdivisionPlanId: viz.ai_subdivision_plan_id,
        viewType: viz.view_type,
        filename: viz.filename,
        format: viz.format,
        sizeBytes: viz.size_bytes,
        widthPixels: viz.width_pixels,
        heightPixels: viz.height_pixels,
        localPath: viz.local_path,
        thumbnailPath: viz.thumbnail_path,
        generatedAt: viz.generated_at,
        aiModel: viz.ai_model,
        generationRequestId: viz.generation_request_id,
        promptText: viz.prompt_text,
        negativePromptText: viz.negative_prompt_text,
        generationSeed: viz.generation_seed,
        caption: viz.caption,
        isApproved: Boolean(viz.is_approved),
        isFinal: Boolean(viz.is_final),
      }))
      .filter((viz: any) => {
        // Check if file exists at recorded path
        let exists = fs.existsSync(viz.localPath);

        if (!exists) {
          // Try alternative extensions (.png vs .jpg)
          const path = require('path');
          const dir = path.dirname(viz.localPath);
          const basename = path.basename(viz.localPath, path.extname(viz.localPath));
          const currentExt = path.extname(viz.localPath);

          // Try .jpg if current is .png, and vice versa
          const alternativeExt = currentExt === '.png' ? '.jpg' : '.png';
          const alternativePath = path.join(dir, basename + alternativeExt);

          if (fs.existsSync(alternativePath)) {
            console.log(
              `[IPC] Found alternative file: ${alternativePath} (recorded as ${viz.localPath})`
            );
            viz.localPath = alternativePath;
            viz.format = alternativeExt === '.jpg' ? 'jpeg' : 'png';
            exists = true;
          } else {
            console.warn(
              `[IPC] Skipping visualization ${viz.id} - file not found: ${viz.localPath}`
            );
          }
        }

        return exists;
      });

    console.log(
      `[IPC] Returning ${transformedVisualizations.length} valid visualizations:`,
      transformedVisualizations.map((v: any) => ({ viewType: v.viewType, localPath: v.localPath }))
    );

    return transformedVisualizations;
  } catch (error: any) {
    console.error('[IPC] Error getting project visualizations:', error);
    throw new Error(`Failed to get visualizations: ${error.message}`);
  }
});

/**
 * Save image to project
 * Channel: 'ai:save-image-to-project'
 */
ipcMain.handle('ai:save-image-to-project', async (event, params: any) => {
  console.log('[IPC] ai:save-image-to-project called', {
    projectId: params.projectId,
    viewType: params.viewType,
  });

  try {
    const db = getDatabase();
    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    const { app } = require('electron');

    // Create images directory if it doesn't exist
    const userDataPath = app.getPath('userData');
    const imagesDir = path.join(userDataPath, 'images', params.projectId);

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Download image from URL
    const filename = `${params.viewType}-${Date.now()}.png`;
    const localPath = path.join(imagesDir, filename);

    await new Promise((resolve, reject) => {
      https
        .get(params.imageUrl, (response: any) => {
          const fileStream = fs.createWriteStream(localPath);
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(null);
          });
          fileStream.on('error', reject);
        })
        .on('error', reject);
    });

    // Get file stats
    const stats = fs.statSync(localPath);

    // Create visualization record
    const visualizationId = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO project_visualizations (
        id, project_id, ai_subdivision_plan_id,
        view_type, filename, format, size_bytes,
        width_pixels, height_pixels, local_path,
        generated_at, ai_model, prompt_text,
        negative_prompt_text, is_approved, is_final
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      visualizationId,
      params.projectId,
      params.planId || null,
      params.viewType,
      filename,
      'png',
      stats.size,
      1024, // Mock width
      1024, // Mock height
      localPath,
      now,
      'dall-e-3',
      params.promptText,
      params.negativePromptText || null,
      0, // not approved initially
      0 // not final
    );

    // Return the created visualization
    const visualization = db
      .prepare('SELECT * FROM project_visualizations WHERE id = ?')
      .get(visualizationId);

    return visualization;
  } catch (error: any) {
    console.error('[IPC] Error saving image to project:', error);
    throw new Error(`Failed to save image: ${error.message}`);
  }
});

/**
 * Approve visualization
 * Channel: 'ai:approve-visualization'
 */
ipcMain.handle('ai:approve-visualization', async (event, visualizationId: string) => {
  console.log('[IPC] ai:approve-visualization called', { visualizationId });

  try {
    const db = getDatabase();

    db.prepare('UPDATE project_visualizations SET is_approved = 1 WHERE id = ?').run(
      visualizationId
    );

    return { success: true };
  } catch (error: any) {
    console.error('[IPC] Error approving visualization:', error);
    throw new Error(`Failed to approve visualization: ${error.message}`);
  }
});

/**
 * Load image and return as base64 data URL for renderer display
 * Channel: 'ai:load-image-as-data-url'
 * Returns: data:image/jpeg;base64,... URL
 */
ipcMain.handle('ai:load-image-as-data-url', async (event, localPath: string) => {
  try {
    const fs = require('fs');
    const path = require('path');

    // Check if file exists
    if (!fs.existsSync(localPath)) {
      console.error(`[IPC] Image file not found: ${localPath}`);
      throw new Error(`Image file not found: ${localPath}`);
    }

    // Validate file extension
    const ext = path.extname(localPath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (!validExtensions.includes(ext)) {
      throw new Error(`Invalid image format: ${ext}`);
    }

    // Read the file as buffer and convert to base64
    const imageBuffer = fs.readFileSync(localPath);
    const base64Image = imageBuffer.toString('base64');

    // Determine MIME type
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === '.webp') {
      mimeType = 'image/webp';
    } else if (ext === '.gif') {
      mimeType = 'image/gif';
    }

    return `data:${mimeType};base64,${base64Image}`;
  } catch (error: any) {
    console.error('[IPC] Error loading image:', error);
    throw new Error(`Failed to load image: ${error.message}`);
  }
});

// ============================================================================
// PHASE 5: MULTI-PLAN COMPARISON IPC HANDLERS (T133)
// ============================================================================

/**
 * T133: Activate a subdivision plan
 * Channel: 'ai:activate-plan'
 */
ipcMain.handle(
  'ai:activate-plan',
  async (event, request: { planId: string; projectId: string }) => {
    console.log('[IPC] ai:activate-plan called', request);

    try {
      const { activateAISubdivisionPlan } = await import('./storage');
      await activateAISubdivisionPlan(request.planId, request.projectId);

      return { success: true };
    } catch (error: any) {
      console.error('[IPC] Error activating plan:', error);
      return {
        success: false,
        errorMessage: error.message || 'Failed to activate plan',
      };
    }
  }
);

/**
 * T133: Get alternative plans for comparison
 * Channel: 'ai:get-alternative-plans'
 */
ipcMain.handle(
  'ai:get-alternative-plans',
  async (event, request: { projectId: string; includeArchived?: boolean }) => {
    console.log('[IPC] ai:get-alternative-plans called', request);

    try {
      const { getAlternativePlans } = await import('./storage');
      const plans = await getAlternativePlans(request.projectId, request.includeArchived !== false);

      return { plans };
    } catch (error: any) {
      console.error('[IPC] Error getting alternative plans:', error);
      throw new Error(`Failed to get alternative plans: ${error.message}`);
    }
  }
);

/**
 * T133: Get active plan for a project
 * Channel: 'ai:get-active-plan'
 */
ipcMain.handle('ai:get-active-plan', async (event, projectId: string) => {
  console.log('[IPC] ai:get-active-plan called', { projectId });

  try {
    const { getActivePlanForProject } = await import('./storage');
    const plan = await getActivePlanForProject(projectId);

    console.log('[IPC] Active plan retrieved:', {
      found: !!plan,
      planId: plan?.id,
      approved: plan?.approvedByUser,
    });

    return { plan };
  } catch (error: any) {
    console.error('[IPC] Error getting active plan:', error);
    throw new Error(`Failed to get active plan: ${error.message}`);
  }
});

/**
 * T133: Archive a subdivision plan
 * Channel: 'ai:archive-plan'
 */
ipcMain.handle('ai:archive-plan', async (event, planId: string) => {
  console.log('[IPC] ai:archive-plan called', { planId });

  try {
    const { archiveAISubdivisionPlan } = await import('./storage');
    await archiveAISubdivisionPlan(planId);

    return { success: true };
  } catch (error: any) {
    console.error('[IPC] Error archiving plan:', error);
    return {
      success: false,
      errorMessage: error.message || 'Failed to archive plan',
    };
  }
});

logger.info('IPC handlers registered successfully');
/**
 * AI Social Club Image Generation
 * Channel: 'ai:generate-social-club-image'
 */
ipcMain.handle(
  'ai:generate-social-club-image',
  async (
    event,
    request: {
      projectId: string;
      scenarioId: string;
      prompt: string;
      amenities: any[];
      socialClubArea: number;
      storageType: string;
      maintenanceRoomSize: number;
    }
  ) => {
    console.log('[IPC] ai:generate-social-club-image called', {
      projectId: request.projectId,
      amenitiesCount: request.amenities.length,
      socialClubArea: request.socialClubArea,
    });

    try {
      const { generateImageWithGemini, generateImageWithDALLE } = await import(
        './ai-services/image-client'
      );
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');

      // Try Gemini first, fallback to DALL-E
      let imageResult: { buffer: Buffer; format: string; extension: string } | null = null;
      let usedProvider = 'gemini';

      try {
        console.log('[Social Club] Generating image with Gemini...');
        imageResult = await generateImageWithGemini(request.prompt);
      } catch (geminiError: any) {
        console.warn('[Social Club] Gemini failed, trying DALL-E:', geminiError.message);
        try {
          imageResult = await generateImageWithDALLE(request.prompt);
          usedProvider = 'dall-e';
        } catch (dalleError: any) {
          console.error('[Social Club] DALL-E also failed:', dalleError.message);
          throw new Error('Both Gemini and DALL-E failed to generate image');
        }
      }

      if (!imageResult) {
        throw new Error('No image generated');
      }

      // Generate filename with correct extension
      const timestamp = Date.now();
      const imageId = crypto.randomUUID();
      const filename = `social-club-${timestamp}-${imageId}.${imageResult.extension}`;

      // Use project-data directory (same as subdivision images)
      const imagesDir = path.join(
        'D:\\fast2ai\\AI-Floorplan\\project-data',
        request.projectId,
        'images',
        'social-club'
      );

      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      const imagePath = path.join(imagesDir, filename);

      // Save image to file system
      fs.writeFileSync(imagePath, imageResult.buffer);
      console.log('[Social Club] Image saved to:', imagePath);

      // Store metadata in database
      const db = getDatabase();
      const socialClubImageId = crypto.randomUUID();

      db.prepare(
        `
        INSERT INTO social_club_images (
          id, project_id, scenario_id, image_path, format, prompt, amenities_json,
          social_club_area, storage_type, maintenance_room_size,
          ai_provider, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        socialClubImageId,
        request.projectId,
        request.scenarioId,
        imagePath,
        imageResult.format,
        request.prompt,
        JSON.stringify(request.amenities),
        request.socialClubArea,
        request.storageType,
        request.maintenanceRoomSize,
        usedProvider,
        new Date().toISOString()
      );

      return {
        success: true,
        imagePath,
        imageId: socialClubImageId,
        provider: usedProvider,
        format: imageResult.format,
      };
    } catch (error: any) {
      console.error('[IPC] Error generating social club image:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate social club image',
      };
    }
  }
);
