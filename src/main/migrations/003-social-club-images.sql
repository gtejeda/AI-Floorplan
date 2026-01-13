-- ============================================================================
-- MIGRATION 003: Social Club Images
-- Stores AI-generated social club design images and prompts
-- ============================================================================

-- Social Club Images Table
CREATE TABLE IF NOT EXISTS social_club_images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL, -- Can be AI plan ID or traditional scenario ID

    -- Image storage
    image_path TEXT NOT NULL,
    format TEXT NOT NULL, -- 'png', 'jpeg', or 'webp'

    -- Generation parameters
    prompt TEXT NOT NULL,
    amenities_json TEXT NOT NULL, -- JSON array of selected amenities
    social_club_area REAL NOT NULL,
    storage_type TEXT NOT NULL,
    maintenance_room_size REAL NOT NULL,

    -- AI metadata
    ai_provider TEXT NOT NULL, -- 'gemini' or 'dall-e'
    generated_at TEXT NOT NULL, -- ISO 8601 timestamp

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_club_images_project ON social_club_images(project_id);
CREATE INDEX IF NOT EXISTS idx_social_club_images_scenario ON social_club_images(scenario_id);
CREATE INDEX IF NOT EXISTS idx_social_club_images_generated_at ON social_club_images(generated_at DESC);

-- Update schema version
PRAGMA user_version = 3;
