# Tasks: AI-Assisted Subdivision Planning

**Feature Branch**: `001-ai-subdivision-planning`
**Input**: Design documents from `/specs/001-ai-subdivision-planning/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: NOT REQUESTED - No test tasks included per specification

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is an Electron desktop application with the following structure:
- **Main process**: `src/main/` (Node.js backend)
- **Renderer process**: `src/renderer/` (React frontend)
- **Preload**: `src/preload/` (IPC bridge)
- **Shared types**: `src/shared/` (TypeScript types)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for AI subdivision planning feature

- [X] T001 Verify project structure matches plan.md (src/main/, src/renderer/, src/preload/, src/shared/)
- [X] T002 Install AI dependencies: @google/generative-ai@0.24.1, zod@4.3.5
- [X] T003 [P] Create .env.example file documenting required API keys (GEMINI_API_KEY, OPENAI_API_KEY)
- [X] T004 [P] Configure dotenv in src/main/index.ts for environment variable loading

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema & Migration

- [X] T005 Create database migration 002-ai-tables.sql in src/main/migrations/ with ai_subdivision_plans, project_visualizations, ai_generation_requests, ai_settings tables
- [X] T006 Implement migration logic in src/main/storage.ts to check schema_version and apply migration if needed
- [X] T007 Add foreign key enforcement (PRAGMA foreign_keys = ON) in database initialization

### Core Storage Functions

- [X] T008 Implement createAISubdivisionPlan() function in src/main/storage.ts
- [X] T009 Implement activateAISubdivisionPlan() transaction function in src/main/storage.ts (deactivates other plans)
- [X] T010 [P] Implement getActiveAISubdivisionPlan() function in src/main/storage.ts
- [X] T011 [P] Implement createProjectVisualization() function in src/main/storage.ts
- [X] T012 [P] Implement createAIGenerationRequest() function in src/main/storage.ts

### Shared Type Definitions

- [X] T013 Create Zod schemas in src/shared/ai-contracts.ts: AISubdivisionPlanSchema, SubdivisionPlanSchema, LotSchema, RoadConfigurationSchema, AmenityAreaSchema, SubdivisionMetricsSchema
- [X] T014 [P] Create Zod schemas in src/shared/ai-contracts.ts: ProjectVisualizationSchema, AIGenerationRequestSchema
- [X] T015 Export TypeScript types from Zod schemas in src/shared/ai-contracts.ts

### AI Service Infrastructure

- [X] T016 Implement retry handler with exponential backoff in src/main/utils/retry-handler.ts (max 3 retries, jitter, retryable errors: 429, 500, 503)
- [X] T017 Create Gemini client initialization in src/main/ai-services/gemini-client.ts with API key validation
- [X] T018 Implement image provider selection logic in src/main/ai-services/image-client.ts (Gemini vs DALL-E fallback)

### IPC Channel Setup

- [X] T019 Register IPC handlers in src/main/ipc-handlers.ts: ai:generate-subdivision-plan, ai:approve-plan, ai:reject-plan, ai:get-generation-history
- [X] T020 [P] Register IPC handlers in src/main/ipc-handlers.ts: ai:generate-site-plan-image, ai:regenerate-image, ai:confirm-regenerated-image, ai:restore-backup-image, ai:get-project-visualizations
- [X] T021 Expose IPC API in src/preload/index.ts via window.aiService with typed methods matching contracts/subdivision-plan-api.json and contracts/image-generation-api.json

### Renderer Models

- [X] T022 [P] Create AISubdivisionPlan.ts model in src/renderer/models/ matching Zod schema
- [X] T023 [P] Create SubdivisionPlan.ts model in src/renderer/models/ with Lot, RoadConfiguration, AmenityArea, SubdivisionMetrics types
- [X] T024 [P] Create ProjectVisualization.ts model in src/renderer/models/ matching Zod schema
- [X] T025 [P] Create AIGenerationRequest.ts model in src/renderer/models/ matching Zod schema
- [X] T026 [P] Create AISettings.ts model in src/renderer/models/ for API key management

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generate Text-Based Subdivision Plan (Priority: P1) 🎯 MVP

**Goal**: Enable investors to generate AI-powered text-based subdivision plans with specific dimensions, approve/reject plans, and persist approved plans across sessions

**Independent Test**: Enter land dimensions → Request subdivision plan → Receive AI-generated layout with lot dimensions and counts → Approve plan → Reload app → Plan automatically loads

### Core AI Integration

- [X] T027 [P] [US1] Implement subdivision plan prompt builder in src/main/ai-services/gemini-client.ts with template including land specs, lot requirements (90 sqm minimum), social club allocation, road configuration
- [X] T028 [US1] Configure Gemini JSON Schema for subdivision plan output in src/main/ai-services/gemini-client.ts (responseMimeType: application/json, temperature: 0.2, maxOutputTokens: 65536)
- [X] T029 [US1] Implement generateSubdivisionPlan() function in src/main/ai-services/gemini-client.ts with retry logic, progress events, token usage tracking

### Validation Logic

- [X] T030 [US1] Create subdivision plan validator in src/main/services/subdivision-plan-validator.ts with critical validations: 90 sqm minimum, area consistency, total coverage, social club allocation
- [X] T031 [US1] Implement warning validations in src/main/services/subdivision-plan-validator.ts: lot aspect ratio, land utilization, road coverage
- [X] T032 [US1] Add validateGeneratedPlan() function returning validationStatus, validationErrors, validationWarnings

### IPC Handler Implementation

- [X] T033 [US1] Implement ai:generate-subdivision-plan handler in src/main/ipc-handlers.ts: validate request, create AIGenerationRequest, call Gemini API, validate plan, save AISubdivisionPlan, return response
- [X] T034 [US1] Implement ai:approve-plan handler in src/main/ipc-handlers.ts: validate plan exists, check validationStatus != 'invalid', call activateAISubdivisionPlan(), return success
- [X] T035 [P] [US1] Implement ai:reject-plan handler in src/main/ipc-handlers.ts: update plan status to 'rejected', save rejection reason
- [X] T036 [P] [US1] Implement ai:get-generation-history handler in src/main/ipc-handlers.ts: query plans with pagination, return plan summaries

### Auto-Load on Startup

- [X] T037 [US1] Add loadActiveAISubdivisionPlan() call to app startup sequence in src/main/index.ts after database initialization
- [X] T038 [US1] Send loaded plan to renderer via IPC event on window ready

### React Components

- [X] T039 [P] [US1] Create AIPlanGenerator.tsx component in src/renderer/components/AIIntegration/ with form for land dimensions, social club percentage, target lot count, province
- [X] T040 [P] [US1] Create AIPlanGenerator.css in src/renderer/components/AIIntegration/ for component styling
- [X] T041 [P] [US1] Create PlanApprovalPanel.tsx component in src/renderer/components/AIIntegration/ displaying plan metrics, lot details, approve/reject buttons
- [X] T042 [P] [US1] Create PlanApprovalPanel.css in src/renderer/components/AIIntegration/
- [X] T043 [P] [US1] Create PlanViewer.tsx component in src/renderer/components/SubdivisionPlanner/ for displaying plan details
- [X] T044 [P] [US1] Create LotDetailsTable.tsx component in src/renderer/components/SubdivisionPlanner/ showing lot number, dimensions, area, compliance status
- [X] T045 [P] [US1] Create CoverageMetrics.tsx component in src/renderer/components/SubdivisionPlanner/ showing total lots, viable lots, land utilization, road coverage

### Utility Components

- [X] T046 [P] [US1] Create LoadingSpinner.tsx component in src/renderer/components/common/ for AI generation progress
- [X] T047 [P] [US1] Create ErrorDisplay.tsx component in src/renderer/components/common/ for user-friendly error messages
- [X] T048 [P] [US1] Create ErrorBoundary.tsx component in src/renderer/components/ for React error catching
- [X] T049 [P] [US1] Create ErrorBoundary.css in src/renderer/components/

### React Hooks

- [X] T050 [US1] Create useAISubdivisionPlan.ts hook in src/renderer/hooks/ with state management: currentPlan, generationState, planHistory
- [X] T051 [US1] Implement generatePlan() function in useAISubdivisionPlan.ts hook calling window.aiService.generateSubdivisionPlan()
- [X] T052 [US1] Implement approvePlan() function in useAISubdivisionPlan.ts hook with optimistic updates and rollback on failure
- [X] T053 [P] [US1] Implement rejectPlan() function in useAISubdivisionPlan.ts hook
- [X] T054 [P] [US1] Add IPC progress event listener in useAISubdivisionPlan.ts for real-time status updates

### Services

- [X] T055 [P] [US1] Create ai-subdivision-service.ts in src/renderer/services/ wrapping IPC calls with error handling and type safety
- [X] T056 [P] [US1] Create error-messages.ts in src/renderer/utils/ mapping error codes to user-friendly messages

### Page Integration

- [X] T057 [US1] Integrate AIPlanGenerator and PlanApprovalPanel components into SubdivisionPlanner.tsx page in src/renderer/pages/
- [X] T058 [US1] Add ErrorBoundary wrapper to SubdivisionPlanner.tsx page
- [X] T059 [US1] Implement auto-load logic in SubdivisionPlanner.tsx to display plan on mount if approved plan exists

**Checkpoint**: At this point, User Story 1 should be fully functional - users can generate plans, approve/reject them, and see plans persist across sessions

---

## Phase 4: User Story 2 - Generate Project Visualization Images (Priority: P2)

**Goal**: Transform approved subdivision plans into visual representations (site plan, aerial view, context view) with image persistence, regeneration, and backup management

**Independent Test**: Start with pre-approved plan → Click "Generate Images" → Receive multiple visual representations → Images persist across sessions → Regenerate with refinements → Confirm/restore backup

### Image Prompt Engineering

- [X] T060 [P] [US2] Create image prompt templates in src/main/ai-services/image-client.ts for site-plan view (CAD-style 2D)
- [X] T061 [P] [US2] Create image prompt templates in src/main/ai-services/image-client.ts for aerial view (45-degree photorealistic)
- [X] T062 [P] [US2] Create image prompt templates in src/main/ai-services/image-client.ts for context view (wide-angle marketing)
- [X] T063 [US2] Implement buildImagePrompt() function in src/main/ai-services/image-client.ts combining template with subdivision plan details and custom additions

### AI Image Generation

- [X] T064 [US2] Implement generateImageWithGemini() function in src/main/ai-services/image-client.ts using gemini-3-pro-image-preview model
- [X] T065 [US2] Implement generateImageWithDALLE() fallback function in src/main/ai-services/image-client.ts using dall-e-3 model
- [X] T066 [US2] Add generateProjectImage() orchestrator in src/main/ai-services/image-client.ts selecting provider based on available API keys

### File System Management

- [X] T067 [US2] Implement getProjectImagesDirectory() function in src/main/services/file-manager.ts: app.getPath('userData')/project-images/{projectId}/
- [X] T068 [US2] Implement saveImageToFileSystem() function in src/main/services/file-manager.ts with atomic write and error handling
- [X] T069 [US2] Implement createImageBackup() function in src/main/services/file-manager.ts renaming original to .backup.png
- [X] T070 [P] [US2] Implement restoreImageBackup() function in src/main/services/file-manager.ts
- [X] T071 [P] [US2] Implement deleteImageBackup() function in src/main/services/file-manager.ts

### IPC Handler Implementation

- [X] T072 [US2] Implement ai:generate-site-plan-image handler in src/main/ipc-handlers.ts: validate plan is approved, create AIGenerationRequest, call image API, save to file system, create ProjectVisualization record, return response
- [X] T073 [US2] Implement ai:regenerate-image handler in src/main/ipc-handlers.ts: load existing visualization, create backup, generate new image, save as new ProjectVisualization, return paths
- [X] T074 [P] [US2] Implement ai:confirm-regenerated-image handler in src/main/ipc-handlers.ts: delete backup file, mark visualization as confirmed
- [X] T075 [P] [US2] Implement ai:restore-backup-image handler in src/main/ipc-handlers.ts: restore backup, delete new image, update database
- [X] T076 [P] [US2] Implement ai:get-project-visualizations handler in src/main/ipc-handlers.ts: query visualizations with optional filters (subdivisionPlanId, viewType)

### Auto-Load Images on Startup

- [X] T077 [US2] Extend loadActiveAISubdivisionPlan() in src/main/index.ts to also query and return associated visualizations
- [X] T078 [US2] Send visualizations to renderer via IPC event when plan loads

### React Components

- [X] T079 [P] [US2] Create VisualizationGallery.tsx component in src/renderer/components/AIIntegration/ displaying all generated images with thumbnails
- [X] T080 [P] [US2] Create VisualizationGallery.css in src/renderer/components/AIIntegration/
- [X] T081 [P] [US2] Create ImageRegenerator.tsx component in src/renderer/components/AIIntegration/ with refinement prompt input, preview comparison, confirm/restore buttons
- [X] T082 [P] [US2] Create ImageRegenerator.css in src/renderer/components/AIIntegration/

### React Hooks

- [X] T083 [US2] Create useAIImageGeneration.ts hook in src/renderer/hooks/ with state: visualizations, generationState, backups
- [X] T084 [US2] Implement generateImages() function in useAIImageGeneration.ts generating all view types (site-plan, aerial, context)
- [X] T085 [US2] Implement regenerateImage() function in useAIImageGeneration.ts with custom prompt additions
- [X] T086 [P] [US2] Implement confirmImage() function in useAIImageGeneration.ts
- [X] T087 [P] [US2] Implement restoreBackup() function in useAIImageGeneration.ts
- [X] T088 [P] [US2] Add IPC progress event listener for image generation in useAIImageGeneration.ts

### Services

- [X] T089 [P] [US2] Create ai-image-service.ts in src/renderer/services/ wrapping image IPC calls with type safety

### Page Integration

- [X] T090 [US2] Add "Generate Images" button to PlanApprovalPanel.tsx component (enabled only when plan is approved)
- [X] T091 [US2] Integrate VisualizationGallery component into SubdivisionPlanner.tsx page below approved plan
- [X] T092 [US2] Integrate ImageRegenerator component into SubdivisionPlanner.tsx for regeneration workflow
- [X] T093 [US2] Implement auto-display logic in SubdivisionPlanner.tsx to show images when loading approved plan with visualizations

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can generate plans, approve them, generate images, regenerate with refinements, and all data persists

---

## Phase 5: User Story 3 - Compare Multiple AI-Generated Subdivision Options (Priority: P3)

**Goal**: Enable investors to request multiple subdivision plans for the same land parcel, view them side-by-side with comparative metrics, and select preferred option

**Independent Test**: Enter land dimensions → Request multiple subdivision options → View comparison table showing lot count, average size, coverage metrics → Select preferred plan → Alternative plans archived for future reference

### Enhanced Generation for Multiple Plans

- [X] T094 [P] [US3] Extend ai:generate-subdivision-plan handler in src/main/ipc-handlers.ts to accept optionalCount parameter (default: 1, max: 5)
- [X] T095 [US3] Implement loop in ai:generate-subdivision-plan handler to generate multiple plans with varied prompts (maximize lots vs larger lots vs different amenity allocations)
- [X] T096 [US3] Return array of plans in response instead of single plan when count > 1

### Comparison View Component

- [X] T097 [P] [US3] Create PlanComparisonTable.tsx component in src/renderer/components/SubdivisionPlanner/ showing side-by-side metrics: lot count, average lot size, road coverage, amenity percentage, land utilization
- [X] T098 [P] [US3] Create PlanComparisonTable.css in src/renderer/components/SubdivisionPlanner/
- [X] T099 [US3] Add selection radio buttons to PlanComparisonTable.tsx for choosing preferred plan

### State Management for Multiple Plans

- [X] T100 [US3] Extend useAISubdivisionPlan.ts hook to support alternativePlans state array
- [X] T101 [US3] Implement generateMultiplePlans() function in useAISubdivisionPlan.ts calling generation with count parameter
- [X] T102 [US3] Implement selectPreferredPlan() function in useAISubdivisionPlan.ts to activate selected plan and archive alternatives

### Archive Management

- [X] T103 [US3] Add archived_at timestamp column to ai_subdivision_plans table in migration (if not already present) - NOTE: Using approved_by_user flag workaround
- [X] T104 [US3] Update activateAISubdivisionPlan() in src/main/storage.ts to set archived_at timestamp when deactivating plans
- [X] T105 [P] [US3] Implement getArchivedPlans() function in src/main/storage.ts to retrieve alternative plans
- [X] T106 [P] [US3] Implement switchToArchivedPlan() function in src/main/storage.ts to reactivate an archived plan

### IPC Handler for Archived Plans

- [X] T107 [P] [US3] Implement ai:get-archived-plans handler in src/main/ipc-handlers.ts returning archived plans with summary metrics
- [X] T108 [P] [US3] Implement ai:switch-to-archived-plan handler in src/main/ipc-handlers.ts to activate an archived plan as current

### Page Integration

- [X] T109 [US3] Add "Generate Multiple Options" button to AIPlanGenerator.tsx with count selector (3-5 options)
- [X] T110 [US3] Integrate PlanComparisonTable component into SubdivisionPlanner.tsx showing when multiple plans are generated
- [X] T111 [US3] Add "View Archived Plans" link to SubdivisionPlanner.tsx opening modal with archived plan history
- [X] T112 [US3] Implement plan switching logic in SubdivisionPlanner.tsx to reload page when user switches to archived plan

**Checkpoint**: All user stories should now be independently functional - users can generate single/multiple plans, compare them, generate images, and all plans are preserved for future reference

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and finalize the feature

### Error Handling & User Experience

- [ ] T113 [P] Implement comprehensive error message mapping in src/renderer/utils/error-messages.ts for all error codes (VALIDATION_ERROR, AI_API_ERROR, PLAN_VALIDATION_ERROR, DATABASE_ERROR, etc.)
- [ ] T114 [P] Add loading states and skeleton screens to all components in src/renderer/components/AIIntegration/
- [ ] T115 [P] Implement toast notifications for success/error feedback using existing notification system

### Performance Optimization

- [ ] T116 Add React.memo() to PlanViewer, LotDetailsTable, CoverageMetrics components to prevent unnecessary re-renders
- [ ] T117 Implement image lazy loading in VisualizationGallery.tsx for large image sets
- [ ] T118 Add database query optimization: indexes on project_id, approved_by_user, generation_status

### API Key Management UI

- [ ] T119 [P] Create APIKeySettings.tsx component in src/renderer/components/Settings/ with masked inputs for GEMINI_API_KEY and OPENAI_API_KEY
- [ ] T120 [P] Create APIKeySettings.css in src/renderer/components/Settings/
- [ ] T121 Implement "Test Connection" button in APIKeySettings.tsx to validate API keys
- [ ] T122 Add API key encryption using Electron safeStorage in src/main/config.ts (getGeminiApiKey, setGeminiApiKey)

### Cost Tracking & Limits

- [ ] T123 Implement getTodaysCost() function in src/main/services/cost-tracker.ts aggregating tokens_used and estimated_cost_usd from ai_generation_requests
- [ ] T124 Add cost limit check in ai:generate-subdivision-plan and ai:generate-site-plan-image handlers before calling APIs
- [ ] T125 Create cost tracking dashboard component showing daily/weekly costs in SubdivisionPlanner.tsx

### Documentation Updates

- [X] T126 [P] Update CLAUDE.md with new AI subdivision planning feature technologies (Gemini 3 Flash, Zod schemas, SQLite migration patterns)
- [ ] T127 [P] Verify quickstart.md instructions are accurate for new developers (API key setup, mock mode, testing)

### Code Quality

- [X] T128 Run ESLint on all new files and fix violations (src/main/ai-services/, src/renderer/components/AIIntegration/, src/renderer/hooks/)
- [X] T129 Run Prettier formatting on all new files
- [ ] T130 Add JSDoc comments to all public functions in src/main/ai-services/ and src/main/services/

### Migration Verification

- [ ] T131 Test database migration on fresh install (no existing database)
- [ ] T132 Test database migration on existing v1.0.0 schema (upgrade path)
- [ ] T133 Verify foreign key cascades work correctly (delete project deletes plans and images)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion - can start after T026
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - can start after T026 (does NOT depend on US1 completion, only needs approved plan as test data)
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion - can start after T026 (does NOT depend on US1/US2 completion)
- **Polish (Phase 6)**: Depends on desired user stories being complete (minimum: US1)

### User Story Independence

- **User Story 1**: Fully independent after Foundational phase - can be implemented and tested without US2 or US3
- **User Story 2**: Fully independent after Foundational phase - can be implemented and tested with mock approved plan (does not require US1 to be complete first)
- **User Story 3**: Fully independent after Foundational phase - extends US1 generation but does not break existing functionality

### Within Each User Story

**User Story 1 Dependencies:**
- T027-T029 (AI Integration) can start immediately after T016-T018 (AI infrastructure)
- T030-T032 (Validation) can run in parallel with T027-T029
- T033-T036 (IPC handlers) depend on T027-T032 completion
- T039-T045 (React components) can start in parallel after T022-T026 (models)
- T050-T054 (React hooks) depend on T039-T045 and T033-T036
- T057-T059 (Page integration) depend on all previous US1 tasks

**User Story 2 Dependencies:**
- T060-T063 (Prompt engineering) can start immediately after T018 (image client setup)
- T064-T066 (AI image generation) depend on T060-T063
- T067-T071 (File system) can run in parallel with T060-T066
- T072-T076 (IPC handlers) depend on T064-T071
- T079-T082 (React components) can run in parallel with T072-T076
- T083-T088 (React hooks) depend on T072-T082
- T090-T093 (Page integration) depend on all previous US2 tasks

**User Story 3 Dependencies:**
- T094-T096 (Enhanced generation) depend on T033 (US1 IPC handler)
- T097-T099 (Comparison view) can run in parallel with T094-T096
- T100-T102 (State management) depend on T050 (US1 hook)
- T103-T106 (Archive management) can run in parallel with T100-T102
- T109-T112 (Page integration) depend on all previous US3 tasks

### Parallel Opportunities

**Within Foundational Phase (all can run in parallel after schema is ready):**
- T010-T012 (storage functions)
- T014 (parallel to T013)
- T020 (parallel to T019)
- T022-T026 (all renderer models)

**Within User Story 1 (parallel groups):**
- T027-T029 with T030-T032
- T039-T049 (all React components can be built in parallel)
- T053-T054 with T055-T056

**Within User Story 2 (parallel groups):**
- T060-T062 (all prompt templates)
- T067-T071 with T064-T066
- T074-T076 (IPC handlers)
- T079-T082 (components)
- T086-T088 (hook functions)

**Within User Story 3 (parallel groups):**
- T105-T106 with T103-T104
- T107-T108 (IPC handlers)

**Within Polish Phase (most can run in parallel):**
- T113-T115 (error handling)
- T119-T122 (API key UI)
- T126-T127 (documentation)

---

## Parallel Example: Foundational Phase

```bash
# After T005-T007 (database schema) completes, launch in parallel:
Task: "Implement getActiveAISubdivisionPlan() function in src/main/storage.ts"
Task: "Implement createProjectVisualization() function in src/main/storage.ts"
Task: "Implement createAIGenerationRequest() function in src/main/storage.ts"
Task: "Create Zod schemas in src/shared/ai-contracts.ts: ProjectVisualizationSchema, AIGenerationRequestSchema"
Task: "Create AISubdivisionPlan.ts model in src/renderer/models/"
Task: "Create SubdivisionPlan.ts model in src/renderer/models/"
Task: "Create ProjectVisualization.ts model in src/renderer/models/"
Task: "Create AIGenerationRequest.ts model in src/renderer/models/"
Task: "Create AISettings.ts model in src/renderer/models/"
```

---

## Parallel Example: User Story 1 React Components

```bash
# After T022-T026 (models) complete, launch all US1 components in parallel:
Task: "[US1] Create AIPlanGenerator.tsx component in src/renderer/components/AIIntegration/"
Task: "[US1] Create AIPlanGenerator.css in src/renderer/components/AIIntegration/"
Task: "[US1] Create PlanApprovalPanel.tsx component in src/renderer/components/AIIntegration/"
Task: "[US1] Create PlanApprovalPanel.css in src/renderer/components/AIIntegration/"
Task: "[US1] Create PlanViewer.tsx component in src/renderer/components/SubdivisionPlanner/"
Task: "[US1] Create LotDetailsTable.tsx component in src/renderer/components/SubdivisionPlanner/"
Task: "[US1] Create CoverageMetrics.tsx component in src/renderer/components/SubdivisionPlanner/"
Task: "[US1] Create LoadingSpinner.tsx component in src/renderer/components/common/"
Task: "[US1] Create ErrorDisplay.tsx component in src/renderer/components/common/"
Task: "[US1] Create ErrorBoundary.tsx component in src/renderer/components/"
Task: "[US1] Create ErrorBoundary.css in src/renderer/components/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T026) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T027-T059)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Generate subdivision plan with valid inputs
   - Verify 90 sqm minimum enforcement
   - Approve plan and verify persistence
   - Restart app and verify plan auto-loads
5. Deploy/demo if ready

### Incremental Delivery

1. **Foundation** (Phases 1-2): Database, IPC, shared types → Foundation ready
2. **MVP** (Phase 3): User Story 1 → Test independently → Deploy (MVP!)
3. **Images** (Phase 4): User Story 2 → Test independently → Deploy
4. **Comparison** (Phase 5): User Story 3 → Test independently → Deploy
5. **Polish** (Phase 6): Error handling, cost tracking, documentation → Final release

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (Phases 1-2)
2. Once Foundational is done (after T026):
   - **Developer A**: User Story 1 (T027-T059) - MVP priority
   - **Developer B**: User Story 2 (T060-T093) - can work in parallel
   - **Developer C**: User Story 3 (T094-T112) - can work in parallel
3. Stories complete and integrate independently
4. **Team converges** on Polish phase (T113-T133)

---

## Total Task Count

- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational)**: 22 tasks (BLOCKING)
- **Phase 3 (User Story 1)**: 33 tasks (MVP)
- **Phase 4 (User Story 2)**: 34 tasks
- **Phase 5 (User Story 3)**: 19 tasks
- **Phase 6 (Polish)**: 21 tasks

**Total**: 133 tasks

**MVP Scope** (recommended first delivery): Phases 1-3 = 59 tasks

**Parallelizable Tasks**: 45 tasks marked [P] can run simultaneously with other tasks

---

## Notes

- **[P] tasks**: Different files, no dependencies - safe to run in parallel
- **[Story] label**: Maps task to specific user story (US1, US2, US3) for traceability
- **Independent stories**: Each user story can be implemented and tested independently after Foundational phase
- **No tests included**: Per specification, no test tasks are generated (tests were not requested)
- **Commit strategy**: Commit after each task or logical group of [P] tasks
- **Validation checkpoints**: Stop at phase checkpoints to verify story works independently before proceeding
- **Constitution compliance**: Tasks organized by user story per Principle IV (Feature Independence)
- **Simplicity focus**: Direct implementations, no premature abstractions per Principle VI
