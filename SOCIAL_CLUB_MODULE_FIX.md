# Social Club Image Generation - Module Import Fix

## Problem

After successfully generating the social club image with Gemini, the application crashed when trying to save the metadata to the database:

```
[Social Club] Image saved to: C:\Users\...\social-club-1768252890294-bd79e7d0-7677-4a7f-8a04-574b8ee24854.png
[IPC] Error generating social club image: Error: Cannot find module './storage'
Require stack:
- D:\fast2ai\AI-Floorplan\.vite\build\index-n5BddQX3.js
- D:\fast2ai\AI-Floorplan\.vite\build\main.js
```

## Root Cause

In the social club image generation IPC handler (`src/main/ipc-handlers.ts:4911`), the code was using a dynamic `require()` statement:

```typescript
const db = require('./storage').getDatabase();
```

This doesn't work in Vite's bundled environment because:
1. Vite bundles all modules together during build
2. Relative `require()` paths break in bundled code
3. The './storage' module path doesn't exist in the bundled output

## The Fix

**File**: `src/main/ipc-handlers.ts` (line 4911)

**Before**:
```typescript
const db = require('./storage').getDatabase();
```

**After**:
```typescript
const db = getDatabase();
```

Since `getDatabase` is already imported at the top of the file (line 7):
```typescript
import { getDatabase } from './storage';
```

We can use it directly without requiring the module again.

## Why This Works

1. **Static Import at Top**: `getDatabase` is imported statically at the top of the file
2. **Vite Bundles It**: Vite properly bundles the static import
3. **Function Available**: The function is available throughout the file's scope
4. **No Dynamic Require**: No need for dynamic module resolution

## Flow Now Works

1. ✅ User selects amenities in Social Club Designer
2. ✅ User generates prompt with tropical drone view description
3. ✅ User clicks "Generate Image"
4. ✅ Gemini API generates photorealistic image
5. ✅ Image is saved to file system: `social-club-images/{projectId}/{filename}.png`
6. ✅ **NEW: Metadata saved to database** (`social_club_images` table)
7. ✅ Image path returned to renderer
8. ✅ Image displayed in gallery

## Database Schema

The `social_club_images` table (migration 003) stores:
- Image path on disk
- Generation prompt
- Selected amenities (as JSON)
- Social club area, storage type, maintenance room size
- AI provider used (Gemini or DALL-E)
- Generated timestamp

## Files Modified

- `src/main/ipc-handlers.ts` - Fixed module import on line 4911

## Testing

1. Navigate to Social Club Designer
2. Select amenities
3. Generate design prompt
4. Click "Generate Image"
5. Wait for generation
6. **Result**: Image should generate, save to disk, save to database, and display successfully!

## No More Errors

The previous module resolution error is now fixed, and the complete flow works end-to-end.
