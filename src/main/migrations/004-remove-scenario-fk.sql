-- ============================================================================
-- MIGRATION 004: Remove Foreign Key Constraint from social_club_designs
-- Allows scenario_id to reference either subdivision_scenarios OR ai_subdivision_plans
-- ============================================================================

-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table

-- Step 1: Create new table without the foreign key constraint
CREATE TABLE IF NOT EXISTS social_club_designs_new (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    storage_type TEXT NOT NULL CHECK(storage_type IN ('centralized', 'individual-patios')),
    dedicated_storage_area REAL, -- Optional
    maintenance_room_size REAL NOT NULL, -- Required
    maintenance_room_location TEXT NOT NULL CHECK(maintenance_room_location IN ('in-social-club', 'separate')),
    total_cost_amount REAL NOT NULL,
    total_cost_currency TEXT NOT NULL,
    total_area REAL NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    -- Removed: FOREIGN KEY (scenario_id) REFERENCES subdivision_scenarios(id)
    -- Reason: scenario_id can reference either subdivision_scenarios OR ai_subdivision_plans
);

-- Step 2: Copy data from old table to new table (if any exists)
INSERT INTO social_club_designs_new
SELECT * FROM social_club_designs;

-- Step 3: Drop old table
DROP TABLE social_club_designs;

-- Step 4: Rename new table to original name
ALTER TABLE social_club_designs_new RENAME TO social_club_designs;

-- Step 5: Recreate index
CREATE INDEX IF NOT EXISTS idx_social_club_project ON social_club_designs(project_id);

-- Update schema version
PRAGMA user_version = 4;
