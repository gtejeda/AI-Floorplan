/**
 * AI Image Generation Service
 *
 * Orchestrates image generation workflow for subdivision visualizations.
 * Handles prompt generation, validation, and async polling.
 */

import type { SubdivisionPlan } from '../models/SubdivisionPlan';
import type { ViewType, ImageGenerationRequest } from '../models/ProjectVisualization';

interface ImagePromptData {
  projectName: string;
  landDimensions: { width: number; length: number };
  lotCount: number;
  socialClubArea: number;
  roadLayout: string;
  province?: string;
  nearbyLandmarks?: string[];
}

// Negative prompts (common across views)
const NEGATIVE_PROMPTS = {
  quality: 'blurry, low resolution, pixelated, distorted, watermark, text overlay',
  style: 'cartoon, anime',
  content: 'people, crowds, vehicles (unless background context), animals',
  mood: 'dark, gloomy, apocalyptic, abandoned, construction debris',
};

/**
 * Generate image prompt for site-plan view
 */
export function generateSitePlanImagePrompt(data: ImagePromptData): string {
  const baseElements = {
    land: `${data.landDimensions.width}m × ${data.landDimensions.length}m rectangular plot`,
    lots: `${data.lotCount} micro-villa lots (9-10m × 10-12m each)`,
    socialClub: `central social club building (${Math.sqrt(data.socialClubArea).toFixed(0)}m square)`,
    roads: `${data.roadLayout} road pattern, 6-meter width`,
  };

  return `Professional architectural site plan, top-down 2D view. ${baseElements.land}.
    ${baseElements.lots} arranged in organized grid. ${baseElements.socialClub} with pool and amenities.
    ${baseElements.roads}. Clean line work, measured dimensions labeled, property boundaries marked.
    Green landscaping between lots. Parking areas indicated. Professional CAD-style drawing.
    Black lines on white background. Scale bar included. North arrow. High detail, architectural precision.`;
}

/**
 * Generate image prompt for aerial view
 */
export function generateAerialImagePrompt(data: ImagePromptData): string {
  const baseElements = {
    land: `${data.landDimensions.width}m × ${data.landDimensions.length}m rectangular plot`,
    lots: `${data.lotCount} micro-villa lots with small modern houses`,
    socialClub: `central social club building (${Math.sqrt(data.socialClubArea).toFixed(0)}m square)`,
    roads: `${data.roadLayout} road pattern, 6-meter width`,
  };

  const location = data.province ? `, ${data.province}, Dominican Republic` : '';
  const landmarks = data.nearbyLandmarks?.join(', ') || 'residential area';

  return `Aerial view photograph, 45-degree angle${location}.
    ${baseElements.land}. ${baseElements.lots}. ${baseElements.socialClub}
    with blue swimming pool visible. ${baseElements.roads} with light gray paving. Green grass and tropical
    landscaping. Surrounded by ${landmarks}.
    Clear sky, daytime, drone photography style. Photorealistic, high resolution.`;
}

/**
 * Generate image prompt for context view
 */
export function generateContextImagePrompt(data: ImagePromptData): string {
  const location = data.province || 'Dominican Republic';
  const landmarks = data.nearbyLandmarks?.length
    ? `Visible landmarks: ${data.nearbyLandmarks.join(', ')}`
    : 'Typical Dominican urban context';

  return `Wide-angle context view showing ${data.projectName} micro-villa subdivision in
    ${location}. ${data.landDimensions.width}m × ${data.landDimensions.length}m site integrated into surrounding landscape.
    ${landmarks}.
    Modern tropical architecture. Lush vegetation. Blue sky. Photorealistic rendering.
    Professional real estate marketing image. Golden hour lighting.`;
}

/**
 * Build complete image generation request for a specific view type
 */
export function buildImageGenerationRequest(
  viewType: ViewType,
  data: ImagePromptData,
  subdivisionPlanId?: string
): ImageGenerationRequest {
  let prompt: string;

  switch (viewType) {
    case 'site-plan':
      prompt = generateSitePlanImagePrompt(data);
      break;
    case 'aerial':
      prompt = generateAerialImagePrompt(data);
      break;
    case 'context':
      prompt = generateContextImagePrompt(data);
      break;
    default:
      prompt = generateSitePlanImagePrompt(data); // Fallback
  }

  const negativePrompt = Object.values(NEGATIVE_PROMPTS).join(', ');

  return {
    prompt,
    negativePrompt,
    model: viewType === 'site-plan' ? 'dall-e-3' : 'dall-e-3', // Same model for all views
    resolution: viewType === 'context' ? '1792x1024' : '1024x1024',
    outputFormat: 'png',
    guidanceScale: 12,
    steps: 30,
    metadata: {
      projectId: data.projectName,
      viewType,
      landDimensions: `${data.landDimensions.width}x${data.landDimensions.length}`,
    },
  };
}

/**
 * Extract image prompt data from subdivision plan
 */
export function extractImagePromptData(
  projectName: string,
  plan: SubdivisionPlan,
  province?: string,
  landmarks?: string[]
): ImagePromptData {
  // Calculate land dimensions from lot layout
  const maxX = Math.max(
    ...plan.lotLayout.map((lot) => lot.position.x + lot.dimensions.widthMeters)
  );
  const maxY = Math.max(
    ...plan.lotLayout.map((lot) => lot.position.y + lot.dimensions.lengthMeters)
  );

  // Find social club area
  const socialClubArea =
    plan.amenityAreas
      .filter((a) => a.type === 'social-club')
      .reduce((sum, a) => sum + a.areaSqm, 0) || 300;

  return {
    projectName,
    landDimensions: {
      width: maxX,
      length: maxY,
    },
    lotCount: plan.metrics.viableLots,
    socialClubArea,
    roadLayout: plan.roadConfiguration.layout,
    province,
    nearbyLandmarks: landmarks?.slice(0, 3), // Limit to 3 landmarks
  };
}

/**
 * Validate file size (10MB limit)
 */
export function validateImageFileSize(sizeBytes: number): { valid: boolean; error?: string } {
  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  if (sizeBytes > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image size (${(sizeBytes / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size of ${MAX_SIZE_MB} MB`,
    };
  }

  return { valid: true };
}

/**
 * Poll for image generation completion with exponential backoff
 */
export async function pollForImageCompletion(
  generationId: string,
  pollFn: (id: string) => Promise<any>,
  maxAttempts: number = 20
): Promise<string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    await sleep(Math.min(2 ** attempts * 1000, 10000)); // Max 10 second wait

    const status = await pollFn(generationId);

    if (status.status === 'completed' && status.imageUrl) {
      return status.imageUrl;
    }

    if (status.status === 'failed') {
      throw new Error(`Generation failed: ${status.error?.message || 'Unknown error'}`);
    }

    attempts++;
  }

  throw new Error('Generation timeout: exceeded maximum polling attempts');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
