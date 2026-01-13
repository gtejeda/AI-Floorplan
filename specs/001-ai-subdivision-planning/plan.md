# Implementation Plan: AI-Assisted Subdivision Planning

**Branch**: `001-ai-subdivision-planning` | **Date**: 2026-01-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-subdivision-planning/spec.md`

## Summary

Implement AI-powered subdivision planning system that generates text-based subdivision layouts using Gemini AI and produces visual representations using Nano Banana Pro (image generation AI). The feature enables real estate investors to:
1. Generate AI-driven subdivision plans from land parcel dimensions
2. Review and approve plans with automatic persistence
3. Generate and persist eagle-view visualizations of approved plans
4. Manage image regeneration with backup preservation

This addresses critical issues where: (A) image generation was blocked after plan approval, and (B) approved plans were not persisted across sessions, requiring LLM regeneration on each app restart.

## Technical Context

**Language/Version**: TypeScript 5.7.3 (strict mode enabled)
**Primary Dependencies**:
- Electron 39.0.0 (Node.js 22.20.0, Chromium 142.0.7444.52)
- React 18.3.1 (UI layer)
- better-sqlite3 12.6.0 (persistence)
- @google/generative-ai 0.24.1 (Gemini integration)
- fabric 7.1.0 (canvas rendering, if needed)
- zod 4.3.5 (schema validation)

**Storage**:
- SQLite (better-sqlite3) for subdivision plans and metadata
- File system for generated images (PNG/JPEG)
- Single active project model (one approved plan at a time)

**Testing**:
- Vitest 4.0.16 (unit tests)
- Playwright 1.57.0 (E2E tests)
- @testing-library/react 16.3.1 (component tests)

**Target Platform**:
- Windows 10+ and macOS 10.15+ desktop application
- Electron-based cross-platform deployment

**Project Type**: Desktop application (Electron + React)

**Performance Goals**:
- AI subdivision plan generation: <30 seconds
- Image generation: <2 minutes
- Database queries: <100ms
- UI interactions: <200ms p95

**Constraints**:
- Requires internet for AI API calls (Gemini, Nano Banana Pro)
- Minimum 90 sqm lot size enforcement
- Single active project (no multi-project management)
- Auto-save on approval (no manual save required)

**Scale/Scope**:
- Single-user desktop application
- One active subdivision plan per session
- Support for multiple alternative plans (archived)
- Handle land parcels up to reasonable limits (e.g., 100+ lots)

## Constitution Check

*GATE 1: Before Phase 0 Research*

### Principle I: User-Centric Investment Analysis
✅ **PASS** - Feature prioritizes accurate subdivision calculations over visual polish
✅ **PASS** - Lot dimensions, road widths, and coverage metrics are transparent
✅ **PASS** - Users can verify all calculations (lot count, dimensions, compliance)
✅ **PASS** - Each user story delivers standalone value (P1=text plans, P2=images, P3=comparison)

### Principle II: Cross-Platform Desktop First
✅ **PASS** - Uses Electron for Windows + macOS support
✅ **PASS** - Leverages file system for image storage
✅ **PASS** - Uses SQLite for local-first data persistence
✅ **PASS** - Native desktop capabilities (no web-only constraints)

### Principle III: AI-Ready Architecture
✅ **PASS** - Structured JSON export of subdivision plans for AI consumption
✅ **PASS** - Descriptive text generation for multi-modal AI prompts
✅ **PASS** - Separation: data layer (SQLite + services) from presentation (React components)
✅ **PASS** - Forward-compatible data structures (versioning via zod schemas)

### Principle IV: Feature Independence (NON-NEGOTIABLE)
✅ **PASS** - P1 (text-based plans) testable independently without images
✅ **PASS** - P2 (image generation) depends on P1 but testable with mock approved plans
✅ **PASS** - P3 (comparison) is optional enhancement, doesn't break P1/P2
✅ **PASS** - No cross-story dependencies that prevent independent testing

### Principle V: Data Integrity & Persistence
✅ **PASS** - Auto-save on approval (FR-006: immediate save to SQLite)
✅ **PASS** - Auto-reload on startup (FR-006: load last approved plan)
✅ **PASS** - Images auto-saved to file system (FR-014) with database references
✅ **PASS** - Backup preservation for image regeneration (FR-015)
✅ **PASS** - 100% data persistence across sessions (SC-008)

### Principle VI: Simplicity & Maintainability
✅ **PASS** - Direct SQLite queries (no ORM overhead)
✅ **PASS** - Single active project model (simplest MVP)
✅ **PASS** - No premature abstractions (services call AI APIs directly)
⚠️ **REVIEW** - Image backup mechanism adds complexity (justified by user safety)

**GATE 1 VERDICT**: ✅ **APPROVED** - All principles satisfied. Image backup complexity is justified by data safety requirements (Principle V).

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-subdivision-planning/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Entity schemas
├── quickstart.md        # Phase 1: Developer onboarding
├── contracts/           # Phase 1: API contracts
│   ├── subdivision-plan-api.json
│   └── image-generation-api.json
└── tasks.md             # Phase 2: (/speckit.tasks output - NOT created yet)
```

### Source Code (repository root)

```text
src/
├── main/                           # Main process (Electron)
│   ├── index.ts                   # Entry point (existing)
│   ├── ipc-handlers.ts            # IPC communication (existing, extend)
│   ├── storage.ts                 # SQLite adapter (existing, extend)
│   │
│   ├── ai-services/               # AI integration layer (existing, extend)
│   │   ├── gemini-client.ts      # Gemini API client (existing, extend)
│   │   └── image-client.ts       # Nano Banana Pro client (existing, extend)
│   │
│   └── utils/                     # Utilities (existing)
│       └── retry-handler.ts      # Retry logic (existing)
│
├── renderer/                      # UI layer (React)
│   ├── components/               # Reusable UI components (existing)
│   │   │
│   │   ├── AIIntegration/       # NEW: AI-specific components
│   │   │   ├── AIPlanGenerator.tsx
│   │   │   ├── PlanApprovalPanel.tsx
│   │   │   ├── ImageRegenerator.tsx
│   │   │   └── VisualizationGallery.tsx
│   │   │
│   │   ├── SubdivisionPlanner/  # NEW: Plan-specific components
│   │   │   ├── PlanViewer.tsx
│   │   │   ├── LotDetailsTable.tsx
│   │   │   └── CoverageMetrics.tsx
│   │   │
│   │   └── common/              # NEW: Shared components
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorDisplay.tsx
│   │
│   ├── pages/                   # Main screens (existing)
│   │   └── SubdivisionPlanner.tsx (existing, extend)
│   │
│   ├── services/                # Business logic (existing)
│   │   ├── ai-subdivision-service.ts  # NEW: Plan generation service
│   │   └── ai-image-service.ts        # NEW: Image generation service
│   │
│   ├── models/                  # Data structures (existing)
│   │   ├── AISubdivisionPlan.ts      # NEW: AI plan model
│   │   ├── AIGenerationRequest.ts    # NEW: AI request model
│   │   ├── ProjectVisualization.ts   # NEW: Image model
│   │   └── SubdivisionPlan.ts        # NEW: Core plan model
│   │
│   ├── hooks/                   # React hooks (existing)
│   │   ├── useAISubdivisionPlan.ts   # NEW: Plan generation hook
│   │   └── useAIImageGeneration.ts   # NEW: Image generation hook
│   │
│   └── utils/                   # Helper functions (existing)
│       └── error-messages.ts    # NEW: Error message utils
│
├── preload/                     # Electron preload scripts (existing)
│   └── index.ts                # IPC API exposure (existing, extend)
│
└── shared/                      # Shared types (existing)
    └── ai-contracts.ts         # NEW: AI service contracts

tests/
├── unit/                       # Unit tests
│   ├── services/
│   │   ├── ai-subdivision-service.test.ts
│   │   └── ai-image-service.test.ts
│   └── models/
│       ├── AISubdivisionPlan.test.ts
│       └── ProjectVisualization.test.ts
│
└── integration/                # Integration tests
    ├── subdivision-workflow.test.ts
    ├── image-generation-workflow.test.ts
    └── persistence-workflow.test.ts
```

**Structure Decision**: Electron desktop application structure with clear separation of concerns:
- **Main process** (`src/main/`): Node.js backend for IPC, database, AI APIs
- **Renderer process** (`src/renderer/`): React frontend for UI
- **Preload** (`src/preload/`): Secure IPC bridge
- **Shared** (`src/shared/`): TypeScript types used by both processes

This matches the existing codebase structure and adheres to Electron security best practices (context isolation, IPC-based communication).

## Complexity Tracking

> **No violations** - All Constitution principles satisfied without requiring simplicity exceptions.

The image backup mechanism (FR-015) adds some complexity but is justified by:
- **Principle V requirement**: Data integrity and user trust
- **User safety**: Prevents loss of acceptable visualizations during regeneration
- **Simpler alternatives rejected**:
  - Immediate replacement would risk losing good images with no recovery
  - Full versioning history would over-engineer MVP (future enhancement)
  - Current approach (single backup + confirmation) is minimum viable safety net

---

## Phase 0: Research & Decisions

**Status**: Ready to execute
**Output**: `research.md` with all technology decisions documented

### Research Tasks

1. **Gemini AI Integration**
   - Research: Gemini API best practices for text generation
   - Research: Structured output formats (JSON mode) for subdivision plans
   - Research: Prompt engineering for dimensionally-accurate subdivision layouts
   - Research: Rate limiting and error handling patterns

2. **Nano Banana Pro Integration**
   - Research: Nano Banana Pro API (or equivalent image generation service)
   - Research: Best prompts for architectural/site plan visualization
   - Research: Image format optimization (PNG vs JPEG for site plans)
   - Research: Generation progress tracking patterns

3. **SQLite Schema Design**
   - Research: better-sqlite3 best practices for Electron
   - Research: Schema versioning for future migrations
   - Research: Single-record pattern for active project
   - Research: Foreign key patterns for images → plans

4. **Image Storage Strategy**
   - Research: Electron file system best practices
   - Research: User data directory patterns (cross-platform)
   - Research: Image naming conventions (prevent collisions)
   - Research: Backup/archive patterns for regeneration workflow

5. **State Management**
   - Research: React hooks patterns for async AI operations
   - Research: Progress tracking UI patterns (streaming vs polling)
   - Research: Optimistic updates for auto-save
   - Research: Error boundary patterns for AI failures

### Unknowns to Resolve

- **NEEDS CLARIFICATION**: Nano Banana Pro API specification (authentication, endpoints, pricing)
  - **Fallback**: If Nano Banana Pro is unavailable, research alternatives (DALL-E 3, Stable Diffusion, Midjourney API)

- **NEEDS CLARIFICATION**: Gemini API structured output format (JSON mode vs plain text parsing)
  - **Resolution**: Use Gemini 1.5 Pro with JSON mode for structured subdivision plans

- **NEEDS CLARIFICATION**: Image generation timing patterns (synchronous, async polling, webhooks)
  - **Resolution**: Research polling patterns with exponential backoff for long-running image generation

---

## Phase 1: Design & Contracts

**Status**: Pending (Phase 0 must complete first)
**Output**:
- `data-model.md` (entity schemas with validation rules)
- `contracts/subdivision-plan-api.json` (IPC contracts for plan generation)
- `contracts/image-generation-api.json` (IPC contracts for image generation)
- `quickstart.md` (developer setup guide)

### Design Deliverables

1. **Data Model** (`data-model.md`)
   - SubdivisionPlan entity (core plan data)
   - AIGenerationRequest entity (AI request tracking)
   - ProjectVisualization entity (image metadata + paths)
   - SubdivisionLot entity (individual lot details)
   - Validation rules (90 sqm minimum, coverage calculations)
   - State transitions (draft → approved → visualized)

2. **API Contracts** (`contracts/`)
   - **subdivision-plan-api.json**: IPC methods for plan generation
     - `generateSubdivisionPlan(landDimensions, preferences)`
     - `approveSubdivisionPlan(planId)`
     - `rejectSubdivisionPlan(planId, feedback)`
     - `loadApprovedPlan()`

   - **image-generation-api.json**: IPC methods for image generation
     - `generateProjectImages(approvedPlanId)`
     - `regenerateImages(planId, refinementPrompts)`
     - `confirmImageVersion(visualizationId)`
     - `loadProjectImages(planId)`

3. **Developer Quickstart** (`quickstart.md`)
   - Prerequisites (Node.js, npm, API keys)
   - Environment setup (.env configuration)
   - Database initialization
   - Running dev server
   - Testing workflows
   - Building for production

### Design Patterns

- **Repository Pattern**: NOT USED (direct SQLite queries for simplicity)
- **Service Layer**: YES (ai-subdivision-service, ai-image-service for business logic)
- **React Hooks**: YES (useAISubdivisionPlan, useAIImageGeneration for state management)
- **IPC Bridge**: YES (preload script exposes typed IPC methods to renderer)

---

## Phase 2: Task Generation

**Status**: NOT STARTED (completed by `/speckit.tasks` command, not `/speckit.plan`)

This phase will:
1. Generate `tasks.md` organized by user story (P1, P2, P3)
2. Break each story into implementation tasks
3. Create test tasks for each story
4. Define completion checkpoints

**Next Command**: `/speckit.tasks` after Phase 0 and Phase 1 are complete.

---

## Gates Re-Check (Post-Design)

**GATE 2: After Phase 1 Design** ✅ **COMPLETED**

### Design Validation

✅ **Data Models Designed for Persistence**
- SQLite schema with proper indexes and foreign keys
- File system storage for images with database references
- Single active plan enforcement via transaction-based activation
- Image backup mechanism with confirmation workflow

✅ **Data Models Designed for AI Export**
- JSON serialization via Zod schemas
- Structured output format for Gemini AI consumption
- Forward-compatible versioning
- Complete audit trail for AI generation requests

✅ **Project Structure Matches Electron Framework**
- Main process: IPC handlers, database, AI API clients
- Renderer process: React components, hooks, services
- Preload: Secure IPC bridge with typed contracts
- Shared: TypeScript types used by both processes

✅ **Tests Can Be Written Before Implementation**
- Clear IPC contracts defined in `contracts/`
- Zod schemas provide runtime validation
- State transitions documented for integration tests
- Mock data patterns defined in `quickstart.md`

**GATE 2 VERDICT**: ✅ **APPROVED** - All design requirements satisfied. Ready for Phase 2 task generation.

---

## Next Steps

1. ✅ **Phase 0**: Generate `research.md` (COMPLETED)
2. ✅ **Phase 1**: Generate data models and contracts (COMPLETED)
3. ✅ **Phase 1**: Update agent context (`CLAUDE.md`) (COMPLETED)
4. ✅ **GATE 2**: Re-check Constitution post-design (COMPLETED)
5. ⏳ **Phase 2**: Run `/speckit.tasks` to generate `tasks.md`

**Current Status**: Planning phase complete. Ready for task generation.
