# Data Model Specification: AI-Assisted Subdivision Planning

**Feature Branch**: `001-ai-subdivision-planning`
**Version**: 1.0.0
**Last Updated**: 2026-01-12
**Status**: Implementation Complete

This document defines the complete data model for AI-assisted subdivision planning, including entity schemas, validation rules, state transitions, database schema, and TypeScript/Zod type definitions.

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Schemas](#entity-schemas)
3. [Validation Rules](#validation-rules)
4. [State Transitions](#state-transitions)
5. [Database Schema](#database-schema)
6. [TypeScript Type Definitions](#typescript-type-definitions)
7. [Relationships and Foreign Keys](#relationships-and-foreign-keys)
8. [Data Flow](#data-flow)

---

## Overview

The AI-assisted subdivision planning feature manages four primary entities:

1. **AISubdivisionPlan**: AI-generated subdivision layouts with validation and approval status
2. **SubdivisionLot**: Individual lot within a subdivision plan (embedded in plan JSON)
3. **ProjectVisualization**: AI-generated images linked to approved plans
4. **AIGenerationRequest**: Audit trail for all AI API calls

### Design Principles

- **Single Active Plan**: Only one approved subdivision plan per project at any time
- **Immutable Generation**: AI-generated plans are never modified, only approved/rejected
- **Audit Trail**: All AI API calls tracked for cost analysis and debugging
- **Offline-Capable Metadata**: All plan data stored in SQLite, images stored in file system
- **Type Safety**: Zod schemas validate all IPC communication and data persistence

---

## Entity Schemas

### 1. AISubdivisionPlan

Complete AI-generated subdivision plan with metadata, validation status, and user approval.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `projectId` | UUID | Yes | Foreign key to projects table |
| `landParcelId` | UUID | Yes | Foreign key to land_parcels table |
| `generatedAt` | ISO 8601 DateTime | Yes | Generation timestamp |
| `generationStatus` | Enum | Yes | `pending`, `completed`, `failed`, `rejected` |
| `generationTimeMs` | Integer | No | Performance tracking (milliseconds) |
| `retryCount` | Integer | Yes | Number of retries (default: 0) |
| `inputLandWidth` | Float | Yes | Input: land width in meters |
| `inputLandLength` | Float | Yes | Input: land length in meters |
| `inputLandArea` | Float | Yes | Input: total area in sqm |
| `inputSocialClubPercent` | Integer | Yes | Input: social club allocation (10-30%) |
| `inputTargetLotCount` | Integer | No | Optional guidance for lot count |
| `aiModel` | String | Yes | e.g., `gemini-3-flash-preview` |
| `aiModelVersion` | String | No | Model version for audit trail |
| `promptTokens` | Integer | No | Cost tracking: input tokens |
| `completionTokens` | Integer | No | Cost tracking: output tokens |
| `totalTokens` | Integer | No | Cost tracking: total tokens |
| `plan` | SubdivisionPlan | Yes | Full plan structure (see below) |
| `validationStatus` | Enum | Yes | `valid`, `invalid`, `warnings` |
| `validationErrors` | String[] | No | List of critical validation errors |
| `validationWarnings` | String[] | No | List of non-critical warnings |
| `approvedByUser` | Boolean | Yes | User approval flag (default: false) |
| `approvedAt` | ISO 8601 DateTime | No | Approval timestamp |
| `rejectionReason` | String | No | User-provided rejection feedback |

#### SubdivisionPlan Structure (Embedded)

```typescript
interface SubdivisionPlan {
  lotLayout: Lot[];
  roadConfiguration: RoadConfiguration;
  amenityAreas: AmenityArea[];
  metrics: SubdivisionMetrics;
}
```

---

### 2. SubdivisionLot (Embedded in AISubdivisionPlan)

Individual lot within a subdivision plan.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lotNumber` | Integer | Yes | Sequential lot identifier (1, 2, 3...) |
| `dimensions.widthMeters` | Float | Yes | Lot width in meters |
| `dimensions.lengthMeters` | Float | Yes | Lot length in meters |
| `dimensions.areaSqm` | Float | Yes | Calculated area (width × length) |
| `position.x` | Float | Yes | X coordinate in site plan (meters from origin) |
| `position.y` | Float | Yes | Y coordinate in site plan (meters from origin) |

#### Constraints

- `areaSqm >= 90`: Minimum lot size requirement (CRITICAL)
- `areaSqm == widthMeters * lengthMeters`: Area consistency check
- `widthMeters > 0 && lengthMeters > 0`: Positive dimensions
- Recommended aspect ratio: `0.75 <= widthMeters / lengthMeters <= 1.25`

---

### 3. RoadConfiguration (Embedded in AISubdivisionPlan)

Road network configuration within subdivision.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `widthMeters` | Float | Yes | Standard road width (typically 6-8m) |
| `totalAreaSqm` | Float | Yes | Total road coverage |
| `layout` | Enum | Yes | `grid`, `perimeter`, `central-spine`, `loop` |

#### Constraints

- `widthMeters >= 4.0 && widthMeters <= 12.0`: Practical road width range
- `totalAreaSqm < landParcelArea * 0.25`: Roads should not exceed 25% of total land

---

### 4. AmenityArea (Embedded in AISubdivisionPlan)

Amenity areas within subdivision (social club, parking, green spaces).

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | Enum | Yes | `social-club`, `parking`, `green-space`, `maintenance` |
| `areaSqm` | Float | Yes | Amenity area in sqm |
| `position.x` | Float | Yes | X coordinate in site plan |
| `position.y` | Float | Yes | Y coordinate in site plan |
| `description` | String | No | Optional description (e.g., "Central pool area") |

#### Constraints

- Social club area must match `inputSocialClubPercent` of total land (±5% tolerance)
- Total amenity area + road area + lot area <= total land area

---

### 5. SubdivisionMetrics (Embedded in AISubdivisionPlan)

Calculated metrics for subdivision plan quality.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `totalLots` | Integer | Yes | Total number of lots proposed |
| `viableLots` | Integer | Yes | Lots meeting 90 sqm minimum |
| `invalidLots` | Integer[] | Yes | Lot numbers below 90 sqm |
| `averageLotSizeSqm` | Float | Yes | Mean lot size |
| `landUtilizationPercent` | Float | Yes | (Viable lot area / total land) * 100 |

#### Constraints

- `viableLots + invalidLots.length == totalLots`: Count consistency
- `landUtilizationPercent >= 40.0 && landUtilizationPercent <= 75.0`: Reasonable utilization

---

### 6. ProjectVisualization

AI-generated image asset linked to approved subdivision plan.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `projectId` | UUID | Yes | Foreign key to projects table |
| `aiSubdivisionPlanId` | UUID | No | Optional link to AI plan |
| `viewType` | Enum | Yes | `site-plan`, `aerial`, `context`, `custom` |
| `filename` | String | Yes | e.g., `project-site-plan-1736697600000.png` |
| `format` | Enum | Yes | `jpeg`, `png`, `webp` |
| `sizeBytes` | Integer | Yes | File size for storage tracking |
| `widthPixels` | Integer | Yes | Image width (e.g., 1024) |
| `heightPixels` | Integer | Yes | Image height (e.g., 1024) |
| `localPath` | String | Yes | Absolute path to image file |
| `thumbnailPath` | String | No | Optional thumbnail path |
| `generatedAt` | ISO 8601 DateTime | Yes | Generation timestamp |
| `aiModel` | String | Yes | e.g., `gemini-3-pro-image-preview`, `dall-e-3` |
| `generationRequestId` | UUID | No | Links to AIGenerationRequest |
| `promptText` | String | Yes | Full prompt used for generation |
| `negativePromptText` | String | No | Negative prompt (if supported) |
| `generationSeed` | Integer | No | Random seed for reproducibility |
| `caption` | String | No | User-added caption |
| `isApproved` | Boolean | Yes | User approval flag (default: false) |
| `isFinal` | Boolean | Yes | Marked as final for export (default: false) |

#### Constraints

- `sizeBytes > 0`: Non-empty file
- `widthPixels > 0 && heightPixels > 0`: Valid dimensions
- `localPath` must be absolute path (validated in code, not DB)

---

### 7. AIGenerationRequest (Audit Trail)

Complete audit trail for all AI API calls.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `projectId` | UUID | Yes | Foreign key to projects table |
| `requestType` | Enum | Yes | `subdivision-plan`, `site-plan-image`, `aerial-image`, `context-image` |
| `requestedAt` | ISO 8601 DateTime | Yes | Request start time |
| `completedAt` | ISO 8601 DateTime | No | Request completion time |
| `durationMs` | Integer | No | Total duration in milliseconds |
| `apiService` | String | Yes | e.g., `gemini`, `dalle-3`, `stability-ai` |
| `apiEndpoint` | String | Yes | Full API endpoint URL |
| `apiModel` | String | Yes | Model identifier |
| `requestParams` | JSON | Yes | Full input parameters (for debugging) |
| `responseData` | JSON | No | Full API response (if successful) |
| `status` | Enum | Yes | `pending`, `success`, `failed`, `retried` |
| `errorCode` | String | No | HTTP error code or API error code |
| `errorMessage` | String | No | Error message for failures |
| `retryOfRequestId` | UUID | No | Links to original request if retry |
| `tokensUsed` | Integer | No | Total tokens consumed |
| `estimatedCostUsd` | Float | No | Estimated cost in USD |

#### Constraints

- If `status == 'success'`, `completedAt` and `responseData` must be set
- If `status == 'failed'`, `errorMessage` must be set
- If `status == 'retried'`, `retryOfRequestId` must link to original request

---

## Validation Rules

### Critical Validation (Blocks Plan Approval)

1. **Minimum Lot Size**: Every lot MUST be >= 90 sqm
   - Validation: `lot.dimensions.areaSqm >= 90.0`
   - Error: `"Lot {lotNumber} is {areaSqm} sqm, below minimum 90 sqm"`

2. **Area Consistency**: Lot area MUST match width × length (±1% tolerance)
   - Validation: `Math.abs(areaSqm - (width * length)) <= areaSqm * 0.01`
   - Error: `"Lot {lotNumber} area mismatch: {areaSqm} sqm != {width}m × {length}m"`

3. **Total Coverage**: Lots + roads + amenities MUST NOT exceed total land area
   - Validation: `sumLotAreas + roadArea + amenityAreas <= landArea * 1.02`
   - Error: `"Total coverage {coverage} sqm exceeds land area {landArea} sqm"`

4. **Social Club Allocation**: Social club area MUST match input percentage (±5% tolerance)
   - Validation: `Math.abs(socialClubArea - (landArea * socialClubPercent / 100)) <= landArea * 0.05`
   - Error: `"Social club area {socialClubArea} sqm does not match {socialClubPercent}% of land"`

### Warning Validation (Non-Blocking)

1. **Lot Aspect Ratio**: Lots should have reasonable aspect ratios (0.75 to 1.25)
   - Validation: `0.75 <= (width / length) <= 1.25`
   - Warning: `"Lot {lotNumber} has extreme aspect ratio: {width}m × {length}m"`

2. **Land Utilization**: Viable lot coverage should be 40-75%
   - Validation: `40.0 <= landUtilizationPercent <= 75.0`
   - Warning: `"Land utilization {landUtilizationPercent}% is {below/above} recommended range"`

3. **Road Coverage**: Roads should be <20% of total land
   - Validation: `(roadArea / landArea) * 100 < 20.0`
   - Warning: `"Road coverage {roadPercent}% exceeds recommended maximum 20%"`

### State Validation

- Plan can only be approved if `validationStatus == 'valid'` or `validationStatus == 'warnings'`
- Plan with `validationStatus == 'invalid'` cannot be approved (must be rejected or regenerated)
- Only one plan per project can have `approvedByUser == true` at a time

---

## State Transitions

### AISubdivisionPlan State Machine

```
[PENDING] → Initial state after creation
    ↓
[COMPLETED] → AI generation successful
    ↓
    ├─→ [APPROVED] → User approves plan (approvedByUser = true)
    │       ↓
    │   [ACTIVE] → Only one active plan per project
    │       ↓
    │   [ARCHIVED] → New plan approved, this becomes archived
    │
    ├─→ [REJECTED] → User rejects plan (generationStatus = 'rejected')
    │
    └─→ [FAILED] → AI generation failed

State Transitions:
- pending → completed: AI generation succeeds
- pending → failed: AI generation fails after retries
- completed → approved: User clicks "Approve Plan" button
- completed → rejected: User clicks "Reject Plan" button
- approved → archived: New plan approved for same project
```

### Allowed Transitions

| From State | To State | Trigger | Validation |
|------------|----------|---------|------------|
| `pending` | `completed` | AI API success | `plan` JSON populated |
| `pending` | `failed` | AI API failure | `errorMessage` set |
| `completed` | `approved` | User approval | `validationStatus != 'invalid'` |
| `completed` | `rejected` | User rejection | None |
| `approved` | `archived` | New plan approved | Automatic via `activateAISubdivisionPlan()` |

### Immutability Rules

- Once a plan reaches `completed`, its `plan` JSON MUST NOT be modified
- Approved plans remain approved even when archived (for comparison feature)
- Rejected plans can be deleted but typically remain for audit trail

---

## Database Schema

### SQLite CREATE TABLE Statements

```sql
-- ============================================================================
-- AI SUBDIVISION PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_subdivision_plans (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    land_parcel_id TEXT NOT NULL,

    -- Generation metadata
    generated_at TEXT NOT NULL, -- ISO 8601
    generation_status TEXT NOT NULL CHECK(generation_status IN ('pending', 'completed', 'failed', 'rejected')),
    generation_time_ms INTEGER,
    retry_count INTEGER NOT NULL DEFAULT 0,

    -- Input parameters (for regeneration)
    input_land_width REAL NOT NULL,
    input_land_length REAL NOT NULL,
    input_land_area REAL NOT NULL,
    input_social_club_percent INTEGER NOT NULL,
    input_target_lot_count INTEGER,

    -- AI model metadata
    ai_model TEXT NOT NULL,
    ai_model_version TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,

    -- Generated plan (JSON blob)
    plan_json TEXT NOT NULL,

    -- Validation results
    validation_status TEXT NOT NULL CHECK(validation_status IN ('valid', 'invalid', 'warnings')),
    validation_errors TEXT, -- JSON array of error strings
    validation_warnings TEXT, -- JSON array of warning strings

    -- User actions
    approved_by_user INTEGER NOT NULL DEFAULT 0, -- Boolean: 0/1
    approved_at TEXT,
    rejection_reason TEXT,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (land_parcel_id) REFERENCES land_parcels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_plans_project ON ai_subdivision_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_plans_status ON ai_subdivision_plans(generation_status);
CREATE INDEX IF NOT EXISTS idx_ai_plans_approved ON ai_subdivision_plans(approved_by_user, project_id);

-- ============================================================================
-- PROJECT VISUALIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_visualizations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    ai_subdivision_plan_id TEXT,

    -- Image metadata
    view_type TEXT NOT NULL CHECK(view_type IN ('site-plan', 'aerial', 'context', 'custom')),
    filename TEXT NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('jpeg', 'png', 'webp')),
    size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
    width_pixels INTEGER NOT NULL CHECK(width_pixels > 0),
    height_pixels INTEGER NOT NULL CHECK(height_pixels > 0),
    local_path TEXT NOT NULL,
    thumbnail_path TEXT,

    -- Generation metadata
    generated_at TEXT NOT NULL,
    ai_model TEXT NOT NULL,
    generation_request_id TEXT,

    -- Prompt used
    prompt_text TEXT NOT NULL,
    negative_prompt_text TEXT,
    generation_seed INTEGER,

    -- User annotations
    caption TEXT,
    is_approved INTEGER NOT NULL DEFAULT 0,
    is_final INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (ai_subdivision_plan_id) REFERENCES ai_subdivision_plans(id) ON DELETE SET NULL,
    FOREIGN KEY (generation_request_id) REFERENCES ai_generation_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_visualizations_project ON project_visualizations(project_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_plan ON project_visualizations(ai_subdivision_plan_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_view_type ON project_visualizations(view_type);

-- ============================================================================
-- AI GENERATION REQUESTS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_generation_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,

    -- Request metadata
    request_type TEXT NOT NULL CHECK(request_type IN ('subdivision-plan', 'site-plan-image', 'aerial-image', 'context-image')),
    requested_at TEXT NOT NULL,
    completed_at TEXT,
    duration_ms INTEGER,

    -- API details
    api_service TEXT NOT NULL,
    api_endpoint TEXT NOT NULL,
    api_model TEXT NOT NULL,

    -- Request/response
    request_params TEXT NOT NULL, -- JSON blob
    response_data TEXT, -- JSON blob

    -- Status
    status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failed', 'retried')),
    error_code TEXT,
    error_message TEXT,
    retry_of_request_id TEXT,

    -- Cost tracking
    tokens_used INTEGER,
    estimated_cost_usd REAL,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (retry_of_request_id) REFERENCES ai_generation_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_project ON ai_generation_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_type ON ai_generation_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_generation_requests(status);
```

---

## TypeScript Type Definitions

### Zod Schemas (with Runtime Validation)

```typescript
import { z } from 'zod';

// ============================================================================
// SUBDIVISION PLAN TYPES
// ============================================================================

export const LotSchema = z.object({
  lotNumber: z.number().int().positive(),
  dimensions: z.object({
    widthMeters: z.number().positive(),
    lengthMeters: z.number().positive(),
    areaSqm: z.number().positive().refine(
      (area) => area >= 90.0,
      { message: "Lot area must be at least 90 sqm" }
    )
  }),
  position: z.object({
    x: z.number(),
    y: z.number()
  })
});

export const RoadConfigurationSchema = z.object({
  widthMeters: z.number().min(4.0).max(12.0),
  totalAreaSqm: z.number().positive(),
  layout: z.enum(['grid', 'perimeter', 'central-spine', 'loop'])
});

export const AmenityAreaSchema = z.object({
  type: z.enum(['social-club', 'parking', 'green-space', 'maintenance']),
  areaSqm: z.number().positive(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  description: z.string().optional()
});

export const SubdivisionMetricsSchema = z.object({
  totalLots: z.number().int().nonnegative(),
  viableLots: z.number().int().nonnegative(),
  invalidLots: z.array(z.number().int()),
  averageLotSizeSqm: z.number().positive(),
  landUtilizationPercent: z.number().min(0).max(100)
});

export const SubdivisionPlanSchema = z.object({
  lotLayout: z.array(LotSchema),
  roadConfiguration: RoadConfigurationSchema,
  amenityAreas: z.array(AmenityAreaSchema),
  metrics: SubdivisionMetricsSchema
});

// ============================================================================
// AI SUBDIVISION PLAN (Full Entity)
// ============================================================================

export const AISubdivisionPlanSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  landParcelId: z.string().uuid(),

  generatedAt: z.string().datetime(),
  generationStatus: z.enum(['pending', 'completed', 'failed', 'rejected']),
  generationTimeMs: z.number().int().positive().optional(),
  retryCount: z.number().int().nonnegative(),

  inputLandWidth: z.number().positive(),
  inputLandLength: z.number().positive(),
  inputLandArea: z.number().positive(),
  inputSocialClubPercent: z.number().int().min(10).max(30),
  inputTargetLotCount: z.number().int().positive().optional(),

  aiModel: z.string(),
  aiModelVersion: z.string().optional(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),

  plan: SubdivisionPlanSchema,

  validationStatus: z.enum(['valid', 'invalid', 'warnings']),
  validationErrors: z.array(z.string()).optional(),
  validationWarnings: z.array(z.string()).optional(),

  approvedByUser: z.boolean(),
  approvedAt: z.string().datetime().optional(),
  rejectionReason: z.string().optional()
});

export type AISubdivisionPlan = z.infer<typeof AISubdivisionPlanSchema>;
export type SubdivisionPlan = z.infer<typeof SubdivisionPlanSchema>;
export type Lot = z.infer<typeof LotSchema>;
export type RoadConfiguration = z.infer<typeof RoadConfigurationSchema>;
export type AmenityArea = z.infer<typeof AmenityAreaSchema>;
export type SubdivisionMetrics = z.infer<typeof SubdivisionMetricsSchema>;

// ============================================================================
// PROJECT VISUALIZATION
// ============================================================================

export const ProjectVisualizationSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  aiSubdivisionPlanId: z.string().uuid().optional(),

  viewType: z.enum(['site-plan', 'aerial', 'context', 'custom']),
  filename: z.string(),
  format: z.enum(['jpeg', 'png', 'webp']),
  sizeBytes: z.number().int().positive(),
  widthPixels: z.number().int().positive(),
  heightPixels: z.number().int().positive(),
  localPath: z.string(),
  thumbnailPath: z.string().optional(),

  generatedAt: z.string().datetime(),
  aiModel: z.string(),
  generationRequestId: z.string().uuid().optional(),

  promptText: z.string(),
  negativePromptText: z.string().optional(),
  generationSeed: z.number().int().optional(),

  caption: z.string().optional(),
  isApproved: z.boolean(),
  isFinal: z.boolean()
});

export type ProjectVisualization = z.infer<typeof ProjectVisualizationSchema>;

// ============================================================================
// AI GENERATION REQUEST
// ============================================================================

export const AIGenerationRequestSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),

  requestType: z.enum(['subdivision-plan', 'site-plan-image', 'aerial-image', 'context-image']),
  requestedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  durationMs: z.number().int().positive().optional(),

  apiService: z.string(),
  apiEndpoint: z.string().url(),
  apiModel: z.string(),

  requestParams: z.record(z.unknown()),
  responseData: z.record(z.unknown()).optional(),

  status: z.enum(['pending', 'success', 'failed', 'retried']),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  retryOfRequestId: z.string().uuid().optional(),

  tokensUsed: z.number().int().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().optional()
});

export type AIGenerationRequest = z.infer<typeof AIGenerationRequestSchema>;
```

---

## Relationships and Foreign Keys

### Entity Relationship Diagram

```
projects (1) ─────┬──── (N) ai_subdivision_plans
                  │
                  ├──── (N) project_visualizations
                  │
                  └──── (N) ai_generation_requests

land_parcels (1) ─────── (N) ai_subdivision_plans

ai_subdivision_plans (1) ─── (N) project_visualizations
                        (optional relationship)

ai_generation_requests (1) ─── (N) project_visualizations
                          (optional relationship)

ai_generation_requests (1) ─── (N) ai_generation_requests
                          (retry chain)
```

### Foreign Key Cascade Behavior

| Foreign Key | ON DELETE | Rationale |
|-------------|-----------|-----------|
| `ai_subdivision_plans.project_id → projects.id` | CASCADE | Delete all plans when project deleted |
| `ai_subdivision_plans.land_parcel_id → land_parcels.id` | CASCADE | Delete plans when land parcel deleted |
| `project_visualizations.project_id → projects.id` | CASCADE | Delete images when project deleted |
| `project_visualizations.ai_subdivision_plan_id → ai_subdivision_plans.id` | SET NULL | Preserve images even if plan deleted (archival) |
| `project_visualizations.generation_request_id → ai_generation_requests.id` | SET NULL | Preserve images even if request audit deleted |
| `ai_generation_requests.retry_of_request_id → ai_generation_requests.id` | SET NULL | Break retry chain gracefully |

### Single Active Plan Enforcement

Only one plan per project can have `approved_by_user = 1` at any time. This is enforced via transaction-based logic:

```typescript
// In src/main/storage.ts
export async function activateAISubdivisionPlan(planId: string, projectId: string): Promise<void> {
  const db = getDatabase();

  const transaction = db.transaction(() => {
    // Deactivate all other plans
    db.prepare(`
      UPDATE ai_subdivision_plans
      SET approved_by_user = 0, approved_at = NULL
      WHERE project_id = ? AND approved_by_user = 1 AND id != ?
    `).run(projectId, planId);

    // Activate selected plan
    db.prepare(`
      UPDATE ai_subdivision_plans
      SET approved_by_user = 1, approved_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), planId);
  });

  transaction();
}
```

---

## Data Flow

### Subdivision Plan Generation Flow

```
1. User Input (Renderer)
   ↓
2. IPC Request: ai:generate-subdivision-plan
   ↓
3. Main Process: Validate request (Zod)
   ↓
4. Create AIGenerationRequest (status: pending)
   ↓
5. Call Gemini API with retry logic
   ↓
6. Receive structured JSON response
   ↓
7. Validate plan (90 sqm minimum, coverage)
   ↓
8. Create AISubdivisionPlan (status: completed)
   ↓
9. Update AIGenerationRequest (status: success)
   ↓
10. Return IPC Response with plan
    ↓
11. Renderer displays plan for approval
```

### Image Generation Flow

```
1. User Approves Plan (Renderer)
   ↓
2. IPC Request: ai:approve-plan
   ↓
3. Main Process: activateAISubdivisionPlan()
   ↓
4. User Clicks "Generate Images" (Renderer)
   ↓
5. IPC Request: ai:generate-site-plan-image
   ↓
6. Main Process: Validate approved plan exists
   ↓
7. Create AIGenerationRequest (status: pending)
   ↓
8. Call Image API (Gemini/DALL-E)
   ↓
9. Save image to userData/project-images/{projectId}/
   ↓
10. Create ProjectVisualization record
    ↓
11. Update AIGenerationRequest (status: success)
    ↓
12. Return IPC Response with image path
    ↓
13. Renderer displays generated image
```

### Session Persistence Flow

```
App Launch:
1. initializeDatabase() runs migration if needed
2. Load active project from last session
3. Query: SELECT * FROM ai_subdivision_plans WHERE project_id = ? AND approved_by_user = 1
4. If approved plan exists:
   a. Load plan JSON
   b. Query: SELECT * FROM project_visualizations WHERE ai_subdivision_plan_id = ?
   c. Load images from local_path
   d. Display plan + images without regeneration
```

---

## Versioning and Migration

### Schema Version: 1.1.0

- **Base Schema (1.0.0)**: Core tables (projects, land_parcels)
- **Migration 002 (1.1.0)**: Added AI tables (ai_subdivision_plans, project_visualizations, ai_generation_requests, ai_settings)

### Future Migrations

When schema changes are needed:

1. Create new SQL file: `src/main/migrations/003-{description}.sql`
2. Update schema version in migration
3. Add conditional logic to `initializeDatabase()` in `src/main/storage.ts`
4. Run migration automatically on first launch after update

---

## Summary

This data model provides:

- **Type Safety**: Zod schemas validate all data at runtime
- **Data Integrity**: Foreign keys with CASCADE/SET NULL ensure consistency
- **Audit Trail**: All AI calls logged for cost tracking and debugging
- **State Management**: Clear state transitions with validation rules
- **Single Active Plan**: Transaction-based enforcement
- **Offline Persistence**: 100% data fidelity across sessions

All entities are fully implemented in `src/main/storage.ts`, `src/shared/ai-contracts.ts`, and `src/renderer/models/`.

---

**Document Version**: 1.0.0
**Reviewed By**: Claude Sonnet 4.5
**Implementation Status**: Complete
