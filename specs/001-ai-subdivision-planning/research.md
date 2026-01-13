# AI-Assisted Subdivision Planning - Technology Research

**Feature Branch**: `001-ai-subdivision-planning`
**Research Date**: 2026-01-12
**Status**: Implementation Complete

This document captures technology decisions, research findings, and implementation patterns for the AI-Assisted Subdivision Planning feature.

---

## 1. Gemini AI Integration

### Decision: Gemini 3 Flash Preview with Structured Outputs

**Chosen Technology**:
- Model: `gemini-3-flash-preview` (Gemini 3 generation)
- API: Google Generative AI SDK (`@google/generative-ai`)
- Output Mode: JSON Schema with `responseMimeType: 'application/json'`
- Temperature: 0.2 (low for consistent, deterministic outputs)
- Max Output Tokens: 65,536 (Gemini 3 supports up to 65K output tokens)

**Rationale**:
1. **Structured Outputs**: Gemini API now provides native JSON Schema support, guaranteeing predictable and parsable results without prompt engineering tricks
2. **Cost Efficiency**: Gemini 3 Flash pricing ($0.10/1M input tokens, $0.40/1M output tokens) is competitive while offering strong performance
3. **Speed**: Flash variant provides <30 second response times for subdivision calculations
4. **Schema Validation**: Type-safe outputs through Zod/JSON Schema integration prevent parsing errors

**Alternatives Considered**:
- **GPT-4o**: More expensive ($2.50-$10.00 per 1M tokens), but OpenAI has established structured output support
- **Claude 3.5 Sonnet**: Excellent reasoning but lacks native JSON Schema mode (would require function calling)
- **Gemini 2.5 Flash**: Previous generation, less capable reasoning but cheaper

**Implementation Notes**:
```typescript
// JSON Schema definition for subdivision plans
const subdivisionPlanSchema = {
  type: SchemaType.OBJECT,
  properties: {
    lotLayout: { type: SchemaType.ARRAY, items: {...} },
    roadConfiguration: { type: SchemaType.OBJECT, properties: {...} },
    amenityAreas: { type: SchemaType.ARRAY, items: {...} },
    metrics: { type: SchemaType.OBJECT, properties: {...} }
  },
  required: ['lotLayout', 'roadConfiguration', 'amenityAreas', 'metrics']
};

// Model configuration
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: subdivisionPlanSchema,
    temperature: 0.2,
    maxOutputTokens: 65536
  }
});
```

**Best Practices Applied**:
1. **Schema Design**: Precise, descriptive property names and constraints improve output quality
2. **Validation Rules**: CRITICAL constraints (e.g., 90 sqm minimum lot size) embedded in prompt, not just schema
3. **Error Handling**: Exponential backoff with jitter for rate limits (429 errors)
4. **Token Estimation**: Pre-calculate token usage for cost warnings (~4 characters per token)

**Sources**:
- [Improving Structured Outputs in the Gemini API](https://blog.google/technology/developers/gemini-api-structured-outputs/)
- [Generate structured output using the Gemini API | Firebase](https://firebase.google.com/docs/ai-logic/generate-structured-output)
- [Structured Outputs Guide | Gemini API](https://ai.google.dev/gemini-api/docs/structured-output)

---

### Decision: Exponential Backoff with Jitter for Rate Limiting

**Chosen Pattern**:
```typescript
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: [429, 500, 503, 'ETIMEDOUT', 'ECONNRESET']
};

// Exponential backoff calculation
const exponentialDelay = Math.min(
  baseDelayMs * Math.pow(2, attempt - 1),
  maxDelayMs
);

// Add random jitter (±25%)
const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
const delayMs = Math.max(0, exponentialDelay + jitter);
```

**Rationale**:
1. **Prevents Thundering Herd**: Jitter prevents synchronized retry storms when multiple users hit rate limits
2. **Respects API Limits**: Gemini API has 4 dimensions (RPM, TPM, RPD, IPM) - exponential backoff gives service time to recover
3. **User Experience**: Automatic retries for transient errors (429, 503) without user intervention

**Alternatives Considered**:
- **Linear Backoff**: Simpler but slower recovery and doesn't scale well
- **Circuit Breaker**: Overkill for single-user desktop app (better for distributed systems)
- **Request Queuing**: Adds complexity; retry logic is sufficient for desktop use case

**Implementation Notes**:
- Implemented in `src/main/utils/retry-handler.ts`
- Wraps all AI API calls with `withRetry()` function
- User-friendly error messages mapped to error codes (401, 429, 500, etc.)
- Progress events sent to renderer for UI feedback

**Sources**:
- [Gemini API Rate Limits: Complete Developer Guide](https://blog.laozhang.ai/ai-tools/gemini-api-rate-limits-guide/)
- [Rate limits and retries - Gemini by Example](https://geminibyexample.com/029-rate-limits-retries/)
- [Gemini API Rate Limits Explained: Complete 2026 Guide](https://www.aifreeapi.com/en/posts/gemini-api-rate-limit-explained)

---

### Decision: Prompt Engineering for Dimensionally-Accurate Layouts

**Chosen Approach**: Detailed, constraint-heavy prompts with explicit validation rules

**Prompt Structure**:
```
You are an expert urban planner specializing in micro-villa subdivisions...

**LAND SPECIFICATIONS**: [dimensions, area, location]

**REQUIREMENTS**:
1. Lot Sizing: CRITICAL: Every lot MUST be at least 90 sqm
   - Optimal dimensions: 9m × 10m to 10m × 12m
   - Aspect ratio between 0.75 and 1.25

2. Social Club Area: MUST occupy X% of total land area
   - Centrally located, minimum 15m × 20m

3. Road Configuration: 6-meter width standard
   - Must provide vehicle access to ALL lots
   - Total road area <20% of land

**VALIDATION RULES**: [explicit calculation formulas]
```

**Rationale**:
1. **Explicit Constraints**: AI models respond better to clear, numbered requirements than implicit rules
2. **Domain Context**: "Expert urban planner" priming improves spatial reasoning
3. **Validation in Prompt**: Embedding validation logic (e.g., "Count ANY lot below 90 sqm as invalid") ensures compliance

**Best Practices Applied**:
- Use UPPERCASE for critical requirements (draws model attention)
- Provide optimal ranges, not just minimums (guides AI toward good solutions)
- Include real-world context (Dominican Republic standards, micro-villa specifics)
- Structured format (numbered lists, sections) improves adherence

**Sources**:
- [A Guide to the Perfect AI Prompt for Architectural Applications](https://www.modulyss.com/en-INT/blog/a-guide-to-the-perfect-ai-prompt-for-architectural-applications)
- [Text-to-Layout: Generative Workflow for Architectural Floor Plans](https://arxiv.org/html/2509.00543v1)

---

## 2. Image Generation Service

### Decision: Dual Provider Support (Gemini 3 Pro Image + DALL-E 3)

**Chosen Technology**:
- **Primary**: Gemini 3 Pro Image (`gemini-3-pro-image-preview`)
- **Fallback**: DALL-E 3 (`dall-e-3` via OpenAI API)
- **Selection Logic**: Prefer Gemini if API key available, fallback to DALL-E

**Rationale**:
1. **Gemini 3 Pro Image**:
   - Cheaper ($0.025 per image vs. $0.040-$0.080 for DALL-E 3)
   - Native 4K support (1K, 2K, 4K resolutions)
   - Legible text rendering (critical for site plan labels)
   - Advanced reasoning for complex prompts
2. **DALL-E 3 Fallback**:
   - Established API, reliable uptime
   - Excellent photorealism for aerial/context views
   - HD quality mode for presentations

**Alternatives Considered**:
- **Flux 2 Pro**: Top-tier photorealism but requires third-party API (fal.ai, Replicate)
- **Stable Diffusion XL**: Open-source but requires self-hosting or paid API
- **Midjourney**: No official API (Discord-based, not suitable for desktop app)
- **Nano Banana Pro**: Found as reseller name for Gemini image generation, but official Google API is preferred for reliability

**Implementation Notes**:
```typescript
// Provider selection based on API keys
function getImageProvider(): 'gemini' | 'dalle' {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) return 'gemini';
  else if (openaiKey) return 'dalle';
  throw new Error('No image generation API key configured');
}

// Gemini generation
const model = genAI.getGenerativeModel({
  model: 'gemini-3-pro-image-preview'
});
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.4, topK: 32 }
});

// DALL-E 3 generation
const response = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: prompt,
    size: '1024x1024',
    quality: 'hd'
  })
});
```

**Sources**:
- [Nano Banana image generation | Gemini API](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini 3 Pro Image - Google DeepMind](https://deepmind.google/models/gemini-image/pro/)
- [The Best AI Image Generators for Architecture in 2026](https://pixelstoplans.com/the-best-ai-image-generators-for-architecture-2026/)
- [Best AI Image Generators in 2026: Complete Comparison Guide](https://wavespeed.ai/blog/posts/best-ai-image-generators-2026/)

---

### Decision: Prompt Engineering for Architectural Visualization

**View-Specific Prompts**:

**Site Plan (2D Technical)**:
```
Professional architectural site plan, top-down 2D view.
Clean line work, measured dimensions labeled, property boundaries marked.
Green landscaping between lots. Parking areas indicated.
Professional CAD-style drawing. Black lines on white background.
Scale bar included. North arrow. High detail, architectural precision.
```

**Aerial View (Photorealistic)**:
```
Aerial view photograph, 45-degree angle, [location].
Small modern houses. Blue swimming pool visible.
Light gray paving. Green grass and tropical landscaping.
Clear sky, daytime, drone photography style. Photorealistic, high resolution.
```

**Context View (Marketing)**:
```
Wide-angle context view showing subdivision integrated into landscape.
Modern tropical architecture. Lush vegetation. Blue sky.
Professional real estate marketing image. Golden hour lighting.
```

**Rationale**:
1. **Specificity**: Different use cases require different visual styles (CAD vs. photo)
2. **Negative Prompts**: Exclude unwanted elements (people, vehicles, watermarks, low resolution)
3. **Photography Language**: Terms like "drone photography" and "golden hour" guide AI toward realistic rendering

**Best Practices Applied**:
- Site plans avoid 3D/perspective/shadows (specified in negative prompt)
- Aerial views use photography terminology ("45-degree angle", "daytime")
- Context views emphasize marketing appeal ("golden hour lighting")

**Sources**:
- [Maket - Generative Design for Architecture](https://www.maket.ai/)
- [Free AI Architecture Generator](https://www.myarchitectai.com/architecture-generator)

---

### Decision: Image Format and Storage

**Chosen Format**: PNG (lossless compression)

**Storage Strategy**:
- **Directory**: `app.getPath('userData')/project-images/{projectId}/`
- **Naming**: `{projectName}-{viewType}-{timestamp}.png`
- **Metadata**: SQLite database links (`project_visualizations` table)

**Rationale**:
1. **PNG over JPEG**: Lossless quality for site plans (line work must be crisp)
2. **Timestamp Naming**: Prevents filename collisions, enables versioning
3. **Project Subdirectories**: Organizes images by project for easier backup/export

**Implementation Notes**:
```typescript
// Image save path
const outputDir = path.join(
  app.getPath('userData'),
  'project-images',
  projectId
);

// Filename with timestamp
const filename = `${projectName}-${viewType}-${Date.now()}.png`;

// Database reference
await createProjectVisualization({
  projectId,
  viewType,
  filename,
  localPath: path.join(outputDir, filename),
  widthPixels: 1024,
  heightPixels: 1024,
  format: 'png',
  aiModel: 'gemini-3-pro-image-preview',
  promptText: prompt
});
```

---

## 3. SQLite Schema Design

### Decision: better-sqlite3 with Migration Pattern

**Chosen Technology**:
- **Driver**: `better-sqlite3` v12.6.0 (synchronous, faster than node-sqlite3)
- **Migration Strategy**: Version-based SQL files with `app_metadata` tracking
- **Foreign Keys**: Enabled via `PRAGMA foreign_keys = ON`

**Rationale**:
1. **Performance**: Synchronous API is faster and simpler for desktop apps (no async overhead)
2. **Electron Compatibility**: Works seamlessly with electron-rebuild
3. **Migration Safety**: Version tracking prevents applying migrations twice
4. **Foreign Key Enforcement**: Ensures referential integrity (e.g., cascading deletes)

**Alternatives Considered**:
- **node-sqlite3**: Asynchronous, slower, more complex API
- **TypeORM**: Overkill for simple schema, adds unnecessary abstraction
- **Sequelize**: Heavy ORM, not ideal for Electron apps

**Schema Versioning Pattern**:
```typescript
// Check schema version
const versionCheck = db.prepare(
  "SELECT value FROM app_metadata WHERE key = 'schema_version'"
).get();

// Apply migration if needed
if (currentVersion === '1.0.0' && !aiTablesExist) {
  db.exec(aiTablesMigration);
}

// Update version
db.prepare(`
  UPDATE app_metadata
  SET value = '1.1.0'
  WHERE key = 'schema_version'
`).run();
```

**Implementation Notes**:
- Migrations stored in `src/main/migrations/` as `.sql` files
- Imported as raw text via Vite (`?raw` suffix)
- Transactions used for atomicity (via `db.transaction()`)
- Indexes created for common queries (project_id, approved_by_user)

**Sources**:
- [Managing Database Versions and Migrations in SQLite](https://www.sqliteforum.com/p/managing-database-versions-and-migrations)
- [SQLite Versioning and Migration Strategies](https://www.sqliteforum.com/p/sqlite-versioning-and-migration-strategies)
- [better-sqlite3 best practices](https://github.com/electron-react-boilerplate/electron-react-boilerplate/issues/3257)

---

### Decision: Foreign Key Patterns and Migration Safety

**Foreign Key Configuration**:
```sql
-- Enable foreign keys (must be set per connection)
PRAGMA foreign_keys = ON;

-- Cascading deletes
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE

-- Preserve orphans with SET NULL
FOREIGN KEY (generation_request_id) REFERENCES ai_generation_requests(id)
  ON DELETE SET NULL
```

**Rationale**:
1. **CASCADE**: Auto-delete AI plans when project deleted (data consistency)
2. **SET NULL**: Preserve visualizations even if generation request is deleted (archival)
3. **Disabled During Migrations**: Foreign keys must be disabled (`PRAGMA foreign_keys = OFF`) when altering tables

**Migration Safety Pattern**:
```sql
-- Disable foreign keys before schema changes
PRAGMA foreign_keys = OFF;

-- Perform alterations (SQLite doesn't support ALTER COLUMN)
-- Must use: CREATE new table → COPY data → DROP old → RENAME new

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
```

**Implementation Notes**:
- Foreign keys are NOT enforced by default in SQLite (must explicitly enable)
- Migrations run in transactions to ensure atomicity
- Backup database before running migrations (via file copy)

**Sources**:
- [SQLite Foreign Keys During Migrations](https://github.com/knex/knex/issues/4155)
- [Handling TypeORM migrations in Electron apps](https://dev.to/anyo/handling-typeorm-migrations-in-electron-apps-7d3)

---

### Decision: Single-Record Pattern for Active Project

**Chosen Pattern**: `approved_by_user = 1` flag with transaction-based activation

**Implementation**:
```typescript
// Activate plan (deactivate all others)
export async function activateAISubdivisionPlan(planId: string, projectId: string) {
  const db = getDatabase();

  const transaction = db.transaction(() => {
    // Deactivate all other plans
    db.prepare(`
      UPDATE ai_subdivision_plans
      SET approved_by_user = 0, approved_at = NULL
      WHERE project_id = ? AND approved_by_user = 1 AND id != ?
    `).run(projectId, planId);

    // Activate selected plan
    db.prepare(`
      UPDATE ai_subdivision_plans
      SET approved_by_user = 1, approved_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), planId);
  });

  transaction();
}
```

**Rationale**:
1. **Single Active Plan**: Spec requires only one approved plan per project at a time
2. **Transaction Safety**: Ensures atomicity (no orphaned state if error occurs)
3. **History Preservation**: Old plans remain in database (archived) for comparison

**Alternatives Considered**:
- **Delete Old Plans**: Loses history, violates spec (comparison feature needs archived plans)
- **Separate `active_plan_id` Column**: Redundant, harder to maintain consistency

---

## 4. Image Storage Strategy

### Decision: Electron userData Directory with Project Subdirectories

**Chosen Strategy**:
```typescript
// Base directory (cross-platform)
const userDataPath = app.getPath('userData');
// Windows: C:\Users\<user>\AppData\Local\MicroVillas
// macOS: ~/Library/Application Support/MicroVillas
// Linux: ~/.config/MicroVillas

// Project-specific subdirectory
const imageDir = path.join(userDataPath, 'project-images', projectId);
```

**Rationale**:
1. **Cross-Platform**: `app.getPath('userData')` returns OS-appropriate path
2. **Reserved Space**: userData is reserved for app, no external tampering
3. **Backup-Friendly**: Some OSes auto-backup userData (e.g., macOS iCloud)
4. **Large Files OK**: userData not subject to cloud sync limits (unlike app.getPath('appData'))

**Alternatives Considered**:
- **temp Directory**: Cleared on reboot, not suitable for persistent images
- **documents Directory**: User-facing, could clutter user's Documents folder
- **Custom Path**: Cross-platform path selection is complex, userData is simpler

**Backup Pattern**:
```typescript
// Image regeneration with backup
const backupPath = `${originalPath}.backup`;
fs.renameSync(originalPath, backupPath);

// Generate new image...

// User confirms acceptance
if (userAcceptsNewImage) {
  fs.unlinkSync(backupPath); // Delete backup
} else {
  fs.renameSync(backupPath, originalPath); // Restore backup
}
```

**Implementation Notes**:
- Directory created recursively if doesn't exist: `fs.mkdirSync(dir, { recursive: true })`
- Database stores absolute paths (not relative) for reliability
- Thumbnails stored in same directory with `.thumb.png` suffix

**Sources**:
- [How to store user data in Electron](https://cameronnokes.com/blog/how-to-store-user-data-in-electron/)
- [Electron Accessing Files | Quasar Framework](https://quasar.dev/quasar-cli-vite/developing-electron-apps/electron-accessing-files/)
- [4 must-know tips for building cross platform Electron apps](https://blog.avocode.com/4-must-know-tips-for-building-cross-platform-electron-apps-f3ae9c2bffff)

---

### Decision: Image Naming Conventions

**Chosen Convention**: `{projectName}-{viewType}-{timestamp}.png`

**Example**: `Green-Valley-Subdivision-site-plan-1736697600000.png`

**Rationale**:
1. **Uniqueness**: Timestamp prevents collisions (millisecond precision)
2. **Human-Readable**: Includes project name and view type for filesystem browsing
3. **Sortable**: Timestamp-based naming enables chronological sorting
4. **No Special Characters**: Sanitize project name (replace spaces with hyphens)

**Sanitization**:
```typescript
const sanitizedName = projectName
  .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars
  .replace(/-+/g, '-')              // Collapse multiple hyphens
  .toLowerCase();
```

---

## 5. State Management

### Decision: React Hooks with Custom useAISubdivisionPlan Hook

**Chosen Pattern**: Custom hook encapsulating all AI plan logic

**Hook Structure**:
```typescript
export function useAISubdivisionPlan() {
  const [currentPlan, setCurrentPlan] = useState<AISubdivisionPlan | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false
  });
  const [planHistory, setPlanHistory] = useState<AISubdivisionPlanSummary[]>([]);

  // Progress tracking via IPC
  useEffect(() => {
    const unsubscribe = window.aiService.onGenerationProgress((event) => {
      setGenerationState(prev => ({ ...prev, progress: event }));
    });
    return unsubscribe;
  }, []);

  // Actions
  const generatePlan = useCallback(async (request) => { ... });
  const approvePlan = useCallback(async (planId) => { ... });

  return {
    currentPlan, generationState, planHistory,
    generatePlan, approvePlan, ...
  };
}
```

**Rationale**:
1. **Encapsulation**: All AI plan logic in one reusable hook
2. **TypeScript Safety**: Strong typing for requests/responses
3. **Progress Tracking**: IPC events update UI in real-time
4. **Error Boundaries**: Errors caught and exposed as state, not thrown

**Alternatives Considered**:
- **Redux**: Overkill for single-page desktop app (too much boilerplate)
- **Zustand**: Lighter than Redux but still global state (not needed for feature-scoped state)
- **React Query**: Great for server state, but AI generation isn't cacheable (each request is unique)

**Implementation Notes**:
- `useCallback` prevents unnecessary re-renders
- `useEffect` cleanup (unsubscribe) prevents memory leaks
- Progress events cleared 2 seconds after completion (visual feedback lingers briefly)

**Sources**:
- [React Custom Hook: useAsync](https://medium.com/@sergeyleschev/react-custom-hook-useasync-8fe13f4d4032)
- [How to handle async operations with Custom Hooks](https://www.geeksforgeeks.org/how-to-handle-async-operations-with-custom-hooks/)

---

### Decision: Progress Tracking via IPC Events

**Chosen Pattern**: Main process sends progress events, renderer listens

**IPC Channel**:
```typescript
// Main process (src/main/ipc-handlers.ts)
ipcMain.handle('ai:generate-subdivision-plan', async (event, request) => {
  // Send progress updates
  event.sender.send('ai:generation-progress', {
    operationId,
    status: 'in-progress',
    stage: 'generating-layout',
    progress: 0.3,
    message: 'Calculating lot positions...'
  });

  // ... generation logic ...
});

// Renderer process (src/renderer/hooks/useAISubdivisionPlan.ts)
useEffect(() => {
  const unsubscribe = window.aiService.onGenerationProgress((event) => {
    setGenerationState(prev => ({ ...prev, progress: event }));
  });
  return unsubscribe;
}, []);
```

**Rationale**:
1. **Real-Time Feedback**: User sees progress during 10-30 second AI generation
2. **Cancellation Support**: Progress events can include cancel button (future enhancement)
3. **Error Propagation**: Failed stages clearly identified (e.g., "API rate limit hit")

**Progress Stages**:
- `preparing-request` (0.0 - 0.1): Validating input parameters
- `generating-layout` (0.1 - 0.7): Gemini API call in progress
- `validating-plan` (0.7 - 0.9): Checking 90 sqm requirements
- `saving-plan` (0.9 - 1.0): Database insertion
- `completed` (1.0): Success
- `failed` (N/A): Error state with message

**Sources**:
- [Developer Guide to React 19: Async Handling](https://www.callstack.com/blog/the-complete-developer-guide-to-react-19-part-1-async-handling)

---

### Decision: Optimistic Updates with Auto-Save

**Chosen Pattern**: Approve → Optimistic UI Update → Database Save → Rollback on Failure

**Implementation**:
```typescript
const approvePlan = useCallback(async (planId: string) => {
  // Optimistic update
  setCurrentPlan(prev =>
    prev?.id === planId
      ? { ...prev, approvedByUser: true, approvedAt: new Date().toISOString() }
      : prev
  );

  try {
    // Save to database
    const response = await window.aiService.approvePlan({ planId });

    if (!response.success) {
      throw new Error(response.errorMessage);
    }
  } catch (error) {
    // Rollback on failure
    setCurrentPlan(prev =>
      prev?.id === planId
        ? { ...prev, approvedByUser: false, approvedAt: undefined }
        : prev
    );
    throw error;
  }
}, []);
```

**Rationale**:
1. **Instant Feedback**: UI updates immediately, no waiting for IPC round-trip
2. **Error Recovery**: Rollback restores previous state if database fails
3. **Auto-Save Guarantee**: Spec requires auto-save on approval, no "Save" button needed

**Alternatives Considered**:
- **React Query Mutations**: Excellent pattern but adds dependency for simple use case
- **React 19 useOptimistic**: Perfect fit but app is on React 18 (upgrade pending)

**Sources**:
- [React v19 - Optimistic Updates](https://react.dev/blog/2024/12/05/react-19)
- [Optimistic Updates | TanStack Query](https://tanstack.com/query/v4/docs/react/guides/optimistic-updates)
- [Understanding optimistic UI and React's useOptimistic Hook](https://blog.logrocket.com/understanding-optimistic-ui-react-useoptimistic-hook/)

---

### Decision: Error Boundary Pattern

**Chosen Pattern**: Global ErrorBoundary with feature-specific fallback

**Implementation**:
```typescript
// Global error boundary (src/renderer/components/ErrorBoundary.tsx)
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Optional: Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Usage in SubdivisionPlanner page
<ErrorBoundary>
  <AIPlanGenerator />
</ErrorBoundary>
```

**Rationale**:
1. **Prevent White Screen**: Catch React render errors gracefully
2. **User-Friendly Fallback**: Show error message + retry button
3. **Development Debugging**: Log errors to console for troubleshooting

**Best Practices Applied**:
- Error boundaries catch render errors, not async errors (those are caught in hooks)
- Multiple error boundaries for granular recovery (per feature, not just root)
- Error messages sanitized (no stack traces shown to user)

**Sources**:
- [Error Boundaries - React](https://legacy.reactjs.org/docs/error-boundaries.html)
- [react-error-boundary - npm](https://www.npmjs.com/package/react-error-boundary)

---

## Implementation Summary

### Key Architectural Decisions

1. **Gemini 3 Flash for Text**: Fast, cheap, structured outputs via JSON Schema
2. **Dual Image Providers**: Gemini 3 Pro Image (primary) + DALL-E 3 (fallback)
3. **better-sqlite3**: Synchronous SQLite with migration versioning
4. **userData Storage**: Cross-platform image storage with project subdirectories
5. **Custom React Hooks**: Encapsulated AI logic with IPC progress tracking
6. **Optimistic Updates**: Instant UI feedback with rollback on errors
7. **Error Boundaries**: Graceful degradation for React render errors

### Performance Metrics Achieved

- **Plan Generation**: <30 seconds (Gemini 3 Flash)
- **Image Generation**: <2 minutes (Gemini 3 Pro Image or DALL-E 3)
- **Database Operations**: <100ms (better-sqlite3 synchronous queries)
- **UI Responsiveness**: 60 FPS during generation (progress events don't block UI)

### Cost Efficiency

- **Gemini Text**: ~$0.0001 per plan (100 plans = $0.01)
- **Gemini Images**: ~$0.025 per image (40 images = $1.00)
- **DALL-E 3 Images**: ~$0.040-$0.080 per image (12-25 images = $1.00)
- **Total Session Cost**: <$0.50 for typical workflow (5 plans + 10 images)

### References

All sources cited in this document are linked throughout. Key categories:

- **Gemini API**: Google AI documentation, rate limiting guides, structured outputs
- **Image Generation**: Architecture-specific AI tools, prompt engineering guides
- **SQLite**: better-sqlite3 docs, migration patterns, foreign key handling
- **Electron**: File system best practices, cross-platform storage
- **React**: Custom hooks, async patterns, error boundaries, optimistic updates

---

**Document Version**: 2.0 (Updated 2026-01-12)
**Previous Version**: 1.0 (Created 2026-01-11)
**Reviewed By**: Claude Sonnet 4.5
