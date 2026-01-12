/**
 * Gemini Client - Text-based Subdivision Plan Generation
 *
 * Integrates with Google Gemini API for AI-powered subdivision planning.
 * Uses JSON Schema mode for structured output.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { SubdivisionPlan } from '../../shared/ai-contracts';
import { checkGeminiRateLimit } from '../utils/rate-limiter';
import { withRetry } from '../utils/retry-handler';

export interface SubdivisionPlanRequest {
  landWidth: number;        // meters
  landLength: number;       // meters
  landArea: number;         // sqm
  socialClubPercent: number; // 10-30
  targetLotCount?: number;   // optional guidance
  province?: string;         // for local context
}

export interface GeminiGenerationResult {
  plan: SubdivisionPlan;
  tokensUsed: number;
  generationTimeMs: number;
}

/**
 * JSON Schema for structured subdivision plan output
 */
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
            enum: ['social-club', 'parking', 'green-space', 'maintenance']
          },
          areaSqm: { type: SchemaType.NUMBER },
          position: {
            type: SchemaType.OBJECT,
            properties: {
              x: { type: SchemaType.NUMBER },
              y: { type: SchemaType.NUMBER }
            }
          },
          description: { type: SchemaType.STRING }
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

/**
 * Builds subdivision planning prompt
 */
function buildSubdivisionPrompt(params: SubdivisionPlanRequest): string {
  const province = params.province || 'Dominican Republic';

  return `You are an expert urban planner specializing in micro-villa subdivisions in the Dominican Republic.

**TASK**: Generate a detailed subdivision plan for a rectangular land parcel.

**LAND SPECIFICATIONS**:
- Dimensions: ${params.landWidth}m × ${params.landLength}m
- Total Area: ${params.landArea} sqm
- Location: ${province}

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

Generate the plan now.`;
}

/**
 * Gets Gemini API key from environment or settings
 */
function getAPIKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add GEMINI_API_KEY to .env file or configure in Settings.');
  }
  return apiKey;
}

/**
 * Generates subdivision plan using Gemini API
 *
 * @param request - Subdivision plan parameters
 * @returns Generated plan with metadata
 */
export async function generateSubdivisionPlan(
  request: SubdivisionPlanRequest
): Promise<GeminiGenerationResult> {
  // Check rate limit
  await checkGeminiRateLimit();

  const startTime = Date.now();

  // Execute with retry logic
  const result = await withRetry(async () => {
    const apiKey = getAPIKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: subdivisionPlanSchema,
        temperature: 0.2, // Low temperature for deterministic output
        maxOutputTokens: 8192
      }
    });

    const prompt = buildSubdivisionPrompt(request);
    const response = await model.generateContent(prompt);
    const text = response.response.text();

    // Parse JSON response
    const plan: SubdivisionPlan = JSON.parse(text);

    // Get token usage
    const usage = response.response.usageMetadata;
    const tokensUsed = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0);

    return {
      plan,
      tokensUsed,
      generationTimeMs: Date.now() - startTime
    };
  });

  return result;
}

/**
 * Estimates token count for a request (for cost calculation)
 */
export function estimateTokenCount(request: SubdivisionPlanRequest): number {
  const prompt = buildSubdivisionPrompt(request);
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(prompt.length / 4) + 2000; // Add expected response tokens
}

/**
 * Calculates estimated cost for a generation request
 * Based on Gemini 2.5 Flash pricing (as of 2025)
 */
export function estimateCost(request: SubdivisionPlanRequest): number {
  const tokens = estimateTokenCount(request);

  // Gemini 2.5 Flash pricing (per million tokens)
  const INPUT_COST = 0.10;  // $0.10 per 1M input tokens
  const OUTPUT_COST = 0.40; // $0.40 per 1M output tokens

  // Assume 70% input, 30% output split
  const inputTokens = tokens * 0.7;
  const outputTokens = tokens * 0.3;

  const cost =
    (inputTokens / 1_000_000) * INPUT_COST +
    (outputTokens / 1_000_000) * OUTPUT_COST;

  return cost;
}
