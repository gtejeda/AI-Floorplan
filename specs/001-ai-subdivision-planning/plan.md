# Implementation Plan: AI-Assisted Subdivision Planning

**Branch**: `001-ai-subdivision-planning` | **Date**: 2026-01-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-ai-subdivision-planning/spec.md`

## Summary

This feature integrates AI capabilities (Gemini for text-based subdivision planning, Nano Banana Pro for image generation) into the Micro Villas platform. Users input land parcel dimensions and receive AI-generated subdivision plans with specific lot layouts, road configurations, and amenity placements. After approving a text-based plan, users can generate multiple visual perspectives (site plan, aerial view, context view) to present to stakeholders. The feature prioritizes approval workflow (P1), visualization (P2), and comparison of multiple options (P3) as independent user stories.

## Technical Context

**Language/Version**: TypeScript 5.7.3 (strict mode enabled)
**Primary Dependencies**: Electron 39.0.0, React 18.3.1, better-sqlite3 12.6.0, fabric 7.1.0, zod 4.3.5
**Storage**: SQLite (better-sqlite3) for subdivision plans and metadata + file system for generated images
**Testing**: Vitest 4.0.16 (unit), Playwright 1.57.0 (E2E)
**Target Platform**: Desktop (Windows 10+, macOS 10.15+) via Electron
**Project Type**: Electron desktop application (main process + renderer process architecture)
**Performance Goals**:
- AI text plan generation: <30 seconds (per SC-001)
- Image generation: <2 minutes (per SC-004)
- Plan approval workflow: <2 minutes (per SC-003)
- UI responsiveness: <200ms for user interactions during AI generation progress display
**Constraints**:
- Requires internet connectivity for AI API calls (no offline AI in scope)
- AI services (Gemini, Nano Banana Pro) must be accessible via HTTP API
- Generated images stored in local file system (PNG/JPEG, <10MB per image assumed)
- All subdivision plans must validate 90 sqm minimum lot size before display
- 100% data persistence for approved plans across sessions (per SC-008)
**Scale/Scope**:
- Support land parcels from 90 sqm (single lot minimum) to 50,000 sqm (~500 lots maximum)
- Store up to 100 subdivision plan variations per project
- Generate 3-5 alternative plans per user request (P3 user story)
- Handle up to 10 concurrent image generation requests (rate limiting required)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate 1: Pre-Research Validation

**Principle I - User-Centric Investment Analysis**
- ✅ **PASS**: Feature prioritizes calculation accuracy (FR-003: validate 90 sqm lots, FR-004: include dimensions/coverage calculations)
- ✅ **PASS**: Financial data transparent (FR-012: display lot count, road coverage, amenity coverage percentages)
- ✅ **PASS**: Independent validation enabled (subdivision plans include all dimensions and formulas for verification)
- ✅ **PASS**: Immediate value delivery (P1 user story delivers standalone subdivision planning without visualization)

**Principle II - Cross-Platform Desktop First**
- ✅ **PASS**: Electron 39.0.0 supports Windows + macOS (per CLAUDE.md)
- ✅ **PASS**: File system access required (FR-014: store generated images, FR-006: persist subdivision plans)
- ✅ **PASS**: Native dialogs not explicitly required but available via Electron for file save/load
- ✅ **PASS**: Local-first data (SQLite + file system, not cloud-dependent)

**Principle III - AI-Ready Architecture**
- ✅ **PASS**: AI integration is core requirement (FR-001: Gemini, FR-002: Nano Banana Pro)
- ✅ **PASS**: Structured data export (FR-007: pass approved plan as structured prompts to image AI)
- ✅ **PASS**: Descriptive text generation (AI generates text-based plans with dimensions and layout descriptions)
- ✅ **PASS**: Data/presentation separation (subdivision plan data models separate from UI rendering)

**Principle IV - Feature Independence (NON-NEGOTIABLE)**
- ✅ **PASS**: P1 user story (Generate Text-Based Subdivision Plan) is independently testable MVP
- ✅ **PASS**: P2 user story (Generate Project Visualization Images) depends on P1 but can be tested with pre-approved plan
- ✅ **PASS**: P3 user story (Compare Multiple Options) is pure enhancement, not required for basic functionality
- ✅ **PASS**: No cross-story dependencies that break independent testing

**Principle V - Data Integrity & Persistence**
- ✅ **PASS**: Auto-save on approval (FR-006: save approved plans to database)
- ✅ **PASS**: Export capability (FR-014: store images with references to source plan)
- ⚠️ **PARTIAL**: Import/validation not explicitly mentioned in spec but assumed via existing Project import/export system
- ✅ **PASS**: Version-tagged schemas (use Zod for validation, SQLite schema versioning)

**Principle VI - Simplicity & Maintainability**
- ✅ **PASS**: Direct integration with AI APIs (no unnecessary abstraction layers unless needed for testing)
- ✅ **PASS**: Use existing subdivision-calculator.ts patterns extended for AI prompts
- ✅ **PASS**: Leverage existing storage.ts and ipc-handlers.ts infrastructure
- ⚠️ **NEEDS CLARIFICATION**: AI service abstraction layer (direct API calls vs. service adapter pattern) - will resolve in Phase 0

**GATE 1 RESULT**: ✅ **PASS** with clarifications to resolve in Phase 0 research

### Complexity Tracking

> No violations requiring justification at this stage. Feature aligns with existing Electron architecture and extends current subdivision planning capabilities with AI integration.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-subdivision-planning/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (AI API integration patterns, service architecture)
├── data-model.md        # Phase 1 output (SubdivisionPlan, AIGenerationRequest, ProjectVisualization entities)
├── quickstart.md        # Phase 1 output (developer setup guide for AI API keys and testing)
├── contracts/           # Phase 1 output (AI service contracts, IPC contracts)
│   ├── gemini-api.yaml          # OpenAPI spec for Gemini text generation
│   ├── nanobananapro-api.yaml   # OpenAPI spec for Nano Banana Pro image generation
│   └── ipc-subdivision-ai.ts    # IPC contract for main/renderer AI communication
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Structure Decision**: Electron desktop application with main/renderer separation (existing architecture from CLAUDE.md). This feature extends existing `src/renderer/services/` and `src/renderer/models/` with AI-specific modules and adds AI service integration to main process for API key security.

```text
src/
├── main/                        # Main process (Electron)
│   ├── index.ts                # Existing entry point
│   ├── ipc-handlers.ts         # EXTEND: Add AI subdivision planning IPC handlers
│   ├── storage.ts              # EXTEND: Add subdivision plan and visualization persistence
│   └── ai-services/            # NEW: AI service integration (secure API key handling)
│       ├── gemini-client.ts    # Gemini API integration for text plan generation
│       └── nanobananapro-client.ts  # Nano Banana Pro API integration for images
│
├── renderer/                    # Renderer process (React UI)
│   ├── components/              # Existing UI components
│   │   ├── SubdivisionPlanner/  # EXTEND: Add AI plan generation UI
│   │   │   ├── AIPlanGenerator.tsx      # NEW: AI text plan request/approval UI
│   │   │   ├── PlanApprovalPanel.tsx    # NEW: Review and approve/reject plans
│   │   │   └── PlanComparisonView.tsx   # NEW: P3 - Compare multiple plans
│   │   └── ImageViewer/         # NEW: Display AI-generated project visualizations
│   │       ├── VisualizationGallery.tsx # NEW: Multiple perspective image display
│   │       └── ImageRegenerator.tsx     # NEW: Regenerate images with feedback
│   │
│   ├── services/                # Business logic layer
│   │   ├── subdivision-calculator.ts    # EXTEND: Add AI prompt generation
│   │   ├── ai-subdivision-service.ts    # NEW: Orchestrate AI plan generation workflow
│   │   └── ai-image-service.ts          # NEW: Orchestrate image generation workflow
│   │
│   ├── models/                  # Data structures
│   │   ├── SubdivisionScenario.ts       # EXTEND: Add AI-generated plan support
│   │   ├── SubdivisionPlan.ts           # NEW: AI-generated plan entity
│   │   ├── AIGenerationRequest.ts       # NEW: Request tracking entity
│   │   └── ProjectVisualization.ts      # NEW: Generated image metadata
│   │
│   └── hooks/                   # React hooks
│       ├── useAISubdivisionPlan.ts      # NEW: Hook for AI plan generation state
│       └── useAIImageGeneration.ts      # NEW: Hook for image generation state
│
├── preload/
│   └── index.ts                # EXTEND: Expose AI-related IPC channels securely
│
└── shared/                      # NEW: Shared types between main/renderer
    └── ai-contracts.ts         # TypeScript contracts for AI service requests/responses

tests/
├── unit/
│   ├── ai-subdivision-service.test.ts   # NEW: P1 - Test plan generation logic
│   ├── ai-image-service.test.ts         # NEW: P2 - Test image generation logic
│   └── subdivision-plan.test.ts         # NEW: Test plan validation and persistence
│
└── integration/
    ├── ai-plan-generation.test.ts       # NEW: P1 - End-to-end plan generation test
    ├── ai-image-generation.test.ts      # NEW: P2 - End-to-end image generation test
    └── plan-approval-workflow.test.ts   # NEW: P1 - Approval/rejection flow test
```

## Phase 0: Research & Clarifications

**Status**: Phase 0 will generate `research.md` to resolve the following:

### Research Tasks

1. **AI Service Integration Patterns** (NEEDS CLARIFICATION from Technical Context)
   - **Question**: Should AI API calls be made from main process (secure API key handling) or renderer process (direct API calls)?
   - **Research**: Electron security best practices for external API integration, API key storage patterns
   - **Decision needed**: Direct API calls vs. service adapter pattern vs. IPC-proxied calls

2. **Gemini API Specification**
   - **Question**: What is the exact Gemini API endpoint, authentication method, request/response format for text generation?
   - **Research**: Gemini API documentation (assuming Google Gemini API), rate limits, pricing, prompt engineering best practices for subdivision layout generation
   - **Decision needed**: API version, authentication flow (API key, OAuth2), prompt template structure

3. **Nano Banana Pro API Specification**
   - **Question**: What is the exact Nano Banana Pro API endpoint, authentication, request/response format for image generation?
   - **Research**: Nano Banana Pro API documentation (assuming external image generation service), supported image formats, resolution limits, generation time SLAs
   - **Decision needed**: API authentication, image upload vs. URL return, error handling for failed generations

4. **AI Prompt Engineering for Subdivision Plans**
   - **Question**: How to structure prompts to ensure Gemini generates valid subdivision plans with specific dimensions and 90 sqm lot compliance?
   - **Research**: Structured output from LLMs (JSON mode, function calling, constrained generation), validation strategies, fallback handling for non-compliant plans
   - **Decision needed**: Prompt template format, output validation strategy, retry logic for invalid responses

5. **Image Generation Prompt Design**
   - **Question**: How to convert approved subdivision plan data into effective prompts for Nano Banana Pro to generate accurate site plans, aerial views, and context views?
   - **Research**: Image generation prompt best practices, multi-view coordination (ensure consistency across perspectives), descriptor language for architectural/site planning imagery
   - **Decision needed**: Prompt template per view type, consistency mechanisms across multiple images

6. **Rate Limiting and Cost Management**
   - **Question**: How to prevent excessive AI API calls when users request multiple regenerations in quick succession? (Edge case from spec)
   - **Research**: Client-side rate limiting patterns, debouncing strategies, cost estimation display, API quota monitoring
   - **Decision needed**: Rate limit thresholds (calls per minute/hour), user feedback for rate limit hits, cost tracking approach

7. **AI Service Error Handling**
   - **Question**: What are common failure modes for Gemini and Nano Banana Pro, and how should the system recover? (FR-010)
   - **Research**: API error codes, timeout handling, retry strategies (exponential backoff), fallback UX when AI is unavailable
   - **Decision needed**: Retry policy, error message templates, graceful degradation approach

8. **SQLite Schema for AI Entities**
   - **Question**: What database schema is needed for SubdivisionPlan, AIGenerationRequest, ProjectVisualization entities?
   - **Research**: Existing storage.ts schema patterns, indexing strategies for fast retrieval, foreign key relationships to existing Project entity
   - **Decision needed**: Table structures, relationships, migration approach from existing subdivision schema

**Phase 0 Output**: `research.md` with all decisions documented and clarifications resolved

## Phase 1: Design & Contracts (PENDING Phase 0 Completion)

**Prerequisites**: `research.md` complete with AI service specifications and architectural decisions

### Planned Outputs

1. **data-model.md**: Entity definitions for SubdivisionPlan, AIGenerationRequest, ProjectVisualization, Subdivision Lot with field specifications, validation rules, and state transitions

2. **contracts/**:
   - `gemini-api.yaml`: OpenAPI specification for Gemini text generation endpoints
   - `nanobananapro-api.yaml`: OpenAPI specification for Nano Banana Pro image generation endpoints
   - `ipc-subdivision-ai.ts`: TypeScript IPC contracts for main/renderer communication (plan generation, image generation, approval workflow)

3. **quickstart.md**: Developer setup guide covering:
   - AI API key acquisition (Gemini, Nano Banana Pro)
   - Environment variable configuration (.env setup)
   - Testing with mock AI responses (for offline development)
   - Debugging AI prompt/response cycle

4. **Agent context update**: Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude` to add AI service integration technologies to CLAUDE.md

### Gate 2: Post-Design Validation (COMPLETED)

**Principle V - Data Integrity & Persistence**
- ✅ **PASS**: Data models include auto-save mechanism via SQLite (AISubdivisionPlan persisted on approval)
- ✅ **PASS**: Export capability designed (ProjectVisualization stores images with source plan references)
- ✅ **PASS**: Import/validation included (data-model.md defines validation rules, Zod schemas for runtime checks)
- ✅ **PASS**: Version-tagged schemas (AISubdivisionPlan.aiModelVersion, schema migration strategy documented)

**Principle II - Cross-Platform Desktop First**
- ✅ **PASS**: Project structure extends existing Electron architecture (main/renderer separation maintained)
- ✅ **PASS**: AI service clients in main process for security (src/main/ai-services/)
- ✅ **PASS**: IPC contracts use contextBridge for secure renderer access (contracts/ipc-subdivision-ai.ts)
- ✅ **PASS**: File system access for image storage (ProjectVisualization.imagePath references local files)

**Principle IV - Feature Independence**
- ✅ **PASS**: P1 testable independently (IPC contracts support standalone plan generation without P2 image generation)
- ✅ **PASS**: P2 testable with pre-approved plans (contracts/ipc-subdivision-ai.ts includes separate image generation channels)
- ✅ **PASS**: P3 comparison mode independent (AISubdivisionPlan supports multiple plans per project)
- ✅ **PASS**: Service contracts enable isolated testing (mock implementations documented in quickstart.md)

**GATE 2 RESULT**: ✅ **PASS** - All design artifacts align with Constitution principles

## Completion Status

✅ **Phase 0 Completed**: `research.md` generated with all technical decisions documented
✅ **Phase 1 Completed**: Design artifacts generated:
- `data-model.md`: 5 entities with full specifications, validation rules, and state transitions
- `contracts/gemini-api.yaml`: OpenAPI 3.0 spec for Gemini 2.5 Flash API
- `contracts/nanobananapro-api.yaml`: Generic image generation API specification
- `contracts/ipc-subdivision-ai.ts`: 12 IPC channels with Zod schemas
- `quickstart.md`: Developer setup guide with API keys, testing, troubleshooting

✅ **Agent Context Updated**: CLAUDE.md updated with TypeScript 5.7.3, Electron 39.0.0, React 18.3.1, Zod 4.3.5, SQLite technologies

✅ **Gate 2 Passed**: All Constitution principles validated against design artifacts

## Next Steps

**Ready for Phase 2**: Run `/speckit.tasks` to generate `tasks.md` organized by P1, P2, P3 user story phases with independent checkpoints per Constitution Principle IV.

**Implementation Order**:
1. **Foundation**: Database schema migration, IPC handler setup, AI client initialization
2. **P1 - Text-Based Plan Generation**: AI subdivision plan workflow with approval/rejection
3. **P2 - Image Visualization**: AI image generation from approved plans
4. **P3 - Comparison Mode**: Multiple plan comparison UI and selection
