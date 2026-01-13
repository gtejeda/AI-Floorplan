# Social Club Designer Fixes - 2026-01-12

## Issues Fixed

### 1. Added Recreation Amenities to Catalog
**Location**: `public/assets/amenities-catalog.json`

**New Amenities Added**:
- **Pool Lounge Chairs** (aquatic category)
  - Comfortable lounge chairs for poolside relaxation
  - Cost: $2,000 USD
  - Space: 20 sqm

- **Pool Umbrellas** (aquatic category)
  - Large sun umbrellas for shade around pool area
  - Cost: $1,500 USD
  - Space: 15 sqm

- **Pool Table (Billiards)** (recreation category)
  - Professional billiards/pool table with cues and accessories
  - Cost: $3,500 USD
  - Space: 25 sqm

- **Gym / Fitness Center** (recreation category)
  - Equipped fitness center with cardio and weight training equipment
  - Cost: $25,000 USD
  - Space: 80 sqm

- **Outdoor Lounge Chairs** (recreation category)
  - Comfortable outdoor lounge chairs with cushions
  - Cost: $1,800 USD
  - Space: 15 sqm

- **Shade Umbrellas** (recreation category)
  - Large patio umbrellas for outdoor seating areas
  - Cost: $1,200 USD
  - Space: 10 sqm

### 2. Fixed PromptEditorModal Component
**Location**: `src/renderer/components/AIIntegration/PromptEditorModal.tsx`

**Problem**: The modal was designed for subdivision planning but was being used by Social Club Designer with different props.

**Root Cause**: Props interface mismatch
- Modal expected: `isOpen`, `viewType`, `initialPrompt`
- Social Club passed: `title`, `prompt`, `isGenerating`

**Solution**: Made the component flexible to support both use cases:
- Made `isOpen`, `viewType` optional (default to true if not provided)
- Support both `prompt` and `initialPrompt` prop names
- Added `title` prop for custom modal titles
- Added `isGenerating` prop to show loading state on buttons
- Dynamic header rendering (shows subtitle only if viewType is provided)

**Changes**:
```typescript
interface PromptEditorModalProps {
  isOpen?: boolean;           // Optional, defaults to true
  viewType?: ViewType;        // Optional, for subdivision planning
  initialPrompt?: string;     // For subdivision planning
  prompt?: string;            // Alternative for social club
  title?: string;             // Custom title
  isGenerating?: boolean;     // Loading state
  onConfirm: (editedPrompt: string) => void;
  onCancel: () => void;
}
```

### 3. Fixed AISocialClubDesigner Modal Usage
**Location**: `src/renderer/components/SocialClubDesigner/AISocialClubDesigner.tsx`

**Problem**: Modal was conditionally rendered with `{showPromptEditor && <PromptEditorModal />}` instead of controlling visibility with props.

**Solution**:
- Always render the modal
- Control visibility with `isOpen={showPromptEditor}` prop
- This ensures the modal properly initializes and updates when prompt changes

**Before**:
```tsx
{showPromptEditor && (
  <PromptEditorModal
    title="Social Club Design Prompt"
    prompt={designPrompt}
    ...
  />
)}
```

**After**:
```tsx
<PromptEditorModal
  isOpen={showPromptEditor}
  title="Social Club Design Prompt"
  prompt={designPrompt}
  ...
/>
```

## Testing

1. Navigate to Social Club Designer page
2. Select amenities (now includes pool tables, gym, lounge chairs, umbrellas)
3. Click "Generate Design Prompt" - should show modal with editable textarea
4. Edit the prompt text - changes should be reflected in real-time
5. Click "Edit Prompt" button - should reopen the modal with the current prompt
6. Click "Generate Image" - button should show "Generating..." during API call

## Files Modified

1. `public/assets/amenities-catalog.json` - Added 6 new amenities
2. `src/renderer/components/AIIntegration/PromptEditorModal.tsx` - Made props flexible
3. `src/renderer/components/SocialClubDesigner/AISocialClubDesigner.tsx` - Fixed modal usage

## No Breaking Changes

The PromptEditorModal remains backward compatible with existing subdivision planning usage:
- Still accepts `isOpen`, `viewType`, `initialPrompt` props
- Now also supports simpler usage with `title`, `prompt`, `isGenerating`
- All existing code continues to work without modifications
