# Developer Quickstart: AI Subdivision Planning

**Feature**: 001-ai-subdivision-planning
**Last Updated**: 2026-01-11

This guide will get you up and running with AI subdivision planning development in under 30 minutes.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [API Key Setup](#api-key-setup)
3. [Development Mode](#development-mode)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)
6. [Cost Management](#cost-management)

---

## Prerequisites

### Required Software

- **Node.js**: v22.20.0 or later (matches Electron 39.0.0 requirement)
- **npm**: v10.0.0 or later
- **Git**: For version control
- **SQLite**: DB Browser for SQLite recommended for database inspection

### Check Your Environment

```bash
node --version  # Should be v22.20.0+
npm --version   # Should be v10.0.0+
```

### API Key Requirements

You'll need API keys from two services:

1. **Google Gemini API** (for text-based subdivision planning)
   - Free tier: 10 requests/minute, 250 requests/day
   - Get your key: [Google AI Studio](https://aistudio.google.com/app/apikey)

2. **Image Generation API** (for project visualizations)
   - **Option A - DALL-E 3** (recommended for initial development)
     - Pricing: $0.040 per image (1024x1024)
     - Get your key: [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Option B - Stability AI** (alternative)
     - Free tier: 25 credits on signup
     - Get your key: [Stability AI Platform](https://platform.stability.ai/)

---

## API Key Setup

### Development Environment (.env file)

**Step 1**: Create `.env` file in project root (already in `.gitignore`)

```bash
# Navigate to project root
cd D:\fast2ai\AI-Floorplan

# Create .env file
touch .env  # On Windows: type nul > .env
```

**Step 2**: Add your API keys to `.env`

```env
# Google Gemini API (required)
GEMINI_API_KEY=your_gemini_api_key_here

# Image Generation API (choose one)
# Option A: OpenAI DALL-E 3
OPENAI_API_KEY=your_openai_api_key_here

# Option B: Stability AI
STABILITY_API_KEY=your_stability_api_key_here

# Development settings (optional)
AI_MOCK_MODE=false              # Set to 'true' to use mock responses
AI_LOG_PROMPTS=true             # Log all prompts for debugging
AI_RATE_LIMIT_OVERRIDE=false    # Disable rate limiting for testing
```

**Step 3**: Verify `.env` is loaded

```typescript
// In src/main/index.ts, confirm dotenv is configured:
import 'dotenv/config';

console.log('Gemini API Key loaded:', process.env.GEMINI_API_KEY ? '✓' : '✗');
console.log('Image API Key loaded:', process.env.OPENAI_API_KEY ? '✓' : '✗');
```

### Production Environment (electron-store)

For production builds, API keys are stored encrypted using Electron's `safeStorage` API.

**Implementation** (already in research.md):

```typescript
// src/main/config.ts
import Store from 'electron-store';
import { safeStorage } from 'electron';

interface ConfigSchema {
  geminiApiKey?: string; // Encrypted
  imageApiKey?: string;  // Encrypted
}

const configStore = new Store<ConfigSchema>({
  name: 'secure-config'
});

export function setGeminiApiKey(key: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key);
    configStore.set('geminiApiKey', encrypted.toString('base64'));
  } else {
    configStore.set('geminiApiKey', key); // Fallback
  }
}

export function getGeminiApiKey(): string {
  const encrypted = configStore.get('geminiApiKey');
  if (!encrypted) {
    return process.env.GEMINI_API_KEY || '';
  }

  if (safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }

  return encrypted;
}
```

**User Interface** (to be implemented):

- Settings page with "AI Configuration" section
- Input fields for API keys (masked with `type="password"`)
- "Test Connection" button to validate keys
- Keys are never exposed to renderer process

---

## Development Mode

### Running with Mock AI Responses (No API Keys Required)

For offline development or to avoid burning API credits, use mock mode:

**Step 1**: Enable mock mode in `.env`

```env
AI_MOCK_MODE=true
```

**Step 2**: Create mock response handlers

```typescript
// src/main/ai-service-handler.ts
import { ipcMain } from 'electron';

const MOCK_MODE = process.env.AI_MOCK_MODE === 'true';

ipcMain.handle('ai:generate-subdivision-plan', async (event, params) => {
  if (MOCK_MODE) {
    console.log('[MOCK] Generating subdivision plan:', params);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock plan (always valid)
    return {
      planId: crypto.randomUUID(),
      status: 'completed',
      plan: generateMockPlan(params),
      validationStatus: 'valid',
      validationErrors: [],
      validationWarnings: [],
      tokensUsed: 2500,
      generationTimeMs: 1847
    };
  }

  // Real API call...
});

function generateMockPlan(params: any) {
  const lotsPerRow = Math.floor(params.landWidth / 9); // 9m wide lots
  const lotsPerCol = Math.floor(params.landLength / 10); // 10m long lots
  const totalLots = lotsPerRow * lotsPerCol;

  const lots = [];
  for (let i = 0; i < totalLots; i++) {
    const row = Math.floor(i / lotsPerRow);
    const col = i % lotsPerRow;

    lots.push({
      lotNumber: i + 1,
      dimensions: {
        widthMeters: 9.0,
        lengthMeters: 10.0,
        areaSqm: 90.0
      },
      position: {
        x: col * 9,
        y: row * 10
      }
    });
  }

  return {
    lotLayout: lots,
    roadConfiguration: {
      widthMeters: 6.0,
      totalAreaSqm: params.landArea * 0.15, // 15% roads
      layout: 'grid'
    },
    amenityAreas: [
      {
        type: 'social-club',
        areaSqm: params.landArea * (params.socialClubPercent / 100),
        position: { x: params.landWidth / 2, y: params.landLength / 2 }
      }
    ],
    metrics: {
      totalLots: lots.length,
      viableLots: lots.length,
      invalidLots: [],
      averageLotSizeSqm: 90.0,
      landUtilizationPercent: 85.0
    }
  };
}
```

**Step 3**: Mock image generation (return placeholder image)

```typescript
ipcMain.handle('ai:generate-site-plan-image', async (event, params) => {
  if (MOCK_MODE) {
    console.log('[MOCK] Generating image:', params.viewType);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Copy placeholder image to project directory
    const placeholderPath = path.join(__dirname, '../assets/placeholder-site-plan.png');
    const projectImagePath = path.join(
      getProjectImagesDir(params.projectId),
      `${params.viewType}-${Date.now()}.png`
    );

    fs.copyFileSync(placeholderPath, projectImagePath);

    return {
      visualizationId: crypto.randomUUID(),
      status: 'completed',
      localPath: projectImagePath,
      filename: path.basename(projectImagePath),
      format: 'png',
      widthPixels: 1024,
      heightPixels: 1024,
      generationTimeMs: 2934
    };
  }

  // Real API call...
});
```

### Logging and Debugging

**Enable detailed AI logging**:

```typescript
// src/main/logger.ts
export const aiLogger = {
  logPrompt(prompt: string, params: any) {
    if (process.env.AI_LOG_PROMPTS === 'true') {
      console.log('\n=== AI PROMPT ===');
      console.log('Parameters:', JSON.stringify(params, null, 2));
      console.log('Prompt:', prompt);
      console.log('=================\n');
    }
  },

  logResponse(response: any, tokensUsed?: number) {
    if (process.env.AI_LOG_PROMPTS === 'true') {
      console.log('\n=== AI RESPONSE ===');
      console.log('Tokens used:', tokensUsed);
      console.log('Response:', JSON.stringify(response, null, 2));
      console.log('===================\n');
    }
  }
};
```

**View logs in development**:

```bash
# Electron main process logs appear in terminal
npm run start

# Renderer process logs appear in DevTools console (Ctrl+Shift+I)
```

---

## Testing

### Unit Tests (AI Services)

**Test file structure**:

```
tests/
├── unit/
│   ├── ai-service-handler.test.ts
│   ├── subdivision-plan-validator.test.ts
│   ├── prompt-builder.test.ts
│   └── image-prompt-generator.test.ts
```

**Example unit test** (with mocked API):

```typescript
// tests/unit/subdivision-plan-validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateGeneratedPlan } from '../../src/main/services/subdivision-plan-validator';

describe('Subdivision Plan Validator', () => {
  it('should validate plan with all lots >= 90 sqm', () => {
    const plan = {
      lotLayout: [
        {
          lotNumber: 1,
          dimensions: { widthMeters: 9, lengthMeters: 10, areaSqm: 90 },
          position: { x: 0, y: 0 }
        },
        {
          lotNumber: 2,
          dimensions: { widthMeters: 10, lengthMeters: 10, areaSqm: 100 },
          position: { x: 9, y: 0 }
        }
      ],
      roadConfiguration: {
        widthMeters: 6,
        totalAreaSqm: 200,
        layout: 'grid'
      },
      amenityAreas: [
        { type: 'social-club', areaSqm: 300, position: { x: 20, y: 20 } }
      ],
      metrics: {
        totalLots: 2,
        viableLots: 2,
        invalidLots: [],
        averageLotSizeSqm: 95,
        landUtilizationPercent: 80
      }
    };

    const input = {
      landWidth: 50,
      landLength: 40,
      landArea: 2000,
      socialClubPercent: 15
    };

    const result = validateGeneratedPlan(plan, input);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject plan with lots below 90 sqm', () => {
    const plan = {
      lotLayout: [
        {
          lotNumber: 1,
          dimensions: { widthMeters: 8, lengthMeters: 10, areaSqm: 80 },
          position: { x: 0, y: 0 }
        }
      ],
      roadConfiguration: { widthMeters: 6, totalAreaSqm: 200, layout: 'grid' },
      amenityAreas: [{ type: 'social-club', areaSqm: 300, position: { x: 20, y: 20 } }],
      metrics: {
        totalLots: 1,
        viableLots: 0,
        invalidLots: [1],
        averageLotSizeSqm: 80,
        landUtilizationPercent: 70
      }
    };

    const result = validateGeneratedPlan(plan, { landWidth: 50, landLength: 40, landArea: 2000, socialClubPercent: 15 });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('1 lots below 90 sqm minimum: 1');
  });
});
```

**Run tests**:

```bash
npm run test:unit              # Run all unit tests
npm run test:unit -- --watch   # Watch mode for TDD
npm run test:unit -- --coverage # Generate coverage report
```

### Integration Tests (Real API Calls)

**Important**: Integration tests use real API keys and consume credits. Run sparingly.

```typescript
// tests/integration/gemini-api.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';

describe('Gemini API Integration', () => {
  let genAI: GoogleGenerativeAI;

  beforeAll(() => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set. Skip integration tests or set API key.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  });

  it('should generate valid subdivision plan JSON', async () => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: subdivisionPlanSchema, // Defined in research.md
        temperature: 0.2
      }
    });

    const prompt = buildSubdivisionPrompt({
      landWidth: 100,
      landLength: 80,
      landArea: 8000,
      socialClubPercent: 20,
      province: 'Santo Domingo'
    });

    const result = await model.generateContent(prompt);
    const json = JSON.parse(result.response.text());

    expect(json.lotLayout).toBeDefined();
    expect(json.roadConfiguration).toBeDefined();
    expect(json.amenityAreas).toBeDefined();
    expect(json.metrics).toBeDefined();

    // Validate all lots >= 90 sqm
    json.lotLayout.forEach((lot: any) => {
      expect(lot.dimensions.areaSqm).toBeGreaterThanOrEqual(90);
    });
  }, 30000); // 30 second timeout for API call
});
```

**Run integration tests** (only when needed):

```bash
# Set environment variable to enable integration tests
export RUN_INTEGRATION_TESTS=true

# Run integration tests
npm run test:integration

# Or run specific test file
npx vitest run tests/integration/gemini-api.test.ts
```

### Testing Prompt/Response Cycle

**Debug prompt effectiveness**:

```typescript
// tools/test-prompts.ts
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSubdivisionPrompt } from '../src/main/services/prompt-builder';

async function testPrompt() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const testCases = [
    { name: 'Small lot (1500 sqm)', landWidth: 50, landLength: 30, landArea: 1500, socialClubPercent: 20 },
    { name: 'Medium lot (5000 sqm)', landWidth: 100, landLength: 50, landArea: 5000, socialClubPercent: 15 },
    { name: 'Large lot (10000 sqm)', landWidth: 125, landLength: 80, landArea: 10000, socialClubPercent: 25 }
  ];

  for (const testCase of testCases) {
    console.log(`\n\n=== Testing: ${testCase.name} ===`);

    const prompt = buildSubdivisionPrompt(testCase);
    console.log('Prompt:', prompt.slice(0, 200) + '...');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: subdivisionPlanSchema,
        temperature: 0.2
      }
    });

    const result = await model.generateContent(prompt);
    const plan = JSON.parse(result.response.text());

    console.log('\nResults:');
    console.log('- Total lots:', plan.metrics.totalLots);
    console.log('- Viable lots:', plan.metrics.viableLots);
    console.log('- Invalid lots:', plan.metrics.invalidLots);
    console.log('- Avg lot size:', plan.metrics.averageLotSizeSqm.toFixed(2), 'sqm');
    console.log('- Land utilization:', plan.metrics.landUtilizationPercent.toFixed(1), '%');
    console.log('- Tokens used:', result.response.usageMetadata?.totalTokenCount);
  }
}

testPrompt();
```

**Run prompt tester**:

```bash
npx tsx tools/test-prompts.ts
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: API Key Not Valid

**Error**: `API key not valid. Please pass a valid API key.`

**Solutions**:

1. Verify key in `.env` file has no extra spaces or quotes:
   ```env
   # Wrong
   GEMINI_API_KEY="AIza..."  # Remove quotes
   GEMINI_API_KEY= AIza...   # Remove leading space

   # Correct
   GEMINI_API_KEY=AIza...
   ```

2. Check key permissions in [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Ensure key is not restricted to specific APIs
   - Verify key hasn't been revoked

3. Test key manually with curl:
   ```bash
   curl -H "x-goog-api-key: YOUR_API_KEY" \
     "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent" \
     -H 'Content-Type: application/json' \
     -d '{"contents": [{"parts": [{"text": "Test"}]}]}'
   ```

#### Issue 2: Rate Limit Exceeded (429 Error)

**Error**: `Resource has been exhausted (e.g. check quota).`

**Solutions**:

1. Check free tier limits:
   - Gemini: 10 requests/minute, 250/day
   - DALL-E 3: Depends on your OpenAI tier

2. Enable rate limit override in development:
   ```env
   AI_RATE_LIMIT_OVERRIDE=true
   ```

3. Implement exponential backoff (already in research.md):
   ```typescript
   // Automatic retry with backoff is built-in
   // Wait time shown in error message
   ```

4. Switch to mock mode temporarily:
   ```env
   AI_MOCK_MODE=true
   ```

#### Issue 3: Invalid JSON Response

**Error**: `Unexpected token < in JSON at position 0`

**Cause**: Gemini returned HTML error page instead of JSON

**Solutions**:

1. Check `responseMimeType` is set correctly:
   ```typescript
   generationConfig: {
     responseMimeType: 'application/json',  // Required
     responseSchema: subdivisionPlanSchema
   }
   ```

2. Verify model supports JSON mode:
   - `gemini-2.5-flash`: ✓ Supports JSON mode
   - `gemini-1.5-pro`: ✓ Supports JSON mode
   - Older models: ✗ May not support

3. Check for Gemini API outages: [Status Page](https://status.cloud.google.com/)

#### Issue 4: Network Connectivity

**Error**: `ENOTFOUND` or `ETIMEDOUT`

**Solutions**:

1. Check internet connection

2. Verify firewall/proxy settings allow HTTPS to:
   - `generativelanguage.googleapis.com` (Gemini)
   - `api.openai.com` (DALL-E)
   - `api.stability.ai` (Stability AI)

3. Test DNS resolution:
   ```bash
   nslookup generativelanguage.googleapis.com
   ```

4. Use proxy if required:
   ```typescript
   // In src/main/ai-service-handler.ts
   import { HttpsProxyAgent } from 'https-proxy-agent';

   const proxyAgent = new HttpsProxyAgent(process.env.HTTPS_PROXY || '');
   // Pass to fetch or SDK
   ```

#### Issue 5: Lots Below 90 sqm Minimum

**Error**: Validation fails with "X lots below 90 sqm minimum"

**Solutions**:

1. Adjust prompt to emphasize minimum:
   ```typescript
   const enhancedPrompt = basePrompt + `

   CRITICAL ENFORCEMENT: EVERY lot MUST be at least 90 sqm. If a lot would be below 90 sqm, merge it with adjacent lots or exclude it from the plan. Mark any excluded areas as "green-space" amenities.`;
   ```

2. Increase land area input (ensure input is accurate):
   - Minimum recommended: 1000 sqm for 10 lots
   - Check `inputLandArea` matches `inputLandWidth * inputLandLength`

3. Reduce social club percentage to allow more space for lots:
   - Try 10-15% instead of 25-30%

4. Implement post-processing to merge small lots:
   ```typescript
   function mergeSmallerLots(plan: SubdivisionPlan): SubdivisionPlan {
     // Merge lots below 90 sqm with adjacent lots
     // Implementation details in validation service
   }
   ```

---

## Cost Management

### Estimating Costs

**Gemini 2.5 Flash** (Free Tier):
- 10 requests/minute (RPM)
- 250,000 tokens/minute (TPM)
- 250 requests/day (RPD)

**Typical usage**:
- Subdivision plan generation: ~2,500 tokens (~$0.0007 USD in paid tier)
- 10 free plans per minute
- 250 free plans per day

**DALL-E 3**:
- 1024x1024: $0.040 per image
- 1792x1024: $0.080 per image
- No free tier (charges immediately)

**Session cost calculation**:

```typescript
// Example: Generate 5 subdivision plans + 3 images
const subdivisionCalls = 5;  // × ~2500 tokens each
const imageCalls = 3;        // × $0.040 each

const geminiTokens = subdivisionCalls * 2500; // 12,500 tokens
const geminiCost = (geminiTokens / 1_000_000) * 0.50; // ~$0.006

const imageCost = imageCalls * 0.040; // $0.12

const totalCost = geminiCost + imageCost; // ~$0.126
```

### Setting Cost Limits

**In development** (to avoid unexpected charges):

```typescript
// src/main/ai-service-handler.ts
const MAX_DAILY_COST_USD = 5.00; // $5 daily limit

ipcMain.handle('ai:generate-subdivision-plan', async (event, params) => {
  const todayCost = await getTodaysCost(params.projectId);

  if (todayCost >= MAX_DAILY_COST_USD) {
    throw new Error(
      `Daily cost limit reached ($${MAX_DAILY_COST_USD}). ` +
      `Current cost: $${todayCost.toFixed(2)}. ` +
      `Wait until tomorrow or increase limit in settings.`
    );
  }

  // Proceed with generation...
});
```

**User-configurable limits**:

```typescript
// AI Settings UI
<input
  type="number"
  value={settings.maxCostPerSessionUsd}
  onChange={(e) => updateSettings({
    maxCostPerSessionUsd: parseFloat(e.target.value)
  })}
/>
```

### Free Tier Optimization

**Tips to maximize free tier usage**:

1. **Use mock mode during UI development**:
   - Only use real API for testing actual prompts

2. **Batch testing**:
   - Test prompts in `tools/test-prompts.ts` instead of UI
   - Cheaper to iterate on prompts outside the app

3. **Cache common plans**:
   - Save successful plans to reuse for UI testing
   - Don't regenerate same plan multiple times

4. **Reduce retry attempts in development**:
   ```typescript
   const maxRetries = process.env.NODE_ENV === 'production' ? 3 : 1;
   ```

---

## Next Steps

Once you've completed this quickstart:

1. **Implement Phase 1** (Infrastructure):
   - Set up IPC handlers in `src/main/ipc-handlers.ts`
   - Create rate limiter in `src/main/services/rate-limiter.ts`
   - Add database migration for AI tables

2. **Implement Phase 2** (Gemini Integration):
   - Install SDK: `npm install @google/generative-ai`
   - Create prompt builder service
   - Implement validation logic

3. **Implement Phase 3** (Image Generation):
   - Choose provider (DALL-E 3 or Stability AI)
   - Install SDK: `npm install openai` or equivalent
   - Create image prompt templates

4. **Implement Phase 4** (UI/UX):
   - Build AI generation panel component
   - Add approval/rejection workflow UI
   - Create cost tracking dashboard

5. **Review Documentation**:
   - Read `research.md` for technical decisions
   - Study `data-model.md` for entity relationships
   - Check contracts for API specifications

---

## Additional Resources

### Official Documentation

- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Gemini Structured Output Guide](https://ai.google.dev/gemini-api/docs/structured-output)
- [OpenAI DALL-E 3 API](https://platform.openai.com/docs/guides/images)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Zod Validation](https://zod.dev/)

### Code Examples

- Prompt engineering: See `research.md` Section 4
- Error handling: See `research.md` Section 7
- Rate limiting: See `research.md` Section 6

### Support

- **Bugs**: File issue in GitHub repository
- **Questions**: Check CLAUDE.md for project conventions
- **API Issues**: Consult provider status pages

---

**Happy coding!** You're now ready to implement AI-assisted subdivision planning. Start with mock mode, iterate on prompts, then integrate real APIs when ready.
