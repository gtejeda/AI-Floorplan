/**
 * AI Social Club Designer Component
 * AI-powered social club design with amenity selection and image generation
 */

import React, { useState, useEffect } from 'react';
import { Amenity, AmenityCategory } from '../../models/Amenity';
import { StorageType } from '../../models/StorageUnit';
import { PromptEditorModal } from '../AIIntegration/PromptEditorModal';
import './AISocialClubDesigner.css';

/**
 * Calculate optimal rectangular dimensions from area
 * Returns width and height that:
 * - Multiply to approximately the given area
 * - Allow flexible aspect ratios (no forced square constraint)
 * - Rounded to 0.5m precision for easier construction
 *
 * Default behavior: Creates slightly rectangular proportions favoring narrow/tall buildings (more efficient)
 */
function calculateOptimalDimensions(areaSqm: number): { width: number; height: number } {
  // For social clubs, a slightly narrow/tall proportion (2:3 or 1:2) is often more efficient
  // This allows for better circulation and zoning (e.g., pool on one end, amenities on the other)

  const sqrt = Math.sqrt(areaSqm);

  // Default to a 2:3 width-to-height ratio (slightly taller than wide)
  // This creates more interesting, efficient layouts than pure squares
  let width = Math.round(sqrt * 0.82 * 2) / 2; // Round to 0.5m (82% of square root for 2:3 ratio)
  let height = Math.round((areaSqm / width) * 2) / 2; // Round to 0.5m

  // Fine-tune to match exact area
  const actualArea = width * height;
  const areaDiff = actualArea - areaSqm;

  // Adjust if area difference is significant (>5%)
  if (Math.abs(areaDiff) / areaSqm > 0.05) {
    // Recalculate height to match exact area
    height = Math.round((areaSqm / width) * 2) / 2;
  }

  // NOTE: We do NOT force width >= height anymore - allow tall/narrow buildings!
  // This gives users more flexibility and creates more interesting designs

  return { width, height };
}

interface AISocialClubDesignerProps {
  projectId: string;
  scenarioId: string; // Can be AI plan ID or traditional scenario ID
  socialClubArea: number; // Area in square meters from subdivision plan
}

interface SelectedAmenity {
  id: string;
  name: string;
  category: AmenityCategory;
}

/**
 * AI Social Club Designer Component
 */
export const AISocialClubDesigner: React.FC<AISocialClubDesignerProps> = ({
  projectId,
  scenarioId,
  socialClubArea,
}) => {
  // State
  const [catalog, setCatalog] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<SelectedAmenity[]>([]);
  const [storageType, setStorageType] = useState<StorageType>('centralized');
  const [maintenanceRoomSize, setMaintenanceRoomSize] = useState<number>(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Social club dimensions state (calculated or manually adjusted)
  const defaultDimensions = calculateOptimalDimensions(socialClubArea);
  const [clubWidth, setClubWidth] = useState<number>(defaultDimensions.width);
  const [clubHeight, setClubHeight] = useState<number>(defaultDimensions.height);

  // Maintenance room dimensions (default 5m x 4m = 20 sqm)
  const [maintenanceWidth, setMaintenanceWidth] = useState<number>(5);
  const [maintenanceLength, setMaintenanceLength] = useState<number>(4);

  // AI prompt generation state
  const [designPrompt, setDesignPrompt] = useState<string>('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);

  // Image generation state
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [imageDataUrls, setImageDataUrls] = useState<Record<string, string>>({});

  // Modal preview state
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Carousel state for gallery view
  const [carouselIndex, setCarouselIndex] = useState<number>(0);

  // Load amenities catalog and saved design on mount
  useEffect(() => {
    loadAmenitiesCatalog();
    loadSavedDesign();
  }, [projectId]);

  // Load generated images as data URLs
  useEffect(() => {
    const loadImages = async () => {
      const newDataUrls: Record<string, string> = {};

      for (let i = 0; i < generatedImages.length; i++) {
        const imagePath = generatedImages[i];
        if (imagePath && !imageDataUrls[imagePath]) {
          try {
            const dataUrl = await window.aiService.loadImageAsDataUrl(imagePath);
            newDataUrls[imagePath] = dataUrl;
          } catch (error) {
            console.error('[SocialClub] Failed to load image:', error);
          }
        }
      }

      if (Object.keys(newDataUrls).length > 0) {
        setImageDataUrls((prev) => ({ ...prev, ...newDataUrls }));
      }
    };

    loadImages();
  }, [generatedImages]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewImageIndex !== null) {
        setPreviewImageIndex(null);
        setIsMaximized(false);
      }
    };

    if (previewImageIndex !== null) {
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [previewImageIndex]);

  /**
   * Carousel navigation functions
   */
  const nextImage = () => {
    if (generatedImages.length > 1) {
      setCarouselIndex((prev) => (prev + 1) % generatedImages.length);
    }
  };

  const prevImage = () => {
    if (generatedImages.length > 1) {
      setCarouselIndex((prev) => (prev === 0 ? generatedImages.length - 1 : prev - 1));
    }
  };

  const goToImage = (index: number) => {
    setCarouselIndex(index);
  };

  /**
   * Load amenities catalog from main process
   */
  const loadAmenitiesCatalog = async () => {
    try {
      setLoading(true);
      const amenities = await window.electronAPI.getAmenitiesCatalog();
      setCatalog(amenities);
    } catch (error) {
      console.error('Failed to load amenities catalog:', error);
      alert('Failed to load amenities catalog');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load saved social club design from database
   */
  const loadSavedDesign = async () => {
    try {
      const result = await window.electronAPI.loadSocialClubDesign(projectId);

      if (result.found) {
        console.log('[SocialClub] Loaded saved design:', result);

        // Set selected amenities
        const amenitiesData = result.amenities.map((a: any) => ({
          id: a.id,
          name: a.name,
          category: a.category,
        }));
        setSelectedAmenities(amenitiesData);

        // Set storage configuration
        setStorageType(result.design.storageType);

        // Set maintenance room dimensions (use new format if available, fallback to old sqm format)
        if (result.design.maintenanceWidth && result.design.maintenanceLength) {
          setMaintenanceWidth(result.design.maintenanceWidth);
          setMaintenanceLength(result.design.maintenanceLength);
        } else if (result.design.maintenanceRoomSize) {
          // Fallback for old designs - calculate dimensions from area
          const dims = calculateOptimalDimensions(result.design.maintenanceRoomSize);
          setMaintenanceWidth(dims.width);
          setMaintenanceLength(dims.height);
        }
        setMaintenanceRoomSize(result.design.maintenanceRoomSize || 20);

        // Set social club dimensions (use saved values if available, otherwise use defaults)
        if (result.design.clubWidth && result.design.clubHeight) {
          setClubWidth(result.design.clubWidth);
          setClubHeight(result.design.clubHeight);
        }

        // Set design prompt
        if (result.designPrompt) {
          setDesignPrompt(result.designPrompt);
        }

        // Set generated images
        if (result.generatedImages && result.generatedImages.length > 0) {
          setGeneratedImages(result.generatedImages);
        }
      }
    } catch (error) {
      console.error('Failed to load saved design:', error);
      // Don't alert on load failure - just start fresh
    }
  };

  /**
   * Toggle amenity selection (simple checkbox)
   */
  const toggleAmenity = (amenity: Amenity) => {
    const existingIndex = selectedAmenities.findIndex((a) => a.id === amenity.id);

    if (existingIndex >= 0) {
      // Remove amenity
      setSelectedAmenities((prev) => prev.filter((a) => a.id !== amenity.id));
    } else {
      // Add amenity
      const newAmenity: SelectedAmenity = {
        id: amenity.id,
        name: amenity.name,
        category: amenity.category,
      };
      setSelectedAmenities((prev) => [...prev, newAmenity]);
    }
  };

  /**
   * Check if amenity is selected
   */
  const isSelected = (amenityId: string): boolean => {
    return selectedAmenities.some((a) => a.id === amenityId);
  };

  /**
   * Generate AI design prompt
   */
  const handleGeneratePrompt = async () => {
    if (selectedAmenities.length === 0) {
      alert('Please select at least one amenity');
      return;
    }

    try {
      setGeneratingPrompt(true);

      // Build amenities list for prompt
      const amenitiesList = selectedAmenities.map((a) => a.name).join(', ');

      // Use actual dimensions (either auto-calculated or manually adjusted)
      const actualArea = clubWidth * clubHeight;

      // Check if bathrooms are included (gender-separated bathrooms)
      const hasBathrooms = selectedAmenities.some((a) => a.id === 'amenity-bathrooms');

      // Check if we should combine bathrooms and maintenance room into single building
      const shouldCombineUtilities = storageType === 'centralized' && hasBathrooms;

      // Calculate aspect ratio for dimension enforcement
      const aspectRatio = clubHeight / clubWidth;
      const isSquare = Math.abs(aspectRatio - 1) < 0.15;
      const isTall = aspectRatio > 1.3; // Height > Width by 30%+
      const isWide = aspectRatio < 0.77; // Width > Height by 30%+

      // Determine which dimension is actually longer (regardless of name)
      const longerDimension = Math.max(clubWidth, clubHeight);
      const shorterDimension = Math.min(clubWidth, clubHeight);
      const dimensionRatio = longerDimension / shorterDimension;

      // Correctly identify orientation based on actual dimension values
      const widthIsLonger = clubWidth > clubHeight;
      const heightIsLonger = clubHeight > clubWidth;

      // Generate prompt template
      const prompt = `Create a photorealistic drone aerial view visualization of a social club for a micro-villa residential community in the Dominican Republic.

🚨 CRITICAL SHAPE & DIMENSION REQUIREMENTS (NON-NEGOTIABLE):

**FOOTPRINT BOUNDARY BOX - THE SOCIAL CLUB MUST FIT WITHIN THIS EXACT RECTANGLE:**
┌─────────────────────────────────────────── ${clubWidth}m WIDE (horizontal) ───────────────────────────────────────────┐
│                                                                                                                        │
│  ${clubHeight}m                                 ENTIRE SOCIAL CLUB COMPLEX                                           ${clubHeight}m
│  DEEP                              (buildings + pool + outdoor areas)                                        DEEP
│ (vertical)                              MUST FIT WITHIN THIS BOX                                           (vertical)
│                                                                                                                        │
└─────────────────────────────────────────── ${clubWidth}m WIDE (horizontal) ───────────────────────────────────────────┘

**DIMENSION REQUIREMENTS:**
- TOTAL FOOTPRINT AREA: ${actualArea.toFixed(1)} square meters (${clubWidth}m × ${clubHeight}m)
- ASPECT RATIO: ${dimensionRatio.toFixed(2)}:1 (${widthIsLonger ? `${dimensionRatio.toFixed(1)}x WIDER than deep` : heightIsLonger ? `${dimensionRatio.toFixed(1)}x DEEPER than wide` : 'nearly square'})
- HORIZONTAL WIDTH: ${clubWidth} meters (measured side-to-side on the image)
- VERTICAL DEPTH: ${clubHeight} meters (measured front-to-back on the image)

**VISUAL DIMENSION MARKERS TO INCLUDE IN THE IMAGE:**
- Add visible dimension arrows showing "${clubWidth}m" along the top edge (horizontal width)
- Add visible dimension arrows showing "${clubHeight}m" along the right edge (vertical depth)
- Add a visual scale bar showing 0-5-10-15-20m increments
- These dimension markers help verify the building is drawn to correct proportions

**SHAPE VERIFICATION:**
${widthIsLonger ? `The complex should be a WIDE, SHALLOW rectangle - imagine fitting ${Math.floor(dimensionRatio)} parking spaces side-by-side across the width, but only 1 parking space deep. It's ${dimensionRatio.toFixed(1)} times WIDER than it is DEEP.` : heightIsLonger ? `The complex should be a TALL, NARROW rectangle - imagine stacking ${Math.floor(dimensionRatio)} parking spaces vertically, but only 1 parking space wide. It's ${dimensionRatio.toFixed(1)} times DEEPER than it is WIDE.` : 'The complex should be nearly square.'}

**CRITICAL REMINDER:**
The ENTIRE social club complex (all buildings, pool, decks, outdoor dining, walkways) must fit within the ${clubWidth}m × ${clubHeight}m footprint. Do NOT make it bigger than these exact dimensions.

**Required Amenities:**
${selectedAmenities.map((a) => `- ${a.name} (${a.category})`).join('\n')}
${storageType === 'centralized' ? '\n**Storage:** Centralized storage area within social club for all villa residents' : '\n**Note:** Individual patio storage is NOT part of this social club - each villa has its own storage on their lot'}
${shouldCombineUtilities
  ? `\n**Utilities Building (Combined Structure):** A single building structure containing:
  - Female bathrooms (gender-separated)
  - Male bathrooms (gender-separated)
  - Maintenance room: ${maintenanceWidth}m × ${maintenanceLength}m (${(maintenanceWidth * maintenanceLength).toFixed(1)} sqm) - equipment storage and facility management
  - This is a unified architectural element with all three components in one building`
  : `\n**Maintenance Room:** ${maintenanceWidth}m × ${maintenanceLength}m (${(maintenanceWidth * maintenanceLength).toFixed(1)} sqm) - equipment storage and facility management`}

**Design Requirements:**
- Create an attractive, functional layout that accommodates all selected amenities
- Ensure proper circulation and accessibility throughout the space
- Include lush tropical landscaping, palm trees, and outdoor seating areas
- Optimize space usage while maintaining comfort and aesthetics
- Tropical climate design - shade structures, pergolas, open-air spaces, vibrant colors

**Visualization Details:**
- Drone aerial view from approximately 30-45 degree angle
- Photorealistic rendering with natural lighting (sunny day)
- Show the complete social club area with all amenities clearly visible
- Include people enjoying the facilities for scale and atmosphere
- Rich tropical landscaping - palm trees, tropical plants, colorful flowers
- Clean modern aesthetic with Caribbean/tropical architectural elements
- Bright, inviting colors and materials appropriate for tropical climate
- Crystal clear water in pool (if included)
- Well-defined pathways and circulation areas

**IMPORTANT - Background Requirements:**
- Do NOT generate houses/apartments outside of the social club area
- Surrounding areas should show empty grass plots with nice landscaping
- Landscaping and vegetation (trees, shrubs, flowers) are allowed and encouraged
- Show the social club as a standalone amenity area with green spaces around it

**Visual Style:** Photorealistic drone aerial photography, bright sunny day, tropical resort aesthetic, vibrant and inviting atmosphere

**REAL-WORLD SIZE COMPARISON (to help you visualize the correct proportions):**
${widthIsLonger ? `- A standard parking space is ~5m long. The width (${clubWidth}m) should fit ${Math.floor(clubWidth / 5)} parking spaces side-by-side.
- The depth (${clubHeight}m) should fit only ${Math.floor(clubHeight / 5)} parking space(s) front-to-back.
- If you drew a parking lot with these dimensions, it would be a WIDE, SHALLOW lot - much wider than it is deep.` : heightIsLonger ? `- A standard parking space is ~5m long. The width (${clubWidth}m) should fit ${Math.floor(clubWidth / 5)} parking space(s) side-by-side.
- The depth (${clubHeight}m) should fit ${Math.floor(clubHeight / 5)} parking spaces front-to-back.
- If you drew a parking lot with these dimensions, it would be a TALL, NARROW lot - much deeper than it is wide.` : `- The proportions are nearly square, like ${Math.floor(clubWidth / 5)} × ${Math.floor(clubHeight / 5)} parking spaces.`}

**FINAL VERIFICATION CHECKLIST (MANDATORY - CHECK BEFORE GENERATING):**
✓ FOOTPRINT BOUNDARY: The entire complex fits within ${clubWidth}m × ${clubHeight}m rectangle
✓ ASPECT RATIO: ${widthIsLonger ? `WIDE rectangle - ${dimensionRatio.toFixed(1)}:1 (width to depth)` : heightIsLonger ? `TALL rectangle - ${dimensionRatio.toFixed(1)}:1 (depth to width)` : 'Nearly square'}
✓ DIMENSION ARROWS: Image shows "${clubWidth}m" label on horizontal edge and "${clubHeight}m" label on vertical edge
✓ SCALE BAR: Visual scale bar (0-5-10-15-20m) is visible in the image
✓ VISUAL PROPORTIONS: When measuring the image, ${clubWidth}:${clubHeight} ratio is visually accurate
✓ ALL AMENITIES: Every selected amenity is visible and clearly identifiable in the layout
✓ TROPICAL AESTHETIC: Palm trees, tropical plants, vibrant colors throughout
✓ NO HOUSES: Only the social club is shown - surrounding area is landscaped grass/gardens`;

      setDesignPrompt(prompt);
      setShowPromptEditor(true);
    } catch (error) {
      console.error('Error generating prompt:', error);
      alert('Failed to generate design prompt');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  /**
   * Handle prompt confirmation and image generation
   */
  const handleGenerateImage = async (finalPrompt: string) => {
    try {
      setGeneratingImage(true);
      setShowPromptEditor(false);

      // Call IPC to generate social club image using Gemini
      const response = await window.aiService.generateSocialClubImage({
        projectId,
        scenarioId,
        prompt: finalPrompt,
        amenities: selectedAmenities,
        socialClubArea,
        storageType,
        maintenanceRoomSize: maintenanceWidth * maintenanceLength,
        clubWidth,
        clubHeight,
        maintenanceWidth,
        maintenanceLength,
      });

      if (response.success && response.imagePath) {
        // Append new image to the list (instead of replacing)
        setGeneratedImages((prev) => [...prev, response.imagePath]);
        // Set carousel to the newest image
        setCarouselIndex((prev) => prev + 1);
        alert('Social club design generated successfully!');
      } else {
        throw new Error(response.error || 'Failed to generate image');
      }
    } catch (error: any) {
      console.error('Error generating social club image:', error);
      alert(`Failed to generate image: ${error.message}`);
    } finally {
      setGeneratingImage(false);
    }
  };

  /**
   * Handle save (save selections + prompt + images)
   */
  const handleSave = async () => {
    try {
      setSaving(true);

      // Enrich selected amenities with cost information from catalog
      const enrichedAmenities = selectedAmenities.map((selected) => {
        const catalogAmenity = catalog.find((a) => a.id === selected.id);
        if (!catalogAmenity) {
          throw new Error(`Amenity ${selected.id} not found in catalog`);
        }

        return {
          ...selected,
          totalCost: {
            amount: catalogAmenity.defaultCost.amount,
            currency: catalogAmenity.defaultCost.currency,
          },
          unitCost: {
            amount: catalogAmenity.defaultCost.amount,
            currency: catalogAmenity.defaultCost.currency,
          },
          quantity: 1,
          spaceRequirement: catalogAmenity.spaceRequirement || 0,
        };
      });

      const designData = {
        projectId,
        scenarioId,
        selectedAmenities: enrichedAmenities,
        storageType,
        maintenanceRoomSize: maintenanceWidth * maintenanceLength, // Calculate area for backward compatibility
        maintenanceWidth, // Store width
        maintenanceLength, // Store length
        clubWidth, // Store social club width
        clubHeight, // Store social club height
        socialClubArea,
        designPrompt,
        generatedImages,
      };

      await window.electronAPI.saveSocialClubDesign(designData);
      alert('Social club design saved successfully!');
    } catch (error: any) {
      console.error('Error saving social club design:', error);
      alert(`Failed to save design: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Group amenities by category
  const amenitiesByCategory = catalog.reduce(
    (acc, amenity) => {
      if (!acc[amenity.category]) {
        acc[amenity.category] = [];
      }
      acc[amenity.category].push(amenity);
      return acc;
    },
    {} as Record<AmenityCategory, Amenity[]>
  );

  if (loading) {
    return (
      <div className="ai-social-club-designer loading">
        <div className="spinner"></div>
        <p>Loading amenities catalog...</p>
      </div>
    );
  }

  return (
    <div className="ai-social-club-designer">
      <div className="designer-header">
        <h2>AI Social Club Designer</h2>
        <p className="subtitle">
          Select amenities and let AI create the perfect layout for your {socialClubArea} sqm social
          club
        </p>
      </div>

      {/* Amenity Selection */}
      <div className="amenity-selection">
        <h3>Select Amenities</h3>
        <p className="help-text">Choose the amenities you want in your social club</p>

        <div className="amenities-grid">
          {Object.entries(amenitiesByCategory).map(([category, amenities]) => (
            <div key={category} className="category-section">
              <h4 className="category-title">{category}</h4>
              <div className="amenities-list">
                {amenities.map((amenity) => (
                  <label key={amenity.id} className="amenity-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected(amenity.id)}
                      onChange={() => toggleAmenity(amenity)}
                    />
                    <span className="amenity-name">{amenity.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="configuration-section">
        <h3>Configuration</h3>

        {/* Social Club Dimensions */}
        <div className="config-group dimensions-group">
          <label>Social Club Dimensions:</label>
          <div className="dimensions-inputs">
            <div className="dimension-field">
              <label htmlFor="club-width">Width (m):</label>
              <input
                id="club-width"
                type="number"
                min="5"
                max="100"
                step="0.5"
                value={clubWidth}
                onChange={(e) => setClubWidth(Number(e.target.value))}
              />
            </div>
            <span className="dimension-separator">×</span>
            <div className="dimension-field">
              <label htmlFor="club-height">Length (m):</label>
              <input
                id="club-height"
                type="number"
                min="5"
                max="100"
                step="0.5"
                value={clubHeight}
                onChange={(e) => setClubHeight(Number(e.target.value))}
              />
            </div>
            <div className="dimension-result">
              <span className="equals">=</span>
              <span className="area-value">{(clubWidth * clubHeight).toFixed(1)} sqm</span>
              <span className="area-target">(target: {socialClubArea} sqm)</span>
            </div>
          </div>
          <p className="help-text">
            Auto-calculated from area. Adjust dimensions to match your site plan or preferences.
          </p>
        </div>

        <div className="config-group">
          <label>Storage Type:</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="centralized"
                checked={storageType === 'centralized'}
                onChange={(e) => setStorageType(e.target.value as StorageType)}
              />
              Centralized (in social club)
            </label>
            <label>
              <input
                type="radio"
                value="individual-patios"
                checked={storageType === 'individual-patios'}
                onChange={(e) => setStorageType(e.target.value as StorageType)}
              />
              Individual patio storage
            </label>
          </div>
        </div>

        {/* Maintenance Room Dimensions */}
        <div className="config-group dimensions-group">
          <label>Maintenance Room Dimensions:</label>
          <div className="dimensions-inputs">
            <div className="dimension-field">
              <label htmlFor="maintenance-width">Width (m):</label>
              <input
                id="maintenance-width"
                type="number"
                min="2"
                max="20"
                step="0.5"
                value={maintenanceWidth}
                onChange={(e) => setMaintenanceWidth(Number(e.target.value))}
              />
            </div>
            <span className="dimension-separator">×</span>
            <div className="dimension-field">
              <label htmlFor="maintenance-length">Length (m):</label>
              <input
                id="maintenance-length"
                type="number"
                min="2"
                max="20"
                step="0.5"
                value={maintenanceLength}
                onChange={(e) => setMaintenanceLength(Number(e.target.value))}
              />
            </div>
            <div className="dimension-result">
              <span className="equals">=</span>
              <span className="area-value">{(maintenanceWidth * maintenanceLength).toFixed(1)} sqm</span>
            </div>
          </div>
          <p className="help-text">
            Room for equipment storage, cleaning supplies, and facility management.
          </p>
        </div>
      </div>

      {/* Selected Amenities Summary */}
      {selectedAmenities.length > 0 && (
        <div className="selected-summary">
          <h3>Selected Amenities ({selectedAmenities.length})</h3>
          <div className="selected-tags">
            {selectedAmenities.map((amenity) => (
              <span key={amenity.id} className="amenity-tag">
                {amenity.name}
                <button
                  type="button"
                  className="remove-tag"
                  onClick={() => toggleAmenity({ id: amenity.id } as Amenity)}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          type="button"
          className="btn-primary btn-large"
          onClick={handleGeneratePrompt}
          disabled={selectedAmenities.length === 0 || generatingPrompt}
        >
          {generatingPrompt ? 'Generating Prompt...' : '🎨 Generate Design Prompt'}
        </button>

        {designPrompt && (
          <button type="button" className="btn-secondary" onClick={() => setShowPromptEditor(true)}>
            ✏️ Edit Prompt
          </button>
        )}

        {generatedImages.length > 0 && (
          <button type="button" className="btn-success" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Design'}
          </button>
        )}
      </div>

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <div className="generated-images">
          <div className="gallery-header-row">
            <h3>Generated Design</h3>
            {generatedImages.length > 1 && (
              <span className="image-counter">
                {carouselIndex + 1} / {generatedImages.length}
              </span>
            )}
          </div>
          <div className="images-grid">
            {(() => {
              const imagePath = generatedImages[carouselIndex];
              const dataUrl = imageDataUrls[imagePath];
              return (
                <div key={carouselIndex} className="image-container">
                  {dataUrl ? (
                    <div className="image-preview-container">
                      <div
                        className="image-preview"
                        onClick={() => {
                          setPreviewImageIndex(carouselIndex);
                          setIsMaximized(false);
                        }}
                        role="button"
                        tabIndex={0}
                        title="Click to enlarge"
                      >
                        <img src={dataUrl} alt={`Social Club Design ${carouselIndex + 1}`} />
                        <div className="image-overlay">
                          <span className="zoom-icon">🔍</span>
                          <span className="view-label">Click to enlarge</span>
                        </div>
                      </div>

                      {/* Carousel Controls */}
                      {generatedImages.length > 1 && (
                        <>
                          <button
                            className="carousel-nav carousel-prev"
                            onClick={(e) => {
                              e.stopPropagation();
                              prevImage();
                            }}
                            aria-label="Previous image"
                          >
                            ‹
                          </button>
                          <button
                            className="carousel-nav carousel-next"
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage();
                            }}
                            aria-label="Next image"
                          >
                            ›
                          </button>
                          <div className="carousel-dots">
                            {generatedImages.map((_, index) => (
                              <button
                                key={index}
                                className={`carousel-dot ${index === carouselIndex ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goToImage(index);
                                }}
                                aria-label={`Go to image ${index + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="image-loading">Loading image...</div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImageIndex !== null && generatedImages[previewImageIndex] && (
        <div
          className="image-modal"
          onClick={() => {
            setPreviewImageIndex(null);
            setIsMaximized(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`modal-content ${isMaximized ? 'maximized' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => {
                setPreviewImageIndex(null);
                setIsMaximized(false);
              }}
              aria-label="Close"
            >
              ✕
            </button>
            <button
              className="modal-maximize"
              onClick={() => setIsMaximized(!isMaximized)}
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? '⤓' : '⤢'}
            </button>

            <div className="modal-image-container">
              {imageDataUrls[generatedImages[previewImageIndex]] ? (
                <img
                  src={imageDataUrls[generatedImages[previewImageIndex]]}
                  alt={`Social Club Design ${previewImageIndex + 1} - Full View`}
                  className="modal-image"
                />
              ) : (
                <div className="image-loading">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading image...</p>
                </div>
              )}

              {/* Modal Carousel Controls */}
              {generatedImages.length > 1 && (
                <>
                  <button
                    className="modal-carousel-nav modal-carousel-prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImageIndex((prev) =>
                        prev === null || prev === 0 ? generatedImages.length - 1 : prev - 1
                      );
                    }}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    className="modal-carousel-nav modal-carousel-next"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImageIndex((prev) =>
                        prev === null ? 0 : (prev + 1) % generatedImages.length
                      );
                    }}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div className="modal-carousel-dots">
                    {generatedImages.map((_, index) => (
                      <button
                        key={index}
                        className={`modal-carousel-dot ${index === previewImageIndex ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImageIndex(index);
                        }}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {!isMaximized && (
              <div className="modal-footer">
                <div className="modal-footer-header">
                  <h3>Social Club Design {previewImageIndex + 1}</h3>
                  {generatedImages.length > 1 && (
                    <span className="modal-image-counter">
                      {previewImageIndex + 1} / {generatedImages.length}
                    </span>
                  )}
                </div>
                <p className="image-caption">AI-generated social club visualization</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prompt Editor Modal */}
      <PromptEditorModal
        isOpen={showPromptEditor}
        title="Social Club Design Prompt"
        prompt={designPrompt}
        onConfirm={handleGenerateImage}
        onCancel={() => setShowPromptEditor(false)}
        isGenerating={generatingImage}
      />
    </div>
  );
};
