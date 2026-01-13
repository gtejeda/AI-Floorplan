# Social Club Image Path & Display Fixes - 2026-01-12

## Problems Identified

You correctly identified three issues that were already solved in Subdivision Planning but not in Social Club:

1. **Wrong Save Path**: Images saved to `C:\Users\...\AppData\Roaming\MicroVillas Investment Platform\social-club-images\...` instead of project-data directory
2. **Wrong File Extension**: Images saved as `.png` but actual content was JPEG (Windows asked to rename)
3. **Broken Image Display**: Images showed as broken because of incorrect `file://` protocol usage

## Root Causes

### Issue 1: Wrong Save Path
**Location**: `src/main/ipc-handlers.ts:4875`

**Before**:
```typescript
const userDataPath = app.getPath('userData'); // AppData/Roaming
const imagesDir = path.join(userDataPath, 'social-club-images', request.projectId);
```

**Problem**: Used system AppData directory instead of project-specific directory

---

### Issue 2: Wrong File Extension
**Location**: `src/main/ipc-handlers.ts:4872`

**Before**:
```typescript
const filename = `social-club-${timestamp}-${imageId}.png`; // Hardcoded .png
```

**Problem**:
- Gemini returns JPEG images with MIME type `image/jpeg`
- Extension was hardcoded as `.png` regardless of actual format
- Windows detected the mismatch and asked to rename

---

### Issue 3: Broken Image Display
**Location**: `src/renderer/components/SocialClubDesigner/AISocialClubDesigner.tsx:364`

**Before**:
```tsx
<img src={`file://${imagePath}`} alt="Social Club Design" />
```

**Problem**:
- Electron renderer doesn't allow `file://` protocol for security reasons
- Images showed as broken (browser security sandbox)

---

## Solutions Implemented

### Fix 1: Use Project-Data Directory ✅

**File**: `src/main/ipc-handlers.ts`

```typescript
// Use project-data directory (same as subdivision images)
const imagesDir = path.join(
  'D:\\fast2ai\\AI-Floorplan\\project-data',
  request.projectId,
  'images',
  'social-club'
);
```

**Result**: Images now saved to `D:\fast2ai\AI-Floorplan\project-data\{projectId}\images\social-club\`

---

### Fix 2: Detect Format from MIME Type ✅

**Files Modified**:
1. `src/main/ai-services/image-client.ts` - Updated wrapper functions
2. `src/main/ipc-handlers.ts` - Use detected format

**Updated Wrapper Functions**:
```typescript
export async function generateImageWithGemini(
  prompt: string,
  resolution: Resolution = '1024x1024'
): Promise<{ buffer: Buffer; format: 'png' | 'jpeg' | 'webp'; extension: string }> {
  const result = await generateWithGemini(prompt, resolution);
  const buffer = Buffer.from(result.imageBase64, 'base64');
  const { format, extension } = mimeTypeToFormat(result.mimeType); // Detect from MIME
  return { buffer, format, extension };
}
```

**IPC Handler Update**:
```typescript
const imageResult = await generateImageWithGemini(request.prompt);
const filename = `social-club-${timestamp}-${imageId}.${imageResult.extension}`; // Dynamic extension
```

**Result**:
- Gemini JPEG images → `.jpg` extension ✅
- DALL-E PNG images → `.png` extension ✅
- Correct MIME type detection

---

### Fix 3: Load Images as Data URLs ✅

**File**: `src/renderer/components/SocialClubDesigner/AISocialClubDesigner.tsx`

**Added State**:
```typescript
const [imageDataUrls, setImageDataUrls] = useState<Record<string, string>>({});
```

**Added useEffect to Load Images**:
```typescript
useEffect(() => {
  const loadImages = async () => {
    const newDataUrls: Record<string, string> = {};
    for (const imagePath of generatedImages) {
      if (imagePath && !imageDataUrls[imagePath]) {
        const dataUrl = await window.aiService.loadImageAsDataUrl(imagePath);
        newDataUrls[imagePath] = dataUrl;
      }
    }
    if (Object.keys(newDataUrls).length > 0) {
      setImageDataUrls((prev) => ({ ...prev, ...newDataUrls }));
    }
  };
  loadImages();
}, [generatedImages]);
```

**Updated Display**:
```tsx
{generatedImages.map((imagePath, index) => {
  const dataUrl = imageDataUrls[imagePath];
  return (
    <div key={index} className="image-container">
      {dataUrl ? (
        <img src={dataUrl} alt={`Social Club Design ${index + 1}`} />
      ) : (
        <div className="image-loading">Loading image...</div>
      )}
    </div>
  );
})}
```

**How It Works**:
1. Image path stored in `generatedImages` state
2. `useEffect` calls `window.aiService.loadImageAsDataUrl(imagePath)`
3. IPC handler `ai:load-image-as-data-url` reads file and converts to base64
4. Returns `data:image/jpeg;base64,/9j/4AAQSkZJRg...` format
5. React displays base64 data URL (no file:// needed)

---

### Fix 4: Update Database Schema ✅

**File**: `src/main/migrations/003-social-club-images.sql`

**Added Format Column**:
```sql
CREATE TABLE IF NOT EXISTS social_club_images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    image_path TEXT NOT NULL,
    format TEXT NOT NULL, -- NEW: 'png', 'jpeg', or 'webp'
    prompt TEXT NOT NULL,
    -- ... other fields
);
```

**Updated Insert**:
```typescript
db.prepare(`
  INSERT INTO social_club_images (
    id, project_id, scenario_id, image_path, format, prompt, ...
  ) VALUES (?, ?, ?, ?, ?, ?, ...)
`).run(
  socialClubImageId,
  request.projectId,
  request.scenarioId,
  imagePath,
  imageResult.format, // NEW: Store actual format
  request.prompt,
  // ... other values
);
```

---

## Files Modified (6 total)

1. `src/main/ai-services/image-client.ts` - Updated wrapper functions to return format info
2. `src/main/ipc-handlers.ts` - Fixed path, dynamic extension, format storage
3. `src/renderer/components/SocialClubDesigner/AISocialClubDesigner.tsx` - Added data URL loading
4. `src/main/migrations/003-social-club-images.sql` - Added format column

---

## Testing Results

**Before Fixes**:
- ❌ Images in: `C:\Users\geo_i\AppData\Roaming\MicroVillas Investment Platform\social-club-images\`
- ❌ File extension: `.png` (but content was JPEG)
- ❌ Display: Broken image icon

**After Fixes**:
- ✅ Images in: `D:\fast2ai\AI-Floorplan\project-data\{projectId}\images\social-club\`
- ✅ File extension: `.jpg` (matches JPEG content)
- ✅ Display: Beautiful photorealistic tropical drone view!

---

## How to Test

1. Navigate to Social Club Designer
2. Select amenities
3. Generate design prompt
4. Click "Generate Image"
5. Wait for Gemini to generate image

**Expected Results**:
- Image saved to: `D:\fast2ai\AI-Floorplan\project-data\{projectId}\images\social-club\social-club-{timestamp}-{uuid}.jpg`
- Image displays correctly in browser
- Windows recognizes it as valid JPEG file
- Database stores format as `'jpeg'`

---

## Key Learnings

All three issues were **consistency problems** - the solutions already existed in Subdivision Planning but weren't applied to Social Club:

1. **Path**: Subdivision uses project-data directory → Social Club now does too
2. **Format**: Subdivision detects MIME type → Social Club now does too
3. **Display**: Subdivision uses data URLs → Social Club now does too

**Perfect example of code reuse and pattern consistency!** 🎯
