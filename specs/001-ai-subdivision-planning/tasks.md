# Tasks: AI-Assisted Subdivision Planning

**Feature**: 001-ai-subdivision-planning
**Version**: 1.0.0
**Last Updated**: 2026-01-11

This task list implements the AI-Assisted Subdivision Planning feature with three independent user stories (P1, P2, P3) built on a common foundational layer.

---

## Task Format

```
- [ ] [TaskID] [P?] [Story?] Description with file path
```

- **TaskID**: Sequential T001, T002, T003...
- **[P] marker**: Parallelizable task (can run concurrently with other [P] tasks in same phase)
- **[Story] label**: [US1], [US2], [US3] for user story tasks (NOT for setup/foundational/polish)
- **File paths**: Exact absolute paths from project structure

---

## Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
    ├→ Phase 3 (US1 - P1) ← MVP
    ├→ Phase 4 (US2 - P2) ← Can run in parallel with US1 & US3
    └→ Phase 5 (US3 - P3) ← Can run in parallel with US1 & US2
    ↓
Phase 6 (Polish)
```

**Critical Path**: Setup → Foundational → US1 (MVP) → Polish
**Parallel Delivery**: After Foundational, US1/US2/US3 can be developed by separate teams simultaneously

---

## Phase 1: Setup (Project Initialization)

### Dependencies Installation

- [ ] [T001] [P] Install Gemini AI SDK dependency in package.json at `D:\fast2ai\AI-Floorplan\package.json`
- [ ] [T002] [P] Install node-fetch or axios for HTTP requests if needed at `D:\fast2ai\AI-Floorplan\package.json`
- [ ] [T003] [P] Install crypto module dependencies for API key encryption at `D:\fast2ai\AI-Floorplan\package.json`

### Environment Configuration

- [ ] [T004] Create .env.example template with AI API key placeholders at `D:\fast2ai\AI-Floorplan\.env.example`
- [ ] [T005] Update .gitignore to exclude .env and AI-generated images directory at `D:\fast2ai\AI-Floorplan\.gitignore`
- [ ] [T006] Create AI mock mode configuration for offline testing in environment variables at `D:\fast2ai\AI-Floorplan\.env.example`

### Documentation Setup

- [ ] [T007] Verify quickstart.md completeness for API key setup at `D:\fast2ai\AI-Floorplan\specs\001-ai-subdivision-planning\quickstart.md`

---

## Phase 2: Foundational (BLOCKS All User Stories)

**CRITICAL**: All tasks in this phase MUST complete before any user story implementation can begin.

### Shared Contracts & Types

- [ ] [T008] [P] Create shared AI contracts file with Zod schemas at `D:\fast2ai\AI-Floorplan\src\shared\ai-contracts.ts`
- [ ] [T009] [P] Copy IPC contract definitions from spec to `D:\fast2ai\AI-Floorplan\src\shared\ai-contracts.ts`
- [ ] [T010] Validate all Zod schemas compile without errors at `D:\fast2ai\AI-Floorplan\src\shared\ai-contracts.ts`

### Preload Layer

- [ ] [T011] Extend preload script to expose AI IPC channels via contextBridge at `D:\fast2ai\AI-Floorplan\src\preload\index.ts`
- [ ] [T012] Add aiService API exposure with all 10 IPC methods at `D:\fast2ai\AI-Floorplan\src\preload\index.ts`
- [ ] [T013] Add onGenerationProgress event listener registration at `D:\fast2ai\AI-Floorplan\src\preload\index.ts`

### Database Schema Migration

- [ ] [T014] Create migration script for ai_subdivision_plans table with all fields from data-model.md at `D:\fast2ai\AI-Floorplan\src\main\migrations\002-ai-tables.sql`
- [ ] [T015] Create ai_generation_requests table with audit trail fields at `D:\fast2ai\AI-Floorplan\src\main\migrations\002-ai-tables.sql`
- [ ] [T016] Create project_visualizations table with image metadata fields at `D:\fast2ai\AI-Floorplan\src\main\migrations\002-ai-tables.sql`
- [ ] [T017] Create ai_settings table with user preferences and encrypted API keys at `D:\fast2ai\AI-Floorplan\src\main\migrations\002-ai-tables.sql`
- [ ] [T018] Create indexes on project_id, approved_by_user, generation_status fields at `D:\fast2ai\AI-Floorplan\src\main\migrations\002-ai-tables.sql`
- [ ] [T019] Add foreign key constraints to projects and land_parcels tables at `D:\fast2ai\AI-Floorplan\src\main\migrations\002-ai-tables.sql`
- [ ] [T020] Update schema version to 1.1.0 in app_metadata table at `D:\fast2ai\AI-Floorplan\src\main\migrations\002-ai-tables.sql`
- [ ] [T021] Execute migration and verify all tables created successfully at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`

### Main Process Infrastructure

- [ ] [T022] [P] Create rate limiter utility with token bucket algorithm at `D:\fast2ai\AI-Floorplan\src\main\utils\rate-limiter.ts`
- [ ] [T023] [P] Create exponential backoff error handler utility at `D:\fast2ai\AI-Floorplan\src\main\utils\retry-handler.ts`
- [ ] [T024] [P] Create API key encryption/decryption utility using crypto at `D:\fast2ai\AI-Floorplan\src\main\utils\crypto.ts`

### AI Service Clients

- [ ] [T025] [P] Create Gemini client stub with API initialization at `D:\fast2ai\AI-Floorplan\src\main\ai-services\gemini-client.ts`
- [ ] [T026] [P] Implement Gemini text generation method with prompt formatting at `D:\fast2ai\AI-Floorplan\src\main\ai-services\gemini-client.ts`
- [ ] [T027] [P] Add token counting and cost estimation to Gemini client at `D:\fast2ai\AI-Floorplan\src\main\ai-services\gemini-client.ts`
- [ ] [T028] [P] Add error handling and retry logic to Gemini client at `D:\fast2ai\AI-Floorplan\src\main\ai-services\gemini-client.ts`
- [ ] [T029] [P] Create Nano Banana Pro client stub with API initialization at `D:\fast2ai\AI-Floorplan\src\main\ai-services\nanobananapro-client.ts`
- [ ] [T030] [P] Implement image generation method with multi-view support at `D:\fast2ai\AI-Floorplan\src\main\ai-services\nanobananapro-client.ts`
- [ ] [T031] [P] Add image download and file system storage to image client at `D:\fast2ai\AI-Floorplan\src\main\ai-services\nanobananapro-client.ts`
- [ ] [T032] [P] Add error handling and polling for async image generation at `D:\fast2ai\AI-Floorplan\src\main\ai-services\nanobananapro-client.ts`

### IPC Handlers (Main Process)

- [ ] [T033] Extend ipc-handlers.ts with ai:generate-subdivision-plan handler at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T034] Add ai:generate-site-plan-image handler at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T035] Add ai:approve-plan handler at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T036] Add ai:reject-plan handler at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T037] Add ai:get-generation-history handler at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T038] Add ai:get-session-cost handler at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T039] Add ai:get-settings handler at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T040] Add ai:update-settings handler at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T041] Add ai:set-api-key handler with encryption at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T042] Add ai:test-api-key handler with validation at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T043] Add ai:generation-progress event emitter at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T044] Add Zod validation to all IPC handlers using schemas from ai-contracts.ts at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`

### Storage Layer (Main Process)

- [ ] [T045] [P] Extend storage.ts with createAISubdivisionPlan CRUD operation at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T046] [P] Add getAISubdivisionPlanById, getAISubdivisionPlansByProject methods at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T047] [P] Add updateAISubdivisionPlan, approveAISubdivisionPlan methods at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T048] [P] Add createAIGenerationRequest and query methods at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T049] [P] Add createProjectVisualization CRUD operations at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T050] [P] Add getProjectVisualizationsByPlan, getProjectVisualizationsByProject methods at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T051] [P] Add createAISettings, getAISettings, updateAISettings methods at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T052] Add transaction support for multi-table operations at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`

**CHECKPOINT**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generate Text-Based Subdivision Plan (Priority: P1) 🎯 MVP

All tasks in this phase support US1 - the minimum viable product.

### Models (Renderer)

- [ ] [T053] [US1] [P] Create AISubdivisionPlan model interface at `D:\fast2ai\AI-Floorplan\src\renderer\models\AISubdivisionPlan.ts`
- [ ] [T054] [US1] [P] Create AIGenerationRequest model interface at `D:\fast2ai\AI-Floorplan\src\renderer\models\AIGenerationRequest.ts`
- [ ] [T055] [US1] [P] Create AISettings model interface at `D:\fast2ai\AI-Floorplan\src\renderer\models\AISettings.ts`
- [ ] [T056] [US1] Add SubdivisionPlan, Lot, RoadConfiguration, AmenityArea types at `D:\fast2ai\AI-Floorplan\src\renderer\models\SubdivisionPlan.ts`

### Services (Renderer Business Logic)

- [ ] [T057] [US1] Create ai-subdivision-service.ts stub at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`
- [ ] [T058] [US1] Implement generateSubdivisionPrompt function with land parcel data at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`
- [ ] [T059] [US1] Implement validateSubdivisionPlan function enforcing 90 sqm minimum at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`
- [ ] [T060] [US1] Implement parseAIResponse to convert Gemini JSON to SubdivisionPlan at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`
- [ ] [T061] [US1] Add retry logic wrapper for failed generations at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`
- [ ] [T062] [US1] Add calculateSubdivisionMetrics helper function at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`

### React Hooks

- [ ] [T063] [US1] Create useAISubdivisionPlan hook with state management at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAISubdivisionPlan.ts`
- [ ] [T064] [US1] Add generatePlan async function with progress tracking at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAISubdivisionPlan.ts`
- [ ] [T065] [US1] Add approvePlan and rejectPlan functions at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAISubdivisionPlan.ts`
- [ ] [T066] [US1] Add error state handling and retry mechanism at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAISubdivisionPlan.ts`
- [ ] [T067] [US1] Add progress event listener integration at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAISubdivisionPlan.ts`

### Components (UI)

- [ ] [T068] [US1] Create AIPlanGenerator.tsx component skeleton at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\AIPlanGenerator.tsx`
- [ ] [T069] [US1] Add land parcel input form with dimensions at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\AIPlanGenerator.tsx`
- [ ] [T070] [US1] Add "Generate Subdivision Plan" button with loading state at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\AIPlanGenerator.tsx`
- [ ] [T071] [US1] Add progress indicator showing generation status at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\AIPlanGenerator.tsx`
- [ ] [T072] [US1] Add error display with retry button at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\AIPlanGenerator.tsx`
- [ ] [T073] [US1] Create PlanApprovalPanel.tsx component skeleton at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanApprovalPanel.tsx`
- [ ] [T074] [US1] Display subdivision plan summary with lot count and metrics at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanApprovalPanel.tsx`
- [ ] [T075] [US1] Display lot dimensions table with 90 sqm compliance indicators at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanApprovalPanel.tsx`
- [ ] [T076] [US1] Display road configuration and amenity areas at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanApprovalPanel.tsx`
- [ ] [T077] [US1] Add Approve and Reject buttons with feedback textarea at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanApprovalPanel.tsx`
- [ ] [T078] [US1] Add validation warnings display for non-compliant lots at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanApprovalPanel.tsx`

### Integration

- [ ] [T079] [US1] Connect AIPlanGenerator to useAISubdivisionPlan hook at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\AIPlanGenerator.tsx`
- [ ] [T080] [US1] Connect PlanApprovalPanel to useAISubdivisionPlan hook at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanApprovalPanel.tsx`
- [ ] [T081] [US1] Wire IPC calls from service layer to main process handlers at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`
- [ ] [T082] [US1] Verify database persistence for approved plans at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T083] [US1] Integrate AI plan generator into main SubdivisionPlanner page at `D:\fast2ai\AI-Floorplan\src\renderer\pages\SubdivisionPlanner.tsx`

**CHECKPOINT**: User Story 1 independently testable - can generate, review, approve/reject plans

---

## Phase 4: User Story 2 - Generate Project Visualization Images (Priority: P2)

All tasks in this phase support US2 - visualization after plan approval.

### Models (Renderer)

- [ ] [T084] [US2] [P] Verify ProjectVisualization model exists or create at `D:\fast2ai\AI-Floorplan\src\renderer\models\ProjectVisualization.ts`
- [ ] [T085] [US2] [P] Add ViewType and ImageFormat enums to model at `D:\fast2ai\AI-Floorplan\src\renderer\models\ProjectVisualization.ts`

### Services (Renderer Business Logic)

- [ ] [T086] [US2] Create ai-image-service.ts stub at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-image-service.ts`
- [ ] [T087] [US2] Implement generateImagePrompt function for site-plan view at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-image-service.ts`
- [ ] [T088] [US2] Implement generateImagePrompt function for aerial view at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-image-service.ts`
- [ ] [T089] [US2] Implement generateImagePrompt function for context view at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-image-service.ts`
- [ ] [T090] [US2] Add async polling logic for image generation progress at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-image-service.ts`
- [ ] [T091] [US2] Add file size validation for 10MB limit at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-image-service.ts`

### React Hooks

- [ ] [T092] [US2] Create useAIImageGeneration hook with multi-image state at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAIImageGeneration.ts`
- [ ] [T093] [US2] Add generateImage async function with view type parameter at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAIImageGeneration.ts`
- [ ] [T094] [US2] Add regenerateImage function with custom prompt refinements at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAIImageGeneration.ts`
- [ ] [T095] [US2] Add progress tracking for each view type at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAIImageGeneration.ts`
- [ ] [T096] [US2] Add error handling per image generation request at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAIImageGeneration.ts`

### Components (UI)

- [ ] [T097] [US2] Create VisualizationGallery.tsx component skeleton at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\VisualizationGallery.tsx`
- [ ] [T098] [US2] Add multi-perspective image display grid (site-plan, aerial, context) at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\VisualizationGallery.tsx`
- [ ] [T099] [US2] Add image loading indicators per view type at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\VisualizationGallery.tsx`
- [ ] [T100] [US2] Add image zoom and preview functionality at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\VisualizationGallery.tsx`
- [ ] [T101] [US2] Add "Save to Project" button for each image at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\VisualizationGallery.tsx`
- [ ] [T102] [US2] Create ImageRegenerator.tsx component skeleton at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\ImageRegenerator.tsx`
- [ ] [T103] [US2] Add feedback textarea for regeneration prompts at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\ImageRegenerator.tsx`
- [ ] [T104] [US2] Add "Regenerate" button with loading state at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\ImageRegenerator.tsx`
- [ ] [T105] [US2] Display original prompt with editable refinements at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\ImageRegenerator.tsx`

### File System Integration

- [ ] [T106] [US2] Create image storage directory structure in main process at `D:\fast2ai\AI-Floorplan\src\main\file-system.ts`
- [ ] [T107] [US2] Implement saveImageToFile function with path management at `D:\fast2ai\AI-Floorplan\src\main\file-system.ts`
- [ ] [T108] [US2] Implement getImageFromFile function for retrieval at `D:\fast2ai\AI-Floorplan\src\main\file-system.ts`
- [ ] [T109] [US2] Add file size validation before storage at `D:\fast2ai\AI-Floorplan\src\main\file-system.ts`

### Integration

- [ ] [T110] [US2] Connect VisualizationGallery to useAIImageGeneration hook at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\VisualizationGallery.tsx`
- [ ] [T111] [US2] Connect ImageRegenerator to useAIImageGeneration hook at `D:\fast2ai\AI-Floorplan\src\renderer\components\ImageViewer\ImageRegenerator.tsx`
- [ ] [T112] [US2] Wire image generation IPC calls from service to main process at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-image-service.ts`
- [ ] [T113] [US2] Verify image persistence to database and file system at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T114] [US2] Integrate visualization gallery into FinancialAnalysis page at `D:\fast2ai\AI-Floorplan\src\renderer\pages\FinancialAnalysis.tsx`

**CHECKPOINT**: User Story 2 independently testable - can generate images from pre-approved plans

---

## Phase 5: User Story 3 - Compare Multiple Subdivision Options (Priority: P3)

All tasks in this phase support US3 - advanced comparison mode.

### Services (Renderer Business Logic)

- [ ] [T115] [US3] Extend ai-subdivision-service.ts with generateMultiplePlans function at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`
- [ ] [T116] [US3] Implement batch generation logic for 3-5 plans with variation parameters at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`
- [ ] [T117] [US3] Add comparison metrics calculation (lot count, size, coverage, costs) at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`
- [ ] [T118] [US3] Implement activatePlan function to switch active plan at `D:\fast2ai\AI-Floorplan\src\renderer\services\ai-subdivision-service.ts`

### React Hooks

- [ ] [T119] [US3] Extend useAISubdivisionPlan with multi-plan state management at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAISubdivisionPlan.ts`
- [ ] [T120] [US3] Add generateMultiplePlans async function at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAISubdivisionPlan.ts`
- [ ] [T121] [US3] Add selectPlan function to mark plan as active at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAISubdivisionPlan.ts`
- [ ] [T122] [US3] Add progress tracking for batch generation at `D:\fast2ai\AI-Floorplan\src\renderer\hooks\useAISubdivisionPlan.ts`

### Components (UI)

- [ ] [T123] [US3] Create PlanComparisonView.tsx component skeleton at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanComparisonView.tsx`
- [ ] [T124] [US3] Add comparison table with columns for lot count, avg size, coverage, cost at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanComparisonView.tsx`
- [ ] [T125] [US3] Add plan rows with selectable radio buttons at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanComparisonView.tsx`
- [ ] [T126] [US3] Add visual diff highlighting for key metrics at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanComparisonView.tsx`
- [ ] [T127] [US3] Add "Select as Active Plan" button at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanComparisonView.tsx`
- [ ] [T128] [US3] Add "Request More Options" button to regenerate alternatives at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanComparisonView.tsx`

### Storage Layer

- [ ] [T129] [US3] Extend storage.ts with activateAISubdivisionPlan function at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T130] [US3] Add archiveAISubdivisionPlan function to deactivate previous active plan at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T131] [US3] Add getAlternativePlans query to retrieve archived options at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`

### Integration

- [ ] [T132] [US3] Connect PlanComparisonView to useAISubdivisionPlan hook at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanComparisonView.tsx`
- [ ] [T133] [US3] Wire plan selection and archiving through IPC handlers at `D:\fast2ai\AI-Floorplan\src\main\ipc-handlers.ts`
- [ ] [T134] [US3] Verify plan switching updates database active status at `D:\fast2ai\AI-Floorplan\src\main\storage.ts`
- [ ] [T135] [US3] Integrate comparison view into SubdivisionPlanner page at `D:\fast2ai\AI-Floorplan\src\renderer\pages\SubdivisionPlanner.tsx`

**CHECKPOINT**: User Story 3 independently testable - can compare and select plans

---

## Phase 6: Polish & Cross-Cutting Concerns

### Error Messaging

- [ ] [T136] [P] Standardize error messages across all AI operations with user-friendly language at `D:\fast2ai\AI-Floorplan\src\renderer\utils\error-messages.ts`
- [ ] [T137] [P] Add error boundary component for AI features at `D:\fast2ai\AI-Floorplan\src\renderer\components\ErrorBoundary.tsx`
- [ ] [T138] Add API-specific error code mapping to user messages at `D:\fast2ai\AI-Floorplan\src\renderer\utils\error-messages.ts`

### Loading States

- [ ] [T139] [P] Create reusable LoadingSpinner component for AI operations at `D:\fast2ai\AI-Floorplan\src\renderer\components\common\LoadingSpinner.tsx`
- [ ] [T140] [P] Create ProgressBar component with percentage display at `D:\fast2ai\AI-Floorplan\src\renderer\components\common\ProgressBar.tsx`
- [ ] [T141] Add skeleton loading states for plan review panels at `D:\fast2ai\AI-Floorplan\src\renderer\components\SubdivisionPlanner\PlanApprovalPanel.tsx`

### Cost Tracking UI

- [ ] [T142] Create CostTracker component showing session cost at `D:\fast2ai\AI-Floorplan\src\renderer\components\common\CostTracker.tsx`
- [ ] [T143] Add cost warning modal for expensive operations at `D:\fast2ai\AI-Floorplan\src\renderer\components\common\CostWarningModal.tsx`
- [ ] [T144] Display cost breakdown by API service (Gemini vs image) at `D:\fast2ai\AI-Floorplan\src\renderer\components\common\CostTracker.tsx`

### API Key Management UI

- [ ] [T145] Create APIKeySettings component with secure input fields at `D:\fast2ai\AI-Floorplan\src\renderer\components\Settings\APIKeySettings.tsx`
- [ ] [T146] Add "Test API Key" button with validation feedback at `D:\fast2ai\AI-Floorplan\src\renderer\components\Settings\APIKeySettings.tsx`
- [ ] [T147] Add API key status indicators (valid/invalid/not-set) at `D:\fast2ai\AI-Floorplan\src\renderer\components\Settings\APIKeySettings.tsx`
- [ ] [T148] Integrate API key settings into main Settings page at `D:\fast2ai\AI-Floorplan\src\renderer\pages\Settings.tsx`

### Documentation Validation

- [ ] [T149] Test quickstart.md setup instructions with fresh environment at `D:\fast2ai\AI-Floorplan\specs\001-ai-subdivision-planning\quickstart.md`
- [ ] [T150] Verify all API key acquisition steps are accurate at `D:\fast2ai\AI-Floorplan\specs\001-ai-subdivision-planning\quickstart.md`
- [ ] [T151] Test mock AI mode for offline development at `D:\fast2ai\AI-Floorplan\src\main\ai-services\gemini-client.ts`

---

## Summary

**Total Tasks**: 151
**Phases**: 6
**User Stories**: 3 (US1 P1 MVP, US2 P2, US3 P3)

### Task Distribution

- **Phase 1 (Setup)**: 7 tasks
- **Phase 2 (Foundational)**: 45 tasks (BLOCKS all user stories)
- **Phase 3 (US1 - P1 MVP)**: 31 tasks
- **Phase 4 (US2 - P2)**: 31 tasks
- **Phase 5 (US3 - P3)**: 21 tasks
- **Phase 6 (Polish)**: 16 tasks

### Parallel Opportunities

**Within Foundational Phase**:
- T008-T010 (Contracts) can run in parallel
- T022-T024 (Utilities) can run in parallel
- T025-T032 (AI Clients) can run in parallel
- T045-T051 (Storage CRUD) can run in parallel

**Within US1**:
- T053-T056 (Models) can run in parallel

**Across User Stories (after Foundational completes)**:
- US1 (T053-T083), US2 (T084-T114), US3 (T115-T135) can all run in parallel

**Within Polish Phase**:
- T136-T138 (Error messaging) can run in parallel
- T139-T141 (Loading states) can run in parallel

### Critical Path to MVP

1. Setup (T001-T007) → 7 tasks
2. Foundational (T008-T052) → 45 tasks
3. US1 Models (T053-T056) → 4 tasks
4. US1 Services (T057-T062) → 6 tasks
5. US1 Hooks (T063-T067) → 5 tasks
6. US1 Components (T068-T078) → 11 tasks
7. US1 Integration (T079-T083) → 5 tasks
8. Polish (T136-T151) → 16 tasks

**Total MVP Tasks**: 99 tasks

### Implementation Strategy

**Week 1**: Setup + Foundational (Complete database, IPC, AI clients)
**Week 2**: US1 Implementation (Generate and approve text plans)
**Week 3**: US2 + US3 Implementation (Parallel teams for visualization and comparison)
**Week 4**: Polish + Testing + Documentation validation

### Independent Testing Checkpoints

1. **After Phase 2**: Foundation can be tested in isolation (database migrations, IPC channels, AI client connectivity)
2. **After Phase 3**: US1 can be tested end-to-end (generate → review → approve → persist)
3. **After Phase 4**: US2 can be tested independently using pre-approved plans
4. **After Phase 5**: US3 can be tested independently by generating multiple plans
5. **After Phase 6**: Full integration testing across all user stories
