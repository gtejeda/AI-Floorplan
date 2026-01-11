# Quickstart Guide: Micro Villas Investment Platform

**Phase 1 Output** | **Date**: 2026-01-10 | **Plan**: [plan.md](./plan.md)

## Prerequisites

- **Operating System**: Windows 10+ or macOS 10.15+
- **Node.js**: v22.20.0 LTS or higher ([Download](https://nodejs.org/))
- **npm**: v10+ (comes with Node.js)
- **Git**: For version control ([Download](https://git-scm.com/))
- **Code Editor**: VS Code recommended ([Download](https://code.visualstudio.com/))

**Optional**:
- **SQLite Browser**: For database inspection ([Download](https://sqlitebrowser.org/))
- **Postman/Insomnia**: For testing (not applicable - desktop app)

---

## Project Setup

### 1. Initialize Project

```bash
# Create project directory
mkdir ai-floorplan
cd ai-floorplan

# Initialize npm project
npm init -y

# Initialize Git
git init
git add .
git commit -m "Initial commit"
```

### 2. Install Electron Forge

```bash
# Install Electron Forge CLI
npm install --save-dev @electron-forge/cli

# Import Forge into project
npx electron-forge import

# Answer prompts:
# - TypeScript? Yes
# - Vite plugin? Yes
```

### 3. Install Core Dependencies

```bash
# Electron & TypeScript
npm install --save-dev electron @electron-forge/plugin-vite typescript

# Database
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3

# Settings storage
npm install electron-store

# UI Framework (React example - use Vue if preferred)
npm install react react-dom
npm install --save-dev @types/react @types/react-dom

# Visualization
npm install fabric

# Validation
npm install zod

# Utilities
npm install uuid
npm install --save-dev @types/uuid
```

### 4. Install Development Tools

```bash
# Testing
npm install --save-dev vitest @testing-library/react @playwright/test

# Code quality
npm install --save-dev eslint prettier eslint-config-prettier
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Git hooks
npm install --save-dev husky lint-staged
npx husky install
```

### 5. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 6. Project Structure

Create directories:

```bash
mkdir -p src/main src/renderer/{components,pages,services,models,utils} src/preload tests/{unit,integration} public/assets
```

Final structure:
```
ai-floorplan/
├── src/
│   ├── main/              # Main process
│   │   ├── index.ts       # Entry point
│   │   ├── ipc-handlers.ts
│   │   ├── file-system.ts
│   │   └── storage.ts
│   ├── renderer/          # UI layer
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/      # Business logic
│   │   ├── models/        # Data structures
│   │   └── utils/
│   ├── preload/           # Preload script
│   │   └── index.ts
│   └── index.html
├── tests/
│   ├── unit/
│   └── integration/
├── public/
│   └── assets/
│       └── amenities-catalog.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── forge.config.js
```

---

## Development Workflow

### Start Development Server

```bash
npm run start
```

This launches:
- Main process with hot reload
- Renderer process with Vite dev server
- DevTools for debugging

### Run Tests

```bash
# Unit tests (Vitest)
npm run test:unit

# E2E tests (Playwright)
npm run test:e2e

# All tests
npm run test
```

### Build for Production

```bash
# Package for current platform
npm run make

# Outputs:
# - Windows: out/make/squirrel.windows/
# - macOS: out/make/dmg/
```

---

## Database Setup

### Initialize SQLite Schema

Create `src/main/db-schema.sql`:

```sql
-- Copy schema from data-model.md
CREATE TABLE projects ( ... );
CREATE TABLE land_parcels ( ... );
-- ... all tables
```

Run schema migration:

```typescript
// src/main/storage.ts
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

const db = new Database('microvillas.db');

// Run schema on first launch
const schema = readFileSync(path.join(__dirname, 'db-schema.sql'), 'utf-8');
db.exec(schema);

export default db;
```

---

## Configuration Files

### Electron Forge Config (`forge.config.js`)

```javascript
module.exports = {
  packagerConfig: {
    name: 'MicroVillas',
    executableName: 'micro-villas',
    icon: './public/assets/icon',
    appBundleId: 'com.microvillas.investment',
    appCategoryType: 'public.app-category.finance'
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'MicroVillas',
        setupIcon: './public/assets/icon.ico'
      }
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        icon: './public/assets/icon.icns'
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          { entry: 'src/main/index.ts', config: 'vite.main.config.ts' },
          { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts' }
        ],
        renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }]
      }
    }
  ]
};
```

### Vite Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          financial: ['./src/renderer/services/financial-analyzer'],
          subdivision: ['./src/renderer/services/subdivision-calculator']
        }
      }
    }
  }
});
```

---

## Key Implementation Files

### Main Process Entry (`src/main/index.ts`)

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import './ipc-handlers'; // Load IPC handlers

let mainWindow: BrowserWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);
```

### Preload Script (`src/preload/index.ts`)

```typescript
// Copy from contracts/ipc-contracts.md
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ... all API methods
});
```

### Subdivision Calculator (`src/renderer/services/subdivision-calculator.ts`)

```typescript
// Copy from research.md - Complete Implementation Example
export class SubdivisionCalculator {
  // ... implementation
}
```

---

## Testing Setup

### Vitest Config (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts']
  }
});
```

### Example Unit Test

```typescript
// tests/unit/subdivision-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { SubdivisionCalculator } from '@/renderer/services/subdivision-calculator';

describe('SubdivisionCalculator', () => {
  it('generates 21 scenarios from 10-30% social club', () => {
    const calculator = new SubdivisionCalculator({ minLotSize: 90 });
    const scenarios = calculator.calculateAllScenarios(100, 80);

    expect(scenarios.length).toBeLessThanOrEqual(21);
    expect(scenarios[0].socialClubPercent).toBe(10);
  });
});
```

---

## Debugging

### Renderer Process

1. Open DevTools: `Ctrl+Shift+I` (Windows) or `Cmd+Option+I` (macOS)
2. Sources tab → Set breakpoints
3. Console tab → View logs

### Main Process

1. Add `--inspect` flag:
```bash
electron --inspect=5858 .
```

2. Open `chrome://inspect` in Chrome
3. Click "inspect" on Electron process

---

## Troubleshooting

**Issue**: `better-sqlite3` native module errors
**Solution**: Rebuild native modules
```bash
npm rebuild better-sqlite3 --update-binary
```

**Issue**: Hot reload not working
**Solution**: Restart dev server, clear `node_modules/.vite`

**Issue**: TypeScript errors in imports
**Solution**: Check `tsconfig.json` paths, restart TS server in VS Code

---

## Next Steps

1. **Implement User Story 1** (Land Setup): See `tasks.md` after Phase 2
2. **Set up CI/CD**: GitHub Actions for automated builds
3. **Code signing**: Purchase certificates for Windows/macOS distribution

**Development Ready**: Follow `tasks.md` for implementation roadmap.
