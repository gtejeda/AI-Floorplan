/**
 * Image Generation Client - Project Visualization
 *
 * Integrates with image generation APIs (DALL-E 3, Stability AI, etc.)
 * for creating subdivision visualizations.
 *
 * Currently targets DALL-E 3 via OpenAI API.
 */

import * as fs from 'fs';
import * as path from 'path';
import { checkImageRateLimit } from '../utils/rate-limiter';
import { withRetry } from '../utils/retry-handler';
import type { SubdivisionPlan } from '../../shared/ai-contracts';

export type ViewType = 'site-plan' | 'aerial' | 'context';
export type Resolution = '1024x1024' | '1792x1024' | '1024x1792';

export interface ImageGenerationRequest {
  projectName: string;
  subdivisionPlan: SubdivisionPlan;
  viewType: ViewType;
  resolution?: Resolution;
  customPromptAdditions?: string;
  landDimensions: { width: number; length: number };
  province: string;
  nearbyLandmarks?: string[];
}

export interface ImageGenerationResult {
  imageUrl?: string;      // Temporary URL (if API returns URL)
  imageBase64?: string;   // Base64 data (if API returns data)
  localPath: string;      // Path where image is saved
  filename: string;
  widthPixels: number;
  heightPixels: number;
  format: 'png' | 'jpeg' | 'webp';
  generationTimeMs: number;
  aiModel: string;
  promptText: string;
}

/**
 * Builds image generation prompt based on view type
 */
function buildImagePrompt(request: ImageGenerationRequest): string {
  const { subdivisionPlan, viewType, landDimensions, province, nearbyLandmarks, customPromptAdditions } = request;

  const lotCount = subdivisionPlan.metrics.viableLots;
  const socialClubArea = subdivisionPlan.amenityAreas
    .find(a => a.type === 'social-club')?.areaSqm || 300;
  const roadLayout = subdivisionPlan.roadConfiguration.layout;

  const baseElements = {
    land: `${landDimensions.width}m × ${landDimensions.length}m rectangular plot`,
    lots: `${lotCount} micro-villa lots (9-10m × 10-12m each)`,
    socialClub: `central social club building (${Math.sqrt(socialClubArea).toFixed(0)}m square)`,
    roads: `${roadLayout} road pattern, 6-meter width`
  };

  const promptTemplates: Record<ViewType, string> = {
    'site-plan': `Professional architectural site plan, top-down 2D view. ${baseElements.land}.
${baseElements.lots} arranged in organized grid. ${baseElements.socialClub} with pool and amenities.
${baseElements.roads}. Clean line work, measured dimensions labeled, property boundaries marked.
Green landscaping between lots. Parking areas indicated. Professional CAD-style drawing.
Black lines on white background. Scale bar included. North arrow. High detail, architectural precision.`,

    'aerial': `Aerial view photograph, 45-degree angle, ${province}. ${baseElements.land}.
${baseElements.lots} with small modern houses. ${baseElements.socialClub} with blue swimming pool visible.
${baseElements.roads} with light gray paving. Green grass and tropical landscaping.
${nearbyLandmarks?.length ? `Surrounded by ${nearbyLandmarks.join(', ')}` : 'Residential area'}.
Clear sky, daytime, drone photography style. Photorealistic, high resolution.`,

    'context': `Wide-angle context view showing micro-villa subdivision in ${province}.
${baseElements.land} integrated into surrounding landscape.
${nearbyLandmarks?.length ? `Visible landmarks: ${nearbyLandmarks.join(', ')}` : 'Typical Dominican urban context'}.
Modern tropical architecture. Lush vegetation. Blue sky. Photorealistic rendering.
Professional real estate marketing image. Golden hour lighting.`
  };

  let prompt = promptTemplates[viewType];

  // Add custom refinements if provided
  if (customPromptAdditions) {
    prompt += `\n\nAdditional requirements: ${customPromptAdditions}`;
  }

  return prompt;
}

/**
 * Gets negative prompts to avoid unwanted elements
 */
function getNegativePrompt(viewType: ViewType): string {
  const common = 'blurry, low resolution, pixelated, distorted, watermark, text overlay, people, crowds, vehicles, animals, dark, gloomy, apocalyptic, abandoned';

  if (viewType === 'site-plan') {
    return `${common}, 3D, perspective, shadows, photorealistic`;
  }

  return common;
}

/**
 * Gets API key from environment or settings
 */
function getAPIKey(): string {
  const apiKey = process.env.OPENAI_API_KEY || process.env.IMAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Image API key not configured. Please add OPENAI_API_KEY to .env file or configure in Settings.');
  }
  return apiKey;
}

/**
 * Generates image using DALL-E 3 API
 */
async function generateWithDALLE3(
  prompt: string,
  resolution: Resolution
): Promise<{ imageUrl: string; revisedPrompt: string }> {
  const apiKey = getAPIKey();

  // Map resolution to DALL-E 3 format
  const size = resolution === '1792x1024' ? '1792x1024' :
               resolution === '1024x1792' ? '1024x1792' :
               '1024x1024';

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: 'hd',
      style: 'natural'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    imageUrl: data.data[0].url,
    revisedPrompt: data.data[0].revised_prompt || prompt
  };
}

/**
 * Downloads image from URL and saves to local file system
 */
async function downloadImageToFile(
  imageUrl: string,
  outputDir: string,
  filename: string
): Promise<string> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, filename);

  // Download image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save to file
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

/**
 * Generates project visualization image
 *
 * @param request - Image generation parameters
 * @param outputDir - Directory to save image
 * @returns Generated image metadata
 */
export async function generateProjectImage(
  request: ImageGenerationRequest,
  outputDir: string
): Promise<ImageGenerationResult> {
  // Check rate limit
  await checkImageRateLimit();

  const startTime = Date.now();

  // Execute with retry logic
  const result = await withRetry(async () => {
    const prompt = buildImagePrompt(request);
    const resolution = request.resolution || '1024x1024';

    // Generate image with DALL-E 3
    const { imageUrl, revisedPrompt } = await generateWithDALLE3(prompt, resolution);

    // Parse resolution
    const [width, height] = resolution.split('x').map(Number);

    // Generate filename
    const timestamp = Date.now();
    const filename = `${request.projectName}-${request.viewType}-${timestamp}.png`;

    // Download and save image
    const localPath = await downloadImageToFile(imageUrl, outputDir, filename);

    return {
      imageUrl,
      localPath,
      filename,
      widthPixels: width,
      heightPixels: height,
      format: 'png' as const,
      generationTimeMs: Date.now() - startTime,
      aiModel: 'dall-e-3',
      promptText: revisedPrompt || prompt
    };
  });

  return result;
}

/**
 * Estimates cost for image generation
 * DALL-E 3 pricing (as of 2025)
 */
export function estimateImageCost(resolution: Resolution = '1024x1024'): number {
  // DALL-E 3 pricing
  const pricing: Record<Resolution, number> = {
    '1024x1024': 0.040,   // $0.040 per image
    '1792x1024': 0.080,   // $0.080 per image
    '1024x1792': 0.080    // $0.080 per image
  };

  return pricing[resolution] || 0.040;
}

/**
 * Validates image file size
 * @param filePath - Path to image file
 * @param maxSizeBytes - Maximum allowed size (default: 10MB)
 */
export function validateImageSize(filePath: string, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  const stats = fs.statSync(filePath);
  return stats.size <= maxSizeBytes;
}
