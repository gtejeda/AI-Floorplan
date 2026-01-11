# Micro Villas Investment Platform - Development Guidelines

Auto-generated from feature plans. Last updated: 2026-01-10

## Active Technologies

**Desktop Framework**: Electron 39.0.0
- Chromium 142.0.7444.52
- Node.js 22.20.0
- V8 14.2

**Language**: TypeScript 5.x (strict mode)

**UI Framework**: React 18.x or Vue 3.x (team preference)

**Database**: SQLite (better-sqlite3) + electron-store

**Project Type**: Desktop application (cross-platform Windows + macOS)

**Performance Goals**:
- App launch: <3 seconds
- Subdivision calculation: <2 seconds (21 scenarios)
- Financial recalculation: <1 second
- Export/import: <10 seconds

**Constraints**:
- Offline-capable (no internet required for core features)
- File system access mandatory
- Native file pickers required
- Minimum 90 sqm lot enforcement

## Project Structure

```
ai-floorplan/
├── src/
│   ├── main/                    # Main process (Electron)
│   │   ├── index.ts            # Entry point
│   │   ├── ipc-handlers.ts     # IPC communication
│   │   ├── file-system.ts      # Export/import operations
│   │   └── storage.ts          # SQLite adapter
│   │
│   ├── renderer/                # UI layer (web technologies)
│   │   ├── components/          # Reusable UI components
│   │   │   ├── LandConfig/
│   │   │   ├── SubdivisionView/
│   │   │   ├── AmenitiesCatalog/
│   │   │   ├── FinancialPanel/
│   │   │   └── ImageManager/
│   │   │
│   │   ├── pages/               # Main application screens
│   │   │   ├── ProjectSetup.tsx
│   │   │   ├── SubdivisionPlanner.tsx
│   │   │   ├── FinancialAnalysis.tsx
│   │   │   └── Export.tsx
│   │   │
│   │   ├── services/            # Business logic layer
│   │   │   ├── subdivision-calculator.ts  # Lot division algorithms
│   │   │   ├── financial-analyzer.ts      # Cost/profit calculations
│   │   │   ├── ai-description-generator.ts # Text generation for AI
│   │   │   └── project-validator.ts       # JSON validation/recovery
│   │   │
│   │   ├── models/              # Data structures
│   │   │   ├── LandParcel.ts
│   │   │   ├── SubdivisionScenario.ts
│   │   │   ├── MicroVillaLot.ts
│   │   │   ├── SocialClub.ts
│   │   │   ├── FinancialAnalysis.ts
│   │   │   └── Project.ts
│   │   │
│   │   └── utils/               # Helper functions
│   │       ├── unit-converter.ts  # sqm/sqft conversion
│   │       └── currency-converter.ts # DOP/USD conversion
│   │
│   └── preload/                 # Electron preload scripts
│       └── index.ts
│
├── tests/
│   ├── unit/                    # Unit tests for services and models
│   │   ├── subdivision-calculator.test.ts
│   │   ├── financial-analyzer.test.ts
│   │   └── models/
│   │
│   └── integration/             # Integration tests for user stories
│       ├── land-setup.test.ts
│       ├── subdivision-calculation.test.ts
│       └── export-import.test.ts
│
└── public/                      # Static assets
    ├── index.html
    └── assets/
        └── amenities-catalog.json
```

## Commands

### Development
```bash
npm run start          # Start development server
npm run test          # Run all tests
npm run test:unit     # Run unit tests (Vitest)
npm run test:e2e      # Run E2E tests (Playwright)
npm run lint          # Run ESLint
npm run format        # Run Prettier
```

### Build & Package
```bash
npm run make          # Package for current platform
npm run make -- --platform=win32   # Build for Windows
npm run make -- --platform=darwin  # Build for macOS
```

### Database
```bash
# SQLite database location: ./microvillas.db
# View with: sqlite3 microvillas.db
# Or use: DB Browser for SQLite
```

## Code Style

### TypeScript Conventions
- **Strict mode**: Enabled in tsconfig.json
- **Interfaces**: PascalCase (e.g., `LandParcel`, `SubdivisionScenario`)
- **Functions**: camelCase (e.g., `calculateSubdivision`, `exportProject`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `CONVERSION_FACTORS`, `MIN_LOT_SIZE`)
- **Files**: kebab-case (e.g., `subdivision-calculator.ts`, `land-parcel.ts`)

### File Organization
- **One export per file**: Each model/service has its own file
- **Index files**: Barrel exports for clean imports
- **Types**: Separate `.types.ts` files for shared types

### Comments
- **JSDoc** for public APIs
- **Inline comments** for complex logic only
- **No comments** for self-explanatory code

### Testing
- **Vitest** for unit tests (fast, TypeScript-native)
- **Playwright** for E2E tests (Electron support)
- **Test file naming**: `*.test.ts` or `*.spec.ts`

## Constitution Principles

**I. User-Centric Investment Analysis**
- Prioritize calculation accuracy over visual polish
- All financial formulas must be transparent and verifiable
- Real-time feedback for all user interactions

**II. Cross-Platform Desktop First**
- Target Windows 10+ and macOS 10.15+
- Leverage desktop capabilities (file system, native dialogs)
- Offline-first architecture

**III. AI-Ready Architecture**
- JSON export optimized for AI consumption
- Descriptive text generation for multi-modal AI
- Data layer separated from presentation

**IV. Feature Independence (NON-NEGOTIABLE)**
- Each user story independently testable
- P1 user story = minimum viable product
- No cross-story dependencies

**V. Data Integrity & Persistence**
- 100% fidelity across sessions and exports
- Auto-save on every change
- Graceful error recovery

**VI. Simplicity & Maintainability**
- YAGNI principle (don't add features speculatively)
- Direct implementations (no premature abstraction)
- Complexity must be justified

## Recent Changes

### Feature: main (2026-01-10)
- **Added**: Initial project setup with Electron 39.0.0
- **Added**: TypeScript 5.x with strict mode
- **Added**: SQLite database schema for all entities
- **Added**: IPC contracts for main/renderer communication
- **Added**: Subdivision calculator algorithm (grid-based)
- **Added**: Fabric.js integration for 2D visualization
- **Technologies**: Electron, TypeScript, React/Vue, SQLite, Fabric.js, Vitest, Playwright

<!-- MANUAL ADDITIONS START -->
<!-- Add any manual additions below this line -->
<!-- MANUAL ADDITIONS END -->
