-- MicroVillas Investment Platform Database Schema
-- Version: 1.0.0
-- Date: 2026-01-11

-- ============================================================================
-- APP METADATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL -- ISO 8601
);

-- Insert schema version
INSERT OR REPLACE INTO app_metadata (key, value, updated_at)
VALUES ('schema_version', '1.0.0', datetime('now'));

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created TEXT NOT NULL, -- ISO 8601
    modified TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    land_parcel_id TEXT,
    selected_scenario_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'finalized')),
    notes TEXT,
    target_directory TEXT, -- For AI integration
    FOREIGN KEY (land_parcel_id) REFERENCES land_parcels(id) ON DELETE SET NULL,
    FOREIGN KEY (selected_scenario_id) REFERENCES subdivision_scenarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_modified ON projects(modified DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================================================
-- LAND PARCELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS land_parcels (
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
    target_microvillas_count INTEGER, -- Optional target
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_land_parcels_project ON land_parcels(project_id);

-- ============================================================================
-- LANDMARKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landmarks (
    id TEXT PRIMARY KEY,
    land_parcel_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('beach', 'airport', 'tourist_attraction', 'infrastructure', 'other')),
    name TEXT NOT NULL,
    distance_km REAL, -- Optional
    description TEXT, -- Optional
    FOREIGN KEY (land_parcel_id) REFERENCES land_parcels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_landmarks_parcel ON landmarks(land_parcel_id);

-- ============================================================================
-- SUBDIVISION SCENARIOS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subdivision_scenarios (
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
    parking_spaces INTEGER NOT NULL, -- 2 × lot_count
    is_viable INTEGER NOT NULL, -- Boolean: 0/1
    calculated_at TEXT NOT NULL, -- ISO 8601
    FOREIGN KEY (land_parcel_id) REFERENCES land_parcels(id) ON DELETE CASCADE,
    UNIQUE(land_parcel_id, social_club_percent) -- One scenario per percentage
);

CREATE INDEX IF NOT EXISTS idx_scenarios_parcel ON subdivision_scenarios(land_parcel_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_viable ON subdivision_scenarios(land_parcel_id, is_viable);

-- ============================================================================
-- MICRO VILLA LOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS micro_villa_lots (
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

CREATE INDEX IF NOT EXISTS idx_lots_scenario ON micro_villa_lots(scenario_id);

-- ============================================================================
-- SOCIAL CLUB DESIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_club_designs (
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
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (scenario_id) REFERENCES subdivision_scenarios(id)
);

CREATE INDEX IF NOT EXISTS idx_social_club_project ON social_club_designs(project_id);

-- ============================================================================
-- SELECTED AMENITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS selected_amenities (
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

CREATE INDEX IF NOT EXISTS idx_selected_amenities_design ON selected_amenities(social_club_design_id);

-- ============================================================================
-- FINANCIAL ANALYSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_analyses (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    land_acquisition_amount REAL NOT NULL,
    land_acquisition_currency TEXT NOT NULL,
    amenities_amount REAL NOT NULL,
    amenities_currency TEXT NOT NULL,
    parking_area_cost_amount REAL NOT NULL,
    parking_area_cost_currency TEXT NOT NULL,
    walkways_cost_amount REAL NOT NULL,
    walkways_cost_currency TEXT NOT NULL,
    landscaping_cost_amount REAL NOT NULL,
    landscaping_cost_currency TEXT NOT NULL,
    maintenance_room_cost_amount REAL NOT NULL,
    maintenance_room_cost_currency TEXT NOT NULL,
    storage_cost_amount REAL NOT NULL,
    storage_cost_currency TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_financial_project ON financial_analyses(project_id);

-- ============================================================================
-- OTHER COSTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS other_costs (
    id TEXT PRIMARY KEY,
    financial_analysis_id TEXT NOT NULL,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (financial_analysis_id) REFERENCES financial_analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_other_costs_analysis ON other_costs(financial_analysis_id);

-- ============================================================================
-- PRICING SCENARIOS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_scenarios (
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

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_analysis ON pricing_scenarios(financial_analysis_id);

-- ============================================================================
-- PROJECT IMAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_images (
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

CREATE INDEX IF NOT EXISTS idx_images_project ON project_images(project_id);
CREATE INDEX IF NOT EXISTS idx_images_lot ON project_images(lot_id);

-- ============================================================================
-- ENABLE FOREIGN KEY CONSTRAINTS
-- ============================================================================

PRAGMA foreign_keys = ON;
