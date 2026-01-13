/**
 * Database Storage Layer
 * Initializes and manages SQLite database for Micro Villas Investment Platform
 */

import Database from 'better-sqlite3';
import path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import dbSchema from './db-schema.sql?raw';
import aiTablesMigration from './migrations/002-ai-tables.sql?raw';
import socialClubImagesMigration from './migrations/003-social-club-images.sql?raw';
import removeScenarioFkMigration from './migrations/004-remove-scenario-fk.sql?raw';

const DB_NAME = 'microvillas.db';

let dbInstance: Database.Database | null = null;

/**
 * Initialize SQLite database with schema
 * Creates database file in user data directory on first launch
 */
export function initializeDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.join(app.getPath('userData'), 'microvillas.db');
  const db = new Database(dbPath, { verbose: console.log });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Check if database needs initialization
  let needsInitialization = false;
  try {
    const versionCheck = db
      .prepare("SELECT value FROM app_metadata WHERE key = 'schema_version'")
      .get();

    if (!versionCheck) {
      needsInitialization = true;
    }
  } catch (error) {
    // Table doesn't exist - first launch
    needsInitialization = true;
  }

  if (needsInitialization) {
    // First launch - initialize database with base schema
    db.exec(dbSchema);
    console.log('[Database] Base schema initialized successfully');

    // Run AI tables migration immediately for new databases
    console.log('[Database] Running migration 002: AI tables...');
    db.exec(aiTablesMigration);
    console.log('[Database] Migration 002 completed successfully');

    // Run social club images migration for new databases
    console.log('[Database] Running migration 003: Social club images...');
    db.exec(socialClubImagesMigration);
    console.log('[Database] Migration 003 completed successfully');

    // Run remove scenario FK migration for new databases
    console.log('[Database] Running migration 004: Remove scenario FK constraint...');
    db.exec(removeScenarioFkMigration);
    console.log('[Database] Migration 004 completed successfully');
  } else {
    // Check if migration is needed for existing databases
    const currentVersion = db
      .prepare("SELECT value FROM app_metadata WHERE key = 'schema_version'")
      .get() as { value: string } | undefined;

    // Also check if AI tables exist (safety check)
    const aiTablesExist = db
      .prepare(
        `
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='ai_subdivision_plans'
    `
      )
      .get();

    if ((currentVersion && currentVersion.value === '1.0.0') || !aiTablesExist) {
      // Run migration 002 (AI tables)
      console.log('[Database] Running migration 002: AI tables...');
      db.exec(aiTablesMigration);
      console.log('[Database] Migration 002 completed successfully');
    }

    // Check if social club images table exists and has correct schema
    const socialClubImagesTableExists = db
      .prepare(
        `
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='social_club_images'
    `
      )
      .get();

    if (!socialClubImagesTableExists) {
      // Run migration 003 (Social club images)
      console.log('[Database] Running migration 003: Social club images...');
      db.exec(socialClubImagesMigration);
      console.log('[Database] Migration 003 completed successfully');
    } else {
      // Check if the table has the 'format' column (migration 003 schema check)
      const tableInfo = db.prepare('PRAGMA table_info(social_club_images)').all() as Array<{
        name: string;
      }>;
      const hasFormatColumn = tableInfo.some((col) => col.name === 'format');

      if (!hasFormatColumn) {
        console.log('[Database] Updating social_club_images table schema...');
        // Drop and recreate table with correct schema
        db.exec('DROP TABLE IF EXISTS social_club_images');
        db.exec(socialClubImagesMigration);
        console.log('[Database] Migration 003 schema update completed successfully');
      }
    }

    // Check if social_club_designs table needs migration 004 (remove scenario FK)
    const socialClubDesignsTableExists = db
      .prepare(
        `
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='social_club_designs'
    `
      )
      .get();

    if (socialClubDesignsTableExists) {
      // Check if the table still has the foreign key constraint
      // We can check by looking at the foreign_key_list
      const fkList = db
        .prepare('PRAGMA foreign_key_list(social_club_designs)')
        .all() as Array<{
          table: string;
          from: string;
        }>;

      const hasScenarioFk = fkList.some(
        (fk) => fk.table === 'subdivision_scenarios' && fk.from === 'scenario_id'
      );

      if (hasScenarioFk) {
        console.log('[Database] Running migration 004: Remove scenario FK constraint...');
        db.exec(removeScenarioFkMigration);
        console.log('[Database] Migration 004 completed successfully');
      }
    }
  }

  console.log('[Database] Location:', dbPath);
  dbInstance = db;
  return db;
}

/**
 * Get database instance (singleton pattern)
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initializeDatabase();
  }
  return dbInstance;
}

export default getDatabase;

// ============================================================================
// AI SUBDIVISION PLANS CRUD OPERATIONS
// ============================================================================

export interface CreateAISubdivisionPlanInput {
  projectId: string;
  landParcelId: string;
  inputLandWidth: number;
  inputLandLength: number;
  inputLandArea: number;
  inputSocialClubPercent: number;
  inputTargetLotCount?: number;
  planJson: string;
  validationStatus: 'valid' | 'invalid' | 'warnings';
  validationErrors?: string;
  validationWarnings?: string;
  aiModel: string;
  aiModelVersion?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  generationTimeMs?: number;
}

/**
 * Helper function to normalize plan objects from database (snake_case -> camelCase)
 * This ensures consistency across the codebase
 */
function normalizePlanObject(row: any): any {
  if (!row) return null;

  return {
    ...row,
    // Convert boolean fields
    approvedByUser: Boolean(row.approved_by_user),
    isArchived: Boolean(row.is_archived),
    // Convert snake_case to camelCase for consistency
    planJson: row.plan_json,
    projectId: row.project_id,
    landParcelId: row.land_parcel_id,
    generationStatus: row.generation_status,
    validationStatus: row.validation_status,
    validationErrors: row.validation_errors,
    validationWarnings: row.validation_warnings,
    generatedAt: row.generated_at,
    approvedAt: row.approved_at,
    tokensUsed: row.tokens_used,
    generationTimeMs: row.generation_time_ms,
  };
}

export async function createAISubdivisionPlan(
  input: CreateAISubdivisionPlanInput
): Promise<string> {
  const db = getDatabase();
  const planId = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO ai_subdivision_plans (
      id, project_id, land_parcel_id, generated_at, generation_status,
      generation_time_ms, retry_count, input_land_width, input_land_length,
      input_land_area, input_social_club_percent, input_target_lot_count,
      ai_model, ai_model_version, prompt_tokens, completion_tokens, total_tokens,
      plan_json, validation_status, validation_errors, validation_warnings,
      approved_by_user, approved_at, rejection_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    planId,
    input.projectId,
    input.landParcelId,
    now,
    'completed',
    input.generationTimeMs || null,
    0,
    input.inputLandWidth,
    input.inputLandLength,
    input.inputLandArea,
    input.inputSocialClubPercent,
    input.inputTargetLotCount || null,
    input.aiModel,
    input.aiModelVersion || null,
    input.promptTokens || null,
    input.completionTokens || null,
    input.totalTokens || null,
    input.planJson,
    input.validationStatus,
    input.validationErrors || null,
    input.validationWarnings || null,
    0,
    null,
    null
  );

  return planId;
}

export async function getAISubdivisionPlanById(planId: string): Promise<any | null> {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM ai_subdivision_plans WHERE id = ?');
  const row = stmt.get(planId) as any;
  return normalizePlanObject(row);
}

export async function getAISubdivisionPlansByProject(
  projectId: string,
  limit?: number,
  offset?: number,
  includeRejected?: boolean
): Promise<any[]> {
  const db = getDatabase();

  let query = 'SELECT * FROM ai_subdivision_plans WHERE project_id = ?';
  const params: any[] = [projectId];

  if (!includeRejected) {
    query += ' AND generation_status != ?';
    params.push('rejected');
  }

  query += ' ORDER BY generated_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  if (offset) {
    query += ' OFFSET ?';
    params.push(offset);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];
  return rows.map(normalizePlanObject);
}

export async function approveAISubdivisionPlan(planId: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE ai_subdivision_plans
    SET approved_by_user = 1, approved_at = ?
    WHERE id = ?
  `);

  stmt.run(now, planId);
}

export async function rejectAISubdivisionPlan(planId: string, reason?: string): Promise<void> {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE ai_subdivision_plans
    SET generation_status = 'rejected', rejection_reason = ?
    WHERE id = ?
  `);

  stmt.run(reason || null, planId);
}

// ============================================================================
// PROJECT VISUALIZATIONS CRUD OPERATIONS
// ============================================================================

export interface CreateProjectVisualizationInput {
  projectId: string;
  aiSubdivisionPlanId?: string;
  viewType: 'site-plan' | 'aerial' | 'context' | 'custom';
  filename: string;
  format: 'jpeg' | 'png' | 'webp';
  sizeBytes: number;
  widthPixels: number;
  heightPixels: number;
  localPath: string;
  thumbnailPath?: string;
  aiModel: string;
  generationRequestId?: string;
  promptText: string;
  negativePromptText?: string;
  generationSeed?: number;
  caption?: string;
}

export async function createProjectVisualization(
  input: CreateProjectVisualizationInput
): Promise<string> {
  const db = getDatabase();
  const visualizationId = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO project_visualizations (
      id, project_id, ai_subdivision_plan_id, view_type, filename, format,
      size_bytes, width_pixels, height_pixels, local_path, thumbnail_path,
      generated_at, ai_model, generation_request_id, prompt_text,
      negative_prompt_text, generation_seed, caption, is_approved, is_final
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    visualizationId,
    input.projectId,
    input.aiSubdivisionPlanId || null,
    input.viewType,
    input.filename,
    input.format,
    input.sizeBytes,
    input.widthPixels,
    input.heightPixels,
    input.localPath,
    input.thumbnailPath || null,
    now,
    input.aiModel,
    input.generationRequestId || null,
    input.promptText,
    input.negativePromptText || null,
    input.generationSeed || null,
    input.caption || null,
    0,
    0
  );

  return visualizationId;
}

export async function getProjectVisualizationsByProject(projectId: string): Promise<any[]> {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT * FROM project_visualizations WHERE project_id = ? ORDER BY generated_at DESC'
  );
  return stmt.all(projectId) as any[];
}

export async function getProjectVisualizationsByPlanId(planId: string): Promise<any[]> {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT * FROM project_visualizations WHERE ai_subdivision_plan_id = ? ORDER BY generated_at DESC'
  );
  const rows = stmt.all(planId) as any[];

  // Map snake_case database columns to camelCase
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    aiSubdivisionPlanId: row.ai_subdivision_plan_id,
    viewType: row.view_type,
    filename: row.filename,
    format: row.format,
    sizeBytes: row.size_bytes,
    widthPixels: row.width_pixels,
    heightPixels: row.height_pixels,
    localPath: row.local_path,
    thumbnailPath: row.thumbnail_path,
    generatedAt: row.generated_at,
    aiModel: row.ai_model,
    generationRequestId: row.generation_request_id,
    promptText: row.prompt_text,
    negativePromptText: row.negative_prompt_text,
    generationSeed: row.generation_seed,
    caption: row.caption,
    isApproved: row.is_approved === 1,
    isFinal: row.is_final === 1,
  }));
}

// ============================================================================
// AI SETTINGS CRUD OPERATIONS
// ============================================================================

export interface AISettings {
  id: string;
  projectId?: string;
  subdivisionModel: string;
  imageModel: string;
  autoApproveValidPlans: boolean;
  maxAutoRetries: number;
  preferredLotAspectRatio?: number;
  preferredRoadLayout?: 'grid' | 'perimeter' | 'central-spine' | 'loop' | 'auto';
  imageStyle?: string;
  includeContextLandmarks: boolean;
  enableCostWarnings: boolean;
  maxCostPerSessionUsd?: number;
  geminiApiKeyEncrypted?: string;
  imageApiKeyEncrypted?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAISettings(projectId?: string): Promise<AISettings> {
  const db = getDatabase();

  const stmt = db.prepare('SELECT * FROM ai_settings WHERE project_id IS ?');
  let settings = stmt.get(projectId || null) as AISettings | undefined;

  if (!settings) {
    // Create default settings
    const settingsId = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO ai_settings (
        id, project_id, subdivision_model, image_model, auto_approve_valid_plans,
        max_auto_retries, preferred_lot_aspect_ratio, preferred_road_layout,
        image_style, include_context_landmarks, enable_cost_warnings,
        max_cost_per_session_usd, gemini_api_key_encrypted, image_api_key_encrypted,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      settingsId,
      projectId || null,
      'gemini-2.5-flash',
      'dall-e-3',
      0,
      3,
      null,
      null,
      null,
      1,
      1,
      null,
      null,
      null,
      now,
      now
    );

    settings = {
      id: settingsId,
      projectId,
      subdivisionModel: 'gemini-2.5-flash',
      imageModel: 'dall-e-3',
      autoApproveValidPlans: false,
      maxAutoRetries: 3,
      includeContextLandmarks: true,
      enableCostWarnings: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  return settings;
}

export async function updateAISettings(
  projectId: string | undefined,
  updates: Partial<Omit<AISettings, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
): Promise<AISettings> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Get existing settings or create new
  const existing = await getAISettings(projectId);

  // Build update query dynamically
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.subdivisionModel !== undefined) {
    fields.push('subdivision_model = ?');
    values.push(updates.subdivisionModel);
  }
  if (updates.imageModel !== undefined) {
    fields.push('image_model = ?');
    values.push(updates.imageModel);
  }
  if (updates.autoApproveValidPlans !== undefined) {
    fields.push('auto_approve_valid_plans = ?');
    values.push(updates.autoApproveValidPlans ? 1 : 0);
  }
  if (updates.maxAutoRetries !== undefined) {
    fields.push('max_auto_retries = ?');
    values.push(updates.maxAutoRetries);
  }
  if (updates.preferredLotAspectRatio !== undefined) {
    fields.push('preferred_lot_aspect_ratio = ?');
    values.push(updates.preferredLotAspectRatio);
  }
  if (updates.preferredRoadLayout !== undefined) {
    fields.push('preferred_road_layout = ?');
    values.push(updates.preferredRoadLayout);
  }
  if (updates.imageStyle !== undefined) {
    fields.push('image_style = ?');
    values.push(updates.imageStyle);
  }
  if (updates.includeContextLandmarks !== undefined) {
    fields.push('include_context_landmarks = ?');
    values.push(updates.includeContextLandmarks ? 1 : 0);
  }
  if (updates.enableCostWarnings !== undefined) {
    fields.push('enable_cost_warnings = ?');
    values.push(updates.enableCostWarnings ? 1 : 0);
  }
  if (updates.maxCostPerSessionUsd !== undefined) {
    fields.push('max_cost_per_session_usd = ?');
    values.push(updates.maxCostPerSessionUsd);
  }
  if ((updates as any).geminiApiKeyEncrypted !== undefined) {
    fields.push('gemini_api_key_encrypted = ?');
    values.push((updates as any).geminiApiKeyEncrypted);
  }
  if ((updates as any).imageApiKeyEncrypted !== undefined) {
    fields.push('image_api_key_encrypted = ?');
    values.push((updates as any).imageApiKeyEncrypted);
  }

  fields.push('updated_at = ?');
  values.push(now);

  values.push(existing.id);

  const stmt = db.prepare(`
    UPDATE ai_settings
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  return await getAISettings(projectId);
}

// ============================================================================
// SESSION COST TRACKING
// ============================================================================

export async function getSessionCost(projectId: string): Promise<{
  sessionStartDate: string;
  geminiCalls: number;
  imageCalls: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
}> {
  const db = getDatabase();

  // Get today's start
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sessionStart = today.toISOString();

  // Count Gemini calls
  const geminiStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(total_tokens) as tokens
    FROM ai_subdivision_plans
    WHERE project_id = ? AND generated_at >= ?
  `);
  const geminiResult = geminiStmt.get(projectId, sessionStart) as {
    count: number;
    tokens: number | null;
  };

  // Count image calls
  const imageStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM project_visualizations
    WHERE project_id = ? AND generated_at >= ?
  `);
  const imageResult = imageStmt.get(projectId, sessionStart) as { count: number };

  const totalTokens = geminiResult.tokens || 0;

  // Calculate cost
  const INPUT_COST = 0.1; // $0.10 per 1M input tokens
  const OUTPUT_COST = 0.4; // $0.40 per 1M output tokens
  const IMAGE_COST = 0.04; // $0.040 per image (1024x1024)

  const geminiCost =
    ((totalTokens * 0.7) / 1_000_000) * INPUT_COST +
    ((totalTokens * 0.3) / 1_000_000) * OUTPUT_COST;

  const imageCost = imageResult.count * IMAGE_COST;

  return {
    sessionStartDate: sessionStart,
    geminiCalls: geminiResult.count,
    imageCalls: imageResult.count,
    totalTokensUsed: totalTokens,
    estimatedCostUsd: geminiCost + imageCost,
  };
}

// ============================================================================
// PHASE 5: MULTI-PLAN COMPARISON - STORAGE OPERATIONS
// ============================================================================

/**
 * T129: Activate a subdivision plan (mark as active, deactivate others)
 * Ensures only one active plan per project
 */
export async function activateAISubdivisionPlan(planId: string, projectId: string): Promise<void> {
  const db = getDatabase();

  // Use transaction to ensure atomicity
  const transaction = db.transaction(() => {
    // T130: Deactivate all previously active plans for this project
    const deactivateStmt = db.prepare(`
      UPDATE ai_subdivision_plans
      SET approved_by_user = 0, approved_at = NULL
      WHERE project_id = ? AND approved_by_user = 1 AND id != ?
    `);
    deactivateStmt.run(projectId, planId);

    // Activate the selected plan
    const activateStmt = db.prepare(`
      UPDATE ai_subdivision_plans
      SET approved_by_user = 1, approved_at = ?
      WHERE id = ?
    `);
    const now = new Date().toISOString();
    activateStmt.run(now, planId);
  });

  transaction();
}

/**
 * T130: Archive a subdivision plan (mark as inactive)
 */
export async function archiveAISubdivisionPlan(planId: string): Promise<void> {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE ai_subdivision_plans
    SET approved_by_user = 0, approved_at = NULL
    WHERE id = ?
  `);

  stmt.run(planId);
}

/**
 * T131: Get all alternative plans for a project (approved + archived)
 * Used for comparison view
 */
export async function getAlternativePlans(
  projectId: string,
  includeArchived: boolean = true
): Promise<any[]> {
  const db = getDatabase();

  let query = `
    SELECT * FROM ai_subdivision_plans
    WHERE project_id = ?
      AND generation_status = 'completed'
      AND validation_status IN ('valid', 'warnings')
  `;

  const params: any[] = [projectId];

  if (!includeArchived) {
    query += ' AND approved_by_user = 1';
  }

  query += ' ORDER BY approved_by_user DESC, generated_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];
  return rows.map(normalizePlanObject);
}

/**
 * Get the currently active plan for a project
 */
export async function getActivePlanForProject(projectId: string): Promise<any | null> {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM ai_subdivision_plans
    WHERE project_id = ?
      AND approved_by_user = 1
      AND generation_status = 'completed'
    ORDER BY approved_at DESC
    LIMIT 1
  `);

  const row = stmt.get(projectId) as any;
  return normalizePlanObject(row);
}

/**
 * T105: Get archived plans (previously approved plans that were deactivated)
 * These are plans where approved_at is set but approved_by_user = 0
 */
export async function getArchivedPlans(projectId: string): Promise<any[]> {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM ai_subdivision_plans
    WHERE project_id = ?
      AND approved_by_user = 0
      AND approved_at IS NOT NULL
      AND generation_status = 'completed'
    ORDER BY approved_at DESC
  `);

  const rows = stmt.all(projectId) as any[];
  return rows.map(normalizePlanObject);
}

/**
 * T106: Switch to an archived plan (reactivate it)
 * This will deactivate the currently active plan and activate the archived one
 */
export async function switchToArchivedPlan(planId: string, projectId: string): Promise<void> {
  // Reuse the activateAISubdivisionPlan function which already handles deactivation
  return activateAISubdivisionPlan(planId, projectId);
}

/**
 * Get plan comparison metrics for multiple plans
 */
export async function getPlanComparisonData(planIds: string[]): Promise<any[]> {
  const db = getDatabase();

  if (planIds.length === 0) {
    return [];
  }

  const placeholders = planIds.map(() => '?').join(',');
  const query = `
    SELECT
      id,
      project_id,
      plan_json,
      validation_status,
      validation_warnings,
      approved_by_user,
      approved_at,
      total_tokens,
      generation_time_ms
    FROM ai_subdivision_plans
    WHERE id IN (${placeholders})
    ORDER BY approved_by_user DESC, generation_time_ms ASC
  `;

  const stmt = db.prepare(query);
  const rows = stmt.all(...planIds) as any[];
  return rows.map(normalizePlanObject);
}
