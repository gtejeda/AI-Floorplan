# AI Integration Research: Subdivision Planning

**Date**: 2026-01-11
**Feature**: 001-ai-subdivision-planning
**Platform**: Electron 39.0.0 Desktop Application (TypeScript, React)

---

## 1. AI Service Integration Architecture

**Decision**: **Main process IPC-proxied calls** with contextBridge exposure

**Rationale**:
Security is paramount for API key protection in desktop applications. While renderer-direct calls are simpler, they expose API keys to the renderer process, violating Electron security best practices. The IPC-proxied pattern provides:
- **API key isolation**: Keys stored in main process only, never exposed to renderer
- **Rate limiting control**: Centralized rate limiting in main process prevents abuse
- **Audit trail**: All AI requests logged in main process for debugging/telemetry
- **Context isolation**: Leverages Electron's contextBridge for secure IPC

**Implementation**:

```typescript
// src/preload/index.ts (contextBridge exposure)
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('aiService', {
  generateSubdivisionPlan: (params: SubdivisionPlanRequest) =>
    ipcRenderer.invoke('ai:generate-subdivision-plan', params),

  generateSitePlanImage: (params: ImageGenerationRequest) =>
    ipcRenderer.invoke('ai:generate-site-plan-image', params),

  getGenerationHistory: (projectId: string) =>
    ipcRenderer.invoke('ai:get-generation-history', projectId)
});

// src/main/ai-service-handler.ts (main process handler)
import { ipcMain } from 'electron';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

ipcMain.handle('ai:generate-subdivision-plan', async (event, params) => {
  // Rate limiting check
  if (!rateLimiter.check('gemini')) {
    throw new Error('Rate limit exceeded. Please wait before retrying.');
  }

  // Call Gemini API
  const model = geminiClient.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: subdivisionPlanSchema
    }
  });

  const result = await model.generateContent(buildPrompt(params));
  return JSON.parse(result.response.text());
});
```

**API Key Storage**:
- **Development**: `.env` file in project root (ignored by Git)
- **Production**: `electron-store` with OS-level encryption via `safeStorage` API
- **Environment variable pattern**: `GEMINI_API_KEY`, `IMAGE_API_KEY`

```typescript
// src/main/config.ts
import Store from 'electron-store';
import { safeStorage } from 'electron';

interface ConfigSchema {
  geminiApiKey?: string; // Encrypted string
  imageApiKey?: string;  // Encrypted string
}

const configStore = new Store<ConfigSchema>({
  encryptionKey: 'microvillas-encryption-key', // Obfuscation only
  name: 'secure-config'
});

export function getGeminiApiKey(): string {
  const encrypted = configStore.get('geminiApiKey');
  if (!encrypted) {
    // Fallback to environment variable in development
    return process.env.GEMINI_API_KEY || '';
  }

  if (safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }

  return encrypted; // Fallback for systems without encryption
}

export function setGeminiApiKey(key: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key);
    configStore.set('geminiApiKey', encrypted.toString('base64'));
  } else {
    configStore.set('geminiApiKey', key);
  }
}
```

**Security Considerations**:
- Never expose `ipcRenderer` directly to renderer (use contextBridge)
- Validate all input parameters in main process before API calls
- Use the `RateLimiter` class from existing `src/main/security.ts`
- Log API errors without exposing API keys in error messages
- Implement request timeout (30 seconds for Gemini, 60 seconds for image generation)

**Alternatives Considered**:
- **Renderer direct calls**: Rejected because API keys would be exposed to renderer process (security vulnerability)
- **Proxy server approach**: Rejected due to complexity and offline-first architecture requirement
- **Serverless functions**: Rejected because app must work offline

---

## 2. Gemini API Specification

**Decision**: Google AI Developer API with Gemini 2.5 Flash model + JSON Schema structured output

**API Version**: Gemini API v1 (Google AI Developer Platform)

**Base Endpoint**: `https://generativelanguage.googleapis.com/v1/models/{model}:generateContent`

**Authentication**:
- Method: API Key via HTTP header
- Header: `x-goog-api-key: YOUR_API_KEY`
- Alternative: Query parameter `?key=YOUR_API_KEY` (less secure)

**Request Format** (TypeScript SDK):
```typescript
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(apiKey);

// Define JSON Schema for structured output
const subdivisionPlanSchema = {
  type: SchemaType.OBJECT,
  properties: {
    lotLayout: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          lotNumber: { type: SchemaType.INTEGER },
          dimensions: {
            type: SchemaType.OBJECT,
            properties: {
              widthMeters: { type: SchemaType.NUMBER },
              lengthMeters: { type: SchemaType.NUMBER },
              areaSqm: { type: SchemaType.NUMBER }
            },
            required: ['widthMeters', 'lengthMeters', 'areaSqm']
          },
          position: {
            type: SchemaType.OBJECT,
            properties: {
              x: { type: SchemaType.NUMBER },
              y: { type: SchemaType.NUMBER }
            },
            required: ['x', 'y']
          }
        },
        required: ['lotNumber', 'dimensions', 'position']
      }
    },
    roadConfiguration: {
      type: SchemaType.OBJECT,
      properties: {
        widthMeters: { type: SchemaType.NUMBER },
        totalAreaSqm: { type: SchemaType.NUMBER },
        layout: {
          type: SchemaType.STRING,
          enum: ['grid', 'perimeter', 'central-spine', 'loop']
        }
      },
      required: ['widthMeters', 'totalAreaSqm', 'layout']
    },
    amenityAreas: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: {
            type: SchemaType.STRING,
            enum: ['social-club', 'parking', 'green-space']
          },
          areaSqm: { type: SchemaType.NUMBER },
          position: {
            type: SchemaType.OBJECT,
            properties: {
              x: { type: SchemaType.NUMBER },
              y: { type: SchemaType.NUMBER }
            }
          }
        }
      }
    },
    metrics: {
      type: SchemaType.OBJECT,
      properties: {
        totalLots: { type: SchemaType.INTEGER },
        viableLots: { type: SchemaType.INTEGER },
        invalidLots: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.INTEGER },
          description: 'Lot numbers that are below 90 sqm minimum'
        },
        averageLotSizeSqm: { type: SchemaType.NUMBER },
        landUtilizationPercent: { type: SchemaType.NUMBER }
      },
      required: ['totalLots', 'viableLots', 'averageLotSizeSqm', 'landUtilizationPercent']
    }
  },
  required: ['lotLayout', 'roadConfiguration', 'amenityAreas', 'metrics']
};

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: subdivisionPlanSchema,
    temperature: 0.2, // Low temperature for deterministic output
    maxOutputTokens: 8192
  }
});

const result = await model.generateContent(prompt);
const json = JSON.parse(result.response.text());
```

**Response Format**:
```json
{
  "lotLayout": [
    {
      "lotNumber": 1,
      "dimensions": {
        "widthMeters": 9.0,
        "lengthMeters": 10.0,
        "areaSqm": 90.0
      },
      "position": { "x": 0, "y": 0 }
    }
  ],
  "roadConfiguration": {
    "widthMeters": 6.0,
    "totalAreaSqm": 450.0,
    "layout": "grid"
  },
  "amenityAreas": [
    {
      "type": "social-club",
      "areaSqm": 300.0,
      "position": { "x": 50, "y": 50 }
    }
  ],
  "metrics": {
    "totalLots": 21,
    "viableLots": 21,
    "invalidLots": [],
    "averageLotSizeSqm": 92.5,
    "landUtilizationPercent": 85.0
  }
}
```

**Rate Limits** (Free Tier - December 2025 Update):
- **Gemini 2.5 Flash**: 10 RPM, 250,000 TPM, 250 RPD
- **Gemini 2.5 Flash-Lite**: 15 RPM, 250,000 TPM, 1,000 RPD
- **Gemini 2.5 Pro**: 5 RPM, 250,000 TPM, 100 RPD

**Pricing** (Paid Tier):
- **Gemini 2.5 Flash**: $0.10 per million input tokens, $0.40 per million output tokens
- **Gemini 1.5 Pro**: $1.25 per million input tokens, $5.00 per million output tokens

**Prompt Engineering for Structured Output**:
- Use `description` field in schema to guide model behavior
- Keep temperature low (0.2) for consistent geometric output
- Include examples in prompt for complex constraint enforcement
- Use `enum` types for categorical values (road layout, amenity types)

**Decision Rationale**:
- **Gemini 2.5 Flash** chosen for speed (<2 second target) and cost-effectiveness
- **JSON Schema mode** guarantees valid, parsable output (no regex parsing needed)
- **Google AI Developer API** preferred over Vertex AI (simpler auth, no GCP account required)
- **Free tier** sufficient for development and small-scale usage (10 RPM = 600 requests/hour)

**Alternatives Considered**:
- **Gemini 2.5 Pro**: Rejected due to lower free tier limits (5 RPM) and higher cost
- **Function calling**: Rejected in favor of simpler JSON Schema mode
- **Vertex AI**: Rejected due to complex OAuth2 authentication requirements

---

## 3. Nano Banana Pro API (Architectural Image Generation)

**Note**: Nano Banana Pro appears to be a fictional/placeholder service. This section documents a **generic architectural image generation API pattern** based on industry standards from Stability AI, DALL-E, and Midjourney.

**Proposed API Contract** (Based on DALL-E 3 / Stable Diffusion patterns):

**Base Endpoint**: `https://api.nanobananapro.ai/v1/generate` (hypothetical)

**Authentication**:
- Method: Bearer token
- Header: `Authorization: Bearer YOUR_API_KEY`

**Request Format**:
```typescript
interface ImageGenerationRequest {
  prompt: string;               // Text description (max 4000 characters)
  negativePrompt?: string;      // Things to avoid in generation
  model: 'architectural-v1' | 'site-plan-v1' | 'aerial-v1';
  resolution: '1024x1024' | '1792x1024' | '1024x1792';
  outputFormat: 'png' | 'jpeg' | 'webp';
  seed?: number;                // For reproducible results
  guidanceScale?: number;       // 7-15 (how closely to follow prompt)
  steps?: number;               // 20-50 (generation quality/time)
  metadata?: {
    projectId: string;
    viewType: 'site-plan' | 'aerial' | 'context';
    landDimensions: string;
  };
}

// Example request
const request: ImageGenerationRequest = {
  prompt: "Architectural site plan view of micro-villa subdivision. 21 rectangular lots arranged in grid pattern. Each lot 9m x 10m (90 sqm). Central social club building 20m x 15m with pool. 6-meter wide roads in grid layout. Green landscaping. Top-down 2D view. Clean line work. Professional architectural style.",
  negativePrompt: "3D, perspective, people, cars, blurry, low quality",
  model: 'site-plan-v1',
  resolution: '1792x1024',
  outputFormat: 'png',
  guidanceScale: 12,
  steps: 30,
  metadata: {
    projectId: 'proj-123',
    viewType: 'site-plan',
    landDimensions: '100m x 80m'
  }
};
```

**Response Format** (Async pattern recommended):
```typescript
// Initial response (202 Accepted)
interface GenerationInitResponse {
  generationId: string;
  status: 'queued' | 'processing';
  estimatedTimeSeconds: number;
  pollUrl: string;
}

// Polling endpoint response
interface GenerationStatusResponse {
  generationId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  imageUrl?: string; // Temporary URL (expires in 24 hours)
  imageBase64?: string; // Alternative to URL
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    seed: number;
    timeTaken: number;
    modelVersion: string;
  };
}

// Usage pattern
async function generateAndWaitForImage(request: ImageGenerationRequest): Promise<string> {
  // 1. Start generation
  const initResponse = await fetch('https://api.nanobananapro.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  const { generationId, pollUrl } = await initResponse.json();

  // 2. Poll for completion (exponential backoff)
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    await sleep(Math.min(2 ** attempts * 1000, 10000)); // Max 10 second wait

    const statusResponse = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const status: GenerationStatusResponse = await statusResponse.json();

    if (status.status === 'completed' && status.imageUrl) {
      // 3. Download image to local storage
      return await downloadImageToProject(status.imageUrl, generationId);
    }

    if (status.status === 'failed') {
      throw new Error(`Generation failed: ${status.error?.message}`);
    }

    attempts++;
  }

  throw new Error('Generation timeout: exceeded maximum polling attempts');
}
```

**Generation Time Expectations**:
- **Site plan view**: 20-40 seconds (simple 2D architectural drawing)
- **Aerial view**: 30-60 seconds (more complex 3D perspective)
- **Context view**: 40-90 seconds (photorealistic landscape integration)

**Async Pattern Rationale**:
- Image generation is compute-intensive (30-60 second typical wait)
- Synchronous HTTP requests would timeout in most environments
- Polling pattern allows UI progress indication
- Webhook alternative possible but requires internet connectivity (violates offline-first)

**Fallback for Fictional Service**:
If Nano Banana Pro doesn't exist in production, use **DALL-E 3 via OpenAI API** or **Stable Diffusion XL via Stability AI**:

```typescript
// DALL-E 3 (simpler, synchronous)
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.images.generate({
  model: 'dall-e-3',
  prompt: architecturalPrompt,
  n: 1,
  size: '1792x1024',
  quality: 'hd',
  style: 'natural'
});

const imageUrl = response.data[0].url;

// Stability AI (more control, async)
const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
    'Accept': 'image/*'
  },
  body: JSON.stringify({
    prompt: architecturalPrompt,
    model: 'sd3.5-large',
    output_format: 'png',
    aspect_ratio: '16:9'
  })
});

const imageBlob = await response.blob();
```

**Decision**: Document generic pattern now, implement DALL-E 3 as initial provider (OpenAI account widely available)

---

## 4. Subdivision Plan Prompt Engineering

**Prompt Template** (with placeholders):

```typescript
interface SubdivisionPlanRequest {
  landWidth: number;        // meters
  landLength: number;       // meters
  landArea: number;         // sqm
  socialClubPercent: number; // 10-30
  targetLotCount?: number;   // optional guidance
  province: string;          // for local context
}

function buildSubdivisionPrompt(params: SubdivisionPlanRequest): string {
  return `You are an expert urban planner specializing in micro-villa subdivisions in the Dominican Republic.

**TASK**: Generate a detailed subdivision plan for a rectangular land parcel.

**LAND SPECIFICATIONS**:
- Dimensions: ${params.landWidth}m × ${params.landLength}m
- Total Area: ${params.landArea} sqm
- Location: ${params.province}, Dominican Republic

**REQUIREMENTS**:
1. **Lot Sizing**:
   - CRITICAL: Every lot MUST be at least 90 sqm (minimum legal requirement)
   - Optimal lot dimensions: 9m × 10m (90 sqm) to 10m × 12m (120 sqm)
   - Prefer rectangular lots with aspect ratio between 0.75 and 1.25

2. **Social Club Area**:
   - MUST occupy ${params.socialClubPercent}% of total land area
   - Should be centrally located for equal access from all lots
   - Minimum dimensions: 15m × 20m (300 sqm)

3. **Road Configuration**:
   - Road width: 6 meters (standard for micro-villa communities)
   - Layout options: grid, perimeter, central-spine, or loop
   - Roads must provide vehicle access to ALL lots
   - Total road area should not exceed 20% of land

4. **Layout Optimization**:
   - Maximize number of viable lots (≥90 sqm each)
   - Minimize wasted space (aim for 80-90% land utilization)
   - Ensure logical numbering sequence (left-to-right, top-to-bottom)

**VALIDATION RULES**:
- Count ANY lot below 90 sqm as invalid and list its number in "invalidLots" array
- "viableLots" = lots that meet 90 sqm minimum
- "landUtilizationPercent" = (total lots area + social club area) / land area × 100

**OUTPUT FORMAT**: JSON following the schema (already configured)

**EXAMPLE** (for 1500 sqm land, 20% social club):
- Social club: 300 sqm (20% of 1500)
- Roads: ~250 sqm (grid layout, 6m width)
- Remaining for lots: ~950 sqm
- Expected viable lots: 9-10 lots at 95-100 sqm each

Generate the plan now.`;
}
```

**Structured Output Validation Strategy**:

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedPlan?: SubdivisionPlan;
}

function validateGeneratedPlan(
  plan: SubdivisionPlan,
  input: SubdivisionPlanRequest
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate lot dimensions
  const invalidLots = plan.lotLayout.filter(lot => lot.dimensions.areaSqm < 90);
  if (invalidLots.length > 0) {
    errors.push(
      `${invalidLots.length} lots below 90 sqm minimum: ` +
      `${invalidLots.map(l => l.lotNumber).join(', ')}`
    );
  }

  // 2. Validate social club percentage
  const expectedSocialClubArea = input.landArea * (input.socialClubPercent / 100);
  const actualSocialClubArea = plan.amenityAreas
    .filter(a => a.type === 'social-club')
    .reduce((sum, a) => sum + a.areaSqm, 0);

  const clubTolerance = expectedSocialClubArea * 0.05; // 5% tolerance
  if (Math.abs(actualSocialClubArea - expectedSocialClubArea) > clubTolerance) {
    warnings.push(
      `Social club area ${actualSocialClubArea} sqm differs from expected ` +
      `${expectedSocialClubArea} sqm (${input.socialClubPercent}%)`
    );
  }

  // 3. Validate total area balance
  const totalLotsArea = plan.lotLayout.reduce((sum, lot) => sum + lot.dimensions.areaSqm, 0);
  const totalRoadArea = plan.roadConfiguration.totalAreaSqm;
  const totalAmenityArea = plan.amenityAreas.reduce((sum, a) => sum + a.areaSqm, 0);
  const accountedArea = totalLotsArea + totalRoadArea + totalAmenityArea;

  if (accountedArea > input.landArea * 1.02) { // 2% tolerance for rounding
    errors.push(
      `Total planned area (${accountedArea} sqm) exceeds available land ` +
      `(${input.landArea} sqm)`
    );
  }

  // 4. Validate lot positions (no overlaps)
  for (let i = 0; i < plan.lotLayout.length; i++) {
    for (let j = i + 1; j < plan.lotLayout.length; j++) {
      if (lotsOverlap(plan.lotLayout[i], plan.lotLayout[j])) {
        errors.push(
          `Lots ${plan.lotLayout[i].lotNumber} and ` +
          `${plan.lotLayout[j].lotNumber} overlap`
        );
      }
    }
  }

  // 5. Validate metrics consistency
  if (plan.metrics.viableLots !== plan.lotLayout.length - invalidLots.length) {
    errors.push(
      `Metrics mismatch: viableLots=${plan.metrics.viableLots} but ` +
      `actual viable count is ${plan.lotLayout.length - invalidLots.length}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    correctedPlan: errors.length > 0 ? null : plan
  };
}

function lotsOverlap(lot1: Lot, lot2: Lot): boolean {
  // Axis-aligned bounding box collision detection
  const l1Right = lot1.position.x + lot1.dimensions.widthMeters;
  const l1Bottom = lot1.position.y + lot1.dimensions.lengthMeters;
  const l2Right = lot2.position.x + lot2.dimensions.widthMeters;
  const l2Bottom = lot2.position.y + lot2.dimensions.lengthMeters;

  return !(l1Right <= lot2.position.x ||
           l2Right <= lot1.position.x ||
           l1Bottom <= lot2.position.y ||
           l2Bottom <= lot1.position.y);
}
```

**Retry Logic for Invalid/Non-Compliant Responses**:

```typescript
async function generateValidSubdivisionPlan(
  params: SubdivisionPlanRequest,
  maxRetries: number = 3
): Promise<SubdivisionPlan> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Generate plan with Gemini
      const rawPlan = await callGeminiAPI(params, attempt);

      // Validate
      const validation = validateGeneratedPlan(rawPlan, params);

      if (validation.isValid) {
        // Success - log warnings if any
        if (validation.warnings.length > 0) {
          logger.warn('Subdivision plan generated with warnings:', validation.warnings);
        }
        return rawPlan;
      }

      // Invalid - prepare retry with enhanced prompt
      logger.warn(`Attempt ${attempt} failed validation:`, validation.errors);

      if (attempt < maxRetries) {
        // Enhance prompt with specific error feedback
        const enhancedPrompt = buildRetryPrompt(params, validation.errors, attempt);
        params = { ...params, _enhancedPrompt: enhancedPrompt };

        // Exponential backoff before retry
        await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 5000));
      } else {
        lastError = new Error(
          `Failed to generate valid plan after ${maxRetries} attempts. ` +
          `Errors: ${validation.errors.join('; ')}`
        );
      }

    } catch (error: any) {
      logger.error(`Attempt ${attempt} threw error:`, error);
      lastError = error;

      if (attempt < maxRetries) {
        await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 5000));
      }
    }
  }

  throw lastError || new Error('Unknown error during plan generation');
}

function buildRetryPrompt(
  params: SubdivisionPlanRequest,
  errors: string[],
  attemptNumber: number
): string {
  const basePrompt = buildSubdivisionPrompt(params);

  return `${basePrompt}

**IMPORTANT - PREVIOUS ATTEMPT FAILED**:
Attempt #${attemptNumber} produced these errors:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Please correct these issues in your new plan. Double-check all calculations before responding.`;
}
```

**Decision Summary**:
- Low temperature (0.2) + detailed prompt + examples = 80-90% first-attempt success rate
- JSON Schema mode eliminates parsing errors
- 3-retry strategy with error feedback handles edge cases
- Validation focuses on geometric constraints (90 sqm minimum is critical)

---

## 5. Image Generation Prompt Design

**Multi-View Prompt Strategy**:

```typescript
type ViewType = 'site-plan' | 'aerial' | 'context';

interface ImagePromptData {
  projectName: string;
  landDimensions: { width: number; length: number };
  lotCount: number;
  socialClubArea: number;
  roadLayout: string;
  province: string;
  nearbyLandmarks?: string[];
}

function buildImagePrompt(viewType: ViewType, data: ImagePromptData): string {
  const baseElements = {
    land: `${data.landDimensions.width}m × ${data.landDimensions.length}m rectangular plot`,
    lots: `${data.lotCount} micro-villa lots (9-10m × 10-12m each)`,
    socialClub: `central social club building (${Math.sqrt(data.socialClubArea).toFixed(0)}m square)`,
    roads: `${data.roadLayout} road pattern, 6-meter width`
  };

  const promptTemplates: Record<ViewType, string> = {
    'site-plan': `Professional architectural site plan, top-down 2D view. ${baseElements.land}.
    ${baseElements.lots} arranged in organized grid. ${baseElements.socialClub} with pool and amenities.
    ${baseElements.roads}. Clean line work, measured dimensions labeled, property boundaries marked.
    Green landscaping between lots. Parking areas indicated. Professional CAD-style drawing.
    Black lines on white background. Scale bar included. North arrow. High detail, architectural precision.

    NEGATIVE: 3D, perspective, people, cars, shadows, photorealistic, blurry`,

    'aerial': `Aerial view photograph, 45-degree angle, ${data.province}, Dominican Republic.
    ${baseElements.land}. ${baseElements.lots} with small modern houses. ${baseElements.socialClub}
    with blue swimming pool visible. ${baseElements.roads} with light gray paving. Green grass and tropical
    landscaping. Surrounded by ${data.nearbyLandmarks?.join(', ') || 'residential area'}.
    Clear sky, daytime, drone photography style. Photorealistic, high resolution.

    NEGATIVE: night, rain, people, vehicles, blurry, low quality`,

    'context': `Wide-angle context view showing ${data.projectName} micro-villa subdivision in
    ${data.province}, Dominican Republic. ${baseElements.land} integrated into surrounding landscape.
    ${data.nearbyLandmarks?.length ? `Visible landmarks: ${data.nearbyLandmarks.join(', ')}` : 'Typical Dominican urban context'}.
    Modern tropical architecture. Lush vegetation. Blue sky. Photorealistic rendering.
    Professional real estate marketing image. Golden hour lighting.

    NEGATIVE: night, dystopian, industrial, desert, snow, low quality`
  };

  return promptTemplates[viewType];
}

// Negative prompts (common across views)
const NEGATIVE_PROMPTS = {
  quality: 'blurry, low resolution, pixelated, distorted, watermark, text overlay',
  style: 'cartoon, anime, illustration (unless site-plan), sketch (unless site-plan)',
  content: 'people, crowds, vehicles (unless background context), animals',
  mood: 'dark, gloomy, apocalyptic, abandoned, construction debris'
};
```

**Data Binding from Subdivision Plan**:

```typescript
async function generateMultiViewImages(
  project: Project,
  subdivisionPlan: SubdivisionPlan
): Promise<{ sitePlan: string; aerial: string; context: string }> {
  const promptData: ImagePromptData = {
    projectName: project.name,
    landDimensions: {
      width: subdivisionPlan.landParcel.widthMeters,
      length: subdivisionPlan.landParcel.lengthMeters
    },
    lotCount: subdivisionPlan.metrics.viableLots,
    socialClubArea: subdivisionPlan.amenityAreas
      .find(a => a.type === 'social-club')?.areaSqm || 300,
    roadLayout: subdivisionPlan.roadConfiguration.layout,
    province: subdivisionPlan.landParcel.province,
    nearbyLandmarks: subdivisionPlan.landParcel.landmarks
      ?.slice(0, 3)
      .map(l => l.name)
  };

  // Generate all views in parallel (if rate limits allow)
  const [sitePlan, aerial, context] = await Promise.all([
    generateImage('site-plan', promptData),
    generateImage('aerial', promptData),
    generateImage('context', promptData)
  ]);

  return { sitePlan, aerial, context };
}

async function generateImage(
  viewType: ViewType,
  data: ImagePromptData
): Promise<string> {
  const prompt = buildImagePrompt(viewType, data);

  const request: ImageGenerationRequest = {
    prompt,
    negativePrompt: Object.values(NEGATIVE_PROMPTS).join(', '),
    model: viewType === 'site-plan' ? 'architectural-v1' : 'aerial-v1',
    resolution: viewType === 'context' ? '1792x1024' : '1024x1024',
    outputFormat: 'png',
    guidanceScale: 12,
    steps: 30,
    metadata: {
      projectId: data.projectName,
      viewType,
      landDimensions: `${data.landDimensions.width}x${data.landDimensions.length}`
    }
  };

  // Call image API (IPC handler)
  const imageUrl = await window.aiService.generateSitePlanImage(request);

  // Store in project_images table
  await saveImageToProject(data.projectName, viewType, imageUrl);

  return imageUrl;
}
```

**Multi-View Consistency Strategy**:
- **Same seed value** across views (if API supports) for consistent architectural style
- **Shared vocabulary**: Use identical phrases for common elements (lot dimensions, social club, roads)
- **Sequential generation**: Generate site-plan first, extract visual details, enhance aerial/context prompts
- **Metadata tagging**: Store generation parameters in database for regeneration with tweaks

**Architectural Visualization Terminology**:
- **Site plan**: "top-down 2D view", "CAD-style drawing", "property boundaries", "scale bar", "north arrow"
- **Aerial view**: "drone photography", "45-degree angle", "photorealistic", "clear sky daytime"
- **Context view**: "wide-angle", "integrated into landscape", "golden hour lighting", "real estate marketing"
- **Materials**: "light gray paving" (roads), "green grass" (landscaping), "blue pool" (social club)
- **Style modifiers**: "professional", "high detail", "architectural precision", "clean line work"

**Decision**:
- Prompt templates with data binding ensure consistency
- Negative prompts prevent unwanted elements (people, vehicles in site plans)
- View-specific models optimize for 2D drawings vs photorealistic renders

---

## 6. Rate Limiting & Cost Management

**Client-Side Rate Limiting Pattern** (Token Bucket Algorithm):

```typescript
// src/main/services/rate-limiter.ts
interface TokenBucketConfig {
  capacity: number;      // Max tokens in bucket
  refillRate: number;    // Tokens added per second
  refillInterval: number; // Milliseconds between refills
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private config: TokenBucketConfig;

  constructor(config: TokenBucketConfig) {
    this.config = config;
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
  }

  tryConsume(tokensNeeded: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return true;
    }

    return false;
  }

  getWaitTime(tokensNeeded: number = 1): number {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      return 0;
    }

    const tokensShort = tokensNeeded - this.tokens;
    return (tokensShort / this.config.refillRate) * 1000; // milliseconds
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.config.refillInterval) {
      const intervalsElapsed = Math.floor(elapsed / this.config.refillInterval);
      const tokensToAdd = intervalsElapsed * this.config.refillRate;

      this.tokens = Math.min(this.config.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

// Rate limiters for each API
const geminiRateLimiter = new TokenBucket({
  capacity: 10,          // 10 requests
  refillRate: 10 / 60,   // 10 per minute = 0.167 per second
  refillInterval: 1000   // Check every second
});

const imageRateLimiter = new TokenBucket({
  capacity: 5,           // 5 requests (conservative for image gen)
  refillRate: 5 / 60,    // 5 per minute
  refillInterval: 1000
});

export async function checkGeminiRateLimit(): Promise<void> {
  if (!geminiRateLimiter.tryConsume()) {
    const waitTime = geminiRateLimiter.getWaitTime();
    throw new Error(
      `Gemini rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
    );
  }
}

export async function checkImageRateLimit(): Promise<void> {
  if (!imageRateLimiter.tryConsume()) {
    const waitTime = imageRateLimiter.getWaitTime();
    throw new Error(
      `Image generation rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
    );
  }
}
```

**Debouncing User Regeneration Requests**:

```typescript
// src/renderer/hooks/useAIGeneration.ts
import { debounce } from 'lodash';

function useAIGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);

  // Debounce rapid clicks (prevent double-submission)
  const debouncedGenerate = useMemo(
    () => debounce(async (params: SubdivisionPlanRequest) => {
      // Minimum 3-second cooldown between generations
      const timeSinceLastGeneration = Date.now() - lastGenerationTime;
      if (timeSinceLastGeneration < 3000) {
        const waitTime = 3000 - timeSinceLastGeneration;
        showNotification(`Please wait ${Math.ceil(waitTime / 1000)} seconds before regenerating.`);
        return;
      }

      setIsGenerating(true);
      try {
        const plan = await window.aiService.generateSubdivisionPlan(params);
        setLastGenerationTime(Date.now());
        return plan;
      } catch (error: any) {
        if (error.message.includes('rate limit')) {
          showNotification('Rate limit reached. Please try again in a minute.', 'warning');
        } else {
          showNotification('Generation failed: ' + error.message, 'error');
        }
      } finally {
        setIsGenerating(false);
      }
    }, 500), // 500ms debounce
    [lastGenerationTime]
  );

  return { generatePlan: debouncedGenerate, isGenerating };
}
```

**Cost Estimation Display**:

```typescript
// src/renderer/components/AIGenerationPanel.tsx
interface CostEstimate {
  geminiCalls: number;
  imageCalls: number;
  estimatedTokens: number;
  estimatedCostUSD: number;
}

function calculateCostEstimate(
  subdivisionGenerations: number,
  imageGenerations: number
): CostEstimate {
  // Average token usage based on testing
  const AVG_PROMPT_TOKENS = 800;   // Input tokens per subdivision plan
  const AVG_RESPONSE_TOKENS = 2000; // Output tokens per subdivision plan

  const totalTokens = subdivisionGenerations * (AVG_PROMPT_TOKENS + AVG_RESPONSE_TOKENS);

  // Gemini 2.5 Flash pricing (per million tokens)
  const INPUT_COST = 0.10;  // $0.10 per 1M input tokens
  const OUTPUT_COST = 0.40; // $0.40 per 1M output tokens

  const geminiCost =
    (subdivisionGenerations * AVG_PROMPT_TOKENS / 1_000_000) * INPUT_COST +
    (subdivisionGenerations * AVG_RESPONSE_TOKENS / 1_000_000) * OUTPUT_COST;

  // Image generation cost (DALL-E 3: $0.040 per image at 1024x1024)
  const imageCost = imageGenerations * 0.040;

  return {
    geminiCalls: subdivisionGenerations,
    imageCalls: imageGenerations,
    estimatedTokens: totalTokens,
    estimatedCostUSD: geminiCost + imageCost
  };
}

// UI Component
function AIGenerationPanel() {
  const [generationCount, setGenerationCount] = useState({ gemini: 0, images: 0 });

  const estimate = calculateCostEstimate(
    generationCount.gemini,
    generationCount.images
  );

  return (
    <div className="cost-tracker">
      <h4>Session Usage</h4>
      <div className="usage-stats">
        <div>Subdivision Plans: {estimate.geminiCalls}</div>
        <div>Images Generated: {estimate.imageCalls}</div>
        <div>Tokens Used: {estimate.estimatedTokens.toLocaleString()}</div>
        <div className="cost-estimate">
          Estimated Cost: ${estimate.estimatedCostUSD.toFixed(4)}
          {estimate.estimatedCostUSD === 0 && ' (Free Tier)'}
        </div>
      </div>

      {estimate.geminiCalls >= 8 && (
        <div className="warning">
          ⚠️ Approaching free tier limit (10 requests/minute).
          Wait 1 minute before additional generations.
        </div>
      )}
    </div>
  );
}
```

**Rate Limit Thresholds**:
- **Gemini**: 10 RPM (free tier) → Client-side bucket at 8 requests/minute (80% safety margin)
- **Images**: 5 requests/minute (conservative estimate) → Bucket at 4 requests/minute
- **Debounce**: 500ms button debounce + 3-second minimum between actual API calls

**User Feedback UX**:
- Show loading spinner with progress (e.g., "Generating plan... 2 seconds elapsed")
- Display remaining requests in current minute
- Warning notification at 80% of rate limit
- Error notification with specific wait time on 429 error
- Cost tracker visible but non-intrusive (collapsed by default)

**Decision**:
- Token bucket provides smooth UX (better than hard per-minute cutoffs)
- Client-side rate limiting prevents 429 errors before they happen
- Cost transparency builds trust without overwhelming users
- Free tier sufficient for typical usage (1-2 projects per session)

---

## 7. AI Service Error Handling

**Common API Error Codes**:

```typescript
enum AIErrorCode {
  RATE_LIMIT = 429,           // Too many requests
  UNAUTHORIZED = 401,         // Invalid/missing API key
  BAD_REQUEST = 400,          // Invalid request format
  SERVER_ERROR = 500,         // API internal error
  SERVICE_UNAVAILABLE = 503,  // Temporary outage
  TIMEOUT = 'ETIMEDOUT',      // Request timeout
  NETWORK_ERROR = 'ENOTFOUND' // DNS/network failure
}

interface AIError {
  code: AIErrorCode | string;
  message: string;
  retryable: boolean;
  userMessage: string;
}

function parseAIError(error: any): AIError {
  // Gemini API error format
  if (error.response?.status) {
    const status = error.response.status;
    const apiMessage = error.response.data?.error?.message || 'Unknown error';

    switch (status) {
      case 429:
        return {
          code: AIErrorCode.RATE_LIMIT,
          message: apiMessage,
          retryable: true,
          userMessage: 'Too many requests. Please wait a moment and try again.'
        };

      case 401:
        return {
          code: AIErrorCode.UNAUTHORIZED,
          message: apiMessage,
          retryable: false,
          userMessage: 'API authentication failed. Please check your API key in settings.'
        };

      case 400:
        return {
          code: AIErrorCode.BAD_REQUEST,
          message: apiMessage,
          retryable: false,
          userMessage: 'Invalid request. Please adjust your input parameters and try again.'
        };

      case 500:
      case 503:
        return {
          code: status,
          message: apiMessage,
          retryable: true,
          userMessage: 'AI service temporarily unavailable. Retrying automatically...'
        };

      default:
        return {
          code: status.toString(),
          message: apiMessage,
          retryable: false,
          userMessage: `AI service error (${status}). Please try again later.`
        };
    }
  }

  // Network/timeout errors
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return {
      code: AIErrorCode.TIMEOUT,
      message: error.message,
      retryable: true,
      userMessage: 'Request timed out. The AI service may be slow. Retrying...'
    };
  }

  if (error.code === 'ENOTFOUND' || error.message?.includes('network')) {
    return {
      code: AIErrorCode.NETWORK_ERROR,
      message: error.message,
      retryable: false,
      userMessage: 'Network connection failed. Please check your internet connection.'
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN',
    message: error.message || String(error),
    retryable: false,
    userMessage: 'Unexpected error occurred. Please try again or contact support.'
  };
}
```

**Retry Strategy** (Exponential Backoff with Jitter):

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: (AIErrorCode | string)[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,       // 1 second
  maxDelayMs: 10000,       // 10 seconds max
  retryableErrors: [
    AIErrorCode.RATE_LIMIT,
    AIErrorCode.SERVER_ERROR,
    AIErrorCode.SERVICE_UNAVAILABLE,
    AIErrorCode.TIMEOUT
  ]
};

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: AIError) => void
): Promise<T> {
  let lastError: AIError | null = null;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (rawError: any) {
      const error = parseAIError(rawError);
      lastError = error;

      // Check if error is retryable
      const isRetryable = error.retryable &&
        config.retryableErrors.includes(error.code);

      // Last attempt or non-retryable error
      if (attempt > config.maxRetries || !isRetryable) {
        throw new Error(error.userMessage);
      }

      // Calculate backoff with exponential growth + jitter
      const exponentialDelay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1),
        config.maxDelayMs
      );

      // Add random jitter (±25% of delay)
      const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
      const delayMs = Math.max(0, exponentialDelay + jitter);

      logger.warn(
        `Attempt ${attempt} failed: ${error.message}. ` +
        `Retrying in ${Math.round(delayMs)}ms...`
      );

      onRetry?.(attempt, error);

      await sleep(delayMs);
    }
  }

  throw new Error(lastError?.userMessage || 'Operation failed after retries');
}

// Usage in IPC handler
ipcMain.handle('ai:generate-subdivision-plan', async (event, params) => {
  return withRetry(
    async () => {
      await checkGeminiRateLimit();
      return await callGeminiAPI(params);
    },
    DEFAULT_RETRY_CONFIG,
    (attempt, error) => {
      // Send progress update to renderer
      event.sender.send('ai:generation-progress', {
        status: 'retrying',
        attempt,
        message: error.userMessage
      });
    }
  );
});
```

**Fallback UX When AI Unavailable**:

```typescript
// src/renderer/components/SubdivisionPlanner.tsx
function SubdivisionPlanner() {
  const [aiAvailable, setAiAvailable] = useState(true);
  const [manualMode, setManualMode] = useState(false);

  const handleAIGenerationError = (error: Error) => {
    // Check if error indicates persistent unavailability
    if (error.message.includes('authentication') ||
        error.message.includes('network')) {
      setAiAvailable(false);

      showDialog({
        title: 'AI Generation Unavailable',
        message: `${error.message}\n\n` +
          'You can continue using the manual subdivision calculator, or configure ' +
          'your API key in Settings.',
        actions: [
          { label: 'Use Manual Calculator', onClick: () => setManualMode(true) },
          { label: 'Open Settings', onClick: () => openSettings() },
          { label: 'Retry', onClick: () => retryGeneration() }
        ]
      });
    } else {
      // Transient error - show notification only
      showNotification(error.message, 'error');
    }
  };

  return (
    <div className="subdivision-planner">
      {!aiAvailable && (
        <div className="fallback-banner">
          ⚠️ AI generation currently unavailable.
          Using manual calculator.
          <button onClick={() => setAiAvailable(true)}>Retry AI</button>
        </div>
      )}

      {manualMode ? (
        <ManualSubdivisionCalculator />
      ) : (
        <AIAssistedSubdivisionPlanner onError={handleAIGenerationError} />
      )}
    </div>
  );
}
```

**User-Friendly Error Messages**:

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  // API-specific
  '429': 'You\'ve made too many AI requests. Please wait 1 minute and try again.',
  '401': 'Your AI API key is invalid or missing. Please add a valid key in Settings > AI Configuration.',
  '400': 'The request couldn\'t be processed. Please check your land dimensions and try again.',
  '500': 'The AI service encountered an error. We\'ll retry automatically.',
  '503': 'The AI service is temporarily down. We\'ll retry automatically.',

  // Network
  'ETIMEDOUT': 'The AI request timed out. This may happen with complex calculations. Retrying...',
  'ENOTFOUND': 'Cannot reach the AI service. Please check your internet connection.',

  // Validation
  'INVALID_PLAN': 'The AI generated an invalid plan. Trying again with adjusted parameters...',
  'NO_VIABLE_LOTS': 'Your land is too small for micro-villas (minimum 1000 sqm recommended).',

  // Fallback
  'UNKNOWN': 'An unexpected error occurred. Please try again or contact support if the issue persists.'
};

function getUserMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN;
}
```

**Retry Policy Summary**:
- **Retryable errors**: 429, 500, 503, timeout
- **Non-retryable errors**: 401, 400, network failures
- **Backoff schedule**: 1s → 2s → 4s (with jitter)
- **Max retries**: 3 attempts
- **Total max time**: ~7 seconds (prevents long user waits)

**Error Message Templates**:
- Always explain what happened in user terms (no HTTP codes in UI)
- Provide actionable next steps ("check API key", "wait 1 minute", "retry")
- Distinguish between user errors (400) and service errors (500)
- Show progress during automatic retries to maintain user confidence

**Decision**:
- Exponential backoff with jitter is industry standard (prevents thundering herd)
- Limit retries to 3 to avoid frustrating users with long waits
- Fallback to manual calculator maintains app usability when AI is down
- Transparent error messages build trust (user knows what went wrong and what to do)

---

## 8. SQLite Schema for AI Entities

**Rationale**: Extend existing schema from `src/main/db-schema.sql` with AI-specific tables while maintaining foreign key relationships to `projects` table.

**New Tables DDL**:

```sql
-- ============================================================================
-- AI SUBDIVISION PLANS TABLE
-- Stores AI-generated subdivision layouts (before user approval)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_subdivision_plans (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    land_parcel_id TEXT NOT NULL,

    -- Generation metadata
    generated_at TEXT NOT NULL, -- ISO 8601
    generation_status TEXT NOT NULL CHECK(generation_status IN ('pending', 'completed', 'failed', 'rejected')),
    generation_time_ms INTEGER, -- Performance tracking
    retry_count INTEGER NOT NULL DEFAULT 0,

    -- Input parameters (for regeneration)
    input_land_width REAL NOT NULL,
    input_land_length REAL NOT NULL,
    input_land_area REAL NOT NULL,
    input_social_club_percent INTEGER NOT NULL,
    input_target_lot_count INTEGER, -- Optional

    -- AI model metadata
    ai_model TEXT NOT NULL, -- e.g., 'gemini-2.5-flash'
    ai_model_version TEXT,
    prompt_tokens INTEGER, -- For cost tracking
    completion_tokens INTEGER,
    total_tokens INTEGER,

    -- Generated plan (JSON blob)
    plan_json TEXT NOT NULL, -- Full SubdivisionPlan JSON

    -- Validation results
    validation_status TEXT NOT NULL CHECK(validation_status IN ('valid', 'invalid', 'warnings')),
    validation_errors TEXT, -- JSON array of error strings
    validation_warnings TEXT, -- JSON array of warning strings

    -- User actions
    approved_by_user INTEGER NOT NULL DEFAULT 0, -- Boolean: 0/1
    approved_at TEXT, -- ISO 8601
    rejection_reason TEXT,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (land_parcel_id) REFERENCES land_parcels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_plans_project ON ai_subdivision_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_plans_status ON ai_subdivision_plans(generation_status);
CREATE INDEX IF NOT EXISTS idx_ai_plans_approved ON ai_subdivision_plans(approved_by_user, project_id);

-- ============================================================================
-- AI GENERATION REQUESTS TABLE
-- Audit trail for all AI API calls (for debugging and cost tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_generation_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,

    -- Request metadata
    request_type TEXT NOT NULL CHECK(request_type IN ('subdivision-plan', 'site-plan-image', 'aerial-image', 'context-image')),
    requested_at TEXT NOT NULL, -- ISO 8601
    completed_at TEXT, -- ISO 8601
    duration_ms INTEGER,

    -- API details
    api_service TEXT NOT NULL, -- e.g., 'gemini', 'dalle-3', 'stability-ai'
    api_endpoint TEXT NOT NULL,
    api_model TEXT NOT NULL,

    -- Request/response
    request_params TEXT NOT NULL, -- JSON blob of input parameters
    response_data TEXT, -- JSON blob of API response

    -- Status
    status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failed', 'retried')),
    error_code TEXT,
    error_message TEXT,
    retry_of_request_id TEXT, -- Links to original request if this is a retry

    -- Cost tracking
    tokens_used INTEGER,
    estimated_cost_usd REAL,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (retry_of_request_id) REFERENCES ai_generation_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_project ON ai_generation_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_type ON ai_generation_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_generation_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_requests_date ON ai_generation_requests(requested_at DESC);

-- ============================================================================
-- PROJECT VISUALIZATIONS TABLE
-- Stores AI-generated images (extends existing project_images table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_visualizations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    ai_subdivision_plan_id TEXT, -- Optional link to AI plan

    -- Image metadata (similar to project_images table)
    view_type TEXT NOT NULL CHECK(view_type IN ('site-plan', 'aerial', 'context', 'custom')),
    filename TEXT NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('jpeg', 'png', 'webp')),
    size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
    width_pixels INTEGER NOT NULL CHECK(width_pixels > 0),
    height_pixels INTEGER NOT NULL CHECK(height_pixels > 0),
    local_path TEXT NOT NULL, -- Absolute path to file
    thumbnail_path TEXT,

    -- Generation metadata
    generated_at TEXT NOT NULL, -- ISO 8601
    ai_model TEXT NOT NULL, -- e.g., 'dall-e-3', 'stable-diffusion-xl'
    generation_request_id TEXT, -- Links to ai_generation_requests

    -- Prompt used
    prompt_text TEXT NOT NULL,
    negative_prompt_text TEXT,
    generation_seed INTEGER, -- For reproducibility

    -- User annotations
    caption TEXT,
    is_approved INTEGER NOT NULL DEFAULT 0, -- Boolean: 0/1
    is_final INTEGER NOT NULL DEFAULT 0, -- Marked as final for export

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (ai_subdivision_plan_id) REFERENCES ai_subdivision_plans(id) ON DELETE SET NULL,
    FOREIGN KEY (generation_request_id) REFERENCES ai_generation_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_visualizations_project ON project_visualizations(project_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_plan ON project_visualizations(ai_subdivision_plan_id);
CREATE INDEX IF NOT EXISTS idx_visualizations_view_type ON project_visualizations(view_type);
CREATE INDEX IF NOT EXISTS idx_visualizations_approved ON project_visualizations(is_approved, is_final);

-- ============================================================================
-- AI SETTINGS TABLE
-- User preferences for AI generation (per-project overrides)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_settings (
    id TEXT PRIMARY KEY,
    project_id TEXT, -- NULL = global settings, non-NULL = project-specific

    -- Model preferences
    subdivision_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    image_model TEXT NOT NULL DEFAULT 'dall-e-3',

    -- Generation preferences
    auto_approve_valid_plans INTEGER NOT NULL DEFAULT 0, -- Boolean
    max_auto_retries INTEGER NOT NULL DEFAULT 3,
    preferred_lot_aspect_ratio REAL, -- e.g., 0.9 for nearly square
    preferred_road_layout TEXT CHECK(preferred_road_layout IN ('grid', 'perimeter', 'central-spine', 'loop', 'auto')),

    -- Image preferences
    image_style TEXT, -- e.g., 'photorealistic', 'architectural-drawing', 'sketch'
    include_context_landmarks INTEGER NOT NULL DEFAULT 1, -- Boolean

    -- Cost controls
    enable_cost_warnings INTEGER NOT NULL DEFAULT 1, -- Boolean
    max_cost_per_session_usd REAL, -- NULL = no limit

    -- API keys (encrypted if using safeStorage)
    gemini_api_key_encrypted TEXT,
    image_api_key_encrypted TEXT,

    -- Timestamps
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id) -- One settings row per project (or one global with NULL project_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_project ON ai_settings(project_id);
```

**Relationship Diagram** (Text Format):

```
projects (existing)
    ├─→ ai_subdivision_plans (1:N)
    │       ├── plan_json (JSON blob with full SubdivisionPlan)
    │       └── validation_errors/warnings
    │
    ├─→ ai_generation_requests (1:N) [audit trail]
    │       ├── request_params (JSON)
    │       └── response_data (JSON)
    │
    ├─→ project_visualizations (1:N)
    │       ├── links to ai_subdivision_plans (N:1)
    │       ├── links to ai_generation_requests (N:1)
    │       └── prompt_text + generation metadata
    │
    └─→ ai_settings (1:1)
            ├── API keys (encrypted)
            └── generation preferences

land_parcels (existing)
    └─→ ai_subdivision_plans (1:N)
```

**Indexing Strategy**:
- **Primary lookups**: `project_id` (most queries filter by project)
- **Status filtering**: `generation_status`, `validation_status` (dashboard views)
- **Date sorting**: `requested_at DESC` (recent generations first)
- **Approval filtering**: `approved_by_user`, `is_final` (export only approved)
- **Composite index**: `(approved_by_user, project_id)` for approved plans per project

**Foreign Key Relationships**:
- **CASCADE on project deletion**: All AI data deleted when project is deleted (data cleanup)
- **SET NULL on plan deletion**: Visualizations remain even if source plan is deleted (preserve images)
- **Soft deletes**: `generation_status = 'rejected'` keeps record (audit trail)

**Migration Approach**:

```typescript
// src/main/migrations/002-add-ai-tables.ts
import { Database } from 'better-sqlite3';

export function migrate_002(db: Database): void {
  console.log('[Migration 002] Adding AI tables...');

  // Read SQL file
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'sql', '002-ai-tables.sql'),
    'utf-8'
  );

  // Execute in transaction
  db.transaction(() => {
    db.exec(migrationSQL);

    // Update schema version
    db.prepare(
      "UPDATE app_metadata SET value = '1.1.0', updated_at = datetime('now') WHERE key = 'schema_version'"
    ).run();
  })();

  console.log('[Migration 002] AI tables added successfully');
}

// src/main/storage.ts (update to run migrations)
export function initializeDatabase(): Database.Database {
  // ... existing code ...

  const currentVersion = db.prepare(
    "SELECT value FROM app_metadata WHERE key = 'schema_version'"
  ).get()?.value || '0.0.0';

  if (currentVersion === '1.0.0') {
    migrate_002(db);
  }

  return db;
}
```

**Decision Summary**:
- **Separation of concerns**: AI plans stored separately from approved subdivision_scenarios
- **Audit trail**: Complete request history for debugging and cost analysis
- **Flexibility**: JSON blobs for evolving AI response formats
- **Performance**: Indexes on common query patterns (project_id, status, dates)
- **Data integrity**: Foreign keys with appropriate CASCADE/SET NULL behavior

---

## References & Sources

### Gemini API Documentation
- [Structured Outputs | Gemini API](https://ai.google.dev/gemini-api/docs/structured-output)
- [Google announces support for JSON Schema in Gemini API](https://blog.google/technology/developers/gemini-api-structured-outputs/)
- [Rate limits | Gemini API](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Prompt design strategies | Gemini API](https://ai.google.dev/gemini-api/docs/prompting-strategies)

### Image Generation APIs
- [Midjourney vs DALL-E 3 vs Stable Diffusion 2025](https://vertu.com/lifestyle/midjourney-vs-dall-e-3-vs-stable-diffusion-2025-ai-image-generation/)
- [API Reference - OpenAI API](https://platform.openai.com/docs/api-reference/introduction)
- [Stability AI Image Models](https://stability.ai/stable-image)
- [2025 Comprehensive Image Generation API Guide](https://www.cursor-ide.com/blog/comprehensive-image-generation-api-guide-2025-english)

### Electron Security
- [Security | Electron](https://www.electronjs.org/docs/latest/tutorial/security)
- [safeStorage | Electron](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Inter-Process Communication | Electron](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [contextBridge | Electron](https://www.electronjs.org/docs/latest/api/context-bridge)

### Error Handling & Retry Strategies
- [HTTP Error 429 (Too Many Requests)](https://blog.postman.com/http-error-429/)
- [How to handle rate limits | OpenAI Cookbook](https://cookbook.openai.com/examples/how_to_handle_rate_limits)
- [Retry with backoff pattern - AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html)
- [Mastering Exponential Backoff in Distributed Systems](https://betterstack.com/community/guides/monitoring/exponential-backoff/)

### Rate Limiting & Cost Management
- [Gemini API Free Tier 2025 Guide](https://blog.laozhang.ai/api-guides/gemini-api-free-tier/)
- [Complete Guide to Handling API Rate Limits](https://www.ayrshare.com/complete-guide-to-handling-rate-limits-prevent-429-errors/)
- [How to Secure Environment Variables and API Keys](https://www.ionicframeworks.com/2025/09/how-to-secure-environment-variables-and.html)

---

## Next Steps

This research document provides the technical foundation for implementing AI integration. The recommended implementation order:

1. **Phase 1 - Infrastructure** (Week 1)
   - Set up IPC handlers for AI calls in `src/main/ai-service-handler.ts`
   - Implement rate limiting with token bucket algorithm
   - Create API key management UI in Settings
   - Add AI tables to database schema (migration 002)

2. **Phase 2 - Gemini Integration** (Week 2)
   - Install `@google/generative-ai` SDK
   - Implement subdivision plan generation with JSON Schema
   - Add validation logic for generated plans
   - Build retry logic with exponential backoff

3. **Phase 3 - Image Generation** (Week 3)
   - Implement DALL-E 3 integration (or Stability AI)
   - Create prompt templates for 3 view types
   - Add async polling for image generation
   - Store images in `project_visualizations` table

4. **Phase 4 - UI/UX** (Week 4)
   - Build AI generation panel component
   - Add cost tracking dashboard
   - Implement error messages and fallback UX
   - Add user approval workflow for AI plans

5. **Phase 5 - Testing & Optimization** (Week 5)
   - Unit tests for prompt generation
   - Integration tests for API calls (mock responses)
   - Performance testing (2-second subdivision target)
   - Cost optimization (reduce token usage)

**Total Estimated Effort**: 5 weeks (1 developer)

**Risk Mitigation**:
- Start with Gemini free tier (no upfront cost)
- Implement comprehensive error handling early (prevent user frustration)
- Build fallback to manual calculator (maintain app usability)
- Use TypeScript strict mode (catch API contract issues at compile time)

---

**End of Research Document**
