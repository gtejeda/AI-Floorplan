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
  landWidth: number; // meters
  landLength: number; // meters
  landArea: number; // sqm
  socialClubPercent: number; // 10-30
  targetLotCount?: number; // optional guidance
  province?: string; // for local context
  strategy?: string; // generation strategy: 'maximize-lots', 'larger-lots', 'varied-amenities', 'different-layout', 'balanced'
  customPrompt?: string; // optional custom prompt to override the default
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
              areaSqm: { type: SchemaType.NUMBER },
            },
            required: ['widthMeters', 'lengthMeters', 'areaSqm'],
          },
          position: {
            type: SchemaType.OBJECT,
            properties: {
              x: { type: SchemaType.NUMBER },
              y: { type: SchemaType.NUMBER },
            },
            required: ['x', 'y'],
          },
        },
        required: ['lotNumber', 'dimensions', 'position'],
      },
    },
    roadConfiguration: {
      type: SchemaType.OBJECT,
      properties: {
        widthMeters: { type: SchemaType.NUMBER },
        totalAreaSqm: { type: SchemaType.NUMBER },
        layout: {
          type: SchemaType.STRING,
          enum: ['grid', 'perimeter', 'central-spine', 'loop'],
        },
      },
      required: ['widthMeters', 'totalAreaSqm', 'layout'],
    },
    amenityAreas: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: {
            type: SchemaType.STRING,
            enum: ['social-club', 'parking', 'green-space', 'maintenance'],
          },
          areaSqm: { type: SchemaType.NUMBER },
          position: {
            type: SchemaType.OBJECT,
            properties: {
              x: { type: SchemaType.NUMBER },
              y: { type: SchemaType.NUMBER },
            },
          },
          description: { type: SchemaType.STRING },
        },
      },
    },
    metrics: {
      type: SchemaType.OBJECT,
      properties: {
        totalLots: { type: SchemaType.INTEGER },
        viableLots: { type: SchemaType.INTEGER },
        invalidLots: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.INTEGER },
          description: 'Lot numbers that are below 90 sqm minimum',
        },
        averageLotSizeSqm: { type: SchemaType.NUMBER },
        landUtilizationPercent: { type: SchemaType.NUMBER },
      },
      required: ['totalLots', 'viableLots', 'averageLotSizeSqm', 'landUtilizationPercent'],
    },
  },
  required: ['lotLayout', 'roadConfiguration', 'amenityAreas', 'metrics'],
};

/**
 * Builds subdivision planning prompt with optional strategy
 * Exported for prompt preview functionality
 */
export function buildSubdivisionPrompt(params: SubdivisionPlanRequest): string {
  const province = params.province || 'Dominican Republic';

  // Build strategy-specific optimization guidance
  let optimizationGuidance = '';
  switch (params.strategy) {
    case 'maximize-lots':
      optimizationGuidance = `
**OPTIMIZATION STRATEGY**: MAXIMIZE NUMBER OF LOTS
- Prioritize creating the maximum number of lots possible
- Use smaller lot sizes (closer to 90-100 sqm minimum)
- Optimize road layout to minimize wasted space
- Target: Maximum lot count while meeting all requirements`;
      break;

    case 'larger-lots':
      optimizationGuidance = `
**OPTIMIZATION STRATEGY**: CREATE LARGER LOTS
- Prioritize larger lot sizes (110-130 sqm)
- Sacrifice lot count for more spacious units
- Focus on quality over quantity
- Target: Fewer, more premium-sized lots`;
      break;

    case 'varied-amenities':
      optimizationGuidance = `
**OPTIMIZATION STRATEGY**: VARIED AMENITY ALLOCATION
- Create diverse amenity areas (parking, green spaces, maintenance)
- Distribute amenities throughout the subdivision
- Balance social club with other community features
- Target: Well-distributed community amenities`;
      break;

    case 'different-layout':
      optimizationGuidance = `
**OPTIMIZATION STRATEGY**: ALTERNATIVE ROAD LAYOUT
- Experiment with different road configurations (grid vs loop vs spine)
- Consider cul-de-sacs or circular patterns
- Vary street orientations for visual interest
- Target: Unique, efficient road network`;
      break;

    case 'balanced':
    default:
      optimizationGuidance = `
**OPTIMIZATION STRATEGY**: BALANCED APPROACH
- Balance between lot count and lot size
- Standard road configuration (grid or perimeter)
- Practical, cost-effective design
- Target: Well-rounded, market-ready plan`;
      break;
  }

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
${optimizationGuidance}

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
    throw new Error(
      'Gemini API key not configured. Please add GEMINI_API_KEY to .env file or configure in Settings.'
    );
  }
  return apiKey;
}

/**
 * Progress callback for streaming generation
 */
export type ProgressCallback = (chunk: string, accumulated: string) => void;

/**
 * Generates subdivision plan using Gemini API with streaming support
 *
 * @param request - Subdivision plan parameters
 * @param onProgress - Optional callback for streaming progress updates
 * @returns Generated plan with metadata
 */
export async function generateSubdivisionPlan(
  request: SubdivisionPlanRequest,
  onProgress?: ProgressCallback
): Promise<GeminiGenerationResult> {
  console.log('[GeminiClient] Starting subdivision plan generation', {
    landWidth: request.landWidth,
    landLength: request.landLength,
    landArea: request.landArea,
    streaming: !!onProgress,
  });

  // Check rate limit
  await checkGeminiRateLimit();

  const startTime = Date.now();

  // Execute with retry logic
  const result = await withRetry(async () => {
    try {
      const apiKey = getAPIKey();
      console.log('[GeminiClient] API key retrieved, length:', apiKey.length);

      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: 'gemini-3-pro-preview', // Gemini 3 Pro - matches image generation model for consistent performance
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: subdivisionPlanSchema,
          temperature: 0.2,
          maxOutputTokens: 65536, // Gemini 3 supports up to 65K output tokens
        },
      });

      // Use custom prompt if provided, otherwise build default prompt
      const prompt = request.customPrompt || buildSubdivisionPrompt(request);

      // Use streaming if progress callback provided
      if (onProgress) {
        console.log('[GeminiClient] Starting STREAMING generation...');
        console.log(
          '[GeminiClient] Connecting to Gemini API (this may take 10-30 seconds on first request)...'
        );

        const streamStartTime = Date.now();
        const streamResult = await model.generateContentStream(prompt);

        let accumulatedText = '';
        let chunkCount = 0;
        let firstChunkReceived = false;

        // Process stream chunks
        for await (const chunk of streamResult.stream) {
          // Log time to first chunk (important for diagnosing cold starts)
          if (!firstChunkReceived) {
            const timeToFirstChunk = Date.now() - streamStartTime;
            console.log('[GeminiClient] First chunk received after', timeToFirstChunk, 'ms');
            firstChunkReceived = true;
          }

          const chunkText = chunk.text();
          accumulatedText += chunkText;
          chunkCount++;

          // Send progress update
          onProgress(chunkText, accumulatedText);

          if (chunkCount % 5 === 0) {
            console.log('[GeminiClient] Streaming progress:', {
              chunks: chunkCount,
              length: accumulatedText.length,
            });
          }
        }

        console.log('[GeminiClient] Streaming completed', {
          totalChunks: chunkCount,
          totalLength: accumulatedText.length,
        });

        // Get final response for metadata
        const response = await streamResult.response;
        const text = accumulatedText;

        // Log the full response for debugging (critical for diagnosing truncation issues)
        console.log('[GeminiClient] Full response text length:', text.length);
        console.log('[GeminiClient] Response preview (first 500 chars):', text.substring(0, 500));
        console.log(
          '[GeminiClient] Response end (last 200 chars):',
          text.substring(Math.max(0, text.length - 200))
        );

        // Validate response is complete JSON
        if (!text.trim().endsWith('}')) {
          console.error('[GeminiClient] Response appears truncated! Full text:', text);
          throw new Error('API response was truncated. Please try again or reduce complexity.');
        }

        // Parse JSON response
        let plan: SubdivisionPlan;
        try {
          plan = JSON.parse(text);
        } catch (parseError: any) {
          console.error('[GeminiClient] JSON parsing failed. Full response text:', text);
          throw new Error(
            `Failed to parse AI response: ${parseError.message}. Response may be truncated.`
          );
        }

        // Get token usage
        const usage = response.usageMetadata;
        const tokensUsed = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0);

        console.log('[GeminiClient] Plan generated successfully (streaming)', {
          totalLots: plan.metrics.totalLots,
          viableLots: plan.metrics.viableLots,
          tokensUsed,
        });

        return {
          plan,
          tokensUsed,
          generationTimeMs: Date.now() - startTime,
        };
      } else {
        // Non-streaming mode (original implementation)
        console.log('[GeminiClient] Model initialized, generating content (non-streaming)...');
        const response = await model.generateContent(prompt);

        console.log('[GeminiClient] Content generated, parsing response...');
        const text = response.response.text();

        // Log the full response for debugging (critical for diagnosing truncation issues)
        console.log('[GeminiClient] Full response text length:', text.length);
        console.log('[GeminiClient] Response preview (first 500 chars):', text.substring(0, 500));
        console.log(
          '[GeminiClient] Response end (last 200 chars):',
          text.substring(Math.max(0, text.length - 200))
        );

        // Validate response is complete JSON
        if (!text.trim().endsWith('}')) {
          console.error('[GeminiClient] Response appears truncated! Full text:', text);
          throw new Error('API response was truncated. Please try again or reduce complexity.');
        }

        // Parse JSON response
        let plan: SubdivisionPlan;
        try {
          plan = JSON.parse(text);
        } catch (parseError: any) {
          console.error('[GeminiClient] JSON parsing failed. Full response text:', text);
          throw new Error(
            `Failed to parse AI response: ${parseError.message}. Response may be truncated.`
          );
        }

        // Get token usage
        const usage = response.response.usageMetadata;
        const tokensUsed = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0);

        console.log('[GeminiClient] Plan generated successfully', {
          totalLots: plan.metrics.totalLots,
          viableLots: plan.metrics.viableLots,
          tokensUsed,
        });

        return {
          plan,
          tokensUsed,
          generationTimeMs: Date.now() - startTime,
        };
      }
    } catch (error: any) {
      console.error('[GeminiClient] Error during generation:', {
        name: error.name,
        message: error.message,
        status: error.status,
        stack: error.stack,
      });
      throw error;
    }
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
 * Based on Gemini 3 Pro pricing (as of 2025)
 */
export function estimateCost(request: SubdivisionPlanRequest): number {
  const tokens = estimateTokenCount(request);

  // Gemini 3 Pro pricing (per million tokens)
  // Source: https://ai.google.dev/pricing (<200k tokens tier)
  const INPUT_COST = 2.0; // $2.00 per 1M input tokens (Gemini 3 Pro)
  const OUTPUT_COST = 12.0; // $12.00 per 1M output tokens (Gemini 3 Pro)

  // Assume 70% input, 30% output split
  const inputTokens = tokens * 0.7;
  const outputTokens = tokens * 0.3;

  const cost = (inputTokens / 1_000_000) * INPUT_COST + (outputTokens / 1_000_000) * OUTPUT_COST;

  return cost;
}
