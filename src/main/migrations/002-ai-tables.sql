-- ============================================================================
-- Migration 002: Add AI Subdivision Planning Tables
-- Version: 1.1.0
-- Date: 2026-01-11
-- Description: Adds database tables for AI-powered subdivision planning,
--              image generation, and user preferences
-- ============================================================================

-- ============================================================================
-- AI SUBDIVISION PLANS TABLE
-- Stores AI-generated subdivision layouts (before user approval)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_subdivision_plans (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    land_parcel_id TEXT NOT NULL,

    -- Generation metadata
    generated_at TEXT NOT NULL, -- ISO 8601
    generation_status TEXT NOT NULL CHECK(generation_status IN ('pending', 'completed', 'failed', 'rejected')),
    generation_time_ms INTEGER, -- Performance tracking
    retry_count INTEGER NOT NULL DEFAULT 0,

    -- Input parameters (for regeneration)
    input_land_width REAL NOT NULL,
    input_land_length REAL NOT NULL,
    input_land_area REAL NOT NULL,
    input_social_club_percent INTEGER NOT NULL,
    input_target_lot_count INTEGER, -- Optional

    -- AI model metadata
    ai_model TEXT NOT NULL, -- e.g., 'gemini-2.5-flash'
    ai_model_version TEXT,
    prompt_tokens INTEGER, -- For cost tracking
    completion_tokens INTEGER,
    total_tokens INTEGER,

    -- Generated plan (JSON blob)
    plan_json TEXT NOT NULL, -- Full SubdivisionPlan JSON

    -- Validation results
    validation_status TEXT NOT NULL CHECK(validation_status IN ('valid', 'invalid', 'warnings')),
    validation_errors TEXT, -- JSON array of error strings
    validation_warnings TEXT, -- JSON array of warning strings

    -- User actions
    approved_by_user INTEGER NOT NULL DEFAULT 0, -- Boolean: 0/1
    approved_at TEXT, -- ISO 8601
    rejection_reason TEXT,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (land_parcel_id) REFERENCES land_parcels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_plans_project ON ai_subdivision_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_plans_status ON ai_subdivision_plans(generation_status);
CREATE INDEX IF NOT EXISTS idx_ai_plans_approved ON ai_subdivision_plans(approved_by_user, project_id);

-- ============================================================================
-- AI GENERATION REQUESTS TABLE
-- Audit trail for all AI API calls (for debugging and cost tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_generation_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,

    -- Request metadata
    request_type TEXT NOT NULL CHECK(request_type IN ('subdivision-plan', 'site-plan-image', 'aerial-image', 'context-image')),
    requested_at TEXT NOT NULL, -- ISO 8601
    completed_at TEXT, -- ISO 8601
    duration_ms INTEGER,

    -- API details
    api_service TEXT NOT NULL, -- e.g., 'gemini', 'dalle-3', 'stability-ai'
    api_endpoint TEXT NOT NULL,
    api_model TEXT NOT NULL,

    -- Request/response
    request_params TEXT NOT NULL, -- JSON blob of input parameters
    response_data TEXT, -- JSON blob of API response

    -- Status
    status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failed', 'retried')),
    error_code TEXT,
    error_message TEXT,
    retry_of_request_id TEXT, -- Links to original request if this is a retry

    -- Cost tracking
    tokens_used INTEGER,
    estimated_cost_usd REAL,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (retry_of_request_id) REFERENCES ai_generation_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_project ON ai_generation_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_type ON ai_generation_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_generation_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_requests_date ON ai_generation_requests(requested_at DESC);

-- ============================================================================
-- PROJECT VISUALIZATIONS TABLE
-- Stores AI-generated images (extends existing project_images table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_visualizations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    ai_subdivision_plan_id TEXT, -- Optional link to AI plan

    -- Image metadata (similar to project_images table)
    view_type TEXT NOT NULL CHECK(view_type IN ('site-plan', 'aerial', 'context', 'custom')),
    filename TEXT NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('jpeg', 'png', 'webp')),
    size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
    width_pixels INTEGER NOT NULL CHECK(width_pixels > 0),
    height_pixels INTEGER NOT NULL CHECK(height_pixels > 0),
    local_path TEXT NOT NULL, -- Absolute path to file
    thumbnail_path TEXT,

    -- Generation metadata
    generated_at TEXT NOT NULL, -- ISO 8601
    ai_model TEXT NOT NULL, -- e.g., 'dall-e-3', 'stable-diffusion-xl'
    generation_request_id TEXT, -- Links to ai_generation_requests

    -- Prompt used
    prompt_text TEXT NOT NULL,
    negative_prompt_text TEXT,
    generation_seed INTEGER, -- For reproducibility

    -- User annotations
    caption TEXT,
    is_approved INTEGER NOT NULL DEFAULT 0, -- Boolean: 0/1
    is_final INTEGER NOT NULL DEFAULT 0, -- Marked as final for export

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (ai_subdivision_plan_id) REFERENCES ai_subdivision_plans(id) ON DELETE SET NULL,
    FOREIGN KEY (generation_request_id) REFERENCES ai_generation_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_visualizations_project ON project_visualizations(project_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_plan ON project_visualizations(ai_subdivision_plan_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_view_type ON project_visualizations(view_type);
CREATE INDEX IF NOT EXISTS idx_visualizations_approved ON project_visualizations(is_approved, is_final);

-- ============================================================================
-- AI SETTINGS TABLE
-- User preferences for AI generation (per-project overrides)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_settings (
    id TEXT PRIMARY KEY,
    project_id TEXT, -- NULL = global settings, non-NULL = project-specific

    -- Model preferences
    subdivision_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    image_model TEXT NOT NULL DEFAULT 'dall-e-3',

    -- Generation preferences
    auto_approve_valid_plans INTEGER NOT NULL DEFAULT 0, -- Boolean
    max_auto_retries INTEGER NOT NULL DEFAULT 3,
    preferred_lot_aspect_ratio REAL, -- e.g., 0.9 for nearly square
    preferred_road_layout TEXT CHECK(preferred_road_layout IN ('grid', 'perimeter', 'central-spine', 'loop', 'auto')),

    -- Image preferences
    image_style TEXT, -- e.g., 'photorealistic', 'architectural-drawing', 'sketch'
    include_context_landmarks INTEGER NOT NULL DEFAULT 1, -- Boolean

    -- Cost controls
    enable_cost_warnings INTEGER NOT NULL DEFAULT 1, -- Boolean
    max_cost_per_session_usd REAL, -- NULL = no limit

    -- API keys (encrypted if using safeStorage)
    gemini_api_key_encrypted TEXT,
    image_api_key_encrypted TEXT,

    -- Timestamps
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id) -- One settings row per project (or one global with NULL project_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_project ON ai_settings(project_id);

-- ============================================================================
-- UPDATE SCHEMA VERSION
-- ============================================================================

UPDATE app_metadata
SET value = '1.1.0', updated_at = datetime('now')
WHERE key = 'schema_version';
