# Tasks: Micro Villas Investment Platform - Desktop Application

**Input**: Design documents from `/specs/main/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification - test tasks are OMITTED per requirements.

**Organization**: Tasks are grouped by user story (8 total user stories) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US8)
- Include exact file paths in descriptions

## Path Conventions

- **Repository root**: `D:\fast2ai\AI-Floorplan\`
- **App root**: `D:\fast2ai\AI-Floorplan\src\` (per FR-099)
- **Main process**: `src/main/`
- **Renderer process**: `src/renderer/`
- **Preload**: `src/preload/`
- **Tests**: `tests/`
- **Public assets**: `public/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Electron app structure

- [ ] T001 Initialize npm project with package.json in D:\fast2ai\AI-Floorplan\
- [ ] T002 Install Electron Forge and configure TypeScript with Vite plugin
- [ ] T003 [P] Install core dependencies: electron@39.0.0, typescript@5.x, better-sqlite3, electron-store, zod, uuid, fabric
- [ ] T004 [P] Install UI framework dependencies: react@18.x, react-dom@18.x (or Vue 3.x per team choice)
- [ ] T005 [P] Install dev dependencies: vitest, @playwright/test, eslint, prettier, @typescript-eslint/*
- [ ] T006 Configure tsconfig.json with strict mode, ES2022 target, path aliases (@/* → ./src/*)
- [ ] T007 [P] Configure ESLint and Prettier for code quality
- [ ] T008 [P] Configure Vitest for unit tests in vitest.config.ts
- [ ] T009 Create project directory structure: src/{main,renderer,preload}, tests/{unit,integration}, public/assets
- [ ] T010 Configure Electron Forge in forge.config.js with makers for Windows (.exe) and macOS (.dmg)
- [ ] T011 [P] Configure Vite for renderer process in vite.renderer.config.ts with React/Vue plugin
- [ ] T012 [P] Configure Vite for main process in vite.main.config.ts
- [ ] T013 [P] Configure Vite for preload in vite.preload.config.ts
- [ ] T014 Create .gitignore for node_modules, dist, out, *.db, .env files
- [ ] T015 Create README.md with project overview and quickstart instructions

**Checkpoint**: Project structure and build system ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T016 Create SQLite database schema in src/main/db-schema.sql with all tables from data-model.md
- [ ] T017 Implement database initialization in src/main/storage.ts with schema migration on first launch
- [ ] T018 [P] Create Money interface and validation in src/renderer/models/Money.ts
- [ ] T019 [P] Create DominicanRepublicProvince type in src/renderer/models/Province.ts with all 32 provinces
- [ ] T020 [P] Create Landmark interface in src/renderer/models/Landmark.ts
- [ ] T021 Implement unit conversion utilities in src/renderer/utils/unit-converter.ts (sqm ↔ sqft with exact factors)
- [ ] T022 [P] Implement currency conversion utilities in src/renderer/utils/currency-converter.ts (DOP ↔ USD)
- [ ] T023 Create Electron main process entry point in src/main/index.ts with BrowserWindow configuration
- [ ] T024 Create preload script skeleton in src/preload/index.ts with contextBridge.exposeInMainWorld setup
- [ ] T025 [P] Create main IPC handlers file in src/main/ipc-handlers.ts with handler registration structure
- [ ] T026 Create amenities catalog JSON in public/assets/amenities-catalog.json with default costs per data-model.md
- [ ] T027 [P] Setup electron-store for application settings in src/main/settings-store.ts
- [ ] T028 Create main renderer HTML entry point in src/index.html
- [ ] T029 [P] Create main React/Vue app component in src/renderer/App.tsx (or .vue)
- [ ] T030 [P] Setup React Router or Vue Router for multi-page navigation in src/renderer/router.tsx
- [ ] T031 Implement error handling middleware in src/main/error-handler.ts for IPC failures
- [ ] T032 [P] Implement logging infrastructure in src/main/logger.ts and src/renderer/logger.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Land Investment Setup (Priority: P1) 🎯 MVP

**Goal**: Enable developers to configure land parcel parameters (dimensions, location, cost, target Micro-Villas count)

**Independent Test**: Create a new project, enter land dimensions (100m × 80m), select province (La Altagracia), set acquisition cost ($50,000 USD), optionally specify target of 12 Micro-Villas, save project, and verify all parameters are persisted to SQLite database

### Implementation for User Story 1

- [ ] T033 [P] [US1] Create LandParcel TypeScript interface in src/renderer/models/LandParcel.ts per data-model.md
- [ ] T034 [P] [US1] Create Project TypeScript interface in src/renderer/models/Project.ts
- [ ] T035 [P] [US1] Create Zod validation schema for LandParcelInput in src/renderer/models/LandParcel.ts
- [ ] T036 [P] [US1] Create Zod validation schema for CreateProjectInput in src/renderer/models/Project.ts
- [ ] T037 [US1] Implement IPC handler for 'project:create' in src/main/ipc-handlers.ts with SQLite INSERT
- [ ] T038 [US1] Implement IPC handler for 'land:save' in src/main/ipc-handlers.ts with validation and SQLite INSERT
- [ ] T039 [US1] Implement IPC handler for 'land:update' in src/main/ipc-handlers.ts with SQLite UPDATE
- [ ] T040 [P] [US1] Expose 'createProject', 'saveLandParcel', 'updateLandParcel' in src/preload/index.ts contextBridge
- [ ] T041 [P] [US1] Create LandConfig UI component in src/renderer/components/LandConfig/LandConfig.tsx with form inputs
- [ ] T042 [US1] Add land dimensions inputs (length/width OR total area) with unit selector (sqm/sqft) to LandConfig component
- [ ] T043 [US1] Add province dropdown with all 32 Dominican Republic provinces to LandConfig component
- [ ] T044 [US1] Add acquisition cost input with currency selector (DOP/USD) to LandConfig component
- [ ] T045 [US1] Add optional target number of Micro-Villas input field to LandConfig component per FR-007
- [ ] T046 [US1] Add urbanization status checkbox and landmarks list (add/remove) to LandConfig component
- [ ] T047 [US1] Implement auto-save on change in LandConfig component calling window.electronAPI.saveLandParcel per FR-026
- [ ] T048 [US1] Add visual auto-save indicator to LandConfig component per FR-029
- [ ] T049 [P] [US1] Create ProjectSetup page in src/renderer/pages/ProjectSetup.tsx integrating LandConfig component
- [ ] T050 [US1] Implement project load on app launch in src/renderer/App.tsx calling window.electronAPI.loadProject
- [ ] T051 [US1] Add validation feedback for land dimensions (must be > 0) and acquisition cost (must be ≥ 0) in LandConfig component

**Checkpoint**: User Story 1 complete - developers can configure and save land parameters independently

---

## Phase 4: User Story 2 - Automatic Subdivision Calculation (Priority: P1)

**Goal**: Generate 10-30% social club scenarios with centralized parking (2 spaces/villa), maintenance room, walkways, and validate against target Micro-Villas count

**Independent Test**: Given saved land parcel (100m × 80m = 8000 sqm), system generates up to 21 subdivision scenarios (10-30% social club in 1% increments), each showing: lot count, lot dimensions (minimum 90 sqm), centralized parking area (2 spaces × lot count), maintenance room location, walkways, all calculated in <2 seconds. If target of 12 villas specified, scenarios with ~12 lots are highlighted.

### Implementation for User Story 2

- [ ] T052 [P] [US2] Create SubdivisionScenario TypeScript interface in src/renderer/models/SubdivisionScenario.ts per data-model.md
- [ ] T053 [P] [US2] Create MicroVillaLot TypeScript interface in src/renderer/models/MicroVillaLot.ts
- [ ] T054 [P] [US2] Create ParkingArea TypeScript interface in src/renderer/models/ParkingArea.ts per updated spec
- [ ] T055 [P] [US2] Create MaintenanceRoom TypeScript interface in src/renderer/models/MaintenanceRoom.ts per updated spec
- [ ] T056 [US2] Implement SubdivisionCalculator class in src/renderer/services/subdivision-calculator.ts with grid-based algorithm per research.md
- [ ] T057 [US2] Implement calculateSubdivision method for single scenario (social club %, lot dimensions, social club position) in SubdivisionCalculator
- [ ] T058 [US2] Implement calculateAllScenarios method (10-30% in 1% increments, filter lots < 90 sqm) in SubdivisionCalculator per FR-009, FR-023
- [ ] T059 [US2] Add parking area calculation (2 spaces per villa, centralized) to SubdivisionCalculator per FR-015
- [ ] T060 [US2] Add walkway and landscaping area estimation to SubdivisionCalculator per FR-017
- [ ] T061 [US2] Add common area ownership percentage calculation (social club + parking + walkways) divided by lot sqm per FR-018, FR-019
- [ ] T062 [US2] Add target Micro-Villas validation logic - highlight scenarios matching target per FR-025
- [ ] T063 [US2] Implement IPC handler for 'subdivision:calculate' in src/main/ipc-handlers.ts calling SubdivisionCalculator and storing results in SQLite
- [ ] T064 [US2] Implement IPC handler for 'subdivision:select' in src/main/ipc-handlers.ts updating selected_scenario_id per FR-020
- [ ] T065 [P] [US2] Expose 'calculateSubdivisions', 'selectScenario' in src/preload/index.ts
- [ ] T066 [P] [US2] Create SubdivisionView UI component in src/renderer/components/SubdivisionView/SubdivisionView.tsx with 2D schematic visualization using Fabric.js
- [ ] T067 [US2] Render subdivision scenarios as 2D top-down diagrams showing lots, social club, parking area, maintenance room, walkways per FR-024
- [ ] T068 [US2] Add scenario selector (dropdown or list) showing social club % and lot count for each scenario
- [ ] T069 [US2] Highlight scenarios matching target Micro-Villas count (if specified) in scenario selector per FR-025
- [ ] T070 [US2] Display selected scenario details: lot count, individual lot dimensions, social club dimensions/location, parking area (2 spaces × lot count), maintenance room placeholder, walkways
- [ ] T071 [US2] Add social club percentage slider (10-30%) for manual adjustment per FR-011
- [ ] T072 [P] [US2] Create SubdivisionPlanner page in src/renderer/pages/SubdivisionPlanner.tsx integrating SubdivisionView component
- [ ] T073 [US2] Trigger subdivision calculation automatically when land parcel is saved in SubdivisionPlanner page per FR-009
- [ ] T074 [US2] Implement scenario selection persistence calling window.electronAPI.selectScenario on user selection

**Checkpoint**: User Story 2 complete - developers can view and select from auto-generated subdivision scenarios with parking and maintenance room placeholders

---

## Phase 5: User Story 3 - Social Club Amenities Design (Priority: P2)

**Goal**: Configure social club amenities, mandatory storage units (social club OR patio), and mandatory maintenance room (size and location)

**Independent Test**: Given selected subdivision, view amenities catalog (20+ items in categories: aquatic, dining, recreation, furniture, landscaping, utilities, storage), select amenities (e.g., pool, BBQ area, lounge), configure storage location (social club or individual patio), specify maintenance room size (e.g., 20 sqm) and location (in social club or separate), view parking configuration (auto-calculated 2 spaces × lot count), save configuration

### Implementation for User Story 3

- [ ] T075 [P] [US3] Create Amenity TypeScript interface in src/renderer/models/Amenity.ts per data-model.md
- [ ] T076 [P] [US3] Create SocialClubDesign TypeScript interface in src/renderer/models/SocialClubDesign.ts
- [ ] T077 [P] [US3] Create StorageUnit TypeScript interface in src/renderer/models/StorageUnit.ts per updated spec
- [ ] T078 [P] [US3] Create Zod validation schema for SocialClubDesignInput in src/renderer/models/SocialClubDesign.ts
- [ ] T079 [US3] Implement IPC handler for 'amenities:catalog' in src/main/ipc-handlers.ts loading from public/assets/amenities-catalog.json per FR-031
- [ ] T080 [US3] Implement IPC handler for 'socialclub:save' in src/main/ipc-handlers.ts with validation and SQLite INSERT/UPDATE
- [ ] T081 [P] [US3] Expose 'getAmenitiesCatalog', 'saveSocialClubDesign' in src/preload/index.ts
- [ ] T082 [P] [US3] Create AmenitiesCatalog UI component in src/renderer/components/AmenitiesCatalog/AmenitiesCatalog.tsx with categorized list
- [ ] T083 [US3] Display amenities organized by category (aquatic, dining, recreation, furniture, landscaping, utilities, storage) in AmenitiesCatalog per FR-031
- [ ] T084 [US3] Implement amenity selection (checkbox per item) with cost display (default or custom) in AmenitiesCatalog per FR-032, FR-039
- [ ] T085 [US3] Add storage unit configuration section: radio buttons for "Social Club Storage" vs "Individual Patio Storage" per FR-033
- [ ] T086 [US3] Add maintenance room configuration section: size input (sqm) and location radio buttons ("In Social Club" vs "Separate Area") per FR-034
- [ ] T087 [US3] Display parking configuration (read-only): "Centralized Parking - 2 spaces per villa × [lot count] = [total spaces]" per FR-035
- [ ] T088 [US3] Implement custom cost override for any amenity in AmenitiesCatalog per FR-039
- [ ] T089 [US3] Add auto-save on amenity selection/deselection and configuration changes per FR-037
- [ ] T090 [P] [US3] Create SocialClubDesigner page in src/renderer/pages/SocialClubDesigner.tsx integrating AmenitiesCatalog component
- [ ] T091 [US3] Load and display selected amenities list with total cost in SocialClubDesigner page
- [ ] T092 [US3] Validate mandatory fields: storage location selected, maintenance room size > 0 and location selected

**Checkpoint**: User Story 3 complete - developers can design social club with amenities, configure mandatory storage and maintenance room independently

---

## Phase 6: User Story 4 - Financial Analysis & Pricing (Priority: P2)

**Goal**: Calculate total project costs with proportional allocation (parking, walkways, landscaping, maintenance room by lot sqm), generate pricing scenarios with profit margins

**Independent Test**: Given configured project (land, subdivision, amenities, parking, maintenance room, storage), enter costs: land ($50,000), amenities ($30,000), parking area ($10,000), walkways ($5,000), landscaping ($8,000), maintenance room ($3,000), storage ($2,000 for social club OR $500/lot for patio), legal ($2,000), view total project cost breakdown, cost per sqm for shared areas (divided proportionally by lot sqm), base lot pricing including proportional shared costs, multiple pricing scenarios (20%, 30%, 40% profit margins), expected revenue and profit

### Implementation for User Story 4

- [ ] T093 [P] [US4] Create FinancialAnalysis TypeScript interface in src/renderer/models/FinancialAnalysis.ts per data-model.md
- [ ] T094 [P] [US4] Create CostBreakdown TypeScript interface in src/renderer/models/FinancialAnalysis.ts
- [ ] T095 [P] [US4] Create PricingScenario TypeScript interface in src/renderer/models/FinancialAnalysis.ts
- [ ] T096 [P] [US4] Create Zod validation schema for FinancialAnalysisInput in src/renderer/models/FinancialAnalysis.ts
- [ ] T097 [US4] Implement FinancialAnalyzer class in src/renderer/services/financial-analyzer.ts with all calculation methods
- [ ] T098 [US4] Implement calculateTotalProjectCost method: land + amenities + parking + walkways + landscaping + maintenance room + storage + legal + other per FR-051
- [ ] T099 [US4] Implement calculateCostPerSqmSharedAreas method: (parking + walkways + landscaping + maintenance room + social club storage if applicable) ÷ total lot sqm per FR-052
- [ ] T100 [US4] Implement calculateBaseLotCost method: proportional land cost + proportional shared costs + (storage cost if patio) per FR-053
- [ ] T101 [US4] Implement proportional cost allocation logic: divide shared costs by each lot's sqm percentage per FR-042, FR-044, FR-046
- [ ] T102 [US4] Implement storage cost allocation: if social club, divide proportionally; if patio, include in per-lot cost per FR-048
- [ ] T103 [US4] Implement generatePricingScenarios method: base cost × (1 + profit margin) for multiple margins per FR-054, FR-055
- [ ] T104 [US4] Implement calculateRevenueAndProfit method: (lot sale price × lot count) - total project cost per FR-056, FR-057
- [ ] T105 [US4] Implement calculateMaintenanceContributions method: proportional to common area ownership % per FR-058
- [ ] T106 [US4] Implement IPC handler for 'financial:save' in src/main/ipc-handlers.ts with validation and SQLite INSERT/UPDATE
- [ ] T107 [US4] Implement IPC handler for 'financial:recalculate' in src/main/ipc-handlers.ts calling FinancialAnalyzer when subdivision changes per FR-061
- [ ] T108 [P] [US4] Expose 'saveFinancialAnalysis', 'recalculateFinancials' in src/preload/index.ts
- [ ] T109 [P] [US4] Create FinancialPanel UI component in src/renderer/components/FinancialPanel/FinancialPanel.tsx with cost inputs
- [ ] T110 [US4] Add land acquisition cost input (read-only from land parcel) in FinancialPanel
- [ ] T111 [US4] Add amenities total cost display (calculated from selected amenities) in FinancialPanel per FR-040
- [ ] T112 [US4] Add parking area cost input with description "Construction and landscaping for [X] spaces" per FR-041
- [ ] T113 [US4] Add walkway construction cost input and landscaping cost input per FR-043
- [ ] T114 [US4] Add maintenance room cost input with description "Construction and equipment for [X] sqm room" per FR-045
- [ ] T115 [US4] Add storage unit cost input with conditional label: "Social Club Storage (shared)" or "Patio Storage (per lot)" per FR-047
- [ ] T116 [US4] Add legal costs input (notary, permits, registrations) per FR-049
- [ ] T117 [US4] Add other costs section with custom labels (infrastructure, utilities, marketing) per FR-050
- [ ] T118 [US4] Display total project cost breakdown showing all cost categories per FR-051
- [ ] T119 [US4] Display cost per square meter for shared areas (parking, walkways, landscaping, maintenance room) per FR-052
- [ ] T120 [US4] Display base lot cost breakdown: proportional land cost + proportional shared costs + storage (if patio) per FR-053
- [ ] T121 [US4] Add profit margin input (multiple values: 15%, 20%, 25%, 30%) and generate pricing scenarios per FR-054
- [ ] T122 [US4] Display pricing scenarios table: profit margin → lot sale price → total revenue → expected profit per FR-055, FR-056, FR-057
- [ ] T123 [US4] Add monthly maintenance cost input and display per-owner contributions by common area ownership % per FR-058
- [ ] T124 [US4] Add currency toggle (DOP ↔ USD) with exchange rate input for all financial displays per FR-059
- [ ] T125 [US4] Implement auto-recalculation when subdivision scenario changes per FR-061
- [ ] T126 [P] [US4] Create FinancialAnalysis page in src/renderer/pages/FinancialAnalysis.tsx integrating FinancialPanel component
- [ ] T127 [US4] Add auto-save on any cost input change per FR-060

**Checkpoint**: User Story 4 complete - developers can perform comprehensive financial analysis with proportional cost allocation independently

---

## Phase 7: User Story 5 - AI Integration for Subdivision & Images (Priority: P3)

**Goal**: Manually generate AI prompts for Claude Code (subdivision optimization) and Google Nano Banana Pro (image generation), save to project target directory

**Independent Test**: Given fully configured project, click "Generate AI Subdivision Description" button, verify ai-subdivision-prompt.json created in project target directory with all constraints (land area, target villas, social club %, parking requirements, maintenance room, storage, costs). Click "Generate AI Image Prompts" button, verify ai-image-prompts.txt created with detailed visual descriptions (Micro-Villa lot, social club with amenities, parking layout, landscaping, maintenance room).

### Implementation for User Story 5

- [ ] T128 [P] [US5] Create AIDescriptionGenerator class in src/renderer/services/ai-description-generator.ts with prompt generation methods
- [ ] T129 [US5] Implement generateClaudeCodePrompt method: create JSON with land area, target villas, social club constraints, parking (2 spaces/villa), maintenance room, storage config, costs per FR-063
- [ ] T130 [US5] Implement generateGoogleNanoPrompts method: create text with visual descriptions (Micro-Villa lot, social club, parking area, landscaping, walkways, maintenance room) per FR-066
- [ ] T131 [US5] Implement IPC handler for 'ai:generateSubdivisionPrompt' in src/main/ipc-handlers.ts calling AIDescriptionGenerator and writing ai-subdivision-prompt.json to target directory per FR-067
- [ ] T132 [US5] Implement IPC handler for 'ai:generateImagePrompts' in src/main/ipc-handlers.ts calling AIDescriptionGenerator and writing ai-image-prompts.txt to target directory per FR-067
- [ ] T133 [US5] Implement IPC handler for 'ai:importOptimizedSubdivision' in src/main/ipc-handlers.ts to load Claude Code results (JSON format) and update subdivision scenario per FR-068
- [ ] T134 [P] [US5] Expose 'generateSubdivisionPrompt', 'generateImagePrompts', 'importOptimizedSubdivision' in src/preload/index.ts
- [ ] T135 [P] [US5] Create AIIntegration UI component in src/renderer/components/AIIntegration/AIIntegration.tsx with action buttons
- [ ] T136 [US5] Add "Generate AI Subdivision Description" button (enabled when project fully configured) per FR-062
- [ ] T137 [US5] Add "Generate AI Image Prompts" button (enabled when subdivision selected) per FR-065
- [ ] T138 [US5] Add "Import Optimized Subdivision from Claude Code" button with file selector per FR-068
- [ ] T139 [US5] Display success messages showing file paths after AI prompt generation per FR-067
- [ ] T140 [US5] Validate manual trigger workflow (no automatic generation on save/export) per FR-069
- [ ] T141 [P] [US5] Add AIIntegration component to FinancialAnalysis page or create dedicated AI page
- [ ] T142 [US5] Implement project target directory path storage in Project model (for AI tools to save results)

**Checkpoint**: User Story 5 complete - developers can manually generate AI prompts and import optimized results independently

---

## Phase 8: User Story 6 - Image Management (Priority: P3)

**Goal**: Attach and preview images for land parcel and Micro-Villa lots, import AI-generated images from Google Nano

**Independent Test**: Upload 3 images to land parcel, upload 2 images to a specific Micro-Villa lot, click thumbnails to view full-size previews, verify all images persisted to local storage. Import AI-generated images from project target directory (images/ folder), verify they appear in the appropriate lots.

### Implementation for User Story 6

- [ ] T143 [P] [US6] Create ProjectImage TypeScript interface in src/renderer/models/ProjectImage.ts per data-model.md
- [ ] T144 [P] [US6] Create ImageMetadata TypeScript interface in src/renderer/models/ProjectImage.ts
- [ ] T145 [US6] Implement IPC handler for 'dialog:selectImages' in src/main/ipc-handlers.ts using Electron dialog.showOpenDialog with image filters per FR-070, FR-071
- [ ] T146 [US6] Implement IPC handler for 'images:attachToLand' in src/main/ipc-handlers.ts copying images to local storage and creating DB records per FR-073
- [ ] T147 [US6] Implement IPC handler for 'images:attachToLot' in src/main/ipc-handlers.ts with lot association per FR-073
- [ ] T148 [US6] Implement IPC handler for 'images:getThumbnail' in src/main/ipc-handlers.ts generating Base64 data URL for thumbnails per FR-074
- [ ] T149 [US6] Implement IPC handler for 'images:importAIGenerated' in src/main/ipc-handlers.ts scanning project target directory images/ folder per FR-072
- [ ] T150 [US6] Add image size validation (up to 10MB, compression or rejection for larger) per FR-077
- [ ] T151 [US6] Add image format validation (JPEG, PNG, WebP) per FR-076
- [ ] T152 [P] [US6] Expose 'selectImages', 'attachImagesToLand', 'attachImagesToLot', 'getImageThumbnail', 'importAIGeneratedImages' in src/preload/index.ts
- [ ] T153 [P] [US6] Create ImageManager UI component in src/renderer/components/ImageManager/ImageManager.tsx with upload and preview
- [ ] T154 [US6] Add "Upload Images to Land Parcel" button triggering file dialog in ImageManager
- [ ] T155 [US6] Add "Upload Images to Lot" button for selected Micro-Villa lot in ImageManager
- [ ] T156 [US6] Add "Import AI-Generated Images" button scanning project target directory per FR-072
- [ ] T157 [US6] Display image thumbnails in grid layout per FR-074
- [ ] T158 [US6] Implement thumbnail click handler to open full-size image preview modal per FR-075
- [ ] T159 [US6] Add image persistence validation on project save per FR-073
- [ ] T160 [P] [US6] Integrate ImageManager component into ProjectSetup page (for land images) and SubdivisionPlanner page (for lot images)

**Checkpoint**: User Story 6 complete - developers can upload, preview, and import AI-generated images independently

---

## Phase 9: User Story 7 - Project Export to Disk (Priority: P2)

**Goal**: Save complete project to target directory (project.json, images/, ai-prompts/) for backup, sharing, and AI tool integration

**Independent Test**: Click export button, select target directory via native file picker, verify export completes in <10 seconds, review target directory structure: project.json (all configuration and financial data), images/ subfolder (all uploaded and AI-generated images), ai-prompts/ subfolder (Claude Code and Google Nano prompts if generated), verify target directory path saved to project for AI tool integration

### Implementation for User Story 7

- [ ] T161 [P] [US7] Create ExportResult TypeScript interface in src/renderer/models/Export.ts
- [ ] T162 [P] [US7] Create project JSON export schema v1.0.0 with checksum validation per data-model.md
- [ ] T163 [US7] Implement IPC handler for 'dialog:selectExportDir' in src/main/ipc-handlers.ts using Electron dialog.showOpenDialog for directory selection per FR-078
- [ ] T164 [US7] Implement IPC handler for 'export:project' in src/main/ipc-handlers.ts with full export logic per FR-079
- [ ] T165 [US7] Implement project.json generation with all configuration and financial data in export handler
- [ ] T166 [US7] Implement images/ subfolder creation and file copy (uploaded + AI-generated) per FR-080
- [ ] T167 [US7] Implement ai-prompts/ subfolder creation and copy (if AI prompts exist) per FR-079
- [ ] T168 [US7] Add export directory writability validation per FR-082
- [ ] T169 [US7] Add checksum generation for project.json validation per data-model.md
- [ ] T170 [US7] Store project target directory path in projects table for future AI integration per FR-084
- [ ] T171 [US7] Implement success/failure feedback with clear messages per FR-083
- [ ] T172 [P] [US7] Expose 'selectExportDirectory', 'exportProject' in src/preload/index.ts
- [ ] T173 [P] [US7] Create Export UI component in src/renderer/components/Export/Export.tsx with export button and status
- [ ] T174 [US7] Add "Select Export Directory" button triggering native directory picker in Export component
- [ ] T175 [US7] Add "Export Project" button (enabled when directory selected) in Export component
- [ ] T176 [US7] Display export progress and success/failure message with exported file paths per FR-083
- [ ] T177 [US7] Validate export completes in <10 seconds per SC-006
- [ ] T178 [P] [US7] Create Export page in src/renderer/pages/Export.tsx integrating Export component

**Checkpoint**: User Story 7 complete - developers can export complete projects to disk with AI integration support independently

---

## Phase 10: User Story 8 - Project Import from Disk (Priority: P2)

**Goal**: Load previously exported project from disk directory with 100% data fidelity, including all images and AI prompts

**Independent Test**: Click import button, select directory containing exported project, verify all data loads correctly: land configuration, selected subdivision (parking, maintenance room, storage), social club design, financial data, all images (uploaded and AI-generated), target directory path. Test partial recovery: manually corrupt one JSON field, verify system offers partial recovery option listing skipped fields.

### Implementation for User Story 8

- [ ] T179 [P] [US8] Create ImportResult TypeScript interface in src/renderer/models/Import.ts with validation results
- [ ] T180 [P] [US8] Create ProjectValidator class in src/renderer/services/project-validator.ts with JSON validation and recovery logic
- [ ] T181 [US8] Implement IPC handler for 'dialog:selectImportDir' in src/main/ipc-handlers.ts using Electron dialog.showOpenDialog for directory selection per FR-085
- [ ] T182 [US8] Implement IPC handler for 'import:project' in src/main/ipc-handlers.ts with full import logic per FR-086
- [ ] T183 [US8] Implement project directory validation: check for project.json, images/ folder, optional ai-prompts/ folder per FR-086
- [ ] T184 [US8] Implement project.json loading and Zod schema validation per FR-087, FR-090
- [ ] T185 [US8] Implement checksum validation for data integrity per data-model.md
- [ ] T186 [US8] Implement images/ folder scanning and image loading (both uploaded and AI-generated) per FR-088
- [ ] T187 [US8] Implement complete project state restoration: land, subdivision, social club (parking, storage, maintenance), financials, images, target directory per FR-089
- [ ] T188 [US8] Implement corrupted JSON field detection with detailed error messages listing invalid fields per FR-091
- [ ] T189 [US8] Implement partial recovery option: load valid fields, skip invalid, generate warning list per FR-092, FR-093
- [ ] T190 [US8] Implement missing image handling with placeholder indicators per FR-094
- [ ] T191 [US8] Validate import completes in <10 seconds per SC-007
- [ ] T192 [P] [US8] Expose 'selectImportDirectory', 'importProject' in src/preload/index.ts
- [ ] T193 [P] [US8] Create Import UI component in src/renderer/components/Import/Import.tsx with import button and validation results
- [ ] T194 [US8] Add "Select Import Directory" button triggering native directory picker in Import component
- [ ] T195 [US8] Add "Import Project" button (enabled when directory selected) in Import component
- [ ] T196 [US8] Display import validation results: success with 100% fidelity OR errors with field-by-field details per FR-091
- [ ] T197 [US8] Implement partial recovery UI: show warning dialog listing skipped fields, confirm to proceed per FR-093
- [ ] T198 [US8] Display missing image placeholders in UI after import per FR-094
- [ ] T199 [P] [US8] Add Import component to main app navigation or ProjectSetup page

**Checkpoint**: User Story 8 complete - developers can import projects with full data integrity validation and recovery independently

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories and production readiness

- [ ] T200 [P] Add comprehensive error boundaries in React/Vue app for graceful error handling
- [ ] T201 [P] Implement app-wide loading states and spinners for IPC operations
- [ ] T202 [P] Add keyboard shortcuts for common actions (Ctrl+S for save, Ctrl+E for export, etc.)
- [ ] T203 [P] Implement app menu with File > New, Open, Export, Import, Settings, Help
- [ ] T204 [P] Add Help menu item opening quickstart.md in default markdown viewer
- [ ] T205 [P] Create app icon files (icon.ico for Windows, icon.icns for macOS) and configure in forge.config.js
- [ ] T206 [P] Add application settings dialog: default currency, default unit (sqm/sqft), exchange rate, amenities catalog management
- [ ] T207 [P] Implement recent projects list in main menu (last 5 projects)
- [ ] T208 [P] Add "Clear Local Storage" option in settings with confirmation dialog per FR-030
- [ ] T209 [P] Optimize subdivision calculation performance - validate <2 seconds for 21 scenarios per SC-002
- [ ] T210 [P] Optimize financial recalculation - validate <1 second per SC-005
- [ ] T211 [P] Validate app launch time <3 seconds on Windows and macOS per SC-012
- [ ] T212 [P] Add accessibility improvements: ARIA labels, keyboard navigation, screen reader support
- [ ] T213 [P] Implement responsive layout for different window sizes (minimum 1200×800 per quickstart.md)
- [ ] T214 [P] Add confirmation dialogs for destructive actions (delete project, clear storage)
- [ ] T215 [P] Code cleanup: remove console.logs, add JSDoc comments to complex functions
- [ ] T216 [P] Security hardening: validate all user inputs, sanitize file paths, prevent path traversal
- [ ] T217 Run quickstart.md validation: verify all setup steps work on fresh Windows and macOS installations
- [ ] T218 Create user documentation in docs/user-guide.md with screenshots and workflows
- [ ] T219 [P] Add telemetry opt-in for crash reporting and usage analytics (privacy-conscious)
- [ ] T220 Final QA: test all 8 user stories independently, verify constitution compliance

**Checkpoint**: Application production-ready for packaging and distribution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phases 3-10)**: All depend on Foundational completion
  - US1 (Land Setup) - P1: Can start after Foundational - MVP foundation
  - US2 (Subdivision) - P1: Can start after Foundational - requires US1 data but independently testable
  - US3 (Social Club) - P2: Can start after Foundational - requires US2 selected scenario but independently testable
  - US4 (Financial) - P2: Can start after Foundational - requires US1-US3 data but independently testable
  - US5 (AI Integration) - P3: Can start after Foundational - requires US1-US4 configured
  - US6 (Images) - P3: Can start after Foundational - independent, can run parallel with US5
  - US7 (Export) - P2: Can start after Foundational - requires US1-US4 for complete export
  - US8 (Import) - P2: Can start after Foundational - independent of other stories
- **Polish (Phase 11)**: Depends on desired user stories completion

### User Story Dependencies (Implementation Order)

**Critical Path (MVP)**:
1. US1 (Land Setup) → Foundation for all other stories
2. US2 (Subdivision) → Depends on US1 land data
3. US3 (Social Club) → Depends on US2 selected scenario
4. US4 (Financial) → Depends on US1-US3 for complete analysis

**Parallel Opportunities**:
- US5 (AI Integration), US6 (Images), US7 (Export), US8 (Import) can all proceed in parallel after US1-US4 if team capacity allows

### Within Each User Story

- Models before services
- Services before IPC handlers
- IPC handlers before UI components
- UI components before page integration
- Core implementation before edge cases and validation

### Parallel Opportunities

**Phase 1 (Setup)**: T003-T005, T007-T008, T011-T013 can run in parallel
**Phase 2 (Foundational)**: T018-T020, T021-T022, T025, T027, T029-T030, T032 can run in parallel
**Phase 3 (US1)**: T033-T036, T040, T041, T049 can run in parallel after dependencies met
**Phase 4 (US2)**: T052-T055, T065-T066, T072 can run in parallel after dependencies met
**Phase 5 (US3)**: T075-T078, T081-T082, T090 can run in parallel after dependencies met
**Phase 6 (US4)**: T093-T096, T108-T109, T126 can run in parallel after dependencies met
**Phase 7 (US5)**: T128, T134-T135, T141 can run in parallel after dependencies met
**Phase 8 (US6)**: T143-T144, T152-T153, T160 can run in parallel after dependencies met
**Phase 9 (US7)**: T161-T162, T172-T173, T178 can run in parallel after dependencies met
**Phase 10 (US8)**: T179-T180, T192-T193 can run in parallel after dependencies met
**Phase 11 (Polish)**: Most tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1 (Land Setup)

```bash
# Launch all model definitions together:
Task: "Create LandParcel TypeScript interface in src/renderer/models/LandParcel.ts" [T033]
Task: "Create Project TypeScript interface in src/renderer/models/Project.ts" [T034]
Task: "Create Zod validation schema for LandParcelInput in src/renderer/models/LandParcel.ts" [T035]
Task: "Create Zod validation schema for CreateProjectInput in src/renderer/models/Project.ts" [T036]

# After IPC handlers complete, launch UI components in parallel:
Task: "Expose createProject, saveLandParcel, updateLandParcel in src/preload/index.ts" [T040]
Task: "Create LandConfig UI component in src/renderer/components/LandConfig/LandConfig.tsx" [T041]
Task: "Create ProjectSetup page in src/renderer/pages/ProjectSetup.tsx" [T049]
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Land Setup)
4. Complete Phase 4: User Story 2 (Subdivision)
5. **STOP and VALIDATE**: Test US1 and US2 independently
6. Deploy/demo basic land setup and subdivision calculator

### Incremental Delivery (Add Features Progressively)

1. Foundation (Phases 1-2) → 15 tasks
2. **MVP Release**: US1 + US2 → +42 tasks (T033-T074) - Land setup and subdivision working
3. **Alpha Release**: Add US3 (Social Club) → +18 tasks (T075-T092) - Amenities design complete
4. **Beta Release**: Add US4 (Financial) → +35 tasks (T093-T127) - Full investment analysis
5. **Feature Complete**: Add US5-US8 → +93 tasks (T128-T220) - AI integration, images, import/export, polish
6. Each increment adds value without breaking previous stories

### Parallel Team Strategy

With 3+ developers after Foundational phase:
- **Developer A**: US1 + US2 (MVP critical path)
- **Developer B**: US3 + US4 (Financial analysis)
- **Developer C**: US7 + US8 (Export/Import infrastructure)
- **Developer D**: US5 + US6 (AI integration and images)
- **All**: Phase 11 (Polish) - code review, testing, documentation

---

## Task Summary

- **Total Tasks**: 220
- **Setup Phase**: 15 tasks
- **Foundational Phase**: 17 tasks
- **User Story 1 (Land Setup)**: 19 tasks
- **User Story 2 (Subdivision)**: 23 tasks
- **User Story 3 (Social Club)**: 18 tasks
- **User Story 4 (Financial)**: 35 tasks
- **User Story 5 (AI Integration)**: 15 tasks
- **User Story 6 (Images)**: 18 tasks
- **User Story 7 (Export)**: 18 tasks
- **User Story 8 (Import)**: 21 tasks
- **Polish Phase**: 21 tasks

**Parallelizable Tasks**: 89 tasks marked [P]

**MVP Scope** (Phases 1-4): 74 tasks - Land setup + Subdivision calculation with parking and maintenance room
**Recommended First Release**: Phases 1-6 (US1-US4) - 127 tasks - Complete investment analysis platform

---

## Notes

- All tasks follow checklist format: `- [ ] [ID] [P?] [Story] Description with file path`
- [P] indicates parallelizable tasks (different files, no dependencies)
- [Story] labels (US1-US8) map tasks to user stories for independent implementation
- Each user story phase is independently completable and testable
- Tests are OMITTED per specification requirements (not explicitly requested)
- Stop at any checkpoint to validate story independently before proceeding
- App root directory: D:\fast2ai\AI-Floorplan\src (per FR-099)
- Parking is ALWAYS centralized with 2 spaces per villa (100% mandatory)
- Storage units and maintenance room are ALWAYS required (100% mandatory)
- AI integration uses manual triggers (no automatic generation)
- All financial calculations use proportional cost allocation by lot square meters
