<!--
Sync Impact Report - Constitution Update
================================================================================
Version Change: 0.0.0 → 1.0.0
Ratification Date: 2026-01-10 (Initial constitution)
Last Amended: 2026-01-10

Modified Principles: N/A (initial version)
Added Sections: All sections (new constitution)
Removed Sections: N/A

Templates Status:
✅ plan-template.md - Validated (Constitution Check section aligns)
✅ spec-template.md - Validated (User Stories & Requirements structure aligns)
✅ tasks-template.md - Validated (User Story organization aligns)
✅ agent-file-template.md - Validated (Technology-agnostic structure aligns)

Follow-up TODOs: None

Notes:
- First constitution for AI-Floorplan (Micro Villas Investment Platform)
- Establishes core principles for cross-platform desktop app development
- Emphasizes AI integration, investment analysis accuracy, and user-centric design
- Aligns with previous project context from Floorplan-assembly pivot
================================================================================
-->

# AI-Floorplan Constitution

## Core Principles

### I. User-Centric Investment Analysis

The platform exists to empower investment developers with accurate, actionable financial insights for Micro Villas projects. Every feature MUST:
- Prioritize calculation accuracy over visual polish (financial data is mission-critical)
- Provide transparent breakdowns of all costs and pricing (no black-box calculations)
- Enable independent validation of financial models (users can verify formulas)
- Deliver immediate value at each user story milestone (each story = usable increment)

**Rationale**: Investment decisions require trust. Transparency and accuracy build that trust and differentiate this platform from generic design tools.

### II. Cross-Platform Desktop First

The application MUST run natively on Windows and macOS as a desktop application. This means:
- Desktop frameworks required (Electron, Tauri, or native platform SDKs)
- NO web-only constraints (leverage desktop capabilities: file system, native UI, performance)
- Consistent UX across both platforms (platform conventions respected, but core flows identical)
- Local-first data storage (projects saved to disk, not cloud-dependent)

**Rationale**: Investment developers need professional desktop tools with file system access for project export/import, offline work capability, and performance for complex calculations.

### III. AI-Ready Architecture

The platform MUST integrate AI capabilities for design visualization and content generation. This requires:
- Structured data export (JSON schemas optimized for AI consumption)
- Descriptive text generation (comprehensive project descriptions for multi-modal AI)
- Separation of data layer from presentation (enables AI to consume project data independently)
- Forward compatibility (data structures designed to evolve with AI model capabilities)

**Rationale**: AI transforms project data into visual concepts and marketing materials, accelerating developer workflows and creating competitive advantage.

### IV. Feature Independence (NON-NEGOTIABLE)

Each user story MUST be independently implementable, testable, and deliverable as an MVP increment. This means:
- User stories prioritized P1, P2, P3... based on value/dependency order
- P1 user story = minimum viable product (delivers standalone value)
- Each story tested independently before moving to next priority
- Foundation phase MUST be complete before ANY user story work begins
- NO cross-story dependencies that break independent testing

**Rationale**: Independent stories enable iterative delivery, early user feedback, risk reduction, and parallel team execution. This is the cornerstone of speckit workflow.

### V. Data Integrity & Persistence

The platform MUST preserve user data with 100% fidelity across sessions and exports. This requires:
- Automatic save to browser local storage on every change (session persistence)
- Export to disk directories with complete data packages (JSON + images)
- Import from disk with validation and error recovery (handle corruption gracefully)
- Version-tagged data schemas (enable future migration paths)

**Rationale**: Investment projects represent significant financial planning. Data loss or corruption is unacceptable and destroys user trust.

### VI. Simplicity & Maintainability

Start simple, resist over-engineering. Every architectural decision MUST:
- Solve a present, documented problem (not hypothetical future needs)
- Use the simplest implementation that works (YAGNI principle)
- Justify complexity in Complexity Tracking table when Constitution violated
- Prefer direct implementations over abstractions (Repository pattern needs justification)

**Rationale**: Premature abstraction creates maintenance burden. Simple code is easier to understand, modify, and debug as requirements evolve.

## Technology Constraints

### Platform Stack
- **Desktop Framework**: Electron, Tauri, or equivalent cross-platform framework (supports Windows + macOS)
- **Language**: JavaScript/TypeScript (Electron), Rust + TypeScript (Tauri), or Swift + Kotlin (native)
- **Data Storage**: Browser IndexedDB for session data + File system for export/import
- **Image Handling**: Blob storage in IndexedDB + file copy on export/import
- **2D Rendering**: Canvas API, SVG, or framework-specific graphics (NO 3D visualization per Feature 001 scope)

### Mandatory Capabilities
- File system access (read/write for project export/import)
- Native file/directory picker dialogs
- Local storage APIs (IndexedDB or equivalent)
- JSON serialization/deserialization
- Image file handling (JPEG, PNG, WebP)

## Development Workflow

### User Story Lifecycle
1. **Spec Creation**: `/speckit.specify` generates spec.md with prioritized user stories (P1, P2, P3...)
2. **Planning**: `/speckit.plan` creates plan.md with Constitution Check, technical context, structure
3. **Task Generation**: `/speckit.tasks` creates tasks.md organized by user story phases
4. **Implementation**: Execute tasks for P1 user story → Test independently → Validate MVP
5. **Incremental Delivery**: Repeat for P2, P3... stories, validating each independently
6. **Analysis**: `/speckit.analyze` validates consistency across spec, plan, tasks

### Constitution Check Gates
**GATE 1 (Before Phase 0 Research)**: Validate feature aligns with principles I-VI
- Does it prioritize investment accuracy? (Principle I)
- Does it require desktop capabilities? (Principle II)
- Is it AI-ready? (Principle III)
- Are user stories independent? (Principle IV)
- Does it preserve data integrity? (Principle V)
- Is complexity justified? (Principle VI)

**GATE 2 (After Phase 1 Design)**: Re-check with implementation details
- Are data models designed for persistence and AI export?
- Does project structure match selected framework (Electron/Tauri/native)?
- Are tests (if included) written before implementation?

### Complexity Justification
When violating Principle VI (Simplicity), document in Complexity Tracking table:
- **Violation**: What complexity is being added (e.g., "4th project", "Repository pattern")
- **Why Needed**: Specific problem requiring this complexity
- **Simpler Alternative Rejected Because**: Why direct approach insufficient

## Governance

### Amendment Process
1. Propose amendment with justification (what principle changes and why)
2. Document impact on existing features and templates
3. Update all dependent templates (plan, spec, tasks, agent-file)
4. Increment CONSTITUTION_VERSION per semantic versioning (see below)
5. Update Sync Impact Report at top of this file

### Versioning Policy
- **MAJOR** (x.0.0): Backward-incompatible changes (principle removal/redefinition)
- **MINOR** (1.x.0): New principle added or materially expanded guidance
- **PATCH** (1.0.x): Clarifications, wording fixes, non-semantic refinements

### Compliance Review
- All feature specs MUST include prioritized user stories (Principle IV)
- All implementation plans MUST include Constitution Check section (before Phase 0, after Phase 1)
- All task lists MUST organize by user story phases with independent checkpoints
- Platform choice MUST support Windows + macOS desktop deployment (Principle II)
- Financial calculations MUST be transparent and independently verifiable (Principle I)
- All exports/imports MUST validate data integrity with error recovery (Principle V)

### Project Context
This constitution supersedes previous iterations from `D:\potontos\Floorplan-assembly`. The initial vision was a 2D floorplan editor with 3D visualization; it pivoted to a Micro Villas investment and budgeting platform. Now we have 100% clarity: **cross-platform (Windows, Mac) desktop application for AI-powered Micro Villas project generation** focused on investment analysis, financial modeling, and AI-driven visualization.

**Version**: 1.0.0 | **Ratified**: 2026-01-10 | **Last Amended**: 2026-01-10
