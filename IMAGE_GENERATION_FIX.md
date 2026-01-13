# Social Club Image Generation Fix - 2026-01-12

## Problem

When trying to generate social club images, the application crashed with:

```
[Social Club] Generating image with Gemini...
[Social Club] Gemini failed, trying DALL-E: generateImageWithGemini is not a function
[Social Club] DALL-E also failed: generateImageWithDALLE is not a function
Error: Both Gemini and DALL-E failed to generate image
```

## Root Cause

The IPC handler `ai:generate-social-club-image` in `src/main/ipc-handlers.ts` was trying to import and use functions that didn't exist:

```typescript
const { generateImageWithGemini, generateImageWithDALLE } = await import(
  './ai-services/image-client'
);
```

However, `image-client.ts` only exported these functions:
- `buildImagePrompt`
- `generateProjectImage`
- `estimateImageCost`
- `validateImageSize`

The internal functions `generateWithGemini` and `generateWithDALLE3` existed but were private (not exported).

## Solution

Added two new exported wrapper functions to `src/main/ai-services/image-client.ts`:

### 1. `generateImageWithGemini()`

```typescript
export async function generateImageWithGemini(
  prompt: string,
  resolution: Resolution = '1024x1024'
): Promise<Buffer> {
  const result = await generateWithGemini(prompt, resolution);
  // Convert base64 to Buffer
  return Buffer.from(result.imageBase64, 'base64');
}
```

**What it does**:
- Calls the internal `generateWithGemini()` function
- Receives base64-encoded image data
- Converts it to a Node.js Buffer
- Returns the Buffer for the IPC handler to save to disk

### 2. `generateImageWithDALLE()`

```typescript
export async function generateImageWithDALLE(
  prompt: string,
  resolution: Resolution = '1024x1024'
): Promise<Buffer> {
  const result = await generateWithDALLE3(prompt, resolution);
  // Download image from URL and convert to Buffer
  const response = await fetch(result.imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download DALL-E image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

**What it does**:
- Calls the internal `generateWithDALLE3()` function
- Receives an image URL from OpenAI
- Downloads the image using fetch
- Converts to a Node.js Buffer
- Returns the Buffer for the IPC handler to save to disk

## Why This Approach?

1. **Minimal Changes**: Only added wrapper functions, didn't modify existing code
2. **Backward Compatible**: All existing functionality remains unchanged
3. **Consistent Pattern**: Follows the same pattern as other helper functions in the file
4. **Simple Interface**: IPC handler gets a simple Promise<Buffer> interface
5. **Error Handling**: Proper error handling for fetch failures

## Testing

The application now successfully:
1. Builds without errors ✅
2. Starts without crashes ✅
3. Exports the required functions ✅

To test image generation:
1. Navigate to Social Club Designer
2. Select amenities (Pool, Gym, Lounge Chairs, etc.)
3. Click "Generate Design Prompt"
4. Edit prompt if desired
5. Click "Generate Image"
6. Wait for Gemini or DALL-E to generate the image
7. Image should be saved and displayed

## Files Modified

- `src/main/ai-services/image-client.ts` - Added 2 exported wrapper functions

## No Breaking Changes

All existing image generation functionality for subdivision planning remains unchanged.
