/**
 * Database Storage Layer
 * Initializes and manages SQLite database for Micro Villas Investment Platform
 */

import Database from 'better-sqlite3';
import path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import dbSchema from './db-schema.sql?raw';

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
    const versionCheck = db.prepare(
      "SELECT value FROM app_metadata WHERE key = 'schema_version'"
    ).get();

    if (!versionCheck) {
      needsInitialization = true;
    }
  } catch (error) {
    // Table doesn't exist - first launch
    needsInitialization = true;
  }

  if (needsInitialization) {
    // First launch - initialize database
    db.exec(dbSchema);
    console.log('[Database] Schema initialized successfully');
  } else {
    // Check if migration is needed
    const currentVersion = db.prepare(
      "SELECT value FROM app_metadata WHERE key = 'schema_version'"
    ).get() as { value: string } | undefined;

    if (currentVersion && currentVersion.value === '1.0.0') {
      // Run migration 002 (AI tables)
      console.log('[Database] Running migration 002: AI tables...');
      const migrationPath = path.join(__dirname, 'migrations', '002-ai-tables.sql');

      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
        db.exec(migrationSQL);
        console.log('[Database] Migration 002 completed successfully');
      } else {
        console.warn('[Database] Migration file not found:', migrationPath);
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

export async function createAISubdivisionPlan(input: CreateAISubdivisionPlanInput): Promise<string> {
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
  return stmt.get(planId) as any;
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
  return stmt.all(...params) as any[];
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

export async function createProjectVisualization(input: CreateProjectVisualizationInput): Promise<string> {
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
  const stmt = db.prepare('SELECT * FROM project_visualizations WHERE project_id = ? ORDER BY generated_at DESC');
  return stmt.all(projectId) as any[];
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
      updatedAt: now
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
  const geminiResult = geminiStmt.get(projectId, sessionStart) as { count: number; tokens: number | null };

  // Count image calls
  const imageStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM project_visualizations
    WHERE project_id = ? AND generated_at >= ?
  `);
  const imageResult = imageStmt.get(projectId, sessionStart) as { count: number };

  const totalTokens = geminiResult.tokens || 0;

  // Calculate cost
  const INPUT_COST = 0.10;  // $0.10 per 1M input tokens
  const OUTPUT_COST = 0.40; // $0.40 per 1M output tokens
  const IMAGE_COST = 0.040;  // $0.040 per image (1024x1024)

  const geminiCost =
    (totalTokens * 0.7 / 1_000_000) * INPUT_COST +
    (totalTokens * 0.3 / 1_000_000) * OUTPUT_COST;

  const imageCost = imageResult.count * IMAGE_COST;

  return {
    sessionStartDate: sessionStart,
    geminiCalls: geminiResult.count,
    imageCalls: imageResult.count,
    totalTokensUsed: totalTokens,
    estimatedCostUsd: geminiCost + imageCost
  };
}
