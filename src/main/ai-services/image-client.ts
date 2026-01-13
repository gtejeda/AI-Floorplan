/**
 * Image Generation Client - Project Visualization
 *
 * Integrates with image generation APIs (DALL-E 3, Gemini 3, Stability AI, etc.)
 * for creating subdivision visualizations.
 *
 * Supports:
 * - DALL-E 3 via OpenAI API (default)
 * - Gemini 3 Pro Image via Google Generative AI API
 */

import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  fullCustomPrompt?: string; // Completely replaces the generated prompt
  landDimensions: { width: number; length: number };
  province: string;
  nearbyLandmarks?: string[];
  referenceImagePath?: string; // Path to site plan image (REQUIRED for aerial/context views)
}

export interface ImageGenerationResult {
  imageUrl?: string; // Temporary URL (if API returns URL)
  imageBase64?: string; // Base64 data (if API returns data)
  localPath: string; // Path where image is saved
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
 * Exported for prompt preview in UI
 */
export function buildImagePrompt(
  request: ImageGenerationRequest,
  fullCustomPrompt?: string
): string {
  // If a full custom prompt is provided, use it directly
  if (fullCustomPrompt) {
    return fullCustomPrompt;
  }

  const {
    subdivisionPlan,
    viewType,
    landDimensions,
    province,
    nearbyLandmarks,
    customPromptAdditions,
  } = request;

  const lotCount = subdivisionPlan.metrics.viableLots;
  const socialClubArea =
    subdivisionPlan.amenityAreas.find((a) => a.type === 'social-club')?.areaSqm || 300;

  const baseElements = {
    land: `${landDimensions.width}m × ${landDimensions.length}m rectangular plot`,
    lots: `${lotCount} micro-villa lots (9-10m × 10-12m each)`,
    socialClub: `central social club building (${Math.sqrt(socialClubArea).toFixed(0)}m square)`,
  };

  const promptTemplates: Record<ViewType, string> = {
    'site-plan': `Professional architectural site plan, top-down 2D view. ${baseElements.land}.

🚨 CRITICAL SHAPE & PROPORTION REQUIREMENTS (NON-NEGOTIABLE):
- ASPECT RATIO: ${(landDimensions.length / landDimensions.width).toFixed(2)}:1 (LENGTH to WIDTH ratio)
- SHAPE DESCRIPTION: ${landDimensions.length > landDimensions.width ? `TALL VERTICAL RECTANGLE - the plot is ${(landDimensions.length / landDimensions.width).toFixed(1)} times LONGER than it is wide` : landDimensions.width > landDimensions.length ? `WIDE HORIZONTAL RECTANGLE - the plot is ${(landDimensions.width / landDimensions.length).toFixed(1)} times WIDER than it is long` : 'SQUARE plot'}
- HORIZONTAL WIDTH (short side): ${landDimensions.width} meters - label TOP and BOTTOM edges as "${landDimensions.width}m"
- VERTICAL LENGTH (long side): ${landDimensions.length} meters - label LEFT and RIGHT edges as "${landDimensions.length}m"
- VERIFICATION: The plot must be visibly ${landDimensions.length > landDimensions.width ? 'TALLER than wide' : 'WIDER than tall'} - NOT SQUARE
- VISUAL CHECK: If ${landDimensions.width}m = ${landDimensions.length}m visually, YOU MADE AN ERROR. The proportions must match ${landDimensions.width}:${landDimensions.length}
- IMAGE CANVAS: The image canvas may be square, but the PLOT BOUNDARY must maintain ${landDimensions.width}:${landDimensions.length} proportions - add white margins/borders as needed to preserve plot aspect ratio

📏 DIMENSION LABELING & METER MARKS (ARCHITECTURAL STANDARD):
- Add dimension lines along ALL FOUR edges of the property boundary (top, bottom, left, right)
- Top edge: Show total width "${landDimensions.width}m" prominently centered
- Right edge: Show total length "${landDimensions.length}m" prominently centered
- Add small tick marks every 1-2 meters along dimension lines to show scale
- Show cumulative dimensions for major sections (e.g., "3.00m", "14.00m", "17.00m" along edges)
- Dimension text should be clear, legible, and oriented horizontally (rotated 90° for vertical dimensions)
- Use architectural dimension line style: thin lines with arrows at endpoints, tick marks for subdivisions

LAYOUT & ELEMENTS:
${baseElements.lots} arranged in organized grid. ${baseElements.socialClub} with pool and amenities.
Parking area located at main entrance with clear access lanes. NO internal vehicle roads - only pedestrian walkways (2-3m width) and landscaped paths between lots.
Emphasis on green spaces, gardens, and walking paths throughout the development.

DRAWING STYLE:
Clean line work, measured dimensions labeled with tick marks, property boundaries marked.
Parking spaces clearly indicated at entrance. Professional CAD-style architectural drawing.
Black lines on white background. Scale bar included (0-5-10-15-20m). North arrow. High detail, architectural precision.

FINAL VERIFICATION CHECKLIST (MANDATORY):
✓ SHAPE: Plot is visibly ${landDimensions.length > landDimensions.width ? `TALL RECTANGLE (${(landDimensions.length / landDimensions.width).toFixed(1)}x taller than wide)` : landDimensions.width > landDimensions.length ? `WIDE RECTANGLE (${(landDimensions.width / landDimensions.length).toFixed(1)}x wider than tall)` : 'SQUARE'} - NOT drawn as square if dimensions are unequal
✓ ASPECT RATIO: Visual proportions match ${landDimensions.width}:${landDimensions.length} ratio
✓ Top and bottom edges labeled "${landDimensions.width}m" (horizontal width)
✓ Left and right edges labeled "${landDimensions.length}m" (vertical length)
✓ Meter tick marks visible along dimension lines every 1-2 meters
✓ Scale bar shows 0-5-10-15-20m increments with correct spacing`,

    aerial: `🚨 CAMERA ANGLE OVERRIDE 🚨 - DO NOT USE TOP-DOWN VIEW - MUST BE 45-DEGREE OBLIQUE ANGLE

VIEWING ANGLE (HIGHEST PRIORITY): Aerial drone photograph at EXACTLY 45-degree oblique angle (isometric perspective).
YOU MUST SEE: Building sides, roof edges, wall facades, and depth - NOT just flat rooftops.
VISUAL CHECK: If you can't see the SIDE WALLS of buildings, the angle is WRONG. The camera must show 3D volume and building height.
FORBIDDEN: Top-down flat view, 90-degree overhead view, directly-from-above perspective.
The reference site plan is TOP-DOWN format - use it ONLY for lot positioning, NOT for camera angle.

45-DEGREE OBLIQUE PERSPECTIVE MEANS:
- Camera tilted at 45° showing both rooftops AND building sides simultaneously
- You can see building facades, windows, doors, architectural details on walls
- Buildings appear three-dimensional with visible height and depth
- Similar to Google Earth 3D view or architectural rendering perspective
- Strong sense of depth with shadows cast at angles

🗺️ REFERENCE IMAGE LAYOUT - COPY EXACT SPATIAL ARRANGEMENT 🗺️

The provided reference site plan image shows the EXACT spatial layout. Study it carefully and replicate the positioning precisely:

SPATIAL LAYOUT (look at reference image and copy these positions):
1. PARKING LOCATION: At the BOTTOM of the property near main entrance (NOT on sides)
2. VILLA ARRANGEMENT: Look at the reference - are villas in 2 rows? 4 corners? Copy that EXACT grid pattern
3. SOCIAL CLUB POSITION: Look where it sits relative to the villas in the reference - CENTER? Top? Bottom? Match that exact position
4. POOL LOCATION: Attached to or near the social club building - copy its exact position from reference
5. WALKWAY PATTERN: Study the walking paths in the reference - perimeter paths? Central paths? Replicate that exact pattern
6. LANDSCAPED AREAS: Green spaces, gardens shown in reference - position them in the same locations

DO NOT INVENT A NEW LAYOUT - TRACE THE REFERENCE:
- Count buildings in reference and place them in IDENTICAL positions
- Measure relative distances between elements (if social club is centered between villas, keep it centered)
- Copy the orientation (which direction villas face)
- Match the symmetry or asymmetry shown in reference
- Replicate the circulation/walkway network exactly

MANDATORY: EXACTLY ${lotCount} villas - This is a SMALL INTIMATE community, not a large development.
LOCATION: ${province}, Dominican Republic. ${baseElements.land} rectangular property.

SPECIFIC ELEMENTS (verify positions match reference):
- ${lotCount} GRASS/LANDSCAPED MICRO-VILLA LOTS (90-100 sqm each) - Show land allocation/slots with clear boundaries, NOT built houses/villas yet
  * Each lot should be a grassy/landscaped plot with visible property boundaries (fencing, hedges, or demarcation)
  * Lots are EMPTY - no buildings/houses on them, just prepared land with grass and landscaping
  * Show the potential/allocated space where villas will be built
- ${baseElements.socialClub} BUILDING with blue swimming pool - FULLY BUILT AND VISIBLE (this is the only constructed building)
  * Social club is already constructed - show the actual building with architectural details
  * Pool, amenities, and social club facilities are complete and visible
- Parking area (${Math.ceil(lotCount * 1.5)} spaces) - at SAME position as reference (typically main entrance area) - show paved parking with marked spaces
- Pedestrian walkways (2-3m width) - STOP AT THE BEGINNING/EDGE of each micro-villa lot (walkways do not penetrate into the lots themselves)
  * Walkways create a circulation network connecting to lot entrances
  * Each lot has a clear entry point where the walkway ends and the private lot begins
- Tropical landscaping (palms, gardens) - along walkways, around social club, and within the micro-villa lots (grass, plants, trees)

DEVELOPMENT STAGE: This shows the LAND ALLOCATION phase - social club is built, lots are prepared/landscaped (grass/gardens), but NO residential villas constructed yet.

STYLE: Professional drone photography, clear Caribbean sky, midday lighting, photorealistic, high resolution.

FINAL VERIFICATION CHECKLIST:
✓ Camera angle is 45-degree oblique showing depth and dimensionality?
✓ Exactly ${lotCount} GRASS/LANDSCAPED LOTS (not built villas)?
✓ Social club BUILDING visible and constructed (the only building shown)?
✓ Parking at SAME location as reference image (bottom/entrance)?
✓ Social club at SAME position as reference image (center/other)?
✓ Lot grid arrangement MATCHES reference image pattern?
✓ Walkway network MATCHES reference AND stops at lot boundaries?
✓ Overall spatial layout IDENTICAL to reference (just rendered in 3D at 45° angle)?
✓ NO residential villas/houses built on the lots (only grass/landscaping)?

ABSOLUTE NON-NEGOTIABLE RULES:
1. 45-DEGREE OBLIQUE ANGLE - Must see depth, social club building details, and spatial relationships
2. EXACTLY ${lotCount} GRASS LOTS total - NO villas/houses built on them yet
3. SOCIAL CLUB BUILDING is the ONLY constructed building (show it fully built with pool)
4. COPY SPATIAL LAYOUT from reference - parking location, lot positions, social club position, walkways must match reference
5. WALKWAYS stop at lot edges/entrances - do not penetrate into the private lots
6. Small intimate scale (${lotCount} lots)
7. Use reference for EXACT positioning - just change viewing angle from top-down to 45° oblique`,

    context: `🏘️ GROUND-LEVEL CONTEXTUAL VIEW - BUILT VILLAS ON ALLOCATED LOTS 🏘️

VIEWING PERSPECTIVE (HIGHEST PRIORITY): Wide-angle ground-level or low-angle establishing shot showing the COMPLETED community.
CAMERA POSITION: Street-level, human eye-level, or low aerial perspective (NOT top-down flat view).

📸 REFERENCE IMAGE: The provided AERIAL VIEW (45-degree) image shows the exact spatial layout with grass lots and social club.
Use this aerial reference to understand the 3D spatial arrangement - the context view is simply a ground-level perspective of the same layout.

DEVELOPMENT STAGE - FULLY BUILT COMMUNITY:
The aerial reference shows grass lots (land allocation phase). This context view shows the SAME layout but with villas NOW BUILT on those lots.
- Where aerial shows grass lots → Context shows BUILT MODERN VILLAS (single-story houses with architectural details)
- Where aerial shows social club building → Context shows the SAME social club building from ground perspective
- Where aerial shows walkways stopping at lot edges → Context shows the SAME walkway network with villas built on the lots

🗺️ COPY SPATIAL LAYOUT FROM AERIAL REFERENCE 🗺️

The aerial reference already shows correct 3D positioning. Study it and replicate from ground-level perspective:

SPATIAL LAYOUT (copy from aerial reference):
1. PARKING LOCATION: Same position as aerial reference (typically at bottom/entrance area)
2. VILLA ARRANGEMENT: Same grid pattern as shown in aerial reference (${lotCount} lots become ${lotCount} built villas)
3. SOCIAL CLUB POSITION: Same location as aerial reference - CENTER or wherever shown
4. POOL LOCATION: Same position relative to social club as in aerial reference
5. WALKWAY PATTERN: Same pedestrian path network as aerial reference - stopping at lot entrances
6. LANDSCAPED AREAS: Same green spaces and gardens as shown in aerial reference

MANDATORY: EXACTLY ${lotCount} BUILT VILLAS - This is a SMALL INTIMATE pedestrian-focused community, not a large development.
LOCATION: ${province}, Dominican Republic. ${baseElements.land} rectangular property.

SPECIFIC ELEMENTS (match aerial reference positions, add built structures):
- ${lotCount} MODERN SINGLE-STORY VILLAS (90-100 sqm each) - Built on the lots shown in aerial reference
  * Each villa is a completed modern house with architectural details (walls, windows, doors, roofing)
  * Villas positioned EXACTLY where the grass lots appear in the aerial reference
  * Contemporary Caribbean/tropical architecture with clean lines
  * Small private yards around each villa with landscaping
- ${baseElements.socialClub} BUILDING with blue swimming pool - Same position as aerial reference, viewed from ground level
  * Social club is the community focal point - pool, amenities, gathering areas
  * Viewed from street/eye level showing its architectural features and welcoming design
- Parking area (${Math.ceil(lotCount * 1.5)} spaces) - Same location as aerial reference (entrance area)
- Pedestrian walkways (2-3m width) - Same network as aerial reference, connecting to villa entrances
  * Car-free interior zone emphasizing walkability
  * Walkways lined with tropical landscaping
- Abundant tropical landscaping: palms, flowering plants, gardens - same zones as aerial reference

CONTEXT & ATMOSPHERE:
${nearbyLandmarks?.length ? `Surrounding context: ${nearbyLandmarks.join(', ')}` : 'Typical Dominican residential context with neighboring developments'}.
Modern sustainable tropical architecture emphasizing community gathering, walkability, outdoor living. Golden hour lighting, warm tones.
Professional real estate marketing shot showcasing innovative pedestrian-first design. Photorealistic rendering, high detail.

FINAL VERIFICATION CHECKLIST:
✓ Camera perspective is ground-level/low-angle (showing context and surroundings)?
✓ Exactly ${lotCount} BUILT VILLA HOUSES total (matching the ${lotCount} grass lots in aerial reference)?
✓ Villas positioned EXACTLY where grass lots appear in aerial reference?
✓ Parking at SAME location as aerial reference?
✓ Social club at SAME position as aerial reference (viewed from ground level)?
✓ Walkway network MATCHES aerial reference (same paths, stopping at villa entrances)?
✓ Overall spatial layout IDENTICAL to aerial reference (just with built villas and ground perspective)?

ABSOLUTE CRITICAL REQUIREMENTS (NON-NEGOTIABLE):
1. GROUND-LEVEL/LOW-ANGLE VIEW - Show community from street/eye level in surrounding context
2. EXACTLY ${lotCount} BUILT VILLAS - modern single-story houses on the lots shown in aerial reference
3. COPY SPATIAL LAYOUT from AERIAL reference - villa positions match grass lot positions, same parking location, same social club position, same walkways
4. Small intimate scale (${lotCount} built homes) - not a large resort
5. Use aerial reference for EXACT 3D positioning - just change viewing angle from 45° oblique to ground-level perspective`,
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
  const common =
    'blurry, low resolution, pixelated, distorted, watermark, text overlay, people, crowds, animals, dark, gloomy, apocalyptic, abandoned';

  if (viewType === 'site-plan') {
    return `${common}, internal roads, vehicle roads between lots, asphalt paths, concrete roads, 3D, perspective, shadows, photorealistic`;
  }

  // For aerial and context views, avoid internal vehicle infrastructure
  return `${common}, internal vehicle roads, asphalt between houses, cars between villas, parking between lots`;
}

/**
 * Gets image generation provider from environment
 */
function getImageProvider(): 'gemini' | 'dalle' {
  // Prefer Gemini if API key is available (same as subdivision planning)
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    return 'gemini';
  } else if (openaiKey) {
    return 'dalle';
  }

  throw new Error(
    'No image generation API key configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to .env file.'
  );
}

/**
 * Gets API key from environment or settings
 */
function getAPIKey(provider: 'gemini' | 'dalle'): string {
  const apiKey =
    provider === 'gemini'
      ? process.env.GEMINI_API_KEY
      : process.env.OPENAI_API_KEY || process.env.IMAGE_API_KEY;

  if (!apiKey) {
    const keyName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
    throw new Error(
      `${keyName} not configured. Please add it to .env file or configure in Settings.`
    );
  }

  // Log API key (first 8 chars only for verification, never log full key)
  console.log(`[ImageClient] Using ${provider} API key: ${apiKey.substring(0, 8)}...`);

  return apiKey;
}

/**
 * Generates image using Gemini 3 Pro Image API
 */
async function generateWithGemini(
  prompt: string,
  resolution: Resolution,
  referenceImagePath?: string
): Promise<{ imageBase64: string; revisedPrompt: string; mimeType: string }> {
  const apiKey = getAPIKey('gemini');
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-3-pro-image-preview', // Gemini 3 with image generation
  });

  console.log('[ImageClient] Generating image with Gemini 3 Pro Image...');

  // Build the parts array for the prompt
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // If reference image is provided, load and add it to the prompt
  if (referenceImagePath) {
    console.log('[ImageClient] Loading reference image:', referenceImagePath);
    try {
      const imageBuffer = fs.readFileSync(referenceImagePath);
      const base64Image = imageBuffer.toString('base64');

      // Determine MIME type from file extension
      const ext = path.extname(referenceImagePath).toLowerCase();
      let mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg';
      } else if (ext === '.webp') {
        mimeType = 'image/webp';
      }

      // Add reference image first
      parts.push({
        inlineData: {
          mimeType,
          data: base64Image,
        },
      });

      console.log('[ImageClient] Reference image loaded successfully:', {
        size: imageBuffer.length,
        mimeType,
      });
    } catch (error) {
      console.error('[ImageClient] Failed to load reference image:', error);
      throw new Error(`Failed to load reference image: ${error}`);
    }
  }

  // Add text prompt
  parts.push({ text: prompt });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 32768,
    },
  });

  const response = result.response;

  // Extract image data from response
  // Note: Gemini image generation returns images in the response
  const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) =>
    part.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image data in Gemini response');
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  console.log(`[ImageClient] Gemini returned image with MIME type: ${mimeType}`);

  return {
    imageBase64: imagePart.inlineData.data,
    revisedPrompt: prompt, // Gemini doesn't revise prompts like DALL-E
    mimeType,
  };
}

/**
 * Generates image using DALL-E 3 API
 */
async function generateWithDALLE3(
  prompt: string,
  resolution: Resolution
): Promise<{ imageUrl: string; revisedPrompt: string }> {
  const apiKey = getAPIKey('dalle');

  // Map resolution to DALL-E 3 format
  const size =
    resolution === '1792x1024'
      ? '1792x1024'
      : resolution === '1024x1792'
        ? '1024x1792'
        : '1024x1024';

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: 'hd',
      style: 'natural',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    imageUrl: data.data[0].url,
    revisedPrompt: data.data[0].revised_prompt || prompt,
  };
}

/**
 * Converts MIME type to file format and extension
 */
function mimeTypeToFormat(mimeType: string): {
  format: 'png' | 'jpeg' | 'webp';
  extension: string;
} {
  const normalized = mimeType.toLowerCase();

  if (normalized.includes('jpeg') || normalized.includes('jpg')) {
    return { format: 'jpeg', extension: 'jpg' };
  } else if (normalized.includes('png')) {
    return { format: 'png', extension: 'png' };
  } else if (normalized.includes('webp')) {
    return { format: 'webp', extension: 'webp' };
  }

  // Default to PNG if unknown
  console.warn(`[ImageClient] Unknown MIME type: ${mimeType}, defaulting to PNG`);
  return { format: 'png', extension: 'png' };
}

/**
 * Saves base64 image data to file system
 */
async function saveBase64ToFile(
  base64Data: string,
  outputDir: string,
  filename: string
): Promise<string> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, filename);

  // Convert base64 to buffer and save
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
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
  const provider = getImageProvider();

  console.log(`[ImageClient] Using ${provider} for image generation`);

  // Execute with retry logic
  const result = await withRetry(async () => {
    const prompt = buildImagePrompt(request, request.fullCustomPrompt);
    const resolution = request.resolution || '1024x1024';

    // Parse resolution
    const [width, height] = resolution.split('x').map(Number);

    let localPath: string;
    let imageUrl: string | undefined;
    let imageBase64: string | undefined;
    let revisedPrompt: string;
    let aiModel: string;
    let format: 'png' | 'jpeg' | 'webp';
    let filename: string;

    const timestamp = Date.now();

    if (provider === 'gemini') {
      // Generate with Gemini 3 Pro Image
      const geminiResult = await generateWithGemini(prompt, resolution, request.referenceImagePath);
      imageBase64 = geminiResult.imageBase64;
      revisedPrompt = geminiResult.revisedPrompt;
      aiModel = 'gemini-3-pro-image-preview';

      // Determine format from MIME type
      const { format: detectedFormat, extension } = mimeTypeToFormat(geminiResult.mimeType);
      format = detectedFormat;

      // Generate filename with correct extension
      filename = `${request.projectName}-${request.viewType}-${timestamp}.${extension}`;

      // Save base64 image to file
      localPath = await saveBase64ToFile(imageBase64, outputDir, filename);

      console.log(`[ImageClient] Saved Gemini image as ${format.toUpperCase()} to: ${localPath}`);
    } else {
      // Generate with DALL-E 3
      const dalleResult = await generateWithDALLE3(prompt, resolution);
      imageUrl = dalleResult.imageUrl;
      revisedPrompt = dalleResult.revisedPrompt;
      aiModel = 'dall-e-3';
      format = 'png'; // DALL-E 3 returns PNG

      // Generate filename
      filename = `${request.projectName}-${request.viewType}-${timestamp}.png`;

      // Download and save image
      localPath = await downloadImageToFile(imageUrl, outputDir, filename);

      console.log(`[ImageClient] Saved DALL-E image as PNG to: ${localPath}`);
    }

    return {
      imageUrl,
      imageBase64,
      localPath,
      filename,
      widthPixels: width,
      heightPixels: height,
      format,
      generationTimeMs: Date.now() - startTime,
      aiModel,
      promptText: revisedPrompt || prompt,
    };
  });

  return result;
}

/**
 * Estimates cost for image generation
 * Pricing as of 2025
 */
export function estimateImageCost(resolution: Resolution = '1024x1024'): number {
  const provider = getImageProvider();

  if (provider === 'gemini') {
    // Gemini 3 Pro Image pricing (estimated based on token usage)
    // Note: Gemini charges based on input/output tokens for image generation
    // Approximate cost per image
    return 0.025; // ~$0.025 per image (cheaper than DALL-E 3)
  }

  // DALL-E 3 pricing
  const pricing: Record<Resolution, number> = {
    '1024x1024': 0.04, // $0.040 per image
    '1792x1024': 0.08, // $0.080 per image
    '1024x1792': 0.08, // $0.080 per image
  };

  return pricing[resolution] || 0.04;
}

/**
 * Validates image file size
 * @param filePath - Path to image file
 * @param maxSizeBytes - Maximum allowed size (default: 10MB)
 */
export function validateImageSize(
  filePath: string,
  maxSizeBytes: number = 10 * 1024 * 1024
): boolean {
  const stats = fs.statSync(filePath);
  return stats.size <= maxSizeBytes;
}

/**
 * Simple wrapper to generate image with Gemini and return Buffer with format info
 * Used by social club image generation IPC handler
 */
export async function generateImageWithGemini(
  prompt: string,
  resolution: Resolution = '1024x1024'
): Promise<{ buffer: Buffer; format: 'png' | 'jpeg' | 'webp'; extension: string }> {
  const result = await generateWithGemini(prompt, resolution);
  // Convert base64 to Buffer
  const buffer = Buffer.from(result.imageBase64, 'base64');
  // Detect format from MIME type
  const { format, extension } = mimeTypeToFormat(result.mimeType);
  return { buffer, format, extension };
}

/**
 * Simple wrapper to generate image with DALL-E and return Buffer with format info
 * Used by social club image generation IPC handler
 */
export async function generateImageWithDALLE(
  prompt: string,
  resolution: Resolution = '1024x1024'
): Promise<{ buffer: Buffer; format: 'png' | 'jpeg' | 'webp'; extension: string }> {
  const result = await generateWithDALLE3(prompt, resolution);
  // Download image from URL and convert to Buffer
  const response = await fetch(result.imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download DALL-E image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  // DALL-E 3 returns PNG
  return { buffer, format: 'png', extension: 'png' };
}
